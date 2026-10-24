// Still PNG untuk pengecekan visual -> out/
//   node tools/stills.mjs                 -> satu still per adegan + transisi, skala 2
//   node tools/stills.mjs 60 135 300      -> frame tertentu
//   node tools/stills.mjs --scale 4 449   -> ukuran final 1080x1920
//   node tools/stills.mjs --sheet         -> contact sheet seluruh film (tiap 15 frame)
import fs from 'node:fs';
import path from 'node:path';
import { openPage, png, ROOT } from './page.mjs';

const args = process.argv.slice(2);
let scale = 2, sheet = false;
const frames = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scale') scale = +args[++i];
  else if (args[i] === '--sheet') sheet = true;
  else frames.push(+args[i]);
}
// default: tengah tiap adegan + titik transisi + frame terakhir
const DEFAULT = [60, 100, 118, 180, 228, 238, 300, 345, 390, 420, 449];

const out = path.join(ROOT, 'out');
fs.mkdirSync(out, { recursive: true });
const { browser, page, errors, TL } = await openPage();

if (sheet) {
  const list = [];
  for (let f = 0; f < TL.FRAMES; f += 15) list.push(f);
  list.push(TL.FRAMES - 1);
  const data = await page.evaluate((list) => {
    const { W, H } = TL, cols = 8, rows = Math.ceil(list.length / cols), pad = 4, lab = 12;
    const sh = document.createElement('canvas');
    sh.width = cols * (W + pad) + pad; sh.height = rows * (H + pad + lab) + pad;
    const c = sh.getContext('2d'); c.fillStyle = '#222'; c.fillRect(0, 0, sh.width, sh.height);
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    list.forEach((f, i) => {
      paintFrame(src.getContext('2d'), f / TL.FPS);
      const x = pad + (i % cols) * (W + pad), y = pad + Math.floor(i / cols) * (H + pad + lab);
      c.drawImage(src, x, y + lab);
      c.fillStyle = '#ddd'; c.font = '10px monospace'; c.fillText('f' + f + '  ' + (f / TL.FPS).toFixed(2) + 's', x + 2, y + 9);
    });
    return sh.toDataURL('image/png');
  }, list);
  fs.writeFileSync(path.join(out, 'contact-sheet.png'), Buffer.from(data.split(',')[1], 'base64'));
  console.log('out/contact-sheet.png');
} else {
  for (const f of frames.length ? frames : DEFAULT) {
    const file = path.join(out, `still-f${String(f).padStart(3, '0')}.png`);
    fs.writeFileSync(file, await png(page, f, scale));
    console.log(path.relative(ROOT, file));
  }
}
await browser.close();
if (errors.length) { console.error('ERROR halaman:\n' + errors.join('\n')); process.exit(1); }
