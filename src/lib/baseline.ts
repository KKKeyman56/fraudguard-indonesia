export type BaselineTransaction = {
  nominal: number;
  metode: string;
  waktu: string;
  kota?: string;
};

export type BusinessBaseline = {
  sampleSize: number;
  medianAmount: number;
  medianAbsoluteDeviation: number;
  p90Amount: number;
  normalHourStart: number | null;
  normalHourEnd: number | null;
  dominantMethods: string[];
  dominantCities: string[];
};

function normalize(value?: string) {
  return (value ?? "").normalize("NFKC").trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
}

export function hourFromTimestamp(value: string) {
  const match = value.match(/(?:T|\s)(\d{1,2}):\d{2}/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const ordered = values.toSorted((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ratio * ordered.length) - 1));
  return ordered[index];
}

function medianAbsoluteDeviation(values: number[], center: number) {
  return percentile(values.map((value) => Math.abs(value - center)), 0.5);
}

function dominant(values: string[], maximum: number) {
  const counts = new Map<string, number>();
  for (const value of values.map(normalize).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const highest = Math.max(...counts.values());
  const threshold = Math.max(2, Math.ceil(highest * 0.5));
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maximum)
    .map(([value]) => value);
}

export function buildBusinessBaseline(transactions: BaselineTransaction[]): BusinessBaseline {
  const amounts = transactions.map((item) => item.nominal).filter(Number.isFinite);
  const medianAmount = percentile(amounts, 0.5);
  const hours = transactions
    .map((item) => hourFromTimestamp(item.waktu))
    .filter((hour): hour is number => hour !== null);

  return {
    sampleSize: transactions.length,
    medianAmount,
    medianAbsoluteDeviation: medianAbsoluteDeviation(amounts, medianAmount),
    p90Amount: percentile(amounts, 0.9),
    normalHourStart: hours.length >= 10 ? percentile(hours, 0.1) : null,
    normalHourEnd: hours.length >= 10 ? percentile(hours, 0.9) : null,
    dominantMethods: dominant(transactions.map((item) => item.metode), 3),
    dominantCities: dominant(transactions.map((item) => item.kota ?? ""), 3),
  };
}
