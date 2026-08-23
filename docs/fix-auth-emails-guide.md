# Fixing Supabase Auth Emails — Branding + Sending Domain

Two separate fixes. Do them in this order.

## Part 1 — Apply the branded templates (do this now, 5 minutes)

1. Go to your Supabase Dashboard → **Authentication** → **Email Templates**
2. Click **Confirm signup**
3. Open `docs/email-templates/confirm-signup.html`, copy ALL of it, paste it
   into the template body, replacing what's there
4. Click **Save**
5. Click **Reset password**
6. Open `docs/email-templates/reset-password.html`, copy ALL of it, paste it in
7. Click **Save**

These templates use `{{ .SiteURL }}` to build their own links (not
Supabase's built-in `{{ .ConfirmationURL }}`) — see the comment at the top
of each file for why: it protects against email security scanners silently
"clicking" links before the real person does, which otherwise burns the
link and shows "expired" to someone who only clicked once.

## Part 1B — Fix Site URL and add the new redirect URLs (required, do this now)

Since these templates build links from `{{ .SiteURL }}`, that setting must
actually be correct:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Check **Site URL** — if it says `http://localhost:3000`, change it to
   match your actual dev server, `http://localhost:5173` (update this again
   to your real domain once the site is deployed live)
3. Under **Redirect URLs**, make sure BOTH of these are listed:
   - `http://localhost:5173/account/reset-password`
   - `http://localhost:5173/account/confirm`
4. Save

If Site URL and your dev server don't match, the links in these emails will
point to the wrong place even though everything else is configured
correctly.

## Part 2 — Send from your own domain via Resend (do this next)

Since aurablazecreative.com is already verified with Resend (used for order
confirmation emails), point Supabase Auth's outgoing mail at Resend too, so
every email — order confirmations AND account emails — comes from the same
trusted domain instead of Supabase's shared sending infrastructure.

1. In Resend's dashboard, go to **API Keys** → create a new key (or reuse the
   one already used for order confirmation emails, if you have it handy)
2. In Supabase Dashboard → **Authentication** → **Settings** → scroll to
   **SMTP Settings** (sometimes labeled "Custom SMTP")
3. Toggle **Enable Custom SMTP** on
4. Fill in Resend's SMTP details:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS) — either works, 465 is Resend's
     recommended default
   - **Username:** `resend`
   - **Password:** your Resend API key (the one from step 1)
   - **Sender email:** something like `noreply@aurablazecreative.com` (must
     be on the verified domain)
   - **Sender name:** `Aura Blaze Creative`
5. Save

## Why this matters

Without Part 2, Supabase's shared mailer also has a real sending limit (a
small number of emails per hour) — fine for testing, but it WILL start
silently failing to send once real customers are signing up regularly. Part 2
removes that limit entirely, since you're sending through your own Resend
account instead of Supabase's shared one.

## Testing

After both parts are done: Supabase Dashboard → **Authentication** → **Users**
→ create a new test user (or sign up for real on the site) → confirm the
email arrives branded, from the right sender name, and that clicking
"Confirm Email Address" actually logs the account in correctly.
