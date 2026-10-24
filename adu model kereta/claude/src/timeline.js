// Satu-satunya sumber waktu. Dibaca oleh gambar (src/scene.js, lewat <script>)
// dan oleh suara (tools/audio.mjs, lewat vm). Semua dalam detik.
(function (root) {
  const FPS = 30;
  const DUR = 15;
  const FRAMES = FPS * DUR; // 450

  const TL = {
    FPS, DUR, FRAMES,
    W: 270, H: 480, SCALE: 4,

    // adegan
    s1: [0, 4], s2: [4, 8], s3: [8, 12], s4: [12, 15],
    // transisi (overlap, tanpa frame kosong)
    win: [3.4, 4.4],   // S1 -> S2: bingkai jendela melebar jadi kabin
    glass: [7.4, 8.4], // S2 -> S3: kamera menembus kaca, kabin terbuka ke tepi

    // kejadian
    flash: [2.6, 2.667, 2.733], // kilat kecil: kilat, padam, kilat susulan
    thunder: 3.05,              // gemuruh jauh (terlambat, jauh)
    blinks: [5.3, 6.85],        // kucing berkedip
    rainStop: [8.0, 9.6],       // hujan mereda
    dawn: [8.3, 12.0],          // langit malam -> oranye
    sunRise: [9.0, 12.4],
    camBrake: [11.8, 12.8],     // kamera melambat lebih dulu
    brake: [12.0, 13.4],        // kereta mengerem sampai berhenti
    steam: 13.25,               // uap rem
    typeStart: 13.5,            // "SAMPAI" diketik
    typeStep: 4 / FPS,          // satu huruf tiap 4 frame
    text: 'SAMPAI',
    sunIcon: 14.3,              // ikon matahari muncul lalu berkedip

    V: 150,      // kecepatan kereta, px dunia per detik (2 sambungan rel per ketukan 75 BPM)
    RAIL_JOINT: 60, // panjang batang rel, px
    BPM: 75,
  };

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  TL.clamp = clamp;
  TL.smooth = smooth;

  // kecepatan kereta di dunia
  TL.trainV = (t) => TL.V * (1 - smooth(TL.brake[0], TL.brake[1], t));

  // integral numerik dengan langkah tetap -> deterministik
  const STEP = 1 / 960;
  function integ(fn) {
    const n = Math.ceil(DUR / STEP) + 2;
    const acc = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) {
      const ta = (i - 1) * STEP, tb = i * STEP;
      acc[i] = acc[i - 1] + 0.5 * (fn(ta) + fn(tb)) * STEP;
    }
    return (t) => {
      const x = clamp(t, 0, n * STEP) / STEP;
      const i = Math.floor(x), f = x - i;
      return i >= n ? acc[n] : acc[i] + (acc[i + 1] - acc[i]) * f;
    };
  }

  // jarak tempuh kereta (memutar roda, memicu ketukan rel)
  TL.trainD = integ(TL.trainV);

  // S1: kamera diam, lalu menyusul kereta
  TL.cam1V = (t) => TL.V * smooth(1.7, 3.1, t);
  TL.cam1X = integ(TL.cam1V);
  TL.front1 = -21; // posisi layar moncong lokomotif saat t = 0

  // S3/S4: kamera mengikuti kereta, mengerem lebih dulu dari kereta
  TL.cam2V = (t) => Math.min(TL.trainV(t), TL.V * (1 - smooth(TL.camBrake[0], TL.camBrake[1], t)));
  TL.cam2X = integ(TL.cam2V);
  TL.front2 = 197; // posisi layar moncong saat kamera = kecepatan kereta

  // jendela kabin di S2 bergeser sesuai kecepatan
  TL.out2X = integ((t) => TL.V);

  // waktu ketukan rel: tiap sambungan dilewati dua gandar boogie (ta-tak)
  TL.clacks = function () {
    const ev = [];
    let k = 1;
    for (let i = 0; i < DUR * 960; i++) {
      const t = i / 960;
      const d = TL.trainD(t);
      while (d >= k * TL.RAIL_JOINT) {
        ev.push({ t, v: TL.trainV(t), k });
        k++;
      }
    }
    return ev;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TL;
  root.TL = TL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
