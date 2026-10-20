# Forecast display simplification

Remove humidity and all wind details from hourly cards, retain the other forecast information, and verify both forecast sources before release.

## Atomic plan

- [x] Add a rendered-card check for both TWN and Open-Meteo; observe RED because Wind, Gust and Humidity are present.
- [x] Remove those three UI rows; update README and responsive smoke expectations. Feed/API contracts stay compatible.
- [x] Verify: suite (3 files), type check and production build all exit 0. Local Chrome shows 12 TWN cards with no removed metrics.
- [ ] Commit `fix: remove wind and humidity from forecast cards`, push active upstream and deploy the configured weather-kevinm target.

## Verification and handoff

Automated: `npm test`, `npm run typecheck`, `npm run build`. Manual: open forecast at desktop and phone widths, confirm condition, temperature, feels-like and precipitation remain readable while humidity/wind/gust are absent. Check Open-Meteo fallback too.

Cursor prompt: Verify the forecast cards in app/page.tsx omit humidity, wind and gust for both sources; preserve the feed/API contract, refresh behavior and remaining metrics. Run the documented automated and manual checks; change only defects found.

Docs updated: README.md and docs/smoke-tests.md. Rollback: revert the focused display-removal commit. Optional UI context tooling fallback is recorded in docs/postmortem/2026-10-20-ui-context-tooling.md.
