import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().min(1).max(80),
  pelanggan: z.string().min(1).max(120),
  nominal: z.number().finite().nonnegative().max(100_000_000_000),
  metode: z.string().min(1).max(80),
  waktu: z.string().min(1).max(80),
  kota: z.string().max(100).optional(),
  catatan: z.string().max(500).optional(),
});

export const analyzeRequestSchema = z.object({
  transactions: z.array(transactionSchema).min(1).max(50),
});

export const riskSignalSchema = z.object({
  code: z.string().regex(/^FG-R\d{3}$/),
  weight: z.number().int().positive().max(100),
  severity: z.enum(["rendah", "sedang", "tinggi"]),
  title: z.string().min(1).max(160),
  reason: z.string().min(1).max(500),
  recommendation: z.string().min(1).max(500),
});

export const riskExplanationSchema = z.object({
  results: z.array(
    z.object({
      ref: z.string().regex(/^TX-\d{3}$/),
      reasoning: z.string().min(1).max(800),
      recommendation: z.string().min(1).max(600),
    }),
  ),
  summary: z.object({
    insight: z.string().min(1).max(1200),
  }),
});

export type RiskExplanationResponse = z.infer<typeof riskExplanationSchema>;
