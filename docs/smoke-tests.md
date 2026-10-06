# Weather layout smoke tests

Check the forecast at desktop and phone sizes to confirm the hourly grid is readable and follows the requested layout. Start the app, open its local URL, and resize the browser.

## Local checks

- **Action:** npm run dev -- --port 3001
- **Expected:** Weather Forecast is available at http://localhost:3001.
- **Action:** Open the page at 1440×900, 1280×800, and 1920×1080.
- **Expected:** Twelve consecutive hourly cards fill four columns and three rows; all metrics are readable and the grid fits the viewport.
- **Action:** Resize to 768×1024, then 641×900.
- **Expected:** The desktop grid retains four columns and three rows with no horizontal overflow or overlapping metrics.
- **Action:** Resize to 390×844 and 640×900.
- **Expected:** Twelve cards form two columns and six rows. The first three rows fit on screen; scrolling reveals the final three rows. The page has no horizontal overflow.
- **Action:** Resize back to desktop without reloading.
- **Expected:** All twelve hourly cards form a 4×3 grid immediately and mobile scrolling disappears.

## Verification evidence

- Baseline: nine visible desktop cards in three columns; the requested layout requires twelve cards in four columns and three rows.
- Browser checks passed at all dimensions above: twelve desktop cards in four columns and three rows, no desktop overflow or overlapping metrics, and unchanged mobile scrolling with six full cards per screen.
- A 1440×900 screenshot was visually reviewed. Production build, including lint and type checks, passed.

## Deployment status

- [Production](https://weather-kevinm.vercel.app): Ready; live browser checks passed at every dimension above with real forecast data.
- [Verified implementation deployment](https://vercel.com/kevin-mok/weather-kevinm/4uFcxYS83PbHGcg9PeCyC14o2iCN): Vercel GitHub status for `bb82616` is `success`.
- Deployment runs automatically through the configured Vercel GitHub integration. No separate Preview deployment is created for main-branch releases.
