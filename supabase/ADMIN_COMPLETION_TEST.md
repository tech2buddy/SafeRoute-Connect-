# Admin reports and member management

Apply `20261012_admin_reporting_members.sql` after the prior admin,
registration, feedback-loop and universal-presentation migrations. It is
rerunnable. No account is deleted, suspended or promoted by the migration.

## Reports

Generate reports from the admin sidebar. Dates are inclusive calendar days
in Africa/Johannesburg. Incident filtering uses event time; tickets use their
submission time. Data is queried afresh, not the 50-row dashboard preview.
More than 5000 results causes an error asking for a narrower range rather
than a silently truncated export. CSV has all returned rows; print preview
is limited to 200 and labels the limit. Emails and private messages are not
exported. Each generation is recorded in the workspace audit log.

## Members

The directory covers up to 500 authentication accounts, with email
verification, profile details and current roles. User accounts are shared
across modes. Presentation edits update a separate override table; they
never grant actual admin access or modify the live profile. Live edits change
the profile and admin membership. Role changes are serialized and audited;
admins cannot revoke their own role or remove the last admin through this RPC.
Deletion and suspension are intentionally not available. Email verification
is not faked and passwords are not visible or editable.

## Live acceptance checks (not yet executed by the agent)

1. Generate incident and support reports in each mode and compare reference
   IDs against the database rows for the selected dates and mode.
2. Test same-day boundaries, reversed dates, a future end date and empty ranges.
3. Download CSV; verify quotes, commas, workspace label and record count.
4. Print/save PDF and verify the printed preview limit is labelled.
5. Attempt report/member RPCs as a normal user; they must fail.
6. Edit a member's name and role in presentation. Switch to live and confirm
   neither live profile nor admin_members changed.
7. In live mode, grant a test account admin access, verify it can open admin,
   revoke access from another admin, and verify its next RPC fails.
8. Attempt self-revocation, blank/oversized names and a nonexistent account.
9. Sign out and verify private member details and report previews are cleared.

No live email or authentication settings need changing for these features.
