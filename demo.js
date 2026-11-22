/* demo.js — демонстрационные дни. Фото рисуются процедурно (без чужих снимков),
 * музыка синтезируется в браузере (OfflineAudioContext) — свободная лицензия, ничего не скачивается.
 * Демо-дни проходят через тот же конвейер анализа, что и записи пользователя. */
(function (G) {
  'use strict';
  const { rng, mk } = G.IZ.render;
  const PW = 800, PH = 1000;

  /* ---------- процедурные «фотографии» ---------- */
  function sky(x, top, bot, h = PH) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, PW, h); }
  function blobs(x, r, cx, cy, rad, cols, n, alpha = 0.8) { for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; x.fillStyle = cols[(r() * cols.length) | 0]; x.globalAlpha = alpha * (0.5 + r() * 0.5); x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 10 + r() * rad * 0.25, 0, 7); x.fill(); } x.globalAlpha = 1; }
  function person(x, px, py, s, col, opt = {}) {
    x.fillStyle = col; x.beginPath(); x.arc(px, py - s * 1.55, s * 0.28, 0, 7); x.fill();
    x.beginPath(); x.moveTo(px - s * 0.42, py); x.quadraticCurveTo(px - s * 0.5, py - s * 1.25, px, py - s * 1.25); x.quadraticCurveTo(px + s * 0.5, py - s * 1.25, px + s * 0.42, py); x.closePath(); x.fill();
    if (opt.umbrella) { x.fillStyle = opt.umbrella; x.beginPath(); x.arc(px, py - s * 1.9, s * 0.95, Math.PI, 0); x.fill(); x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(px, py - s * 1.9); x.lineTo(px, py - s * 1.1); x.stroke(); }
    if (opt.arms) { x.strokeStyle = col; x.lineWidth = s * 0.14; x.lineCap = 'round'; x.beginPath(); x.moveTo(px - s * 0.3, py - s * 1.05); x.lineTo(px - s * 0.75, py - s * 1.8); x.moveTo(px + s * 0.3, py - s * 1.05); x.lineTo(px + s * 0.75, py - s * 1.8); x.stroke(); }
  }
  function mug(x, mx, my, s, col, foam) { x.fillStyle = col; x.beginPath(); x.moveTo(mx - s, my - s * 1.2); x.lineTo(mx + s, my - s * 1.2); x.lineTo(mx + s * 0.85, my); x.lineTo(mx - s * 0.85, my); x.closePath(); x.fill();
    x.strokeStyle = col; x.lineWidth = s * 0.22; x.beginPath(); x.arc(mx + s * 1.05, my - s * 0.65, s * 0.35, -1.4, 1.4); x.stroke();
    x.fillStyle = foam; x.beginPath(); x.ellipse(mx, my - s * 1.2, s, s * 0.22, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 4; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(mx + i * s * 0.4, my - s * 1.5); x.bezierCurveTo(mx + i * s * 0.4 - 18, my - s * 2, mx + i * s * 0.4 + 18, my - s * 2.4, mx + i * s * 0.4, my - s * 2.9); x.stroke(); } }
  function finish(c, r, { blur = 0.6, vign = 0.35, noise = 14, warm = 0 } = {}) {
    const x = c.getContext('2d');
    if (blur) { const t = mk(PW, PH); const tx = t.getContext('2d'); tx.filter = `blur(${blur}px)`; tx.drawImage(c, 0, 0); x.clearRect(0, 0, PW, PH); x.drawImage(t, 0, 0); }
    const g = x.createRadialGradient(PW / 2, PH / 2, PH * 0.3, PW / 2, PH / 2, PH * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${vign})`); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    if (warm) { x.fillStyle = warm > 0 ? `rgba(255,150,60,${warm})` : `rgba(60,110,200,${-warm})`; x.globalCompositeOperation = 'soft-light'; x.fillRect(0, 0, PW, PH); x.globalCompositeOperation = 'source-over'; }
    const d = x.getImageData(0, 0, PW, PH); for (let i = 0; i < d.data.length; i += 4) { const n = (r() - 0.5) * noise; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0);
    return c;
  }

  const SCENES = {
    park(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#b9c6cf', '#f1d9a8', 600); x.fillStyle = '#f6d58a'; x.globalAlpha = 0.85; x.beginPath(); x.arc(600, 420, 70, 0, 7); x.fill(); x.globalAlpha = 1;
      const gg = x.createLinearGradient(0, 560, 0, PH); gg.addColorStop(0, '#c8913f'); gg.addColorStop(1, '#7a4a1e'); x.fillStyle = gg; x.fillRect(0, 560, PW, PH - 560);
      for (let i = 0; i < 7; i++) { const tx = 40 + i * 120 + r() * 40, th = 300 + r() * 120; x.fillStyle = '#3d2a1c'; x.fillRect(tx - 9, 600 - th * 0.55, 18, th * 0.6 + 20);
        blobs(x, r, tx, 600 - th * 0.7, 120, ['#e8a33a', '#d9772b', '#f2c14e', '#b8541f', '#e9c46a'], 60, 0.75); }
      if (v === 2) { x.fillStyle = '#5d7f86'; x.beginPath(); x.ellipse(400, 800, 380, 110, 0, 0, 7); x.fill(); for (let i = 0; i < 40; i++) { x.fillStyle = ['#e8a33a', '#f2c14e', '#d9772b'][i % 3]; x.globalAlpha = 0.5; x.fillRect(80 + r() * 640, 740 + r() * 120, 40 + r() * 60, 4); } x.globalAlpha = 1; }
      else { x.fillStyle = '#d7b27a'; x.beginPath(); x.moveTo(330, PH); x.quadraticCurveTo(420, 760, 400, 600); x.lineTo(440, 600); x.quadraticCurveTo(480, 760, 560, PH); x.fill(); }
      for (let i = 0; i < 260; i++) { x.fillStyle = ['#e8a33a', '#d9772b', '#f2c14e', '#a94b1a'][i % 4]; x.save(); x.translate(r() * PW, 600 + r() * 400); x.rotate(r() * 3); x.fillRect(-6, -3, 12, 6); x.restore(); }
      if (v === 0) { x.fillStyle = '#3a2618'; x.fillRect(250, 800, 300, 14); x.fillRect(260, 814, 10, 60); x.fillRect(530, 814, 10, 60); person(x, 340, 800, 90, '#2b1e16'); person(x, 450, 800, 84, '#4a2c22'); }
      if (v === 1) { x.fillStyle = '#5a3a26'; x.fillRect(0, 720, PW, 60); mug(x, 300, 730, 80, '#8a3f2b', '#e8c9a0'); mug(x, 520, 740, 72, '#2f5d62', '#d9b48a'); }
      return finish(c, r, { warm: 0.18 });
    },
    office(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#0c1424', '#1b2638');
      x.fillStyle = '#0a1020'; x.fillRect(60, 80, 680, 520);
      for (let i = 0; i < 14; i++) { const bx = 60 + i * 50, bh = 120 + r() * 360; x.fillStyle = '#131d33'; x.fillRect(bx, 600 - bh, 46, bh);
        for (let wy = 600 - bh + 10; wy < 590; wy += 18) for (let wx = bx + 6; wx < bx + 40; wx += 12) if (r() < 0.35) { x.fillStyle = r() < 0.7 ? '#f3d27a' : '#7fd8f0'; x.globalAlpha = 0.8; x.fillRect(wx, wy, 6, 9); x.globalAlpha = 1; } }
      x.strokeStyle = '#2a364d'; x.lineWidth = 10; x.strokeRect(60, 80, 680, 520); x.beginPath(); x.moveTo(400, 80); x.lineTo(400, 600); x.stroke();
      x.fillStyle = '#1e2430'; x.fillRect(0, 700, PW, 300);
      if (v !== 2) { const g = x.createRadialGradient(400, 640, 20, 400, 640, 360); g.addColorStop(0, 'rgba(110,200,255,0.45)'); g.addColorStop(1, 'rgba(110,200,255,0)'); x.fillStyle = g; x.fillRect(0, 300, PW, 700);
        x.fillStyle = '#0d1118'; x.fillRect(220, 470, 360, 230); x.fillStyle = '#16304a'; x.fillRect(236, 486, 328, 196);
        for (let i = 0; i < 12; i++) { x.fillStyle = ['#7fd8f0', '#e86a5a', '#f3d27a', '#9aa7ff'][i % 4]; x.fillRect(250 + (i % 3) * 18, 500 + i * 14, 60 + r() * 180, 6); }
        x.fillStyle = '#0d1118'; x.fillRect(380, 700, 40, 40); }
      if (v === 1) { mug(x, 640, 850, 50, '#e9e5dc', '#3b2416'); x.fillStyle = '#2b3444'; x.fillRect(100, 820, 260, 18); }
      if (v === 2) { for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(200,235,255,0.75)'; x.fillRect(80 + i * 110, 650, 70, 6); } person(x, 300, 980, 160, '#0b0f17'); person(x, 560, 990, 150, '#101622'); }
      return finish(c, r, { warm: -0.2, vign: 0.5 });
    },
    sea(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#4fb3e8', '#bfe8f7', 460); x.fillStyle = '#fff3b0'; x.beginPath(); x.arc(640, 140, 60, 0, 7); x.fill();
      const sg = x.createLinearGradient(0, 460, 0, 720); sg.addColorStop(0, '#1497b8'); sg.addColorStop(1, '#4fd1c5'); x.fillStyle = sg; x.fillRect(0, 460, PW, 260);
      x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 3; for (let i = 0; i < 30; i++) { const yy = 480 + r() * 230, xx = r() * PW; x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 20, yy - 6, xx + 40, yy); x.stroke(); }
      const sa = x.createLinearGradient(0, 700, 0, PH); sa.addColorStop(0, '#f7d9a0'); sa.addColorStop(1, '#e8b873'); x.fillStyle = sa; x.fillRect(0, 700, PW, 300);
      if (v === 0) { [[160, 760, '#e63946'], [600, 740, '#ffb703']].forEach(([ux, uy, uc]) => { x.fillStyle = uc; x.beginPath(); x.arc(ux, uy, 110, Math.PI, 0); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(ux, uy); x.arc(ux, uy, 110, Math.PI * 1.33, Math.PI * 1.66); x.fill(); x.fillStyle = '#5b4636'; x.fillRect(ux - 3, uy, 6, 150); });
        person(x, 330, 690, 70, '#1d3557', { arms: true }); person(x, 450, 700, 64, '#8d2c2c', { arms: true }); person(x, 540, 690, 60, '#264653'); }
      if (v === 1) { for (let i = 0; i < 3; i++) { const wx = 200 + i * 200, wy = 860; x.fillStyle = '#2a9d4b'; x.beginPath(); x.arc(wx, wy, 95, Math.PI * 1.05, Math.PI * 1.95); x.fill(); x.fillStyle = '#ff5d6c'; x.beginPath(); x.arc(wx, wy + 6, 82, Math.PI * 1.07, Math.PI * 1.93); x.fill(); x.fillStyle = '#222'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(wx - 50 + k * 20, wy - 40 + (k % 2) * 14, 3, 6, 0, 0, 7); x.fill(); } } }
      if (v === 2) { for (let i = 0; i < 5; i++) person(x, 120 + i * 140, 640 + (i % 2) * 20, 55 + r() * 15, '#103a4a', { arms: i % 2 === 0 }); x.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(r() * PW, 600 + r() * 100, 3 + r() * 6, 0, 7); x.fill(); } }
      return finish(c, r, { warm: 0.1, vign: 0.2 });
    },
    snowcity(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#d9dde4', '#f1e4e2');
      for (let i = 0; i < 10; i++) { const bx = i * 85 - 20, bh = 200 + r() * 260; x.fillStyle = `rgba(150,160,178,${0.35 + r() * 0.3})`; x.fillRect(bx, 640 - bh, 80, bh); for (let k = 0; k < 8; k++) if (r() < 0.25) { x.fillStyle = 'rgba(255,220,160,0.7)'; x.fillRect(bx + 10 + r() * 50, 640 - bh + 20 + r() * (bh - 40), 8, 10); } }
      x.fillStyle = '#f4f5f7'; x.fillRect(0, 640, PW, 360);
      x.strokeStyle = 'rgba(160,170,190,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(300, PH); x.lineTo(390, 640); x.moveTo(500, PH); x.lineTo(410, 640); x.stroke();
      if (v !== 1) { [[150, 0.9], [650, 0.7]].forEach(([lx, s]) => { x.fillStyle = '#4a4f5a'; x.fillRect(lx - 4, 640 - 300 * s, 8, 300 * s + 120); const g = x.createRadialGradient(lx, 640 - 300 * s, 4, lx, 640 - 300 * s, 70); g.addColorStop(0, 'rgba(255,214,150,0.9)'); g.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = g; x.fillRect(lx - 80, 640 - 300 * s - 80, 160, 160); }); }
      if (v === 0) person(x, 420, 760, 46, '#3b3f4a');
      if (v === 1) { x.fillStyle = '#6b5f57'; x.fillRect(0, 0, PW, 60); x.fillRect(0, 0, 60, PH); x.fillRect(PW - 60, 0, 60, PH); x.fillRect(0, 760, PW, 240); mug(x, 400, 760, 70, '#c9c2b8', '#8a6a4a');
        for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1.5; const fx = 60 + r() * 680, fy = 60 + r() * 700, s = 6 + r() * 16; for (let a = 0; a < 3; a++) { x.beginPath(); x.moveTo(fx - Math.cos(a) * s, fy - Math.sin(a) * s); x.lineTo(fx + Math.cos(a) * s, fy + Math.sin(a) * s); x.stroke(); } } }
      if (v === 2) { x.fillStyle = '#6e6157'; x.fillRect(270, 800, 260, 14); x.fillRect(280, 814, 10, 50); x.fillRect(510, 814, 10, 50); x.fillStyle = '#fff'; x.fillRect(268, 792, 264, 10); }
      x.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 260; i++) { x.beginPath(); x.arc(r() * PW, r() * PH, 1 + r() * 3.5, 0, 7); x.fill(); }
      return finish(c, r, { warm: -0.05, vign: 0.18, blur: 0.8 });
    },
    station(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#3e4a50', '#6c7a7c');
      if (v === 1) { const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#22303a'); g.addColorStop(1, '#3a464c'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
        for (let i = 0; i < 40; i++) { const bg = x.createRadialGradient(0, 0, 0, 0, 0, 1); x.save(); x.translate(r() * PW, 200 + r() * 600); const rr = 20 + r() * 60; x.scale(rr, rr); bg.addColorStop(0, ['rgba(255,190,110,0.55)', 'rgba(255,120,90,0.45)', 'rgba(170,220,255,0.4)'][i % 3]); bg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bg; x.fillRect(-1, -1, 2, 2); x.restore(); }
        for (let i = 0; i < 140; i++) { const dx = r() * PW, dy = r() * PH, s = 4 + r() * 9; x.fillStyle = 'rgba(220,235,240,0.35)'; x.beginPath(); x.ellipse(dx, dy, s * 0.7, s, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(dx, dy + s); x.lineTo(dx + (r() - 0.5) * 3, dy + s + 20 + r() * 50); x.stroke(); }
        return finish(c, r, { warm: 0.05, vign: 0.45 }); }
      x.fillStyle = '#2b3236'; x.fillRect(0, 120, PW, 30); for (let i = 0; i < 6; i++) x.fillRect(60 + i * 140, 150, 12, 360);
      x.fillStyle = '#5b2d2a'; x.fillRect(-20, 380, 600, 200); x.fillStyle = '#3a1f1d'; x.fillRect(-20, 560, 600, 20);
      for (let i = 0; i < 5; i++) { x.fillStyle = '#ffd59a'; x.globalAlpha = 0.85; x.fillRect(10 + i * 110, 420, 80, 70); x.globalAlpha = 1; }
      const pg = x.createLinearGradient(0, 580, 0, PH); pg.addColorStop(0, '#4d585b'); pg.addColorStop(1, '#2a3134'); x.fillStyle = pg; x.fillRect(0, 580, PW, 420);
      for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,213,154,0.18)'; x.fillRect(10 + i * 110, 600 + i * 6, 80, 260); }
      if (v === 0) { person(x, 620, 900, 120, '#14181b', { umbrella: '#2d3a40' }); person(x, 700, 900, 110, '#1d2226'); }
      if (v === 2) person(x, 400, 960, 150, '#101417', { umbrella: '#6b1f24' });
      x.strokeStyle = 'rgba(210,225,230,0.35)'; x.lineWidth = 1.4; for (let i = 0; i < 420; i++) { const rx = r() * PW, ry = r() * PH; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 6, ry + 30); x.stroke(); }
      return finish(c, r, { warm: -0.12, vign: 0.5 });
    },
    kitchen(v, seed) {
      const r = rng(seed), c = mk(PW, PH), x = c.getContext('2d');
      sky(x, '#e9b86a', '#b9773a');
      x.fillStyle = '#2a4a78'; x.fillRect(420, 90, 320, 380); x.fillStyle = '#e8eef8'; for (let i = 0; i < 90; i++) { x.beginPath(); x.arc(420 + r() * 320, 90 + r() * 380, 1 + r() * 3, 0, 7); x.fill(); }
      x.fillStyle = '#f2f4f8'; x.fillRect(420, 420, 320, 50); x.strokeStyle = '#7a4a22'; x.lineWidth = 14; x.strokeRect(420, 90, 320, 380); x.beginPath(); x.moveTo(580, 90); x.lineTo(580, 470); x.stroke();
      const lg = x.createRadialGradient(240, 120, 10, 240, 120, 420); lg.addColorStop(0, 'rgba(255,230,160,0.8)'); lg.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = lg; x.fillRect(0, 0, PW, 700);
      x.fillStyle = '#7b4a26'; x.fillRect(0, 640, PW, 360); x.fillStyle = '#8e5a30'; x.fillRect(0, 640, PW, 18);
      if (v === 0) person(x, 230, 660, 170, '#5a2e22');
      const plate = (px, py, s) => { x.fillStyle = '#f4efe6'; x.beginPath(); x.ellipse(px, py, s, s * 0.42, 0, 0, 7); x.fill(); x.fillStyle = '#d9d2c4'; x.beginPath(); x.ellipse(px, py, s * 0.75, s * 0.3, 0, 0, 7); x.fill();
        for (let i = 0; i < 14; i++) { x.fillStyle = '#fbf6ec'; x.beginPath(); x.ellipse(px + (r() - 0.5) * s * 1.1, py + (r() - 0.5) * s * 0.35, s * 0.13, s * 0.08, r() * 3, 0, 7); x.fill(); x.strokeStyle = 'rgba(160,140,110,0.5)'; x.lineWidth = 1; x.stroke(); }
        x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 5; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(px - 40 + i * 40, py - 30); x.bezierCurveTo(px - 60 + i * 40, py - 90, px - 20 + i * 40, py - 120, px - 40 + i * 40, py - 170); x.stroke(); } };
      plate(v === 1 ? 400 : 520, v === 1 ? 800 : 760, v === 1 ? 260 : 150);
      if (v === 2) { for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(r() * PW, 650 + r() * 300, 2 + r() * 5, 0, 7); x.fill(); } x.fillStyle = '#efe7d6'; x.beginPath(); x.ellipse(200, 860, 120, 40, 0, 0, 7); x.fill(); }
      return finish(c, r, { warm: 0.22, vign: 0.4 });
    }
  };
  function photoBlob(scene, v, seed) { return new Promise(res => SCENES[scene](v, seed).toBlob(res, 'image/jpeg', 0.88)); }

  /* ---------- генеративная музыка ---------- */
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  async function synth({ bpm, mode, root = 57, style, dur = 24 }) {
    const sr = 22050, ctx = new OfflineAudioContext(1, sr * dur, sr), out = ctx.createGain(); out.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor(); out.connect(comp); comp.connect(ctx.destination);
    const beat = 60 / bpm, bar = beat * 4;
    const prog = mode === 'major' ? [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]] : [[0, 3, 7], [5, 8, 12], [0, 3, 7], [-2, 2, 5]];
    const noise = ctx.createBuffer(1, sr, sr); const nd = noise.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
    const tone = (f, t, d, type, vol, cutoff = 2400, att = 0.01) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cutoff;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05); };
    const nz = (t, d, vol, type, f) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02); };
    const kick = (t, v = 0.9) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); };
    for (let b = 0; b * bar < dur; b++) {
      const t0 = b * bar, ch = prog[b % 4];
      if (style === 'electro') {
        for (let i = 0; i < 4; i++) { kick(t0 + i * beat); nz(t0 + i * beat + beat / 2, 0.05, 0.25, 'highpass', 7000); }
        nz(t0 + beat, 0.12, 0.3, 'bandpass', 1800); nz(t0 + 3 * beat, 0.12, 0.3, 'bandpass', 1800);
        for (let i = 0; i < 16; i++) tone(mtof(root - 12 + ch[0] + (i % 4 === 3 ? 12 : 0)), t0 + i * beat / 4, beat / 4 * 0.9, 'sawtooth', 0.18, 900 + 600 * Math.sin(b + i * 0.4));
        for (let i = 0; i < 8; i++) tone(mtof(root + 12 + ch[i % 3] + (i > 5 ? 12 : 0)), t0 + i * beat / 2, beat / 2 * 0.7, 'square', 0.06, 3000);
      } else if (style === 'pop') {
        kick(t0); kick(t0 + 2 * beat); nz(t0 + beat, 0.15, 0.35, 'bandpass', 2000); nz(t0 + 3 * beat, 0.15, 0.35, 'bandpass', 2000);
        for (let i = 0; i < 8; i++) nz(t0 + i * beat / 2, 0.04, 0.15, 'highpass', 8000);
        ch.forEach(n => tone(mtof(root + n), t0, bar * 0.95, 'triangle', 0.09, 2500, 0.05));
        for (let i = 0; i < 4; i++) tone(mtof(root - 12 + ch[0]), t0 + i * beat, beat * 0.8, 'triangle', 0.3, 700);
        for (let i = 0; i < 8; i++) if (i % 3 !== 2) tone(mtof(root + 12 + ch[(i * 2) % 3] + (i === 4 ? 2 : 0)), t0 + i * beat / 2, beat / 2, 'square', 0.05, 3200);
      } else if (style === 'swing') {
        const sw = beat * 2 / 3;
        for (let i = 0; i < 4; i++) { tone(mtof(root - 12 + [ch[0], ch[1] - 12, ch[2] - 12, ch[1] - 12 + 2][i]), t0 + i * beat, beat * 0.9, 'triangle', 0.32, 600); if (i % 2) nz(t0 + i * beat, 0.25, 0.1, 'bandpass', 3000); nz(t0 + i * beat + sw, 0.08, 0.06, 'highpass', 6000); }
        ch.concat([ch[0] + 11]).forEach(n => tone(mtof(root + n), t0 + beat * 0.05, bar * 0.9, 'sine', 0.07, 1800, 0.12));
        if (b % 2 === 0) [0, 2, 4, 7].forEach((n, i) => tone(mtof(root + 12 + ch[0] + n + (mode === 'major' ? 0 : -1)), t0 + i * beat + (i % 2 ? sw - beat / 2 : 0), beat * 1.3, 'triangle', 0.08, 2200, 0.03));
      } else if (style === 'ambient') {
        ch.concat([ch[0] + 14]).forEach((n, i) => tone(mtof(root + n), t0 + i * 0.3, bar * 1.6, 'sine', 0.08, 1400, bar * 0.5));
        tone(mtof(root - 24 + ch[0]), t0, bar * 1.4, 'sine', 0.18, 400, 1.2);
        if (b % 2) tone(mtof(root + 24 + ch[1]), t0 + beat * 1.5, beat * 4, 'sine', 0.04, 3000, 0.4);
      } else if (style === 'ballad') {
        kick(t0, 0.45); nz(t0 + 2 * beat, 0.4, 0.12, 'bandpass', 1500);
        for (let i = 0; i < 8; i++) tone(mtof(root + ch[[0, 1, 2, 1, 0, 2, 1, 2][i]] + (i > 3 ? 12 : 0)), t0 + i * beat / 2, beat * 1.5, 'triangle', 0.09, 1600, 0.005);
        tone(mtof(root - 12 + ch[0]), t0, bar, 'sine', 0.28, 500, 0.05);
        if (b % 2 === 1) tone(mtof(root + 12 + ch[2] - (mode === 'minor' ? 1 : 0)), t0 + beat, beat * 2.5, 'sine', 0.07, 2000, 0.2);
      } else { // folk — «домбра»: щипковые двухголосия
        for (let i = 0; i < 8; i++) { const n = i % 2 ? ch[1] : ch[0]; tone(mtof(root + n), t0 + i * beat / 2, beat * 0.6, 'sawtooth', 0.09, 1300, 0.003); tone(mtof(root + n + 7), t0 + i * beat / 2 + 0.012, beat * 0.5, 'sawtooth', 0.05, 1300, 0.003); }
        kick(t0, 0.4); kick(t0 + 2 * beat, 0.3); nz(t0 + beat, 0.1, 0.12, 'bandpass', 900); nz(t0 + 3 * beat, 0.1, 0.12, 'bandpass', 900);
        tone(mtof(root - 12 + ch[0]), t0, bar * 0.9, 'triangle', 0.2, 500, 0.02);
      }
    }
    const buf = await ctx.startRendering();
    return wav(buf);
  }
  function wav(buf) {
    const d = buf.getChannelData(0), n = d.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i])); const k = mx > 0 ? 0.92 / mx : 1;
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * k)) * 32767, true);
    return new Blob([ab], { type: 'audio/wav' });
  }

  const DAYS = [
    { date: '2026-10-11T17:40', scene: 'park', seed: 11,
      text: 'Гуляли с подругой по парку, всё в жёлтых листьях. Было холодно, но мы пили какао и долго разговаривали. Солнце садилось низко, листья шуршали под ногами, пахло мокрой корой. Сидели на скамейке у пруда, пока не замёрзли руки. Тихо и очень тепло внутри.',
      song: { kind: 'link', url: 'https://www.youtube.com/results?search_query=Frank+Sinatra+Autumn+in+New+York', artist: 'Frank Sinatra', title: 'Autumn in New York', genre: 'джаз', year: '1957', tempo: 'slow', mood: 'light' } },
    { date: '2026-11-19T03:10', scene: 'office', seed: 22,
      text: 'Срочная сдача проекта, всю ночь в офисе. Кофе за кофе, в наушниках электроника, дедлайн в 9 утра. Нервы на пределе, команда носилась между столами, сервер падал дважды. Успели в последнюю минуту!',
      song: { kind: 'gen', gen: { bpm: 128, mode: 'minor', root: 57, style: 'electro' }, artist: 'Із · генеративный трек', title: 'Deadline Pulse', genre: 'техно' } },
    { date: '2026-07-20T15:20', scene: 'sea', seed: 33,
      text: 'Поехали с друзьями на море! Жара, солнце, мы бегом неслись в воду, ныряли в волны и хохотали. Ели холодный арбуз прямо на пляже, кто-то включил музыку, и мы танцевали на горячем песке. Счастье!',
      song: { kind: 'gen', gen: { bpm: 120, mode: 'major', root: 60, style: 'pop' }, artist: 'Із · генеративный трек', title: 'Солёные волосы', genre: 'поп' } },
    { date: '2026-02-08T08:05', scene: 'snowcity', seed: 44,
      text: 'Проснулась рано, город ещё спал. Вышла одна пройтись: пустые улицы, свежий снег, никого вокруг. Тишина такая, что слышно, как снег скрипит под ногами. Долго стояла у фонаря и просто смотрела, как медленно падают снежинки.',
      song: { kind: 'gen', gen: { bpm: 64, mode: 'major', root: 62, style: 'ambient' }, artist: 'Із · генеративный трек', title: 'Белый шум утра', genre: 'эмбиент' } },
    { date: '2026-09-03T19:30', scene: 'station', seed: 55,
      text: 'Провожала брата на вокзале: он уезжает учиться в другой город. Шёл дождь, перрон весь в лужах, мы стояли под одним зонтом и молчали. Вспомнили, как в детстве играли во дворе. Долго прощались. Поезд тронулся, и стало пусто и грустно.',
      song: { kind: 'gen', gen: { bpm: 72, mode: 'minor', root: 57, style: 'ballad' }, artist: 'Із · генеративный трек', title: 'Последний вагон', genre: 'ретро-баллада' } },
    { date: '2026-11-02T19:00', scene: 'kitchen', seed: 66,
      text: 'Выпал первый снег! Вечером приехала к маме, на кухне пахло тестом и укропом, мы вместе лепили пельмени и слушали старые песни. За окном всё белое, а у нас тепло, уютно и смешно: мука на носу у обеих.',
      song: { kind: 'gen', gen: { bpm: 96, mode: 'major', root: 62, style: 'folk' }, artist: 'Із · генеративный трек', title: 'Домбра у окна', genre: 'фолк, домбра' } }
  ];

  async function buildDemoInputs(onProgress) {
    const out = [];
    for (let i = 0; i < DAYS.length; i++) {
      const d = DAYS[i]; onProgress && onProgress(i, DAYS.length);
      const photos = [];
      for (let v = 0; v < 3; v++) photos.push(await photoBlob(d.scene, v, d.seed * 10 + v));
      let song = { ...d.song };
      if (d.song.kind === 'gen') { song.blob = await synth({ ...d.song.gen, dur: 24 }); song.kind = 'file'; song.name = d.song.title + '.wav'; song.license = 'сгенерировано прототипом «Із», свободное использование'; delete song.gen; }
      out.push({ date: d.date, text: d.text, photos, song, demo: true });
    }
    return out;
  }

  G.IZ.demo = { buildDemoInputs, synth, SCENES, photoBlob };
})(window);
