# Fashionyapa Firebase setup

## Firebase console
1. Create a Firebase project and register a Web app. Copy the Web config into `.env.local` using `.env.example`.
2. Authentication > Sign-in method: enable Email/Password. Create the owner's admin login under Users.
3. Project settings > Service accounts > Generate new private key. Keep the JSON private; set the entire JSON as `FIREBASE_SERVICE_ACCOUNT_JSON` in the server deployment environment. Never commit it.
4. Copy the admin user's UID from Authentication > Users into `FIREBASE_ADMIN_UIDS`. Multiple UIDs can be comma-separated. The server checks both this allow-list and `admin_users/{uid}`.
5. Firestore Database > Create database. The server SDK accesses it using service-account credentials. Do not expose service-account credentials to the browser.
6. In Razorpay, use test keys first and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` only in server-side environment variables. Set Razorpay webhook URL to `/api/razorpay/webhook`, subscribe to `payment.captured`, and set `RAZORPAY_WEBHOOK_SECRET`. Switch to live keys only after test payments, refund/cancellation flows and order checks.

## Collections
- `products`: document fields include `name`, `price` (number or null), `compare_at_price`, `stock`, `is_active`, `category`, `image_url`, `description`, `storefront_id` (optional numeric ID), `created_at`, `updated_at`.
- `orders`: created by the server checkout endpoint only.
- `admin_users/{uid}`: optional explicit admin allow-list document; UID allow-list env variable is also supported.

## Import initial combos

1. Put a downloaded Firebase service-account JSON in a private local file named `service-account.json` (never commit it).
2. Run `FIREBASE_SERVICE_ACCOUNT_FILE=./service-account.json npm run seed:products` (PowerShell: `$env:FIREBASE_SERVICE_ACCOUNT_FILE=".\service-account.json"; npm run seed:products`).
3. Stock quantities are seeded as zero because actual inventory was not supplied; enter actual stock in Admin before accepting orders. Combo 7 remains hidden/unpriced until client confirms its price.

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Important current limitations
- Do not launch with placeholder env values.
- Admin product/order pages use authenticated API requests.
- This version adds secure server-side order creation and Razorpay signature verification. The checkout UI still needs to call these endpoints and open Razorpay Checkout; until that UI wiring is complete, no customer payment is processed from the storefront.
- Configure Firebase App Check, backups, alerting, rate limits, shipping-zone validation, privacy/terms pages, and a tested webhook/reconciliation process before production.
- Firestore and Firebase Auth free quotas are limited; usage may incur charges or be throttled. No provider guarantees zero downtime.
