# Kereta Menuju Fajar

Film pixel art vertikal **15 detik · 450 frame · 30 fps · 1080 × 1920**, seluruh visual, musik, dan efek suara dibuat dari kode.

## Menjalankan

Prasyarat: **Node.js 20+**, **Python 3.10+**, **FFmpeg** dan **ffprobe** pada PATH. Python hanya memakai standard library. Playwright dipakai untuk merender, bukan untuk menggambar animasi.

Di direktori source:

```bash
npm install
npx playwright install chromium --only-shell
npm run render
```

Di Linux yang belum memiliki dependensi sistem Chromium, perintah instalasinya dapat diganti dengan `npx playwright install --with-deps chromium --only-shell`.

Hasil utama: `output/kereta-menuju-fajar.mp4`.

Jika Python di komputer Anda bernama `python`, atur variabel `PYTHON=python` sebelum merender. Contoh PowerShell:

```powershell
$env:PYTHON = "python"
npm run render
```

Untuk memakai Chromium yang sudah tersedia, atur `CHROMIUM_EXECUTABLE` ke path executable-nya. Renderer tetap memakai Playwright headless Chromium.

```bash
CHROMIUM_EXECUTABLE=/path/to/chromium npm run render
```

Jika unduhan browser Playwright gagal di Linux x64, ada fallback Chromium yang dibundel dalam paket npm:

```bash
npm install --no-save @sparticuz/chromium@138.0.2
node bootstrap-chromium.mjs
CHROMIUM_EXECUTABLE="$PWD/.chromium/chromium" npm run render
```

Fallback ini hanya menyiapkan program browser; tidak menambahkan aset visual atau audio. Render yang disertakan dibuat dengan Playwright 1.62.1 dan Chromium 138 melalui `CHROMIUM_EXECUTABLE`.

## Pratinjau dan frame pemeriksaan

Buka `animation.html` di browser untuk pratinjau Canvas beserta tombol putar ulang dan slider. Pratinjau HTML **tanpa audio**; musik dan efek suara ada di MP4 hasil render. Kontrol HTML berada di luar canvas dan tidak masuk video.

Untuk merender empat frame pemeriksaan saja:

```bash
npm run preview
```

Renderer menyimpan:

- `output/frames/0000.png` sampai `0449.png`: master frame 1080 × 1920.
- `output/qa/scene-1.png` sampai `scene-4.png`: sampel pada 2, 6, 10,8 dan 14,8 detik.
- `output/qa/four-scenes.png`: empat adegan berdampingan.
- `output/soundtrack.wav`: audio stereo PCM 48 kHz, tepat 720.000 sampel per kanal.
- `output/validation.json`: jumlah frame, dimensi, durasi, informasi audio, kesalahan browser, dan pengujian determinisme.

Frame bernomor `i` selalu diambil pada `t = i / 30`. Frame terakhir pada 14,966666… detik tampil sampai 15 detik; tidak ada duplikasi frame pada t=15.

## Isi source

| File | Fungsi |
|---|---|
| `animation.html` | Seluruh gambar dan animasi Canvas 2D; `window.drawFrame(t)` dan `window.exportFrame(t)`. |
| `audio.py` | Komposisi musik, ambience hujan, deru kereta, ketukan rel, rem, uap, dan denting penutup dari sintesis kode. |
| `render.mjs` | Playwright, render 450 PNG, sintesis audio, encoding FFmpeg, validasi ffprobe. |
| `bootstrap-chromium.mjs` | Fallback penyiapan Chromium Linux jika unduhan Playwright tidak tersedia. |
| `package.json` | Dependensi alat render dan perintah npm. |
| `verification/` | Bukti pemeriksaan render yang disertakan. |

## Adegan

| Waktu | Isi |
|---|---|
| 0–4 dtk | Kereta bergerak ke kanan; pedesaan malam, tiga lapis parallax, jendela hangat, asap, hujan diagonal dan satu kilat kecil. Kamera mendekati jendela menjelang akhir. |
| 4–8 dtk | Kabin kayu, penumpang dan kucing, tetes air di kaca, luar jendela bergeser, kucing berkedip dan menggerakkan ekor. Tanpa teks. |
| 8–12 dtk | Hujan mereda, awan bergerak membuka langit, palet biru–ungu–jingga, matahari naik, kabut lembah, cahaya jendela meredup. |
| 12–15 dtk | Stasiun kecil, perlambatan sampai berhenti pada 14 detik, uap rem, tulisan bitmap `SAMPAI` diketik dan ikon matahari berkedip. |

Transisi melewati batas adegan sekitar 0,3–0,6 detik menggunakan zoom yang diproyeksikan ke grid piksel dan dissolve Bayer. Tidak memakai crossfade blur, gambar eksternal atau frame hitam pemisah.

## Teknik visual

- Canvas internal tetap **270 × 480**. Canvas ekspor memperbesar tepat **4×** menjadi **1080 × 1920**, dengan `imageSmoothingEnabled = false`.
- Semua primitive digambar dengan `fillRect` pada koordinat integer. Garis memakai raster Bresenham, bentuk lengkung berupa baris piksel, dan poligon memakai scanline. Tidak memakai font browser untuk teks di video.
- Langit menggunakan bidang warna datar berjenjang dan dithering piksel; tidak ada gradient Canvas, blur, antialias, atau gambar/sprite yang diunduh.
- Seed visual `0x5a17c9`; seed noise audio `0x714bc23`. Tidak ada `Math.random`. Posisi partikel dihitung dari waktu dan hash, bukan mutasi state antarframe.
- Pemanggilan `drawFrame(t)` pada urutan waktu acak menghasilkan frame yang sama pada waktu yang sama. Jam browser hanya mengatur pratinjau; render tidak bergantung pada `requestAnimationFrame` atau kecepatan mesin.
- Rotasi roda saat berhenti memakai integral kecepatan supaya roda tidak berputar mundur ketika melambat.
- MP4 menggunakan H.264 / yuv420p / CRF 12 dan audio AAC 192 kbps untuk kompatibilitas pemutar. PNG master mempertahankan blok 4×4 yang identik; codec video lossy dapat memberi perubahan warna kecil. Tidak ada filter blur pada pipeline.

## Audio

Musik asli memakai harmonik sinus, pad lembut, melodi bernada minor pada malam hari, lalu harmoni mayor ketika fajar. Efek hujan, deru, ketukan rel, guruh kecil, rem dan uap dibentuk dari osilator serta noise seeded. Audio hujan lebih teredam selama kamera berada di kabin.

Envelope pembuka/penutup mencegah klik, level memiliki headroom, dan semua audio disintesis menjadi WAV sebelum digabungkan ke video. Tidak menggunakan sample audio, layanan generatif, atau lagu pihak lain.

## Pemeriksaan yang sudah dilakukan

Render akhir dijalankan dengan Playwright headless Chromium dan FFmpeg. Empat frame adegan diekstrak kembali dari MP4 lalu dilihat, serta frame di setiap transisi diperiksa. Teks dan subjek utama pada frame adegan berada di dalam bidang gambar; pemotongan saat zoom atau objek melintas merupakan gerak kamera yang disengaja.

`ffprobe` memverifikasi **450 frame, 30/1 fps, 1080 × 1920, durasi video/audio/container 15,000 detik**. Empat waktu sampel dirender ulang setelah waktu yang berbeda dan hasil PNG-nya identik. Pemindaian frame memeriksa frame kosong, dan sembilan sampel PNG memeriksa pembesaran nearest-neighbor 4×. Laporan lengkap ada di `verification/validation.json`.
