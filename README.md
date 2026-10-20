# Weather Forecast (Next.js)

A lightweight weather dashboard built for rapid local checks in Toronto and beyond: it opens to Scarborough, Toronto, and shows twelve hourly forecasts with temperature, feels-like temperature, condition and precipitation probability. Scarborough uses a validated browser-scraped The Weather Network feed when available. Other requests and feed failures use Open-Meteo. Current conditions are separately labeled Open-Meteo.

The project demonstrates a typed server/client boundary, defensive validation of a shared public forecast feed, explicit source/fallback reporting, and a responsive dark theme. Desktop uses four columns; mobile uses two. Twelve cards form three desktop rows or six mobile rows; shorter viewports scroll to preserve readable metrics.

## Tech Stack And Why Chosen

- Next.js App Router for server route handling and fast page rendering on Vercel.
- TypeScript for end-to-end type safety across route + UI data contracts.
- The Weather Network browser feed in public Vercel Blob for the fixed Scarborough forecast; Open-Meteo Forecast + Geocoding APIs for current conditions, fallback and other locations.
- Minimal React state with responsive cards for fast updates and simple maintenance.

## Install and Bootstrap

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open the local site:

```bash
http://localhost:3000
```

## Core Command Reference

### Frontend commands

- `npm run dev` - start local development server.
- `npm run build` - production build.
- `npm run start` - run the built app.
- `npm run lint` - run Next lint checks.
- `npm test` - compile TypeScript and run Node route integration tests with controlled upstream responses.
- `npm run typecheck` - check TypeScript without emitting application code.

### API endpoint

- `GET /api/weather?postal=<string>&hours=<1–48>&timezone=America/Toronto`
  - `postal` defaults to `M1E4V4` (mapped to Scarborough, Toronto fallback coords).
  - `hours` defaults to 12; the dashboard requests 12.
  - Optional `lat` and `lon` bypass geocoding; the dashboard uses the default location coordinates.
  - `hours` is rounded down and bounded to 1–48.
  - returns `current` plus `currentSource: "open-meteo"`, `hourly`, `hourlySource`, `hourlyFetchedAt` and `hourlyFallbackReason`.
  - Hourly times include dates and UTC offsets, including repeated/skipped Toronto DST hours.

## Scarborough feed setup and recovery

Set `WEATHER_BLOB_URL` to the public URL of `weather/scarborough-hourly.json` in the local `.env.local` file and Vercel's Production environment, then redeploy. The app only reads the public URL; keep the Blob write token in the scraper machine's private configuration. Never add it to this app or prefix it with `NEXT_PUBLIC_`. Configure the separate scraper to run every 30 minutes and overwrite the Blob with a 60-second cache lifetime; overwrites can take up to 60 seconds to propagate.

The feed is selected only for normalized `M1E4V4`, coordinates within 0.0001 degrees of 43.7729744, -79.2576479, and `America/Toronto`. A feed with the wrong location/schema, a future fetch time, missing or invalid fields, noncontiguous/incorrect Toronto timestamps, or insufficient near-term coverage is rejected. The earliest selected hour can be the current or next hour because TWN begins at the next hour. Fetches older than 90 minutes trigger fallback; exactly 90 minutes remains valid.

The version 1 contract is `{schemaVersion: 1, source: "the-weather-network", sourceUrl, fetchedAt, location, hourly}`. `sourceUrl` is `https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly`. `fetchedAt` is a UTC ISO timestamp. `location` contains `name: "Scarborough, Toronto, Ontario, Canada"`, `postalCode: "M1E4V4"`, `latitude: 43.7729744`, `longitude: -79.2576479`, and `timezone: "America/Toronto"`.

Each hourly record contains `time` (e.g. `2026-11-01T01:00:00-05:00`), `temp`, `feelsLike`, `condition`, `windSpeed`, `windDirection`, `windGust`, `humidity` and `precipProb`. Units are Celsius, km/h and percentages. Wind speed and gust must be 0–500 km/h; direction is one of the 16 compass points or `VRB` (calm direction can be null). Every field is required; explicit `null` denotes a source-unavailable value, while omitted/invalid fields reject the feed. The scraper must distinguish unavailable values from extraction errors before publishing. Zero precipitation and negative temperatures are retained. Scraped records have API `precip` and `conditionCode` set to null because the source contract does not supply them.

When the feed is unconfigured, unreachable, invalid, stale or missing coverage, the app reports the corresponding `hourlyFallbackReason` and labels Open-Meteo fallback visibly. Other locations normally use Open-Meteo with a null fallback reason. Check the scraper's last successful run and Blob contents, repair its credentials or extraction, publish a fresh valid feed, allow 60 seconds for propagation, and reload the page. The feed read has an eight-second timeout. Open-Meteo failure returns a 502 response with a readable error.

## Day-to-Day Usage

- Launch and keep the app on a tab as your quick weather reference.
- The page fetches every minute and when a hidden tab becomes visible. Requests never overlap and time out after 15 seconds; closing the page clears timers and cancels its pending request. Failed refreshes clear old values and show an error. Resuming an expired TWN view clears its old values while the fresh request runs.
- Desktop (above 640px): twelve hourly cards in four columns and three rows.
- Mobile (640px and below): twelve hourly cards in two columns and six rows; scroll to see later hours.
- Check the hourly source and fetch timestamp, then read each card's dated time, temperature, condition, feels-like and precipitation chance. Open-Meteo fallback additionally includes precipitation amount.
- Other locations select their current local forecast hour by actual timestamps, including half-hour timezones and DST transitions.
- Follow [the smoke tests](docs/smoke-tests.md) for feed, fallback and responsive checks.
