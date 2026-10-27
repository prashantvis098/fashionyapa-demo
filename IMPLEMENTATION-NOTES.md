# Fashionyapa implementation notes (Firebase migration)

This working copy preserves the current homepage styling and adds product detail pages, browser cart persistence, a checkout flow, Firebase-backed admin APIs, Razorpay order creation/signature verification, webhook reconciliation, and order confirmation.

Before testing, follow `FIREBASE-SETUP.md`. Firebase credentials and Razorpay test keys are required. Seeded stock is zero until the client enters verified quantities. Combo 7 is visible but remains unpriced, so checkout rejects it until the client confirms a price.

Build and live payment verification could not be completed in this environment: `npm install --no-audit --no-fund` timed out because packages could not be installed. Do not launch as a live store until dependencies install, `npm run build` passes, test orders/payments/webhooks are verified, and shipping/policy/contact details are confirmed.
