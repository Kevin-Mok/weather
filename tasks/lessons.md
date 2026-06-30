# Lessons Learned

## 2026-06-30

- Open-Meteo geocoding `/v1/search` does not resolve Canadian postal codes like `M1E4V4`.
- For any location input that matches a postal pattern and Open-Meteo returns no result, add a fallback geocoder call (for example Nominatim) or provide a clearer fallback path.
