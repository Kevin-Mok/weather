"use client";

import { useEffect, useState } from "react";

import type { HourlyFallbackReason, WeatherResponse } from "./lib/weather";

const DEFAULT_POSTAL = "M1E4V4";
const DEFAULT_HOURS = 12;
const DEFAULT_LATITUDE = "43.7729744";
const DEFAULT_LONGITUDE = "-79.2576479";

function formatHour(time: string) {
  return `${time.slice(5, 10)} · ${time.slice(11, 16)}`;
}

function valueOrPlaceholder(value: number | null, suffix: string) {
  return typeof value === "number" ? `${Math.round(value)}${suffix}` : "n/a";
}

function iconFor(code: number | null) {
  if (code === null) {
    return "☁️";
  }

  if (code === 0) {
    return "☀️";
  }

  if (code >= 1 && code <= 3) {
    return code === 1 ? "🌤️" : "⛅";
  }

  if (code === 45 || code === 48) {
    return "🌫️";
  }

  if (code >= 51 && code <= 57) {
    return "🌧️";
  }

  if (code >= 61 && code <= 67) {
    return "🌧️";
  }

  if (code >= 71 && code <= 77) {
    return "🌨️";
  }

  if ((code >= 80 && code <= 82) || (code >= 85 && code <= 86)) {
    return "🌦️";
  }

  if (code >= 95 && code <= 99) {
    return "⛈️";
  }

  return "☁️";
}

function labelFor(code: number | null) {
  if (code === null) {
    return "Condition unknown";
  }

  if (code === 0) {
    return "Clear";
  }

  if (code >= 1 && code <= 3) {
    return code === 1 ? "Partly clear" : "Cloudy";
  }

  if (code === 45 || code === 48) {
    return "Fog";
  }

  if (code >= 51 && code <= 57) {
    return "Drizzle";
  }

  if (code >= 61 && code <= 67) {
    return "Rain";
  }

  if (code >= 71 && code <= 77) {
    return "Snow";
  }

  if (code >= 80 && code <= 82) {
    return "Showers";
  }

  if (code >= 85 && code <= 86) {
    return "Snow shower";
  }

  if (code >= 95 && code <= 99) {
    return "Thunderstorms";
  }

  return "Cloudy";
}

function fallbackLabel(reason: HourlyFallbackReason) {
  const labels: Record<HourlyFallbackReason, string> = {
    unconfigured: "Scarborough feed is not configured.",
    unavailable: "Scarborough feed is unavailable.",
    invalid: "Scarborough feed failed validation.",
    stale: "Scarborough feed is older than 90 minutes.",
    coverage: "Scarborough feed does not cover the requested hours.",
  };
  return labels[reason];
}

async function loadWeather(postal: string, hours: number, useDefaultCoordinates = false, signal?: AbortSignal) {
  const params = new URLSearchParams({
    postal,
    hours: String(hours),
    timezone: "America/Toronto",
  });

  if (useDefaultCoordinates) {
    params.set("lat", DEFAULT_LATITUDE);
    params.set("lon", DEFAULT_LONGITUDE);
  }

  const res = await fetch(`/api/weather?${params.toString()}`, { signal, cache: "no-store" });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Weather request failed (${res.status})`);
  }

  const payload = (await res.json()) as WeatherResponse;
  return payload;
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;

    const fetchData = async () => {
      if (!mounted || inFlight) return;
      inFlight = true;
      controller = new AbortController();
      requestTimeout = setTimeout(() => controller?.abort(), 15000);
      try {
        setLoading(true);
        setError("");
        setWeather(previous => previous?.hourlySource === "the-weather-network" && previous.hourlyFetchedAt &&
          Date.now() - Date.parse(previous.hourlyFetchedAt) > 90 * 60000 ? null : previous);
        const payload = await loadWeather(DEFAULT_POSTAL, DEFAULT_HOURS, true, controller.signal);
        if (mounted) {
          setWeather(payload);
        }
      } catch (err) {
        if (mounted) {
          setError(controller.signal.aborted ? "Weather request timed out. Please try again shortly." :
            err instanceof Error ? err.message : "Unknown error fetching weather");
          setWeather(null);
        }
      } finally {
        clearTimeout(requestTimeout);
        inFlight = false;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    const onResume = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onResume);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(requestTimeout);
      controller?.abort();
      document.removeEventListener("visibilitychange", onResume);
    };
  }, []);

  return (
    <main className="page weather-only">
      {loading && !weather && !error ? <p className="status">Loading forecast…</p> : null}

      {error ? <p className="card error">{error}</p> : null}

      {weather ? (
        <>
          <header className="forecast-meta">
            <p>
              <strong>{weather.location.name}</strong>
              <span>Hourly: {weather.hourlySource === "the-weather-network" ? "The Weather Network" : "Open-Meteo"}
                {weather.hourlyFetchedAt ? ` · Fetched ${new Date(weather.hourlyFetchedAt).toLocaleString("en-CA", { timeZone: "America/Toronto", hour12: false })} Toronto` : ""}
              </span>
            </p>
            <p>Current · Open-Meteo: {valueOrPlaceholder(weather.current.temp, "°C")} · {labelFor(weather.current.conditionCode)}</p>
            {weather.hourlyFallbackReason ? (
              <p className="fallback" role="status">Open-Meteo fallback · {fallbackLabel(weather.hourlyFallbackReason)}</p>
            ) : null}
          </header>
          <section className="grid hourly-only" aria-label="Hourly forecast">
            <div className="hourly">
              {weather.hourly.map((point) => (
                <article key={point.time} className="hour-card compact-hour-card">
                  <time className="hour-time" dateTime={point.time} title={point.time}>
                    {formatHour(point.time)} <small>UTC{point.time.slice(-6)}</small>
                  </time>

                  <div className="hour-main">
                    {weather.hourlySource === "open-meteo" ? <span className="hour-icon" aria-hidden>{iconFor(point.conditionCode)}</span> : null}
                    <span className="hour-number">{valueOrPlaceholder(point.temp, "°C")}</span>
                  </div>
                  <p className="metric metric-condition">
                    <span className="metric-label">Condition</span>
                    <span className="metric-value">{weather.hourlySource === "the-weather-network" ? point.condition ?? "n/a" : labelFor(point.conditionCode)}</span>
                  </p>
                  <p className="metric metric-feels">
                    <span className="metric-label">Feels like</span>
                    <span className="metric-value">{valueOrPlaceholder(point.feelsLike, "°C")}</span>
                  </p>
                  <p className="metric">
                    <span className="metric-label">Wind</span>
                    <span className="metric-value">{valueOrPlaceholder(point.windSpeed, " km/h")} {point.windDirection ?? "n/a"}</span>
                  </p>
                  <p className="metric">
                    <span className="metric-label">Gust</span>
                    <span className="metric-value">{valueOrPlaceholder(point.windGust, " km/h")}</span>
                  </p>
                  <p className="metric">
                    <span className="metric-label">Humidity</span>
                    <span className="metric-value">{valueOrPlaceholder(point.humidity, "%")}</span>
                  </p>
                  <p className="metric metric-precip">
                    <span className="metric-label">Precip chance</span>
                    <span className="metric-value">{valueOrPlaceholder(point.precipProb, "%")}</span>
                  </p>
                  {weather.hourlySource === "open-meteo" ? <p className="metric"><span className="metric-label">Precip amount</span><span className="metric-value">{valueOrPlaceholder(point.precip, " mm")}</span></p> : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
