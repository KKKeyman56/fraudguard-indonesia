# FraudGuard Indonesia

FraudGuard adalah aplikasi paid beta untuk membantu UMKM Indonesia melakukan **skrining risiko transaksi**. Produk ini tidak menyatakan seseorang melakukan fraud dan tidak menggantikan verifikasi manusia.

Engine aktif `hybrid-v2.0.0` menghitung skor deterministik dari aturan, baseline bisnis, dan robust z-score. Status hasil adalah **AMAN / WASPADA / RISIKO TINGGI**. Groq hanya menyusun penjelasan; jika Groq tidak tersedia, analisis tetap selesai menggunakan fallback lokal.

## Fitur saat ini

- daftar, konfirmasi email, login, logout, dan proteksi halaman dengan Supabase Auth;
- upload CSV/XLSX atau input manual;
- analisis 50 transaksi per batch untuk Gratis dan hingga 500 untuk Pro/Max;
- skor, sinyal terstruktur, alasan, rekomendasi, laporan PDF, dan riwayat lintas perangkat;
- review manusia `SAFE / PROBLEM / UNKNOWN`, catatan internal, baseline bisnis, tren, dan audit log;
- dashboard admin, manajemen pengguna, histori pengguna, evaluasi model, registry engine, dan rollback;
- paket Gratis 50 transaksi/bulan, Pro 5.000, Max 10.000;
- checkout DOKU, webhook tervalidasi, aktivasi paket idempoten, dan audit event pembayaran;
- privacy policy, terms, penghapusan akun mandiri, consent saat daftar, dan consent setiap analisis;
- rate limit global di Postgres dan reservasi kuota transaksi atomik.

## Arsitektur

- Next.js 16 App Router + React 19 di Vercel;
- Supabase Postgres, Auth, RLS, dan service role khusus operasi server;
- DOKU Checkout untuk pembayaran utama, dengan Midtrans sebagai fallback operasional;
- Groq opsional dan tidak memengaruhi skor;
- engine deterministik server-side sebagai sumber skor.

`SUPABASE_SERVICE_ROLE_KEY`, `DOKU_SECRET_KEY`, `MIDTRANS_SERVER_KEY`, dan `GROQ_API_KEY` tidak boleh dikirim ke browser atau disimpan di repository.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Salin `.env.example` menjadi `.env.local`, lalu isi:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `PAYMENT_PROVIDER=doku`
- `DOKU_CLIENT_ID`
- `DOKU_SECRET_KEY`
- `DOKU_IS_PRODUCTION=false`
- `MIDTRANS_SERVER_KEY` dan `MIDTRANS_IS_PRODUCTION` hanya jika fallback Midtrans tetap dipakai
- `GROQ_API_KEY` dan `GROQ_MODEL` (opsional)

Buka `http://localhost:3000`.

## Database

Terapkan migration berurutan dari `supabase/migrations`. Migration terbaru:

- mengganti data historis `TERDETEKSI` menjadi `RISIKO TINGGI`;
- menyimpan versi consent setiap analisis;
- membuat audit persetujuan legal;
- memperbarui agregasi admin.

RLS membatasi data bisnis kepada pemilik akun. Dashboard admin melakukan pemeriksaan role server-side. Jangan memakai `user_metadata` sebagai dasar otorisasi.

## Risk Engine dan model

- Engine aktif: `hybrid-v2.0.0`.
- Rollback stabil: `rules-v1.1.0`.
- Skor 0–39: `AMAN`.
- Skor 40–69: `WASPADA`.
- Skor 70–100: `RISIKO TINGGI`.
- Groq hanya menerima referensi minimal, skor, status, dan sinyal terstruktur; bukan nama pelanggan atau catatan mentah.
- Supervised ML belum diaktifkan. Gerbang minimum adalah 200 label valid, termasuk sedikitnya 50 `PROBLEM` dan 50 `SAFE`, lalu evaluasi precision, recall, F1, PR-AUC, false-positive rate, Brier score, dan kalibrasi.

Pilot sintetis 360 transaksi dapat dijalankan dengan:

```bash
npm run pilot:labeled
```

Lihat `pilot/README.md`. Hasil sintetis hanya membuktikan jalur teknis dan tidak membuktikan akurasi di pasar.

## DOKU Sandbox dan Production

Konfigurasi Vercel:

- `PAYMENT_PROVIDER=doku`;
- `DOKU_CLIENT_ID`: Client ID merchant DOKU;
- `DOKU_SECRET_KEY`: Secret Key merchant DOKU, server-only;
- `DOKU_IS_PRODUCTION=false` untuk Sandbox atau `true` untuk transaksi uang sungguhan;
- `APP_URL=https://www.fraudguard.biz.id`.

Konfigurasi DOKU Back Office:

- Notification URL: `https://www.fraudguard.biz.id/api/billing/webhook/doku`;
- URL harus publik, HTTPS, dan tidak dilindungi login;
- gunakan simulator DOKU Sandbox untuk mengirim notifikasi `SUCCESS` sebelum production.

Paket hanya berubah setelah notifikasi dengan signature HMAC DOKU valid, invoice cocok, provider cocok, dan nominal cocok. Redirect browser tidak pernah mengaktifkan paket. Notifikasi duplikat aman karena event dan aktivasi paket bersifat idempoten. Status `FAILED` pada DOKU Checkout tidak mematikan sesi karena pelanggan masih dapat mencoba ulang atau mengganti channel.

Paket Pro Rp99.000 dan Max Rp198.000 berlaku 30 hari sebagai pembayaran satu kali, bukan langganan otomatis. Halaman setelah pembayaran hanya membaca status yang telah diverifikasi server.

Jangan mengubah `DOKU_IS_PRODUCTION=true` sebelum akun dan channel DOKU production aktif, kredensial production terpasang di Vercel, serta satu transaksi kecil berhasil direkonsiliasi dari DOKU Back Office sampai tabel `payments`.

Fallback lama dapat dipakai dengan `PAYMENT_PROVIDER=midtrans`, `MIDTRANS_SERVER_KEY`, dan `MIDTRANS_IS_PRODUCTION`. Endpoint webhook Midtrans tetap `https://www.fraudguard.biz.id/api/billing/webhook`.

## Verifikasi sebelum deploy

```bash
npm test
npm run pilot:labeled
npm run typecheck
npm run lint
npm run build
```

Uji funnel dengan akun uji terpisah:

1. daftar dan konfirmasi email;
2. setujui dokumen legal;
3. upload transaksi dengan consent;
4. periksa hasil dan unduh PDF;
5. simpan review manusia;
6. checkout DOKU Sandbox;
7. pastikan webhook tervalidasi dan paket berubah;
8. pastikan data akun lain tidak dapat dibaca;
9. uji penghapusan akun hanya pada akun khusus yang boleh dihancurkan.

## Batas paid beta

FraudGuard layak ditawarkan sebagai **alat skrining risiko dengan onboarding langsung**, bukan sebagai mesin pendeteksi fraud yang sudah terbukti akurat. Harga beta sebaiknya rendah untuk memperoleh data berizin, feedback, serta kasus nyata.

Klaim pemasaran tidak boleh menjanjikan pencegahan kerugian, akurasi tertentu, atau keputusan otomatis. Keputusan menahan, membatalkan, atau memblokir transaksi harus diverifikasi manusia. Kebijakan legal di aplikasi adalah baseline produk dan tetap perlu ditinjau profesional hukum Indonesia sebelum peluncuran skala besar.
