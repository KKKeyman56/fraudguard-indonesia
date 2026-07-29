import Groq, { APIError } from "groq-sdk";
import { createFallbackExplanation } from "@/lib/fallback-explanation";
import {
  riskExplanationSchema,
  type RiskExplanationResponse,
} from "@/lib/schemas";
import type {
  RiskEngineResult,
  RiskEngineTransaction,
  RiskSignal,
  ScoredTransaction,
} from "@/lib/risk-engine";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_TRANSACTIONS_PER_BATCH = 10;
const MAX_COMPLETION_TOKENS = 1800;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ref: { type: "string" },
          reasoning: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["ref", "reasoning", "recommendation"],
      },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        insight: { type: "string" },
      },
      required: ["insight"],
    },
  },
  required: ["results", "summary"],
} as const;

export type ExplanationProvider = "groq" | "fallback";

export type RiskExplanation = {
  id: string;
  reasoning: string;
  recommendation: string;
};

export type RiskExplanationResult = {
  results: RiskExplanation[];
  insight: string;
  model: string;
  provider: ExplanationProvider;
};

type ReferencedTransaction<T extends RiskEngineTransaction = RiskEngineTransaction> = {
  ref: string;
  scored: ScoredTransaction<T>;
};

function referenceTransactions<T extends RiskEngineTransaction>(
  scored: ScoredTransaction<T>[],
): ReferencedTransaction<T>[] {
  return scored.map((item, index) => ({
    ref: `TX-${String(index + 1).padStart(3, "0")}`,
    scored: item,
  }));
}

function safeSignalPayload(signal: RiskSignal) {
  return {
    code: signal.code,
    weight: signal.weight,
    severity: signal.severity,
    title: signal.title,
    reason: signal.reason,
    recommendation: signal.recommendation,
  };
}

function buildPrompt<T extends RiskEngineTransaction>(items: ReferencedTransaction<T>[]) {
  const payload = items.map(({ ref, scored }) => ({
    ref,
    riskScore: scored.riskScore,
    label: scored.label,
    signals: scored.signals.map(safeSignalPayload),
  }));

  return `Jelaskan hasil Risk Engine FraudGuard berikut kepada pemilik UMKM Indonesia.

Skor, label, rule code, dan bobot sudah final dari deterministic risk engine. Jangan mengubah, menghitung ulang, atau mempertanyakan skor. Tugas Anda hanya:
1. merangkum alasan terpenting dengan Bahasa Indonesia sederhana;
2. memberikan satu rekomendasi verifikasi yang proporsional;
3. tidak menyatakan pelanggan pasti melakukan tindak kriminal.

Payload telah dipseudonimisasi dan tidak berisi nama, email, telepon, rekening, atau alamat mentah.

Risk signals:
${JSON.stringify(payload)}`;
}

async function explainBatch<T extends RiskEngineTransaction>(
  client: Groq,
  items: ReferencedTransaction<T>[],
): Promise<RiskExplanationResponse> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    ...(MODEL.startsWith("openai/gpt-oss-")
      ? { reasoning_effort: "low" as const, reasoning_format: "hidden" as const }
      : {}),
    messages: [
      {
        role: "system",
        content:
          "Anda adalah explanation layer FraudGuard. Anda tidak menghitung risiko. Gunakan hanya skor dan signals yang diberikan, lalu keluarkan JSON sesuai schema.",
      },
      { role: "user", content: buildPrompt(items) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fraudguard_explanation",
        strict: true,
        schema: responseSchema as unknown as Record<string, unknown>,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("GROQ_EMPTY_RESPONSE");

  const validated = riskExplanationSchema.parse(JSON.parse(content) as unknown);
  const expectedRefs = new Set(items.map((item) => item.ref));
  const resultRefs = new Set(validated.results.map((item) => item.ref));
  const exactMatch =
    resultRefs.size === validated.results.length
    && expectedRefs.size === resultRefs.size
    && [...expectedRefs].every((ref) => resultRefs.has(ref));

  if (!exactMatch) throw new Error("GROQ_RESULT_MISMATCH");
  return validated;
}

async function explainBatchAdaptive<T extends RiskEngineTransaction>(
  client: Groq,
  items: ReferencedTransaction<T>[],
): Promise<RiskExplanationResponse[]> {
  try {
    return [await explainBatch(client, items)];
  } catch (error) {
    if (!(error instanceof APIError) || error.status !== 413 || items.length === 1) {
      throw error;
    }

    const middle = Math.ceil(items.length / 2);
    console.warn(JSON.stringify({
      level: "warn",
      event: "groq_batch_split",
      originalSize: items.length,
      nextSizes: [middle, items.length - middle],
    }));
    const first = await explainBatchAdaptive(client, items.slice(0, middle));
    const second = await explainBatchAdaptive(client, items.slice(middle));
    return [...first, ...second];
  }
}

function safeGroqError(error: unknown) {
  if (error instanceof APIError) {
    return { name: error.name, status: error.status };
  }
  return { name: error instanceof Error ? error.name : "UnknownError" };
}

export async function explainRiskWithGroq<T extends RiskEngineTransaction>(
  risk: RiskEngineResult<T>,
): Promise<RiskExplanationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return createFallbackExplanation(risk);

  try {
    const client = new Groq({ apiKey, maxRetries: 2, timeout: 20_000 });
    const referenced = referenceTransactions(risk.results);
    const batches: ReferencedTransaction<T>[][] = [];
    for (let index = 0; index < referenced.length; index += MAX_TRANSACTIONS_PER_BATCH) {
      batches.push(referenced.slice(index, index + MAX_TRANSACTIONS_PER_BATCH));
    }

    const responses: RiskExplanationResponse[] = [];
    for (const [index, batch] of batches.entries()) {
      const startedAt = Date.now();
      const batchResponses = await explainBatchAdaptive(client, batch);
      responses.push(...batchResponses);
      console.info(JSON.stringify({
        level: "info",
        event: "groq_explanation_batch_completed",
        batch: index + 1,
        plannedBatches: batches.length,
        size: batch.length,
        requests: batchResponses.length,
        durationMs: Date.now() - startedAt,
      }));
    }

    const refToId = new Map(referenced.map((item) => [item.ref, item.scored.transaction.id]));
    const results = responses.flatMap((response) => response.results).map((item) => ({
      id: refToId.get(item.ref)!,
      reasoning: item.reasoning,
      recommendation: item.recommendation,
    }));
    if (results.some((item) => !item.id) || results.length !== risk.results.length) {
      throw new Error("GROQ_RESULT_MISMATCH");
    }

    const combinedInsight = responses.map((response) => response.summary.insight).join(" ");
    return {
      results,
      insight: combinedInsight.length <= 1200
        ? combinedInsight
        : `${combinedInsight.slice(0, 1197).trimEnd()}...`,
      model: MODEL,
      provider: "groq",
    };
  } catch (error) {
    console.warn(JSON.stringify({
      level: "warn",
      event: "groq_explanation_fallback",
      error: safeGroqError(error),
    }));
    return createFallbackExplanation(risk);
  }
}
