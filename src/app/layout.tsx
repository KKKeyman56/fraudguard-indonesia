import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { getVerifiedClaims } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin-repository";

export const metadata: Metadata = {
  title: { default: "FraudGuard — AI Deteksi Risiko Transaksi", template: "%s | FraudGuard" },
  description: "Analisis risiko transaksi berbasis AI untuk membantu UMKM Indonesia mengenali transaksi mencurigakan lebih cepat.",
  metadataBase: new URL("https://fraudguard-indonesia.vercel.app"),
  openGraph: { title: "FraudGuard", description: "AI penjaga transaksi UMKM Indonesia", type: "website", locale: "id_ID" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let userEmail: string | null = null;
  let isAdmin = false;
  try {
    const claims = await getVerifiedClaims();
    userEmail = typeof claims?.email === "string" ? claims.email : null;
    if (claims?.sub) {
      try {
        isAdmin = await isUserAdmin(String(claims.sub));
      } catch (error) {
        console.error("FraudGuard admin navigation check failed", error);
      }
    }
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "SUPABASE_CONFIG_MISSING") throw error;
  }
  return (
    <html lang="id">
      <body>
        <div className="scanlines" aria-hidden="true" />
        <AppHeader userEmail={userEmail} isAdmin={isAdmin} />
        {children}
      </body>
    </html>
  );
}
