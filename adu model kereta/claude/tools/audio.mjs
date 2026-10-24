// Musik + efek suara sintetis dari kode -> audio/musik.wav, audio/sfx.wav, audio/mix.wav
// Waktu dibaca dari src/timeline.js (sumber yang sama dengan gambar). Acak memakai seed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/timeline.js'), 'utf8'), ctx);
const TL = ctx.globalThis.TL;

const SR = 48000;
const N = Math.round(TL.DUR * SR); // tepat 15,000 s
const smooth = TL.smooth;

// ---------- utilitas ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stereo = () => [new Float32Array(N), new Float32Array(N)];
const panLR = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = (s) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return mtof(base + (+m[3] + 1) * 12);
};

// biquad RBJ
function biquad(type, f, q) {
  const w = 2 * Math.PI * f / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; } // bp
  a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

// ---------- instrumen ----------
// Karplus-Strong: petikan senar. bright 0..1 = terang/gelap.
function pluck(out, t0, f, dur, amp, bright, pan, seed) {
  const r = rng(seed);
  const L = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) { lp += (r() * 2 - 1 - lp) * (0.25 + bright * 0.7); buf[i] = lp; }
  const decay = 0.996 + bright * 0.0035;
  const s0 = Math.round(t0 * SR), n = Math.round(dur * SR), rel = Math.round(0.08 * SR);
  const [gl, gr] = panLR(pan);
  let idx = 0, prev = 0, body = 0;
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    const cur = buf[idx];
    const nx = (cur + prev) * 0.5 * decay;
    prev = cur;
    buf[idx] = nx * (0.5 + 0.5 * bright) + cur * (0.5 - 0.5 * bright) * decay;
    idx = (idx + 1) % L;
    body += (cur - body) * 0.35;
    if (k < 0 || k >= N) continue;
    const env = i > n - rel ? (n - i) / rel : 1;
    const v = body * amp * env * Math.min(1, i / 24);
    out[0][k] += v * gl; out[1][k] += v * gr;
  }
}

// pad: dua suara saw aditif sedikit detune, filter satu kutub, naik pelan
function pad(out, t0, t1, freqs, amp, cutA, cutB, pan) {
  const s0 = Math.round(t0 * SR), s1 = Math.min(N, Math.round(t1 * SR));
  const att = 1.1 * SR, rel = 0.9 * SR;
  const [gl, gr] = panLR(pan);
  const ph = freqs.map(() => [0, 0.37]);
  let y = 0;
  for (let k = s0; k < s1; k++) {
    const i = k - s0, u = i / (s1 - s0);
    let x = 0;
    freqs.forEach((f, j) => {
      for (let v = 0; v < 2; v++) {
        const fv = f * (v ? 1.004 : 0.997);
        ph[j][v] += fv / SR;
        const p = ph[j][v] * 2 * Math.PI;
        for (let h = 1; h <= 8; h++) x += Math.sin(p * h) / h;
      }
    });
    const cut = cutA + (cutB - cutA) * u;
    y += (x - y) * (1 - Math.exp(-2 * Math.PI * cut / SR));
    const env = Math.min(1, i / att) * Math.min(1, (s1 - k) / rel);
    const v = y * amp * env / freqs.length;
    out[0][k] += v * gl; out[1][k] += v * gr;
  }
}

// reverb sederhana (Freeverb ringkas)
function reverb(src, wet, seedOff) {
  const out = stereo();
  for (let ch = 0; ch < 2; ch++) {
    const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d: d + ch * 23 + seedOff, b: new Float32Array(d + ch * 23 + seedOff), i: 0, f: 0 }));
    const aps = [556, 441, 341].map((d) => ({ d: d + ch * 11, b: new Float32Array(d + ch * 11), i: 0 }));
    for (let k = 0; k < N; k++) {
      const x = src[ch][k] * 0.2;
      let y = 0;
      for (const c of combs) {
        const o = c.b[c.i];
        c.f = o * 0.72 + c.f * 0.28;
        c.b[c.i] = x + c.f * 0.82;
        c.i = (c.i + 1) % c.d;
        y += o;
      }
      for (const a of aps) {
        const o = a.b[a.i];
        a.b[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.d;
        y = o - y;
      }
      out[ch][k] = src[ch][k] + y * wet;
    }
  }
  return out;
}

// ==================== MUSIK ====================
// Ketukan rel = metronom: 75 BPM, satu sambungan rel tiap setengah ketukan.
// Malam: A minor, petikan gelap dan jarang. Fajar (8 s): bergeser ke C mayor, pad mengembang,
// petikan makin terang. Berhenti (13,4 s): akor C mayor dibiarkan berdering.
const music = stereo();
const BEAT = 60 / TL.BPM;
const CH = [
  { t: 0.0, bass: 'A1', tones: ['A3', 'C4', 'E4', 'B4'] },
  { t: 3.2, bass: 'F1', tones: ['A3', 'C4', 'E4', 'G4'] },
  { t: 6.4, bass: 'D2', tones: ['F3', 'A3', 'C4', 'E4'] },
  { t: 8.0, bass: 'E2', tones: ['G#3', 'B3', 'D4', 'E4'] },
  { t: 9.6, bass: 'F1', tones: ['A3', 'C4', 'E4', 'G4'] },
  { t: 11.2, bass: 'G1', tones: ['B3', 'D4', 'E4', 'G4'] },
  { t: 12.8, bass: 'C2', tones: ['E3', 'G3', 'B3', 'D4'] },
];
const chordAt = (t) => { let c = CH[0]; for (const x of CH) if (t >= x.t - 1e-6) c = x; return c; };
const bright = (t) => 0.3 + 0.45 * smooth(7.6, 11.0, t);
let seed = 1000;

// bas: tiap ganti akor + ketukan ke-3
for (const c of CH) {
  pluck(music, c.t, NOTE(c.bass), Math.min(3.2, 15 - c.t), 0.55, 0.25, -0.1, seed++);
  if (c.t + 2 * BEAT < 12.8 && c.t < 12.8) pluck(music, c.t + 2 * BEAT, NOTE(c.bass) * 2, 1.4, 0.25, 0.25, -0.1, seed++);
}
// arpeggio: malam per ketukan (jarang), fajar per setengah ketukan; berhenti saat kereta berhenti
const ARP = [0, 2, 1, 3, 2, 1];
for (let k = 0; ; k++) {
  const t = k * BEAT / 2;
  if (t >= 12.8) break;
  const night = t < 8.0;
  if (night && k % 2) continue;
  const c = chordAt(t);
  const n = c.tones[ARP[k % ARP.length] % c.tones.length];
  pluck(music, t + 0.012 * ((k * 7) % 3), NOTE(n), 1.6, night ? 0.22 : 0.2, bright(t), k % 2 ? 0.35 : -0.35, seed++);
}
// melodi
const MEL = [
  [1.6, 'E5', 0.8], [2.4, 'D5', 0.4], [2.8, 'C5', 1.6],
  [4.0, 'A4', 0.8], [4.8, 'C5', 0.8], [5.6, 'B4', 1.4],
  [6.4, 'A4', 0.8], [7.2, 'G4', 1.2],
  [8.0, 'B4', 0.8], [8.8, 'E5', 0.8],
  [9.6, 'C5', 0.4], [10.0, 'E5', 0.4], [10.4, 'G5', 0.6], [11.0, 'A5', 0.2],
  [11.2, 'G5', 0.4], [11.6, 'D5', 0.4], [12.0, 'E5', 0.4], [12.4, 'D5', 0.4],
  [12.8, 'E5', 0.6], [13.4, 'G5', 1.6],
];
for (const [t, n, d] of MEL) {
  pluck(music, t, NOTE(n), d + 1.4, 0.38, Math.min(0.85, bright(t) + 0.15), 0.1, seed++);
}
// akhir: akor C mayor petik pelan saat kereta berhenti, lalu lonceng kecil untuk ikon matahari
['C3', 'G3', 'E4', 'B4', 'D5'].forEach((n, i) => pluck(music, 13.4 + i * 0.07, NOTE(n), 1.6, 0.2, 0.7, -0.3 + i * 0.15, seed++));
pluck(music, TL.sunIcon, NOTE('C6'), 0.7, 0.2, 0.9, 0.2, seed++);
pluck(music, TL.sunIcon + 0.12, NOTE('G6'), 0.58, 0.14, 0.9, 0.3, seed++);
// lapisan bawah: malam = drone gelap, fajar = pad hangat yang mengembang
pad(music, 0.0, 8.4, [NOTE('A2'), NOTE('E3')], 0.05, 220, 320, 0);
for (let i = 3; i < CH.length; i++) {
  const c = CH[i], t1 = i + 1 < CH.length ? CH[i + 1].t + 0.4 : TL.DUR;
  pad(music, c.t - 0.3, t1, c.tones.map(NOTE), 0.07 + 0.03 * (i - 3), 500 + (i - 3) * 300, 800 + (i - 3) * 350, 0);
}
const musicR = reverb(music, 0.55, 0);

// ==================== SFX ====================
const sfx = stereo();
const inside = (t) => smooth(TL.win[0] + 0.3, TL.win[1], t) * (1 - smooth(TL.glass[0], TL.glass[1] - 0.2, t));
const rainAmt = (t) => 1 - smooth(TL.rainStop[0], TL.rainStop[1], t);

// hujan: luar = desir terang, dalam = teredam di balik kaca
{
  const r = rng(7);
  const hp = [biquad('hp', 700, 0.7), biquad('hp', 700, 0.7)], lpO = [biquad('lp', 6500, 0.7), biquad('lp', 6500, 0.7)];
  const lpI = [biquad('lp', 900, 0.7), biquad('lp', 900, 0.7)];
  for (let k = 0; k < N; k++) {
    const t = k / SR, a = rainAmt(t), ins = inside(t);
    for (let ch = 0; ch < 2; ch++) {
      const w = r() * 2 - 1;
      const o = lpO[ch](hp[ch](w));
      const i = lpI[ch](w);
      sfx[ch][k] += a * (o * 0.3 * (1 - ins) + i * 0.2 * ins);
    }
  }
  // tetes: luar = tik halus acak, dalam = ketuk di kaca
  const rd = rng(8);
  for (let t = 0; t < TL.DUR; t += 0.004) {
    const a = rainAmt(t), ins = inside(t);
    const rate = a * (1 - ins) * 0.18 + a * ins * 0.04;
    if (rd() > rate) continue;
    const f = ins > 0.5 ? 2200 + rd() * 900 : 3500 + rd() * 3000;
    const g = (ins > 0.5 ? 0.05 : 0.03) * (0.4 + rd() * 0.6);
    const [gl, gr] = panLR(rd() * 1.6 - 0.8);
    const s0 = Math.round(t * SR), n = Math.round(0.012 * SR);
    for (let i = 0; i < n && s0 + i < N; i++) {
      const v = Math.sin(2 * Math.PI * f * i / SR) * Math.exp(-i / (0.0025 * SR)) * g;
      sfx[0][s0 + i] += v * gl; sfx[1][s0 + i] += v * gr;
    }
  }
}

// deru kereta: noise coklat rendah, mengikuti kecepatan; di dalam kabin lebih dalam
{
  const r = rng(9);
  let b = [0, 0];
  const lp = [biquad('lp', 160, 0.8), biquad('lp', 160, 0.8)];
  for (let k = 0; k < N; k++) {
    const t = k / SR, v = TL.trainV(t) / TL.V, ins = inside(t);
    // S1 awal: kereta masih jauh di kiri, deru membesar saat mendekat
    const near = t < 3.0 ? 0.35 + 0.65 * smooth(0, 2.4, t) : 1;
    for (let ch = 0; ch < 2; ch++) {
      b[ch] = (b[ch] + (r() * 2 - 1) * 0.02) * 0.995;
      sfx[ch][k] += lp[ch](b[ch]) * 1.7 * v * near * (0.8 + 0.15 * ins);
    }
  }
}

// semburan uap lokomotif (chuff), tiap 30 px jarak; berhenti saat regulator ditutup
{
  const r = rng(10);
  let next = 30;
  for (let k = 0; k < N; k += 16) {
    const t = k / SR, d = TL.trainD(t);
    if (d < next) continue;
    next += 30;
    const g = 0.09 * (1 - smooth(11.8, 12.3, t)) * (1 - 0.6 * inside(t)) * (t < 3 ? 0.4 + 0.6 * smooth(0, 2.4, t) : 1);
    if (g <= 0.001) continue;
    const bp = biquad('bp', 420 + r() * 120, 0.9), n = Math.round(0.14 * SR);
    const pan = t < 3.4 ? -0.2 + 0.5 * smooth(0.3, 3.0, t) : 0.25;
    const [gl, gr] = panLR(pan);
    for (let i = 0; i < n && k + i < N; i++) {
      const e = Math.min(1, i / (0.01 * SR)) * Math.exp(-i / (0.045 * SR));
      const v = bp(r() * 2 - 1) * e * g * 2.2;
      sfx[0][k + i] += v * gl; sfx[1][k + i] += v * gr;
    }
  }
}

// ketukan rel: tiap sambungan dilewati dua gandar boogie (ta-tak), lalu boogie berikutnya
{
  const r = rng(11);
  const hit = (t, g, ins) => {
    const s0 = Math.round(t * SR);
    if (s0 >= N) return;
    const bp1 = biquad('bp', 2300 + r() * 500, 3), bp2 = biquad('bp', 1100 + r() * 200, 2);
    const n = Math.round(0.09 * SR);
    for (let i = 0; i < n && s0 + i < N; i++) {
      const w = r() * 2 - 1;
      const click = (bp1(w) * 1.2 + bp2(w)) * Math.exp(-i / (0.012 * SR)) * (1 - 0.75 * ins);
      const thump = Math.sin(2 * Math.PI * 78 * i / SR) * Math.exp(-i / (0.03 * SR)) * (0.4 + 0.25 * ins);
      const v = (click * 0.9 + thump * 0.5) * g;
      sfx[0][s0 + i] += v * 0.95; sfx[1][s0 + i] += v;
    }
  };
  for (const e of TL.clacks()) {
    if (e.v < 3) continue;
    const g = 0.22 * Math.min(1, e.v / TL.V + 0.25);
    const ins = inside(e.t);
    const dt = 11 / e.v;
    hit(e.t, g, ins);
    hit(e.t + dt, g * 0.85, ins);
    if (e.t + 0.18 * TL.V / e.v < TL.DUR) { hit(e.t + 0.17 * TL.V / e.v, g * 0.5, ins); hit(e.t + 0.17 * TL.V / e.v + dt, g * 0.45, ins); }
  }
}

// guruh jauh setelah kilat kecil
{
  const r = rng(12);
  const lp = biquad('lp', 120, 0.7), lp2 = biquad('lp', 260, 0.7);
  let b = 0;
  const s0 = Math.round(TL.thunder * SR), n = Math.round(2.6 * SR);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = TL.thunder + i / SR;
    b = (b + (r() * 2 - 1) * 0.03) * 0.997;
    const e = Math.min(1, i / (0.25 * SR)) * Math.exp(-i / (0.8 * SR)) * (1 + 0.4 * Math.sin(i / SR * 9));
    const v = (lp(b) * 6 + lp2(r() * 2 - 1) * 0.05) * e * 0.22 * (1 - 0.5 * inside(t));
    sfx[0][s0 + i] += v * 0.8; sfx[1][s0 + i] += v;
  }
}

// decit rem + gesekan
{
  const r = rng(13);
  const bp = biquad('bp', 3000, 1.5);
  const a = 12.25, b = TL.brake[1];
  let ph = 0, ph2 = 0;
  for (let k = Math.round(a * SR); k < Math.round((b + 0.12) * SR); k++) {
    const t = k / SR;
    const env = smooth(a, a + 0.35, t) * (1 - smooth(b - 0.08, b + 0.1, t));
    const f = 2050 - 160 * smooth(a, b, t) + 18 * Math.sin(t * 2 * Math.PI * 6.5);
    ph += f / SR; ph2 += (f * 2.01) / SR;
    const v = (Math.sin(ph * 2 * Math.PI) * 0.6 + Math.sin(ph2 * 2 * Math.PI) * 0.15) * 0.028 * env * (0.8 + 0.2 * Math.sin(t * 31))
      + bp(r() * 2 - 1) * 0.05 * env;
    sfx[0][k] += v * 0.85; sfx[1][k] += v;
  }
}

// uap rem: desis pendek dan lembut
{
  const r = rng(14);
  const hp = biquad('hp', 1800, 0.7), lp = biquad('lp', 7000, 0.7);
  const s0 = Math.round(TL.steam * SR), n = Math.round(0.75 * SR);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const e = Math.min(1, i / (0.03 * SR)) * Math.exp(-i / (0.22 * SR));
    const v = lp(hp(r() * 2 - 1)) * e * 0.09;
    sfx[0][s0 + i] += v * 0.7; sfx[1][s0 + i] += v;
  }
}

// pagi: kicau burung jarang dan pelan, mulai saat langit terang
{
  const r = rng(16);
  const calls = [11.7, 12.35, 13.1, 13.75, 14.15, 14.6];
  for (const t0 of calls) {
    const notes = 2 + Math.floor(r() * 3), base = 3200 + r() * 1400;
    const [gl, gr] = panLR(r() * 1.4 - 0.7);
    for (let j = 0; j < notes; j++) {
      const s0 = Math.round((t0 + j * (0.09 + r() * 0.04)) * SR), n = Math.round((0.05 + r() * 0.03) * SR);
      const f0 = base * (1 + r() * 0.15), f1 = f0 * (1.25 + r() * 0.3);
      let ph = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const u = i / n;
        ph += (f0 + (f1 - f0) * Math.sin(u * Math.PI)) / SR;
        const v = Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * u) * 0.022 * smooth(11.4, 12.4, t0);
        sfx[0][s0 + i] += v * gl; sfx[1][s0 + i] += v * gr;
      }
    }
  }
}

// klik ketik per huruf "SAMPAI"
{
  const r = rng(15);
  for (let i = 0; i < TL.text.length; i++) {
    const t = TL.typeStart + i * TL.typeStep;
    const bp = biquad('bp', 1900 + r() * 300, 4);
    const s0 = Math.round(t * SR), n = Math.round(0.03 * SR);
    for (let j = 0; j < n && s0 + j < N; j++) {
      const v = bp(r() * 2 - 1) * Math.exp(-j / (0.004 * SR)) * 0.5;
      sfx[0][s0 + j] += v; sfx[1][s0 + j] += v;
    }
  }
}

// ==================== MIX + MASTER ====================
// BS.1770 (K-weighting + gating) untuk menaksir LUFS
function lufs(L, Rr) {
  const kw = () => {
    const s1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
    const s2 = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };
    const st = [[0, 0, 0, 0], [0, 0, 0, 0]];
    return (x) => {
      let y = s1.b[0] * x + s1.b[1] * st[0][0] + s1.b[2] * st[0][1] - s1.a[0] * st[0][2] - s1.a[1] * st[0][3];
      st[0][1] = st[0][0]; st[0][0] = x; st[0][3] = st[0][2]; st[0][2] = y;
      const z = s2.b[0] * y + s2.b[1] * st[1][0] + s2.b[2] * st[1][1] - s2.a[0] * st[1][2] - s2.a[1] * st[1][3];
      st[1][1] = st[1][0]; st[1][0] = y; st[1][3] = st[1][2]; st[1][2] = z;
      return z;
    };
  };
  const fl = kw(), fr = kw();
  const sq = new Float64Array(N);
  for (let k = 0; k < N; k++) { const a = fl(L[k]), b = fr(Rr[k]); sq[k] = a * a + b * b; }
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), ms = [];
  for (let s = 0; s + blk <= N; s += hop) { let m = 0; for (let k = s; k < s + blk; k++) m += sq[k]; ms.push(m / blk); }
  const ld = (m) => -0.691 + 10 * Math.log10(m);
  let g = ms.filter((m) => ld(m) > -70);
  const rel = ld(g.reduce((a, b) => a + b, 0) / g.length) - 10;
  g = g.filter((m) => ld(m) > rel);
  return ld(g.reduce((a, b) => a + b, 0) / g.length);
}

const mix = stereo();
const MUS = 1.6, SFX = 1.0;
for (let ch = 0; ch < 2; ch++) for (let k = 0; k < N; k++) mix[ch][k] = musicR[ch][k] * MUS + sfx[ch][k] * SFX;

const target = -14;
const before = lufs(mix[0], mix[1]);
const gain = Math.pow(10, (target - before) / 20);
// limiter lookahead sederhana ke -1,5 dBFS (sisa ruang untuk true peak)
const ceil = Math.pow(10, -1.5 / 20), look = Math.round(0.005 * SR);
const env = new Float32Array(N);
for (let k = 0; k < N; k++) env[k] = Math.max(Math.abs(mix[0][k]), Math.abs(mix[1][k])) * gain;
let gr = 1;
const grs = new Float32Array(N);
for (let k = N - 1; k >= 0; k--) {
  let pk = 0;
  for (let j = k; j < Math.min(N, k + look); j += 8) pk = Math.max(pk, env[j]);
  const want = pk > ceil ? ceil / pk : 1;
  gr = want < gr ? want : gr + (want - gr) * 0.0004;
  grs[k] = gr;
}
let gs = 1;
const fadeOut = Math.round(0.3 * SR), fadeIn = Math.round(0.02 * SR);
for (let k = 0; k < N; k++) {
  gs = grs[k] < gs ? grs[k] : gs + (grs[k] - gs) * 0.002;
  const f = Math.min(1, k / fadeIn, (N - k) / fadeOut);
  for (let ch = 0; ch < 2; ch++) mix[ch][k] *= gain * gs * f;
}
const after = lufs(mix[0], mix[1]);

function writeWav(file, [L, Rr], g = 1) {
  const data = Buffer.alloc(N * 4);
  for (let k = 0; k < N; k++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[k] * g * 32767))), k * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(Rr[k] * g * 32767))), k * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
const dir = path.join(ROOT, 'audio');
fs.mkdirSync(dir, { recursive: true });
writeWav(path.join(dir, 'musik.wav'), musicR, gain * MUS);
writeWav(path.join(dir, 'sfx.wav'), sfx, gain * SFX);
writeWav(path.join(dir, 'mix.wav'), mix);
let peak = 0;
for (let ch = 0; ch < 2; ch++) for (let k = 0; k < N; k++) peak = Math.max(peak, Math.abs(mix[ch][k]));
console.log(`audio: ${N} sampel @ ${SR} Hz = ${(N / SR).toFixed(3)} s`);
console.log(`loudness: ${before.toFixed(1)} -> ${after.toFixed(1)} LUFS, puncak ${(20 * Math.log10(peak)).toFixed(1)} dBFS`);
console.log('-> audio/musik.wav, audio/sfx.wav, audio/mix.wav');
