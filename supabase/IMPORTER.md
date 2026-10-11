# Crime report extraction backend

This is a server-only Gemini extractor, opt-in RSS collector and private review queue. No model output is automatically published and no coordinates are generated. Approved, unexpired reports are connected to the website's maps and feeds. Reviewer UI, deployment, permitted feed selection, scheduling and risk-aware routing remain separate work.

## Deployment

1. Apply `migrations/20261011_incident_imports.sql` in the Supabase SQL editor.
2. Store `GEMINI_API_KEY`, a long random `IMPORTER_TOKEN`, and `IMPORT_SOURCE_HOSTS` (comma-separated exact publisher hostnames for sources you have permission to import) in Edge Function secrets. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in hosted functions. Optional: `GEMINI_MODEL`, default `gemini-2.5-flash`.
3. Deploy: `supabase functions deploy import-crime-report --project-ref lpbmswrvezvtrwhbsewt`.
4. A trusted backend POSTs to `/functions/v1/import-crime-report` with `Authorization: Bearer <IMPORTER_TOKEN>` and JSON fields `source_url`, `source_name`, `published_at` (ISO timestamp), `text` (80-20000 characters). Never invoke this using a secret embedded in browser code.

The source URL is provenance, not proof that submitted text matches the page. Only trusted importers should have the bearer token. Allowed hosts do not imply permission to scrape. Validate original source, event date, geography, duplication and current relevance before approving any record. RLS blocks regular website users from reading or changing this queue. Do not retain full article text in this table.

The supplied Gemini key is stored only in root `.env` for local development (ignored by Git). It has been exposed in chat: rotate it before production. Deployment and provider connectivity have not been verified.

Run validation tests: `node --test supabase/functions/import-crime-report/validation.test.mjs`.

## Connect approved imports to the website

Apply `migrations/20261011_publish_imports.sql` after the first migration. The website reads `published_incidents` together with community reports. Source links, event timestamps and approximate-location labels are displayed. Expired imported reports are excluded on each refresh. Changes do not stream in real time yet.

Review a pending record in the Supabase Table Editor. Verify the original source, actual event date and location. Then call `approve_incident_import` in the SQL editor with its UUID, checked location, latitude/longitude, actual timestamp, expiry, `exact` or `approximate`, and `safe`, `moderate` or `risky`. Use SQL parameters from a trusted backend for automated reviewer tools. Approval is service-only; normal users cannot approve reports. Reject misleading or historical reports instead of treating them as current danger.

## Optional permitted RSS collection

Deploy `sync-crime-feeds` alongside the importer. Set `CRIME_FEEDS_JSON` to an array of objects with `url` and `name`. Only configure publishers permitting this use and include each feed and article hostname in `IMPORT_SOURCE_HOSTS`. No feeds are enabled by default. This collector supports RSS 2.0 descriptions, not article-page scraping or Atom. Short descriptions may not provide enough evidence to extract an incident.

Invoke the sync endpoint using the same secret bearer token from a trusted scheduler. Configure Supabase Cron to invoke it periodically, storing the token in Vault rather than plaintext SQL. Each run checks the first three recent entries per feed (up to three feeds); provider quotas and ingestion gaps must be monitored. Failed feeds return HTTP 502. It does not claim complete crime coverage. Feed collection requires deployment, permitted URLs and a configured scheduler; none have been enabled remotely by this code change.
