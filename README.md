# FraudGuard Indonesia

Aplikasi Next.js untuk membantu UMKM Indonesia menyaring risiko transaksi dengan AI Groq. AI memberikan skor, status **AMAN / WASPADA / TERDETEKSI**, alasan, rekomendasi, ringkasan batch, dan laporan PDF.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Jangan commit `.env.local`.
3. Jalankan:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel

1. Push folder ini ke repository GitHub.
2. Pastikan repository terhubung ke proyek Vercel FraudGuard.
3. Tambahkan Environment Variables untuk Production, Preview, dan Development:
   - `GROQ_API_KEY` — secret dari Groq Console.
   - `GROQ_MODEL` — `openai/gpt-oss-120b`.
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key Supabase, bukan secret/service-role key.
4. Deploy, lalu periksa `/api/health`. Nilai `aiConfigured` harus `true`.

Pada Supabase Auth URL Configuration, gunakan Site URL `https://fraudguard-indonesia.vercel.app` dan tambahkan `https://fraudguard-indonesia.vercel.app/auth/callback` ke Redirect URLs.

## Format file transaksi

Format yang didukung: CSV dan XLSX. Kolom wajib: `pelanggan`, `nominal`, `metode`, `waktu`. Kolom opsional: `kota`, `catatan`. Nama kolom umum seperti `nama`, `amount`, `payment method`, dan `tanggal` juga dikenali. Maksimal 50 transaksi per analisis. Contoh ada di `public/contoh-transaksi.csv`.

## Keamanan dan batas MVP

- `GROQ_API_KEY` hanya dibaca oleh Route Handler server, tidak pernah dikirim ke browser.
- Dashboard, analisis, laporan, dan endpoint AI memerlukan session Supabase yang diverifikasi di server.
- Cookie session diperbarui melalui Next.js Proxy, tetapi otorisasi tetap diperiksa ulang pada halaman dan Route Handler.
- Input divalidasi dan output AI diperiksa terhadap schema.
- Klasifikasi AI adalah alat bantu skrining, bukan bukti hukum atau keputusan otomatis.
- Rate limit bawaan bersifat best-effort per instance. Sebelum trafik besar, gunakan Redis/KV untuk rate limit global.
- Laporan terakhir masih disimpan di `localStorage` perangkat pengguna, bukan database cloud.
- Registrasi, konfirmasi email, login, dan logout sudah tersedia. Billing, histori lintas perangkat, dan dashboard admin pengguna merupakan fase berikutnya.
