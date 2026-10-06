// =====================================================================
//  Bloques gráficos — módulo «masonry»
//   wallplan   : planta de muros de albañilería (densidad E.070, CM/CR, torsión, reparto)
//   tanque     : modelo de Housner (masas impulsiva/convectiva) y presiones hidrodinámicas
//   cilindro   : pared de tanque circular — tensión anular y momento vertical (PCA/cáscara)
//   tankwall   : pared de tanque rectangular — placa por diferencias finitas (PCA rect.)
//   tijeral    : armadura (tijeral) de madera — método de rigidez para barras articuladas
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, math, esc, fixedUnits } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, pos, f2 } from '../blocks.js';
import { aci, shellPCA, tankWall } from '../norms/masonry.js';

const U = (v, u) => { const x = math.unit(v, u); fixedUnits.set(x, u); return x; };
const vec = (a, u) => math.matrix(u ? a.map(v => U(v, u)) : a);
const rect = (x, y, w, h, fill, stroke = C.ink, sw = 1, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0.5, w).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const poly = (pts, fill, stroke = C.ink, sw = 1, extra = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const path = (pts, stroke, sw = 1.5, dash = '', fill = 'none') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const circ = (x, y, r, fill, stroke = C.ink, sw = 1) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const arrow = (x1, y1, x2, y2, c = C.ink, w = 1.2) => Lne(x1, y1, x2, y2, c, w).replace('/>', ` marker-end="url(#${c === C.red ? 'arr' : 'ar'})"/>`);
const water = 'rgba(31,111,235,.13)';

// =====================================================================
//  1) PLANTA DE MUROS DE ALBAÑILERÍA (NTE E.070 Art. 19.2.b, 24.6 y E.030)
// =====================================================================
function parseWalls(text, S) {
  const out = [];
  String(text || '').split('\n').forEach((raw, k) => {
    const line = raw.split('//')[0].trim(); if (!line) return;
    const tk = line.split(/\s+/);
    if (tk.length < 6) throw new Error(`Muro (línea ${k + 1}): use «id dir x y L t [Pg=… Pm=… n=…]»`);
    const dir = tk[1].toUpperCase(); if (dir !== 'X' && dir !== 'Y') throw new Error(`Muro ${tk[0]}: la dirección debe ser X o Y`);
    const ev = (s, u) => evalParam(s, S, u);
    const w = { id: tk[0], dir, x: ev(tk[2], 'm'), y: ev(tk[3], 'm'), L: ev(tk[4], 'm'), t: ev(tk[5], 'm'), n: 1, Pg: null, Pm: null };
    for (const kv of tk.slice(6)) {
      const m = /^(\w+)=(.+)$/.exec(kv); if (!m) throw new Error(`Muro ${w.id}: parámetro «${kv}» no reconocido (use clave=valor)`);
      const key = m[1].toLowerCase();
      if (key === 'pg') w.Pg = ev(m[2], 'tonf'); else if (key === 'pm') w.Pm = ev(m[2], 'tonf'); else if (key === 'n') w.n = ev(m[2], '');
      else throw new Error(`Muro ${w.id}: clave «${m[1]}» (use Pg, Pm o n)`);
    }
    if (!(w.L > 0) || !(w.t > 0) || !(w.n > 0)) throw new Error(`Muro ${w.id}: L, t y n deben ser positivos`);
    out.push(w);
  });
  if (!out.length) throw new Error('Ingrese al menos un muro');
  return out;
}

registerBlock('wallplan', {
  name: 'Planta de muros (E.070)', icon: 'grid', group: 'Albañilería',
  fields: [
    F('muros', 'Muros: id dir x y L t [Pg= Pm= n=]  (x, y del extremo inicial; X → derecha, Y → arriba)', 'X1 X 0 0 4.2 0.13 Pg=12 Pm=15\nY1 Y 0 0 6 0.13', 'area'),
    F('planta', 'Planta: x0 y0 x1 y1 [m] (área techada y centro de masas)', '0 0 10 12'),
    F('Ap', 'Área de la planta típica Ap (vacío = rectángulo de la planta)', ''),
    F('cm', 'Centro de masas «x y» (vacío = centroide de la planta)', ''),
    F('Z', 'Factor de zona Z', 'Z'), F('U', 'Factor de uso U', 'U'), F('S', 'Factor de suelo S', 'S'), F('N', 'Número de pisos N', 'N'),
    F('h', 'Altura de entrepiso h (rigidez de muros)', 'h'), F('hl', 'Altura libre del muro (espesor mínimo h/20; vacío = h)', ''),
    F('apoyo', 'Rigidez del muro', 'voladizo', 'select', ['voladizo', 'doble empotramiento']),
    F('ea', 'Excentricidad accidental (fracción de la dimensión transversal)', '0.05'),
    F('titulo', 'Título', ''),
  ],
  hint: 'Planta de muros portantes. Calcula la densidad ΣL·t·n/Ap por dirección y la compara con ZUSN/56 (E.070 Art. 19.2.b; muros con L ≥ 1.20 m según Art. 17 c; n = Ec/Em para placas). Rigidez k = E·t/(4(h/L)³ + 3(h/L)) (voladizo, G = 0.4E), centro de rigidez, excentricidad real + accidental y reparto del cortante con torsión (sin reducciones). Exporta <b>densX, densY, dmin, Ap, xCM, yCM, xCR, yCR, eX, eY</b> y por dirección los vectores <b>LX, tX, PgX, PmX, kX, rX</b> (rX = fracción del cortante con torsión), igual para Y, e <b>idX, idY</b>.',
  def: { muros: 'X1 X 0 0 4.2 0.13\nX2 X 0 8 4.2 0.13\nY1 Y 0 0 8 0.13\nY2 Y 6 0 8 0.13', planta: '0 0 6 8', Z: '0.45', U: '1', S: '1.05', N: '3', h: '2.6 m', apoyo: 'voladizo', ea: '0.05' },
  render(b, ctx) {
    const S = ctx.scope, W = parseWalls(b.muros, S);
    const pl = String(b.planta || '').trim().split(/[\s,;]+/).filter(Boolean).map(s => evalParam(s, S, 'm'));
    if (pl.length !== 4) throw new Error('Planta: indique «x0 y0 x1 y1»');
    const [x0, y0, x1, y1] = [Math.min(pl[0], pl[2]), Math.min(pl[1], pl[3]), Math.max(pl[0], pl[2]), Math.max(pl[1], pl[3])];
    const Bx = x1 - x0, By = y1 - y0; pos({ Bx, By });
    const Ap = b.Ap && String(b.Ap).trim() ? evalParam(b.Ap, S, 'm^2') : Bx * By;
    let xCM = (x0 + x1) / 2, yCM = (y0 + y1) / 2;
    if (b.cm && String(b.cm).trim()) { const c = String(b.cm).trim().split(/[\s,;]+/).map(s => evalParam(s, S, 'm')); if (c.length !== 2) throw new Error('Centro de masas: «x y»'); [xCM, yCM] = c; }
    const Z = evalParam(b.Z, S, '', 0.45), Uf = evalParam(b.U, S, '', 1), Sf = evalParam(b.S, S, '', 1), N = evalParam(b.N, S, '', 1);
    const h = evalParam(b.h, S, 'm', 2.6), ea = evalParam(b.ea, S, '', 0.05); pos({ Ap, h, Z, Uf, Sf, N });
    const hlib = b.hl && String(b.hl).trim() ? evalParam(b.hl, S, 'm', h) : h; pos({ hlib });
    const empo = /empotr/i.test(b.apoyo || '');
    const dmin = Z * Uf * Sf * N / 56;
    for (const w of W) {
      w.cx = w.dir === 'X' ? w.x + w.L / 2 : w.x; w.cy = w.dir === 'Y' ? w.y + w.L / 2 : w.y;
      w.ok = w.L >= 1.2 - 1e-9;                     // E.070 Art. 17 c: L ≥ 1.20 m para contribuir
      const r = h / w.L; w.k = w.ok ? w.n * w.t / (empo ? r ** 3 + 3 * r : 4 * r ** 3 + 3 * r) : 0; // relativo a Em
    }
    const X = W.filter(w => w.dir === 'X'), Y = W.filter(w => w.dir === 'Y');
    if (!X.length || !Y.length) throw new Error('Defina muros en las dos direcciones X e Y');
    const sum = (a, f) => a.reduce((s, w) => s + f(w), 0);
    const KX = sum(X, w => w.k), KY = sum(Y, w => w.k);
    if (!(KX > 0) || !(KY > 0)) throw new Error('Sin muros contribuyentes (L ≥ 1.20 m) en alguna dirección');
    const yCR = sum(X, w => w.k * w.cy) / KX, xCR = sum(Y, w => w.k * w.cx) / KY;
    const J = sum(X, w => w.k * (w.cy - yCR) ** 2) + sum(Y, w => w.k * (w.cx - xCR) ** 2);
    const eX = xCM - xCR, eY = yCM - yCR;               // excentricidades reales
    const edX = Math.abs(eY) + ea * By, edY = Math.abs(eX) + ea * Bx; // sismo en X: brazo en Y; sismo en Y: brazo en X
    for (const w of X) { w.kf = w.k / KX; w.rf = w.kf + (J > 0 ? w.k * Math.abs(w.cy - yCR) * edX / J : 0); }
    for (const w of Y) { w.kf = w.k / KY; w.rf = w.kf + (J > 0 ? w.k * Math.abs(w.cx - xCR) * edY / J : 0); }
    const densX = sum(X.filter(w => w.ok), w => w.L * w.t * w.n) / Ap, densY = sum(Y.filter(w => w.ok), w => w.L * w.t * w.n) / Ap;
    const tmin = Math.min(...W.map(w => w.t));
    // ---- exportar
    const ex = (k, v, u) => setVar(ctx, k, u ? U(v, u) : v);
    ex('Ap', Ap, 'm^2'); ex('densX', densX); ex('densY', densY); ex('dmin', dmin);
    const sn = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
    ex('xCM', xCM, 'm'); ex('yCM', yCM, 'm'); ex('xCR', sn(xCR), 'm'); ex('yCR', sn(yCR), 'm'); ex('eX', sn(eX), 'm'); ex('eY', sn(eY), 'm');
    for (const [D, A] of [['X', X], ['Y', Y]]) {
      setVar(ctx, 'id' + D, math.matrix(A.map(w => w.id)));
      setVar(ctx, 'L' + D, vec(A.map(w => w.L), 'm')); setVar(ctx, 't' + D, vec(A.map(w => w.t), 'm'));
      setVar(ctx, 'k' + D, vec(A.map(w => w.kf))); setVar(ctx, 'r' + D, vec(A.map(w => w.rf)));
      if (A.every(w => w.Pg !== null)) setVar(ctx, 'Pg' + D, vec(A.map(w => w.Pg), 'tonf'));
      if (A.every(w => w.Pm !== null)) setVar(ctx, 'Pm' + D, vec(A.map(w => w.Pm), 'tonf'));
    }
    ctx.checks.push({ ok: densX >= dmin, label: `Densidad de muros dirección X: ΣL·t/Ap = ${f2(densX, 4)} ≥ ZUSN/56 = ${f2(dmin, 4)} (E.070 Art. 19.2.b)`, ratio: dmin / densX, block: ctx.blockId });
    ctx.checks.push({ ok: densY >= dmin, label: `Densidad de muros dirección Y: ΣL·t/Ap = ${f2(densY, 4)} ≥ ZUSN/56 = ${f2(dmin, 4)} (E.070 Art. 19.2.b)`, ratio: dmin / densY, block: ctx.blockId });
    ctx.checks.push({ ok: tmin >= hlib / 20 - 1e-9, label: `Espesor efectivo mínimo t = ${f2(tmin * 100, 1)} cm ≥ h/20 = ${f2(hlib / 20 * 100, 1)} cm (E.070 Art. 19.1.a, zonas 2 a 4)`, ratio: hlib / 20 / tmin, block: ctx.blockId });
    ctx.checks.push({ ok: Math.max(Bx, By) / Math.min(Bx, By) <= 4, label: `Proporción de la planta ${f2(Math.max(Bx, By) / Math.min(Bx, By))} ≤ 4 (E.070 Art. 15.3)`, ratio: Math.max(Bx, By) / Math.min(Bx, By) / 4, block: ctx.blockId });
    // ---- dibujo
    const Wd = 700, Hd = 520, pad = 54;
    const sc = Math.min((Wd - 2 * pad - 150) / Bx, (Hd - 2 * pad) / By);
    const ox = pad, oy = Hd - pad;
    const PX = (x) => ox + (x - x0) * sc, PY = (y) => oy - (y - y0) * sc;
    let g = arrowDefs;
    g += rect(PX(x0), PY(y1), Bx * sc, By * sc, '#f8fafc', C.axis, 0.8, ' stroke-dasharray="5 3"');
    niceTicks(x0, x1, 8).forEach(t => { g += Lne(PX(t), PY(y1), PX(t), PY(y0), C.grid, 0.5); });
    niceTicks(y0, y1, 8).forEach(t => { g += Lne(PX(x0), PY(t), PX(x1), PY(t), C.grid, 0.5); });
    for (const w of W) {
      const tt = Math.max(w.t * sc, 3), col = !w.ok ? '#c4c9cf' : w.n > 1.01 ? '#57606a' : w.dir === 'X' ? C.blue : C.orange;
      if (w.dir === 'X') g += rect(PX(w.x), PY(w.y) - tt / 2, w.L * sc, tt, col, C.ink, 0.6);
      else g += rect(PX(w.x) - tt / 2, PY(w.y + w.L), tt, w.L * sc, col, C.ink, 0.6);
      const lx = w.dir === 'X' ? PX(w.cx) : PX(w.cx) + 9, ly = w.dir === 'X' ? PY(w.cy) - 7 : PY(w.cy) + 3;
      g += T(lx, ly, w.id, { fs: 9, c: '#24292f', a: w.dir === 'X' ? 'middle' : 'start', b: 1 });
    }
    // CM y CR
    g += circ(PX(xCM), PY(yCM), 6, '#fff', C.red, 1.6) + Lne(PX(xCM) - 6, PY(yCM), PX(xCM) + 6, PY(yCM), C.red, 1.2) + Lne(PX(xCM), PY(yCM) - 6, PX(xCM), PY(yCM) + 6, C.red, 1.2);
    g += rect(PX(xCR) - 5, PY(yCR) - 5, 10, 10, C.green, C.ink, 0.8);
    g += T(PX(xCM) + 9, PY(yCM) - 8, 'CM', { fs: 10, c: C.red, a: 'start', b: 1 }) + T(PX(xCR) + 9, PY(yCR) + 14, 'CR', { fs: 10, c: C.green, a: 'start', b: 1 });
    g += dimH(PX(x0), PX(x1), PY(y0) + 26, f2(Bx) + ' m') + dimV(PX(x0) - 26, PY(y1), PY(y0), f2(By) + ' m');
    // ejes
    g += arrow(PX(x0) - 34, PY(y0) + 40, PX(x0) - 4, PY(y0) + 40) + T(PX(x0) - 1, PY(y0) + 44, 'X', { fs: 10, a: 'start', b: 1 });
    g += arrow(PX(x0) - 34, PY(y0) + 40, PX(x0) - 34, PY(y0) + 10) + T(PX(x0) - 34, PY(y0) + 6, 'Y', { fs: 10, b: 1 });
    // leyenda / resumen
    const lx = Wd - 160; let ly = 40;
    const leg = (c, s) => { g += rect(lx, ly - 8, 14, 8, c, C.ink, 0.5) + T(lx + 20, ly, s, { fs: 10, a: 'start' }); ly += 16; };
    leg(C.blue, 'Muro dirección X'); leg(C.orange, 'Muro dirección Y'); if (W.some(w => w.n > 1.01)) leg('#57606a', 'Placa de C.A. (n = Ec/Em)'); if (W.some(w => !w.ok)) leg('#c4c9cf', 'L < 1.20 m (no contribuye)');
    ly += 8;
    const line = (s, o = {}) => { g += T(lx, ly, s, { fs: 10, a: 'start', ...o }); ly += 15; };
    line('Ap = ' + f2(Ap) + ' m²', { b: 1 });
    line('ZUSN/56 = ' + f2(dmin, 4));
    line('Dens. X = ' + f2(densX, 4) + (densX >= dmin ? ' ✔' : ' ✘'), { c: densX >= dmin ? C.green : C.red });
    line('Dens. Y = ' + f2(densY, 4) + (densY >= dmin ? ' ✔' : ' ✘'), { c: densY >= dmin ? C.green : C.red });
    ly += 6;
    const z = (v) => f2(Math.abs(v) < 1e-6 ? 0 : v, 3);
    line('CM = (' + z(xCM) + ', ' + z(yCM) + ') m'); line('CR = (' + z(xCR) + ', ' + z(yCR) + ') m');
    line('ex = xCM − xCR = ' + z(eX) + ' m'); line('ey = yCM − yCR = ' + z(eY) + ' m');
    // tabla de muros
    const row = (w) => `<tr><td>${esc(w.id)}</td><td>${w.dir}</td><td>${f2(w.L)}</td><td>${f2(w.t * 100, 1)}</td><td>${f2(w.n)}</td><td>${f2(w.L * w.t * w.n, 3)}</td><td>${w.ok ? f2(w.kf * 100, 1) : '—'}</td><td>${w.ok ? f2(w.rf * 100, 1) : '—'}</td></tr>`;
    ctx.tab = (ctx.tab || 0) + 1;
    const tbl = `<div class="cap">Tabla ${ctx.tab}: Muros, área de corte y reparto del cortante sísmico (rigidez ${empo ? 'doble empotramiento' : 'en voladizo'}, h = ${f2(h)} m, excentricidad accidental ${f2(ea)}·B)</div><table class="tbl"><thead><tr><th>Muro</th><th>Dir.</th><th>L [m]</th><th>t [cm]</th><th>n = Ec/Em</th><th>L·t·n [m²]</th><th>k/Σk [%]</th><th>Cortante con torsión [%]</th></tr></thead><tbody>${X.map(row).join('')}<tr class="tot"><td colspan="5">Σ dirección X — densidad ${f2(densX, 4)}</td><td>${f2(densX * Ap, 3)}</td><td>100</td><td>${f2(sum(X, w => w.rf) * 100, 1)}</td></tr>${Y.map(row).join('')}<tr class="tot"><td colspan="5">Σ dirección Y — densidad ${f2(densY, 4)}</td><td>${f2(densY * Ap, 3)}</td><td>100</td><td>${f2(sum(Y, w => w.rf) * 100, 1)}</td></tr></tbody></table>`;
    return `<div class="figure">${svgWrap(Wd, Hd, g)}${caption(ctx, b.titulo || 'Planta típica de muros portantes, centro de masas (CM) y centro de rigidez (CR)')}</div><div class="figure">${tbl}</div>`;
  },
});

// =====================================================================
//  2) TANQUE — modelo de Housner (ACI 350.3) y distribución de presiones
// =====================================================================
registerBlock('tanque', {
  name: 'Tanque: masas de Housner', icon: 'quake', group: 'Estructuras especiales',
  fields: [
    F('forma', 'Forma en planta', 'circular', 'select', ['circular', 'rectangular']),
    F('tipo', 'Tipo', 'apoyado', 'select', ['apoyado', 'enterrado', 'elevado']),
    F('D', 'Diámetro D (o longitud L en la dirección del sismo)', 'D'), F('HL', 'Altura del líquido HL', 'HL'),
    F('Hw', 'Altura del muro Hw', 'Hw'), F('tw', 'Espesor del muro tw', 'tw'),
    F('Hf', 'Altura del soporte (solo elevado)', ''), F('Pi', 'Fuerza impulsiva Pi (opcional)', ''), F('Pc', 'Fuerza convectiva Pc (opcional)', ''),
    F('dmax', 'Altura de oleaje dmax (opcional)', ''), F('cubierta', 'Losa de cubierta', 'auto', 'select', ['auto', 'sí', 'no']), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja el tanque con las masas equivalentes de Housner según ACI 350.3-06 (Wi a hi rígidamente unida a la pared; Wc a hc unida con resortes), la distribución vertical de presiones hidrostáticas e hidrodinámicas (Cap. 5: Piy, Pcy) y la altura de oleaje. Las proporciones Wi/WL, Wc/WL, hi y hc se calculan internamente (Ec. 9-1 a 9-5 o 9-15 a 9-19).',
  def: { forma: 'circular', tipo: 'apoyado', D: '10 m', HL: '4 m', Hw: '4.5 m', tw: '0.25 m' },
  render(b, ctx) {
    const S = ctx.scope, circ0 = !/rect/i.test(b.forma || '');
    const D = evalParam(b.D, S, 'm', 10), HL = evalParam(b.HL, S, 'm', 4), Hw = evalParam(b.Hw, S, 'm', HL * 1.1), tw = evalParam(b.tw, S, 'm', 0.25);
    const elev = /elev/i.test(b.tipo || ''), buried = /enterr/i.test(b.tipo || '');
    const Hf = elev ? evalParam(b.Hf, S, 'm', 10) : 0;
    pos({ D, HL, Hw, tw }); if (HL > Hw) throw new Error('La altura del líquido HL excede la altura del muro Hw');
    const Pi = b.Pi ? evalParam(b.Pi, S, 'tonf', 0) : 0, Pc = b.Pc ? evalParam(b.Pc, S, 'tonf', 0) : 0, dmax = b.dmax ? evalParam(b.dmax, S, 'm', 0) : 0;
    const r = D / HL, k = circ0 ? 3.68 : 3.16;
    const wi = aci.WiWL(r), wc = circ0 ? aci.WcWLc(r) : aci.WcWLr(r), hi = aci.hiHL(r) * HL, hc = aci.hcHL(r, k) * HL;
    const tot = Hw + Hf + (elev ? 1.0 : 0.6) + 0.3, sc = Math.min(250 / (D + 2 * tw + 0.4), (elev ? 400 : 260) / tot);
    const Wd = 720, Hd = Math.max(300, Math.round(tot * sc + 120));
    const cx = 175, base = Hd - 56;
    const X = (x) => cx + x * sc, Y = (y) => base - (y + Hf) * sc;
    let g = arrowDefs;
    // suelo / soporte
    if (elev) {
      const fw = Math.max(D * 0.32, 1.2);
      g += rect(X(-fw / 2), Y(0), fw * sc, Hf * sc, C.conc, C.ink, 1.2);
      g += rect(X(-fw / 2 - 0.9), base, (fw + 1.8) * sc, 0.6 * sc, C.conc, C.ink, 1) + `<rect x="${X(-D / 2 - 1).toFixed(1)}" y="${(base + 0.6 * sc).toFixed(1)}" width="${((D + 2) * sc).toFixed(1)}" height="10" fill="url(#soilp)"/>`;
      g += dimV(X(-fw / 2) - 14, Y(0), base, 'Hs = ' + f2(Hf) + ' m');
    } else {
      g += `<rect x="${X(-D / 2 - tw - 1.2).toFixed(1)}" y="${base.toFixed(1)}" width="${((D + 2 * tw + 2.4) * sc).toFixed(1)}" height="12" fill="url(#soilp)"/>`;
      if (buried) g += `<rect x="${X(-D / 2 - tw - 1.2).toFixed(1)}" y="${Y(Hw).toFixed(1)}" width="${(1.2 * sc).toFixed(1)}" height="${(Hw * sc).toFixed(1)}" fill="url(#soilp)"/><rect x="${X(D / 2 + tw).toFixed(1)}" y="${Y(Hw).toFixed(1)}" width="${(1.2 * sc).toFixed(1)}" height="${(Hw * sc).toFixed(1)}" fill="url(#soilp)"/>`;
    }
    // tanque
    const tb = Math.max(tw, 0.2);
    g += rect(X(-D / 2), Y(HL), D * sc, HL * sc, water, 'none');
    g += Lne(X(-D / 2), Y(HL), X(D / 2), Y(HL), C.blue, 1.4);
    g += `<path d="M${X(-D / 2 - tw)},${Y(Hw)} L${X(-D / 2 - tw)},${Y(-tb)} L${X(D / 2 + tw)},${Y(-tb)} L${X(D / 2 + tw)},${Y(Hw)} L${X(D / 2)},${Y(Hw)} L${X(D / 2)},${Y(0)} L${X(-D / 2)},${Y(0)} L${X(-D / 2)},${Y(Hw)} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    const cub = /^s/i.test(b.cubierta || '') || (!/^n/i.test(b.cubierta || '') && (elev || buried));
    if (cub) g += rect(X(-D / 2 - tw), Y(Hw) - 0.18 * sc, (D + 2 * tw) * sc, 0.18 * sc, C.conc, C.ink, 1.2);
    // oleaje
    if (dmax > 0) {
      const dd = Math.min(dmax, Hw - HL + 0.02, HL), ya = Y(HL + dd);
      g += path([[X(-D / 2), ya], [X(-D / 4), Y(HL + dd / 2)], [X(0), Y(HL)], [X(D / 4), Y(HL - dd / 2)], [X(D / 2), Y(HL - dd)]], C.blue, 1, '4 3');
      g += T(X(-D / 2 - tw), Y(Hw) - (cub ? 0.18 * sc : 0) - 6, 'oleaje dmax = ' + f2(dmax) + ' m' + (dmax > Hw - HL ? ' (> borde libre)' : ''), { fs: 9, a: 'start', c: C.blue });
    }
    // masas de Housner
    const mi = Math.max(6, Math.min(16, 16 * Math.sqrt(wi))), mc = Math.max(6, Math.min(16, 16 * Math.sqrt(wc)));
    g += Lne(X(-D / 2), Y(hi), X(D / 2), Y(hi), C.red, 1.6) + rect(X(0) - mi, Y(hi) - mi * 0.7, 2 * mi, 1.4 * mi, C.red, C.ink, 0.8);
    g += T(X(0), Y(hi) + 3.5, 'Wi', { fs: 9, c: '#fff', b: 1 });
    const spring = (xa, xb, y) => { const n = 8, pts = [[xa, y]]; for (let i = 1; i < n; i++) pts.push([xa + (xb - xa) * i / n, y + (i % 2 ? -4 : 4)]); pts.push([xb, y]); return path(pts, C.green, 1.2); };
    g += spring(X(-D / 2), X(0) - mc, Y(hc)) + spring(X(0) + mc, X(D / 2), Y(hc)) + rect(X(0) - mc, Y(hc) - mc * 0.7, 2 * mc, 1.4 * mc, C.green, C.ink, 0.8) + T(X(0), Y(hc) + 3.5, 'Wc', { fs: 9, c: '#fff', b: 1 });
    // cotas
    g += dimV(X(D / 2 + tw) + 16, Y(HL), Y(0), 'HL = ' + f2(HL), C.blue, 1);
    g += dimV(X(-D / 2 - tw) - 14, Y(hi), Y(0), 'hi = ' + f2(hi), C.red);
    g += dimV(X(-D / 2 - tw) - 34, Y(hc), Y(0), 'hc = ' + f2(hc), C.green);
    g += dimH(X(-D / 2), X(D / 2), Y(-Math.max(tw, 0.2)) + (elev ? 16 : 30), (circ0 ? 'D = ' : 'L = ') + f2(D) + ' m');
    if (Pi > 0) g += arrow(X(D / 2 + tw) + 50, Y(hi), X(D / 2 + tw) + 104, Y(hi), C.red, 1.6) + T(X(D / 2 + tw) + 77, Y(hi) - 5, 'Pi = ' + f2(Pi) + ' t', { fs: 9, c: C.red });
    if (Pc > 0) g += arrow(X(D / 2 + tw) + 50, Y(hc), X(D / 2 + tw) + 104, Y(hc), C.green, 1.6) + T(X(D / 2 + tw) + 77, Y(hc) - 5, 'Pc = ' + f2(Pc) + ' t', { fs: 9, c: C.green });
    const restr = Pi > 0 && !(Pc > 0);   // Pc = 0 con Pi > 0: la cubierta restringe el oleaje (Wc tratada como impulsiva)
    if (restr) g += T(X(D / 2 + tw) + 50, Y(hc) - 5, 'Pc = 0: Wc restringida → impulsiva', { fs: 9, c: C.green, a: 'start' });
    // ---- diagramas de presión (por unidad de altura, normalizados)
    const gx = 470, gw = 210, gh = Math.max(160, Math.min(260, HL * sc)), gy0 = elev ? 70 + gh : base - 10, gy1 = gy0 - gh;
    const YP = (y) => gy0 - y / HL * gh;
    const py = (P, h0, y) => P / 2 * (4 * HL - 6 * h0 - (6 * HL - 12 * h0) * y / HL) / (HL * HL); // ACI 350.3 Ec. 5-1 / 5-3
    const ys = Array.from({ length: 21 }, (_, i) => HL * i / 20);
    const Pref = Pi > 0 || Pc > 0 ? [Pi, Pc] : [wi, wc];
    const fi = ys.map(y => py(Pref[0], hi, y)), fc = ys.map(y => py(Pref[1], hc, y));
    const fh = ys.map(y => (HL - y));
    const mx = Math.max(...fi.map(Math.abs), ...fc.map(Math.abs), 1e-9), mh = HL;
    const GX = (v, m) => gx + v / m * gw * 0.9;
    g += Lne(gx, gy0 + 4, gx, gy1 - 10, C.ink, 1) + Lne(gx, gy0, gx + gw, gy0, C.axis, 0.8);
    g += poly([[gx, gy1], ...ys.map((y, i) => [GX(fh[i], mh), YP(y)]).reverse(), [gx, gy0]], 'rgba(31,111,235,.10)', C.blue, 1);
    g += path(ys.map((y, i) => [GX(fi[i], mx), YP(y)]), C.red, 2) + (restr ? '' : path(ys.map((y, i) => [GX(fc[i], mx), YP(y)]), C.green, 2));
    g += T(gx + gw / 2, gy1 - 18, 'Presiones sobre la pared', { fs: 10, b: 1 });
    g += T(GX(fh[0], mh), gy0 + 13, 'γ·HL', { fs: 9, c: C.blue }) + T(GX(fi[0], mx) + 4, YP(ys[1]) - 2, 'impulsiva', { fs: 9, c: C.red, a: 'start' }) + (restr ? '' : T(GX(fc[20], mx) + 4, YP(ys[19]) + 10, 'convectiva', { fs: 9, c: C.green, a: 'start' }));
    g += T(gx + gw / 2, gy0 + 28, Pi > 0 ? 'Piy, Pcy [fuerza por unidad de altura] — ACI 350.3 Cap. 5' : 'Formas de Piy y Pcy (ACI 350.3 Cap. 5)', { fs: 9, c: C.axis });
    const info = `Wi/WL = ${f2(wi, 3)} · Wc/WL = ${f2(wc, 3)} · hi/HL = ${f2(hi / HL, 3)} · hc/HL = ${f2(hc / HL, 3)}`;
    g += T(Wd / 2, 18, info, { fs: 10.5, c: '#24292f', b: 1 });
    return `<div class="figure">${svgWrap(Wd, Hd, g)}${caption(ctx, b.titulo || `Modelo dinámico de Housner del tanque ${circ0 ? 'circular' : 'rectangular'} ${elev ? 'elevado' : buried ? 'enterrado' : 'apoyado'} (ACI 350.3-06)`)}</div>`;
  },
});

// =====================================================================
//  3) PARED DE TANQUE CIRCULAR — tensión anular y momento vertical (PCA)
// =====================================================================
registerBlock('cilindro', {
  name: 'Pared de tanque circular (PCA)', icon: 'plot', group: 'Estructuras especiales',
  fields: [
    F('H', 'Altura de diseño H (líquido)', 'HL'), F('D', 'Diámetro interior D', 'D'), F('t', 'Espesor de la pared t', 'tw'),
    F('w', 'Peso específico (de diseño) del líquido w', 'gw'),
    F('base', 'Unión muro–losa de fondo', 'empotrada', 'select', ['empotrada', 'articulada']),
    F('titulo', 'Título', ''),
  ],
  hint: 'Resuelve la ecuación de la cáscara cilíndrica (Timoshenko, ν = 0.2) con borde superior libre y base empotrada o articulada, bajo presión hidrostática. Reproduce los coeficientes de las Tablas A-1, A-2, A-5, A-7 y A-12 del PCA «Circular Concrete Tanks without Prestressing» (k = H²/Dt). Exporta <b>kPCA, Tmax, yTmax, Mbase, Mpos, Vbase</b> (por metro de pared) y los vectores <b>CT, CM</b> en 0.0H…1.0H.',
  def: { H: '5 m', D: '12 m', t: '0.25 m', w: '1 tonf/m^3', base: 'empotrada' },
  render(b, ctx) {
    const S = ctx.scope;
    const H = evalParam(b.H, S, 'm', 5), D = evalParam(b.D, S, 'm', 12), t = evalParam(b.t, S, 'm', 0.25), w = evalParam(b.w, S, 'tonf/m^3', 1);
    pos({ H, D, t, w });
    const k = H * H / (D * t), basen = /artic/i.test(b.base || '') ? 2 : 1, sh = shellPCA(k, basen, 1), R = D / 2;
    const ys = Array.from({ length: 11 }, (_, i) => i / 10);
    const z0 = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
    const CT = ys.map(y => z0(sh.T(y))), CMv = ys.map(y => z0(sh.M(y)));
    setVar(ctx, 'kPCA', k); setVar(ctx, 'Tmax', U(sh.Tmax * w * H * R, 'tonf/m')); setVar(ctx, 'yTmax', U(sh.yTmax * H, 'm'));
    setVar(ctx, 'Mbase', U(Math.abs(sh.Mbase) * w * H ** 3, 'tonf*m/m')); setVar(ctx, 'Mpos', U(Math.max(0, sh.Mpos) * w * H ** 3, 'tonf*m/m'));
    setVar(ctx, 'Vbase', U(sh.Vbase * w * H * H, 'tonf/m'));
    setVar(ctx, 'CT', math.matrix(CT)); setVar(ctx, 'CM', math.matrix(CMv));
    // dibujo: dos diagramas
    const Wd = 700, Hd = 360, top = 40, hgt = 260;
    const Yy = (y) => top + y * hgt;
    let g = '';
    const panel = (x0, wdt, vals, fine, titulo, unit, col, fmt) => {
      const all = [...fine.map(v => v[1]), 0]; let mn = Math.min(...all), mxv = Math.max(...all); if (mn === mxv) mxv = mn + 1;
      const X = (v) => x0 + (v - mn) / (mxv - mn) * wdt;
      let s = rect(x0, top, wdt, hgt, '#fff', C.axis, 0.6);
      niceTicks(mn, mxv, 4).forEach(tv => { s += Lne(X(tv), top, X(tv), top + hgt, C.grid, 0.6) + T(X(tv), top + hgt + 13, f2(tv, 2), { fs: 9, c: C.axis }); });
      for (let i = 0; i <= 10; i++) s += Lne(x0, Yy(i / 10), x0 + wdt, Yy(i / 10), C.grid, 0.4);
      s += Lne(X(0), top, X(0), top + hgt, C.ink, 1);
      s += poly([[X(0), Yy(0)], ...fine.map(([y, v]) => [X(v), Yy(y)]), [X(0), Yy(1)]], col === C.blue ? C.blueF : C.redF, col, 1.6);
      vals.forEach((v, i) => { if (i % 2 === 0 || i === 10) s += T(X(v) + (v >= 0 ? 4 : -4), Yy(i / 10) + 3, fmt(v), { fs: 8.5, a: v >= 0 ? 'start' : 'end', c: col }); });
      s += T(x0 + wdt / 2, top - 22, titulo, { fs: 11, b: 1 }) + T(x0 + wdt / 2, top - 9, unit, { fs: 9, c: C.axis });
      return s;
    };
    const fine = Array.from({ length: 101 }, (_, i) => i / 100);
    const Tv = fine.map(y => [y, sh.T(y) * w * H * R]), Mv = fine.map(y => [y, sh.M(y) * w * H ** 3]);
    // pared
    g += rect(28, top, 18, hgt, C.conc, C.ink, 1.2);
    g += rect(46, top, 22, hgt, water, 'none') + Lne(46, top, 68, top, C.blue, 1.2);
    g += `<rect x="20" y="${top + hgt}" width="60" height="10" fill="${basen === 1 ? C.conc : '#fff'}" stroke="${C.ink}"/>`;
    for (let i = 0; i <= 10; i += 2) g += T(18, Yy(i / 10) + 3, f2(i / 10, 1) + 'H', { fs: 8.5, a: 'end', c: C.axis });
    g += panel(130, 230, CT.map(c => c * w * H * R), Tv, 'Tensión anular T', '[tonf/m] · T = C_T·w·H·R', C.blue, (v) => f2(v, 1));
    g += panel(430, 230, CMv.map(c => c * w * H ** 3), Mv, 'Momento vertical M', '[tonf·m/m] · (−) tracción cara interior', C.red, (v) => f2(v, 2));
    g += T(Wd / 2, Hd - 14, `H²/(D·t) = ${f2(k, 2)} · βH = ${f2(sh.bH, 2)} · base ${basen === 1 ? 'empotrada' : 'articulada'} · Tmax = ${sh.Tmax.toFixed(3)}·wHR en ${f2(sh.yTmax, 2)}H · Mbase = ${sh.Mbase.toFixed(4)}·wH³`, { fs: 9.5, c: '#24292f' });
    // tabla de coeficientes PCA
    ctx.tab = (ctx.tab || 0) + 1;
    const tbl = `<div class="cap">Tabla ${ctx.tab}: Coeficientes de tensión anular C<sub>T</sub> y momento C<sub>M</sub> (equivalentes a las Tablas A-${basen === 1 ? '1 y A-2' : '5 y A-7'} del PCA), H²/Dt = ${f2(k, 2)}</div><table class="tbl"><thead><tr><th>Punto</th>${ys.map(y => `<th>${f2(y, 1)}H</th>`).join('')}</tr></thead><tbody><tr><td>C<sub>T</sub></td>${CT.map(c => `<td>${f2(c, 3)}</td>`).join('')}</tr><tr><td>C<sub>M</sub></td>${CMv.map(c => `<td>${(c >= 0 ? '+' : '') + c.toFixed(4)}</td>`).join('')}</tr><tr><td>T [tonf/m]</td>${CT.map(c => `<td>${f2(c * w * H * R, 2)}</td>`).join('')}</tr><tr><td>M [t·m/m]</td>${CMv.map(c => `<td>${f2(c * w * H ** 3, 3)}</td>`).join('')}</tr></tbody></table>`;
    return `<div class="figure">${svgWrap(Wd, Hd, g)}${caption(ctx, b.titulo || 'Tensión anular y momento flector vertical en la pared del tanque circular (teoría de cáscaras — PCA)')}</div><div class="figure">${tbl}</div>`;
  },
});

// =====================================================================
//  4) PARED DE TANQUE RECTANGULAR — placa por diferencias finitas (PCA)
// =====================================================================
const EDGE = (s, d) => { const v = String(s || d).trim().toLowerCase(); return v.startsWith('e') ? 'E' : v.startsWith('a') ? 'A' : v.startsWith('l') ? 'L' : (() => { throw new Error('Borde: empotrado, articulado o libre'); })(); };
registerBlock('tankwall', {
  name: 'Pared de tanque rectangular (placa)', icon: 'slab', group: 'Estructuras especiales',
  fields: [
    F('a', 'Ancho de la pared a (entre muros transversales)', 'Lw'), F('b', 'Altura de la pared b', 'Hw'),
    F('inf', 'Borde inferior', 'empotrado', 'select', ['empotrado', 'articulado']),
    F('sup', 'Borde superior', 'articulado', 'select', ['libre', 'articulado', 'empotrado']),
    F('lat', 'Bordes laterales', 'empotrado', 'select', ['empotrado', 'articulado']),
    F('qb', 'Presión en la base qb', 'qb'), F('qs', 'Presión uniforme qs (sobrecarga, borde superior)', '0'), F('hq', 'Altura de la carga triangular (vacío = b; p. ej. nivel del agua)', ''),
    F('nu', 'Coeficiente de Poisson ν', '0.2'), F('ndiv', 'Divisiones de la malla (≈)', '20'), F('sufijo', 'Sufijo de variables exportadas', ''),
    F('titulo', 'Título', ''),
  ],
  hint: 'Placa rectangular de espesor constante bajo presión trapezoidal (agua, suelo, sobrecarga), resuelta por diferencias finitas (ecuación biarmónica, nudos ficticios para bordes empotrados, articulados y libres). Equivale a las tablas de coeficientes del PCA «Rectangular Concrete Tanks» (Mx horizontal, My vertical). Validada con Timoshenko y con la Tabla 12 de la E.070. Exporta <b>MxN, MxP, MyN, MyP, Vb</b> (+ sufijo) por metro: N = momento negativo (bordes), P = positivo (tramo).',
  def: { a: '4 m', b: '3 m', inf: 'empotrado', sup: 'articulado', lat: 'empotrado', qb: '3 tonf/m^2', qs: '0', nu: '0.2', ndiv: '20' },
  render(b, ctx) {
    const S = ctx.scope;
    const a = evalParam(b.a, S, 'm', 4), hb = evalParam(b.b, S, 'm', 3), qb = evalParam(b.qb, S, 'tonf/m^2', 3), qs = evalParam(b.qs, S, 'tonf/m^2', 0);
    const nu = evalParam(b.nu, S, '', 0.2), nd = Math.max(8, Math.min(30, Math.round(evalParam(b.ndiv, S, '', 20)))); pos({ a, hb });
    if (!(qb >= 0 && qs >= 0) || qb + qs <= 0) throw new Error('Las presiones deben ser ≥ 0 y no ambas nulas');
    const edges = { bot: EDGE(b.inf, 'e'), top: EDGE(b.sup, 'a'), left: EDGE(b.lat, 'e'), right: EDGE(b.lat, 'e') };
    if (edges.bot === 'L') throw new Error('El borde inferior no puede ser libre');
    const hq = b.hq && String(b.hq).trim() ? evalParam(b.hq, S, 'm', hb) : hb; if (!(hq > 0) || hq > hb + 1e-9) throw new Error('La altura de la carga debe estar entre 0 y b');
    const R = tankWall(a, hb, edges, qb, qs, nu, nd, hq), P = R.r, suf = b.sufijo ? String(b.sufijo).trim() : '';
    const ex = (n, v, u) => setVar(ctx, n + suf, U(v, u));
    ex('MxN', Math.abs(R.MxN), 'tonf*m/m'); ex('MxP', Math.max(0, R.MxP), 'tonf*m/m'); ex('MyN', Math.abs(R.MyN), 'tonf*m/m'); ex('MyP', Math.max(0, R.MyP), 'tonf*m/m'); ex('Vb', R.Vb, 'tonf/m');
    // dibujo: mapas de My y Mx
    const Wd = 720, Hd = 330, mw = 250, mh = Math.min(220, mw * hb / a), sx = mw / a;
    const drawMap = (x0, f, titulo, sgn) => {
      let s = ''; let mn = 0, mx = 0; for (let j = 0; j <= P.ny; j++) for (let i = 0; i <= P.nx; i++) { const v = f(i, j); mn = Math.min(mn, v); mx = Math.max(mx, v); }
      const y0 = 50, cw = mw / P.nx, ch = mh / P.ny;
      for (let j = 0; j <= P.ny; j++) for (let i = 0; i <= P.nx; i++) {
        const v = f(i, j), tt = v >= 0 ? (mx > 0 ? v / mx : 0) : (mn < 0 ? v / mn : 0);
        const col = v >= 0 ? `rgba(31,111,235,${(0.08 + 0.75 * tt).toFixed(3)})` : `rgba(209,36,47,${(0.08 + 0.75 * tt).toFixed(3)})`;
        s += `<rect x="${(x0 + (i - 0.5) * cw).toFixed(1)}" y="${(y0 + mh - (j + 0.5) * ch).toFixed(1)}" width="${(cw + 0.3).toFixed(1)}" height="${(ch + 0.3).toFixed(1)}" fill="${col}"/>`;
      }
      s += rect(x0, y0, mw, mh, 'none', C.ink, 1.4);
      const edge = (x1, y1, x2, y2, e) => e === 'E' ? Lne(x1, y1, x2, y2, C.ink, 4) : e === 'A' ? Lne(x1, y1, x2, y2, C.ink, 1.6, '6 3') : Lne(x1, y1, x2, y2, C.axis, 0.8, '2 3');
      s += edge(x0, y0 + mh, x0 + mw, y0 + mh, edges.bot) + edge(x0, y0, x0 + mw, y0, edges.top) + edge(x0, y0, x0, y0 + mh, edges.left) + edge(x0 + mw, y0, x0 + mw, y0 + mh, edges.right);
      s += T(x0 + mw / 2, y0 - 22, titulo, { fs: 11, b: 1 }) + T(x0 + mw / 2, y0 - 9, `mín ${f2(mn, 3)} · máx ${f2(mx, 3)} t·m/m`, { fs: 9, c: C.axis });
      void sgn; return s;
    };
    let g = drawMap(40, P.My, 'Momento vertical My', 1) + drawMap(400, P.Mx, 'Momento horizontal Mx', 1);
    g += dimH(40, 40 + mw, 50 + mh + 18, 'a = ' + f2(a) + ' m') + dimV(30, 50, 50 + mh, 'b = ' + f2(hb) + ' m');
    g += T(Wd / 2, Hd - 30, `Bordes: inferior ${edges.bot === 'E' ? 'empotrado' : 'articulado'} · superior ${{ E: 'empotrado', A: 'articulado', L: 'libre' }[edges.top]} · laterales ${edges.left === 'E' ? 'empotrados' : 'articulados'} · q = ${f2(qs)} → ${f2(qb)} t/m²${hq < hb - 1e-9 ? ' (hasta ' + f2(hq) + ' m)' : ''} · malla ${P.nx}×${P.ny}`, { fs: 9.5 });
    g += T(Wd / 2, Hd - 14, 'Rojo: momento negativo (tracción en la cara cargada) · Azul: positivo (tracción en la cara opuesta)', { fs: 9, c: C.axis });
    // tabla de coeficientes tipo PCA (coef = M / (q_b·b²) ×1000)
    const q0 = Math.max(qb, qs), den = q0 * hb * hb;
    const yy = [0, 0.25, 0.5, 0.75, 1], xx = [0, 0.25, 0.5];
    const J = (f) => Math.round(f * P.ny), I = (f) => Math.round(f * P.nx);
    ctx.tab = (ctx.tab || 0) + 1;
    let tb = `<div class="cap">Tabla ${ctx.tab}: Coeficientes de momento ×1000 (M = coef·q·b²/1000, q = ${f2(q0)} t/m², b = ${f2(hb)} m) — formato de las tablas PCA para tanques rectangulares</div><table class="tbl"><thead><tr><th rowspan="2">y/b</th><th colspan="3">Mx (horizontal)</th><th colspan="3">My (vertical)</th></tr><tr>${xx.map(x => `<th>x/a = ${x}</th>`).join('')}${xx.map(x => `<th>x/a = ${x}</th>`).join('')}</tr></thead><tbody>`;
    for (const y of yy.slice().reverse()) tb += `<tr><td>${y === 1 ? '1 (sup.)' : y === 0 ? '0 (base)' : y}</td>${xx.map(x => `<td>${f2(P.Mx(I(x), J(y)) / den * 1000, 1)}</td>`).join('')}${xx.map(x => `<td>${f2(P.My(I(x), J(y)) / den * 1000, 1)}</td>`).join('')}</tr>`;
    tb += '</tbody></table>';
    return `<div class="figure">${svgWrap(Wd, Hd, g)}${caption(ctx, b.titulo || 'Distribución de momentos en la pared (placa, diferencias finitas)')}</div><div class="figure">${tb}</div>`;
  },
});

// =====================================================================
//  5) TIJERAL (ARMADURA) — rigidez de barras articuladas
// =====================================================================
function trussGeom(L, Hc, n, tipo) {
  if (n % 2 || n < 2 || n > 16) throw new Error('Número de paneles: par, entre 2 y 16');
  const nodes = [], bars = [];
  for (let i = 0; i <= n; i++) nodes.push({ x: L * i / n, y: 0, tag: 'B' + i });
  const top = [0];
  for (let i = 1; i < n; i++) { nodes.push({ x: L * i / n, y: Hc * (1 - Math.abs(L * i / n - L / 2) / (L / 2)), tag: 'T' + i }); top.push(nodes.length - 1); }
  top.push(n);
  const B = (i) => i, Tn = (i) => top[i];
  for (let i = 0; i < n; i++) bars.push({ a: B(i), b: B(i + 1), g: 'inf' });
  for (let i = 0; i < n; i++) bars.push({ a: Tn(i), b: Tn(i + 1), g: 'sup' });
  for (let i = 1; i < n; i++) bars.push({ a: B(i), b: Tn(i), g: 'mon' });
  const h = n / 2;
  for (let i = 1; i < h; i++) {
    // tijeral a dos aguas: Howe = diagonales del nudo superior hacia el centro de la cuerda inferior (compresión,
    // montantes en tracción); Pratt = diagonales del nudo inferior hacia la cumbrera (tracción, montantes comprimidos)
    if (/howe/i.test(tipo)) { bars.push({ a: Tn(i), b: B(i + 1), g: 'dia' }); bars.push({ a: Tn(n - i), b: B(n - i - 1), g: 'dia' }); }
    else { bars.push({ a: B(i), b: Tn(i + 1), g: 'dia' }); bars.push({ a: B(n - i), b: Tn(n - i - 1), g: 'dia' }); }
  }
  return { nodes, bars, top };
}
function solveTruss(nodes, bars, sup, loads) {
  const nd = nodes.length * 2, K = Array.from({ length: nd }, () => new Float64Array(nd)), Fv = new Float64Array(nd);
  for (const br of bars) {
    const A = nodes[br.a], B = nodes[br.b], dx = B.x - A.x, dy = B.y - A.y, Lb = Math.hypot(dx, dy), c = dx / Lb, s = dy / Lb; br.L = Lb; br.c = c; br.s = s;
    const k = 1 / Lb, m = [c * c, c * s, s * s], dof = [2 * br.a, 2 * br.a + 1, 2 * br.b, 2 * br.b + 1];
    const ke = [[m[0], m[1], -m[0], -m[1]], [m[1], m[2], -m[1], -m[2]], [-m[0], -m[1], m[0], m[1]], [-m[1], -m[2], m[1], m[2]]];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[dof[i]][dof[j]] += k * ke[i][j];
  }
  for (const [nI, fx, fy] of loads) { Fv[2 * nI] += fx; Fv[2 * nI + 1] += fy; }
  const fixed = new Set(sup);
  const free = [...Array(nd).keys()].filter(d => !fixed.has(d));
  const A = free.map(i => free.map(j => K[i][j])), bb = free.map(i => Fv[i]);
  // Gauss
  const n = free.length;
  for (let p = 0; p < n; p++) { let m = p; for (let r = p + 1; r < n; r++) if (Math.abs(A[r][p]) > Math.abs(A[m][p])) m = r; [A[p], A[m]] = [A[m], A[p]]; [bb[p], bb[m]] = [bb[m], bb[p]]; if (Math.abs(A[p][p]) < 1e-10) throw new Error('Armadura inestable'); for (let r = p + 1; r < n; r++) { const f = A[r][p] / A[p][p]; for (let c = p; c < n; c++) A[r][c] -= f * A[p][c]; bb[r] -= f * bb[p]; } }
  const x = Array(n).fill(0); for (let p = n - 1; p >= 0; p--) { let s = bb[p]; for (let c = p + 1; c < n; c++) s -= A[p][c] * x[c]; x[p] = s / A[p][p]; }
  const u = new Float64Array(nd); free.forEach((d, i) => { u[d] = x[i]; });
  for (const br of bars) br.N = ((u[2 * br.b] - u[2 * br.a]) * br.c + (u[2 * br.b + 1] - u[2 * br.a + 1]) * br.s) / br.L; // (+) tracción
  const Rv = [...fixed].map(d => { let r = -Fv[d]; for (let j = 0; j < nd; j++) r += K[d][j] * u[j]; return [d, r]; });
  return { u, R: Rv };
}
registerBlock('tijeral', {
  name: 'Tijeral (armadura) de madera', icon: 'beam', group: 'Madera',
  fields: [
    F('L', 'Luz del tijeral L', 'Lt'), F('H', 'Altura en la cumbrera', 'Ht'), F('n', 'Número de paneles (par)', '6'),
    F('tipo', 'Tipo de armadura', 'Howe', 'select', ['Howe', 'Pratt']),
    F('P', 'Carga por nudo de la cuerda superior P (aleros: P/2)', 'P'), F('Pb', 'Carga por nudo de la cuerda inferior (cielo raso)', '0'),
    F('titulo', 'Título', ''),
  ],
  hint: 'Tijeral triangular tipo Howe o Pratt con n paneles iguales, cargas en los nudos y apoyos simples (fijo y móvil). Resuelve por el método de rigidez y dibuja las fuerzas axiales (azul tracción, rojo compresión). Exporta <b>Ncs, Lcs</b> (compresión máxima y longitud de la cuerda superior), <b>Nti</b> (tracción máx. cuerda inferior), <b>Ndc, Ldc</b> (compresión máx. y longitud de diagonal/montante), <b>Ndt</b> (tracción máx. en diagonales/montantes), <b>Ra</b> (reacción) y <b>Lpan</b>.',
  def: { L: '8 m', H: '2 m', n: '6', tipo: 'Howe', P: '0.4 tonf', Pb: '0' },
  render(b, ctx) {
    const S = ctx.scope;
    const L = evalParam(b.L, S, 'm', 8), Hc = evalParam(b.H, S, 'm', 2), n = Math.round(evalParam(b.n, S, '', 6)), P = evalParam(b.P, S, 'tonf', 0.4), Pb = evalParam(b.Pb, S, 'tonf', 0);
    pos({ L, Hc });
    const { nodes, bars, top } = trussGeom(L, Hc, n, b.tipo || 'Howe');
    const loads = [];
    top.forEach((ni, i) => { const f = i === 0 || i === n ? 0.5 : 1; loads.push([ni, 0, -P * f]); });
    for (let i = 1; i < n; i++) loads.push([i, 0, -Pb]);
    const sol = solveTruss(nodes, bars, [0, 1, 2 * n + 1], loads);
    const grp = (g) => bars.filter(x => x.g === g);
    const minN = (a) => a.reduce((m, x) => (x.N < m.N ? x : m), { N: 0, L: 0 }), maxN = (a) => a.reduce((m, x) => (x.N > m.N ? x : m), { N: 0, L: 0 });
    const sup = minN(grp('sup')), inf = maxN(grp('inf')), web = [...grp('dia'), ...grp('mon')], wc = minN(web), wt = maxN(web);
    const Ra = (P * n + Pb * (n - 1)) / 2;
    setVar(ctx, 'Ncs', U(-sup.N, 'tonf')); setVar(ctx, 'Lcs', U(sup.L || L / n, 'm')); setVar(ctx, 'Nti', U(inf.N, 'tonf'));
    setVar(ctx, 'Ndc', U(Math.max(0, -wc.N), 'tonf')); setVar(ctx, 'Ldc', U(wc.L || Hc, 'm')); setVar(ctx, 'Ndt', U(Math.max(0, wt.N), 'tonf'));
    setVar(ctx, 'Ra', U(Ra, 'tonf')); setVar(ctx, 'Lpan', U(L / n, 'm'));
    // dibujo
    const Wd = 720, Hd = 330, sc = Math.min(620 / L, 200 / Hc), ox = (Wd - L * sc) / 2, oy = 250;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    let g = arrowDefs;
    const Nmax = Math.max(...bars.map(x => Math.abs(x.N)), 1e-9);
    for (const br of bars) {
      const A = nodes[br.a], B = nodes[br.b], col = Math.abs(br.N) < 1e-6 * Nmax ? C.axis : br.N > 0 ? C.blue : C.red;
      g += Lne(X(A.x), Y(A.y), X(B.x), Y(B.y), col, 1.2 + 3 * Math.abs(br.N) / Nmax);
      const mx = (X(A.x) + X(B.x)) / 2, my = (Y(A.y) + Y(B.y)) / 2;
      g += `<rect x="${(mx - 17).toFixed(1)}" y="${(my - 7).toFixed(1)}" width="34" height="12" rx="2" fill="#fff" opacity=".85"/>` + T(mx, my + 2.5, f2(br.N, 2), { fs: 8.5, c: col });
    }
    nodes.forEach(nd => { g += circ(X(nd.x), Y(nd.y), 2.6, '#fff', C.ink, 1); });
    top.forEach((ni, i) => { const f = i === 0 || i === n ? 0.5 : 1, nd = nodes[ni]; if (P > 0) g += arrow(X(nd.x), Y(nd.y) - 30, X(nd.x), Y(nd.y) - 5) + T(X(nd.x), Y(nd.y) - 33, f2(P * f, 2), { fs: 8.5 }); });
    g += `<path d="M${X(0)},${Y(0) + 3} l-8,13 h16 z" fill="none" stroke="${C.ink}"/><path d="M${X(L)},${Y(0) + 3} l-8,13 h16 z" fill="none" stroke="${C.ink}"/>` + Lne(X(L) - 9, Y(0) + 19, X(L) + 9, Y(0) + 19);
    g += dimH(X(0), X(L), Y(0) + 38, 'L = ' + f2(L) + ' m (' + n + ' paneles de ' + f2(L / n) + ' m)') + Lne(X(0) - 30, Y(Hc), X(L / 2) - 4, Y(Hc), C.grid, 0.8, '3 3') + dimV(X(0) - 26, Y(Hc), Y(0), 'H = ' + f2(Hc) + ' m');
    g += T(Wd / 2, 18, `Tijeral ${/howe/i.test(b.tipo || 'Howe') ? 'Howe' : 'Pratt'} · fuerzas axiales en tonf (+ tracción, − compresión) · R = ${f2(Ra, 2)} t`, { fs: 10.5, b: 1 });
    return `<div class="figure">${svgWrap(Wd, Hd, g)}${caption(ctx, b.titulo || 'Geometría del tijeral y fuerzas axiales en las barras')}</div>`;
  },
});
