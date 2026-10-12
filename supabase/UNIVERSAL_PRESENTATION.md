# Shared presentation workspace

Run `20261012_universal_presentation.sql` after all earlier migrations,
including registration details, feedback loop and presentation features.
The migration is rerunnable; existing scenario reports are not duplicated
or reset. It adds a presentation flag to incidents, tickets and saved routes.

The top-bar workspace switch applies across internal pages and browser tabs
on the same origin. Identity, login and profiles are shared; incidents,
tickets, saved searches, profile activity and admin queues use the selected
workspace. Changing the setting reloads the page, so finish edits first.
Different deployment origins keep their own selection.

Seven fixture hazards become editable incident rows attributed to the first
configured admin. Five positive features remain in presentation_features.
Two sample tickets are assigned to that same admin; private history is still
owner-restricted, so other users only see their own submissions. Admins see
all workspace tickets. No new users or fabricated email accounts are added.

User submissions use the current workspace flag. They can be managed with
the same status, notes, replies and audit flows as live submissions. Resolved
reports disappear from active maps and scoring. AI source discoveries are
not copied into presentation mode. Positive features do not cancel hazards.
The notice identifies presentation records without repeated map toggles.

Live acceptance test:
1. Switch to Presentation workspace in the header.
2. Check the dashboard, safety map and planner show the same hazards.
3. Submit a new report; check its DB flag is true and admin can update it.
4. Refresh My reports and verify the admin note appears.
5. Send a ticket, reply as admin, and refresh the user's ticket history.
6. Save a route; verify it appears in presentation history.
7. Switch to Live workspace and confirm presentation records are absent.
8. Switch back; verify all changes persist. The mode switch does not reset data.

The new migration and live RLS/RPC behaviour must be tested in Supabase.
Local syntax checks do not verify those deployed database behaviours.
