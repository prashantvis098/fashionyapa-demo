# Fashionyapa order tracking patch

## Included
- Guest order lookup at `/track-order` using order number + checkout phone.
- Lookup API returns only a minimal order view after matching both values.
- Admin Orders supports order status changes and courier / AWB / HTTPS tracking URL.
- Customer order confirmation page links to tracking.

## Deploy
1. Merge these files into the existing `fashionyapa-demo` project; do not replace the whole project with this patch.
2. Ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is configured in the server environment.
3. Deploy to a preview first and test a COD order and a prepaid order.
4. In admin, add courier, AWB and HTTPS tracking URL, then set status to `shipped`.

## Notifications
WhatsApp and Amazon SES need account-side setup before sending real messages. Required variables are listed in `.env.example`. WhatsApp also requires an approved template and customer opt-in. SES requires a verified sender identity/domain and AWS credentials. Do not add secrets to Git or share them in chat. This patch intentionally does not pretend messages were sent without those credentials and provider configuration.

## Security
Never commit `.env.local`. The project archive supplied for this patch contained `.env.local` with server credentials. Treat those values as exposed: rotate the Razorpay secret and Firebase service-account key, then update Vercel Production environment variables and redeploy. Keep the replacement values private.
