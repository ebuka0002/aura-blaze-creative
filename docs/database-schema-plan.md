# Aura Blaze Creative — Database Schema Plan

This is the Supabase (Postgres) structure the frontend will connect to.
Nothing is created yet — this is the blueprint to review before we build it.

---

## 1. `products`
The catalog. Replaces the hardcoded `src/data/products.js`.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | auto-generated |
| slug | text, unique | e.g. `signature-tee` — used in the URL |
| name | text | |
| category | text | jackets / tshirts / headwear / accessories |
| description | text | |
| material | text | |
| price_ngn | integer | store in kobo or whole naira — we'll decide unit |
| price_usd | numeric | |
| is_new | boolean | |
| is_active | boolean | lets Ebuka hide a product without deleting it |
| created_at | timestamp | |

## 2. `product_variants`
Each color+size combo of a product, with its own stock count.
This is what actually answers "is Medium Black in stock."

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| color_name | text | e.g. "Black" |
| color_hex | text | e.g. "#0B0B0C" |
| size | text | S / M / L / XL / XXL |
| stock_quantity | integer | |
| sku | text | optional, for Ebuka's own tracking |

## 3. `product_images`
Per-color image sets (front/back), replacing the hardcoded imports.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| color_name | text | matches product_variants.color_name |
| image_url | text | Supabase Storage URL |
| sort_order | integer | 0 = front, 1 = back, etc. |

## 4. `orders`
Created at checkout, before payment is confirmed.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| order_number | text, unique | human-friendly, e.g. ABC482913 |
| customer_email | text | |
| customer_name | text | |
| customer_phone | text | |
| shipping_address | jsonb | street, city, state, country |
| shipping_method | text | local / nationwide / international |
| currency | text | NGN or USD |
| subtotal | numeric | |
| shipping_cost | numeric | |
| total | numeric | |
| status | text | pending / paid / fulfilled / cancelled |
| paystack_reference | text | set once payment starts |
| user_id | uuid (FK → auth.users, nullable) | null = guest checkout |
| created_at | timestamp | |

## 5. `order_items`
Line items belonging to an order — snapshotted at purchase time so later
price/product changes don't rewrite order history.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK → orders) | |
| product_id | uuid (FK → products) | |
| product_name | text | snapshot |
| color_name | text | |
| size | text | |
| unit_price | numeric | snapshot |
| quantity | integer | |
| image_url | text | snapshot |

## 6. `reviews`
Replaces the localStorage version. Tied to real orders so we can mark
"Verified Buyer" for real instead of always-true.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| order_item_id | uuid (FK → order_items, nullable) | links review to an actual purchase |
| customer_name | text | |
| rating | integer | 1–5 |
| review_text | text | |
| is_verified | boolean | true only if order_item_id is set |
| created_at | timestamp | |

## 7. `customers` (optional — for account features)
Only needed if we build real login, not just guest checkout.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | matches Supabase `auth.users.id` |
| full_name | text | |
| default_address | jsonb | |

---

## What this enables that localStorage/mock data can't
- Ebuka can add/edit/remove products without you touching code
- Stock actually decrements on purchase and shows real "sold out" states
- Reviews persist across every device, tied to real orders
- Order history and admin dashboard become possible
- Abandoned cart / order confirmation emails become possible (via a Supabase Edge Function + email service)

## What we still need from you before building this
1. A free Supabase account + new project (I'll walk you through it)
2. Confirm: kobo vs whole-naira for price storage (kobo avoids rounding issues)
3. Confirm: does Ebuka want customer accounts, or guest-checkout-only for launch?
4. Paystack account + test API keys (live keys come later, after testing)
