# Scarborough hourly feed integration

Use the shared Scarborough browser feed for the fixed dashboard request, retain Open-Meteo for other locations and current conditions, and show source/freshness information with every requested hourly field.

## Scope and decisions

- App API, shared types/feed validation, hourly UI, tests, README and smoke tests.
- Preserve the existing dark cards and responsive four-column/two-column layout.
- Feed applies only to normalized M1E4V4 with matching coordinates. It must start at the current or next hour and cover the requested window, use Toronto offsets, and be no older than 90 minutes.
- Ruling: parent verified 72 live TWN rows beginning at the next hour; accept next-hour coverage as well as the current hour, rejecting later starts.
- Ruling: an explicit JSON null means source-unavailable. Missing fields and invalid values reject the whole feed; no silent partial extraction.
- Ruling: use Node's built-in test runner with TypeScript compilation; no test dependency.
- Ruling: 21st CLI is absent; reuse the existing app's tokens and components rather than adding catalog tooling for this small extension.
- Parent handles production configuration, deployment and final commit. No separate execution launch.

## Work

- [x] Write route boundary tests and observe RED: 31 cases reached missing metadata/fractional-hour assertions before route changes. Initial epoch-only fixture was corrected to reflect the baseline string-time request.
- [x] Validate/select the feed, preserve fallback and other-location behavior. Initial 31 route cases GREEN; three extra boundary cases added for final regression run.
- [x] Render all fields with explicit source/current/fallback labels. Parent will verify live browser layout.
- [x] Update docs and run tests, type check and production build: `npm test`, `npm run typecheck`, `npm run build` all exited 0; direct `node tests/weather.test.cjs` reported 34/34 passing cases. Test clock uses Node's experimental MockTimers API (warning only).
- [x] Parent review: both important findings fixed with RED/GREEN; 36 route and4 refresh tests, type check and build pass. Local production build verified. Deployment is the next parent step after commit/push; final runtime evidence is also recorded in the scraper repository plan.
- [x] Review regression RED: Kolkata current-local-hour selection failed (17:00 vs 16:00); malformed compass was accepted; all three initial refresh lifecycle cases failed as expected.
- [x] Review fix verification: select latest forecast instant at/before now, refresh every minute/on visible-tab resume, suppress overlap and abort pending requests/timers/listeners on unmount. Add request timeout and compass+VRB validation matching the producer; gust already bounded to 500. `/root/checks` verified 36/36 route cases, 4/4 refresh lifecycle cases, `npm test` (2 files), `npm run typecheck` and `npm run build` all exit 0 after the fixes.

## Evidence and risks

- Initial git status clean on 2026-10-20; branch `feat/scarborough-hourly`.
- Network and Blob credentials are parent's verification responsibility.
- Nulls cannot establish why the scraper marked a value unavailable; producer must enforce that distinction before publication.
- Reused original checkout's installed dependencies through an ignored `node_modules` symlink; lockfile/dependency versions unchanged. `npm ci` is the fresh-install path.
- `/root/checks` independently ran full app checks after the test-agent task reactivation hit the harness thread limit. Build generated all five static pages; no dependency changes were needed.
- Review root causes and verification are recorded in `docs/postmortem/2026-10-20-hour-selection-and-refresh.md`. Parent still owns deployment, browser checks, reviewed postmortem hash/alias reconciliation and commit.

## Delivery milestone

Commit subject: `feat: display scraped Scarborough forecasts`. Implementation, tests and documentation complete. Local browser1440x900 and390x844 showed12 cards in4/2 columns, no horizontal overflow and all requested fields; local API matched the live Blob. Root coordinates publication, installed timer and production release, then records the deployment evidence. No source blockers remain; original main checkout is preserved.
