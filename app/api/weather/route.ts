import { NextRequest, NextResponse } from "next/server";

const GEOCODE_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";

const DEFAULT_POSTAL = "Toronto, Scarborough, Ontario, Canada";
const DEFAULT_TIMEZONE = "America/Toronto";
const DEFAULT_HOURS = 12;

type ForecastPoint = {
  time: string;
  temp: number | null;
  feelsLike: number | null;
  precipProb: number | null;
  precip: number | null;
  conditionCode: number | null;
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

function toHourMarker(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const getPart = (type: Intl.DateTimeFormatPart["type"]) =>
    parts.find((part) => part.type === type)?.value || "00";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:00`;
}

function sliceFromCurrentHour(times: string[], timezone: string): number {
  const nowHour = toHourMarker(timezone);
  const index = times.findIndex((time) => time.substring(0, 16) >= nowHour);
  return index === -1 ? Math.max(0, times.length - 1) : index;
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
  const url = `${NOMINATIM_API_URL}?${new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "0",
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
    return null;
  }

  const payload = (await response.json()) as NominatimLocation[];
  const first = payload?.[0];

  if (!first?.lat || !first?.lon) {
    return null;
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    name: first.display_name || query,
  };
}

async function resolveCoordinates(postalOrCity: string): Promise<{ latitude: number; longitude: number; name: string } | null> {
  const query = postalOrCity.trim();

  const url = `${GEOCODE_API_URL}?${new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  })}`;

  const payload = await fetchJson<{ results?: Array<OMMetaLocation> }>(url);
  const first = payload.results?.[0];

  if (!first) {
    return resolveWithFallbackSearch(query);
  }

  return {
    latitude: Number(first.latitude),
    longitude: Number(first.longitude),
    name: first.name || postalOrCity,
  };
}

function buildResponsePoint(
  index: number,
  hourly: Record<string, unknown[]>
): ForecastPoint {
  return {
    time: String(hourly.time?.[index] || ""),
    temp: parseNumber(hourly.temperature_2m?.[index]),
    feelsLike: parseNumber(hourly.apparent_temperature?.[index]),
    precipProb: parseNumber(hourly.precipitation_probability?.[index]),
    precip: parseNumber(hourly.precipitation?.[index]),
    conditionCode: parseNumber(hourly.weather_code?.[index]),
  };
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

  const safeHours = Math.min(48, Math.max(1, Number.isFinite(hours) ? hours : DEFAULT_HOURS));

  const url = `${FORECAST_API_URL}?${new URLSearchParams({
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code",
    timezone,
    forecast_days: "2",
  })}`;

  const forecast = await fetchJson<{
    hourly?: Record<string, unknown[]>;
    timezone?: string;
  }>(url);

  const hourly = forecast.hourly || {};
  const times = (hourly.time as string[]) || [];

  if (!Array.isArray(times) || times.length === 0) {
    return NextResponse.json({ error: "No hourly forecast returned by the API." }, { status: 502 });
  }

  const startIndex = sliceFromCurrentHour(times, forecast.timezone || timezone);
  const endIndex = startIndex + safeHours;

  const hourlyItems: ForecastPoint[] = [];
  for (let i = startIndex; i < Math.min(endIndex, times.length); i += 1) {
    hourlyItems.push(buildResponsePoint(i, hourly));
  }

  const current = hourlyItems[0] || buildResponsePoint(startIndex, hourly);

  return NextResponse.json({
    location: {
      name: locationLabel,
      latitude,
      longitude,
      timezone: forecast.timezone || timezone,
    },
    current,
    hourly: hourlyItems,
  });
}
