import { ImageResponse } from "next/og";

export const alt = "FraudGuard — Deteksi transaksi mencurigakan untuk UMKM Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        color: "#f3f7f5",
        backgroundColor: "#0a0a0f",
        backgroundImage:
          "linear-gradient(rgba(0,255,136,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,.08) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(191,0,255,.25), transparent 32%)",
        backgroundSize: "44px 44px, 44px 44px, 100% 100%",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#00ff88", fontSize: "34px", fontWeight: 800 }}>
        <span style={{ display: "flex", width: "52px", height: "42px", border: "4px solid #00ff88", borderRadius: "14px", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>FG</span>
        FraudGuard
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "55px", maxWidth: "980px" }}>
        <span style={{ color: "#00d4ff", fontSize: "22px", letterSpacing: "5px", fontWeight: 700 }}>AI RISK MONITOR UNTUK UMKM</span>
        <div style={{ fontSize: "72px", lineHeight: 1.05, letterSpacing: "-3px", fontWeight: 800, marginTop: "22px" }}>
          Deteksi transaksi mencurigakan lebih cepat.
        </div>
        <div style={{ color: "#b8c3c9", fontSize: "27px", marginTop: "28px" }}>
          Skor risiko, alasan, dan langkah verifikasi dalam Bahasa Indonesia.
        </div>
      </div>
    </div>,
    size,
  );
}
