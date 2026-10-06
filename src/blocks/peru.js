// =====================================================================
//  Bloques gráficos/analíticos — módulo «peru»
//   modal        Análisis modal espectral de edificio de cortante (genérico)
//   storyforces  Distribución de fuerzas sísmicas estáticas en altura (E.030 Art. 35)
//   irregE030    Evaluación de irregularidades (E.030 Tablas N° 11, 12 y 13)
//   lrb          Sistema de aislamiento bilineal (LRB/HDR) — E.031, iteración DM
//   windgable    Presiones de viento sobre nave a dos aguas (E.020 Art. 12)
//   stackbar     Barras apiladas (metrados por nivel)
//   junta        Junta sísmica entre edificios (E.030 Art. 52)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, K, settings, displayUnit } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, niceTicks, caption, setVar, f2 } from '../blocks.js';
import { IaRig, IaRes, IaMas, IaGeo, IpTor, stiffRatios, BME031num } from '../norms/peru.js';

const G = 9.80665;
const COLS = [C.blue, C.red, C.green, C.orange, '#8250df', '#0a7e8c', '#9a6700', '#6e7781'];
const prefF = () => ({ tec: 'tonf', si: 'kN', us: 'kip' }[settings.sys] || 'tonf');
const prefM = () => ({ tec: 'tonf*m', si: 'kN*m', us: 'kip*ft' }[settings.sys] || 'tonf*m');
const prefL = () => ({ tec: 'cm', si: 'mm', us: 'in' }[settings.sys] || 'cm');
const prefK = () => ({ tec: 'tonf/m', si: 'kN/m', us: 'kip/in' }[settings.sys] || 'tonf/m');
const uF = (vN) => math.unit(vN, 'N').to(prefF());
const uM = (vNm) => math.unit(vNm, 'N*m').to(prefM());
const uL = (vm) => math.unit(vm, 'm').to(prefL());
const nf = (vN) => vN / math.unit(1, prefF()).toNumber('N');      // N → unidad preferida
const nm = (vNm) => vNm / math.unit(1, prefM()).toNumber('N*m');
const nl = (vm) => vm / math.unit(1, prefL()).toNumber('m');
const lblF = () => prefF().replace('*', '·');
const lblM = () => prefM().replace('*', '·');
const lblL = () => prefL();

// ---------- utilidades ----------
function evalAny(str, S) {
  const s = String(str ?? '').trim();
  if (!s) return undefined;
  let v;
  try { v = math.evaluate(s, new Map(S)); } catch (e) { v = undefined; }
  if (v === undefined || (typeof v !== 'number' && !math.isUnit(v) && !math.isMatrix(v) && !Array.isArray(v))) v = math.evaluate('[' + s + ']', new Map(S));
  return v;
}
// vector numérico en SI; dims: 'force' | 'mass' | 'stiff' | 'length' ; num = factor para números sin unidad
function vecSI(str, S, kind) {
  const v = evalAny(str, S);
  if (v === undefined) return null;
  let a = math.isMatrix(v) ? v.toArray() : Array.isArray(v) ? v : [v];
  a = a.flat(Infinity);
  return a.map(x => toSI(x, kind));
}
function toSI(x, kind) {
  if (math.isUnit(x)) {
    const d = x.dimensions;
    if (kind === 'mass') { if (d[0] === 1 && d[1] === 1 && d[2] === -2) return x.value / G; return x.value; }
    return x.value;
  }
  const n = Number(x);
  if (!isFinite(n)) throw new Error('Valor no numérico en la lista');
  return n * ({ mass: 1000, force: G * 1000, stiff: G * 1000, length: 1, none: 1 }[kind] ?? 1); // números: tonf, tonf/m, m
}
function scal(str, S, def) { const s = String(str ?? '').trim(); if (!s) return def; const v = math.evaluate(s, new Map(S)); return math.isUnit(v) ? v.value : Number(v); }
const sum = (a) => a.reduce((x, y) => x + y, 0);
const vecU = (arr, f) => math.matrix(arr.map(f));
function sfx(b) { const s = String(b.sufijo || '').trim().replace(/[^A-Za-z0-9]/g, ''); return s ? '_' + s : ''; }
function chkLine(ctx, ok, eq, label, ratio) {
  ctx.checks.push({ ok, label, ratio, block: ctx.blockId });
  const badge = ok ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>';
  const r = ratio !== null && ratio !== undefined && isFinite(ratio) ? `<span class="dc">D/C = ${f2(ratio, 2)}</span>` : '';
  return `<div class="ln chk ${ok ? 'cok' : 'cbad'}"><div class="eq">${K(eq)}</div><div class="cm">${esc(label)} ${badge}${r}</div></div>`;
}
function tableHtml(ctx, title, heads, rows, foot) {
  ctx.tab = (ctx.tab || 0) + 1;
  let h = `<table class="tbl"><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>`;
  for (const r of rows) h += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>';
  if (foot) h += '<tr class="tot">' + foot.map(c => `<td>${c}</td>`).join('') + '</tr>';
  h += '</tbody></table>';
  return `<div class="figure"><div class="cap">Tabla ${ctx.tab}${title ? ': ' + esc(title) : ''}</div>${h}</div>`;
}
const kx = (t) => K(t);
const okMark = (ok) => ok ? `<span style="color:${C.green};font-weight:600">✔</span>` : `<span style="color:${C.red};font-weight:600">✘</span>`;

// ---------- autovalores: Jacobi (matriz simétrica) ----------
export function jacobiEig(A0) {
  const n = A0.length, A = A0.map(r => r.slice()), V = A0.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] ** 2;
    if (off < 1e-22 * (1 + A.reduce((t, r, i) => t + r[i] ** 2, 0))) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  const vals = A.map((r, i) => r[i]);
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
  return { vals: idx.map(i => vals[i]), vecs: idx.map(i => V.map(r => r[i])) };
}
// Coeficiente de correlación CQC (E.030 Art. 42.2)
export function rhoCQC(wi, wj, beta) {
  const l = wj / wi;
  return 8 * beta * beta * (1 + l) * l ** 1.5 / ((1 - l * l) ** 2 + 4 * beta * beta * l * (1 + l) ** 2);
}
export function combine(r, w, type, beta = 0.05) {
  if (type === 'ABS') return 0.25 * sum(r.map(Math.abs)) + 0.75 * Math.sqrt(sum(r.map(x => x * x)));
  if (type === 'SRSS') return Math.sqrt(sum(r.map(x => x * x)));
  let s = 0; for (let i = 0; i < r.length; i++) for (let j = 0; j < r.length; j++) s += r[i] * rhoCQC(w[i], w[j], beta) * r[j];
  return Math.sqrt(Math.max(s, 0));
}
// Análisis modal espectral de un edificio de cortante (SI: kg, N/m, m, m/s²)
export function modalShear(m, Kin, he, SaFn, opt = {}) {
  const n = m.length;
  let Km;
  if (Array.isArray(Kin[0])) Km = Kin.map(r => r.slice());
  else {
    const k = Kin; Km = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) { Km[i][i] += k[i]; if (i + 1 < n) { Km[i][i] += k[i + 1]; Km[i][i + 1] -= k[i + 1]; Km[i + 1][i] -= k[i + 1]; } }
  }
  const s = m.map(x => 1 / Math.sqrt(x));
  const A = Km.map((r, i) => r.map((v, j) => v * s[i] * s[j]));
  const { vals, vecs } = jacobiEig(A);
  if (vals.some(v => !(v > 0))) throw new Error('La matriz de rigidez no es definida positiva (revise rigideces)');
  const H = []; he.reduce((a, x, i) => (H[i] = a + x), 0);
  const Mt = sum(m);
  const modes = vals.map((lam, k) => {
    let phi = vecs[k].map((v, i) => v * s[i]);
    const top = phi[n - 1] || phi.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    phi = phi.map(x => x / top);
    const w = Math.sqrt(lam), Tn = 2 * Math.PI / w;
    const Ln = sum(phi.map((p, i) => p * m[i])), Mn = sum(phi.map((p, i) => p * p * m[i]));
    const Gam = Ln / Mn, Meff = Ln * Ln / Mn;
    const Sa = SaFn(Tn);
    const D = Sa / (w * w);
    const u = phi.map(p => Gam * p * D);
    const drift = u.map((x, i) => x - (i ? u[i - 1] : 0));
    const f = phi.map((p, i) => m[i] * p * Gam * Sa);
    const V = f.map((_, i) => sum(f.slice(i)));
    const Mo = f.map((_, i) => { let t = 0; for (let j = i; j < n; j++) t += f[j] * (H[j] - (i ? H[i - 1] : 0)); return t; });
    return { w, T: Tn, phi, Gam, Meff, ratio: Meff / Mt, Sa, D, u, drift, f, V, Mo, Vb: Meff * Sa };
  });
  const nm = Math.min(n, Math.max(1, opt.nmodes || n));
  const used = modes.slice(0, nm), ws = used.map(x => x.w);
  const cmb = (get) => Array.from({ length: n }, (_, i) => combine(used.map(md => get(md)[i]), ws, opt.comb || 'CQC', opt.beta ?? 0.05));
  const res = {
    modes, used, H, Mt,
    u: cmb(md => md.u), drift: cmb(md => md.drift), F: cmb(md => md.f), V: cmb(md => md.V), Mo: cmb(md => md.Mo),
    Mpart: sum(used.map(x => x.ratio)),
  };
  res.Vb = res.V[0];
  return res;
}
function makeSaFn(expr, S) {
  const code = math.compile(String(expr || '').trim() || '0');
  const sc = new Map(S);
  const toAcc = (v) => {
    if (math.isUnit(v)) { if (v.dimensions[1] === 1 && v.dimensions[2] === -2 && v.dimensions[0] === 0) return v.toNumber('m/s^2'); throw new Error('El espectro debe dar aceleración (m/s²) o Sa/g adimensional'); }
    if (typeof v === 'number' && isFinite(v)) return v * G;
    throw new Error('El espectro no produce un valor numérico');
  };
  return (Tn) => {
    sc.set('T', math.unit(Tn, 's'));
    try { return toAcc(code.evaluate(sc)); } catch (e) { sc.set('T', Tn); return toAcc(code.evaluate(sc)); }
  };
}

// ---------- marco de gráfico ----------
function frame(x0, y0, w, h, xr, yr, o = {}) {
  const X = (v) => x0 + (v - xr[0]) / (xr[1] - xr[0]) * w, Y = (v) => y0 + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  let g = '';
  (o.xt || niceTicks(xr[0], xr[1], 4)).forEach(t => { g += Lne(X(t), y0, X(t), y0 + h, C.grid, 0.7) + T(X(t), y0 + h + 13, o.xf ? o.xf(t) : f2(t, 2), { fs: 9, c: C.axis }); });
  (o.yt || niceTicks(yr[0], yr[1], 5)).forEach(t => { g += Lne(x0, Y(t), x0 + w, Y(t), C.grid, 0.7) + T(x0 - 5, Y(t) + 3, o.yf ? o.yf(t) : f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
  if (xr[0] < 0 && xr[1] > 0) g += Lne(X(0), y0, X(0), y0 + h, C.ink, 0.9);
  g += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${C.axis}"/>`;
  if (o.title) g += T(x0 + w / 2, y0 - 8, o.title, { fs: 11, b: 1 });
  if (o.xl) g += T(x0 + w / 2, y0 + h + 28, o.xl, { fs: 10 });
  if (o.yl) g += T(x0 - 34, y0 + h / 2, o.yl, { fs: 10, r: -90 });
  return { g, X, Y };
}

// =====================================================================
//  1) ANÁLISIS MODAL ESPECTRAL — EDIFICIO DE CORTANTE
// =====================================================================
registerBlock('modal', {
  name: 'Análisis modal espectral (edificio de cortante)', icon: 'spectrum', group: 'Sismo',
  fields: [
    F('masas', 'Pesos o masas por nivel (1 → n): vector o lista (números = tonf de peso)', 'P_i'),
    F('rigideces', 'Rigidez lateral de cada entrepiso (1 → n) o matriz K condensada (números = tonf/m)', 'Ki'),
    F('alturas', 'Altura de cada entrepiso (1 → n) [m]', 'hei'),
    F('Sa', 'Espectro en función de T (Sa/g adimensional o aceleración)', 'Z*U*CE030d(T, Tp, Tl)*S/R'),
    F('comb', 'Combinación modal', '', 'select', [['CQC', 'CQC (ξ = 5 %) — E.030 Art. 42.2'], ['SRSS', 'SRSS (raíz de la suma de cuadrados)'], ['ABS', '0.25 Σ|r| + 0.75 √Σr² — E.030 Art. 42.3']]),
    F('beta', 'Amortiguamiento para CQC', '0.05'),
    F('modos', 'N.º de modos a combinar (vacío = todos)', ''),
    F('fdesp', 'Factor de desplazamientos inelásticos (p. ej. 0.75*R, 0.85*R)', '0.75*R'),
    F('dlim', 'Distorsión límite (Δ/h)', '0.007'),
    F('Vest', 'Cortante estático (opcional, para el mínimo del Art. 44)', 'V'),
    F('pmin', 'Fracción mínima del cortante estático (0.80 regular / 0.90 irregular)', '0.80'),
    F('sufijo', 'Sufijo de las variables exportadas (p. ej. x, y)', ''),
    F('titulo', 'Título', ''),
  ],
  def: { masas: 'P_i', rigideces: 'Ki', alturas: 'hei', Sa: 'Sa(T)', comb: 'CQC', fdesp: '0.75*R', dlim: '0.007', pmin: '0.80' },
  hint: 'Resuelve K·φ = ω²·M·φ (Jacobi) para un edificio de cortante con diafragmas rígidos (1 GDL por piso). Calcula periodos, formas modales, masas participativas, fuerzas, cortantes, momentos de volteo, desplazamientos y derivas con combinación CQC/SRSS. Exporta <code>T1, T2…</code>, <code>Vdin</code>, <code>Vi_din</code>, <code>Fi_din</code>, <code>ui_din</code>, <code>deriva_din</code>, <code>Mpart</code>, <code>fesc</code>. El espectro es cualquier expresión en <code>T</code> (sirve para E.030, NCh433, BSL…).',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const m = vecSI(b.masas, S, 'mass');
    if (!m || !m.length) throw new Error('Modal: indique los pesos o masas por nivel');
    const Kv = evalAny(b.rigideces, S);
    let Kin;
    const Ka = math.isMatrix(Kv) ? Kv.toArray() : Array.isArray(Kv) ? Kv : [Kv];
    if (Array.isArray(Ka[0])) Kin = Ka.map(r => r.map(x => toSI(x, 'stiff')));
    else Kin = Ka.flat(Infinity).map(x => toSI(x, 'stiff'));
    const he = vecSI(b.alturas, S, 'length');
    const n = m.length;
    if ((Array.isArray(Kin[0]) ? Kin.length : Kin.length) !== n) throw new Error('Modal: el número de rigideces no coincide con el número de niveles (' + n + ')');
    if (!he || he.length !== n) throw new Error('Modal: indique ' + n + ' alturas de entrepiso');
    if (m.some(x => !(x > 0)) || he.some(x => !(x > 0)) || (!Array.isArray(Kin[0]) && Kin.some(x => !(x > 0)))) throw new Error('Modal: masas, rigideces y alturas deben ser positivas');
    const SaFn = makeSaFn(b.Sa || 'Sa(T)', S);
    const comb = ['CQC', 'SRSS', 'ABS'].includes(b.comb) ? b.comb : 'CQC';
    const beta = scal(b.beta, S, 0.05);
    const nmod = parseInt(scal(b.modos, S, n)) || n;
    const r = modalShear(m, Kin, he, SaFn, { comb, beta, nmodes: nmod });
    const fd = scal(b.fdesp, S, 1);
    const dlim = scal(b.dlim, S, 0);
    const drift = r.drift.map((d, i) => fd * d / he[i]);
    const uin = r.u.map(x => fd * x);
    // ---- exportar ----
    r.modes.forEach((md, i) => setVar(ctx, 'T' + (i + 1) + sf, math.unit(md.T, 's')));
    setVar(ctx, 'Vdin' + sf, uF(r.Vb));
    setVar(ctx, 'Vi_din' + sf, vecU(r.V, uF));
    setVar(ctx, 'Fi_din' + sf, vecU(r.F, uF));
    setVar(ctx, 'Mi_din' + sf, vecU(r.Mo, uM));
    setVar(ctx, 'ui_din' + sf, vecU(uin, uL));
    setVar(ctx, 'ue_din' + sf, vecU(r.u, uL));
    setVar(ctx, 'deriva_din' + sf, math.matrix(drift));
    setVar(ctx, 'Mpart' + sf, r.Mpart);
    setVar(ctx, 'Ptot' + sf, uF(r.Mt * G));
    const Vest = String(b.Vest || '').trim() ? scal(b.Vest, S, 0) : 0;
    const pmin = scal(b.pmin, S, 0.8);
    let fesc = 1;
    if (Vest > 0) { fesc = Math.max(1, pmin * Vest / r.Vb); setVar(ctx, 'fesc' + sf, fesc); }
    // ---- figura: formas modales | cortantes | derivas ----
    const W = 720, Hh = 360, top = 34, ph = 240;
    const Hmax = r.H[n - 1];
    let g = '';
    const nshow = Math.min(3, n);
    // formas modales
    { const fr = frame(50, top, 180, ph, [-1.2, 1.2], [0, Hmax], { title: 'Formas modales (φ normalizada)', xl: 'φ', yl: 'Altura [m]', xt: [-1, -0.5, 0, 0.5, 1] });
      g += fr.g;
      for (let k = 0; k < nshow; k++) {
        const md = r.modes[k]; const mx = Math.max(...md.phi.map(Math.abs));
        const pts = [[0, 0], ...md.phi.map((p, i) => [p / mx, r.H[i]])];
        g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + fr.X(p[0]).toFixed(1) + ',' + fr.Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${COLS[k]}" stroke-width="2"/>`;
        pts.slice(1).forEach(p => { g += `<circle cx="${fr.X(p[0]).toFixed(1)}" cy="${fr.Y(p[1]).toFixed(1)}" r="2.8" fill="${COLS[k]}"/>`; });
        g += `<rect x="${20 + k * 90}" y="${top + ph + 40}" width="12" height="3" fill="${COLS[k]}"/>` + T(35 + k * 90, top + ph + 44, `Modo ${k + 1}: ${f2(md.T, 3)} s`, { fs: 9, a: 'start', c: COLS[k] });
      }
    }
    // cortantes
    { const Vm = Math.max(...r.V.map(nf)) * 1.15;
      const fr = frame(290, top, 180, ph, [0, Vm], [0, Hmax], { title: 'Cortante de entrepiso', xl: 'V [' + lblF() + ']', xf: (t) => f2(t, 0) });
      g += fr.g;
      let d = `M${fr.X(0)},${fr.Y(Hmax)}`;
      for (let i = n - 1; i >= 0; i--) { const v = nf(r.V[i]), y1 = fr.Y(r.H[i]), y0 = fr.Y(i ? r.H[i - 1] : 0); d += ` L${fr.X(v).toFixed(1)},${y1.toFixed(1)} L${fr.X(v).toFixed(1)},${y0.toFixed(1)}`; }
      d += ` L${fr.X(0)},${fr.Y(0)} Z`;
      g += `<path d="${d}" fill="${C.blueF}" stroke="${C.blue}" stroke-width="1.6"/>`;
      for (let i = 0; i < n; i++) { const v = nf(r.V[i]); const ym = (fr.Y(r.H[i]) + fr.Y(i ? r.H[i - 1] : 0)) / 2; g += T(fr.X(v) + 3, ym + 3, f2(v, 1), { fs: 9, a: 'start', c: C.blue }); }
    }
    // derivas
    { const dm = Math.max(...drift, dlim || 0) * 1.2 || 0.001;
      const fr = frame(530, top, 170, ph, [0, dm], [0, Hmax], { title: 'Deriva inelástica Δ/h', xl: 'Δ/h', xf: (t) => f2(t, 4) });
      g += fr.g;
      let d = '';
      for (let i = 0; i < n; i++) { const y1 = fr.Y(r.H[i]), y0 = fr.Y(i ? r.H[i - 1] : 0), x = fr.X(drift[i]); d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y0.toFixed(1) + ' L' + x.toFixed(1) + ',' + y1.toFixed(1); }
      g += `<path d="${d}" fill="none" stroke="${C.orange}" stroke-width="2"/>`;
      drift.forEach((dd, i) => { g += `<circle cx="${fr.X(dd).toFixed(1)}" cy="${((fr.Y(r.H[i]) + fr.Y(i ? r.H[i - 1] : 0)) / 2).toFixed(1)}" r="2.6" fill="${C.orange}"/>`; });
      if (dlim > 0) g += Lne(fr.X(dlim), top, fr.X(dlim), top + ph, C.red, 1.4, '5 3') + T(fr.X(dlim) - 3, top + 12, 'límite ' + f2(dlim, 4), { fs: 9, a: 'end', c: C.red });
    }
    let h = `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || `Análisis modal espectral: formas modales, cortantes (${comb}) y derivas inelásticas`)}</div>`;
    // ---- tabla de modos ----
    let acc = 0;
    const rows1 = r.modes.map((md, i) => { acc += md.ratio; return [String(i + 1) + (i < nmod ? '' : ' *'), f2(md.T, 3), f2(md.w, 2), f2(md.Gam, 3), f2(md.ratio * 100, 2), f2(acc * 100, 2), f2(md.Sa / G, 3), f2(nf(md.Vb), 2)]; });
    h += tableHtml(ctx, 'Periodos, factores de participación y masas efectivas', ['Modo', kx('T_n') + ' [s]', kx('\\omega_n') + ' [rad/s]', kx('\\Gamma_n'), kx('M^*_n/M') + ' [%]', kx('\\Sigma') + ' [%]', kx('S_a/g'), kx('V_{b,n}') + ` [${lblF()}]`], rows1);
    const rows2 = [];
    for (let i = n - 1; i >= 0; i--) rows2.push([String(i + 1), f2(r.H[i], 2), f2(nf(m[i] * G), 2), f2(nf(r.F[i]), 2), f2(nf(r.V[i]), 2), f2(nm(r.Mo[i]), 2), f2(nl(uin[i]), 3), f2(drift[i], 3), dlim > 0 ? okMark(drift[i] <= dlim) : '—']);
    h += tableHtml(ctx, `Respuesta combinada (${comb}) por nivel; desplazamientos y derivas inelásticos (× ${f2(fd, 3)})`, ['Nivel', kx('h_i') + ' [m]', kx('P_i') + ` [${lblF()}]`, kx('F_i') + ` [${lblF()}]`, kx('V_i') + ` [${lblF()}]`, kx('M_i') + ` [${lblM()}]`, kx('u_i') + ` [${lblL()}]`, kx('\\Delta_i/h_i'), 'Estado'], rows2);
    // ---- verificaciones ----
    h += chkLine(ctx, r.Mpart >= 0.9 - 1e-9, `\\sum M^*_n/M = ${f2(r.Mpart * 100, 2)}\\,\\% \\;\\ge\\; 90\\,\\%`, `Masa participativa de los ${nmod} modos combinados (E.030 Art. 40.2)`, 0.9 / r.Mpart);
    if (dlim > 0) { const dmax = Math.max(...drift); h += chkLine(ctx, dmax <= dlim, `\\left(\\Delta/h\\right)_{max} = ${f2(dmax, 3)} \\;\\le\\; ${f2(dlim, 4)}`, 'Distorsión inelástica máxima de entrepiso (E.030 Art. 51, Tabla N° 14)', dmax / dlim); }
    if (Vest > 0) h += `<div class="txt">Cortante basal dinámico ${K('V_{din} = ' + f2(nf(r.Vb), 2) + '\\,\\mathrm{' + lblF() + '}')}; mínimo ${K(f2(pmin, 2) + '\\,V_{est} = ' + f2(nf(pmin * Vest), 2) + '\\,\\mathrm{' + lblF() + '}')} → factor de escala de fuerzas ${K('f_{esc} = ' + f2(fesc, 3))} (los desplazamientos no se escalan, Art. 44.2).</div>`;
    return h;
  },
});

// =====================================================================
//  2) DISTRIBUCIÓN DE FUERZAS SÍSMICAS ESTÁTICAS EN ALTURA
// =====================================================================
registerBlock('storyforces', {
  name: 'Fuerzas sísmicas por nivel (E.030 Art. 35)', icon: 'quake', group: 'Sismo',
  fields: [
    F('P', 'Pesos sísmicos por nivel (1 → n)', 'P_i'),
    F('hi', 'Altura de cada nivel desde la base (1 → n) [m]', 'h_i'),
    F('V', 'Fuerza cortante en la base', 'V'),
    F('k', 'Exponente k (vacío = calcular con T)', ''),
    F('T', 'Periodo fundamental T (para k, Art. 35.2)', 'T'),
    F('B', 'Dimensión en planta perpendicular al sismo (torsión accidental 5 %, Art. 37)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''),
    F('titulo', 'Título', ''),
  ],
  def: { P: 'P_i', hi: 'h_i', V: 'V', T: 'T', B: '' },
  hint: 'Calcula αi = Pi·hi^k/ΣPj·hj^k, Fi = αi·V, cortantes, momentos de volteo y momentos torsores accidentales Mti = Fi·0.05·B. Dibuja elevación con fuerzas, diagrama de cortantes y de momentos de volteo. Exporta <code>alpha_e, Fi_e, Vi_e, Mi_e, Mt_e, Mvol</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const P = vecSI(b.P, S, 'force'), hi = vecSI(b.hi, S, 'length');
    if (!P || !hi || P.length !== hi.length) throw new Error('Fuerzas por nivel: pesos y alturas deben tener el mismo número de niveles');
    const n = P.length;
    for (let i = 1; i < n; i++) if (!(hi[i] > hi[i - 1])) throw new Error('Las alturas de nivel deben ser crecientes (acumuladas desde la base)');
    const V = scal(b.V, S, 0); if (!(V > 0)) throw new Error('Indique la fuerza cortante en la base V');
    let k;
    if (String(b.k || '').trim()) k = scal(b.k, S, 1);
    else { const Tt = String(b.T || '').trim() ? evalParam(b.T, S, 's', 0) : 0; k = Tt <= 0.5 ? 1 : Math.min(0.75 + 0.5 * Tt, 2); }
    const w = P.map((p, i) => p * hi[i] ** k), sw = sum(w);
    const al = w.map(x => x / sw), Fi = al.map(a => a * V);
    const Vi = Fi.map((_, i) => sum(Fi.slice(i)));
    const Mi = Fi.map((_, i) => { let t = 0; for (let j = i; j < n; j++) t += Fi[j] * (hi[j] - (i ? hi[i - 1] : 0)); return t; });
    const Mb = sum(Fi.map((f, i) => f * hi[i]));
    const B = String(b.B || '').trim() ? evalParam(b.B, S, 'm', 0) : 0;
    const Mt = Fi.map(f => f * 0.05 * B);
    setVar(ctx, 'alpha_e' + sf, math.matrix(al));
    setVar(ctx, 'Fi_e' + sf, vecU(Fi, uF));
    setVar(ctx, 'Vi_e' + sf, vecU(Vi, uF));
    setVar(ctx, 'Mi_e' + sf, vecU(Mi, uM));
    setVar(ctx, 'Mvol' + sf, uM(Mb));
    if (B > 0) setVar(ctx, 'Mt_e' + sf, vecU(Mt, uM));
    // ---- figura ----
    const W = 720, H = 340, top = 34, ph = 250, Hm = hi[n - 1];
    let g = arrowDefs;
    // elevación
    { const x0 = 40, wB = 120, Y = (z) => top + ph - z / Hm * ph;
      g += T(x0 + 100, top - 8, 'Elevación y fuerzas Fi', { fs: 11, b: 1 });
      g += `<rect x="${x0 - 12}" y="${Y(0)}" width="${wB + 24}" height="8" fill="url(#hatch)" stroke="none"/>` + Lne(x0 - 12, Y(0), x0 + wB + 12, Y(0), C.ink, 1.4);
      for (let i = 0; i < n; i++) {
        const y1 = Y(hi[i]), y0 = Y(i ? hi[i - 1] : 0);
        g += Lne(x0, y0, x0, y1, C.ink, 2) + Lne(x0 + wB / 2, y0, x0 + wB / 2, y1, C.ink, 1.2) + Lne(x0 + wB, y0, x0 + wB, y1, C.ink, 2) + Lne(x0 - 2, y1, x0 + wB + 2, y1, C.ink, 3);
        const L = 18 + 50 * Fi[i] / Math.max(...Fi);
        g += `<line x1="${(x0 + wB + 6 + L).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x0 + wB + 6).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>`;
        g += T(x0 + wB + 10 + L, y1 + 3, `F${i + 1} = ${f2(nf(Fi[i]), 1)}`, { fs: 9, a: 'start', c: C.red });
        g += T(x0 - 6, y1 + 3, f2(hi[i], 2), { fs: 8, a: 'end', c: C.axis });
      }
    }
    // cortantes
    { const Vm = nf(Vi[0]) * 1.15;
      const fr = frame(345, top, 160, ph, [0, Vm], [0, Hm], { title: 'Cortante Vi [' + lblF() + ']', xf: (t) => f2(t, 0), yl: 'Altura [m]' });
      g += fr.g;
      let d = `M${fr.X(0)},${fr.Y(Hm)}`;
      for (let i = n - 1; i >= 0; i--) { const v = nf(Vi[i]); d += ` L${fr.X(v).toFixed(1)},${fr.Y(hi[i]).toFixed(1)} L${fr.X(v).toFixed(1)},${fr.Y(i ? hi[i - 1] : 0).toFixed(1)}`; }
      d += ` L${fr.X(0)},${fr.Y(0)} Z`;
      g += `<path d="${d}" fill="${C.blueF}" stroke="${C.blue}" stroke-width="1.6"/>`;
      for (let i = 0; i < n; i++) g += T(fr.X(nf(Vi[i])) + 3, (fr.Y(hi[i]) + fr.Y(i ? hi[i - 1] : 0)) / 2 + 3, f2(nf(Vi[i]), 1), { fs: 9, a: 'start', c: C.blue });
    }
    // momentos de volteo
    { const Mm = nm(Mb) * 1.15;
      const fr = frame(545, top, 160, ph, [0, Mm], [0, Hm], { title: 'Momento de volteo [' + lblM() + ']', xf: (t) => f2(t, 0) });
      g += fr.g;
      const pts = [[0, Hm]]; for (let i = n - 1; i >= 0; i--) pts.push([nm(Mi[i]), i ? hi[i - 1] : 0]);
      g += `<path d="M${fr.X(0)},${fr.Y(Hm)} ${pts.map(p => 'L' + fr.X(p[0]).toFixed(1) + ',' + fr.Y(p[1]).toFixed(1)).join(' ')} L${fr.X(0)},${fr.Y(0)} Z" fill="${C.greenF}" stroke="${C.green}" stroke-width="1.6"/>`;
      g += T(fr.X(0) + 5, fr.Y(0) - 6, 'Base: ' + f2(nm(Mb), 1), { fs: 9, a: 'start', c: C.green, b: 1 });
    }
    let h = `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || `Distribución de la fuerza sísmica en altura (k = ${f2(k, 3)}), cortantes y momentos de volteo`)}</div>`;
    const rows = [];
    for (let i = n - 1; i >= 0; i--) rows.push([String(i + 1), f2(hi[i], 2), f2(nf(P[i]), 2), f2(nf(w[i]), 1), f2(al[i], 3), f2(nf(Fi[i]), 2), f2(nf(Vi[i]), 2), f2(nm(Mi[i]), 2), ...(B > 0 ? [f2(nm(Mt[i]), 2)] : [])]);
    const heads = ['Nivel', kx('h_i') + ' [m]', kx('P_i') + ` [${lblF()}]`, kx('P_i h_i^k'), kx('\\alpha_i'), kx('F_i') + ` [${lblF()}]`, kx('V_i') + ` [${lblF()}]`, kx('M_{v,i}') + ` [${lblM()}]`, ...(B > 0 ? [kx('M_{t,i}=0.05B\\,F_i') + ` [${lblM()}]`] : [])];
    h += tableHtml(ctx, 'Fuerzas sísmicas por nivel (E.030 Art. 35 y 37)', heads, rows, ['Σ', '', f2(nf(sum(P)), 2), f2(nf(sw), 1), f2(sum(al), 3), f2(nf(V), 2), '', '', ...(B > 0 ? [''] : [])]);
    return h;
  },
});

// =====================================================================
//  3) IRREGULARIDADES ESTRUCTURALES E.030 (Tablas N° 11, 12 y 13)
// =====================================================================
registerBlock('irregE030', {
  name: 'Irregularidades E.030 (Tablas 11, 12 y 13)', icon: 'table', group: 'Sismo',
  fields: [
    F('K', 'Rigidez lateral por entrepiso Ki = Vi/Δi (1 → n)', 'Ki'),
    F('Vr', 'Resistencia al corte por entrepiso (opcional)', ''),
    F('P', 'Peso por nivel (opcional, irregularidad de masa)', ''),
    F('D', 'Dimensión en planta del sistema resistente por nivel (opcional)', ''),
    F('Dmax', 'Δmax de entrepiso en el extremo (opcional, torsión)', ''),
    F('Dprom', 'Δprom de entrepiso (opcional, torsión)', ''),
    F('deriva', 'Deriva inelástica por entrepiso (para el criterio del 50 %)', ''),
    F('dlim', 'Distorsión límite (Tabla N° 14)', '0.007'),
    F('disc', 'Discontinuidad de sistemas resistentes', '', 'select', [['0', 'No existe'], ['1', 'Discontinuidad (Ia = 0.80)'], ['2', 'Discontinuidad extrema (Ia = 0.60)']]),
    F('esq', 'Esquinas entrantes (>20 % en ambas direcciones)', '', 'check'),
    F('diaf', 'Discontinuidad del diafragma', '', 'check'),
    F('nopar', 'Sistemas no paralelos', '', 'check'),
    F('cat', 'Categoría: A1, A2, B, C (o expresión con el factor U: 1.5 → A2, 1.3 → B, 1.0 → C)', 'C'),
    F('zona', 'Zona sísmica 1–4 (número o variable)', 'zona'),
    F('npisos', 'N.º de pisos y altura (para la excepción de la Tabla 13, zona 2)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''),
  ],
  def: { K: 'Ki', dlim: '0.007', disc: '0', cat: 'C', zona: '4' },
  hint: 'Evalúa por entrepiso las irregularidades de rigidez (piso blando y extrema), resistencia, masa, geometría vertical y torsión; agrega las cualitativas marcadas. Determina Ia e Ip (el menor valor), y verifica las restricciones de la Tabla N° 13 según categoría y zona. Exporta <code>Ia_ev, Ip_ev, irrext</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const Kv = vecSI(b.K, S, 'stiff'); if (!Kv || !Kv.length) throw new Error('Irregularidades: indique las rigideces de entrepiso');
    const n = Kv.length;
    const opt = (k, kind) => { const s = String(b[k] || '').trim(); if (!s) return null; const v = vecSI(s, S, kind); if (v.length !== n) throw new Error('Irregularidades: "' + k + '" debe tener ' + n + ' valores'); return v; };
    const Vr = opt('Vr', 'force'), P = opt('P', 'force'), Dd = opt('D', 'length'), Dmx = opt('Dmax', 'length'), Dpr = opt('Dprom', 'length'), dr = opt('deriva', 'none');
    const dlim = scal(b.dlim, S, 0.007);
    const { r1, r3 } = stiffRatios(Kv);
    const items = [];
    const fRig = IaRig(Kv);
    items.push({ t: 'Rigidez – piso blando', c: 'Ki < 0.70 Ki+1 ó < 0.80 prom(3 sup.)', ex: fRig === 0.75, f: 0.75, tab: 'a' });
    items.push({ t: 'Irregularidad extrema de rigidez', c: 'Ki < 0.60 Ki+1 ó < 0.70 prom(3 sup.)', ex: fRig === 0.5, f: 0.5, tab: 'a', ext: 1 });
    let fRes = 1; if (Vr) fRes = IaRes(Vr);
    items.push({ t: 'Resistencia – piso débil', c: 'Vr,i < 0.80 Vr,i+1', ex: fRes === 0.75, f: 0.75, tab: 'a', nv: !Vr });
    items.push({ t: 'Irregularidad extrema de resistencia', c: 'Vr,i < 0.65 Vr,i+1', ex: fRes === 0.5, f: 0.5, tab: 'a', nv: !Vr, ext: 1 });
    const fMas = P ? IaMas(P) : 1; items.push({ t: 'Masa o peso', c: 'Pi > 1.5 P adyacente (sin azotea)', ex: fMas < 1, f: 0.9, tab: 'a', nv: !P });
    const fGeo = Dd ? IaGeo(Dd) : 1; items.push({ t: 'Geometría vertical', c: 'Di > 1.3 D adyacente (sin azotea)', ex: fGeo < 1, f: 0.9, tab: 'a', nv: !Dd });
    const flag = (v) => { if (typeof v === 'boolean') return v; const t = String(v ?? '').trim(); if (!t || t === 'false') return false; if (t === 'true') return true; return scal(t, S, 0); };
    const disc = Math.round(Number(flag(b.disc)) || 0);
    items.push({ t: 'Discontinuidad en sistemas resistentes', c: 'desalineamiento > 25 % (elem. > 10 % V)', ex: disc === 1, f: 0.8, tab: 'a', man: 1 });
    items.push({ t: 'Discontinuidad extrema', c: 'elementos discontinuos > 25 % V', ex: disc === 2, f: 0.6, tab: 'a', man: 1, ext: 1 });
    let fTor = 1; const rt = Dmx && Dpr ? Dmx.map((x, i) => x / Dpr[i]) : null;
    if (rt) fTor = IpTor(Dmx, Dpr, dr, dr ? dlim : null);
    items.push({ t: 'Irregularidad torsional', c: 'Δmax > 1.3 Δprom (si deriva > 0.5 lím.)', ex: fTor === 0.75, f: 0.75, tab: 'p', nv: !rt });
    items.push({ t: 'Irregularidad torsional extrema', c: 'Δmax > 1.5 Δprom (si deriva > 0.5 lím.)', ex: fTor === 0.6, f: 0.6, tab: 'p', nv: !rt, ext: 1 });
    items.push({ t: 'Esquinas entrantes', c: '> 20 % de la dimensión en ambas direcciones', ex: !!flag(b.esq), f: 0.9, tab: 'p', man: 1 });
    items.push({ t: 'Discontinuidad del diafragma', c: 'aberturas > 50 % ó sección neta < 50 %', ex: !!flag(b.diaf), f: 0.85, tab: 'p', man: 1 });
    items.push({ t: 'Sistemas no paralelos', c: 'ejes a ≥ 30° que resisten ≥ 10 % V', ex: !!flag(b.nopar), f: 0.9, tab: 'p', man: 1 });
    const Ia = Math.min(1, ...items.filter(x => x.tab === 'a' && x.ex).map(x => x.f));
    const Ip = Math.min(1, ...items.filter(x => x.tab === 'p' && x.ex).map(x => x.f));
    const anyIrr = items.some(x => x.ex), ext = items.some(x => x.ex && x.ext);
    setVar(ctx, 'Ia_ev' + sf, Ia); setVar(ctx, 'Ip_ev' + sf, Ip); setVar(ctx, 'irrext' + sf, ext ? 1 : 0);
    // ---- tabla por entrepiso ----
    const rows = [];
    for (let i = n - 1; i >= 0; i--) {
      const c1 = r1[i] === null ? '—' : f2(r1[i], 3) + ' ' + okMark(r1[i] >= 0.7);
      const c3 = r3[i] === null ? '—' : f2(r3[i], 3) + ' ' + okMark(r3[i] >= 0.8);
      const cv = Vr ? (i < n - 1 ? f2(Vr[i] / Vr[i + 1], 3) + ' ' + okMark(Vr[i] / Vr[i + 1] >= 0.8) : '—') : '';
      const cp = P ? (i < n - 1 ? f2(Math.max(i > 0 ? P[i] / P[i - 1] : 0, i < n - 2 ? P[i] / P[i + 1] : 0), 3) : 'azotea') : '';
      const ct = rt ? f2(rt[i], 3) + ' ' + okMark(rt[i] <= 1.3 || (dr && !(dr[i] > 0.5 * dlim))) : '';
      rows.push([String(i + 1), f2(Kv[i] / math.unit(1, prefK()).toNumber('N/m'), 0), c1, c3, ...(Vr ? [cv] : []), ...(P ? [cp] : []), ...(rt ? [ct] : []), ...(dr ? [f2(dr[i], 3) + (dr[i] > 0.5 * dlim ? ' (> 50 %)' : '')] : [])]);
    }
    const heads = ['Entrepiso', kx('K_i') + ` [${prefK().replace('*', '·')}]`, kx('K_i/K_{i+1}'), kx('K_i/\\bar K_{i+1..i+3}'), ...(Vr ? [kx('V_{r,i}/V_{r,i+1}')] : []), ...(P ? [kx('P_i/P_{ady}')] : []), ...(rt ? [kx('\\Delta_{max}/\\Delta_{prom}')] : []), ...(dr ? [kx('\\Delta_i/h_i')] : [])];
    let h = tableHtml(ctx, 'Indicadores de irregularidad por entrepiso', heads, rows);
    const rows2 = items.map(x => [(x.tab === 'a' ? 'Altura' : 'Planta'), esc(x.t) + (x.ext ? ' <sup>(T13)</sup>' : ''), esc(x.c), x.nv ? '<i>no evaluado</i>' : (x.ex ? `<b style="color:${C.red}">Sí</b>` : 'No') + (x.man ? ' <sup>†</sup>' : ''), x.ex ? f2(x.f, 2) : '1.00']);
    h += tableHtml(ctx, 'Irregularidades estructurales (E.030-2026 Tablas N° 11 y 12)', ['Tipo', 'Irregularidad', 'Criterio', '¿Existe?', 'Factor'], rows2);
    h += `<div class="txt muted">† Evaluación por configuración (dato del proyectista). (T13) Irregularidad extrema sujeta a la Tabla N° 13.</div>`;
    h += `<div class="txt">Factores resultantes (menor valor de cada tabla, Art. 24): ${K('I_a = ' + f2(Ia, 2))}, ${K('I_p = ' + f2(Ip, 2))} → estructura <b>${anyIrr ? 'irregular' : 'regular'}</b>.</div>`;
    // ---- Tabla 13 ----
    let cat = String(b.cat || 'C').trim().toUpperCase();
    if (!['A1', 'A2', 'B', 'C'].includes(cat)) { const u = scal(b.cat, S, 1); cat = u >= 1.45 ? 'A2' : u >= 1.25 ? 'B' : 'C'; }
    const zona = Math.round(scal(b.zona, S, 4));
    if (!(zona >= 1 && zona <= 4)) throw new Error('Irregularidades: la zona sísmica debe ser 1, 2, 3 o 4');
    const np = String(b.npisos || '').trim() ? evalAny(b.npisos, S) : null;
    let allowIrr = true, allowExt = true, txt = 'Sin restricciones';
    if (cat === 'A1' || cat === 'A2') { if (zona >= 2) { allowIrr = false; allowExt = false; txt = 'No se permiten irregularidades'; } else { allowExt = false; txt = 'No se permiten irregularidades extremas'; } }
    else if (cat === 'B') { if (zona >= 2) { allowExt = false; txt = 'No se permiten irregularidades extremas'; } }
    else { if (zona >= 3) { allowExt = false; txt = 'No se permiten irregularidades extremas'; } else if (zona === 2) { const a = np ? (math.isMatrix(np) ? np.toArray() : [np]) : []; const pis = a.length ? Number(math.isUnit(a[0]) ? a[0].value : a[0]) : 99; const alt = a.length > 1 ? (math.isUnit(a[1]) ? a[1].value : Number(a[1])) : 99; allowExt = pis <= 2 || alt <= 8; txt = 'No se permiten irregularidades extremas excepto edificios de hasta 2 pisos u 8 m'; } }
    const ok = (allowIrr || !anyIrr) && (allowExt || !ext);
    h += chkLine(ctx, ok, `\\text{Categoría ${cat}, zona ${zona}: ${txt.replace(/%/g, '\\%')}}`, 'Restricciones a la irregularidad (E.030-2026 Art. 25, Tabla N° 13)', null);
    return h;
  },
});

// =====================================================================
//  4) SISTEMA DE AISLAMIENTO BILINEAL (LRB / HDR) — E.031
// =====================================================================
registerBlock('lrb', {
  name: 'Aislamiento bilineal LRB (E.031)', icon: 'spectrum', group: 'Sismo',
  fields: [
    F('N', 'Número de aisladores', '20'),
    F('Qd', 'Resistencia característica Qd por aislador (nominal)', '9 tonf'),
    F('kd', 'Rigidez post-fluencia kd por aislador (nominal)', '90 tonf/m'),
    F('Dy', 'Desplazamiento de fluencia Dy', '1.5 cm'),
    F('W', 'Peso sísmico total sobre la interfaz P', 'P'),
    F('SaM', 'Espectro SMC en función de T (Sa/g o aceleración)', 'SaME031(T, Z, S, Tp, Tl)'),
    F('lQmax', 'λmax de Qd', '1.5'), F('lQmin', 'λmin de Qd', '0.8'),
    F('lkmax', 'λmax de kd', '1.3'), F('lkmin', 'λmin de kd', '0.8'),
    F('titulo', 'Título', ''),
  ],
  def: { N: '20', Qd: 'Qd', kd: 'kd', Dy: 'Dy', W: 'P', SaM: 'SaME031(T, Z, S, Tp, Tl)', lQmax: '1.5', lQmin: '0.8', lkmax: '1.3', lkmin: '0.8' },
  hint: 'Itera DM = SaM(TM)·TM²/(4π²·BM) con keff = Qd/D + kd, βeff = 4Qd(D − Dy)/(2π·keff·D²) y TM = 2π√(P/(keff·g)) para las propiedades de límite inferior, nominal y superior (E.031 Art. 13, 20). Exporta <code>D_M_inf, D_M_nom, D_M_sup, kM_*, beta_M_*, T_M_*, B_M_*, Sa_M_*, Vb_*, Qd_*, kd_*</code>.',
  render(b, ctx) {
    const S = ctx.scope;
    const N = scal(b.N, S, 1), Qd = scal(b.Qd, S, 0), kd = scal(b.kd, S, 0), Dy = evalParam(b.Dy, S, 'm', 0.01), Wt = scal(b.W, S, 0);
    if (!(N >= 1 && Qd > 0 && kd > 0 && Wt > 0 && Dy > 0)) throw new Error('LRB: N, Qd, kd, Dy y P deben ser positivos');
    if (math.isUnit(math.evaluate(String(b.Qd), new Map(S))) === false) throw new Error('LRB: Qd debe tener unidades de fuerza');
    const SaFn = makeSaFn(b.SaM || 'SaME031(T, Z, S, Tp, Tl)', S);
    const lam = { inf: [scal(b.lQmin, S, 0.8), scal(b.lkmin, S, 0.8)], nom: [1, 1], sup: [scal(b.lQmax, S, 1.5), scal(b.lkmax, S, 1.3)] };
    const res = {};
    for (const [key, [lq, lk]] of Object.entries(lam)) {
      const Q = Qd * lq * N, kk = kd * lk * N;           // sistema completo
      let D = 0.25, hist = [];
      for (let it = 0; it < 200; it++) {
        const Dc = Math.max(D, Dy * 1.0001);
        const ke = Q / Dc + kk, be = Math.max(0, 4 * Q * (Dc - Dy) / (2 * Math.PI * ke * Dc * Dc));
        const Tm = 2 * Math.PI * Math.sqrt(Wt / (ke * G)), Bm = BME031num(be * 100), Sa = SaFn(Tm);
        const Dn = Sa * Tm * Tm / (4 * Math.PI ** 2 * Bm);
        hist.push({ D: Dc, ke, be, Tm, Bm, Sa, Dn });
        if (Math.abs(Dn - D) < 1e-6) { D = Dn; break; }
        D = 0.5 * D + 0.5 * Dn;
      }
      const Dc = Math.max(D, Dy * 1.0001), ke = Q / Dc + kk, be = Math.max(0, 4 * Q * (Dc - Dy) / (2 * Math.PI * ke * Dc * Dc));
      const Tm = 2 * Math.PI * Math.sqrt(Wt / (ke * G)), Bm = BME031num(be * 100), Sa = SaFn(Tm);
      res[key] = { Q, kk, D: Dc, ke, be, Tm, Bm, Sa, Vb: ke * Dc, hist, lq, lk };
      setVar(ctx, 'D_M_' + key, uL(Dc)); setVar(ctx, 'kM_' + key, math.unit(ke, 'N/m').to(prefK()));
      setVar(ctx, 'beta_M_' + key, be); setVar(ctx, 'T_M_' + key, math.unit(Tm, 's')); setVar(ctx, 'B_M_' + key, Bm);
      setVar(ctx, 'Sa_M_' + key, Sa / G); setVar(ctx, 'Vb_' + key, uF(ke * Dc)); setVar(ctx, 'Qd_' + key, uF(Q)); setVar(ctx, 'kd_' + key, math.unit(kk, 'N/m').to(prefK()));
    }
    // ---- figura: lazos histeréticos de un aislador + espectro de desplazamientos ----
    const W = 720, H = 320, top = 30, ph = 240;
    let g = '';
    { const Dm = Math.max(res.inf.D, res.sup.D) * 1.2, Fm = Math.max(...['inf', 'sup'].map(k => (res[k].Q + res[k].kk * res[k].D) / N)) * 1.25;
      const fr = frame(70, top, 290, ph, [-nl(Dm), nl(Dm)], [-nf(Fm), nf(Fm)], { title: 'Lazo bilineal de un aislador (límites inferior y superior)', xl: 'D [' + lblL() + ']', yl: 'F [' + lblF() + ']', xf: (t) => f2(t, 0) });
      g += fr.g + Lne(fr.X(-nl(Dm)), fr.Y(0), fr.X(nl(Dm)), fr.Y(0), C.ink, 0.9);
      ['inf', 'sup'].forEach((k, ci) => {
        const r = res[k], q = r.Q / N, kdd = r.kk / N, ku = q / Dy + kdd, Dmx = r.D;
        const Fy = ku * Dy, Fmx = q + kdd * Dmx;
        // lazo: (−D,−Fmax) → carga hasta (+D,+Fmax) → descarga
        const pts = [[-Dmx, -Fmx], [-Dmx + 2 * Dy, -Fmx + 2 * ku * Dy], [Dmx, Fmx], [Dmx - 2 * Dy, Fmx - 2 * ku * Dy], [-Dmx, -Fmx]];
        const col = ci ? C.red : C.blue;
        g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + fr.X(nl(p[0])).toFixed(1) + ',' + fr.Y(nf(p[1])).toFixed(1)).join(' ')} Z" fill="${ci ? C.redF : C.blueF}" stroke="${col}" stroke-width="1.6"/>`;
        g += Lne(fr.X(-nl(Dmx)), fr.Y(-nf(Fmx)), fr.X(nl(Dmx)), fr.Y(nf(Fmx)), col, 1, '4 3');
        g += `<rect x="${fr.X(-nl(Dm)) + 8}" y="${top + 9 + ci * 13}" width="12" height="3" fill="${col}"/>` + T(fr.X(-nl(Dm)) + 24, top + 13 + ci * 13, `${k === 'inf' ? 'Límite inferior' : 'Límite superior'}: DM = ${f2(nl(Dmx), 1)} ${lblL()}`, { fs: 9, a: 'start', c: col });
        void Fy;
      });
    }
    { const Tmax = Math.max(5, res.inf.Tm * 1.4), Ds = [];
      for (let i = 1; i <= 120; i++) { const t = Tmax * i / 120; Ds.push([t, SaFn(t) * t * t / (4 * Math.PI ** 2)]); }
      const ymx = Math.max(...Ds.map(d => d[1])) * 1.1;
      const fr = frame(430, top, 270, ph, [0, Tmax], [0, nl(ymx)], { title: 'Espectro de desplazamientos SMC (5 %) y DM', xl: 'T [s]', xf: (t) => f2(t, 1), yf: (t) => f2(t, 0) });
      g += fr.g + `<path d="${Ds.map((d, i) => (i ? 'L' : 'M') + fr.X(d[0]).toFixed(1) + ',' + fr.Y(nl(d[1])).toFixed(1)).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
      ['inf', 'nom', 'sup'].forEach((k, ci) => { const r = res[k], col = [C.blue, C.green, C.red][ci]; g += `<circle cx="${fr.X(r.Tm).toFixed(1)}" cy="${fr.Y(nl(r.D)).toFixed(1)}" r="4" fill="${col}" stroke="#fff"/>` + `<circle cx="${fr.X(Tmax * 0.36)}" cy="${top + ph - 52 + ci * 13}" r="3.5" fill="${col}"/>` + T(fr.X(Tmax * 0.36) + 8, top + ph - 49 + ci * 13, `${{ inf: 'Inferior', nom: 'Nominal', sup: 'Superior' }[k]}: TM = ${f2(r.Tm, 2)} s, DM = ${f2(nl(r.D), 1)} ${lblL()}`, { fs: 9, a: 'start', c: col }); });
      g += T(fr.X(Tmax * 0.36) - 4, top + ph - 66, 'Sd = SaM·T²/4π² (5 %) · DM = Sd/BM', { fs: 9, a: 'start', c: C.axis });
    }
    let h = `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Sistema de aislamiento: lazos histeréticos y desplazamiento traslacional DM')}</div>`;
    const rows = ['inf', 'nom', 'sup'].map(k => { const r = res[k]; return [{ inf: 'Inferior', nom: 'Nominal', sup: 'Superior' }[k], f2(r.lq, 2) + ' / ' + f2(r.lk, 2), f2(nf(r.Q), 2), f2(r.kk / math.unit(1, prefK()).toNumber('N/m'), 1), f2(nl(r.D), 2), f2(r.ke / math.unit(1, prefK()).toNumber('N/m'), 1), f2(r.be * 100, 2), f2(r.Tm, 3), f2(r.Bm, 3), f2(r.Sa / G, 3), f2(nf(r.Vb), 1), String(r.hist.length)]; });
    h += tableHtml(ctx, 'Propiedades del sistema de aislamiento por límite (iteración hasta convergencia de DM)', ['Límite', kx('\\lambda_{Q}/\\lambda_{k}'), kx('\\Sigma Q_d') + ` [${lblF()}]`, kx('\\Sigma k_d') + ` [${prefK().replace('*', '·')}]`, kx('D_M') + ` [${lblL()}]`, kx('k_M') + ` [${prefK().replace('*', '·')}]`, kx('\\beta_M') + ' [%]', kx('T_M') + ' [s]', kx('B_M'), kx('S_{aM}/g'), kx('V_b=k_M D_M') + ` [${lblF()}]`, 'Iter.'], rows);
    return h;
  },
});

// =====================================================================
//  5) PRESIONES DE VIENTO SOBRE NAVE A DOS AGUAS (E.020)
// =====================================================================
registerBlock('windgable', {
  name: 'Viento sobre nave a dos aguas (E.020)', icon: 'plot', group: 'Cargas',
  fields: [
    F('B', 'Ancho de la nave (dirección del viento)', 'B'), F('H', 'Altura de alero', 'Ha'), F('th', 'Pendiente del techo', 'theta'),
    F('p1', 'Presión muro barlovento (+ presión / − succión)', 'p_mb'), F('p2', 'Presión techo barlovento', 'p_tb'),
    F('p3', 'Presión techo sotavento', 'p_ts'), F('p4', 'Presión muro sotavento', 'p_ms'),
    F('pi', 'Presión interior (texto informativo, opcional)', ''), F('titulo', 'Título', ''),
  ],
  def: { B: 'B', H: 'Ha', th: 'theta', p1: 'p_mb', p2: 'p_tb', p3: 'p_ts', p4: 'p_ms' },
  hint: 'Dibuja la sección transversal de una nave a dos aguas con las presiones (flechas hacia la superficie) y succiones (flechas saliendo) de E.020 Art. 12.4 con viento de izquierda a derecha.',
  render(b, ctx) {
    const S = ctx.scope;
    const B = evalParam(b.B, S, 'm', 20), Hh = evalParam(b.H, S, 'm', 6);
    const thv = math.evaluate(String(b.th || '15 deg'), new Map(S)); const th = math.isUnit(thv) ? thv.toNumber('rad') : Number(thv) * Math.PI / 180;
    const P = ['p1', 'p2', 'p3', 'p4'].map(k => evalParam(b[k], S, 'kgf/m^2', 0));
    const pu = settings.sys === 'tec' ? 'kgf/m²' : settings.sys === 'si' ? 'kPa' : 'psf';
    const pc = (v) => settings.sys === 'tec' ? v : settings.sys === 'si' ? v * G / 1000 : v * 0.204816;
    const W = 720, H = 330, x0 = 220, wB = 300, sc = wB / B, yb = 285;
    const hr = B / 2 * Math.tan(th), Ht = Hh + hr;
    const scy = Math.min(sc, 200 / Ht);
    const X = (x) => x0 + x * sc, Y = (z) => yb - z * scy;
    let g = arrowDefs;
    g += `<rect x="${x0 - 40}" y="${yb}" width="${wB + 80}" height="10" fill="url(#hatch)"/>` + Lne(x0 - 40, yb, x0 + wB + 40, yb, C.ink, 1.4);
    g += `<path d="M${X(0)},${Y(0)} L${X(0)},${Y(Hh)} L${X(B / 2)},${Y(Ht)} L${X(B)},${Y(Hh)} L${X(B)},${Y(0)}" fill="${C.conc}" stroke="${C.ink}" stroke-width="2.2"/>`;
    // viento
    for (let k = 0; k < 3; k++) { const y = Y(Ht * 1.05) + 8 + k * 12; g += `<line x1="20" y1="${y}" x2="70" y2="${y}" stroke="${C.axis}" stroke-width="1.6" marker-end="url(#ar)"/>`; }
    g += T(45, Y(Ht * 1.05) - 2, 'VIENTO', { fs: 10, b: 1, c: C.axis });
    const arrows = (xa, ya, xb, yb2, nx, ny, p, lbl) => {
      // superficie de (xa,ya) a (xb,yb2) en px; normal exterior (nx, ny); p > 0 presión (hacia la superficie)
      let s = ''; const L = 14 + 26 * Math.min(1, Math.abs(p) / Math.max(...P.map(Math.abs), 1e-9)); const col = p >= 0 ? C.red : C.blue;
      for (let k = 1; k <= 4; k++) {
        const t = k / 5, px = xa + (xb - xa) * t, py = ya + (yb2 - ya) * t;
        const ox = px + nx * (L + 4), oy = py + ny * (L + 4), ix = px + nx * 4, iy = py + ny * 4;
        s += p >= 0 ? `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="${col}" stroke-width="1.6" marker-end="url(#arr)"/>` : `<line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${ox.toFixed(1)}" y2="${oy.toFixed(1)}" stroke="${col}" stroke-width="1.6" marker-end="url(#arr)"/>`;
      }
      const mx = (xa + xb) / 2 + nx * (L + 20), my = (ya + yb2) / 2 + ny * (L + 20);
      s += T(mx, my, `${lbl}: ${p >= 0 ? '+' : ''}${f2(pc(p), 1)} ${pu}`, { fs: 10, c: col, b: 1, a: nx < -0.5 ? 'end' : nx > 0.5 ? 'start' : 'middle' });
      return s;
    };
    const nr = [-Math.sin(th), -Math.cos(th)];
    g += arrows(X(0), Y(0), X(0), Y(Hh), -1, 0, P[0], 'Barlovento');
    g += arrows(X(0), Y(Hh), X(B / 2), Y(Ht), nr[0], nr[1], P[1], 'Techo barl.');
    g += arrows(X(B / 2), Y(Ht), X(B), Y(Hh), -nr[0], nr[1], P[2], 'Techo sotav.');
    g += arrows(X(B), Y(Hh), X(B), Y(0), 1, 0, P[3], 'Sotavento');
    g += T(X(B / 2), yb + 24, `B = ${f2(B, 2)} m   ·   alero ${f2(Hh, 2)} m   ·   cumbrera ${f2(Ht, 2)} m   ·   θ = ${f2(th * 180 / Math.PI, 1)}°`, { fs: 10, c: C.axis });
    if (String(b.pi || '').trim()) g += T(X(B / 2), Y(Hh * 0.45), 'Interior: ' + String(b.pi).replace(/[<>]/g, ''), { fs: 10, c: C.ink });
    return `<div class="figure">${svgWrap(W, H, g)}<div class="legend"><span><i style="background:${C.red}"></i>Presión (+)</span><span><i style="background:${C.blue}"></i>Succión (−)</span></div>${caption(ctx, b.titulo || 'Presiones exteriores de viento (E.020 Art. 12.4, Tabla 4)')}</div>`;
  },
});

// =====================================================================
//  6) BARRAS APILADAS (metrados por nivel)
// =====================================================================
registerBlock('stackbar', {
  name: 'Barras apiladas', icon: 'plot', group: 'General',
  fields: [
    F('etiquetas', 'Etiquetas de las barras (separadas por ;)', 'Piso 1; Piso 2; Azotea'),
    F('series', 'Series: una por línea  Nombre = vector', 'Losa = wl\nAcabados = wa', 'area'),
    F('unidad', 'Unidad de visualización', 'tonf'),
    F('titulo', 'Título', ''),
  ],
  def: { etiquetas: 'Piso 1; Piso 2', series: 'A = [1, 2]\nB = [2, 1]', unidad: 'tonf' },
  hint: 'Gráfico de barras horizontales apiladas (p. ej. composición de la carga muerta por nivel).',
  render(b, ctx) {
    const S = ctx.scope, u = String(b.unidad || '').trim();
    const ser = [];
    for (const ln of String(b.series || '').split('\n')) {
      const s = ln.trim(); if (!s) continue; const i = s.indexOf('='); if (i < 0) throw new Error('Serie sin "=": ' + s);
      const v = evalAny(s.slice(i + 1), S); let a = math.isMatrix(v) ? v.toArray().flat() : Array.isArray(v) ? v.flat() : [v];
      a = a.map(x => (math.isUnit(x) ? (u ? x.toNumber(u) : displayUnit(x).v) : Number(x)));
      ser.push({ n: s.slice(0, i).trim(), a });
    }
    if (!ser.length) throw new Error('Indique al menos una serie');
    const nb = Math.max(...ser.map(x => x.a.length));
    const lab = String(b.etiquetas || '').split(';').map(s => s.trim());
    const tot = Array.from({ length: nb }, (_, j) => sum(ser.map(x => x.a[j] || 0)));
    const W = 720, bh = 22, gap = 10, top = 16, x0 = 110, wP = 520, H = top + nb * (bh + gap) + 40;
    const mx = Math.max(...tot) * 1.12, X = (v) => x0 + v / mx * wP;
    let g = '';
    niceTicks(0, mx, 6).forEach(t => { g += Lne(X(t), top - 4, X(t), top + nb * (bh + gap), C.grid, 0.7) + T(X(t), top + nb * (bh + gap) + 14, f2(t, 0), { fs: 9, c: C.axis }); });
    for (let j = 0; j < nb; j++) {
      const y = top + (nb - 1 - j) * (bh + gap); let acc = 0;
      ser.forEach((s, k) => { const v = s.a[j] || 0; g += `<rect x="${X(acc).toFixed(1)}" y="${y}" width="${Math.max(0, X(acc + v) - X(acc)).toFixed(1)}" height="${bh}" fill="${COLS[k % COLS.length]}" opacity="0.85"/>`; acc += v; });
      g += T(x0 - 6, y + bh / 2 + 4, lab[j] || String(j + 1), { fs: 10, a: 'end' }) + T(X(acc) + 4, y + bh / 2 + 4, f2(acc, 1), { fs: 9, a: 'start', b: 1 });
    }
    g += T(x0 + wP / 2, H - 6, u ? '[' + u.replace('*', '·') + ']' : '', { fs: 10 });
    const leg = '<div class="legend">' + ser.map((s, k) => `<span><i style="background:${COLS[k % COLS.length]}"></i>${esc(s.n)}</span>`).join('') + '</div>';
    return `<div class="figure">${svgWrap(W, H, g)}${leg}${caption(ctx, b.titulo || '')}</div>`;
  },
});

// =====================================================================
//  7) JUNTA SÍSMICA (E.030 Art. 52)
// =====================================================================
registerBlock('junta', {
  name: 'Junta sísmica (E.030 Art. 52)', icon: 'quake', group: 'Sismo',
  fields: [F('h1', 'Altura edificio proyectado', 'h1'), F('h2', 'Altura edificio vecino', 'h2'), F('d1', 'Desplazamiento máximo inelástico del proyecto', 'd1'), F('d2', 'Desplazamiento máximo del vecino', 'd2'), F('s', 'Junta proyectada', 's'), F('titulo', 'Título', '')],
  def: { h1: 'h1', h2: 'h2', d1: 'd1', d2: 'd2', s: 's' },
  hint: 'Dibuja dos edificios adyacentes con sus deformadas y la junta sísmica.',
  render(b, ctx) {
    const S = ctx.scope;
    const h1 = evalParam(b.h1, S, 'm', 15), h2 = evalParam(b.h2, S, 'm', 9), d1 = evalParam(b.d1, S, 'm', 0.05), d2 = evalParam(b.d2, S, 'm', 0.03), s = evalParam(b.s, S, 'm', 0.1);
    const W = 720, H = 300, yb = 260, hm = Math.max(h1, h2), sc = 210 / hm, wb = 170, gap = 60;
    const xa = 360 - gap / 2 - wb, xb = 360 + gap / 2;
    const amp = 0.38 * gap / Math.max(d1, d2, 1e-6);
    let g = arrowDefs + `<rect x="80" y="${yb}" width="560" height="10" fill="url(#hatch)"/>` + Lne(80, yb, 640, yb, C.ink, 1.4);
    g += `<rect x="${xa}" y="${yb - h1 * sc}" width="${wb}" height="${h1 * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.8"/>`;
    g += `<rect x="${xb}" y="${yb - h2 * sc}" width="${wb}" height="${h2 * sc}" fill="#f6f1e7" stroke="${C.ink}" stroke-width="1.8"/>`;
    g += `<path d="M${xa + wb},${yb} Q${xa + wb + d1 * amp * 0.2},${yb - h1 * sc * 0.6} ${xa + wb + d1 * amp},${yb - h1 * sc}" fill="none" stroke="${C.red}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
    g += `<path d="M${xb},${yb} Q${xb - d2 * amp * 0.2},${yb - h2 * sc * 0.6} ${xb - d2 * amp},${yb - h2 * sc}" fill="none" stroke="${C.blue}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
    g += T(xa + wb / 2, yb - h1 * sc - 8, `Proyecto  h = ${f2(h1, 2)} m`, { fs: 10, b: 1 }) + T(xb + wb / 2, yb - h2 * sc - 8, `Vecino  h = ${f2(h2, 2)} m`, { fs: 10, b: 1 });
    g += T(xa + wb + d1 * amp + 4, yb - h1 * sc + 14, `δ1 = ${f2(nl(d1), 1)} ${lblL()}`, { fs: 9, a: 'start', c: C.red });
    g += T(xb - d2 * amp - 4, yb - h2 * sc + 14, `δ2 = ${f2(nl(d2), 1)} ${lblL()}`, { fs: 9, a: 'end', c: C.blue });
    const ys = yb - Math.min(h1, h2) * sc * 0.35;
    g += `<line x1="${xa + wb}" y1="${ys}" x2="${xb}" y2="${ys}" stroke="${C.ink}" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/>` + T(360, ys - 6, `s = ${f2(nl(s), 1)} ${lblL()}`, { fs: 10, b: 1 });
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Junta sísmica entre edificaciones adyacentes (deformadas exageradas)')}</div>`;
  },
});
