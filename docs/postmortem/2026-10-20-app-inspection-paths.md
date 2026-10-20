# App inspection used missing instruction paths

Read-only setup commands used guessed optional skill/plan paths and an unsupported retrieval flag. Correct paths were then read; no product files or live services were affected.

- Symptom/evidence: `cat` exited 1 for an accidental placeholder path, the wrong 21st skill root, and absent `.agent/PLANS.md`; postmortem search exited 2 because the tracked helper lacks `--compact`.
- Impact: setup time only; no data loss or runtime impact.
- Lookup: `missing skill incorrect path` matched `local-discover-paths-before-reads` in `references/paths-ownership.md`; applicable because catalog roots and file existence resolve the failures.
- Resolution: read the catalog's exact 21st path, use inspected repository files, and run search without `--compact`; successful reads/search observed.
- Status: resolved inspection issue; no new engineering learning beyond the existing finding.
- Follow-up: parent must update reviewed hash/alias in `~/linux-config/dot_agents/skills/postmortem-memory/`; that directory is outside this agent's write scope.
