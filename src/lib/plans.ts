export type SubscriptionPlan = "free" | "pro" | "enterprise";

export const PLAN_DETAILS: Record<SubscriptionPlan, {
  name: string;
  price: string;
  monthlyLimit: number | null;
  description: string;
}> = {
  free: { name: "Gratis", price: "Rp0", monthlyLimit: 50, description: "Untuk mencoba proteksi transaksi dasar." },
  pro: { name: "Pro", price: "Rp99rb/bulan", monthlyLimit: 5000, description: "Untuk UMKM yang aktif menerima pesanan setiap hari." },
  enterprise: { name: "Max", price: "Rp198rb/bulan", monthlyLimit: 10000, description: "Untuk volume tinggi dan integrasi khusus." },
};

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === "free" || value === "pro" || value === "enterprise";
}
