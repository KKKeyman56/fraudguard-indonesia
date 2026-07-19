export type RiskLabel = "AMAN" | "WASPADA" | "TERDETEKSI";

export interface Transaction {
  id: string;
  pelanggan: string;
  nominal: number;
  metode: string;
  waktu: string;
  kota?: string;
  catatan?: string;
}

export interface AnalysisResult {
  transaction: Transaction;
  riskScore: number;
  label: RiskLabel;
  reasoning: string;
  recommendation: string;
}

export interface BatchAnalysis {
  results: AnalysisResult[];
  summary: {
    total: number;
    aman: number;
    waspada: number;
    terdeteksi: number;
    overallRisk: number;
    aiInsight: string;
  };
  meta?: {
    analysisId?: string;
    model: string;
    analyzedAt: string;
    persisted?: boolean;
    persistenceWarning?: string;
  };
}

export interface ApiErrorPayload {
  error: string;
  code?: string;
}
