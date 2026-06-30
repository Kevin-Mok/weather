"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
const DEFAULT_HOURS = 12;
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

function currentLabel(point: HourPoint) {
  const t = valueOrPlaceholder(point.temp, "°C");
  const f = valueOrPlaceholder(point.feelsLike, "°C");
  const p = valueOrPlaceholder(point.precipProb, "%");
  const mm = valueOrPlaceholder(point.precip, "mm");
  return { t, f, p, mm };
}

export default function Home() {
  const [postal, setPostal] = useState(DEFAULT_POSTAL);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [searchPostal, setSearchPostal] = useState(DEFAULT_POSTAL);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDefaultQuery, setIsDefaultQuery] = useState(true);

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
  }, [postal, hours, isDefaultQuery]);

  const submitQuery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchPostal.trim() || DEFAULT_POSTAL;
    setPostal(normalized);
    setIsDefaultQuery(normalized === DEFAULT_POSTAL);
  };

  const header = useMemo(() => {
    if (!weather) {
      return "Toronto Weather";
    }

    return `${weather.location.name} Weather`;
  }, [weather]);

  return (
    <main className="page">
      <section className="header">
        <div>
          <h1 className="title">{header}</h1>
          <p className="subtitle">Open-Meteo • no API key • hourly forecast + feels-like</p>
        </div>
        <form className="form" onSubmit={submitQuery}>
          <input
            value={searchPostal}
            onChange={(event) => setSearchPostal(event.target.value)}
            aria-label="Location search"
            className="input"
            placeholder="Postal code or city"
          />
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            aria-label="Hours"
            className="select"
          >
            <option value={6}>6h</option>
            <option value={12}>12h</option>
            <option value={24}>24h</option>
          </select>
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Updating..." : "Refresh"}
          </button>
        </form>
      </section>

      <p className="status">Showing next {hours} hour{hours > 1 ? "s" : ""} from Open-Meteo.</p>

      {error && <p className="card error">{error}</p>}

      {loading && !weather && <p className="status">Loading forecast…</p>}

      {weather && (
        <>
          <section className="card current">
            <div className="cond-badge" aria-hidden>
              {iconFor(weather.current.conditionCode)}
            </div>
            <div>
              <p className="temp">Current: {currentLabel(weather.current).t}</p>
              <p className="feels">Feels like: {currentLabel(weather.current).f}</p>
              <p className="cond">{labelFor(weather.current.conditionCode)} · {formatHour(weather.current.time)}</p>
              <p className="cond">Precip chance: {currentLabel(weather.current).p} · Amount: {currentLabel(weather.current).mm}</p>
            </div>
          </section>

          <section className="grid" style={{ marginTop: 12 }}>
            <h2 style={{ margin: "8px 0", fontSize: "1.1rem" }}>Hourly forecast</h2>
            <div className="hourly">
              {weather.hourly.map((point) => (
                <article key={point.time} className="hour-card">
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
        </>
      )}
    </main>
  );
}
