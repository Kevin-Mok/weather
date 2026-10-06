# Weather Forecast (Next.js)

A lightweight weather dashboard built for rapid local checks in Toronto and beyond: it opens to Scarborough, Toronto, starts at the current hour, and shows nine hours in a 3×3 desktop grid or twelve hours in a 2×6 mobile grid with three rows visible at a time with temperature, feels-like temperature, rain probability, and rain amount. All data comes from a single source of truth API, so you get consistent numbers between devices.

The project demonstrates a typed server/client boundary, public weather API integration without secrets, and a responsive dark theme with minimal UI chrome for quick weather checks.

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

- `GET /api/weather?postal=<string>&hours=<1–48>&timezone=America/Toronto`
  - `postal` defaults to `M1E4V4` (mapped to Scarborough, Toronto fallback coords).
  - `hours` defaults to 12; the dashboard requests 12.
  - Optional `lat` and `lon` bypass geocoding; the dashboard uses the default location coordinates.
  - returns current point plus hourly points for the requested window.

## Day-to-Day Usage

- Launch and keep the app on a tab as your quick weather reference.
- Desktop (above 640px): nine hourly cards in three columns and three rows.
- Mobile (640px and below): twelve hourly cards in two columns and six rows; scroll to see the last three rows.
- Read at-a-glance condition visuals, feels-like temperature, rain chance, and rain amount.
