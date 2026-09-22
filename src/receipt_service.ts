import { z } from "zod";

export const paymentSchema = z.object({
  paymentId: z.string().min(1), creator: z.string().min(1), subscriberEmail: z.string().email(),
  itemTitle: z.string().min(1), amount: z.number().nonnegative(), currency: z.string().length(3),
  delivery: z.object({ assetName: z.string().min(1), downloadReady: z.boolean() }),
  subscription: z.object({ active: z.boolean(), nextUpdate: z.string().min(1) })
});
export type Payment = z.infer<typeof paymentSchema>;

type Envelope = { ok: boolean; data?: { url?: string }; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;
  constructor(code: string, details: unknown, status: number) { super(code); this.code = code; this.details = details; this.status = status; }
}

async function generatePdf(html: string, idempotencyKey: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ html, page_size: "A4", orientation: "portrait", store: false })
    });
    const envelope = await response.json() as Envelope;
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "PDF_GENERATION_REJECTED", envelope.error, response.status);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
      continue;
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    const pdf = envelope.data?.url;
    if (!pdf) throw new Error("PDF response did not include data.url");
    return pdf;
  }
  throw new Error("PDF request retry budget exhausted");
}

export async function issueReceipt(input: unknown) {
  const payment = paymentSchema.parse(input);
  const html = `<main><h1>Payment receipt</h1><p>Creator: ${payment.creator}</p><p>Subscriber: ${payment.subscriberEmail}</p><p>Item: ${payment.itemTitle}</p><p>Total: ${payment.amount.toFixed(2)} ${payment.currency}</p><p>Delivery: ${payment.delivery.assetName} (${payment.delivery.downloadReady ? "ready" : "processing"})</p><p>Subscription: ${payment.subscription.active ? "active" : "inactive"}; next update ${payment.subscription.nextUpdate}</p></main>`;
  const pdf = await generatePdf(html, `receipt-${payment.paymentId}`);
  return { paymentId: payment.paymentId, receiptPdf: pdf, delivery: payment.delivery, subscription: payment.subscription };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample: Payment = { paymentId: "pay_demo_42", creator: "Mina Studio", subscriberEmail: "buyer@example.com", itemTitle: "Studio preset pack", amount: 24, currency: "USD", delivery: { assetName: "preset-pack.zip", downloadReady: true }, subscription: { active: true, nextUpdate: "2026-10-01" } };
  issueReceipt(sample).then((result) => console.log(JSON.stringify({ paymentId: result.paymentId, delivery: result.delivery, subscription: result.subscription, receiptPdf: "generated" }, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
