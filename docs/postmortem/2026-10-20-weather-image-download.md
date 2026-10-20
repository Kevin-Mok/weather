# Weather image download blocked by sandbox DNS

Downloading local weather illustrations requires network access. Retry the same asset request with network permission, validate the SVG files, then verify their rendering.

- Symptom/evidence: Python urllib request to cdn.meteocons.com failed with `Temporary failure in name resolution` in the restricted sandbox.
- Impact: no assets downloaded; no production impact.
- Lookup: searched `DNS 403 network sandbox download`; `ext-sandbox-loopback` describes scoped escalation as a workaround, but its loopback symptom differs from this DNS failure. No app defect indicated.
- Cause: default sandbox DNS restriction; after scoped network escalation, the Meteocons CDN itself returned HTTP 403.
- Resolution: downloaded the four public static SVGs from unpkg's `@meteocons/svg-static` package and the MIT license from upstream GitHub. All downloads completed and SVG content was validated.
- Status: verified download workaround; upstream CDN access is unproved. Production serves local assets and needs neither CDN.
- Next steps: verify browser rendering and regression checks with the implementation.
