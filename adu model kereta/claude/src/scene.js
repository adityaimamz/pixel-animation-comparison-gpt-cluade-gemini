// drawFrame(t): satu-satunya pintu masuk gambar. Hasil hanya bergantung pada t.
(function (root) {
  'use strict';
  const PX = root.PX, TL = root.TL;
  const { R, C, rect, save, restore, shift, clip, E, u01, lerp } = PX;
  const W = TL.W, H = TL.H;
  const WIN_FRAME = C('#101218');

  // S1 -> S2: bingkai jendela sasaran melebar sampai memenuhi layar.
  // Isinya kabin S2 yang digeser mengikuti pusat bingkai (tanpa skala: piksel tetap 1).
  function windowZoom(t) {
    S1.draw(t);
    const u = E.inOut(u01(TL.win[0], TL.win[1], t));
    const a = S1.targetRect(t);
    const x0 = R(lerp(a.x, -2, u)), y0 = R(lerp(a.y, -2, u));
    const x1 = R(lerp(a.x + a.w, W + 2, u)), y1 = R(lerp(a.y + a.h, H + 2, u));
    // titik jangkar kabin: mulai dari ambang hangat di antara penumpang dan kucing, berakhir di pusat layar
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const ax = W / 2, ay = lerp(292, H / 2, u);
    save(); clip(x0, y0, x1 - x0, y1 - y0); shift(R(cx - ax), R(cy - ay));
    S2.draw(t);
    restore();
    // bingkai jendela gerbong ikut melebar
    const b = 1 + R(u * 5);
    rect(x0 - b, y0 - b, x1 - x0 + 2 * b, b, WIN_FRAME);
    rect(x0 - b, y1, x1 - x0 + 2 * b, b, WIN_FRAME);
    rect(x0 - b, y0, b, y1 - y0, WIN_FRAME);
    rect(x1, y0, b, y1 - y0, WIN_FRAME);
  }

  // S2 -> S3: kamera menembus kaca. Kaca melebar keluar layar; dinding kabin terdorong ke tepi,
  // penumpang + kucing turun keluar bingkai, tetes air ikut terbawa kaca.
  function throughGlass(t) {
    const G = S2.G;
    const u = E.in(u01(TL.glass[0], TL.glass[1], t)) * 0.85 + u01(TL.glass[0], TL.glass[1], t) * 0.15;
    const r = {
      x: R(lerp(G.x, -40, u)), y: R(lerp(G.y, -40, u)),
      w: 0, h: 0,
    };
    r.w = R(lerp(G.x + G.w, W + 40, u)) - r.x;
    r.h = R(lerp(G.y + G.h, H + 60, u)) - r.y;
    S3.draw(t);
    const map = (x, y) => [R(r.x + (x - G.x) / G.w * r.w), R(r.y + (y - G.y) / G.h * r.h)];
    S2.glass(t, map);
    const dTop = r.y - G.y, dBot = (r.y + r.h) - (G.y + G.h);
    const dL = r.x - G.x, dR = (r.x + r.w) - (G.x + G.w);
    // empat potong dinding
    save(); clip(0, 0, W, r.y - 7); shift(0, dTop); S2.room(); restore();
    save(); clip(0, r.y + r.h + 6, W, H); shift(0, dBot); S2.room(); restore();
    save(); clip(0, r.y - 7, r.x - 7, r.h + 14); shift(dL, 0); S2.room(); restore();
    save(); clip(r.x + r.w + 7, r.y - 7, W, r.h + 14); shift(dR, 0); S2.room(); restore();
    S2.frame(r);
    save(); shift(0, dBot); S2.figures(t); restore();
  }

  function drawFrame(t) {
    PX.FB.fill(0xff000000);
    if (t < TL.win[0]) S1.draw(t);
    else if (t < TL.win[1]) windowZoom(t);
    else if (t < TL.glass[0]) S2.draw(t);
    else if (t < TL.glass[1]) throughGlass(t);
    else S3.draw(t);
    TEXT.draw(t);
    return PX.FB;
  }

  let IMG = null;
  function paint(ctx, t) {
    drawFrame(t);
    if (!IMG) IMG = ctx.createImageData(W, H);
    new Uint32Array(IMG.data.buffer).set(PX.FB);
    ctx.putImageData(IMG, 0, 0);
  }

  const S1 = root.S1, S2 = root.S2, S3 = root.S3, TEXT = root.TEXT;
  root.drawFrame = drawFrame;
  root.paintFrame = paint;
})(typeof globalThis !== 'undefined' ? globalThis : this);
