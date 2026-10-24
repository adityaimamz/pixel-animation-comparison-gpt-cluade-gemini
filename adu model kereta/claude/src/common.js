// Bahan bersama: langit bertingkat, awan, hujan, roda, asap/uap.
(function (root) {
  'use strict';
  const { R, hash, C, px, rect, disc, ellipse, line, shade, bay, lerp } = root.PX;
  const TL = root.TL;

  // tangga warna langit: malam (0) -> fajar (12). Tidak ada gradien halus:
  // tiap baris memilih satu anak tangga, batasnya didither Bayer.
  const SKY = ['#0a0f24', '#10173a', '#192049', '#25295b', '#382e6a', '#523574', '#723f7b',
    '#974a7a', '#bd5a70', '#de7461', '#f19758', '#fac065', '#ffdf8e'].map(C);

  function skyIdx(v, sx, sy) {
    let i = Math.floor(v);
    const f = v - i;
    if (f > 0.6 && bay(sx, sy) < (f - 0.6) / 0.4) i++;
    return SKY[Math.max(0, Math.min(SKY.length - 1, i))];
  }
  // nilai langit untuk baris ly; p = fajar 0..1; hz = garis cakrawala
  function skyVal(lx, ly, p, hz, flash, sunX, sunY) {
    const u = Math.max(0, Math.min(1, ly / hz));
    const top = lerp(0.3, 4.6, p), bot = lerp(2.2, 11.2, p);
    let v = top + (bot - top) * Math.pow(u, 1.6);
    if (p > 0 && sunX !== undefined) {
      const d = Math.hypot(lx - sunX, (ly - sunY) * 1.35);
      const g = Math.max(0, 1 - d / 120);
      v += p * 2.4 * g * g;
    }
    if (flash) v += flash * 1.4 * (1 - u * 0.6);
    return v;
  }

  // ---------- awan ----------
  function makeClouds(seed, n, x0, x1, y0, y1) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0, x1, (i + hash(i, seed) * 0.8) / n);
      const cy = lerp(y0, y1, hash(i, seed + 1));
      const k = 4 + Math.floor(hash(i, seed + 2) * 4);
      const puffs = [];
      for (let j = 0; j < k; j++) {
        puffs.push({
          dx: R((j - (k - 1) / 2) * 11 + (hash(i * 16 + j, seed + 3) - 0.5) * 8),
          dy: R((hash(i * 16 + j, seed + 4) - 0.5) * 6 - (j > 0 && j < k - 1 ? 4 : 0)),
          r: R(7 + hash(i * 16 + j, seed + 5) * 9),
        });
      }
      out.push({ x: cx, y: cy, puffs, id: i });
    }
    return out;
  }
  // palet awan per anak tangga fajar: [bayangan, badan, tepi terang]
  const CLOUD = [
    ['#0f1430', '#181d40', '#222852'],
    ['#1a1a40', '#28275a', '#36336c'],
    ['#2c2150', '#43306a', '#5c3c78'],
    ['#4a2b5e', '#743d6e', '#a65470'],
    ['#6b3862', '#b65a6c', '#ee9168'],
  ].map((a) => a.map(C));
  const CLOUD_FLASH = ['#2b305a', '#3d4476', '#68709e'].map(C);
  function drawCloud(cl, dx, dy, pal) {
    const x = R(cl.x + dx), y = R(cl.y + dy);
    for (const p of cl.puffs) disc(x + p.dx, y + p.dy + 2, p.r, pal[0]);
    for (const p of cl.puffs) disc(x + p.dx, y + p.dy, p.r, pal[1]);
    for (const p of cl.puffs) if (p.r > 5) disc(x + p.dx - 1, y + p.dy - 2, p.r - 3, pal[2], 0.5);
    for (const p of cl.puffs) if (p.r > 7) disc(x + p.dx - 2, y + p.dy - 3, p.r - 6, pal[2]);
  }

  // ---------- hujan ----------
  // o: n, seed, slope (dx per dy, negatif = turun ke kiri), speed px/s, len, col, shift, inten, lit(x,y)->warna|0
  function rain(t, o) {
    const span = TL.W + 200, fall = TL.H + 60;
    for (let i = 0; i < o.n; i++) {
      if (hash(i, o.seed + 2) >= o.inten) continue;
      const sp = o.speed * (0.85 + hash(i, o.seed + 3) * 0.3);
      const y = ((hash(i, o.seed + 1) * fall + t * sp) % fall) - 30;
      let x = hash(i, o.seed) * span + y * o.slope - o.shift;
      x = ((x % span) + span) % span - 100;
      const len = o.len + (hash(i, o.seed + 4) < 0.3 ? 2 : 0);
      line(x, y, x - len * o.slope, y - len, o.col, o.lit ? (xx, yy) => o.lit(xx, yy) || o.col : null);
    }
  }

  // ---------- roda (berputar sesuai jarak tempuh) ----------
  function wheel(xc, cy, r, d, face, rim, spoke) {
    disc(xc, cy, r, rim);
    disc(xc, cy, r - 1, face);
    const a = d / r;
    if (r >= 5) {
      for (let k = 0; k < 4; k++) {
        const b = a + k * Math.PI / 4;
        line(xc - Math.cos(b) * (r - 2), cy - Math.sin(b) * (r - 2), xc + Math.cos(b) * (r - 2), cy + Math.sin(b) * (r - 2), spoke);
      }
      disc(xc, cy, 1, rim);
    } else {
      px(xc, cy, rim);
      px(xc + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5), spoke);
    }
    return a;
  }

  // ---------- gumpalan asap/uap (ditipiskan dengan dither) ----------
  // cols: [baru, sedang, tua]; makin tua makin dekat ke warna latar, lalu hilang
  function puff(x, y, r, lv, cols, shadeCol) {
    if (lv <= 0.1) return;
    const c = lv > 0.5 ? cols[0] : lv > 0.28 ? cols[1] : cols[2];
    if (shadeCol && lv > 0.28) disc(x + 1, y + 1, r, shadeCol);
    disc(x, y, r, c);
  }

  root.K = { SKY, skyIdx, skyVal, makeClouds, CLOUD, CLOUD_FLASH, drawCloud, rain, wheel, puff };
})(typeof globalThis !== 'undefined' ? globalThis : this);
