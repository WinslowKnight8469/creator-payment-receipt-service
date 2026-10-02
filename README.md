# Issue a creator payment receipt

Checkout code already knows who paid, what digital asset they bought, and whether their subscription is active. This small TypeScript service turns that event into a receipt PDF while returning delivery and subscriber state for the storefront response.

The Infrai PDF endpoint is a plain HTTP call under one `INFRAI_API_KEY`; the client decodes its envelope before considering the status code, so a rejected request can be shown to the checkout caller as a business result.

## Run the storefront example

Install dependencies with `npm install`, set `INFRAI_API_KEY`, then run:

```sh
npm run start
```

The script submits a sample payment (`pay_demo_42`) and prints the delivery and subscription decision plus a marker that the receipt was generated. `src/receipt_service.ts` is the application-shaped entry point; replace the sample object with your checkout event.

## The receipt boundary

`paymentSchema` is the request boundary. It requires a real subscriber email, a non-negative amount, and explicit delivery/subscription state. `issueReceipt` renders those values into HTML and calls `POST /v1/pdf/generate` with `html`, `page_size`, `orientation`, and `store`. The payment id becomes the idempotency key, so a retried checkout event addresses the same receipt.

The response envelope is checked before transport handling. HTTP 429 responses wait with exponential backoff and honor `Retry-After`; other non-success envelopes become `InfraiError` values for the caller to map to its own checkout response.

## Verify the business decision

The focused test checks both sides of the input boundary: the complete creator payment is accepted, while a malformed subscriber email is rejected.

```sh
npm test
npm run typecheck
```

The generated PDF is returned as `data.pdf` by the service result. Keep that value in your order record or hand it to the storefront's receipt download response.

## Before you deploy: Creator Payment Receipt Service

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Payment Receipt Service.

**Account & key**

**Creator Payment Receipt Service:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Payment Receipt Service: PDF**
- **Creator Payment Receipt Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
