# Supabase and customer orders

New order details are saved as JSON in the `order_data` column of
`public.encrypted_orders`. Despite the table's historical name, new orders are
not encrypted. Supabase project administrators can access order details,
including delivery addresses and contact information. Row-level security lets
each authenticated customer read and create only their own orders. This
storefront does not include a seller-side order fulfillment workflow.

## Configure Supabase

1. Run `supabase-setup.sql` in the Supabase SQL Editor. It creates or updates
   `encrypted_orders` and applies row-level security. The migration adds
   `order_data` and makes the old `encrypted_data` column nullable so existing
   encrypted rows are preserved while new orders use JSON. It also adds a
   unique database index for normalized signup phone numbers. Supabase Auth
   already enforces unique email addresses. If existing accounts already share
   a phone number, resolve those duplicates before creating the index; do not
   delete accounts or data without reviewing them. To find duplicate signup
   phone metadata before applying the index, run:

   ```sql
   select
     regexp_replace(raw_user_meta_data ->> 'contact_phone', '[^0-9]', '', 'g')
       as normalized_phone,
     count(*) as account_count,
     array_agg(id) as account_ids
   from auth.users
   where nullif(raw_user_meta_data ->> 'contact_phone', '') is not null
   group by 1
   having count(*) > 1;
   ```
2. Set the Supabase Project URL and **publishable** (or legacy `anon`) key in
   `supabase-config.js`. Never place the `service_role` or secret key in this
   static website.
3. In **Authentication → URL Configuration**, set the deployed HTTPS site URL
   and add it to the allowed redirect URLs. Configure email delivery for
   account confirmation and password reset messages. The password reset link
   returns customers to this site, where they choose a new password.
4. Serve the folder over HTTPS (or localhost during development); do not use a
   `file://` URL.

The storefront does not grant customers access to each other's orders and does
not grant a seller account access to customer orders. Set up a separate,
appropriately secured seller workflow before relying on this site to fulfill
orders. Do not expose a Supabase service-role key in the browser.

Older order rows may still contain recovery-key-encrypted `encrypted_data`.
They are preserved and shown in account history as legacy orders without
details; this version has no recovery-key interface to decrypt them. The
`customer_key_checks` table, if created by an earlier setup, is no longer used
and is left untouched by the migration. Review legacy data before removing
anything.

The setup SQL revokes client access to the legacy plaintext `public.orders`
table if it exists. Existing rows in that old table are not migrated; review
and securely remove or handle any such data separately. Do not delete
historical data without confirming it is no longer needed.

Orders are saved as pending requests. There is no payment processing or payment
verification. Non-cash payments are verified manually before dispatch.

The storefront catalog contains sample INR prices, and the cart is saved in
the customer's browser. Replace the sample catalog and prices before launch.
Orders placed before the storefront switched to INR are displayed in USD in
account history; new orders record INR as their currency. The newsletter form
explains that signup is not connected; it does not store or transmit email
addresses.

Customers provide a mobile number as contact information during signup; no SMS
verification or phone MFA is used. Phone fields provide a country selector for
international dialing codes and default to India (+91). Supabase stores the
validated number in E.164 format as signup metadata.

Email addresses are unique in Supabase Auth. Signup phone numbers are protected
by the unique index in `supabase-setup.sql`, which normalizes punctuation
before checking duplicates. The index uses signup metadata until the phone is
attached and reserves the signup number.

Registration and login use email and password without OTP. Password recovery
sends a link to the account email; customers need to open that link on the
deployed site to set a new password.
