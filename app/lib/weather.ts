export type ForecastPoint = {
  time: string;
  temp: number | null;
  feelsLike: number | null;
  condition: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  windGust: number | null;
  humidity: number | null;
  precipProb: number | null;
  precip: number | null;
  conditionCode: number | null;
};

export type HourlyFallbackReason = "unconfigured" | "unavailable" | "invalid" | "stale" | "coverage";

export type WeatherResponse = {
  location: { name: string; latitude: number; longitude: number; timezone: string };
  current: ForecastPoint;
  currentSource: "open-meteo";
  hourly: ForecastPoint[];
  hourlySource: "the-weather-network" | "open-meteo";
  hourlyFetchedAt: string | null;
  hourlyFallbackReason: HourlyFallbackReason | null;
};

export const SCARBOROUGH = {
  name: "Scarborough, Toronto, Ontario, Canada",
  postalCode: "M1E4V4",
  latitude: 43.7729744,
  longitude: -79.2576479,
  timezone: "America/Toronto",
};

export function matchesScarborough(latitude: number, longitude: number) {
  return Math.abs(latitude - SCARBOROUGH.latitude) < 0.0001 && Math.abs(longitude - SCARBOROUGH.longitude) < 0.0001;
}

export function zonedTime(instant: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  const local = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
  const offset = Math.round((Date.parse(`${local}Z`) - instant) / 60000);
  const absolute = Math.abs(offset);
  return `${local}${offset < 0 ? "-" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
