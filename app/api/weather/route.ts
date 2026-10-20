import { NextRequest, NextResponse } from "next/server";
import { loadScarboroughFeed } from "../../lib/scarborough-feed";
import { matchesScarborough, SCARBOROUGH, zonedTime } from "../../lib/weather";
import type { ForecastPoint, WeatherResponse } from "../../lib/weather";

const GEOCODE_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";

const DEFAULT_POSTAL = "M1E4V4";
const DEFAULT_TIMEZONE = "America/Toronto";
const DEFAULT_HOURS = 12;

const POSTAL_FALLBACK_COORDINATES: Record<string, { latitude: number; longitude: number; name: string }> = {
  M1E4V4: SCARBOROUGH,
};

type OMMetaLocation = {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
};

type NominatimLocation = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function normalizeLocation(query: string | null): string {
  return (query || DEFAULT_POSTAL).trim() || DEFAULT_POSTAL;
}

function normalizeForComparison(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function looksLikePostalCode(value: string): boolean {
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalized);
}

async function resolveWithFallbackSearch(query: string): Promise<{ latitude: number; longitude: number; name: string } | null> {
  const candidates = [
    query,
    `${query} Toronto, Ontario, Canada`,
    "Toronto, Scarborough, Ontario, Canada",
    "Scarborough, Toronto, Ontario, Canada",
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.trim();
    if (!normalizedCandidate) {
      continue;
    }

    const url = `${NOMINATIM_API_URL}?${new URLSearchParams({
      q: normalizedCandidate,
      format: "json",
      addressdetails: "0",
      countrycodes: "ca",
      limit: "1",
    })}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "weather-toronto-app/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as NominatimLocation[];
    const first = payload?.[0];

    if (!first?.lat || !first?.lon) {
      continue;
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    return {
      latitude,
      longitude,
      name: first.display_name || normalizedCandidate,
    };
  }

  return null;
}

async function resolveCoordinates(postalOrCity: string): Promise<{ latitude: number; longitude: number; name: string } | null> {
  const query = postalOrCity.trim();
  const normalizedPostal = normalizeForComparison(query);

  const fallbackForPostal = POSTAL_FALLBACK_COORDINATES[normalizedPostal];
  if (fallbackForPostal) {
    return fallbackForPostal;
  }

  const url = `${GEOCODE_API_URL}?${new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  })}`;

  const payload = await fetchJson<{ results?: Array<OMMetaLocation> }>(url);
  const first = payload.results?.[0];

  if (first) {
    return {
      latitude: Number(first.latitude),
      longitude: Number(first.longitude),
      name: first.name || postalOrCity,
    };
  }

  const fallback = await resolveWithFallbackSearch(query);
  if (fallback) {
    return fallback;
  }

  if (looksLikePostalCode(normalizedPostal)) {
    const normalizedFallback = POSTAL_FALLBACK_COORDINATES[normalizedPostal];
    if (normalizedFallback) {
      return normalizedFallback;
    }
  }

  return null;
}

function windDirection(value: unknown): string | null {
  const degrees = parseNumber(value);
  if (degrees === null || degrees < 0 || degrees > 360) return null;
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[Math.round(degrees / 22.5) % 16];
}

function responsePoint(point: Record<string, unknown>, timezone: string): ForecastPoint {
  return {
    time: zonedTime(Number(point.time) * 1000, timezone),
    temp: parseNumber(point.temperature_2m),
    feelsLike: parseNumber(point.apparent_temperature),
    condition: null,
    windSpeed: parseNumber(point.wind_speed_10m),
    windDirection: windDirection(point.wind_direction_10m),
    windGust: parseNumber(point.wind_gusts_10m),
    humidity: parseNumber(point.relative_humidity_2m),
    precipProb: parseNumber(point.precipitation_probability),
    precip: parseNumber(point.precipitation),
    conditionCode: parseNumber(point.weather_code),
  };
}

function buildResponsePoint(index: number, hourly: Record<string, unknown[]>, timezone: string): ForecastPoint {
  return responsePoint(Object.fromEntries(Object.entries(hourly).map(([key, values]) => [key, values[index]])), timezone);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const postal = normalizeLocation(params.get("postal"));
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const hours = Number(params.get("hours") || DEFAULT_HOURS);
  const timezone = params.get("timezone") || DEFAULT_TIMEZONE;

  let latitude = parseFloat(latParam || "NaN");
  let longitude = parseFloat(lonParam || "NaN");
  let locationLabel = postal;

  const normalizedPostal = normalizeForComparison(postal);
  const defaultPostFallback = POSTAL_FALLBACK_COORDINATES[normalizedPostal];

  if (Number.isFinite(latitude) && Number.isFinite(longitude) && defaultPostFallback) {
    locationLabel = defaultPostFallback.name;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const resolved = await resolveCoordinates(postal);

    if (!resolved) {
      return NextResponse.json(
        {
          error: `Could not resolve location '${postal}'. Try a valid city name or postal code.`,
        },
        { status: 404 }
      );
    }

    latitude = resolved.latitude;
    longitude = resolved.longitude;
    locationLabel = resolved.name;
  }

  const safeHours = Math.min(48, Math.max(1, Number.isFinite(hours) ? Math.floor(hours) : DEFAULT_HOURS));
  const now = Date.now();
  const usesScarboroughFeed = normalizedPostal === DEFAULT_POSTAL && matchesScarborough(latitude, longitude) && timezone === DEFAULT_TIMEZONE;

  const url = `${FORECAST_API_URL}?${new URLSearchParams({
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m",
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m",
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
    timezone,
    forecast_days: "2",
  })}`;

  try {
    const [forecast, feed] = await Promise.all([
      fetchJson<{ hourly?: Record<string, unknown[]>; current?: Record<string, unknown>; timezone?: string }>(url),
      usesScarboroughFeed ? loadScarboroughFeed(safeHours, now) : Promise.resolve(null),
    ]);
    const hourly = forecast.hourly || {};
    const times = hourly.time || [];
    if (!Array.isArray(times) || times.length === 0 || !times.every(time => typeof time === "number" && Number.isFinite(time))) {
      return NextResponse.json({ error: "No valid hourly forecast returned by Open-Meteo." }, { status: 502 });
    }
    const forecastTimezone = forecast.timezone || timezone;
    const currentIndex = times.findLastIndex(time => Number(time) * 1000 <= now);
    const startIndex = currentIndex === -1 ? 0 : currentIndex;
    if (Number(times[startIndex]) * 1000 + 3600000 <= now) {
      return NextResponse.json({ error: "Open-Meteo forecast is out of date." }, { status: 502 });
    }
    const hourlyItems: ForecastPoint[] = [];
    for (let i = startIndex; i < Math.min(startIndex + safeHours, times.length); i += 1) {
      hourlyItems.push(buildResponsePoint(i, hourly, forecastTimezone));
    }
    const current = forecast.current && typeof forecast.current.time === "number"
      ? responsePoint(forecast.current, forecastTimezone) : buildResponsePoint(startIndex, hourly, forecastTimezone);
    const result: WeatherResponse = {
      location: { name: locationLabel, latitude, longitude, timezone: forecastTimezone },
      current,
      currentSource: "open-meteo",
      hourly: feed?.hourly || hourlyItems,
      hourlySource: feed?.hourly ? "the-weather-network" : "open-meteo",
      hourlyFetchedAt: feed?.fetchedAt || null,
      hourlyFallbackReason: feed?.reason || null,
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Weather service is unavailable. Please try again shortly." }, { status: 502 });
  }
}
