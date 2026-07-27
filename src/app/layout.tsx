import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { getVerifiedClaims } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin-repository";

export const metadata: Metadata = {
  metadataBase: new URL("https://fraudguard-indonesia.vercel.app"),
  title: {
    default: "FraudGuard — Deteksi Transaksi Mencurigakan untuk UMKM",
    template: "%s | FraudGuard",
  },
  description:
    "FraudGuard membantu UMKM Indonesia menganalisis pola transaksi mencurigakan, bukti transfer palsu, risiko chargeback, dan anomali transaksi dengan insight AI yang mudah dipahami.",
  applicationName: "FraudGuard",
  authors: [{ name: "FraudGuard Indonesia", url: "/" }],
  creator: "FraudGuard Indonesia",
  publisher: "FraudGuard Indonesia",
  category: "Teknologi finansial",
  keywords: [
    "deteksi fraud transaksi",
    "transaksi mencurigakan UMKM",
    "pencegahan fraud Indonesia",
    "bukti transfer palsu",
    "chargeback fraud",
    "anomali transaksi",
    "analisis risiko transaksi",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "FraudGuard — Deteksi Transaksi Mencurigakan untuk UMKM",
    description: "Analisis pola transaksi berisiko dengan insight AI yang jelas. Dibuat untuk pemilik UMKM Indonesia.",
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "FraudGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "FraudGuard — Deteksi Transaksi Mencurigakan untuk UMKM",
    description: "Insight AI untuk membantu UMKM memeriksa risiko transaksi lebih cepat.",
  },
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
