import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const purchasablePlanSchema = z.enum(["pro", "enterprise"]);
export type PurchasablePlan = z.infer<typeof purchasablePlanSchema>;

export const MIDTRANS_PLANS: Record<PurchasablePlan, {
  name: string;
  amount: number;
}> = {
  pro: { name: "FraudGuard Pro - 30 hari", amount: 99_000 },
  enterprise: { name: "FraudGuard Max - 30 hari", amount: 198_000 },
};

const statusSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
  signature_key: z.string().optional(),
});

export type MidtransStatus = z.infer<typeof statusSchema>;
export type PaymentStatus = "pending" | "paid" | "denied" | "cancelled" | "expired" | "failed" | "refunded";

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY_MISSING");

  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return {
    serverKey,
    snapBaseUrl: production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com",
    apiBaseUrl: production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com",
  };
}

function authorization(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

async function readMidtransResponse(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Midtrans API error", response.status, body);
    throw new Error(`MIDTRANS_API_FAILED:${response.status}`);
  }
  return body;
}

export async function createSnapTransaction(input: {
  orderId: string;
  plan: PurchasablePlan;
  email: string;
  finishUrl: string;
}) {
  const config = getMidtransConfig();
  const selectedPlan = MIDTRANS_PLANS[input.plan];
  const response = await fetch(`${config.snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: authorization(config.serverKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: selectedPlan.amount },
      item_details: [{
        id: input.plan,
        price: selectedPlan.amount,
        quantity: 1,
        name: selectedPlan.name,
      }],
      customer_details: { email: input.email },
      credit_card: { secure: true },
      callbacks: { finish: input.finishUrl },
      page_expiry: { duration: 60, unit: "minutes" },
    }),
    cache: "no-store",
  });

  const parsed = z.object({ token: z.string().min(1), redirect_url: z.string().url() })
    .safeParse(await readMidtransResponse(response));
  if (!parsed.success) throw new Error("MIDTRANS_RESPONSE_INVALID");
  return parsed.data;
}

export function verifyNotificationSignature(payload: MidtransStatus) {
  if (!payload.signature_key) return false;
  const { serverKey } = getMidtransConfig();
  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest("hex");
  const received = payload.signature_key.toLowerCase();
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

export function parseMidtransStatus(value: unknown) {
  return statusSchema.safeParse(value);
}

export async function getTransactionStatus(orderId: string) {
  const config = getMidtransConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Accept: "application/json",
        Authorization: authorization(config.serverKey),
      },
      cache: "no-store",
    },
  );
  const parsed = statusSchema.safeParse(await readMidtransResponse(response));
  if (!parsed.success) throw new Error("MIDTRANS_STATUS_INVALID");
  return parsed.data;
}

export function mapPaymentStatus(status: MidtransStatus): PaymentStatus {
  const transactionStatus = status.transaction_status.toLowerCase();
  const fraudStatus = status.fraud_status?.toLowerCase();

  if ((transactionStatus === "capture" || transactionStatus === "settlement") &&
      (!fraudStatus || fraudStatus === "accept")) return "paid";
  if (transactionStatus === "deny") return "denied";
  if (transactionStatus === "cancel") return "cancelled";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "failure") return "failed";
  if (["refund", "partial_refund", "chargeback", "partial_chargeback"].includes(transactionStatus)) return "refunded";
  return "pending";
}
