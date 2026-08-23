# Deploying the Paystack Edge Functions

The two payment functions (`initialize-payment`, `verify-payment`) live in
`supabase/functions/` in the project. They need to be deployed to your
Supabase project before checkout will work — this can't be done from within
this chat, since it requires logging into your real Supabase account.

## 1. Install the Supabase CLI (if you haven't already)

```bash
npm install -g supabase
```

## 2. Log in

```bash
supabase login
```

This opens a browser window to authenticate with your Supabase account.

## 3. Link this project to your Supabase project

From the project's root folder (`aura-blaze/`):

```bash
supabase link --project-ref cpabvhvyhpdkutefntbh
```

(That project ref is from your Supabase URL — `cpabvhvyhpdkutefntbh.supabase.co`.)

## 4. Set the Paystack secret key as a Supabase secret

**Do not put this in any `.env` file or commit it anywhere in the repo.**

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_cb1b86dc4f88878c6b0a5216cac54d71a65c917e
```

You can verify it saved correctly with:

```bash
supabase secrets list
```

(This shows the secret exists, not its value — that's expected and correct.)

## 5. Deploy both functions

```bash
supabase functions deploy initialize-payment
supabase functions deploy verify-payment
```

## 6. Test it

Once deployed, run the app (`npm run dev`), add something to cart, and go
through checkout with an NGN order. You should be redirected to a real
Paystack test-mode checkout page.

Paystack test card for a successful payment:
- Card number: `4084 0840 8408 4081`
- CVV: any 3 digits (e.g. `408`)
- Expiry: any future date
- PIN: `0000`
- OTP: `123456`

After "paying," you should land back on `/order-confirmation` with a
"Payment Confirmed" message, and the order's status in Supabase's `orders`
table should have flipped from `pending` to `paid`.

## Known limitation (by design, for now)

USD-priced orders currently show an "Order Received, payment unavailable"
message instead of going through Paystack — this integration only supports
NGN payments for now. See the comment in
`supabase/functions/initialize-payment/index.ts` for why, and revisit this
once Ebuka's Paystack account's multi-currency settlement is confirmed.

## Setting up order confirmation emails

Order confirmation emails send automatically from `verify-payment` the
moment a payment is confirmed — no separate function to deploy, but two
things need to be set up first:

### 1. Verify the domain with Resend

1. Sign up at resend.com (free — 3,000 emails/month, 100/day)
2. Dashboard → **Domains** → **Add Domain** → enter `aurablazecreative.com`
3. Add the DNS records Resend shows you (SPF/DKIM) wherever the domain's
   DNS is managed
4. Click **Verify** in Resend once DNS has propagated (can take a few
   minutes to a few hours)

### 2. Create an API key

Dashboard → **API Keys** → **Create API Key** → copy the key (starts with `re_`)

### 3. Add secrets to Supabase

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set ORDER_EMAIL_FROM="Aura Blaze Creative <orders@aurablazecreative.com>"
```

(Adjust the sending address/name in `ORDER_EMAIL_FROM` to whatever you
verified with Resend — it must use the verified domain.)

### 4. Redeploy verify-payment

```bash
supabase functions deploy verify-payment
```

### 5. Test it

Complete a real test purchase (see the test card above). After payment is
confirmed, check the inbox for the email used at checkout — you should
receive a styled order confirmation within a few seconds.

**Note:** if `RESEND_API_KEY` isn't set, the function silently skips
sending (no crash, no error to the customer) — payments and order status
still work correctly either way. This means you can deploy the payment
flow before email is fully set up without breaking checkout.
