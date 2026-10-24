// Huruf piksel "SAMPAI" + ikon matahari.
// Kerangka 5x7 dijabarkan ke grid 3x3 per sel, lalu sambungan diagonal diisi, sudut cembung
// dipangkas, dan diberi garis tepi, sorot atas, serta bayangan di grid 1 piksel yang sama.
(function (root) {
  'use strict';
  const { R, C, px, rect, disc, sprite, finish, blit } = root.PX;
  const TL = root.TL;

  const GLYPH = {
    S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  };
  const col = {
    fill: C('#fff1d2'), top: C('#ffffff'), low: C('#f2c48a'), out: C('#2a1430'), shadow: C('#1a0c22'),
    sun: C('#ffd25a'), sunHi: C('#fff3b8'), sunLo: C('#f0a040'),
  };

  function mask(rows) {
    const gw = rows[0].length, gh = rows.length, S = 3;
    const w = gw * S, h = gh * S;
    const m = new Uint8Array(w * h);
    const on = (c, r) => r >= 0 && c >= 0 && r < gh && c < gw && rows[r][c] === '#';
    const set = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) m[y * w + x] = 1; };
    for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
      if (on(c, r)) for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) set(c * S + i, r * S + j);
      // sambungan diagonal antar sel yang hanya bersentuhan di sudut
      if (on(c, r) && on(c + 1, r + 1) && !on(c + 1, r) && !on(c, r + 1)) {
        set(c * S + 3, r * S + 2); set(c * S + 3, r * S + 1); set(c * S + 4, r * S + 2);
        set(c * S + 2, r * S + 3); set(c * S + 1, r * S + 3); set(c * S + 2, r * S + 4);
      }
      if (on(c, r) && on(c - 1, r + 1) && !on(c - 1, r) && !on(c, r + 1)) {
        set(c * S - 1, r * S + 2); set(c * S - 1, r * S + 1); set(c * S - 2, r * S + 2);
        set(c * S, r * S + 3); set(c * S + 1, r * S + 3); set(c * S, r * S + 4);
      }
    }
    // pangkas sudut cembung
    const src = m.slice();
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      const u = at(x, y - 1), d = at(x, y + 1), l = at(x - 1, y), r = at(x + 1, y);
      if ((!u && !l) || (!u && !r) || (!d && !l) || (!d && !r)) m[y * w + x] = 0;
    }
    return { w, h, m };
  }

  function glyphSprite(ch) {
    const g = mask(GLYPH[ch]);
    const s = sprite(g.w + 2, g.h + 2, () => {
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.m[y * g.w + x]) px(x + 1, y + 1, col.fill);
    });
    finish(s, col.out, new Map([[col.fill, col.top]]), new Map([[col.fill, col.low]]));
    return s;
  }
  const SPR = {};
  for (const ch of Object.keys(GLYPH)) SPR[ch] = glyphSprite(ch);

  function shadowOf(s, x, y) {
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) if (s.d[j * s.w + i]) px(x + i, y + j, col.shadow);
  }

  const GAP = 2;
  function layout(text) {
    let w = 0;
    for (let i = 0; i < text.length; i++) w += SPR[text[i]].w + (i ? GAP : 0);
    return w;
  }

  // n = jumlah huruf yang sudah diketik
  function drawText(text, n, cx, y, cursor) {
    const w = layout(text);
    let x = R(cx - w / 2);
    for (let i = 0; i < n; i++) {
      const s = SPR[text[i]];
      shadowOf(s, x + 1, y + 2);
      blit(s, x, y);
      x += s.w + GAP;
    }
    if (cursor) {
      rect(x, y + 1, 5, 23, col.shadow);
      rect(x, y, 4, 23, col.out);
      rect(x + 1, y + 1, 2, 21, col.fill);
    }
  }

  const SUN = finish(sprite(25, 25, () => {
    const o = 12;
    disc(o, o, 5, col.sun);
    rect(o - 2, o - 3, 3, 2, col.sunHi); px(o - 3, o - 1, col.sunHi);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      for (let k = 8; k <= 10; k++) { px(o + dx * k, o + dy * k, col.sun); px(o + dx * k + dy, o + dy * k + dx, col.sun); }
    }
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 6; k <= 7; k++) px(o + dx * k, o + dy * k, col.sun);
  }), col.out, new Map([[col.sun, col.sunHi]]), new Map([[col.sun, col.sunLo]]));

  function draw(t) {
    if (t < TL.typeStart) return;
    const f = Math.floor(t * TL.FPS + 1e-6);
    const f0 = Math.round(TL.typeStart * TL.FPS);
    const per = Math.round(TL.typeStep * TL.FPS);
    const n = Math.min(TL.text.length, Math.floor((f - f0) / per) + 1);
    const fi = Math.round(TL.sunIcon * TL.FPS);
    const cursor = f < fi && ((f - f0) % 8) < 5;
    drawText(TL.text, n, 135, 74, cursor);
    if (f >= fi && ((f - fi) % 10) < 6) blit(SUN, 135 - 12, 106);
  }

  root.TEXT = { draw, layout, SPR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
