# Password recovery setup and acceptance test

Login links to `/accounts/forgot-password/`. Supabase sends the recovery email
using resetPasswordForEmail. The link returns to `/accounts/reset-password/`,
where a verified recovery session can call updateUser with a new password.
Ordinary visits do not enable the password form. Passwords are never written
to public application tables, URLs or logs. Successful reset attempts sign
out the session; the user then signs in with the new password.

In Supabase Authentication > URL Configuration, allow:

```
http://127.0.0.1:8001/accounts/reset-password/
http://localhost:8001/accounts/reset-password/
```

Also add the exact HTTPS deployment origin plus `/accounts/reset-password/`.
Set Site URL to the production website. Do not use broad production wildcard
redirects. Leave the recovery email template's ConfirmationURL intact, or use
a custom token_hash recovery template compatible with the reset page.

Supabase email rate limits and SMTP configuration govern real delivery.
If built-in delivery does not support your test recipient, configure custom
SMTP with a real sender. No UI code can guarantee email delivery without
correct provider settings. Use a real test inbox, not a fabricated address.

Live test (not yet executed by the agent):
1. Request recovery for your test account using Forgot password.
2. Open the email in the inbox and follow its link on the intended origin.
3. Confirm the new-password form enables.
4. Try mismatched passwords; verify rejection without changing the password.
5. Set a new password, then sign in using it.
6. Verify the old password fails.
7. Open an expired or reused link; verify it cannot enable recovery.
8. Open the reset page directly in a fresh browser session; it must stay locked.

No database migration is required. Passwords are managed by Supabase Auth.
