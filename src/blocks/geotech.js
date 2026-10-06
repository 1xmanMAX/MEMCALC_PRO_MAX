// =====================================================================
//  Bloques gráficos — módulo «geotech»
//   winkler     Viga de cimentación sobre lecho elástico (FEM) / método rígido
//   soilprofile Perfil estratigráfico + N-SPT + esfuerzos efectivos
//   slope       Estabilidad de taludes por dovelas (Fellenius / Bishop)
//   pilegroup   Grupo de pilotes con cabezal (planta y elevación)
//   liqchart    Potencial de licuación: CSR, CRR y FS vs profundidad
// =====================================================================
import { registerBlock as registerBlock0, F } from '../blockreg.js';
import { evalParam, esc, math, K, valTex, symTex, interp } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, pos, f2, fixDt } from '../blocks.js';
// los títulos .dt conservan la caja de unidades y símbolos (ver dtx en blocks.js)
const registerBlock = (type, def) => registerBlock0(type, { ...def, render: (b, ctx) => fixDt(def.render(b, ctx)) });

const U = (v, u) => math.unit(v, u);
const lines = (s) => String(s || '').split('\n').map(l => l.split('//')[0].trim()).filter(Boolean);
const toks = (l) => (l.includes(';') ? l.split(';') : l.split(/\s+/)).map(s => s.trim()).filter(Boolean);
const toArr = (v) => (math.isMatrix(v) ? v.toArray().flat() : Array.isArray(v) ? v.flat() : [v]);
const evalVec = (str, S, unit) => {
  if (str === undefined || str === null || String(str).trim() === '') return null;
  const v = math.evaluate(String(str), new Map(S));
  return toArr(v).map(x => (math.isUnit(x) ? (unit ? x.toNumber(unit) : x.value) : +x));
};
const tryNum = (s, S, unit) => { if (s === undefined) return null; try { const v = evalParam(s, S, unit); return typeof v === 'number' && isFinite(v) ? v : null; } catch (e) { return null; } };
const lab = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 10}"${o.b ? ' font-weight="600"' : ''} fill="${o.c || C.ink}" text-anchor="${o.a || 'middle'}" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(s)}</text>`;
const kv = (pairs) => `<div class="kv">${pairs.map(([n, v]) => K(symTex(n) + '=' + valTex(v))).join(' ')}</div>`;

// Diagrama a lo largo de x (eje horizontal = longitud)
function xDiagram(W, padL, padR, px, xs, ys, o) {
  const H = o.H || 150, top = 18, bot = 18;
  let ymin = Math.min(0, ...ys, ...(o.ref || [])), ymax = Math.max(0, ...ys, ...(o.ref || []));
  if (ymax - ymin < 1e-12) { ymax += 1; ymin -= 1; }
  const sy = (H - top - bot) / (ymax - ymin);
  const py = (y) => (o.invert ? top + (y - ymin) * sy : top + (ymax - y) * sy);
  let g = '';
  niceTicks(ymin, ymax, 4).forEach(t => { g += Lne(padL, py(t), W - padR, py(t), C.grid, 0.7) + T(padL - 6, py(t) + 3.5, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
  (o.vlines || []).forEach(x => { g += Lne(px(x), top - 4, px(x), H - bot + 4, C.grid, 0.7, '3 3'); });
  const d = 'M' + px(xs[0]).toFixed(1) + ',' + py(0).toFixed(1) + ' ' + xs.map((x, i) => 'L' + px(x).toFixed(1) + ',' + py(ys[i]).toFixed(1)).join(' ') + ' L' + px(xs[xs.length - 1]).toFixed(1) + ',' + py(0).toFixed(1) + ' Z';
  g += `<path d="${d}" fill="${o.fill}" stroke="${o.color}" stroke-width="1.6" stroke-linejoin="round"/>`;
  g += Lne(padL, py(0), W - padR, py(0), C.ink, 1);
  (o.ref || []).forEach((r, i) => { g += Lne(padL, py(r), W - padR, py(r), C.red, 1.2, '6 4') + lab(W - padR - 4, py(r) - 4, (o.refLab || [])[i] || '', { a: 'end', c: C.red }); });
  // extremos
  const placed = [], done = new Set();
  const mark = (k) => {
    if (done.has(k) || [...done].some(j => Math.abs(xs[j] - xs[k]) < 1e-9 && Math.abs(ys[j] - ys[k]) < 1e-9)) return; done.add(k);
    const v = ys[k]; if (!isFinite(v) || Math.abs(v) < 1e-9 * Math.max(Math.abs(ymax), Math.abs(ymin))) return;
    const x = px(xs[k]), y = py(v), up = o.invert ? v < 0 : v > 0;
    let ty = y + (up ? -6 : 13), tx = x;
    for (let it = 0; it < 4 && placed.some(q => Math.abs(q.x - tx) < 46 && Math.abs(q.y - ty) < 11); it++) tx += 30;
    placed.push({ x: tx, y: ty }); ty = Math.max(10, Math.min(H - 3, ty));
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${o.color}"/>` + lab(tx, ty, f2(v), { b: 1, c: o.color });
  };
  const kmax = ys.indexOf(Math.max(...ys)), kmin = ys.indexOf(Math.min(...ys));
  mark(kmax); if (kmin !== kmax) mark(kmin);
  (o.extra || []).forEach(mark);
  g += T(10, H / 2, o.title, { fs: 10, r: -90, c: C.axis });
  return svgWrap(W, H, g);
}

// Panel con profundidad en el eje vertical (z hacia abajo)
function zPanel(x0, y0, w, h, zmax, xr, series, xlabel, o = {}) {
  let [xmin, xmax] = xr; if (xmax - xmin < 1e-12) xmax = xmin + 1;
  const X = (x) => x0 + (x - xmin) / (xmax - xmin) * w, Y = (z) => y0 + z / zmax * h;
  let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff" stroke="${C.axis}"/>`;
  niceTicks(xmin, xmax, o.nx || 4).forEach(t => { g += Lne(X(t), y0, X(t), y0 + h, C.grid, 0.7) + T(X(t), y0 - 5, f2(t, 2), { fs: 9, c: C.axis }); });
  if (!o.noZ) niceTicks(0, zmax, 8).forEach(t => { g += Lne(x0, Y(t), x0 + w, Y(t), C.grid, 0.7) + T(x0 - 4, Y(t) + 3, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
  (o.vref || []).forEach(([v, c, txt]) => { if (v >= xmin && v <= xmax) g += Lne(X(v), y0, X(v), y0 + h, c, 1.3, '6 3') + lab(X(v) + 3, y0 + h - 6, txt, { a: 'start', c }); });
  if (o.nf !== undefined && o.nf !== null && o.nf < zmax) g += Lne(x0, Y(o.nf), x0 + w, Y(o.nf), C.blue, 0.9, '4 3');
  for (const s of series) {
    const pts = s.zs.map((z, i) => [X(Math.max(xmin, Math.min(xmax, s.xs[i]))), Y(z)]);
    if (s.line !== false) g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.w || 1.7}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
    if (s.marker) pts.forEach(p => { g += s.marker === 'sq' ? `<rect x="${(p[0] - 2.8).toFixed(1)}" y="${(p[1] - 2.8).toFixed(1)}" width="5.6" height="5.6" fill="${s.color}"/>` : `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#fff" stroke="${s.color}" stroke-width="1.6"/>`; });
  }
  g += T(x0 + w / 2, y0 - 18, xlabel, { fs: 10, b: 1 });
  return g;
}
const legend = (items) => '<div class="legend">' + items.map(([c, t, dash]) => `<span><i style="background:${dash ? `repeating-linear-gradient(90deg,${c} 0 5px,transparent 5px 8px)` : c}"></i>${esc(t)}</span>`).join('') + '</div>';

// =====================================================================
//  1) VIGA DE CIMENTACIÓN SOBRE LECHO ELÁSTICO (WINKLER) — FEM
// =====================================================================
function parseFLoads(text, S) {
  const pts = [], mom = [], dist = [];
  for (const raw of lines(text)) {
    const tk = raw.split(/\s+/), t = tk[0].toUpperCase();
    const ev = (s, u) => evalParam(s, S, u);
    if (t === 'P') pts.push({ x: ev(tk[1], 'm'), P: ev(tk.slice(2).join(' '), 'tonf') });
    else if (t === 'M') mom.push({ x: ev(tk[1], 'm'), M: ev(tk.slice(2).join(' '), 'tonf*m') });
    else if (t === 'U' || t === 'UP') dist.push({ x1: ev(tk[1], 'm'), x2: ev(tk[2], 'm'), w: ev(tk.slice(3).join(' '), 'tonf/m') });
    else throw new Error('Carga no reconocida: "' + raw + '" (use P x P, M x M, U x1 x2 w)');
  }
  return { pts, mom, dist };
}
const wlAt = (dist, x) => dist.reduce((s, d) => s + (x > d.x1 + 1e-12 && x < d.x2 - 1e-12 ? d.w : 0), 0);

// Resuelve la viga libre-libre sobre resortes (k = ks·B por unidad de longitud)
export function solveWinkler(L, EI, kb, loads, o = {}) {
  const ne = Math.max(20, Math.min(600, o.nel || 160));
  let xs = new Set(); for (let i = 0; i <= ne; i++) xs.add(+(L * i / ne).toFixed(9));
  for (const p of [...loads.pts, ...loads.mom]) { if (p.x < -1e-9 || p.x > L + 1e-9) throw new Error('Carga fuera de la viga en x = ' + f2(p.x) + ' m'); xs.add(+Math.min(L, Math.max(0, p.x)).toFixed(9)); }
  for (const d of loads.dist) { xs.add(+Math.max(0, d.x1).toFixed(9)); xs.add(+Math.min(L, d.x2).toFixed(9)); }
  xs = [...xs].sort((a, b) => a - b);
  const nN = xs.length, nD = 2 * nN, bw = 3;
  const idx = (x) => { let b = 0; for (let i = 1; i < nN; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[b] - x)) b = i; return b; };
  let act = new Array(nN - 1).fill(1);
  let u = null;
  for (let it = 0; it < 40; it++) {
    const Kb = Array.from({ length: nD }, () => new Float64Array(2 * bw + 1)); // banda simétrica: K[i][j-i+bw]
    const Fv = new Float64Array(nD);
    const add = (i, j, v) => { Kb[i][j - i + bw] += v; };
    for (let e = 0; e < nN - 1; e++) {
      const l = xs[e + 1] - xs[e], k = EI / l ** 3, kf = kb * act[e] * l / 420;
      const ke = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]];
      const kfm = [[156, 22 * l, 54, -13 * l], [22 * l, 4 * l * l, 13 * l, -3 * l * l], [54, 13 * l, 156, -22 * l], [-13 * l, -3 * l * l, -22 * l, 4 * l * l]];
      const dofs = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
      const w = wlAt(loads.dist, (xs[e] + xs[e + 1]) / 2);
      const fe = [w * l / 2, w * l * l / 12, w * l / 2, -w * l * l / 12];
      for (let i = 0; i < 4; i++) { Fv[dofs[i]] += fe[i]; for (let j = 0; j < 4; j++) add(dofs[i], dofs[j], ke[i][j] * k + kfm[i][j] * kf); }
    }
    for (const p of loads.pts) Fv[2 * idx(p.x)] += p.P;
    for (const m of loads.mom) Fv[2 * idx(m.x) + 1] += m.M;
    // Gauss en banda (matriz simétrica almacenada completa en banda)
    const A = Kb.map(r => Float64Array.from(r)), b = Fv.slice();
    for (let i = 0; i < nD; i++) {
      const piv = A[i][bw];
      if (!(Math.abs(piv) > 1e-12)) throw new Error('Viga inestable: no hay contacto suficiente con el suelo (revise ks o las cargas)');
      for (let r = i + 1; r <= Math.min(nD - 1, i + bw); r++) {
        const f = A[r][i - r + bw] / piv; if (!f) continue;
        for (let c = i; c <= Math.min(nD - 1, i + bw); c++) A[r][c - r + bw] -= f * A[i][c - i + bw];
        b[r] -= f * b[i];
      }
    }
    u = new Float64Array(nD);
    for (let i = nD - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c <= Math.min(nD - 1, i + bw); c++) s -= A[i][c - i + bw] * u[c]; u[i] = s / A[i][bw]; }
    if (!o.noTension) break;
    const nAct = act.map((a, e) => ((u[2 * e] + u[2 * e + 2]) / 2 > 0 ? 1 : 0));
    if (nAct.every((a, e) => a === act[e])) break;
    if (!nAct.some(Boolean)) throw new Error('La viga se levanta por completo: revise las cargas');
    act = nAct;
  }
  // muestreo fino con funciones de Hermite
  const X = [], Wd = [], P = [];
  for (let e = 0; e < nN - 1; e++) {
    const l = xs[e + 1] - xs[e], ue = [u[2 * e], u[2 * e + 1], u[2 * e + 2], u[2 * e + 3]];
    for (let k = 0; k < 4; k++) {
      const s = k / 4; const N = [1 - 3 * s * s + 2 * s ** 3, l * (s - 2 * s * s + s ** 3), 3 * s * s - 2 * s ** 3, l * (-s * s + s ** 3)];
      const w = N.reduce((a, n, i) => a + n * ue[i], 0);
      X.push(xs[e] + s * l); Wd.push(w); P.push(o.noTension && w < 0 ? 0 : kb * w);
    }
    if (e === nN - 2) { X.push(xs[nN - 1]); Wd.push(ue[2]); P.push(o.noTension && ue[2] < 0 ? 0 : kb * ue[2]); }
  }
  return { X, W: Wd, P };
}
// Presión lineal del método rígido (con redistribución triangular si e > L/6)
function rigidPressure(L, loads) {
  const R = loads.pts.reduce((s, p) => s + p.P, 0) + loads.dist.reduce((s, d) => s + d.w * (Math.min(L, d.x2) - Math.max(0, d.x1)), 0);
  if (!(R > 0)) throw new Error('La resultante de cargas debe ser hacia abajo (positiva)');
  // momento respecto al centro (horario +)
  let Mc = loads.pts.reduce((s, p) => s + p.P * (p.x - L / 2), 0) + loads.mom.reduce((s, m) => s + m.M, 0);
  for (const d of loads.dist) { const a = Math.max(0, d.x1), b = Math.min(L, d.x2); Mc += d.w * (b - a) * ((a + b) / 2 - L / 2); }
  let e = Mc / R; if (Math.abs(e) < 1e-9 * L) e = 0; // resultante en x = L/2 + e
  if (Math.abs(e) >= L / 2) throw new Error('La resultante cae fuera de la cimentación (e = ' + f2(e) + ' m)');
  let pf;
  if (Math.abs(e) <= L / 6) { const p0 = R / L, dp = 12 * R * e / L ** 3; pf = (x) => p0 + dp * (x - L / 2); }
  else { const a = 3 * (L / 2 - Math.abs(e)), pm = 2 * R / a; pf = e > 0 ? (x) => Math.max(0, pm * (1 - (L - x) / a)) : (x) => Math.max(0, pm * (1 - x / a)); }
  return { R, e, pf };
}
// Integra cortante y momento a partir de la reacción p(x) (fuerza/longitud, hacia arriba)
function statics(X, P, loads) {
  const xs = [], V = [], M = [];
  let v = 0, m = 0;
  const atPt = (x) => { for (const p of loads.pts) if (Math.abs(p.x - x) < 1e-7) v -= p.P; for (const q of loads.mom) if (Math.abs(q.x - x) < 1e-7) m += q.M; };
  for (let k = 0; k < X.length; k++) {
    xs.push(X[k]); V.push(v); M.push(m);
    const v0 = v, m0 = m; atPt(X[k]);
    if (v !== v0 || m !== m0) { xs.push(X[k]); V.push(v); M.push(m); }
    if (k < X.length - 1) {
      const dx = X[k + 1] - X[k], xm = (X[k] + X[k + 1]) / 2;
      const q = (P[k] + P[k + 1]) / 2 - wlAt(loads.dist, xm);
      const vn = v + q * dx;
      m += (v + vn) / 2 * dx; v = vn;
    }
  }
  return { xs, V, M };
}

registerBlock('winkler', {
  name: 'Viga de cimentación (Winkler)', icon: 'footing', group: 'Cimentaciones',
  fields: [
    F('L', 'Longitud total L', '8 m'), F('B', 'Ancho de contacto B', '1.2 m'), F('E', 'Módulo de elasticidad E', '2.17e6 tonf/m^2'), F('I', 'Inercia I', '1.2 m*(0.8 m)^3/12'),
    F('ks', 'Coeficiente de balasto ks', '2500 tonf/m^3'), F('cargas', 'Cargas (una por línea)', 'P 0.6 80 tonf\nP 7.4 95 tonf\nM 0.6 4 tonf*m', 'area'),
    F('metodo', 'Método', '', 'select', [['winkler', 'Lecho elástico (Winkler, FEM)'], ['rigido', 'Método rígido convencional']]),
    F('sintraccion', 'Suelo sin tracción (iterativo)', '', 'check'), F('qadm', 'Presión admisible qadm (verificación)', '25 tonf/m^2'),
    F('nel', 'Número de elementos', '160'), F('sufijo', 'Sufijo de resultados', ''), F('titulo', 'Título de la figura', ''),
  ],
  hint: 'Cargas hacia abajo positivas: <code>P x P</code> puntual (columna), <code>M x M</code> momento horario, <code>U x1 x2 w</code> repartida. Unidades por defecto t, m. Reacción del suelo <i>p = k<sub>s</sub>·B·w</i>, presión <i>q = k<sub>s</sub>·w</i>. Exporta <code>qmax qmin wmax wmin Mpos Mneg Vmax</code> y verifica <i>q<sub>max</sub> ≤ q<sub>adm</sub></i>. Momento positivo = tracción en la fibra inferior.',
  def: { L: '8 m', B: '1.2 m', E: '2.17e6 tonf/m^2', I: '1.2 m*(0.8 m)^3/12', ks: '2500 tonf/m^3', cargas: 'P 0.6 80 tonf\nP 7.4 95 tonf', metodo: 'winkler', qadm: '25 tonf/m^2', nel: '160' },
  render(b, ctx) {
    const S = ctx.scope;
    const L = evalParam(b.L, S, 'm', 8), B = evalParam(b.B, S, 'm', 1), E = evalParam(b.E, S, 'tonf/m^2', 2.17e6), I = evalParam(b.I, S, 'm^4', 0.05);
    const ks = evalParam(b.ks, S, 'tonf/m^3', 0), qadm = evalParam(b.qadm, S, 'tonf/m^2', 0);
    const rig = b.metodo === 'rigido';
    pos({ L, B, E, I }); if (!rig) pos({ ks });
    const loads = parseFLoads(b.cargas, S);
    if (!loads.pts.length && !loads.dist.length) throw new Error('Defina al menos una carga');
    const kb = ks * B;
    let X, Wd, P, info = '';
    if (rig) {
      const r = rigidPressure(L, loads);
      const n = 240; X = []; for (let i = 0; i <= n; i++) X.push(L * i / n);
      for (const p of [...loads.pts, ...loads.mom]) X.push(p.x); for (const d of loads.dist) X.push(d.x1, d.x2);
      X = [...new Set(X.map(x => +Math.min(L, Math.max(0, x)).toFixed(9)))].sort((a, c) => a - c);
      P = X.map(r.pf); Wd = X.map(x => (ks > 0 ? r.pf(x) / kb : 0));
      info = K('R = ' + f2(r.R) + '\\,\\mathrm{t}') + ' ' + K('e = ' + f2(r.e, 3) + '\\,\\mathrm{m}\\;(L/6 = ' + f2(L / 6, 3) + '\\,\\mathrm{m})');
      setVar(ctx, 'e_R' + (b.sufijo ? '_' + b.sufijo.replace(/\W/g, '') : ''), U(r.e, 'm'));
    } else {
      const s = solveWinkler(L, E * I, kb, loads, { nel: parseInt(b.nel) || 160, noTension: !!b.sintraccion });
      X = s.X; Wd = s.W; P = s.P;
      const lam = Math.pow(kb / (4 * E * I), 0.25);
      info = K('\\lambda = \\sqrt[4]{k_s B/(4EI)} = ' + f2(lam, 4) + '\\,\\mathrm{m^{-1}}') + ' ' + K('\\lambda L = ' + f2(lam * L) + (lam * L < Math.PI / 4 ? '\\;(\\text{viga rígida})' : lam * L > Math.PI ? '\\;(\\text{viga flexible})' : '\\;(\\text{rigidez intermedia})'));
    }
    const st = statics(X, P, loads);
    const q = P.map(p => p / B);
    const sfx = b.sufijo ? '_' + b.sufijo.replace(/\W/g, '') : '';
    const qmax = Math.max(...q), qmin = Math.min(...q), wmax = Math.max(...Wd), wmin = Math.min(...Wd);
    const cl = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
    const Mpos = cl(Math.max(0, ...st.M)), Mneg = cl(Math.min(0, ...st.M)), Vmax = Math.max(...st.V.map(Math.abs));
    const sumR = P.reduce((s, p, i) => (i ? s + (p + P[i - 1]) / 2 * (X[i] - X[i - 1]) : s), 0);
    setVar(ctx, 'qmax' + sfx, U(qmax, 'tonf/m^2')); setVar(ctx, 'qmin' + sfx, U(qmin, 'tonf/m^2'));
    setVar(ctx, 'wmax' + sfx, U(wmax * 1000, 'mm')); setVar(ctx, 'wmin' + sfx, U(wmin * 1000, 'mm'));
    setVar(ctx, 'Mpos' + sfx, U(Mpos, 'tonf*m')); setVar(ctx, 'Mneg' + sfx, U(Mneg, 'tonf*m')); setVar(ctx, 'Vmax' + sfx, U(Vmax, 'tonf'));
    if (qadm > 0) ctx.checks.push({ ok: qmax <= qadm, label: 'Presión máxima de contacto ≤ qadm (' + (rig ? 'método rígido' : 'Winkler') + ', E.050 Art. 22)', ratio: qmax / qadm, block: ctx.blockId });
    if (qmin < -1e-6 && !rig) ctx.checks.push({ ok: false, label: 'Tracción en el contacto suelo–cimiento (active «suelo sin tracción»)', ratio: null, block: ctx.blockId });
    // ----- dibujo -----
    const W = 720, padL = 60, padR = 30, sc = (W - padL - padR) / L, px = (x) => padL + x * sc;
    const vl = [...new Set(loads.pts.map(p => p.x))];
    let g = arrowDefs; const yb = 96, hb = 16;
    g += `<rect x="${padL - 10}" y="${yb + hb}" width="${W - padL - padR + 20}" height="${rig ? 26 : 44}" fill="url(#soilp)" opacity=".55"/>`;
    if (!rig) for (let i = 0; i <= 20; i++) { const x = px(L * i / 20), y1 = yb + hb, y2 = y1 + 30; let d = `M${x},${y1} l0,4`; for (let k = 0; k < 5; k++) d += ` l${k % 2 ? -4 : 4},4.4`; d += ` L${x},${y2}`; g += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="0.8"/>` + Lne(x - 5, y2, x + 5, y2, C.ink, 0.8); }
    g += `<rect x="${px(0)}" y="${yb}" width="${L * sc}" height="${hb}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    const maxP = Math.max(1e-9, ...loads.pts.map(p => Math.abs(p.P)));
    loads.pts.forEach(p => { const x = px(p.x), h = 28 + 34 * Math.abs(p.P) / maxP; g += `<rect x="${x - 7}" y="${yb - 26}" width="14" height="26" fill="#9aa5b1" stroke="${C.ink}" stroke-width="0.8"/>`; g += `<line x1="${x}" y1="${yb - 26 - h + 26}" x2="${x}" y2="${yb - 2}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + lab(x + 5, yb - h + 2, f2(p.P) + ' t', { a: 'start', c: C.red, b: 1 }); });
    loads.mom.forEach(m => { const x = px(m.x); g += `<path d="M${x - 13},${yb - 30} A13,13 0 1,1 ${x + 13},${yb - 30}" fill="none" stroke="${C.orange}" stroke-width="1.5" marker-end="url(#arr)"/>` + lab(x - 16, yb - 40, f2(m.M) + ' t·m', { a: 'end', c: C.orange }); });
    loads.dist.forEach(d => { const x1 = px(Math.max(0, d.x1)), x2 = px(Math.min(L, d.x2)); g += `<rect x="${x1}" y="${yb - 14}" width="${x2 - x1}" height="12" fill="${C.blueF}" stroke="${C.blue}" stroke-width="0.8"/>` + lab((x1 + x2) / 2, yb - 18, f2(d.w) + ' t/m', { c: C.blue }); });
    g += dimH(px(0), px(L), yb + hb + (rig ? 40 : 58), 'L = ' + f2(L) + ' m');
    vl.forEach(x => { g += T(px(x), yb + hb + (rig ? 52 : 70) + 2, 'x = ' + f2(x), { fs: 9, c: C.axis }); });
    let out = svgWrap(W, yb + hb + (rig ? 60 : 78), g);
    const qp = q.map(v => v); // presiones (positivas = compresión) dibujadas hacia abajo
    out += '<div class="dt">Presión de contacto q [t/m²]' + (qadm > 0 ? ' — línea discontinua: q<sub>adm</sub>' : '') + '</div>';
    out += xDiagram(W, padL, padR, px, X, qp, { color: C.red, fill: C.redF, title: 'q [t/m²]', invert: true, vlines: vl, ref: qadm > 0 ? [qadm] : [], refLab: ['qadm = ' + f2(qadm)] });
    if (!rig || ks > 0) { out += '<div class="dt">Asentamiento w [mm]</div>'; out += xDiagram(W, padL, padR, px, X, Wd.map(w => w * 1000), { color: C.orange, fill: 'rgba(212,115,12,.12)', title: 'w [mm]', invert: true, vlines: vl, H: 120 }); }
    out += '<div class="dt">Fuerza cortante V [t]</div>';
    out += xDiagram(W, padL, padR, px, st.xs, st.V, { color: C.green, fill: C.greenF, title: 'V [t]', vlines: vl });
    out += '<div class="dt">Momento flector M [t·m] — positivo hacia abajo (tracción en fibra inferior)</div>';
    const atCols = vl.map(x => { let k = 0; st.xs.forEach((xx, i) => { if (Math.abs(xx - x) <= Math.abs(st.xs[k] - x) + 1e-12) k = i; }); return k; });
    out += xDiagram(W, padL, padR, px, st.xs, st.M, { color: C.blue, fill: C.blueF, title: 'M [t·m]', invert: true, vlines: vl, extra: atCols });
    const res = `<div class="kv">${info}</div>` + kv([['qmax' + sfx, U(qmax, 'tonf/m^2')], ['qmin' + sfx, U(qmin, 'tonf/m^2')], ...(rig && !(ks > 0) ? [] : [['wmax' + sfx, U(wmax * 1000, 'mm')]]), ['Mpos' + sfx, U(Mpos, 'tonf*m')], ['Mneg' + sfx, U(Mneg, 'tonf*m')], ['Vmax' + sfx, U(Vmax, 'tonf')]]) + `<div class="kv">${K('\\Sigma\\,\\text{reacción del suelo} = ' + f2(sumR) + '\\,\\mathrm{t}')}</div>`;
    return `<div class="figure">${out}${res}${caption(ctx, b.titulo || (rig ? 'Viga de cimentación — método rígido convencional' : 'Viga de cimentación sobre lecho elástico de Winkler (elementos finitos)'))}</div>`;
  },
});

// =====================================================================
//  2) PERFIL ESTRATIGRÁFICO + N-SPT + ESFUERZOS
// =====================================================================
const SUCS_COL = (s) => { const u = String(s).toUpperCase(); if (/^PT|^OL|^OH/.test(u)) return ['#7d6b57', 'o']; if (/ROC|^R$/.test(u)) return ['#a7adb4', 'r']; if (/REL|^F$/.test(u)) return ['#d8cfc4', 'f']; if (u[0] === 'G') return ['#dcc58a', 'g']; if (u[0] === 'S') return ['#eedfae', 's']; if (u[0] === 'M') return ['#d5cdb6', 'm']; if (u[0] === 'C') return ['#c4ae92', 'c']; return ['#e3dccd', 's']; };
function soilPatterns(id) {
  const p = (n, body, w = 10, h = 10) => `<pattern id="${id}${n}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  return '<defs>' + p('g', '<circle cx="3" cy="3" r="2.2" fill="none" stroke="#7a6a3a" stroke-width=".8"/><circle cx="8" cy="8" r="1.6" fill="none" stroke="#7a6a3a" stroke-width=".8"/>') +
    p('s', '<circle cx="2" cy="2" r=".8" fill="#8a7440"/><circle cx="7" cy="6" r=".8" fill="#8a7440"/><circle cx="4" cy="9" r=".6" fill="#8a7440"/>') +
    p('m', '<path d="M1 3h4M6 8h3" stroke="#6d6450" stroke-width=".9"/>') + p('c', '<path d="M0 3h10M0 8h10" stroke="#6b5640" stroke-width=".8"/>') +
    p('o', '<path d="M0 5q2.5-3 5 0t5 0" fill="none" stroke="#3d3328" stroke-width=".9"/>') + p('r', '<path d="M0 0h12v6H0zM6 6v6" fill="none" stroke="#5f666d" stroke-width=".8"/>', 12, 12) +
    p('f', '<path d="M2 2l4 4M6 2l-4 4" stroke="#7d7166" stroke-width=".8"/>', 8, 8) + '</defs>';
}
export function profileStress(layers, nf, z, gw = 1) {
  // σv, u, σ'v a la profundidad z (estratos con espesor h, γ, γsat)
  let sv = 0, top = 0;
  for (const l of layers) {
    const bot = top + l.h; if (z <= top) break;
    const zb = Math.min(z, bot);
    const dry = nf === null ? zb - top : Math.max(0, Math.min(zb, nf) - top), wet = (zb - top) - dry;
    sv += dry * l.g + wet * l.gs; top = bot;
  }
  if (z > top) { const l = layers[layers.length - 1]; const dz = z - top; const dry = nf === null ? dz : Math.max(0, Math.min(z, nf) - top); sv += dry * l.g + (dz - dry) * l.gs; }
  const u = nf === null ? 0 : Math.max(0, z - nf) * gw;
  return { sv, u, svp: sv - u };
}
registerBlock('soilprofile', {
  name: 'Perfil estratigráfico (SPT)', icon: 'soil', group: 'Geotecnia',
  fields: [
    F('estratos', 'Estratos: espesor SUCS γ γsat descripción', '1.0 RELL 1.60 1.80 Relleno limoso\n2.5 SM 1.75 1.95 Arena limosa suelta', 'area'),
    F('nf', 'Profundidad del nivel freático (vacío = no hay)', '2.0 m'), F('spt', 'Ensayos SPT: z N', '1.5 12\n3.0 15', 'area'),
    F('ER', 'Energía del martillo ER (%)', '60'), F('CB', 'CB (diámetro de perforación)', '1.0'), F('CS', 'CS (muestreador)', '1.0'), F('barra', 'Longitud de barra sobre la superficie', '1.0 m'),
    F('zref', 'Profundidad de referencia (exporta σ en zref)', '1.5 m'), F('zona', 'Zona para N60 promedio: z1 z2', ''), F('tabla', 'Mostrar tabla de correcciones', '', 'check'), F('titulo', 'Título', ''),
  ],
  hint: 'Unidades por defecto: espesor m, γ t/m³. SUCS: GW GP GM GC SW SP SM SC ML CL MH CH OL OH Pt, RELL (relleno), ROCA. Correcciones E.050 Art. 5.27: N60 = N·(ER/60)·CB·CS·CR (CR por longitud de barras, Youd et al. 2001), (N1)60 = CN·N60, CN = (100 kPa/σ′v)^0.5 ≤ 1.7. Exporta los vectores <code>zSPT NSPT N60v N160v svSPT uSPT svpSPT</code> y <code>sv_ref u_ref svp_ref N60prom</code>.',
  def: { estratos: '1.0 RELL 1.60 1.80 Relleno limoso\n2.5 SM 1.75 1.95 Arena limosa suelta\n4.0 SP 1.85 2.00 Arena pobremente gradada medianamente densa\n2.5 CL 1.80 1.90 Arcilla de baja plasticidad', nf: '2.0 m', spt: '1.5 8\n3.0 10\n4.5 14\n6.0 18\n7.5 22\n9.0 9', ER: '60', zref: '1.5 m', tabla: true },
  render(b, ctx) {
    const S = ctx.scope;
    const layers = lines(b.estratos).map(l => {
      const t = l.split(/\s+/);
      const h = evalParam(t[0], S, 'm'), g = evalParam(t[2], S, 'tonf/m^3');
      let gs = g, k = 3; const g3 = tryNum(t[3], S, 'tonf/m^3'); if (g3 !== null) { gs = g3; k = 4; }
      pos({ espesor: h, gamma: g });
      return { h, sucs: t[1] || '', g, gs, desc: t.slice(k).join(' ') };
    });
    if (!layers.length) throw new Error('Defina al menos un estrato');
    const nf = b.nf === undefined || String(b.nf).trim() === '' ? null : evalParam(b.nf, S, 'm');
    const spt = lines(b.spt).map(l => { const t = l.split(/\s+/); return { z: evalParam(t[0], S, 'm'), N: evalParam(t.slice(1).join(' '), S, '') }; }).sort((a, c) => a.z - c.z);
    const ER = evalParam(b.ER, S, '', 60), CB = evalParam(b.CB, S, '', 1), CS = evalParam(b.CS, S, '', 1), stick = evalParam(b.barra, S, 'm', 1);
    const Ht = layers.reduce((s, l) => s + l.h, 0);
    const zmax = Math.max(Ht, ...spt.map(s => s.z)) * 1.0;
    const kPa = 9.80665; // t/m² → kPa
    const rows = spt.map(s => {
      const st = profileStress(layers, nf, s.z);
      const Lr = s.z + stick, CR = Lr < 3 ? 0.75 : Lr < 4 ? 0.8 : Lr < 6 ? 0.85 : Lr < 10 ? 0.95 : 1.0;
      const N60 = s.N * ER / 60 * CB * CS * CR, CN = Math.min(1.7, Math.sqrt(100 / Math.max(st.svp * kPa, 1e-6))), N160 = CN * N60;
      let top = 0, lay = layers[layers.length - 1]; for (const l of layers) { if (s.z <= top + l.h + 1e-9) { lay = l; break; } top += l.h; }
      return { ...s, ...st, CR, N60, CN, N160, sucs: lay.sucs, phi: Math.sqrt(20 * N160) + 20, Dr: Math.min(1, Math.sqrt(N160 / 46)) };
    });
    const vec = (a, u) => math.matrix(a.map(v => (u ? U(v, u) : v)));
    if (rows.length) {
      setVar(ctx, 'zSPT', vec(rows.map(r => r.z), 'm')); setVar(ctx, 'NSPT', vec(rows.map(r => r.N)));
      setVar(ctx, 'N60v', vec(rows.map(r => r.N60))); setVar(ctx, 'N160v', vec(rows.map(r => r.N160)));
      setVar(ctx, 'svSPT', vec(rows.map(r => r.sv), 'tonf/m^2')); setVar(ctx, 'uSPT', vec(rows.map(r => r.u), 'tonf/m^2')); setVar(ctx, 'svpSPT', vec(rows.map(r => r.svp), 'tonf/m^2'));
      const zn = String(b.zona || '').trim() ? b.zona.trim().split(/\s+/).map(s => evalParam(s, S, 'm')) : [-1, 1e9];
      const sel = rows.filter(r => r.z >= zn[0] - 1e-9 && r.z <= (zn[1] ?? 1e9) + 1e-9);
      if (sel.length) setVar(ctx, 'N60prom', sel.reduce((s, r) => s + r.N60, 0) / sel.length);
    }
    const zr = evalParam(b.zref, S, 'm', 0);
    const sr = profileStress(layers, nf, zr);
    setVar(ctx, 'sv_ref', U(sr.sv, 'tonf/m^2')); setVar(ctx, 'u_ref', U(sr.u, 'tonf/m^2')); setVar(ctx, 'svp_ref', U(sr.svp, 'tonf/m^2'));
    // ----- dibujo -----
    const id = 'sp' + String(ctx.blockId).replace(/\W/g, '');
    const W = 720, y0 = 44, Hh = 380, Y = (z) => y0 + z / zmax * Hh;
    let g = soilPatterns(id);
    const cx = 52, cw = 46;
    g += T(cx + cw / 2, y0 - 18, 'Columna', { fs: 10, b: 1 });
    let top = 0;
    layers.forEach(l => {
      const [col, pat] = SUCS_COL(l.sucs);
      g += `<rect x="${cx}" y="${Y(top)}" width="${cw}" height="${Y(top + l.h) - Y(top)}" fill="${col}" stroke="${C.ink}" stroke-width=".8"/><rect x="${cx}" y="${Y(top)}" width="${cw}" height="${Y(top + l.h) - Y(top)}" fill="url(#${id}${pat})"/>`;
      const ym = (Y(top) + Y(top + l.h)) / 2;
      g += lab(cx + cw / 2, ym + 3.5, l.sucs, { b: 1, fs: 10 });
      const words = l.desc.split(' '), ln = []; let cur = '';
      for (const w of words) { if ((cur + ' ' + w).trim().length > 24) { ln.push(cur.trim()); cur = w; } else cur += ' ' + w; } if (cur.trim()) ln.push(cur.trim());
      const hpx = Y(top + l.h) - Y(top), maxL = Math.max(1, Math.floor((hpx - 4) / 11));
      ln.slice(0, maxL).forEach((s, i) => { g += T(cx + cw + 6, ym - (Math.min(ln.length, maxL) - 1) * 5.5 + i * 11 + 3, s, { fs: 9, a: 'start' }); });
      g += T(cx + cw + 6, Y(top + l.h) - 3, 'γ=' + f2(l.g) + (l.gs !== l.g ? '/' + f2(l.gs) : '') + ' t/m³', { fs: 8, a: 'start', c: C.axis });
      top += l.h;
    });
    niceTicks(0, zmax, 8).forEach(t => { g += Lne(cx - 4, Y(t), cx, Y(t), C.axis) + T(cx - 7, Y(t) + 3, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
    g += T(16, y0 + Hh / 2, 'Profundidad z [m]', { fs: 10, r: -90, c: C.axis });
    if (nf !== null && nf < zmax) g += Lne(cx - 14, Y(nf), cx + cw + 132, Y(nf), C.blue, 1.2, '5 3') + `<path d="M${cx - 10},${Y(nf) - 8} l8,0 l-4,7 z" fill="${C.blue}"/>` + lab(cx + cw + 130, Y(nf) - 3, 'NF ' + f2(nf) + ' m', { a: 'end', c: C.blue, fs: 9 });
    // N-SPT
    const p1 = 268, w1 = 190, Nmax = Math.max(10, ...rows.map(r => Math.max(r.N, r.N160))) * 1.1;
    g += zPanel(p1, y0, w1, Hh, zmax, [0, Nmax], [
      { xs: rows.map(r => r.N), zs: rows.map(r => r.z), color: C.ink, marker: 'c', w: 1.2 },
      { xs: rows.map(r => r.N60), zs: rows.map(r => r.z), color: C.blue, marker: 'sq', dash: '5 3', w: 1.2 },
      { xs: rows.map(r => r.N160), zs: rows.map(r => r.z), color: C.red, marker: 'c', w: 1.6 },
    ], 'N-SPT [golpes/30 cm]', { noZ: true, nf });
    rows.forEach(r => { g += lab(p1 + (Math.max(r.N, r.N60, r.N160) / Nmax) * w1 + 7, Y(r.z) + 3.5, f2(r.N, 0), { fs: 8.5, a: 'start', c: C.ink }); });
    // esfuerzos
    const p2 = 498, w2 = 190, zz = []; for (let i = 0; i <= 80; i++) zz.push(zmax * i / 80);
    if (nf !== null) zz.push(nf); top = 0; layers.forEach(l => { top += l.h; zz.push(top); }); zz.sort((a, c) => a - c);
    const stz = zz.map(z => profileStress(layers, nf, z));
    const smax = Math.max(...stz.map(s => s.sv)) * 1.05;
    g += zPanel(p2, y0, w2, Hh, zmax, [0, smax], [
      { xs: stz.map(s => s.sv), zs: zz, color: C.ink },
      { xs: stz.map(s => s.u), zs: zz, color: C.blue, dash: '5 3' },
      { xs: stz.map(s => s.svp), zs: zz, color: C.green, w: 2 },
    ], 'Esfuerzos [t/m²]', { noZ: true, nf });
    const zlast = zz[zz.length - 1], sl = stz[stz.length - 1];
    g += lab(p2 + sl.svp / smax * w2 - 3, Y(zlast) - 6, f2(sl.svp), { a: 'end', c: C.green, fs: 9 }) + lab(p2 + sl.sv / smax * w2 - 3, Y(zlast) - 18, f2(sl.sv), { a: 'end', fs: 9 });
    let out = svgWrap(W, y0 + Hh + 14, g);
    out += legend([[C.ink, 'N de campo'], [C.blue, 'N60', 1], [C.red, '(N1)60'], [C.ink, 'σv total'], [C.blue, 'u (presión de poros)', 1], [C.green, "σ'v efectivo"]]);
    if (b.tabla !== false && rows.length) {
      out += '<table class="tbl"><thead><tr><th>z [m]</th><th>SUCS</th><th>N</th><th>C<sub>R</sub></th><th>N<sub>60</sub></th><th>σ<sub>v</sub> [t/m²]</th><th>u [t/m²]</th><th>σ′<sub>v</sub> [t/m²]</th><th>C<sub>N</sub></th><th>(N<sub>1</sub>)<sub>60</sub></th><th>φ′ H-U [°]</th><th>D<sub>r</sub> [%]</th></tr></thead><tbody>' +
        rows.map(r => `<tr><td>${f2(r.z)}</td><td>${esc(r.sucs)}</td><td>${f2(r.N, 0)}</td><td>${f2(r.CR)}</td><td>${f2(r.N60, 1)}</td><td>${f2(r.sv)}</td><td>${f2(r.u)}</td><td>${f2(r.svp)}</td><td>${f2(r.CN)}</td><td>${f2(r.N160, 1)}</td><td>${/^[CMO]|PT/i.test(r.sucs) ? '—' : f2(r.phi, 1)}</td><td>${/^[CMO]|PT/i.test(r.sucs) ? '—' : f2(r.Dr * 100, 0)}</td></tr>`).join('') + '</tbody></table>';
      out += `<div class="cm" style="font-size:11px;color:#666;text-align:center">ER = ${f2(ER, 0)} %, C<sub>B</sub> = ${f2(CB)}, C<sub>S</sub> = ${f2(CS)}; C<sub>R</sub> según longitud de barras (Youd et al. 2001); φ′ = √(20(N<sub>1</sub>)<sub>60</sub>) + 20° (Hatanaka y Uchida 1996); D<sub>r</sub> = √((N<sub>1</sub>)<sub>60</sub>/46) (Idriss y Boulanger 2008). Solo para suelos granulares.</div>`;
    }
    out += kv([['sv_ref', U(sr.sv, 'tonf/m^2')], ['u_ref', U(sr.u, 'tonf/m^2')], ['svp_ref', U(sr.svp, 'tonf/m^2')]]).replace('<div class="kv">', `<div class="kv"><span style="font-size:11px;color:#666">En z = ${f2(zr)} m:</span> `);
    return `<div class="figure">${out}${caption(ctx, b.titulo || 'Perfil estratigráfico, ensayo SPT y esfuerzos verticales')}</div>`;
  },
});

// =====================================================================
//  3) ESTABILIDAD DE TALUDES — DOVELAS (FELLENIUS / BISHOP SIMPLIFICADO)
// =====================================================================
function surfY(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
}
const layerAt = (lay, y) => { for (const l of lay) if (y <= l.top + 1e-9 && y > l.bot - 1e-9) return l; return lay[lay.length - 1]; };
// Calcula las dovelas y FS para un círculo (xc, yc, R); null si no es válido
// Nivel freático: null, cota constante o polilínea [[x, y], …] (interpolación lineal, extremos constantes)
const wtAt = (wt, x) => (wt === null ? null : typeof wt === 'number' ? wt : surfY(wt, x));
// Intersecciones exactas del arco inferior del círculo con la poligonal del terreno → abscisas ordenadas
function circleCuts(pts, xc, yc, R) {
  const xs = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dx = x1 - x0, dy = y1 - y0;
    const a = dx * dx + dy * dy, bq = 2 * (dx * (x0 - xc) + dy * (y0 - yc)), c = (x0 - xc) ** 2 + (y0 - yc) ** 2 - R * R;
    const disc = bq * bq - 4 * a * c; if (!(a > 0) || disc < 0) continue;
    const sq = Math.sqrt(disc);
    for (const t of [(-bq - sq) / (2 * a), (-bq + sq) / (2 * a)]) if (t >= -1e-12 && t <= 1 + 1e-12 && y0 + t * dy <= yc + 1e-9) xs.push(x0 + t * dx);
  }
  return xs.sort((p, q) => p - q);
}
// Calcula las dovelas y FS para un círculo (xc, yc, R); null si no es válido
export function slopeCircle(m, xc, yc, R, n = 30) {
  const { pts, lay, gw, kh, surch, hmin } = m, wt = m.wt !== undefined ? m.wt : m.ywt;
  const xa = Math.max(pts[0][0], xc - R), xb = Math.min(pts[pts.length - 1][0], xc + R);
  if (xb - xa < 1e-6) return null;
  const f = (x) => surfY(pts, x) - (yc - Math.sqrt(Math.max(0, R * R - (x - xc) ** 2)));
  // tramo continuo con la base del círculo bajo la superficie (el más ancho), con intersecciones exactas
  const cuts = [xa, ...circleCuts(pts, xc, yc, R).filter(x => x > xa && x < xb), xb];
  let best = null, cur = null;
  for (let i = 1; i < cuts.length; i++) {
    const a = cuts[i - 1], c = cuts[i], mid = (a + c) / 2, inside = c - a > 1e-9 && f(mid) > 1e-9 && Math.abs(mid - xc) < R;
    if (inside) { cur = cur ? [cur[0], c] : [a, c]; if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur; } else cur = null;
  }
  if (!best || best[1] - best[0] < 1e-3 * R) return null;
  const [xl, xr] = best;
  // un círculo que corta los bordes del modelo no es válido
  if (xl <= pts[0][0] + 1e-6 || xr >= pts[pts.length - 1][0] - 1e-6) return null;
  // la superficie de falla debe aflorar en el terreno en ambos extremos (no en la tangente vertical del círculo)
  if (Math.abs(f(xl)) > 1e-3 * R || Math.abs(f(xr)) > 1e-3 * R || Math.abs(xl - xc) > 0.999 * R || Math.abs(xr - xc) > 0.999 * R) return null;
  const dir = surfY(pts, xl) >= surfY(pts, xr) ? 1 : -1; // +1: la masa desliza hacia la derecha
  const b = (xr - xl) / n, sl = [];
  let hmx = 0;
  for (let i = 0; i < n; i++) {
    const x = xl + (i + 0.5) * b, ys = surfY(pts, x), yb = yc - Math.sqrt(Math.max(0, R * R - (x - xc) ** 2));
    const h = ys - yb; if (h <= 0) continue; hmx = Math.max(hmx, h);
    const yw = wtAt(wt, x);
    // peso por estratos horizontales (γ sobre NF, γsat bajo NF)
    let Wt = 0, my = 0;
    for (const l of lay) {
      const t = Math.min(ys, l.top), bo = Math.max(yb, l.bot); if (t <= bo) continue;
      const parts = yw === null ? [[t, bo, l.g]] : [[t, Math.max(bo, Math.min(t, yw)), l.g], [Math.min(t, yw), bo, l.gs]];
      for (const [a, c, gg] of parts) if (a > c) { Wt += gg * (a - c) * b; my += gg * (a - c) * b * (a + c) / 2; }
    }
    const yg = Wt > 0 ? my / Wt : (ys + yb) / 2;
    let Q = 0; for (const s of surch) if (x >= s.x1 && x <= s.x2) Q += s.q * b;
    const sa = dir * (xc - x) / R, ca = Math.sqrt(Math.max(0, 1 - sa * sa));
    const asn = (t) => Math.asin(Math.max(-1, Math.min(1, t)));
    const L = R * Math.abs(asn((x + b / 2 - xc) / R) - asn((x - b / 2 - xc) / R)); // longitud exacta del arco de la base
    const lb = layerAt(lay, yb);
    // nivel freático horizontal recortado por la superficie del terreno (sin agua libre sobre el talud)
    const u = yw === null ? 0 : gw * Math.max(0, Math.min(yw, ys) - yb);
    sl.push({ x, b, h, W: Wt + Q, Wsoil: Wt, yg, ys, yb, sa, ca, L, c: lb.c, tf: Math.tan(lb.phi), u, lay: lb });
  }
  if (!sl.length || hmx < hmin) return null;
  const drive = sl.reduce((s, q) => s + q.W * q.sa + kh * q.Wsoil * (yc - q.yg) / R, 0);
  if (!(drive > 1e-9)) return null;
  // Fellenius (ordinario)
  const resF = sl.reduce((s, q) => s + q.c * q.L + Math.max(0, q.W * q.ca - kh * q.Wsoil * q.sa - q.u * q.L) * q.tf, 0);
  const FSf = resF / drive;
  // Bishop simplificado (iterativo)
  let FS = Math.max(0.3, FSf), it = 0;
  for (; it < 100; it++) {
    const num = sl.reduce((s, q) => { const ma0 = q.ca + q.sa * q.tf / FS, ma = q.sa < 0 ? Math.max(0.2, ma0) : Math.max(1e-3, ma0); /* mα ≥ 0.2 en el pie (Whitman y Bailey 1967) */ const bl = q.L * q.ca; return s + (q.c * bl + Math.max(0, q.W - q.u * bl) * q.tf) / ma; }, 0); // b = l·cosα (longitud exacta del arco)
    const nF = num / drive; if (Math.abs(nF - FS) < 1e-6) { FS = nF; break; } FS = nF;
  }
  sl.forEach(q => { q.ma = q.ca + q.sa * q.tf / FS; });
  return { xc, yc, R, xl, xr, sl, FSf, FSb: FS, drive, dir };
}
registerBlock('slope', {
  name: 'Estabilidad de taludes (dovelas)', icon: 'soil', group: 'Geotecnia',
  fields: [
    F('superficie', 'Superficie del terreno: x y (de izquierda a derecha)', '0 10\n12 10\n27 0\n45 0', 'area'),
    F('estratos', 'Estratos: y_tope c φ γ [γsat] nombre', '10 2.0 25 1.85 1.95 Arcilla arenosa\n0 4.0 30 1.95 2.05 Arena densa', 'area'),
    F('nf', 'Nivel freático: cota y, o polilínea «x y» por línea (vacío = seco)', '', 'area'), F('kh', 'Coeficiente sísmico horizontal kh', '0'),
    F('sobrecarga', 'Sobrecargas: x1 x2 q', '2 10 2.0', 'area'),
    F('circulo', 'Círculo de falla: xc yc R (vacío = búsqueda)', ''), F('malla', 'Malla de centros: xmin xmax ymin ymax n', '10 30 12 30 12'),
    F('ybase', 'Cota mínima de la superficie de falla (estrato firme)', '-5'),
    F('metodo', 'Método', '', 'select', [['bishop', 'Bishop simplificado'], ['fellenius', 'Fellenius (ordinario)']]),
    F('ndov', 'Número de dovelas', '30'), F('FSmin', 'FS mínimo (vacío = E.050: 1.5 estático / 1.25 sísmico)', ''),
    F('unidades', 'Unidades de c, γ, q', '', 'select', [['t', 't/m² · t/m³'], ['kN', 'kPa · kN/m³']]), F('tabla', 'Mostrar tabla de dovelas', '', 'check'), F('sufijo', 'Sufijo de resultados', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Coordenadas en m (y hacia arriba). Cada estrato rige desde su cota <code>y_tope</code> hasta el tope del siguiente (horizontales). φ en grados. El nivel freático puede ser una cota constante o una polilínea (presión de poros hidrostática u = γw·(y<sub>NF</sub> − y<sub>base</sub>), sin agua libre sobre el terreno). La búsqueda recorre la malla de centros y, para cada centro, radios cuya cota inferior va desde <i>y_base</i> hasta la cresta. Exporta <code>FS FSb FSf xc yc Rc</code> y verifica FS ≥ 1.5 (estático) o ≥ 1.25 (seudoestático, kh &gt; 0) según E.050 Art. 30.3.',
  def: { superficie: '0 10\n12 10\n27 0\n45 0', estratos: '10 2.0 25 1.85 1.95 Arcilla arenosa\n2 4.0 32 1.95 2.05 Arena densa', nf: '', kh: '0', malla: '12 32 12 32 12', ybase: '-4', metodo: 'bishop', ndov: '30', unidades: 't', tabla: false },
  render(b, ctx) {
    const S = ctx.scope;
    const kN = b.unidades === 'kN', uS = kN ? 'kN/m^2' : 'tonf/m^2', uG = kN ? 'kN/m^3' : 'tonf/m^3', uStr = kN ? 'kPa' : 't/m²', uW = kN ? 'kN/m' : 't/m';
    const pts = lines(b.superficie).map(l => toks(l).map(s => evalParam(s, S, 'm'))).filter(p => p.length >= 2);
    if (pts.length < 2) throw new Error('Defina al menos dos puntos de la superficie del terreno');
    for (let i = 1; i < pts.length; i++) if (pts[i][0] < pts[i - 1][0]) throw new Error('Las abscisas de la superficie deben ser crecientes');
    let lay = lines(b.estratos).map(l => { const t = toks(l); const g = evalParam(t[3], S, uG); let gs = g, k = 4; const g4 = tryNum(t[4], S, uG); if (g4 !== null) { gs = g4; k = 5; } return { top: evalParam(t[0], S, 'm'), c: evalParam(t[1], S, uS), phi: evalParam(t[2], S, 'deg') * Math.PI / 180, g, gs, name: t.slice(k).join(' ') }; });
    if (!lay.length) throw new Error('Defina al menos un estrato');
    lay.sort((a, c) => c.top - a.top);
    const ymaxS = Math.max(...pts.map(p => p[1])), ybase = evalParam(b.ybase, S, 'm', Math.min(...pts.map(p => p[1])) - 5);
    lay[0].top = Math.max(lay[0].top, ymaxS + 1);
    lay.forEach((l, i) => { l.bot = i < lay.length - 1 ? lay[i + 1].top : -1e6; });
    // NF: cota constante (un valor) o polilínea «x y» por línea (o «x y; x y; …»)
    let wt = null;
    if (b.nf !== undefined && String(b.nf).trim() !== '') {
      const raw = String(b.nf).split(/[\n;]/).map(l => l.split('//')[0].trim()).filter(Boolean);
      if (raw.length === 1 && raw[0].split(/\s+/).length === 1) wt = evalParam(raw[0], S, 'm');
      else {
        wt = raw.map(l => l.split(/\s+/).map(s => evalParam(s, S, 'm'))).filter(p => p.length >= 2).map(p => [p[0], p[1]]);
        if (wt.length < 2) throw new Error('Nivel freático: indique una cota o al menos dos puntos «x y»');
        for (let i = 1; i < wt.length; i++) if (wt[i][0] <= wt[i - 1][0]) throw new Error('Nivel freático: las abscisas deben ser crecientes');
      }
    }
    const kh = evalParam(b.kh, S, '', 0), gw = kN ? 9.81 : 1.0;
    const surch = lines(b.sobrecarga).map(l => { const t = toks(l); return { x1: evalParam(t[0], S, 'm'), x2: evalParam(t[1], S, 'm'), q: evalParam(t.slice(2).join(' '), S, uS) }; });
    const n = Math.max(8, Math.min(100, parseInt(b.ndov) || 30));
    const H = ymaxS - Math.min(...pts.map(p => p[1]));
    const model = { pts, lay, wt, gw, kh, surch, hmin: Math.max(0.3, 0.05 * H) };
    const useF = b.metodo === 'fellenius';
    const fsOf = (r) => (useF ? r.FSf : r.FSb);
    let crit = null; const grid = [];
    if (String(b.circulo || '').trim()) {
      const [xc, yc, R] = toks(b.circulo.trim()).map(s => evalParam(s, S, 'm'));
      crit = slopeCircle(model, xc, yc, R, n);
      if (!crit) throw new Error('El círculo indicado no corta el talud de forma válida (revise xc, yc, R)');
    } else {
      const gm = toks(String(b.malla || '').trim()).map(s => evalParam(s, S, ''));
      const [x1, x2, y1, y2] = gm.length >= 4 ? gm : [pts[0][0], pts[pts.length - 1][0], ymaxS, ymaxS + 2 * H];
      const ng = Math.max(3, Math.min(30, Math.round(gm[4] || 10)));
      const nq = Math.min(n, 24); // dovelas durante la búsqueda (el círculo final se recalcula con n)
      // mejor radio para un centro dado: barrido grueso + refinamiento
      const bestR = (xc, yc) => {
        const rmin = yc - (ymaxS - 0.1), rmax = yc - ybase; if (rmax <= 0.5) return null;
        let bg = null, kb = -1; const NR = 30, dr = (rmax - Math.max(0.5, rmin)) / NR;
        for (let k = 0; k <= NR; k++) { const R = Math.max(0.5, rmin) + dr * k; const r = slopeCircle(model, xc, yc, R, nq); if (r && (!bg || fsOf(r) < fsOf(bg))) { bg = r; kb = k; } }
        if (!bg) return null;
        let lo = bg.R - dr, hi = bg.R + dr;
        for (let pass = 0; pass < 3; pass++) { const st = (hi - lo) / 10; for (let k = 0; k <= 10; k++) { const R = lo + st * k; if (R <= 0.5) continue; const r = slopeCircle(model, xc, yc, Math.min(R, rmax), nq); if (r && fsOf(r) < fsOf(bg)) bg = r; } lo = bg.R - st; hi = bg.R + st; }
        void kb; return bg;
      };
      for (let i = 0; i <= ng; i++) for (let j = 0; j <= ng; j++) {
        const xc = x1 + (x2 - x1) * i / ng, yc = y1 + (y2 - y1) * j / ng;
        const r = bestR(xc, yc);
        grid.push({ xc, yc, FS: r ? fsOf(r) : null });
        if (r && (!crit || fsOf(r) < fsOf(crit))) crit = r;
      }
      if (!crit) throw new Error('Ningún círculo válido en la malla de búsqueda: amplíe la malla o revise la geometría');
      // búsqueda por patrones alrededor del mínimo (centro libre, radio optimizado)
      let hx = (x2 - x1) / ng, hy = (y2 - y1) / ng; const tol = Math.max(0.01, 0.002 * H);
      while (hx > tol || hy > tol) {
        let moved = false;
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const r = bestR(crit.xc + ax * hx, crit.yc + ay * hy); if (r && fsOf(r) < fsOf(crit) - 1e-9) { crit = r; moved = true; break; } }
        if (!moved) { hx /= 2; hy /= 2; }
      }
      crit = slopeCircle(model, crit.xc, crit.yc, crit.R, n);
    }
    const FS = fsOf(crit);
    const FSreq = String(b.FSmin || '').trim() ? evalParam(b.FSmin, S, '') : kh > 0 ? 1.25 : 1.5;
    const sfx = b.sufijo ? '_' + b.sufijo.replace(/\W/g, '') : '';
    setVar(ctx, 'FS' + sfx, FS); setVar(ctx, 'FSb' + sfx, crit.FSb); setVar(ctx, 'FSf' + sfx, crit.FSf);
    setVar(ctx, 'xc' + sfx, U(crit.xc, 'm')); setVar(ctx, 'yc' + sfx, U(crit.yc, 'm')); setVar(ctx, 'Rc' + sfx, U(crit.R, 'm'));
    ctx.checks.push({ ok: FS >= FSreq, label: `Estabilidad global del talud ${kh > 0 ? '(seudoestático, kh = ' + f2(kh, 3) + ')' : '(estático)'}: FS ${useF ? 'Fellenius' : 'Bishop'} ≥ ${f2(FSreq)} (E.050 Art. 30.3)`, ratio: FSreq / FS, block: ctx.blockId });
    // ----- dibujo -----
    const xs0 = pts[0][0], xs1 = pts[pts.length - 1][0];
    const ylo = Math.min(ybase, crit.yc - crit.R, ...pts.map(p => p[1])) - 1, yhi = Math.max(crit.yc, ...grid.map(g => g.yc), ymaxS) + 1.5;
    const W = 720, pl = 46, pr = 16, pt = 16, Hmax = 470;
    const sc = Math.min((W - pl - pr) / (xs1 - xs0), (Hmax - pt - 30) / (yhi - ylo));
    const Hh = pt + (yhi - ylo) * sc + 30;
    const X = (x) => pl + (x - xs0) * sc, Y = (y) => pt + (yhi - y) * sc;
    const id = 'sl' + String(ctx.blockId).replace(/\W/g, '');
    let g = arrowDefs + soilPatterns(id);
    const cols = ['#eedfae', '#d5c3a0', '#c9b79a', '#e2d3b8', '#bfae94', '#d9c7a4'];
    const ground = `M${X(xs0)},${Y(ylo)} ` + pts.map(p => `L${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ') + ` L${X(xs1)},${Y(ylo)} Z`;
    g += `<clipPath id="${id}cl"><path d="${ground}"/></clipPath><g clip-path="url(#${id}cl)">`;
    lay.forEach((l, i) => { const t = Math.min(l.top, yhi), bo = Math.max(l.bot, ylo); g += `<rect x="${X(xs0)}" y="${Y(t)}" width="${(xs1 - xs0) * sc}" height="${(t - bo) * sc}" fill="${cols[i % cols.length]}"/><rect x="${X(xs0)}" y="${Y(t)}" width="${(xs1 - xs0) * sc}" height="${(t - bo) * sc}" fill="url(#${id}${SUCS_COL(l.name.split(' ')[0])[1] === 'c' || /arcill/i.test(l.name) ? 'c' : /grav/i.test(l.name) ? 'g' : /lim/i.test(l.name) ? 'm' : /roca/i.test(l.name) ? 'r' : 's'})" opacity=".6"/>`; if (i > 0) g += Lne(X(xs0), Y(l.top), X(xs1), Y(l.top), '#7a6a50', 0.8, '6 3'); });
    // slices
    crit.sl.forEach(q => { g += Lne(X(q.x - q.b / 2), Y(surfY(pts, q.x - q.b / 2)), X(q.x - q.b / 2), Y(crit.yc - Math.sqrt(Math.max(0, crit.R ** 2 - (q.x - q.b / 2 - crit.xc) ** 2))), '#6b5a40', 0.6); });
    g += '</g>';
    g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
    g += Lne(X(xs0), Y(ybase), X(xs1), Y(ybase), '#7a6a50', 0.8, '2 3') + T(X(xs1) - 4, Y(ybase) - 3, 'cota mínima de falla', { fs: 8, c: C.axis, a: 'end' });
    if (wt !== null) { const ywAt = (x) => Math.min(wtAt(wt, x), surfY(pts, x)); const wp = []; for (let i = 0; i <= 120; i++) { const x = xs0 + (xs1 - xs0) * i / 120; wp.push([x, ywAt(x)]); } g += `<path d="${wp.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="1.4" stroke-dasharray="7 4"/>`; const xw = xs1 - (xs1 - xs0) * 0.06; g += `<path d="M${X(xw) - 5},${Y(ywAt(xw)) - 9} l10,0 l-5,8 z" fill="${C.blue}"/>` + T(X(xw) + 8, Y(ywAt(xw)) - 3, 'NF', { fs: 9, c: C.blue, a: 'start' }); }
    surch.forEach(s => { const a = X(s.x1), c = X(s.x2), y = Y(surfY(pts, (s.x1 + s.x2) / 2)); g += `<rect x="${a}" y="${y - 12}" width="${c - a}" height="10" fill="${C.blueF}" stroke="${C.blue}" stroke-width=".8"/>` + lab((a + c) / 2, y - 16, 'q = ' + f2(s.q) + ' ' + uStr, { c: C.blue, fs: 9 }); });
    // grid
    if (grid.length) { const fsv = grid.filter(q => q.FS !== null).map(q => q.FS), lo = Math.min(...fsv), hi = Math.max(...fsv); grid.forEach(q => { if (q.FS === null) { g += `<circle cx="${X(q.xc)}" cy="${Y(q.yc)}" r="1.4" fill="#bbb"/>`; return; } const t = hi > lo ? (q.FS - lo) / (hi - lo) : 0; const col = `hsl(${(t * 120).toFixed(0)},70%,45%)`; g += `<circle cx="${X(q.xc).toFixed(1)}" cy="${Y(q.yc).toFixed(1)}" r="2.2" fill="${col}"/>`; }); }
    // circle arc
    const arc = []; for (let i = 0; i <= 80; i++) { const x = crit.xl + (crit.xr - crit.xl) * i / 80; arc.push([x, crit.yc - Math.sqrt(Math.max(0, crit.R ** 2 - (x - crit.xc) ** 2))]); }
    g += `<path d="${arc.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${C.red}" stroke-width="2.2"/>`;
    g += Lne(X(crit.xc), Y(crit.yc), X(crit.xl), Y(surfY(pts, crit.xl)), C.red, 0.8, '4 3') + Lne(X(crit.xc), Y(crit.yc), X(crit.xr), Y(surfY(pts, crit.xr)), C.red, 0.8, '4 3');
    g += `<circle cx="${X(crit.xc)}" cy="${Y(crit.yc)}" r="4" fill="${C.red}"/>` + lab(X(crit.xc) + 7, Y(crit.yc) - 6, `O (${f2(crit.xc)}; ${f2(crit.yc)})  R = ${f2(crit.R)} m`, { a: 'start', c: C.red, b: 1 });
    g += lab(X(crit.xc) + 7, Y(crit.yc) + 10, `FS = ${f2(FS, 3)} (${useF ? 'Fellenius' : 'Bishop'})`, { a: 'start', c: C.red, b: 1, fs: 11 });
    // ejes
    niceTicks(xs0, xs1, 10).forEach(t => { g += Lne(X(t), Hh - 26, X(t), Hh - 22, C.axis) + T(X(t), Hh - 12, f2(t, 0), { fs: 9, c: C.axis }); });
    niceTicks(ylo, yhi, 8).forEach(t => { g += Lne(pl - 4, Y(t), pl, Y(t), C.axis) + T(pl - 6, Y(t) + 3, f2(t, 0), { fs: 9, c: C.axis, a: 'end' }); });
    g += Lne(pl, Hh - 26, W - pr, Hh - 26, C.axis, 0.7) + Lne(pl, pt, pl, Hh - 26, C.axis, 0.7);
    // leyenda de estratos
    lay.forEach((l, i) => { const yy = pt + 6 + i * 13; g += `<rect x="${W - pr - 214}" y="${yy - 8}" width="12" height="10" fill="${cols[i % cols.length]}" stroke="#7a6a50" stroke-width=".6"/>` + T(W - pr - 198, yy, `${l.name || 'Estrato ' + (i + 1)}: c=${f2(l.c)} ${uStr}, φ=${f2(l.phi * 180 / Math.PI, 1)}°, γ=${f2(l.g)}`, { fs: 8.5, a: 'start' }); });
    let out = svgWrap(W, Hh, g);
    if (grid.length) out += '<div class="legend"><span><i style="background:hsl(0,70%,45%)"></i>Centros con FS mínimo</span><span><i style="background:hsl(60,70%,45%)"></i>FS intermedio</span><span><i style="background:hsl(120,70%,45%)"></i>FS máximo de la malla</span><span><i style="background:#c62828"></i>Círculo crítico</span></div>';
    out += kv([['FSb' + sfx, crit.FSb], ['FSf' + sfx, crit.FSf], ['xc' + sfx, U(crit.xc, 'm')], ['yc' + sfx, U(crit.yc, 'm')], ['Rc' + sfx, U(crit.R, 'm')]]);
    out += `<div class="kv">${K('FS_{req} = ' + f2(FSreq))} ${K('k_h = ' + f2(kh, 3))} ${K('\\Sigma M_{mot}/R = ' + f2(crit.drive) + '\\,\\mathrm{' + uW.replace('/', '/') + '}')}</div>`;
    if (b.tabla) {
      out += `<table class="tbl"><thead><tr><th>#</th><th>x [m]</th><th>b [m]</th><th>h [m]</th><th>W [${uW}]</th><th>α [°]</th><th>c [${uStr}]</th><th>φ [°]</th><th>u [${uStr}]</th><th>W sinα</th><th>m<sub>α</sub></th><th>[c b + (W−u b)tanφ]/m<sub>α</sub></th></tr></thead><tbody>` +
        crit.sl.map((q, i) => `<tr><td>${i + 1}</td><td>${f2(q.x)}</td><td>${f2(q.b)}</td><td>${f2(q.h)}</td><td>${f2(q.W)}</td><td>${f2(Math.asin(q.sa) * 180 / Math.PI, 1)}</td><td>${f2(q.c)}</td><td>${f2(q.lay.phi * 180 / Math.PI, 1)}</td><td>${f2(q.u)}</td><td>${f2(q.W * q.sa)}</td><td>${f2(q.ma, 3)}</td><td>${f2((q.c * q.L * q.ca + Math.max(0, q.W - q.u * q.L * q.ca) * q.tf) / (q.sa < 0 ? Math.max(0.2, q.ma) : q.ma))}</td></tr>`).join('') + '</tbody></table>';
    }
    return `<div class="figure">${out}${caption(ctx, b.titulo || `Análisis de estabilidad del talud — círculo crítico (${useF ? 'Fellenius' : 'Bishop simplificado'})`)}</div>`;
  },
});

// =====================================================================
//  4) GRUPO DE PILOTES CON CABEZAL
// =====================================================================
registerBlock('pilegroup', {
  name: 'Grupo de pilotes (dibujo)', icon: 'footing', group: 'Cimentaciones',
  fields: [
    F('n1', 'Pilotes en dirección X (n1)', '3'), F('n2', 'Pilotes en dirección Y (n2)', '3'), F('s', 'Espaciamiento entre ejes s', '1.2 m'),
    F('D', 'Diámetro del pilote D', '0.4 m'), F('borde', 'Distancia del eje al borde del cabezal', '0.45 m'), F('hc', 'Peralte del cabezal', '1.0 m'),
    F('Lp', 'Longitud del pilote', '15 m'), F('c1', 'Columna c1 × c2', '0.6 m'), F('c2', 'c2', '0.6 m'), F('d', 'Peralte efectivo d (perímetro crítico)', ''),
    F('Df', 'Profundidad de desplante del cabezal', '1.5 m'), F('estratos', 'Estratos (opcional): espesor nombre', '', 'area'), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja planta y elevación del grupo. Exporta <code>npil Bcab Lcab Bg Lg</code> (cabezal y bloque equivalente del grupo).',
  def: { n1: '3', n2: '3', s: '1.2 m', D: '0.4 m', borde: '0.45 m', hc: '1.0 m', Lp: '15 m', c1: '0.6 m', c2: '0.6 m', Df: '1.5 m' },
  render(b, ctx) {
    const S = ctx.scope;
    const n1 = Math.round(evalParam(b.n1, S, '', 3)), n2 = Math.round(evalParam(b.n2, S, '', 3));
    const s = evalParam(b.s, S, 'm', 1.2), D = evalParam(b.D, S, 'm', 0.4), e = evalParam(b.borde, S, 'm', 0.45), hc = evalParam(b.hc, S, 'm', 1);
    const Lp = evalParam(b.Lp, S, 'm', 15), c1 = evalParam(b.c1, S, 'm', 0.6), c2 = evalParam(b.c2, S, 'm', c1), d = evalParam(b.d, S, 'm', 0), Df = evalParam(b.Df, S, 'm', hc + 0.3);
    pos({ n1, n2, s, D, e, hc, Lp }); if (n1 * n2 > 100) throw new Error('Demasiados pilotes (máx. 100)');
    const Lc = (n1 - 1) * s + 2 * e, Bc = (n2 - 1) * s + 2 * e;
    const Lg = (n1 - 1) * s + D, Bg = (n2 - 1) * s + D;
    setVar(ctx, 'npil', n1 * n2); setVar(ctx, 'Lcab', U(Lc, 'm')); setVar(ctx, 'Bcab', U(Bc, 'm')); setVar(ctx, 'Lg', U(Lg, 'm')); setVar(ctx, 'Bg', U(Bg, 'm'));
    const W = 720, Hh = 400; let g = arrowDefs;
    // planta
    const sc1 = Math.min(270 / Lc, 270 / Bc), ox = 40 + (300 - Lc * sc1) / 2, oy = 50;
    const Xp = (x) => ox + x * sc1, Yp = (y) => oy + y * sc1;
    g += T(190, 22, 'PLANTA', { b: 1 });
    g += `<rect x="${Xp(0)}" y="${Yp(0)}" width="${Lc * sc1}" height="${Bc * sc1}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    if (d > 0) g += `<rect x="${Xp((Lc - c1 - d) / 2)}" y="${Yp((Bc - c2 - d) / 2)}" width="${(c1 + d) * sc1}" height="${(c2 + d) * sc1}" fill="none" stroke="${C.red}" stroke-dasharray="5 3"/>`;
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) { const x = e + i * s, y = e + j * s; g += `<circle cx="${Xp(x)}" cy="${Yp(y)}" r="${D / 2 * sc1}" fill="#b8c0c8" stroke="${C.ink}"/>`; }
    g += `<rect x="${Xp((Lc - c1) / 2)}" y="${Yp((Bc - c2) / 2)}" width="${c1 * sc1}" height="${c2 * sc1}" fill="#7d8894" stroke="${C.ink}"/>`;
    g += Lne(Xp(0) - 6, Yp(Bc / 2), Xp(Lc) + 6, Yp(Bc / 2), C.axis, 0.6, '8 3 2 3') + Lne(Xp(Lc / 2), Yp(0) - 6, Xp(Lc / 2), Yp(Bc) + 6, C.axis, 0.6, '8 3 2 3');
    g += dimH(Xp(0), Xp(Lc), Yp(Bc) + 20, 'L = ' + f2(Lc) + ' m') + dimV(Xp(0) - 16, Yp(0), Yp(Bc), 'B = ' + f2(Bc) + ' m');
    if (n1 > 1) g += dimH(Xp(e), Xp(e + s), Yp(0) - 12, 's = ' + f2(s));
    g += T(190, Yp(Bc) + 42, `${n1 * n2} pilotes Ø ${f2(D * 100, 0)} cm`, { fs: 10, c: C.axis });
    // elevación
    const ex = 400, Wl = 290, zTot = Df + Lp + 1.2, sc2 = Math.min((Wl - 90) / Lc, 330 / zTot), gy = 50;
    const Xe = (x) => ex + 30 + x * sc2, Ye = (z) => gy + z * sc2;
    g += T(ex + Wl / 2, 22, 'ELEVACIÓN', { b: 1 });
    g += `<rect x="${ex}" y="${gy}" width="${Wl}" height="${zTot * sc2}" fill="url(#soilp)" opacity=".55"/>` + Lne(ex, gy, ex + Wl, gy, C.soil, 2);
    if (b.estratos) { let z = 0; lines(b.estratos).forEach(l => { const t = l.split(/\s+/); const z0 = z; z += evalParam(t[0], S, 'm'); if (z < zTot) g += Lne(ex, Ye(z), ex + Wl, Ye(z), '#8a7440', 0.8, '6 3'); if (z0 < zTot) g += lab(ex + Wl - 4, Ye(z0) + 14, t.slice(1).join(' '), { fs: 8.5, a: 'end', c: '#5d4e2c' }); }); }
    for (let i = 0; i < n1; i++) { const x = e + i * s; g += `<rect x="${Xe(x - D / 2)}" y="${Ye(Df)}" width="${D * sc2}" height="${Lp * sc2}" fill="#b8c0c8" stroke="${C.ink}" stroke-width=".8"/>`; }
    g += `<rect x="${Xe(0)}" y="${Ye(Df - hc)}" width="${Lc * sc2}" height="${hc * sc2}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    g += `<rect x="${Xe((Lc - c1) / 2)}" y="${gy - 22}" width="${c1 * sc2}" height="${(Df - hc) * sc2 + 22}" fill="#7d8894" stroke="${C.ink}"/>`;
    g += dimV(Xe(Lc) + 16, Ye(Df), Ye(Df + Lp), 'Lp = ' + f2(Lp) + ' m', C.ink, 1) + dimV(Xe(0) - 12, Ye(Df - hc), Ye(Df), 'h = ' + f2(hc));
    g += Lne(Xe(0), Ye(Df + 2 / 3 * Lp), Xe(Lc), Ye(Df + 2 / 3 * Lp), C.red, 1, '5 3') + T(Xe(Lc / 2), Ye(Df + 2 / 3 * Lp) - 4, 'zapata equivalente (2/3 Lp)', { fs: 8.5, c: C.red });
    return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Grupo de pilotes y cabezal')}</div>`;
  },
});

// =====================================================================
//  5) LICUACIÓN — CSR, CRR y FS vs profundidad
// =====================================================================
registerBlock('liqchart', {
  name: 'Gráfico de licuación', icon: 'quake', group: 'Geotecnia',
  fields: [
    F('z', 'Profundidades (vector)', 'zSPT'), F('CSR', 'CSR (vector)', 'CSR'), F('CRR', 'CRR_M (vector)', 'CRRM'), F('FS', 'FS_L (vector)', 'FSL'),
    F('FSmin', 'FS_L mínimo (Tabla 13A)', '1.25'), F('nf', 'Nivel freático', 'Dw'), F('titulo', 'Título', ''),
  ],
  hint: 'Grafica vectores del cálculo previo: CSR y CRR<sub>M</sub> vs profundidad, y el factor de seguridad FS<sub>L</sub> = CRR<sub>M</sub>/CSR con el mínimo de la E.050 (Tabla 13A).',
  def: { z: 'zSPT', CSR: 'CSR', CRR: 'CRRM', FS: 'FSL', FSmin: '1.25', nf: 'Dw' },
  render(b, ctx) {
    const S = ctx.scope;
    const z = evalVec(b.z, S, 'm'), csr = evalVec(b.CSR, S, ''), crr = evalVec(b.CRR, S, ''), fs = evalVec(b.FS, S, '');
    if (!z || !csr || !crr) throw new Error('Indique los vectores z, CSR y CRR');
    if (csr.length !== z.length || crr.length !== z.length) throw new Error('Los vectores deben tener el mismo tamaño');
    const FSmin = evalParam(b.FSmin, S, '', 1.0), nf = String(b.nf || '').trim() ? evalParam(b.nf, S, 'm') : null;
    const zmax = Math.ceil(Math.max(...z) * 1.1 + 0.5);
    const W = 720, y0 = 44, Hh = 330;
    let g = '';
    const cmax = Math.min(1.0, Math.max(0.5, ...csr.map(v => v * 1.25), ...crr.filter(v => v < 1).map(v => v * 1.1)));
    const okc = crr.map(v => v < cmax);
    g += zPanel(70, y0, 280, Hh, zmax, [0, cmax], [{ xs: csr, zs: z, color: C.red, marker: 'c' }, { xs: crr.filter((v, i) => okc[i]), zs: z.filter((v, i) => okc[i]), color: C.blue, marker: 'sq', dash: '5 3' }], 'CSR y CRR_M', { nf });
    crr.forEach((v, i) => { if (!okc[i]) { const yy = y0 + z[i] / zmax * Hh; g += `<path d="M${350 - 9},${(yy - 4).toFixed(1)} l8,4 l-8,4 z" fill="${C.blue}"/>` + lab(350 - 12, yy + 3.5, 'NL', { a: 'end', c: C.blue, fs: 8.5 }); } });
    if (okc.some(v => !v)) g += T(210, y0 + Hh + 14, 'NL: (N1)60cs ≥ 30, no licuable (CRR fuera de escala)', { fs: 9, c: C.axis });
    g += T(24, y0 + Hh / 2, 'Profundidad z [m]', { fs: 10, r: -90, c: C.axis });
    if (fs) { const fmx = 3; g += zPanel(420, y0, 260, Hh, zmax, [0, fmx], [{ xs: fs.map(v => Math.min(v, fmx)), zs: z, color: C.green, marker: 'c' }], 'FS_L = CRR_M / CSR', { nf, vref: [[FSmin, C.red, 'FS mín = ' + f2(FSmin)], [1, C.axis, '']] }); niceTicks(0, zmax, 8).forEach(t => { g += T(416, y0 + t / zmax * Hh + 3, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); }); fs.forEach((v, i) => { if (v < FSmin) g += `<circle cx="${(420 + Math.min(v, 3) / 3 * 260).toFixed(1)}" cy="${(y0 + z[i] / zmax * Hh).toFixed(1)}" r="5" fill="none" stroke="${C.red}" stroke-width="1.6"/>`; }); }
    const out = svgWrap(W, y0 + Hh + 20, g) + legend([[C.red, 'CSR (demanda sísmica)'], [C.blue, 'CRR_M (resistencia)', 1], [C.green, 'FS_L'], [C.blue, 'Nivel freático', 1]]);
    return `<div class="figure">${out}${caption(ctx, b.titulo || 'Potencial de licuación con la profundidad (Youd et al. 2001)')}</div>`;
  },
});

void interp;

// =====================================================================
//  6) CIMIENTO CORRIDO (sección transversal)
// =====================================================================
registerBlock('stripfooting', {
  name: 'Cimiento corrido (sección)', icon: 'wall', group: 'Cimentaciones',
  fields: [
    F('B', 'Ancho del cimiento B', '0.80 m'), F('hc', 'Peralte del cimiento', '0.80 m'), F('bs', 'Ancho del sobrecimiento', '0.25 m'), F('hs', 'Altura del sobrecimiento', '0.50 m'),
    F('tm', 'Espesor del muro', '0.25 m'), F('Df', 'Profundidad de desplante', '1.00 m'), F('npt', 'Altura del NPT sobre el terreno', '0.20 m'),
    F('q', 'Presión en la base', '10 tonf/m^2'), F('material', 'Texto del material', 'Concreto ciclópeo 1:10 + 30 % P.G.'), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja la sección transversal de un cimiento corrido de concreto ciclópeo con sobrecimiento, muro y presión de contacto.',
  def: { B: '0.80 m', hc: '0.80 m', bs: '0.25 m', hs: '0.50 m', tm: '0.25 m', Df: '1.00 m', npt: '0.20 m', q: '10 tonf/m^2' },
  render(b, ctx) {
    const S = ctx.scope;
    const B = evalParam(b.B, S, 'm', 0.8), hc = evalParam(b.hc, S, 'm', 0.8), bs = evalParam(b.bs, S, 'm', 0.25), hs = evalParam(b.hs, S, 'm', 0.5);
    const tm = evalParam(b.tm, S, 'm', 0.25), Df = evalParam(b.Df, S, 'm', 1), npt = evalParam(b.npt, S, 'm', 0.2), q = evalParam(b.q, S, 'tonf/m^2', 0);
    pos({ B, hc, bs, hs, tm, Df });
    const W = 620, ztop = Math.max(hs - (Df - hc), npt) + 0.9, zbot = Df + 0.55;
    const sc = Math.min(330 / (ztop + zbot), 380 / (B + 1.2)), cx = W / 2, y0 = 20 + ztop * sc; // y0 = cota del terreno
    const X = (x) => cx + x * sc, Y = (z) => y0 + z * sc; // z hacia abajo desde el terreno
    const H = Math.max(Y(zbot), Y(Df) + (q > 0 ? 92 : 40)) + 6;
    let g = arrowDefs;
    g += `<rect x="${X(-B / 2 - 0.55)}" y="${Y(0)}" width="${(B + 1.1) * sc}" height="${zbot * sc}" fill="url(#soilp)" opacity=".6"/>`;
    g += Lne(X(-B / 2 - 0.55), Y(0), X(B / 2 + 0.55), Y(0), C.soil, 2) + T(X(-B / 2 - 0.5), Y(0) - 4, 'NTN ±0.00', { fs: 9, a: 'start', c: C.axis });
    g += `<rect x="${X(-B / 2)}" y="${Y(Df - hc)}" width="${B * sc}" height="${hc * sc}" fill="#d9d4cc" stroke="${C.ink}" stroke-width="1.4"/>`;
    for (let i = 0; i < Math.round(B * hc * 60); i++) { const rx = ((i * 0.6180339) % 1), ry = ((i * 0.4142135) % 1); g += `<ellipse cx="${(X(-B / 2) + 6 + rx * (B * sc - 12)).toFixed(1)}" cy="${(Y(Df - hc) + 6 + ry * (hc * sc - 12)).toFixed(1)}" rx="5" ry="3.5" fill="#b8b0a2" stroke="#8d8577" stroke-width=".6"/>`; }
    const ys = Df - hc - hs;
    g += `<rect x="${X(-bs / 2)}" y="${Y(ys)}" width="${bs * sc}" height="${hs * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.2"/>`;
    g += `<rect x="${X(-tm / 2)}" y="${Y(ys) - 0.85 * sc}" width="${tm * sc}" height="${0.85 * sc}" fill="#c96f4a" stroke="${C.ink}" stroke-width="1"/>`;
    for (let k = 1; k < 8; k++) g += Lne(X(-tm / 2), Y(ys) - k * 0.85 * sc / 8, X(tm / 2), Y(ys) - k * 0.85 * sc / 8, '#8e4a2e', 0.6);
    g += `<rect x="${X(bs / 2)}" y="${Y(-npt)}" width="${(B / 2 + 0.5 - bs / 2) * sc}" height="${0.1 * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width=".8"/>` + T(X(B / 2 + 0.5), Y(-npt) - 4, 'NPT +' + f2(npt), { fs: 9, a: 'end', c: C.axis });
    g += dimH(X(-B / 2), X(B / 2), Y(Df) + (q > 0 ? 80 : 18), 'B = ' + f2(B) + ' m') + dimV(X(-B / 2) - 16, Y(Df - hc), Y(Df), 'hc = ' + f2(hc) + ' m') + dimV(X(B / 2 + 0.45), Y(0), Y(Df), 'Df = ' + f2(Df) + ' m', C.ink, 1);
    g += dimV(X(-bs / 2) - 12, Y(ys), Y(Df - hc), 'hs = ' + f2(hs)) + T(X(0), Y(ys) - 0.85 * sc - 6, 'Muro e = ' + f2(tm) + ' m', { fs: 10 });
    if (q > 0) { const py = Y(Df) + 4, ph = 34; g += `<rect x="${X(-B / 2)}" y="${py}" width="${B * sc}" height="${ph}" fill="${C.redF}" stroke="${C.red}"/>`; for (let i = 0; i <= 6; i++) { const x = X(-B / 2 + B * i / 6); g += Lne(x, py + ph, x, py + 2, C.red, 0.8).replace('/>', ' marker-end="url(#arr)"/>'); } g += lab(X(0), py + ph + 13, 'q = ' + f2(q) + ' t/m²', { c: C.red, b: 1 }); }
    if (b.material) g += lab(X(0), Y(Df - hc / 2) + 4, interp(b.material, S), { fs: 9.5 });
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Sección transversal del cimiento corrido')}</div>`;
  },
});
