# FraudGuard Indonesia

Aplikasi Next.js untuk membantu UMKM Indonesia menyaring risiko transaksi. **Deterministic Risk Engine V1** menghitung skor dan status **AMAN / WASPADA / TERDETEKSI** secara konsisten, sedangkan Groq hanya menyusun penjelasan. Jika Groq tidak dikonfigurasi atau sedang gagal, aplikasi otomatis memakai penjelasan lokal tanpa menghentikan analisis.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `GROQ_API_KEY` bersifat opsional karena tersedia fallback lokal. Jangan commit `.env.local`.
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
   - `GROQ_API_KEY` — opsional; secret dari Groq Console untuk penjelasan AI.
   - `GROQ_MODEL` — `openai/gpt-oss-120b`.
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key Supabase, bukan secret/service-role key.
   - `SUPABASE_SERVICE_ROLE_KEY` — secret Supabase khusus server untuk webhook pembayaran.
   - `APP_URL` — URL publik aplikasi, misalnya `https://fraudguard-indonesia.vercel.app`.
   - `MIDTRANS_SERVER_KEY` — Server Key dari akun Midtrans Sandbox. Jangan gunakan Client Key.
   - `MIDTRANS_IS_PRODUCTION` — `false` selama pengujian Sandbox.
4. Deploy, lalu periksa `/api/health`. Nilai `engineReady` harus `true`. `explanationConfigured: false` tetap aman dan berarti aplikasi memakai fallback lokal.

## Risk Engine V1

- Skor dihitung server-side oleh rule engine deterministik versi `rules-v1.1.0`.
- Setiap transaksi menyimpan daftar sinyal terstruktur beserta kode rule, bobot, tingkat risiko, alasan, dan rekomendasi.
- Baseline setiap bisnis dihitung dari maksimal 500 transaksi historis milik akun tersebut: median dan persentil ke-90 nominal, jam normal, metode dominan, serta kota dominan. Transaksi berlabel masalah dikeluarkan dari baseline.
- Halaman `/review` menyediakan antrean review, tren risiko 30 hari, feedback **Aman / Bermasalah / Belum diketahui**, catatan, status review, dan audit log.
- Groq tidak dapat mengubah skor atau status. Data yang dikirim ke Groq dibatasi pada referensi transaksi, skor, status, dan sinyal terstruktur tanpa nama pelanggan, kota, catatan mentah, atau ID database.
- Jika Groq timeout, rate-limited, responsnya tidak valid, atau API key kosong, endpoint tetap sukses dengan `explanationProvider: "fallback"`.
- Jalankan `npm test`, `npm run typecheck`, `npm run lint`, dan `npm run build` sebelum deploy.

Pada Supabase Auth URL Configuration, gunakan Site URL `https://fraudguard-indonesia.vercel.app` dan tambahkan `https://fraudguard-indonesia.vercel.app/auth/callback` ke Redirect URLs.

## Pembayaran Midtrans Sandbox

1. Terapkan migration terbaru di folder `supabase/migrations`.
2. Tambahkan seluruh environment variable Midtrans/Supabase di Vercel, lalu redeploy.
3. Di Midtrans Sandbox Dashboard, buka **Settings → Configuration** dan isi **Payment Notification URL** dengan `https://fraudguard-indonesia.vercel.app/api/billing/webhook`.
4. Isi Finish Redirect URL dengan `https://fraudguard-indonesia.vercel.app/billing?payment=return`.
5. Uji dari halaman `/billing`. Paket hanya diaktifkan oleh webhook terverifikasi, bukan oleh redirect browser.

Server Key tidak pernah dikirim ke browser. Mode redirect menggunakan halaman pembayaran yang di-host Midtrans, sehingga aplikasi tidak memproses atau menyimpan data kartu.

## Format file transaksi

Format yang didukung: CSV dan XLSX. Kolom wajib: `pelanggan`, `nominal`, `metode`, `waktu`.

Kolom opsional dasar: `kota`, `catatan`. Kolom opsional P1: `order_id`, `customer_id`, `account_age_days`, `refund_count`, `failed_payment_count`, `voucher_code`, `item_count`, `channel`, dan `shipping_method`. Nama kolom umum seperti `nama`, `amount`, `payment method`, dan `tanggal` juga dikenali. Maksimal 50 transaksi per analisis. Contoh ada di `public/contoh-transaksi.csv`.

## Keamanan dan batas MVP

- `GROQ_API_KEY` hanya dibaca oleh Route Handler server, tidak pernah dikirim ke browser.
- Dashboard, analisis, laporan, dan endpoint AI memerlukan session Supabase yang diverifikasi di server.
- Cookie session diperbarui melalui Next.js Proxy, tetapi otorisasi tetap diperiksa ulang pada halaman dan Route Handler.
- Input divalidasi, output Groq diperiksa terhadap schema, dan skor tidak bergantung pada model generatif.
- Klasifikasi AI adalah alat bantu skrining, bukan bukti hukum atau keputusan otomatis.
- Rate limit bawaan bersifat best-effort per instance. Sebelum trafik besar, gunakan Redis/KV untuk rate limit global.
- Hasil analisis, transaksi, baseline, review, feedback, dan audit perubahan tersimpan di Supabase serta dilindungi RLS.
- Registrasi, konfirmasi email, login, logout, billing, histori lintas perangkat, dashboard admin, serta riwayat user untuk admin sudah tersedia.
