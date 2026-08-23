# Deploying the Paystack Edge Functions

Two Edge Functions live in `supabase/functions/`:
- `paystack-init` — starts a Paystack transaction for a pending order
- `paystack-verify` — confirms a payment actually succeeded, server-to-server

## 1. Install the Supabase CLI (one-time, on your own machine)

```bash
npm install -g supabase
```

## 2. Log in and link this project

```bash
supabase login
supabase link --project-ref cpabvhvyhpdkutefntbh
```
(You'll be asked to confirm via a browser login.)

## 3. Set the secrets Edge Functions need

These are NOT the same as your `.env` file — they live in Supabase's secure
server-side environment, never sent to the browser.

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

Replace `sk_test_xxxxxxxxxxxxx` with your real Paystack Test Secret Key.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available
to Edge Functions already — you don't need to set those yourself.

## 4. Deploy both functions

```bash
supabase functions deploy paystack-init
supabase functions deploy paystack-verify
```

## 5. Add the Paystack public key to the frontend

Add this line to your `.env` file (same file that already has the Supabase
keys):

```
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

(This one IS safe for the frontend — public keys are meant to be public.)

## 6. Test it

Run `npm run dev`, add something to cart, go through checkout with an NGN
order. You should be redirected to Paystack's test checkout page. Use one
of Paystack's test cards (listed in their docs under "Test Cards") to
simulate a successful payment, and confirm you land back on the
confirmation page showing "Payment Confirmed."
