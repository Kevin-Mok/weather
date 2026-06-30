# Weather Forecast CLI

A lightweight command-line weather forecast utility for comparing current and upcoming conditions in Toronto and elsewhere without API keys. It uses Open-Meteo endpoints to return hourly temperature, apparent temperature, precipitation chance, and precipitation amount in a format that is easy to scan on desktop or mobile.

The script focuses on practical decisions like heat-risk planning, rain prep, and fast lookups from postal code so users get consistent forecast values in one compact command.

## Tech Stack And Why Chosen

- Python 3 standard library (`argparse`, `urllib`, `datetime`, `zoneinfo`) keeps the tool dependency-free and reliable.
- Open-Meteo public Forecast API provides free, no-auth hourly fields for temperature, feels-like, and precipitation, matching the requested data points.
- Open-Meteo Geocoding API resolves location inputs to coordinates, enabling postal code and city usage without requiring external SDKs.

## Install and Bootstrap

- Ensure Python 3.10+ is installed.
- Clone or open this repository.
- Run from the repo root:

```bash
python weather_cli.py --help
```

No API keys, environment variables, or extra packages are required.

## Day-to-Day Usage

- Default command (Toronto area from M1E4V4, 12-hour output):

```bash
python weather_cli.py
```

- Show a different time window:

```bash
python weather_cli.py --hours 6
```

- Use an explicit city lookup:

```bash
python weather_cli.py --city "Toronto"
```

- Use explicit coordinates:

```bash
python weather_cli.py --lat 43.6532 --lon -79.3832 --hours 24
```

- Force compact display for mobile-like terminals:

```bash
python weather_cli.py --compact
```

## Core Command Reference

- `--postal`: postal code to geocode (default `M1E4V4`).
- `--city`: city name for geocoding lookup (fallback after postal).
- `--lat` + `--lon`: explicit coordinates override geocoding.
- `--hours`: number of hourly rows to display (default `12`).
- `--timezone`: timezone used for returned hourly labels.
- `--compact`: tighter table layout for narrow terminals.

### Notes

- If you see a warning about heat index differences, this CLI displays Open-Meteo values and may differ from Weather Network's warning engine.
- It starts from the current local hour and presents the next N hours.

## Why This Is Impressive to Recruiters

This project demonstrates practical API integration, user-focused CLI UX (location resolution + adaptive formatting), and production-safe behavior (no API keys, clear fallbacks, defensive parsing), while keeping implementation small and maintainable.
