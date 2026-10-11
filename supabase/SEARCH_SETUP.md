# Automatic Kimberley crime discovery

The `search-kimberley-crime` function uses Gemini Google Search grounding once per scheduled run. It discovers sources for review without manually entering articles or configuring RSS feeds. It never publishes model claims directly to maps. Grounding citations are evidence of sources, not verification of the incident, event date or exact position. Empty searches must not imply a safe area.

## Activate

1. Apply `migrations/20261011_crime_search.sql` after the previous migrations.
2. Deploy `npx supabase functions deploy search-kimberley-crime --project-ref lpbmswrvezvtrwhbsewt`.
3. Existing `GEMINI_API_KEY` and `IMPORTER_TOKEN` secrets are used. Optional `GEMINI_SEARCH_MODEL` defaults to `gemini-2.5-flash`. Search grounding availability and quotas depend on your Google project. Review Google pricing before enabling a recurring job; this is not guaranteed free.
4. In Supabase Cron, create a daily Edge Function job for `search-kimberley-crime`, using POST with an Authorization header `Bearer <your IMPORTER_TOKEN>`. Prefer Vault for storing the token securely. Daily operation is a conservative initial frequency; an hourly schedule is also supported. The function enforces a one-hour minimum between attempts and does not retry automatically.
5. Use Run now in Cron for an initial test. Check function logs and `crime_search_state`: `success` means the provider returned grounded search evidence and writes succeeded; `failed` includes a short error. A successful run can legitimately find no sources.
6. Review new `incident_imports` entries with extraction.kind `search_candidate`. These contain metadata-cited excerpts, NOT original article quotes. A reviewer must verify the linked source, actual event date, incident type, summary and location, populate the extraction fields expected by `approve_incident_import`, then approve through the existing reviewer workflow. Search redirect URLs may differ across runs, so cross-source incident deduplication still needs reviewer checking.

No periodic job has been enabled by the code change itself. The project owner has separately configured Cron. No administrator review screen is implemented yet.

## School-project discovery panel and demo markers

The signed-in website calls `ai-discoveries` to display pending search candidates from the last seven days. This endpoint validates a Supabase Auth session and returns only source links, cited excerpts, discovery timestamps and Search Suggestions HTML. It does not grant users access to the private queue. Set `WEBSITE_ORIGINS` if deploying on additional domains. Provider suggestions render in script-free sandboxed iframes, not the main DOM. Excerpts remain prominently labelled unverified, with unknown event dates/positions. They never influence routing or counts of real incidents.

Dashboard, safety map and route planner each include Show demo examples. This opt-in layer contains three fictional sample positions in Kimberley. It is not saved in the database or included in real report counts, alerts or routing. No approximate map position is assigned to a search candidate without reviewer confirmation.
