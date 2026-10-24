// Kereta tampak samping: lokomotif uap + tender + 2 gerbong (panjang total 249 px, muat utuh di layar).
// fx = posisi layar moncong lokomotif; semua bagian diukur mundur dari sana.
(function (root) {
  'use strict';
  const { R, hash, C, px, rect, disc, ellipse, tri, line } = root.PX;
  const { wheel } = root.K;

  const P = {
    body: C('#1f2436'), bodyHi: C('#353c58'), bodyLo: C('#131622'),
    red: C('#a8373a'), redHi: C('#cf5a4a'), brass: C('#c99a45'), brassHi: C('#ecc56e'),
    steel: C('#4b5064'), steelHi: C('#7d8399'), rod: C('#a3a9bd'),
    lwFace: C('#7c2a2c'), cwFace: C('#3a3540'), wRim: C('#151217'), spoke: C('#1f1a1e'),
    coach: C('#2c4a4f'), coachHi: C('#41666a'), coachLo: C('#1d3236'),
    cream: C('#d9c79a'), roof: C('#555a67'), roofHi: C('#7a8090'), roofLo: C('#363944'),
    under: C('#17171d'), coal: C('#0c0d12'), coalHi: C('#2e3040'),
    frame: C('#101218'), lampLens: C('#fff2b0'),
  };
  // cahaya jendela: 0 hangat penuh -> 3 padam (memantulkan langit pagi)
  const WIN = [
    ['#ffcf6a', '#fff1b3', '#e09a3e', '#6b3f22'],
    ['#ecb763', '#f8d89a', '#c38a44', '#6a4428'],
    ['#bd9d7c', '#dec2a2', '#937862', '#5d4a40'],
    ['#8e7d8c', '#f0b98c', '#6a5c70', '#4e4458'],
  ].map((a) => a.map(C));
  const HALO = C('#4a3a34');
  // rim lampu fajar di sisi atas badan
  const RIM_DAWN = C('#c47a68');

  // jendela gerbong; who: 0 kosong, 1 penumpang, 2 penumpang + kucing (jendela sasaran)
  function windowAt(x, y, lvl, who, night) {
    const w = WIN[lvl];
    if (night) rect(x - 2, y - 2, 14, 15, HALO, 0.35);
    rect(x - 1, y - 1, 12, 13, P.frame);
    rect(x, y, 10, 11, w[0]);
    rect(x, y, 10, 1, w[1]);
    rect(x, y + 10, 10, 1, w[2]);
    if (who) {
      // kepala + bahu penumpang
      disc(x + 3, y + 6, 2, w[3]);
      rect(x + 1, y + 9, 6, 2, w[3]);
      if (who === 2) {
        // kucing kecil: dua telinga + kepala
        rect(x + 7, y + 7, 2, 4, w[3]);
        px(x + 7, y + 6, w[3]); px(x + 8, y + 6, w[3]);
        px(x + 7, y + 5, w[3]);
      }
    }
  }

  function coach(Rx, ry, d, idx, o) {
    const L = Rx - 72;
    // boogie + roda
    for (const b of [L + 12, Rx - 12]) {
      rect(b - 10, ry - 10, 20, 3, P.under);
      wheel(b - 5, ry - 4, 3, d, P.cwFace, P.wRim, P.steelHi);
      wheel(b + 5, ry - 4, 3, d, P.cwFace, P.wRim, P.steelHi);
    }
    rect(L + 2, ry - 13, 68, 3, P.under);
    // badan
    rect(L, ry - 46, 72, 34, P.coach);
    rect(L, ry - 46, 72, 1, o.p > 0.55 ? RIM_DAWN : P.coachHi);
    rect(L, ry - 24, 72, 12, P.coachLo);
    rect(L, ry - 26, 72, 2, P.cream);
    rect(L, ry - 46, 2, 34, P.coachLo);
    rect(Rx - 2, ry - 46, 2, 34, P.coachLo);
    // pintu
    rect(L + 3, ry - 41, 1, 27, P.coachLo);
    rect(Rx - 4, ry - 41, 1, 27, P.coachLo);
    // atap
    rect(L, ry - 47, 72, 1, P.roofLo);
    rect(L + 1, ry - 50, 70, 3, P.roof);
    rect(L + 3, ry - 51, 66, 1, o.p > 0.55 ? RIM_DAWN : P.roofHi);
    // ventilasi atap
    for (let k = 0; k < 3; k++) rect(L + 14 + k * 20, ry - 53, 6, 2, P.roofLo);
    // jendela
    for (let k = 0; k < 4; k++) {
      const wx = L + 9 + k * 16, wy = ry - 39;
      let who = hash(idx * 4 + k, 77) < 0.55 ? 1 : 0;
      if (idx === 1 && k === 2) who = 2;
      windowAt(wx, wy, o.lvl, who, o.lvl === 0);
      if (o.wins) o.wins.push([wx, wx + 9]);
    }
    // perangkai
    rect(Rx, ry - 15, 4, 2, P.under);
  }

  function tender(Rx, ry, d, o) {
    const L = Rx - 22;
    rect(L + 1, ry - 12, 20, 3, P.under);
    wheel(L + 6, ry - 4, 3, d, P.lwFace, P.wRim, P.steelHi);
    wheel(L + 16, ry - 4, 3, d, P.lwFace, P.wRim, P.steelHi);
    rect(L, ry - 34, 22, 22, P.body);
    rect(L, ry - 34, 22, 1, o.p > 0.55 ? RIM_DAWN : P.bodyHi);
    rect(L, ry - 21, 22, 1, P.red);
    rect(L, ry - 14, 22, 2, P.bodyLo);
    for (let k = 0; k < 6; k++) disc(L + 3 + k * 3.3, ry - 36 + (k % 2), 2, P.coal);
    for (let k = 0; k < 4; k++) px(L + 4 + k * 4, ry - 37, P.coalHi);
    rect(Rx, ry - 15, 4, 2, P.under);
  }

  function loco(fx, ry, d, o) {
    const hi = o.p > 0.55 ? RIM_DAWN : P.bodyHi;
    // roda dulu (di belakang batang)
    wheel(fx - 16, ry - 4, 3, d, P.lwFace, P.wRim, P.steelHi);
    const a = wheel(fx - 30, ry - 8, 7, d, P.lwFace, P.wRim, P.spoke);
    wheel(fx - 46, ry - 8, 7, d, P.lwFace, P.wRim, P.spoke);
    wheel(fx - 63, ry - 5, 4, d, P.lwFace, P.wRim, P.steelHi);
    // batang penggerak
    const pin = (xc) => [R(xc + Math.cos(a) * 4), R(ry - 8 + Math.sin(a) * 4)];
    const [p1x, p1y] = pin(fx - 30), [p2x, p2y] = pin(fx - 46);
    line(p1x, p1y, p2x, p2y, P.rod);
    line(p1x, p1y - 1, p2x, p2y - 1, P.rod);
    const chx = fx - 19 + R(Math.cos(a) * 3);
    line(chx, ry - 11, p1x, p1y, P.steelHi);
    px(p1x, p1y, P.brassHi); px(p2x, p2y, P.brassHi);
    // papan jalan + valance
    rect(fx - 70, ry - 16, 64, 2, P.steel);
    rect(fx - 70, ry - 14, 64, 2, P.red);
    rect(fx - 70, ry - 16, 64, 1, P.steelHi);
    // silinder
    rect(fx - 22, ry - 14, 9, 6, P.steel);
    rect(fx - 22, ry - 14, 9, 1, P.steelHi);
    rect(chx - 1, ry - 12, 3, 2, P.rod);
    // ketel
    rect(fx - 52, ry - 32, 40, 16, P.body);
    rect(fx - 52, ry - 32, 40, 1, hi);
    rect(fx - 52, ry - 31, 40, 1, hi, 0.5);
    rect(fx - 52, ry - 17, 40, 1, P.bodyLo);
    for (const bx of [fx - 47, fx - 36, fx - 24]) rect(bx, ry - 32, 1, 16, P.brass);
    // kotak asap
    rect(fx - 13, ry - 33, 8, 18, P.bodyLo);
    rect(fx - 13, ry - 33, 8, 1, hi);
    rect(fx - 6, ry - 31, 1, 14, P.steel);
    // cerobong
    rect(fx - 12, ry - 41, 5, 8, P.bodyLo);
    rect(fx - 13, ry - 43, 7, 2, P.body);
    rect(fx - 13, ry - 43, 7, 1, hi);
    // kubah
    ellipse(fx - 31, ry - 33, 3, 2, P.brass);
    px(fx - 32, ry - 35, P.brassHi); px(fx - 31, ry - 35, P.brassHi);
    ellipse(fx - 42, ry - 33, 2, 2, P.body);
    px(fx - 42, ry - 35, hi);
    rect(fx - 37, ry - 37, 1, 4, P.brass);
    // lampu depan
    rect(fx - 9, ry - 38, 4, 4, P.steel);
    rect(fx - 6, ry - 37, 2, 2, P.lampLens);
    // kabin
    rect(fx - 70, ry - 46, 18, 30, P.body);
    rect(fx - 70, ry - 46, 18, 1, hi);
    rect(fx - 72, ry - 49, 22, 3, P.roofLo);
    rect(fx - 71, ry - 50, 20, 1, o.p > 0.55 ? RIM_DAWN : P.roofHi);
    rect(fx - 66, ry - 42, 9, 9, P.frame);
    const w = WIN[o.lvl];
    rect(fx - 65, ry - 41, 7, 7, w[0]);
    rect(fx - 65, ry - 41, 7, 1, w[1]);
    rect(fx - 70, ry - 23, 18, 1, P.red);
    rect(fx - 54, ry - 46, 2, 30, P.bodyLo);
    // balok penyangga + bumper + penghalau
    rect(fx - 7, ry - 16, 5, 4, P.red);
    rect(fx - 2, ry - 15, 2, 2, P.steelHi);
    tri(fx - 11, ry - 11, fx - 4, ry - 11, fx + 1, ry, P.steel);
    rect(fx - 11, ry - 11, 4, 11, P.steel);
    for (let k = 0; k < 3; k++) line(fx - 9 + k * 3, ry - 10, fx - 6 + k * 3, ry - 1, P.under);
  }

  function drawTrain(fx, ry, d, o) {
    fx = R(fx);
    for (let i = 1; i >= 0; i--) coach(fx - 100 - i * 76, ry, d, i, o);
    tender(fx - 74, ry, d, o);
    loco(fx, ry, d, o);
  }

  // titik penting relatif moncong
  const POINTS = {
    chimney: [-10, -44],
    lamp: [-4, -36],
    cyl: [-18, -10],
    target: [-207, -39], // jendela sasaran (gerbong 2, jendela 3), 10x11
  };
  // posisi boogie (untuk uap rem)
  const BOGIES = [-112, -160, -188, -236];

  root.TRAIN = { drawTrain, POINTS, BOGIES, WIN, P };
})(typeof globalThis !== 'undefined' ? globalThis : this);
