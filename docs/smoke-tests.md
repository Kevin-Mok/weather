# Weather layout smoke tests

Check the forecast at desktop and phone sizes to confirm the hourly grid is readable and follows the requested layout. Start the app, open its local URL, and resize the browser.

## Local checks

- **Action:** npm run dev -- --port 3001
- **Expected:** Weather Forecast is available at http://localhost:3001.
- **Action:** Open the page at 1440×900, 1280×800, and 1920×1080.
- **Expected:** Nine consecutive hourly cards fill three columns and three rows; all metrics are readable and the grid fits the viewport.
- **Action:** Resize to 768×1024, then 641×900.
- **Expected:** The desktop grid retains three columns and three rows with no horizontal overflow or overlapping metrics.
- **Action:** Resize to 390×844 and 640×900.
- **Expected:** Twelve cards form two columns and six rows. The first three rows fit on screen; scrolling reveals the final three rows. The page has no horizontal overflow.
- **Action:** Resize back to desktop without reloading.
- **Expected:** The first nine hourly cards form a 3×3 grid immediately and mobile scrolling disappears.

## Verification evidence

- Baseline browser check: six cards and two desktop rows, failing the requested nine-card layout.
- Initial nine-hour desktop/six-hour mobile browser checks passed at every size above. Updated twelve-hour mobile scroll checks passed at 390×844 and 640×900: twelve cards, six rows, six cards fully visible per screen, and the last six visible after scrolling. All desktop sizes retained nine fully visible cards and no overflow or metric overlap.
- `npx tsc --noEmit` and `npm run build` passed. A 1440×900 screenshot was visually reviewed.

## Deployment status

- Production deployment is blocked: automatic approval review requires explicit authorization, and Vercel CLI has no saved credentials. No new deployment URL is available.
