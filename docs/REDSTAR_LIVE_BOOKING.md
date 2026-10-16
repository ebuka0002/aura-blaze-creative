# Red Star Express (RedSpeed API) shipping

Shipping is quoted and booked through the RedSpeed API
(`redspeedopenapi.redstarplc.com`). Auth is an `X-API-KEY` header.

## 1. Set the secrets (server-side only)

The API key must never go in the code, `.env`, or any `VITE_` variable.

```bash
supabase secrets set REDSTAR_API_KEY="<your RedSpeed API key>"
supabase secrets unset TERMINAL_SECRET_KEY TERMINAL_API_BASE_URL   # old, no longer used
```

Red Star's documented values (picked automatically, no setting needed):

| Setting | Options | Used |
| --- | --- | --- |
| Pickup type | `1` = Pickup from my Address, `2` = Drop-off in RSE Location | `1` (courier collects from Aba) |
| Payment type | `Prepaid`, `Pay On Delivery` | `Prepaid` (the customer already paid us via Paystack, so Red Star must not charge the recipient) |

Optional overrides (only if your account needs something different):

| Secret | Purpose |
| --- | --- |
| `REDSTAR_PICKUP_TYPE` | Numeric pickup type id, e.g. `2` to have parcels dropped at a Red Star location instead. |
| `REDSTAR_PAYMENT_TYPE` | Exact payment type name. Default `Prepaid`. |
| `REDSTAR_DELIVERY_TYPE` | Value for the `deliveryType` field, if Red Star requires one. |
| `REDSTAR_API_BASE_URL` | Override the API host. Default tries `https://` then `http://redspeedopenapi.redstarplc.com`. |

Keys are generated at https://redspeed.redstarplc.com/dashboard/user-api-keys.

## 2. Deploy

```bash
supabase functions deploy shipping-rates
supabase functions deploy shipping-book-pickup
supabase functions deploy verify-payment
```

No database migration is needed. `orders.shipping_shipment_id` is simply no
longer used (Red Star has no draft-shipment step).

## 3. Check the values Red Star expects (run once on your own machine)

```bash
KEY="<your RedSpeed API key>"
B=https://redspeedopenapi.redstarplc.com   # use http:// if https is refused
curl -s "$B/api/Operations/Cities"        -H "X-API-KEY: $KEY"   # city name + abbr code
curl -s "$B/api/Operations/PickupTypes"   -H "X-API-KEY: $KEY"
curl -s "$B/api/Operations/PaymentTypes"  -H "X-API-KEY: $KEY"
curl -s -X POST "$B/api/Operations/DeliveryFee" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{"senderCity":"<Aba code>","recipientCity":"<Lagos code>","pickupType":<id>,"weight":1}'
```

The published spec does not document the success bodies of `DeliveryFee` and
`PickupRequest`, so the functions parse them tolerantly and log every raw
response. After your first test order, open **Edge Functions → Logs** and look
for `Red Star DeliveryFee` / `Red Star PickupRequest response`.

## Flow

1. Checkout calls `shipping-rates`: the address is matched to a Red Star city
   and delivery town, then `POST /api/Operations/DeliveryFee` returns the fee.
2. Customer pays through Paystack.
3. `verify-payment` verifies the transaction and confirms the order.
4. `verify-payment` calls `shipping-book-pickup`, which atomically claims the
   order and calls `POST /api/Operations/PickupRequest`.
5. The returned waybill number is saved as the order's tracking number.

A failed booking never fails an already-successful payment; the error and the
raw Red Star response are stored in `orders.courier_booking_error` /
`courier_booking_debug` (private operational data) and the booking can be
retried from the order confirmation page.

If Red Star accepts a request but no waybill can be read from the response,
the order is marked failed with a message to check the Red Star dashboard
**before** retrying, to avoid creating a duplicate pickup.

## Not covered yet

Waybill printing (`PrintWaybill`), shipment cancellation (`CancelShipment`) and
live tracking (`TrackShipment`) are available in the API but not wired into
the admin yet.
