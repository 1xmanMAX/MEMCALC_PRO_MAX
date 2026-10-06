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
    DB.set(c[0], { fam, name: c[0], p });
  }
}
export const SHAPES = DB;
const TIPOS = { I: 'Perfil I (AISC)', C: 'Canal C/MC', L: 'Ángulo L', R: 'Tubo HSS rectangular/cuadrado', O: 'Tubo HSS redondo / Pipe', E: 'Perfil I europeo' };

function normName(s) {
  let n = String(s).toUpperCase().replace(/[\s×*]/g, 'X').replace(/X+/g, 'X').replace(/^([A-Z]+)X(?=\d)/, '$1');
  n = n.replace(/X\./g, 'X0.');
  // europeos: "HE200B", "HE 200 B", "HEB-200"
  let m = /^HE-?(\d+)-?([ABM])$/.exec(n); if (m) n = 'HE' + m[2] + m[1];
  m = /^(IPE|HEA|HEB|HEM)-?(\d+)$/.exec(n); if (m) n = m[1] + m[2];
  return n;
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
  if (!s) throw new Error('Perfil no encontrado en la base de datos: ' + name + ' (ejemplos: "W12X26", "HSS6X6X3/8", "L4X4X1/2", "C10X15.3", "IPE300", "HEB200")');
  return s;
}
export function shapeList(fam) { return [...DB.values()].filter(v => !fam || v.fam === fam).map(v => v.name); }

const DIM = {
  1: ['d', 'bf', 'tw', 'tf', 'kdes', 'kdet', 'k1', 'x', 'y', 'eo', 'xp', 'yp', 'ro', 'rts', 'ho', 'Ht', 'B', 'tnom', 'tdes', 'h', 'b2', 'OD', 'ID', 't', 'r', 'rx', 'ry', 'rz'],
  2: ['A'], 3: ['Zx', 'Sx', 'Zy', 'Sy', 'Sz', 'C'], 4: ['Ix', 'Iy', 'Iz', 'J'], 6: ['Cw'],
};
const POW = {}; for (const [p, ks] of Object.entries(DIM)) for (const k of ks) POW[k] = +p;
const ALIAS = {
  Ag: 'A', k: 'kdes', bf2tf: 'bf/2tf', lambdaf: 'bf/2tf', htw: 'h/tw', lambdaw: 'h/tw', bt: 'b/t', b_t: 'b/t', ht: 'h/tdes', h_t: 'h/tdes',
  Dt: 'D/t', D_t: 'D/t', peso: 'W', w: 'W', tan: 'tan(α)', tana: 'tan(α)', H: 'H3', b: 'b2', D: 'OD', Iw: 'Cw', It: 'J', Wpl: 'Zx', Wel: 'Sx',
};
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
  if (s.fam === 'L' && prop === 'b') k = 'b2';
  if (s.fam === 'O' && prop === 'd') k = 'OD';
  if ((s.fam === 'O') && (prop === 'Iy' || prop === 'Zy' || prop === 'Sy' || prop === 'ry')) k = prop.replace('y', 'x');
  if ((s.fam === 'I' || s.fam === 'E' || s.fam === 'C') && prop === 'h') return { v: p['h/tw'] * p.tw, k: 'h' };
  if (!(k in p)) throw new Error('Propiedad "' + prop + '" no disponible para ' + s.name + ' (' + TIPOS[s.fam] + '). Disponibles: ' + Object.keys(p).join(', '));
  return { v: p[k], k };
}
export function prop(s, propName, unitSys) {
  s = getShape(s);
  const { v, k } = raw(s, propName);
  const fu = FAMUNIT[s.fam];
  if (k === 'W') return s.fam === 'E' ? mkUnit(v, 'kgf/m') : mkUnit(v, 'lbf/ft');
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
// Resistencia nominal a compresión de un perfil de la base (E3, E4 para canales, E7)
export function compAISC(sh, Fy, Lcx, Lcy, E = ES, Lcz) {
  const s = getShape(sh), G = E * GS / ES;
  const A = P(s, 'A'), rx = P(s, 'rx'), ry = s.fam === 'O' ? rx : P(s, 'ry');
  const sx = Lcx / rx, sy = Lcy / ry;
  if (Math.max(sx, sy) > 200) { /* E2: recomendación, no límite obligatorio */ }
  let Fe = Math.PI ** 2 * E / Math.max(sx, sy) ** 2, modo = 'flexión (E3)';
  if (s.fam === 'C') { // simetría respecto a x: pandeo flexo-torsional E4-3 con Fex
    const Lz = Lcz ?? Math.max(Lcx, Lcy); const ro = P(s, 'ro'), H = s.p.H3, Cw = P(s, 'Cw'), J = P(s, 'J');
    const Fex = Math.PI ** 2 * E / sx ** 2, Fey = Math.PI ** 2 * E / sy ** 2;
    const Fez = (Math.PI ** 2 * E * Cw / Lz ** 2 + G * J) / (A * ro * ro);
    const Fft = (Fex + Fez) / (2 * H) * (1 - Math.sqrt(1 - 4 * Fex * Fez * H / (Fex + Fez) ** 2));
    Fe = Math.min(Fey, Fft); modo = Fft < Fey ? 'flexo-torsional (E4)' : 'flexión (E3)';
  }
  if (s.fam === 'L') throw new Error('Para ángulos simples use la Sección E5 (no implementada como función); calcule con FcrE3 y Lc/r de E5');
  const Fcr = fcrE3(Fy, Fe);
  // E7: elementos esbeltos
  let Ae = A; const sq = Math.sqrt(E / Fy);
  if (s.fam === 'I' || s.fam === 'E' || s.fam === 'C') {
    const bf = P(s, 'bf'), tf = P(s, 'tf'), tw = P(s, 'tw'), h = P(s, 'h');
    const bfl = s.fam === 'C' ? bf : bf / 2, nfl = s.fam === 'C' ? 2 : 4;
    const be = beE7(bfl, tf, 0.56 * sq, Fy, Fcr, 'c');
    const he = beE7(h, tw, 1.49 * sq, Fy, Fcr, 'a');
    Ae = A - nfl * (bfl - be) * tf - (h - he) * tw;
  } else if (s.fam === 'R') {
    const t = P(s, 'tdes'), b = P(s, 'b2'), h = P(s, 'h');
    Ae = A - 2 * (b - beE7(b, t, 1.40 * sq, Fy, Fcr, 'b')) * t - 2 * (h - beE7(h, t, 1.40 * sq, Fy, Fcr, 'b')) * t;
  } else if (s.fam === 'O') {
    const Dt = s.p['D/t'];
    if (Dt > 0.11 * E / Fy) Ae = Math.min(1, 0.038 * E / (Fy * Dt) + 2 / 3) * A; // E7-6
  }
  return { Pn: Fcr * Ae, Fcr, Fe, Ae, A, sx, sy, modo };
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
// Perfil I / canal de la base: F2 (compacto) y F3 (ala no compacta/esbelta, alma compacta)
export function flexI(sh, Fy, Lb, Cb = 1, E = ES) {
  const s = getShape(sh);
  if (!(s.fam === 'I' || s.fam === 'E' || s.fam === 'C')) throw new Error('MnW: válido para perfiles I y canales; use MnHSS para tubos');
  const Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), ry = P(s, 'ry'), rts = P(s, 'rts'), J = P(s, 'J'), ho = P(s, 'ho');
  const c = s.fam === 'C' ? ho / 2 * Math.sqrt(P(s, 'Iy') / P(s, 'Cw')) : 1;
  const r = mnF2(Fy, E, Zx, Sx, ry, rts, J, ho, Lb, Cb, c);
  const lw = s.p['h/tw'];
  if (lw > 3.76 * Math.sqrt(E / Fy)) throw new Error('Alma no compacta en flexión (h/tw = ' + lw + '): aplique F4/F5 (no implementado)');
  const lf = s.fam === 'C' ? s.p['b/t'] : s.p['bf/2tf'];
  const lpf = 0.38 * Math.sqrt(E / Fy), lrf = 1.0 * Math.sqrt(E / Fy);
  let Mflb = r.Mp, estado = 'compacta';
  if (lf > lpf && s.fam !== 'C') {
    if (lf <= lrf) { Mflb = r.Mp - (r.Mp - 0.7 * Fy * Sx) * (lf - lpf) / (lrf - lpf); estado = 'ala no compacta (F3-1)'; }
    else { const h = P(s, 'h'), tw = P(s, 'tw'); const kc = Math.min(0.76, Math.max(0.35, 4 / Math.sqrt(h / tw))); Mflb = 0.9 * E * kc * Sx / lf ** 2; estado = 'ala esbelta (F3-2)'; }
  }
  return { ...r, Mn: Math.min(r.Mn, Mflb), Mflb, estado };
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
// Tubos HSS rectangulares (F7) y redondos (F8), flexión respecto al eje x
export function flexHSS(sh, Fy, E = ES) {
  const s = getShape(sh);
  if (s.fam === 'O') {
    const Dt = s.p['D/t'], Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), Mp = Fy * Zx;
    if (Dt > 0.45 * E / Fy) throw new Error('D/t excede 0.45E/Fy (F8)');
    if (Dt <= 0.07 * E / Fy) return { Mn: Mp, Mp, estado: 'compacta' };
    if (Dt <= 0.31 * E / Fy) return { Mn: Math.min(Mp, (0.021 * E / Dt + Fy) * Sx), Mp, estado: 'no compacta (F8-2)' };
    return { Mn: Math.min(Mp, 0.33 * E / Dt * Sx), Mp, estado: 'esbelta (F8-3)' };
  }
  if (s.fam !== 'R') throw new Error('MnHSS: válido para tubos HSS');
  const Zx = P(s, 'Zx'), Sx = P(s, 'Sx'), t = P(s, 'tdes'), b = P(s, 'b2'), Mp = Fy * Zx;
  const lam = s.p['b/tdes'], lw = s.p['h/tdes'], sq = Math.sqrt(E / Fy);
  if (lw > 2.42 * sq) throw new Error('Alma no compacta en HSS (h/t = ' + lw + '): F7.3 no implementado');
  if (lam <= 1.12 * sq) return { Mn: Mp, Mp, estado: 'compacta' };
  if (lam <= 1.40 * sq) return { Mn: Math.min(Mp, Mp - (Mp - Fy * Sx) * (3.57 * lam * Math.sqrt(Fy / E) - 4.0)), Mp, estado: 'ala no compacta (F7-2)' };
  // F7-3: módulo efectivo aproximado (be según F7-4), eje neutro supuesto en mitad
  const be = Math.min(b, 1.92 * t * Math.sqrt(E / Fy) * (1 - 0.38 / lam * Math.sqrt(E / Fy)));
  const Ix = P(s, 'Ix'), H = P(s, 'Ht'); const Ie = Ix - (b - be) * t * ((H - t) / 2) ** 2;
  return { Mn: Fy * Ie / (H / 2), Mp, estado: 'ala esbelta (F7-3)' };
}

// ---------------------------------------------------------------------
//  Cortante — AISC 360 Cap. G
// ---------------------------------------------------------------------
export function cv1G2(htw, Fy, kv = 5.34, E = ES) {
  const L = 1.10 * Math.sqrt(kv * E / Fy);
  return htw <= L ? 1 : L / htw;
}
export function shearAISC(sh, Fy, E = ES) {
  const s = getShape(sh);
  if (s.fam === 'R') { const t = P(s, 'tdes'), h = P(s, 'h'), Aw = 2 * h * t; const Cv2 = cv2G2(s.p['h/tdes'], Fy, 5, E); return { Vn: 0.6 * Fy * Aw * Cv2, Aw, Cv: Cv2, phi: 0.9 }; }
  if (s.fam === 'O') { const A = P(s, 'A'); return { Vn: 0.6 * Fy * A / 2, Aw: A / 2, Cv: 1, phi: 0.9 }; }
  if (s.fam === 'L') { const b = P(s, 'd'), t = P(s, 't'); return { Vn: 0.6 * Fy * b * t, Aw: b * t, Cv: 1, phi: 0.9 }; }
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
  PnE3: { fn: (s, Fy, Lcx, Lcy, E) => out(compAISC(s, Pa(Fy), Mt(Lcx), Mt(Lcy), Pa(E, ES)).Pn, 'F'), tex: 'P_n', desc: 'Resistencia nominal a compresión de un perfil de la base (E3/E4/E7)', args: 'perfil, Fy, Lcx, Lcy, E' },
  // --- Flexión ---
  LpF2: { fn: (ry, Fy, E) => out(1.76 * Mt(ry) * Math.sqrt(Pa(E, ES) / Pa(Fy)), 'L'), tex: 'L_p', desc: 'Longitud límite plástica Lp (AISC F2-5)', args: 'ry, Fy, E' },
  LrF2: { fn: (rts, Fy, J, Sx, ho, E, c) => { const e = Pa(E, ES), fy = Pa(Fy), jc = toNum(J, 'm^4') * (c === undefined ? 1 : nd(c)) / (toNum(Sx, 'm^3') * Mt(ho)); return out(1.95 * Mt(rts) * e / (0.7 * fy) * Math.sqrt(jc + Math.sqrt(jc * jc + 6.76 * (0.7 * fy / e) ** 2)), 'L'); }, tex: 'L_r', desc: 'Longitud límite inelástica Lr (AISC F2-6)', args: 'rts, Fy, J, Sx, ho, E, c' },
  MnW: { fn: (s, Fy, Lb, Cb, E) => out(flexI(s, Pa(Fy), Mt(Lb), Cb === undefined ? 1 : nd(Cb), Pa(E, ES)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de perfil I/canal: fluencia, PLT (F2) y pandeo local del ala (F3)', args: 'perfil, Fy, Lb, Cb, E' },
  MnyW: { fn: (s, Fy, E) => out(flexIy(s, Pa(Fy), Pa(E, ES)).Mn, 'M'), tex: 'M_{ny}', desc: 'Momento nominal respecto al eje menor de perfil I/canal (F6)', args: 'perfil, Fy, E' },
  MnHSS: { fn: (s, Fy, E) => out(flexHSS(s, Pa(Fy), Pa(E, ES)).Mn, 'M'), tex: 'M_n', desc: 'Momento nominal de tubo HSS rectangular (F7) o redondo (F8)', args: 'perfil, Fy, E' },
  CbF1: { fn: (Mm, Ma, Mb, Mc) => { const a = (x) => Math.abs(math.isUnit(x) ? x.toNumber('N*m') : x); const M = a(Mm); return 12.5 * M / (2.5 * M + 3 * a(Ma) + 4 * a(Mb) + 3 * a(Mc)); }, tex: 'C_b', desc: 'Factor de modificación por gradiente de momento Cb (AISC F1-1)', args: 'Mmax, MA, MB, MC' },
  // --- Cortante ---
  Cv1G2: { fn: (htw, Fy, kv, E) => cv1G2(nd(htw), Pa(Fy), kv === undefined ? 5.34 : nd(kv), Pa(E, ES)), tex: 'C_{v1}', desc: 'Coeficiente de cortante del alma Cv1 (AISC G2-3/G2-4)', args: 'h/tw, Fy, kv, E' },
  Cv2G2: { fn: (htw, Fy, kv, E) => cv2G2(nd(htw), Pa(Fy), kv === undefined ? 5.34 : nd(kv), Pa(E, ES)), tex: 'C_{v2}', desc: 'Coeficiente de pandeo por cortante Cv2 (AISC G2-9 a G2-11)', args: 'h/tw, Fy, kv, E' },
  VnG2: { fn: (s, Fy, E) => out(shearAISC(s, Pa(Fy), Pa(E, ES)).Vn, 'F'), tex: 'V_n', desc: 'Resistencia nominal a cortante de un perfil (G2, G4, G5)', args: 'perfil, Fy, E' },
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
  rhoAISI: { fn: (wt, f, E, k) => { const lam = 1.052 / Math.sqrt(k === undefined ? 4 : nd(k)) * nd(wt) * Math.sqrt(Pa(f) / Pa(E, 203395e6)); return lam <= 0.673 ? 1 : Math.min(1, (1 - 0.22 / lam) / lam); }, tex: '\\rho', desc: 'Factor de ancho efectivo AISI S100 (1.1-1 a 1.1-4): w/t, f, E, k', args: 'w/t, f, E, k' },
}, 'Acero');
