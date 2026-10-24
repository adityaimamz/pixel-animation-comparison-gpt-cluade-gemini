// S2 (4-8 s): di dalam gerbong. Penumpang kecil + kucing di depan jendela, hujan di kaca.
// Hujan hanya di luar kaca; di dalam kabin kering dan hangat.
(function (root) {
  'use strict';
  const { R, hash, C, px, rect, disc, ellipse, tri, line, shade, sprite, finish, blit, lerp } = root.PX;
  const { skyIdx, skyVal, makeClouds, CLOUD, drawCloud, rain } = root.K;
  const TL = root.TL;

  // kaca jendela (koordinat layar penuh)
  const G = { x: 27, y: 53, w: 217, h: 241 };
  const HZ = 205; // cakrawala di luar jendela
  const CL = makeClouds(12, 5, 20, 260, 66, 120);

  const col = {
    hill: C('#121a33'), hillTop: C('#1c2647'), town: C('#f0b060'), townDim: C('#a86a34'),
    tree: C('#0b131b'), near: C('#080d12'), nearHi: C('#111a20'),
    pole: C('#060609'), wire: C('#050508'),
    rain: C('#4d5c86'), rainNear: C('#6d7ca6'),
    bead: C('#3c4a70'), drop: C('#8796c2'), dropHi: C('#d6e0fb'), dropLo: C('#2a3152'), trail: C('#56658f'),
    glare: C('#5a6690'),
    ceil: C('#24150f'), wallUp: C('#6b4a35'), wallLit: C('#8a6244'), wall: C('#57392a'), wallLo: C('#43291e'),
    panel: C('#4a2f22'), panelHi: C('#6e4a34'),
    frame: C('#3d2417'), frameHi: C('#9a6a42'), frameLo: C('#24140c'), bolt: C('#c99a52'),
    sill: C('#7d5235'), sillTop: C('#b07c50'), sillHi: C('#d39c66'), sillLo: C('#4c2f1f'),
    brass: C('#c99a45'), brassHi: C('#f0cf7a'), bulb: C('#fff3c4'), glow: C('#a9784c'),
    rack: C('#b08850'), rackLo: C('#5a3b22'),
    case: C('#7d4b2b'), caseHi: C('#a5683a'), caseLo: C('#4e2c18'), strap: C('#2c180e'),
    seat: C('#6e2b31'), seatHi: C('#8e3a3e'), seatLo: C('#4f1d23'), seatBtn: C('#3a1418'),
    seatWood: C('#3a2318'), seatWoodHi: C('#7a4d30'),
    floor: C('#1e1414'), floorHi: C('#3a2620'),
    umb: C('#2d4f6b'), umbHi: C('#4a7896'), umbLo: C('#1b3246'), umbHandle: C('#c99a52'), wet: C('#5c78a0'),
  };

  // ---------- sprite penumpang (tampak belakang 3/4, menoleh ke jendela) ----------
  const OUT = C('#1a0f0c');
  const pal = {
    bean: C('#b8433e'), beanHi: C('#dd6a52'), fold: C('#8a2c2d'), pom: C('#eadcc4'),
    hair: C('#3b2620'), hairHi: C('#5c3d2e'), skin: C('#dba27c'), skinLo: C('#b67c5c'),
    coat: C('#e0a238'), coatHi: C('#f6c866'), coatLo: C('#b37628'), seam: C('#8e5a1c'),
    scarf: C('#3f7f7a'), scarfHi: C('#64aaa0'),
  };
  const passenger = finish(sprite(34, 74, () => {
    // jas hujan: makin lebar ke bawah
    for (let y = 26; y < 74; y++) {
      const k = Math.min(1, (y - 26) / 9);
      const hw = R(7 + 8 * Math.sqrt(k) + Math.max(0, y - 50) * 0.08);
      rect(17 - hw, y, hw * 2 + 1, 1, pal.coat);
      rect(17 + hw - 2, y, 3, 1, pal.coatLo);
    }
    // lengan (lipatan di sisi) + tudung jas
    line(5, 40, 7, 66, pal.coatLo);
    line(28, 40, 26, 66, pal.coatLo);
    rect(17, 36, 1, 38, pal.seam);
    ellipse(16, 28, 9, 4, pal.coatLo);
    // syal
    ellipse(17, 24, 8, 3, pal.scarf);
    rect(10, 25, 3, 10, pal.scarf);
    rect(10, 25, 1, 10, pal.scarfHi);
    // kepala
    ellipse(17, 14, 9, 9, pal.hair);
    ellipse(13, 12, 3, 4, pal.hairHi, 0.5);
    ellipse(25, 16, 2, 3, pal.skin);
    px(26, 18, pal.skinLo); px(25, 19, pal.skinLo);
    // kupluk
    for (let y = 2; y < 11; y++) {
      const k = 1 - Math.pow((10.5 - y) / 9.5, 2);
      const hw = R(10 * Math.sqrt(Math.max(0, k)));
      rect(17 - hw, y, hw * 2 + 1, 1, pal.bean);
    }
    rect(7, 9, 21, 3, pal.fold);
    for (let x = 8; x < 28; x += 3) rect(x, 9, 1, 3, pal.bean);
    disc(17, 1, 2, pal.pom);
  }), OUT, new Map([[pal.bean, pal.beanHi], [pal.coat, pal.coatHi], [pal.hair, pal.hairHi], [pal.scarf, pal.scarfHi]]), null);

  // ---------- sprite kucing (tampak samping menghadap kanan, duduk) ----------
  const cp = {
    fur: C('#d98a3d'), furHi: C('#f2ae5e'), furLo: C('#a8602a'), stripe: C('#9c5422'),
    cream: C('#f3dfbf'), eye: C('#a8d86a'), pupil: C('#1d2410'), nose: C('#e27f7f'), ear: C('#e9a3a0'),
  };
  function catSprite(closed) {
    return finish(sprite(38, 38, () => {
      ellipse(12, 27, 9, 9, cp.fur);          // pinggul
      ellipse(18, 22, 7, 10, cp.fur);         // badan
      ellipse(23, 11, 7, 6, cp.fur);          // kepala
      tri(16, 8, 22, 6, 18, -1, cp.fur);      // telinga belakang
      tri(23, 6, 29, 8, 27, -1, cp.fur);      // telinga depan
      tri(24, 6, 28, 7, 27, 1, cp.ear);
      ellipse(29, 13, 3, 2, cp.cream);        // moncong
      ellipse(23, 21, 3, 6, cp.cream);        // dada
      rect(20, 26, 3, 10, cp.fur); rect(24, 26, 3, 10, cp.fur); // kaki depan
      rect(20, 35, 3, 1, cp.cream); rect(24, 35, 3, 1, cp.cream);
      rect(24, 26, 1, 9, cp.furLo);
      // belang
      for (const [x, y, w] of [[19, 7, 3], [17, 10, 2], [8, 22, 4], [7, 26, 5], [9, 30, 4], [14, 15, 3]]) rect(x, y, w, 1, cp.stripe);
      px(32, 12, cp.nose);
      px(31, 15, cp.furLo); px(30, 15, cp.furLo);
      if (closed) { rect(24, 10, 3, 1, cp.pupil); }
      else { rect(24, 9, 3, 2, cp.eye); rect(26, 9, 1, 2, cp.pupil); px(24, 9, cp.cream); }
    }), OUT, new Map([[cp.fur, cp.furHi]]), new Map([[cp.fur, cp.furLo]]));
  }
  const CAT_OPEN = catSprite(false), CAT_SHUT = catSprite(true);
  const CAT = { x: 162, y: 264 }; // kucing duduk di ambang jendela (ambang y=300)

  // ---------- luar jendela ----------
  const hillY = (x) => R(196 - 10 * Math.sin(x * 0.02 + 0.3) - 6 * Math.sin(x * 0.047 + 1.7));
  function outside(t, o) {
    shade(G.x, G.y, G.w, G.h, (lx, ly, sx, sy) => skyIdx(skyVal(lx, ly - 40, 0, HZ - 40, 0), sx, sy));
    for (const cl of CL) {
      const x = ((((cl.x - o * 0.03 + 60) % 360) + 360) % 360) - 60;
      drawCloud(cl, x - cl.x, 0, CLOUD[0]);
    }
    // bukit jauh + lampu desa
    const oh = o * 0.08;
    for (let x = G.x; x < G.x + G.w; x++) { const y = hillY(x + oh); rect(x, y, 1, 250 - y, col.hill); px(x, y, col.hillTop); }
    for (let k = Math.floor(oh / 8) - 1; k < Math.floor(oh / 8) + 36; k++) {
      if (hash(k, 121) > 0.3) continue;
      const wx = k * 8 + R(hash(k, 122) * 5);
      const x = R(wx - oh), y = hillY(wx) + 3 + R(hash(k, 123) * 16);
      px(x, y, hash(k, 124) < 0.5 ? col.town : col.townDim);
    }
    // pepohonan sedang
    const ot = o * 0.45;
    rect(G.x, 228, G.w, 30, col.tree);
    for (let k = Math.floor(ot / 9) - 2; k < Math.floor(ot / 9) + 30; k++) {
      const x = R(k * 9 + hash(k, 131) * 5 - ot), h = 8 + R(hash(k, 132) * 16);
      if (hash(k, 133) < 0.6) tri(x - R(h * 0.35), 230, x + R(h * 0.35), 230, x, 230 - h, col.tree);
      else ellipse(x, 230 - R(h * 0.5), R(h * 0.4), R(h * 0.45), col.tree);
    }
    rain(t, { n: 160, seed: 300, slope: -1.25, speed: 420, len: 5, col: col.rain, shift: o * 0.8, inten: 1 });
    // tanah dekat
    const on = o * 1.3;
    rect(G.x, 252, G.w, 42, col.near);
    for (let k = Math.floor(on / 4) - 1; k < Math.floor(on / 4) + 60; k++) {
      const h = 1 + R(hash(k, 141) * 4);
      rect(R(k * 4 - on), 252 - h, 2, h, col.near);
      if (hash(k, 142) < 0.15) rect(R(k * 4 - on), 262 + R(hash(k, 143) * 24), 4, 1, col.nearHi);
    }
    // tiang listrik melintas cepat
    const op = o * 2.6, sp = 300;
    const xs = [];
    for (let k = Math.floor(op / sp) - 1; k < Math.floor(op / sp) + 3; k++) xs.push(R(k * sp + 120 - op));
    for (let i = 0; i < xs.length - 1; i++) {
      for (const dy of [0, 6]) for (let x = xs[i]; x <= xs[i + 1]; x++) {
        const u = (x - xs[i]) / (xs[i + 1] - xs[i]);
        px(x, R(76 + dy + 26 * 4 * u * (1 - u)), col.wire);
      }
    }
    for (const x of xs) { rect(x - 3, 66, 7, 228, col.pole); rect(x - 18, 74, 37, 3, col.pole); }
    rain(t, { n: 90, seed: 310, slope: -1.6, speed: 640, len: 8, col: col.rainNear, shift: o * 1.4, inten: 1 });
  }

  // ---------- tetes air di kaca ----------
  // map(x, y) -> [x, y]: dipakai transisi untuk memindahkan tetes bersama kaca
  function glass(t, map) {
    const M = map || ((x, y) => [x, y]);
    // butir diam
    for (let i = 0; i < 70; i++) {
      const [x, y] = M(G.x + 2 + R(hash(i, 151) * (G.w - 4)), G.y + 2 + R(hash(i, 152) * (G.h - 4)));
      px(x, y, col.bead);
      if (hash(i, 153) < 0.35) px(x, y - 1, col.trail);
    }
    // tetes yang menempel, membesar, lalu meluncur
    for (let i = 0; i < 24; i++) {
      const P = 2.0 + hash(i, 161) * 1.6;
      const c = t + hash(i, 162) * P;
      const cyc = Math.floor(c / P), lt = c - cyc * P;
      const s = i * 97 + cyc;
      const x0 = G.x + 8 + R(hash(s, 163) * (G.w - 16));
      const y0 = G.y + 6 + R(hash(s, 164) * 120);
      const big = hash(s, 165) < 0.5;
      const hold = P * 0.45;
      const m = Math.max(0, lt - hold);
      const dist = R(m * 24 + m * m * 70);
      const path = (k) => [x0 - R(k * 0.42 + Math.sin(k * 0.21 + i) * 1.5), y0 + k];
      for (let k = 2; k < dist; k += 2) {
        if (hash(s * 131 + k, 166) < 0.55) { const [tx, ty] = path(k - 2); const [mx, my] = M(tx, ty); px(mx, my, col.trail); }
      }
      const [dx, dy] = path(dist);
      if (dy > G.y + G.h - 4) continue;
      const [x, y] = M(dx, dy);
      if (big) {
        rect(x, y, 2, 3, col.drop);
        px(x, y, col.dropHi);
        rect(x, y + 3, 2, 1, col.dropLo);
      } else {
        px(x, y, col.dropHi); px(x, y + 1, col.drop); px(x + 1, y + 1, col.dropLo);
      }
    }
  }

  // ---------- ruang kabin (semua kecuali kaca + bingkai) ----------
  function room() {
    rect(0, 0, TL.W, 16, col.ceil);
    rect(0, 16, TL.W, 30, col.wallUp);
    ellipse(135, 22, 70, 20, col.wallLit, 0.55);
    ellipse(135, 20, 40, 12, col.wallLit);
    rect(0, 15, TL.W, 1, col.wallLo);
    // lampu
    rect(124, 12, 23, 3, col.brass);
    rect(124, 12, 23, 1, col.brassHi);
    ellipse(135, 18, 7, 3, col.brass);
    rect(129, 16, 13, 1, col.brassHi);
    rect(132, 21, 7, 2, col.bulb);
    ellipse(135, 24, 14, 4, col.glow, 0.3);
    // rak bagasi + koper
    rect(36, 18, 48, 17, col.case);
    rect(36, 18, 48, 1, col.caseHi);
    rect(36, 34, 48, 1, col.caseLo);
    rect(48, 18, 3, 17, col.strap); rect(70, 18, 3, 17, col.strap);
    rect(56, 15, 10, 3, col.strap);
    rect(184, 24, 30, 11, col.caseLo); rect(184, 24, 30, 1, col.case);
    rect(14, 35, 242, 2, col.rack);
    rect(14, 37, 242, 1, col.rackLo);
    for (const x of [16, 134, 252]) rect(x, 37, 2, 7, col.rackLo);
    // dinding samping
    rect(0, 46, 20, 263, col.wall);
    rect(250, 46, 20, 263, col.wall);
    rect(6, 52, 1, 240, col.wallLo); rect(263, 52, 1, 240, col.wallLo);
    // ambang + dinding bawah + panel
    rect(0, 309, TL.W, TL.H - 309, col.panel);
    for (let x = 10; x < TL.W; x += 50) { rect(x, 316, 40, 1, col.panelHi); rect(x, 316, 1, 120, col.panelHi); rect(x, 436, 40, 1, col.wallLo); rect(x + 40, 316, 1, 121, col.wallLo); }
    rect(14, 300, 242, 9, col.sill);
    rect(14, 300, 242, 2, col.sillTop);
    rect(14, 300, 242, 1, col.sillHi);
    rect(14, 308, 242, 1, col.sillLo);
  }

  // bingkai kayu di sekeliling kaca (r = persegi kaca)
  function frame(r) {
    const { x, y, w, h } = r, b = 7;
    rect(x - b, y - b, w + 2 * b, b, col.frame);
    rect(x - b, y + h, w + 2 * b, b - 1, col.frame);
    rect(x - b, y, b, h, col.frame);
    rect(x + w, y, b, h, col.frame);
    rect(x - b, y - b, w + 2 * b, 1, col.frameHi);
    rect(x - b, y - b, 1, h + 2 * b - 1, col.frameHi);
    rect(x - 1, y - 1, w + 2, 1, col.frameLo);
    rect(x - 1, y - 1, 1, h + 2, col.frameLo);
    rect(x + w, y, 1, h, col.frameHi);
    rect(x, y + h, w, 1, col.frameHi);
    for (const [bx, by] of [[x - 4, y - 4], [x + w + 3, y - 4], [x - 4, y + h + 2], [x + w + 3, y + h + 2]]) px(bx, by, col.bolt);
    // sudut kaca membulat
    for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) px(cx, cy, col.frameLo);
  }

  // ekor kucing: rantai piksel yang bergoyang pelan, menjuntai dari ambang
  function tail(t, ox, oy) {
    const pts = [];
    let x = ox, y = oy, a = Math.PI * 0.62;
    for (let s = 0; s < 18; s++) {
      a += 0.05 + Math.sin(t * 1.9 - s * 0.22) * 0.06 * (s / 18);
      if (s > 12) a -= 0.16; // ujung melengkung
      x += Math.cos(a) * 1.6; y += Math.sin(a) * 1.6;
      pts.push([R(x), R(y)]);
    }
    for (const [px_, py] of pts) disc(px_, py, 2, OUT);
    pts.forEach(([px_, py], i) => disc(px_, py, 1, i > 14 ? cp.stripe : (i % 5 === 2 ? cp.furLo : cp.fur)));
  }

  function blinkClosed(t) {
    for (const b of TL.blinks) if (t >= b && t < b + 0.13) return true;
    return false;
  }

  function figures(t) {
    // kucing di ambang
    blit(blinkClosed(t) ? CAT_SHUT : CAT_OPEN, CAT.x, CAT.y);
    tail(t, CAT.x + 6, 299);
    // penumpang di balik sandaran
    blit(passenger, 50, 262);
    // sandaran kursi
    rect(6, 330, 258, 6, col.seatWood);
    rect(6, 330, 258, 1, col.seatWoodHi);
    rect(10, 336, 250, 100, col.seat);
    rect(10, 336, 250, 1, col.seatHi);
    for (let y = 352; y < 436; y += 22) for (let x = 26 + ((y / 22) % 2) * 16; x < 255; x += 32) {
      px(x, y, col.seatBtn); px(x + 1, y, col.seatBtn);
      rect(x - 8, y - 6, 1, 1, col.seatHi);
    }
    rect(10, 430, 250, 6, col.seatLo);
    rect(6, 336, 4, 100, col.seatWood); rect(260, 336, 4, 100, col.seatWood);
    rect(0, 436, TL.W, TL.H - 436, col.floor);
    rect(0, 436, TL.W, 1, col.floorHi);
    for (let x = 0; x < TL.W; x += 26) rect(x, 437, 1, 43, col.seatWood);
    // payung basah bersandar, menetes ke lantai
    line(206, 360, 226, 466, col.umbLo);
    for (let k = 0; k < 9; k++) {
      const yy = 372 + k * 9;
      ellipse(209 + R((yy - 360) * 0.19), yy, 4, 5, k % 2 ? col.umb : col.umbLo);
    }
    line(210, 366, 224, 440, col.umbHi);
    line(206, 360, 205, 352, col.umbHandle);
    rect(201, 350, 5, 2, col.umbHandle);
    px(201, 352, col.umbHandle); px(201, 353, col.umbHandle);
    ellipse(228, 472, 9, 1, col.wet);
    const dt = (t * 1.3) % 1;
    if (dt < 0.55) px(226, R(460 + dt * 20), col.wet);
    else { const r = R((dt - 0.55) * 18); ellipse(228, 472, 3 + r, 1, col.drop, 0.5); }
  }

  // getaran halus tiap ketukan rel
  let CLK = null;
  function jolt(t) {
    if (!CLK) CLK = TL.clacks().map((e) => e.t);
    for (const c of CLK) if (t >= c && t < c + 0.067) return 1;
    return 0;
  }

  function draw(t) {
    const o = TL.out2X(t);
    const j = jolt(t);
    root.PX.save(); root.PX.shift(0, j);
    root.PX.save(); root.PX.clip(G.x, G.y, G.w, G.h);
    outside(t, o);
    glass(t);
    root.PX.restore();
    room();
    frame(G);
    figures(t);
    root.PX.restore();
    if (j) rect(0, 0, TL.W, 1, col.ceil);
  }

  root.S2 = { draw, outside, glass, room, frame, figures, G, col };
})(typeof globalThis !== 'undefined' ? globalThis : this);
