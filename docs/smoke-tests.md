# Weather feed and layout smoke tests

Check source selection, fallback and every hourly metric at desktop and phone sizes. Configure the public feed URL, start the app, inspect the API, then resize the forecast page.

## Feed checks

- **Action:** Configure `WEATHER_BLOB_URL` with a fresh valid published feed, start the app, then open `/api/weather?postal=M1E4V4&hours=12&timezone=America%2FToronto&lat=43.7729744&lon=-79.2576479`.
- **Expected:** `hourlySource` is `the-weather-network`; `hourlyFetchedAt` matches the feed; `hourlyFallbackReason` is null. Twelve dated Toronto-offset records include condition, wind speed/direction/gust, humidity and precipitation chance. Negative temperatures and zero precipitation remain numbers. `currentSource` is `open-meteo`; current conditions are independent.
- **Action:** Compare the first, middle and last displayed hours with the source and published JSON, including one expanded source row.
- **Expected:** Every displayed metric matches the corresponding source value; source-unavailable fields display `n/a`; no fabricated precipitation amount or weather-code icon appears for scraped rows. Source data may start at the next hour.
- **Action:** In a local fixture feed, exercise a fetch time older than 90 minutes, a missing required metric, and unavailable HTTP response; reload after each change.
- **Expected:** Open-Meteo hourly values appear with explicit `stale`, `invalid` or `unavailable` fallback metadata and readable fallback text. Removing `WEATHER_BLOB_URL` yields `unconfigured` fallback. No broken/partial scraped cards appear.
- **Action:** Request `/api/weather?postal=Ottawa&lat=45.4215&lon=-75.6972&hours=1` and `/api/weather?postal=M1E4V4&lat=45.4215&lon=-75.6972&hours=1`.
- **Expected:** Both use Open-Meteo with a null fallback reason and preserve the requested coordinates.
- **Action:** Use fixtures covering midnight, spring DST and fall's repeated 01:00 hour (automated route cases also cover these), then reload.
- **Expected:** Consecutive actual hours are selected with the correct date and offset; repeated local hours remain distinguishable by their offsets.
- **Action:** Leave the page open for a minute while inspecting its Network panel, then hide and resume the tab.
- **Expected:** A weather request starts every minute and on tab resume, with no overlapping requests. A source update or stale-feed fallback replaces the existing cards without reloading. Unmounting cancels any request and removes scheduled work.
- **Action:** Serve a fixture just under 90 minutes old, then make its next response stale; also exercise a stalled response or unavailable API.
- **Expected:** The next automatic request switches to labeled fallback. Resuming an already expired TWN view hides its old cards while refreshing; failed/timed-out requests clear old values and show a readable error, and later requests retry. Executable timer regressions cover these transitions without waiting 90 minutes.
- **Action:** Request Kolkata at 16:40 local time with `timezone=Asia/Kolkata` and coordinates 22.5726, 88.3639 (or use the automated fixed-clock route case).
- **Expected:** The first Open-Meteo hour is 16:00 with `+05:30`, followed by consecutive hours; UTC flooring does not skip it.

## Local checks

- **Action:** npm run dev -- --port 3001
- **Expected:** Weather Forecast is available at http://localhost:3001.
- **Action:** Open the page at 1440×900, 1280×800, and 1920×1080.
- **Expected:** Twelve consecutive hourly cards form four columns and three rows; source/fetch/current labels and every hourly metric are readable. Shorter viewports scroll if needed.
- **Action:** Resize to 768×1024, then 641×900.
- **Expected:** The desktop grid retains four columns and three rows with no horizontal overflow or overlapping metrics.
- **Action:** Resize to 390×844 and 640×900.
- **Expected:** Twelve cards form two columns and six rows. Scrolling reveals later hours. Dates, UTC offsets, conditions, wind, gust, humidity and precipitation chance remain readable with no horizontal overflow.
- **Action:** Resize back to desktop without reloading.
- **Expected:** All twelve hourly cards form a 4×3 grid immediately; scrolling follows viewport height.

## Previous layout evidence

- Baseline: nine visible desktop cards in three columns; the requested layout requires twelve cards in four columns and three rows.
- Browser checks passed at all dimensions above: twelve desktop cards in four columns and three rows, no desktop overflow or overlapping metrics, and unchanged mobile scrolling with six full cards per screen.
- A 1440×900 screenshot was visually reviewed. Production build, including lint and type checks, passed.

## Previous deployment status

- [Production](https://weather-kevinm.vercel.app): Ready; live browser checks passed at every dimension above with real forecast data.
- [Verified implementation deployment](https://vercel.com/kevin-mok/weather-kevinm/4uFcxYS83PbHGcg9PeCyC14o2iCN): Vercel GitHub status for `bb82616` is `success`.
- Deployment runs automatically through the configured Vercel GitHub integration. No separate Preview deployment is created for main-branch releases.

The evidence above predates feed integration. Record fresh feed/layout/deployment evidence in [the current plan](../plans/scarborough-hourly.md) before claiming the new revision is deployed.
