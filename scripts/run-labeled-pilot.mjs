import { mkdir, writeFile } from "node:fs/promises";
import { scoreTransactions, RISK_ENGINE_VERSION } from "../src/lib/risk-engine.ts";
import { evaluateRiskScores } from "../src/lib/model-evaluation.ts";

const cases = [];

function addCases(count, kind, actualProblem, factory) {
  for (let index = 0; index < count; index += 1) {
    cases.push({
      kind,
      actualProblem,
      transaction: factory(index),
    });
  }
}

addCases(150, "aman-rutin", false, (index) => ({
  id: `SAFE-${index + 1}`,
  pelanggan: `Pelanggan Aman ${index + 1}`,
  nominal: 75_000 + ((index % 20) * 25_000),
  metode: ["QRIS", "Transfer bank", "E-wallet"][index % 3],
  waktu: `2026-07-${String((index % 20) + 1).padStart(2, "0")}T${String(9 + (index % 9)).padStart(2, "0")}:15:00+07:00`,
  kota: ["Jakarta", "Bandung", "Surabaya"][index % 3],
}));

addCases(30, "aman-nominal-tinggi-terverifikasi", false, (index) => ({
  id: `SAFE-HIGH-${index + 1}`,
  pelanggan: `Pelanggan Grosir ${index + 1}`,
  nominal: 5_500_000 + ((index % 5) * 300_000),
  metode: "Transfer bank",
  waktu: `2026-07-${String((index % 20) + 1).padStart(2, "0")}T14:30:00+07:00`,
  kota: "Jakarta",
  accountAgeDays: 700,
}));

addCases(120, "bermasalah-sinyal-kuat", true, (index) => ({
  id: `PROBLEM-STRONG-${index + 1}`,
  pelanggan: `Kasus Risiko Tinggi ${index + 1}`,
  nominal: 18_000_000 + ((index % 6) * 1_000_000),
  metode: "Kartu kredit",
  waktu: `2026-07-${String((index % 20) + 1).padStart(2, "0")}T02:10:00+07:00`,
  catatan: "Minta kirim sekarang tanpa verifikasi, bukti transfer berupa screenshot.",
  accountAgeDays: 1,
  failedPaymentCount: 4,
}));

addCases(60, "bermasalah-sinyal-lemah", true, (index) => ({
  id: `PROBLEM-SUBTLE-${index + 1}`,
  pelanggan: `Kasus Sulit ${index + 1}`,
  nominal: 2_200_000 + ((index % 4) * 100_000),
  metode: "Virtual account",
  waktu: `2026-07-${String((index % 20) + 1).padStart(2, "0")}T13:20:00+07:00`,
  kota: "Semarang",
  accountAgeDays: 2,
}));

const examples = cases.map((entry) => {
  const result = scoreTransactions(
    [entry.transaction],
    undefined,
    { engineVersion: RISK_ENGINE_VERSION },
  ).results[0];
  return {
    id: entry.transaction.id,
    kind: entry.kind,
    actualProblem: entry.actualProblem,
    riskScore: result.riskScore,
    predictedLabel: result.label,
  };
});

const evaluation = evaluateRiskScores(examples);
const report = {
  pilotId: "synthetic-labeled-pilot-v1",
  generatedAt: new Date().toISOString(),
  engineVersion: RISK_ENGINE_VERSION,
  threshold: 70,
  dataset: {
    type: "synthetic-curated",
    sampleSize: examples.length,
    labelDefinition: "Label skenario yang ditetapkan sebelum scoring: aman atau bermasalah.",
    warning: "Hasil ini menguji perilaku teknis engine, bukan akurasi pada transaksi UMKM nyata.",
  },
  evaluation,
  cohortSummary: Object.values(examples.reduce((groups, item) => {
    const current = groups[item.kind] ?? {
      kind: item.kind,
      count: 0,
      actualProblems: 0,
      averageScore: 0,
    };
    current.count += 1;
    current.actualProblems += item.actualProblem ? 1 : 0;
    current.averageScore += item.riskScore;
    groups[item.kind] = current;
    return groups;
  }, {})).map((group) => ({
    ...group,
    averageScore: Number((group.averageScore / group.count).toFixed(2)),
  })),
};

await mkdir("pilot/results", { recursive: true });
await writeFile(
  "pilot/results/pilot-hybrid-v2.json",
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  sampleSize: evaluation.sampleSize,
  positives: evaluation.positives,
  negatives: evaluation.negatives,
  precision: evaluation.precision,
  recall: evaluation.recall,
  f1: evaluation.f1,
  falsePositiveRate: evaluation.falsePositiveRate,
  readyByVolumeGate: evaluation.readiness.ready,
  report: "pilot/results/pilot-hybrid-v2.json",
}, null, 2));
