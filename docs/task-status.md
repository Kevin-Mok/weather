# Forecast display simplification

Remove humidity and all wind details from hourly cards, retain the other forecast information, and verify both forecast sources before release.

## Atomic plan

- [x] Add a rendered-card check for both TWN and Open-Meteo; observe RED because Wind, Gust and Humidity are present.
- [x] Remove those three UI rows; update README and responsive smoke expectations. Feed/API contracts stay compatible.
- [x] Verify: suite (3 files), type check and production build all exit 0. Local Chrome shows 12 TWN cards with no removed metrics.
- [x] Commit `fix: remove wind and humidity from forecast cards` (`8119f00`) pushed to `ssh/feat/scarborough-hourly`.
- [ ] Deploy weather-kevinm: automatic approval review rejected production publication without explicit user authorization. Approval requested; do not retry until granted.

## Verification and handoff

Automated: `npm test`, `npm run typecheck`, `npm run build`. Manual: open forecast at desktop and phone widths, confirm condition, temperature, feels-like and precipitation remain readable while humidity/wind/gust are absent. Check Open-Meteo fallback too.

Cursor prompt: Verify the forecast cards in app/page.tsx omit humidity, wind and gust for both sources; preserve the feed/API contract, refresh behavior and remaining metrics. Run the documented automated and manual checks; change only defects found.

Docs updated: README.md and docs/smoke-tests.md. Rollback: revert the focused display-removal commit. Optional UI context tooling fallback is recorded in docs/postmortem/2026-10-20-ui-context-tooling.md.

Local-address follow-up: started the updated production build on localhost:3001 (the user's address). Chrome confirmed 12 cards and no humidity/wind/gust; condition, feels-like and precipitation remain. Port 4319 had been the earlier verification target. Smoke documentation now requires matching checkout and address.

Corrected local workflow: `~/coding/weather` main fast-forwarded to 8119f00 and pushed to ssh/main. `npd` is npm run dev. The exact localhost:3002 page now shows 12 TWN cards without humidity/wind/gust. Public feed URL configured in that checkout's ignored local environment. 42 tests and type check pass. Earlier port 3001 verification targeted the wrong checkout and was superseded.

## Session closeout milestone

Commit subject: `docs: record corrected local weather workflow`. Include only the three directly observed documentation updates: this status, smoke checks and the tooling/local-checkout incident. The scope helper returned unsafe because it detected no successful writes; explicit conversation write evidence establishes ownership. All seven dirty files in the scraper repository are outside this session's observed edits and remain excluded.

README gate: pass_no_change after comparing the existing opening, stack rationale, install, commands and daily usage with package.json and the implemented forecast behavior. No README edits needed for the checkout correction. Validation: documentation diff review, exact localhost:3002 browser/API checks, plus the earlier 42 tests and type check from the normal weather checkout. No application code changed in this closeout.

Remaining limitation: optional Impeccable engine unavailable; canonical incident-memory hash registration is outstanding outside this workspace. Production deployment remains unverified.

Privacy gate repair: replaced user-specific absolute home paths with portable `~/` paths in the two incident reports and this status. The app-inspection report is an additional, narrowly scoped privacy repair directly observed during closeout. Reused the existing external private policy that already approves this Git identity; no policy or Git identity was changed.
