import type { ExplanationProvider } from "@/lib/groq";
import type { BusinessBaseline } from "@/lib/baseline";
import type { RiskSignal } from "@/lib/risk-engine";

export type RiskLabel = "AMAN" | "WASPADA" | "TERDETEKSI";
export type TransactionFeedback = "UNKNOWN" | "SAFE" | "PROBLEM";
export type ReviewStatus = "PENDING" | "REVIEWED";

export interface Transaction {
  id: string;
  pelanggan: string;
  nominal: number;
  metode: string;
  waktu: string;
  kota?: string;
  catatan?: string;
  orderId?: string;
  customerId?: string;
  accountAgeDays?: number;
  refundCount?: number;
  failedPaymentCount?: number;
  voucherCode?: string;
  itemCount?: number;
  channel?: string;
  shippingMethod?: string;
}

export interface AnalysisResult {
  recordId?: string;
  transaction: Transaction;
  riskScore: number;
  label: RiskLabel;
  reasoning: string;
  recommendation: string;
  signals: RiskSignal[];
  review?: {
    feedback: TransactionFeedback;
    status: ReviewStatus;
    note?: string;
    reviewedAt?: string;
  };
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
    engineVersion: string;
    explanationProvider: ExplanationProvider | "legacy";
    baseline?: BusinessBaseline;
    persisted?: boolean;
    persistenceWarning?: string;
  };
}

export interface ApiErrorPayload {
  error: string;
  code?: string;
  requestId?: string;
}
