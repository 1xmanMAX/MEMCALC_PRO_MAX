// =====================================================================
//  Bloques gráficos de ingeniería: viga continua (FEM), diagrama P-M,
//  sección de concreto, zapata, muro, espectro E.030, gráfico y tabla
// =====================================================================
import { math, evalParam, evalList, fmtPlain, valTex, K, esc, displayUnit, BARS, richText, symTex, interp } from './engine.js';

export const C = { ink: '#1b2733', grid: '#e3e8ef', axis: '#8a96a3', blue: '#1f6feb', blueF: 'rgba(31,111,235,.16)', red: '#d1242f', redF: 'rgba(209,36,47,.15)', green: '#1a7f37', greenF: 'rgba(26,127,55,.15)', orange: '#d4730c', conc: '#e9ecef', soil: '#c9a46a', steel: '#24292f' };
export const f2 = (x, d = 2) => fmtPlain(x, d);
export const T = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 11}" fill="${o.c || C.ink}" text-anchor="${o.a || 'middle'}"${o.b ? ' font-weight="600"' : ''}${o.r ? ` transform="rotate(${o.r} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''} font-family="Inter,Segoe UI,Arial">${esc(s)}</text>`;
export const Lne = (x1, y1, x2, y2, c = C.ink, w = 1, dash = '') => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export function pos(o) { for (const k in o) if (!(o[k] > 0) || !isFinite(o[k])) throw new Error('El parámetro ' + k + ' debe ser mayor que cero'); }
export const svgWrap = (W, H, body, cls = '') => `<svg class="fig ${cls}" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
export const arrowDefs = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/></marker><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="1"/></pattern><pattern id="soilp" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e8d6b0"/><circle cx="2" cy="2" r="0.9" fill="#b08b4f"/><circle cx="6" cy="5" r="0.7" fill="#b08b4f"/></pattern></defs>`;
export function dimH(x1, x2, y, label, c = C.ink) {
  return Lne(x1, y, x2, y, c, 0.8) + Lne(x1, y - 4, x1, y + 4, c, 0.8) + Lne(x2, y - 4, x2, y + 4, c, 0.8) +
    `<path d="M${x1},${y} l6,-2.5 v5 z M${x2},${y} l-6,-2.5 v5 z" fill="${c}"/>` + T((x1 + x2) / 2, y - 4, label, { fs: 10, c });
}
export function dimV(x, y1, y2, label, c = C.ink, side = -1) {
  return Lne(x, y1, x, y2, c, 0.8) + Lne(x - 4, y1, x + 4, y1, c, 0.8) + Lne(x - 4, y2, x + 4, y2, c, 0.8) +
    `<path d="M${x},${y1} l-2.5,6 h5 z M${x},${y2} l-2.5,-6 h5 z" fill="${c}"/>` + T(x + side * 5, (y1 + y2) / 2, label, { fs: 10, c, r: -90 });
}
export function niceTicks(min, max, n = 5) {
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || mag * 10;
  const t = []; if (!(step > 0)) return t; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9 && t.length < 60; v += step) t.push(+v.toFixed(10));
  return t;
}
export function caption(ctx, text) {
  ctx.fig = (ctx.fig || 0) + 1;
  return `<div class="cap">Figura ${ctx.fig}${text ? ': ' + richText(text, ctx.scope, true) : ''}</div>`;
}
export function setVar(ctx, name, v) { ctx.scope.set(name, v); }

// =====================================================================
//  1) VIGA CONTINUA — Método de rigidez (FEM) con alternancia de CV
// =====================================================================
function parseLoads(text, S) {
  const loads = [];
  for (let raw of String(text || '').split('\n')) {
    let line = raw.split('//')[0].trim(); if (!line) continue;
    let cas = 'CM';
    const m = /^(CM|CV|D|L)\s*:\s*/i.exec(line);
    if (m) { cas = /CV|L/i.test(m[1]) ? 'CV' : 'CM'; line = line.slice(m[0].length); }
    const tk = line.split(/\s+/);
    const t = tk[0].toUpperCase();
    const ev = (s, u) => evalParam(s, S, u);
    if (t === 'U' || t === 'W') loads.push({ t: 'U', span: tk[1], w: ev(tk.slice(2).join(' '), 'tonf/m'), cas });
    else if (t === 'T') loads.push({ t: 'T', span: tk[1], w1: ev(tk[2], 'tonf/m'), w2: ev(tk.slice(3).join(' '), 'tonf/m'), cas });
    else if (t === 'UP') loads.push({ t: 'UP', x1: ev(tk[1], 'm'), x2: ev(tk[2], 'm'), w: ev(tk.slice(3).join(' '), 'tonf/m'), cas });
    else if (t === 'P') loads.push({ t: 'P', x: ev(tk[1], 'm'), P: ev(tk.slice(2).join(' '), 'tonf'), cas });
    else if (t === 'M') loads.push({ t: 'M', x: ev(tk[1], 'm'), M: ev(tk.slice(2).join(' '), 'tonf*m'), cas });
    else throw new Error('Carga no reconocida: "' + raw + '" (use U, T, UP, P, M)');
  }
  return loads;
}
// Expande cargas a lista de distribuidas lineales {x1,x2,w1,w2} y puntuales
function expandLoads(loads, X, activeCV) {
  const dist = [], pts = [], mom = [];
  const nS = X.length - 1;
  for (const l of loads) {
    const spanOf = (x) => { for (let i = 0; i < nS; i++) if (x >= X[i] - 1e-9 && x <= X[i + 1] + 1e-9) return i; return -1; };
    const active = (i) => l.cas === 'CM' || !activeCV || activeCV[i];
    if (l.t === 'U' || l.t === 'T') {
      const spans = l.span === '*' ? [...Array(nS).keys()] : String(l.span).split('-').length === 2 ? (() => { const [a, b] = l.span.split('-').map(Number); return [...Array(b - a + 1).keys()].map(k => k + a - 1); })() : [parseInt(l.span) - 1];
      for (const i of spans) { if (i < 0 || i >= nS) throw new Error('Tramo inexistente: ' + l.span); if (!active(i)) continue; dist.push({ x1: X[i], x2: X[i + 1], w1: l.t === 'U' ? l.w : l.w1, w2: l.t === 'U' ? l.w : l.w2, cas: loads.some(q => q.cas === 'CV') ? l.cas : '' }); }
    } else if (l.t === 'UP') { if (active(spanOf((l.x1 + l.x2) / 2))) dist.push({ x1: l.x1, x2: l.x2, w1: l.w, w2: l.w }); }
    else if (l.t === 'P') { if (active(spanOf(l.x))) pts.push({ x: l.x, P: l.P }); }
    else if (l.t === 'M') { if (active(spanOf(l.x))) mom.push({ x: l.x, M: l.M }); }
  }
  return { dist, pts, mom };
}
function wAt(dist, x, side) {
  // carga distribuida en x (side: +1 justo a la derecha, -1 izquierda)
  let w = 0; const e = 1e-9 * side;
  for (const d of dist) { const xx = x + e; if (xx > d.x1 && xx < d.x2) w += d.w1 + (d.w2 - d.w1) * (x - d.x1) / (d.x2 - d.x1); }
  return w;
}
export function solveBeam(X, sup, EI, loads, activeCV, nEl = 30) {
  const { dist, pts, mom } = expandLoads(loads, X, activeCV);
  const Ltot = X[X.length - 1];
  let xs = new Set(X.map(v => +v.toFixed(9)));
  for (let i = 0; i < X.length - 1; i++) for (let k = 1; k < nEl; k++) xs.add(+(X[i] + (X[i + 1] - X[i]) * k / nEl).toFixed(9));
  for (const p of pts) xs.add(+p.x.toFixed(9)); for (const m of mom) xs.add(+m.x.toFixed(9));
  for (const d of dist) { xs.add(+d.x1.toFixed(9)); xs.add(+d.x2.toFixed(9)); }
  xs = [...xs].filter(v => v >= -1e-9 && v <= Ltot + 1e-9).sort((a, b) => a - b);
  const nN = xs.length, nD = 2 * nN, bw = 4;
  const K = Array.from({ length: nD }, () => new Float64Array(nD));
  const F = new Float64Array(nD);
  const els = [];
  for (let e = 0; e < nN - 1; e++) {
    const l = xs[e + 1] - xs[e]; const k = EI / l ** 3;
    const ke = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]].map(r => r.map(v => v * k));
    const wa = wAt(dist, xs[e], 1), wb = wAt(dist, xs[e + 1], -1);
    const dw = wb - wa;
    const feq = [-(wa * l / 2 + 3 * dw * l / 20), -(wa * l * l / 12 + dw * l * l / 30), -(wa * l / 2 + 7 * dw * l / 20), wa * l * l / 12 + dw * l * l / 20];
    const dofs = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) { F[dofs[i]] += feq[i]; for (let j = 0; j < 4; j++) K[dofs[i]][dofs[j]] += ke[i][j]; }
    els.push({ l, ke, feq, dofs, wa, wb, x: xs[e] });
  }
  const idx = (x) => xs.findIndex(v => Math.abs(v - x) < 1e-7);
  for (const p of pts) F[2 * idx(p.x)] -= p.P;
  for (const m of mom) F[2 * idx(m.x) + 1] -= m.M;
  const Fext = F.slice();
  // restricciones
  const restr = [];
  X.forEach((x, i) => {
    const n = idx(x), t = (sup[i] || 'L').toUpperCase();
    if (t === 'A' || t === 'R' || t === 'E') restr.push(2 * n);
    if (t === 'E') restr.push(2 * n + 1);
  });
  const Korig = restr.map(r => K[r].slice());
  for (const r of restr) { for (let j = Math.max(0, r - bw); j < Math.min(nD, r + bw + 1); j++) { K[r][j] = 0; K[j][r] = 0; } K[r][r] = 1; F[r] = 0; }
  // eliminación gaussiana en banda
  for (let i = 0; i < nD; i++) {
    const piv = K[i][i];
    if (Math.abs(piv) < 1e-12) throw new Error('Estructura inestable: revise los apoyos (mecanismo).');
    const jm = Math.min(nD, i + bw + 1);
    for (let r = i + 1; r < jm; r++) {
      const f = K[r][i] / piv; if (!f) continue;
      for (let c = i; c < jm; c++) K[r][c] -= f * K[i][c];
      F[r] -= f * F[i];
    }
  }
  const u = new Float64Array(nD);
  for (let i = nD - 1; i >= 0; i--) { let s = F[i]; const jm = Math.min(nD, i + bw + 1); for (let c = i + 1; c < jm; c++) s -= K[i][c] * u[c]; u[i] = s / K[i][i]; }
  // reacciones
  const R = {};
  restr.forEach((r, k) => { let s = 0; for (let j = 0; j < nD; j++) s += Korig[k][j] * u[j]; R[r] = s - Fext[r]; });
  // esfuerzos internos
  const sx = [], sV = [], sM = [], sD = [];
  for (const el of els) {
    const ue = el.dofs.map(d => u[d]);
    const f = el.ke.map((r, i) => r.reduce((t, v, j) => t + v * ue[j], 0) - el.feq[i]);
    const V0 = f[0], M0 = -f[1];
    for (const t of [0, 0.5, 1]) {
      const x = t * el.l, dw = el.wb - el.wa;
      const W = el.wa * x + dw * x * x / (2 * el.l), Mw = el.wa * x * x / 2 + dw * x ** 3 / (6 * el.l);
      sx.push(el.x + x); sV.push(V0 - W); sM.push(M0 + V0 * x - Mw);
      // deflexión (Hermite)
      const s = t, l = el.l;
      const N = [1 - 3 * s * s + 2 * s ** 3, l * (s - 2 * s * s + s ** 3), 3 * s * s - 2 * s ** 3, l * (-s * s + s ** 3)];
      sD.push(N.reduce((a, n, i) => a + n * ue[i], 0));
    }
  }
  const reac = X.map((x, i) => { const n = idx(x); return { x, V: R[2 * n], M: R[2 * n + 1] }; });
  return { sx, sV, sM, sD, reac, xs, dist, pts, mom };
}

export function blockBeam(b, ctx) {
  const S = ctx.scope;
  const L = evalList(b.tramos, S, 'm');
  if (!L.length) throw new Error('Defina las longitudes de los tramos');
  if (L.length > 12) throw new Error('Máximo 12 tramos');
  L.forEach((l, i) => { if (!(l > 0)) throw new Error('La longitud del tramo ' + (i + 1) + ' debe ser mayor que cero'); });
  const X = [0]; L.forEach(l => X.push(X[X.length - 1] + l));
  const sup = String(b.apoyos || '').split(/[,\s]+/).filter(Boolean).map(s => s.toUpperCase());
  while (sup.length < X.length) sup.push('A');
  const E = evalParam(b.E || '2.17e6 tonf/m^2', S, 'tonf/m^2');
  const I = evalParam(b.I || '0.0054 m^4', S, 'm^4');
  const EI = E * I;
  const loads = parseLoads(b.cargas, S);
  const nS = L.length;
  const full = solveBeam(X, sup, EI, loads, null);
  let env = null;
  const hasCV = loads.some(l => l.cas === 'CV');
  if (b.alternancia && hasCV && nS > 1) {
    const n = Math.min(nS, 10);
    let mx = full.sM.slice(), mn = full.sM.slice(), vx = full.sV.slice(), vn = full.sV.slice();
    const rmax = full.reac.map(r => r.V);
    for (let mask = 0; mask < (1 << n); mask++) {
      const act = [...Array(nS).keys()].map(i => i < n ? !!(mask & (1 << i)) : true);
      const r = solveBeam(X, sup, EI, loads, act);
      r.sM.forEach((v, i) => { if (v > mx[i]) mx[i] = v; if (v < mn[i]) mn[i] = v; });
      r.sV.forEach((v, i) => { if (v > vx[i]) vx[i] = v; if (v < vn[i]) vn[i] = v; });
      r.reac.forEach((q, i) => { if (q.V > rmax[i]) rmax[i] = q.V; });
    }
    env = { mx, mn, vx, vn, rmax };
  }
  const sfx = b.sufijo ? '_' + b.sufijo.replace(/\W/g, '') : '';
  const Mpos = Math.max(0, ...(env ? env.mx : full.sM)), Mneg = Math.min(0, ...(env ? env.mn : full.sM));
  const Vmax = Math.max(...(env ? env.vx : full.sV).map(Math.abs), ...(env ? env.vn : full.sV).map(Math.abs));
  const dmax = Math.max(...full.sD.map(Math.abs));
  setVar(ctx, 'Mpos' + sfx, math.unit(Mpos, 'tonf*m'));
  setVar(ctx, 'Mneg' + sfx, math.unit(Mneg, 'tonf*m'));
  setVar(ctx, 'Vmax' + sfx, math.unit(Vmax, 'tonf'));
  setVar(ctx, 'deltamax' + sfx, math.unit(dmax * 1000, 'mm'));
  full.reac.forEach((r, i) => { if (sup[i] !== 'L') setVar(ctx, 'R' + (i + 1) + sfx, math.unit(env ? env.rmax[i] : r.V, 'tonf')); });
  // máximos por tramo
  for (let i = 0; i < nS; i++) {
    const idxs = full.sx.map((x, k) => (x >= X[i] - 1e-9 && x <= X[i + 1] + 1e-9 ? k : -1)).filter(k => k >= 0);
    const arr = env ? env.mx : full.sM;
    setVar(ctx, 'Mpos' + (i + 1) + sfx, math.unit(Math.max(0, ...idxs.map(k => arr[k])), 'tonf*m'));
  }
  X.forEach((x, i) => {
    const arr = env ? env.mn : full.sM;
    const k = full.sx.reduce((bk, xx, kk) => (Math.abs(xx - x) < Math.abs(full.sx[bk] - x) ? kk : bk), 0);
    const near = full.sx.map((xx, kk) => Math.abs(xx - x) < 1e-6 ? arr[kk] : Infinity).filter(isFinite);
    setVar(ctx, 'Mapo' + (i + 1) + sfx, math.unit(near.length ? Math.min(...near) : arr[k], 'tonf*m'));
  });

  // ---------- dibujo ----------
  const W = 720, padL = 60, padR = 30, sc = (W - padL - padR) / X[X.length - 1];
  const px = (x) => padL + x * sc;
  let svg = arrowDefs;
  // esquema de cargas
  const yb = 110;
  const maxW = Math.max(1e-9, ...full.dist.flatMap(d => [Math.abs(d.w1), Math.abs(d.w2)]));
  // distribuidas (todas, sin alternancia, mostrando CM/CV)
  const { dist: dAll, pts: pAll, mom: mAll } = expandLoads(loads, X, null);
  const labs = [];
  dAll.forEach((d) => {
    const h1 = 12 + 30 * Math.abs(d.w1) / maxW, h2 = 12 + 30 * Math.abs(d.w2) / maxW;
    const x1 = px(d.x1), x2 = px(d.x2);
    svg += `<path d="M${x1},${yb - 6} L${x1},${yb - 6 - h1} L${x2},${yb - 6 - h2} L${x2},${yb - 6} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width="1"/>`;
    const n = Math.max(2, Math.round((x2 - x1) / 22));
    for (let k = 0; k <= n; k++) { const xx = x1 + (x2 - x1) * k / n; const hh = h1 + (h2 - h1) * k / n; svg += Lne(xx, yb - 6 - hh, xx, yb - 7, C.blue, 0.8).replace('/>', ' marker-end="url(#ar)"/>'); }
    const lab = (d.cas ? d.cas + ' ' : '') + (Math.abs(d.w1 - d.w2) < 1e-9 ? f2(d.w1) + ' t/m' : f2(d.w1) + '→' + f2(d.w2) + ' t/m');
    const lx = (x1 + x2) / 2;
    const topAll = Math.max(h1, h2, ...dAll.filter(q => px(q.x1) <= lx && px(q.x2) >= lx).map(q => 12 + 30 * Math.max(Math.abs(q.w1), Math.abs(q.w2)) / maxW));
    let ly = yb - 12 - topAll;
    while (labs.some(q => Math.abs(q.x - lx) < 60 && Math.abs(q.y - ly) < 11)) ly -= 12;
    labs.push({ x: lx, y: ly });
    svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="10" fill="${C.blue}" text-anchor="middle" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(lab)}</text>`;
  });
  pAll.forEach(p => { const x = px(p.x); svg += `<line x1="${x}" y1="${yb - 70}" x2="${x}" y2="${yb - 4}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + T(x + 4, yb - 72, f2(p.P) + ' t', { fs: 10, c: C.red, a: 'start' }); });
  mAll.forEach(m => { const x = px(m.x); svg += `<path d="M${x - 12},${yb - 4} A12,12 0 1,1 ${x + 12},${yb - 4}" fill="none" stroke="${C.red}" stroke-width="1.6" marker-end="url(#arr)"/>` + T(x, yb - 22, f2(m.M) + ' t·m', { fs: 10, c: C.red }); });
  svg += `<rect x="${px(0)}" y="${yb - 4}" width="${px(X[X.length - 1]) - px(0)}" height="8" fill="#5b6b7b"/>`;
  X.forEach((x, i) => {
    const xx = px(x), t = sup[i];
    if (t === 'A' || t === 'R') svg += `<path d="M${xx},${yb + 4} l-9,14 h18 z" fill="#fff" stroke="${C.ink}"/>` + Lne(xx - 13, yb + 21, xx + 13, yb + 21) + `<rect x="${xx - 13}" y="${yb + 21}" width="26" height="5" fill="url(#hatch)"/>`;
    if (t === 'E') svg += `<rect x="${i === 0 ? xx - 10 : xx}" y="${yb - 22}" width="10" height="44" fill="url(#hatch)" stroke="${C.ink}"/>`;
    svg += T(xx, yb + 40, String.fromCharCode(65 + i), { b: 1 });
  });
  for (let i = 0; i < nS; i++) svg += dimH(px(X[i]), px(X[i + 1]), yb + 58, f2(L[i]) + ' m');
  let out = svgWrap(W, yb + 70, svg);

  // diagramas
  const diag = (xsA, ys, ys2, color, fill, title, unit, invert, labelExt) => {
    const H = 170, top = 22, bot = 22, all = ys.concat(ys2 || []);
    let ymin = Math.min(0, ...all), ymax = Math.max(0, ...all);
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const sy = (H - top - bot) / (ymax - ymin);
    const py = (y) => invert ? top + (y - ymin) * sy : top + (ymax - y) * sy;
    let g = '';
    niceTicks(ymin, ymax, 4).forEach(t => { g += Lne(padL, py(t), W - padR, py(t), C.grid, 0.7) + T(padL - 6, py(t) + 3.5, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
    X.forEach(x => { g += Lne(px(x), top - 6, px(x), H - bot + 4, C.grid, 0.7, '3 3'); });
    const path = (arr) => 'M' + px(xsA[0]) + ',' + py(0) + ' ' + arr.map((y, i) => 'L' + px(xsA[i]).toFixed(1) + ',' + py(y).toFixed(1)).join(' ') + ' L' + px(xsA[xsA.length - 1]) + ',' + py(0) + ' Z';
    g += `<path d="${path(ys)}" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (ys2) g += `<path d="${path(ys2)}" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
    g += Lne(padL, py(0), W - padR, py(0), C.ink, 1);
    // etiquetas de extremos por tramo
    const placed = [];
    const lab = (arr) => {
      const used = [];
      for (let i = 0; i < nS; i++) {
        const ids = xsA.map((x, k) => (x >= X[i] - 1e-9 && x <= X[i + 1] + 1e-9 ? k : -1)).filter(k => k >= 0);
        for (const pick of [Math.max, Math.min]) {
          const val = pick(...ids.map(k => arr[k]));
          if (Math.abs(val) < 1e-6 * Math.max(Math.abs(ymax), Math.abs(ymin))) continue;
          const k = ids.find(k => arr[k] === val);
          if (used.some(u => Math.abs(u - xsA[k]) < 1e-6 && Math.sign(arr[k]) === Math.sign(val))) continue;
          used.push(xsA[k]);
          const yy = py(val), up = invert ? val < 0 : val > 0;
          let ty = yy + (up ? -6 : 14); const tx = px(xsA[k]);
          let lx2 = tx;
          const hit = () => placed.some(q => Math.abs(q.x - lx2) < 40 && Math.abs(q.y - ty) < 12);
          if (hit()) { lx2 = tx + 24; if (hit()) { lx2 = tx - 24; if (hit()) { lx2 = tx; for (let it = 0; it < 4 && hit(); it++) ty += up ? -12 : 12; } } }
          ty = Math.max(10, Math.min(H - 4, ty)); placed.push({ x: lx2, y: ty });
          g += `<circle cx="${tx}" cy="${yy}" r="2.4" fill="${color}"/>` + `<text x="${lx2.toFixed(1)}" y="${ty.toFixed(1)}" font-size="10" font-weight="600" fill="${color}" text-anchor="middle" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(f2(val))}</text>`;
        }
      }
    };
    if (labelExt) { lab(ys); if (ys2) lab(ys2); }
    g += T(10, H / 2, title + ' [' + unit + ']', { fs: 10, r: -90, c: C.axis });
    return svgWrap(W, H, g);
  };
  out += '<div class="dt">Diagrama de fuerza cortante' + (env ? ' (envolvente)' : '') + '</div>';
  out += diag(full.sx, env ? env.vx : full.sV, env ? env.vn : null, C.green, C.greenF, 'V', 't', false, true);
  out += '<div class="dt">Diagrama de momento flector' + (env ? ' (envolvente con alternancia de carga viva)' : '') + (b.convencion === 'arriba' ? '' : ' — positivo hacia abajo (lado en tracción)') + '</div>';
  out += diag(full.sx, env ? env.mx : full.sM, env ? env.mn : null, C.blue, C.blueF, 'M', 't·m', b.convencion !== 'arriba', true);
  if (b.deflexion !== false) {
    out += '<div class="dt">Deformada (carga total)</div>';
    out += diag(full.sx, full.sD.map(v => v * 1000), null, C.orange, 'rgba(212,115,12,.12)', 'δ', 'mm', false, true);
  }
  // tabla de reacciones
  let tb = '<table class="tbl"><thead><tr><th>Apoyo</th><th>Tipo</th><th>x [m]</th><th>R [t]</th><th>M [t·m]</th></tr></thead><tbody>';
  full.reac.forEach((r, i) => {
    const t = sup[i]; if (t === 'L') return;
    tb += `<tr><td>${String.fromCharCode(65 + i)}</td><td>${t === 'E' ? 'Empotrado' : 'Articulado'}</td><td>${f2(r.x)}</td><td>${f2(env ? env.rmax[i] : r.V)}</td><td>${t === 'E' ? f2(-r.M) : '—'}</td></tr>`;
  });
  tb += '</tbody></table>';
  const sumR = full.reac.reduce((s, r) => s + (r.V || 0), 0);
  const res = `<div class="kv">${K(symTex('Mpos' + sfx) + '=' + valTex(math.unit(Mpos, 'tonf*m')))} ${K(symTex('Mneg' + sfx) + '=' + valTex(math.unit(Mneg, 'tonf*m')))} ${K(symTex('Vmax' + sfx) + '=' + valTex(math.unit(Vmax, 'tonf')))} ${K(symTex('deltamax' + sfx) + '=' + valTex(math.unit(dmax * 1000, 'mm')))} ${K('\\Sigma R = ' + f2(sumR) + '\\,\\mathrm{t}')}</div>`;
  return `<div class="figure">${out}${tb}${res}${caption(ctx, b.titulo || 'Análisis de viga continua (método de rigidez)')}</div>`;
}

// =====================================================================
//  2) SECCIÓN DE CONCRETO ARMADO (dibujo)
// =====================================================================
export function parseBars(s) {
  const out = []; if (!s) return out;
  const re = /(\d+)\s*(?:#|ø|φ|Ø)\s*(\d+(?:\/\d+)?)\s*("|mm)?/g; let m;
  while ((m = re.exec(s))) {
    let d;
    if (m[3] === 'mm') d = +m[2] / 10;
    else if (m[2].includes('/') || m[3] === '"') { const [a, c] = m[2].split('/').map(Number); d = 2.54 * (c ? a / c : a); }
    else d = (BARS[+m[2]] || { d: +m[2] / 8 * 2.54 }).d;
    out.push({ n: +m[1], d, lab: m[0].replace(/\s/g, '') });
  }
  return out;
}
export function blockSection(b, ctx) {
  const S = ctx.scope;
  const bw = evalParam(b.b, S, 'cm', 30), h = evalParam(b.h, S, 'cm', 60), rec = evalParam(b.recub, S, 'cm', 4);
  const bf = evalParam(b.bf, S, 'cm', 0), hf = evalParam(b.hf, S, 'cm', 0);
  pos({ b: bw, h }); if (2 * rec >= Math.min(bw, h)) throw new Error('El recubrimiento es demasiado grande para la sección');
  const estN = Math.round(evalParam(b.estribo, S, '', 3));
  const de = (BARS[estN] || BARS[3]).d;
  const tooMany = [interp(b.sup, S), interp(b.inf, S)].some(t => parseBars(t).some(br => br.n > 24));
  const top = parseBars(interp(b.sup, S)), bot = parseBars(interp(b.inf, S)), side = Math.round(evalParam(b.lat, S, '', 0)) || 0;
  const W = 420, H = 380, wMax = Math.max(bw, bf);
  const sc = Math.min(250 / wMax, 290 / h), ox = (W - wMax * sc) / 2 + 15, oy = 35;
  const X = (x) => ox + (x + (wMax - bw) / 2) * sc, Y = (y) => oy + y * sc;
  let g = arrowDefs;
  if (bf > bw && hf > 0) g += `<path d="M${ox},${Y(0)} h${bf * sc} v${hf * sc} H${X(bw)} V${Y(h)} H${X(0)} V${Y(hf)} H${ox} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  else g += `<rect x="${X(0)}" y="${Y(0)}" width="${bw * sc}" height="${h * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  // estribo
  const r0 = rec + de / 2;
  g += `<rect x="${X(r0)}" y="${Y(r0)}" width="${(bw - 2 * r0) * sc}" height="${(h - 2 * r0) * sc}" rx="${2 * de * sc}" fill="none" stroke="${C.steel}" stroke-width="${Math.max(1.2, de * sc)}"/>`;
  // capas: "3#5 / 2#5" = 2 capas (separación libre 2.5 cm)
  const layers = (str, dir) => {
    let off = rec + de;
    String(interp(str, S) || '').split('/').map(t => parseBars(t)).filter(a => a.length).forEach((grp, li) => {
      const all = []; grp.forEach(br => { for (let i = 0; i < Math.min(br.n, 24); i++) all.push(br.d); });
      const dmax = Math.max(...all);
      if (li > 0) off += 2.5;
      const y = off + dmax / 2; off += dmax;
      const cy = dir > 0 ? y : h - y;
      const x0 = rec + de + all[0] / 2, x1 = bw - rec - de - all[all.length - 1] / 2;
      all.forEach((d, i) => { const cx = all.length === 1 ? bw / 2 : x0 + (x1 - x0) * i / (all.length - 1); g += `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${Math.max(2.5, d / 2 * sc)}" fill="${C.steel}"/>`; });
      g += T(X(bw) + 14, Y(cy) + 4, grp.map(b => b.lab).join(' + ') + (li ? ' (' + (li + 1) + 'ª capa)' : ''), { a: 'start', fs: 11, b: 1 }) + Lne(X(bw) - 2, Y(cy), X(bw) + 12, Y(cy), C.axis, 0.7);
    });
  };
  layers(b.sup, 1); layers(b.inf, -1);
  if (side > 0) {
    const d = (bot[0] || top[0] || { d: 1.27 }).d * 0.8;
    for (let i = 1; i <= side; i++) { const cy = h * i / (side + 1); [rec + de + d / 2, bw - rec - de - d / 2].forEach(cx => { g += `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${Math.max(2, d / 2 * sc)}" fill="${C.steel}"/>`; }); }
  }
  g += dimH(X(0), X(bw), Y(h) + 22, f2(bw, 1) + ' cm');
  if (bf > bw) g += dimH(ox, ox + bf * sc, Y(0) - 14, f2(bf, 1) + ' cm');
  g += dimV(X(0) - 22, Y(0), Y(h), f2(h, 1) + ' cm');
  g += T(X(bw / 2), Y(h) + 50, 'Estribo #' + estN + ' (' + (BARS[estN] || BARS[3]).n + ')' + (b.sest ? '  ' + interp(b.sest, S) : '') + ' · recubrimiento ' + f2(rec, 1) + ' cm', { fs: 10, c: C.axis });
  if (tooMany) g += T(W / 2, 16, '⚠ Más de 24 barras por capa: el dibujo muestra solo 24', { fs: 10, c: C.red, b: 1 });
  return `<div class="figure fig-sm">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Sección transversal')}</div>`;
}

// =====================================================================
//  3) DIAGRAMA DE INTERACCIÓN P-M (columna rectangular)
// =====================================================================
export function blockPM(b, ctx) {
  const S = ctx.scope;
  const bw = evalParam(b.b, S, 'cm', 40), h = evalParam(b.h, S, 'cm', 40);
  const fc = evalParam(b.fc, S, 'kgf/cm^2', 210), fy = evalParam(b.fy, S, 'kgf/cm^2', 4200);
  const dp = evalParam(b.dp, S, 'cm', 6);
  const nx = parseInt(evalParam(b.nx, S, '', 3)), ny = parseInt(evalParam(b.ny, S, '', 1));
  pos({ b: bw, h, fc, fy }); if (nx < 2 || ny < 0) throw new Error('Se requieren al menos 2 barras por cara'); if (2 * dp >= h) throw new Error('Recubrimiento mayor que la sección');
  const bar = parseInt(evalParam(b.barra, S, '', 6));
  const Ab = (BARS[bar] || BARS[6]).A;
  const Es = 2.0e6, ecu = 0.003, ey = fy / Es;
  const norma = (b.norma || 'E060').toUpperCase();
  const espiral = !!b.espiral;
  const phiC = espiral ? (norma === 'ACI' ? 0.75 : 0.75) : (norma === 'ACI' ? 0.65 : 0.70);
  const beta1 = fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 280) / 70);
  // capas de acero
  const layers = [{ d: dp, A: nx * Ab }];
  for (let i = 1; i <= ny; i++) layers.push({ d: dp + (h - 2 * dp) * i / (ny + 1), A: 2 * Ab });
  layers.push({ d: h - dp, A: nx * Ab });
  const Ast = layers.reduce((s, l) => s + l.A, 0), Ag = bw * h;
  const P0 = 0.85 * fc * (Ag - Ast) + fy * Ast;
  const Pmax = (espiral ? 0.85 : 0.80) * P0;
  const dt = h - dp;
  const pts = [];
  const point = (c) => {
    const a = Math.min(beta1 * c, h);
    let P = 0.85 * fc * a * bw, M = P * (h / 2 - a / 2);
    for (const l of layers) {
      const es = ecu * (c - l.d) / c;
      let fs = Math.max(-fy, Math.min(fy, Es * es));
      if (l.d < a) fs -= 0.85 * fc;
      P += l.A * fs; M += l.A * fs * (h / 2 - l.d);
    }
    const et = ecu * (dt - c) / c;
    const lim = norma === 'ACI' ? ey + 0.003 : 0.005;
    const phi = et <= ey ? phiC : et >= lim ? 0.9 : phiC + (0.9 - phiC) * (et - ey) / (lim - ey);
    return { P: P / 1000, M: M / 1e5, phi, c, et };
  };
  pts.push({ P: P0 / 1000, M: 0, phi: phiC });
  for (let k = 0; k <= 160; k++) { const c = h * 4 * Math.pow(0.004 / 4, k / 160); pts.push(point(Math.max(c, 0.2))); }
  pts.push({ P: -fy * Ast / 1000, M: 0, phi: 0.9 });
  pts.sort((a, b) => b.P - a.P);
  const nom = pts.map(p => ({ P: p.P, M: p.M }));
  const des = pts.map(p => ({ P: Math.min(p.phi * p.P, phiC * Pmax / 1000), M: p.phi * p.M }));
  // puntos de demanda
  const dem = [];
  for (const ln of String(b.demandas || '').split('\n')) {
    const s = ln.split('//')[0].trim(); if (!s) continue;
    const parts = s.split(/[;,]/).map(t => t.trim());
    const lab = (ln.split('//')[1] || '').trim();
    dem.push({ P: evalParam(parts[0], S, 'tonf'), M: Math.abs(evalParam(parts[1], S, 'tonf*m')), lab });
  }
  // capacidad φMn a nivel de Pu
  const capM = (P) => {
    let best = null;
    for (let i = 0; i < des.length - 1; i++) {
      const a = des[i], c = des[i + 1];
      if ((P <= a.P && P >= c.P) || (P >= a.P && P <= c.P)) { const t = (P - a.P) / ((c.P - a.P) || 1e-9); const m = a.M + t * (c.M - a.M); if (best === null || m > best) best = m; }
    }
    return best;
  };
  let maxDC = 0;
  dem.forEach(d => {
    const cm = capM(d.P);
    const pmx = phiC * Pmax / 1000; d.cap = cm; d.dc = d.P > pmx ? Math.max(d.P / pmx, 1.01) : cm === null ? 9.99 : d.M / Math.max(cm, 1e-9);
    if (d.M === 0 && cm !== null) d.dc = d.P > 0 ? d.P / (phiC * Pmax / 1000) : 0;
    maxDC = Math.max(maxDC, d.dc);
  });
  const sfx = b.sufijo ? '_' + b.sufijo : '';
  setVar(ctx, 'DCpm' + sfx, maxDC);
  setVar(ctx, 'phiPnmax' + sfx, math.unit(phiC * Pmax / 1000, 'tonf'));
  setVar(ctx, 'Ast' + sfx, math.unit(Ast, 'cm^2'));
  setVar(ctx, 'rhog' + sfx, Ast / Ag);
  dem.forEach((d, i) => ctx.checks.push({ ok: d.dc <= 1, label: 'Flexocompresión ' + (d.lab || 'P' + (i + 1)) + ' (Pu=' + f2(d.P) + ' t, Mu=' + f2(d.M) + ' t·m)', ratio: d.dc, block: ctx.blockId }));

  // dibujo
  const W = 640, H = 470, pl = 70, pr = 150, pt = 20, pb = 45;
  const allM = nom.map(p => p.M).concat(dem.map(d => d.M)), allP = nom.map(p => p.P).concat(dem.map(d => d.P));
  const mMax = Math.max(...allM) * 1.1, pMax = Math.max(...allP) * 1.05, pMin = Math.min(...allP) * 1.1;
  const sx = (W - pl - pr) / mMax, sy = (H - pt - pb) / (pMax - pMin);
  const X = (m) => pl + m * sx, Y = (p) => pt + (pMax - p) * sy;
  let g = '';
  niceTicks(0, mMax, 6).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 14, f2(t, 0), { fs: 9, c: C.axis }); });
  niceTicks(pMin, pMax, 8).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 6, Y(t) + 3, f2(t, 0), { fs: 9, c: C.axis, a: 'end' }); });
  g += Lne(pl, Y(0), W - pr, Y(0), C.ink, 1) + Lne(pl, pt, pl, H - pb, C.ink, 1);
  const poly = (arr) => arr.map((p, i) => (i ? 'L' : 'M') + X(p.M).toFixed(1) + ',' + Y(p.P).toFixed(1)).join(' ');
  g += `<path d="${poly(nom)}" fill="none" stroke="${C.axis}" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  g += `<path d="${poly(des)} L${X(0)},${Y(des[des.length - 1].P)} L${X(0)},${Y(des[0].P)} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width="2"/>`;
  dem.forEach((d, i) => {
    const ok = d.dc <= 1;
    g += `<circle cx="${X(d.M)}" cy="${Y(d.P)}" r="4.5" fill="${ok ? C.green : C.red}" stroke="#fff"/>` + T(X(d.M) + 7, Y(d.P) - 6, d.lab || 'P' + (i + 1), { fs: 10, a: 'start', c: ok ? C.green : C.red, b: 1 });
  });
  g += T((pl + W - pr) / 2, H - 8, 'Momento M [t·m]', { fs: 11 }) + T(16, (pt + H - pb) / 2, 'Carga axial P [t]', { fs: 11, r: -90 });
  const lx = W - pr + 12;
  g += Lne(lx, 40, lx + 26, 40, C.axis, 1.4, '6 4') + T(lx + 30, 44, 'Pn, Mn (nominal)', { a: 'start', fs: 10 });
  g += Lne(lx, 60, lx + 26, 60, C.blue, 2) + T(lx + 30, 64, 'φPn, φMn (diseño)', { a: 'start', fs: 10 });
  g += `<circle cx="${lx + 13}" cy="80" r="4" fill="${C.green}"/>` + T(lx + 30, 84, 'Pu, Mu (cumple)', { a: 'start', fs: 10 });
  g += `<circle cx="${lx + 13}" cy="100" r="4" fill="${C.red}"/>` + T(lx + 30, 104, 'Pu, Mu (no cumple)', { a: 'start', fs: 10 });
  // mini sección
  const ms = Math.min(110 / bw, 110 / h), mx0 = lx + 5, my0 = 130;
  g += `<rect x="${mx0}" y="${my0}" width="${bw * ms}" height="${h * ms}" fill="${C.conc}" stroke="${C.ink}"/>`;
  layers.forEach((l, li) => {
    const n = li === 0 || li === layers.length - 1 ? nx : 2;
    for (let i = 0; i < n; i++) { const cx = n === 1 ? bw / 2 : dp + (bw - 2 * dp) * i / (n - 1); g += `<circle cx="${mx0 + cx * ms}" cy="${my0 + l.d * ms}" r="2.6" fill="${C.steel}"/>`; }
  });
  g += T(mx0 + bw * ms / 2, my0 + h * ms + 14, f2(bw, 0) + '×' + f2(h, 0) + ' cm', { fs: 10 }) + T(mx0 + bw * ms / 2, my0 + h * ms + 28, (2 * nx + 2 * ny) + ' #' + bar + ' · ρ=' + f2(100 * Ast / Ag, 2) + '%', { fs: 10 });
  g += `<path d="M${mx0 + bw * ms + 8},${my0 + h * ms / 2 - 12} a12,12 0 1,1 0,24" fill="none" stroke="${C.red}" marker-end="url(#arr)"/>` + T(mx0 + bw * ms + 26, my0 + h * ms / 2 + 4, 'M', { fs: 10, c: C.red });
  let tb = '';
  if (dem.length) {
    tb = '<table class="tbl"><thead><tr><th>Combinación</th><th>Pu [t]</th><th>Mu [t·m]</th><th>φMn (Pu) [t·m]</th><th>D/C</th><th>Estado</th></tr></thead><tbody>' +
      dem.map((d, i) => `<tr><td>${esc(d.lab || 'P' + (i + 1))}</td><td>${f2(d.P)}</td><td>${f2(d.M)}</td><td>${d.cap === null ? '—' : f2(d.cap)}</td><td>${isFinite(d.dc) ? f2(d.dc) : '∞'}</td><td>${d.dc <= 1 ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>'}</td></tr>`).join('') + '</tbody></table>';
  }
  const info = `<div class="kv">${K('A_{st} = ' + f2(Ast) + '\\,\\mathrm{cm^2}')} ${K('\\rho_g = ' + f2(100 * Ast / Ag, 2) + '\\%')} ${K('P_0 = ' + f2(P0 / 1000) + '\\,\\mathrm{t}')} ${K('\\phi P_{n,max} = ' + f2(phiC * Pmax / 1000) + '\\,\\mathrm{t}')} ${K('\\phi_{c} = ' + phiC)} ${K('\\beta_1 = ' + f2(beta1, 3))}</div>`;
  const warn = (Ast / Ag < 0.01 || Ast / Ag > 0.06) ? `<div class="warn">⚠ Cuantía ρg = ${f2(100 * Ast / Ag, 2)}% fuera del rango 1%–6% (E.060 10.9.1)</div>` : '';
  return `<div class="figure">${svgWrap(W, H, arrowDefs + g)}${info}${warn}${tb}${caption(ctx, b.titulo || 'Diagrama de interacción P–M (' + (norma === 'ACI' ? 'ACI 318-19' : 'NTE E.060') + ')')}</div>`;
}

// =====================================================================
//  4) ZAPATA (planta + elevación + presiones)
// =====================================================================
export function blockFooting(b, ctx) {
  const S = ctx.scope;
  const B = evalParam(b.B, S, 'm', 2), L = evalParam(b.L, S, 'm', 2), hz = evalParam(b.hz, S, 'm', 0.6);
  const c1 = evalParam(b.c1, S, 'm', 0.4), c2 = evalParam(b.c2, S, 'm', 0.4), Df = evalParam(b.Df, S, 'm', 1.5);
  const d = evalParam(b.d, S, 'm', 0);
  const q1 = evalParam(b.q1, S, 'tonf/m^2', 0), q2 = evalParam(b.q2, S, 'tonf/m^2', q1);
  pos({ B, L, hz, c1, c2, Df });
  const W = 720, H = 360;
  let g = arrowDefs;
  // planta
  const sc1 = Math.min(250 / L, 250 / B), ox = 40, oy = 45;
  const Xp = (x) => ox + x * sc1, Yp = (y) => oy + y * sc1;
  g += T(ox + L * sc1 / 2, 20, 'PLANTA', { b: 1, fs: 11 });
  g += `<rect x="${Xp(0)}" y="${Yp(0)}" width="${L * sc1}" height="${B * sc1}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  if (d > 0) g += `<rect x="${Xp((L - c1 - d) / 2)}" y="${Yp((B - c2 - d) / 2)}" width="${(c1 + d) * sc1}" height="${(c2 + d) * sc1}" fill="none" stroke="${C.red}" stroke-dasharray="5 3"/>` + T(Xp(L / 2), Yp((B - c2 - d) / 2) - 4, 'bo (d/2)', { fs: 9, c: C.red });
  g += `<rect x="${Xp((L - c1) / 2)}" y="${Yp((B - c2) / 2)}" width="${c1 * sc1}" height="${c2 * sc1}" fill="#9aa5b1" stroke="${C.ink}"/>`;
  // malla
  for (let i = 1; i < 10; i++) { g += Lne(Xp(L * i / 10), Yp(0.03 * B), Xp(L * i / 10), Yp(0.97 * B), '#7a8794', 0.4) + Lne(Xp(0.03 * L), Yp(B * i / 10), Xp(0.97 * L), Yp(B * i / 10), '#7a8794', 0.4); }
  g += dimH(Xp(0), Xp(L), Yp(B) + 20, 'L = ' + f2(L) + ' m') + dimV(Xp(0) - 18, Yp(0), Yp(B), 'B = ' + f2(B) + ' m');
  if (b.acero) g += T(Xp(L / 2), Yp(B) + 44, interp(b.acero, S), { fs: 10, c: C.axis });
  // elevación
  const ex = 380, Wl = 300, sc2 = Math.min(Wl / L, 200 / (Df + 0.6)), gy = 70;
  const Xe = (x) => ex + (Wl - L * sc2) / 2 + x * sc2, Ye = (y) => gy + y * sc2;
  g += T(ex + Wl / 2, 20, 'ELEVACIÓN', { b: 1, fs: 11 });
  g += `<rect x="${ex - 10}" y="${gy}" width="${Wl + 20}" height="${(Df + 0.25) * sc2}" fill="url(#soilp)" opacity=".7"/>` + Lne(ex - 10, gy, ex + Wl + 10, gy, C.soil, 2);
  g += `<rect x="${Xe(0)}" y="${Ye(Df - hz)}" width="${L * sc2}" height="${hz * sc2}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  g += `<rect x="${Xe((L - c1) / 2)}" y="${gy - 25}" width="${c1 * sc2}" height="${(Df - hz) * sc2 + 25}" fill="#9aa5b1" stroke="${C.ink}"/>`;
  g += Lne(Xe(0.05 * L), Ye(Df - 0.08), Xe(0.95 * L), Ye(Df - 0.08), C.steel, 2);
  g += dimV(Xe(L) + 18, Ye(0), Ye(Df), 'Df = ' + f2(Df) + ' m', C.ink, 1) + dimV(Xe(0) - 14, Ye(Df - hz), Ye(Df), 'hz = ' + f2(hz) + ' m');
  // presiones
  if (q1 > 0) {
    const qmax = Math.max(q1, q2), ph = 50 / qmax, py0 = Ye(Df) + 8;
    g += `<path d="M${Xe(0)},${py0} L${Xe(0)},${py0 + q1 * ph} L${Xe(L)},${py0 + q2 * ph} L${Xe(L)},${py0} Z" fill="${C.redF}" stroke="${C.red}"/>`;
    for (let i = 0; i <= 8; i++) { const x = Xe(L * i / 8), hh = (q1 + (q2 - q1) * i / 8) * ph; g += Lne(x, py0 + hh, x, py0 + 2, C.red, 0.8).replace('/>', ' marker-end="url(#arr)"/>'); }
    g += T(Xe(0) - 4, py0 + q1 * ph + 12, 'q = ' + f2(q1) + ' t/m²', { fs: 10, c: C.red, a: 'start' });
    if (Math.abs(q2 - q1) > 1e-6) g += T(Xe(L) + 4, py0 + q2 * ph + 12, f2(q2) + ' t/m²', { fs: 10, c: C.red, a: 'end' });
  }
  return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Geometría de la zapata y distribución de presiones')}</div>`;
}

// =====================================================================
//  5) MURO DE CONTENCIÓN EN VOLADIZO (geometría + empujes)
// =====================================================================
export function blockWall(b, ctx) {
  const S = ctx.scope;
  const H = evalParam(b.H, S, 'm', 4), B = evalParam(b.B, S, 'm', 2.8), hz = evalParam(b.hz, S, 'm', 0.5);
  const p = evalParam(b.punta, S, 'm', 0.6), t1 = evalParam(b.t1, S, 'm', 0.25), t2 = evalParam(b.t2, S, 'm', 0.4);
  const Df = evalParam(b.Df, S, 'm', 1.0), Ka = evalParam(b.Ka, S, '', 0.33), gs = evalParam(b.gs, S, 'tonf/m^3', 1.8);
  const sq = evalParam(b.sc, S, 'tonf/m^2', 0);
  pos({ H, B, hz, t1, t2 });
  const W = 640, Hh = 420, sc = Math.min(300 / (H + 0.5), 330 / (B + 1.5)), ox = 60, oy = 30;
  const X = (x) => ox + x * sc, Y = (y) => oy + (H - y) * sc;
  let g = arrowDefs;
  g += `<path d="M${X(p + t2)},${Y(hz)} L${X(p + t2)},${Y(H)} L${X(B)},${Y(H)} L${X(B)},${Y(hz)} Z" fill="url(#soilp)" opacity=".8"/>`;
  g += `<path d="M${X(0) - 20},${Y(hz)} L${X(0) - 20},${Y(Df)} L${X(p)},${Y(Df)} L${X(p)},${Y(hz)} Z" fill="url(#soilp)" opacity=".6"/>`;
  g += `<path d="M${X(0)},${Y(0)} L${X(B)},${Y(0)} L${X(B)},${Y(hz)} L${X(p + t2)},${Y(hz)} L${X(p + t2)},${Y(H)} L${X(p + t2 - t1)},${Y(H)} L${X(p)},${Y(hz)} L${X(0)},${Y(hz)} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.5"/>`;
  g += Lne(X(B), Y(H), X(B) + 30, Y(H), C.soil, 2);
  // empuje
  const pa = Ka * gs * H, ps = Ka * sq, ph = 90 / Math.max(pa + ps, 1e-6), xb = X(B) + 30;
  if (ps > 0) g += `<path d="M${xb},${Y(H)} L${xb + ps * ph},${Y(H)} L${xb + ps * ph},${Y(0)} L${xb},${Y(0)} Z" fill="rgba(212,115,12,.18)" stroke="${C.orange}"/>`;
  g += `<path d="M${xb + ps * ph},${Y(H)} L${xb + (ps + pa) * ph},${Y(0)} L${xb + ps * ph},${Y(0)} Z" fill="${C.redF}" stroke="${C.red}"/>`;
  for (let i = 1; i <= 6; i++) { const y = H * (1 - i / 6.5); const w = ps + Ka * gs * (H - y); g += Lne(xb + w * ph, Y(y), xb + 3, Y(y), C.red, 0.8).replace('/>', ' marker-end="url(#arr)"/>'); }
  g += T(xb + (ps + pa) * ph + 4, Y(0) - 4, 'Ka·γ·H = ' + f2(pa) + ' t/m²', { fs: 10, a: 'start', c: C.red });
  if (ps > 0) g += T(xb + ps * ph + 4, Y(H) - 4, 'Ka·q = ' + f2(ps) + ' t/m²', { fs: 10, a: 'start', c: C.orange });
  g += dimH(X(0), X(B), Y(0) + 22, 'B = ' + f2(B) + ' m') + dimH(X(0), X(p), Y(0) + 42, 'punta ' + f2(p)) + dimH(X(p + t2), X(B), Y(0) + 42, 'talón ' + f2(B - p - t2));
  g += dimV(X(0) - 30, Y(H), Y(0), 'H = ' + f2(H) + ' m') + dimV(X(0) - 8, Y(hz), Y(0), 'hz ' + f2(hz), C.ink, -1);
  g += T(X(p + t2 - t1 / 2), Y(H) - 6, 't1 = ' + f2(t1), { fs: 10 }) + T(X(p + t2 / 2), Y(hz) + 14, 't2 = ' + f2(t2), { fs: 10 });
  return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Geometría del muro y diagrama de empujes (Rankine)')}</div>`;
}

// =====================================================================
//  6) ESPECTRO DE DISEÑO E.030-2018
// =====================================================================
export function blockSpectrum(b, ctx) {
  const S = ctx.scope;
  const Z = evalParam(b.Z, S, '', 0.35), Uf = evalParam(b.U, S, '', 1), Sf = evalParam(b.S, S, '', 1.15);
  const Tp = evalParam(b.Tp, S, 's', 0.6), Tl = evalParam(b.Tl, S, 's', 2.0), R = evalParam(b.R, S, '', 8);
  const Te = evalParam(b.T, S, 's', 0);
  const Cf = (T) => (T < 0.2 * Tp && b.corto ? 1 + 7.5 * T / Tp : T < Tp ? 2.5 : T <= Tl ? 2.5 * Tp / T : 2.5 * Tp * Tl / (T * T));
  const Tmax = Math.max(4, Tl * 1.6);
  const ts = [], sa = [];
  for (let i = 0; i <= 400; i++) { const t = Tmax * i / 400; ts.push(t); sa.push(Z * Uf * Cf(t) * Sf / R); }
  const W = 680, H = 300, pl = 60, pr = 20, pt = 20, pb = 40;
  const ymax = Math.max(...sa) * 1.15;
  const X = (t) => pl + t / Tmax * (W - pl - pr), Y = (v) => pt + (1 - v / ymax) * (H - pt - pb);
  let g = '';
  niceTicks(0, Tmax, 8).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 14, f2(t, 1), { fs: 9, c: C.axis }); });
  niceTicks(0, ymax, 5).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 6, Y(t) + 3, f2(t, 3), { fs: 9, c: C.axis, a: 'end' }); });
  g += `<path d="M${X(0)},${Y(0)} ${ts.map((t, i) => 'L' + X(t).toFixed(1) + ',' + Y(sa[i]).toFixed(1)).join(' ')} L${X(Tmax)},${Y(0)} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width="2"/>`;
  g += Lne(X(Tp), pt, X(Tp), H - pb, C.axis, 1, '4 3') + T(X(Tp) + 3, pt + 10, 'Tp = ' + f2(Tp) + ' s', { fs: 10, a: 'start', c: C.axis });
  g += Lne(X(Tl), pt, X(Tl), H - pb, C.axis, 1, '4 3') + T(X(Tl) + 3, pt + 24, 'TL = ' + f2(Tl) + ' s', { fs: 10, a: 'start', c: C.axis });
  if (Te > 0) {
    const v = Z * Uf * Cf(Te) * Sf / R;
    g += Lne(X(Te), Y(0), X(Te), Y(v), C.red, 1.4, '3 2') + `<circle cx="${X(Te)}" cy="${Y(v)}" r="4.5" fill="${C.red}"/>` + T(X(Te) + 6, Y(v) - 8, 'T = ' + f2(Te) + ' s → Sa/g = ' + f2(v, 3), { fs: 10, a: 'start', c: C.red, b: 1 });
    setVar(ctx, 'C', Cf(Te));
    setVar(ctx, 'Sa_g', v);
  }
  g += Lne(pl, Y(0), W - pr, Y(0)) + Lne(pl, pt, pl, H - pb);
  g += T((pl + W - pr) / 2, H - 6, 'Periodo T [s]', { fs: 11 }) + T(16, H / 2, 'Sa/g = ZUCS/R', { fs: 11, r: -90 });
  return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || `Espectro de pseudo-aceleraciones E.030 (Z=${Z}, U=${Uf}, S=${Sf}, R=${f2(R)})`)}</div>`;
}

// =====================================================================
//  7) GRÁFICO DE FUNCIONES
// =====================================================================
export function blockPlot(b, ctx) {
  const S = ctx.scope;
  const v = (b.var || 'x').trim();
  const x0 = evalParam(b.desde, S, null, 0), x1 = evalParam(b.hasta, S, null, 10), n = Math.min(2000, parseInt(b.puntos) || 200);
  const exprs = String(b.expr || '').split(';').map(s => s.trim()).filter(Boolean);
  if (!exprs.length) throw new Error('Ingrese al menos una expresión');
  const cols = [C.blue, C.red, C.green, C.orange, '#8250df', '#0a7e8c'];
  const series = exprs.map((e) => {
    const code = math.compile(e); const sc = new Map(S); const xs = [], ys = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n; sc.set(v, x);
      try { let y = code.evaluate(sc); if (math.isUnit(y)) y = displayUnit(y).v; if (typeof y === 'number' && isFinite(y)) { xs.push(x); ys.push(y); } } catch (err) { /* salta */ }
    }
    return { e, xs, ys };
  });
  const all = series.flatMap(s => s.ys);
  if (!all.length) throw new Error('Las expresiones no producen valores numéricos');
  let ymin = Math.min(...all), ymax = Math.max(...all); if (ymin === ymax) { ymin -= 1; ymax += 1; }
  const pad = (ymax - ymin) * 0.08; ymin -= pad; ymax += pad;
  const W = 680, H = 320, pl = 60, pr = 20, pt = 20, pb = 42;
  const X = (x) => pl + (x - x0) / (x1 - x0) * (W - pl - pr), Y = (y) => pt + (ymax - y) / (ymax - ymin) * (H - pt - pb);
  let g = '';
  niceTicks(Math.min(x0, x1), Math.max(x0, x1), 8).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 14, f2(t, 2), { fs: 9, c: C.axis }); });
  niceTicks(ymin, ymax, 6).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 6, Y(t) + 3, f2(t, 2), { fs: 9, c: C.axis, a: 'end' }); });
  if (ymin < 0 && ymax > 0) g += Lne(pl, Y(0), W - pr, Y(0), C.ink, 0.9);
  series.forEach((s, i) => { g += `<path d="${s.xs.map((x, k) => (k ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(s.ys[k]).toFixed(1)).join(' ')}" fill="none" stroke="${cols[i % cols.length]}" stroke-width="2"/>`; });
  g += `<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="none" stroke="${C.axis}"/>`;
  g += T((pl + W - pr) / 2, H - 6, b.xlabel || v, { fs: 11 }) + T(16, H / 2, b.ylabel || 'y', { fs: 11, r: -90 });
  let leg = '';
  const names = String(b.nombres || '').split(';').map(s => s.trim());
  if (series.length > 1 || b.leyenda) leg = '<div class="legend">' + series.map((s, i) => `<span><i style="background:${cols[i % cols.length]}"></i>${esc(names[i] || s.e)}</span>`).join('') + '</div>';
  return `<div class="figure">${svgWrap(W, H, g)}${leg}${caption(ctx, b.titulo || '')}</div>`;
}

// =====================================================================
//  8) TABLA DE RESULTADOS (columnas = expresiones vectoriales)
// =====================================================================
export function blockTable(b, ctx) {
  const S = ctx.scope;
  const cols = [];
  for (const ln of String(b.columnas || '').split('\n')) {
    const s = ln.trim(); if (!s) continue;
    const i = s.indexOf('=');
    if (i < 0) throw new Error('Columna sin "=": ' + s);
    let head = s.slice(0, i).trim(), expr = s.slice(i + 1).trim(), unit = null;
    const um = /\[([^\]]+)\]\s*$/.exec(head); if (um) unit = um[1].trim();
    let v = math.evaluate(expr, new Map(S));
    if (math.isMatrix(v)) v = v.toArray().flat();
    if (!Array.isArray(v)) v = [v];
    cols.push({ head, unit, vals: v });
  }
  const n = Math.max(0, ...cols.map(c => c.vals.length));
  const dec = parseInt(b.dec) >= 0 && b.dec !== '' && b.dec !== undefined ? parseInt(b.dec) : 2;
  const fmt = (v, unit) => {
    if (v === undefined) return '';
    if (math.isUnit(v)) { if (unit) { try { return f2(v.toNumber(unit.replace(/·/g, '*').replace(/²/g, '^2').replace(/³/g, '^3')), dec); } catch (e) { /* */ } } const d = displayUnit(v); return f2(d.v, dec) + (unit ? '' : ' ' + d.u); }
    if (typeof v === 'number') return f2(v, dec);
    return esc(String(v));
  };
  const fsz = cols.length > 12 ? 7 : cols.length > 9 ? 8 : cols.length > 7 ? 9 : 0;
  let h = `<table class="tbl"${fsz ? ` style="font-size:${fsz}pt"` : ''}><thead><tr>` + cols.map(c => `<th>${richText(c.head.replace(/\[[^\]]+\]\s*$/, ''), S, true)}${c.unit ? ' [' + esc(c.unit) + ']' : ''}</th>`).join('') + '</tr></thead><tbody>';
  for (let r = 0; r < n; r++) h += '<tr>' + cols.map(c => `<td>${fmt(c.vals[r], c.unit)}</td>`).join('') + '</tr>';
  if (b.total) h += '<tr class="tot">' + cols.map((c, i) => { if (i === 0) return '<td>Σ</td>'; try { const s = c.vals.reduce((a, v) => math.add(a, v)); return `<td>${fmt(s, c.unit)}</td>`; } catch (e) { return '<td></td>'; } }).join('') + '</tr>';
  h += '</tbody></table>';
  ctx.tab = (ctx.tab || 0) + 1;
  return `<div class="figure"><div class="cap">Tabla ${ctx.tab}${b.titulo ? ': ' + richText(b.titulo, S, true) : ''}</div>${h}</div>`;
}
