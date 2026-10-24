// Pemeriksaan otomatis tanpa menonton:
//  - tidak ada error di halaman
//  - 450 frame = 15,000 s; audio/mix.wav = 15,000 s
//  - deterministik: frame yang sama dirender dua kali hasilnya identik
//  - tidak ada frame kosong / satu warna, tidak ada lonjakan terang tak disengaja
//  - teks "SAMPAI" + ikon di dalam layar (bukan terpotong)
//  - bila output.mp4 sudah ada: durasi, resolusi, jumlah frame
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openPage, rgba, ROOT } from './page.mjs';

const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'GAGAL') + '  ' + msg); if (!cond) fails.push(msg); };

const { browser, page, errors, TL } = await openPage();
ok(TL.FRAMES === 450 && TL.FRAMES / TL.FPS === 15, `${TL.FRAMES} frame @ ${TL.FPS} fps = ${(TL.FRAMES / TL.FPS).toFixed(3)} s`);

// determinisme
let same = true;
for (const f of [0, 78, 130, 250, 405, 449]) {
  const a = crypto.createHash('md5').update(await rgba(page, f)).digest('hex');
  await rgba(page, (f + 37) % 450);
  const b = crypto.createHash('md5').update(await rgba(page, f)).digest('hex');
  if (a !== b) same = false;
}
ok(same, 'deterministik (frame dirender ulang identik)');

// luma per frame
const luma = [], uniq = [];
for (let f = 0; f < TL.FRAMES; f++) {
  const b = await rgba(page, f);
  let s = 0;
  const seen = new Set();
  for (let i = 0; i < b.length; i += 4) {
    s += 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
    if ((i & 1023) === 0) seen.add((b[i] << 16) | (b[i + 1] << 8) | b[i + 2]);
  }
  luma.push(s / (b.length / 4));
  uniq.push(seen.size);
}
const blank = uniq.map((u, f) => [u, f]).filter(([u]) => u < 8).map(([, f]) => f);
ok(blank.length === 0, `tidak ada frame kosong/satu warna${blank.length ? ' -> ' + blank.join(',') : ''}`);
const flashF = Math.round(TL.flash[0] * TL.FPS);
const allowed = new Set([flashF, flashF + 1, flashF + 2, flashF + 3, flashF + 4]);
const jumps = [];
for (let f = 1; f < TL.FRAMES; f++) {
  const d = luma[f] - luma[f - 1];
  if (Math.abs(d) > 6 && !allowed.has(f)) jumps.push(`f${f} (${d.toFixed(1)})`);
}
ok(jumps.length === 0, `tidak ada lonjakan terang antar frame selain kilat yang disengaja${jumps.length ? ' -> ' + jumps.join(', ') : ''}`);
const fl = Math.max(...[...allowed].map((f) => Math.abs(luma[f] - luma[f - 1])));
console.log(`      kilat f${flashF}: perubahan luma maks ${fl.toFixed(1)} (skala 0-255)`);

// teks + ikon di dalam layar dan area aman 16 px
const box = await page.evaluate(() => {
  const w = TEXT.layout(TL.text);
  return { x0: Math.round(135 - w / 2), x1: Math.round(135 - w / 2) + w, y0: 74, y1: 74 + 25, iy1: 106 + 25 };
});
ok(box.x0 >= 16 && box.x1 <= TL.W - 16 && box.y0 >= 16 && box.iy1 < TL.H, `teks "SAMPAI" + ikon di dalam layar: x ${box.x0}-${box.x1} dari ${TL.W}, y ${box.y0}-${box.iy1}`);

// kereta utuh di frame akhir: tepi kiri gerbong belakang s/d moncong
const fx = await page.evaluate(() => Math.round(TL.front2 + TL.trainD(TL.DUR) - TL.cam2X(TL.DUR)));
ok(fx - 248 >= 0 && fx + 1 < TL.W, `kereta utuh di frame akhir: x ${fx - 248}..${fx + 1}`);
await browser.close();
ok(errors.length === 0, 'tanpa error di halaman' + (errors.length ? ': ' + errors.join(' | ') : ''));

// audio
const probe = (file, extra) => execFileSync('ffprobe', ['-v', 'error', ...extra, '-of', 'default=nw=1', file], { encoding: 'utf8' }).trim();
const wav = path.join(ROOT, 'audio', 'mix.wav');
if (fs.existsSync(wav)) {
  const d = +probe(wav, ['-show_entries', 'format=duration']).split('=')[1];
  ok(Math.abs(d - 15) < 0.001, `audio/mix.wav = ${d.toFixed(3)} s`);
} else ok(false, 'audio/mix.wav belum ada (node tools/audio.mjs)');

// video (setelah user render)
const mp4 = path.join(ROOT, 'output.mp4');
if (fs.existsSync(mp4)) {
  const v = probe(mp4, ['-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate']);
  const fmt = +probe(mp4, ['-show_entries', 'format=duration']).split('=')[1];
  console.log('      output.mp4: ' + v.replace(/\n/g, ', ') + `, durasi ${fmt.toFixed(3)} s`);
  ok(/width=1080/.test(v) && /height=1920/.test(v) && /nb_read_frames=450/.test(v) && Math.abs(fmt - 15) < 0.05, 'output.mp4 1080x1920, 450 frame, 15 s');
} else console.log('      (output.mp4 belum ada: render dengan  npm run render)');

console.log(fails.length ? `\n${fails.length} pemeriksaan GAGAL` : '\nsemua pemeriksaan lolos');
process.exit(fails.length ? 1 : 0);
