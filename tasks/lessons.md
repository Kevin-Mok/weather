# Lessons Learned

## 2026-06-30

- Open-Meteo geocoding `/v1/search` does not resolve Canadian postal codes like `M1E4V4`.
- For any location input that matches a postal pattern and Open-Meteo returns no result, add a fallback geocoder call (for example Nominatim) or provide a clearer fallback path.

## 2026-10-20

- Select the current forecast from supplied epoch timestamps rather than a UTC hour floor; half-hour timezones otherwise skip their current local hour.
- Long-lived forecast views need recurring and tab-resume refresh, bounded pending requests and complete effect cleanup. Cover timer/resume/overlap/unmount behavior with an executable clock regression as well as route freshness tests.
