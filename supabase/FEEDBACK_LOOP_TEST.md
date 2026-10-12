# Incident and support demo verification

Apply `20261012_user_feedback_loop.sql` after the admin, support-ticket and
incident-date migrations. This migration is safe to rerun. It does not send
emails. Refresh user histories to retrieve new updates.

## Incident demonstration

1. Sign in as a regular user and submit a clearly labelled test report.
2. Open My reports at the bottom of the report page; note its reference ID.
3. Show the matching row in `incidents`: status is `reported`.
4. As an admin, select it and advance to Under review with an action note.
5. Show the new `incident_updates` row and `admin_audit` entry.
6. As the submitting user, refresh My reports and show the note and timestamp.
7. Advance to Action taken with a specific description, then Resolved.
8. Refresh the safety map: the resolved report should no longer be active.

## Support demonstration

1. Send a ticket from Help & support using the regular user's account.
2. Show its row in `support_tickets` and its reference in My support tickets.
3. Open the ticket in admin, write a reply and select In progress.
4. Show the matching `support_replies` row and audit entry.
5. Refresh My support tickets as its owner: show the reply and status.
6. Send a resolution reply and mark Resolved; refresh the user history again.

## Permission and validation checks

- A different user must not see this user's ticket or either private history.
- A regular user calling either admin mutation RPC must receive an error.
- Owners cannot insert or update administrative incident status fields.
- Attempting to skip from Reported directly to Resolved must fail.
- Blank notes/replies must fail. Notes are limited to 2000 characters, replies 5000.
- A stale expected status must fail rather than overwrite another admin's change.
- Future incident timestamps must still fail at the database trigger.

These are live acceptance checks, not claims that they were executed locally.
Local syntax and Django rendering checks do not verify deployed RLS or RPCs.
