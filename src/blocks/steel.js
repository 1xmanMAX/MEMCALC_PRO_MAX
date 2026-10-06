// =====================================================================
//  Bloques gráficos — módulo «steel» (Acero estructural)
//   steelsec  : sección de perfil acotada + tabla de propiedades (base AISC/europea)
//   basepl    : placa base de columna con pernos de anclaje (AISC Design Guide 1)
//   boltgroup : grupo de pernos con carga excéntrica (método elástico)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, K, valTex, symTex, settings } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, caption, setVar, f2, pos } from '../blocks.js';
import { getShape, prop } from '../norms/steel.js';

const lenU = () => (settings.sys === 'us' ? 'in' : settings.sys === 'si' ? 'mm' : 'cm');
const forU = () => (settings.sys === 'us' ? 'kip' : settings.sys === 'si' ? 'kN' : 'tonf');
const momU = () => (settings.sys === 'us' ? 'kip*ft' : settings.sys === 'si' ? 'kN*m' : 'tonf*m');
const uTxt = (u) => u.replace('kip*ft', 'kip·ft').replace('kN*m', 'kN·m').replace('tonf*m', 't·m').replace('tonf', 't');
const fill = '#cfd6de', fillS = '#aeb8c4';

// nombre del perfil: literal ("W12X26") o variable de texto del documento
function shapeName(txt, S) {
  let n = String(txt || '').trim().replace(/^["']|["']$/g, '');
  if (!n) throw new Error('Indique el perfil, p. ej. W12X26, HSS6X6X3/8, IPE300');
  if (S.has(n) && typeof S.get(n) === 'string') n = S.get(n);
  return n;
}

// ---------------------------------------------------------------------
//  Geometría de perfiles (unidades nativas de la familia)
// ---------------------------------------------------------------------
function shapeSvg(s, X, Y, sc) {
  const p = s.p; let g = '';
  const st = `fill="${fill}" stroke="${C.ink}" stroke-width="1.3" stroke-linejoin="round"`;
  if (s.fam === 'I' || s.fam === 'E') {
    const d = p.d, bf = p.bf, tf = p.tf, tw = p.tw, r = Math.max(0, s.fam === 'E' ? p.r : p.kdes - tf);
    const xw = bf / 2 - tw / 2, xw2 = bf / 2 + tw / 2, rs = r * sc;
    g += `<path ${st} d="M${X(0)},${Y(0)} H${X(bf)} V${Y(tf)} H${X(xw2 + r)} A${rs},${rs} 0 0 0 ${X(xw2)},${Y(tf + r)} V${Y(d - tf - r)} A${rs},${rs} 0 0 0 ${X(xw2 + r)},${Y(d - tf)} H${X(bf)} V${Y(d)} H${X(0)} V${Y(d - tf)} H${X(xw - r)} A${rs},${rs} 0 0 0 ${X(xw)},${Y(d - tf - r)} V${Y(tf + r)} A${rs},${rs} 0 0 0 ${X(xw - r)},${Y(tf)} H${X(0)} Z"/>`;
    return { g, w: bf, h: d, cx: bf / 2, cy: d / 2 };
  }
  if (s.fam === 'C') {
    const d = p.d, bf = p.bf, tf = p.tf, tw = p.tw, r = Math.max(0, p.kdes - tf), rs = r * sc;
    g += `<path ${st} d="M${X(0)},${Y(0)} H${X(bf)} V${Y(tf)} H${X(tw + r)} A${rs},${rs} 0 0 0 ${X(tw)},${Y(tf + r)} V${Y(d - tf - r)} A${rs},${rs} 0 0 0 ${X(tw + r)},${Y(d - tf)} H${X(bf)} V${Y(d)} H${X(0)} Z"/>`;
    return { g, w: bf, h: d, cx: p.x, cy: d / 2 };
  }
  if (s.fam === 'L') {
    const d = p.d, b = p.b2, t = p.t, r = Math.max(0, p.kdes - t), rs = r * sc;
    g += `<path ${st} d="M${X(0)},${Y(0)} H${X(t)} V${Y(d - t - r)} A${rs},${rs} 0 0 0 ${X(t + r)},${Y(d - t)} H${X(b)} V${Y(d)} H${X(0)} Z"/>`;
    return { g, w: b, h: d, cx: p.x, cy: d - p.y };
  }
  if (s.fam === 'T') {
    const d = p.d, bf = p.bf, tf = p.tf, tw = p.tw, r = Math.max(0, p.kdes - tf), rs = r * sc, xw = bf / 2 - tw / 2, xw2 = bf / 2 + tw / 2;
    g += `<path ${st} d="M${X(0)},${Y(0)} H${X(bf)} V${Y(tf)} H${X(xw2 + r)} A${rs},${rs} 0 0 0 ${X(xw2)},${Y(tf + r)} V${Y(d)} H${X(xw)} V${Y(tf + r)} A${rs},${rs} 0 0 0 ${X(xw - r)},${Y(tf)} H${X(0)} Z"/>`;
    return { g, w: bf, h: d, cx: bf / 2, cy: p.y };
  }
  if (s.fam === 'D') {
    // dos ángulos con las alas verticales espalda con espalda y las salientes arriba (como una T)
    const d = p.d, b = p.b2, t = p.t, s2 = p.gap, W = 2 * b + s2;
    g += `<path ${st} d="M${X(0)},${Y(0)} H${X(b)} V${Y(d)} H${X(b - t)} V${Y(t)} H${X(0)} Z"/>`;
    g += `<path ${st} d="M${X(W)},${Y(0)} H${X(b + s2)} V${Y(d)} H${X(b + s2 + t)} V${Y(t)} H${X(W)} Z"/>`;
    return { g, w: W, h: d, cx: W / 2, cy: p.y };
  }
  if (s.fam === 'K') {
    const H = p.d, B = p.bf, D = p.D, t = p.t;
    let d = `M${X(B)},${Y(D)} V${Y(0)} H${X(0)} V${Y(H)} H${X(B)} V${Y(H - D)} H${X(B - t)} V${Y(H - t)} H${X(t)} V${Y(t)} H${X(B - t)} V${Y(D)} Z`;
    if (!(D > 0)) d = `M${X(B)},${Y(0)} H${X(0)} V${Y(H)} H${X(B)} V${Y(H - t)} H${X(t)} V${Y(t)} H${X(B)} Z`;
    g += `<path ${st} d="${d}"/>`;
    return { g, w: B, h: H, cx: p.x, cy: H / 2 };
  }
  if (s.fam === 'R') {
    const H = p.Ht, B = p.B, t = p.tdes, ro = 2 * t, ri = t;
    g += `<rect x="${X(0)}" y="${Y(0)}" width="${B * sc}" height="${H * sc}" rx="${ro * sc}" ${st}/>`;
    g += `<rect x="${X(t)}" y="${Y(t)}" width="${(B - 2 * t) * sc}" height="${(H - 2 * t) * sc}" rx="${ri * sc}" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/>`;
    return { g, w: B, h: H, cx: B / 2, cy: H / 2 };
  }
  const D = p.OD, t = p.tdes;
  g += `<circle cx="${X(D / 2)}" cy="${Y(D / 2)}" r="${D / 2 * sc}" ${st}/><circle cx="${X(D / 2)}" cy="${Y(D / 2)}" r="${(D / 2 - t) * sc}" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/>`;
  return { g, w: D, h: D, cx: D / 2, cy: D / 2 };
}

// propiedades exportadas por familia: [nombre en el documento, propiedad, etiqueta]
const EXP = {
  I: [['A', 'A', 'Área'], ['d', 'd', 'Peralte'], ['bf', 'bf', 'Ancho del ala'], ['tf', 'tf', 'Espesor del ala'], ['tw', 'tw', 'Espesor del alma'], ['h', 'h', 'Altura libre del alma h'], ['kdes', 'kdes', 'k de diseño'], ['ho', 'ho', 'Distancia entre centroides de alas'],
    ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'], ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y'], ['Zy', 'Zy', 'Módulo plástico y'], ['ry', 'ry', 'Radio de giro y'],
    ['J', 'J', 'Constante de torsión'], ['Cw', 'Cw', 'Constante de alabeo'], ['rts', 'rts', 'Radio de giro efectivo rts'], ['lambdaf', 'bf/2tf', 'Esbeltez del ala bf/2tf'], ['lambdaw', 'h/tw', 'Esbeltez del alma h/tw'], ['peso', 'W', 'Peso por unidad de longitud']],
  C: [['A', 'A', 'Área'], ['d', 'd', 'Peralte'], ['bf', 'bf', 'Ancho del ala'], ['tf', 'tf', 'Espesor medio del ala'], ['tw', 'tw', 'Espesor del alma'], ['h', 'h', 'Altura libre del alma h'], ['kdes', 'kdes', 'k de diseño'], ['ho', 'ho', 'Distancia entre centroides de alas'], ['xc', 'x', 'Centroide desde el dorso del alma'], ['eo', 'eo', 'Centro de corte desde el alma'],
    ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'], ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y'], ['Zy', 'Zy', 'Módulo plástico y'], ['ry', 'ry', 'Radio de giro y'],
    ['J', 'J', 'Constante de torsión'], ['Cw', 'Cw', 'Constante de alabeo'], ['rts', 'rts', 'Radio de giro efectivo rts'], ['ro', 'ro', 'Radio polar respecto al centro de corte'], ['lambdaf', 'b/t', 'Esbeltez del ala b/t'], ['lambdaw', 'h/tw', 'Esbeltez del alma h/tw'], ['peso', 'W', 'Peso por unidad de longitud']],
  L: [['A', 'A', 'Área'], ['d', 'd', 'Ala vertical d'], ['b', 'b2', 'Ala horizontal b'], ['t', 't', 'Espesor'], ['xc', 'x', 'Centroide x̄'], ['yc', 'y', 'Centroide ȳ'], ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'],
    ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y'], ['ry', 'ry', 'Radio de giro y'], ['rz', 'rz', 'Radio de giro mínimo (eje z)'], ['J', 'J', 'Constante de torsión'], ['ro', 'ro', 'Radio polar respecto al centro de corte'], ['lambdaf', 'b/t', 'Esbeltez b/t'], ['peso', 'W', 'Peso por unidad de longitud']],
  R: [['A', 'A', 'Área'], ['Ht', 'Ht', 'Altura total H'], ['B', 'B', 'Ancho total B'], ['t', 'tdes', 'Espesor de diseño (0.93 tnom)'], ['h', 'h', 'Lado plano del alma h'], ['b', 'b2', 'Lado plano del ala b'], ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'],
    ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y'], ['Zy', 'Zy', 'Módulo plástico y'], ['ry', 'ry', 'Radio de giro y'], ['J', 'J', 'Constante de torsión'], ['Ct', 'C', 'Constante torsional C'], ['lambdaf', 'b/tdes', 'Esbeltez b/t'], ['lambdaw', 'h/tdes', 'Esbeltez h/t'], ['peso', 'W', 'Peso por unidad de longitud']],
  O: [['A', 'A', 'Área'], ['D', 'OD', 'Diámetro exterior'], ['t', 'tdes', 'Espesor de diseño'], ['Ix', 'Ix', 'Inercia'], ['Sx', 'Sx', 'Módulo elástico'], ['Zx', 'Zx', 'Módulo plástico'], ['rx', 'rx', 'Radio de giro'], ['J', 'J', 'Constante de torsión'], ['Ct', 'C', 'Constante torsional C'], ['lambdaD', 'D/t', 'Esbeltez D/t'], ['peso', 'W', 'Peso por unidad de longitud']],
};
EXP.E = EXP.I.map(e => e);
EXP.T = [['A', 'A', 'Área'], ['d', 'd', 'Peralte d'], ['bf', 'bf', 'Ancho del ala'], ['tf', 'tf', 'Espesor del ala'], ['tw', 'tw', 'Espesor del alma'], ['yc', 'y', 'Centroide ȳ desde la cara del ala'], ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x (punta del alma)'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'],
  ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y'], ['Zy', 'Zy', 'Módulo plástico y'], ['ry', 'ry', 'Radio de giro y'], ['J', 'J', 'Constante de torsión'], ['Cw', 'Cw', 'Constante de alabeo'], ['ro', 'ro', 'Radio polar r̄o'], ['Hc', 'H3', 'Constante de flexión H'], ['lambdaf', 'bf/2tf', 'Esbeltez del ala bf/2tf'], ['lambdaw', 'd/tw', 'Esbeltez del alma d/tw'], ['peso', 'W', 'Peso por unidad de longitud']];
EXP.D = [['A', 'A', 'Área (2 ángulos)'], ['d', 'd', 'Ala vertical (espalda con espalda)'], ['b', 'b2', 'Ala saliente'], ['t', 't', 'Espesor'], ['yc', 'y', 'Centroide ȳ'], ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x (mín.)'], ['Zx', 'Zx', 'Módulo plástico x'], ['rx', 'rx', 'Radio de giro x'],
  ['Iy', 'Iy', 'Inercia eje y (con separación)'], ['Sy', 'Sy', 'Módulo elástico y'], ['Zy', 'Zy', 'Módulo plástico y'], ['ry', 'ry', 'Radio de giro y'], ['rz', 'rz', 'Radio mínimo de un ángulo (E6)'], ['J', 'J', 'Constante de torsión'], ['ro', 'ro', 'Radio polar r̄o'], ['Hc', 'H3', 'Constante de flexión H'], ['lambdaf', 'b/t', 'Esbeltez b/t (ala mayor)'], ['peso', 'W', 'Peso por unidad de longitud']];
EXP.K = [['A', 'A', 'Área'], ['d', 'd', 'Peralte H'], ['bf', 'bf', 'Ancho del ala B'], ['D', 'D', 'Altura del labio D'], ['t', 't', 'Espesor'], ['xc', 'x', 'Centroide desde el dorso del alma'], ['Ix', 'Ix', 'Inercia eje x'], ['Sx', 'Sx', 'Módulo elástico x'], ['rx', 'rx', 'Radio de giro x'],
  ['Iy', 'Iy', 'Inercia eje y'], ['Sy', 'Sy', 'Módulo elástico y (fibra del labio)'], ['ry', 'ry', 'Radio de giro y'], ['J', 'J', 'Constante de torsión'], ['lambdaw', 'h/t', 'Esbeltez del alma h/t'], ['lambdaf', 'b/t', 'Esbeltez del ala b/t'], ['peso', 'W', 'Peso por unidad de longitud']];
const NAMEF = { T: 'Perfil T (WT) cortado de un W — propiedades calculadas', D: 'Doble ángulo 2L espalda con espalda — propiedades calculadas', K: 'Canal atiesado conformado en frío (método lineal, esquinas rectas)', I: 'Perfil laminado I (W/HP/M/S) — AISC', C: 'Canal laminado C/MC — AISC', L: 'Ángulo laminado L — AISC', R: 'Tubo estructural HSS rectangular — AISC', O: 'Tubo circular HSS / Pipe — AISC', E: 'Perfil europeo (EN 10365 / ArcelorMittal)' };

registerBlock('steelsec', {
  name: 'Perfil de acero', icon: 'steel', group: 'Acero',
  fields: [F('perfil', 'Perfil (W12X26, HSS6X6X3/8, HSS6.625X0.280, C10X15.3, L4X4X1/2, WT6X13, 2L4X4X1/2, 2L6X4X3/8X3/4SLBB, IPE300, HEB200, CF150X50X15X2…) o variable de texto', 'W12X26'),
    F('sufijo', 'Sufijo de variables exportadas (A_c, Zx_c…; vacío = sin sufijo)', ''), F('tabla', 'Mostrar tabla de propiedades', '', 'check'), F('titulo', 'Título', '')],
  hint: 'Dibuja el perfil a escala con sus cotas, lee la base de datos (AISC Shapes Database y perfiles europeos) y exporta al documento A, d, bf, tf, tw, Ix, Sx, Zx, rx, Iy, Sy, Zy, ry, J, Cw, rts, ho, λf = bf/2tf, λw = h/tw, peso y la variable de texto <code>perfil</code>.',
  def: { perfil: 'W12X26', tabla: true },
  render(b, ctx) {
    const S = ctx.scope;
    const s = getShape(shapeName(b.perfil, S));
    const sfx = b.sufijo ? '_' + String(b.sufijo).replace(/\W/g, '') : '';
    setVar(ctx, 'perfil' + sfx, s.name);
    const rows = [];
    for (const [n, k, lab] of EXP[s.fam]) {
      let v; try { v = prop(s, k); } catch (e) { continue; }
      if (k === 'W' && settings.sys !== 'us') v = v.to('kgf/m'); else if (k === 'W') v = v.to('lbf/ft');
      setVar(ctx, n + sfx, v); rows.push([n + sfx, lab, v]);
    }
    // ---- dibujo ----
    const p = s.p, nat = s.fam === 'E' ? 'cm' : s.fam === 'K' ? 'mm' : 'in';
    const W = 400, H = 330;
    const dims = s.fam === 'D' ? [2 * p.b2 + p.gap, p.d] : s.fam === 'K' ? [p.bf, p.d] : s.fam === 'R' ? [p.B, p.Ht] : s.fam === 'O' ? [p.OD, p.OD] : s.fam === 'L' ? [p.b2, p.d] : [p.bf, p.d];
    const sc = Math.min(230 / dims[0], 240 / dims[1]);
    const ox = (W - dims[0] * sc) / 2 + 10, oy = (H - dims[1] * sc) / 2 + 5;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    const fl = (v) => { const u = math.unit(v, nat).toNumber(lenU()); return f2(u, lenU() === 'mm' ? 1 : lenU() === 'cm' ? 2 : 3) + ' ' + lenU(); };
    let g = arrowDefs;
    const sh = shapeSvg(s, X, Y, sc);
    // ejes principales
    g += Lne(X(sh.cx), Y(0) - 18, X(sh.cx), Y(sh.h) + 14, C.red, 0.8, '8 3 2 3') + Lne(X(0) - 14, Y(sh.cy), X(sh.w) + 18, Y(sh.cy), C.red, 0.8, '8 3 2 3');
    g += sh.g;
    g += Lne(X(sh.cx), Y(0) - 18, X(sh.cx), Y(sh.h) + 14, C.red, 0.8, '8 3 2 3') + Lne(X(0) - 14, Y(sh.cy), X(sh.w) + 18, Y(sh.cy), C.red, 0.8, '8 3 2 3');
    g += T(X(sh.w) + 24, Y(sh.cy) + 4, 'x', { c: C.red, fs: 11, b: 1 }) + T(X(sh.cx) + 2, Y(0) - 22, 'y', { c: C.red, fs: 11, b: 1 });
    g += dimV(X(0) - 26, Y(0), Y(sh.h), (s.fam === 'R' ? 'H = ' : s.fam === 'O' ? 'D = ' : 'd = ') + fl(sh.h));
    g += dimH(X(0), X(sh.w), Y(sh.h) + 26, (s.fam === 'R' ? 'B = ' : s.fam === 'O' ? 'D = ' : s.fam === 'L' ? 'b = ' : s.fam === 'D' ? '2b + s = ' : 'bf = ') + fl(sh.w));
    // línea de referencia con quiebre horizontal bajo el texto
    const lead = (x1, y1, x2, y2, txt, a = 'start') => {
      const w = txt.length * 5.6 + 4, ex = a === 'start' ? x2 : x2 - w;
      return Lne(x1, y1, ex, y2, C.axis, 0.8) + Lne(ex, y2, ex + w, y2, C.axis, 0.8) + `<circle cx="${x1}" cy="${y1}" r="1.8" fill="${C.ink}"/>` + T(ex + 2, y2 - 3, txt, { fs: 10, a: 'start' });
    };
    if (s.fam === 'T') {
      g += lead(X(p.bf * 0.85), Y(p.tf / 2), W - 6, Y(0) - 10, 'tf = ' + fl(p.tf), 'end');
      g += lead(X(p.bf / 2), Y(p.d * 0.7), W - 6, Y(p.d * 0.7) + 20, 'tw = ' + fl(p.tw), 'end');
      g += `<circle cx="${X(p.bf / 2)}" cy="${Y(p.y)}" r="3" fill="${C.red}"/>` + T(X(p.bf / 2) + 6, Y(p.y) - 6, 'ȳ = ' + fl(p.y), { fs: 10, a: 'start', c: C.red });
    } else if (s.fam === 'D') {
      g += lead(X(p.b2 * 0.3), Y(p.t / 2), X(0) - 4, Y(0) - 14, 't = ' + fl(p.t), 'start');
      g += T(X(p.b2 + p.gap + p.t) + 6, Y(p.d * 0.8), 's = ' + fl(p.gap), { fs: 10, a: 'start' });
      g += `<circle cx="${X(p.b2 + p.gap / 2)}" cy="${Y(p.y)}" r="3" fill="${C.red}"/>` + T(X(p.b2 + p.gap / 2) + 6, Y(p.y) + 12, 'ȳ = ' + fl(p.y), { fs: 10, a: 'start', c: C.red });
    } else if (s.fam === 'I' || s.fam === 'E' || s.fam === 'C') {
      const xw = s.fam === 'C' ? p.tw / 2 : p.bf / 2;
      g += lead(X(p.bf * 0.85), Y(p.tf / 2), W - 6, Y(0) - 10, 'tf = ' + fl(p.tf), 'end');
      g += lead(X(xw), Y(p.d * 0.62), W - 6, Y(p.d * 0.62) + 26, 'tw = ' + fl(p.tw), 'end');
      if (s.fam === 'C') g += `<circle cx="${X(p.x)}" cy="${Y(p.d / 2)}" r="3" fill="${C.red}"/>` + T(X(p.x) + 6, Y(p.d / 2) - 6, 'x̄ = ' + fl(p.x), { fs: 10, a: 'start', c: C.red });
    } else if (s.fam === 'K') {
      g += lead(X(p.t / 2), Y(p.d * 0.62), X(p.bf) + 30, Y(p.d * 0.62), 't = ' + fl(p.t));
      if (p.D > 0) g += dimV(X(p.bf) + 22, Y(p.d - p.D), Y(p.d), 'D = ' + fl(p.D), C.ink, 1);
      g += `<circle cx="${X(p.x)}" cy="${Y(p.d / 2)}" r="3" fill="${C.red}"/>` + T(X(p.x) + 6, Y(p.d / 2) - 6, 'x̄ = ' + fl(p.x), { fs: 10, a: 'start', c: C.red });
    } else if (s.fam === 'L') {
      g += lead(X(p.t / 2), Y(p.d * 0.3), X(p.t) + 30, Y(p.d * 0.3), 't = ' + fl(p.t));
      g += `<circle cx="${X(p.x)}" cy="${Y(p.d - p.y)}" r="3" fill="${C.red}"/>` + T(X(p.x) + 6, Y(p.d - p.y) - 6, 'x̄ = ' + fl(p.x) + ', ȳ = ' + fl(p.y), { fs: 10, a: 'start', c: C.red });
    } else {
      g += lead(X(p.tdes / 2), Y(sh.h * 0.3), W - 6, Y(0) - 8, 't = ' + fl(p.tdes) + (p.tnom ? ' (nom. ' + fl(p.tnom) + ')' : ''), 'end');
    }
    const pw = rows.find(r => r[0] === 'peso' + sfx)?.[2];
    const pwt = pw ? (settings.sys === 'us' ? f2(pw.toNumber('lbf/ft'), 1) + ' lb/ft' : f2(pw.toNumber('kgf/m'), 2) + ' kg/m') : '';
    const head = `<div class="dt" style="text-align:center"><b>${esc(s.name)}</b> — ${esc(NAMEF[s.fam])}${pwt ? ' · <span style="text-transform:none">' + pwt + '</span>' : ''}</div>`;
    let tb = '';
    if (b.tabla !== false) {
      const cells = rows.filter(r => r[0] !== 'peso' + sfx).map(r => `<td>${esc(r[1])}</td><td>${K(symTex(r[0]) + ' = ' + valTex(r[2], 3))}</td>`);
      tb = '<table class="tbl"><thead><tr><th>Propiedad</th><th>Valor</th><th>Propiedad</th><th>Valor</th></tr></thead><tbody>';
      for (let i = 0; i < cells.length; i += 2) tb += '<tr>' + cells[i] + (cells[i + 1] || '<td></td><td></td>') + '</tr>';
      tb += '</tbody></table>';
    }
    const src = s.fam === 'T' ? 'Propiedades calculadas a partir del ' + s.parent + ' (AISC Shapes Database): rectángulos + filetes; Iy, Zy, J = mitad del W; Cw = bf³tf³/144 + (d − tf/2)³tw³/36.' : s.fam === 'D' ? 'Propiedades calculadas a partir de dos ' + s.parent + ' (AISC Shapes Database) con separación s; r̄o y H respecto al centro de corte en la intersección de las alas salientes.' : s.fam === 'K' ? 'Propiedades calculadas por el método lineal con esquinas rectas (Manual AISI de diseño de perfiles conformados en frío); dimensiones exteriores H × B × D × t en mm.' : s.fam === 'E' ? 'Fuente: tablas ArcelorMittal / EN 10365 (It e Iw calculados con las fórmulas del fabricante).' : 'Fuente: AISC Shapes Database (Steel Construction Manual, Parte 1).';
    return `<div class="figure">${head}<div class="fig-sm">${svgWrap(W, H, g)}</div>${tb}<div class="txt muted" style="font-size:.85em">${src}</div>${caption(ctx, b.titulo || 'Sección ' + s.name)}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Placa base (AISC Design Guide 1)
// ---------------------------------------------------------------------
registerBlock('basepl', {
  name: 'Placa base', icon: 'steel', group: 'Acero',
  fields: [F('perfil', 'Perfil de la columna (o vacío y use d, bf)', 'W12X96'), F('d', 'Peralte de la columna d (si no hay perfil)', ''), F('bf', 'Ancho del ala bf (si no hay perfil)', ''),
    F('N', 'Longitud de la placa N (paralela a d)', '22 in'), F('B', 'Ancho de la placa B (paralelo a bf)', '22 in'), F('tp', 'Espesor de la placa tp', '1.5 in'),
    F('na', 'Número de pernos de anclaje', '4', 'select', [['4', '4'], ['6', '6'], ['8', '8']]), F('da', 'Diámetro de los pernos', '3/4 in'), F('ed', 'Distancia del perno al borde de la placa', '2 in'),
    F('N2', 'Pedestal: dimensión paralela a N (vacío = sin pedestal)', '24 in'), F('B2', 'Pedestal: dimensión paralela a B', '24 in'), F('hef', 'Empotramiento de los pernos hef', '12 in'), F('titulo', 'Título', '')],
  hint: 'Planta y elevación de la placa base con la columna, los pernos de anclaje y el pedestal. Exporta <code>m_pl</code> = (N − 0.95d)/2, <code>n_pl</code> = (B − 0.8bf)/2, <code>lambdanp</code> = √(d·bf)/4 y <code>A1</code> = B·N (DG1, Sección 3.1.2).',
  def: { perfil: 'W12X96', N: '22 in', B: '22 in', tp: '1.5 in', na: '4', da: '3/4 in', ed: '2 in', N2: '24 in', B2: '24 in', hef: '12 in' },
  render(b, ctx) {
    const S = ctx.scope, LU = 'm';
    let d, bf, tf = 0, tw = 0, nm = '';
    if (b.perfil && String(b.perfil).trim()) {
      const s = getShape(shapeName(b.perfil, S)); nm = s.name;
      if (!(s.fam === 'I' || s.fam === 'E' || s.fam === 'R' || s.fam === 'O')) throw new Error('Placa base: use un perfil I o un tubo HSS');
      const q = (k) => prop(s, k, 'm').toNumber();
      if (s.fam === 'R') { d = q('Ht'); bf = q('B'); tf = q('tdes'); tw = -1; }
      else if (s.fam === 'O') { d = bf = q('OD'); tf = q('tdes'); tw = -2; }
      else { d = q('d'); bf = q('bf'); tf = q('tf'); tw = q('tw'); }
    } else { d = evalParam(b.d, S, LU); bf = evalParam(b.bf, S, LU); tf = d / 20; tw = d / 30; }
    const N = evalParam(b.N, S, LU), B = evalParam(b.B, S, LU), tp = evalParam(b.tp, S, LU, 0.025), da = evalParam(b.da, S, LU, 0.019), ed = evalParam(b.ed, S, LU, 0.05);
    const N2 = evalParam(b.N2, S, LU, 0), B2 = evalParam(b.B2, S, LU, 0), hef = evalParam(b.hef, S, LU, 0.3);
    pos({ N, B, d, bf });
    if (N < d || B < bf) throw new Error('La placa debe ser mayor que la columna (N ≥ d, B ≥ bf)');
    if (N2 && (N2 < N || B2 < B)) throw new Error('El pedestal debe ser mayor o igual que la placa');
    const na = Math.round(evalParam(b.na, S, '', 4));
    if (![4, 6, 8].includes(na)) throw new Error('Número de pernos de anclaje: 4, 6 u 8');
    const mpl = (N - 0.95 * d) / 2, npl = (B - 0.8 * bf) / 2, lnp = Math.sqrt(d * bf) / 4;
    const L = (v) => math.unit(v, 'm').to(lenU());
    setVar(ctx, 'm_pl', L(mpl)); setVar(ctx, 'n_pl', L(npl)); setVar(ctx, 'lambdanp', L(lnp));
    setVar(ctx, 'A1', math.unit(B * N, 'm^2').to(lenU() + '^2'));
    if (N2) setVar(ctx, 'A2', math.unit(B2 * N2, 'm^2').to(lenU() + '^2'));
    const fl = (v) => f2(math.unit(v, 'm').toNumber(lenU()), lenU() === 'in' ? 2 : 1) + ' ' + lenU();
    // ---- planta ----
    const W = 760, H = 400, big = Math.max(N2 || N, B2 || B);
    const sc = 290 / big, cx = 190, cy = 200;
    const X = (x) => cx + x * sc, Y = (y) => cy - y * sc; // x según N, y según B
    let g = arrowDefs;
    if (N2) g += `<rect x="${X(-N2 / 2)}" y="${Y(B2 / 2)}" width="${N2 * sc}" height="${B2 * sc}" fill="${C.conc}" stroke="${C.axis}" stroke-dasharray="6 3"/>` + T(X(N2 / 2) - 4, Y(B2 / 2) + 12, 'Pedestal', { fs: 9, a: 'end', c: C.axis });
    g += `<rect x="${X(-N / 2)}" y="${Y(B / 2)}" width="${N * sc}" height="${B * sc}" fill="#e6eaef" stroke="${C.ink}" stroke-width="1.4"/>`;
    // columna (el peralte d según N)
    const colSt = `fill="${fillS}" stroke="${C.ink}" stroke-width="1.2"`;
    if (tw > 0) {
      g += `<path ${colSt} d="M${X(-d / 2)},${Y(bf / 2)} H${X(-d / 2 + tf)} V${Y(tw / 2)} H${X(d / 2 - tf)} V${Y(bf / 2)} H${X(d / 2)} V${Y(-bf / 2)} H${X(d / 2 - tf)} V${Y(-tw / 2)} H${X(-d / 2 + tf)} V${Y(-bf / 2)} H${X(-d / 2)} Z"/>`;
    } else if (tw === -1) g += `<rect x="${X(-d / 2)}" y="${Y(bf / 2)}" width="${d * sc}" height="${bf * sc}" ${colSt}/><rect x="${X(-d / 2 + tf)}" y="${Y(bf / 2 - tf)}" width="${(d - 2 * tf) * sc}" height="${(bf - 2 * tf) * sc}" fill="#e6eaef" stroke="${C.ink}"/>`;
    else g += `<circle cx="${X(0)}" cy="${Y(0)}" r="${d / 2 * sc}" ${colSt}/><circle cx="${X(0)}" cy="${Y(0)}" r="${(d / 2 - tf) * sc}" fill="#e6eaef" stroke="${C.ink}"/>`;
    // rectángulo 0.95d x 0.8bf (líneas críticas de flexión)
    g += `<rect x="${X(-0.95 * d / 2)}" y="${Y(0.8 * bf / 2)}" width="${0.95 * d * sc}" height="${0.8 * bf * sc}" fill="none" stroke="${C.red}" stroke-dasharray="4 3" stroke-width="0.9"/>`;
    // pernos
    const xs = [-N / 2 + ed, N / 2 - ed], ysA = na === 4 ? [-B / 2 + ed, B / 2 - ed] : na === 6 ? [-B / 2 + ed, 0, B / 2 - ed] : [-B / 2 + ed, -(B / 2 - ed) / 3, (B / 2 - ed) / 3, B / 2 - ed];
    const bolts = []; xs.forEach(x => ysA.forEach(y => bolts.push([x, y])));
    if (na === 6 || na === 8) { /* filas a lo largo de B */ }
    bolts.forEach(([x, y]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="${Math.max(3, da / 2 * sc * 1.6)}" fill="#fff" stroke="${C.ink}"/><circle cx="${X(x)}" cy="${Y(y)}" r="${Math.max(2, da / 2 * sc)}" fill="${C.steel}"/>`; });
    g += dimH(X(-N / 2), X(N / 2), Y(Math.max(B, B2 || 0) / 2) - 16, 'N = ' + fl(N));
    g += dimV(X(-Math.max(N, N2 || 0) / 2) - 16, Y(B / 2), Y(-B / 2), 'B = ' + fl(B));
    g += dimH(X(N / 2 - mpl), X(N / 2), Y(-B / 2) + 18, 'm = ' + fl(mpl), C.red);
    g += dimV(X(N / 2) + 16, Y(-B / 2), Y(-B / 2 + npl), 'n = ' + fl(npl), C.red, 1);
    g += dimH(X(-N / 2), X(-N / 2 + ed), Y(-B / 2) + 18, fl(ed), C.axis);
    g += T(cx, Y(-Math.max(B, B2 || 0) / 2) + 46, 'PLANTA' + (nm ? ' — columna ' + nm : ''), { fs: 11, b: 1 });
    // ---- elevación ----
    const ex0 = 560, ey0 = 250, hs = 210 / Math.max(N2 || N, 2 * hef);
    const EX = (x) => ex0 + x * hs, EY = (y) => ey0 - y * hs;
    const ped = N2 || N * 1.25, gr = Math.max(0.025, tp * 0.8);
    g += `<rect x="${EX(-ped / 2)}" y="${EY(-gr)}" width="${ped * hs}" height="${(hef * 1.3 + 0.05) * hs}" fill="${C.conc}" stroke="${C.axis}"/>`;
    g += `<rect x="${EX(-N / 2)}" y="${EY(0)}" width="${N * hs}" height="${gr * hs}" fill="#d9d2c3" stroke="${C.axis}" stroke-width="0.8"/>`;
    g += `<rect x="${EX(-N / 2)}" y="${EY(tp)}" width="${N * hs}" height="${tp * hs}" fill="#e6eaef" stroke="${C.ink}" stroke-width="1.3"/>`;
    const hc = 0.5 * 210 / hs / 1.1;
    g += `<rect x="${EX(-d / 2)}" y="${EY(tp + hc)}" width="${d * hs}" height="${hc * hs}" fill="${fillS}" stroke="${C.ink}" stroke-width="1.2"/>`;
    if (tw > 0) g += Lne(EX(-d / 2 + tf), EY(tp + hc), EX(-d / 2 + tf), EY(tp), C.ink, 0.8) + Lne(EX(d / 2 - tf), EY(tp + hc), EX(d / 2 - tf), EY(tp), C.ink, 0.8);
    g += `<path d="M${EX(-d / 2) - 5},${EY(tp)} l5,-5 v5 z M${EX(d / 2) + 5},${EY(tp)} l-5,-5 v5 z" fill="${C.ink}"/>`;
    xs.forEach(x => {
      g += `<rect x="${EX(x) - Math.max(1.5, da / 2 * hs)}" y="${EY(tp + 0.05)}" width="${Math.max(3, da * hs)}" height="${(tp + 0.05 + gr + hef) * hs}" fill="${C.steel}"/>`;
      g += `<rect x="${EX(x) - 6}" y="${EY(tp + 0.03)}" width="12" height="${Math.max(4, 0.03 * hs)}" fill="${C.ink}"/>`;
      g += `<rect x="${EX(x) - 7}" y="${EY(-gr - hef) - 2}" width="14" height="4" fill="${C.ink}"/>`;
    });
    g += dimV(EX(-ped / 2) - 12, EY(-gr), EY(-gr - hef), 'hef = ' + fl(hef));
    g += Lne(EX(N / 2), EY(tp / 2), EX(N / 2) + 26, EY(tp / 2) - 18, C.axis, 0.8) + T(EX(N / 2) + 28, EY(tp / 2) - 18, 'tp = ' + fl(tp), { fs: 10, a: 'start' });
    g += Lne(EX(N / 2) - 4, EY(-gr / 2), EX(N / 2) + 26, EY(-gr / 2) + 14, C.axis, 0.8) + T(EX(N / 2) + 28, EY(-gr / 2) + 18, 'grout', { fs: 10, a: 'start' });
    g += T(ex0, H - 14, 'ELEVACIÓN', { fs: 11, b: 1 });
    const info = `<div class="kv">${K('m = \\dfrac{N - 0.95d}{2} = ' + valTex(L(mpl)))} ${K('n = \\dfrac{B - 0.8b_f}{2} = ' + valTex(L(npl)))} ${K("\\lambda n' = \\dfrac{\\sqrt{d\\,b_f}}{4} = " + valTex(L(lnp)))} ${K('A_1 = B\\,N = ' + valTex(math.unit(B * N, 'm^2').to(lenU() + '^2')))} ${K('n_a = ' + na + '\\;\\varnothing\\,' + valTex(L(da)))}</div>`;
    return `<div class="figure">${svgWrap(W, H, g)}${info}${caption(ctx, b.titulo || 'Placa base de columna y pernos de anclaje')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Grupo de pernos con carga excéntrica — método elástico
// ---------------------------------------------------------------------
registerBlock('boltgroup', {
  name: 'Grupo de pernos', icon: 'steel', group: 'Acero',
  fields: [F('filas', 'Número de filas (vertical)', '4'), F('columnas', 'Número de columnas (horizontal)', '1'), F('sy', 'Paso vertical s', '3 in'), F('sx', 'Gramil horizontal g', '3 in'),
    F('pernos', 'O coordenadas x y de cada perno (una por línea; reemplaza la malla)', '', 'area'),
    F('P', 'Carga Pu', '20 kip'), F('ang', 'Ángulo de la carga respecto a la vertical (°)', '0'), F('ex', 'Excentricidad horizontal ex (línea de acción respecto al centroide)', '3 in'), F('ey', 'Excentricidad vertical ey', '0 in'),
    F('phiRn', 'Resistencia de diseño por perno φrn (vacío = sin verificación)', ''), F('db', 'Diámetro del perno (dibujo)', '3/4 in'), F('sufijo', 'Sufijo de variables exportadas', ''), F('titulo', 'Título', '')],
  hint: 'Distribución de fuerzas por el <b>método elástico</b> (AISC Manual, Parte 7): r = P/n + M·ρ/Ip con M = P·e respecto al centroide. Exporta <code>nb</code>, <code>Ip</code>, <code>Mo</code>, <code>Rmax</code> (perno crítico) y <code>Cel</code> = P/Rmax (coeficiente C elástico).',
  def: { filas: '4', columnas: '1', sy: '3 in', sx: '3 in', P: '20 kip', ang: '0', ex: '3 in', ey: '0 in', db: '3/4 in' },
  render(b, ctx) {
    const S = ctx.scope, LU = 'm', FU = 'N';
    let pts = [];
    const txt = String(b.pernos || '').trim();
    if (txt) {
      for (const ln of txt.split('\n')) { const s = ln.split('//')[0].trim(); if (!s) continue; const t = s.split(/[\s;,]+/); if (t.length < 2) throw new Error('Coordenadas de perno incompletas: ' + s); pts.push([evalParam(t[0], S, LU), evalParam(t.slice(1).join(' '), S, LU)]); }
    } else {
      const nr = Math.round(evalParam(b.filas, S, '', 3)), nc = Math.round(evalParam(b.columnas, S, '', 1));
      const sy = evalParam(b.sy, S, LU, 0.075), sx = evalParam(b.sx, S, LU, 0.075);
      if (nr < 1 || nc < 1 || nr * nc > 60) throw new Error('Número de pernos fuera de rango (1 a 60)');
      for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) pts.push([i * sx, -j * sy]);
    }
    const n = pts.length; if (n < 1) throw new Error('Defina al menos un perno');
    const xc = pts.reduce((a, p) => a + p[0], 0) / n, yc = pts.reduce((a, p) => a + p[1], 0) / n;
    pts = pts.map(p => [p[0] - xc, p[1] - yc]);
    const Pu = evalParam(b.P, S, FU), th = evalParam(b.ang, S, '', 0) * Math.PI / 180;
    const ex = evalParam(b.ex, S, LU, 0), ey = evalParam(b.ey, S, LU, 0);
    const Px = Pu * Math.sin(th), Py = -Pu * Math.cos(th); // hacia abajo
    const M = ex * Py - ey * Px; // momento respecto al centroide (antihorario +)
    const Ip = pts.reduce((a, p) => a + p[0] ** 2 + p[1] ** 2, 0);
    if (Math.abs(M) > 1e-12 && Ip < 1e-14) throw new Error('Un solo perno no resiste momento');
    const cl = (v) => (Math.abs(v) < 1e-9 * (Math.abs(Pu) + 1) ? 0 : v);
    const F = pts.map(([x, y]) => { const rx = cl(Px / n - (Ip ? M * y / Ip : 0)), ry = cl(Py / n + (Ip ? M * x / Ip : 0)); return { x: cl(x), y: cl(y), rx, ry, R: Math.hypot(rx, ry) }; });
    const Rmax = Math.max(...F.map(f => f.R)), crit = F.findIndex(f => f.R === Rmax);
    const sfx = b.sufijo ? '_' + String(b.sufijo).replace(/\W/g, '') : '';
    const Fu = (v) => math.unit(v, 'N').to(forU()), Lu = (v) => math.unit(v, 'm').to(lenU());
    setVar(ctx, 'nb' + sfx, n); setVar(ctx, 'Ip' + sfx, math.unit(Ip, 'm^2').to(lenU() + '^2'));
    setVar(ctx, 'Mo' + sfx, math.unit(Math.abs(M), 'N*m').to(momU())); setVar(ctx, 'Rmax' + sfx, Fu(Rmax)); setVar(ctx, 'Cel' + sfx, Pu / Rmax);
    let phiRn = null;
    if (b.phiRn && String(b.phiRn).trim()) {
      phiRn = evalParam(b.phiRn, S, FU);
      ctx.checks.push({ ok: Rmax <= phiRn, label: 'Grupo de pernos (método elástico): perno crítico ru ≤ φrn', ratio: Rmax / phiRn, block: ctx.blockId });
    }
    // ---- dibujo ----
    const W = 720;
    const xsA = F.map(f => f.x).concat([ex]), ysA = F.map(f => f.y).concat([ey]);
    const db = evalParam(b.db, S, LU, 0.019);
    const minx = Math.min(...xsA) - 2.5 * db, maxx = Math.max(...xsA) + 2.5 * db, miny = Math.min(...ysA) - 2.5 * db, maxy = Math.max(...ysA) + 2.5 * db;
    const sc = Math.min(290 / Math.max(maxx - minx, 1e-9), 260 / Math.max(maxy - miny, 1e-9));
    const H = Math.max(230, (maxy - miny) * sc + 150);
    const ox = 250 - (minx + maxx) / 2 * sc, oy = H / 2 + (miny + maxy) / 2 * sc;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    let g = arrowDefs;
    const bx = F.map(f => f.x), by = F.map(f => f.y), pad = 2 * db;
    const rx0 = X(Math.min(...bx) - pad), ry0 = Y(Math.max(...by) + pad), rw = (Math.max(...bx) - Math.min(...bx) + 2 * pad) * sc, rh = (Math.max(...by) - Math.min(...by) + 2 * pad) * sc;
    g += `<rect x="${rx0}" y="${ry0}" width="${rw}" height="${rh}" fill="#e6eaef" stroke="${C.ink}" stroke-width="1.2"/>`;
    g += Lne(X(0) - 10, Y(0), X(0) + 10, Y(0), C.red, 1) + Lne(X(0), Y(0) - 10, X(0), Y(0) + 10, C.red, 1) + T(X(0) + 5, Y(0) + 14, 'CG', { fs: 9, a: 'start', c: C.red });
    const fmax = Rmax || 1, La = 46;
    F.forEach((f, i) => {
      g += `<circle cx="${X(f.x)}" cy="${Y(f.y)}" r="${Math.max(4, db / 2 * sc)}" fill="${i === crit ? C.red : C.steel}"/>`;
      const lx = La * f.rx / fmax, ly = La * f.ry / fmax;
      if (Math.hypot(lx, ly) > 3) g += `<line x1="${X(f.x)}" y1="${Y(f.y)}" x2="${(X(f.x) + lx).toFixed(1)}" y2="${(Y(f.y) - ly).toFixed(1)}" stroke="${C.blue}" stroke-width="1.6" marker-end="url(#ar)"/>`;
      g += T(X(f.x) - 9, Y(f.y) - 7, String(i + 1), { fs: 9, a: 'end', c: C.axis });
    });
    // carga: la punta se ubica en el borde de la placa sobre la línea de acción
    const ux = Math.sin(th), uy = Math.cos(th), L0 = 70; // dirección en pantalla (y hacia abajo)
    let hx = X(ex), hy = Y(ey);
    const inside = (x, y) => x > rx0 - 1 && x < rx0 + rw + 1 && y > ry0 - 1 && y < ry0 + rh + 1;
    for (let k = 0; k < 2000 && inside(hx, hy); k++) { hx -= ux; hy -= uy; }
    hx -= 6 * ux; hy -= 6 * uy;
    g += `<line x1="${(hx - ux * L0).toFixed(1)}" y1="${(hy - uy * L0).toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${C.red}" stroke-width="2.4" marker-end="url(#arr)"/>`;
    g += Lne(hx, hy, X(ex), Y(ey), C.red, 0.8, '4 3');
    g += T(hx - ux * L0 + 6, hy - uy * L0 + (uy > 0.5 ? 10 : -4), 'Pu = ' + f2(Fu(Pu).toNumber(forU())) + ' ' + uTxt(forU()), { fs: 11, a: 'start', c: C.red, b: 1 });
    if (Math.abs(ex) > 1e-9) g += dimH(Math.min(X(0), X(ex)), Math.max(X(0), X(ex)), Y(Math.max(...by) + pad) - 14, 'e = ' + f2(Lu(Math.abs(ex)).toNumber(lenU())) + ' ' + lenU(), C.red);
    // tabla
    const cr = F[crit];
    let tb = `<table class="tbl"><thead><tr><th>Perno</th><th>x [${lenU()}]</th><th>y [${lenU()}]</th><th>rx [${uTxt(forU())}]</th><th>ry [${uTxt(forU())}]</th><th>r [${uTxt(forU())}]</th></tr></thead><tbody>`;
    F.forEach((f, i) => { tb += `<tr${i === crit ? ' style="font-weight:600;color:#d1242f"' : ''}><td>${i + 1}</td><td>${f2(Lu(f.x).toNumber(lenU()))}</td><td>${f2(Lu(f.y).toNumber(lenU()))}</td><td>${f2(Fu(f.rx).toNumber(forU()))}</td><td>${f2(Fu(f.ry).toNumber(forU()))}</td><td>${f2(Fu(f.R).toNumber(forU()))}</td></tr>`; });
    tb += '</tbody></table>';
    const leg = `<g font-family="Inter,Segoe UI,Arial">${T(470, 40, 'Método elástico', { a: 'start', b: 1 })}${T(470, 62, 'n = ' + n + ' pernos', { a: 'start' })}${T(470, 82, 'Ip = Σ(x² + y²) = ' + f2(math.unit(Ip, 'm^2').toNumber(lenU() + '^2')) + ' ' + lenU() + '²', { a: 'start' })}${T(470, 102, 'M = ' + f2(math.unit(Math.abs(M), 'N*m').toNumber(momU())) + ' ' + uTxt(momU()), { a: 'start' })}${T(470, 122, 'r máx = ' + f2(Fu(Rmax).toNumber(forU())) + ' ' + uTxt(forU()) + ' (perno ' + (crit + 1) + ')', { a: 'start', c: C.red, b: 1 })}${T(470, 142, 'C = Pu / r máx = ' + f2(Pu / Rmax, 3), { a: 'start' })}${phiRn !== null ? T(470, 162, 'φrn = ' + f2(Fu(phiRn).toNumber(forU())) + ' ' + uTxt(forU()) + (Rmax <= phiRn ? '  ✔ cumple' : '  ✘ no cumple'), { a: 'start', c: Rmax <= phiRn ? C.green : C.red, b: 1 }) : ''}</g>`;
    g += leg;
    const info = `<div class="kv">${K('r_{x,i} = \\dfrac{P_x}{n} - \\dfrac{M\\,y_i}{I_p}')} ${K('r_{y,i} = \\dfrac{P_y}{n} + \\dfrac{M\\,x_i}{I_p}')} ${K(symTex('Rmax' + sfx) + ' = ' + valTex(Fu(Rmax)))} ${K('C = ' + f2(Pu / Rmax, 3))}</div>`;
    void cr;
    return `<div class="figure">${svgWrap(W, H, g)}${info}${tb}${caption(ctx, b.titulo || 'Grupo de pernos con carga excéntrica (método elástico)')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Armadura de cuerdas paralelas (Pratt / Howe) — método de los nudos
// ---------------------------------------------------------------------
function solveLin(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('Armadura inestable o mal definida');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function trussPratt(L, h, np, w, tipo = 'pratt') {
  const a = L / np, nodes = [], mem = [];
  for (let i = 0; i <= np; i++) nodes.push({ x: i * a, y: 0, k: 'B' + i });
  for (let i = 0; i <= np; i++) nodes.push({ x: i * a, y: h, k: 'T' + i });
  const B = (i) => i, Tn = (i) => np + 1 + i;
  for (let i = 0; i < np; i++) { mem.push({ i: B(i), j: B(i + 1), t: 'ci' }); mem.push({ i: Tn(i), j: Tn(i + 1), t: 'cs' }); }
  for (let i = 0; i <= np; i++) mem.push({ i: Tn(i), j: B(i), t: 'v' });
  for (let i = 0; i < np; i++) {
    const left = i < np / 2; const pr = tipo !== 'howe';
    if (pr === left) mem.push({ i: Tn(i), j: B(i + 1), t: 'd' }); else mem.push({ i: B(i), j: Tn(i + 1), t: 'd' });
  }
  const nn = nodes.length, nu = mem.length + 3, A = Array.from({ length: 2 * nn }, () => new Array(nu).fill(0)), b = new Array(2 * nn).fill(0);
  mem.forEach((m, k) => { const p = nodes[m.i], q = nodes[m.j], l = Math.hypot(q.x - p.x, q.y - p.y), cx = (q.x - p.x) / l, cy = (q.y - p.y) / l; m.L = l;
    A[2 * m.i][k] += cx; A[2 * m.i + 1][k] += cy; A[2 * m.j][k] -= cx; A[2 * m.j + 1][k] -= cy; });
  const k0 = mem.length; A[0][k0] = 1; A[1][k0 + 1] = 1; A[2 * np + 1][k0 + 2] = 1; // apoyos B0 (x, y) y Bn (y)
  const P = w * a;
  for (let i = 0; i <= np; i++) b[2 * Tn(i) + 1] = (i === 0 || i === np ? P / 2 : P); // cargas hacia abajo: −P en el equilibrio → al lado derecho +P
  const x = solveLin(A, b);
  mem.forEach((m, k) => { m.N = x[k]; }); // N > 0 tracción
  return { nodes, mem, R: [x[k0 + 1], x[k0 + 2]], P, a };
}
registerBlock('armadura', {
  name: 'Armadura Pratt/Howe', icon: 'grid', group: 'Acero',
  fields: [F('L', 'Luz', '12 m'), F('h', 'Peralte entre ejes de cuerdas', '0.8 m'), F('np', 'Número de paneles (par)', '8'), F('w', 'Carga uniforme equivalente (aplicada en los nudos superiores)', '0.36 tonf/m'),
    F('tipo', 'Tipo', '', 'select', [['pratt', 'Pratt (diagonales en tracción)'], ['howe', 'Howe (diagonales en compresión)']]), F('sufijo', 'Sufijo de variables exportadas', ''), F('titulo', 'Título', '')],
  hint: 'Resuelve la armadura isostática de cuerdas paralelas por el <b>método de los nudos</b> (equilibrio ΣFx = ΣFy = 0 en cada nudo, sistema lineal completo) y dibuja las fuerzas axiales: rojo compresión, azul tracción. Exporta <code>Ncs</code> (compresión máx. en cuerda superior), <code>Nci</code> (tracción máx. en cuerda inferior), <code>Ndt</code>/<code>Ndc</code> (diagonales), <code>Nv</code> (montantes, compresión) y <code>Rtr</code> (reacción).',
  def: { L: '12 m', h: '0.8 m', np: '8', w: '0.36 tonf/m', tipo: 'pratt' },
  render(b, ctx) {
    const S = ctx.scope;
    const L = evalParam(b.L, S, 'm'), h = evalParam(b.h, S, 'm'), np = Math.round(evalParam(b.np, S, '', 8)), w = evalParam(b.w, S, 'N/m');
    pos({ L, h }); if (np < 2 || np > 40 || np % 2) throw new Error('Número de paneles: par, entre 2 y 40');
    const r = trussPratt(L, h, np, w, b.tipo || 'pratt');
    const sfx = b.sufijo ? '_' + String(b.sufijo).replace(/\W/g, '') : '';
    const Fu = (v) => math.unit(v, 'N').to(forU());
    const pick = (t, f) => r.mem.filter(m => m.t === t).reduce((a, m) => f(a, m.N), 0);
    const Ncs = -pick('cs', Math.min), Nci = pick('ci', Math.max), Ndt = pick('d', Math.max), Ndc = -pick('d', Math.min), Nv = -pick('v', Math.min);
    setVar(ctx, 'Ncs' + sfx, Fu(Ncs)); setVar(ctx, 'Nci' + sfx, Fu(Nci)); setVar(ctx, 'Ndt' + sfx, Fu(Ndt)); setVar(ctx, 'Ndc' + sfx, Fu(Ndc)); setVar(ctx, 'Nv' + sfx, Fu(Nv)); setVar(ctx, 'Rtr' + sfx, Fu(r.R[0]));
    // dibujo
    const W = 760, padX = 40, sc = (W - padX - 80) / L, hs = Math.min(sc, 150 / h), H = h * hs + 150;
    const X = (x) => padX + x * sc, Y = (y) => 80 + (h - y) * hs;
    const Nmax = Math.max(...r.mem.map(m => Math.abs(m.N)), 1e-9);
    let g = arrowDefs;
    r.mem.forEach(m => {
      const p = r.nodes[m.i], q = r.nodes[m.j], c = Math.abs(m.N) < 1e-6 * Nmax ? C.axis : m.N > 0 ? C.blue : C.red;
      g += Lne(X(p.x), Y(p.y), X(q.x), Y(q.y), c, 1 + 3 * Math.abs(m.N) / Nmax);
    });
    r.nodes.forEach(n => { g += `<circle cx="${X(n.x)}" cy="${Y(n.y)}" r="2.6" fill="#fff" stroke="${C.ink}"/>`; });
    const fs = np > 12 ? 7.5 : 9;
    // rótulos sin solaparse: se prueba la posición a lo largo de la barra (centro, 35 %, 65 %…)
    const boxes = [];
    const hit = (b) => boxes.some(o => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
    const ord = { cs: 0, ci: 1, v: 2, d: 3 };
    [...r.mem].sort((a, b) => (ord[a.t] ?? 3) - (ord[b.t] ?? 3)).forEach(m => {
      const p = r.nodes[m.i], q = r.nodes[m.j];
      const dy = m.t === 'cs' ? -6 : m.t === 'ci' ? 13 : 3, dx = m.t === 'v' ? 3 : 0;
      const val = Fu(m.N).toNumber(forU()), txt = f2(val), wTxt = txt.length * fs * 0.58;
      let best = null;
      for (const t of [0.5, 0.36, 0.64, 0.26, 0.74]) {
        const x = X(p.x) + (X(q.x) - X(p.x)) * t + dx, y = Y(p.y) + (Y(q.y) - Y(p.y)) * t + dy;
        const x1 = m.t === 'v' ? x : x - wTxt / 2, b = { x1, x2: x1 + wTxt, y1: y - fs, y2: y + 2 };
        if (!best) best = { x, y, b };
        if (!hit(b)) { best = { x, y, b }; break; }
      }
      boxes.push(best.b);
      g += `<text x="${best.x.toFixed(1)}" y="${best.y.toFixed(1)}" font-size="${fs}" fill="${m.N >= 0 ? C.blue : C.red}" text-anchor="${m.t === 'v' ? 'start' : 'middle'}" font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(txt)}</text>`;
    });
    for (let i = 0; i <= np; i++) { const x = X(i * r.a); g += `<line x1="${x}" y1="${Y(h) - 40}" x2="${x}" y2="${Y(h) - 6}" stroke="${C.ink}" stroke-width="1.2" marker-end="url(#ar)"/>`; }
    g += T(X(0) + 4, Y(h) - 46, 'P = ' + f2(Fu(r.P).toNumber(forU())) + ' ' + uTxt(forU()) + ' (P/2 en los extremos)', { a: 'start', fs: 10 });
    const sup = (x, roll) => `<path d="M${x},${Y(0) + 3} l-8,13 h16 z" fill="#fff" stroke="${C.ink}"/>` + (roll ? `<circle cx="${x - 4}" cy="${Y(0) + 20}" r="2.5" fill="none" stroke="${C.ink}"/><circle cx="${x + 4}" cy="${Y(0) + 20}" r="2.5" fill="none" stroke="${C.ink}"/>` : Lne(x - 10, Y(0) + 17, x + 10, Y(0) + 17));
    g += sup(X(0), false) + sup(X(L), true);
    g += dimH(X(0), X(L), Y(0) + 42, 'L = ' + f2(L) + ' m · ' + np + ' paneles de ' + f2(r.a) + ' m') + dimV(X(L) + 44, Y(h), Y(0), 'h = ' + f2(h) + ' m', C.ink, 1);
    g += `<g>${Lne(W - 250, 18, W - 226, 18, C.blue, 3)}${T(W - 222, 22, 'Tracción (+)', { a: 'start', fs: 10 })}${Lne(W - 140, 18, W - 116, 18, C.red, 3)}${T(W - 112, 22, 'Compresión (−)', { a: 'start', fs: 10 })}</g>`;
    const info = `<div class="kv">${K(symTex('Ncs' + sfx) + ' = ' + valTex(Fu(Ncs)))} ${K(symTex('Nci' + sfx) + ' = ' + valTex(Fu(Nci)))} ${K(symTex('Ndt' + sfx) + ' = ' + valTex(Fu(Ndt)))} ${K(symTex('Nv' + sfx) + ' = ' + valTex(Fu(Nv)))} ${K('R = ' + valTex(Fu(r.R[0])))}</div>`;
    return `<div class="figure">${svgWrap(W, H, g)}${info}${caption(ctx, b.titulo || 'Fuerzas axiales en la armadura (método de los nudos) [' + uTxt(forU()) + ']')}</div>`;
  },
});
