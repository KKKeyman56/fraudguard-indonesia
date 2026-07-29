import assert from "node:assert/strict";
import test from "node:test";
import { buildBusinessBaseline } from "./baseline.ts";
import { createFallbackExplanation } from "./fallback-explanation.ts";
import { RISK_ENGINE_VERSION, scoreTransactions } from "./risk-engine.ts";

const normalTransaction = {
  id: "TX-NORMAL",
  pelanggan: "Siti Rahma",
  nominal: 150_000,
  metode: "QRIS",
  waktu: "2026-07-29T10:30",
  kota: "Bandung",
};

test("input yang sama selalu menghasilkan output yang sama", () => {
  const input = [
    normalTransaction,
    {
      id: "TX-RISK",
      pelanggan: "Pembeli Baru",
      nominal: 20_000_000,
      metode: "Transfer bank",
      waktu: "2026-07-29T02:15",
      catatan: "Bukti transfer sudah ada, minta kirim sekarang",
    },
  ];

  assert.deepEqual(scoreTransactions(input), scoreTransactions(structuredClone(input)));
});

test("transaksi normal tetap berada pada risiko rendah", () => {
  const result = scoreTransactions([normalTransaction]);
  assert.equal(result.engineVersion, RISK_ENGINE_VERSION);
  assert.equal(result.results[0].riskScore, 5);
  assert.equal(result.results[0].label, "AMAN");
  assert.deepEqual(result.results[0].signals, []);
});

test("kombinasi nominal ekstrem dan dini hari menghasilkan sinyal terstruktur", () => {
  const result = scoreTransactions([{
    ...normalTransaction,
    id: "TX-HIGH",
    nominal: 25_000_000,
    waktu: "2026-07-29T01:15",
    kota: undefined,
  }]);
  const transaction = result.results[0];
  const codes = transaction.signals.map((signal) => signal.code);

  assert.equal(transaction.label, "TERDETEKSI");
  assert.ok(codes.includes("FG-R001"));
  assert.ok(codes.includes("FG-R003"));
  assert.ok(codes.includes("FG-R006"));
  assert.ok(codes.includes("FG-R011"));
  assert.ok(transaction.signals.every((signal) => signal.weight > 0 && signal.reason.length > 0));
});

test("rule batch mendeteksi velocity, multi-city, dan nominal berulang", () => {
  const input = [
    { ...normalTransaction, id: "A", pelanggan: "Budi", nominal: 500_000, kota: "Jakarta" },
    { ...normalTransaction, id: "B", pelanggan: "Budi", nominal: 500_000, kota: "Bogor" },
    { ...normalTransaction, id: "C", pelanggan: "Budi", nominal: 500_000, kota: "Jakarta" },
  ];
  const result = scoreTransactions(input);

  for (const transaction of result.results) {
    const codes = transaction.signals.map((signal) => signal.code);
    assert.ok(codes.includes("FG-R007"));
    assert.ok(codes.includes("FG-R008"));
    assert.ok(codes.includes("FG-R009"));
    assert.ok(codes.includes("FG-R012"));
  }
});

test("skor tidak pernah melebihi 100", () => {
  const risky = Array.from({ length: 5 }, (_, index) => ({
    id: `RISK-${index}`,
    pelanggan: "Pelanggan Sama",
    nominal: 30_000_000,
    metode: "Transfer bank",
    waktu: "2026-07-29T02:00",
    kota: index % 2 === 0 ? "Jakarta" : "Surabaya",
    catatan: "Minta kirim sekarang tanpa verifikasi",
  }));
  const result = scoreTransactions(risky);

  assert.ok(result.results.every((transaction) => transaction.riskScore <= 100));
  assert.ok(result.overallRisk <= 100);
});

test("fallback lokal menghasilkan penjelasan tanpa memanggil Groq", () => {
  const risk = scoreTransactions([{
    ...normalTransaction,
    id: "TX-FALLBACK",
    nominal: 18_000_000,
    waktu: "2026-07-29T03:00",
    kota: undefined,
  }]);
  const explanation = createFallbackExplanation(risk);

  assert.equal(explanation.provider, "fallback");
  assert.equal(explanation.model, "fraudguard-template-v1");
  assert.equal(explanation.results[0].id, "TX-FALLBACK");
  assert.ok(explanation.results[0].reasoning.length > 0);
  assert.ok(explanation.insight.includes("risiko tinggi"));
});

test("baseline bisnis menghitung median, jam, metode, dan kota secara deterministik", () => {
  const history = Array.from({ length: 20 }, (_, index) => ({
    nominal: (index + 1) * 100_000,
    metode: index < 15 ? "QRIS" : "Transfer bank",
    waktu: `2026-07-${String(index + 1).padStart(2, "0")}T${String(8 + (index % 10)).padStart(2, "0")}:00`,
    kota: index < 14 ? "Bandung" : "Jakarta",
  }));

  const baseline = buildBusinessBaseline(history);

  assert.deepEqual(baseline, buildBusinessBaseline(structuredClone(history)));
  assert.equal(baseline.sampleSize, 20);
  assert.equal(baseline.medianAmount, 1_000_000);
  assert.equal(baseline.p90Amount, 1_800_000);
  assert.deepEqual(baseline.dominantMethods, ["qris"]);
  assert.deepEqual(baseline.dominantCities, ["bandung"]);
  assert.equal(baseline.normalHourStart, 8);
  assert.equal(baseline.normalHourEnd, 16);
});

test("baseline toko memunculkan sinyal anomali nominal, waktu, metode, dan kota", () => {
  const baseline = {
    sampleSize: 30,
    medianAmount: 300_000,
    p90Amount: 900_000,
    normalHourStart: 8,
    normalHourEnd: 19,
    dominantMethods: ["qris"],
    dominantCities: ["bandung"],
  };
  const result = scoreTransactions([{
    ...normalTransaction,
    id: "TX-BASELINE",
    nominal: 2_000_000,
    metode: "Kartu kredit",
    waktu: "2026-07-29T21:15",
    kota: "Surabaya",
  }], baseline);
  const codes = result.results[0].signals.map((item) => item.code);

  assert.ok(codes.includes("FG-R013"));
  assert.ok(codes.includes("FG-R014"));
  assert.ok(codes.includes("FG-R015"));
  assert.ok(codes.includes("FG-R016"));
  assert.deepEqual(result.baseline, baseline);
});

test("data transaksi yang lebih kaya mengaktifkan aturan akun baru dan perilaku pembayaran", () => {
  const result = scoreTransactions([{
    ...normalTransaction,
    id: "TX-RICH",
    nominal: 2_500_000,
    accountAgeDays: 5,
    failedPaymentCount: 4,
    refundCount: 2,
    itemCount: 12,
  }]);
  const codes = result.results[0].signals.map((item) => item.code);

  assert.ok(codes.includes("FG-R017"));
  assert.ok(codes.includes("FG-R018"));
  assert.ok(codes.includes("FG-R019"));
  assert.ok(codes.includes("FG-R020"));
});
