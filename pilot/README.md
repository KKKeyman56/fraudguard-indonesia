# Pilot Risk Engine

Pilot awal menjalankan `Hybrid Statistical V2` terhadap 360 transaksi sintetis berlabel yang labelnya ditetapkan sebelum proses scoring:

- 180 skenario aman;
- 180 skenario bermasalah;
- 120 kasus bermasalah dengan sinyal kuat;
- 60 kasus bermasalah yang sengaja dibuat lebih sulit;
- ambang `RISIKO TINGGI` adalah skor 70.

Jalankan ulang dengan:

```bash
npm run pilot:labeled
```

Hasil mesin tersimpan di `pilot/results/pilot-hybrid-v2.json`.

## Batas interpretasi

Dataset ini sintetis dan hanya layak untuk memverifikasi determinisme, wiring evaluasi, ambang, serta metrik. Dataset ini **bukan bukti akurasi pasar** dan tidak boleh dipakai untuk mengklaim FraudGuard mampu mendeteksi fraud dengan tingkat akurasi tertentu.

Paid beta harus mengumpulkan minimal ratusan transaksi nyata yang:

1. diizinkan untuk diproses;
2. dianonimkan atau diminimalkan;
3. dilabeli manusia sebagai `SAFE` atau `PROBLEM`;
4. mewakili lebih dari satu jenis UMKM dan metode pembayaran;
5. dipisahkan antara data kalibrasi dan data evaluasi.

Model supervised tetap terkunci sampai gerbang data dan kualitas pada halaman Review terpenuhi.
