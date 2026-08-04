import { createHash, createHmac } from "node:crypto";

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

export function createDokuDigest(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("base64");
}

export function createDokuSignature(input: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  rawBody: string;
  secretKey: string;
}) {
  const component = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.requestTimestamp}`,
    `Request-Target:${input.requestTarget}`,
    `Digest:${createDokuDigest(input.rawBody)}`,
  ].join("\n");
  const signature = createHmac("sha256", input.secretKey).update(component).digest("base64");
  return `HMACSHA256=${signature}`;
}

export function mapDokuPaymentStatus(transactionStatus: unknown): PaymentStatus {
  const status = String(transactionStatus ?? "").trim().toUpperCase();
  if (status === "SUCCESS") return "paid";
  if (["REFUND", "REFUNDED", "PARTIAL_REFUND", "CHARGEBACK"].includes(status)) return "refunded";
  if (["EXPIRED", "TIMEOUT"].includes(status)) return "expired";
  if (["CANCEL", "CANCELLED"].includes(status)) return "cancelled";
  // Pada DOKU Checkout, FAILED bukan status final karena pelanggan masih dapat
  // mencoba ulang atau memilih channel lain pada sesi checkout yang sama.
  return "pending";
}
