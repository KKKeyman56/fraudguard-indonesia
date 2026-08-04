import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand footer-brand" href="/" aria-label="FraudGuard beranda">
          <BrandMark /> FraudGuard
        </Link>
        <span>Alat skrining risiko transaksi untuk UMKM Indonesia.</span>
      </div>
      <nav aria-label="Informasi hukum">
        <Link href="/privacy">Kebijakan Privasi</Link>
        <Link href="/terms">Ketentuan Layanan</Link>
        <Link href="/data-deletion">Penghapusan Data</Link>
        <Link href="/settings">Pengaturan Akun</Link>
      </nav>
      <small>FraudGuard memberikan rekomendasi risiko. Keputusan final tetap memerlukan verifikasi manusia.</small>
    </footer>
  );
}
