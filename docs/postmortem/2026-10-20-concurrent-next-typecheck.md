# Concurrent build and typecheck generated-file race

Run the Next.js production build before typecheck when both use `.next/types`. Concurrent checks can report transient missing generated types.

- Symptom: verification agent ran build and typecheck concurrently; typecheck exited 2 with TS6053 for missing `.next/types` page and API files.
- Impact: verification only; no application failure or source changes.
- Evidence: build exited 0, and typecheck rerun after build exited 0. Test suite passed.
- Lookup: `Next typecheck TS6053 generated concurrent build` returned no matching generated-types race; unrelated target/ownership findings do not apply. Build success followed by a clean typecheck establishes this task's workaround.
- Cause: build regenerates `.next/types` while typecheck reads the directory.
- Resolution/status: verified workflow workaround; run these checks sequentially. No product code fix needed.
- Follow-up: preserve sequential ordering for shared generated-output checks.
