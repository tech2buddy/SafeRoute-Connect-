# Simulated incoming events

Apply `20261012_presentation_stream.sql` after universal presentation setup.
Only approved admins can advance the scenario; other signed-in users view
the changing records. The page polls every 15 seconds while visible, and the
database permits at most one event every 30 seconds across all tabs/users.
Hidden tabs do not advance the feed. Pause stops this tab generating events;
another visible admin tab may still advance the shared scenario.

The finite twelve-event scenario contains nine incident arrivals and three
status updates. Progress survives page reloads and rerunning the migration.
It never writes live incidents. It does not overwrite a manually progressed
lighting report. Changes are saved in incidents, incident_updates and audit.
No emails are sent and no actual weather/traffic provider is involved.

Maps and report lists refresh when incident data changes. The route planner
updates exposure for its existing path without requesting GPS or changing
the journey to a new alternative. During active navigation it leaves the
path alone. Find routes again to rerank the available alternatives. Admin
editing is not automatically refreshed while the response form has focus.

After twelve events the scenario stops, leaving its database records intact.
This is simulated presentation data, not a continuous real-world feed.

Acceptance: enable presentation mode as an admin, keep the tab visible for
about six minutes, inspect new DB incident rows, watch markers/counts change,
and check the lighting update in My reports (visible to its submitting admin).
Switch to live mode to confirm the simulated events are absent. These live
checks still require applying the migration; local syntax checks do not prove
deployed RPC behaviour.
