// Render frame demi frame (Playwright, Chromium headless) -> ffmpeg -> output.mp4
//   node tools/render.mjs            -> output.mp4 (1080x1920, 30 fps, 450 frame, + audio/mix.wav)
//   node tools/render.mjs --test 30  -> uji pipa: 30 frame dienkode ke null (tanpa file)
// Gambar dikirim mentah 270x480 lalu diperbesar 4x oleh ffmpeg dengan nearest-neighbor.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openPage, rgba, ROOT } from './page.mjs';

const ti = process.argv.indexOf('--test');
const test = ti > 0 ? +(process.argv[ti + 1] || 30) : 0;
const out = path.join(ROOT, 'output.mp4');
const wav = path.join(ROOT, 'audio', 'mix.wav');
if (!fs.existsSync(wav)) { console.error('audio/mix.wav belum ada: jalankan dulu  node tools/audio.mjs'); process.exit(1); }

const { browser, page, errors, TL } = await openPage();
const frames = test || TL.FRAMES;
const W = TL.W * TL.SCALE, H = TL.H * TL.SCALE;

const args = [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${TL.W}x${TL.H}`, '-framerate', String(TL.FPS), '-i', 'pipe:0',
  '-i', wav,
  '-map', '0:v', '-map', '1:a',
  '-vf', `scale=${W}:${H}:flags=neighbor,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-tune', 'animation',
  '-c:a', 'aac', '-b:a', '256k',
  '-t', String(frames / TL.FPS),
  '-movflags', '+faststart',
  ...(test ? ['-f', 'null', '-'] : [out]),
];
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg keluar dengan kode ' + c)))));

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const buf = await rgba(page, f);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 30 === 29 || f === frames - 1) process.stdout.write(`\rframe ${f + 1}/${frames}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
ff.stdin.end();
await done;
await browser.close();
console.log();
if (errors.length) { console.error('ERROR halaman:\n' + errors.join('\n')); process.exit(1); }
console.log(test ? `uji pipa OK: ${frames} frame terenkode` : `selesai -> ${path.relative(ROOT, out)}`);
