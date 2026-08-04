import "server-only";

import { createDokuTransaction, isDokuProduction } from "@/lib/doku";
import { createSnapTransaction, isMidtransProduction } from "@/lib/midtrans";
import { PAYMENT_PLANS, type PurchasablePlan } from "@/lib/payment-plans";

export type PaymentProvider = "doku" | "midtrans";

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "midtrans" ? "midtrans" : "doku";
}

export function isPaymentProduction() {
  return getPaymentProvider() === "doku" ? isDokuProduction() : isMidtransProduction();
}

export async function createPaymentCheckout(input: {
  orderId: string;
  plan: PurchasablePlan;
  email: string;
  appUrl: string;
}) {
  const provider = getPaymentProvider();
  const returnUrl = `${input.appUrl}/billing?payment=return&orderId=${encodeURIComponent(input.orderId)}`;
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
