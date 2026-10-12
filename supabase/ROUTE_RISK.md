# Reported route exposure, model v1

This is an explainable school-project heuristic, not a validated prediction
of crime or a safety guarantee. It compares up to three road-following route
alternatives supplied by OSRM; it does not generate avoidance detours.

Eligible reports must have valid coordinates, a known severity, an event
time no more than seven days old and not in the future, and be within 200 m
of the route polyline. Distance is to each segment, not just route vertices.
Community reports are unverified. Reviewed imports require exact positions
and an active expiry. Approximate imports, AI discoveries, demos, resolved
and rejected records are excluded. Duplicate IDs count once.

Contribution = severity * recency * proximity:

- Severity: low concern 1, caution 3, high risk 6.
- Age: up to one day 1, up to three days 0.6, up to seven days 0.3.
- Distance: up to 50 m 1, up to 100 m 0.75, up to 200 m 0.5.
- Total below 2: lower reported exposure; below 6: moderate; otherwise higher.

Lowest-exposure preference sorts by score then time. Time-focused sorts by
time. Balanced sorts by duration/fastest-duration + score/6. These thresholds
are design choices, not probabilities. No reports is not proof of safety.
If either incident feed fails, risk is unknown, not green. The feed is capped
at 200 reports and may be incomplete; separate real-world duplicate events
with different IDs are not automatically merged. The UI discloses these limits.

For presentation, use clearly labelled test reports to compare identical
start/destination alternatives before and after a nearby high-risk report.
Open 'Why this risk rating?' to inspect distances and contributions.

Run unit tests:

```powershell
node static/js/route-risk.test.mjs
node static/js/incident-date.test.mjs
```

Apply `20261012_incident_dates.sql` in Supabase to reject future incident times
even when browser validation is bypassed. Existing future rows are not
rewritten; they are excluded from scoring. Verify the database rule by
attempting an insert with tomorrow's timestamp and confirm it is rejected.
