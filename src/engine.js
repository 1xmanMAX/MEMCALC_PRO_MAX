// =====================================================================
//  Motor de cálculo — MemoriaCalc
//  Lenguaje tipo Calcpad/handcalcs sobre math.js (unidades) + KaTeX
// =====================================================================
import { create, all } from 'mathjs';
import katex from 'katex';
import { marked } from 'marked';

export const math = create(all, { number: 'number', precision: 64 });

// ---------- Unidades técnicas (sistema MKS gravitacional + inglés) ----------
math.createUnit({
  tonf: { definition: '9806.65 N', aliases: ['tf'] },
  ksi: '6894757.29 Pa',
  kipf: '4448.2216 N',
}, { override: true });

// ---------- Tablas de varillas (Perú / ASTM A615) ----------
export const BARS = {
  2: { d: 0.635, A: 0.32, n: '1/4"' }, 3: { d: 0.953, A: 0.71, n: '3/8"' }, 4: { d: 1.27, A: 1.29, n: '1/2"' },
  5: { d: 1.588, A: 1.99, n: '5/8"' }, 6: { d: 1.905, A: 2.84, n: '3/4"' }, 7: { d: 2.222, A: 3.87, n: '7/8"' },
  8: { d: 2.54, A: 5.10, n: '1"' }, 9: { d: 2.865, A: 6.45, n: '1 1/8"' }, 10: { d: 3.226, A: 8.19, n: '1 1/4"' },
  11: { d: 3.581, A: 10.06, n: '1 3/8"' }, 14: { d: 4.3, A: 14.52, n: '1 3/4"' }, 18: { d: 5.733, A: 25.81, n: '2 1/4"' },
};
export const BARS_MM = { 6: 0.28, 8: 0.50, 10: 0.79, 12: 1.13, 16: 2.01, 20: 3.14, 25: 4.91, 32: 8.04 };

const U = (v, u) => math.unit(v, u);
const num = (x, u) => (math.isUnit(x) ? x.toNumber(u) : x);

// ---------- Cargas vivas vehiculares HL-93 (AASHTO LRFD) ----------
// Camión de diseño: 3.63 t, 14.52 t, 14.52 t (ejes @ 4.30 m); tándem: 2 x 11.34 t @ 1.20 m
const _mmCache = new Map();
function momentAt(L, ax, s) {
  const on = ax.map(a => ({ p: a.p, x: a.x + s })).filter(a => a.x >= -1e-9 && a.x <= L + 1e-9);
  if (!on.length) return 0;
  const RA = on.reduce((t, a) => t + a.p * (L - a.x), 0) / L;
  let best = 0;
  for (const a of on) { const M = RA * a.x - on.filter(b => b.x < a.x).reduce((t, b) => t + b.p * (a.x - b.x), 0); if (M > best) best = M; }
  return best;
}
function maxMomentMoving(L, axles) {
  // Barrido + posiciones críticas teóricas (eje y resultante simétricos respecto al centro de luz)
  if (!(L > 0) || L > 1e4) throw new Error('Luz fuera de rango para HL-93');
  const key = L.toFixed(6) + JSON.stringify(axles);
  if (_mmCache.has(key)) return _mmCache.get(key);
  let best = 0;
  const span = axles[axles.length - 1].x;
  for (const flip of [false, true]) {
    const ax = flip ? axles.map(a => ({ p: a.p, x: span - a.x })).reverse() : axles;
    for (let s = -span; s <= L; s += L / 120) best = Math.max(best, momentAt(L, ax, s));
    for (let i0 = 0; i0 < ax.length; i0++) for (let i1 = i0; i1 < ax.length; i1++) {
      const grp = ax.slice(i0, i1 + 1), R = grp.reduce((t, a) => t + a.p, 0), xr = grp.reduce((t, a) => t + a.p * a.x, 0) / R;
      for (const a of grp) { const s = L / 2 - (a.x + xr) / 2; best = Math.max(best, momentAt(L, ax, s)); }
    }
  }
  if (_mmCache.size > 500) _mmCache.clear();
  _mmCache.set(key, best);
  return best;
}
function maxShearMoving(L, axles) {
  let best = 0; const span = axles[axles.length - 1].x;
  if (!(L > 0) || L > 1e4) throw new Error('Luz fuera de rango para HL-93');
  for (const flip of [false, true]) {
    const ax = flip ? axles.map(a => ({ p: a.p, x: span - a.x })) : axles;
    for (let s = -span; s <= L; s += L / 400) {
      const on = ax.map(a => ({ p: a.p, x: a.x + s })).filter(a => a.x >= 0 && a.x <= L);
      const RA = on.reduce((t, a) => t + a.p * (L - a.x), 0) / L;
      if (RA > best) best = RA;
    }
  }
  return best;
}
const TRUCK = [{ p: 3.63, x: 0 }, { p: 14.52, x: 4.3 }, { p: 14.52, x: 8.6 }];
const TANDEM = [{ p: 11.34, x: 0 }, { p: 11.34, x: 1.2 }];

// ---------- Funciones personalizadas ----------
math.import({
  si: math.typed('si', { 'any, any, any': (c, a, b) => (truthy(c) ? a : b) }),
  sqrtfc: (x) => (math.isUnit(x) ? U(Math.sqrt(x.toNumber('kgf/cm^2')), 'kgf/cm^2') : Math.sqrt(x)),
  sqrtMPa: (x) => (math.isUnit(x) ? U(Math.sqrt(x.toNumber('MPa')), 'MPa') : Math.sqrt(x)),
  Ab: (n) => { const b = BARS[num(n)]; if (!b) throw new Error('Varilla #' + n + ' no existe'); return U(b.A, 'cm^2'); },
  db: (n) => { const b = BARS[num(n)]; if (!b) throw new Error('Varilla #' + n + ' no existe'); return U(b.d, 'cm'); },
  Abmm: (d) => { const a = BARS_MM[num(d)]; if (!a) throw new Error('Varilla ' + d + ' mm no existe'); return U(a, 'cm^2'); },
  roundup: (x, s) => math.multiply(Math.ceil(math.divide(x, s) - 1e-9), s),
  rounddown: (x, s) => { const q = Math.floor(math.divide(x, s) + 1e-9); if (q <= 0 && math.divide(x, s) > 0) throw new Error('El valor redondeado hacia abajo resulta cero: revise los datos de entrada'); return math.multiply(q, s); },
  MtruckHL93: (L) => U(maxMomentMoving(num(L, 'm'), TRUCK), 'tonf*m'),
  MtandemHL93: (L) => U(maxMomentMoving(num(L, 'm'), TANDEM), 'tonf*m'),
  MlaneHL93: (L) => U(0.952 * num(L, 'm') ** 2 / 8, 'tonf*m'),
  VtruckHL93: (L) => U(maxShearMoving(num(L, 'm'), TRUCK), 'tonf'),
  VtandemHL93: (L) => U(maxShearMoving(num(L, 'm'), TANDEM), 'tonf'),
  VlaneHL93: (L) => U(0.952 * num(L, 'm') / 2, 'tonf'),
  // ---- E.030-2026 (RM 183-2026-VIVIENDA): S, TP y TL según Vs30 (interpolación lineal) ----
  SE030: (zona, vs) => e030S(num(zona), num(vs, 'm/s')),
  TpE030: (vs) => U(e030T(num(vs, 'm/s'), 'p'), 's'),
  TlE030: (vs) => U(e030T(num(vs, 'm/s'), 'l'), 's'),
  CE030d: (T, Tp, Tl) => { T = num(T, 's'); Tp = num(Tp, 's'); Tl = num(Tl, 's'); return T < 0.2 * Tp ? 1 + 7.5 * T / Tp : T <= Tp ? 2.5 : T < Tl ? 2.5 * Tp / T : 2.5 * Tp * Tl / (T * T); },
  // ---- Japón, Building Standard Law (Ci = Z·Rt·Ai·Co) ----
  RtBSL: (T, Tc) => { T = num(T, 's'); Tc = num(Tc, 's'); return T < Tc ? 1 : T < 2 * Tc ? 1 - 0.2 * (T / Tc - 1) ** 2 : 1.6 * Tc / T; },
  AiBSL: (a, T) => { const t = num(T, 's'); const f = (x) => 1 + (1 / Math.sqrt(x) - x) * 2 * t / (1 + 3 * t); return math.isMatrix(a) || Array.isArray(a) ? math.map(a, f) : f(num(a)); },
  FsBSL: (Rs) => (num(Rs) >= 0.6 ? 1 : 2 - num(Rs) / 0.6),
  FeBSL: (Re) => { Re = num(Re); return Re <= 0.15 ? 1 : Re >= 0.30 ? 1.5 : 1 + 0.5 * (Re - 0.15) / 0.15; }, // Notif. MLIT 1792
  // ---- ASCE 7-22 espectro de diseño (11.4.6), en g ----
  SaASCE7: (T, SDS, SD1, TL) => { T = num(T, 's'); TL = num(TL, 's'); SDS = num(SDS); SD1 = num(SD1); const T0 = 0.2 * SD1 / SDS, TS = SD1 / SDS; return T < T0 ? SDS * (0.4 + 0.6 * T / T0) : T <= TS ? SDS : T <= TL ? SD1 / T : SD1 * TL / (T * T); },
  CuASCE7: (SD1) => { SD1 = num(SD1); const t = [[0.1, 1.7], [0.15, 1.6], [0.2, 1.5], [0.3, 1.4], [0.4, 1.4]]; if (SD1 <= 0.1) return 1.7; if (SD1 >= 0.4) return 1.4; for (let i = 0; i < 4; i++) if (SD1 <= t[i + 1][0]) return t[i][1] + (t[i + 1][1] - t[i][1]) * (SD1 - t[i][0]) / (t[i + 1][0] - t[i][0]); return 1.4; },
  // ---- Eurocódigo 8 espectro de diseño (3.2.2.5), en g ----
  SdEC8: (T, ag, S, TB, TC, TD, q) => { T = num(T, 's'); ag = num(ag); S = num(S); TB = num(TB, 's'); TC = num(TC, 's'); TD = num(TD, 's'); q = num(q); const b = 0.2; return T <= TB ? ag * S * (2 / 3 + T / TB * (2.5 / q - 2 / 3)) : T <= TC ? ag * S * 2.5 / q : T <= TD ? Math.max(ag * S * 2.5 / q * TC / T, b * ag) : Math.max(ag * S * 2.5 / q * TC * TD / (T * T), b * ag); },
  // ---- ACI 318-19/25 factor de tamaño ----
  lambdasACI: (d) => Math.min(1, Math.sqrt(2 / (1 + 0.004 * num(d, 'mm')))),
  // Factor de amplificación sísmica E.030-2018
  CE030: (T, Tp, Tl) => {
    T = num(T, 's'); Tp = num(Tp, 's'); Tl = num(Tl, 's');
    return T < Tp ? 2.5 : T <= Tl ? 2.5 * Tp / T : 2.5 * Tp * Tl / (T * T);
  },
}, { override: true });

// Tablas N° 4 y 5 de la E.030-2026: interpolación por Vs30
const E030_S = { 4: [0.80, 1.00, 1.00, 1.10, 1.10, 1.20, null], 3: [0.80, 1.00, 1.00, 1.15, 1.15, 1.20, 1.30], 2: [0.80, 1.00, 1.00, 1.30, 1.30, 1.40, 1.70], 1: [0.80, 1.00, 1.00, 1.30, 1.30, 1.60, 2.40] };
function lerp(x, x0, x1, y0, y1) { return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
function e030S(z, vs) {
  const r = E030_S[Math.round(z)]; if (!r) throw new Error('Zona sísmica debe ser 1, 2, 3 o 4');
  if (vs >= 800) return r[0]; if (vs >= 550) return r[1];
  if (vs >= 350) return lerp(vs, 550, 350, r[2], r[3]);
  if (vs >= 200) return lerp(vs, 350, 200, r[4], r[5]);
  if (r[6] === null) throw new Error('Suelo S4 en zona 4: se requiere análisis de respuesta de sitio (E.030-2026)');
  return r[6];
}
function e030T(vs, w) {
  if (vs >= 800) return w === 'p' ? 0.3 : 3.0; if (vs >= 550) return w === 'p' ? 0.4 : 2.5;
  if (vs >= 350) return w === 'p' ? lerp(vs, 550, 350, 0.4, 0.6) : lerp(vs, 550, 350, 2.5, 2.0);
  if (vs >= 200) return w === 'p' ? lerp(vs, 350, 200, 0.6, 0.9) : lerp(vs, 350, 200, 2.0, 1.6);
  return w === 'p' ? 1.2 : 1.6;
}
function truthy(c) { return math.isUnit(c) ? c.value !== 0 : !!c; }

export const CUSTOM_FN = new Set(['SE030', 'TpE030', 'TlE030', 'CE030d', 'RtBSL', 'AiBSL', 'FsBSL', 'FeBSL', 'SaASCE7', 'CuASCE7', 'SdEC8', 'lambdasACI', 'Ab', 'db', 'Abmm', 'MtruckHL93', 'MtandemHL93', 'MlaneHL93', 'VtruckHL93', 'VtandemHL93', 'VlaneHL93', 'CE030', 'roundup', 'rounddown']);
export const FN_TEX = {
  Ab: 'A_{b}', db: 'd_{b}', Abmm: 'A_{b}', MtruckHL93: 'M_{\\mathrm{cami\\acute{o}n}}', MtandemHL93: 'M_{\\mathrm{t\\acute{a}ndem}}',
  MlaneHL93: 'M_{\\mathrm{carril}}', VtruckHL93: 'V_{\\mathrm{cami\\acute{o}n}}', VtandemHL93: 'V_{\\mathrm{t\\acute{a}ndem}}',
  VlaneHL93: 'V_{\\mathrm{carril}}', CE030: 'C', CE030d: 'C', SE030: 'S', TpE030: 'T_P', TlE030: 'T_L', RtBSL: 'R_t', AiBSL: 'A_i', FsBSL: 'F_s', FeBSL: 'F_e', SaASCE7: 'S_a', CuASCE7: 'C_u', SdEC8: 'S_d', lambdasACI: '\\lambda_s', roundup: '\\mathrm{redondear}\\uparrow', rounddown: '\\mathrm{redondear}\\downarrow',
};

// =====================================================================
//  Registro de funciones normativas (módulos en src/norms/*)
//  defineFns({ nombre: fn | { fn, tex, desc, cat } })
//   - fn recibe valores math.js (números o Unit) y devuelve número o Unit
//   - tex: símbolo LaTeX con que se muestra la función en la memoria
//   - desc: descripción corta para el autocompletado y la ayuda
// =====================================================================
export const FN_DOCS = [];
export function defineFns(defs, cat = '') {
  const imp = {};
  for (const [name, d] of Object.entries(defs)) {
    const o = typeof d === 'function' ? { fn: d } : d;
    imp[name] = o.fn;
    CUSTOM_FN.add(name);
    if (o.tex) FN_TEX[name] = o.tex;
    const k = FN_DOCS.findIndex(x => x.name === name); if (k >= 0) FN_DOCS.splice(k, 1);
    FN_DOCS.push({ name, desc: o.desc || '', args: o.args || '', cat: o.cat || cat });
  }
  math.import(imp, { override: true });
}
// utilidades para módulos normativos
export const toNum = (x, u) => (math.isUnit(x) ? (u ? x.toNumber(u) : x.value) : (typeof x === 'number' ? x : Number(x)));
export const mkUnit = (v, u) => math.unit(v, u);
export function interp1(x, xs, ys, clamp = true) {
  if (x <= xs[0]) return clamp ? ys[0] : ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0]);
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  const n = xs.length - 1; return clamp ? ys[n] : ys[n - 1] + (ys[n] - ys[n - 1]) * (x - xs[n - 1]) / (xs[n] - xs[n - 1]);
}

// =====================================================================
//  Formato de números, unidades y símbolos
// =====================================================================
export const settings = { dec: 2, sys: 'tec', comma: false };

function trimZeros(s) { return s.indexOf('.') >= 0 && !/e/i.test(s) ? s.replace(/\.?0+$/, '') : s; }
export function fmtNum(x, dec = settings.dec) {
  if (typeof x !== 'number') x = Number(x);
  if (Number.isNaN(x)) return '\\text{NaN}';
  if (!isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  let s;
  if (ax >= 1e7 || ax < 1e-4) {
    const e = Math.floor(Math.log10(ax));
    s = trimZeros((x / 10 ** e).toFixed(dec)) + '\\times 10^{' + e + '}';
  } else if (ax >= 1) s = trimZeros(x.toFixed(dec));
  else s = trimZeros(x.toPrecision(dec + 1));
  if (Math.abs(Number(s)) === 0 && x !== 0) s = trimZeros(x.toPrecision(dec + 1));
  if (settings.comma) s = s.replace('.', '{,}');
  return s;
}
export function fmtPlain(x, dec = settings.dec) {
  return fmtNum(x, dec).replace('{,}', ',').replace('\\times 10^{', 'e').replace('}', '');
}

export function unitTex(str) {
  if (!str) return '';
  let s = str.replace(/[()]/g, '').trim().replace(/\s*\/\s*/g, '/').replace(/\s*\*\s*/g, '·').replace(/\s+/g, '·');
  s = s.replace(/\^(-?\d+(\.\d+)?)/g, '^{$1}').replace(/·/g, '\\cdot ').replace(/deg/g, '^{\\circ}');
  if (/^\^\{\\circ\}$/.test(s)) return '^{\\circ}';
  return '\\mathrm{' + s + '}';
}

// unidad preferida por dimensión
const PREF = {
  tec: { '1,1,-2': 'tonf', '1,2,-2': 'tonf*m', '1,-1,-2': 'kgf/cm^2', '1,0,-2': 'tonf/m', '1,-2,-2': 'tonf/m^3', '0,1,0': 'cm', '0,2,0': 'cm^2', '0,3,0': 'cm^3', '0,4,0': 'cm^4', '1,0,0': 'kg' },
  si: { '1,1,-2': 'kN', '1,2,-2': 'kN*m', '1,-1,-2': 'MPa', '1,0,-2': 'kN/m', '1,-2,-2': 'kN/m^3', '0,1,0': 'mm', '0,2,0': 'mm^2', '0,3,0': 'mm^3', '0,4,0': 'mm^4', '1,0,0': 'kg' },
  us: { '1,1,-2': 'kip', '1,2,-2': 'kip*ft', '1,-1,-2': 'ksi', '1,0,-2': 'kip/ft', '1,-2,-2': 'kip/ft^3', '0,1,0': 'in', '0,2,0': 'in^2', '0,3,0': 'in^3', '0,4,0': 'in^4', '1,0,0': 'lb' },
};

// Devuelve {v:number, u:string} para mostrar una unidad
export const fixedUnits = new WeakMap();
export function displayUnit(u) {
  if (!u.units || u.units.length === 0) return { v: u.value ?? 0, u: '' };
  const fx = fixedUnits.get(u);
  if (fx) { try { return { v: u.toNumber(fx), u: fx }; } catch (e) { /* sigue */ } }
  const dims = u.dimensions.slice(0, 3).join(',');
  const rest = u.dimensions.slice(3).some(d => d !== 0);
  if (u.dimensions.every(d => d === 0)) {
    // adimensional (p.ej. cm/m)
    return { v: u.value, u: '' };
  }
  // misma unidad base repetida -> conservar (m·m·m -> m^3)
  const names = u.units.map(x => x.prefix.name + x.unit.name);
  if (names.every(n => n === names[0])) {
    const p = u.units.reduce((t, x) => t + x.power, 0);
    const us = p === 1 ? names[0] : names[0] + '^' + p;
    try { return { v: u.toNumber(us), u: us }; } catch (e) { /* sigue */ }
  }
  // unidad compuesta conocida
  if (!rest) {
    const t = PREF[settings.sys][dims];
    if (t) { try { return { v: u.toNumber(t), u: t }; } catch (e) { /* sigue */ } }
  }
  const f = u.formatUnits();
  try { return { v: u.toNumber(f), u: f }; } catch (e) { return { v: u.value, u: f }; }
}

export function valTex(v, dec) {
  if (v === undefined || v === null) return '\\text{—}';
  if (typeof v === 'number') return fmtNum(v, dec);
  if (typeof v === 'boolean') return v ? '\\text{verdadero}' : '\\text{falso}';
  if (typeof v === 'string') return '\\text{' + v.replace(/[{}\\]/g, '') + '}';
  if (math.isUnit(v)) {
    if (v.value === null) return unitTex(v.formatUnits());
    const d = displayUnit(v);
    return fmtNum(d.v, dec) + (d.u ? '\\,' + unitTex(d.u) : '');
  }
  if (math.isMatrix(v) || Array.isArray(v)) {
    const a = math.isMatrix(v) ? v.toArray() : v;
    if (a.length && Array.isArray(a[0])) return '\\begin{bmatrix}' + a.map(r => r.map(x => valTex(x, dec)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
    const items = a.length > 14 ? [...a.slice(0, 6).map(x => valTex(x, dec)), '\\cdots', ...a.slice(-3).map(x => valTex(x, dec))] : a.map(x => valTex(x, dec));
    return '\\begin{bmatrix}' + items.join(' & ') + '\\end{bmatrix}';
  }
  if (math.isComplex(v)) return v.toString();
  if (typeof v === 'function') return '\\text{función}';
  return '\\text{' + String(v) + '}';
}
export function valText(v, dec) {
  if (typeof v === 'number') return fmtPlain(v, dec);
  if (math.isUnit(v)) { const d = displayUnit(v); return fmtPlain(d.v, dec) + (d.u ? ' ' + d.u.replace(/\*/g, '·') : ''); }
  return String(v);
}

const GREEK = ['varepsilon', 'vartheta', 'epsilon', 'upsilon', 'Upsilon', 'lambda', 'Lambda', 'varphi', 'alpha', 'gamma', 'Gamma', 'delta', 'Delta', 'theta', 'Theta', 'kappa', 'sigma', 'Sigma', 'omega', 'Omega', 'beta', 'zeta', 'iota', 'Phi', 'phi', 'chi', 'psi', 'Psi', 'rho', 'tau', 'eta', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi'];
const GSUF = new Set(['max', 'min', 'req', 'adm', 'tot', 'eff', 'lim', 'est', 'sis', 'col', 'vig', 'mur', 'red']);
const SPECIAL = { fm: "f'_{m}", vm: "v'_{m}", fc: "f'_{c}", fpc: "f'_{c}", fcm: "f'_{cm}", fpy: "f'_{y}", Ec: 'E_{c}', inf: '\\infty' };

function subTex(s) {
  if (/^\d+$/.test(s) || s.length === 1 || s[0] === '\\') return s;
  return '\\mathrm{' + s + '}';
}
const WORDS = new Set(['rec', 'bar', 'est', 'sep', 'punta', 'talon', 'total', 'area', 'peso', 'luz', 'base', 'alto', 'ancho', 'largo', 'carga', 'tipo', 'zona', 'uso', 'suelo', 'nivel', 'piso', 'pisos', 'peso', 'vano', 'muro', 'losa', 'viga', 'paso', 'barra', 'res', 'ok', 'fs']);
function splitBase(b) {
  if (SPECIAL[b]) return { main: SPECIAL[b], sub: [] , full: true };
  if (WORDS.has(b)) return { main: '\\mathrm{' + b + '}', sub: [] };
  for (const g of GREEK) {
    if (b.startsWith(g)) {
      const rest = b.slice(g.length);
      if (!rest) return { main: '\\' + g, sub: [] };
      if (/^[A-Z]/.test(rest)) { const r = splitBase(rest); return { main: '\\' + g + ' ' + r.main, sub: r.sub, full: r.full }; }
      if (/^[a-z0-9]{1,4}$/.test(rest) && (g.length >= 4 || rest.length <= 2 || /^\d+$/.test(rest) || GSUF.has(rest))) return { main: '\\' + g, sub: [rest] };
    }
  }
  if (b.length === 1) return { main: b, sub: [] };
  if (GREEK.includes(b.slice(1)) && !/^.(pi|Pi)$/.test(b)) return { main: b[0], sub: ['\\' + b.slice(1)] };
  if (/^[A-Z]{2,4}$/.test(b)) return { main: '\\mathrm{' + b + '}', sub: [] };
  const rest = b.slice(1);
  if (/^[A-Za-z]/.test(b) && (/^[a-z0-9]{1,4}$/.test(rest) || /^\d+$/.test(rest) || /^[A-Z][a-z0-9]{0,2}$/.test(rest))) return { main: b[0], sub: [rest] };
  return { main: '\\mathrm{' + b + '}', sub: [] };
}
const symCache = new Map();
export function symTex(name) {
  if (symCache.has(name)) return symCache.get(name);
  const parts = name.split('_').filter(Boolean);
  const base = parts.shift() || name;
  const r = splitBase(base);
  let out;
  if (r.full) out = parts.length ? r.main.replace(/_\{(.*)\}$/, (m, a) => '_{' + [a, ...parts.map(subTex)].join(',') + '}') : r.main;
  else {
    const subs = [...r.sub.map(subTex), ...parts.map(subTex)];
    out = subs.length ? r.main + '_{' + subs.join(',') + '}' : r.main;
  }
  symCache.set(name, out);
  return out;
}

// =====================================================================
//  Render de árbol math.js a LaTeX (simbólico y con sustitución)
// =====================================================================
const BUILTIN_TEX = { sin: '\\sin', cos: '\\cos', tan: '\\tan', asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', log: '\\ln', log10: '\\log_{10}', min: '\\min', max: '\\max', exp: 'e' };
const REL = { smaller: '<', smallerEq: '\\le', larger: '>', largerEq: '\\ge', equal: '=', unequal: '\\ne' };

function isUnitSym(n, scope) { return n.type === 'SymbolNode' && !scope.has(n.name) && math.Unit.isValuelessUnit(n.name); }

// ¿El subárbol es un literal "número + unidades"?
export function isQty(n, scope) {
  let consts = 0, units = 0, ok = true;
  (function walk(x, inExp) {
    if (!ok) return;
    switch (x.type) {
      case 'ConstantNode': if (typeof x.value !== 'number') ok = false; else if (!inExp) consts++; break;
      case 'SymbolNode': if (isUnitSym(x, scope)) units++; else ok = false; break;
      case 'OperatorNode':
        if (x.fn === 'unaryMinus' || x.fn === 'unaryPlus') walk(x.args[0], inExp);
        else if (x.op === '*' || x.op === '/') x.args.forEach(a => walk(a, inExp));
        else if (x.op === '^') { let hasC = false; x.args[0].traverse(y => { if (y.type === 'ConstantNode') hasC = true; }); if (hasC) ok = false; else { walk(x.args[0], inExp); walk(x.args[1], true); } }
        else ok = false;
        break;
      case 'ParenthesisNode': walk(x.content, inExp); break;
      default: ok = false;
    }
  })(n, false);
  return ok && consts <= 1 && (units > 0 || consts === 1);
}
function constTex(v) {
  if (typeof v !== 'number') return '\\text{' + String(v) + '}';
  let s = String(v);
  if (/e/.test(s) || s.length > 12) return fmtNum(v, 4);
  if (settings.comma) s = s.replace('.', '{,}');
  return s;
}
function qtyTex(n, scope) {
  const v = n.compile().evaluate(new Map());
  if (typeof v === 'number') return constTex(v);
  // número tal como se escribió
  let c = null, neg = false;
  n.traverse((x, p, parent) => { if (x.type === 'ConstantNode' && c === null && !(parent && parent.op === '^' && parent.args[1] === x)) c = x.value; if (x.fn === 'unaryMinus') neg = !neg; });
  const us = v.formatUnits();
  return (c === null ? '' : (neg ? '-' : '') + constTex(c) + '\\,') + unitTex(us);
}

function needsParen(n) { return n.type === 'OperatorNode' && !n.fn.startsWith('unary') && n.op !== '^' || n.type === 'ConditionalNode'; }
function strip(n) { return n.type === 'ParenthesisNode' ? n.content : n; }

export function tex(n, o) {
  // o = {mode:'sym'|'sub', scope, dec}
  const S = o.scope;
  if (isQty(n, S) && n.type !== 'ConstantNode') return qtyTex(n, S);
  switch (n.type) {
    case 'ConstantNode': return constTex(n.value);
    case 'SymbolNode': {
      if (S.has(n.name)) {
        const v = S.get(n.name);
        if (o.mode === 'sub' && typeof v !== 'function') {
          const t = valTex(v, o.dec);
          const neg = (typeof v === 'number' && v < 0) || (math.isUnit(v) && v.value < 0);
          const hasU = math.isUnit(v) && v.units.length;
          return (neg || (hasU && o.wrapU)) ? '\\left(' + t + '\\right)' : t;
        }
        return symTex(n.name);
      }
      if (n.name === 'pi') return '\\pi';
      if (n.name === 'e') return 'e';
      if (n.name === 'Infinity') return '\\infty';
      if (math.Unit.isValuelessUnit(n.name)) return unitTex(n.name);
      return symTex(n.name);
    }
    case 'ParenthesisNode': return '\\left(' + tex(n.content, { ...o, wrapU: false }) + '\\right)';
    case 'OperatorNode': {
      const a = n.args;
      if (n.fn === 'unaryMinus') { const t = tex(a[0], { ...o, wrapU: false }); return '-' + (needsParen(a[0]) ? '\\left(' + t + '\\right)' : t); }
      if (n.fn === 'unaryPlus') return '+' + tex(a[0], o);
      if (n.fn === 'not') return '\\neg ' + tex(a[0], o);
      if (n.op === '/' || n.op === './') {
        if (o.inExp) return tex(a[0], o) + '/' + tex(a[1], o);
        return '\\dfrac{' + tex(strip(a[0]), { ...o, wrapU: false }) + '}{' + tex(strip(a[1]), { ...o, wrapU: false }) + '}';
      }
      if (n.op === '^' || n.op === '.^') {
        const b = a[0];
        let bt = tex(b, { ...o, wrapU: true });
        if (needsParen(b) || (b.type === 'OperatorNode' && b.op === '^') || (b.type !== 'ConstantNode' && isQty(b, o.scope) && /\\mathrm|\\,/.test(bt) && !/^\\left\(/.test(bt))) bt = '\\left(' + bt + '\\right)';
        if (b.type === 'FunctionNode' && BUILTIN_TEX[fnName(b)] && fnName(b) !== 'exp') bt = '\\left(' + bt + '\\right)';
        const e = strip(a[1]);
        if (e.type === 'ConstantNode' && e.value === 0.5) return '\\sqrt{' + tex(strip(b), o) + '}';
        return bt + '^{' + tex(e, { ...o, inExp: true, wrapU: false }) + '}';
      }
      if (n.op === '*' || n.op === '.*') {
        const l = tex(a[0], { ...o, wrapU: false }), r = tex(a[1], { ...o, wrapU: false });
        const startsNum = (x) => { while ((x.type === 'OperatorNode' && x.args.length === 2) || x.type === 'ParenthesisNode') x = x.type === 'ParenthesisNode' ? x.content : x.args[0]; return x.type === 'ConstantNode' || x.fn === 'unaryMinus' || isQty(x, o.scope); };
        if (o.mode === 'sym' && !startsNum(a[1]) && (n.implicit || a[0].type === 'ConstantNode')) return l + '\\,' + r;
        return l + ' \\cdot ' + r;
      }
      if (REL[n.fn]) return tex(a[0], o) + ' ' + REL[n.fn] + ' ' + tex(a[1], o);
      if (n.fn === 'and') return tex(a[0], o) + ' \\;\\wedge\\; ' + tex(a[1], o);
      if (n.fn === 'or') return tex(a[0], o) + ' \\;\\vee\\; ' + tex(a[1], o);
      if (n.fn === 'mod') return tex(a[0], o) + ' \\bmod ' + tex(a[1], o);
      if (n.fn === 'factorial') return tex(a[0], o) + '!';
      if (n.op === '+' || n.op === '-') {
        const r = tex(a[1], { ...o, wrapU: false });
        const rNeg = o.mode === 'sub' && /^\\left\(-/.test(r);
        return tex(a[0], { ...o, wrapU: false }) + ' ' + n.op + ' ' + (n.op === '-' && a[1].type === 'OperatorNode' && (a[1].op === '+' || a[1].op === '-') && !rNeg ? '\\left(' + r + '\\right)' : r);
      }
      return n.toTex();
    }
    case 'ConditionalNode': {
      if (o.mode === 'sub') {
        const c = truthy(n.condition.compile().evaluate(new Map(S)));
        return tex(c ? n.trueExpr : n.falseExpr, o);
      }
      return casesTex(n, o);
    }
    case 'FunctionNode': {
      const name = fnName(n);
      const a = n.args;
      if (name === 'si' && a.length === 3) {
        if (o.mode === 'sub') { const c = truthy(a[0].compile().evaluate(new Map(S))); return tex(c ? a[1] : a[2], o); }
        return casesTex(n, o);
      }
      const userFn = S.has(name) && typeof S.get(name) === 'function';
      if (o.mode === 'sub' && (CUSTOM_FN.has(name) || userFn)) {
        try { const v = n.compile().evaluate(new Map(S)); return math.isUnit(v) && o.wrapU ? '\\left(' + valTex(v, o.dec) + '\\right)' : valTex(v, o.dec); } catch (e) { /* cae */ }
      }
      if (name === 'sqrt') return '\\sqrt{' + tex(strip(a[0]), { ...o, wrapU: false }) + '}';
      if (name === 'sqrtfc' || name === 'sqrtMPa') {
        if (o.mode === 'sub') {
          try { const v = a[0].compile().evaluate(new Map(S)); return '\\sqrt{' + fmtNum(num(v, name === 'sqrtfc' ? 'kgf/cm^2' : 'MPa'), o.dec) + '}'; } catch (e) { /* */ }
        }
        return '\\sqrt{' + tex(strip(a[0]), o) + '}';
      }
      if (name === 'nthRoot' && a.length === 2) return '\\sqrt[' + tex(a[1], o) + ']{' + tex(strip(a[0]), o) + '}';
      if (name === 'cbrt') return '\\sqrt[3]{' + tex(strip(a[0]), o) + '}';
      if ((name === 'rounddown' || name === 'roundup') && a.length === 2 && o.mode === 'sym') {
        const inner = tex(strip(a[0]), o);
        const tall = (inner.match(/\\dfrac/g) || []).length > 1; // evita un error de KaTeX con ⌊ ⌋ muy altos
        const L = name === 'rounddown' ? (tall ? ['\\left[ ', '\\right]_{\\downarrow '] : ['\\left\\lfloor ', '\\right\\rfloor_{']) : (tall ? ['\\left[ ', '\\right]_{\\uparrow '] : ['\\left\\lceil ', '\\right\\rceil_{']);
        return L[0] + inner + L[1] + tex(a[1], o) + '}';
      }
      if (name === 'abs') return '\\left|' + tex(strip(a[0]), o) + '\\right|';
      if (name === 'ceil') return '\\left\\lceil ' + tex(strip(a[0]), o) + '\\right\\rceil';
      if (name === 'floor') return '\\left\\lfloor ' + tex(strip(a[0]), o) + '\\right\\rfloor';
      if (name === 'exp') return 'e^{' + tex(strip(a[0]), { ...o, inExp: true }) + '}';
      if (name === 'sum' && a.length === 1) return '\\sum ' + tex(a[0], o);
      if (name === 'to' || name === 'in') return tex(a[0], o);
      const fn = FN_TEX[name] || BUILTIN_TEX[name] || (userFn || S.has(name) ? symTex(name) : '\\mathrm{' + name + '}');
      let args = a.map(x => tex(x, { ...o, wrapU: false })).join(',\\;');
      if ((name === 'Ab' || name === 'db') && a[0].type === 'ConstantNode') args = '\\#' + a[0].value;
      return fn + '\\left(' + args + '\\right)';
    }
    case 'ArrayNode': {
      if (n.items.length && n.items[0].type === 'ArrayNode') return '\\begin{bmatrix}' + n.items.map(r => r.items.map(x => tex(x, o)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
      return '\\begin{bmatrix}' + n.items.map(x => tex(x, o)).join(' & ') + '\\end{bmatrix}';
    }
    case 'AccessorNode': {
      if (o.mode === 'sub') { try { return valTex(n.compile().evaluate(new Map(S)), o.dec); } catch (e) { /* */ } }
      const ob = tex(n.object, { ...o, mode: 'sym' }), ix = n.index.dimensions.map(d => tex(d, { ...o, mode: 'sym' })).join(',');
      if (/[:,]/.test(ix)) return ob + '\\left[' + ix.replace(/:/g, '{:}').replace(/,/g, ',\\;') + '\\right]';
      const sm = /_\{([^{}]*)\}$/.exec(ob);
      return sm ? ob.slice(0, sm.index) + '_{' + sm[1] + ',' + ix + '}' : (/^[A-Za-z]$|^\\[A-Za-z]+$/.test(ob) ? ob : '{' + ob + '}') + '_{' + ix + '}';
    }
    case 'RelationalNode': {
      let s = tex(n.params[0], o);
      n.conditionals.forEach((c, i) => { s += ' ' + (REL[c] || c) + ' ' + tex(n.params[i + 1], o); });
      return s;
    }
    case 'RangeNode': return tex(n.start, o) + ':' + tex(n.end, o);
    default:
      try { return n.toTex(); } catch (e) { return '\\text{?}'; }
  }
}
// si(c1, a, si(c2, b, c)) -> una sola llave con varias filas
function casesTex(n, o) {
  const rows = [];
  let x = n;
  for (let k = 0; k < 12; k++) {
    let c, t, f;
    if (x.type === 'ConditionalNode') { c = x.condition; t = x.trueExpr; f = x.falseExpr; }
    else if (x.type === 'FunctionNode' && fnName(x) === 'si' && x.args.length === 3) { [c, t, f] = x.args; }
    else break;
    rows.push(tex(t, o) + ' & \\text{si } ' + tex(c, o));
    x = f;
  }
  rows.push(tex(x, o) + ' & \\text{en otro caso}');
  return '\\begin{cases}' + rows.join(' \\\\ ') + '\\end{cases}';
}
function fnName(n) { return n.fn && n.fn.name ? n.fn.name : n.name; }

function hasScopeSymbols(n, S) {
  let f = false;
  n.traverse(x => {
    if (x.type === 'SymbolNode' && S.has(x.name) && typeof S.get(x.name) !== 'function') f = true;
    if (x.type === 'FunctionNode' && (CUSTOM_FN.has(fnName(x)) || (S.has(fnName(x)) && typeof S.get(fnName(x)) === 'function'))) f = true;
  });
  return f;
}

// =====================================================================
//  KaTeX con caché
// =====================================================================
const kcache = new Map();
export function K(t, display = false) {
  const key = (display ? 'D' : 'I') + t;
  let h = kcache.get(key);
  if (h) return h;
  try { h = katex.renderToString(display ? t : '\\displaystyle ' + t, { throwOnError: true, displayMode: display, output: 'htmlAndMathml', strict: 'ignore', trust: false }); }
  catch (e) { h = '<span class="err">' + esc(t) + '</span>'; }
  if (kcache.size > 6000) kcache.clear();
  kcache.set(key, h);
  return h;
}
export function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// =====================================================================
//  Texto enriquecido: markdown + $latex$ + {expresión}
// =====================================================================
marked.setOptions({ gfm: true, breaks: true });
export function richText(src, scope, inline = false) {
  const store = [];
  let s = String(src || '');
  s = s.replace(/`([^`\n]+)`/g, (m, t) => { store.push('<code>' + esc(t.replace(/\\\|/g, '|')) + '</code>'); return '\u0000' + (store.length - 1) + '\u0000'; });
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => { store.push(K(t, true)); return '\u0000' + (store.length - 1) + '\u0000'; });
  s = s.replace(/\$([^$\n]+?)\$/g, (m, t) => { store.push(K(t)); return '\u0000' + (store.length - 1) + '\u0000'; });
  s = s.replace(/\{([^{}\n]+?)\}/g, (m, e) => {
    try {
      const v = math.evaluate(e.trim(), new Map(scope));
      const nv = typeof v === 'number' ? v : math.isUnit(v) ? v.value : 0;
      if (typeof nv !== 'number' || !isFinite(nv)) throw new Error('nv');
      store.push('<span class="ival">' + K(valTex(v)) + '</span>');
      return '\u0000' + (store.length - 1) + '\u0000';
    } catch (err) { if (/^[\w\s+\-*/^().,]+$/.test(e) && /[A-Za-z]/.test(e)) { store.push('<span class="ierr" title="Valor no disponible">⚠ ' + esc(e) + '</span>'); return '\u0000' + (store.length - 1) + '\u0000'; } return m; }
  });
  let h = inline ? marked.parseInline(s) : marked.parse(s);
  h = h.replace(/\u0000(\d+)\u0000/g, (m, i) => store[+i]);
  return h;
}

// =====================================================================
//  Evaluación de una línea / bloque de cálculo
// =====================================================================
const ERR_ES = [
  [/Undefined symbol (\w+)/, 'Variable no definida: $1'],
  [/Undefined function (\w+)/, 'Función no definida: $1'],
  [/Units do not match/, 'Unidades incompatibles'],
  [/Unexpected end of expression/, 'Expresión incompleta'],
  [/Value expected/, 'Se esperaba un valor'],
  [/Parenthesis \) expected/, 'Falta cerrar paréntesis )'],
  [/Unexpected operator/, 'Operador inesperado'],
  [/Unit .* not found/, 'Unidad no reconocida'],
  [/Cannot convert/, 'No se puede convertir unidades'],
  [/Invalid left hand side.*/, 'Lado izquierdo inválido en la asignación (use un nombre de variable válido)'],
  [/Cannot compare units with different base.*/, 'No se pueden comparar magnitudes de distinta dimensión (revise las unidades)'],
  [/Unexpected type of argument.*/, 'Tipo de dato no válido: probablemente se mezclan unidades incompatibles o un número sin unidades'],
  [/Dimension mismatch.*/, 'Los vectores no tienen el mismo tamaño'],
  [/Index out of range.*/, 'Índice fuera de rango'],
  [/Unexpected end of expression.*/, 'Expresión incompleta'],
  [/Unexpected operator.*/, 'Operador inesperado'],
  [/Unexpected part.*/, 'Texto inesperado en la expresión (¿falta un operador * o un paréntesis?)'],
  [/Too many arguments.*/, 'Demasiados argumentos en la función'],
  [/Too few arguments.*/, 'Faltan argumentos en la función'],
  [/Unexpected token.*/, 'Símbolo inesperado'],
];
export function errEs(e) {
  let m = (e && e.message) || String(e);
  for (const [r, t] of ERR_ES) if (r.test(m)) return m.replace(r, t).replace(/\(char \d+\)/, '').trim();
  return m;
}

// Unidades aceptadas literalmente; cualquier otro nombre que math.js reconozca como unidad
// (p. ej. Cs = centisegundo, Ts = terasegundo) y no esté definido como variable es casi
// seguro un error de tipeo o una variable no definida: se avisa en lugar de calcular en silencio.
const UNIT_OK = new Set(('m cm mm km um in inch ft yd mi s ms min h hr hour day week year kg g mg t tonne tonf tf kgf gf N kN MN daN lbf kip kipf lb lbm ' +
  'Pa kPa MPa GPa hPa bar mbar atm psi ksi deg rad grad Hz kHz W kW MW J kJ L l mL ml gal liter litre K degC degF celsius ' +
  'kWh Wh rpm cc cm3 m3 mm3 m2 cm2 mm2 ton').split(' '));
const _ucache = new Map();
function checkUnitNames(node, S) {
  const params = new Set();
  node.traverse(x => { if (x.type === 'FunctionAssignmentNode') x.params.forEach(p => params.add(p)); });
  node.traverse((x, path, parent) => {
    if (x.type !== 'SymbolNode' || S.has(x.name) || UNIT_OK.has(x.name) || params.has(x.name)) return;
    if (parent && parent.type === 'FunctionNode' && parent.fn === x) return;
    if (parent && parent.type === 'AssignmentNode' && parent.object === x) return;
    let isU = _ucache.get(x.name);
    if (isU === undefined) { isU = math.Unit.isValuelessUnit(x.name); _ucache.set(x.name, isU); }
    if (isU) {
      let desc = ''; try { const u = math.unit(x.name).units[0]; desc = (u.prefix && u.prefix.name ? 'prefijo «' + u.prefix.name + '» + ' : '') + 'unidad «' + u.unit.name + '»'; } catch (e) { /* */ }
      throw new Error('«' + x.name + '» no está definida como variable y math.js la interpretaría como una unidad (' + desc + '). Defínala antes o use otro nombre.');
    }
  });
}
const _pcache = new Map();
function parseCached(code) {
  let r = _pcache.get(code);
  if (!r) { const node = math.parse(code); r = { node, code: node.compile() }; if (_pcache.size > 4000) _pcache.clear(); _pcache.set(code, r); }
  return r;
}
// Ecuaciones largas: cada paso en su propia línea alineada en "="
function texLen(t) { return t.replace(/\\(mathrm|text|left|right|dfrac|frac|cdot|displaystyle|begin\{[a-z]+\}|end\{[a-z]+\})/g, ' ').replace(/[{}\\_^]/g, '').replace(/\s+/g, ' ').length; }
function joinEq(parts) {
  const total = parts.reduce((a, p) => a + texLen(p), 0);
  if (parts.length >= 3 && (total > 95 || parts.some(p => texLen(p) > 60)) && !parts.some(p => p.includes('\\begin{cases}'))) {
    return '\\begin{aligned}' + parts[0] + ' &= ' + parts.slice(1).join(' \\\\ &= ') + '\\end{aligned}';
  }
  return parts.join(' = ');
}
function splitComment(line) {
  // comentario con //  (fuera de cadenas)
  const i = line.indexOf('//');
  if (i < 0) return [line, ''];
  return [line.slice(0, i), line.slice(i + 2).trim()];
}

export function parseOptions(comment) {
  const m = /\[([^\]]*\|[^\]]*)\]\s*$/.exec(comment || '');
  if (!m) return { label: comment, options: null };
  const opts = m[1].split('|').map(s => s.trim()).map(o => { const k = o.indexOf(' : '); return k > 0 ? { v: o.slice(0, k).trim(), t: o.slice(k + 3).trim() } : { v: o, t: '' }; });
  return { label: comment.slice(0, m.index).trim(), options: opts.map(o => o.v), optLabels: opts.map(o => o.t) };
}

/**
 * Evalúa un bloque de cálculo.
 * ctx = { scope: Map, checks: [], inputs: [], toc: [], state:{mode, hidden, dec}, blockId, headNum }
 * Devuelve HTML.
 */
export function runCalc(src, ctx) {
  const lines = String(src || '').split('\n');
  const out = [];
  const S = ctx.scope;
  const st = ctx.state;
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const line = raw.trim();
    if (!line) { if (!st.hidden) out.push('<div class="gap"></div>'); continue; }
    try {
      // ----- directivas -----
      if (line.startsWith('@')) {
        const [cmd, ...args] = line.slice(1).trim().split(/\s+/);
        const arg = args.join(' ').toLowerCase();
        switch (cmd.toLowerCase()) {
          case 'dec': case 'decimales': st.dec = Math.max(0, Math.min(8, parseInt(arg) || 2)); break;
          case 'modo': st.mode = /res/.test(arg) ? 'res' : /cort|short/.test(arg) ? 'corto' : 'completo'; break;
          case 'ocultar': case 'hide': st.hidden = true; break;
          case 'mostrar': case 'show': st.hidden = false; break;
          case 'salto': case 'pagina': out.push('<div class="pb"></div>'); break;
          default: throw new Error('Directiva desconocida: @' + cmd);
        }
        continue;
      }
      // ----- títulos -----
      const hm = /^(#{1,4})\s+(.*)$/.exec(line);
      if (hm) {
        const lvl = hm[1].length;
        const num = ctx.heading(lvl);
        const id = 'h' + ctx.blockId + '_' + li;
        ctx.toc.push({ lvl, num, text: hm[2], id });
        out.push(`<h${lvl + 1} id="${id}" class="hd"><span class="hn">${num}</span>${richText(hm[2], S, true)}</h${lvl + 1}>`);
        continue;
      }
      // ----- texto -----
      if (line.startsWith('"') || line.startsWith("'")) {
        if (!st.hidden) out.push('<div class="txt">' + richText(line.slice(1).replace(/["']$/, ''), S, true) + '</div>');
        continue;
      }
      let [code, comment] = splitComment(line);
      code = code.trim();
      if (!code) { if (!st.hidden && comment) out.push('<div class="txt muted">' + richText(comment, S, true) + '</div>'); continue; }

      // ----- verificaciones -----
      const cm = /^(check|verificar|verif|cumple)\s+(.+)$/i.exec(code);
      if (cm) { out.push(renderCheck(cm[2], comment, ctx, li)); continue; }

      // ----- conversión destino:  expr -> unidad -----
      let target = null;
      const ai = code.lastIndexOf('->');
      if (ai > 0) { target = code.slice(ai + 2).trim(); code = code.slice(0, ai).trim(); }

      const pc = parseCached(code);
      const node = pc.node;
      checkUnitNames(node, S);
      let value = pc.code.evaluate(S);
      if (target && typeof value === 'number' && /^(deg|grados)$/.test(target)) {
        value = math.unit(value, 'rad').to('deg'); fixedUnits.set(value, 'deg');
        if (node.type === 'AssignmentNode') S.set(node.object.name, value);
      } else if (target && math.isUnit(value)) {
        const tu = target.replace(/·/g, '*');
        value = value.to(tu);
        fixedUnits.set(value, tu);
        if (node.type === 'AssignmentNode') S.set(node.object.name, value);
      }
      if (value && value.isResultSet) value = value.entries[value.entries.length - 1];
      { let nv = typeof value === 'number' ? value : math.isUnit(value) ? value.value : (math.isComplex(value) ? NaN : 0); if (math.isComplex(nv) || (nv !== null && typeof nv === 'object')) nv = NaN;
        if (Number.isNaN(nv)) throw new Error('Resultado no válido (NaN o número complejo): revise los datos, p.ej. raíz de un valor negativo');
        if (nv === Infinity || nv === -Infinity) throw new Error('Resultado infinito: división entre cero'); }
      if (st.hidden) continue;

      const dec = st.dec;
      const { label, options, optLabels } = parseOptions(comment);
      let eq;
      let isInput = false;
      if (node.type === 'AssignmentNode' && node.object.type === 'SymbolNode') {
        const name = node.object.name;
        const rhs = node.value;
        const lhs = symTex(name);
        if (isQty(rhs, S) || (rhs.type === 'ConstantNode' && typeof rhs.value === 'number') || (rhs.type === 'OperatorNode' && rhs.fn === 'unaryMinus' && isQty(rhs.args[0], S))) {
          isInput = true;
          if (math.isUnit(value) && !target) { try { fixedUnits.set(value, value.formatUnits()); } catch (e) { /* */ } }
          eq = lhs + ' = ' + (target ? valTex(value, dec) : tex(rhs, { mode: 'sym', scope: S, dec }));
          if (options && optLabels) { const k = options.map(x => x.replace(/\s+/g, ' ')).indexOf(code.slice(code.indexOf('=') + 1).trim().replace(/\s+/g, ' ')); if (k >= 0 && optLabels[k]) eq += '\\quad\\text{(' + optLabels[k].replace(/[{}\\$&#%_^~]/g, '') + ')}'; }
          const m = /^([^=]+)=\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(.*)$/.exec(code);
          ctx.inputs.push({ block: ctx.blockId, line: li, name, tex: lhs, num: m ? m[2] : '', unit: m ? m[3] : '', label, options, optLabels, raw: code });
        } else {
          const parts = [lhs];
          const symT = tex(rhs, { mode: 'sym', scope: S, dec });
          if (st.mode !== 'res') parts.push(symT);
          if (st.mode === 'completo' && hasScopeSymbols(rhs, S) && !(rhs.type === 'SymbolNode')) {
            // sustitución con el scope previo a la asignación
            const prev = new Map(S); prev.delete(name);
            if (ctx.prevVals.has(name)) prev.set(name, ctx.prevVals.get(name));
            const subT = tex(rhs, { mode: 'sub', scope: prev, dec });
            if (subT !== symT && subT !== valTex(value, dec)) parts.push(subT);
          }
          const vt = valTex(value, dec);
          if (parts[parts.length - 1] !== vt) parts.push(vt);
          eq = joinEq(parts);
        }
        ctx.prevVals.set(name, value);
      } else if (node.type === 'FunctionAssignmentNode') {
        eq = symTex(node.name) + '\\left(' + node.params.map(symTex).join(',') + '\\right) = ' + tex(node.expr, { mode: 'sym', scope: S, dec });
      } else if (node.type === 'AssignmentNode') {
        eq = tex(node.object, { mode: 'sym', scope: S, dec }) + ' = ' + valTex(value, dec);
      } else {
        const parts = [tex(node, { mode: 'sym', scope: S, dec })];
        if (st.mode === 'completo' && hasScopeSymbols(node, S) && node.type !== 'SymbolNode') { const t = tex(node, { mode: 'sub', scope: S, dec }); if (t !== parts[0]) parts.push(t); }
        parts.push(valTex(value, dec));
        eq = parts.join(' = ');
      }
      out.push(`<div class="ln${isInput ? ' in' : ''}${eq.startsWith('\\begin{aligned}') ? ' al' : ''}" data-b="${ctx.blockId}" data-l="${li}"><div class="eq">${K(eq)}</div>${label ? `<div class="cm">${richText(label, S, true)}</div>` : ''}</div>`);
    } catch (e) {
      // no propagar valores inválidos a las líneas siguientes
      const am = /^\s*([A-Za-z_]\w*)\s*=(?!=)/.exec(line);
      if (am && !/^(check|verificar|verif|cumple)\b/i.test(line)) S.delete(am[1]);
      const cmx = /^(check|verificar|verif|cumple)\s+(.+)$/i.exec(splitComment(line)[0].trim());
      if (cmx) ctx.checks.push({ ok: false, nv: true, label: (parseOptions(splitComment(line)[1]).label || cmx[2]), ratio: null, block: ctx.blockId, line: li });
      ctx.errors.push({ block: ctx.blockId, line: li + 1, msg: errEs(e) });
      out.push(`<div class="ln lerr" data-b="${ctx.blockId}" data-l="${li}"><code>${esc(line)}</code><span>⚠ Línea ${li + 1}: ${esc(errEs(e))}</span></div>`);
    }
  }
  return out.join('');
}

function renderCheck(expr, comment, ctx, li) {
  const S = ctx.scope;
  const node = math.parse(expr);
  const ok = truthy(node.compile().evaluate(S));
  node.traverse(n => { if (n.type === 'SymbolNode' && S.has(n.name)) { const v = S.get(n.name); const nv = typeof v === 'number' ? v : math.isUnit(v) ? v.value : 0; if (!isFinite(nv)) throw new Error('La verificación usa un valor no válido: ' + n.name); } });
  let eq, ratio = null;
  const side = (n) => {
    const v = n.compile().evaluate(S);
    const sym = tex(n, { mode: 'sym', scope: S, dec: ctx.state.dec });
    const vt = valTex(v, ctx.state.dec);
    return { v, t: (n.type === 'ConstantNode' || isQty(n, S) || sym === vt) ? vt : sym + ' = ' + vt };
  };
  if (node.type === 'OperatorNode' && REL[node.fn]) {
    const L = side(node.args[0]), R = side(node.args[1]);
    eq = L.t + ' \\;' + REL[node.fn] + '\\; ' + R.t;
    try {
      const a = math.isUnit(L.v) ? L.v.value : L.v, b = math.isUnit(R.v) ? R.v.value : R.v;
      if (typeof a === 'number' && typeof b === 'number' && a > 0 && b > 0) {
        if (node.fn === 'smaller' || node.fn === 'smallerEq') ratio = a / b;
        else if (node.fn === 'larger' || node.fn === 'largerEq') ratio = b / a;
      }
    } catch (e) { /* */ }
  } else eq = tex(node, { mode: 'sym', scope: S });
  const { label } = parseOptions(comment);
  ctx.checks.push({ ok, label: label || expr, ratio, block: ctx.blockId, line: li });
  const badge = ok ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>';
  const r = ratio !== null && isFinite(ratio) ? `<span class="dc">D/C = ${ratio.toFixed(2)}</span>` : '';
  return `<div class="ln chk ${ok ? 'cok' : 'cbad'}" data-b="${ctx.blockId}" data-l="${li}"><div class="eq">${K(eq)}</div><div class="cm">${label ? richText(label, S, true) + ' ' : ''}${badge}${r}</div></div>`;
}

// Evalúa una expresión de parámetro (texto) en el scope; devuelve número en la unidad indicada
export function evalParam(str, S, unit, def) {
  if (str === undefined || str === null || String(str).trim() === '') return def;
  const v = math.evaluate(String(str), new Map(S));
  if (math.isUnit(v)) return unit ? v.toNumber(unit) : v.value;
  if (typeof v === 'number') return v;
  throw new Error('Valor no numérico: ' + str);
}
export function evalList(str, S, unit) {
  if (!str) return [];
  return String(str).split(/[;,]/).map(s => s.trim()).filter(Boolean).map(s => evalParam(s, S, unit));
}

// Reemplaza {expr} por su valor (texto plano) — para parámetros de dibujo
export function interp(str, S) {
  return String(str || '').replace(/\{([^{}]+)\}/g, (m, e) => {
    try { const v = math.evaluate(e.trim(), new Map(S)); return typeof v === 'number' ? fmtPlain(v) : valText(v); } catch (err) { return m; }
  });
}
