export type EducationSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type EducationArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  sections: EducationSection[];
};

export const educationArticles: EducationArticle[] = [
  {
    slug: "cara-mendeteksi-transaksi-mencurigakan-umkm",
    title: "Cara Mendeteksi Transaksi Mencurigakan untuk UMKM",
    description: "Panduan praktis mengenali kombinasi nominal, waktu, metode pembayaran, lokasi, dan perilaku pelanggan yang perlu diverifikasi.",
    category: "Dasar Fraud",
    readingTime: "7 menit",
    publishedAt: "2026-07-27",
    updatedAt: "2026-07-27",
    sections: [
      {
        heading: "Transaksi mencurigakan bukan selalu transaksi fraud",
        paragraphs: [
          "Transaksi mencurigakan adalah transaksi yang berbeda dari kebiasaan normal bisnis Anda dan perlu diperiksa lebih lanjut. Perbedaan itu dapat muncul dari nominal, waktu, metode pembayaran, kota tujuan, pola pesanan, atau gabungan beberapa sinyal.",
          "Satu sinyal tidak cukup untuk menyimpulkan penipuan. Pesanan bernilai besar dari pelanggan baru, misalnya, bisa saja sah. Risiko menjadi lebih kuat ketika pesanan besar terjadi dini hari, alamat berubah, dan pembeli mendesak barang dikirim sebelum pembayaran terverifikasi.",
        ],
      },
      {
        heading: "Lima sinyal yang layak diperiksa",
        paragraphs: ["Gunakan sinyal berikut sebagai daftar pemeriksaan awal, bukan sebagai alasan otomatis untuk menolak pelanggan."],
        bullets: [
          "Nominal jauh lebih tinggi daripada rata-rata pesanan produk Anda.",
          "Beberapa transaksi berulang dalam waktu singkat dengan pola yang serupa.",
          "Metode pembayaran, nama pembayar, dan identitas penerima tidak konsisten.",
          "Transaksi terjadi pada jam yang tidak biasa untuk pola operasional toko.",
          "Pelanggan baru mendesak pengiriman sebelum dana benar-benar masuk.",
        ],
      },
      {
        heading: "Bangun baseline bisnis Anda",
        paragraphs: [
          "Baseline adalah gambaran transaksi normal bisnis. Catat rentang nominal, jam tersibuk, kota tujuan umum, metode pembayaran dominan, dan frekuensi pesanan pelanggan. Baseline membuat anomali lebih mudah terlihat karena setiap jenis UMKM memiliki pola berbeda.",
          "Evaluasi baseline secara berkala. Promo, musim hari raya, atau pembukaan cabang dapat mengubah perilaku transaksi sehingga aturan lama tidak selalu relevan.",
        ],
      },
      {
        heading: "Langkah verifikasi sebelum mengambil keputusan",
        paragraphs: ["Saat sebuah transaksi terlihat berisiko, tahan proses sebentar dan lakukan pemeriksaan yang proporsional."],
        bullets: [
          "Periksa mutasi atau dashboard resmi penyedia pembayaran, bukan hanya screenshot.",
          "Cocokkan nama, nominal, waktu, dan referensi pembayaran dengan pesanan.",
          "Konfirmasi perubahan alamat atau identitas melalui kanal komunikasi yang tercatat.",
          "Simpan bukti percakapan, invoice, resi, dan hasil pemeriksaan.",
          "Eskalasi ke pemilik atau supervisor untuk transaksi bernilai tinggi.",
        ],
      },
      {
        heading: "Peran FraudGuard",
        paragraphs: [
          "FraudGuard membantu menyaring data transaksi dan merangkum alasan risiko dalam bahasa yang mudah dipahami. Sistem memberi status AMAN, WASPADA, atau TERDETEKSI agar tim dapat memprioritaskan pemeriksaan.",
          "Hasil AI bukan vonis dan tidak menyatakan seseorang sebagai penipu. Keputusan final tetap membutuhkan verifikasi manusia serta bukti dari sistem pembayaran dan operasional bisnis Anda.",
        ],
      },
    ],
  },
  {
    slug: "mengenali-bukti-transfer-palsu",
    title: "Mengenali Bukti Transfer Palsu Tanpa Merugikan Pelanggan",
    description: "Cara aman memeriksa pembayaran tanpa hanya mengandalkan screenshot, sambil menjaga pengalaman pelanggan yang sah.",
    category: "Pembayaran",
    readingTime: "6 menit",
    publishedAt: "2026-07-27",
    updatedAt: "2026-07-27",
    sections: [
      {
        heading: "Screenshot bukan konfirmasi pembayaran",
        paragraphs: [
          "Bukti transfer berupa gambar dapat membantu komunikasi, tetapi bukan sumber verifikasi utama. Gambar dapat salah, tertunda, berasal dari transaksi lain, atau dimodifikasi. Sumber kebenaran tetap mutasi rekening, dashboard payment gateway, atau notifikasi resmi yang dapat dicocokkan dengan pesanan.",
          "Buat aturan operasional yang konsisten: barang diproses setelah dana terkonfirmasi, bukan setelah pelanggan mengirim screenshot. Aturan yang sama untuk semua pelanggan mengurangi konflik dan keputusan emosional.",
        ],
      },
      {
        heading: "Ciri yang perlu diperiksa lebih lanjut",
        paragraphs: ["Tampilan aplikasi bank dapat berubah, jadi jangan menilai keaslian hanya dari warna, font, atau logo. Fokus pada konsistensi data dan konfirmasi resmi."],
        bullets: [
          "Nominal pada bukti berbeda dengan invoice atau mutasi.",
          "Waktu transfer tidak sesuai dengan percakapan dan urutan pesanan.",
          "Nama penerima, nomor referensi, atau bank tujuan tidak cocok.",
          "Pelanggan terus mendesak pengiriman walau dana belum terlihat.",
          "Satu bukti digunakan untuk beberapa pesanan berbeda.",
        ],
      },
      {
        heading: "Prosedur verifikasi yang ramah pelanggan",
        paragraphs: [
          "Sampaikan bahwa pembayaran sedang diverifikasi dan berikan estimasi waktu yang wajar. Hindari langsung menuduh pelanggan. Keterlambatan antarbank atau gangguan sistem memang dapat terjadi.",
          "Jika dana belum masuk, minta pelanggan memeriksa status transaksi pada aplikasi bank mereka. Untuk pembayaran yang gagal atau tertunda, arahkan pelanggan menghubungi bank atau penyedia pembayaran terkait.",
        ],
      },
      {
        heading: "Simpan jejak audit",
        paragraphs: [
          "Simpan invoice, nomor pesanan, waktu konfirmasi, bukti percakapan, status mutasi, dan identitas petugas yang melakukan pengecekan. Jejak ini membantu ketika terjadi komplain atau dispute.",
          "FraudGuard dapat membantu menandai kombinasi data yang tidak wajar, tetapi verifikasi dana tetap harus dilakukan melalui kanal pembayaran resmi.",
        ],
      },
    ],
  },
  {
    slug: "chargeback-fraud-untuk-umkm",
    title: "Chargeback Fraud: Risiko dan Pencegahan untuk UMKM",
    description: "Pahami bagaimana dispute pembayaran dapat terjadi dan bukti apa yang sebaiknya disimpan sejak pesanan diterima.",
    category: "Chargeback",
    readingTime: "7 menit",
    publishedAt: "2026-07-27",
    updatedAt: "2026-07-27",
    sections: [
      {
        heading: "Apa itu chargeback?",
        paragraphs: [
          "Chargeback adalah proses pengembalian dana melalui penerbit kartu atau penyedia pembayaran setelah transaksi dipermasalahkan. Tidak semua chargeback merupakan fraud; penyebabnya dapat berupa transaksi tidak dikenali, layanan tidak diterima, duplikasi, atau perbedaan antara produk dan deskripsi.",
          "Chargeback fraud terjadi ketika pembeli menerima manfaat dari transaksi tetapi kemudian mengajukan klaim yang tidak sesuai fakta. Bagi UMKM, dampaknya dapat mencakup kehilangan barang, dana, waktu operasional, dan biaya penanganan dispute.",
        ],
      },
      {
        heading: "Kurangi risiko sejak sebelum pengiriman",
        paragraphs: ["Proses yang rapi lebih kuat daripada mengandalkan ingatan ketika dispute sudah terjadi."],
        bullets: [
          "Gunakan deskripsi produk, harga, ketentuan pengembalian, dan estimasi pengiriman yang jelas.",
          "Pastikan detail penerima dan alamat dikonfirmasi sebelum pesanan diproses.",
          "Gunakan resi atau bukti serah terima yang dapat dilacak.",
          "Catat persetujuan pelanggan untuk perubahan produk, alamat, atau jadwal.",
          "Terapkan verifikasi tambahan untuk pesanan bernilai tinggi atau berpola tidak biasa.",
        ],
      },
      {
        heading: "Bukti yang sebaiknya disimpan",
        paragraphs: [
          "Arsipkan invoice, deskripsi produk saat dibeli, percakapan pelanggan, bukti pembayaran, resi, bukti serah terima, dan kebijakan toko yang disetujui. Susun bukti berdasarkan nomor pesanan agar mudah ditemukan.",
          "Jangan mengubah bukti asli. Simpan tanggal, waktu, dan sumber data sehingga kronologi dapat dijelaskan secara konsisten kepada penyedia pembayaran.",
        ],
      },
      {
        heading: "Gunakan skor risiko secara proporsional",
        paragraphs: [
          "Skor risiko dapat membantu menentukan pesanan mana yang membutuhkan pemeriksaan tambahan. Namun, skor tinggi tidak otomatis berarti pembeli berniat melakukan chargeback.",
          "FraudGuard membantu merangkum pola transaksi dan menyimpan riwayat analisis. Keputusan menahan, menghubungi, atau membatalkan pesanan tetap harus mengikuti kebijakan bisnis dan verifikasi manusia.",
        ],
      },
    ],
  },
  {
    slug: "pola-anomali-transaksi",
    title: "Pola Anomali Transaksi yang Sering Terlewat",
    description: "Pelajari pola berulang, nominal ekstrem, jam tidak biasa, dan ketidakkonsistenan lokasi yang perlu mendapat perhatian.",
    category: "Anomali",
    readingTime: "6 menit",
    publishedAt: "2026-07-27",
    updatedAt: "2026-07-27",
    sections: [
      {
        heading: "Anomali bergantung pada konteks bisnis",
        paragraphs: [
          "Anomali adalah kejadian yang menyimpang dari pola normal. Transaksi pukul dua pagi mungkin wajar bagi toko digital 24 jam, tetapi tidak biasa bagi usaha yang selalu tutup pukul sembilan malam. Karena itu, aturan risiko harus membaca konteks bisnis, bukan hanya satu angka.",
          "Bandingkan transaksi dengan riwayat pelanggan dan baseline toko. Perubahan kecil yang terjadi bersamaan sering lebih bermakna daripada satu perubahan besar yang berdiri sendiri.",
        ],
      },
      {
        heading: "Pola yang perlu masuk antrean verifikasi",
        paragraphs: ["Beberapa contoh berikut dapat menjadi pemicu pemeriksaan, bukan penolakan otomatis."],
        bullets: [
          "Banyak transaksi bernilai serupa dalam jeda yang sangat singkat.",
          "Nominal dipecah menjadi beberapa pembayaran kecil tanpa alasan operasional.",
          "Pelanggan baru langsung memesan jauh di atas nilai rata-rata.",
          "Kota, alamat, identitas pembayar, dan penerima sering berubah.",
          "Metode pembayaran berganti berulang setelah beberapa percobaan gagal.",
        ],
      },
      {
        heading: "Hindari terlalu banyak false positive",
        paragraphs: [
          "Aturan yang terlalu ketat dapat mengganggu pelanggan sah. Tinjau hasil secara berkala dan catat alasan ketika sinyal ternyata normal, misalnya promo besar, pesanan perusahaan, atau perubahan musim.",
          "Pisahkan tindakan berdasarkan tingkat risiko: transaksi rendah dapat diproses normal, transaksi menengah memerlukan satu verifikasi tambahan, dan transaksi tinggi memerlukan persetujuan supervisor.",
        ],
      },
      {
        heading: "Gabungkan teknologi dan prosedur manusia",
        paragraphs: [
          "Teknologi membantu melihat pola pada banyak baris transaksi, sedangkan tim memahami konteks pelanggan dan kondisi bisnis. Keduanya harus bekerja bersama.",
          "FraudGuard memberi rekomendasi berdasarkan data yang tersedia. Kualitas hasil bergantung pada kelengkapan input, dan keputusan final tetap berada di tangan pemilik atau petugas usaha.",
        ],
      },
    ],
  },
];

export function getEducationArticle(slug: string) {
  return educationArticles.find((article) => article.slug === slug);
}
