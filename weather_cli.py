#!/usr/bin/env python3
"""Forecast CLI using the free Open-Meteo Forecast API."""

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime
import shutil
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional, Tuple

GEOCODE_API_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast"

DEFAULT_POSTAL = "M1E4V4"
DEFAULT_TIMEZONE = "America/Toronto"
DEFAULT_HOURS = 12
FALLBACK_TORONTO = {
    "name": "Toronto, ON",
    "latitude": 43.6532,
    "longitude": -79.3832,
    "timezone": DEFAULT_TIMEZONE,
}


def fetch_json(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    query = urllib.parse.urlencode(params)
    request_url = f"{url}?{query}"
    request = urllib.request.Request(request_url, headers={"User-Agent": "weather-cli/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=20) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code}: {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc
    except ValueError as exc:
        raise RuntimeError("Failed to parse API response as JSON") from exc


def geocode(location: str) -> Optional[Dict[str, Any]]:
    data = fetch_json(
        GEOCODE_API_URL,
        {
            "name": location,
            "count": 1,
            "language": "en",
            "format": "json",
        },
    )
    results = data.get("results") or []
    if not results:
        return None
    return results[0]


def resolve_location(
    postal: Optional[str], city: Optional[str], lat: Optional[float], lon: Optional[float]
) -> Tuple[float, float, str]:
    if lat is not None and lon is not None:
        return lat, lon, f"Manual coordinates ({lat}, {lon})"

    candidates: List[str] = []
    if city:
        candidates.append(city)
    if postal:
        candidates.append(postal)

    for query in candidates:
        result = geocode(query)
        if result:
            return (
                float(result["latitude"]),
                float(result["longitude"]),
                f"{result.get('name', query)}, {result.get('country', 'Unknown')}",
            )

    return (
        FALLBACK_TORONTO["latitude"],
        FALLBACK_TORONTO["longitude"],
        f"{FALLBACK_TORONTO['name']} (fallback for unresolved location)",
    )


def get_forecast(
    latitude: float, longitude: float, timezone: str
) -> Tuple[List[str], Dict[str, List[Optional[float]]], Dict[str, str]]:
    data = fetch_json(
        FORECAST_API_URL,
        {
            "latitude": f"{latitude:.6f}",
            "longitude": f"{longitude:.6f}",
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "apparent_temperature",
                    "precipitation_probability",
                    "precipitation",
                    "rain",
                    "showers",
                ]
            ),
            "timezone": timezone,
            "forecast_days": 2,
        },
    )

    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    values: Dict[str, List[Optional[float]]] = {
        "temp": hourly.get("temperature_2m"),
        "feels": hourly.get("apparent_temperature"),
        "precip_prob": hourly.get("precipitation_probability"),
        "precip": hourly.get("precipitation"),
        "rain": hourly.get("rain"),
        "showers": hourly.get("showers"),
    }
    metadata = {
        "timezone": data.get("timezone", timezone),
    }
    return times, values, metadata


def parse_local_hour(dt_str: str, timezone: str) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        dt = datetime.fromisoformat(dt_str)
    except ValueError:
        return None

    tz = ZoneInfo(timezone)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    else:
        dt = dt.astimezone(tz)
    return dt.replace(minute=0, second=0, microsecond=0)


def starting_index(times: List[str], timezone: str) -> int:
    now = datetime.now(ZoneInfo(timezone)).replace(minute=0, second=0, microsecond=0)
    idx = 0
    for i, t in enumerate(times):
        parsed = parse_local_hour(t, timezone)
        if parsed is None:
            continue
        if parsed >= now:
            idx = i
            break
    return idx


def format_time(ts: str, compact: bool = False) -> str:
    try:
        dt = datetime.fromisoformat(ts)
        if compact:
            return dt.strftime("%H:%M")
        return dt.strftime("%m-%d %H:%M")
    except Exception:
        return ts[:16] if compact else ts


def fmt_value(value: Optional[float], decimals: int = 1, suffix: str = "") -> str:
    if value is None:
        return "n/a"
    if isinstance(value, (int, float)):
        if suffix:
            return f"{value:{'.'+str(decimals)+'f' if decimals > 0 else '.0f'}}{suffix}"
        return f"{value:.{decimals}f}"
    return str(value)


def print_table(times: List[str], values: Dict[str, List[Optional[float]]], rows: int, compact: bool = False) -> None:
    if compact:
        headers = ["Time", "T", "Feel", "P%", "P"]
        temp_decimals = 1
        feels_decimals = 1
        prob_decimals = 0
        precip_decimals = 1
    else:
        headers = ["Time (local)", "Temp (°C)", "Feels Like (°C)", "Precip %", "Precip (mm)"]
        temp_decimals = 1
        feels_decimals = 1
        prob_decimals = 0
        precip_decimals = 1

    output_rows = []
    count = min(rows, len(times))
    for i in range(count):
        time_val = format_time(times[i], compact=compact)

        temp_value = _safe_get(values["temp"], i)
        feels_value = _safe_get(values["feels"], i)
        precip_prob_value = _safe_get(values["precip_prob"], i)
        precip_value = _safe_get(values["precip"], i)

        temp = fmt_value(temp_value, decimals=temp_decimals, suffix="")
        feels = fmt_value(feels_value, decimals=feels_decimals, suffix="")
        precip_prob = fmt_value(
            precip_prob_value,
            decimals=prob_decimals,
            suffix="%" if precip_prob_value is not None else "",
        )
        precip = fmt_value(precip_value, decimals=precip_decimals, suffix="mm" if not compact else "")

        output_rows.append([
            time_val,
            f"{temp:>4}" if compact else temp,
            f"{feels:>5}" if compact else feels,
            f"{precip_prob:>4}" if compact else precip_prob,
            f"{precip:>4}" if compact else precip,
        ])

    widths = [len(h) for h in headers]
    for row in output_rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(cell))

    header_line = " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    print(header_line)
    print("-+-".join("-" * widths[i] for i in range(len(headers))))
    for row in output_rows:
        print(" | ".join(row[i].ljust(widths[i]) for i in range(len(row))))


def _safe_get(values: Optional[List[Optional[float]]], idx: int) -> Optional[float]:
    if not values or idx >= len(values):
        return None
    value = values[idx]
    if value is None:
        return None
    return float(value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Display hourly forecast from Open-Meteo in a formatted table."
    )
    parser.add_argument(
        "--postal",
        default=DEFAULT_POSTAL,
        help="Postal code used when city/coordinates are not provided",
    )
    parser.add_argument(
        "--city",
        help="City name for geocoding lookup (default: none; uses --postal)",
    )
    parser.add_argument("--lat", type=float, help="Latitude override")
    parser.add_argument("--lon", type=float, help="Longitude override")
    parser.add_argument(
        "--hours",
        type=int,
        default=DEFAULT_HOURS,
        help=f"Number of upcoming hourly rows to show (default: {DEFAULT_HOURS})",
    )
    parser.add_argument(
        "--timezone",
        default=DEFAULT_TIMEZONE,
        help="Timezone for response times (default: America/Toronto)",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Use compact output intended for narrow screens (mobile)",
    )
    return parser.parse_args()


def is_narrow_terminal() -> bool:
    try:
        width = shutil.get_terminal_size(fallback=(80, 20)).columns
        return width <= 56
    except Exception:
        return False


def main() -> int:
    args = parse_args()
    if args.hours <= 0:
        print("--hours must be greater than 0", file=sys.stderr)
        return 2

    if (args.lat is None) != (args.lon is None):
        print("Please provide both --lat and --lon together", file=sys.stderr)
        return 2

    latitude, longitude, resolved_name = resolve_location(args.postal, args.city, args.lat, args.lon)
    try:
        times, values, metadata = get_forecast(latitude, longitude, args.timezone)
    except RuntimeError as exc:
        print(f"Weather API error: {exc}", file=sys.stderr)
        return 1

    if not times:
        print("No hourly forecast data returned by API.", file=sys.stderr)
        return 1

    timezone = metadata.get("timezone", args.timezone)
    start = starting_index(times, timezone)
    times = times[start:]
    for key in values:
        if values.get(key):
            values[key] = values[key][start:]

    compact = args.compact or is_narrow_terminal()

    print(f"Location: {resolved_name}")
    print(f"Coordinates: {latitude:.6f}, {longitude:.6f} ({timezone})")
    if start > 0:
        print("Note: forecast starts from next available hour for local time.")
    print()

    print_table(times, values, args.hours, compact=compact)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
