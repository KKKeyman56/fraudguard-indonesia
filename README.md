# FraudGuard Indonesia

Aplikasi Next.js production-ready untuk membantu UMKM Indonesia menyaring risiko transaksi dengan AI Groq. AI memberikan skor, status **AMAN / WASPADA / TERDETEKSI**, alasan, rekomendasi, ringkasan batch, dan laporan PDF.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `GROQ_API_KEY` dengan key dari Groq Console. Jangan commit file ini.
3. Jalankan:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel

1. Push folder ini ke repository GitHub.
2. Import repository ke Vercel sebagai proyek Next.js.
3. Tambahkan Environment Variables:
   - `GROQ_API_KEY` — secret dari Groq Console.
   - `GROQ_MODEL` — `openai/gpt-oss-120b`.
4. Deploy, lalu periksa `/api/health`. Nilai `aiConfigured` harus `true`.

## Format file transaksi

Format yang didukung: CSV dan XLSX. Kolom wajib: `pelanggan`, `nominal`, `metode`, `waktu`. Kolom opsional: `kota`, `catatan`. Nama kolom umum seperti `nama`, `amount`, `payment method`, dan `tanggal` juga dikenali. Maksimal 50 transaksi per analisis. Contoh ada di `public/contoh-transaksi.csv`.

## Keamanan dan batas MVP

- `GROQ_API_KEY` hanya dibaca oleh Route Handler server, tidak pernah dikirim ke browser.
- Input divalidasi dan output AI diperiksa terhadap schema.
- Klasifikasi AI adalah alat bantu skrining, bukan bukti hukum atau keputusan otomatis.
- Rate limit bawaan bersifat best-effort per instance. Sebelum trafik besar, gunakan Upstash Redis/KV untuk rate limit global.
- Laporan terakhir disimpan di `localStorage` perangkat pengguna, bukan database cloud.
- Aplikasi belum memiliki login, billing, histori lintas perangkat, atau dashboard admin pengguna. Itu merupakan fase berikutnya setelah MVP tervalidasi.
