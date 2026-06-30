# Weather Forecast (Next.js)

A lightweight weather dashboard built for rapid local checks in Toronto and beyond: it resolves a location from a city name or postal code, starts at the current hour, and shows the next 6/12/24 hours with temperature, feels-like temperature, rain probability, and rain amount. All data comes from a single source of truth API, so you get consistent numbers between devices.

Unlike generic weather pages, this project keeps the flow simple: quick lookup, minimal UI chrome, and condition visuals that make hourly data readable at a glance during heat or precipitation risk decisions.

## Tech Stack And Why Chosen

- Next.js App Router for server route handling and fast page rendering on Vercel.
- TypeScript for end-to-end type safety across route + UI data contracts.
- Open-Meteo Forecast + Geocoding APIs for free, no-key hourly weather and coordinate lookup.
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

### API endpoint

- `GET /api/weather?postal=<string>&hours=<6|12|24>&timezone=America/Toronto`
  - `postal` defaults to `Scarborough, Toronto`.
  - returns current point plus hourly points for the requested window.

## Day-to-Day Usage

- Launch and keep the app on a tab as your quick weather reference.
- Search by city name (`Toronto`) or a postal code (`M1E4V4`).
- Switch forecast depth with 6 / 12 / 24-hour options.
- Read at-a-glance condition visuals, feels-like temperature, rain chance, and rain amount.

## Recruiter-facing highlights

- Public API integration without secrets.
- Server/client boundary (single API route + client page) with clean separation.
- Defensive location resolution with fallback geocoding for postal inputs.
- Responsive dark theme optimized for quick, mobile-safe weather checks.
