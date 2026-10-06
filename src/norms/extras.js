// =====================================================================
//  Funciones normativas — módulo «extras»
//   · Pavimento rígido AASHTO 93 (ecuación de diseño, ZR por confiabilidad)
//   · Losas sobre terreno: Westergaard (interior, borde y esquina — Huang 2004)
//   · Refuerzo con FRP: profundidad del eje neutro por equilibrio (ACI 440.2R-17 10.2.10)
//   · Cables de acero 6×19 alma de acero (IWRC), carga de rotura y peso (EIPS / IPS)
//  Ver docs/referencias/extras.md
// =====================================================================
import { defineFns, math, toNum, mkUnit as mkU, interp1, fixedUnits, BARS } from '../engine.js';
const mkUnit = (v, u) => { const x = mkU(v, u); fixedUnits.set(x, u); return x; };
const n0 = (x, u) => toNum(x, u);

// ---------- Normal estándar inversa (Acklam) ----------
function normInv(p) {
  if (!(p > 0 && p < 1)) throw new Error('Probabilidad fuera de (0, 1)');
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ---------- AASHTO 93: log10(W18) admisible para un espesor D ----------
// unidades de la ecuación: D [in], Sc y Ec [psi], k [pci]
export function logW18AASHTO93(D, ZR, So, dPSI, pt, Sc, Cd, J, Ec, k) {
  const t1 = ZR * So + 7.35 * Math.log10(D + 1) - 0.06;
  const t2 = Math.log10(dPSI / (4.5 - 1.5)) / (1 + 1.624e7 / Math.pow(D + 1, 8.46));
  const num = Sc * Cd * (Math.pow(D, 0.75) - 1.132);
  const den = 215.63 * J * (Math.pow(D, 0.75) - 18.42 / Math.pow(Ec / k, 0.25));
  if (!(num > 0 && den > 0)) return -Infinity;
  return t1 + t2 + (4.22 - 0.32 * pt) * Math.log10(num / den);
}
const aashtoArgs = (ZR, So, dPSI, pt, Sc, Cd, J, Ec, k) => [n0(ZR), n0(So), n0(dPSI), n0(pt), n0(Sc, 'psi'), n0(Cd), n0(J), n0(Ec, 'psi'), n0(k, 'lbf/in^3')];

defineFns({
  ZRconf: {
    fn: (R) => { let r = n0(R); if (r > 1) r /= 100; if (!(r >= 0.5 && r < 0.99999)) throw new Error('Confiabilidad R entre 50 % y 99.99 %'); return -normInv(r); },
    tex: 'Z_R', desc: 'Desviación normal estándar ZR para la confiabilidad R (AASHTO 93 Tabla 4.1): R = 95 % → −1.645', args: 'R (% o fracción)',
  },
  W18AASHTO93: {
    fn: (D, ZR, So, dPSI, pt, Sc, Cd, J, Ec, k) => { const a = aashtoArgs(ZR, So, dPSI, pt, Sc, Cd, J, Ec, k); const v = logW18AASHTO93(n0(D, 'in'), ...a); return Number.isFinite(v) ? Math.pow(10, v) : 0; },
    tex: 'W_{18}', desc: 'Número admisible de ejes equivalentes de 8.2 t (ESAL) para un espesor D de losa — ecuación de diseño de pavimentos rígidos AASHTO 93 (Ec. 3.6.1 de la Guía, Parte II)', args: 'D, ZR, So, ΔPSI, pt, S′c, Cd, J, Ec, k',
  },
  DAASHTO93: {
    fn: (W18, ZR, So, dPSI, pt, Sc, Cd, J, Ec, k) => {
      const a = aashtoArgs(ZR, So, dPSI, pt, Sc, Cd, J, Ec, k); const t = Math.log10(n0(W18));
      let lo = 3, hi = 30; // pulgadas
      if (logW18AASHTO93(hi, ...a) < t) throw new Error('AASHTO 93: el tráfico exige más de 30 in (76 cm) de losa');
      for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (logW18AASHTO93(m, ...a) >= t) hi = m; else lo = m; }
      return mkUnit(hi * 2.54, 'cm');
    },
    tex: 'D_{req}', desc: 'Espesor de losa requerido por la ecuación AASHTO 93 para W18 ejes equivalentes (solución por bisección)', args: 'W18, ZR, So, ΔPSI, pt, S′c, Cd, J, Ec, k',
  },
  // ---------- Westergaard (Huang, Pavement Analysis and Design, 2.ª ed., 4.1.3) ----------
  lrelWest: {
    fn: (E, hh, nu, k) => { const e = n0(E, 'kgf/cm^2'), t = n0(hh, 'cm'), v = n0(nu), kk = n0(k, 'kgf/cm^3'); return mkUnit(Math.pow(e * t ** 3 / (12 * (1 - v * v) * kk), 0.25), 'cm'); },
    tex: '\\ell', desc: 'Radio de rigidez relativa ℓ = [E h³/(12(1 − ν²) k)]^¼ (Westergaard; Huang Ec. 4.7)', args: 'E, h, ν, k',
  },
  sigIntWest: {
    fn: (P, hh, l, a, nu) => {
      const p = n0(P, 'kgf'), t = n0(hh, 'cm'), L = n0(l, 'cm'), r = n0(a, 'cm'), v = n0(nu);
      const bb = r < 1.724 * t ? Math.sqrt(1.6 * r * r + t * t) - 0.675 * t : r;
      return mkUnit(3 * (1 + v) * p / (2 * Math.PI * t * t) * (Math.log(L / bb) + 0.6159), 'kgf/cm^2');
    },
    tex: '\\sigma_i', desc: 'Esfuerzo de tracción por carga circular interior de Westergaard (1926): 3(1+ν)P/(2πh²)·[ln(ℓ/b) + 0.6159] (Huang Ec. 4.11)', args: 'P, h, ℓ, a, ν',
  },
  sigBordeWest: {
    fn: (P, hh, E, k, a, nu) => {
      const p = n0(P, 'kgf'), t = n0(hh, 'cm'), e = n0(E, 'kgf/cm^2'), kk = n0(k, 'kgf/cm^3'), r = n0(a, 'cm'), v = n0(nu);
      const l = Math.pow(e * t ** 3 / (12 * (1 - v * v) * kk), 0.25);
      return mkUnit(3 * (1 + v) * p / (Math.PI * (3 + v) * t * t) * (Math.log(e * t ** 3 / (100 * kk * r ** 4)) + 1.84 - 4 * v / 3 + (1 - v) / 2 + 1.18 * (1 + 2 * v) * r / l), 'kgf/cm^2');
    },
    tex: '\\sigma_e', desc: 'Esfuerzo de borde por carga circular (Westergaard 1948, borde libre): Huang Ec. 4.13', args: 'P, h, E, k, a, ν',
  },
  sigEsqWest: {
    fn: (P, hh, l, a) => { const p = n0(P, 'kgf'), t = n0(hh, 'cm'), L = n0(l, 'cm'), r = n0(a, 'cm'); return mkUnit(3 * p / (t * t) * (1 - Math.pow(Math.SQRT2 * r / L, 0.6)), 'kgf/cm^2'); },
    tex: '\\sigma_c', desc: 'Esfuerzo de esquina por carga circular (Westergaard 1926): 3P/h²·[1 − (a√2/ℓ)^0.6] (Huang Ec. 4.4)', args: 'P, h, ℓ, a',
  },
  // ---------- FRP: eje neutro por equilibrio (ACI 440.2R-17 10.2.10) ----------
  cFRP440: {
    fn: (As, fy, Es, Af, Ef, d, df, b, fc, Ec, ebi, efd) => {
      const as = n0(As, 'mm^2'), Fy = n0(fy, 'MPa'), es = n0(Es, 'MPa'), af = n0(Af, 'mm^2'), ef = n0(Ef, 'MPa');
      const D = n0(d, 'mm'), Df = n0(df, 'mm'), B = n0(b, 'mm'), f = n0(fc, 'MPa'), ec = n0(Ec, 'MPa'), e0 = n0(ebi), ed = n0(efd);
      const ecp = 1.7 * f / ec;
      const res = (c) => { // fuerza de compresión − tracción
        let efe = 0.003 * (Df - c) / c - e0, ecc = 0.003;
        if (efe > ed) { efe = ed; ecc = (efe + e0) * c / (Df - c); }
        const esx = (efe + e0) * (D - c) / (Df - c);
        const fs = Math.min(es * esx, Fy), ffe = ef * efe;
        const x = Math.min(ecc, 0.003), b1 = (4 * ecp - x) / (6 * ecp - 2 * x), a1 = (3 * ecp * x - x * x) / (3 * b1 * ecp * ecp);
        const a1b1 = ecc >= 0.003 - 1e-12 ? 0 : a1 * b1;
        const comp = (a1b1 || (0.85 * (f <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (f - 28) / 7)))) * f * B * c;
        return comp - (as * fs + af * ffe);
      };
      let lo = 1e-3 * Df, hi = 0.999 * Df;
      if (res(lo) > 0 || res(hi) < 0) throw new Error('FRP: no hay equilibrio de la sección (revise datos)');
      for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (res(m) > 0) hi = m; else lo = m; }
      return mkUnit((lo + hi) / 2, 'mm');
    },
    tex: 'c', desc: 'Profundidad del eje neutro de una viga rectangular reforzada con FRP por equilibrio de fuerzas (ACI 440.2R-17 10.2.10): falla por aplastamiento (bloque de Whitney) o por despegue/rotura del FRP (bloque parabólico α1, β1)', args: 'As, fy, Es, Af, Ef, d, df, b, f′c, Ec, εbi, εfd',
  },
  b1FRP: {
    fn: (ecc, fc, Ec) => { const ecp = 1.7 * n0(fc, 'MPa') / n0(Ec, 'MPa'); const x = Math.min(n0(ecc), 0.003); return (4 * ecp - x) / (6 * ecp - 2 * x); },
    tex: '\\beta_1', desc: 'Factor β1 del bloque parabólico (ACI 440.2R-17 Ec. 10.2.10 b): (4ε′c − εc)/(6ε′c − 2εc)', args: 'εc, f′c, Ec',
  },
  a1FRP: {
    fn: (ecc, fc, Ec) => { const ecp = 1.7 * n0(fc, 'MPa') / n0(Ec, 'MPa'); const x = Math.min(n0(ecc), 0.003); const b1 = (4 * ecp - x) / (6 * ecp - 2 * x); return (3 * ecp * x - x * x) / (3 * b1 * ecp * ecp); },
    tex: '\\alpha_1', desc: 'Factor α1 del bloque parabólico (ACI 440.2R-17 Ec. 10.2.10 c): (3ε′cεc − εc²)/(3β1ε′c²)', args: 'εc, f′c, Ec',
  },
  // ---------- Cables 6×19 IWRC ----------
  cableRot: {
    fn: (dd, grado) => {
      const di = n0(dd, 'in'); const g = grado === undefined ? 1 : n0(grado);
      const D = [0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25];
      const EIPS = [3.40, 7.55, 13.3, 20.6, 29.4, 39.8, 51.7, 65.0, 79.9];   // toneladas cortas (2000 lb)
      const IPS = [2.94, 6.56, 11.5, 17.9, 25.6, 34.6, 44.9, 56.5, 69.4];
      if (di < 0.24 || di > 1.26) throw new Error('Cable 6×19: diámetro entre 1/4" y 1 1/4"');
      return mkUnit(interp1(di, D, g === 2 ? IPS : EIPS) * 0.907185, 'tonf');
    },
    tex: 'T_{rot}', desc: 'Carga de rotura mínima de cable de acero 6×19 con alma de acero (IWRC): grado 1 = EIPS (extra mejorado, por defecto), 2 = IPS (Federal Spec. RR-W-410 / catálogos de fabricantes), en tf', args: 'diámetro [, grado]',
  },
  cablePeso: {
    fn: (dd) => { const di = n0(dd, 'in'); const D = [0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25], W = [0.116, 0.26, 0.46, 0.72, 1.04, 1.42, 1.85, 2.34, 2.89]; if (di < 0.24 || di > 1.26) throw new Error('Cable 6×19: diámetro entre 1/4" y 1 1/4"'); return mkUnit(interp1(di, D, W) * 1.48816, 'kgf/m'); },
    tex: 'w_{cab}', desc: 'Peso aproximado de cable 6×19 IWRC (lb/ft de catálogo → kgf/m)', args: 'diámetro',
  },
  cableArea: {
    fn: (dd) => { const di = n0(dd, 'mm'); return mkUnit(0.40 * Math.PI * di * di / 4, 'mm^2'); },
    tex: 'A_{cab}', desc: 'Área metálica aproximada de cable 6×19 IWRC ≈ 0.40·πd²/4 (factor de llenado)', args: 'diámetro',
  },
}, 'Extras (pavimentos, FRP, cables)');

export { normInv };

// ---------- Sección circular: diagrama de interacción P–M (compatibilidad de deformaciones) ----------
// unidades internas: cm, kgf. Devuelve puntos { c, Pn, Mn, phi, P, M } con P = φPn, M = φMn (kgf, kgf·cm)
// espiral = true → φ 0.75 (E.060 9.3.2.2 / ACI 21.2.2); Pmáx = 0.85·φ·P0 (E.060 10.3.6.1)
export function pmCircPts(D, dc, nb, Abar, fc, fy, espiral = true, n = 120) {
  const R = D / 2, Es = 2.0e6, ecu = 0.003, ey = fy / Es;
  const b1 = fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 280) / 70);
  const rs = R - dc, bars = [...Array(nb).keys()].map(i => R - rs * Math.cos(2 * Math.PI * i / nb)); // profundidad desde la fibra extrema
  const Ag = Math.PI * R * R, Ast = nb * Abar, P0 = 0.85 * fc * (Ag - Ast) + fy * Ast;
  const phiC = espiral ? 0.75 : 0.70, Pmax = (espiral ? 0.85 : 0.80) * phiC * P0;
  // área y momento del segmento circular de profundidad a
  const seg = (a) => {
    if (a <= 0) return { A: 0, y: 0 };
    if (a >= D) return { A: Ag, y: R };
    const th = Math.acos((R - a) / R); const A = R * R * (th - Math.sin(th) * Math.cos(th));
    const yc = (2 * R * Math.pow(Math.sin(th), 3)) / (3 * (th - Math.sin(th) * Math.cos(th))); // del centro al centroide
    return { A, y: R - yc };
  };
  const dt = Math.max(...bars);
  const pts = [];
  const cs = [];
  for (let i = 0; i <= n; i++) cs.push(0.02 * D * Math.pow(60, i / n)); // de 0.02D a 1.2D (escala log)
  for (const c of cs) {
    const a = Math.min(b1 * c, D), sg = seg(a);
    let Pn = 0.85 * fc * sg.A, Mn = 0.85 * fc * sg.A * (R - sg.y);
    for (const di of bars) {
      const es = ecu * (c - di) / c; let fs = Math.max(-fy, Math.min(fy, Es * es));
      if (di < a) fs -= 0.85 * fc; // descuenta el concreto desplazado
      Pn += fs * Abar; Mn += fs * Abar * (R - di);
    }
    const et = ecu * (dt - c) / c;
    const phi = et <= ey ? phiC : et >= 0.005 ? 0.9 : phiC + (0.9 - phiC) * (et - ey) / (0.005 - ey);
    pts.push({ c, Pn, Mn, phi, P: Math.min(phi * Pn, Pmax), M: phi * Mn });
  }
  const Tn = -fy * Ast; pts.unshift({ c: 0, Pn: Tn, Mn: 0, phi: 0.9, P: 0.9 * Tn, M: 0 });
  return { pts, Pmax, P0, Ag, Ast };
}
export function phiMnCircAt(Pu, D, dc, nb, Abar, fc, fy, espiral = true) {
  const { pts, Pmax } = pmCircPts(D, dc, nb, Abar, fc, fy, espiral, 400);
  if (Pu > Pmax) return 0;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    if ((p0.P - Pu) * (p1.P - Pu) <= 0 && p1.P !== p0.P) return p0.M + (p1.M - p0.M) * (Pu - p0.P) / (p1.P - p0.P);
  }
  return 0;
}
defineFns({
  phiMnCirc: {
    fn: (Pu, D, dc, nb, bar, fc, fy) => {
      const Abar = math.isUnit(bar) ? n0(bar, 'cm^2') : (BARS[Math.round(n0(bar))] || {}).A;
      if (!Abar) throw new Error('phiMnCirc: barra no válida');
      return mkUnit(phiMnCircAt(n0(Pu, 'kgf'), n0(D, 'cm'), n0(dc, 'cm'), Math.round(n0(nb)), Abar, n0(fc, 'kgf/cm^2'), n0(fy, 'kgf/cm^2')) / 1e5, 'tonf*m');
    },
    tex: '\\phi M_n', desc: 'φMn de sección circular con barras en anillo y espiral para la carga axial Pu (compatibilidad de deformaciones, E.060 10.2 y 9.3.2.2; φ 0.75 → 0.90 según εt)', args: 'Pu, D, recubrimiento al centro de barras, n.º barras, barra (#), f\'c, fy',
  },
  phiPnCirc: {
    fn: (D, dc, nb, bar, fc, fy) => {
      const Abar = math.isUnit(bar) ? n0(bar, 'cm^2') : (BARS[Math.round(n0(bar))] || {}).A;
      if (!Abar) throw new Error('phiPnCirc: barra no válida');
      return mkUnit(pmCircPts(n0(D, 'cm'), n0(dc, 'cm'), Math.round(n0(nb)), Abar, n0(fc, 'kgf/cm^2'), n0(fy, 'kgf/cm^2')).Pmax / 1000, 'tonf');
    },
    tex: '\\phi P_{n,m\\acute{a}x}', desc: 'φPn,máx = 0.85·0.75·[0.85f\'c(Ag − Ast) + fy·Ast] de sección circular con espiral (E.060 10.3.6.1)', args: 'D, recubrimiento, n.º barras, barra (#), f\'c, fy',
  },
}, 'Extras (pavimentos, FRP, cables)');
