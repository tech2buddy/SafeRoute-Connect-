# Address search

The route planner calls the authenticated `location-search` Edge Function.
The function uses Geoapify search and reverse geocoding; the API key is never
sent to the browser. Configure `GEOAPIFY_API_KEY` in Edge Function secrets.

Deploy changes with:

```powershell
npx supabase functions deploy location-search --project-ref lpbmswrvezvtrwhbsewt
```

Searches are restricted to South Africa and biased toward Kimberley. A bias
is not a guarantee that a result is the intended building. Reverse lookup
labels are nearest mapped addresses; the GPS point remains the route start.
Unlisted buildings may still need a street number or a manually chosen point.

Users must sign in for provider lookups. Manual coordinates and live GPS
remain usable without address lookup. Requests time out and provider keys or
raw errors are not returned to the client. A per-instance throttle limits
each user to 20 calls per minute; set Geoapify quotas to bound global usage.
Set `WEBSITE_ORIGINS` for additional deployment origins. Map attribution
includes Geoapify alongside the existing basemap attribution.
