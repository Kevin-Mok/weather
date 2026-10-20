# UI context tooling unavailable

The optional UI context loader could not run in this workspace. Use the existing component and stylesheet as the source of truth for the small forecast display removal.

- Symptom: the initial installed Impeccable skill path was absent; the correct launcher then reported engine 0.1.14 missing and could not create its home cache directory.
- Impact: no product behavior affected; automated context loading unavailable.
- Evidence: launcher exited 127 before editing app files. The existing page, README and smoke checks were read directly.
- Lookup: postmortem-memory query `impeccable engine cache permission` returned general cache/permission findings, none applicable to this missing optional engine. No remedy was inferred from those matches.
- Resolution: used the existing app context directly, as the skill's documented fallback instructs. No engine installation or permission change attempted.
- Browser tooling: chrome-devtools-axi snapshot did not return; CUA reported no enabled browser. agent-browser initially could not write its default socket under /run/user/1000 (read-only). A task-specific socket directory plus the approved Chrome launch outside workspace restrictions restored browser verification. Local snapshot confirmed twelve cards and no removed metrics.
- Status: verified workflow fallback; optional engine remains unavailable. Canonical memory ledger at `~/linux-config/dot_agents/skills/postmortem-memory/` is outside the writable workspace; reviewed-hash registration remains outstanding. No new product engineering lesson.

## Production approval boundary

The production deployment command was rejected by automatic approval review before execution because the live user request did not explicitly authorize production publication. The source commit is safely pushed; production deployment is pending explicit user approval. No direct production deployment executed. The later main-branch push may trigger the existing Git integration; production deployment status has not been verified.

## Local address mismatch

- Symptom: the user still saw the old forecast at localhost:3001 after the display-removal handoff.
- Evidence: the verified build was running only on port 4319 from the weather-app worktree. An elevated listener inspection found no listener on 3001; its HTTP connection failed.
- Root cause: verification and handoff used a different local address from the user's open tab. The prior DOM could remain visible without a running server.
- Resolution: started the already-verified production build on port 3001 without stopping another listener.
- Verification: Chrome at exactly http://localhost:3001/ showed 12 cards, removedMetricsVisible=false, and remaining labels Condition, Feels like, Precip chance.
- Follow-up: smoke checks now require verifying the intended checkout and exact address. No application code changed; production deployment approval remains separate and pending.

## Correct checkout identified by user

The localhost:3001 follow-up did not fix the user's actual workflow. The user clarified `npd` in `~/coding/weather` on port 3002. `npd` maps to `npm run dev`; that clean main checkout was still at 8aa13cc, while the updated app lived in a separate clone (not a linked Git worktree). Fast-forwarded the normal checkout to 8119f00 and added only the public WEATHER_BLOB_URL setting to ignored .env.local, preserving other settings. Started Next dev from that exact directory on 3002. Browser at exactly localhost:3002 confirmed 12 cards, TWN source, and no humidity/wind/gust. Main pushed to ssh/main. Tests: 42/42 and type check pass in the normal checkout.

Lesson: resolve the user's launch shortcut and working directory before choosing a local server; matching a guessed port alone does not establish the intended checkout.
