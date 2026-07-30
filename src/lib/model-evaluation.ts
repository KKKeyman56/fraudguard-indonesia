export type EvaluationExample = {
  riskScore: number;
  actualProblem: boolean;
};

export type CalibrationBucket = {
  range: string;
  count: number;
  predictedRate: number;
  observedRate: number;
};

export type ModelEvaluation = {
  sampleSize: number;
  positives: number;
  negatives: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  falsePositiveRate: number | null;
  prAuc: number | null;
  brierScore: number | null;
  calibration: CalibrationBucket[];
  readiness: {
    ready: boolean;
    minimumLabels: number;
    minimumPerClass: number;
    reasons: string[];
  };
};

const MINIMUM_LABELS = 200;
const MINIMUM_PER_CLASS = 50;

function safeRatio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function rounded(value: number | null) {
  return value === null ? null : Number(value.toFixed(4));
}

function calculatePrAuc(examples: EvaluationExample[]) {
  const positives = examples.filter((item) => item.actualProblem).length;
  if (positives === 0) return null;

  const ordered = examples.toSorted((left, right) => right.riskScore - left.riskScore);
  let truePositive = 0;
  let falsePositive = 0;
  let previousRecall = 0;
  let area = 0;

  for (const item of ordered) {
    if (item.actualProblem) truePositive += 1;
    else falsePositive += 1;
    const recall = truePositive / positives;
    const precision = truePositive / (truePositive + falsePositive);
    area += (recall - previousRecall) * precision;
    previousRecall = recall;
  }
  return area;
}

function calibrationBuckets(examples: EvaluationExample[]): CalibrationBucket[] {
  return Array.from({ length: 5 }, (_, index) => {
    const minimum = index * 20;
    const maximum = index === 4 ? 100 : minimum + 19;
    const rows = examples.filter((item) => (
      item.riskScore >= minimum && item.riskScore <= maximum
    ));
    return {
      range: `${minimum}-${maximum}`,
      count: rows.length,
      predictedRate: rows.length === 0
        ? 0
        : Number((rows.reduce((total, item) => total + item.riskScore / 100, 0) / rows.length).toFixed(4)),
      observedRate: rows.length === 0
        ? 0
        : Number((rows.filter((item) => item.actualProblem).length / rows.length).toFixed(4)),
    };
  });
}

export function evaluateRiskScores(
  examples: EvaluationExample[],
  threshold = 70,
): ModelEvaluation {
  const positives = examples.filter((item) => item.actualProblem).length;
  const negatives = examples.length - positives;
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;

  for (const item of examples) {
    const predictedProblem = item.riskScore >= threshold;
    if (predictedProblem && item.actualProblem) truePositive += 1;
    if (predictedProblem && !item.actualProblem) falsePositive += 1;
    if (!predictedProblem && !item.actualProblem) trueNegative += 1;
    if (!predictedProblem && item.actualProblem) falseNegative += 1;
  }

  const precision = safeRatio(truePositive, truePositive + falsePositive);
  const recall = safeRatio(truePositive, truePositive + falseNegative);
  const f1 = precision === null || recall === null || precision + recall === 0
    ? null
    : (2 * precision * recall) / (precision + recall);
  const readinessReasons: string[] = [];
  if (examples.length < MINIMUM_LABELS) {
    readinessReasons.push(`Butuh minimal ${MINIMUM_LABELS} transaksi berlabel.`);
  }
  if (positives < MINIMUM_PER_CLASS) {
    readinessReasons.push(`Butuh minimal ${MINIMUM_PER_CLASS} label bermasalah.`);
  }
  if (negatives < MINIMUM_PER_CLASS) {
    readinessReasons.push(`Butuh minimal ${MINIMUM_PER_CLASS} label aman.`);
  }

  return {
    sampleSize: examples.length,
    positives,
    negatives,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    precision: rounded(precision),
    recall: rounded(recall),
    f1: rounded(f1),
    falsePositiveRate: rounded(safeRatio(falsePositive, falsePositive + trueNegative)),
    prAuc: rounded(calculatePrAuc(examples)),
    brierScore: examples.length === 0
      ? null
      : rounded(examples.reduce((total, item) => {
        const probability = item.riskScore / 100;
        const actual = item.actualProblem ? 1 : 0;
        return total + ((probability - actual) ** 2);
      }, 0) / examples.length),
    calibration: calibrationBuckets(examples),
    readiness: {
      ready: readinessReasons.length === 0,
      minimumLabels: MINIMUM_LABELS,
      minimumPerClass: MINIMUM_PER_CLASS,
      reasons: readinessReasons,
    },
  };
}
