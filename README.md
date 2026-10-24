# Pixel Animation Comparison — GPT vs Claude vs Gemini

> **Benchmark & Eksperimen Animasi Motion Graphics Pixel Art Vertikal (9:16) Murni Berbasis Kode**  
> Head-to-head comparison model AI frontier (**GPT 6 Astra / Codex**, **Claude Opus 5.5 / Claude Code**, **Gemini 4 Argon / Antigravity**, dan **Gemini 3.8 Flash**) dalam membuat video animasi pixel art deterministik $f(t)$ menggunakan HTML5 Canvas 2D murni + sintesis audio prosedural (PCM / Web Audio API) tanpa aset gambar, video, font browser, maupun pustaka grafis eksternal (0 external assets / zero dependencies).

---

## 📑 Daftar Eksperimen / Rounds

1. [🚂 Ronde 2: Kereta Malam Menuju Fajar (15 Detik · 450 Frame)](#-ronde-2-kereta-malam-menuju-fajar)
   - **Peserta:** GPT 6 Astra (Codex) vs Claude Opus 5.5 (Claude Code) vs Gemini 4 Argon (Antigravity)
   - **Tantangan:** 4 adegan (malam hujan → masuk jendela penumpang & kucing → fajar terbit → tiba di stasiun "SAMPAI")
2. [🚀 Ronde 1: Peluncuran Roket ke Orbit (12 Detik · 360 Frame)](#-ronde-1-peluncuran-roket-ke-orbit)
   - **Peserta:** Claude Opus 5.5 vs Gemini 3.8 Flash
   - **Tantangan:** 3 adegan (countdown di pad → liftoff menembus atmosfer → orbit bumi & "MISSION START")

---

## 🚂 Ronde 2: Kereta Malam Menuju Fajar

Eksperimen kedua menguji kemampuan model frontier dalam menangani adegan yang lebih kompleks: transisi interior/eksterior kabin kereta, karakter organik (penumpang & kucing berkedip/ekor bergoyang), perubahan tata cahaya dinamis (malam hujan ke fajar), sinkronisasi pengereman fisik roda, dan efek teks mesin tik.

Semua model dijalankan dengan mode **Reasoning High**, satu kali tembak (*one-shot*) tanpa iterasi manual.

### 🎯 Prompt Eksperimen / Experiment Prompt

Prompt yang sama persis dikirimkan ke **GPT 6 Astra**, **Claude Opus 5.5**, dan **Gemini 4 Argon**:

#### 🇮🇩 Versi Bahasa Indonesia (Asli)
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

Keluaran akhir: source code siap render, dan petunjuk cara menjalankannya.
Jalankan sendiri, periksa hasilnya (ambil satu frame per adegan, pastikan tidak ada teks atau objek terpotong, durasi tepat 15 detik), dan perbaiki jika ada error sebelum menyerahkan.
```

#### 🇬🇧 English Translation
```text
Create a 15-second vertical pixel art animation video, generated entirely from code.

Theme: night train speeding through the countryside in the rain, arriving at dawn.

4-scene structure:
1. (0-4s) Night train moving from left to right across countryside in the rain. Side-view profile. Train window lights glow warmly, light smoke from the chimney, rain falls diagonally, and a tiny lightning flash appears once. Background moves with 3-layer parallax (distant hills, trees, near utility poles).
2. (4-8s) Camera enters one window: a small passenger and a cat sit on a seat, watching the rain on the glass. Water droplets slide down the glass, the cat blinks and its tail sways gently, the landscape outside the window shifts by. No text.
3. (8-12s) Rain clears and clouds part. The sky transitions gradually from dark blue to purple, then orange. The sun rises between hills, light valley mist, and train window lights dim as the sky brightens.
4. (12-15s) Train arrives at a small rural station in the morning. Train decelerates then stops with a puff of steam from the brakes. Pixel text "SAMPAI" appears with a typewriter effect, followed by a small blinking icon (sun).

Technical requirements:
- Pure HTML Canvas 2D, no external libraries, images, or assets.
- Internal resolution 270x480, rendered/displayed at 1080x1920 using nearest-neighbor (crisp pixels, no blur).
- 30 fps, 450 frames. All animations driven by time (drawFrame(t) function) so render output is deterministic and consistent on every run. Rain, lightning, and particles use seed-based PRNG, not Math.random.
- Render frame-by-frame with Playwright headless Chromium, then multiplex into MP4 with ffmpeg.
- No color palette limit. Use colors as needed, but maintain a consistent pixel art style: uniform pixel grid size throughout the entire video, no anti-aliasing, no blur, and no smooth gradients.
- All positions and sizes drawn on integer pixel coordinates. Seamless transitions between scenes, with no blank frames or accidental flashes.
- Add simple procedural background music and sound effects (rain, train rumble, rail clatter, brakes, and steam) generated from code, then multiplexed into the video. Musical mood shifts with the scenes: serene and melancholic at night, warm and relieved at dawn.

Final deliverable: ready-to-render source code and execution instructions.
Run it yourself, verify results (sample one frame per scene, ensure no cut-off text or objects, duration exactly 15.0 seconds), and fix errors before submitting.
```

---

### 🖼️ Perbandingan Hasil Visual Per Adegan

| Adegan | GPT 6 Astra (Codex) | Claude Opus 5.5 (Claude Code) | Gemini 4 Argon (Antigravity) |
| :--- | :---: | :---: | :---: |
| **S1: Kereta Malam di Pedesaan Hujan (0–4s)** | ![GPT Scene 1](previews/kereta/gpt-scene1.png) | ![Claude Scene 1](previews/kereta/claude-scene1.png) | ![Gemini Scene 1](previews/kereta/gemini-scene1.png) |
| **S2: Masuk Jendela: Penumpang & Kucing (4–8s)** | ![GPT Scene 2](previews/kereta/gpt-scene2.png) | ![Claude Scene 2](previews/kereta/claude-scene2.png) | ![Gemini Scene 2](previews/kereta/gemini-scene2.png) |
| **S3: Hujan Reda & Fajar di Lembah (8–12s)** | ![GPT Scene 3](previews/kereta/gpt-scene3.png) | ![Claude Scene 3](previews/kereta/claude-scene3.png) | ![Gemini Scene 3](previews/kereta/gemini-scene3.png) |
| **S4: Tiba di Stasiun "SAMPAI" (12–15s)** | ![GPT Scene 4](previews/kereta/gpt-scene4.png) | ![Claude Scene 4](previews/kereta/claude-scene4.png) | ![Gemini Scene 4](previews/kereta/gemini-scene4.png) |

---

### 🎞️ Contact Sheet & Analisis Transisi Kunci

#### 1. Contact Sheet 15 Detik (0s – 14s, 15 Frame Kunci)
*Tiap sheet dibaca dari kiri ke kanan, atas ke bawah (5 kolom × 3 baris).*

- **GPT 6 Astra:**  
  ![GPT Contact Sheet](previews/kereta/gpt-0s-14s.png)
- **Claude Opus 5.5:**  
  ![Claude Contact Sheet](previews/kereta/claude-0s-14s.png)
- **Gemini 4 Argon:**  
  ![Gemini Contact Sheet](previews/kereta/gemini-0s-14s.png)

#### 2. Transisi Masuk Jendela (t = 3.6s – 4.4s, selang 0.1s)
Menunjukkan cara masing-masing model menginterpretasikan instruksi *"Kamera masuk ke satu jendela"*:

- **GPT 6 Astra:** Zoom eksterior close-up jendela (hingga 7× pixel size) diikuti dissolve Bayer ke interior kabin:  
  ![GPT Window Transition](previews/kereta/gpt-jendela-3.6s-4.4s.png)
- **Claude Opus 5.5:** Bingkai jendela melebar secara clip-path dari 10 px menjadi 274 px tanpa pembesaran skala piksel interior (1× pixel art terjaga):  
  ![Claude Window Transition](previews/kereta/claude-jendela-3.6s-4.4s.png)
- **Gemini 4 Argon:** Cut adegan langsung pada t = 4.0s dengan efek overlay dither Bayer 9/16 sel:  
  ![Gemini Window Transition](previews/kereta/gemini-jendela-3.6s-4.4s.png)

#### 3. Detail Kabin Penumpang & Kucing (t = 4.7s – 5.5s)
Pemeriksaan gerak mata berkedip, kibasan ekor, dan tetes air meluncur di kaca:

- **GPT 6 Astra:** Karakter lebih besar dan dominan, tetes air dinamis, ekor kucing bergerak:  
  ![GPT Cabin Detail](previews/kereta/gpt-kabin-4.7s-5.5s.png)
- **Claude Opus 5.5:** Komposisi jendela luas dengan pemandangan luar bergeser lancar, kucing tenang:  
  ![Claude Cabin Detail](previews/kereta/claude-kabin-4.7s-5.5s.png)
- **Gemini 4 Argon:** Penumpang dan kucing berukuran proporsional, hujan bergeser konsisten:  
  ![Gemini Cabin Detail](previews/kereta/gemini-kabin-4.7s-5.5s.png)

#### 4. Kedatangan di Stasiun & Teks "SAMPAI" (t = 12.0s – 15.0s)
Pengereman kereta, uap rem, typewriter teks, dan ikon matahari berkedip:

- **GPT 6 Astra:** Roda melambat dengan integral kecepatan fisik, teks bitmap bertahap:  
  ![GPT Station Arrival](previews/kereta/gpt-stasiun-12s-14.667s.png)
- **Claude Opus 5.5:** Fajar dan stasiun berpadu dalam satu shot berlanjut, kepulan uap halus:  
  ![Claude Station Arrival](previews/kereta/claude-stasiun-12s-14.667s.png)
- **Gemini 4 Argon:** Stasiun detail dengan lampu platform, perlambatan teratur, teks ketik tajam:  
  ![Gemini Station Arrival](previews/kereta/gemini-stasiun-12s-14.667s.png)

---

### 📊 Matriks Perbandingan Fitur & Pengukuran Teknis (Ronde 2)

| Kriteria / Metrik | GPT 6 Astra (`adu model kereta/gpt`) | Claude Opus 5.5 (`adu model kereta/claude`) | Gemini 4 Argon (`adu model kereta/kereta-gemini`) |
| :--- | :--- | :--- | :--- |
| **Model & Platform** | GPT 6 Astra (Codex) | Claude Opus 5.5 (Claude Code) | Gemini 4 Argon (Antigravity) |
| **Resolusi Internal** | 270 × 480 (Canvas 2D) | 270 × 480 (Canvas 2D) | 270 × 480 (Canvas 2D) |
| **Resolusi Output** | 1080 × 1920 (4× nearest-neighbor) | 1080 × 1920 (4× nearest-neighbor) | 1080 × 1920 (4× nearest-neighbor) |
| **Framerate & Durasi** | 30 FPS, 450 frames (15.000 detik) | 30 FPS, 450 frames (15.000 detik) | 30 FPS, 450 frames (15.000 detik) |
| **Pendekatan Kamera S2** | Zoom eksterior 11.5× (terukur 7×) + Bayer dissolve | Bingkai jendela melebar (10→274px), tanpa zoom kabin | Hard cut pada 4.0s dengan Bayer dither curtain (9/16 sel) |
| **Ukuran Piksel Maks (S2)** | **7×** (terjadi peregangan ukuran piksel saat zoom) | **1×** (skala piksel seni konsisten 1:1) | **1×** (skala piksel seni konsisten 1:1) |
| **Langit Fajar (t = 10.5s)** | 5 warna berjenjang, dither **0.7%** | 4 warna berjenjang, dither **14.5%** | 4 warna berjenjang, dither **7.6%** |
| **Sintesis Audio** | Python script (`audio.py`) sintesis PCM 48kHz | Node.js modular Web Audio synth (`audio.mjs`) | Node.js Web Audio direct buffer synth (`render.js`) |
| **Integrated Loudness** | **−13.4 LUFS** (True Peak: −1.8 dBTP) | **−14.1 LUFS** (True Peak: −1.5 dBTP) | **−25.0 LUFS** (True Peak: −10.7 dBTP) |
| **Dukungan Determinisme** | PRNG Seed `0x5a17c9` (visual), `0x714bc23` (audio) | Deterministic math function $f(t)$ | Time-indexed hash table $f(t)$ |
| **Struktur Kode** | Monolith Canvas (`animation.html`) + Python audio | Modular ES modules (`src/s1.js`, `s2.js`, `s3.js`) | Monolith Canvas (`index.html`) + unified renderer |

---

## 🚀 Ronde 1: Peluncuran Roket ke Orbit

Eksperimen pertama menguji pembuatan animasi peluncuran roket retro 12 detik dari bumi ke orbit dengan palet warna retro terbatas (maksimal 16 warna).

### 🎯 Prompt Eksperimen / Experiment Prompt

Prompt yang sama persis diberikan ke **Claude Opus 5.5** dan **Gemini 3.8 Flash**:

#### 🇮🇩 Versi Bahasa Indonesia (Asli)
```text
Buat video animasi pixel art vertikal berdurasi 12 detik, sepenuhnya dari kode.

Tema: peluncuran roket kecil dari bumi ke orbit.

Struktur 3 adegan:
1. (0-4 dtk) Landasan peluncuran saat senja. Hitung mundur 3-2-1 sebagai teks pixel di layar. Asap kecil keluar dari dasar roket.
2. (4-8 dtk) Roket lepas landas. Kamera mengikuti ke atas, langit berubah dari oranye ke biru tua lalu hitam. Bintang mulai muncul.
3. (8-12 dtk) Roket mencapai orbit. Planet besar di latar, bintang berkelip, teks pixel "MISSION START" muncul dengan efek ketik.

Ketentuan teknis:
- Murni HTML Canvas 2D, tanpa library, gambar, atau aset eksternal.
- Resolusi internal 270x480, ditampilkan 1080x1920 dengan nearest-neighbor (piksel tajam, tidak blur).
- 30 fps, 360 frame. Semua animasi digerakkan oleh waktu (fungsi drawFrame(t)) supaya hasil render konsisten setiap dijalankan.
- Render frame demi frame dengan Playwright headless Chromium, lalu gabungkan jadi MP4 dengan ffmpeg.
- Palet warna terbatas (maksimal 16 warna) dan konsisten antar adegan.
- Tambahkan musik latar sederhana dan efek suara peluncuran yang dibuat dari kode, lalu gabungkan ke video.

Keluaran akhir: file source code siap render dan petunjuk cara menjalankannya.
Jalankan sendiri, periksa hasilnya, dan perbaiki jika ada error sebelum menyerahkan.
```

#### 🇬🇧 English Translation
```text
Create a 12-second vertical pixel art animation video, generated entirely from code.

Theme: small rocket launch from Earth into orbit.

3-scene structure:
1. (0-4s) Launch pad at dusk. 3-2-1 countdown as pixel text on screen. Small smoke billowing from the rocket base.
2. (4-8s) Rocket lift-off. Camera tracks upward, sky transitions from orange to dark blue then black. Stars begin to appear.
3. (8-12s) Rocket reaches orbit. Large planet in background, twinkling stars, pixel text "MISSION START" appears with a typewriter effect.

Technical requirements:
- Pure HTML Canvas 2D, no libraries, images, or external assets.
- Internal resolution of 270x480, displayed at 1080x1920 using nearest-neighbor (sharp pixels, no blur).
- 30 fps, 360 frames. All animations driven by time (drawFrame(t) function) so render output is consistent on every run.
- Render frame-by-frame using Playwright headless Chromium, then combine into an MP4 with ffmpeg.
- Limited color palette (max 16 colors), consistent across scenes.
- Add simple procedural background music and launch sound effects generated from code, then multiplex into the video.

Final deliverable: ready-to-render source code files and instructions on how to run them.
Run it yourself, verify the results, and fix any errors before submitting.
```

---

### 🖼️ Perbandingan Hasil Visual (Ronde 1)

| Adegan | Claude (Opus 5.5) | Gemini (3.8 Flash) |
| :--- | :---: | :---: |
| **S1: Hitung Mundur (0–4s)** | ![Claude Countdown](previews/claude-countdown.png) | ![Gemini Countdown](previews/gemini-countdown.png) |
| **S2: Lepas Landas & Atmosfer (4–8s)** | ![Claude Liftoff](previews/claude-liftoff.png) | ![Gemini Liftoff](previews/gemini-liftoff.png) |
| **S3: Orbit & Mission Start (8–12s)** | ![Claude Orbit](previews/claude-orbit.png) | ![Gemini Orbit](previews/gemini-orbit.png) |

#### Contact Sheet Komparasi
- **Claude Opus 5.5 (15 Frame Kunci):**  
  ![Claude Contact Sheet](previews/claude-sheet.png)
- **Gemini 3.8 Flash (8 Frame Kunci):**  
  ![Gemini Contact Sheet](previews/gemini-sheet.png)

---

### 📊 Matriks Perbandingan Fitur (Ronde 1)

| Kriteria / Fitur | Claude Opus 5.5 (`roket-orbit-claude`) | Gemini 3.8 Flash (`roket-orbit-gemini`) |
| :--- | :--- | :--- |
| **Resolusi Internal** | 270 × 480 (Canvas 2D) | 270 × 480 (Canvas 2D) |
| **Resolusi Output** | 1080 × 1920 (4x upscale, nearest-neighbor) | 1080 × 1920 (4x upscale, nearest-neighbor) |
| **Framerate & Durasi** | 30 FPS, 360 frames (12.0 detik) | 30 FPS, 360 frames (12.0 detik) |
| **Palet Warna** | 16 warna retro ruang angkasa | 16 warna retro ruang angkasa |
| **Efek Visual S1** | Menara gantry, countdown pop, LOX smoke venting | Service tower, LOX venting, countdown scale-pop, ignition trench burst |
| **Efek Visual S2** | Ekor partikel api, gradient sky dither Bayer, stars | Shock diamonds, Mach condensation cone, gradient sky dither, cluster stars |
| **Efek Visual S3** | Bumi lengkung, kelap-kelip bintang, HUD typewriter | Sayap solar panel mekar, rotasi bumi malam-siang, RCS burst, HUD retro `>-^` |
| **Sintesis Audio** | Musik chiptune 4 baris synth + SFX countdown, launch, orbit (WAV 48kHz) | BGM chiptune 120 BPM + procedural SFX (beeps, rocket rumble, teletype) |
| **Arsitektur Rendering** | Playwright frame-by-frame PNG dump &rarr; FFmpeg concat | Playwright direct pipe RGBA buffer stream &rarr; FFmpeg |

---

## 📁 Struktur Direktori Repositori

```text
.
├── .gitignore
├── README.md
├── previews/                           # Cuplikan still & contact sheet komparasi
│   ├── claude-countdown.png
│   ├── claude-liftoff.png
│   ├── claude-orbit.png
│   ├── claude-sheet.png
│   ├── gemini-countdown.png
│   ├── gemini-liftoff.png
│   ├── gemini-orbit.png
│   ├── gemini-sheet.png
│   └── kereta/                         # Preview & audit stills Ronde 2 (Kereta)
│       ├── gpt-scene1.png … gpt-scene4.png
│       ├── claude-scene1.png … claude-scene4.png
│       ├── gemini-scene1.png … gemini-scene4.png
│       ├── gpt-0s-14s.png (sheet)
│       ├── claude-0s-14s.png (sheet)
│       ├── gemini-0s-14s.png (sheet)
│       ├── *-jendela-3.6s-4.4s.png
│       ├── *-kabin-4.7s-5.5s.png
│       ├── *-stasiun-12s-14.667s.png
│       └── *-frame449.png
│
├── adu model kereta/                   # Implementasi Lengkap Ronde 2 (Kereta Malam)
│   ├── PROMPT.md                       # Salinan teks prompt asli
│   ├── claude/                         # Versi Claude Opus 5.5
│   │   ├── index.html                  # Interactive browser preview
│   │   ├── package.json
│   │   ├── src/                        # Modul Canvas 2D (s1, s2, s3, train, raster)
│   │   └── tools/                      # Audio synth, check, render, stills
│   ├── gpt/                            # Versi GPT 6 Astra
│   │   ├── README.md                   # Petunjuk khusus GPT
│   │   ├── animation.html              # Monolith Canvas 2D
│   │   ├── audio.py                    # Procedural audio generator (Python)
│   │   ├── package.json
│   │   ├── render.mjs                  # Playwright + FFmpeg renderer
│   │   └── verification/               # Hasil audit QA & sampel adegan
│   └── kereta-gemini/                  # Versi Gemini 4 Argon
│       ├── index.html                  # Monolith Canvas 2D + audio
│       ├── package.json
│       ├── render.js                   # Renderer Playwright
│       └── verification/               # Sampel adegan
│
├── roket-orbit-claude/                 # Implementasi Lengkap Ronde 1 (Claude Opus 5.5)
│   ├── src/                            # Kode sumber Canvas 2D
│   ├── tools/                          # Renderer & audio synth
│   ├── index.html
│   ├── package.json
│   └── TREATMENT.md
│
└── roket-orbit-gemini/                 # Implementasi Lengkap Ronde 1 (Gemini 3.8 Flash)
    ├── src/                            # Kode sumber Canvas 2D & audio
    ├── render.mjs                      # Stream buffer renderer
    ├── index.html
    ├── package.json
    └── TREATMENT.md
```

---

## 🛠️ Cara Menjalankan

### A. Menjalankan Peserta Ronde 2 (Kereta Malam)

#### 1. Versi GPT 6 Astra (`adu model kereta/gpt`)
Prasyarat: Node.js 20+, Python 3.10+, FFmpeg pada PATH.
```bash
cd "adu model kereta/gpt"
npm install
npx playwright install chromium

# Buka animation.html langsung di browser untuk live canvas preview
# Atau render frame demi frame + audio Python:
npm run render
# Hasil: output/kereta-menuju-fajar.mp4
```

#### 2. Versi Claude Opus 5.5 (`adu model kereta/claude`)
Prasyarat: Node.js 20+, FFmpeg pada PATH.
```bash
cd "adu model kereta/claude"
npm install
npx playwright install chromium

# Sintesis audio WAV BGM + SFX
npm run audio

# Render video final MP4
npm run render
# Hasil: out/output.mp4
```

#### 3. Versi Gemini 4 Argon (`adu model kereta/kereta-gemini`)
Prasyarat: Node.js 20+, FFmpeg pada PATH.
```bash
cd "adu model kereta/kereta-gemini"
npm install
npx playwright install chromium

# Render video final
npm run render
# Hasil: kereta_malam_fajar.mp4
```

---

### B. Menjalankan Peserta Ronde 1 (Peluncuran Roket)

#### 1. Versi Claude Opus 5.5 (`roket-orbit-claude`)
```bash
cd roket-orbit-claude
npm install
npx playwright install chromium

# Live preview di browser
npm run preview

# Sintesis audio & render video
npm run audio
npm run build
# Hasil: out/roket-orbit-claude.mp4
```

#### 2. Versi Gemini 3.8 Flash (`roket-orbit-gemini`)
```bash
cd roket-orbit-gemini
npm install
npx playwright install chromium

# Live preview di browser
npm run preview

# Render video final
npm run render
# Hasil: out/roket-orbit.mp4
```

---

## 💻 Prasyarat Sistem
- **Node.js**: v18+ (direkomendasikan v20+)
- **Python**: v3.10+ (hanya untuk `adu model kereta/gpt/audio.py`, tanpa pip dependencies eksternal)
- **FFmpeg & ffprobe**: Terpasang di sistem dan terdaftar dalam `PATH`
- **Playwright Chromium**: `npx playwright install chromium`

---

## 📄 Lisensi
MIT License
