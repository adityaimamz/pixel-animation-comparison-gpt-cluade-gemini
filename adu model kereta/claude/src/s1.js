// S1 (0-4 s): kereta malam melaju di pedesaan saat hujan, tampak samping.
// Parallax 3 lapis: bukit jauh 0.12, pepohonan 0.45, tiang listrik dekat 1.6 (rel = 1.0).
(function (root) {
  'use strict';
  const { R, hash, C, px, rect, disc, ellipse, tri, line, shade, lerp } = root.PX;
  const { skyIdx, skyVal, makeClouds, CLOUD, CLOUD_FLASH, drawCloud, rain, puff } = root.K;
  const TL = root.TL;
  const { drawTrain, POINTS } = root.TRAIN;

  const RY = 345; // puncak rel
  const CL = makeClouds(11, 12, -40, 420, 30, 190);
  const col = {
    hill: C('#121a33'), hillTop: C('#1b2546'),
    tree: C('#0b141c'), treeHi: C('#132230'), treeBase: C('#0a1117'),
    town: C('#f0b060'), townDim: C('#a86a34'),
    sleeper: C('#2b2220'), rail: C('#6f7790'), railHi: C('#a3acc6'),
    ballast: C('#23232e'), stone: C('#33343f'),
    grass: C('#0b1513'), grass2: C('#0f1d19'), grassHi: C('#1a2e28'),
    puddle: C('#141c38'), puddleHi: C('#25305a'), refl: C('#b98a46'),
    pole: C('#140f11'), poleHi: C('#2e221e'), wire: C('#07070c'), insul: C('#5f6782'),
    rain: C('#5c6c94'), rainFar: C('#34406a'), rainLit: C('#efe4b0'), splash: C('#7f8cb0'),
    bolt: C('#eef2ff'), boltGlow: C('#7f88c4'),
    smoke: ['#646c8a', '#4a5276', '#323a64'].map(C),
  };

  function flashLevel(t) {
    const f = Math.floor(t * TL.FPS + 1e-6);
    const f0 = Math.round(TL.flash[0] * TL.FPS);
    return f === f0 ? 1 : f === f0 + 1 ? 0.5 : f === f0 + 3 ? 0.8 : 0;
  }

  const hillY = (x) => R(268 - 16 * Math.sin(x * 0.011 + 1.3) - 9 * Math.sin(x * 0.027 + 0.4) - 4 * Math.sin(x * 0.071));

  function farHills(cam) {
    const o = cam * 0.12;
    for (let x = 0; x < TL.W; x++) {
      const y = hillY(x + o);
      rect(x, y, 1, 330 - y, col.hill);
      px(x, y, col.hillTop);
    }
    // lampu desa di lereng
    const k0 = Math.floor(o / 9) - 1;
    for (let k = k0; k < k0 + 34; k++) {
      if (hash(k, 21) > 0.22) continue;
      const wx = k * 9 + R(hash(k, 22) * 6);
      const x = R(wx - o), y = hillY(wx) + 4 + R(hash(k, 23) * 14);
      px(x, y, hash(k, 24) < 0.5 ? col.town : col.townDim);
      if (hash(k, 25) < 0.3) px(x + 1, y, col.townDim);
    }
  }

  function trees(cam) {
    const o = cam * 0.45, base = 312;
    rect(0, base - 2, TL.W, RY - base + 2, col.treeBase);
    const k0 = Math.floor(o / 11) - 3;
    for (let k = k0; k < k0 + 32; k++) {
      const x = R(k * 11 + hash(k, 31) * 6 - o);
      const h = 14 + R(hash(k, 32) * 20);
      if (hash(k, 33) < 0.62) {
        const w = R(h * 0.36);
        tri(x - w, base, x + w, base, x, base - h, col.tree);
        line(x, base - h + 1, x - w + 1, base - 1, col.treeHi);
      } else {
        ellipse(x, base - R(h * 0.55), R(h * 0.42), R(h * 0.45), col.tree);
        ellipse(x - 2, base - R(h * 0.7), R(h * 0.2), R(h * 0.18), col.treeHi, 0.5);
      }
    }
  }

  function track(cam) {
    rect(0, RY + 3, TL.W, 12, col.ballast);
    for (let k = Math.floor(cam / 3) - 1; k < Math.floor(cam / 3) + 92; k++) {
      if (hash(k, 41) < 0.45) px(R(k * 3 - cam), RY + 4 + R(hash(k, 42) * 10), col.stone);
    }
    for (let k = Math.floor(cam / 12) - 1; k < Math.floor(cam / 12) + 25; k++) rect(R(k * 12 - cam), RY + 2, 7, 3, col.sleeper);
    rect(0, RY, TL.W, 3, col.rail);
    rect(0, RY, TL.W, 1, col.railHi);
  }

  function ground(cam, wins, t) {
    const o = cam * 1.15;
    rect(0, RY + 15, TL.W, TL.H - RY - 15, col.grass);
    for (let k = Math.floor(o / 5) - 1; k < Math.floor(o / 5) + 58; k++) {
      const x = R(k * 5 - o);
      const h = 1 + R(hash(k, 51) * 3);
      rect(x, RY + 15 - h, 1, h, col.grass2);
      if (hash(k, 52) < 0.2) rect(x + 2, RY + 30 + R(hash(k, 53) * 90), 3, 1, col.grass2);
    }
    // genangan: memantulkan langit dan cahaya jendela
    for (let k = Math.floor(o / 120) - 1; k < Math.floor(o / 120) + 4; k++) {
      const x = R(k * 120 + hash(k, 61) * 50 - o), y = 372 + R(hash(k, 62) * 70);
      const w = 26 + R(hash(k, 63) * 34);
      ellipse(x + w / 2, y, w / 2, 2, col.puddle);
      rect(x + 3, y - 2, w - 6, 1, col.puddleHi);
      for (const [a, b] of wins) {
        const xa = Math.max(a, x + 2), xb = Math.min(b, x + w - 2);
        if (xb < xa) continue;
        for (let xx = xa; xx <= xb; xx++) for (let yy = y - 1; yy <= y + 1; yy++) {
          if (((xx + yy + Math.floor(t * 12)) & 1) === 0) px(xx, yy, col.refl);
        }
      }
    }
  }

  function poles(cam) {
    const o = cam * 1.6, sp = 200;
    const k0 = Math.floor((o - 60) / sp);
    const xs = [];
    for (let k = k0; k < k0 + 4; k++) xs.push(R(k * sp + 40 - o));
    // kabel melengkung antar tiang
    for (let i = 0; i < xs.length - 1; i++) {
      for (const ix of [-14, -6, 6, 14]) {
        const xa = xs[i] + ix, xb = xs[i + 1] + ix;
        let prev = null;
        for (let x = xa; x <= xb; x++) {
          const u = (x - xa) / (xb - xa);
          const y = R(81 + 18 * 4 * u * (1 - u));
          if (prev !== null && Math.abs(y - prev) > 1) rect(x, Math.min(y, prev), 1, Math.abs(y - prev), col.wire);
          px(x, y, col.wire);
          prev = y;
        }
      }
    }
    for (const x of xs) {
      rect(x - 2, 70, 5, TL.H - 70, col.pole);
      rect(x - 2, 70, 1, TL.H - 70, col.poleHi);
      rect(x - 16, 82, 33, 3, col.pole);
      rect(x - 16, 82, 33, 1, col.poleHi);
      for (const ix of [-14, -6, 6, 14]) rect(x + ix, 80, 1, 2, col.insul);
    }
  }

  function bolt() {
    let x = 212, y = 112;
    const pts = [[x, y]];
    for (let i = 1; i <= 10; i++) { x += R((hash(i, 71) - 0.5) * 9); y += 14; pts.push([x, y]); }
    for (let i = 0; i < pts.length - 1; i++) {
      line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], col.boltGlow);
      line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col.bolt);
    }
    let bx = pts[5][0], by = pts[5][1];
    for (let i = 0; i < 3; i++) { const nx = bx + 6, ny = by + 8; line(bx, by, nx, ny, col.bolt); bx = nx; by = ny; }
  }

  function smoke(t, cam) {
    const step = 0.02, life = 1.3;
    const n0 = Math.floor((t - life) / step), n1 = Math.floor(t / step);
    for (let n = n0; n <= n1; n++) {
      const ts = n * step;
      if (ts < -1.2) continue;
      const a = t - ts;
      if (a < 0 || a > life) continue;
      // asap lahir di cerobong pada saat ts (dunia), lalu tertinggal & naik
      const wx = TL.front1 + TL.trainD(Math.max(0, ts)) + (ts < 0 ? ts * TL.V : 0) + POINTS.chimney[0];
      const x = R(wx - cam - a * 26 + (hash(n, 81) - 0.5) * 4);
      const y = R(RY + POINTS.chimney[1] - a * 20 - a * a * 6);
      const r = R(1 + a * 2.4);
      puff(x, y, r, 0.55 * (1 - a / life) + 0.05, col.smoke);
    }
  }

  function draw(t) {
    const cam = TL.cam1X(t);
    const fx = R(TL.front1 + TL.trainD(t) - cam);
    const fl = flashLevel(t);
    const d = TL.trainD(t);

    shade(0, 0, TL.W, 300, (lx, ly, sx, sy) => skyIdx(skyVal(lx, ly, 0, 300, fl), sx, sy));
    const cp = fl >= 0.5 ? CLOUD_FLASH : CLOUD[0];
    for (const cl of CL) drawCloud(cl, -cam * 0.05, 0, cp);
    if (fl >= 0.5) bolt();
    farHills(cam);
    rain(t, { n: 220, seed: 100, slope: -0.32, speed: 260, len: 3, col: col.rainFar, shift: cam * 0.3, inten: 1 });
    trees(cam);
    track(cam);
    smoke(t, cam);
    const wins = [];
    drawTrain(fx, RY, d, { lvl: 0, p: 0, wins });
    ground(cam, wins, t);

    // hujan dekat; yang masuk sorot lampu depan ikut menyala
    const lx = fx + POINTS.lamp[0], ly = RY + POINTS.lamp[1];
    const lit = (x, y) => {
      const dx = x - lx;
      return dx > 2 && dx < 150 && Math.abs(y - ly) < dx * 0.2 + 1 ? col.rainLit : 0;
    };
    rain(t, { n: 240, seed: 200, slope: -0.42, speed: 470, len: 6, col: col.rain, shift: cam * 0.9, inten: 1, lit });
    // percikan di tanah
    const s = Math.floor(t * 20);
    for (let j = 0; j < 9; j++) {
      const x = R(hash(s * 16 + j, 91) * TL.W), y = 364 + R(hash(s * 16 + j, 92) * 112);
      px(x, y, col.splash); px(x - 1, y - 1, col.splash); px(x + 1, y - 1, col.splash);
    }
    poles(cam);
  }

  // jendela sasaran di layar pada waktu t (untuk transisi masuk jendela)
  function targetRect(t) {
    const fx = R(TL.front1 + TL.trainD(t) - TL.cam1X(t));
    return { x: fx + POINTS.target[0], y: RY + POINTS.target[1], w: 10, h: 11 };
  }

  root.S1 = { draw, targetRect, RY };
})(typeof globalThis !== 'undefined' ? globalThis : this);
