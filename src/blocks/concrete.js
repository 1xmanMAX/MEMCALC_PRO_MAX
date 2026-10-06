// =====================================================================
//  Bloques gráficos/analíticos — módulo «concrete»
//   pmgen    : diagrama de interacción P–M por compatibilidad de deformaciones (fibras)
//              para secciones compuestas por rectángulos (columnas, placas, L, T, I)
//              con barras por coordenadas, líneas, anillos o espaciamiento; flexión
//              uniaxial en X o Y y biaxial exacta (contorno de carga Mx–My a Pu)
//   slab2way : paño de losa en dos direcciones — método de coeficientes E.060 13.7
//   stmbeam  : viga de gran peralte — modelo puntal-tensor (ACI 318-19 Cap. 23)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, BARS, K, interp } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, pos, f2 } from '../blocks.js';
import { slabCoef, slabCase, SLAB_TABLES } from '../norms/concrete.js';

const ECU = 0.003;
const lines = (s) => String(s || '').split('\n').map(l => ({ code: l.split('//')[0].trim(), lab: (l.split('//')[1] || '').trim() })).filter(l => l.code);
const toks = (s) => s.split(/[\s,;]+/).filter(Boolean);
// Evalúa una coordenada en cm; admite mezclar variables con unidades y números (cm): "b-6"
function evCm(s, S) {
  try { return evalParam(s, S, 'cm'); } catch (e) {
    const S2 = new Map(); for (const [k, v] of S) { if (math.isUnit(v)) { try { S2.set(k, v.toNumber('cm')); continue; } catch (er) { /* */ } } S2.set(k, v); }
    try { const r = math.evaluate(String(s), S2); if (typeof r === 'number') return r; } catch (er) { /* */ }
    throw e;
  }
}

// ---------------------------------------------------------------------
//  Sección por fibras
// ---------------------------------------------------------------------
function barArea(tok, S) {
  let t = String(tok).trim();
  if (S && /^[A-Za-z_]\w*$/.test(t) && !/^\d/.test(t) && S.has(t)) { const v = S.get(t); t = String(math.isUnit(v) ? v.toNumber('mm') + 'mm' : v); }
  let m = /^(?:Ø|ø|φ)?(\d+(?:\.\d+)?)mm$/i.exec(t);
  if (m) { const d = +m[1] / 10; return { A: Math.PI * d * d / 4, d, lab: 'Ø' + m[1] + 'mm' }; }
  m = /^#?(\d+)$/.exec(t);
  if (m && BARS[+m[1]]) { const b = BARS[+m[1]]; return { A: b.A, d: b.d, lab: b.n, n: +m[1] }; }
  throw new Error('Varilla no reconocida: "' + tok + '" (use el número ASTM, p. ej. 6, o el diámetro, p. ej. 16mm)');
}
export function parseBarsGen(text, S) {
  const out = [];
  const ev = (s) => evCm(s, S);
  for (const { code } of lines(text)) {
    const tk = toks(code), k = tk[0].toUpperCase();
    if (k === 'L' || k === 'M') {
      if (tk.length < 7) throw new Error('Formato: ' + k + ' x1 y1 x2 y2 ' + (k === 'L' ? 'n' : 's') + ' barra');
      const [x1, y1, x2, y2] = tk.slice(1, 5).map(ev), bar = barArea(tk[6], S);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = k === 'L' ? Math.round(evalParam(tk[5], S, '')) : Math.max(1, Math.round(len / ev(tk[5]))) + 1;
      if (!(n >= 1) || n > 400) throw new Error('Número de barras no válido en: ' + code);
      for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, ...bar }); }
    } else if (k === 'R') {
      if (tk.length < 8) throw new Error('Formato: R x1 y1 x2 y2 nx ny barra (anillo perimetral)');
      const [x1, y1, x2, y2] = tk.slice(1, 5).map(ev), nx = Math.round(evalParam(tk[5], S, '')), ny = Math.round(evalParam(tk[6], S, '')), bar = barArea(tk[7], S);
      if (nx < 2 || ny < 2) throw new Error('El anillo requiere nx ≥ 2 y ny ≥ 2 (barras por lado, incluidas esquinas)');
      for (let i = 0; i < nx; i++) { const x = x1 + (x2 - x1) * i / (nx - 1); out.push({ x, y: y1, ...bar }, { x, y: y2, ...bar }); }
      for (let j = 1; j < ny - 1; j++) { const y = y1 + (y2 - y1) * j / (ny - 1); out.push({ x: x1, y, ...bar }, { x: x2, y, ...bar }); }
    } else {
      if (tk.length < 3) throw new Error('Formato de barra: x y barra   (o L/M/R …): "' + code + '"');
      out.push({ x: ev(tk[0]), y: ev(tk[1]), ...barArea(tk[2], S) });
    }
  }
  return out;
}
export function parseRects(text, S) {
  const out = [];
  for (const { code } of lines(text)) {
    const tk = toks(code); if (tk.length < 4) throw new Error('Rectángulo: x0 y0 b h (cm) — "' + code + '"');
    const [x0, y0, b, h] = tk.slice(0, 4).map(s => evCm(s, S));
    pos({ b, h }); out.push({ x0, y0, b, h });
  }
  if (!out.length) throw new Error('Defina al menos un rectángulo de concreto');
  return out;
}
export function makeSection(rects, bars, o) {
  const fc = o.fc, fy = o.fy, Es = o.Es || 2e6;
  pos({ fc, fy, Es });
  const Ag = rects.reduce((s, r) => s + r.b * r.h, 0);
  const nf = o.nfib || 2500, D = Math.sqrt(Ag / nf);
  const fib = [];
  for (const r of rects) {
    const nx = Math.max(1, Math.ceil(r.b / D)), ny = Math.max(1, Math.ceil(r.h / D)), w = r.b / nx, h = r.h / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) fib.push({ x: r.x0 + (i + 0.5) * w, y: r.y0 + (j + 0.5) * h, A: w * h, w, h });
  }
  const xc = rects.reduce((s, r) => s + r.b * r.h * (r.x0 + r.b / 2), 0) / Ag, yc = rects.reduce((s, r) => s + r.b * r.h * (r.y0 + r.h / 2), 0) / Ag;
  const inside = (p) => rects.some(r => p.x >= r.x0 - 1e-6 && p.x <= r.x0 + r.b + 1e-6 && p.y >= r.y0 - 1e-6 && p.y <= r.y0 + r.h + 1e-6);
  bars.forEach(b => { if (!inside(b)) throw new Error(`Barra fuera del concreto en (${f2(b.x)}, ${f2(b.y)}) cm`); });
  const Ast = bars.reduce((s, b) => s + b.A, 0);
  const corners = rects.flatMap(r => [[r.x0, r.y0], [r.x0 + r.b, r.y0], [r.x0, r.y0 + r.h], [r.x0 + r.b, r.y0 + r.h]]);
  const fcU = o.fcMPa || fc / 10.1972; // f'c en MPa para β1 ACI
  const beta1 = o.norma === 'ACI' ? (fcU <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fcU - 28) / 7)) : (fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 280) / 70));
  const phic = o.espiral ? 0.75 : (o.norma === 'ACI' ? 0.65 : 0.70);
  const P0 = 0.85 * fc * (Ag - Ast) + fy * Ast, Pnmax = (o.espiral ? 0.85 : 0.80) * P0;
  return { rects, bars, fib, Ag, Ast, xc, yc, corners, fc, fy, Es, beta1, phic, P0, Pnmax, norma: o.norma || 'E060', ey: fy / Es };
}
// Estado de la sección para un eje neutro de dirección θ (u = vector hacia la fibra comprimida) y profundidad c
function geo(sec, th) {
  const ux = Math.cos(th), uy = Math.sin(th);
  const tmax = Math.max(...sec.corners.map(([x, y]) => x * ux + y * uy)), tmin = Math.min(...sec.corners.map(([x, y]) => x * ux + y * uy));
  const dt = sec.bars.length ? Math.max(...sec.bars.map(b => tmax - (b.x * ux + b.y * uy))) : tmax - tmin;
  return { ux, uy, tmax, D: tmax - tmin, dt };
}
export function stateAt(sec, G, c) {
  const { ux, uy, tmax } = G, a = sec.beta1 * c, k = 0.85 * sec.fc;
  let P = 0, Mx = 0, My = 0;
  for (const f of sec.fib) {
    const dc = tmax - (f.x * ux + f.y * uy), hr = (Math.abs(ux) * f.w + Math.abs(uy) * f.h) / 2;
    const fr = hr > 0 ? Math.max(0, Math.min(1, (a - (dc - hr)) / (2 * hr))) : (dc <= a ? 1 : 0);
    if (fr <= 0) continue;
    const Fc = k * f.A * fr; P += Fc; Mx += Fc * (f.x - sec.xc); My += Fc * (f.y - sec.yc);
  }
  for (const b of sec.bars) {
    const dep = tmax - (b.x * ux + b.y * uy);
    let fs = Math.max(-sec.fy, Math.min(sec.fy, sec.Es * ECU * (c - dep) / c));
    if (dep < a) fs -= k;
    const Fs = b.A * fs; P += Fs; Mx += Fs * (b.x - sec.xc); My += Fs * (b.y - sec.yc);
  }
  return { P, Mx, My, et: ECU * (G.dt - c) / c, c };
}
function phiOf(sec, st, Plim) {
  if (sec.norma === 'ACI') { const e = st.et, ey = sec.ey; return e <= ey ? sec.phic : e >= ey + 0.003 ? 0.9 : sec.phic + (0.9 - sec.phic) * (e - ey) / 0.003; }
  // E.060 9.3.2.2: φ crece linealmente hasta 0.90 cuando φPn disminuye desde min(0.1 f'c Ag, φPb) hasta cero
  if (st.P <= 0) return 0.9;
  if (st.P >= Plim / sec.phic) return sec.phic;
  return 0.9 / (1 + (0.9 - sec.phic) * st.P / Plim);
}
// Curva P–M en la dirección θ: puntos nominales y de diseño ordenados de compresión a tracción
export function curveAt(sec, th, N = 150, axis = null) {
  const G = geo(sec, th);
  const cb = ECU * G.dt / (ECU + sec.ey);
  const Pb = stateAt(sec, G, cb).P;
  const Plim = Math.max(1e-9, Math.min(0.1 * sec.fc * sec.Ag, Pb > 0 ? sec.phic * Pb : Infinity));
  const ux = G.ux, uy = G.uy;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const c = G.D * 6 * Math.pow(0.002 / 6, i / N);
    const st = stateAt(sec, G, c);
    st.phi = phiOf(sec, st, Plim);
    st.M = axis === 'x' ? st.Mx : axis === 'y' ? st.My : st.Mx * ux + st.My * uy; // momento según el eje global (o el gradiente)
    pts.push(st);
  }
  // compresión pura y tracción pura
  pts.unshift({ P: sec.P0, Mx: 0, My: 0, M: 0, c: Infinity, et: -ECU, phi: sec.phic });
  const Tx = sec.bars.reduce((s, b) => s - sec.fy * b.A * (b.x - sec.xc), 0), Ty = sec.bars.reduce((s, b) => s - sec.fy * b.A * (b.y - sec.yc), 0);
  pts.push({ P: -sec.fy * sec.Ast, Mx: Tx, My: Ty, M: axis === 'x' ? Tx : axis === 'y' ? Ty : Tx * ux + Ty * uy, c: 0, et: 1, phi: 0.9 });
  const capP = sec.phic * sec.Pnmax;
  const des = pts.map(p => ({ P: Math.min(p.phi * p.P, capP), Pu: p.phi * p.P, M: p.phi * p.M, Mx: p.phi * p.Mx, My: p.phi * p.My, c: p.c, phi: p.phi }));
  return { th, G, pts, des, Pb, cb, Plim };
}
// M en una curva (puntos {P, M}) para un nivel P; devuelve el mayor |M| entre los cruces (o null)
function mAtP(arr, P, key = 'P') {
  let best = null;
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i], b = arr[i + 1];
    if ((P - a[key]) * (P - b[key]) <= 0 && a[key] !== b[key]) {
      const t = (P - a[key]) / (b[key] - a[key]), m = a.M + t * (b.M - a.M), cc = isFinite(a.c) && isFinite(b.c) ? a.c + t * (b.c - a.c) : (isFinite(b.c) ? b.c : a.c);
      if (best === null || Math.abs(m) > Math.abs(best.M)) best = { M: m, c: cc };
    }
  }
  return best;
}
// P para una excentricidad e = M/P (lado de la curva), nominal y de diseño
function pAtE(cur, e) {
  const pts = cur.pts, ae = Math.abs(e);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]; let b = pts[i + 1];
    if (!(a.P > 0)) break;
    const last = b.P <= 0;
    if (last) { const t0 = a.P / (a.P - b.P); b = { P: 0, M: a.M + t0 * (b.M - a.M), phi: a.phi + t0 * (b.phi - a.phi) }; }
    const ea = Math.abs(a.M) / a.P, eb = b.P > 0 ? Math.abs(b.M) / b.P : Infinity;
    if (ae >= ea && ae <= eb) {
      let lo = 0, hi = 1, P = a.P, ph = a.phi;
      for (let k = 0; k < 60; k++) { const t = (lo + hi) / 2; P = a.P + t * (b.P - a.P); const M = a.M + t * (b.M - a.M); ph = a.phi + t * (b.phi - a.phi); if (Math.abs(M) / Math.max(P, 1e-12) < ae) lo = t; else hi = t; }
      return { Pn: P, phi: ph };
    }
    if (last) break;
  }
  return { Pn: 0, phi: 0.9 };
}
// Contorno de carga (diseño) Mx–My para un nivel Pu (biaxial exacto por fibras)
export function loadContour(sec, Pu, nAng = 72) {
  const out = [];
  for (let k = 0; k < nAng; k++) {
    const th = 2 * Math.PI * k / nAng, cur = curveAt(sec, th, 48), G = cur.G;
    // cur.des P monotónico (decreciente) con el índice; busca el tramo
    const d = cur.des; let j = -1;
    for (let i = 0; i < d.length - 1; i++) if ((Pu - d[i].Pu) * (Pu - d[i + 1].Pu) <= 0 && d[i].Pu !== d[i + 1].Pu) { j = i; break; }
    if (j < 0) return null;
    let lo = isFinite(d[j].c) ? d[j].c : G.D * 50, hi = d[j + 1].c;
    const Plim = cur.Plim;
    const f = (c) => { const st = stateAt(sec, G, c); st.phi = phiOf(sec, st, Plim); return st; };
    let st = null;
    for (let it = 0; it < 24; it++) { const c = (lo + hi) / 2; st = f(c); if (st.phi * st.P > Pu) lo = c; else hi = c; }
    out.push({ th, Mx: st.phi * st.Mx, My: st.phi * st.My, c: st.c });
  }
  return out;
}
function rayCap(poly, ax, ay) {
  const n = Math.hypot(ax, ay); if (n === 0) return null;
  const dx = ax / n, dy = ay / n; let best = null;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const ex = q.Mx - p.Mx, ey = q.My - p.My, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue;
    const r = (p.Mx * ey - p.My * ex) / den, s = (p.Mx * dy - p.My * dx) / den;
    if (r > 0 && s >= -1e-9 && s <= 1 + 1e-9 && (best === null || r > best)) best = r;
  }
  return best;
}

// ---------------------------------------------------------------------
//  Dibujos
// ---------------------------------------------------------------------
function drawSection(sec, cores, W, Hmax, title) {
  const xs = sec.corners.map(c => c[0]), ys = sec.corners.map(c => c[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = x1 - x0, bh = y1 - y0, pl = 60, pr = 40, pt = 30, pb = 46;
  const sc = Math.min((W - pl - pr) / bw, (Hmax - pt - pb) / bh), H = bh * sc + pt + pb;
  const ox = pl + (W - pl - pr - bw * sc) / 2;
  const X = (x) => ox + (x - x0) * sc, Y = (y) => pt + (y1 - y) * sc;
  let g = arrowDefs;
  sec.rects.forEach(r => { g += `<rect x="${X(r.x0)}" y="${Y(r.y0 + r.h)}" width="${r.b * sc}" height="${r.h * sc}" fill="${C.conc}" stroke="none"/>`; });
  // contorno (bordes no compartidos)
  sec.rects.forEach(r => { g += `<rect x="${X(r.x0)}" y="${Y(r.y0 + r.h)}" width="${r.b * sc}" height="${r.h * sc}" fill="none" stroke="${C.ink}" stroke-width="1.3"/>`; });
  sec.rects.forEach(r => { g += `<rect x="${X(r.x0) + 0.7}" y="${Y(r.y0 + r.h) + 0.7}" width="${Math.max(0, r.b * sc - 1.4)}" height="${Math.max(0, r.h * sc - 1.4)}" fill="${C.conc}" stroke="none"/>`; });
  cores.forEach(r => {
    g += `<rect x="${X(r.x0)}" y="${Y(r.y0 + r.h)}" width="${r.b * sc}" height="${r.h * sc}" fill="rgba(209,36,47,.07)" stroke="${C.red}" stroke-width="1.3" rx="2"/>`;
    if (r.lab) g += T(X(r.x0 + r.b / 2), Y(r.y0) + 13, r.lab, { fs: 9, c: C.red });
  });
  const rmin = 2.2;
  sec.bars.forEach(b => { g += `<circle cx="${X(b.x).toFixed(1)}" cy="${Y(b.y).toFixed(1)}" r="${Math.max(rmin, b.d / 2 * sc).toFixed(1)}" fill="${C.steel}"/>`; });
  // centroide y ejes
  const cx = X(sec.xc), cy = Y(sec.yc);
  g += Lne(cx - 14, cy, cx + 30, cy, C.blue, 1).replace('/>', ' marker-end="url(#ar)"/>') + Lne(cx, cy + 14, cx, cy - 30, C.blue, 1).replace('/>', ' marker-end="url(#ar)"/>');
  g += T(cx + 34, cy + 4, 'X', { fs: 10, c: C.blue, a: 'start', b: 1 }) + T(cx, cy - 33, 'Y', { fs: 10, c: C.blue, b: 1 }) + `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${C.blue}"/>`;
  g += dimH(X(x0), X(x1), Y(y0) + 22, f2(bw, 1) + ' cm') + dimV(X(x0) - 22, Y(y1), Y(y0), f2(bh, 1) + ' cm');
  // leyenda de barras
  const grp = {}; sec.bars.forEach(b => { grp[b.lab] = (grp[b.lab] || 0) + 1; });
  const leg = Object.entries(grp).map(([k, v]) => v + ' Ø' + k.replace(/^Ø/, '')).join(' + ');
  g += T(W / 2, H - 6, (title ? title + ' · ' : '') + leg + ' · As = ' + f2(sec.Ast) + ' cm² · ρ = ' + f2(100 * sec.Ast / sec.Ag, 2) + '%', { fs: 10, c: C.axis });
  return svgWrap(W, H, g);
}
function drawPM(cpos, cneg, dem, W, H, title, uM = 't·m') {
  const loop = (key) => { const a = cpos[key].map(p => ({ P: p.P, M: p.M })), b = cneg[key].map(p => ({ P: p.P, M: p.M })).reverse(); return a.concat(b); };
  const nom = loop('pts').map(p => ({ P: p.P / 1000, M: p.M / 1e5 })), des = loop('des').map(p => ({ P: p.P / 1000, M: p.M / 1e5 }));
  const pl = 58, pr = 16, pt = 24, pb = 40;
  const allM = nom.map(p => Math.abs(p.M)).concat(dem.map(d => Math.abs(d.M)));
  const mMax = Math.max(1e-6, ...allM) * 1.1, allP = nom.map(p => p.P).concat(dem.map(d => d.P));
  const pMax = Math.max(...allP) * 1.06, pMin = Math.min(...allP) * 1.12;
  const sx = (W - pl - pr) / (2 * mMax), sy = (H - pt - pb) / (pMax - pMin);
  const X = (m) => pl + (m + mMax) * sx, Y = (p) => pt + (pMax - p) * sy;
  let g = '';
  niceTicks(-mMax, mMax, 6).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 13, f2(t, 0), { fs: 9, c: C.axis }); });
  niceTicks(pMin, pMax, 7).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 5, Y(t) + 3, f2(t, 0), { fs: 9, c: C.axis, a: 'end' }); });
  g += Lne(pl, Y(0), W - pr, Y(0), C.ink, 1) + Lne(X(0), pt, X(0), H - pb, C.ink, 1);
  const poly = (arr) => arr.map((p, i) => (i ? 'L' : 'M') + X(p.M).toFixed(1) + ',' + Y(p.P).toFixed(1)).join(' ') + ' Z';
  g += `<path d="${poly(nom)}" fill="none" stroke="${C.axis}" stroke-width="1.3" stroke-dasharray="6 4"/>`;
  g += `<path d="${poly(des)}" fill="${C.blueF}" stroke="${C.blue}" stroke-width="2"/>`;
  const placed = [];
  dem.forEach((d, i) => {
    const ok = d.dc <= 1, lx = X(d.M) + (d.M >= 0 ? 7 : -7); let ly = Y(d.P) - 6;
    for (let k = 0; k < 6 && placed.some(q => Math.abs(q.x - lx) < 70 && Math.abs(q.y - ly) < 11); k++) ly += 12;
    placed.push({ x: lx, y: ly });
    g += `<circle cx="${X(d.M)}" cy="${Y(d.P)}" r="4.2" fill="${ok ? C.green : C.red}" stroke="#fff"/>` + `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9.5" font-weight="600" fill="${ok ? C.green : C.red}" text-anchor="${d.M >= 0 ? 'start' : 'end'}" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(d.lab || 'P' + (i + 1))}</text>`;
  });
  g += T((pl + W - pr) / 2, H - 8, title + ' [' + uM + ']', { fs: 10.5 }) + T(14, (pt + H - pb) / 2, 'P [t]', { fs: 10.5, r: -90 });
  g += Lne(W - pr - 150, pt + 6, W - pr - 128, pt + 6, C.axis, 1.3, '6 4') + T(W - pr - 124, pt + 9, 'Pn, Mn', { fs: 9, a: 'start' }) + Lne(W - pr - 80, pt + 6, W - pr - 58, pt + 6, C.blue, 2) + T(W - pr - 54, pt + 9, 'φPn, φMn', { fs: 9, a: 'start' });
  return svgWrap(W, H, g);
}
function drawContour(poly, dem, Pu, W, H) {
  const pts = poly.map(p => ({ x: p.Mx / 1e5, y: p.My / 1e5 }));
  const R = Math.max(1e-6, ...pts.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))), ...dem.map(d => Math.max(Math.abs(d.Mx), Math.abs(d.My)))) * 1.12;
  const pad = 46, sz = Math.min(W, H) - 2 * pad + 20, ox = (W - sz) / 2, oy = 18;
  const X = (v) => ox + (v + R) / (2 * R) * sz, Y = (v) => oy + (R - v) / (2 * R) * sz;
  let g = '';
  niceTicks(-R, R, 6).forEach(t => { g += Lne(X(t), Y(R), X(t), Y(-R), C.grid, 0.7) + T(X(t), Y(-R) + 13, f2(t, 0), { fs: 9, c: C.axis }) + Lne(X(-R), Y(t), X(R), Y(t), C.grid, 0.7) + T(X(-R) - 5, Y(t) + 3, f2(t, 0), { fs: 9, c: C.axis, a: 'end' }); });
  g += Lne(X(-R), Y(0), X(R), Y(0), C.ink, 1) + Lne(X(0), Y(R), X(0), Y(-R), C.ink, 1);
  g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width="2"/>`;
  dem.forEach((d, i) => { const ok = d.dc <= 1; g += Lne(X(0), Y(0), X(d.Mx), Y(d.My), ok ? C.green : C.red, 1, '3 2') + `<circle cx="${X(d.Mx)}" cy="${Y(d.My)}" r="4.2" fill="${ok ? C.green : C.red}" stroke="#fff"/>` + T(X(d.Mx) + 7, Y(d.My) - 6, d.lab || 'P' + (i + 1), { fs: 9.5, a: 'start', c: ok ? C.green : C.red, b: 1 }); });
  g += T(X(0), oy + sz + 34, 'φMnx [t·m]  —  contorno de carga para Pu = ' + f2(Pu) + ' t', { fs: 10.5 }) + T(ox - 34, Y(0), 'φMny [t·m]', { fs: 10.5, r: -90 });
  return svgWrap(W, oy + sz + 44, g);
}

// ---------------------------------------------------------------------
//  Bloque pmgen
// ---------------------------------------------------------------------
registerBlock('pmgen', {
  name: 'Diagrama P–M general (fibras)', icon: 'pm', group: 'Concreto',
  fields: [
    F('geom', 'Concreto: rectángulos x0 y0 b h [cm] (uno por línea)', '0 0 300 25', 'area'),
    F('barras', 'Barras: "x y #" · "L x1 y1 x2 y2 n #" · "M x1 y1 x2 y2 s #" · "R x1 y1 x2 y2 nx ny #"', 'R 5 5 45 20 4 2 6\nM 55 5 245 5 20 3', 'area'),
    F('nucleos', 'Núcleos confinados (dibujo): x0 y0 b h // etiqueta', '', 'area'),
    F('fc', "f'c", 'fc'), F('fy', 'fy', 'fy'), F('Es', 'Es (opcional)', '2000000 kgf/cm^2'),
    F('norma', 'Norma', 'E060', 'select', ['E060', 'ACI']), F('espiral', 'Refuerzo en espiral', '', 'check'),
    F('dir', 'Dirección', 'X', 'select', ['X', 'Y', 'XY']),
    F('demandas', 'Demandas: "Pu, Mu // etiqueta" (XY: "Pu, Mux, Muy")', '', 'area'),
    F('sufijo', 'Sufijo de variables', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Diagrama de interacción por compatibilidad de deformaciones (εcu = 0.003, bloque de Whitney) para secciones formadas por rectángulos: columnas, placas con núcleos, secciones L, T, I. <b>Dirección X</b>: compresión que varía a lo largo de X (sismo X-X); <b>Y</b>: a lo largo de Y; <b>XY</b>: flexión biaxial exacta (contorno de carga). Momento positivo comprime el extremo +X (+Y). Exporta <code>DCpmg</code>, <code>phiPnmax</code>, <code>Pn0</code>, <code>Ast</code>, <code>rhog</code> y las funciones <code>phiMn_X(P)</code>, <code>Mn_X(P)</code>, <code>c_X(P)</code>, <code>Pn_X(e)</code>, <code>phiPn_X(e)</code> (y _Y).',
  def: { geom: '0 0 300 25', barras: 'R 5 5 45 20 4 2 6\nR 255 5 295 20 4 2 6\nM 55 5 245 5 20 3\nM 55 20 245 20 20 3', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'X', demandas: '350 tonf, 520 tonf*m // Sismo' },
  render(b, ctx) { return renderPMgen(b, ctx); },
});

export function buildFromBlock(b, S) {
  const rects = parseRects(b.geom, S), bars = parseBarsGen(interp(b.barras, S), S);
  const fc = evalParam(b.fc, S, 'kgf/cm^2', 210), fy = evalParam(b.fy, S, 'kgf/cm^2', 4200), Es = evalParam(b.Es, S, 'kgf/cm^2', 2e6);
  const norma = String(b.norma || 'E060').toUpperCase().includes('ACI') ? 'ACI' : 'E060';
  return makeSection(rects, bars, { fc, fy, Es, norma, espiral: !!b.espiral, fcMPa: evalParam(b.fc, S, 'MPa', fc / 10.1972) });
}

function renderPMgen(b, ctx) {
  const S = ctx.scope;
  const sec = buildFromBlock(b, S);
  if (!sec.bars.length) throw new Error('Defina el refuerzo longitudinal');
  const dir = String(b.dir || 'X').toUpperCase();
  const sfx = b.sufijo ? '_' + String(b.sufijo).replace(/\W/g, '') : '';
  const cores = lines(b.nucleos).map(({ code, lab }) => { const tk = toks(code); const [x0, y0, bb, hh] = tk.slice(0, 4).map(s => evCm(s, S)); return { x0, y0, b: bb, h: hh, lab }; });
  const curves = {};
  const dirsNeeded = dir === 'Y' ? ['Y'] : dir === 'X' ? ['X'] : ['X', 'Y'];
  for (const d of dirsNeeded) { const th = d === 'X' ? 0 : Math.PI / 2; const ax = d === 'X' ? 'x' : 'y'; curves[d] = { pos: curveAt(sec, th, 150, ax), neg: curveAt(sec, th + Math.PI, 150, ax) }; }
  const capP = sec.phic * sec.Pnmax, Pt = -0.9 * sec.fy * sec.Ast;
  const U = (v, u) => math.unit(v, u);
  // funciones exportadas
  for (const d of dirsNeeded) {
    const cv = curves[d];
    const capAt = (P, side) => { const r = mAtP(cv[side].des.map(p => ({ P: p.Pu, M: p.M, c: p.c })), P); return r; };
    const tf = (P) => (math.isUnit(P) ? P.toNumber('kgf') : +P * 1000);
    setVar(ctx, 'phiMn_' + d + sfx, (P) => { const p = tf(P); if (p > capP + 1e-6) throw new Error('Pu excede φPn,max'); const r = capAt(p, 'pos'); if (!r) throw new Error('Pu fuera del diagrama'); return U(Math.abs(r.M) / 1e5, 'tonf*m'); });
    setVar(ctx, 'phiMnneg_' + d + sfx, (P) => { const p = tf(P); const r = capAt(p, 'neg'); if (!r || p > capP + 1e-6) throw new Error('Pu fuera del diagrama'); return U(Math.abs(r.M) / 1e5, 'tonf*m'); });
    setVar(ctx, 'Mn_' + d + sfx, (P) => { const p = tf(P); const r1 = mAtP(cv.pos.pts, p), r2 = mAtP(cv.neg.pts, p); if (!r1 && !r2) throw new Error('P fuera del diagrama nominal'); return U(Math.max(r1 ? Math.abs(r1.M) : 0, r2 ? Math.abs(r2.M) : 0) / 1e5, 'tonf*m'); });
    setVar(ctx, 'c_' + d + sfx, (P) => { const p = tf(P); const r1 = mAtP(cv.pos.pts, p), r2 = mAtP(cv.neg.pts, p); if (!r1 && !r2) throw new Error('P fuera del diagrama nominal'); return U(Math.max(r1 ? r1.c : 0, r2 ? r2.c : 0), 'cm'); });
    setVar(ctx, 'Pn_' + d + sfx, (e) => { const ee = math.isUnit(e) ? e.toNumber('cm') : +e; const r = pAtE(ee >= 0 ? cv.pos : cv.neg, ee); return U(r.Pn / 1000, 'tonf'); });
    setVar(ctx, 'phiPn_' + d + sfx, (e) => { const ee = math.isUnit(e) ? e.toNumber('cm') : +e; const r = pAtE(ee >= 0 ? cv.pos : cv.neg, ee); return U(Math.min(r.phi * r.Pn, capP) / 1000, 'tonf'); });
    setVar(ctx, 'Pb_' + d + sfx, U(Math.max(cv.pos.Pb, cv.neg.Pb) / 1000, 'tonf'));
  }
  setVar(ctx, 'phiPnmax' + sfx, U(capP / 1000, 'tonf'));
  setVar(ctx, 'Pn0' + sfx, U(sec.P0 / 1000, 'tonf'));
  setVar(ctx, 'Ast' + sfx, U(sec.Ast, 'cm^2'));
  setVar(ctx, 'Ag' + sfx, U(sec.Ag, 'cm^2'));
  setVar(ctx, 'rhog' + sfx, sec.Ast / sec.Ag);
  setVar(ctx, 'phic' + sfx, sec.phic);

  // demandas
  const dem = [];
  for (const { code, lab } of lines(b.demandas)) {
    const p = code.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    if (dir === 'XY') { if (p.length < 3) throw new Error('En flexión biaxial use: Pu, Mux, Muy'); dem.push({ P: evalParam(p[0], S, 'tonf'), Mx: evalParam(p[1], S, 'tonf*m'), My: evalParam(p[2], S, 'tonf*m'), lab }); }
    else { if (p.length < 2) throw new Error('Demanda: Pu, Mu'); dem.push({ P: evalParam(p[0], S, 'tonf'), M: evalParam(p[1], S, 'tonf*m'), lab }); }
  }
  let maxDC = 0, html = '';
  const pmW = dir === 'XY' ? 340 : 660, pmH = dir === 'XY' ? 330 : 440;
  if (dir !== 'XY') {
    const cv = curves[dir];
    dem.forEach(d => {
      const P = d.P * 1000, side = d.M >= 0 ? 'pos' : 'neg';
      const r = mAtP(cv[side].des.map(p => ({ P: p.Pu, M: p.M, c: p.c })), P);
      d.cap = r ? Math.abs(r.M) / 1e5 : null;
      if (P > capP + 1e-6 || P < Pt - 1e-6 || !r) d.dc = Infinity;
      else if (Math.abs(d.M) < 1e-9) d.dc = P >= 0 ? P / capP : P / Pt;
      else d.dc = Math.abs(d.M) / Math.max(d.cap, 1e-9);
      if (P > capP + 1e-6) d.dc = Math.max(P / capP, 1.0001);
      maxDC = Math.max(maxDC, d.dc);
    });
    html += drawPM(cv.pos, cv.neg, dem, pmW, pmH, 'M' + (dir === 'X' ? 'x' : 'y') + ' — compresión variable en ' + dir);
  } else {
    const cell = (x) => '<div style="flex:1 1 300px;max-width:50%">' + x + '</div>';
    html += '<div style="display:flex;justify-content:center;gap:4px">' + cell(drawPM(curves.X.pos, curves.X.neg, [], pmW, pmH, 'Mx')) + cell(drawPM(curves.Y.pos, curves.Y.neg, [], pmW, pmH, 'My')) + '</div>';
    let crit = null, critPoly = null;
    dem.forEach(d => {
      const P = d.P * 1000;
      if (P > capP + 1e-6) { d.dc = Math.max(P / capP, 1.0001); d.cap = null; }
      else if (P < Pt) { d.dc = Infinity; d.cap = null; }
      else {
        const poly = loadContour(sec, P);
        if (!poly) { d.dc = Infinity; d.cap = null; }
        else {
          const mag = Math.hypot(d.Mx, d.My);
          if (mag < 1e-9) { d.dc = P >= 0 ? P / capP : P / Pt; d.cap = null; }
          else { const r = rayCap(poly, d.Mx * 1e5, d.My * 1e5); d.cap = r ? r / 1e5 : null; d.dc = r ? mag / d.cap : Infinity; }
          d.poly = poly;
        }
      }
      if (!crit || d.dc > crit.dc) { crit = d; critPoly = d.poly; }
      maxDC = Math.max(maxDC, d.dc);
    });
    if (crit && critPoly) html += drawContour(critPoly, dem.filter(d => Math.abs(d.P - crit.P) < 1e-6 * Math.max(1, Math.abs(crit.P)) || d === crit), crit.P, 470, 400);
  }
  setVar(ctx, 'DCpmg' + sfx, maxDC);
  dem.forEach((d, i) => ctx.checks.push({ ok: d.dc <= 1, label: 'Flexocompresión' + (dir === 'XY' ? ' biaxial ' : ' ') + (d.lab || 'P' + (i + 1)) + ' (Pu = ' + f2(d.P) + ' t, ' + (dir === 'XY' ? 'Mux = ' + f2(d.Mx) + ', Muy = ' + f2(d.My) : 'Mu = ' + f2(d.M)) + ' t·m)', ratio: d.dc, block: ctx.blockId }));

  let tb = '';
  if (dem.length) {
    tb = dir === 'XY'
      ? '<table class="tbl"><thead><tr><th>Combinación</th><th>Pu [t]</th><th>Mux [t·m]</th><th>Muy [t·m]</th><th>φMn,res [t·m]</th><th>D/C</th><th>Estado</th></tr></thead><tbody>' + dem.map((d, i) => `<tr><td>${esc(d.lab || 'P' + (i + 1))}</td><td>${f2(d.P)}</td><td>${f2(d.Mx)}</td><td>${f2(d.My)}</td><td>${d.cap === null ? '—' : f2(d.cap)}</td><td>${isFinite(d.dc) ? f2(d.dc) : '∞'}</td><td>${d.dc <= 1 ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>'}</td></tr>`).join('') + '</tbody></table>'
      : '<table class="tbl"><thead><tr><th>Combinación</th><th>Pu [t]</th><th>Mu [t·m]</th><th>φMn (Pu) [t·m]</th><th>D/C</th><th>Estado</th></tr></thead><tbody>' + dem.map((d, i) => `<tr><td>${esc(d.lab || 'P' + (i + 1))}</td><td>${f2(d.P)}</td><td>${f2(d.M)}</td><td>${d.cap === null ? '—' : f2(d.cap)}</td><td>${isFinite(d.dc) ? f2(d.dc) : '∞'}</td><td>${d.dc <= 1 ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>'}</td></tr>`).join('') + '</tbody></table>';
  }
  const info = `<div class="kv">${K('A_g = ' + f2(sec.Ag) + '\\,\\mathrm{cm^2}')} ${K('A_{st} = ' + f2(sec.Ast) + '\\,\\mathrm{cm^2}')} ${K('\\rho = ' + f2(100 * sec.Ast / sec.Ag, 2) + '\\%')} ${K('P_0 = ' + f2(sec.P0 / 1000) + '\\,\\mathrm{t}')} ${K('\\phi P_{n,max} = ' + f2(capP / 1000) + '\\,\\mathrm{t}')} ${K('\\phi_c = ' + sec.phic)} ${K('\\beta_1 = ' + f2(sec.beta1, 3))} ${K('(\\bar x,\\bar y) = (' + f2(sec.xc, 1) + ',\\,' + f2(sec.yc, 1) + ')\\,\\mathrm{cm}')}</div>`;
  const normTxt = sec.norma === 'ACI' ? 'ACI 318-19 (φ según εt, Tabla 21.2.2)' : 'NTE E.060 (φ según 9.3.2.2)';
  return `<div class="figure">${drawSection(sec, cores, 680, 300, '')}${html}${info}${tb}${caption(ctx, b.titulo || 'Diagrama de interacción por compatibilidad de deformaciones — ' + normTxt)}</div>`;
}

// ---------------------------------------------------------------------
//  Bloque slab2way — método de coeficientes (E.060 13.7)
// ---------------------------------------------------------------------
registerBlock('slab2way', {
  name: 'Losa en dos direcciones (coeficientes)', icon: 'slab', group: 'Concreto',
  fields: [
    F('A', 'Luz libre corta A', '4.5 m'), F('B', 'Luz libre larga B', '5.6 m'),
    F('bordes', 'Bordes sup inf izq der (C = continuo, D = discontinuo)', 'C D D C'),
    F('wud', 'Carga muerta amplificada wud', '1.4*wD'), F('wul', 'Carga viva amplificada wul', '1.7*wL'),
    F('d', 'Peralte efectivo (para cortante)', 'd'), F('sufijo', 'Sufijo', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Bordes superior e inferior = bordes largos (longitud B, extremos de las franjas en la dirección A); izquierdo y derecho = bordes cortos. Exporta <code>caso</code>, <code>mAB</code>, <code>Ma_neg</code>, <code>Mb_neg</code>, <code>Ma_pos</code>, <code>Mb_pos</code>, <code>Ma_disc</code>, <code>Mb_disc</code> [t·m/m] y <code>Vua</code>, <code>Vub</code> [t/m].',
  def: { A: '4.5 m', B: '5.6 m', bordes: 'C D D C', wud: '1.0 tonf/m^2', wul: '0.4 tonf/m^2', d: '12 cm' },
  render(b, ctx) { return renderSlab(b, ctx); },
});
function renderSlab(b, ctx) {
  const S = ctx.scope;
  const A = evalParam(b.A, S, 'm'), B = evalParam(b.B, S, 'm');
  pos({ A, B }); if (A > B + 1e-9) throw new Error('A debe ser la luz corta (A ≤ B)');
  const ed = String(interp(b.bordes, S) || 'D D D D').toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (ed.length !== 4 || ed.some(e => e !== 'C' && e !== 'D')) throw new Error('Bordes: cuatro letras C/D (superior inferior izquierdo derecho)');
  const [eT, eB, eL, eR] = ed.map(e => e === 'C');
  const nA = (eT ? 1 : 0) + (eB ? 1 : 0), nB = (eL ? 1 : 0) + (eR ? 1 : 0);
  const caso = slabCase(nA, nB), m = A / B;
  if (m < 0.5) throw new Error('m = A/B = ' + f2(m) + ' < 0.5: la losa trabaja en una dirección');
  const wud = evalParam(b.wud, S, 'tonf/m^2'), wul = evalParam(b.wul, S, 'tonf/m^2'), wu = wud + wul;
  const d = evalParam(b.d, S, 'm', 0);
  const T_ = SLAB_TABLES;
  const ca = slabCoef(T_.negA, caso, m), cb = slabCoef(T_.negB, caso, m), cad = slabCoef(T_.cmA, caso, m), cbd = slabCoef(T_.cmB, caso, m), cal = slabCoef(T_.cvA, caso, m), cbl = slabCoef(T_.cvB, caso, m);
  const Man = ca * wu * A * A, Mbn = cb * wu * B * B, Map = (cad * wud + cal * wul) * A * A, Mbp = (cbd * wud + cbl * wul) * B * B;
  const Vua = wu * (A / 2 - d) * (1 - 0.5 * m) * (nA === 1 ? 1.15 : 1), Vub = wu * (A / 2 - d) * 0.5 * (nB === 1 ? 1.15 : 1);
  const sfx = b.sufijo ? '_' + String(b.sufijo).replace(/\W/g, '') : '';
  const U = (v) => math.unit(v, 'tonf*m/m');
  setVar(ctx, 'caso' + sfx, caso); setVar(ctx, 'mAB' + sfx, m);
  setVar(ctx, 'Ma_neg' + sfx, U(Man)); setVar(ctx, 'Mb_neg' + sfx, U(Mbn)); setVar(ctx, 'Ma_pos' + sfx, U(Map)); setVar(ctx, 'Mb_pos' + sfx, U(Mbp));
  setVar(ctx, 'Ma_disc' + sfx, U(Map / 3)); setVar(ctx, 'Mb_disc' + sfx, U(Mbp / 3));
  setVar(ctx, 'Vua' + sfx, math.unit(Vua, 'tonf/m')); setVar(ctx, 'Vub' + sfx, math.unit(Vub, 'tonf/m'));
  // dibujo: B horizontal, A vertical
  const W = 700, H = 430, sc = Math.min(360 / B, 260 / A), ox = (W - B * sc) / 2, oy = 70;
  const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
  let g = arrowDefs;
  const band = 26;
  const edge = (cont, x1, y1, x2, y2, side) => {
    if (cont) {
      const [dx, dy] = side === 'T' ? [0, -band] : side === 'B' ? [0, band] : side === 'L' ? [-band, 0] : [band, 0];
      g += `<path d="M${x1},${y1} L${x2},${y2} L${x2 + dx},${y2 + dy} L${x1 + dx},${y1 + dy} Z" fill="url(#hatch)" opacity=".55"/>` + Lne(x1, y1, x2, y2, C.ink, 2.2);
      g += Lne(x1 + dx, y1 + dy, x2 + dx, y2 + dy, C.axis, 0.8, '5 3');
    } else g += Lne(x1, y1, x2, y2, C.ink, 4.5);
  };
  g += `<rect x="${X(0)}" y="${Y(0)}" width="${B * sc}" height="${A * sc}" fill="${C.conc}"/>`;
  edge(eT, X(0), Y(0), X(B), Y(0), 'T'); edge(eB, X(0), Y(A), X(B), Y(A), 'B'); edge(eL, X(0), Y(0), X(0), Y(A), 'L'); edge(eR, X(B), Y(0), X(B), Y(A), 'R');
  // franjas centrales
  g += `<rect x="${X(B / 4)}" y="${Y(0)}" width="${B / 2 * sc}" height="${A * sc}" fill="none" stroke="${C.blue}" stroke-dasharray="4 4" stroke-width="0.8"/>` + `<rect x="${X(0)}" y="${Y(A / 4)}" width="${B * sc}" height="${A / 2 * sc}" fill="none" stroke="${C.blue}" stroke-dasharray="4 4" stroke-width="0.8"/>`;
  const lab = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 10.5}" font-weight="600" fill="${o.c || C.red}" text-anchor="${o.a || 'middle'}" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke"${o.r ? ` transform="rotate(${o.r} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${esc(s)}</text>`;
  const mA = (cont) => cont ? 'Ma⁻ = ' + f2(Man) : 'Ma⁻ = ' + f2(Map / 3) + ' (disc.)';
  const mB = (cont) => cont ? 'Mb⁻ = ' + f2(Mbn) : 'Mb⁻ = ' + f2(Mbp / 3) + ' (disc.)';
  g += lab(X(B / 2), Y(0) + 16, mA(eT)) + lab(X(B / 2), Y(A) - 8, mA(eB)) + lab(X(0) + 14, Y(A / 2), mB(eL), { r: -90 }) + lab(X(B) - 8, Y(A / 2), mB(eR), { r: -90 });
  // momentos positivos (flechas de franja)
  g += Lne(X(B / 2), Y(A * 0.18), X(B / 2), Y(A * 0.82), C.blue, 1.6).replace('/>', ' marker-end="url(#ar)" marker-start="url(#ar)"/>') + lab(X(B / 2) + 6, Y(A * 0.42), 'Ma⁺ = ' + f2(Map), { c: C.blue, a: 'start' });
  g += Lne(X(B * 0.12), Y(A / 2), X(B * 0.88), Y(A / 2), C.blue, 1.6).replace('/>', ' marker-end="url(#ar)" marker-start="url(#ar)"/>') + lab(X(B * 0.70), Y(A / 2) - 6, 'Mb⁺ = ' + f2(Mbp), { c: C.blue });
  g += dimH(X(0), X(B), Y(A) + band + 22, 'B = ' + f2(B) + ' m') + dimV(X(0) - band - 22, Y(0), Y(A), 'A = ' + f2(A) + ' m');
  g += T(W / 2, 22, 'Caso ' + caso + ' · m = A/B = ' + f2(m, 3) + ' · wu = ' + f2(wu) + ' t/m² (momentos en t·m/m)', { fs: 11, b: 1 });
  g += T(W / 2, H - 8, 'Borde rayado = continuo · borde grueso = discontinuo (M⁻ = M⁺/3, E.060 13.7.3.5) · líneas azules = franjas centrales', { fs: 9.5, c: C.axis });
  const tb = `<table class="tbl"><thead><tr><th>Dirección</th><th>C neg (T. 13.1)</th><th>C CM (T. 13.2)</th><th>C CV (T. 13.3)</th><th>M⁻ continuo [t·m/m]</th><th>M⁺ [t·m/m]</th><th>M⁻ discontinuo [t·m/m]</th></tr></thead><tbody>
    <tr><td>A (corta) = ${f2(A)} m</td><td>${ca ? f2(ca, 4) : '—'}</td><td>${f2(cad, 4)}</td><td>${f2(cal, 4)}</td><td>${nA ? f2(Man, 3) : '—'}</td><td>${f2(Map, 3)}</td><td>${nA < 2 ? f2(Map / 3, 3) : '—'}</td></tr>
    <tr><td>B (larga) = ${f2(B)} m</td><td>${cb ? f2(cb, 4) : '—'}</td><td>${f2(cbd, 4)}</td><td>${f2(cbl, 4)}</td><td>${nB ? f2(Mbn, 3) : '—'}</td><td>${f2(Mbp, 3)}</td><td>${nB < 2 ? f2(Mbp / 3, 3) : '—'}</td></tr></tbody></table>`;
  return `<div class="figure">${svgWrap(W, H, g)}${tb}${caption(ctx, b.titulo || 'Paño de losa en dos direcciones — método de coeficientes (E.060 13.7)')}</div>`;
}

// ---------------------------------------------------------------------
//  Bloque stmbeam — viga de gran peralte con dos cargas simétricas
// ---------------------------------------------------------------------
registerBlock('stmbeam', {
  name: 'Puntal–tensor (viga de gran peralte)', icon: 'beam', group: 'Concreto',
  fields: [F('L', 'Luz entre ejes de apoyo', 'L'), F('h', 'Peralte total', 'h'), F('a', 'Distancia apoyo–carga', 'a'), F('lb', 'Ancho de placa de apoyo', 'lb'), F('lp', 'Ancho de placa de carga', 'lp'), F('ws', 'Ancho del puntal horizontal', 'ws'), F('wt', 'Altura efectiva del tensor', 'wt'), F('Fd', 'Fuerza en puntal diagonal', 'Fd'), F('Ft', 'Fuerza en tensor', 'Ft'), F('Pu', 'Carga Pu (cada una)', 'Pu'), F('titulo', 'Título', '')],
  hint: 'Dibuja el modelo puntal-tensor de una viga de gran peralte con dos cargas simétricas (nudos CCC bajo las cargas y CCT en los apoyos).',
  def: { L: '4 m', h: '1.2 m', a: '1.2 m', lb: '0.4 m', lp: '0.4 m', ws: '0.2 m', wt: '0.2 m' },
  render(b, ctx) {
    const S = ctx.scope, g0 = (k, u, d) => evalParam(b[k], S, u, d);
    const L = g0('L', 'm'), h = g0('h', 'm'), a = g0('a', 'm'), lb = g0('lb', 'm', 0.3), lp = g0('lp', 'm', 0.3), ws = g0('ws', 'm', 0.2), wt = g0('wt', 'm', 0.2);
    pos({ L, h, a }); if (2 * a > L + 1e-9) throw new Error('2a no puede exceder la luz L');
    const Fd = g0('Fd', 'kN', 0), Ft = g0('Ft', 'kN', 0), Pu = g0('Pu', 'kN', 0);
    const ext = lb, Ltot = L + 2 * ext, W = 720, sc = Math.min((W - 80) / Ltot, 300 / h), H = h * sc + 140;
    const ox = (W - Ltot * sc) / 2, oy = 60, X = (x) => ox + (x + ext) * sc, Y = (y) => oy + (h - y) * sc;
    let g = arrowDefs;
    g += `<rect x="${X(-ext)}" y="${Y(h)}" width="${Ltot * sc}" height="${h * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    const yt = wt / 2, ytop = h - ws / 2;
    const band = (x1, y1, x2, y2, w, col) => { const L2 = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L2 * w / 2, ny = (x2 - x1) / L2 * w / 2; return `<path d="M${X(x1 + nx)},${Y(y1 + ny)} L${X(x2 + nx)},${Y(y2 + ny)} L${X(x2 - nx)},${Y(y2 - ny)} L${X(x1 - nx)},${Y(y1 - ny)} Z" fill="${col}" stroke="none"/>`; };
    const th = Math.atan2(ytop - yt, a), wd = lb * Math.sin(th) + wt * Math.cos(th);
    const cid = 'stmclip' + String(ctx.blockId || '').replace(/\W/g, '');
    g += `<clipPath id="${cid}"><rect x="${X(-ext)}" y="${Y(h)}" width="${Ltot * sc}" height="${h * sc}"/></clipPath><g clip-path="url(#${cid})">` + band(0, yt, a, ytop, wd, 'rgba(31,111,235,.18)') + band(L, yt, L - a, ytop, wd, 'rgba(31,111,235,.18)') + '</g>';
    g += `<rect x="${X(a)}" y="${Y(h)}" width="${(L - 2 * a) * sc}" height="${ws * sc}" fill="rgba(31,111,235,.18)"/>`;
    g += `<rect x="${X(-ext / 2)}" y="${Y(wt)}" width="${(L + ext) * sc}" height="${wt * sc}" fill="rgba(209,36,47,.12)"/>`;
    g += Lne(X(0), Y(yt), X(a), Y(ytop), C.blue, 2.2, '7 4') + Lne(X(L), Y(yt), X(L - a), Y(ytop), C.blue, 2.2, '7 4') + Lne(X(a), Y(ytop), X(L - a), Y(ytop), C.blue, 2.2, '7 4');
    g += Lne(X(0), Y(yt), X(L), Y(yt), C.red, 3);
    [[0, yt, 'CCT'], [L, yt, 'CCT'], [a, ytop, 'CCC'], [L - a, ytop, 'CCC']].forEach(([x, y, t]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>` + T(X(x) + (x < L / 2 ? 22 : -22), Y(y) + (y < h / 2 ? -8 : 18), t, { fs: 9, c: C.axis }); });
    [0, L].forEach(x => { g += `<rect x="${X(x - lb / 2)}" y="${Y(0)}" width="${lb * sc}" height="5" fill="${C.steel}"/>` + `<path d="M${X(x)},${Y(0) + 5} l-10,15 h20 z" fill="#fff" stroke="${C.ink}"/>`; });
    [a, L - a].forEach(x => { g += `<rect x="${X(x - lp / 2)}" y="${Y(h) - 5}" width="${lp * sc}" height="5" fill="${C.steel}"/>` + `<line x1="${X(x)}" y1="${Y(h) - 50}" x2="${X(x)}" y2="${Y(h) - 7}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + (Pu ? T(X(x) + 5, Y(h) - 40, 'Pu = ' + f2(Pu) + ' kN', { fs: 10, c: C.red, a: 'start' }) : ''); });
    if (Fd) g += T(X(a / 2) - 8, Y((yt + ytop) / 2), 'C = ' + f2(Fd) + ' kN', { fs: 10, c: C.blue, a: 'end', b: 1 });
    if (Ft) g += T(X(L / 2), Y(wt) - 8, 'T = ' + f2(Ft) + ' kN', { fs: 10, c: C.red, b: 1 });
    g += T(X(L / 2), Y(ytop) + 16, 'θ = ' + f2(th * 180 / Math.PI, 1) + '°', { fs: 10, c: C.blue });
    g += dimH(X(0), X(a), Y(0) + 36, 'a = ' + f2(a) + ' m') + dimH(X(0), X(L), Y(0) + 56, 'L = ' + f2(L) + ' m') + dimV(X(-ext) - 14, Y(h), Y(0), 'h = ' + f2(h) + ' m');
    setVar(ctx, 'thetaSTM', math.unit(th, 'rad'));
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Modelo puntal–tensor: puntales (azul), tensor (rojo) y nudos')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Bloque mensula — elevación de ménsula (braquete) con cargas y refuerzo
// ---------------------------------------------------------------------
registerBlock('mensula', {
  name: 'Ménsula (braquete)', icon: 'column', group: 'Concreto',
  fields: [F('bc', 'Ancho de columna (elevación)', 'bc'), F('lc', 'Proyección de la ménsula', 'lc'), F('h', 'Peralte en la cara', 'h'), F('hext', 'Peralte en el borde exterior', 'hext'), F('av', 'Brazo de la carga av', 'av'), F('d', 'Peralte efectivo', 'd'), F('Vu', 'Vu', 'Vu'), F('Nuc', 'Nuc', 'Nuc'), F('asc', 'Texto refuerzo principal', '3 #5'), F('ah', 'Texto estribos', '2 estribos #3'), F('titulo', 'Título', '')],
  hint: 'Dibuja la elevación de una ménsula con la carga vertical Vu, la tracción horizontal Nuc, el refuerzo principal Asc anclado a una barra transversal soldada y los estribos Ah en 2/3 d.',
  def: { bc: '40 cm', lc: '30 cm', h: '45 cm', hext: '25 cm', av: '15 cm', d: '40 cm', Vu: '30 tonf', Nuc: '6 tonf' },
  render(b, ctx) {
    const S = ctx.scope, g0 = (k, u, dv) => evalParam(b[k], S, u, dv);
    const bc = g0('bc', 'cm'), lc = g0('lc', 'cm'), h = g0('h', 'cm'), he = g0('hext', 'cm'), av = g0('av', 'cm'), d = g0('d', 'cm');
    pos({ bc, lc, h, he, av, d }); if (he > h) throw new Error('El peralte exterior no puede exceder el peralte en la cara');
    const Vu = g0('Vu', 'tonf', 0), Nuc = g0('Nuc', 'tonf', 0);
    const W = 620, Hc = h * 3.2, sc = Math.min(280 / (bc + lc), 330 / Hc), H = Hc * sc + 70;
    const ox = 90, top = 40 + (Hc - h) / 2 * sc;
    const X = (x) => ox + x * sc, Y = (y) => top + y * sc; // y hacia abajo desde la cara superior de la ménsula
    let g = arrowDefs;
    g += `<rect x="${X(0)}" y="20" width="${bc * sc}" height="${H - 40}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    g += `<path d="M${X(bc)},${Y(0)} L${X(bc + lc)},${Y(0)} L${X(bc + lc)},${Y(he)} L${X(bc)},${Y(h)} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    g += `<rect x="${X(bc) - 1}" y="${Y(0) + 1}" width="3" height="${h * sc - 2}" fill="${C.conc}"/>`;
    const yc = h - d; // refuerzo principal
    g += Lne(X(bc * 0.25), Y(yc), X(bc + lc - 3), Y(yc), C.steel, 2.6) + Lne(X(bc * 0.25), Y(yc), X(bc * 0.25), Y(yc + 30), C.steel, 2.6);
    g += `<circle cx="${X(bc + lc - 3)}" cy="${Y(yc)}" r="4" fill="${C.steel}"/>`;
    for (let i = 1; i <= 2; i++) { const y = yc + (2 / 3 * d) * i / 2.5; g += Lne(X(bc * 0.25), Y(y), X(bc + lc * 0.75 - (y / h) * lc * 0.35), Y(y), C.blue, 1.6); }
    const xl = X(bc + lc - av - 0.0001);
    const xa = X(bc + av);
    g += `<rect x="${xa - 18}" y="${Y(0) - 5}" width="36" height="5" fill="${C.steel}"/>` + `<line x1="${xa}" y1="${Y(0) - 55}" x2="${xa}" y2="${Y(0) - 7}" stroke="${C.red}" stroke-width="2.2" marker-end="url(#arr)"/>` + T(xa + 6, Y(0) - 44, 'Vu = ' + f2(Vu) + ' t', { fs: 10.5, c: C.red, a: 'start', b: 1 });
    if (Nuc) g += `<line x1="${xa}" y1="${Y(0) - 12}" x2="${xa + 55}" y2="${Y(0) - 12}" stroke="${C.red}" stroke-width="1.8" marker-end="url(#arr)"/>` + T(xa + 58, Y(0) - 9, 'Nuc = ' + f2(Nuc) + ' t', { fs: 10, c: C.red, a: 'start' });
    void xl;
    g += dimH(X(bc), xa, Y(h) + 22, 'av = ' + f2(av) + ' cm') + dimH(X(bc), X(bc + lc), Y(h) + 44, 'ℓ = ' + f2(lc) + ' cm');
    g += dimV(X(bc + lc) + 18, Y(0), Y(he), f2(he) + ' cm', C.ink, 1);
    g += dimV(X(0) - 22, Y(0), Y(h), 'h = ' + f2(h) + ' cm') + dimV(X(0) - 50, Y(yc), Y(h), 'd = ' + f2(d) + ' cm');
    g += T(X(bc + lc) + 30, Y(yc) + 4, 'Asc: ' + interp(b.asc || '', S) + ' + barra transversal soldada', { fs: 10, a: 'start', b: 1 });
    g += T(X(bc + lc) + 30, Y(yc + d / 3) + 4, 'Ah: ' + interp(b.ah || '', S) + ' en 2/3 d', { fs: 10, a: 'start', c: C.blue });
    g += T(X(bc / 2), 34, 'Columna', { fs: 10, c: C.axis });
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Ménsula: geometría, cargas y refuerzo (E.060 11.9)')}</div>`;
  },
});
