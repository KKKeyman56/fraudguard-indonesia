import assert from "node:assert/strict";
import test from "node:test";
import {
  createDokuDigest,
  createDokuSignature,
  createMidtransSignature,
  mapDokuPaymentStatus,
  mapMidtransPaymentStatus,
} from "./payment-core.ts";

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

test("digest dan signature DOKU memakai raw JSON yang benar-benar dikirim", () => {
  const input = {
    clientId: "BRN-TEST-001",
    requestId: "request-001",
    requestTimestamp: "2026-08-04T10:00:00Z",
    requestTarget: "/checkout/v1/payment",
    rawBody: JSON.stringify({ order: { amount: 99000, invoice_number: "FG-TEST-2" } }),
    secretKey: "secret-key",
  };
  const signature = createDokuSignature(input);
  assert.match(signature, /^HMACSHA256=[A-Za-z0-9+/]+=*$/);
  assert.equal(signature, createDokuSignature(input));
  assert.equal(createDokuDigest(input.rawBody), "sqVChKj08gy663fFgFJtbKchVp0qftiolG8F6KjLAMs=");
  assert.notEqual(signature, createDokuSignature({ ...input, rawBody: JSON.stringify({ order: { amount: 198000 } }) }));
});

test("signature notifikasi DOKU berubah jika target webhook berubah", () => {
  const input = {
    clientId: "BRN-TEST-001",
    requestId: "notification-001",
    requestTimestamp: "2026-08-04T10:01:00Z",
    requestTarget: "/api/billing/webhook/doku",
    rawBody: JSON.stringify({ order: { invoice_number: "FG-TEST-2", amount: 99000 }, transaction: { status: "SUCCESS" } }),
    secretKey: "secret-key",
  };
  assert.notEqual(createDokuSignature(input), createDokuSignature({ ...input, requestTarget: "/api/billing/webhook" }));
});

test("status DOKU Checkout konservatif dan FAILED tidak mematikan sesi", () => {
  assert.equal(mapDokuPaymentStatus("SUCCESS"), "paid");
  assert.equal(mapDokuPaymentStatus("PENDING"), "pending");
  assert.equal(mapDokuPaymentStatus("FAILED"), "pending");
  assert.equal(mapDokuPaymentStatus("EXPIRED"), "expired");
  assert.equal(mapDokuPaymentStatus("REFUNDED"), "refunded");
});
