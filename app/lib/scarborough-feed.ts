import { matchesScarborough, SCARBOROUGH, zonedTime } from "./weather";
import type { ForecastPoint, HourlyFallbackReason } from "./weather";

const SOURCE_URL = "https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly";
const HOUR = 3600000;
type FeedResult = { hourly: ForecastPoint[]; fetchedAt: string; reason: null } |
  { hourly: null; fetchedAt: null; reason: HourlyFallbackReason };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function metric(value: unknown, minimum: number, maximum: number): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum);
}

function label(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length > 0 && value.length <= 200);
}

function validateFeed(value: unknown, now: number, hours: number): FeedResult {
  const fail = (reason: HourlyFallbackReason): FeedResult => ({ hourly: null, fetchedAt: null, reason });
  if (!record(value) || value.schemaVersion !== 1 || value.source !== "the-weather-network" || value.sourceUrl !== SOURCE_URL) return fail("invalid");
  const location = value.location;
  if (!record(location) || location.name !== SCARBOROUGH.name || location.postalCode !== SCARBOROUGH.postalCode ||
    location.timezone !== SCARBOROUGH.timezone || typeof location.latitude !== "number" || typeof location.longitude !== "number" ||
    !matchesScarborough(location.latitude, location.longitude)) return fail("invalid");
  if (typeof value.fetchedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.fetchedAt)) return fail("invalid");
  const fetchedAt = Date.parse(value.fetchedAt);
  if (!Number.isFinite(fetchedAt) || new Date(fetchedAt).toISOString().replace(".000Z", "Z") !== value.fetchedAt.replace(".000Z", "Z") || fetchedAt > now) return fail("invalid");
  if (now - fetchedAt > 90 * 60000) return fail("stale");
  if (!Array.isArray(value.hourly) || value.hourly.length === 0 || value.hourly.length > 240) return fail("invalid");
  const hourly: ForecastPoint[] = [];
  let previous: number | null = null;
  for (const point of value.hourly) {
    if (!record(point) || typeof point.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00[+-]\d{2}:\d{2}$/.test(point.time)) return fail("invalid");
    const instant = Date.parse(point.time);
    if (!Number.isFinite(instant) || zonedTime(instant, SCARBOROUGH.timezone) !== point.time || (previous !== null && instant - previous !== HOUR)) return fail("invalid");
    if (!metric(point.temp, -100, 70) || !metric(point.feelsLike, -120, 80) ||
      !metric(point.windSpeed, 0, 500) || !metric(point.windGust, 0, 500) ||
      !metric(point.humidity, 0, 100) || !metric(point.precipProb, 0, 100) ||
      !label(point.condition) || !(point.windDirection === null ||
        (typeof point.windDirection === "string" && /^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW|VRB)$/.test(point.windDirection)))) return fail("invalid");
    hourly.push({ time: point.time, temp: point.temp, feelsLike: point.feelsLike,
      condition: point.condition, windSpeed: point.windSpeed, windDirection: point.windDirection,
      windGust: point.windGust, humidity: point.humidity, precipProb: point.precipProb,
      precip: null, conditionCode: null });
    previous = instant;
  }
  const currentHour = Math.floor(now / HOUR) * HOUR;
  const selected = hourly.filter(point => Date.parse(point.time) >= currentHour).slice(0, hours);
  if (selected.length !== hours || Date.parse(selected[0].time) > currentHour + HOUR) return fail("coverage");
  return { hourly: selected, fetchedAt: value.fetchedAt, reason: null };
}

export async function loadScarboroughFeed(hours: number, now: number): Promise<FeedResult> {
  const url = process.env.WEATHER_BLOB_URL;
  if (!url) return { hourly: null, fetchedAt: null, reason: "unconfigured" };
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { hourly: null, fetchedAt: null, reason: "unavailable" };
    let value: unknown;
    try { value = await response.json(); }
    catch { return { hourly: null, fetchedAt: null, reason: "invalid" }; }
    return validateFeed(value, now, hours);
  } catch {
    return { hourly: null, fetchedAt: null, reason: "unavailable" };
  }
}
