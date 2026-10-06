// =====================================================================
//  Funciones normativas — módulo «steel» (Acero estructural)
//  ANSI/AISC 360-16/22 (LRFD) · NTE E.090 · AISI S100-16 · AISC Design Guide 1
//  Base de datos de perfiles: AISC Shapes Database + perfiles europeos
// =====================================================================
import { defineFns, math, toNum, mkUnit, settings } from '../engine.js';
import { FIELDS, FAMUNIT, RAW } from './steel_shapes.js';

// ---------------------------------------------------------------------
//  Base de datos
// ---------------------------------------------------------------------
const DB = new Map();      // nombre -> { fam, name, p: {campo: número} }
for (const fam of Object.keys(RAW)) {
  const f = FIELDS[fam];
  for (const row of RAW[fam].split('\n')) {
    const c = row.split('|'); const p = {};
    f.forEach((k, i) => { const v = c[i + 1]; if (v !== '' && v !== undefined) p[k] = +v; });
    // Ángulos de lados desiguales: en el archivo de origen «d» es el ala corta y «b» la larga, pero Ix, ȳ se refieren
    // al ala larga vertical (Manual AISC, Tabla 1-7). Se ordena d = ala larga (vertical), b2 = ala corta (revisión 2026).
    if (fam === 'L' && p.d < p.b2) { const t = p.d; p.d = p.b2; p.b2 = t; }
    DB.set(c[0], { fam, name: c[0], p });
  }
}
export const SHAPES = DB;
const TIPOS = { T: 'Perfil T (WT, propiedades calculadas)', D: 'Doble ángulo 2L (propiedades calculadas)', K: 'Canal atiesado conformado en frío', I: 'Perfil I (AISC)', C: 'Canal C/MC', L: 'Ángulo L', R: 'Tubo HSS rectangular/cuadrado', O: 'Tubo HSS redondo / Pipe', E: 'Perfil I europeo' };

function normName(s) {
  const up = String(s).toUpperCase().trim();
  // europeos: "HE200B", "HE 200 B", "HEB-200", "IPE 300"
  const c = up.replace(/[\s-]/g, '');
  let m = /^HE(\d+)([ABM])$/.exec(c); if (m) return 'HE' + m[2] + m[1];
  m = /^(IPE|HEA|HEB|HEM)(\d+)$/.exec(c); if (m) return m[1] + m[2];
  let n = up.replace(/[\s×*]/g, 'X').replace(/X+/g, 'X').replace(/^([A-Z]+)X(?=\d)/, '$1');
  return n.replace(/X\./g, 'X0.');
}
export function getShape(name) {
  if (name && name.fam) return name;
  if (typeof name !== 'string') throw new Error('El perfil debe indicarse como texto entre comillas, p. ej. "W12X26"');
  const n = normName(name);
  let s = DB.get(n);
  if (!s) {
    // HSS con espesor decimal: HSS6X6X.375 o HSS6X6X0.375
    const m = /^HSS([\d.]+)X([\d.]+)X([\d.]+)$/.exec(n);
    if (m) for (const v of DB.values()) if (v.fam === 'R' && Math.abs(v.p.Ht - m[1]) < 1e-3 && Math.abs(v.p.B - m[2]) < 1e-3 && Math.abs(v.p.tnom - m[3]) < 2e-3) { s = v; break; }
    const r = /^HSS([\d.]+)X([\d.]+)$/.exec(n);
    if (!s && r) for (const v of DB.values()) if (v.fam === 'O' && Math.abs(v.p.OD - r[1]) < 6e-3 && Math.abs(v.p.tnom - r[2]) < 2e-3 && v.name.startsWith('HSS')) { s = v; break; }
  }
  if (!s) s = coldFormed(n);
  if (!s) s = teeShape(n);
  if (!s) s = doubleAngle(n);
  if (!s) throw new Error('Perfil no encontrado en la base de datos: ' + name + ' (ejemplos: "W12X26", "HSS6X6X3/8", "L4X4X1/2", "C10X15.3", "IPE300", "HEB200", "WT6X13", "2L4X4X1/2", "CF150X50X15X2")');
  return s;
}
// ---------------------------------------------------------------------
//  Perfiles T (WT) obtenidos cortando un W de la base, y dobles ángulos 2L.
//  Propiedades calculadas (no tabuladas): rectángulos + filetes del W padre.
// ---------------------------------------------------------------------
const fmtN = (x) => String(+x.toFixed(4)).replace(/\.0+$/, '');
function teeShape(n) {
  const m = /^WT([\d.]+)X([\d.]+)$/.exec(n);
  if (!m) return null;
  if (CFC.has(n)) return CFC.get(n);
  const par = DB.get('W' + fmtN(2 * m[1]) + 'X' + fmtN(2 * m[2]));
  if (!par) throw new Error('No existe el perfil W de origen para ' + n + ' (se busca W' + fmtN(2 * m[1]) + 'X' + fmtN(2 * m[2]) + ')');
  const q = par.p, d = q.d / 2, bf = q.bf, tf = q.tf, tw = q.tw, A = q.A / 2;
  const r = Math.max(0, q.kdes - tf);
  const Af = Math.max(0, A - bf * tf - (d - tf) * tw);        // área de los dos filetes
  const parts = [[bf * tf, tf / 2, bf * tf ** 3 / 12], [(d - tf) * tw, tf + (d - tf) / 2, tw * (d - tf) ** 3 / 12], [Af, tf + 0.2234 * r, 0]];
  const y = parts.reduce((s, p) => s + p[0] * p[1], 0) / A;   // centroide desde la cara exterior del ala
  const Ix = parts.reduce((s, p) => s + p[2] + p[0] * (p[1] - y) ** 2, 0);
  // eje neutro plástico (área A/2 a cada lado)
  let yp, Zx;
  if (A / 2 <= bf * tf) { yp = A / (2 * bf); Zx = bf * yp ** 2 / 2 + bf * (tf - yp) ** 2 / 2 + Af * (tf + 0.2234 * r - yp) + (d - tf) * tw * (tf + (d - tf) / 2 - yp); }
  else { const rest = A / 2 - bf * tf - Af; yp = tf + rest / tw; Zx = bf * tf * (yp - tf / 2) + Af * Math.abs(yp - tf - 0.2234 * r) + tw * (yp - tf) ** 2 / 2 + tw * (d - yp) ** 2 / 2; }
  const Iy = q.Iy / 2, J = q.J / 2, Cw = bf ** 3 * tf ** 3 / 144 + (d - tf / 2) ** 3 * tw ** 3 / 36;
  const yo = y - tf / 2, ro2 = yo * yo + (Ix + Iy) / A;
  const p = { W: q.W / 2, A, d, bf, tw, tf, kdes: q.kdes, y, yp, 'bf/2tf': q['bf/2tf'], 'd/tw': d / tw, Ix, Zx, Sx: Ix / (d - y), Sxc: Ix / y, rx: Math.sqrt(Ix / A), Iy, Zy: q.Zy / 2, Sy: q.Sy / 2, ry: q.ry, J, Cw, yo, ro: Math.sqrt(ro2), H3: 1 - yo * yo / ro2 };
  const s = { fam: 'T', name: n, p, parent: par.name };
  CFC.set(n, s); return s;
}
// Dobles ángulos espalda con espalda: "2L4X4X1/2" (separación 3/8 in por defecto), "2L6X4X1/2X3/4" (separación 3/4 in),
// sufijo LLBB (alas largas espalda con espalda, defecto) o SLBB (alas cortas).
function doubleAngle(n) {
  const m = /^2L([\d.]+)X([\d.]+)X([\d/.-]+?)(?:X([\d/.]+))?(LLBB|SLBB)?$/.exec(n);
  if (!m) return null;
  if (CFC.has(n)) return CFC.get(n);
  const L1 = DB.get('L' + m[1] + 'X' + m[2] + 'X' + m[3]);
  if (!L1) throw new Error('No existe el ángulo L' + m[1] + 'X' + m[2] + 'X' + m[3] + ' para formar ' + n);
  const frac = (t) => (t.includes('/') ? t.split('/').reduce((a, b) => a / b) : +t);
  const gap = m[4] ? frac(m[4]) : 0.375, sl = m[5] === 'SLBB';
  const q = L1.p, A = 2 * q.A, t = q.t;
  // eje x: horizontal (paralelo a las alas salientes); eje y: de simetría entre ángulos
  const dv = sl ? q.b2 : q.d, bo = sl ? q.d : q.b2;              // ala vertical (espalda con espalda) y ala saliente
  const IxL = sl ? q.Iy : q.Ix, IyL = sl ? q.Ix : q.Iy, yb = sl ? q.x : q.y, xb = sl ? q.y : q.x, ZxL = sl ? q.Zy : q.Zx;
  const Ix = 2 * IxL, Iy = 2 * (IyL + q.A * (xb + gap / 2) ** 2);
  const yo = yb - t / 2, ro2 = yo * yo + (Ix + Iy) / A;
  const p = { W: 2 * q.W, A, d: dv, b2: bo, t, gap, x: xb, y: yb, 'b/t': Math.max(dv, bo) / t, Ix, Zx: 2 * ZxL, Sx: Ix / (dv - yb), Sxc: Ix / yb, rx: Math.sqrt(Ix / A), Iy, Zy: 2 * q.A * (xb + gap / 2), Sy: Iy / (bo + gap / 2), ry: Math.sqrt(Iy / A), rz: q.rz, J: 2 * q.J, Cw: 2 * (q.Cw || 0), yo, ro: Math.sqrt(ro2), H3: 1 - yo * yo / ro2 };
  const s = { fam: 'D', name: n, p, parent: L1.name };
  CFC.set(n, s); return s;
}
// Canal atiesado conformado en frío "CF H x B x D x t" (mm), método lineal con esquinas rectas
// (AISI Cold-Formed Steel Design Manual, Parte I). Ej.: CF150X50X15X2
const CFC = new Map();
function coldFormed(n) {
  const m = /^CF([\d.]+)X([\d.]+)X([\d.]+)X([\d.]+)$/.exec(n);
  if (!m) return null;
  if (CFC.has(n)) return CFC.get(n);
  const [H, B, D, t] = m.slice(1).map(Number);
  if (!(H > 4 * t && B > 3 * t && D >= 0 && t > 0)) throw new Error('Dimensiones de perfil conformado inválidas: ' + n);
  const a = H - t, bb = B - t, c = D > 0 ? D - t / 2 : 0, Ls = a + 2 * bb + 2 * c;
  const A = t * Ls;
  const Ix = t * (a ** 3 / 12 + 2 * bb * (a / 2) ** 2 + 2 * (c ** 3 / 12 + c * (a / 2 - c / 2) ** 2));
  const xw = t * bb * (bb + 2 * c) / A; // centroide desde el eje del alma
  const Iy = t * (a * xw * xw + 2 * (bb ** 3 / 12 + bb * (bb / 2 - xw) ** 2) + 2 * c * (bb - xw) ** 2);
  const J = t ** 3 * Ls / 3;
  const p = { W: A * 7.85e-3, A, d: H, bf: B, D, t, tdes: t, x: xw + t / 2, Ix, Sx: Ix / (H / 2), rx: Math.sqrt(Ix / A), Iy, Sy: Iy / (bb - xw + t / 2), ry: Math.sqrt(Iy / A), J, 'h/t': (H - 2 * t) / t, 'b/t': (B - 2 * t) / t, 'D/t': D > 0 ? (D - t) / t : 0 };
  const s = { fam: 'K', name: n, p };
  CFC.set(n, s); return s;
}
export function shapeList(fam) { return [...DB.values()].filter(v => !fam || v.fam === fam).map(v => v.name); }

const DIM = {
  1: ['yp', 'yo', 'gap', 'D', 'd', 'bf', 'tw', 'tf', 'kdes', 'kdet', 'k1', 'x', 'y', 'eo', 'xp', 'yp', 'ro', 'rts', 'ho', 'Ht', 'B', 'tnom', 'tdes', 'h', 'b2', 'OD', 'ID', 't', 'r', 'rx', 'ry', 'rz'],
  2: ['A'], 3: ['Sxc', 'Zx', 'Sx', 'Zy', 'Sy', 'Sz', 'C'], 4: ['Ix', 'Iy', 'Iz', 'J'], 6: ['Cw'],
};
const POW = {}; for (const [p, ks] of Object.entries(DIM)) for (const k of ks) POW[k] = +p;
const ALIAS = {
  Ag: 'A', k: 'kdes', bf2tf: 'bf/2tf', lambdaf: 'bf/2tf', htw: 'h/tw', lambdaw: 'h/tw', bt: 'b/t', b_t: 'b/t', ht: 'h/tdes', h_t: 'h/tdes',
  Dt: 'D/t', D_t: 'D/t', peso: 'W', w: 'W', tan: 'tan(α)', tana: 'tan(α)', H: 'H3', b: 'b2', D: 'OD', Iw: 'Cw', It: 'J', Wpl: 'Zx', Wel: 'Sx',
};
const FAMU = { ...FAMUNIT, T: 'in', D: 'in' };
const lenU = () => (settings.sys === 'us' ? 'in' : settings.sys === 'si' ? 'mm' : 'cm');
// valor numérico crudo (en las unidades de la familia)
function raw(s, prop) {
  const p = s.p;
  let k = prop;
  if (!(k in p) && ALIAS[k] && ALIAS[k] in p) k = ALIAS[k];
  if (s.fam === 'R' && (prop === 'b/t' || prop === 'bt' || prop === 'b_t')) k = 'b/tdes';
  if (s.fam === 'R' && prop === 'b') k = 'b2';
  if (s.fam === 'R' && prop === 'd') k = 'Ht';
  if (s.fam === 'R' && prop === 'bf') k = 'B';
  if ((s.fam === 'R' || s.fam === 'O') && prop === 't') k = 'tdes';
  if ((s.fam === 'L' || s.fam === 'D') && prop === 'b') k = 'b2';
  if (s.fam === 'T' && (prop === 'h/tw' || prop === 'htw' || prop === 'lambdaw')) k = 'd/tw';
  if (s.fam === 'O' && prop === 'd') k = 'OD';
  if ((s.fam === 'O') && (prop === 'Iy' || prop === 'Zy' || prop === 'Sy' || prop === 'ry')) k = prop.replace('y', 'x');
  if ((s.fam === 'I' || s.fam === 'E' || s.fam === 'C') && prop === 'h') return { v: p['h/tw'] * p.tw, k: 'h' };
  if (!(k in p)) throw new Error('Propiedad "' + prop + '" no disponible para ' + s.name + ' (' + TIPOS[s.fam] + '). Disponibles: ' + Object.keys(p).join(', '));
  return { v: p[k], k };
}
export function prop(s, propName, unitSys) {
  s = getShape(s);
  const { v, k } = raw(s, propName);
  const fu = FAMU[s.fam] || 'mm';
  if (k === 'W') return s.fam === 'E' || s.fam === 'K' ? mkUnit(v, 'kgf/m') : mkUnit(v, 'lbf/ft');
  const pw = POW[k];
  if (!pw) return v;
  const u = mkUnit(v, pw === 1 ? fu : fu + '^' + pw);
  const tu = unitSys || lenU();
  return u.to(pw === 1 ? tu : tu + '^' + pw);
}
// número en unidades base (m, m², …) o adimensional
function P(s, k) { const x = prop(s, k, 'm'); return math.isUnit(x) ? x.toNumber() : x; }

// ---------------------------------------------------------------------
//  Utilidades de unidades
// ---------------------------------------------------------------------
const SYSU = {
  us: { F: 'kip', S: 'ksi', L: 'in', M: 'kip*ft', A: 'in^2', Fl: 'kip/in' },
  si: { F: 'kN', S: 'MPa', L: 'mm', M: 'kN*m', A: 'mm^2', Fl: 'kN/mm' },
  tec: { F: 'tonf', S: 'kgf/cm^2', L: 'cm', M: 'tonf*m', A: 'cm^2', Fl: 'tonf/cm' },
};
const BASE = { F: 'N', S: 'Pa', L: 'm', M: 'N*m', A: 'm^2', Fl: 'N/m' };
const out = (v, dim) => mkUnit(v, BASE[dim]).to(SYSU[settings.sys] ? SYSU[settings.sys][dim] : SYSU.tec[dim]);
const Pa = (x, def) => (x === undefined ? def : math.isUnit(x) ? x.toNumber('Pa') : (() => { throw new Error('Se esperaba un esfuerzo con unidades (p. ej. 50 ksi o 345 MPa)'); })());
const Mt = (x) => (math.isUnit(x) ? x.toNumber('m') : (() => { throw new Error('Se esperaba una longitud con unidades'); })());
const M2 = (x) => (math.isUnit(x) ? x.toNumber('m^2') : (() => { throw new Error('Se esperaba un área con unidades'); })());
const Nn = (x) => (math.isUnit(x) ? x.toNumber('N') : (() => { throw new Error('Se esperaba una fuerza con unidades'); })());
const nd = (x) => (math.isUnit(x) ? x.toNumber('') : toNum(x));
const ES = 29000 * 6894757.29, GS = 11200 * 6894757.29;
const str = (x) => String(x).toUpperCase().trim();

// ---------------------------------------------------------------------
//  Compresión — AISC 360 Cap. E
// ---------------------------------------------------------------------
export function fcrE3(Fy, Fe) { return Fy / Fe <= 2.25 ? Math.pow(0.658, Fy / Fe) * Fy : 0.877 * Fe; }
// Ancho efectivo E7.1 (E7-2, E7-3) — c1/c2 de la Tabla E7.1
const E71 = { a: [0.18, 1.31], b: [0.20, 1.38], c: [0.22, 1.49] };
export function beE7(b, t, lr, Fy, Fcr, caso = 'c') {
  const [c1, c2] = E71[caso] || E71.c; const lam = b / t;
  if (lam <= lr * Math.sqrt(Fy / Fcr)) return b;
  const Fel = (c2 * lr / lam) ** 2 * Fy;
  return Math.min(b, b * (1 - c1 * Math.sqrt(Fel / Fcr)) * Math.sqrt(Fel / Fcr));
}
// Resistencia nominal a compresión de un perfil de la base:
//   E3 (flexión), E4 (torsión / flexo-torsión: canales, T, 2L y, si se da Lcz, perfiles I), E6 (2L con conectores), E7 (esbeltos)
export function compAISC(sh, Fy, Lcx, Lcy, E = ES, Lcz, aConn) {
  const s = getShape(sh), G = E * GS / ES;
  if (s.fam === 'L') return compE5(s, Fy, Math.max(Lcx, Lcy), 'a', 'larga', E);
  if (s.fam === 'K') throw new Error('Perfiles conformados en frío: use AISI S100 (rhoAISI, kLabioAISI); PnE3 no aplica');
  const A = P(s, 'A'), rx = P(s, 'rx'), ry0 = s.fam === 'O' ? rx : P(s, 'ry');
  const sx = Lcx / rx; let sy = Lcy / ry0, e6 = '';
  if (s.fam === 'D' && aConn !== undefined && aConn > 0) { // E6.1: esbeltez modificada de miembros armados (Ki = 0.50 ángulos espalda con espalda)
    const ri = P(s, 'rz'), ar = aConn / ri;
    if (ar > 40) { sy = Math.sqrt(sy * sy + (0.5 * ar) ** 2); e6 = ', E6-2b'; }
  }
  let Fe = Math.PI ** 2 * E / Math.max(sx, sy) ** 2, modo = 'flexión (E3)' + e6;
  const Lz = Lcz ?? Math.max(Lcx, Lcy);
  if (s.fam === 'C' || s.fam === 'T' || s.fam === 'D') {
    // C: eje de simetría x (E4-3 con Fex); T y 2L: eje de simetría y (E4-3 con Fey)
    const ro = P(s, 'ro'), H = s.p.H3, Cw = P(s, 'Cw'), J = P(s, 'J');
    const Fex = Math.PI ** 2 * E / sx ** 2, Fey = Math.PI ** 2 * E / sy ** 2;
    const Fez = (Math.PI ** 2 * E * Cw / Lz ** 2 + G * J) / (A * ro * ro);
    const Fs = s.fam === 'C' ? Fex : Fey, Fo = s.fam === 'C' ? Fey : Fex;
    const Fft = (Fs + Fez) / (2 * H) * (1 - Math.sqrt(1 - 4 * Fs * Fez * H / (Fs + Fez) ** 2));
    Fe = Math.min(Fo, Fft); modo = Fft < Fo ? 'flexo-torsional (E4-3)' + e6 : 'flexión (E3)' + e6;
  } else if ((s.fam === 'I' || s.fam === 'E') && Lcz !== undefined) {
    // E4-2: pandeo torsional de perfiles doblemente simétricos cuando Lcz > Lcy
    const Fez = (Math.PI ** 2 * E * P(s, 'Cw') / Lcz ** 2 + G * P(s, 'J')) / (P(s, 'Ix') + P(s, 'Iy'));
    if (Fez < Fe) { Fe = Fez; modo = 'torsional (E4-2)'; }
  }
  const Fcr = fcrE3(Fy, Fe);
  // E7: elementos esbeltos
  let Ae = A; const sq = Math.sqrt(E / Fy);
  if (s.fam === 'I' || s.fam === 'E' || s.fam === 'C') {
    const bf = P(s, 'bf'), tf = P(s, 'tf'), tw = P(s, 'tw'), h = P(s, 'h');
    const bfl = s.fam === 'C' ? bf : bf / 2, nfl = s.fam === 'C' ? 2 : 4;
    const be = beE7(bfl, tf, 0.56 * sq, Fy, Fcr, 'c');
    const he = beE7(h, tw, 1.49 * sq, Fy, Fcr, 'a');
    Ae = A - nfl * (bfl - be) * tf - (h - he) * tw;
  } else if (s.fam === 'T') {
    const bf = P(s, 'bf'), tf = P(s, 'tf'), tw = P(s, 'tw'), d = P(s, 'd');
    Ae = A - 2 * (bf / 2 - beE7(bf / 2, tf, 0.56 * sq, Fy, Fcr, 'c')) * tf - (d - beE7(d, tw, 0.75 * sq, Fy, Fcr, 'c')) * tw; // Tabla B4.1a casos 1 y 4
  } else if (s.fam === 'D') {
    const t = P(s, 't'), d = P(s, 'd'), b = P(s, 'b2'), lr = (s.p.gap > 0 ? 0.45 : 0.56) * sq; // caso 3 (con separadores) o caso 1 (contacto continuo)
    Ae = A - 2 * ((d - beE7(d, t, lr, Fy, Fcr, 'c')) + (b - beE7(b, t, lr, Fy, Fcr, 'c'))) * t;
  } else if (s.fam === 'R') {
    const t = P(s, 'tdes'), b = P(s, 'b2'), h = P(s, 'h');
    Ae = A - 2 * (b - beE7(b, t, 1.40 * sq, Fy, Fcr, 'b')) * t - 2 * (h - beE7(h, t, 1.40 * sq, Fy, Fcr, 'b')) * t;
  } else if (s.fam === 'O') {
    const Dt = s.p['D/t'];
    if (Dt > 0.11 * E / Fy) Ae = Math.min(1, 0.038 * E / (Fy * Dt) + 2 / 3) * A; // E7-6
  }
  return { Pn: Fcr * Ae, Fcr, Fe, Ae, A, sx, sy, modo };
}
// E5: ángulos simples cargados por un ala (AISC 360-16/22 E5)
//   tipo 'a': miembro individual o alma de armadura plana (E5-1/E5-2); 'b': armaduras espaciales o de cajón (E5-3/E5-4)
//   conex: 'larga' (ala larga conectada o lados iguales) | 'corta' (ala corta conectada, bl/bs < 1.7)
export function compE5(sh, Fy, L, tipo = 'a', conex = 'larga', E = ES) {
  const s = getShape(sh);
  if (s.fam !== 'L') throw new Error('PnE5: válido solo para ángulos simples L');
  const A = P(s, 'A'), t = P(s, 't'), bl = P(s, 'd'), bs = P(s, 'b2'), rz = P(s, 'rz');
  const corta = /^C|SHORT/i.test(String(conex));
  const ra = corta ? P(s, 'rx') : P(s, 'ry'); // radio respecto al eje geométrico paralelo al ala conectada (ala larga d vertical → eje y)
  if (corta && bl / bs >= 1.7) throw new Error('E5: ala corta conectada con bl/bs ≥ 1.7 fuera del alcance de E5; analice el ángulo con E3/E4 y flexión');
  const Lr = L / ra; let esb;
  if (/^b/i.test(String(tipo))) esb = Lr <= 75 ? 60 + 0.8 * Lr : 45 + Lr;
  else esb = Lr <= 80 ? 72 + 0.75 * Lr : 32 + 1.25 * Lr;
  if (corta) esb = Math.max(esb + 4 * ((bl / bs) ** 2 - 1), 0.95 * L / rz);
  const Fe = Math.PI ** 2 * E / esb ** 2, Fcr = fcrE3(Fy, Fe), sq = Math.sqrt(E / Fy);
  const Ae = A - ((bl - beE7(bl, t, 0.45 * sq, Fy, Fcr, 'c')) + (bs - beE7(bs, t, 0.45 * sq, Fy, Fcr, 'c'))) * t; // E7 con λr = 0.45√(E/Fy)
  return { Pn: Fcr * Ae, Fcr, Fe, Ae, A, Lr, esb, ra, modo: 'E5 (' + (/^b/i.test(String(tipo)) ? 'armadura espacial' : 'individual / armadura plana') + ')' };
}

// ---------------------------------------------------------------------
//  Flexión — AISC 360 Cap. F
// ---------------------------------------------------------------------
export function mnF2(Fy, E, Zx, Sx, ry, rts, J, ho, Lb, Cb, c = 1) {
  const Mp = Fy * Zx, Lp = 1.76 * ry * Math.sqrt(E / Fy);
  const jc = J * c / (Sx * ho);
  const Lr = 1.95 * rts * E / (0.7 * Fy) * Math.sqrt(jc + Math.sqrt(jc * jc + 6.76 * (0.7 * Fy / E) ** 2));
  let Mn;
  if (Lb <= Lp) Mn = Mp;
  else if (Lb <= Lr) Mn = Math.min(Mp, Cb * (Mp - (Mp - 0.7 * Fy * Sx) * (Lb - Lp) / (Lr - Lp)));
  else { const Fcr = Cb * Math.PI ** 2 * E / (Lb / rts) ** 2 * Math.sqrt(1 + 0.078 * jc * (Lb / rts) ** 2); Mn = Math.min(Mp, Fcr * Sx); }
  return { Mn, Mp, Lp, Lr };
}
// Perfiles I doblemente simétricos con alma no compacta (F4) o esbelta (F5) — geometría de planchas
// g = { d, bf, tf, tw, h, Sx, Zx, Iy, J } (unidades SI). Devuelve { Mn, Lp, Lr, estado, ... }
export function mnF4F5(g, Fy, Lb, Cb = 1, E = ES) {
  const { d, bf, tf, tw } = g, h = g.h ?? d - 2 * tf, ho = d - tf;
  const Sx = g.Sx ?? (bf * d ** 3 - (bf - tw) * h ** 3) / (6 * d), Zx = g.Zx ?? bf * tf * (d - tf) + tw * h * h / 4;
  const Iy = g.Iy ?? (2 * tf * bf ** 3 + h * tw ** 3) / 12, J = g.J ?? (2 * bf * tf ** 3 + ho * tw ** 3) / 3;
  const sq = Math.sqrt(E / Fy), lw = h / tw, lpw = 3.76 * sq, lrw = 5.70 * sq;
  const lf = bf / (2 * tf), lpf = 0.38 * sq, lrf = 1.0 * sq, kc = Math.min(0.76, Math.max(0.35, 4 / Math.sqrt(lw)));
  const aw = Math.min(10, h * tw / (bf * tf)), rt = bf / Math.sqrt(12 * (1 + aw / 6)); // F4-11 (hc = h)
  const Myc = Fy * Sx, FL = 0.7 * Fy;
  if (lw <= lrw) {
    // F4 (Iyc/Iy = 0.5 > 0.23)
    const MpM = Math.min(Fy * Zx, 1.6 * Myc) / Myc;
    const Rpc = lw <= lpw ? MpM : Math.min(MpM, MpM - (MpM - 1) * (lw - lpw) / (lrw - lpw)); // F4-9b
    const Mcfy = Rpc * Myc; // F4-1
    const Lp = 1.1 * rt * sq, jc = J / (Sx * ho);
    const Lr = 1.95 * rt * E / FL * Math.sqrt(jc + Math.sqrt(jc * jc + 6.76 * (FL / E) ** 2)); // F4-8
    let Mltb = Mcfy;
    if (Lb > Lp && Lb <= Lr) Mltb = Math.min(Mcfy, Cb * (Mcfy - (Mcfy - FL * Sx) * (Lb - Lp) / (Lr - Lp))); // F4-2
    else if (Lb > Lr) { const Fcr = Cb * Math.PI ** 2 * E / (Lb / rt) ** 2 * Math.sqrt(1 + 0.078 * jc * (Lb / rt) ** 2); Mltb = Math.min(Mcfy, Fcr * Sx); } // F4-3, F4-5
    let Mflb = Mcfy;
    if (lf > lpf && lf <= lrf) Mflb = Mcfy - (Mcfy - FL * Sx) * (lf - lpf) / (lrf - lpf); // F4-13
    else if (lf > lrf) Mflb = 0.9 * E * kc * Sx / lf ** 2; // F4-14
    return { Mn: Math.min(Mcfy, Mltb, Mflb), Mp: Fy * Zx, Lp, Lr, Rpc, rt, estado: 'alma no compacta (F4)' + (lf > lpf ? (lf <= lrf ? ', ala no compacta' : ', ala esbelta') : '') };
  }
  // F5: alma esbelta
  const Rpg = Math.min(1, 1 - aw / (1200 + 300 * aw) * (lw - 5.7 * sq)); // F5-6
  const Lp = 1.1 * rt * sq, Lr = Math.PI * rt * Math.sqrt(E / FL); // F4-7, F5-5
  let Fcr = Fy;
  if (Lb > Lp && Lb <= Lr) Fcr = Math.min(Fy, Cb * (Fy - 0.3 * Fy * (Lb - Lp) / (Lr - Lp))); // F5-3
  else if (Lb > Lr) Fcr = Math.min(Fy, Cb * Math.PI ** 2 * E / (Lb / rt) ** 2); // F5-4
  let Ff = Fy;
  if (lf > lpf && lf <= lrf) Ff = Fy - 0.3 * Fy * (lf - lpf) / (lrf - lpf); // F5-8
  else if (lf > lrf) Ff = 0.9 * E * kc / lf ** 2; // F5-9
  const Mn = Rpg * Sx * Math.min(Fy, Fcr, Ff); // F5-1, F5-2, F5-7
  return { Mn, Mp: Fy * Zx, Lp, Lr, Rpg, rt, estado: 'alma esbelta (F5)' };
}
// Perfil I / canal de la base: F2 (compacto), F3 (ala no compacta/esbelta), F4/F5 (alma no compacta/esbelta)
export function flexI(sh, Fy, Lb, Cb = 1, E = ES) {
  const s = getShape(sh);
  if (s.fam === 'T' || s.fam === 'D') return flexT(s, Fy, Lb, Cb, 'traccion', E);
  if (!(s.fam === 'I' || s.fam === 'E' || s.fam === 'C')) throw new Error('MnW: válido para perfiles I, canales, T y 2L; use MnHSS para tubos');
  const Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), ry = P(s, 'ry'), rts = P(s, 'rts'), J = P(s, 'J'), ho = P(s, 'ho');
  const lw = s.p['h/tw'];
  if (lw > 3.76 * Math.sqrt(E / Fy)) {
    if (s.fam === 'C') throw new Error('Canal con alma no compacta (h/tw = ' + lw + '): F4/F5 aplican a perfiles I');
    return mnF4F5({ d: P(s, 'd'), bf: P(s, 'bf'), tf: P(s, 'tf'), tw: P(s, 'tw'), h: P(s, 'h'), Sx, Zx, Iy: P(s, 'Iy'), J }, Fy, Lb, Cb, E);
  }
  const c = s.fam === 'C' ? ho / 2 * Math.sqrt(P(s, 'Iy') / P(s, 'Cw')) : 1;
  const r = mnF2(Fy, E, Zx, Sx, ry, rts, J, ho, Lb, Cb, c);
  const lf = s.fam === 'C' ? s.p['b/t'] : s.p['bf/2tf'];
  const lpf = 0.38 * Math.sqrt(E / Fy), lrf = 1.0 * Math.sqrt(E / Fy);
  let Mflb = r.Mp, estado = 'compacta (F2)';
  if (lf > lpf && s.fam === 'C') estado = 'canal con ala no compacta: F2 supone ala compacta (verifique)';
  if (lf > lpf && s.fam !== 'C') {
    if (lf <= lrf) { Mflb = r.Mp - (r.Mp - 0.7 * Fy * Sx) * (lf - lpf) / (lrf - lpf); estado = 'ala no compacta (F3-1)'; }
    else { const h = P(s, 'h'), tw = P(s, 'tw'); const kc = Math.min(0.76, Math.max(0.35, 4 / Math.sqrt(h / tw))); Mflb = 0.9 * E * kc * Sx / lf ** 2; estado = 'ala esbelta (F3-2)'; }
  }
  return { ...r, Mn: Math.min(r.Mn, Mflb), Mflb, estado };
}
// Perfiles T (WT) y dobles ángulos 2L cargados en el plano de simetría (F9, AISC 360-16)
//   alma: 'traccion' (alma/ala vertical en tracción) | 'compresion'
export function flexT(sh, Fy, Lb, Cb = 1, alma = 'traccion', E = ES) {
  const s = getShape(sh);
  if (!(s.fam === 'T' || s.fam === 'D')) throw new Error('MnT: válido para perfiles T (WT) y dobles ángulos 2L');
  const comp = /^C/i.test(String(alma));
  const Sx = P(s, 'Sx'), Sxc = P(s, 'Sxc'), Zx = P(s, 'Zx'), Iy = P(s, 'Iy'), J = P(s, 'J'), d = P(s, 'd'), ry = P(s, 'ry');
  const My = Fy * Sx, sq = Math.sqrt(E / Fy);
  const Mp = comp ? (s.fam === 'T' ? My : 1.5 * My) : Math.min(Fy * Zx, 1.6 * My); // F9-2, F9-4, F9-5
  let Mltb = Mp;
  const Mcr = (B) => 1.95 * E / Lb * Math.sqrt(Iy * J) * (B + Math.sqrt(1 + B * B));
  if (Lb > 0) {
    if (!comp) {
      const Lp = 1.76 * ry * sq, Lr = 1.95 * (E / Fy) * Math.sqrt(Iy * J) / Sx * Math.sqrt(2.36 * (Fy / E) * d * Sx / J + 1); // F9-8, F9-9
      if (Lb > Lp && Lb <= Lr) Mltb = Mp - (Mp - My) * (Lb - Lp) / (Lr - Lp); // F9-6
      else if (Lb > Lr) Mltb = Mcr(2.3 * d / Lb * Math.sqrt(Iy / J)); // F9-7, F9-10
    } else Mltb = Math.min(Mcr(-2.3 * d / Lb * Math.sqrt(Iy / J)), My); // F9-11, F9-12
  }
  Mltb = Math.min(Mp, Mltb);
  let Mlb = Mp, estado = comp ? 'alma en compresión' : 'alma en tracción';
  if (s.fam === 'T') {
    if (!comp) { // pandeo local del ala comprimida (F9.3)
      const lf = s.p['bf/2tf'], lpf = 0.38 * sq, lrf = 1.0 * sq;
      if (lf > lpf && lf <= lrf) Mlb = Math.min(1.6 * My, Mp - (Mp - 0.7 * Fy * Sxc) * (lf - lpf) / (lrf - lpf)); // F9-14
      else if (lf > lrf) Mlb = 0.7 * E * Sxc / lf ** 2; // F9-15
    } else { // pandeo local del alma de la T en compresión (F9.4)
      const dt = s.p['d/tw'];
      const Fcr = dt <= 0.84 * sq ? Fy : dt <= 1.52 * sq ? (1.43 - 0.515 * dt / sq) * Fy : 1.52 * E / dt ** 2; // F9-17 a F9-19
      Mlb = Fcr * Sx;
    }
  } else { // 2L: pandeo local de las alas (F10.3 aplicado a la fibra comprimida)
    const t = P(s, 't'), bt = comp ? P(s, 'd') / t : P(s, 'b2') / t, Sc = comp ? Sx : Sxc;
    if (bt > 0.54 * sq && bt <= 0.91 * sq) Mlb = Fy * Sc * (2.43 - 1.72 * bt / sq); // F10-6
    else if (bt > 0.91 * sq) Mlb = 0.71 * E / bt ** 2 * Sc; // F10-7, F10-8
  }
  return { Mn: Math.min(Mp, Mltb, Mlb), Mp, My, estado };
}
// Flexión respecto al eje menor de perfiles I y canales (F6)
export function flexIy(sh, Fy, E = ES) {
  const s = getShape(sh);
  if (!(s.fam === 'I' || s.fam === 'E' || s.fam === 'C')) throw new Error('MnyW: válido para perfiles I y canales');
  const Zy = P(s, 'Zy'), Sy = P(s, 'Sy'), Mp = Math.min(Fy * Zy, 1.6 * Fy * Sy);
  const lf = s.fam === 'C' ? s.p['b/t'] : s.p['bf/2tf'], lp = 0.38 * Math.sqrt(E / Fy), lr = 1.0 * Math.sqrt(E / Fy);
  if (lf <= lp) return { Mn: Mp, Mp, estado: 'compacta' };
  if (lf <= lr) return { Mn: Mp - (Mp - 0.7 * Fy * Sy) * (lf - lp) / (lr - lp), Mp, estado: 'ala no compacta (F6-2)' };
  return { Mn: Math.min(Mp, 0.69 * E / lf ** 2 * Sy), Mp, estado: 'ala esbelta (F6-3)' };
}
// Tubos HSS rectangulares (F7) y redondos (F8), flexión respecto al eje x (eje mayor)
export function flexHSS(sh, Fy, E = ES, Lb = 0, Cb = 1) {
  const s = getShape(sh);
  if (s.fam === 'O') {
    const Dt = s.p['D/t'], Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), Mp = Fy * Zx;
    if (Dt > 0.45 * E / Fy) throw new Error('D/t = ' + Dt + ' excede 0.45E/Fy: fuera del alcance de F8');
    if (Dt <= 0.07 * E / Fy) return { Mn: Mp, Mp, estado: 'compacta' };
    if (Dt <= 0.31 * E / Fy) return { Mn: Math.min(Mp, (0.021 * E / Dt + Fy) * Sx), Mp, estado: 'no compacta (F8-2)' };
    return { Mn: Math.min(Mp, 0.33 * E / Dt * Sx), Mp, estado: 'esbelta (F8-3)' };
  }
  if (s.fam !== 'R') throw new Error('MnHSS: válido para tubos HSS');
  const Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), t = P(s, 'tdes'), b = P(s, 'b2'), h = P(s, 'h'), Mp = Fy * Zx;
  const lam = s.p['b/tdes'], lw = s.p['h/tdes'], sq = Math.sqrt(E / Fy);
  const out = []; let Mn = Mp;
  // F7.2 pandeo local del ala
  if (lam > 1.12 * sq && lam <= 1.40 * sq) { Mn = Math.min(Mn, Mp - (Mp - Fy * Sx) * (3.57 * lam / sq - 4.0)); out.push('ala no compacta (F7-2)'); }
  else if (lam > 1.40 * sq) {
    const be = Math.min(b, 1.92 * t * sq * (1 - 0.38 / lam * sq)); // F7-4
    const Ix = P(s, 'Ix'), H = P(s, 'Ht'), A = P(s, 'A'), dA = (b - be) * t, c = (H - t) / 2;
    const e = dA * c / (A - dA); // descenso del eje neutro al retirar el ancho no efectivo del ala comprimida
    const Ie = Ix - dA * c * c - (A - dA) * e * e, Se = Ie / (H / 2 + e);
    Mn = Math.min(Mn, Fy * Se); out.push('ala esbelta (F7-3, Se con eje neutro desplazado)');
  }
  // F7.3 pandeo local del alma
  if (lw > 2.42 * sq && lw <= 5.70 * sq) { Mn = Math.min(Mn, Mp - (Mp - Fy * Sx) * (0.305 * lw / sq - 0.738)); out.push('alma no compacta (F7-6)'); }
  else if (lw > 5.70 * sq) { const aw = Math.min(10, 2 * h * t / (b * t)); const Rpg = Math.min(1, 1 - aw / (1200 + 300 * aw) * (lw - 5.7 * sq)); Mn = Math.min(Mn, Rpg * Fy * Sx); out.push('alma esbelta (F7-7, Rpg)'); }
  // F7.4 pandeo lateral-torsional (relevante en tubos muy rectangulares con Lb grande)
  let Lp = 0, Lr = 0;
  if (Lb > 0) {
    const ry = P(s, 'ry'), J = P(s, 'J'), A = P(s, 'A'), JA = Math.sqrt(J * A);
    Lp = 0.13 * E * ry * JA / Mp; Lr = 2 * E * ry * JA / (0.7 * Fy * Sx); // F7-12, F7-13
    if (Lb > Lp && Lb <= Lr) { Mn = Math.min(Mn, Cb * (Mp - (Mp - 0.7 * Fy * Sx) * (Lb - Lp) / (Lr - Lp))); out.push('PLT inelástico (F7-10)'); }
    else if (Lb > Lr) { Mn = Math.min(Mn, 2 * E * Cb * JA / (Lb / ry)); out.push('PLT elástico (F7-11)'); }
  }
  return { Mn, Mp, Lp, Lr, estado: out.length ? out.join(', ') : 'compacta' };
}

// ---------------------------------------------------------------------
//  Cortante — AISC 360 Cap. G
// ---------------------------------------------------------------------
export function cv1G2(htw, Fy, kv = 5.34, E = ES) {
  const L = 1.10 * Math.sqrt(kv * E / Fy);
  return htw <= L ? 1 : L / htw;
}
export function shearAISC(sh, Fy, E = ES, Lv) {
  const s = getShape(sh);
  if (s.fam === 'R') { const t = P(s, 'tdes'), h = P(s, 'h'), Aw = 2 * h * t; const Cv2 = cv2G2(s.p['h/tdes'], Fy, 5, E); return { Vn: 0.6 * Fy * Aw * Cv2, Aw, Cv: Cv2, phi: 0.9 }; } // G4
  if (s.fam === 'O') { // G5
    const A = P(s, 'A'), Dt = s.p['D/t'], D = P(s, 'OD');
    const Fcr = Math.min(0.6 * Fy, Math.max(Lv > 0 ? 1.60 * E / (Math.sqrt(Lv / D) * Dt ** 1.25) : 0, 0.78 * E / Dt ** 1.5)); // G5-2a, G5-2b
    return { Vn: Fcr * A / 2, Aw: A / 2, Cv: Fcr / (0.6 * Fy), phi: 0.9 };
  }
  if (s.fam === 'L' || s.fam === 'D') { // G3: ángulos (kv = 1.2), cortante paralelo al ala vertical
    const b = P(s, 'd'), t = P(s, 't'), n = s.fam === 'D' ? 2 : 1, Cv2 = cv2G2(b / t, Fy, 1.2, E);
    return { Vn: n * 0.6 * Fy * b * t * Cv2, Aw: n * b * t, Cv: Cv2, phi: 0.9 };
  }
  if (s.fam === 'T') { const d = P(s, 'd'), tw = P(s, 'tw'), Cv2 = cv2G2(d / tw, Fy, 1.2, E); return { Vn: 0.6 * Fy * d * tw * Cv2, Aw: d * tw, Cv: Cv2, phi: 0.9 }; } // G3 (b = d)
  if (s.fam === 'K') throw new Error('Perfiles conformados en frío: use AISI S100 G2.1');
  const d = P(s, 'd'), tw = P(s, 'tw'), Aw = d * tw, htw = s.p['h/tw'];
  const rolled = s.fam === 'I' || s.fam === 'E';
  if (rolled && htw <= 2.24 * Math.sqrt(E / Fy)) return { Vn: 0.6 * Fy * Aw, Aw, Cv: 1, phi: 1.0 };
  const Cv = cv1G2(htw, Fy, 5.34, E);
  return { Vn: 0.6 * Fy * Aw * Cv, Aw, Cv, phi: 0.9 };
}
export function cv2G2(htw, Fy, kv = 5.34, E = ES) {
  const r = Math.sqrt(kv * E / Fy);
  return htw <= 1.10 * r ? 1 : htw <= 1.37 * r ? 1.10 * r / htw : 1.51 * kv * E / (htw * htw * Fy);
}
// AISI S100-16 Apéndice 1 §1.3: coeficiente k de un ala con labio simple (atiesador de borde)
export function kLabioAISI(wt, Dw, dt, f, E = 203395e6, thetaDeg = 90) {
  const S = 1.28 * Math.sqrt(E / f);
  if (wt <= 0.328 * S) return { k: 4, RI: 1, Ia: 0, n: 1, S };
  const Ia = Math.min(399 * ((wt / S) - 0.328) ** 3, 115 * wt / S + 5); // en unidades de t⁴
  const Is = dt ** 3 * Math.sin(thetaDeg * Math.PI / 180) ** 2 / 12;   // en unidades de t⁴ (labio de ancho plano d)
  const RI = Math.min(1, Is / Ia), n = Math.max(1 / 3, 0.582 - wt / (4 * S));
  let k;
  if (Dw <= 0.25) k = 3.57 * RI ** n + 0.43;
  else if (Dw <= 0.8) k = (4.82 - 5 * Dw) * RI ** n + 0.43;
  else throw new Error('AISI §1.3: D/w = ' + Dw.toFixed(3) + ' > 0.8 fuera del alcance');
  return { k: Math.min(4, k), RI, Ia, n, S };
}

// ---------------------------------------------------------------------
//  Pernos — AISC 360-16/22 Tabla J3.2 y J3.3
// ---------------------------------------------------------------------
const KSI = 6894757.29;
function boltGroup(g) {
  const s = str(g);
  if (/A307/.test(s)) return 'A307';
  if (/A490|F2280|GRUPO ?B|^B$/.test(s)) return 'B';
  if (/A325|F3125|F1852|GRUPO ?A|^A$/.test(s)) return 'A';
  if (/F3043|F3111|^C$/.test(s)) return 'C';
  throw new Error('Grupo de perno no reconocido: ' + g + ' (use "A325", "A490", "A307")');
}
export function fnvJ3(g, roscas = 'N') {
  const G = boltGroup(g), x = /X|EXCL/.test(str(roscas));
  const t = { A307: [27, 27], A: [54, 68], B: [68, 84], C: [90, 113] }[G];
  return t[x ? 1 : 0] * KSI;
}
export function fntJ3(g) { return { A307: 45, A: 90, B: 113, C: 150 }[boltGroup(g)] * KSI; }
// Agujero estándar Tabla J3.3 (in o mm según el diámetro)
export function holeStd(db) {
  const inch = db / 0.0254;
  const metric = Math.abs(inch * 16 - Math.round(inch * 16)) > 0.02; // diámetros métricos (M16, M20…)
  if (!metric) return (inch <= 7 / 8 + 1e-6 ? inch + 1 / 16 : inch < 1 + 1e-6 ? inch + 1 / 8 : inch + 1 / 8) * 0.0254;
  const mm = db * 1000; return (mm <= 22 + 1e-6 ? mm + 2 : mm <= 24 + 1e-6 ? mm + 3 : mm + 3) / 1000;
}
// Tamaños de soldadura de filete (Tabla J2.4 y J2.2b)
export function wminJ2(t) {
  const i = t / 0.0254; return (i <= 0.25 ? 1 / 8 : i <= 0.5 ? 3 / 16 : i <= 0.75 ? 1 / 4 : 5 / 16) * 0.0254;
}
export function wmaxJ2(t) { const i = t / 0.0254; return i < 0.25 ? t : t - 0.0254 / 16; }

// ---------------------------------------------------------------------
//  Registro de funciones para el editor
// ---------------------------------------------------------------------
const famArgs = (sh) => getShape(sh);
defineFns({
  sec: { fn: (s, p) => (p === undefined && typeof s !== 'string' ? math.divide(1, math.cos(s)) : prop(famArgs(s), String(p))), tex: '\\mathrm{prop}', desc: 'Propiedad de un perfil de la base AISC/europea: sec("W12X26", "Zx")', args: 'perfil, propiedad' },
  // --- Compresión ---
  FeE3: { fn: (Lcr, E) => out(Math.PI ** 2 * Pa(E, ES) / nd(Lcr) ** 2, 'S'), tex: 'F_e', desc: 'Esfuerzo de pandeo elástico π²E/(Lc/r)² (AISC E3-4)', args: 'Lc/r, E' },
  FcrE3: { fn: (Fy, Lcr, E) => { const fy = Pa(Fy), Fe = Math.PI ** 2 * Pa(E, ES) / nd(Lcr) ** 2; return out(fcrE3(fy, Fe), 'S'); }, tex: 'F_{cr}', desc: 'Esfuerzo crítico de pandeo por flexión (AISC E3-2/E3-3)', args: 'Fy, Lc/r, E' },
  FcrFe: { fn: (Fy, Fe) => out(fcrE3(Pa(Fy), Pa(Fe)), 'S'), tex: 'F_{cr}', desc: 'Fcr a partir de Fe (AISC E3-2/E3-3)', args: 'Fy, Fe' },
  FcrE090: { fn: (Fy, Lcr, E) => { const fy = Pa(Fy), e = Pa(E, ES), lc = nd(Lcr) / Math.PI * Math.sqrt(fy / e); return out(lc <= 1.5 ? Math.pow(0.658, lc * lc) * fy : 0.877 / (lc * lc) * fy, 'S'); }, tex: 'F_{cr}', desc: 'Fcr NTE E.090 (E2-2/E2-3, con λc)', args: 'Fy, KL/r, E' },
  beE7: { fn: (b, t, lr, Fy, Fcr, caso) => out(beE7(Mt(b), Mt(t), nd(lr), Pa(Fy), Pa(Fcr), caso === undefined ? 'c' : String(caso).toLowerCase()), 'L'), tex: 'b_e', desc: 'Ancho efectivo de elemento esbelto (AISC E7-3); caso "a" atiesado, "b" pared HSS, "c" no atiesado', args: 'b, t, λr, Fy, Fcr, caso' },
  PnE3: { fn: (s, Fy, Lcx, Lcy, E, Lcz, a) => out(compAISC(s, Pa(Fy), Mt(Lcx), Mt(Lcy), Pa(E, ES), Lcz === undefined ? undefined : Mt(Lcz), a === undefined ? undefined : Mt(a)).Pn, 'F'), tex: 'P_n', desc: 'Resistencia nominal a compresión de un perfil de la base: E3, E4 (canales, WT, 2L; perfiles I si se da Lcz), E6 (2L con conectores a), E7; ángulos simples → E5', args: 'perfil, Fy, Lcx, Lcy, E, Lcz, a' },
  PnE5: { fn: (s, Fy, L, tipo, conex, E) => out(compE5(s, Pa(Fy), Mt(L), tipo === undefined ? 'a' : String(tipo), conex === undefined ? 'larga' : String(conex), Pa(E, ES)).Pn, 'F'), tex: 'P_{n,E5}', desc: 'Compresión de ángulo simple cargado por un ala (AISC E5): tipo "a" individual/armadura plana, "b" armadura espacial; conex "larga" o "corta"', args: 'perfil, Fy, L, tipo, conex, E' },
  LcrE5: { fn: (s, L, tipo, conex) => compE5(s, 345e6, Mt(L), tipo === undefined ? 'a' : String(tipo), conex === undefined ? 'larga' : String(conex)).esb, tex: '(L_c/r)_{E5}', desc: 'Esbeltez efectiva de ángulo simple (E5-1 a E5-4)', args: 'perfil, L, tipo, conex' },
  // --- Flexión ---
  LpF2: { fn: (ry, Fy, E) => out(1.76 * Mt(ry) * Math.sqrt(Pa(E, ES) / Pa(Fy)), 'L'), tex: 'L_p', desc: 'Longitud límite plástica Lp (AISC F2-5)', args: 'ry, Fy, E' },
  LrF2: { fn: (rts, Fy, J, Sx, ho, E, c) => { const e = Pa(E, ES), fy = Pa(Fy), jc = toNum(J, 'm^4') * (c === undefined ? 1 : nd(c)) / (toNum(Sx, 'm^3') * Mt(ho)); return out(1.95 * Mt(rts) * e / (0.7 * fy) * Math.sqrt(jc + Math.sqrt(jc * jc + 6.76 * (0.7 * fy / e) ** 2)), 'L'); }, tex: 'L_r', desc: 'Longitud límite inelástica Lr (AISC F2-6)', args: 'rts, Fy, J, Sx, ho, E, c' },
  MnW: { fn: (s, Fy, Lb, Cb, E) => out(flexI(s, Pa(Fy), Mt(Lb), Cb === undefined ? 1 : nd(Cb), Pa(E, ES)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de perfil I/canal: F2 (fluencia, PLT), F3 (ala no compacta/esbelta), F4/F5 (alma no compacta/esbelta); WT/2L → F9', args: 'perfil, Fy, Lb, Cb, E' },
  MnT: { fn: (s, Fy, Lb, alma, E) => out(flexT(s, Pa(Fy), Mt(Lb), 1, alma === undefined ? 'traccion' : String(alma), Pa(E, ES)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de perfil T (WT) o doble ángulo 2L (F9): alma "traccion" o "compresion"', args: 'perfil, Fy, Lb, alma, E' },
  MnPG: { fn: (d, bf, tf, tw, Fy, Lb, Cb, E) => out(mnF4F5({ d: Mt(d), bf: Mt(bf), tf: Mt(tf), tw: Mt(tw) }, Pa(Fy), Mt(Lb), Cb === undefined ? 1 : nd(Cb), Pa(E, ES)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de viga armada I doblemente simétrica de planchas con alma no compacta (F4) o esbelta (F5)', args: 'd, bf, tf, tw, Fy, Lb, Cb, E' },
  MnyW: { fn: (s, Fy, E) => out(flexIy(s, Pa(Fy), Pa(E, ES)).Mn, 'M'), tex: 'M_{ny}', desc: 'Momento nominal respecto al eje menor de perfil I/canal (F6)', args: 'perfil, Fy, E' },
  MnHSS: { fn: (s, Fy, E, Lb, Cb) => out(flexHSS(s, Pa(Fy), Pa(E, ES), Lb === undefined ? 0 : Mt(Lb), Cb === undefined ? 1 : nd(Cb)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de tubo HSS rectangular (F7: alas y alma, PLT si se da Lb) o redondo (F8)', args: 'perfil, Fy, E, Lb, Cb' },
  CbF1: { fn: (Mm, Ma, Mb, Mc) => { const a = (x) => Math.abs(math.isUnit(x) ? x.toNumber('N*m') : x); const M = a(Mm); return 12.5 * M / (2.5 * M + 3 * a(Ma) + 4 * a(Mb) + 3 * a(Mc)); }, tex: 'C_b', desc: 'Factor de modificación por gradiente de momento Cb (AISC F1-1)', args: 'Mmax, MA, MB, MC' },
  // --- Cortante ---
  Cv1G2: { fn: (htw, Fy, kv, E) => cv1G2(nd(htw), Pa(Fy), kv === undefined ? 5.34 : nd(kv), Pa(E, ES)), tex: 'C_{v1}', desc: 'Coeficiente de cortante del alma Cv1 (AISC G2-3/G2-4)', args: 'h/tw, Fy, kv, E' },
  Cv2G2: { fn: (htw, Fy, kv, E) => cv2G2(nd(htw), Pa(Fy), kv === undefined ? 5.34 : nd(kv), Pa(E, ES)), tex: 'C_{v2}', desc: 'Coeficiente de pandeo por cortante Cv2 (AISC G2-9 a G2-11)', args: 'h/tw, Fy, kv, E' },
  VnG2: { fn: (s, Fy, E, Lv) => out(shearAISC(s, Pa(Fy), Pa(E, ES), Lv === undefined ? undefined : Mt(Lv)).Vn, 'F'), tex: 'V_n', desc: 'Resistencia nominal a cortante de un perfil (G2 I/C, G3 L/WT/2L, G4 HSS, G5 tubos con Lv opcional)', args: 'perfil, Fy, E, Lv' },
  phivG2: { fn: (s, Fy, E) => shearAISC(s, Pa(Fy), Pa(E, ES)).phi, tex: '\\phi_v', desc: 'Factor φv: 1.0 para almas de perfiles laminados con h/tw ≤ 2.24√(E/Fy) (G2.1a), si no 0.9', args: 'perfil, Fy, E' },
  // --- Interacción ---
  H1: { fn: (Pr, Pc, Mrx, Mcx, Mry, Mcy) => { const r = (a, b) => (a === undefined || b === undefined ? 0 : Math.abs(math.divide(a, b))); const p = r(Pr, Pc), mx = r(Mrx, Mcx), my = r(Mry, Mcy); return p >= 0.2 ? p + 8 / 9 * (mx + my) : p / 2 + mx + my; }, tex: '\\mathrm{H1}', desc: 'Relación de interacción flexión + axial (AISC H1-1a / H1-1b)', args: 'Pr, Pc, Mrx, Mcx, Mry, Mcy' },
  // --- Pernos ---
  FnvJ3: { fn: (g, r) => out(fnvJ3(g, r === undefined ? 'N' : r), 'S'), tex: 'F_{nv}', desc: 'Esfuerzo nominal de corte del perno, Tabla J3.2 ("A325"/"A490"/"A307", "N" o "X")', args: 'grupo, roscas' },
  FntJ3: { fn: (g) => out(fntJ3(g), 'S'), tex: 'F_{nt}', desc: 'Esfuerzo nominal de tracción del perno, Tabla J3.2', args: 'grupo' },
  FntpJ3: { fn: (Fnt, Fnv, frv) => { const ft = Pa(Fnt), fv = Pa(Fnv); return out(Math.min(ft, 1.3 * ft - ft / (0.75 * fv) * Pa(frv)), 'S'); }, tex: "F'_{nt}", desc: 'Tracción nominal modificada por corte (AISC J3-3a, LRFD)', args: 'Fnt, Fnv, frv' },
  Abolt: { fn: (db) => out(Math.PI * Mt(db) ** 2 / 4, 'A'), tex: 'A_b', desc: 'Área nominal del perno πd²/4', args: 'db' },
  dhJ3: { fn: (db) => { const u = math.isUnit(db) && /mm/.test(db.formatUnits()) ? 'mm' : 'in'; return mkUnit(holeStd(Mt(db)), 'm').to(u); }, tex: 'd_h', desc: 'Diámetro de agujero estándar (Tabla J3.3 / J3.3M)', args: 'db' },
  RnAplast: { fn: (db, t, Fu) => out(2.4 * Mt(db) * Mt(t) * Pa(Fu), 'F'), tex: 'R_{n,apl}', desc: 'Aplastamiento en el agujero 2.4 d t Fu (AISC J3-6a)', args: 'db, t, Fu' },
  RnDesg: { fn: (Lc, t, Fu) => out(1.2 * Mt(Lc) * Mt(t) * Pa(Fu), 'F'), tex: 'R_{n,des}', desc: 'Desgarramiento 1.2 lc t Fu (AISC J3-6c)', args: 'lc, t, Fu' },
  // --- Soldadura ---
  RnFilete: { fn: (w, Lw, FEXX, th) => { const t = th === undefined ? 0 : (math.isUnit(th) ? th.toNumber('rad') : nd(th) * Math.PI / 180); return out(0.6 * Pa(FEXX) * (1 + 0.5 * Math.pow(Math.abs(Math.sin(t)), 1.5)) * 0.7071 * Mt(w) * Mt(Lw), 'F'); }, tex: 'R_{n,w}', desc: 'Resistencia nominal de soldadura de filete 0.6FEXX(1+0.5sin^1.5θ)·0.707w·L (AISC J2-4, J2-5)', args: 'w, L, FEXX, θ' },
  wminJ2: { fn: (t) => mkUnit(wminJ2(Mt(t)), 'm').to('in'), tex: 'w_{min}', desc: 'Tamaño mínimo de soldadura de filete (Tabla J2.4)', args: 't (más delgada)' },
  wmaxJ2: { fn: (t) => mkUnit(wmaxJ2(Mt(t)), 'm').to('in'), tex: 'w_{max}', desc: 'Tamaño máximo de filete en bordes (J2.2b)', args: 't' },
  // --- Bloque de cortante, tracción, alma ---
  RnBloque: { fn: (Agv, Anv, Ant, Fy, Fu, Ubs) => { const u = Ubs === undefined ? 1 : nd(Ubs); const fu = Pa(Fu); return out(Math.min(0.6 * fu * M2(Anv) + u * fu * M2(Ant), 0.6 * Pa(Fy) * M2(Agv) + u * fu * M2(Ant)), 'F'); }, tex: 'R_{n,bs}', desc: 'Resistencia por bloque de cortante (AISC J4-5)', args: 'Agv, Anv, Ant, Fy, Fu, Ubs' },
  UD3: { fn: (xb, l) => 1 - Mt(xb) / Mt(l), tex: 'U', desc: 'Factor de retraso de cortante U = 1 − x̄/l (Tabla D3.1, caso 2)', args: 'x̄, l' },
  RnJ10y: { fn: (Fy, tw, k, lb, x, d) => { const ext = x !== undefined && d !== undefined && Mt(x) <= Mt(d); return out(Pa(Fy) * Mt(tw) * ((ext ? 2.5 : 5) * Mt(k) + Mt(lb)), 'F'); }, tex: 'R_{n,J10.2}', desc: 'Fluencia local del alma (AISC J10-2/J10-3)', args: 'Fy, tw, k, lb, x, d' },
  RnJ10c: { fn: (tw, tf, d, lb, Fy, E, x) => { const TW = Mt(tw), TF = Mt(tf), D = Mt(d), LB = Mt(lb), fy = Pa(Fy), e = Pa(E, ES); const ext = x !== undefined && Mt(x) < D / 2; const f = Math.sqrt(e * fy * TF / TW); let c;
    if (!ext) c = 0.80 * TW * TW * (1 + 3 * (LB / D) * (TW / TF) ** 1.5); else if (LB / D <= 0.2) c = 0.40 * TW * TW * (1 + 3 * (LB / D) * (TW / TF) ** 1.5); else c = 0.40 * TW * TW * (1 + (4 * LB / D - 0.2) * (TW / TF) ** 1.5);
    return out(c * f, 'F'); }, tex: 'R_{n,J10.3}', desc: 'Aplastamiento (crippling) del alma (AISC J10-4/J10-5); Qf = 1', args: 'tw, tf, d, lb, Fy, E, x' },
  // --- Construcción compuesta ---
  QnI8: { fn: (Asa, fc, Ec, Fu, Rg, Rp) => { const a = M2(Asa); return out(Math.min(0.5 * a * Math.sqrt(Pa(fc) * Pa(Ec)), (Rg === undefined ? 1 : nd(Rg)) * (Rp === undefined ? 0.75 : nd(Rp)) * a * Pa(Fu)), 'F'); }, tex: 'Q_n', desc: 'Resistencia de un conector de corte tipo perno (AISC I8-1)', args: 'Asa, fc, Ec, Fu, Rg, Rp' },
  EcAISC: { fn: (fc, wc) => { const w = wc === undefined ? 145 : toNum(wc, 'lbf/ft^3'); return out(Math.pow(w, 1.5) * Math.sqrt(toNum(fc, 'ksi')) * KSI, 'S'); }, tex: 'E_c', desc: 'Módulo del concreto Ec = wc^1.5 √f′c (ksi, wc en lb/ft³) — AISC I2.1b', args: "f'c, wc" },
  // --- Conformado en frío AISI S100 ---
  kLabioAISI: { fn: (wt, Dw, dt, f, E) => kLabioAISI(nd(wt), nd(Dw), nd(dt), Pa(f), Pa(E, 203395e6)).k, tex: 'k', desc: 'Coeficiente k del ala con labio simple (AISI S100 Ap. 1 §1.3): w/t, D/w, d/t del labio, f, E', args: 'w/t, D/w, d/t, f, E' },
  RIAISI: { fn: (wt, Dw, dt, f, E) => kLabioAISI(nd(wt), nd(Dw), nd(dt), Pa(f), Pa(E, 203395e6)).RI, tex: 'R_I', desc: 'Relación Is/Ia ≤ 1 del labio (AISI S100 Ap. 1 §1.3)', args: 'w/t, D/w, d/t, f, E' },
  AseACI: { fn: (da, nt) => out(Math.PI / 4 * (Mt(da) - 0.9743 * 0.0254 / nd(nt)) ** 2, 'A'), tex: 'A_{se}', desc: 'Área efectiva a tracción de una varilla roscada (ACI 318 R17.6.1.2): π/4·(da − 0.9743/nt)², nt hilos por pulgada', args: 'da, nt' },
  NbACI: { fn: (fc, hef, kc) => out((kc === undefined ? 10 : nd(kc)) * Math.sqrt(Pa(fc) / 1e6) * (Mt(hef) * 1000) ** 1.5, 'F'), tex: 'N_b', desc: 'Arrancamiento básico del concreto en tracción Nb = kc·√f′c·hef^1.5 (ACI 318-19 Ec. 17.6.2.2.1, SI: kc = 10 preinstalado, 7 posinstalado), λa = 1', args: "f'c, hef, kc" },
  rhoAISI: { fn: (wt, f, E, k) => { const lam = 1.052 / Math.sqrt(k === undefined ? 4 : nd(k)) * nd(wt) * Math.sqrt(Pa(f) / Pa(E, 203395e6)); return lam <= 0.673 ? 1 : Math.min(1, (1 - 0.22 / lam) / lam); }, tex: '\\rho', desc: 'Factor de ancho efectivo AISI S100 (1.1-1 a 1.1-4): w/t, f, E, k', args: 'w/t, f, E, k' },
}, 'Acero');
