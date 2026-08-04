import { z } from "zod";

export const purchasablePlanSchema = z.enum(["pro", "enterprise"]);
export type PurchasablePlan = z.infer<typeof purchasablePlanSchema>;

export const PAYMENT_PLANS: Record<PurchasablePlan, {
  name: string;
  amount: number;
}> = {
  pro: { name: "FraudGuard Pro - 30 hari", amount: 99_000 },
  enterprise: { name: "FraudGuard Max - 30 hari", amount: 198_000 },
};
