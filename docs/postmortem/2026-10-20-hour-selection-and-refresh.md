# Hour selection and dashboard refresh regressions

Independent review found that non-whole-hour timezones skip the current local hour and that an open dashboard never refreshes its initial feed. Reproduce both boundaries, correct selection and refresh lifecycle, then rerun route and build checks.

- Status: resolved and deployed in feature revision3d1c4d634f3b787c9dd08868aad76397472127fa.
- Symptoms: at 2026-10-20T11:10Z (16:40 Kolkata), UTC flooring selects 17:00 instead of the forecast's current 16:00 local hour; the page's mount-only effect keeps its initial TWN values indefinitely.
- Impact: wrong first hour for other locations; stale forecasts can remain visible on an open dashboard past the 90-minute feed limit.
- Evidence: route compares forecast epoch seconds with a UTC-hour floor; page effect calls `fetchData()` once and only sets `mounted = false` during cleanup.
- Lookup: `timezone hour offset half hour DST` and `dashboard refresh stale timer cleanup` returned spreadsheet/media/recap findings with unrelated applicability. No applicable prior remedy; use focused executable reproductions.
- Root cause: UTC-aligned hour boundaries were assumed for all locations; no recurring fetch or resume listener existed. Feed direction validation also accepted arbitrary nonempty strings rather than the producer's compass enum.
- Resolution: select the latest supplied forecast instant at/before now; poll every minute and on tab visibility resume with an in-flight guard, abortable 15-second timeout, and complete effect cleanup. Expired TWN values clear before resume fetch; failures clear old data. Validate 16 compass values plus `VRB`, preserving explicit null for unavailable/calm direction.
- RED evidence: `/root/checks` observed Kolkata 17:00 vs expected 16:00 and accepted `banana` compass; all three initial refresh cases failed periodic/resume/abort assertions.
- GREEN evidence: independent `/root/checks` reports 36/36 route cases and 4/4 refresh lifecycle cases, `npm test`, `npm run typecheck`, `npm run build` all exit 0. Existing midnight and DST route cases remain green; build generated five static pages and the dynamic weather endpoint. Test clock emits Node's experimental MockTimers warning only.
- Runtime verification: production deployment metadata matches the feature commit; API and desktop/mobile browser checks pass. Parent reconciles reviewed report hash/alias in tracked postmortem knowledge outside this checkout. Timer regressions execute the real page effect with controlled hook lifecycle and network/clock/document boundaries; they do not replace browser layout verification.
- Learning update: parent owns reviewed hash/alias updates outside this checkout; do not edit installed skill copies.
- Inspection note: the first test patch used an incomplete long-line context and was rejected atomically; retry uses the exact inventoried text. No file state changed from the rejected patch.
