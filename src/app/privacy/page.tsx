import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Cara FraudGuard mengumpulkan, menggunakan, melindungi, dan menghapus data pengguna serta transaksi.",
};

export default function PrivacyPage() {
  return <LegalDocument
    eyebrow="PRIVACY // PAID BETA"
    title="Kebijakan Privasi"
    intro="Dokumen ini menjelaskan pemrosesan data saat Anda memakai FraudGuard dalam program paid beta."
    sections={[
      {
        title: "Data yang kami proses",
        items: [
          "Data akun: alamat email, ID pengguna, status, peran, paket, dan waktu pendaftaran.",
          "Data transaksi yang Anda unggah: nama atau referensi pelanggan, nominal, metode, waktu, kota, catatan, dan konteks opsional.",
          "Hasil skrining: skor, status AMAN/WASPADA/RISIKO TINGGI, sinyal, penjelasan, review manusia, dan audit perubahan.",
          "Data pembayaran: order ID, paket, nominal, status, dan referensi penyedia pembayaran. FraudGuard tidak menyimpan nomor kartu atau PIN.",
          "Data teknis minimum untuk keamanan dan diagnosis, seperti request ID, waktu permintaan, dan kejadian error.",
        ],
      },
      {
        title: "Tujuan dan dasar pemrosesan",
        paragraphs: [
          "Data diproses untuk menyediakan skrining risiko, menyimpan laporan, menjalankan review, mengelola kuota dan pembayaran, mencegah penyalahgunaan, serta meningkatkan kualitas layanan.",
          "Dengan mengunggah data, Anda menyatakan memiliki kewenangan yang sah untuk memprosesnya dan menyetujui pemrosesan tersebut untuk tujuan skrining risiko.",
        ],
      },
      {
        title: "Penyedia layanan",
        items: [
          "Supabase untuk autentikasi dan penyimpanan data.",
          "Vercel untuk hosting aplikasi dan fungsi server.",
          "DOKU sebagai penyedia utama halaman dan verifikasi pembayaran; Midtrans dapat digunakan sebagai jalur fallback operasional.",
          "Groq hanya untuk menyusun penjelasan jika aktif. Skor ditentukan Risk Engine FraudGuard; data sensitif dibatasi sebelum dikirim.",
        ],
      },
      {
        title: "Penyimpanan, keamanan, dan retensi",
        paragraphs: [
          "Akses data dibatasi dengan autentikasi, Row Level Security, pemisahan secret server, validasi input, rate limiting, dan audit perubahan.",
          "Data akun dan analisis disimpan selama akun aktif atau sampai Anda menghapus akun. Catatan yang wajib dipertahankan karena kewajiban hukum atau penyelesaian sengketa dapat disimpan secara terbatas.",
        ],
      },
      {
        title: "Hak Anda",
        items: [
          "Mengakses riwayat dan laporan milik akun Anda.",
          "Memperbaiki hasil melalui fitur review manusia.",
          "Mengunduh laporan PDF.",
          "Menarik diri dengan berhenti menggunakan layanan dan menghapus akun.",
          "Meminta penghapusan melalui halaman Pengaturan Akun.",
        ],
      },
      {
        title: "Data pelanggan milik UMKM",
        paragraphs: [
          "Pemilik akun bertanggung jawab memastikan data pelanggan yang diunggah diperoleh dan digunakan secara sah, relevan, dan seminimal mungkin. Hindari mengunggah nomor identitas, kredensial, PIN, data kartu lengkap, atau data sensitif yang tidak diperlukan.",
        ],
      },
      {
        title: "Perubahan kebijakan",
        paragraphs: [
          "Perubahan material akan diterbitkan dengan versi dan tanggal baru. Persetujuan ulang dapat diminta sebelum layanan digunakan kembali.",
        ],
      },
    ]}
  />;
}
