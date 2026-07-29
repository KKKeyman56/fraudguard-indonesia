type ExplainableSignal = {
  reason: string;
  recommendation: string;
};

type ExplainableTransaction = {
  transaction: { id: string };
  label: "AMAN" | "WASPADA" | "TERDETEKSI";
  signals: ExplainableSignal[];
};

type ExplainableRisk = {
  results: ExplainableTransaction[];
};

function fallbackForTransaction(transaction: ExplainableTransaction) {
  if (transaction.signals.length === 0) {
    return {
      reasoning: "Risk Engine tidak menemukan pola risiko utama pada data transaksi yang tersedia.",
      recommendation: "Tetap cocokkan pembayaran dan detail pesanan sebelum diproses.",
    };
  }

  const mainSignals = transaction.signals.slice(0, 3);
  return {
    reasoning: mainSignals.map((item) => item.reason).join(" "),
    recommendation: mainSignals[0].recommendation,
  };
}

export function createFallbackExplanation(risk: ExplainableRisk) {
  const high = risk.results.filter((item) => item.label === "TERDETEKSI").length;
  const review = risk.results.filter((item) => item.label === "WASPADA").length;
  const low = risk.results.length - high - review;
  const insight = high > 0
    ? `${high} transaksi memiliki risiko tinggi dan perlu diverifikasi sebelum diproses. ${review} transaksi perlu ditinjau, sementara ${low} transaksi berada pada risiko rendah.`
    : review > 0
      ? `${review} transaksi perlu ditinjau lebih lanjut. ${low} transaksi lainnya berada pada risiko rendah berdasarkan rule engine.`
      : `Seluruh ${low} transaksi berada pada risiko rendah berdasarkan rule engine. Verifikasi pembayaran normal tetap disarankan.`;

  return {
    results: risk.results.map((item) => ({
      id: item.transaction.id,
      ...fallbackForTransaction(item),
    })),
    insight,
    model: "fraudguard-template-v1",
    provider: "fallback" as const,
  };
}

