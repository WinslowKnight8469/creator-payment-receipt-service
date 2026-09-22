import assert from "node:assert/strict";
import { paymentSchema } from "./receipt_service.js";

const parsed = paymentSchema.safeParse({ paymentId: "p1", creator: "Shop", subscriberEmail: "buyer@example.com", itemTitle: "Bundle", amount: 10, currency: "USD", delivery: { assetName: "bundle.zip", downloadReady: true }, subscription: { active: true, nextUpdate: "2026-10-01" } });
assert.equal(parsed.success, true);
assert.equal(paymentSchema.safeParse({ paymentId: "p1", creator: "Shop", subscriberEmail: "bad", itemTitle: "Bundle", amount: 10, currency: "USD", delivery: { assetName: "bundle.zip", downloadReady: true }, subscription: { active: true, nextUpdate: "2026-10-01" } }).success, false);
console.log("receipt boundary test passed");
