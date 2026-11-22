/* render.js — рендер «страницы дневника»: вертикальный кадр 9:16 (720×1280).
 * Постоянный слой: бумага, сетка, шапка с номером и датой, название, подпись, полоса музыки, «компас дня».
 * Переменный слой: один из пяти художественных приёмов + акцент второго. */
(function (G) {
  'use strict';
  const { clamp, hexRgb, TECH } = G.IZ;
  const W = 720, H = 1280, M = 44;
  const ZONE = { x: M, y: 104, w: W - 2 * M, h: 780 };
  const FONTS = { serif: '"Cormorant Garamond", "Lora", Georgia, serif', hand: '"Caveat", "Segoe Print", cursive', mono: '"JetBrains Mono", "DejaVu Sans Mono", monospace', grotesk: '"Unbounded", "Manrope", "Arial Black", sans-serif' };
  const WD = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rgba = (hx, a) => { const [r, g, b] = hexRgb(hx); return `rgba(${r},${g},${b},${a})`; };

  function cover(img, w, h, fx = 0.5, fy = 0.5) {
    const c = mk(w, h), x = c.getContext('2d');
    const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    x.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh); return c;
  }
  function nearest(pal, r, g, b) { let bi = 0, bd = 1e9; for (let i = 0; i < pal.length; i++) { const p = pal[i]; const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } } return pal[bi]; }

  const grainCache = [];
  function grainTiles() {
    if (grainCache.length) return grainCache;
    for (let k = 0; k < 4; k++) { const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); grainCache.push(c); }
    return grainCache;
  }
  const paperCache = {};
  function paperTex(col) {
    if (paperCache[col]) return paperCache[col];
    const c = mk(W, H), x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, W, H);
    const r = rng(7);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(80,60,40,${r() * 0.035})`; const s = 1 + r() * 2.5; x.fillRect(r() * W, r() * H, s, s); }
    for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(120,100,80,${0.025 + r() * 0.03})`; x.lineWidth = 0.6; x.beginPath(); const y = r() * H, xx = r() * W; x.moveTo(xx, y); x.lineTo(xx + 30 + r() * 90, y + (r() - 0.5) * 8); x.stroke(); }
    paperCache[col] = c; return c;
  }

  /* --------- подготовка кадров под приём --------- */
  function prepare(day, imgs) {
    const P = day.passport, seed = hashStr(day.id), pal = P.palette.map(hexRgb);
    const zw = ZONE.w, zh = ZONE.h;
    return imgs.map((img, idx) => {
      const r = rng(seed + idx * 101);
      const out = { idx };
      const tech = P.tech;
      if (tech === 'monet') {
        const base = cover(img, zw, zh), bx = base.getContext('2d', { willReadFrequently: true });
        const data = bx.getImageData(0, 0, zw, zh).data;
        const c = mk(zw, zh), x = c.getContext('2d');
        x.filter = 'blur(10px) saturate(1.2)'; x.drawImage(base, 0, 0); x.filter = 'none';
        x.fillStyle = rgba(P.palette[0], 0.12); x.fillRect(0, 0, zw, zh);
        const lumAt = (px, py) => { px = clamp(px | 0, 0, zw - 1); py = clamp(py | 0, 0, zh - 1); const i = (py * zw + px) * 4; return data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11; };
        x.lineCap = 'round';
        const passes = [[1400, 11, 26], [4200, 6, 15], [3000, 3.5, 9]];
        for (const [n, wid, len] of passes) for (let i = 0; i < n; i++) {
          const px = r() * zw, py = r() * zh, ii = ((py | 0) * zw + (px | 0)) * 4;
          let cr = data[ii], cg = data[ii + 1], cb = data[ii + 2];
          const np = nearest(pal, cr, cg, cb); const k = 0.38; cr = cr * (1 - k) + np[0] * k; cg = cg * (1 - k) + np[1] * k; cb = cb * (1 - k) + np[2] * k;
          const j = (r() - 0.5) * 26; cr += j; cg += j * 0.8; cb += j * 0.5;
          const gx = lumAt(px + 3, py) - lumAt(px - 3, py), gy = lumAt(px, py + 3) - lumAt(px, py - 3);
          const ang = Math.atan2(gy, gx) + Math.PI / 2 + (r() - 0.5) * 0.6, l = len * (0.6 + r() * 0.7);
          x.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${0.55 + r() * 0.4})`; x.lineWidth = wid * (0.7 + r() * 0.6);
          x.beginPath(); x.moveTo(px - Math.cos(ang) * l / 2, py - Math.sin(ang) * l / 2);
          x.quadraticCurveTo(px + (r() - 0.5) * 4, py + (r() - 0.5) * 4, px + Math.cos(ang) * l / 2, py + Math.sin(ang) * l / 2); x.stroke();
        }
        out.painted = c;
        out.light = { x: 0.2 + r() * 0.6, y: 0.15 + r() * 0.4 };
      } else if (tech === 'kandinsky') {
        const base = cover(img, zw, zh), bx = base.getContext('2d', { willReadFrequently: true });
        const d = bx.getImageData(0, 0, zw, zh), pp = pal.concat([[20, 22, 28], [232, 230, 224], [200, 204, 214]]);
        for (let i = 0; i < d.data.length; i += 4) { const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11;
          const q = nearest(pp, d.data[i] * 0.6 + l * 0.4, d.data[i + 1] * 0.6 + l * 0.4, d.data[i + 2] * 0.6 + l * 0.4); d.data[i] = q[0]; d.data[i + 1] = q[1]; d.data[i + 2] = q[2]; }
        bx.putImageData(d, 0, 0); out.poster = base;
        const shapes = [];
        const n = 8 + (r() * 4 | 0);
        for (let i = 0; i < n; i++) {
          const t = r();
          shapes.push({ type: t < 0.35 ? 'circle' : t < 0.65 ? 'line' : t < 0.82 ? 'tri' : t < 0.92 ? 'arc' : 'checker',
            x: r(), y: r(), s: 0.05 + r() * 0.16, a: r() * Math.PI, c: i % 2 ? P.contra[(r() * 3) | 0] : P.palette[(r() * P.palette.length) | 0], beat: (r() * 4) | 0 });
        }
        shapes.push({ type: 'circle', x: 0.25 + r() * 0.5, y: 0.2 + r() * 0.3, s: 0.2, a: 0, c: P.accentCol, beat: 0, big: true });
        out.shapes = shapes; out.cells = Array.from({ length: 12 }, () => ({ dx: 0, dy: 0, seed: r() }));
      } else if (tech === 'matisse') {
        out.photo = cover(img, zw, zh);
        const pts = [], cx = zw * (0.42 + r() * 0.16), cy = zh * (0.42 + r() * 0.12), R = Math.min(zw, zh) * 0.4;
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; pts.push([cx + Math.cos(a) * R * (0.78 + r() * 0.35), cy + Math.sin(a) * R * (0.85 + r() * 0.4)]); }
        out.blob = pts;
        const leaves = [];
        for (let i = 0; i < 9; i++) leaves.push({ x: r(), y: r(), s: 0.1 + r() * 0.16, a: r() * Math.PI * 2, c: P.palette[(r() * P.palette.length) | 0], kind: r() < 0.5 ? 'frond' : 'star', ph: r() * 6 });
        out.leaves = leaves;
        out.blocks = [{ x: r() * 0.3, y: r() * 0.2, w: 0.5 + r() * 0.3, h: 0.35 + r() * 0.2, c: P.palette[1 % P.palette.length] }, { x: 0.4 + r() * 0.3, y: 0.5 + r() * 0.2, w: 0.4, h: 0.4, c: P.palette[2 % P.palette.length] }];
      } else if (tech === 'ma') {
        const pw = Math.round(zw * 0.54), phh = Math.round(pw * 1.22);
        const c = cover(img, pw, phh), x = c.getContext('2d');
        const d = x.getImageData(0, 0, pw, phh);
        for (let i = 0; i < d.data.length; i += 4) { const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11; for (let k = 0; k < 3; k++) d.data[i + k] = (d.data[i + k] * 0.45 + l * 0.55) * 0.85 + 255 * 0.15 * 0.8; }
        x.putImageData(d, 0, 0); out.small = c;
        const left = (seed + idx) % 2 === 0;
        out.pos = { x: left ? zw * 0.06 : zw - pw - zw * 0.06, y: zh * (0.06 + r() * 0.1) };
        out.enso = { x: left ? zw * 0.72 : zw * 0.28, y: zh * 0.74, R: zw * 0.17, start: r() * Math.PI * 2, gap: 0.35 + r() * 0.3 };
      } else { // film
        const c = cover(img, zw - 60, zh - 40), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height);
        const tint = hexRgb(P.palette[0]);
        for (let i = 0; i < d.data.length; i += 4) {
          for (let k = 0; k < 3; k++) { let v = d.data[i + k] / 255; v = 0.1 + v * 0.78; v = v * 0.82 + (tint[k] / 255) * 0.18; d.data[i + k] = v * 255; }
          d.data[i] = Math.min(255, d.data[i] * 1.06); d.data[i + 2] *= 0.9;
        }
        x.putImageData(d, 0, 0);
        const g = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.25, c.width / 2, c.height / 2, c.height * 0.75);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,0,0.55)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
        out.toned = c; out.leak = { y: r(), sp: 0.5 + r() };
      }
      // для акцентов
      out.r = rng(seed + idx * 7 + 3);
      out.accentShapes = Array.from({ length: 3 }, () => ({ x: out.r(), y: out.r(), s: 0.05 + out.r() * 0.08, a: out.r() * 3, c: P.palette[(out.r() * P.palette.length) | 0] }));
      return out;
    });
  }

  /* --------- приёмы --------- */
  function drawMonet(x, f, t, p, P, bEnv) {
    const zw = ZONE.w, zh = ZONE.h, s = 1.02 + p * 0.06;
    x.save(); x.translate(zw / 2, zh / 2); x.scale(s, s); x.translate(-zw / 2 + (p - 0.5) * 14, -zh / 2);
    x.drawImage(f.painted, 0, 0); x.restore();
    // дрожащий свет
    const lx = (f.light.x + Math.sin(t * 0.4) * 0.05) * zw, ly = (f.light.y + Math.cos(t * 0.3) * 0.04) * zh;
    const g = x.createRadialGradient(lx, ly, 10, lx, ly, zw * 0.7);
    g.addColorStop(0, `rgba(255,236,200,${0.32 + 0.05 * Math.sin(t * 1.7)})`); g.addColorStop(1, 'rgba(255,236,200,0)');
    x.globalCompositeOperation = 'soft-light'; x.fillStyle = g; x.fillRect(0, 0, zw, zh); x.globalCompositeOperation = 'source-over';
  }
  function drawKandinsky(x, f, t, p, P, bEnv, beatIdx) {
    const zw = ZONE.w, zh = ZONE.h, cols = 3, rows = 4, cw = zw / cols, ch = zh / rows;
    x.fillStyle = '#ecebe6'; x.fillRect(0, 0, zw, zh);
    for (let i = 0; i < cols * rows; i++) {
      const cx = i % cols, cy = (i / cols) | 0, cell = f.cells[i];
      const hit = ((beatIdx * 7 + i * 3) % 5) === 0;
      const dx = hit ? (cell.seed - 0.5) * 26 * bEnv : 0, dy = hit ? (0.5 - cell.seed) * 18 * bEnv : 0;
      x.save(); x.beginPath(); x.rect(cx * cw + 3, cy * ch + 3, cw - 6, ch - 6); x.clip();
      x.drawImage(f.poster, cx * cw, cy * ch, cw, ch, cx * cw + dx, cy * ch + dy, cw, ch); x.restore();
    }
    x.strokeStyle = P.ink; x.lineWidth = 3; for (let i = 1; i < cols; i++) { x.beginPath(); x.moveTo(i * cw, 0); x.lineTo(i * cw, zh); x.stroke(); }
    for (let j = 1; j < rows; j++) { x.beginPath(); x.moveTo(0, j * ch); x.lineTo(zw, j * ch); x.stroke(); }
    for (const sh of f.shapes) {
      const pulse = 1 + (sh.beat === beatIdx % 4 ? 0.12 * bEnv : 0), S = sh.s * zw * pulse, X = sh.x * zw, Y = sh.y * zh;
      x.save(); x.translate(X, Y); x.rotate(sh.a + t * 0.05 * (sh.beat - 1.5));
      if (sh.type === 'circle') {
        x.globalAlpha *= sh.big ? 0.88 : 1;
        x.fillStyle = sh.c; x.beginPath(); x.arc(0, 0, S * (sh.big ? 1.6 : 1), 0, 7); x.fill();
        x.strokeStyle = P.ink; x.lineWidth = sh.big ? 4 : 2; x.beginPath(); x.arc(0, 0, S * (sh.big ? 1.6 : 1) + 6, 0, 7); x.stroke();
        if (sh.big) { x.fillStyle = P.contra[1]; x.beginPath(); x.arc(0, 0, S * 0.55, 0, 7); x.fill(); x.fillStyle = P.ink; x.beginPath(); x.arc(0, 0, S * 0.22, 0, 7); x.fill(); }
      } else if (sh.type === 'line') { x.strokeStyle = P.ink; x.lineWidth = 3 + sh.s * 30; x.beginPath(); x.moveTo(-S * 2.2, 0); x.lineTo(S * 2.2, 0); x.stroke(); }
      else if (sh.type === 'tri') { x.fillStyle = sh.c; x.strokeStyle = P.ink; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -S); x.lineTo(S * 0.9, S * 0.7); x.lineTo(-S * 0.9, S * 0.7); x.closePath(); x.fill(); x.stroke(); }
      else if (sh.type === 'arc') { x.strokeStyle = sh.c; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, S * 1.3, 0, Math.PI * 1.1); x.stroke(); }
      else { const q = S / 3; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { x.fillStyle = (a + b) % 2 ? P.ink : '#ecebe6'; x.fillRect(a * q - S / 2, b * q - S / 2, q, q); } }
      x.restore();
    }
  }
  function blobPath(x, pts, wob) {
    const n = pts.length; x.beginPath();
    const P = pts.map(([a, b], i) => [a + Math.sin(wob + i) * 5, b + Math.cos(wob * 0.8 + i) * 5]);
    x.moveTo((P[0][0] + P[n - 1][0]) / 2, (P[0][1] + P[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    x.closePath();
  }
  function frond(x, S, kind) {
    x.beginPath();
    if (kind === 'star') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = i % 2 ? S * 0.45 : S; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); return; }
    x.moveTo(0, S);
    for (let i = 0; i <= 6; i++) { const y = S - i * S / 3; x.quadraticCurveTo(-S * 0.75, y - S / 6, -S * 0.08, y - S / 3); }
    for (let i = 6; i >= 0; i--) { const y = S - i * S / 3; x.quadraticCurveTo(S * 0.75, y - S / 6, S * 0.08, y); }
    x.closePath();
  }
  function drawMatisse(x, f, t, p, P, bEnv) {
    const zw = ZONE.w, zh = ZONE.h;
    for (const b of f.blocks) { x.fillStyle = b.c; x.fillRect(b.x * zw, b.y * zh, b.w * zw, b.h * zh); }
    x.save(); blobPath(x, f.blob, t * 0.8); x.clip();
    const s = 1.04 + bEnv * 0.02; x.translate(zw / 2, zh / 2); x.scale(s, s); x.translate(-zw / 2, -zh / 2);
    x.filter = 'saturate(1.35) contrast(1.05)'; x.drawImage(f.photo, 0, 0); x.filter = 'none'; x.restore();
    for (const l of f.leaves) {
      x.save(); x.translate(l.x * zw, l.y * zh); x.rotate(l.a + Math.sin(t * 1.3 + l.ph) * 0.12); const sc = 1 + bEnv * 0.07; x.scale(sc, sc);
      x.fillStyle = l.c; frond(x, l.s * zw, l.kind); x.fill(); x.restore();
    }
  }
  function enso(x, e, prog, ink) {
    const steps = 90, end = Math.floor(steps * clamp(prog));
    for (let i = 0; i < end; i++) {
      const a0 = e.start + (i / steps) * (Math.PI * 2 - e.gap), a1 = e.start + ((i + 1) / steps) * (Math.PI * 2 - e.gap);
      const w = 4 + 14 * Math.sin(Math.PI * (i / steps)) ** 0.7;
      x.strokeStyle = rgba(ink, 0.82 - i / steps * 0.25); x.lineWidth = w; x.lineCap = 'round';
      const rr = e.R * (1 + Math.sin(i * 0.3) * 0.015);
      x.beginPath(); x.arc(e.x, e.y, rr, a0, a1); x.stroke();
    }
  }
  function drawMa(x, f, t, p, P) {
    const a = clamp(p * 3);
    x.globalAlpha = a; x.drawImage(f.small, f.pos.x, f.pos.y + (1 - a) * 8); x.globalAlpha = 1;
    x.strokeStyle = rgba(P.ink, 0.35); x.lineWidth = 1; x.strokeRect(f.pos.x - 8, f.pos.y - 8, f.small.width + 16, f.small.height + 16);
    enso(x, f.enso, p * 1.6, '#24211f');
  }
  function drawFilm(x, f, t, p, P, bEnv) {
    const zw = ZONE.w, zh = ZONE.h;
    x.fillStyle = '#17120e'; x.fillRect(0, 0, zw, zh);
    for (let y = 18; y < zh - 10; y += 34) { x.fillStyle = '#e9dcc4'; roundRect(x, 8, y, 14, 20, 3); x.fill(); roundRect(x, zw - 22, y, 14, 20, 3); x.fill(); }
    const weave = Math.sin(t * 17) * 1.2, flick = 0.96 + Math.sin(t * 23) * 0.025 + Math.sin(t * 7.1) * 0.015;
    x.save(); x.filter = `brightness(${flick})`; roundRect(x, 30, 20 + weave, f.toned.width, f.toned.height, 10); x.clip();
    x.drawImage(f.toned, 30, 20 + weave); x.filter = 'none';
    const ly = (f.leak.y + Math.sin(t * 0.3 * f.leak.sp) * 0.3) * zh;
    const g = x.createRadialGradient(zw * 0.9, ly, 10, zw * 0.9, ly, zw * 0.6);
    g.addColorStop(0, 'rgba(255,120,40,0.45)'); g.addColorStop(0.5, 'rgba(255,80,30,0.12)'); g.addColorStop(1, 'rgba(255,80,30,0)');
    x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, zw, zh); x.globalCompositeOperation = 'source-over';
    x.restore();
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  function drawAccent(x, f, t, P, bEnv) {
    const zw = ZONE.w, zh = ZONE.h, a = P.accent; if (!a || a === P.tech) return;
    if (a === 'kandinsky') { x.strokeStyle = P.ink; x.lineWidth = 3; for (const s of f.accentShapes.slice(0, 2)) { x.beginPath(); x.moveTo(s.x * zw, s.y * zh); x.lineTo(s.x * zw + 140 * Math.cos(s.a), s.y * zh + 140 * Math.sin(s.a)); x.stroke(); }
      const s = f.accentShapes[2]; x.strokeStyle = s.c; x.lineWidth = 5; x.beginPath(); x.arc(s.x * zw, s.y * zh, 30 + bEnv * 6, 0, 7); x.stroke(); }
    else if (a === 'matisse') { for (const s of f.accentShapes.slice(0, 2)) { x.save(); x.translate(s.x * zw, s.y * zh); x.rotate(s.a + Math.sin(t) * 0.1); x.fillStyle = s.c; x.globalAlpha = 0.9; frond(x, s.s * zw, 'frond'); x.fill(); x.restore(); } x.globalAlpha = 1; }
    else if (a === 'ma') { /* печать уже есть в каркасе: усиливаем пустоту — светлая вуаль снизу */ const g = x.createLinearGradient(0, zh * 0.6, 0, zh); g.addColorStop(0, rgba(P.paper, 0)); g.addColorStop(1, rgba(P.paper, 0.55)); x.fillStyle = g; x.fillRect(0, 0, zw, zh); }
    else if (a === 'film') { x.fillStyle = 'rgba(224,120,42,0.9)'; x.font = `600 20px ${FONTS.mono}`; x.textAlign = 'right'; x.fillText(filmStamp(P._date), zw - 24, zh - 22); x.textAlign = 'left'; }
    else if (a === 'monet') { const g = x.createRadialGradient(zw * 0.3, zh * 0.25, 5, zw * 0.3, zh * 0.25, zw * 0.6); g.addColorStop(0, 'rgba(255,240,210,0.28)'); g.addColorStop(1, 'rgba(255,240,210,0)'); x.globalCompositeOperation = 'soft-light'; x.fillStyle = g; x.fillRect(0, 0, zw, zh); x.globalCompositeOperation = 'source-over'; }
  }
  function filmStamp(d) { const dt = new Date(d); return `’${String(dt.getFullYear()).slice(2)} ${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getDate()).padStart(2, '0')}`; }

  function wrap(x, text, maxW, maxLines) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { const l = lines.slice(0, maxLines); l[maxLines - 1] = l[maxLines - 1].replace(/\s*\S*$/, '') + '…'; return l; }
    return lines;
  }

  /* --------- кадр целиком --------- */
  function drawFrame(ctx, day, frames, t, opts = {}) {
    const P = day.passport; P._date = day.date;
    const x = ctx; x.save();
    x.drawImage(paperTex(P.paper), 0, 0);
    const n = Math.max(1, frames.length), sd = P.sceneDur;
    const sIdx = Math.floor(t / sd), local = t - sIdx * sd, p = local / sd;
    const beatT = t / P.beat, beatIdx = Math.floor(beatT), bEnv = Math.exp(-(beatT - beatIdx) * 5);
    const cur = frames[sIdx % n], prev = frames[(sIdx - 1 + n) % n];
    // зона фото (постоянное место, переменная «воздушность»)
    const inset = P.tech === 'ma' || P.tech === 'film' ? 0 : Math.round(P.air * 26);
    x.save(); x.translate(ZONE.x + inset, ZONE.y + inset); x.scale((ZONE.w - 2 * inset) / ZONE.w, (ZONE.h - 2 * inset) / ZONE.h);
    x.beginPath(); x.rect(0, 0, ZONE.w, ZONE.h); x.clip();
    if (P.tech !== 'ma' && P.tech !== 'matisse') { x.fillStyle = P.paper; x.fillRect(0, 0, ZONE.w, ZONE.h); }
    const draw = (f, tt, pp, alpha) => {
      if (!f) return; x.save(); x.globalAlpha = alpha;
      ({ monet: drawMonet, kandinsky: drawKandinsky, matisse: drawMatisse, ma: drawMa, film: drawFilm })[P.tech](x, f, tt, pp, P, bEnv, beatIdx);
      x.restore();
    };
    if (sIdx > 0 && local < P.fade && n > 1) {
      // переход: старый кадр под новым (для «ма» — сначала исчезает, потом появляется)
      if (P.tech === 'ma') { draw(prev, t, 1, 1 - local / P.fade); }
      else { draw(prev, t, 1, 1); draw(cur, t, p, local / P.fade); }
    } else draw(cur, t, p, 1);
    drawAccent(x, cur, t, P, bEnv);
    // зерно
    const gr = grainTiles()[(Math.floor(t * 24)) % 4];
    x.globalAlpha = P.grain * 0.5; x.globalCompositeOperation = 'overlay';
    for (let gx = 0; gx < ZONE.w; gx += 256) for (let gy = 0; gy < ZONE.h; gy += 256) x.drawImage(gr, gx, gy);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (P.tech === 'film') { x.fillStyle = 'rgba(232,120,40,0.92)'; x.font = `600 22px ${FONTS.mono}`; x.textAlign = 'right'; x.fillText(filmStamp(day.date), ZONE.w - 50, ZONE.h - 40); x.textAlign = 'left'; }
    x.restore();

    // ---- постоянный каркас ----
    const ink = P.ink;
    x.fillStyle = ink; x.font = `500 17px ${FONTS.mono}`; x.textBaseline = 'alphabetic';
    const dt = new Date(day.date);
    x.fillText(`ІЗ · № ${String(day.num || 1).padStart(3, '0')}`, M, 62);
    x.textAlign = 'right'; x.fillText(`${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()} · ${WD[dt.getDay()]}`, W - M, 62); x.textAlign = 'left';
    x.strokeStyle = rgba(ink, 0.6); x.lineWidth = 1; x.beginPath(); x.moveTo(M, 78); x.lineTo(W - M, 78); x.stroke();
    // технический ярлык приёма (маленький, мелким капсом)
    x.font = `500 12px ${FONTS.mono}`; x.fillStyle = rgba(ink, 0.55);
    x.fillText(TECH[P.tech].name.toUpperCase() + (P.accent ? ' + ' + TECH[P.accent].name.toUpperCase() : ''), M, 96);

    // название
    const ty = 948, tIn = clamp((t - 0.3) / 1.2);
    x.globalAlpha = tIn;
    if (P.type.title === 'serif') { x.font = `600 56px ${FONTS.serif}`; } else { x.font = `700 40px ${FONTS.grotesk}`; }
    x.fillStyle = ink;
    const tl = wrap(x, day.title, W - 2 * M - 90, 2);
    tl.forEach((l, i) => x.fillText(P.type.title === 'grotesk' ? l.toUpperCase() : l, M, ty + i * (P.type.title === 'serif' ? 56 : 48) + (1 - tIn) * 10));
    x.globalAlpha = 1;
    // подпись (печатается)
    const capY = ty + (tl.length - 1) * (P.type.title === 'serif' ? 56 : 48) + 48;
    const capFont = { hand: `500 34px ${FONTS.hand}`, mono: `400 19px ${FONTS.mono}`, serifItalic: `italic 500 28px ${FONTS.serif}` }[P.type.caption];
    const capLH = { hand: 36, mono: 27, serifItalic: 32 }[P.type.caption];
    x.font = capFont; x.fillStyle = rgba(ink, 0.82);
    const cap = '«' + (day.analysis.text.caption || '') + '»';
    const shown = opts.still ? cap : cap.slice(0, Math.floor(clamp((t - 1.2) / Math.max(2, cap.length * 0.045)) * cap.length));
    wrap(x, shown, W - 2 * M - 10, 3).forEach((l, i) => x.fillText(l, M, capY + i * capLH));

    // полоса музыки (постоянный элемент: огибающая песни + плейхед)
    const my = 1186, mw = W - 2 * M - 110, curve = day.analysis.music.curve || [];
    const prog = clamp(t / P.duration), nb = 48;
    for (let i = 0; i < nb; i++) {
      const v = curve[Math.floor(i / nb * curve.length)] || 0.3, h = 4 + v * 34, xx = M + i * (mw / nb);
      x.fillStyle = i / nb < prog ? P.accentCol : rgba(ink, 0.25); x.fillRect(xx, my - h, mw / nb - 3, h);
    }
    x.font = `400 14px ${FONTS.mono}`; x.fillStyle = rgba(ink, 0.75);
    const song = day.song || {}, mu = day.analysis.music;
    const songLabel = [song.artist, song.title].filter(Boolean).join(' — ') || song.name || 'песня дня';
    x.fillText('♪ ' + songLabel.slice(0, 44), M, my + 26);
    x.fillStyle = rgba(ink, 0.5); x.fillText(`${mu.bpm} BPM · ${mu.key} · ${mu.genre}`, M, my + 46);
    // компас дня: V по горизонтали, A по вертикали
    const cx = W - M - 42, cy = my - 4, R = 40;
    x.strokeStyle = rgba(ink, 0.7); x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    x.strokeStyle = rgba(ink, 0.25); x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    const dx = cx + P.V * R * 0.82, dy = cy - (P.A - 0.5) * 2 * R * 0.82;
    x.fillStyle = P.accentCol; x.beginPath(); x.arc(dx, dy, 7 + bEnv * 2, 0, 7); x.fill(); x.strokeStyle = ink; x.lineWidth = 1.5; x.stroke();
    x.font = `400 10px ${FONTS.mono}`; x.fillStyle = rgba(ink, 0.55); x.textAlign = 'center';
    x.fillText('ЯРКО', cx, cy - R - 6); x.fillText('ТИХО', cx, cy + R + 14); x.textAlign = 'left';
    // печать «ма» — постоянно для приёма ма, иначе маленькая подпись
    if (P.tech === 'ma' || P.accent === 'ma') {
      x.fillStyle = '#b8322a'; x.fillRect(W - M - 60, 905, 46, 46); x.fillStyle = P.paper; x.font = `700 28px ${FONTS.serif}`; x.textAlign = 'center'; x.fillText(day.title.charAt(0), W - M - 37, 938); x.textAlign = 'left';
    }
    x.strokeStyle = rgba(ink, 0.6); x.lineWidth = 1; x.beginPath(); x.moveTo(M, H - 34); x.lineTo(W - M, H - 34); x.stroke();
    x.font = `400 11px ${FONTS.mono}`; x.fillStyle = rgba(ink, 0.5); x.fillText('дневник атмосферы дня', M, H - 16);
    x.textAlign = 'right'; x.fillText(`V ${P.V >= 0 ? '+' : ''}${P.V.toFixed(2)} · A ${P.A.toFixed(2)} · W ${P.W >= 0 ? '+' : ''}${P.W.toFixed(2)}`, W - M, H - 16); x.textAlign = 'left';
    x.restore();
  }

  G.IZ.render = { W, H, prepare, drawFrame, FONTS, hashStr, rng, cover, mk };
})(window);
