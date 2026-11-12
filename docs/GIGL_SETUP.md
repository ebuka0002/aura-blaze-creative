# GIG Logistics (GIGL) — setup

GIG Logistics runs **alongside** Red Star. At checkout the customer sees both
couriers' prices and picks one. The choice is stored in `orders.shipping_rate_id`
(`redstar:<n>` or `gigl:<vehicle>:<pickUpOption>`); booking and cancelling follow it.

## Secrets (Supabase → Edge Functions → Secrets, or `supabase secrets set`)

| Secret | Required | Notes |
|---|---|---|
| `GIGL_EMAIL` | yes | GIG API login email |
| `GIGL_PASSWORD` | yes | **Never put this in code or chat.** |
| `GIGL_ENV` | yes | `staging` (test server, courier shows as "GIG Logistics (TEST MODE)") or `production`. If unset, GIG is **off**. |
| `GIGL_VEHICLE_TYPE` | no | 0 Car, **1 Bike (default)**, 2 Van, 3 Truck |
| `GIGL_PICKUP_OPTION` | no | **0 Home Delivery (default)**, 1 Service Centre self drop-off. Confirm with GIG which one means "GIG collects from our shop". |
| `GIGL_SENDER_LAT` / `GIGL_SENDER_LNG` | no | Shop coordinates. Defaults to central Aba (5.1167, 7.3667) — set exact ones. |

Staging test credentials were shared in chat — rotate that password with GIG, and
use the **live** credentials only via secrets.

Deploy: `supabase functions deploy shipping-rates shipping-book-pickup shipping-cancel`

## Going live
1. Get production credentials from GIG, set `GIGL_EMAIL`, `GIGL_PASSWORD`, `GIGL_ENV=production`.
2. **Fund the GIG wallet.** The full price is debited from it at booking; with no balance, booking fails (the order shows "failed" and the retry button works once funded).
3. Place a real test order and check the waybill in GIG's dashboard.

## How it works
- Login: `POST /login`; token (about 20 days) is cached and refreshed automatically.
- Quote: `POST /price/v3` using station ids (matched by city/state name) and latitude/longitude.
- Receiver coordinates come from OpenStreetMap geocoding of the address; if that fails, the state capital is used (price may be slightly off).
- Book: `POST /capture/preshipment` with the same vehicle/pick-up option and `PricingStrategy: 3` so the charge matches the quote. The charged amount (`/get/preshipment`) is saved in `courier_booking_debug.chargedAmount`.
- Cancel: admin button → `POST /cancel/preshipment`. "Already cancelled" counts as success. GIG's docs don't say whether cancelling refunds the wallet — confirm with them.

## Not covered
- No tracking page/webhook yet (the waybill is shown in the admin and customer email).
