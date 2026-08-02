import { createHash } from "node:crypto";

export type PaymentStatus = "pending" | "paid" | "denied" | "cancelled" | "expired" | "failed" | "refunded";

export function createMidtransSignature(input: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}) {
  return createHash("sha512")
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
    .digest("hex");
}

export function mapMidtransPaymentStatus(input: {
  transaction_status: string;
  fraud_status?: string;
}): PaymentStatus {
  const transactionStatus = input.transaction_status.toLowerCase();
  const fraudStatus = input.fraud_status?.toLowerCase();

  if ((transactionStatus === "capture" || transactionStatus === "settlement") &&
      (!fraudStatus || fraudStatus === "accept")) return "paid";
  if (transactionStatus === "deny") return "denied";
  if (transactionStatus === "cancel") return "cancelled";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "failure") return "failed";
  if (["refund", "partial_refund", "chargeback", "partial_chargeback"].includes(transactionStatus)) return "refunded";
  return "pending";
}
