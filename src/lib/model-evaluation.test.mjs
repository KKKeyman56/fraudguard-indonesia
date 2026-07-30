import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRiskScores } from "./model-evaluation.ts";

test("menghitung precision recall F1 dan false-positive rate", () => {
  const result = evaluateRiskScores([
    { riskScore: 90, actualProblem: true },
    { riskScore: 80, actualProblem: false },
    { riskScore: 40, actualProblem: true },
    { riskScore: 10, actualProblem: false },
  ]);

  assert.equal(result.truePositive, 1);
  assert.equal(result.falsePositive, 1);
  assert.equal(result.falseNegative, 1);
  assert.equal(result.trueNegative, 1);
  assert.equal(result.precision, 0.5);
  assert.equal(result.recall, 0.5);
  assert.equal(result.f1, 0.5);
  assert.equal(result.falsePositiveRate, 0.5);
});

test("ML tetap terkunci jika label belum memenuhi syarat", () => {
  const result = evaluateRiskScores([{ riskScore: 20, actualProblem: false }]);
  assert.equal(result.readiness.ready, false);
  assert.equal(result.sampleSize, 1);
  assert.ok(result.readiness.reasons.length >= 2);
});

test("PR-AUC dan kalibrasi tersedia bila dua kelas terwakili", () => {
  const result = evaluateRiskScores([
    { riskScore: 95, actualProblem: true },
    { riskScore: 75, actualProblem: true },
    { riskScore: 35, actualProblem: false },
    { riskScore: 5, actualProblem: false },
  ]);
  assert.equal(result.prAuc, 1);
  assert.equal(result.calibration.length, 5);
  assert.ok(result.brierScore !== null);
});
