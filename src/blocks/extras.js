// =====================================================================
//  Bloques gráficos — módulo «extras»
//   exEscalera : perfil de escalera de dos tramos (tramo inclinado + descanso)
//   exCapas    : corte de losa sobre terreno / pavimento rígido con capas y carga
//   exMaquina  : bloque de cimentación de máquina (elevación) y modos de vibración
//   exAcople   : viga de acoplamiento con refuerzo diagonal (elevación)
//   exDiafragma: planta de diafragma con muros, carga, cuerdas y colectores
//   exCable    : pase aéreo (cable parabólico, torres, fiadores y cámaras de anclaje)
//   exAnclado  : muro anclado (anclajes postensados, cuña activa, envolvente aparente)
//   exLetrero  : panel publicitario monoposte con viento y zapata
//   exFRP      : sección con FRP, deformaciones y fuerzas internas
//   exPMcirc   : diagrama de interacción φPn–φMn de sección circular (pilotes, columnas circulares)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, interp, BARS } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, pos, f2 } from '../blocks.js';
import { pmCircPts } from '../norms/extras.js';

const P = (b, S) => (k, u, dv) => evalParam(b[k], S, u, dv);
const arrow = (x1, y1, x2, y2, c = C.red, w = 1.8) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}" marker-end="url(#${c === C.red ? 'arr' : 'ar'})"/>`;
const poly = (pts, fill, stroke = C.ink, w = 1.2, extra = '') => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
const rect = (x, y, w, h, fill, stroke = C.ink, sw = 1.2, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const tri = (x, y) => poly([[x, y], [x - 7, y + 11], [x + 7, y + 11]], '#fff', C.ink, 1.1);

// ---------------------------------------------------------------------
registerBlock('exEscalera', {
  name: 'Escalera de dos tramos (perfil)', icon: 'slab', group: 'Concreto',
  fields: [F('L1', 'Proyección horizontal del tramo inclinado', 'L1'), F('L2', 'Longitud del descanso', 'L2'), F('p', 'Paso', 'p'), F('cp', 'Contrapaso', 'cp'), F('t', 'Garganta', 't'), F('wu1', 'Carga última del tramo', 'wu1'), F('wu2', 'Carga última del descanso', 'wu2'), F('acero', 'Texto del refuerzo', ''), F('titulo', 'Título', '')],
  hint: 'Perfil de la escalera apoyada en vigas: pasos, garganta, descanso, apoyos y cargas últimas por metro de ancho.',
  def: { L1: '3 m', L2: '1.2 m', p: '25 cm', cp: '17.5 cm', t: '15 cm' },
  render(b, ctx) {
    const g0 = P(b, ctx.scope);
    const L1 = g0('L1', 'm'), L2 = g0('L2', 'm'), p = g0('p', 'm'), cp = g0('cp', 'm'), t = g0('t', 'm');
    pos({ L1, L2, p, cp, t });
    const n = Math.max(1, Math.round(L1 / p)), H = n * cp;
    const W = 680, sc = Math.min(500 / (L1 + L2), 220 / (H + 0.4)), ox = 80, oy = 110 + H * sc;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    let g = arrowDefs;
    // escalones
    let d = `M${X(0)},${Y(0)}`;
    for (let i = 0; i < n; i++) { d += ` L${X(i * p)},${Y((i + 1) * cp)} L${X((i + 1) * p)},${Y((i + 1) * cp)}`; }
    const th = Math.atan(cp / p), tv = t / Math.cos(th);
    d += ` L${X(L1 + L2)},${Y(H)} L${X(L1 + L2)},${Y(H - t)} L${X(L1 + tv * 0)},${Y(H - t)} L${X(t * Math.tan(th / 2))},${Y(-t)} L${X(0)},${Y(-t)} Z`;
    g += `<path d="${d}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.3"/>`;
    // vigas de apoyo
    g += rect(X(0) - 14, Y(-t), 28, 0.45 * sc, '#d8dde3') + rect(X(L1 + L2) - 14, Y(H - t), 28, 0.45 * sc, '#d8dde3');
    g += tri(X(0), Y(-t) + 0.45 * sc) + tri(X(L1 + L2), Y(H - t) + 0.45 * sc);
    // refuerzo inferior
    const off = 0.03 * sc;
    g += Lne(X(0.15), Y(-t) - off, X(L1), Y(H - t) - off, C.blue, 2) + Lne(X(L1), Y(H - t) - off, X(L1 + L2 - 0.1), Y(H - t) - off, C.blue, 2);
    // cargas
    const wu1 = g0('wu1', 'tonf/m', 0), wu2 = g0('wu2', 'tonf/m', 0);
    const yq = Y(H) - 48, mx = Math.max(wu1, wu2, 1e-9);
    const h1 = 10 + 22 * wu1 / mx, h2 = 10 + 22 * wu2 / mx;
    g += rect(X(0), yq - h1, L1 * sc, h1, C.blueF, C.blue, 1) + rect(X(L1), yq - h2, L2 * sc, h2, C.redF, C.red, 1);
    for (let k = 0; k <= 8; k++) { const x = X(L1 * k / 8); g += arrow(x, yq - h1, x, yq - 1, C.ink, 0.8); }
    for (let k = 0; k <= 3; k++) { const x = X(L1 + L2 * k / 3); g += arrow(x, yq - h2, x, yq - 1, C.ink, 0.8); }
    g += T(X(L1 / 2), yq - h1 - 6, 'wu1 = ' + f2(wu1) + ' t/m', { fs: 10, c: C.blue, b: 1 }) + T(X(L1 + L2 / 2), yq - h2 - 6, 'wu2 = ' + f2(wu2) + ' t/m', { fs: 10, c: C.red, b: 1 });
    g += dimH(X(0), X(L1), oy + 0.45 * sc + 28, 'L1 = ' + f2(L1) + ' m') + dimH(X(L1), X(L1 + L2), oy + 0.45 * sc + 28, 'L2 = ' + f2(L2) + ' m');
    g += dimV(X(L1 + L2) + 40, Y(0), Y(H), 'H = ' + f2(H) + ' m', C.ink, 1);
    g += T(X(L1 * 0.62) + 14, Y(H * 0.62) + 26, 'garganta t = ' + f2(t * 100, 1) + ' cm', { fs: 10, a: 'start', r: -th * 180 / Math.PI });
    if (b.acero) g += T(X(0), oy + 0.45 * sc + 54, interp(b.acero, ctx.scope), { fs: 10, a: 'start', c: C.blue });
    const Hs = oy + 0.45 * sc + 44 + (b.acero ? 20 : 0);
    return `<div class="figure">${svgWrap(W, Hs, g)}${caption(ctx, b.titulo || 'Perfil de la escalera, cargas últimas y refuerzo inferior')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exCapas', {
  name: 'Losa sobre terreno / pavimento (corte)', icon: 'slab', group: 'Cimentaciones',
  fields: [F('h', 'Espesor de la losa', 'h'), F('capas', 'Capas: nombre; espesor (una por línea)', 'Sub-base granular; 20 cm'), F('carga', 'Texto de la carga', 'P'), F('junta', 'Espaciamiento de juntas', ''), F('titulo', 'Título', '')],
  hint: 'Corte de la losa de concreto sobre la sub-base y la subrasante, con la carga de rueda y las juntas.',
  def: { h: '20 cm', capas: 'Sub-base granular; 20 cm' },
  render(b, ctx) {
    const S = ctx.scope, h = evalParam(b.h, S, 'cm', 20); pos({ h });
    const capas = String(b.capas || '').split('\n').map(l => l.split(';')).filter(a => a.length >= 2).map(a => ({ n: a[0].trim(), e: evalParam(a[1].trim(), S, 'cm', 15) }));
    const W = 680, sc = Math.min(3.2, 170 / (h + capas.reduce((s, c) => s + c.e, 0) + 25)), x0 = 60, x1 = 560;
    let y = 70, g = arrowDefs;
    g += rect(x0, y, x1 - x0, h * sc, C.conc, C.ink, 1.4);
    const js = b.junta ? evalParam(b.junta, S, 'm', 0) : 0;
    if (js > 0) { [0.33, 0.66].forEach(f => { const x = x0 + (x1 - x0) * f; g += Lne(x, y, x, y + h * sc * 0.3, C.ink, 2.2) + Lne(x, y + h * sc * 0.3, x, y + h * sc, C.axis, 0.8, '3,3'); }); g += T(x0 + (x1 - x0) * 0.5, y + h * sc + 14, 'juntas de contracción @ ' + f2(js) + ' m (corte h/4 a h/3)', { fs: 9.5, c: C.axis }); }
    g += T(x1 + 10, y + h * sc / 2 + 4, 'h = ' + f2(h, 1) + ' cm', { fs: 10, a: 'start', b: 1 });
    g += arrow(x0 + 130, y - 46, x0 + 130, y - 4, C.red, 2.4) + T(x0 + 138, y - 30, interp(b.carga || '', S), { fs: 10.5, c: C.red, a: 'start', b: 1 });
    g += T(x0 + 8, y + h * sc / 2 + 4, 'Losa de concreto', { fs: 10, a: 'start' });
    y += h * sc;
    const fills = ['#efe3c8', '#e3d2ad', '#d9c49a'];
    capas.forEach((c, i) => { g += rect(x0, y, x1 - x0, c.e * sc, fills[i % 3], C.ink, 0.8); g += T(x0 + 8, y + c.e * sc / 2 + 4, c.n, { fs: 10, a: 'start' }); g += T(x1 + 10, y + c.e * sc / 2 + 4, f2(c.e, 0) + ' cm', { fs: 10, a: 'start' }); y += c.e * sc; });
    g += rect(x0, y, x1 - x0, 24, '#cdb68a', C.ink, 0.8) + T(x0 + 8, y + 16, 'Subrasante (módulo de reacción k)', { fs: 10, a: 'start' });
    return `<div class="figure">${svgWrap(W, y + 34, g)}${caption(ctx, b.titulo || 'Corte típico de la losa y su apoyo')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exMaquina', {
  name: 'Cimentación de máquina', icon: 'footing', group: 'Cimentaciones',
  fields: [F('B', 'Ancho del bloque', 'B'), F('L', 'Largo del bloque', 'L'), F('hb', 'Altura del bloque', 'hb'), F('Df', 'Empotramiento', 'Df'), F('hm', 'Altura del eje de la máquina sobre el bloque', 'hm'), F('titulo', 'Título', '')],
  hint: 'Corte transversal (perpendicular al eje de la máquina) del bloque de cimentación, la máquina, el eje de rotación y los modos vertical, horizontal y de cabeceo alrededor del eje longitudinal.',
  def: { B: '2.4 m', L: '4 m', hb: '1.5 m', Df: '1 m', hm: '0.8 m' },
  render(b, ctx) {
    const g0 = P(b, ctx.scope);
    const B = g0('B', 'm'), L = g0('L', 'm'), hb = g0('hb', 'm'), Df = g0('Df', 'm', 0), hm = g0('hm', 'm', 0.5);
    pos({ B, L, hb });
    const W = 680, sc = Math.min(360 / Math.max(B, 0.5), 200 / (hb + hm + 0.6)), ox = 110, ys = 60 + (hm + 0.5) * sc + (hb - Df) * sc;
    const X = (x) => ox + x * sc, Y = (z) => ys - z * sc; // z hacia arriba desde el terreno
    let g = arrowDefs;
    g += rect(X(-0.8), Y(0), (B + 1.6) * sc, (Df + 0.4) * sc + 20, 'url(#soilp)', 'none', 0);
    g += Lne(X(-0.8), Y(0), X(B + 0.8), Y(0), C.ink, 1.2);
    g += rect(X(0), Y(hb - Df), B * sc, hb * sc, C.conc, C.ink, 1.5);
    const mw = B * 0.55, mx = (B - mw) / 2, top = hb - Df;
    g += rect(X(mx), Y(top + hm + 0.25), mw * sc, (hm + 0.25) * sc, '#c7d3e0', C.ink, 1.2, ' rx="6"');
    g += `<circle cx="${X(B / 2).toFixed(1)}" cy="${Y(top + hm).toFixed(1)}" r="5" fill="#fff" stroke="${C.red}" stroke-width="1.4"/><circle cx="${X(B / 2).toFixed(1)}" cy="${Y(top + hm).toFixed(1)}" r="1.6" fill="${C.red}"/>` + T(X(mx + mw) + 6, Y(top + hm) + 4, 'eje (⊙)', { fs: 9.5, c: C.red, a: 'start' });
    g += T(X(B / 2), Y(top + hm / 2 + 0.1) + 4, 'Máquina', { fs: 10.5, b: 1 });
    // modos
    const cx = X(B / 2), cz = Y(top - hb / 2);
    g += arrow(cx, cz + 12, cx, cz - 26, C.blue, 1.6) + T(cx + 6, cz - 18, 'z', { fs: 10, c: C.blue, a: 'start', b: 1 });
    g += arrow(cx - 6, cz + 12, cx + 30, cz + 12, C.blue, 1.6) + T(cx + 34, cz + 16, 'x', { fs: 10, c: C.blue, a: 'start', b: 1 });
    g += `<path d="M${cx - 34},${cz + 4} A 34 22 0 0 1 ${cx - 10},${cz - 18}" fill="none" stroke="${C.green}" stroke-width="1.6" marker-end="url(#ar)"/>` + T(cx - 44, cz - 14, 'ψ', { fs: 11, c: C.green, b: 1 });
    g += dimH(X(0), X(B), Y(-Df) + 22, 'B = ' + f2(B) + ' m');
    g += dimV(X(0) - 26, Y(top), Y(-Df), 'hb = ' + f2(hb) + ' m') + dimV(X(B) + 26, Y(0), Y(-Df), 'Df = ' + f2(Df) + ' m', C.ink, 1);
    g += T(X(B) + 60, Y(top) + 4, 'L = ' + f2(L) + ' m (paralelo al eje)', { fs: 10, a: 'start' });
    return `<div class="figure">${svgWrap(W, Y(-Df) + 40, g)}${caption(ctx, b.titulo || 'Corte transversal del bloque de cimentación, máquina y grados de libertad considerados')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exAcople', {
  name: 'Viga de acoplamiento con diagonales', icon: 'beam', group: 'Concreto',
  fields: [F('ln', 'Luz libre', 'ln'), F('h', 'Peralte', 'h'), F('yd', 'Centroide del grupo diagonal a la cara', 'yd'), F('Lw', 'Longitud visible de los muros', '1.2 m'), F('diag', 'Texto de cada diagonal', ''), F('conf', 'Texto del confinamiento', ''), F('titulo', 'Título', '')],
  hint: 'Elevación de la viga de acoplamiento entre dos muros con dos grupos de barras diagonales que se cruzan al centro.',
  def: { ln: '1.5 m', h: '0.9 m', yd: '15 cm' },
  render(b, ctx) {
    const S = ctx.scope, g0 = P(b, S);
    const ln = g0('ln', 'm'), h = g0('h', 'm'), yd = g0('yd', 'm'), Lw = g0('Lw', 'm', 1.2);
    pos({ ln, h, yd });
    const W = 680, sc = Math.min(560 / (ln + 2 * Lw), 220 / (h * 2.2)), ox = (W - (ln + 2 * Lw) * sc) / 2, oy = 40;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    let g = arrowDefs;
    const Hw = h * 2.2, yb = (Hw - h) / 2;
    g += rect(X(0), Y(0), Lw * sc, Hw * sc, C.conc) + rect(X(Lw + ln), Y(0), Lw * sc, Hw * sc, C.conc);
    g += rect(X(Lw), Y(yb), ln * sc, h * sc, '#dfe4ea');
    const ext = Math.min(Lw * 0.8, 0.9);
    const a = Math.atan((h - 2 * yd) / ln);
    const dy = ext * Math.tan(a);
    // diagonales
    const d1 = [[Lw - ext, yb + yd - dy], [Lw + ln + ext, yb + h - yd + dy]], d2 = [[Lw - ext, yb + h - yd + dy], [Lw + ln + ext, yb + yd - dy]];
    [d1, d2].forEach(([p1, p2]) => {
      const nx = -Math.sin(Math.atan2(p2[1] - p1[1], p2[0] - p1[0])), ny = Math.cos(Math.atan2(p2[1] - p1[1], p2[0] - p1[0]));
      const o = 0.05;
      [-1, 1].forEach(s => { g += Lne(X(p1[0] + s * o * nx), Y(p1[1] + s * o * ny), X(p2[0] + s * o * nx), Y(p2[1] + s * o * ny), C.steel, 2.4); });
      for (let k = 1; k < 12; k++) { const f = 0.08 + 0.84 * k / 12; const px = p1[0] + (p2[0] - p1[0]) * f, py = p1[1] + (p2[1] - p1[1]) * f; if (px < Lw - 0.02 || px > Lw + ln + 0.02) continue; g += Lne(X(px - 1.6 * o * nx), Y(py - 1.6 * o * ny), X(px + 1.6 * o * nx), Y(py + 1.6 * o * ny), C.blue, 1.1); }
    });
    g += T(X(Lw + ln / 2), Y(yb + h) - 8, 'α = ' + f2(a * 180 / Math.PI, 1) + '°', { fs: 10, c: C.red, b: 1 });
    g += dimH(X(Lw), X(Lw + ln), Y(yb + h) + 26, 'ℓn = ' + f2(ln) + ' m') + dimV(X(2 * Lw + ln) + 16, Y(yb), Y(yb + h), 'h = ' + f2(h) + ' m', C.ink, 1);
    g += T(X(Lw / 2), Y(0) + 16, 'Muro', { fs: 10, c: C.axis }) + T(X(Lw * 1.5 + ln), Y(0) + 16, 'Muro', { fs: 10, c: C.axis });
    let yt = Y(Hw) + 18;
    if (b.diag) { g += T(X(0), yt, 'Diagonales: ' + interp(b.diag, S), { fs: 10, a: 'start', b: 1 }); yt += 16; }
    if (b.conf) { g += T(X(0), yt, 'Confinamiento: ' + interp(b.conf, S), { fs: 10, a: 'start', c: C.blue }); yt += 16; }
    return `<div class="figure">${svgWrap(W, yt + 6, g)}${caption(ctx, b.titulo || 'Viga de acoplamiento con refuerzo diagonal')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exDiafragma', {
  name: 'Diafragma en planta', icon: 'grid', group: 'Concreto',
  fields: [F('L', 'Longitud del diafragma (luz entre muros)', 'L'), F('B', 'Profundidad (ancho) del diafragma', 'B'), F('lw', 'Longitud de cada muro', 'lw'), F('w', 'Carga sísmica por unidad de longitud', 'w'), F('Tu', 'Fuerza en la cuerda', 'Tu'), F('Fc', 'Fuerza en el colector', 'Fc'), F('titulo', 'Título', '')],
  hint: 'Planta del diafragma apoyado en dos muros extremos, carga sísmica distribuida, cuerdas (tracción/compresión) y colectores.',
  def: { L: '24 m', B: '12 m', lw: '6 m' },
  render(b, ctx) {
    const g0 = P(b, ctx.scope);
    const L = g0('L', 'm'), B = g0('B', 'm'), lw = Math.min(g0('lw', 'm'), B);
    pos({ L, B, lw });
    const w = g0('w', 'tonf/m', 0), Tu = g0('Tu', 'tonf', 0), Fc = g0('Fc', 'tonf', 0);
    const W = 680, sc = Math.min(470 / L, 200 / B), ox = 110, oy = 70;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    let g = arrowDefs;
    g += rect(X(0), Y(0), L * sc, B * sc, '#eef1f5', C.ink, 1.2);
    const y0 = (B - lw) / 2;
    g += rect(X(0) - 5, Y(y0), 10, lw * sc, C.steel, C.steel) + rect(X(L) - 5, Y(y0), 10, lw * sc, C.steel, C.steel);
    if (lw < B - 1e-6) [0, L].forEach(x => { g += Lne(X(x), Y(0), X(x), Y(y0), C.orange, 3) + Lne(X(x), Y(y0 + lw), X(x), Y(B), C.orange, 3); });
    g += Lne(X(0), Y(0), X(L), Y(0), C.red, 3) + Lne(X(0), Y(B), X(L), Y(B), C.blue, 3);
    for (let k = 0; k <= 10; k++) { const x = X(L * k / 10); g += arrow(x, Y(0) - 34, x, Y(0) - 6, C.ink, 0.9); }
    g += Lne(X(0), Y(0) - 34, X(L), Y(0) - 34, C.ink, 0.9) + T(X(L / 2), Y(0) - 40, 'w = ' + f2(w) + ' t/m (sismo)', { fs: 10.5, b: 1 });
    g += T(X(L / 2), Y(0) + 15, 'Cuerda en tracción Tu = ' + f2(Tu) + ' t', { fs: 10, c: C.red });
    g += T(X(L / 2), Y(B) - 7, 'Cuerda en compresión Cu = ' + f2(Tu) + ' t', { fs: 10, c: C.blue });
    if (lw < B - 1e-6) g += T(X(L) + 12, Y(y0 / 2) + 4, 'colector', { fs: 10, c: C.orange, a: 'start', b: 1 }) + T(X(L) + 12, Y(y0 / 2) + 18, 'Fc = ' + f2(Fc) + ' t', { fs: 10, c: C.orange, a: 'start' });
    g += T(X(0) - 12, Y(B / 2) + 4, 'Muro', { fs: 10, a: 'end' }) + T(X(L) + 12, Y(B / 2) + 4, 'Muro', { fs: 10, a: 'start' });
    g += dimH(X(0), X(L), Y(B) + 24, 'L = ' + f2(L) + ' m') + dimV(X(0) - 54, Y(0), Y(B), 'B = ' + f2(B) + ' m');
    return `<div class="figure">${svgWrap(W, Y(B) + 40, g)}${caption(ctx, b.titulo || 'Diafragma como viga horizontal: cuerdas, colectores y muros')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exCable', {
  name: 'Pase aéreo / cable parabólico', icon: 'bridge', group: 'Puentes',
  fields: [F('L', 'Luz entre torres', 'L'), F('f', 'Flecha', 'f'), F('ht', 'Altura de las torres', 'ht'), F('Lf', 'Distancia horizontal torre–anclaje', 'Lf'), F('sp', 'Separación de péndolas', 'sp'), F('H', 'Tensión horizontal', 'H'), F('Tmax', 'Tensión máxima', 'Tmax'), F('titulo', 'Título', '')],
  hint: 'Elevación del pase aéreo: torres, cable principal parabólico, péndolas, fiadores y cámaras de anclaje.',
  def: { L: '40 m', f: '4 m', ht: '5 m', Lf: '8 m', sp: '2 m' },
  render(b, ctx) {
    const g0 = P(b, ctx.scope);
    const L = g0('L', 'm'), f = g0('f', 'm'), ht = g0('ht', 'm'), Lf = g0('Lf', 'm'), sp = g0('sp', 'm', 2);
    pos({ L, f, ht, Lf, sp });
    const Hh = g0('H', 'tonf', 0), Tm = g0('Tmax', 'tonf', 0);
    const W = 700, tot = L + 2 * Lf, sc = Math.min(620 / tot, 170 / (ht + 1.5)), ox = (W - tot * sc) / 2, yg = 50 + (ht + 0.6) * sc;
    const X = (x) => ox + (x + Lf) * sc, Y = (z) => yg - z * sc;
    const dv = Math.max(0.35 * ht, 2); // profundidad de la quebrada (esquemática)
    let g = arrowDefs;
    // terreno con quebrada
    const gp = [[-Lf - 1, 0], [0.08 * L, 0], [0.3 * L, -dv * 0.8], [0.5 * L, -dv], [0.7 * L, -dv * 0.8], [0.92 * L, 0], [L + Lf + 1, 0]];
    g += `<path d="M${gp.map(q => X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join(' L')} L${X(L + Lf + 1)},${Y(-dv) + 14} L${X(-Lf - 1)},${Y(-dv) + 14} Z" fill="#efe3c8" stroke="${C.soil}" stroke-width="1.4"/>`;
    g += `<path d="M${X(0.42 * L)},${Y(-dv * 0.97)} L${X(0.58 * L)},${Y(-dv * 0.97)}" stroke="${C.blue}" stroke-width="3"/>`;
    // torres
    [0, L].forEach(x => { g += rect(X(x) - 6, Y(ht), 12, ht * sc, C.conc, C.ink, 1.2) + rect(X(x) - 14, Y(0), 28, 10, '#d8dde3'); });
    // cable
    let d = '';
    for (let i = 0; i <= 60; i++) { const x = L * i / 60, z = ht - 4 * f * x * (L - x) / (L * L); d += (i ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(z).toFixed(1); }
    g += `<path d="${d}" fill="none" stroke="${C.steel}" stroke-width="2.2"/>`;
    // tubería y péndolas
    const zt = Math.max(ht - f - 0.6, 0.3);
    g += Lne(X(0), Y(zt), X(L), Y(zt), C.blue, 3);
    const np = Math.floor(L / sp + 1e-9);
    for (let k = 1; k < np; k++) { const x = k * sp; if (x >= L - 1e-6) break; const z = ht - 4 * f * x * (L - x) / (L * L); g += Lne(X(x), Y(z), X(x), Y(zt), C.axis, 0.8); }
    // fiadores y anclajes
    g += Lne(X(0), Y(ht), X(-Lf), Y(0.3), C.steel, 2) + Lne(X(L), Y(ht), X(L + Lf), Y(0.3), C.steel, 2);
    [-Lf, L + Lf].forEach(x => { g += rect(X(x) - 18, Y(0.3), 36, 0.9 * sc + 6, '#d8dde3', C.ink, 1.1); });
    g += T(X(-Lf) - 18, Y(0) + 0.9 * sc + 22, 'cámara de anclaje', { fs: 9.5, a: 'start' }) + T(X(L + Lf) + 18, Y(0) + 0.9 * sc + 22, 'cámara de anclaje', { fs: 9.5, a: 'end' });
    g += dimH(X(0), X(L), Y(ht) - 18, 'L = ' + f2(L) + ' m') + dimV(X(L / 2) + 14, Y(ht), Y(ht - f), 'f = ' + f2(f) + ' m', C.ink, 1);
    g += dimV(X(0) - 22, Y(0), Y(ht), 'ht = ' + f2(ht) + ' m');
    g += dimH(X(L), X(L + Lf), Y(ht) - 18, 'Lf = ' + f2(Lf) + ' m');
    g += T(X(0.22 * L), Y(zt) + 14, 'tubería', { fs: 9.5, c: C.blue });
    const yb = Math.max(Y(-dv) + 34, Y(0) + 0.9 * sc + 40);
    if (Hh) g += T(W / 2, yb, 'H = ' + f2(Hh) + ' t · Tmáx = ' + f2(Tm) + ' t · péndolas @ ' + f2(sp) + ' m', { fs: 10, b: 1 });
    return `<div class="figure">${svgWrap(W, yb + 10, g)}${caption(ctx, b.titulo || 'Pase aéreo: elevación general')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exAnclado', {
  name: 'Muro anclado', icon: 'wall', group: 'Muros',
  fields: [F('H', 'Altura de excavación', 'H'), F('H1', 'Profundidad del primer anclaje', 'H1'), F('n', 'Número de filas', 'n'), F('sv', 'Separación vertical', 'sv'), F('theta', 'Inclinación de los anclajes', 'theta'), F('phi', 'Ángulo de fricción', 'phi'), F('Lf', 'Longitud libre', 'Lf'), F('Lb', 'Longitud de bulbo', 'Lb'), F('p', 'Presión aparente máxima', 'p'), F('titulo', 'Título', '')],
  hint: 'Corte del muro anclado: filas de anclajes con longitud libre y bulbo, superficie de falla activa (45° + φ/2) y envolvente aparente de presiones.',
  def: { H: '9 m', H1: '1.5 m', n: '3', sv: '3 m', theta: '15 deg', phi: '35 deg', Lf: '6 m', Lb: '6 m' },
  render(b, ctx) {
    const g0 = P(b, ctx.scope);
    const H = g0('H', 'm'), H1 = g0('H1', 'm'), n = Math.max(1, Math.round(g0('n', null, 3))), sv = g0('sv', 'm', 0), th = g0('theta', 'rad', 0.26), phi = g0('phi', 'rad', 0.6);
    const Lf = g0('Lf', 'm'), Lb = g0('Lb', 'm'), p = g0('p', 'tonf/m^2', 0);
    pos({ H, H1, Lf, Lb });
    const reach = (Lf + Lb) * Math.cos(th) + 1;
    const W = 700, sc = Math.min(440 / reach, 260 / (H + 1)), ox = 200, oy = 40;
    const X = (x) => ox + x * sc, Y = (z) => oy + z * sc; // x hacia el terreno retenido, z hacia abajo
    let g = arrowDefs;
    g += rect(X(0), Y(0), reach * sc + 10, (H + 1) * sc, 'url(#soilp)', 'none', 0) + rect(X(-3.6), Y(H), 3.6 * sc, sc, 'url(#soilp)', 'none', 0);
    g += rect(X(0) - 8, Y(0), 8, (H + 0.6) * sc, C.conc, C.ink, 1.3);
    // superficie de falla
    const bet = Math.PI / 4 + phi / 2;
    g += Lne(X(0), Y(H), X(H / Math.tan(bet)), Y(0), C.red, 1.2, '6,4') + T(X(H / Math.tan(bet)) + 4, Y(0) + 14, '45° + φ/2', { fs: 9.5, c: C.red, a: 'start' });
    for (let i = 0; i < n; i++) {
      const z = H1 + i * sv; if (z >= H) break;
      const x2 = Lf * Math.cos(th), z2 = z + Lf * Math.sin(th), x3 = (Lf + Lb) * Math.cos(th), z3 = z + (Lf + Lb) * Math.sin(th);
      g += Lne(X(0), Y(z), X(x2), Y(z2), C.steel, 1.6);
      g += `<line x1="${X(x2).toFixed(1)}" y1="${Y(z2).toFixed(1)}" x2="${X(x3).toFixed(1)}" y2="${Y(z3).toFixed(1)}" stroke="#7d8590" stroke-width="7" stroke-linecap="round"/>`;
      g += rect(X(0) - 13, Y(z) - 5, 6, 10, C.steel, C.steel);
      g += T(X(0) - 18, Y(z) + 4, 'T' + (i + 1), { fs: 10, a: 'end', b: 1 });
    }
    const z0 = H1;
    g += T(X(Lf * Math.cos(th) / 2), Y(z0 + Lf * Math.sin(th) / 2) - 6, 'ℓlibre', { fs: 9.5, r: th * 180 / Math.PI });
    g += T(X((Lf + Lb / 2) * Math.cos(th)), Y(z0 + (Lf + Lb / 2) * Math.sin(th)) - 8, 'bulbo', { fs: 9.5, r: th * 180 / Math.PI });
    // envolvente aparente (a la izquierda)
    if (p > 0) {
      const pw = 70, xr = X(0) - 30;
      const pts = [[xr, Y(0)], [xr - pw, Y(2 / 3 * H1)], [xr - pw, Y(H - 2 / 3 * Math.max(H - H1 - (n - 1) * sv, 0))], [xr, Y(H)]];
      g += poly(pts, C.redF, C.red, 1);
      g += T(xr - pw / 2, Y(H / 2), 'p = ' + f2(p) + ' t/m²', { fs: 9.5, c: C.red, b: 1 });
    }
    g += dimV(X(-3.6) - 14, Y(0), Y(H), 'H = ' + f2(H) + ' m');
    return `<div class="figure">${svgWrap(W, Y(H + 1) + 8, g)}${caption(ctx, b.titulo || 'Muro anclado: anclajes, cuña activa y envolvente aparente de presiones (FHWA GEC-4)')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exLetrero', {
  name: 'Panel publicitario monoposte', icon: 'column', group: 'Acero',
  fields: [F('Bp', 'Ancho del panel', 'Bp'), F('Hp', 'Altura del panel', 'Hp'), F('hc', 'Altura libre bajo el panel', 'hc'), F('Bz', 'Lado de la zapata', 'Bz'), F('Df', 'Profundidad de desplante', 'Df'), F('F', 'Fuerza de viento en el panel', 'F'), F('tubo', 'Texto del poste', ''), F('titulo', 'Título', '')],
  hint: 'Elevación del panel publicitario sobre poste tubular empotrado en zapata, con la resultante del viento.',
  def: { Bp: '12 m', Hp: '4 m', hc: '8 m', Bz: '4 m', Df: '2 m' },
  render(b, ctx) {
    const S = ctx.scope, g0 = P(b, S);
    const Bp = g0('Bp', 'm'), Hp = g0('Hp', 'm'), hc = g0('hc', 'm'), Bz = g0('Bz', 'm'), Df = g0('Df', 'm'), Fw = g0('F', 'tonf', 0);
    pos({ Bp, Hp, hc, Bz, Df });
    const Ht = hc + Hp + Df, W = 680, sc = Math.min(280 / (Ht + 0.5), 420 / Math.max(Bp, Bz)), cx = 300, yg = 30 + (hc + Hp) * sc;
    const X = (x) => cx + x * sc, Y = (z) => yg - z * sc;
    let g = arrowDefs;
    g += rect(X(-Math.max(Bp, Bz) / 2 - 1), Y(0), (Math.max(Bp, Bz) + 2) * sc, Df * sc + 14, 'url(#soilp)', 'none', 0) + Lne(X(-Math.max(Bp, Bz) / 2 - 1), Y(0), X(Math.max(Bp, Bz) / 2 + 1), Y(0), C.ink, 1);
    g += rect(X(-Bz / 2), Y(-Df + 0.8), Bz * sc, 0.8 * sc, C.conc, C.ink, 1.3) + rect(X(-0.6), Y(0.15), 1.2 * sc, (Df - 0.8 + 0.15) * sc, C.conc, C.ink, 1.1);
    g += rect(X(-0.18), Y(hc + Hp * 0.5), 0.36 * sc, (hc + Hp * 0.5) * sc, '#9aa4ae', C.ink, 1.1);
    g += rect(X(-Bp / 2), Y(hc + Hp), Bp * sc, Hp * sc, '#f3f6fa', C.ink, 1.4);
    g += T(X(0), Y(hc + Hp / 2) + 4, 'Panel ' + f2(Bp) + ' × ' + f2(Hp) + ' m', { fs: 11, b: 1 });
    const zr = hc + Hp / 2;
    g += arrow(X(Bp / 2) + 70, Y(zr), X(Bp / 2) + 8, Y(zr), C.red, 2.4) + T(X(Bp / 2) + 12, Y(zr) - 8, 'F = ' + f2(Fw) + ' t', { fs: 10.5, c: C.red, a: 'start', b: 1 });
    g += dimV(X(-Bp / 2) - 18, Y(0), Y(hc), 'hc = ' + f2(hc) + ' m');
    g += dimV(X(Bz / 2) + 18, Y(0), Y(-Df), 'Df = ' + f2(Df) + ' m', C.ink, 1);
    g += dimH(X(-Bz / 2), X(Bz / 2), Y(-Df) + 20, 'B = ' + f2(Bz) + ' m');
    if (b.tubo) g += T(X(0.3), Y(hc * 0.45), interp(b.tubo, S), { fs: 10, a: 'start' });
    return `<div class="figure">${svgWrap(W, Y(-Df) + 34, g)}${caption(ctx, b.titulo || 'Panel publicitario monoposte: elevación y viento de diseño')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exFRP', {
  name: 'Sección con FRP: deformaciones y fuerzas', icon: 'section', group: 'Concreto',
  fields: [F('b', 'Ancho', 'b'), F('h', 'Peralte total', 'h'), F('d', 'Peralte efectivo', 'd'), F('c', 'Eje neutro', 'c'), F('ec', 'εc', 'ec'), F('es', 'εs', 'es'), F('efe', 'εfe', 'efe'), F('ebi', 'εbi', 'ebi'), F('frp', 'Texto del FRP', ''), F('titulo', 'Título', '')],
  hint: 'Sección rectangular con FRP en la cara traccionada, diagrama de deformaciones (incluida la deformación inicial εbi) y fuerzas internas.',
  def: { b: '30 cm', h: '60 cm', d: '54 cm', c: '13 cm' },
  render(b, ctx) {
    const S = ctx.scope, g0 = P(b, S);
    const B = g0('b', 'cm'), h = g0('h', 'cm'), d = g0('d', 'cm'), c = g0('c', 'cm');
    pos({ B, h, d, c });
    const ec = g0('ec', null, 0.003), es = g0('es', null, 0), efe = g0('efe', null, 0), ebi = g0('ebi', null, 0);
    const W = 680, sc = 230 / h, ox = 70, oy = 40, X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    let g = arrowDefs;
    g += rect(X(0), Y(0), B * sc, h * sc, C.conc, C.ink, 1.4);
    [0.2, 0.5, 0.8].forEach(f => { g += `<circle cx="${X(B * f).toFixed(1)}" cy="${Y(d).toFixed(1)}" r="5" fill="${C.steel}"/>`; });
    g += rect(X(0), Y(h), B * sc, 5, C.orange, C.orange, 1);
    g += Lne(X(0) - 8, Y(c), X(B) + 8, Y(c), C.axis, 0.8, '4,3') + T(X(0) - 10, Y(c) + 4, 'e.n.', { fs: 9, c: C.axis, a: 'end' });
    g += dimV(X(B) + 22, Y(0), Y(d), 'd = ' + f2(d, 1) + ' cm', C.ink, 1) + dimH(X(0), X(B), Y(h) + 24, 'b = ' + f2(B, 1) + ' cm');
    // deformaciones
    const x0 = 330, ws = 90, emax = Math.max(ec, efe + ebi, 1e-9), k = ws / emax;
    g += Lne(x0, Y(0), x0, Y(h), C.ink, 1);
    g += poly([[x0, Y(0)], [x0 - ec * k, Y(0)], [x0, Y(c)]], C.blueF, C.blue, 1) + poly([[x0, Y(c)], [x0 + (efe + ebi) * k, Y(h)], [x0, Y(h)]], C.redF, C.red, 1);
    g += T(x0 - ec * k - 4, Y(0) + 4, 'εc = ' + ec.toFixed(5), { fs: 9.5, a: 'end', c: C.blue });
    g += T(x0 + es * k + 6, Y(d) + 4, 'εs = ' + es.toFixed(5), { fs: 9.5, a: 'start' });
    g += T(x0 + (efe + ebi) * k + 6, Y(h) + 4, 'εfe + εbi = ' + (efe + ebi).toFixed(5), { fs: 9.5, a: 'start', c: C.red });
    g += T(x0, Y(0) - 10, 'Deformaciones', { fs: 10, b: 1 });
    // fuerzas
    const x1 = 560;
    g += Lne(x1, Y(0), x1, Y(h), C.ink, 1) + arrow(x1 - 50, Y(c * 0.4), x1 - 4, Y(c * 0.4), C.blue, 2) + T(x1 - 54, Y(c * 0.4) + 4, 'C', { fs: 10, a: 'end', c: C.blue, b: 1 });
    g += arrow(x1 + 4, Y(d), x1 + 50, Y(d), C.ink, 2) + T(x1 + 54, Y(d) + 4, 'As·fs', { fs: 10, a: 'start', b: 1 });
    g += arrow(x1 + 4, Y(h), x1 + 50, Y(h), C.red, 2) + T(x1 + 54, Y(h) + 4, 'Af·ffe', { fs: 10, a: 'start', c: C.red, b: 1 });
    g += T(x1, Y(0) - 10, 'Fuerzas', { fs: 10, b: 1 });
    let yt = Y(h) + 46;
    if (b.frp) { g += T(X(0), yt, 'FRP: ' + interp(b.frp, S), { fs: 10, a: 'start', c: C.orange, b: 1 }); yt += 14; }
    return `<div class="figure">${svgWrap(W, yt + 4, g)}${caption(ctx, b.titulo || 'Sección reforzada con FRP en estado último (ACI 440.2R-17)')}</div>`;
  },
});

// ---------------------------------------------------------------------
registerBlock('exPMcirc', {
  name: 'Diagrama P–M de sección circular', icon: 'pm', group: 'Concreto',
  fields: [F('D', 'Diámetro', 'D'), F('dc', 'Recubrimiento al centro de las barras', 'dc'), F('nb', 'Número de barras', 'nb'), F('barra', 'Barra (#)', 'bar'), F('fc', "f'c", 'fc'), F('fy', 'fy', 'fy'), F('demandas', 'Demandas: Pu, Mu // etiqueta (una por línea)', '', 'area'), F('titulo', 'Título', '')],
  hint: 'Diagrama de interacción φPn–φMn de una sección circular con barras en anillo y espiral (compatibilidad de deformaciones, E.060 10.2; φ = 0.75 → 0.90). Marca las demandas y verifica que queden dentro.',
  def: { D: '60 cm', dc: '9.4 cm', nb: '8', barra: '6', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2' },
  render(b, ctx) {
    const S = ctx.scope, g0 = P(b, S);
    const D = g0('D', 'cm'), dc = g0('dc', 'cm'), nb = Math.round(g0('nb', null, 8)), bar = Math.round(g0('barra', null, 6));
    const fc = g0('fc', 'kgf/cm^2', 210), fy = g0('fy', 'kgf/cm^2', 4200);
    pos({ D, dc, fc, fy }); if (nb < 6) throw new Error('Se requieren al menos 6 barras en sección circular (E.060 10.9.2)'); if (2 * dc >= D) throw new Error('Recubrimiento mayor que el radio');
    const A = (BARS[bar] || {}).A; if (!A) throw new Error('Barra no válida');
    const { pts, Pmax } = pmCircPts(D, dc, nb, A, fc, fy, true, 160);
    const cur = pts.map(p => ({ M: p.M / 1e5, P: p.P / 1e3 })); cur.push({ M: 0, P: Pmax / 1e3 });
    const dem = String(b.demandas || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [code, lab] = l.split('//'); const [pp, mm] = code.split(','); return { P: evalParam(pp.trim(), S, 'tonf'), M: Math.abs(evalParam(mm.trim(), S, 'tonf*m')), lab: (lab || '').trim() }; });
    const Mx = Math.max(...cur.map(p => p.M), ...dem.map(d => d.M)) * 1.1, Pn = Math.min(...cur.map(p => p.P)), Px = Math.max(Pmax / 1e3, ...dem.map(d => d.P)) * 1.08;
    const W = 560, H = 360, pl = 70, pr = 20, pt = 20, pb = 44;
    const X = (m) => pl + m / Mx * (W - pl - pr), Y = (p) => pt + (Px - p) / (Px - Pn) * (H - pt - pb);
    let g = '';
    niceTicks(0, Mx, 6).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 14, f2(t, 1), { fs: 9, c: C.axis }); });
    niceTicks(Pn, Px, 7).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 6, Y(t) + 3, f2(t, 0), { fs: 9, c: C.axis, a: 'end' }); });
    g += Lne(pl, Y(0), W - pr, Y(0), C.ink, 0.9);
    g += `<path d="${cur.map((p, i) => (i ? 'L' : 'M') + X(p.M).toFixed(1) + ',' + Y(p.P).toFixed(1)).join(' ')}" fill="${C.blueF}" stroke="${C.blue}" stroke-width="2"/>`;
    // verificación de demandas: interpolación de φMn para cada Pu
    const capAt = (Pu) => { if (Pu > Pmax / 1e3) return 0; for (let i = 1; i < cur.length; i++) { const a = cur[i - 1], c = cur[i]; if ((a.P - Pu) * (c.P - Pu) <= 0 && a.P !== c.P) return a.M + (c.M - a.M) * (Pu - a.P) / (c.P - a.P); } return 0; };
    dem.forEach((d, i) => {
      const cap = capAt(d.P), ok = d.M <= cap + 1e-9 && d.P <= Pmax / 1e3 && d.P >= Pn;
      g += `<circle cx="${X(d.M).toFixed(1)}" cy="${Y(d.P).toFixed(1)}" r="4.5" fill="${ok ? C.green : C.red}"/>` + T(X(d.M) + 7, Y(d.P) - 5 - 0 * i, d.lab || ('D' + (i + 1)), { fs: 9.5, a: 'start', c: ok ? C.green : C.red });
      ctx.checks.push({ ok, label: 'Flexocompresión ' + (d.lab || 'demanda ' + (i + 1)) + ' dentro del diagrama φPn–φMn (E.060 10.2)', ratio: cap > 0 ? d.M / cap : (ok ? 0 : 99), block: ctx.blockId });
    });
    g += `<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="none" stroke="${C.axis}"/>`;
    g += T((pl + W - pr) / 2, H - 8, 'φMn [tonf·m]', { fs: 11 }) + T(18, (pt + H - pb) / 2, 'φPn [tonf]', { fs: 11, r: -90 });
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Diagrama de interacción de la sección circular (D = ' + f2(D, 0) + ' cm, ' + nb + ' barras #' + bar + ')')}</div>`;
  },
});
