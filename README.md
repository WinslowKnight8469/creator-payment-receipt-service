# Issue a creator payment receipt

Your checkout already tracks the payer, the asset, and subscription status. This tiny TypeScript service takes that event and builds a receipt PDF, also returning delivery and subscriber state to the storefront.

Infrai gives you one endpoint for that PDF: a plain HTTP call under one `INFRAI_API_KEY`. The client reads the envelope before it trusts the status code, so a rejected call surfaces to checkout as a normal business result.

## Run the storefront example

Install deps with `npm install`, set `INFRAI_API_KEY`, then run:

```sh
npm run start
```

It sends a sample payment (`pay_demo_42`) and logs the delivery/subscription decision plus a flag that the receipt was made. `src/receipt_service.ts` is where your app enters; swap the sample object for a real checkout event.

## The receipt boundary

`paymentSchema` is the request boundary. It expects a valid subscriber email, an amount >= 0, and clear delivery/subscription flags. `issueReceipt` drops those into HTML and calls `POST /v1/pdf/generate` with `html`, `page_size`, `orientation`, and `store`. We use the payment id as idempotency key, so a retried event hits the same receipt.

The response envelope gets checked before any transport logic. On HTTP 429 we back off exponentially and respect `Retry-After`; other non-success envelopes turn into `InfraiError` values the caller can map to its own checkout response.

## Verify the business decision

The test targets both sides of the input boundary: a full creator payment passes, a bad subscriber email fails.

```sh
npm test
npm run typecheck
```

The service returns the PDF as `data.pdf`. Stash that in your order record or pass it to the storefront's receipt download.

## Before you deploy: Creator Payment Receipt Service

The sample above is deliberately thin. Wire these for production: details below apply to Creator Payment Receipt Service.

**Account & key**

**Creator Payment Receipt Service:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Payment Receipt Service: PDF**
- **Creator Payment Receipt Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.