# Fashionyapa — Firebase migration build

Migration copy; original project folder was not overwritten. Includes Firebase Authentication admin login, Firestore-backed admin product/order APIs, server-side Razorpay order creation and HMAC signature verification, and order confirmation.

Read `FIREBASE-SETUP.md`. Requires Firebase credentials and Razorpay test keys. Not production-ready until configured and tested. Stock starts at zero until the client enters verified quantities. Configure webhook/reconciliation, rate limits, shipping validation, policies, backups and monitoring before launch.
