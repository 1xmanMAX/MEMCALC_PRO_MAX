// =====================================================================
//  Bloques gráficos — módulo «bridges»
//   · bridgesec : sección transversal acotada del tablero (losa, vigas,
//                 veredas, barreras, carriles de diseño y camiones)
//   · hl93env   : envolventes de momento y cortante por carga viva móvil
//                 HL-93 (camión, tándem, carril, doble camión al 90 %),
//                 camión de fatiga o tren de ejes propio, sobre viga simple
//                 o continua (líneas de influencia con solveBeam), con
//                 cargas DC/DW opcionales y combinación Resistencia I.
//  Referencias: AASHTO LRFD 3.6.1.2–3.6.1.4, 3.6.2, 3.4.1 (docs/referencias/bridges.md)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, evalList, esc, math, K, symTex, valTex, settings } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, pos, f2, solveBeam } from '../blocks.js';
import { AX_TRUCK, AX_TANDEM, W_LANE } from '../norms/bridges.js';

const U = (v, u) => math.unit(v, u);
// Unidades de presentación según el sistema del documento (cálculo interno en tonf y m)
function dispUnits() {
  const sys = settings.sys;
  if (sys === 'si') return { f: 9.80665, fm: 9.80665, fw: 9.80665, F: 'kN', M: 'kN*m', lF: 'kN', lM: 'kN·m', lw: 'kN/m', fl: 1, lL: 'm' };
  if (sys === 'us') return { f: 2.2046226, fm: 7.2330139, fw: 0.6719690, F: 'kip', M: 'kip*ft', lF: 'kip', lM: 'kip·ft', lw: 'kip/ft', fl: 3.2808399, lL: 'ft' };
  return { f: 1, fm: 1, fw: 1, F: 'tonf', M: 'tonf*m', lF: 't', lM: 't·m', lw: 't/m', fl: 1, lL: 'm' };
}

// ---------------------------------------------------------------------
//  Cargas permanentes:  U * w | U 1 w | U 1-2 w | UP x1 x2 w | T 1 w1 w2 | P x P
// ---------------------------------------------------------------------
function parsePerm(text, S) {
  const out = [];
  for (const raw of String(text || '').split(/\n|;/)) {
    const line = raw.split('//')[0].trim(); if (!line) continue;
    const tk = line.split(/\s+/), t = tk[0].toUpperCase();
    const ev = (s, u) => evalParam(s, S, u);
    if (t === 'U' || t === 'W') out.push({ t: 'U', span: tk[1], w: ev(tk.slice(2).join(' '), 'tonf/m'), cas: 'CM' });
    else if (t === 'UP') out.push({ t: 'UP', x1: ev(tk[1], 'm'), x2: ev(tk[2], 'm'), w: ev(tk.slice(3).join(' '), 'tonf/m'), cas: 'CM' });
    else if (t === 'T') out.push({ t: 'T', span: tk[1], w1: ev(tk[2], 'tonf/m'), w2: ev(tk.slice(3).join(' '), 'tonf/m'), cas: 'CM' });
    else if (t === 'P') out.push({ t: 'P', x: ev(tk[1], 'm'), P: ev(tk.slice(2).join(' '), 'tonf'), cas: 'CM' });
    else throw new Error('Carga permanente no reconocida: "' + raw + '" (use U, UP, T o P)');
  }
  return out;
}
// Tren de ejes propio: "P x; P x; ..." (tonf, m)
function parseAxles(text, S) {
  const ax = [];
  for (const it of String(text || '').split(/;|\n/)) {
    const s = it.trim(); if (!s) continue;
    const tk = s.split(/\s+/);
    if (tk.length < 2) throw new Error('Eje sin posición: "' + s + '" (formato: P x)');
    ax.push({ p: evalParam(tk[0], S, 'tonf'), x: evalParam(tk.slice(1).join(' '), S, 'm') });
  }
  if (!ax.length) throw new Error('Defina al menos un eje (formato: P x; P x)');
  ax.sort((a, b) => a.x - b.x);
  const x0 = ax[0].x; ax.forEach(a => { a.x -= x0; });
  return ax;
}

// =====================================================================
//  hl93env
// =====================================================================
function renderHL93(b, ctx) {
  const S = ctx.scope;
  const Ls = evalList(b.tramos, S, 'm');
  if (!Ls.length) throw new Error('Defina las longitudes de los tramos');
  if (Ls.length > 8) throw new Error('Máximo 8 tramos');
  Ls.forEach((l, i) => { if (!(l > 0)) throw new Error('La longitud del tramo ' + (i + 1) + ' debe ser mayor que cero'); });
  const X = [0]; Ls.forEach(l => X.push(X[X.length - 1] + l));
  const Lt = X[X.length - 1];
  const sup = String(b.apoyos || '').split(/[,\s]+/).filter(Boolean).map(s => s.toUpperCase());
  while (sup.length < X.length) sup.push('A');
  const nSup = sup.filter(s => s !== 'L').length;
  if (nSup < 1 || (nSup < 2 && !sup.includes('E'))) throw new Error('La viga necesita al menos dos apoyos o un empotramiento');
  const veh = String(b.vehiculo || 'HL-93').toLowerCase();
  const isFat = /fat/.test(veh), isCustom = /eje|prop|custom/.test(veh);
  const IM = evalParam(b.IM, S, '', isFat ? 0.15 : 0.33);
  const gdf = evalParam(b.g, S, '', 1);
  const eta = evalParam(b.eta, S, '', 1);
  const gLL = evalParam(b.gLL, S, '', 1.75);
  const wl = evalParam(b.carril, S, 'tonf/m', isFat || isCustom ? 0 : W_LANE);
  const xmin = evalParam(b.xmin, S, 'm', 0), xmax = evalParam(b.xmax, S, 'm', Lt);
  // anchos de franja (losas): la carga viva positiva se divide entre E⁺ y la negativa entre E⁻ (resultados por metro)
  const Ep = evalParam(b.Epos, S, 'm', 0), En = evalParam(b.Eneg, S, 'm', 0);
  const strip = Ep > 0 || En > 0;
  if (strip && !(Ep > 0 && En > 0)) throw new Error('Indique ambos anchos de franja E⁺ y E⁻');
  const fP = strip ? 1 / Ep : 1, fN = strip ? 1 / En : 1;
  if (!(IM >= 0) || !(gdf > 0) || !(xmax > xmin)) throw new Error('Revise IM, g y el rango de circulación (xmin < xmax)');
  const secs = evalList(b.secciones, S, 'm');
  secs.forEach(x => { if (x < 0 || x > Lt) throw new Error('Sección fuera de la viga: x = ' + f2(x) + ' m'); });
  const interiorSup = sup.slice(1, -1).some(s => s !== 'L') || (sup[0] === 'E' && sup[sup.length - 1] !== 'L') || (sup[sup.length - 1] === 'E' && sup[0] !== 'L');
  const continuous = X.length > 2 && sup.slice(1, -1).some(s => s !== 'L');
  const nEl = Ls.length === 1 ? 40 : 20;
  const EI = 1e4;
  const Z = secs.map(x => ({ t: 'P', x, P: 0, cas: 'CM' }));

  // ----- malla y líneas de influencia (carga unitaria en cada nudo) -----
  const r0 = solveBeam(X, sup, EI, Z, null, nEl);
  const xs = r0.xs, N = xs.length;
  if (r0.sx.length !== 3 * (N - 1)) throw new Error('Malla inconsistente en el análisis de líneas de influencia');
  const ILM = [], ILVR = [], ILVL = [];
  for (let k = 0; k < N; k++) { ILM.push(new Float64Array(N)); ILVR.push(new Float64Array(N)); ILVL.push(new Float64Array(N)); }
  for (let j = 0; j < N; j++) {
    const r = solveBeam(X, sup, EI, Z.concat([{ t: 'P', x: xs[j], P: 1, cas: 'CM' }]), null, nEl);
    if (r.xs.length !== N) throw new Error('Malla inconsistente (carga unitaria)');
    for (let k = 0; k < N; k++) {
      ILM[k][j] = k < N - 1 ? r.sM[3 * k] : r.sM[3 * (N - 2) + 2];
      if (k < N - 1) ILVR[k][j] = r.sV[3 * k];
      if (k > 0) ILVL[k][j] = r.sV[3 * (k - 1) + 2];
    }
  }
  const isSupNode = (k) => X.some((x, i) => Math.abs(x - xs[k]) < 1e-7 && sup[i] !== 'L');
  // secciones de evaluación (lado del cortante)
  const ent = [];
  for (let k = 0; k < N; k++) {
    if (k > 0 && (k === N - 1 || isSupNode(k))) ent.push({ k, side: 'L' });
    if (k < N - 1) ent.push({ k, side: 'R' });
  }
  // evaluación de una línea de influencia (lineal entre nudos) con salto unitario en la sección
  const locate = (p) => { let lo = 0, hi = N - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= p) lo = mid; else hi = mid; } return lo; };
  const mkIL = (vals, ks, side) => {
    // valores izquierdo y derecho en el nudo de la sección
    let eL = null, eR = null;
    if (side === 'R') { eL = vals[ks]; eR = vals[ks] + 1; } else if (side === 'L') { eR = vals[ks]; eL = vals[ks] - 1; }
    const at = (j, fromRight) => (eL !== null && j === ks ? (fromRight ? eR : eL) : vals[j]);
    const f = (p, rightLim) => {
      if (p < xmin - 1e-9 || p > xmax + 1e-9 || p < -1e-9 || p > Lt + 1e-9) return 0;
      const e = Math.min(locate(p), N - 2);
      const x0 = xs[e], x1 = xs[e + 1];
      if (Math.abs(p - x0) < 1e-9) return at(e, rightLim);
      if (Math.abs(p - x1) < 1e-9) return at(e + 1, rightLim);
      const a = at(e, true), c = at(e + 1, false);
      return a + (c - a) * (p - x0) / (x1 - x0);
    };
    // integral de las partes positiva y negativa en [xmin, xmax]
    const area = () => {
      let ap = 0, an = 0;
      for (let e = 0; e < N - 1; e++) {
        let x0 = xs[e], x1 = xs[e + 1]; if (x1 <= xmin || x0 >= xmax) continue;
        const a0 = at(e, true), a1 = at(e + 1, false);
        const yAt = (x) => a0 + (a1 - a0) * (x - xs[e]) / (xs[e + 1] - xs[e]);
        x0 = Math.max(x0, xmin); x1 = Math.min(x1, xmax);
        const y0 = yAt(x0), y1 = yAt(x1), h = x1 - x0;
        if (y0 >= 0 && y1 >= 0) ap += (y0 + y1) * h / 2;
        else if (y0 <= 0 && y1 <= 0) an += (y0 + y1) * h / 2;
        else { const xz = h * Math.abs(y0) / (Math.abs(y0) + Math.abs(y1)); if (y0 > 0) { ap += y0 * xz / 2; an += y1 * (h - xz) / 2; } else { an += y0 * xz / 2; ap += y1 * (h - xz) / 2; } }
      }
      return [ap, an];
    };
    return { f, area };
  };
  // ----- vehículos -----
  const mirror = (ax) => { const sp = ax[ax.length - 1].x; return ax.map(a => ({ p: a.p, x: sp - a.x })).reverse(); };
  const fams = { tr: [], ta: [], dt: [] };
  if (isCustom) fams.tr.push(parseAxles(b.ejes, S));
  else if (isFat) fams.tr.push(AX_TRUCK(9.0));
  else {
    const sp = continuous ? [4.3, 5.0, 6.0, 7.0, 8.0, 9.0] : [4.3];
    sp.forEach(s => fams.tr.push(AX_TRUCK(s)));
    fams.ta.push(AX_TANDEM);
    if (continuous) {
      const t1 = AX_TRUCK(4.3), Lmx = Math.max(...Ls), step = Math.max(1, Lmx / 10);
      for (let G = 15; G <= Math.min(Lt, 15 + 2 * Lmx) + 1e-9; G += step) fams.dt.push(t1.concat(t1.map(a => ({ p: a.p, x: a.x + 8.6 + G }))));
    }
  }
  // posiciones candidatas: un eje sobre cada nudo (extremos exactos para línea lineal a trozos).
  // Se precalcula, para cada eje, el elemento y la fracción (independientes de la sección).
  const cand = {};
  for (const [fk, list] of Object.entries(fams)) {
    const pls = [];
    for (const ax0 of list) for (const ax of [ax0, mirror(ax0)]) {
      for (const a of ax) for (let j = 0; j < N; j++) { const s = xs[j] - a.x; pls.push(ax.map(q => ({ p: q.p, x: q.x + s }))); }
    }
    const na = pls.length ? pls[0].length : 0, nt = pls.length * na;
    const P = new Float64Array(nt), E = new Int32Array(nt), Tf = new Float64Array(nt), ND = new Int32Array(nt);
    pls.forEach((pl, c) => pl.forEach((q, i) => {
      const t = c * na + i, x = q.x;
      if (x < xmin - 1e-9 || x > xmax + 1e-9 || x < -1e-9 || x > Lt + 1e-9) { P[t] = 0; E[t] = 0; ND[t] = -1; return; }
      const e = Math.min(locate(x), N - 2); P[t] = q.p; E[t] = e;
      ND[t] = Math.abs(x - xs[e]) < 1e-9 ? e : Math.abs(x - xs[e + 1]) < 1e-9 ? e + 1 : -1;
      Tf[t] = (x - xs[e]) / (xs[e + 1] - xs[e]);
    }));
    cand[fk] = { pls, na, P, E, Tf, ND };
  }
  // evalúa una familia de vehículos sobre la línea de influencia vals (salto unitario en ks si side)
  const evalFam = (vals, ks, side, fam) => {
    let mx = 0, mn = 0, pmx = null, pmn = null;
    const { pls, na, P, E, Tf, ND } = fam;
    const jump = side === 'R' || side === 'L';
    const eL = jump ? (side === 'R' ? vals[ks] : vals[ks] - 1) : 0, eR = jump ? eL + 1 : 0;
    for (let c = 0; c < pls.length; c++) for (let rl = 0; rl < (jump ? 2 : 1); rl++) {
      let sp = 0, sn = 0;
      for (let i = 0, t = c * na; i < na; i++, t++) {
        const p = P[t]; if (p === 0) continue;
        let eta;
        const nd = ND[t];
        if (nd >= 0) eta = jump && nd === ks ? (rl === 0 ? eR : eL) : vals[nd];
        else { const e = E[t]; const a = jump && e === ks ? eR : vals[e], bb = jump && e + 1 === ks ? eL : vals[e + 1]; eta = a + (bb - a) * Tf[t]; }
        const v = p * eta; if (v > 0) sp += v; else sn += v;
      }
      if (sp > mx) { mx = sp; pmx = pls[c]; }
      if (sn < mn) { mn = sn; pmn = pls[c]; }
    }
    return { mx, mn, pmx, pmn };
  };
  // ----- cargas permanentes -----
  const dcL = parsePerm(b.DC, S), dwL = parsePerm(b.DW, S);
  const hasPerm = dcL.length || dwL.length;
  const permAt = (loads) => {
    if (!loads.length) return null;
    const r = solveBeam(X, sup, EI, Z.concat(loads), null, nEl);
    const find = (x) => r.xs.findIndex(v => Math.abs(v - x) < 1e-7);
    return ent.map(({ k, side }) => {
      const i = find(xs[k]); const nn = r.xs.length;
      const M = i < nn - 1 ? r.sM[3 * i] : r.sM[3 * (nn - 2) + 2];
      const V = side === 'R' ? r.sV[3 * i] : r.sV[3 * (i - 1) + 2];
      return { M, V };
    });
  };
  const PDC = permAt(dcL), PDW = permAt(dwL);
  // ----- envolventes -----
  const res = ent.map(({ k, side }, ie) => {
    const ILm = mkIL(ILM[k], -1, null), ILv = mkIL(side === 'R' ? ILVR[k] : ILVL[k], k, side);
    const o = { x: xs[k], k, side };
    const vV = side === 'R' ? ILVR[k] : ILVL[k];
    const tm = evalFam(ILM[k], -1, null, cand.tr), am = fams.ta.length ? evalFam(ILM[k], -1, null, cand.ta) : { mx: 0, mn: 0 };
    const tv = evalFam(vV, k, side, cand.tr), av = fams.ta.length ? evalFam(vV, k, side, cand.ta) : { mx: 0, mn: 0 };
    const [lmP, lmN] = wl > 0 ? ILm.area() : [0, 0], [lvP, lvN] = wl > 0 ? ILv.area() : [0, 0];
    o.trP = tm.mx; o.taP = am.mx; o.lnP = wl * lmP; o.trN = tm.mn; o.taN = am.mn; o.lnN = wl * lmN;
    o.pl = tm.mx >= am.mx ? tm.pmx : am.pmx;
    o.Mp = fP * gdf * (Math.max(tm.mx, am.mx) * (1 + IM) + wl * lmP);
    o.Mn = fN * gdf * (Math.min(tm.mn, am.mn) * (1 + IM) + wl * lmN);
    if (fams.dt.length) { const dm = evalFam(ILM[k], -1, null, cand.dt); o.Mn = Math.min(o.Mn, fN * gdf * 0.9 * (dm.mn * (1 + IM) + wl * lmN)); }
    o.Vp = fP * gdf * (Math.max(tv.mx, av.mx) * (1 + IM) + wl * lvP);
    o.Vn = fP * gdf * (Math.min(tv.mn, av.mn) * (1 + IM) + wl * lvN);
    o.MDC = PDC ? PDC[ie].M : 0; o.VDC = PDC ? PDC[ie].V : 0; o.MDW = PDW ? PDW[ie].M : 0; o.VDW = PDW ? PDW[ie].V : 0;
    const comb = (dc, dw, ll, mx) => (mx ? Math.max(1.25 * dc, 0.9 * dc) + Math.max(1.5 * dw, 0.65 * dw) : Math.min(1.25 * dc, 0.9 * dc) + Math.min(1.5 * dw, 0.65 * dw)) + gLL * ll;
    o.Mup = eta * comb(o.MDC, o.MDW, o.Mp, true); o.Mun = eta * comb(o.MDC, o.MDW, o.Mn, false);
    o.Vup = eta * comb(o.VDC, o.VDW, o.Vp, true); o.Vun = eta * comb(o.VDC, o.VDW, o.Vn, false);
    return o;
  });
  // limpia el ruido numérico (|v| < 1e-7 t, t·m)
  const KEYS = ['trP', 'taP', 'lnP', 'trN', 'taN', 'lnN', 'Mp', 'Mn', 'Vp', 'Vn', 'MDC', 'VDC', 'MDW', 'VDW', 'Mup', 'Mun', 'Vup', 'Vun'];
  res.forEach(o => KEYS.forEach(kk => { if (Math.abs(o[kk]) < 1e-7) o[kk] = 0; }));
  // ----- exportación -----
  const sfx = b.sufijo ? String(b.sufijo).replace(/\W/g, '') : '';
  const UD = dispUnits();
  const conv = (v, u) => (u === 'tonf*m' ? U(v * UD.fm, UD.M) : u === 'tonf' ? U(v * UD.f, UD.F) : u === 'm' ? U(v * UD.fl, UD.lL) : U(v, u));
  const set = (n, v, u) => setVar(ctx, n + sfx, conv(v, u));
  const iMax = res.reduce((bi, o, i) => (o.Mp > res[bi].Mp ? i : bi), 0);
  const iMin = res.reduce((bi, o, i) => (o.Mn < res[bi].Mn ? i : bi), 0);
  const VLL = Math.max(...res.map(o => Math.max(Math.abs(o.Vp), Math.abs(o.Vn))));
  const cr = res[iMax];
  set('MLLp', cr.Mp, 'tonf*m'); set('MLLn', res[iMin].Mn, 'tonf*m'); set('VLL', VLL, 'tonf'); set('xMLL', cr.x, 'm');
  set('Mtr', cr.trP, 'tonf*m'); set('Mta', cr.taP, 'tonf*m'); set('Mln', cr.lnP, 'tonf*m');
  if (hasPerm) {
    set('MDCp', Math.max(0, ...res.map(o => o.MDC)), 'tonf*m'); set('MDCn', Math.min(0, ...res.map(o => o.MDC)), 'tonf*m');
    set('MDWp', Math.max(0, ...res.map(o => o.MDW)), 'tonf*m'); set('MDWn', Math.min(0, ...res.map(o => o.MDW)), 'tonf*m');
    set('VDC', Math.max(...res.map(o => Math.abs(o.VDC))), 'tonf'); set('VDW', Math.max(...res.map(o => Math.abs(o.VDW))), 'tonf');
    set('Mup', Math.max(0, ...res.map(o => o.Mup)), 'tonf*m'); set('Mun', Math.min(0, ...res.map(o => o.Mun)), 'tonf*m');
    set('Vu', Math.max(...res.map(o => Math.max(Math.abs(o.Vup), Math.abs(o.Vun)))), 'tonf');
  }
  secs.forEach((x, i) => {
    const k = xs.findIndex(v => Math.abs(v - x) < 1e-7);
    const o = res.find(q => q.k === k && q.side === (k === N - 1 ? 'L' : 'R'));
    const n = i + 1;
    set('MLLx' + n, o.Mp, 'tonf*m'); set('MLLnx' + n, o.Mn, 'tonf*m'); set('VLLx' + n, Math.max(Math.abs(o.Vp), Math.abs(o.Vn)), 'tonf');
    if (hasPerm) {
      set('MDCx' + n, o.MDC, 'tonf*m'); set('MDWx' + n, o.MDW, 'tonf*m'); set('VDCx' + n, Math.abs(o.VDC), 'tonf'); set('VDWx' + n, Math.abs(o.VDW), 'tonf');
      set('Mux' + n, o.Mup, 'tonf*m'); set('Vux' + n, Math.max(Math.abs(o.Vup), Math.abs(o.Vun)), 'tonf');
    }
  });

  // ----- dibujo: esquema con vehículo en la posición crítica -----
  const W = 720, padL = 60, padR = 30, sc = (W - padL - padR) / Lt, px = (x) => padL + x * sc;
  let g = arrowDefs;
  const yb = 112;
  g += `<rect x="${px(0)}" y="${yb - 4}" width="${(Lt * sc).toFixed(1)}" height="8" fill="#5b6b7b"/>`;
  if (xmin > 1e-9 || xmax < Lt - 1e-9) g += `<rect x="${px(xmin)}" y="${yb - 9}" width="${((xmax - xmin) * sc).toFixed(1)}" height="4" fill="${C.orange}" opacity=".55"/>`;
  X.forEach((x, i) => {
    const xx = px(x), t = sup[i];
    if (t === 'A' || t === 'R') g += `<path d="M${xx},${yb + 4} l-9,14 h18 z" fill="#fff" stroke="${C.ink}"/>` + Lne(xx - 13, yb + 21, xx + 13, yb + 21) + `<rect x="${xx - 13}" y="${yb + 21}" width="26" height="5" fill="url(#hatch)"/>`;
    if (t === 'E') g += `<rect x="${i === 0 ? xx - 10 : xx}" y="${yb - 22}" width="10" height="44" fill="url(#hatch)" stroke="${C.ink}"/>`;
    g += T(xx, yb + 40, String.fromCharCode(65 + i), { b: 1 });
  });
  for (let i = 0; i < Ls.length; i++) g += dimH(px(X[i]), px(X[i + 1]), yb + 58, f2(Ls[i] * UD.fl) + ' ' + UD.lL);
  const pl = cr.pl || [];
  const onb = pl.filter(a => a.x >= -1e-9 && a.x <= Lt + 1e-9);
  if (onb.length) {
    const xa = Math.min(...onb.map(a => a.x)), xb = Math.max(...onb.map(a => a.x));
    if (!isCustom) g += `<rect x="${(px(xa) - 8).toFixed(1)}" y="${yb - 74}" width="${(px(xb) - px(xa) + 16).toFixed(1)}" height="20" rx="4" fill="${C.redF}" stroke="${C.red}"/>`;
    const pmax = Math.max(...onb.map(a => a.p));
    onb.forEach(a => { const xx = px(a.x), hh = 14 + 24 * a.p / pmax; g += `<line x1="${xx.toFixed(1)}" y1="${(yb - 6 - hh).toFixed(1)}" x2="${xx.toFixed(1)}" y2="${yb - 6}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + T(xx, yb - 80, f2(a.p * UD.f) + ' ' + UD.lF, { fs: 9, c: C.red }); });
  }
  if (wl > 0) g += `<rect x="${px(0)}" y="${yb - 12}" width="${(Lt * sc).toFixed(1)}" height="4" fill="${C.blueF}" stroke="${C.blue}" stroke-width=".6"/>` + T(px(Lt) - 2, yb - 16, 'carril ' + f2(wl * UD.fw, 3) + ' ' + UD.lw, { fs: 9, c: C.blue, a: 'end' });
  const vName = isFat ? 'Camión de fatiga (14.52 t a 9.0 m)' : isCustom ? 'Tren de ejes definido por el usuario' : 'HL-93: camión / tándem + carril';
  g += T(padL, 14, vName + ' — posición crítica para M⁺ máx. en x = ' + f2(cr.x * UD.fl) + ' ' + UD.lL, { fs: 10, a: 'start', c: C.axis });
  let out = svgWrap(W, yb + 70, g);
  // ----- diagramas -----
  const diag = (ys1, ys2, ys3, ys4, title, unit, cols) => {
    const H = 190, top = 20, bot = 20, xsA = res.map(o => o.x);
    const all = ys1.concat(ys2, ys3 || [], ys4 || []);
    let ymin = Math.min(0, ...all), ymax = Math.max(0, ...all); if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const sy = (H - top - bot) / (ymax - ymin), py = (y) => top + (ymax - y) * sy;
    let s = '';
    niceTicks(ymin, ymax, 5).forEach(t => { s += Lne(padL, py(t), W - padR, py(t), C.grid, 0.7) + T(padL - 6, py(t) + 3.5, f2(t, 1), { fs: 9, c: C.axis, a: 'end' }); });
    X.forEach(x => { s += Lne(px(x), top - 6, px(x), H - bot + 4, C.grid, 0.7, '3 3'); });
    const path = (arr, close) => (close ? 'M' + px(xsA[0]).toFixed(1) + ',' + py(0).toFixed(1) + ' ' : '') + arr.map((y, i) => (i || close ? 'L' : 'M') + px(xsA[i]).toFixed(1) + ',' + py(y).toFixed(1)).join(' ') + (close ? ' L' + px(xsA[xsA.length - 1]).toFixed(1) + ',' + py(0).toFixed(1) + ' Z' : '');
    s += `<path d="${path(ys1, true)}" fill="${cols[0][1]}" stroke="${cols[0][0]}" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += `<path d="${path(ys2, true)}" fill="${cols[1][1]}" stroke="${cols[1][0]}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (ys3) s += `<path d="${path(ys3, false)}" fill="none" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="5 3"/>` + `<path d="${path(ys4, false)}" fill="none" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="5 3"/>`;
    s += Lne(padL, py(0), W - padR, py(0), C.ink, 1);
    const lab = (arr, pick, col, up) => {
      const v = pick(...arr); if (Math.abs(v) < 1e-9) return;
      const i = arr.indexOf(v), xx = px(xsA[i]), yy = py(v);
      s += `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6" fill="${col}"/><text x="${xx.toFixed(1)}" y="${(yy + (up ? -6 : 13)).toFixed(1)}" font-size="10" font-weight="600" fill="${col}" text-anchor="middle" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(f2(v))}</text>`;
    };
    lab(ys1, Math.max, cols[0][0], true); lab(ys2, Math.min, cols[1][0], false);
    if (ys3) { lab(ys3, Math.max, C.ink, true); lab(ys4, Math.min, C.ink, false); }
    s += T(12, H / 2, title + ' [' + unit + ']', { fs: 10, r: -90, c: C.axis });
    return svgWrap(W, H, s);
  };
  const cM = [[C.blue, C.blueF], [C.red, C.redF]], cV = [[C.green, C.greenF], [C.orange, 'rgba(212,115,12,.14)']];
  const lbl = isFat ? 'camión de fatiga' : 'LL+IM';
  out += `<div class="dt">Envolvente de momento flector por ${lbl}${gdf !== 1 ? ' × g = ' + f2(gdf, 3) : strip ? '' : ' (por carril)'}${strip ? ' por metro de ancho (÷ E⁺ = ' + f2(Ep) + ' m, ÷ E⁻ = ' + f2(En) + ' m)' : ''}${hasPerm ? '; en trazo discontinuo: Resistencia I (η = ' + f2(eta) + ')' : ''}</div>`;
  const cm = (a) => a.map(v => v * UD.fm), cf = (a) => a.map(v => v * UD.f);
  out += diag(cm(res.map(o => o.Mp)), cm(res.map(o => o.Mn)), hasPerm ? cm(res.map(o => o.Mup)) : null, hasPerm ? cm(res.map(o => o.Mun)) : null, 'M', UD.lM, cM);
  out += `<div class="dt">Envolvente de fuerza cortante por ${lbl}${hasPerm ? '; en trazo discontinuo: Resistencia I' : ''}</div>`;
  out += diag(cf(res.map(o => o.Vp)), cf(res.map(o => o.Vn)), hasPerm ? cf(res.map(o => o.Vup)) : null, hasPerm ? cf(res.map(o => o.Vun)) : null, 'V', UD.lF, cV);
  // ----- tabla en décimos de luz -----
  const rows = [];
  const tpts = Ls.length <= 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [0, 5, 10];
  for (let i = 0; i < Ls.length; i++) for (const t of tpts) {
    const x = X[i] + Ls[i] * t / 10, side = t === 10 ? 'L' : 'R';
    const o = res.find(q => Math.abs(q.x - x) < 1e-7 && q.side === side); if (o) rows.push({ o, lab: (Ls.length > 1 ? 'T' + (i + 1) + ' ' : '') + (t / 10).toFixed(1) + 'L' });
  }
  let tb = `<table class="tbl"><thead><tr><th>Sección</th><th>x [${UD.lL}]</th><th>M⁺ ${lbl} [${UD.lM}]</th><th>M⁻ ${lbl} [${UD.lM}]</th><th>V⁺ [${UD.lF}]</th><th>V⁻ [${UD.lF}]</th>${hasPerm ? `<th>M DC [${UD.lM}]</th><th>M DW [${UD.lM}]</th><th>Mu⁺ [${UD.lM}]</th><th>Mu⁻ [${UD.lM}]</th><th>|Vu| [${UD.lF}]</th>` : ''}</tr></thead><tbody>`;
  const m_ = (v) => f2(v * UD.fm), v_ = (v) => f2(v * UD.f);
  rows.forEach(({ o, lab }) => { tb += `<tr><td>${lab}</td><td>${f2(o.x * UD.fl)}</td><td>${m_(o.Mp)}</td><td>${m_(o.Mn)}</td><td>${v_(o.Vp)}</td><td>${v_(o.Vn)}</td>${hasPerm ? `<td>${m_(o.MDC)}</td><td>${m_(o.MDW)}</td><td>${m_(o.Mup)}</td><td>${m_(o.Mun)}</td><td>${v_(Math.max(Math.abs(o.Vup), Math.abs(o.Vun)))}</td>` : ''}</tr>`; });
  tb += '</tbody></table>';
  const kv = (n, v, u) => K(symTex(n + sfx) + '=' + valTex(conv(v, u)));
  let info = `<div class="kv">${kv('MLLp', cr.Mp, 'tonf*m')} ${kv('MLLn', res[iMin].Mn, 'tonf*m')} ${kv('VLL', VLL, 'tonf')} ${kv('xMLL', cr.x, 'm')} ${K('IM = ' + f2(IM, 2))} ${K('g = ' + f2(gdf, 3))}</div>`;
  if (hasPerm) info += `<div class="kv">${kv('Mup', Math.max(0, ...res.map(o => o.Mup)), 'tonf*m')} ${kv('Mun', Math.min(0, ...res.map(o => o.Mun)), 'tonf*m')} ${kv('Vu', Math.max(...res.map(o => Math.max(Math.abs(o.Vup), Math.abs(o.Vun)))), 'tonf')}</div>`;
  const note = `<div class="txt muted" style="font-size:12px">Líneas de influencia por el método de rigidez (${N} nudos). ${isFat ? 'Camión de fatiga con separación fija de 9.0 m, sin carga de carril (3.6.1.4.1).' : isCustom ? 'Ejes definidos por el usuario; se desprecian los ejes que no contribuyen al efecto extremo (3.6.1.3.1).' : 'Camión con separación posterior ' + (continuous ? 'variable 4.3–9.0 m' : '4.3 m') + ', tándem y carril de 0.952 t/m en las zonas que producen el extremo (3.6.1.3.1); ' + (continuous ? 'para momento negativo se incluye el 90 % de dos camiones separados ≥ 15 m más el 90 % del carril.' : 'IM no se aplica a la carga de carril (3.6.2.1).')}</div>`;
  void interiorSup; void pos;
  return `<div class="figure">${out}${info}${tb}${note}${caption(ctx, b.titulo || 'Envolventes por carga viva vehicular móvil (AASHTO LRFD)')}</div>`;
}

registerBlock('hl93env', {
  name: 'Envolvente HL-93 (carga móvil)', icon: 'bridge', group: 'Puentes',
  fields: [
    F('tramos', 'Luces de los tramos [m]', '20', 'text'), F('apoyos', 'Apoyos (A articulado, E empotrado, L libre)', 'A A'),
    F('vehiculo', 'Vehículo', 'HL-93', 'select', ['HL-93', 'Fatiga', 'Ejes']), F('ejes', 'Ejes propios "P x; P x" [t, m]', '7.26 0; 7.26 1.8'),
    F('IM', 'IM (incremento dinámico)', '0.33'), F('g', 'Factor de distribución g (× m si aplica)', '1'), F('carril', 'Carga de carril [t/m]', '0.952'),
    F('Epos', 'Ancho de franja E⁺ (losas) [m]', ''), F('Eneg', 'Ancho de franja E⁻ (losas) [m]', ''), F('xmin', 'Inicio del rango de circulación [m]', ''), F('xmax', 'Fin del rango de circulación [m]', ''),
    F('DC', 'Cargas DC (U * w | P x P | UP x1 x2 w)', '', 'area'), F('DW', 'Cargas DW', '', 'area'), F('eta', 'η (modificador de carga)', '1'), F('gLL', 'γ LL Resistencia I', '1.75'),
    F('secciones', 'Secciones de interés x [m] (exporta MLLx1, VLLx1…)', ''), F('sufijo', 'Sufijo de variables', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Envolvente de M y V por carga viva móvil sobre viga simple o continua (líneas de influencia). Exporta <code>MLLp</code>, <code>MLLn</code>, <code>VLL</code> (× g, con IM) y, si hay DC/DW, <code>Mup</code>, <code>Mun</code>, <code>Vu</code> (Resistencia I) y valores en las secciones de interés.',
  def: { tramos: '20', apoyos: 'A A', vehiculo: 'HL-93', IM: '0.33', g: '1' },
  render: renderHL93,
});

// =====================================================================
//  bridgesec — sección transversal del tablero
// =====================================================================
function renderSec(b, ctx) {
  const S = ctx.scope;
  const LU = settings.sys === 'us' ? { f: 3.2808399, u: 'ft' } : { f: 1, u: 'm' };
  const fl = (v) => f2(v * LU.f);
  const B = evalParam(b.B, S, 'm', 8.4), ts = evalParam(b.ts, S, 'm', 0.2);
  const nv = Math.round(evalParam(b.nv, S, '', 4)), Sg = evalParam(b.S, S, 'm', 2.1);
  const hv = evalParam(b.hv, S, 'm', 1.2), bw = evalParam(b.bw, S, 'm', 0.4);
  const bfl = evalParam(b.bf, S, 'm', 0.6), tf = evalParam(b.tf, S, 'm', 0.15);
  const ver = evalParam(b.vereda, S, 'm', 0), hver = evalParam(b.hvereda, S, 'm', 0.25);
  const bar = evalParam(b.barrera, S, 'm', 0.4), hbar = evalParam(b.hbarrera, S, 'm', 0.85);
  const tasf = evalParam(b.tasf, S, 'm', 0.05);
  const tipo = String(b.tipo || 'T').toLowerCase();
  pos({ B, ts, hv, bw }); if (nv < 1 || nv > 20) throw new Error('Número de vigas entre 1 y 20');
  const vol = tipo === 'losa' ? 0 : (B - (nv - 1) * Sg) / 2;
  if (tipo !== 'losa' && vol < bw / 2) throw new Error('Las vigas no caben en el ancho del tablero: (nv − 1)·S = ' + f2((nv - 1) * Sg) + ' m > B − bw');
  const wc = B - 2 * (bar + ver);
  if (!(wc > 0)) throw new Error('El ancho de calzada resulta no positivo');
  const NL = b.NL ? Math.round(evalParam(b.NL, S, '', 2)) : Math.max(1, Math.floor(wc / 3.6 + 1e-9));
  const hTot = ts + (tipo === 'losa' ? 0 : hv);
  const Wd = 720, pad = 50, padR = 70, sc = (Wd - pad - padR) / B;
  const topY = 150; const H = topY + hTot * sc + 80;
  const X = (x) => pad + x * sc, Y = (y) => topY + y * sc;                       // y hacia abajo desde la rasante de la losa
  let g = arrowDefs;
  const conc = `fill="${C.conc}" stroke="${C.ink}" stroke-width="1.2"`;
  // losa
  g += `<rect x="${X(0)}" y="${Y(0)}" width="${(B * sc).toFixed(1)}" height="${(ts * sc).toFixed(1)}" ${conc}/>`;
  // asfalto
  if (tasf > 0) g += `<rect x="${X(bar + ver)}" y="${Y(-tasf)}" width="${(wc * sc).toFixed(1)}" height="${Math.max(2, tasf * sc).toFixed(1)}" fill="#3d3d3d" stroke="none"/>`;
  // vigas
  const xg = []; for (let i = 0; i < nv; i++) xg.push(tipo === 'losa' ? 0 : vol + i * Sg);
  if (tipo !== 'losa') xg.forEach((x) => {
    if (tipo === 'i' || tipo === 'acero') {
      const ft = tipo === 'acero' ? Math.max(0.025, tf) : tf, tw = tipo === 'acero' ? Math.max(0.016, bw) : bw;
      const bt = tipo === 'acero' ? bfl * 0.85 : bfl * 0.7;
      const fill = tipo === 'acero' ? `fill="#7b8794" stroke="${C.steel}" stroke-width="1"` : conc;
      g += `<rect x="${X(x - bt / 2)}" y="${Y(ts)}" width="${(bt * sc).toFixed(1)}" height="${Math.max(2, ft * sc).toFixed(1)}" ${fill}/>`;
      g += `<rect x="${X(x - tw / 2)}" y="${Y(ts + ft)}" width="${Math.max(1.5, tw * sc).toFixed(1)}" height="${((hv - 2 * ft) * sc).toFixed(1)}" ${fill}/>`;
      g += `<rect x="${X(x - bfl / 2)}" y="${Y(ts + hv - ft)}" width="${(bfl * sc).toFixed(1)}" height="${Math.max(2, ft * sc).toFixed(1)}" ${fill}/>`;
    } else if (tipo === 'cajon') {
      const bb = Math.max(bfl, 2 * bw + 0.3);
      g += `<path d="M${X(x - bb / 2)},${Y(ts)} h${(bb * sc).toFixed(1)} v${(hv * sc).toFixed(1)} h${(-bb * sc).toFixed(1)} Z" ${conc}/>`;
      g += `<rect x="${X(x - bb / 2 + bw)}" y="${Y(ts + tf)}" width="${((bb - 2 * bw) * sc).toFixed(1)}" height="${((hv - 2 * tf) * sc).toFixed(1)}" fill="#fff" stroke="${C.ink}" stroke-width="1"/>`;
    } else {
      g += `<rect x="${X(x - bw / 2)}" y="${Y(ts) - 0.5}" width="${(bw * sc).toFixed(1)}" height="${(hv * sc + 0.5).toFixed(1)}" ${conc}/>`;
      g += Lne(X(x - bw / 2) + 0.6, Y(ts), X(x + bw / 2) - 0.6, Y(ts), C.conc, 1.6);
    }
    g += Lne(X(x), Y(-0.15), X(x), Y(hTot + 0.15), C.axis, 0.6, '6 3 1 3');
  });
  // veredas y barreras
  const barrier = (x0, dir) => {
    // x0: borde exterior; dir = +1 (lado izquierdo), −1 (derecho)
    const xa = x0, xb = x0 + dir * bar, yv = ver > 0 ? -hver : 0;
    if (ver > 0) g += `<path d="M${X(xb)},${Y(0)} V${Y(-hver)} H${X(xb + dir * ver)} V${Y(0)} Z" ${conc}/>`;
    if (String(b.tbarrera || 'NJ').toLowerCase().startsWith('b')) {
      // baranda metálica sobre sardinel / vereda
      g += `<rect x="${X(Math.min(xa, xb))}" y="${Y(yv - 0.25)}" width="${(bar * sc).toFixed(1)}" height="${(0.25 * sc).toFixed(1)}" ${conc}/>`;
      const xp = (xa + xb) / 2;
      g += `<rect x="${(X(xp) - 2.5).toFixed(1)}" y="${Y(yv - hbar)}" width="5" height="${((hbar - 0.25) * sc).toFixed(1)}" fill="${C.steel}"/>`;
      g += Lne(X(xp) - 9, Y(yv - hbar + 0.05), X(xp) + 9, Y(yv - hbar + 0.05), C.steel, 3) + Lne(X(xp) - 9, Y(yv - hbar * 0.6), X(xp) + 9, Y(yv - hbar * 0.6), C.steel, 3);
    } else {
      // perfil New Jersey simplificado
      const w = bar, h = hbar, p = (fx, fy) => `${X(xa + dir * fx * w).toFixed(1)},${Y(yv - fy * h).toFixed(1)}`;
      g += `<path d="M${p(0, 0)} L${p(1, 0)} L${p(0.93, 0.09)} L${p(0.62, 0.4)} L${p(0.6, 1)} L${p(0, 1)} Z" ${conc}/>`;
    }
  };
  barrier(0, 1); barrier(B, -1);
  // carriles y camiones
  const xc0 = bar + ver, lane = 3.6;
  const occ = Math.min(NL * lane, wc), off = xc0 + (wc - occ) / 2;
  for (let i = 0; i <= NL; i++) { const xx = off + Math.min(i * lane, occ); g += Lne(X(xx), Y(-tasf) - 2, X(xx), Y(-1.15), C.orange, 1, '5 4'); }
  for (let i = 0; i < NL; i++) {
    const xm = off + (i + 0.5) * Math.min(lane, occ / NL);
    const w1 = xm - 0.9, w2 = xm + 0.9, yT = Y(-tasf);
    g += `<rect x="${X(w1 - 0.35)}" y="${(yT - 62).toFixed(1)}" width="${((1.8 + 0.7) * sc).toFixed(1)}" height="30" rx="5" fill="${C.redF}" stroke="${C.red}"/>`;
    [w1, w2].forEach(w => { g += `<rect x="${(X(w) - 7).toFixed(1)}" y="${(yT - 30).toFixed(1)}" width="14" height="${(26).toFixed(1)}" rx="3" fill="#333"/>`; g += `<line x1="${X(w).toFixed(1)}" y1="${(yT - 100).toFixed(1)}" x2="${X(w).toFixed(1)}" y2="${(yT - 66).toFixed(1)}" stroke="${C.red}" stroke-width="1.8" marker-end="url(#arr)"/>`; });
    g += T(X(xm), yT - 104, settings.sys === 'si' ? 'P/2 = 71.2 kN' : settings.sys === 'us' ? 'P/2 = 16 kip' : 'P/2 = 7.26 t', { fs: 9, c: C.red });
    g += T(X(xm), yT - 44, 'Carril ' + (i + 1), { fs: 9, c: C.red, b: 1 });
    g += dimH(X(w1), X(w2), yT - 118, LU.u === 'ft' ? '6 ft' : '1.80');
  }
  // cotas
  g += dimH(X(0), X(B), Y(hTot) + 46, 'B = ' + fl(B) + ' ' + LU.u);
  g += dimH(X(xc0), X(B - xc0), 18, 'Calzada = ' + fl(wc) + ' ' + LU.u + ' (' + NL + ' carril' + (NL > 1 ? 'es' : '') + ' de diseño)');
  if (tipo !== 'losa') {
    const yd = Y(hTot) + 22;
    g += dimH(X(0), X(xg[0]), yd, fl(vol));
    for (let i = 0; i < nv - 1; i++) g += dimH(X(xg[i]), X(xg[i + 1]), yd, 'S = ' + fl(Sg));
    g += dimH(X(xg[nv - 1]), X(B), yd, fl(vol));
    g += dimV(X(0) - 14, Y(0), Y(hTot), 'h = ' + fl(hTot), C.ink, -1);
    g += T(X(xg[0] + bw / 2) + 4, Y(ts + hv / 2), 'bw = ' + fl(bw), { fs: 9, a: 'start', c: C.axis });
  }
  g += Lne(X(B) + 6, Y(0), X(B) + 16, Y(0), C.ink, 0.8) + Lne(X(B) + 6, Y(ts), X(B) + 16, Y(ts), C.ink, 0.8) + Lne(X(B) + 12, Y(0), X(B) + 12, Y(ts), C.ink, 0.8) + T(X(B) + 18, Y(ts / 2) + 4, 'ts = ' + fl(ts), { fs: 10, a: 'start' });
  if (tasf > 0) g += T(X(tipo === 'losa' || nv < 2 ? B / 2 : xg[0] + Sg / 2), Y(ts) + (tipo === 'losa' ? 14 : 14), 'asfalto e = ' + f2(tasf * 100, 1) + ' cm', { fs: 9, c: C.axis });
  const de = vol - bar - ver;
  const tipTxt = { t: 'vigas T de concreto armado', i: 'vigas I de concreto presforzado', cajon: 'vigas cajón', acero: 'vigas de acero compuestas', losa: 'losa maciza' }[tipo] || 'vigas';
  const info = `<div class="kv">${K('B = ' + fl(B) + '\\,\\mathrm{' + LU.u + '}')} ${K('w_{calzada} = ' + fl(wc) + '\\,\\mathrm{' + LU.u + '}')} ${K('N_L = ' + NL)} ${tipo !== 'losa' ? K('N_b = ' + nv) + ' ' + K('S = ' + fl(Sg) + '\\,\\mathrm{' + LU.u + '}') + ' ' + K('voladizo = ' + fl(vol) + '\\,\\mathrm{' + LU.u + '}') + ' ' + K('d_e = ' + fl(de) + '\\,\\mathrm{' + LU.u + '}') : ''}</div>`;
  return `<div class="figure">${svgWrap(Wd, H, g)}${info}${caption(ctx, b.titulo || 'Sección transversal del tablero (' + tipTxt + ')')}</div>`;
}

registerBlock('bridgesec', {
  name: 'Sección de puente', icon: 'bridge', group: 'Puentes',
  fields: [
    F('tipo', 'Tipo de superestructura', 'T', 'select', ['T', 'I', 'cajon', 'acero', 'losa']),
    F('B', 'Ancho total B [m]', '8.4'), F('ts', 'Espesor de losa ts [m]', '0.20'), F('nv', 'Número de vigas', '4'), F('S', 'Separación entre vigas S [m]', '2.10'),
    F('hv', 'Altura de viga bajo la losa [m]', '1.20'), F('bw', 'Ancho de alma bw [m]', '0.40'), F('bf', 'Ancho de ala inferior (I, cajón, acero) [m]', '0.60'), F('tf', 'Espesor de alas [m]', '0.15'),
    F('vereda', 'Ancho de vereda [m]', '0'), F('hvereda', 'Altura de vereda [m]', '0.25'), F('barrera', 'Ancho de barrera [m]', '0.40'), F('hbarrera', 'Altura de barrera [m]', '0.85'),
    F('tbarrera', 'Tipo de barrera', 'NJ', 'select', ['NJ', 'baranda']), F('tasf', 'Espesor de asfalto [m]', '0.05'), F('NL', 'Carriles de diseño (vacío = INT(w/3.6))', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja la sección transversal acotada con carriles de diseño de 3.60 m y camiones HL-93 (ruedas a 1.80 m).',
  def: { tipo: 'T', B: '8.4', ts: '0.20', nv: '4', S: '2.10', hv: '1.20', bw: '0.40', barrera: '0.40', hbarrera: '0.85', tasf: '0.05' },
  render: renderSec,
});

// =====================================================================
//  estribo — elevación del estribo en voladizo con empujes y cargas
// =====================================================================
function renderAbut(b, ctx) {
  const S = ctx.scope;
  const H = evalParam(b.H, S, 'm', 7), B = evalParam(b.B, S, 'm', 5), hz = evalParam(b.hz, S, 'm', 0.8);
  const p = evalParam(b.punta, S, 'm', 1.2), t2 = evalParam(b.t2, S, 'm', 0.9), t1 = evalParam(b.t1, S, 'm', 0.3);
  const hb = evalParam(b.hb, S, 'm', 1.5), Df = evalParam(b.Df, S, 'm', 1.5);
  const Ka = evalParam(b.Ka, S, '', 0.33), gs = evalParam(b.gs, S, 'tonf/m^3', 1.9), heq = evalParam(b.heq, S, 'm', 0.6);
  pos({ H, B, hz, t2, t1, hb }); if (p + t2 >= B) throw new Error('La punta más la pantalla exceden el ancho de la zapata');
  if (hz + hb >= H) throw new Error('El parapeto y la zapata exceden la altura del estribo');
  const W = 680, Hh = 440, sc = Math.min(340 / (H + 0.6), 360 / (B + 2.4)), ox = 90, oy = 40;
  const X = (x) => ox + x * sc, Y = (y) => oy + (H - y) * sc;
  const bc = t2 - t1, ys = H - hb;
  let g = arrowDefs;
  // relleno posterior y suelo delantero
  g += `<path d="M${X(p + t2)},${Y(hz)} L${X(p + t2)},${Y(H)} L${X(B + 0.8)},${Y(H)} L${X(B + 0.8)},${Y(0)} L${X(B)},${Y(0)} L${X(B)},${Y(hz)} Z" fill="url(#soilp)" opacity=".85"/>`;
  g += `<path d="M${X(-0.8)},${Y(0)} L${X(-0.8)},${Y(Df)} L${X(p)},${Y(Df)} L${X(p)},${Y(hz)} L${X(0)},${Y(hz)} L${X(0)},${Y(0)} Z" fill="url(#soilp)" opacity=".6"/>`;
  g += Lne(X(-0.8), Y(0), X(B + 0.8), Y(0), C.soil, 1.2, '6 3');
  // concreto
  g += `<path d="M${X(0)},${Y(0)} H${X(B)} V${Y(hz)} H${X(p + t2)} V${Y(H)} H${X(p + bc)} V${Y(ys)} H${X(p)} V${Y(hz)} H${X(0)} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.5"/>`;
  // viga del puente y apoyo
  const gx0 = X(p - 1.6), gx1 = X(p + bc - 0.05), hg = hb - 0.15 - 0.2;
  g += `<rect x="${(X(p + 0.12)).toFixed(1)}" y="${(Y(ys + 0.08)).toFixed(1)}" width="${(0.36 * sc).toFixed(1)}" height="${(0.08 * sc).toFixed(1)}" fill="#333"/>`;
  g += `<path d="M${gx0},${Y(ys + 0.08)} H${gx1} V${Y(ys + 0.08 + hg)} H${gx0}" fill="#dfe5ec" stroke="${C.ink}" stroke-width="1"/>`;
  g += `<path d="M${gx0},${Y(H - 0.2)} H${gx1} V${Y(H)} H${gx0}" fill="#dfe5ec" stroke="${C.ink}" stroke-width="1"/>`;
  g += T(X(p - 1.2), Y(ys + 0.08 + hg / 2) + 4, 'viga', { fs: 9, c: C.axis });
  // reacción y frenado
  const xr = X(p + bc / 2);
  g += `<line x1="${xr}" y1="${Y(ys) - 60}" x2="${xr}" y2="${Y(ys + 0.1) - 2}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + T(xr - 5, Y(ys) - 40, 'R (DC, DW, LL)', { fs: 9, c: C.red, a: 'end' });
  g += `<line x1="${X(p - 1.5)}" y1="${Y(H + 0.0) - 14}" x2="${X(p - 0.2)}" y2="${Y(H) - 14}" stroke="${C.red}" stroke-width="2" marker-end="url(#arr)"/>` + T(X(p - 1.5), Y(H) - 20, 'BR (1.80 m sobre rasante)', { fs: 9, c: C.red, a: 'start' });
  // empujes
  const pa = Ka * gs * H, ps = Ka * gs * heq, ph = 80 / Math.max(pa + ps, 1e-6), xb = X(B + 0.8) + 14;
  g += `<path d="M${xb},${Y(H)} L${xb + ps * ph},${Y(H)} L${xb + ps * ph},${Y(0)} L${xb},${Y(0)} Z" fill="rgba(212,115,12,.18)" stroke="${C.orange}"/>`;
  g += `<path d="M${xb + ps * ph},${Y(H)} L${xb + (ps + pa) * ph},${Y(0)} L${xb + ps * ph},${Y(0)} Z" fill="${C.redF}" stroke="${C.red}"/>`;
  for (let i = 1; i <= 6; i++) { const y = H * (1 - i / 6.5); const w = ps + Ka * gs * (H - y); g += Lne(xb + w * ph, Y(y), xb + 3, Y(y), C.red, 0.8).replace('/>', ' marker-end="url(#ar)"/>'); }
  g += T(xb + (ps + pa) * ph + 4, Y(0) - 4, 'EH: Ka·γ·H = ' + f2(pa) + ' t/m²', { fs: 9, a: 'start', c: C.red });
  g += T(xb + ps * ph + 4, Y(H) - 4, 'LS: Ka·γ·heq = ' + f2(ps) + ' t/m²', { fs: 9, a: 'start', c: C.orange });
  // cotas
  g += dimH(X(0), X(B), Y(0) + 22, 'B = ' + f2(B) + ' m') + dimH(X(0), X(p), Y(0) + 42, 'punta ' + f2(p)) + dimH(X(p), X(p + t2), Y(0) + 42, f2(t2)) + dimH(X(p + t2), X(B), Y(0) + 42, 'talón ' + f2(B - p - t2));
  g += dimV(X(-0.8) - 22, Y(H), Y(0), 'H = ' + f2(H) + ' m') + dimV(X(0) - 8, Y(hz), Y(0), f2(hz), C.ink, -1);
  g += dimV(X(p + t2) + 10, Y(H), Y(ys), 'hb ' + f2(hb), C.ink, 1);
  g += T(X(p + bc / 2), Y(ys) + 12, 'cajuela ' + f2(bc), { fs: 9, c: C.axis });
  g += T(X(p + t2 - t1 / 2), Y(H) - 4, 't1 = ' + f2(t1), { fs: 9 });
  return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Estribo en voladizo: geometría y empujes')}</div>`;
}
registerBlock('estribo', {
  name: 'Estribo (dibujo)', icon: 'wall', group: 'Puentes',
  fields: [F('H', 'Altura total H', '7 m'), F('B', 'Ancho de zapata B', '5 m'), F('hz', 'Espesor de zapata', '0.8 m'), F('punta', 'Punta', '1.4 m'),
    F('t2', 'Espesor de pantalla', '0.9 m'), F('t1', 'Espesor del parapeto', '0.3 m'), F('hb', 'Altura del parapeto', '1.6 m'), F('Df', 'Relleno delante', '1.5 m'),
    F('Ka', 'Ka', '0.333'), F('gs', 'γ relleno', '1.9 tonf/m^3'), F('heq', 'heq sobrecarga', '0.6 m'), F('titulo', 'Título', '')],
  hint: 'Elevación del estribo en voladizo con cajuela, parapeto, viga apoyada y diagramas de empuje EH y LS.',
  def: { H: '7 m', B: '5 m', hz: '0.8 m', punta: '1.4 m', t2: '0.9 m', t1: '0.3 m', hb: '1.6 m', Df: '1.5 m', Ka: '0.333', gs: '1.9 tonf/m^3', heq: '0.6 m' },
  render: renderAbut,
});
