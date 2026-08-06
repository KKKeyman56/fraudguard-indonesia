import "server-only";

import { createDokuTransaction, isDokuProduction } from "@/lib/doku";
import { createSnapTransaction, isMidtransProduction } from "@/lib/midtrans";
import { PAYMENT_PLANS, type PurchasablePlan } from "@/lib/payment-plans";

export type PaymentProvider = "manual_bank" | "doku" | "midtrans";

export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "midtrans") return "midtrans";
  if (process.env.PAYMENT_PROVIDER === "doku") return "doku";
  return "manual_bank";
}

export function isPaymentProduction() {
  const provider = getPaymentProvider();
  if (provider === "doku") return isDokuProduction();
  if (provider === "midtrans") return isMidtransProduction();
  return true;
}

export function isManualBankConfigured() {
  return Boolean(
    process.env.MANUAL_PAYMENT_BANK_NAME?.trim() &&
    process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER?.trim() &&
    process.env.MANUAL_PAYMENT_ACCOUNT_HOLDER?.trim(),
  );
}

export async function createPaymentCheckout(input: {
  orderId: string;
  plan: PurchasablePlan;
  email: string;
  appUrl: string;
}) {
  const provider = getPaymentProvider();
  const returnUrl = `${input.appUrl}/billing?payment=return&orderId=${encodeURIComponent(input.orderId)}`;
  if (provider === "manual_bank") {
    if (!isManualBankConfigured()) throw new Error("MANUAL_BANK_CONFIG_MISSING");
    return {
      provider,
      redirectUrl: `${input.appUrl}/billing/manual/${encodeURIComponent(input.orderId)}`,
      sessionId: null,
    };
  }
  if (provider === "midtrans") {
    const snap = await createSnapTransaction({
      orderId: input.orderId,
      plan: input.plan,
      email: input.email,
      finishUrl: returnUrl,
    });
    return { provider, redirectUrl: snap.redirect_url, sessionId: snap.token };
  }

  const checkout = await createDokuTransaction({
    orderId: input.orderId,
    plan: input.plan,
    email: input.email,
    returnUrl,
    cancelUrl: `${input.appUrl}/billing?payment=cancelled&orderId=${encodeURIComponent(input.orderId)}`,
    notifyUrl: `${input.appUrl}/api/billing/webhook/doku`,
  });
  return { provider, redirectUrl: checkout.redirectUrl, sessionId: checkout.sessionId };
}

export { PAYMENT_PLANS };
