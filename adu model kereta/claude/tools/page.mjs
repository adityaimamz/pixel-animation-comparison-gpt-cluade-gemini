// Membuka index.html di Chromium headless (Playwright) dan memberi akses ke drawFrame(t).
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function openPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 400, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
  await page.waitForFunction(() => typeof window.drawFrame === 'function');
  await page.evaluate(() => {
    // RGBA mentah 270x480 frame f, sebagai base64
    window.__rgba = (f) => {
      const fb = window.drawFrame(f / window.TL.FPS);
      const u8 = new Uint8Array(fb.buffer, fb.byteOffset, fb.byteLength);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    // PNG frame f, diperbesar `scale` kali dengan nearest-neighbor
    window.__png = (f, scale) => {
      const { W, H } = window.TL;
      const src = document.createElement('canvas'); src.width = W; src.height = H;
      window.paintFrame(src.getContext('2d'), f / window.TL.FPS);
      const out = document.createElement('canvas'); out.width = W * scale; out.height = H * scale;
      const c = out.getContext('2d'); c.imageSmoothingEnabled = false;
      c.drawImage(src, 0, 0, W * scale, H * scale);
      return out.toDataURL('image/png');
    };
  });
  const TL = await page.evaluate(() => ({ FPS: TL.FPS, FRAMES: TL.FRAMES, W: TL.W, H: TL.H, SCALE: TL.SCALE, DUR: TL.DUR, flash: TL.flash }));
  return { browser, page, errors, TL };
}

export const rgba = (page, f) => page.evaluate((f) => window.__rgba(f), f).then((b) => Buffer.from(b, 'base64'));
export const png = (page, f, scale) => page.evaluate(([f, s]) => window.__png(f, s), [f, scale])
  .then((d) => Buffer.from(d.split(',')[1], 'base64'));
