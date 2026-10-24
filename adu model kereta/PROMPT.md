# Prompt asli tes kereta

Sumber: user, percakapan perencanaan 2026-10-22. Teks di bawah disalin dari prompt yang diberikan user. Kondisi pengiriman dan konfigurasi masing-masing model dicatat terpisah dalam rencana.

```text
Buat video animasi pixel art vertikal berdurasi 15 detik, sepenuhnya dari kode.

Tema: kereta malam yang melaju melewati pedesaan saat hujan, lalu tiba saat fajar.

Struktur 4 adegan:
1. (0-4 dtk) Kereta malam melaju dari kiri ke kanan di pedesaan saat hujan. Tampak dari samping. Lampu jendela kereta menyala hangat, asap tipis dari cerobong, hujan jatuh diagonal, dan ada kilat kecil sekali. Latar bergerak dengan parallax 3 lapis (bukit jauh, pepohonan, tiang listrik dekat).
2. (4-8 dtk) Kamera masuk ke satu jendela: seorang penumpang kecil dan seekor kucing duduk di kursi, melihat hujan di kaca. Tetes air meluncur di kaca, kucing berkedip dan ekornya bergoyang pelan, pemandangan di luar jendela bergeser. Tanpa teks.
3. (8-12 dtk) Hujan mereda dan awan terbuka. Langit berubah bertahap dari biru tua ke ungu, lalu oranye. Matahari terbit di antara bukit, kabut tipis di lembah, dan lampu jendela kereta meredup seiring langit terang.
4. (12-15 dtk) Kereta tiba di stasiun kecil saat pagi. Kereta melambat lalu berhenti dengan sedikit uap dari rem. Teks pixel "SAMPAI" muncul dengan efek ketik, diikuti ikon kecil (matahari) yang berkedip.

Ketentuan teknis:
- Murni HTML Canvas 2D, tanpa library, gambar, atau aset eksternal.
- Resolusi internal 270x480, ditampilkan 1080x1920 dengan nearest-neighbor (piksel tajam, tidak blur).
- 30 fps, 450 frame. Semua animasi digerakkan oleh waktu (fungsi drawFrame(t)) supaya hasil render konsisten setiap dijalankan. Hujan, kilat, dan partikel lain memakai acak berbasis seed, bukan Math.random.
- Render frame demi frame dengan Playwright headless Chromium, lalu gabungkan jadi MP4 dengan ffmpeg.
- Tidak ada batasan jumlah warna. Gunakan warna sebebas yang diperlukan, tetapi gaya pixel art harus konsisten: satu ukuran pixel yang sama di seluruh video, tanpa anti-aliasing, tanpa blur, dan tanpa gradien halus.
- Semua posisi dan ukuran digambar pada pixel bulat. Transisi antar adegan mulus, tanpa frame kosong atau kilatan yang tidak disengaja.
- Tambahkan musik latar sederhana dan efek suara (hujan, deru kereta, ketukan rel, rem dan uap) yang dibuat dari kode, lalu gabungkan ke video. Suasana musik berubah mengikuti adegan: tenang dan sendu di malam hari, lalu hangat dan lega di fajar.

Keluaran akhir:  source code siap render, dan petunjuk cara menjalankannya.
Jalankan sendiri, periksa hasilnya (ambil satu frame per adegan, pastikan tidak ada teks atau objek terpotong, durasi tepat 15 detik), dan perbaiki jika ada error sebelum menyerahkan.
```
