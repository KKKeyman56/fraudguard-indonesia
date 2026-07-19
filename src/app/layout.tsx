import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { getVerifiedClaims } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "FraudGuard — AI Deteksi Risiko Transaksi", template: "%s | FraudGuard" },
  description: "Analisis risiko transaksi berbasis AI untuk membantu UMKM Indonesia mengenali transaksi mencurigakan lebih cepat.",
  metadataBase: new URL("https://fraudguard-indonesia.vercel.app"),
  openGraph: { title: "FraudGuard", description: "AI penjaga transaksi UMKM Indonesia", type: "website", locale: "id_ID" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let userEmail: string | null = null;
  try {
    const claims = await getVerifiedClaims();
    userEmail = typeof claims?.email === "string" ? claims.email : null;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "SUPABASE_CONFIG_MISSING") throw error;
  }
  return (
    <html lang="id">
      <body>
        <div className="scanlines" aria-hidden="true" />
        <AppHeader userEmail={userEmail} />
        {children}
      </body>
    </html>
  );
}
