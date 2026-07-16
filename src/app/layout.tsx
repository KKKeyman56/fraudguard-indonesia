import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: { default: "FraudGuard — AI Deteksi Risiko Transaksi", template: "%s | FraudGuard" },
  description: "Analisis risiko transaksi berbasis AI untuk membantu UMKM Indonesia mengenali transaksi mencurigakan lebih cepat.",
  metadataBase: new URL("https://fraudguard-indonesia.vercel.app"),
  openGraph: { title: "FraudGuard", description: "AI penjaga transaksi UMKM Indonesia", type: "website", locale: "id_ID" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <div className="scanlines" aria-hidden="true" />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
