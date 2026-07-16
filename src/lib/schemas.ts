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

export const aiResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      riskScore: z.number().int().min(0).max(100),
      label: z.enum(["AMAN", "WASPADA", "TERDETEKSI"]),
      reasoning: z.string().min(1).max(800),
      recommendation: z.string().min(1).max(600),
    }),
  ),
  summary: z.object({
    overallRisk: z.number().int().min(0).max(100),
    aiInsight: z.string().min(1).max(1200),
  }),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;
