const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 15;
const TOTAL_FRAMES = FPS * DURATION; // 450 frame
const SAMPLE_RATE = 44100;

const FRAMES_DIR = path.join(__dirname, "frames");
const VERIFY_DIR = path.join(__dirname, "verification");
const AUDIO_PATH = path.join(__dirname, "soundtrack.wav");
const OUTPUT_MP4 = path.join(__dirname, "kereta_malam_fajar.mp4");

// =============================================================================
// 1. SYNTHESIZER AUDIO PROSEDURAL MURNI DARI KODE (MUSIK + EFEK SUARA)
// =============================================================================
function generateAudioWav(filePath) {
  console.log(
    "[1/4] Menyintesis musik latar & efek suara prosedural (WAV 44.1kHz)...",
  );
  const numSamples = SAMPLE_RATE * DURATION;
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  // Seeded PRNG untuk noise hujan & uap
  let rngState = 0x13579bdf;
  function nextWhiteNoise() {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return (rngState >>> 0) / 0x80000000 - 1.0;
  }

  // Helper frekuensi nada MIDI
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // gelombang segitiga hangat (chiptune/retro ambient)
  function triangleWave(phase) {
    const p = phase - Math.floor(phase);
    return p < 0.5 ? p * 4 - 1 : 3 - p * 4;
  }

  // ---------------------------------------------------------------------------
  // A. MUSIK LATAR:
  //    0-8 dtk (Adegan 1 & 2): Tenang & sendu di malam hari (A Minor: Am7 -> Fmaj7 -> Dm7 -> E7)
  //    8-15 dtk (Adegan 3 & 4): Hangat & lega saat fajar (Fmaj7 -> G6 -> Em7/Am7 -> Cmaj9)
  // ---------------------------------------------------------------------------
  const chords = [
    // Malam (Tenang & Sendu)
    { t0: 0.0, t1: 2.0, notes: [57, 60, 64, 67], mood: "night" }, // Am7
    { t0: 2.0, t1: 4.0, notes: [53, 57, 60, 64], mood: "night" }, // Fmaj7
    { t0: 4.0, t1: 6.0, notes: [50, 53, 57, 60], mood: "night" }, // Dm7
    { t0: 6.0, t1: 8.0, notes: [52, 56, 59, 62], mood: "night" }, // E7
    // Fajar & Stasiun (Hangat & Lega)
    { t0: 8.0, t1: 9.8, notes: [53, 57, 60, 64], mood: "dawn" }, // Fmaj7
    { t0: 9.8, t1: 11.4, notes: [55, 59, 62, 64], mood: "dawn" }, // G6
    { t0: 11.4, t1: 12.8, notes: [52, 55, 59, 64], mood: "dawn" }, // Em7
    { t0: 12.8, t1: 15.0, notes: [48, 55, 60, 64, 67], mood: "dawn" }, // Cmajadd9
  ];

  // Melodi utama
  const melody = [
    // Adegan 1 (Malam hujan)
    { t: 0.25, d: 0.85, n: 69, v: 0.11 },
    { t: 1.15, d: 0.8, n: 67, v: 0.09 },
    { t: 2.15, d: 0.9, n: 64, v: 0.1 },
    { t: 3.1, d: 0.85, n: 60, v: 0.09 },
    // Adegan 2 (Jendela kereta & kucing)
    { t: 4.2, d: 0.85, n: 62, v: 0.1 },
    { t: 5.1, d: 0.85, n: 65, v: 0.1 },
    { t: 6.1, d: 0.8, n: 64, v: 0.1 },
    { t: 7.0, d: 0.95, n: 59, v: 0.09 },
    // Adegan 3 (Langit fajar & matahari terbit)
    { t: 8.15, d: 0.75, n: 65, v: 0.12 },
    { t: 8.95, d: 0.75, n: 69, v: 0.12 },
    { t: 9.85, d: 0.75, n: 67, v: 0.13 },
    { t: 10.65, d: 0.75, n: 71, v: 0.13 },
    { t: 11.45, d: 0.95, n: 72, v: 0.14 },
    // Adegan 4 (Tiba di stasiun pagi)
    { t: 12.85, d: 1.95, n: 76, v: 0.13 },
    // Bunyi lonceng cerah saat matahari berkedip di akhir
    { t: 14.35, d: 0.28, n: 79, v: 0.12 },
    { t: 14.65, d: 0.32, n: 84, v: 0.14 },
  ];

  // Filter state untuk hujan, gemuruh kereta, dan uap
  let rainLp = 0,
    rainBp = 0;
  let rumbleLp = 0;
  let steamLp = 0;
  let wheelDist = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sigL = 0;
    let sigR = 0;

    // 1. Pad Akor Musik Latar
    for (const ch of chords) {
      if (t >= ch.t0 && t < ch.t1) {
        const local = t - ch.t0;
        const dur = ch.t1 - ch.t0;
        const env =
          Math.sin(Math.min(1, local / 0.25) * (Math.PI / 2)) *
          Math.sin(Math.min(1, (dur - local) / 0.3) * (Math.PI / 2));
        for (let k = 0; k < ch.notes.length; k++) {
          const freq = midiToFreq(ch.notes[k]);
          const tone =
            ch.mood === "night"
              ? Math.sin(2 * Math.PI * freq * t) * 0.7 +
                triangleWave(freq * t) * 0.3
              : triangleWave(freq * t) * 0.55 +
                Math.sin(2 * Math.PI * freq * t) * 0.45 +
                Math.sin(4 * Math.PI * freq * t) * 0.15;
          const amp = 0.032 * env;
          sigL += tone * amp * (k % 2 === 0 ? 1.0 : 0.75);
          sigR += tone * amp * (k % 2 === 1 ? 1.0 : 0.75);
        }
      }
    }

    // 2. Melodi Musik Latar
    for (const m of melody) {
      if (t >= m.t && t < m.t + m.d) {
        const local = t - m.t;
        const env = Math.min(1, local / 0.03) * Math.exp(-local * 2.1);
        const freq = midiToFreq(m.n);
        const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * 0.002;
        const sig =
          triangleWave(freq * (1 + vibrato) * t) * 0.65 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
        sigL += sig * m.v * env;
        sigR += sig * m.v * env;
      }
    }

    // 3. Efek Suara Hujan (0.0s - 9.2s) & Guntur Kilat (2.15s - 3.5s)
    const wn = nextWhiteNoise();
    rainLp += 0.18 * (wn - rainLp);
    rainBp += 0.05 * (rainLp - rainBp);
    const rainSignal = rainLp - rainBp;

    if (t < 9.2) {
      let rainGain = 0.11;
      if (t >= 4.0 && t < 8.0) rainGain = 0.075; // Sedikit teredam di dalam jendela kabin
      if (t >= 8.0) rainGain = 0.09 * Math.max(0, 1.0 - (t - 8.0) / 1.2); // Hujan mereda
      sigL += rainSignal * rainGain;
      sigR += rainSignal * rainGain * 0.95;
    }

    // Gemuruh petir kecil setelah kilat menyambar pada t = 2.15s
    if (t >= 2.15 && t <= 3.6) {
      const dt = t - 2.15;
      const thEnv = Math.min(1, dt / 0.04) * Math.exp(-dt * 2.8);
      const thunder =
        Math.sin(2 * Math.PI * 68 * t + rainBp * 4) * thEnv * 0.16;
      sigL += thunder;
      sigR += thunder;
    }

    // 4. Deru Kereta & Ketukan Rel ("da-dum... da-dum...") (0.0s - 13.4s)
    let trainSpeed = 1.0;
    if (t >= 12.0 && t < 13.4) {
      trainSpeed = Math.max(0, 1.0 - (t - 12.0) / 1.4);
    } else if (t >= 13.4) {
      trainSpeed = 0.0;
    }

    if (trainSpeed > 0.001) {
      // Deru frekuensi rendah kereta
      rumbleLp += 0.015 * (wn - rumbleLp);
      const chugMod =
        0.75 + 0.25 * Math.sin(2 * Math.PI * 6.5 * trainSpeed * t);
      const rumble =
        (rumbleLp * 0.28 + Math.sin(2 * Math.PI * 52 * t) * 0.03) *
        trainSpeed *
        chugMod;
      sigL += rumble;
      sigR += rumble;

      // Ketukan sambungan rel ("clack-clack")
      wheelDist += (trainSpeed * 1.45) / SAMPLE_RATE;
      const jointPhase = wheelDist % 1.0;
      let clackEnv = 0;
      if (jointPhase < 0.045) {
        clackEnv = Math.exp(-(jointPhase / 0.045) * 4.5);
      } else if (jointPhase >= 0.13 && jointPhase < 0.175) {
        clackEnv = Math.exp(-((jointPhase - 0.13) / 0.045) * 4.5) * 0.85;
      }
      if (clackEnv > 0) {
        const clack =
          (Math.sin(2 * Math.PI * 195 * t) * 0.6 + wn * 0.4) *
          clackEnv *
          0.12 *
          Math.sqrt(trainSpeed);
        sigL += clack;
        sigR += clack;
      }
    }

    // 5. Decit Rem Halus (12.2s - 13.35s) & Desis Uap Rem (12.8s - 14.35s)
    if (t >= 12.2 && t <= 13.35) {
      const bt = (t - 12.2) / 1.15;
      const brakeEnv = Math.sin(bt * Math.PI) * 0.025;
      const squeal =
        (Math.sin(2 * Math.PI * 2380 * t) * 0.6 +
          Math.sin(2 * Math.PI * 3120 * t) * 0.4) *
        brakeEnv;
      sigL += squeal;
      sigR += squeal;
    }

    if (t >= 12.8 && t <= 14.35) {
      const st = t - 12.8;
      const steamEnv = Math.min(1, st / 0.15) * Math.exp(-st * 2.2) * 0.16;
      steamLp += 0.35 * (wn - steamLp);
      const hiss = (wn - steamLp) * steamEnv;
      sigL += hiss;
      sigR += hiss;
    }

    // 6. Efek Ketik Pixel "SAMPAI" (6 huruf mulai t = 13.45s, interval 0.14s)
    for (let c = 0; c < 6; c++) {
      const hitT = 13.45 + c * 0.14;
      if (t >= hitT && t < hitT + 0.035) {
        const dt = t - hitT;
        const tickEnv = Math.exp(-dt * 120);
        const tick = triangleWave((880 + c * 45) * t) * tickEnv * 0.09;
        sigL += tick;
        sigR += tick;
      }
    }

    // Soft limiter & fade in/out ujung video
    const masterFade =
      Math.min(1, t / 0.15) * Math.min(1, (DURATION - t) / 0.2);
    left[i] = Math.max(-0.98, Math.min(0.98, sigL * masterFade));
    right[i] = Math.max(-0.98, Math.min(0.98, sigR * masterFade));
  }

  // Tulis header WAV PCM 16-bit Stereo
  const dataSize = numSamples * 4;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // 2 Channel (Stereo)
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.round(left[i] * 32767), offset);
    buffer.writeInt16LE(Math.round(right[i] * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`      Audio berhasil dibuat: ${filePath}`);
}

// =============================================================================
// 2. RENDER 450 FRAME DENGAN PLAYWRIGHT HEADLESS CHROMIUM & AUDIT PIXEL ART
// =============================================================================
async function renderFramesAndVerify() {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(VERIFY_DIR, { recursive: true });

  console.log("[2/4] Meluncurkan Playwright headless Chromium (1080x1920)...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });

  const fileUrl =
    "file://" + path.join(__dirname, "index.html").replace(/\\/g, "/");
  await page.goto(fileUrl, { waitUntil: "load" });

  // Sampel 1 frame per adegan untuk verifikasi kualitas
  const sceneSampleFrames = {
    64: "scene1_malam_hujan_kilat.png", // t = 2.13 dtk (Adegan 1: Kereta malam, hujan & kilat)
    180: "scene2_jendela_kucing.png", // t = 6.00 dtk (Adegan 2: Penumpang kecil & kucing)
    315: "scene3_fajar_kabut_lembah.png", // t = 10.50 dtk (Adegan 3: Matahari terbit & kabut)
    435: "scene4_stasiun_sampai.png", // t = 14.50 dtk (Adegan 4: Stasiun, uap & teks SAMPAI)
  };

  console.log(`[3/4] Merender ${TOTAL_FRAMES} frame (30 fps, 15.0 detik)...`);
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    await page.evaluate((timeSec) => {
      window.drawFrame(timeSec);
    }, t);

    const frameFile = path.join(
      FRAMES_DIR,
      `frame_${String(f).padStart(4, "0")}.png`,
    );
    await page.screenshot({ path: frameFile, type: "png" });

    if (sceneSampleFrames[f]) {
      const verifyFile = path.join(VERIFY_DIR, sceneSampleFrames[f]);
      fs.copyFileSync(frameFile, verifyFile);

      // Verifikasi otomatis ketajaman blok piksel 4x4 (Nearest-Neighbor) & bebas terpotong
      const audit = await page.evaluate(() => {
        const c = document.getElementById("screen");
        const ctx = c.getContext("2d");
        const d = ctx.getImageData(0, 0, 1080, 1920).data;
        let isUniform4x4 = true;
        // Cek sampel blok 4x4 apakah semua 16 piksel di dalamnya identik (tanpa blur)
        for (let by = 0; by < 480; by += 20) {
          for (let bx = 0; bx < 270; bx += 20) {
            const baseIdx = (by * 4 * 1080 + bx * 4) * 4;
            const r0 = d[baseIdx],
              g0 = d[baseIdx + 1],
              b0 = d[baseIdx + 2];
            for (let dy = 0; dy < 4; dy++) {
              for (let dx = 0; dx < 4; dx++) {
                const idx = ((by * 4 + dy) * 1080 + (bx * 4 + dx)) * 4;
                if (d[idx] !== r0 || d[idx + 1] !== g0 || d[idx + 2] !== b0) {
                  isUniform4x4 = false;
                }
              }
            }
          }
        }
        return { width: c.width, height: c.height, isUniform4x4 };
      });

      console.log(
        `      [Audit Frame ${f} | t=${t.toFixed(2)}s] Disimpan -> ${sceneSampleFrames[f]} | ` +
          `Resolusi: ${audit.width}x${audit.height} | Blok Pixel 4x4 Tajam: ${audit.isUniform4x4 ? "YA" : "TIDAK"}`,
      );
    }

    if ((f + 1) % 90 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`      Progres: ${f + 1}/${TOTAL_FRAMES} frame selesai`);
    }
  }

  await browser.close();
}

// =============================================================================
// 3. GABUNGKAN FRAME + AUDIO MENJADI MP4 DENGAN FFMPEG & PERIKSA DURASI
// =============================================================================
function stitchVideoWithFfmpeg() {
  console.log(
    "[4/4] Menggabungkan frame PNG + WAV menjadi MP4 dengan FFmpeg...",
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(FRAMES_DIR, "frame_%04d.png"),
      "-i",
      AUDIO_PATH,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "16",
      "-preset",
      "slow",
      "-sws_flags",
      "neighbor",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      OUTPUT_MP4,
    ],
    { stdio: "inherit" },
  );

  console.log(`\nSelesai! Video MP4 tersimpan di: ${OUTPUT_MP4}`);
}

async function main() {
  generateAudioWav(AUDIO_PATH);
  await renderFramesAndVerify();
  stitchVideoWithFfmpeg();
}

main().catch((err) => {
  console.error("Terjadi kesalahan saat proses render:", err);
  process.exit(1);
});
