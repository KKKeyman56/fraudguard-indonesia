"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BatchAnalysis, Transaction } from "@/types/transaction";

type AnalysisState = {
  transactions: Transaction[];
  analysis: BatchAnalysis | null;
  setTransactions: (transactions: Transaction[]) => void;
  setAnalysis: (analysis: BatchAnalysis | null) => void;
  reset: () => void;
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      transactions: [],
      analysis: null,
      setTransactions: (transactions) => set({ transactions, analysis: null }),
      setAnalysis: (analysis) => set({ analysis }),
      reset: () => set({ transactions: [], analysis: null }),
    }),
    { name: "fraudguard-last-analysis" },
  ),
);
