import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Ketentuan Layanan",
  description: "Ketentuan penggunaan FraudGuard sebagai alat skrining risiko transaksi untuk UMKM.",
};

export default function TermsPage() {
  return <LegalDocument
    eyebrow="TERMS // PAID BETA"
    title="Ketentuan Layanan"
    intro="Dengan membuat akun atau memakai FraudGuard, Anda menyetujui ketentuan paid beta berikut."
    sections={[
      {
        title: "Sifat layanan",
        paragraphs: [
          "FraudGuard membantu memprioritaskan transaksi untuk diperiksa. Status risiko bukan tuduhan, vonis, jaminan pencegahan kerugian, atau bukti hukum.",
          "Layanan berada pada tahap paid beta. Fitur, batas penggunaan, harga, dan engine dapat berubah berdasarkan pengujian dan umpan balik.",
        ],
      },
      {
        title: "Kewajiban pengguna",
        items: [
          "Memberikan informasi akun yang benar dan menjaga kerahasiaan kredensial.",
          "Hanya mengunggah data yang berhak Anda proses.",
          "Melakukan verifikasi manusia sebelum menolak, menahan, membatalkan, atau menuduh pelanggan.",
          "Tidak memakai layanan untuk diskriminasi, pengawasan ilegal, penipuan, serangan sistem, atau keputusan otomatis yang merugikan.",
          "Tidak mengunggah data kartu lengkap, PIN, kata sandi, nomor identitas, atau data sensitif yang tidak diperlukan.",
        ],
      },
      {
        title: "Paket dan pembayaran",
        paragraphs: [
          "Harga, kuota, dan masa aktif tampil pada halaman Paket. Aktivasi paket dilakukan setelah webhook pembayaran terverifikasi.",
          "Paket berbayar merupakan pembayaran satu kali untuk masa aktif 30 hari dan tidak diperpanjang otomatis. Pengguna perlu melakukan pembayaran baru untuk memperpanjang paket.",
          "Pembayaran yang telah berhasil pada umumnya tidak dapat dibatalkan. Permintaan pengembalian dana dapat ditinjau untuk tagihan ganda, kegagalan aktivasi yang terbukti, atau keadaan lain yang diwajibkan hukum. Hasil peninjauan tidak mengurangi hak konsumen berdasarkan peraturan yang berlaku.",
          "Transaksi Sandbox hanya untuk pengujian dan tidak menagihkan uang sungguhan. Halaman Paket akan menampilkan mode pembayaran yang sedang aktif.",
        ],
      },
      {
        title: "Ketersediaan dan perubahan",
        paragraphs: [
          "Kami berusaha menjaga layanan tersedia, tetapi tidak menjamin layanan tanpa gangguan. Pemeliharaan, kegagalan penyedia, pembatasan kuota, atau insiden keamanan dapat memengaruhi akses.",
          "Versi engine dapat diaktifkan atau di-rollback dengan audit. Perubahan material pada fungsi skrining akan didokumentasikan.",
        ],
      },
      {
        title: "Batas tanggung jawab",
        paragraphs: [
          "Anda tetap bertanggung jawab atas keputusan operasional dan hubungan dengan pelanggan. Selama diizinkan hukum, FraudGuard tidak bertanggung jawab atas kerugian yang timbul karena keputusan yang hanya mengandalkan skor.",
        ],
      },
      {
        title: "Penghentian dan penghapusan",
        paragraphs: [
          "Anda dapat berhenti menggunakan layanan dan menghapus akun dari Pengaturan Akun. Kami dapat membatasi akun yang menyalahgunakan layanan atau membahayakan pengguna lain.",
        ],
      },
    ]}
  />;
}
