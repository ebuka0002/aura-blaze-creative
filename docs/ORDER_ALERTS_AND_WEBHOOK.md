# Order alerts + Paystack webhook

## Why this exists
Before this change an order was only confirmed if the customer's browser came
back to `/order-confirmation` after paying, and only the *customer* was emailed.
If the buyer closed the tab after paying, the order stayed `pending` with no
email, no courier booking and no alert to the store.

## 1. Deploy
```bash
supabase functions deploy paystack-webhook --no-verify-jwt
supabase functions deploy verify-payment
```

## 2. Secrets
```bash
supabase secrets set ADMIN_ORDER_EMAIL="owner@example.com"   # comma-separate for several
```
(Defaults to `info@aurablazecreative.com` if not set.) Order emails need
`RESEND_API_KEY`, and the sending domain must be verified in Resend, otherwise
emails are silently rejected (check Edge Function logs for "Resend email send failed").

## 3. Paystack dashboard
Settings -> API Keys & Webhooks -> Webhook URL:
`https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`
Use the live-mode setting for the live key.

## Recovering an order that is stuck on "pending" but was paid
Find the Paystack reference (Paystack dashboard, or `orders.paystack_reference`)
and open `https://<your-site>/order-confirmation?reference=<reference>`.
That re-verifies with Paystack, marks the order paid, sends the emails and
books the courier. It is safe to do more than once.
