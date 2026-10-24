// Rasterizer piksel sendiri di atas Uint32Array 270x480.
// Semua koordinat dibulatkan, tanpa anti-aliasing, tanpa alpha: satu piksel = satu warna.
(function (root) {
  'use strict';
  const TL = root.TL;
  const W = TL.W, H = TL.H;
  const FB = new Uint32Array(W * H);
  const R = Math.round;

  // ---------- acak berbasis seed (tanpa Math.random) ----------
  function hash(i, s) {
    let h = (Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(((s | 0) + 0x9e3779b9) | 0, 0x165667b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // '#rrggbb' -> ABGR (urutan byte ImageData little-endian)
  function C(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
  }

  // ---------- state: target, geser, klip ----------
  let BUF = FB, BW = W, BH = H;
  let OX = 0, OY = 0, X0 = 0, Y0 = 0, X1 = W, Y1 = H;
  const ST = [];
  function save() { ST.push([OX, OY, X0, Y0, X1, Y1]); }
  function restore() { const s = ST.pop(); OX = s[0]; OY = s[1]; X0 = s[2]; Y0 = s[3]; X1 = s[4]; Y1 = s[5]; }
  function shift(dx, dy) { OX += R(dx); OY += R(dy); }
  function clip(x, y, w, h) {
    const xa = R(x) + OX, ya = R(y) + OY, xb = xa + R(w), yb = ya + R(h);
    X0 = Math.max(X0, xa); Y0 = Math.max(Y0, ya);
    X1 = Math.min(X1, xb); Y1 = Math.min(Y1, yb);
  }

  // ordered dither Bayer 4x4, dipatok ke koordinat layar
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (sx, sy) => (BAY[((sy & 3) << 2) | (sx & 3)] + 0.5) / 16;

  function px(x, y, c, lv) {
    x = R(x) + OX; y = R(y) + OY;
    if (x < X0 || y < Y0 || x >= X1 || y >= Y1) return;
    if (lv !== undefined && bay(x, y) >= lv) return;
    BUF[y * BW + x] = c;
  }
  function get(x, y) {
    x = R(x) + OX; y = R(y) + OY;
    if (x < 0 || y < 0 || x >= BW || y >= BH) return 0;
    return BUF[y * BW + x];
  }

  function rect(x, y, w, h, c, lv) {
    let xa = R(x) + OX, ya = R(y) + OY;
    let xb = xa + R(w), yb = ya + R(h);
    if (xa < X0) xa = X0; if (ya < Y0) ya = Y0;
    if (xb > X1) xb = X1; if (yb > Y1) yb = Y1;
    if (lv === undefined || lv >= 1) {
      for (let yy = ya; yy < yb; yy++) BUF.fill(c, yy * BW + xa, yy * BW + Math.max(xa, xb));
      return;
    }
    if (lv <= 0) return;
    for (let yy = ya; yy < yb; yy++)
      for (let xx = xa; xx < xb; xx++) if (bay(xx, yy) < lv) BUF[yy * BW + xx] = c;
  }

  function span(y, xa, xb, c, lv) { rect(xa, y, xb - xa + 1, 1, c, lv); }

  function ellipse(cx, cy, rx, ry, c, lv) {
    cx = R(cx); cy = R(cy); rx = Math.max(0, R(rx)); ry = Math.max(0, R(ry));
    const k = (ry + 0.5) * (ry + 0.5);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / k)) + 0.5);
      span(cy + dy, cx - hw, cx + hw, c, lv);
    }
  }
  const disc = (cx, cy, r, c, lv) => ellipse(cx, cy, r, r, c, lv);

  function tri(ax, ay, bx, by, cx, cy, c, lv) {
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    const e = (x0, y0, x1, y1, x, y) => (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
    const area = e(ax, ay, bx, by, cx, cy);
    if (area === 0) return;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      const w0 = e(bx, by, cx, cy, qx, qy) / area, w1 = e(cx, cy, ax, ay, qx, qy) / area, w2 = e(ax, ay, bx, by, qx, qy) / area;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) px(x, y, c, lv);
    }
  }

  // Bresenham; cb(x, y) opsional untuk mewarnai per piksel
  function line(x0, y0, x1, y1, c, cb) {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 2000; n++) {
      if (cb) { const k = cb(x0, y0); if (k) px(x0, y0, k); } else px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // isi area per piksel: fn(lx, ly, sx, sy) -> warna atau 0
  function shade(x, y, w, h, fn) {
    let xa = R(x) + OX, ya = R(y) + OY, xb = xa + R(w), yb = ya + R(h);
    if (xa < X0) xa = X0; if (ya < Y0) ya = Y0;
    if (xb > X1) xb = X1; if (yb > Y1) yb = Y1;
    for (let sy = ya; sy < yb; sy++) for (let sx = xa; sx < xb; sx++) {
      const c = fn(sx - OX, sy - OY, sx, sy);
      if (c) BUF[sy * BW + sx] = c;
    }
  }

  // ---------- sprite: digambar dengan primitif yang sama, lalu diberi garis tepi ----------
  function sprite(w, h, draw) {
    const s = { w, h, d: new Uint32Array(w * h) };
    const keep = [BUF, BW, BH, OX, OY, X0, Y0, X1, Y1];
    BUF = s.d; BW = w; BH = h; OX = 0; OY = 0; X0 = 0; Y0 = 0; X1 = w; Y1 = h;
    draw();
    [BUF, BW, BH, OX, OY, X0, Y0, X1, Y1] = keep;
    return s;
  }
  // outline: warna tepi luar (4-tetangga); top/low: Map warna -> warna untuk piksel yang atas/bawahnya kosong
  function finish(s, outline, top, low) {
    const { w, h, d } = s, src = d.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = src[i];
      if (c) {
        if (top && !at(x, y - 1) && top.has(c)) d[i] = top.get(c);
        else if (low && !at(x, y + 1) && low.has(c)) d[i] = low.get(c);
      } else if (outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) d[i] = outline;
    }
    return s;
  }
  function blit(s, x, y) {
    x = R(x); y = R(y);
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + i];
      if (c) px(x + i, y + j, c);
    }
  }

  const E = {
    inOut: (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    in: (u) => u * u * u,
    out: (u) => 1 - Math.pow(1 - u, 3),
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const u01 = (a, b, t) => TL.clamp((t - a) / (b - a), 0, 1);

  root.PX = { W, H, FB, R, hash, C, save, restore, shift, clip, bay, px, get, rect, span, ellipse, disc, tri, line, shade, sprite, finish, blit, E, lerp, u01 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
