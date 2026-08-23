# Setting Up Admin Access

## 1. Run the SQL migration

In Supabase SQL Editor, run `010_admin_access_control.sql`. This adds the
`is_admin` flag and the permission rules admins need.

## 2. Create the login account

There's no public signup form for admin — that's deliberate, so random
visitors can't create their own admin accounts. Instead, create the account
directly in Supabase:

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Enter the email and a password for Ebuka (or whoever needs access)
3. Click **Create user**

## 3. Create their profile row and grant admin access

Run this in the SQL Editor, replacing the email:

```sql
insert into customer_profiles (id, is_admin)
select id, true
from auth.users
where email = 'ebuka@example.com'
on conflict (id) do update set is_admin = true;
```

## 4. Log in

Go to `yoursite.com/admin/login` and sign in with that email/password.

## Adding more admin accounts later

Repeat steps 2–3 for each new person. To remove someone's admin access
without deleting their account:

```sql
update customer_profiles set is_admin = false
where id = (select id from auth.users where email = 'someone@example.com');
```

## What this dashboard can do right now

- **Products**: view all, create new products with colors, sizes, stock,
  and real photo uploads (front/back per color) — no SQL needed. Edit
  name/description/material/price on existing products, toggle
  visible/hidden, update stock per size/color, add new colorways (with
  photos) to an existing product, remove individual photos.
- **Orders**: view all, see customer/shipping/items, update status
  (pending → paid → fulfilled → cancelled). Orders cannot be deleted from
  the dashboard — this is intentional, since orders are financial records
  and permanently erasing them is rarely the right move. Use "Cancelled"
  status for orders that shouldn't count instead.

## What it can't do yet

- Manage discount codes, shipping rates, or site content (banners, hero
  slides, etc.)
- Send emails to customers about order status changes
- Bulk edit multiple products at once
- Undo a deletion — deleting a product is permanent (variants and photos
  go with it). Past orders that included the deleted product keep their
  own record of what was purchased, just without a working link back to
  the product page.
- Undo/rollback if a product creation partially fails (e.g. photo upload
  fails after the product record was already created) — if this happens,
  delete the incomplete product from the dashboard and try again
