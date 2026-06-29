# `accept-invite` Edge Function

Creates the auth user for an invited workspace member via the Supabase
admin API. No outbound email is sent, so we never hit the SMTP rate
limit that breaks the in-app signup.

## One-time deploy

1. Install the Supabase CLI if you don't have it:
   ```sh
   brew install supabase/tap/supabase
   ```
2. Log in and link to the project:
   ```sh
   supabase login
   supabase link --project-ref dptipfmxbsvamzwjlprs
   ```
3. Deploy the function. `--no-verify-jwt` is intentional: the function
   is callable by anyone with a valid invite token (anon users in the
   middle of signing up).
   ```sh
   supabase functions deploy accept-invite --no-verify-jwt
   ```

That's it. The function picks up `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` automatically from the project secrets.

## Verifying

```sh
curl -X POST "https://dptipfmxbsvamzwjlprs.supabase.co/functions/v1/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{"invite_token":"<a real invite UUID>","password":"testpass123","full_name":"Test"}'
```

A successful call returns `{"ok": true, "email": "..."}` and the user
can immediately sign in with email + password.
