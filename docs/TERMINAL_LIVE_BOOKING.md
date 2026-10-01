# Terminal Africa live booking

This version books a Terminal Africa shipment after a Paystack payment is
server-side verified.

Required Supabase Edge Function secrets:
- `PAYSTACK_SECRET_KEY` = live Paystack secret key
- `TERMINAL_SECRET_KEY` = live Terminal Africa secret key
- `TERMINAL_API_BASE_URL` = `https://api.terminal.africa/v1` (optional because the
  function defaults to the live URL)

Deploy:
- `verify-payment`
- `shipping-book-pickup`
- `shipping-rates`

Flow:
1. Checkout requests persisted Terminal rates.
2. Customer pays through Paystack.
3. `verify-payment` verifies the transaction and confirms the order.
4. `verify-payment` calls `shipping-book-pickup` with the selected `rate_id`.
5. Terminal's `/shipments/pickup` endpoint generates the shipment automatically
   when no `shipment_id` is supplied, as documented by Terminal Africa.
6. The returned shipment/tracking information is saved on the order.

A failed courier booking does not make an already-successful payment fail; it is
logged so it can be retried or handled manually.


## Terminal booking diagnostics
The `shipping-book-pickup` function logs the exact booking request (without the
secret key) and the complete Terminal HTTP response body/status to Supabase Edge
Function logs. Failed responses are also saved in `orders.courier_booking_debug`
so the reason a paid shipment stayed Draft can be inspected without charging
the customer again. The debug payload contains Terminal response data and should
be treated as operational/private order data.
