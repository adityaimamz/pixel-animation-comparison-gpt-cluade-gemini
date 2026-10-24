// S3 + S4 (8-15 s): satu shot tanpa potong. Kereta di jembatan atas lembah berkabut,
// hujan reda, awan terbelah, matahari naik di antara dua bukit; lalu stasiun kecil masuk
// dari kanan, kereta mengerem dan berhenti.
(function (root) {
  'use strict';
  const { R, hash, C, px, rect, disc, ellipse, tri, line, shade, lerp, E, u01 } = root.PX;
  const { skyIdx, skyVal, makeClouds, CLOUD, drawCloud, rain, puff } = root.K;
  const TL = root.TL;
  const { drawTrain, POINTS, BOGIES } = root.TRAIN;

  const RY = 400;
  const HZ = 330;
  const SUN_X = 140;
  const CL = makeClouds(13, 11, -30, 300, 40, 220);

  const st = (arr) => arr.map(C);
  // palet per anak tangga fajar 0..4
  const MTN = st(['#10172e', '#1b1d3d', '#2a2349', '#3c2a55', '#4d3160']);
  const MTN_RIM = st(['#16203e', '#272a52', '#5a3560', '#9a4c68', '#e07a68']);
  const HILL = st(['#0c1622', '#141b30', '#201e3a', '#2b2342', '#382a49']);
  const HILL_RIM = st(['#121e2c', '#1e2540', '#423050', '#6c3c58', '#a8565e']);
  const VAL = st(['#0a1018', '#101427', '#181830', '#211b36', '#2a1f3b']);
  const MIST = st(['#262d4a', '#3e3e66', '#6a5a88', '#a682a6', '#e2b0b2']);
  const PIER = st(['#272632', '#332f42', '#433850', '#554157', '#694b5d']);
  const PIER_RIM = st(['#323042', '#423a55', '#6a4a62', '#a4646a', '#de8c72']);
  const GIRD = st(['#16161d', '#1e1c28', '#2a2332', '#352938', '#40303e']);
  const GRD = st(['#0d1613', '#151d22', '#222430', '#2c2b34', '#383436']);
  const RIVER = st(['#141c38', '#2a2a55', '#5a3c6c', '#b0646e', '#f2a466']);

  const c = {
    rail: C('#6f7790'), railHi: C('#c9b9a8'), sleeper: C('#2b2220'), ballast: C('#3a3438'),
    sun: C('#ffd36e'), sunCore: C('#fff3c4'), sunRim: C('#f7a14a'),
    rain: C('#6f7aa0'),
    smoke: ['#c4adbb', '#9c86a3', '#7a678e'].map(C), steam: ['#fbf7f2', '#e6dbe0', '#c7b5c6'].map(C), steamLo: C('#a99bb0'),
    // stasiun
    roof: C('#9c4632'), roofHi: C('#d26a4c'), roofLo: C('#6a2a22'), roofLine: C('#7e3428'),
    wall: C('#e8d6b0'), wallLo: C('#b8a080'), trim: C('#5a3a2a'),
    clock: C('#f4ecd8'), hand: C('#2a1a14'),
    leaf: C('#2f5a3a'), leafHi: C('#6d9a52'), leafLo: C('#1d3a28'), trunk: C('#4a3024'),
    plat: C('#8a7a72'), platTop: C('#d8c8b4'), edge: C('#e3b54a'), mortar: C('#6d5f5a'), platLo: C('#4e4246'),
    post: C('#2e3a44'), postHi: C('#5a6a78'), lampOff: C('#c8c0a8'),
    bench: C('#7a4a2e'), benchHi: C('#a8683e'), benchLo: C('#4a2c1c'),
    pot: C('#a0583a'), potHi: C('#c87a50'), flower: C('#f2d36a'), flower2: C('#e86a6a'),
  };

  const step = (p) => Math.max(0, Math.min(4, Math.floor(p * 4 + 0.5)));
  const dawnP = (t) => TL.smooth(TL.dawn[0], TL.dawn[1], t);
  const Cf = () => TL.cam2X(TL.DUR);

  function mountains(C2, s) {
    const o = 0.04 * (C2 - TL.cam2X(11));
    const bump = (x, m, w) => Math.exp(-((x - m) / w) * ((x - m) / w));
    for (let x = 0; x < TL.W; x++) {
      const mx = x + o;
      const y = R(332 - 80 * bump(mx, 26, 80) - 70 * bump(mx, 262, 78) - 5 * Math.sin(mx * 0.09) - 3 * Math.sin(mx * 0.23 + 1));
      rect(x, y, 1, 400 - y, MTN[s]);
      px(x, y, MTN_RIM[s]);
      if (s >= 3) px(x, y + 1, MTN_RIM[s], 0.5);
    }
  }

  function hills(C2, s) {
    const o = 0.18 * C2;
    for (let x = 0; x < TL.W; x++) {
      const hx = x + o;
      const y = R(356 - 12 * Math.sin(hx * 0.013 + 0.7) - 7 * Math.sin(hx * 0.031 + 2.1));
      rect(x, y, 1, 420 - y, HILL[s]);
      px(x, y, HILL_RIM[s]);
    }
  }

  // kabut: pita dither tipis yang hanyut pelan
  function mist(t, y0, h, dens, s, drift, seed) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const sp = drift * (0.6 + hash(i, seed + 1) * 0.8);
      const x = ((hash(i, seed) * 420 + t * sp) % 420) - 75;
      const y = y0 + R(hash(i, seed + 2) * h);
      const rx = R(34 + hash(i, seed + 3) * 44), ry = 2 + R(hash(i, seed + 4) * 2);
      ellipse(x, y, rx, ry, MIST[s], dens * 0.55);
      ellipse(x + 4, y, R(rx * 0.6), Math.max(1, ry - 1), MIST[s], Math.min(1, dens * 1.1));
    }
  }

  function valley(t, s, p) {
    rect(0, 410, TL.W, 70, VAL[s]);
    // sungai di dasar lembah memantulkan langit
    for (let y = 462; y < TL.H; y++) {
      const w = (y + Math.floor(t * 4)) % 3 === 0;
      rect(0, y, TL.W, 1, w ? RIVER[Math.min(4, s + 1)] : RIVER[s]);
    }
    mist(t, 418, 40, 0.2 + 0.6 * p, s, 7, 250);
  }

  function bridge(C2, s, Eb) {
    const x1 = R(Eb - C2);
    if (x1 <= 0) return;
    // pilar batu
    for (let k = Math.floor(C2 / 110) - 1; k < Math.floor(C2 / 110) + 4; k++) {
      const wx = k * 110 + 40;
      if (wx > Eb - 20) continue;
      const x = R(wx - C2);
      for (let y = RY + 22; y < TL.H; y++) {
        const hw = R(7 + (y - RY - 22) * 0.06);
        rect(x - hw, y, hw * 2, 1, PIER[s]);
        px(x + hw - 1, y, PIER_RIM[s]);
        if (y % 7 === 0) rect(x - hw + 1, y, hw * 2 - 2, 1, GIRD[s]);
      }
      rect(x - 10, RY + 20, 20, 3, PIER[s]);
    }
    // rangka baja
    rect(0, RY + 3, x1, 4, GIRD[s]);
    rect(0, RY + 20, x1, 2, GIRD[s]);
    for (let k = Math.floor(C2 / 18) - 1; k < Math.floor(C2 / 18) + 17; k++) {
      const x = R(k * 18 - C2);
      if (x > x1) continue;
      line(x, RY + 7, Math.min(x + 9, x1), RY + 20, GIRD[s]);
      line(Math.min(x + 9, x1), RY + 20, Math.min(x + 18, x1), RY + 7, GIRD[s]);
      rect(x, RY + 7, 1, 13, GIRD[s]);
    }
    for (let k = Math.floor(C2 / 9); k < Math.floor(C2 / 9) + 32; k++) {
      const x = R(k * 9 - C2);
      if (x < x1) px(x, RY + 4, PIER_RIM[s]);
    }
    // kepala jembatan
    rect(x1, RY + 3, 16, TL.H - RY - 3, PIER[s]);
    rect(x1 + 15, RY + 3, 1, TL.H - RY - 3, PIER_RIM[s]);
  }

  function land(C2, s, Eb) {
    const xa = R(Eb + 16 - C2);
    if (xa >= TL.W) return;
    rect(xa, RY + 3, TL.W - xa, TL.H - RY - 3, GRD[s]);
    // tanggul di belakang rel
    rect(xa, 374, TL.W - xa, RY - 374, GRD[s]);
    rect(xa, 374, TL.W - xa, 1, HILL_RIM[s]);
    for (let k = Math.floor(C2 / 4); k < Math.floor(C2 / 4) + 70; k++) {
      const x = R(k * 4 - C2);
      if (x >= xa && hash(k, 201) < 0.4) px(x, RY + 6 + R(hash(k, 202) * 8), c.ballast);
    }
  }

  function track(C2) {
    for (let k = Math.floor(C2 / 12) - 1; k < Math.floor(C2 / 12) + 25; k++) rect(R(k * 12 - C2), RY + 2, 7, 2, c.sleeper);
    rect(0, RY, TL.W, 3, c.rail);
    rect(0, RY, TL.W, 1, c.railHi);
  }

  function station(C2) {
    const bx = R(Cf() + 40 - C2);
    if (bx > TL.W + 40 || bx < -260) return;
    // pohon di belakang
    const tx = bx + 168;
    rect(tx - 2, 318, 4, 40, c.trunk);
    ellipse(tx, 304, 22, 18, c.leafLo);
    ellipse(tx - 2, 300, 19, 15, c.leaf);
    ellipse(tx - 6, 294, 9, 7, c.leafHi, 0.5);
    for (let k = 0; k < 18; k++) px(tx - 18 + R(hash(k, 211) * 30), 290 + R(hash(k, 212) * 22), c.leafHi);
    // peron seberang + dinding (sebagian besar tertutup kereta)
    rect(bx - 30, 372, 210, 28, c.plat);
    rect(bx - 30, 372, 210, 2, c.platTop);
    rect(bx - 30, 374, 210, 1, c.mortar);
    rect(bx, 358, 150, 14, c.wallLo);
    rect(bx, 338, 150, 20, c.wall);
    rect(bx, 338, 150, 1, c.wallLo);
    for (const wx of [bx + 14, bx + 118]) { rect(wx, 342, 14, 12, c.trim); rect(wx + 1, 343, 12, 10, c.lampOff); }
    // atap perisai
    for (let y = 306; y < 340; y++) {
      const inset = R((340 - y) * 0.62);
      rect(bx - 6 + inset, y, 162 - inset * 2, 1, (y - 306) % 4 === 3 ? c.roofLine : c.roof);
    }
    rect(bx - 6, 339, 162, 2, c.roofLo);
    rect(bx + 15, 306, 120, 1, c.roofHi);
    // menara jam kecil
    rect(bx + 66, 288, 18, 18, c.wall);
    rect(bx + 66, 288, 1, 18, c.wallLo);
    tri(bx + 63, 289, bx + 87, 289, bx + 75, 276, c.roof);
    line(bx + 75, 276, bx + 87, 289, c.roofHi);
    disc(bx + 75, 296, 5, c.trim);
    disc(bx + 75, 296, 4, c.clock);
    line(bx + 75, 296, bx + 75, 293, c.hand);
    line(bx + 75, 296, bx + 77, 297, c.hand);
  }

  function platform(C2) {
    const xa = R(Cf() - 10 - C2);
    if (xa >= TL.W) return;
    const y = 408;
    rect(xa, y, TL.W - xa + 10, TL.H - y, c.plat);
    rect(xa, y, TL.W - xa + 10, 3, c.platTop);
    rect(xa, y, TL.W - xa + 10, 1, c.edge);
    for (let r = 0; r < 7; r++) {
      const yy = y + 14 + r * 10;
      rect(xa, yy, TL.W - xa + 10, 1, c.mortar);
      for (let k = Math.floor(C2 / 22) - 1; k < Math.floor(C2 / 22) + 15; k++) {
        const x = R(k * 22 + (r % 2) * 11 - C2);
        if (x >= xa) rect(x, yy - 9, 1, 9, c.mortar);
      }
    }
    rect(xa, y + 3, 2, TL.H - y, c.platLo);
    // tiang lampu (padam: sudah pagi)
    const lx = R(Cf() + 22 - C2);
    if (lx > xa) {
      rect(lx - 1, 330, 3, 78, c.post);
      rect(lx - 1, 330, 1, 78, c.postHi);
      rect(lx - 5, 326, 11, 2, c.post);
      rect(lx - 4, 328, 9, 5, c.lampOff);
      rect(lx - 3, 324, 7, 2, c.post);
      rect(lx - 3, 404, 7, 4, c.post);
    }
    // bangku + pot bunga
    const bx = R(Cf() + 104 - C2);
    if (bx > xa) {
      rect(bx, 398, 28, 3, c.bench); rect(bx, 398, 28, 1, c.benchHi);
      rect(bx, 392, 28, 3, c.bench); rect(bx, 392, 28, 1, c.benchHi);
      rect(bx + 2, 401, 2, 7, c.benchLo); rect(bx + 24, 401, 2, 7, c.benchLo);
      rect(bx + 2, 395, 2, 3, c.benchLo); rect(bx + 24, 395, 2, 3, c.benchLo);
    }
    const px2 = R(Cf() + 152 - C2);
    if (px2 > xa) {
      rect(px2, 398, 10, 10, c.pot); rect(px2, 398, 10, 1, c.potHi);
      ellipse(px2 + 5, 393, 7, 5, c.leaf);
      ellipse(px2 + 3, 391, 3, 2, c.leafHi);
      for (const [fx, fy, k] of [[px2 + 1, 390, 0], [px2 + 6, 388, 1], [px2 + 9, 392, 0], [px2 + 4, 394, 1]]) px(fx, fy, k ? c.flower2 : c.flower);
    }
  }

  function sun(t, s) {
    const u = E.inOut(u01(TL.sunRise[0], TL.sunRise[1], t));
    const y = R(lerp(352, 262, u));
    disc(SUN_X, y, 15, c.sunRim, 0.5);
    disc(SUN_X, y, 13, c.sunRim);
    disc(SUN_X, y, 12, c.sun);
    disc(SUN_X - 2, y - 2, 7, c.sunCore);
    return y;
  }

  function chimneySmoke(t, C2, p) {
    const step_ = 0.025, life = 1.3;
    const n1 = Math.floor(t / step_), n0 = Math.floor((t - life) / step_);
    for (let n = n0; n <= n1; n++) {
      const ts = n * step_, a = t - ts;
      if (a < 0 || a > life) continue;
      const v = TL.trainV(ts) / TL.V; // makin pelan, asap makin tegak
      const wx = TL.front2 + TL.trainD(ts) + POINTS.chimney[0]; // posisi dunia cerobong saat ts
      const x = R(wx - C2 - a * 22 * v + (hash(n, 221) - 0.5) * 4 + a * 4 * (1 - v));
      const y = R(RY + POINTS.chimney[1] - a * 18 - a * a * 6);
      puff(x, y, R(1 + a * 3.2), 0.6 * (1 - a / life) + 0.05, c.smoke);
    }
  }

  // uap rem: semburan dari silinder dan boogie ketika kereta melambat
  function brakeSteam(t, fx) {
    const stp = 1 / 30;
    for (let n = Math.floor(12.5 / stp); n <= Math.floor(t / stp); n++) {
      const ts = n * stp, a = t - ts;
      const main = Math.abs(ts - TL.steam) < 0.25;
      const life = main ? 1.1 : 0.7;
      if (a < 0 || a > life) continue;
      if (!main && hash(n, 231) > 0.35) continue;
      const k = Math.floor(hash(n, 232) * (main ? 2 : BOGIES.length + 1));
      const ox = k === 0 ? POINTS.cyl[0] : main ? POINTS.cyl[0] - 26 : BOGIES[k - 1];
      const sx = fx + ox + R((hash(n, 233) - 0.5) * 8);
      const dir = hash(n, 234) < 0.5 ? -1 : 1;
      const x = R(sx + dir * a * (main ? 26 : 12));
      const y = R(RY - 6 - a * (main ? 30 : 16));
      const r = R((main ? 3 : 2) + a * (main ? 9 : 5));
      puff(x, y, r, (main ? 0.85 : 0.6) * (1 - a / life), c.steam, c.steamLo);
    }
  }

  function draw(t) {
    const C2 = TL.cam2X(t);
    const p = dawnP(t), s = step(p);
    const Eb = Cf() - 25;
    const fx = R(TL.front2 + TL.trainD(t) - C2);
    const sunY = R(lerp(352, 262, E.inOut(u01(TL.sunRise[0], TL.sunRise[1], t))));
    shade(0, 0, TL.W, 400, (lx, ly, sx, sy) => skyIdx(skyVal(lx, ly, p, HZ, 0, SUN_X, sunY), sx, sy));
    // awan terbelah ke dua sisi, menipis
    const part = E.inOut(u01(8.3, 11.4, t));
    for (const cl of CL) {
      if (hash(cl.id, 241) < p * 0.45) continue;
      const cx = cl.x - C2 * 0.04 + 40;
      const side = cx < SUN_X ? -1 : 1;
      drawCloud(cl, -C2 * 0.04 + 40 + side * part * (150 + hash(cl.id, 242) * 60), -part * 20, CLOUD[s]);
    }
    sun(t, s);
    mountains(C2, s);
    mist(t, 326, 20, 0.15 + 0.6 * p, s, 4, 260);
    hills(C2, s);
    valley(t, s, p);
    land(C2, s, Eb);
    station(C2);
    bridge(C2, s, Eb);
    track(C2);
    chimneySmoke(t, C2, p);
    const lvl = Math.min(3, Math.floor(TL.smooth(9.4, 12.0, t) * 4));
    drawTrain(fx, RY, TL.trainD(t), { lvl, p });
    brakeSteam(t, fx);
    const inten = 1 - TL.smooth(TL.rainStop[0], TL.rainStop[1], t);
    if (inten > 0) rain(t, { n: 260, seed: 400, slope: -0.4, speed: 470, len: 6, col: c.rain, shift: C2 * 0.9, inten });
    platform(C2);
  }

  root.S3 = { draw, RY };
})(typeof globalThis !== 'undefined' ? globalThis : this);
