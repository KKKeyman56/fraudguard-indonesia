export const RISK_ENGINE_VERSION = "rules-v1.0.0";

export type RiskEngineLabel = "AMAN" | "WASPADA" | "TERDETEKSI";
export type RiskSeverity = "rendah" | "sedang" | "tinggi";

export type RiskSignal = {
  code: string;
  weight: number;
  severity: RiskSeverity;
  title: string;
  reason: string;
  recommendation: string;
};

export type RiskEngineTransaction = {
  id: string;
  pelanggan: string;
  nominal: number;
  metode: string;
  waktu: string;
  kota?: string;
  catatan?: string;
};

export type ScoredTransaction<T extends RiskEngineTransaction = RiskEngineTransaction> = {
  transaction: T;
  riskScore: number;
  label: RiskEngineLabel;
  signals: RiskSignal[];
};

export type RiskEngineResult<T extends RiskEngineTransaction = RiskEngineTransaction> = {
  engineVersion: typeof RISK_ENGINE_VERSION;
  overallRisk: number;
  results: ScoredTransaction<T>[];
};

type BatchContext = {
  customerCounts: Map<string, number>;
  customerCities: Map<string, Set<string>>;
  customerAmountCounts: Map<string, number>;
  amountCounts: Map<number, number>;
  medianAmount: number;
};

const BASE_RISK_SCORE = 5;
const HIGH_AMOUNT = 5_000_000;
const EXTREME_AMOUNT = 15_000_000;
const OUTLIER_MINIMUM = 1_000_000;
const URGENCY_PATTERNS = [
  "bukti transfer",
  "screenshot",
  "kirim sekarang",
  "kirim cepat",
  "minta kirim",
  "tanpa verifikasi",
  "jangan telepon",
  "jangan hubungi",
];

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/\s+/g, " ");
}

function transactionHour(value: string) {
  const timeMatch = value.match(/(?:T|\s)(\d{1,2}):\d{2}/);
  if (!timeMatch) return null;
  const hour = Number(timeMatch[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const ordered = values.toSorted((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function labelFromScore(score: number): RiskEngineLabel {
  if (score >= 70) return "TERDETEKSI";
  if (score >= 40) return "WASPADA";
  return "AMAN";
}

function addCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function createBatchContext(transactions: RiskEngineTransaction[]): BatchContext {
  const customerCounts = new Map<string, number>();
  const customerCities = new Map<string, Set<string>>();
  const customerAmountCounts = new Map<string, number>();
  const amountCounts = new Map<number, number>();

  for (const transaction of transactions) {
    const customer = normalizeText(transaction.pelanggan);
    const city = normalizeText(transaction.kota);
    addCount(customerCounts, customer);
    addCount(customerAmountCounts, `${customer}:${transaction.nominal}`);
    amountCounts.set(transaction.nominal, (amountCounts.get(transaction.nominal) ?? 0) + 1);
    if (city) {
      const cities = customerCities.get(customer) ?? new Set<string>();
      cities.add(city);
      customerCities.set(customer, cities);
    }
  }

  return {
    customerCounts,
    customerCities,
    customerAmountCounts,
    amountCounts,
    medianAmount: median(transactions.map((transaction) => transaction.nominal)),
  };
}

function signal(
  code: string,
  weight: number,
  severity: RiskSeverity,
  title: string,
  reason: string,
  recommendation: string,
): RiskSignal {
  return { code, weight, severity, title, reason, recommendation };
}

function evaluateTransaction(
  transaction: RiskEngineTransaction,
  context: BatchContext,
  batchSize: number,
) {
  const signals: RiskSignal[] = [];
  const customer = normalizeText(transaction.pelanggan);
  const city = normalizeText(transaction.kota);
  const notes = normalizeText(transaction.catatan);
  const hour = transactionHour(transaction.waktu);

  if (transaction.nominal >= EXTREME_AMOUNT) {
    signals.push(signal(
      "FG-R001",
      28,
      "tinggi",
      "Nominal sangat tinggi",
      "Nilai transaksi berada pada kategori sangat tinggi untuk pemeriksaan awal UMKM.",
      "Konfirmasi pembayaran melalui mutasi resmi dan verifikasi identitas pemesan.",
    ));
  } else if (transaction.nominal >= HIGH_AMOUNT) {
    signals.push(signal(
      "FG-R002",
      16,
      "sedang",
      "Nominal tinggi",
      "Nilai transaksi melewati ambang nominal tinggi pada Risk Engine V1.",
      "Lakukan verifikasi pembayaran tambahan sebelum barang diproses.",
    ));
  }

  if (hour !== null && hour >= 0 && hour <= 4) {
    signals.push(signal(
      "FG-R003",
      18,
      "tinggi",
      "Transaksi dini hari",
      "Waktu transaksi berada di antara pukul 00.00 dan 04.59.",
      "Tinjau kembali aktivitas akun dan konfirmasi pesanan pada jam operasional.",
    ));
  } else if (hour !== null && (hour === 5 || hour >= 22)) {
    signals.push(signal(
      "FG-R004",
      8,
      "rendah",
      "Transaksi di luar jam umum",
      "Waktu transaksi berada di luar rentang jam transaksi yang umum.",
      "Pastikan waktu dan konteks pesanan sesuai dengan aktivitas pelanggan.",
    ));
  }

  if (notes && URGENCY_PATTERNS.some((pattern) => notes.includes(pattern))) {
    signals.push(signal(
      "FG-R005",
      12,
      "sedang",
      "Permintaan mendesak",
      "Catatan transaksi mengandung pola desakan atau permintaan melewati proses verifikasi.",
      "Jangan melewati pemeriksaan pembayaran meskipun pengiriman diminta dipercepat.",
    ));
  }

  if (transaction.nominal >= 2_000_000 && !city) {
    signals.push(signal(
      "FG-R006",
      7,
      "rendah",
      "Lokasi belum lengkap",
      "Transaksi bernilai tinggi tidak memiliki informasi kota.",
      "Lengkapi dan cocokkan lokasi pelanggan sebelum memenuhi pesanan.",
    ));
  }

  if ((context.customerCounts.get(customer) ?? 0) >= 3) {
    signals.push(signal(
      "FG-R007",
      15,
      "sedang",
      "Frekuensi pelanggan tinggi",
      "Pelanggan yang sama muncul sedikitnya tiga kali dalam batch analisis.",
      "Periksa jarak waktu dan tujuan seluruh pesanan pelanggan tersebut.",
    ));
  }

  if ((context.customerCities.get(customer)?.size ?? 0) >= 2) {
    signals.push(signal(
      "FG-R008",
      14,
      "sedang",
      "Lokasi pelanggan tidak konsisten",
      "Pelanggan yang sama menggunakan lebih dari satu kota dalam batch.",
      "Konfirmasi alamat pengiriman dan kepemilikan akun sebelum memproses.",
    ));
  }

  if ((context.customerAmountCounts.get(`${customer}:${transaction.nominal}`) ?? 0) >= 2) {
    signals.push(signal(
      "FG-R009",
      12,
      "sedang",
      "Nominal pelanggan berulang",
      "Pelanggan yang sama melakukan transaksi dengan nominal persis sama lebih dari sekali.",
      "Periksa apakah transaksi merupakan pesanan sah atau duplikasi.",
    ));
  }

  if (
    batchSize >= 5
    && context.medianAmount > 0
    && transaction.nominal >= OUTLIER_MINIMUM
    && transaction.nominal >= context.medianAmount * 3
  ) {
    signals.push(signal(
      "FG-R010",
      15,
      "sedang",
      "Nominal menyimpang dari batch",
      "Nilai transaksi sedikitnya tiga kali median nominal pada batch saat ini.",
      "Bandingkan pesanan dengan jenis produk dan pola penjualan toko.",
    ));
  }

  if (
    transaction.nominal >= HIGH_AMOUNT
    && hour !== null
    && (hour <= 5 || hour >= 22)
  ) {
    signals.push(signal(
      "FG-R011",
      18,
      "tinggi",
      "Kombinasi nominal dan waktu berisiko",
      "Nominal tinggi terjadi pada jam yang tidak umum sehingga risikonya meningkat.",
      "Tahan pemenuhan pesanan sampai pembayaran dan pelanggan terverifikasi.",
    ));
  }

  if (batchSize >= 3 && (context.amountCounts.get(transaction.nominal) ?? 0) >= 3) {
    signals.push(signal(
      "FG-R012",
      6,
      "rendah",
      "Nominal sama berulang dalam batch",
      "Nominal yang sama muncul sedikitnya tiga kali pada batch transaksi.",
      "Pastikan pola tersebut sesuai dengan harga produk atau paket yang memang dijual.",
    ));
  }

  return signals.toSorted((left, right) => right.weight - left.weight || left.code.localeCompare(right.code));
}

export function scoreTransactions<T extends RiskEngineTransaction>(
  transactions: T[],
): RiskEngineResult<T> {
  if (transactions.length === 0) {
    throw new Error("RISK_ENGINE_EMPTY_INPUT");
  }

  const context = createBatchContext(transactions);
  const results = transactions.map((transaction) => {
    const signals = evaluateTransaction(transaction, context, transactions.length);
    const riskScore = Math.min(
      100,
      BASE_RISK_SCORE + signals.reduce((total, item) => total + item.weight, 0),
    );
    return {
      transaction,
      riskScore,
      label: labelFromScore(riskScore),
      signals,
    };
  });

  const averageRisk = results.reduce((total, result) => total + result.riskScore, 0) / results.length;
  const maximumRisk = Math.max(...results.map((result) => result.riskScore));
  const overallRisk = Math.round((maximumRisk * 0.65) + (averageRisk * 0.35));

  return {
    engineVersion: RISK_ENGINE_VERSION,
    overallRisk,
    results,
  };
}

