import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRequestSchema } from "./schemas.ts";

const transaction = {
  id: "TX-CONSENT-001",
  pelanggan: "Pelanggan Uji",
  nominal: 150_000,
  metode: "QRIS",
  waktu: "2026-07-30T12:00:00+07:00",
};

test("analisis menolak request tanpa persetujuan pemrosesan data", () => {
  assert.equal(analyzeRequestSchema.safeParse({ transactions: [transaction] }).success, false);
  assert.equal(analyzeRequestSchema.safeParse({
    transactions: [transaction],
    dataProcessingConsent: false,
  }).success, false);
});

test("analisis menerima request dengan persetujuan eksplisit", () => {
  assert.equal(analyzeRequestSchema.safeParse({
    transactions: [transaction],
    dataProcessingConsent: true,
  }).success, true);
});
