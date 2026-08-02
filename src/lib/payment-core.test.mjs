import assert from "node:assert/strict";
import test from "node:test";
import { createMidtransSignature, mapMidtransPaymentStatus } from "./payment-core.ts";

test("status settlement dan capture accept mengaktifkan pembayaran", () => {
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "settlement" }), "paid");
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "capture", fraud_status: "accept" }), "paid");
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
});

test("status terminal Midtrans dipetakan secara konservatif", () => {
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "deny" }), "denied");
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "cancel" }), "cancelled");
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "expire" }), "expired");
  assert.equal(mapMidtransPaymentStatus({ transaction_status: "chargeback" }), "refunded");
});

test("signature Midtrans deterministik dan sensitif terhadap nominal", () => {
  const base = { orderId: "FG-TEST-1", statusCode: "200", grossAmount: "99000.00", serverKey: "server-key" };
  const signature = createMidtransSignature(base);
  assert.equal(signature.length, 128);
  assert.equal(signature, createMidtransSignature(base));
  assert.notEqual(signature, createMidtransSignature({ ...base, grossAmount: "198000.00" }));
});
