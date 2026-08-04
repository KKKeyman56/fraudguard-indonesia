import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createDokuSignature, mapDokuPaymentStatus, type PaymentStatus } from "@/lib/payment-core";
import { PAYMENT_PLANS, type PurchasablePlan } from "@/lib/payment-plans";

const CHECKOUT_TARGET = "/checkout/v1/payment";

const checkoutResponseSchema = z.object({
  message: z.array(z.string()).optional(),
  response: z.object({
    order: z.object({
      session_id: z.string().min(1),
    }),
    payment: z.object({
      token_id: z.string().optional(),
      url: z.string().url(),
      expired_date: z.string().optional(),
    }),
  }),
});

const notificationSchema = z.object({
  order: z.object({
    invoice_number: z.string().min(1).max(64),
    amount: z.union([z.string(), z.number()]),
  }).passthrough(),
  transaction: z.object({
    status: z.string().min(1),
    original_request_id: z.string().optional(),
  }).passthrough(),
  service: z.object({ id: z.string().optional() }).passthrough().optional(),
  channel: z.object({ id: z.string().optional() }).passthrough().optional(),
}).passthrough();

export type DokuNotification = z.infer<typeof notificationSchema>;

function getDokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID?.trim();
  const secretKey = process.env.DOKU_SECRET_KEY?.trim();
  if (!clientId) throw new Error("DOKU_CLIENT_ID_MISSING");
  if (!secretKey) throw new Error("DOKU_SECRET_KEY_MISSING");
  const production = process.env.DOKU_IS_PRODUCTION === "true";
  return {
    clientId,
    secretKey,
    production,
    baseUrl: production ? "https://api.doku.com" : "https://api-sandbox.doku.com",
  };
}

export function isDokuProduction() {
  return process.env.DOKU_IS_PRODUCTION === "true";
}

function requestTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function createDokuTransaction(input: {
  orderId: string;
  plan: PurchasablePlan;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}) {
  const config = getDokuConfig();
  const selectedPlan = PAYMENT_PLANS[input.plan];
  const requestId = randomUUID();
  const timestamp = requestTimestamp();
  const rawBody = JSON.stringify({
    order: {
      amount: selectedPlan.amount,
      invoice_number: input.orderId,
      currency: "IDR",
      callback_url: input.returnUrl,
      callback_url_result: input.returnUrl,
      callback_url_cancel: input.cancelUrl,
      language: "ID",
      auto_redirect: true,
      line_items: [{
        id: input.plan,
        name: selectedPlan.name,
        quantity: 1,
        price: selectedPlan.amount,
        sku: `fraudguard-${input.plan}`,
        category: "digital-product",
      }],
    },
    payment: { payment_due_date: 60, type: "SALE" },
    customer: {
      name: "Pelanggan FraudGuard",
      email: input.email,
    },
    additional_info: {
      override_notification_url: input.notifyUrl,
    },
  });
  const signature = createDokuSignature({
    clientId: config.clientId,
    requestId,
    requestTimestamp: timestamp,
    requestTarget: CHECKOUT_TARGET,
    rawBody,
    secretKey: config.secretKey,
  });
  const response = await fetch(`${config.baseUrl}${CHECKOUT_TARGET}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: rawBody,
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("DOKU API error", response.status, payload);
    throw new Error(`DOKU_API_FAILED:${response.status}`);
  }
  const parsed = checkoutResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("DOKU checkout response invalid", parsed.error.flatten());
    throw new Error("DOKU_RESPONSE_INVALID");
  }
  return {
    sessionId: parsed.data.response.order.session_id,
    redirectUrl: parsed.data.response.payment.url,
    expiresAt: parsed.data.response.payment.expired_date,
  };
}

export function parseDokuNotification(rawBody: string): DokuNotification {
  const payload: unknown = JSON.parse(rawBody);
  const parsed = notificationSchema.safeParse(payload);
  if (!parsed.success) throw new Error("DOKU_NOTIFICATION_INVALID");
  return parsed.data;
}

export function verifyDokuNotification(input: {
  rawBody: string;
  clientId: string | null;
  requestId: string | null;
  requestTimestamp: string | null;
  requestTarget: string;
  signature: string | null;
}) {
  const config = getDokuConfig();
  if (!input.clientId || input.clientId !== config.clientId || !input.requestId ||
      !input.requestTimestamp || !input.signature) return false;
  const expected = createDokuSignature({
    clientId: input.clientId,
    requestId: input.requestId,
    requestTimestamp: input.requestTimestamp,
    requestTarget: input.requestTarget,
    rawBody: input.rawBody,
    secretKey: config.secretKey,
  });
  if (input.signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input.signature, "utf8"), Buffer.from(expected, "utf8"));
}

export function mapDokuStatus(payload: DokuNotification): PaymentStatus {
  return mapDokuPaymentStatus(payload.transaction.status);
}
