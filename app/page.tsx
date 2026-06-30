"use client";

import { useEffect, useState } from "react";

type HourPoint = {
  time: string;
  temp: number | null;
  feelsLike: number | null;
  precipProb: number | null;
  precip: number | null;
  conditionCode: number | null;
};

type WeatherResponse = {
  location: {
    name: string;
    timezone: string;
  };
  current: HourPoint;
  hourly: HourPoint[];
};

const DEFAULT_POSTAL = "M1E4V4";
const DEFAULT_HOURS = 6;
const DEFAULT_LATITUDE = "43.7729744";
const DEFAULT_LONGITUDE = "-79.2576479";

function formatHour(time: string) {
  return time.slice(11, 16);
}

function valueOrPlaceholder(value: number | null, suffix: string) {
  return typeof value === "number" ? `${Math.round(value)}${suffix}` : "n/a";
}

function iconFor(code: number | null) {
  if (code === null) {
    return "🌡️";
  }

  if (code === 0) {
    return "☀️";
  }

  if (code >= 1 && code <= 3) {
    return code === 1 ? "🌤️" : "☁️";
  }

  if ([45, 48].includes(code)) {
    return "🌫";
  }

  if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) {
    return "🌦️";
  }

  if ((code >= 61 && code <= 67) || (code >= 96 && code <= 99)) {
    return "🌧️";
  }

  if (code >= 71 && code <= 77) {
    return "❄️";
  }

  return "🌈";
}

function labelFor(code: number | null) {
  if (code === null) {
    return "Condition unknown";
  }

  if (code === 0) {
    return "Clear";
  }

  if (code >= 1 && code <= 3) {
    return code === 1 ? "Mainly clear" : "Partly/mostly cloudy";
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

  if (code >= 95 && code <= 99) {
    return "Thunderstorms";
  }

  return "Cloudy";
}

async function loadWeather(postal: string, hours: number, useDefaultCoordinates = false) {
  const params = new URLSearchParams({
    postal,
    hours: String(hours),
    timezone: "America/Toronto",
  });

  if (useDefaultCoordinates) {
    params.set("lat", DEFAULT_LATITUDE);
    params.set("lon", DEFAULT_LONGITUDE);
  }

  const res = await fetch(`/api/weather?${params.toString()}`);
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

  const hours = DEFAULT_HOURS;
  const postal = DEFAULT_POSTAL;
  const isDefaultQuery = true;

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await loadWeather(postal, hours, isDefaultQuery);
        if (mounted) {
          setWeather(payload);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error fetching weather");
          setWeather(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [postal, hours]);

  return (
    <main className="page weather-only">
      {loading && !weather && !error ? (
        <p className="status">Loading forecast…</p>
      ) : null}

      {error ? <p className="card error">{error}</p> : null}

      {weather ? (
        <section className="grid hourly-only">
          <div className="hourly hourly-six">
            {weather.hourly.map((point) => (
              <article key={point.time} className="hour-card compact-hour-card">
                <p className="hour-time">{formatHour(point.time)}</p>
                <div className="hour-main">
                  <span className="hour-icon" aria-hidden>
                    {iconFor(point.conditionCode)}
                  </span>
                  <span className="hour-number">{valueOrPlaceholder(point.temp, "°C")}</span>
                </div>
                <p className="hour-sub">Feels {valueOrPlaceholder(point.feelsLike, "°C")}</p>
                <p className="hour-sub">P: {valueOrPlaceholder(point.precipProb, "%")} · {valueOrPlaceholder(point.precip, "mm")}</p>
                <p className="hour-sub">{labelFor(point.conditionCode)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
