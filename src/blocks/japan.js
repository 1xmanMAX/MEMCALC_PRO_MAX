// =====================================================================
//  Bloques gráficos — módulo «japan»
//   aidist  : distribución Ai en altura (BSL) → Ai, Ci, Qi por piso
//   qunqu   : capacidad lateral última Qu vs Qun = Ds·Fes·Qud por piso
//   kaberyo : cantidad de muros (壁量) y balance yonbun-wari de casas de madera
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math } from '../engine.js';
import { C, T, Lne, svgWrap, niceTicks, caption, setVar, f2 } from '../blocks.js';

// Evalúa un campo vectorial: «2100, 2100, 1600», «[3, 3] m» o el nombre de un vector del scope
function evalVec(str, S, unit, name) {
  const s = String(str ?? '').trim();
  if (!s) throw new Error('Falta el campo: ' + name);
  const src = /^\[/.test(s) || !/,/.test(s) ? s : '[' + s + ']';
  let v = math.evaluate(src, new Map(S));
  if (math.isMatrix(v)) v = v.toArray().flat(); else if (!Array.isArray(v)) v = [v];
  return v.map((x) => {
    if (math.isUnit(x)) return unit ? x.toNumber(unit) : x.value;
    if (typeof x === 'number') return x;
    throw new Error('Valor no numérico en ' + name);
  });
}
const vecU = (a, u) => math.matrix(a.map((x) => math.unit(x, u)));
const RtF = (T, Tc) => (T < Tc ? 1 : T < 2 * Tc ? 1 - 0.2 * (T / Tc - 1) ** 2 : 1.6 * Tc / T);

// ---------------------------------------------------------------------
//  1) Distribución Ai (Notif. 1793 Art. 3; Order Art. 88)
// ---------------------------------------------------------------------
registerBlock('aidist', {
  name: 'Distribución Ai (Japón BSL)', icon: 'quake', group: 'Sismo',
  fields: [
    F('wi', 'Pesos sísmicos por piso, del 1.º al último (kN)', '2100, 2100, 2100, 1600', 'text'),
    F('hi', 'Alturas de entrepiso (m)', '3.5, 3, 3, 3', 'text'),
    F('T', 'Periodo T (s) — vacío: h(0.02 + 0.01α)', 'T', 'text'),
    F('alfa', 'α: fracción de altura de acero/madera (si T vacío)', '0', 'text'),
    F('Z', 'Coeficiente de zona Z', '1.0', 'text'),
    F('Tc', 'Periodo del suelo Tc (s)', '0.6', 'text'),
    F('Co', 'Coeficiente de corte estándar Co', '0.2', 'text'),
    F('titulo', 'Título', ''),
  ],
  hint: 'Calcula α<sub>i</sub>, A<sub>i</sub> = 1 + (1/√α<sub>i</sub> − α<sub>i</sub>)·2T/(1+3T), C<sub>i</sub> = Z·R<sub>t</sub>·A<sub>i</sub>·C<sub>o</sub> y Q<sub>i</sub> = C<sub>i</sub>·ΣW. Exporta <code>alpha_i, Ai, Ci, Qi, Pi, Rt, Qb</code>.',
  def: { wi: '2100, 2100, 2100, 1600', hi: '3.5, 3, 3, 3', T: '', alfa: '0', Z: '1.0', Tc: '0.6', Co: '0.2' },
  render(b, ctx) {
    const S = ctx.scope;
    const w = evalVec(b.wi, S, 'kN', 'pesos'), h = evalVec(b.hi, S, 'm', 'alturas');
    if (w.length !== h.length) throw new Error('Pesos y alturas deben tener el mismo número de pisos');
    if (w.some((x) => !(x > 0)) || h.some((x) => !(x > 0))) throw new Error('Pesos y alturas deben ser mayores que cero');
    const n = w.length, Ht = h.reduce((a, x) => a + x, 0);
    const alfa = evalParam(b.alfa, S, '', 0);
    const Tt = evalParam(b.T, S, 's', Ht * (0.02 + 0.01 * alfa));
    const Z = evalParam(b.Z, S, '', 1), Tc = evalParam(b.Tc, S, 's', 0.6), Co = evalParam(b.Co, S, '', 0.2);
    if (!(Tt > 0)) throw new Error('El periodo T debe ser mayor que cero');
    const Rt = RtF(Tt, Tc), Wt = w.reduce((a, x) => a + x, 0);
    const Wsup = w.map((_, i) => w.slice(i).reduce((a, x) => a + x, 0));
    const al = Wsup.map((x) => x / Wt);
    const Ai = al.map((a) => 1 + (1 / Math.sqrt(a) - a) * 2 * Tt / (1 + 3 * Tt));
    const Ci = Ai.map((a) => Z * Rt * a * Co);
    const Qi = Ci.map((c, i) => c * Wsup[i]);
    const Pi = Qi.map((q, i) => q - (Qi[i + 1] || 0));
    setVar(ctx, 'alpha_i', math.matrix(al)); setVar(ctx, 'Ai', math.matrix(Ai)); setVar(ctx, 'Ci', math.matrix(Ci));
    setVar(ctx, 'Qi', vecU(Qi, 'kN')); setVar(ctx, 'Pi', vecU(Pi, 'kN')); setVar(ctx, 'Rt', Rt); setVar(ctx, 'Qb', math.unit(Qi[0], 'kN'));
    setVar(ctx, 'Wi', vecU(Wsup, 'kN'));

    // ---- dibujo: edificio + Ai + Ci + Qi ----
    const W = 760, Hh = 330, top = 34, bot = 40, plotH = Hh - top - bot;
    const yAt = (z) => top + plotH * (1 - z / Ht);
    const lev = [0]; h.forEach((x, i) => lev.push(lev[i] + x));
    let g = '';
    // edificio
    const bx = 30, bw = 120;
    g += `<rect x="${bx - 10}" y="${yAt(0)}" width="${bw + 20}" height="6" fill="url(#hatchj)"/>`;
    for (let i = 0; i < n; i++) {
      const y1 = yAt(lev[i + 1]), y0 = yAt(lev[i]);
      g += `<rect x="${bx}" y="${y1.toFixed(1)}" width="${bw}" height="${(y0 - y1).toFixed(1)}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1"/>`;
      g += Lne(bx + bw / 3, y1, bx + bw / 3, y0, C.axis, 0.6, '3 2') + Lne(bx + 2 * bw / 3, y1, bx + 2 * bw / 3, y0, C.axis, 0.6, '3 2');
      g += T(bx + bw / 2, (y0 + y1) / 2 + 4, `${i + 1}F  w=${f2(w[i], 0)} kN`, { fs: 9.5 });
      g += Lne(bx - 6, y1, bx + bw + 6, y1, C.ink, 2);
    }
    g += T(bx + bw / 2, top - 14, 'Edificio', { fs: 11, b: 1 });
    g += T(bx + bw / 2, Hh - 12, `H = ${f2(Ht, 2)} m · T = ${f2(Tt, 3)} s`, { fs: 9.5, c: C.axis });
    // paneles
    const panel = (x0, pw, vals, max, col, colF, title, fmt, ref) => {
      let s = '';
      const X = (v) => x0 + pw * v / max;
      niceTicks(0, max, 4).forEach((t) => { s += Lne(X(t), top, X(t), yAt(0), C.grid, 0.7) + T(X(t), yAt(0) + 13, f2(t, max < 2 ? 2 : max < 20 ? 1 : 0), { fs: 8.5, c: C.axis }); });
      if (ref !== undefined) s += Lne(X(ref), top, X(ref), yAt(0), C.axis, 1, '4 3');
      let path = `M${X(0)},${yAt(0)}`;
      for (let i = 0; i < n; i++) {
        const y0 = yAt(lev[i]), y1 = yAt(lev[i + 1]), xv = X(vals[i]);
        s += `<rect x="${x0}" y="${y1.toFixed(1)}" width="${(xv - x0).toFixed(1)}" height="${(y0 - y1).toFixed(1)}" fill="${colF}"/>`;
        path += ` L${xv.toFixed(1)},${y0.toFixed(1)} L${xv.toFixed(1)},${y1.toFixed(1)}`;
        s += T(Math.min(xv + 3, x0 + pw - 2), (y0 + y1) / 2 + 3, fmt(vals[i]), { fs: 9, a: xv + 40 > x0 + pw ? 'end' : 'start', c: col, b: 1 });
      }
      path += ` L${X(0)},${yAt(Ht)}`;
      s += `<path d="${path}" fill="none" stroke="${col}" stroke-width="2"/>`;
      s += Lne(x0, top, x0, yAt(0), C.ink, 1) + Lne(x0, yAt(0), x0 + pw, yAt(0), C.ink, 1);
      s += T(x0 + pw / 2, top - 14, title, { fs: 11, b: 1 });
      return s;
    };
    const maxA = Math.max(...Ai) * 1.25, maxC = Math.max(...Ci) * 1.3, maxQ = Math.max(...Qi) * 1.25;
    g += panel(190, 150, Ai, maxA, C.blue, C.blueF, 'Aᵢ', (v) => f2(v, 3), 1);
    g += panel(380, 150, Ci, maxC, C.green, C.greenF, 'Cᵢ = Z·Rt·Aᵢ·Co', (v) => f2(v, 3));
    g += panel(570, 170, Qi, maxQ, C.red, C.redF, 'Qᵢ [kN]', (v) => f2(v, 0));
    g += T(475, Hh - 12, `Z = ${f2(Z, 2)} · Tc = ${f2(Tc, 2)} s · Rt = ${f2(Rt, 3)} · Co = ${f2(Co, 2)} · Q₁ = ${f2(Qi[0], 1)} kN`, { fs: 9.5, c: C.axis });
    const defs = `<defs><pattern id="hatchj" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="1"/></pattern></defs>`;
    let tb = '<table class="tbl"><thead><tr><th>Piso</th><th>w<sub>i</sub> [kN]</th><th>ΣW<sub>i</sub> [kN]</th><th>α<sub>i</sub></th><th>A<sub>i</sub></th><th>C<sub>i</sub></th><th>Q<sub>i</sub> [kN]</th><th>P<sub>i</sub> [kN]</th></tr></thead><tbody>';
    for (let i = n - 1; i >= 0; i--) tb += `<tr><td>${i + 1}</td><td>${f2(w[i], 1)}</td><td>${f2(Wsup[i], 1)}</td><td>${f2(al[i], 3)}</td><td>${f2(Ai[i], 3)}</td><td>${f2(Ci[i], 3)}</td><td>${f2(Qi[i], 1)}</td><td>${f2(Pi[i], 1)}</td></tr>`;
    tb += '</tbody></table>';
    return `<div class="figure">${svgWrap(W, Hh, defs + g)}${caption(ctx, b.titulo || 'Distribución en altura del coeficiente Aᵢ, del coeficiente de corte Cᵢ y del cortante de entrepiso Qᵢ (BSL)')}</div><div class="figure">${tb}</div>`;
  },
});

// ---------------------------------------------------------------------
//  2) Capacidad lateral última: Qu ≥ Qun por piso (Order Art. 82-3)
// ---------------------------------------------------------------------
registerBlock('qunqu', {
  name: 'Qu vs Qun por piso (Japón)', icon: 'quake', group: 'Sismo',
  fields: [
    F('Qu', 'Resistencia lateral última Qu por piso (kN), 1.º → último', 'Qu', 'text'),
    F('Qun', 'Resistencia requerida Qun = Ds·Fes·Qud (kN)', 'Qun', 'text'),
    F('titulo', 'Título', ''),
  ],
  hint: 'Compara la resistencia lateral última (holding capacity) con la requerida en cada entrepiso. Exporta <code>QuQun</code> (vector Qu/Qun) y <code>rmin</code>; agrega una verificación por piso.',
  def: { Qu: 'Qu', Qun: 'Qun' },
  render(b, ctx) {
    const S = ctx.scope;
    const qu = evalVec(b.Qu, S, 'kN', 'Qu'), qn = evalVec(b.Qun, S, 'kN', 'Qun');
    if (qu.length !== qn.length) throw new Error('Qu y Qun deben tener el mismo número de pisos');
    if (qn.some((x) => !(x > 0))) throw new Error('Qun debe ser mayor que cero en todos los pisos');
    const n = qu.length, r = qu.map((q, i) => q / qn[i]);
    setVar(ctx, 'QuQun', math.matrix(r)); setVar(ctx, 'rmin', Math.min(...r));
    for (let i = 0; i < n; i++) ctx.checks.push({ ok: r[i] >= 1, label: `Piso ${i + 1}: Qu = ${f2(qu[i], 0)} kN ≥ Qun = ${f2(qn[i], 0)} kN (Order Art. 82-3)`, ratio: qn[i] / qu[i], block: ctx.blockId });
    const W = 720, rowH = Math.max(34, Math.min(52, 260 / n)), top = 30, H = top + rowH * n + 46, x0 = 70, pw = 520;
    const max = Math.max(...qu, ...qn) * 1.12;
    const X = (v) => x0 + pw * v / max;
    let g = '';
    niceTicks(0, max, 6).forEach((t) => { g += Lne(X(t), top - 6, X(t), top + rowH * n, C.grid, 0.7) + T(X(t), top + rowH * n + 14, f2(t, 0), { fs: 9, c: C.axis }); });
    for (let k = 0; k < n; k++) {
      const i = n - 1 - k, y = top + k * rowH, ok = r[i] >= 1;
      g += T(x0 - 10, y + rowH / 2 + 4, `${i + 1}F`, { fs: 11, a: 'end', b: 1 });
      g += `<rect x="${x0}" y="${(y + rowH * 0.14).toFixed(1)}" width="${(X(qu[i]) - x0).toFixed(1)}" height="${(rowH * 0.36).toFixed(1)}" fill="${C.blue}" opacity="0.85"/>`;
      g += `<rect x="${x0}" y="${(y + rowH * 0.52).toFixed(1)}" width="${(X(qn[i]) - x0).toFixed(1)}" height="${(rowH * 0.32).toFixed(1)}" fill="${C.redF}" stroke="${C.red}" stroke-width="1"/>`;
      g += Lne(X(qn[i]), y + 2, X(qn[i]), y + rowH - 2, C.red, 1.6, '4 2');
      g += T(Math.max(X(qu[i]), X(qn[i])) + 6, y + rowH / 2 + 4, `Qu/Qun = ${f2(r[i], 2)} ${ok ? '✔' : '✘'}`, { fs: 10, a: 'start', c: ok ? C.green : C.red, b: 1 });
    }
    g += Lne(x0, top - 6, x0, top + rowH * n, C.ink, 1) + Lne(x0, top + rowH * n, x0 + pw, top + rowH * n, C.ink, 1);
    g += T(x0 + pw / 2, top + rowH * n + 32, 'Cortante de entrepiso [kN]', { fs: 11 });
    g += `<rect x="${x0 + 4}" y="6" width="14" height="10" fill="${C.blue}"/>` + T(x0 + 22, 15, 'Qu (resistencia lateral última)', { fs: 10, a: 'start' });
    g += `<rect x="${x0 + 240}" y="6" width="14" height="10" fill="${C.redF}" stroke="${C.red}"/>` + T(x0 + 258, 15, 'Qun = Ds·Fes·Qud (requerida)', { fs: 10, a: 'start' });
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Resistencia lateral última Qu frente a la requerida Qun por entrepiso')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  3) Cantidad de muros + yonbun-wari (Order Art. 46; Notif. 1352)
// ---------------------------------------------------------------------
registerBlock('kaberyo', {
  name: 'Muros de casa de madera (壁量 / 4分割)', icon: 'wall', group: 'Madera',
  fields: [
    F('Lx', 'Largo de la planta en X (m)', '10.92', 'text'),
    F('Ly', 'Ancho de la planta en Y (m)', '7.28', 'text'),
    F('muros', 'Muros: x1 y1 x2 y2 multiplicador (uno por línea, m)', '0 0 2.73 0 2.5', 'area'),
    F('coef', 'Longitud requerida por sismo (cm/m²)', '33', 'text'),
    F('coefLado', 'Requerida en las franjas laterales (cm/m²)', '', 'text'),
    F('titulo', 'Título', ''),
  ],
  hint: 'Cada muro es un segmento horizontal (resiste X) o vertical (resiste Y) con su multiplicador de muro (壁倍率). Calcula longitudes efectivas y el balance por cuartos (yonbun-wari, Notif. 1352). Exporta <code>LeX, LeY, rX1, rX2, rY1, rY2, bX, bY</code>.',
  def: { Lx: '10.92', Ly: '7.28', muros: '0 0 2.73 0 2.5', coef: '33' },
  render(b, ctx) {
    const S = ctx.scope;
    const Lx = evalParam(b.Lx, S, 'm', 10), Ly = evalParam(b.Ly, S, 'm', 7);
    if (!(Lx > 0 && Ly > 0)) throw new Error('Las dimensiones de la planta deben ser positivas');
    const cf = evalParam(b.coef, S, 'cm/m^2', 33), cl = evalParam(b.coefLado, S, 'cm/m^2', cf);
    const ws = [];
    for (const raw of String(b.muros || '').split('\n')) {
      const ln = raw.split('//')[0].trim(); if (!ln) continue;
      const t = ln.split(/\s+/).map((x) => evalParam(x, S, 'm'));
      if (t.length !== 5 || t.some((x) => !isFinite(x))) throw new Error('Muro mal definido: «' + raw + '» (x1 y1 x2 y2 multiplicador)');
      const [x1, y1, x2, y2, k] = t;
      const dir = Math.abs(y1 - y2) < 1e-6 ? 'X' : Math.abs(x1 - x2) < 1e-6 ? 'Y' : null;
      if (!dir) throw new Error('El muro «' + raw + '» debe ser horizontal o vertical');
      if (!(k > 0 && k <= 5)) throw new Error('Multiplicador de muro fuera de rango (0 < k ≤ 5): ' + raw);
      ws.push({ x1, y1, x2, y2, k, dir, L: Math.hypot(x2 - x1, y2 - y1) });
    }
    if (!ws.length) throw new Error('Defina al menos un muro');
    const eff = (f) => ws.filter(f).reduce((a, m) => a + m.k * m.L, 0);
    const tol = 1e-6;
    const LeX = eff((m) => m.dir === 'X'), LeY = eff((m) => m.dir === 'Y');
    // franjas: X → bandas inferior/superior (y), Y → bandas izquierda/derecha (x)
    const eX1 = eff((m) => m.dir === 'X' && m.y1 <= Ly / 4 + tol), eX2 = eff((m) => m.dir === 'X' && m.y1 >= 3 * Ly / 4 - tol);
    const eY1 = eff((m) => m.dir === 'Y' && m.x1 <= Lx / 4 + tol), eY2 = eff((m) => m.dir === 'Y' && m.x1 >= 3 * Lx / 4 - tol);
    const reqS = Lx * Ly / 4 * cl / 100; // m
    const rX1 = eX1 / reqS, rX2 = eX2 / reqS, rY1 = eY1 / reqS, rY2 = eY2 / reqS;
    const bal = (a, c) => (Math.max(a, c) > 0 ? Math.min(a, c) / Math.max(a, c) : 0);
    const bX = bal(rX1, rX2), bY = bal(rY1, rY2);
    setVar(ctx, 'LeX', math.unit(LeX, 'm')); setVar(ctx, 'LeY', math.unit(LeY, 'm'));
    setVar(ctx, 'rX1', rX1); setVar(ctx, 'rX2', rX2); setVar(ctx, 'rY1', rY1); setVar(ctx, 'rY2', rY2); setVar(ctx, 'bX', bX); setVar(ctx, 'bY', bY);
    const okX = (rX1 > 1 && rX2 > 1) || bX >= 0.5, okY = (rY1 > 1 && rY2 > 1) || bY >= 0.5;
    ctx.checks.push({ ok: okX, label: `Balance yonbun-wari en X: ${rX1 > 1 && rX2 > 1 ? 'ambas franjas con suficiencia > 1' : 'relación de suficiencia ≥ 0.5'} (Notif. 1352)`, ratio: rX1 > 1 && rX2 > 1 ? 1 / Math.min(rX1, rX2) : (bX > 0 ? 0.5 / bX : null), block: ctx.blockId });
    ctx.checks.push({ ok: okY, label: `Balance yonbun-wari en Y: ${rY1 > 1 && rY2 > 1 ? 'ambas franjas con suficiencia > 1' : 'relación de suficiencia ≥ 0.5'} (Notif. 1352)`, ratio: rY1 > 1 && rY2 > 1 ? 1 / Math.min(rY1, rY2) : (bY > 0 ? 0.5 / bY : null), block: ctx.blockId });

    // ---- dibujo de planta ----
    const W = 720, H = 420, pad = 60, sc = Math.min((W - 2 * pad - 190) / Lx, (H - 2 * pad) / Ly);
    const ox = pad, oy = H - pad;
    const P = (x, y) => [ox + x * sc, oy - y * sc];
    let g = '';
    const [ax, ay] = P(0, Ly), [bx2, by2] = P(Lx, 0);
    g += `<rect x="${ax}" y="${ay}" width="${bx2 - ax}" height="${by2 - ay}" fill="#fbfcfe" stroke="${C.axis}" stroke-width="1"/>`;
    // franjas laterales sombreadas
    const band = (x, y, w, h, c) => { const [p, q] = P(x, y + h); return `<rect x="${p}" y="${q}" width="${w * sc}" height="${h * sc}" fill="${c}"/>`; };
    g += band(0, 0, Lx, Ly / 4, 'rgba(31,111,235,.07)') + band(0, 3 * Ly / 4, Lx, Ly / 4, 'rgba(31,111,235,.07)');
    g += band(0, 0, Lx / 4, Ly, 'rgba(212,115,12,.07)') + band(3 * Lx / 4, 0, Lx / 4, Ly, 'rgba(212,115,12,.07)');
    for (const f of [0.25, 0.75]) {
      const [p1, q1] = P(0, Ly * f), [p2] = P(Lx, Ly * f); g += Lne(p1, q1, p2, q1, C.blue, 0.8, '5 4');
      const [p3, q3] = P(Lx * f, 0), [, q4] = P(Lx * f, Ly); g += Lne(p3, q3, p3, q4, C.orange, 0.8, '5 4');
    }
    for (const m of ws) {
      const [p1, q1] = P(m.x1, m.y1), [p2, q2] = P(m.x2, m.y2);
      const col = m.dir === 'X' ? C.blue : C.orange;
      g += `<line x1="${p1}" y1="${q1}" x2="${p2}" y2="${q2}" stroke="${col}" stroke-width="${3 + m.k}" stroke-linecap="butt" opacity="0.85"/>`;
      g += T((p1 + p2) / 2 + (m.dir === 'Y' ? 12 : 0), (q1 + q2) / 2 + (m.dir === 'X' ? -7 : 3), f2(m.k, 1), { fs: 8.5, c: col, a: m.dir === 'Y' ? 'start' : 'middle' });
    }
    g += T((ax + bx2) / 2, by2 + 22, `Lx = ${f2(Lx, 2)} m`, { fs: 10 }) + T(ax - 22, (ay + by2) / 2, `Ly = ${f2(Ly, 2)} m`, { fs: 10, r: -90 });
    const lx = bx2 + 46; let ly = ay + 6;
    const row = (s, c, bb) => { g += T(lx, ly, s, { fs: 10, a: 'start', c: c || C.ink, b: bb }); ly += 16; };
    row('Muros en X (azul)', C.blue, 1); row(`Le,X = ${f2(LeX, 2)} m`); row(`Franja inf.: ${f2(rX1, 2)}`); row(`Franja sup.: ${f2(rX2, 2)}`); row(`Balance: ${f2(bX, 2)} ${okX ? '✔' : '✘'}`, okX ? C.green : C.red, 1); ly += 8;
    row('Muros en Y (naranja)', C.orange, 1); row(`Le,Y = ${f2(LeY, 2)} m`); row(`Franja izq.: ${f2(rY1, 2)}`); row(`Franja der.: ${f2(rY2, 2)}`); row(`Balance: ${f2(bY, 2)} ${okY ? '✔' : '✘'}`, okY ? C.green : C.red, 1); ly += 8;
    row('Valores = suficiencia de franja', C.axis); row('(longitud efectiva / requerida)', C.axis);
    let tb = '<table class="tbl"><thead><tr><th>Franja (1/4)</th><th>Área [m²]</th><th>Requerida [m]</th><th>Efectiva [m]</th><th>Suficiencia</th></tr></thead><tbody>';
    [['X — inferior', eX1, rX1], ['X — superior', eX2, rX2], ['Y — izquierda', eY1, rY1], ['Y — derecha', eY2, rY2]].forEach(([nm, e, rr]) => { tb += `<tr><td>${esc(nm)}</td><td>${f2(Lx * Ly / 4, 2)}</td><td>${f2(reqS, 2)}</td><td>${f2(e, 2)}</td><td>${f2(rr, 2)}</td></tr>`; });
    tb += '</tbody></table>';
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Planta con muros resistentes (grosor ∝ multiplicador) y franjas laterales de 1/4 (yonbun-wari)')}</div><div class="figure">${tb}</div>`;
  },
});

// ---------------------------------------------------------------------
//  4) Sección de concreto armado con barras JIS (n-Dxx)
// ---------------------------------------------------------------------
const DBAR = { 10: 9.53, 13: 12.7, 16: 15.9, 19: 19.1, 22: 22.2, 25: 25.4, 29: 28.6, 32: 31.8, 35: 34.9, 38: 38.1, 41: 41.3 };
function parseD(str, S, what) {
  const s = interpTxt(str, S).trim();
  if (!s || s === '0') return null;
  const m = /^(\d+)\s*-\s*D(\d+)$/i.exec(s);
  if (!m || !DBAR[+m[2]]) throw new Error(`${what}: use el formato «n-Dxx» (p. ej. 4-D25)`);
  const n = +m[1]; if (n < 1 || n > 20) throw new Error(`${what}: número de barras fuera de rango`);
  return { n, d: DBAR[+m[2]], lab: `${n}-D${m[2]}` };
}
function interpTxt(str, S) { return String(str || '').replace(/\{([^{}]+)\}/g, (m, e) => { try { const v = math.evaluate(e.trim(), new Map(S)); return typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : v.toString(); } catch (err) { return m; } }); }
registerBlock('secjp', {
  name: 'Sección C°A° con barras JIS', icon: 'section', group: 'Concreto',
  fields: [
    F('b', 'Ancho b (mm)', '400'), F('D', 'Peralte total D (mm)', '700'), F('dt', 'Recubrimiento al eje de barras dt (mm)', '60'),
    F('tipo', 'Tipo', 'viga', 'select', ['viga', 'columna']),
    F('sup', 'Barras superiores (viga) o por cara (columna)', '4-D25'), F('inf', 'Barras inferiores (viga)', '3-D25'),
    F('est', 'Estribos / zunchos (texto)', '2-D10@150'), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja una sección rectangular con barras corrugadas JIS. En columnas, «sup» es el número de barras por cara (armadura simétrica). Use {expr} para valores del scope.',
  def: { b: '400', D: '700', dt: '60', tipo: 'viga', sup: '4-D25', inf: '3-D25', est: '2-D10@150' },
  render(b, ctx) {
    const S = ctx.scope;
    const bw = evalParam(b.b, S, 'mm', 400), D = evalParam(b.D, S, 'mm', 700), dt = evalParam(b.dt, S, 'mm', 60);
    if (!(bw > 0 && D > 0 && dt > 0) || 2 * dt >= Math.min(bw, D)) throw new Error('Dimensiones de la sección no válidas');
    const col = b.tipo === 'columna';
    const top = parseD(b.sup, S, 'Barras superiores'), bot = col ? top : parseD(b.inf, S, 'Barras inferiores');
    const W = 440, H = 380, sc = Math.min(250 / bw, 290 / D), ox = (W - bw * sc) / 2 - 20, oy = 30;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    let g = `<rect x="${X(0)}" y="${Y(0)}" width="${bw * sc}" height="${D * sc}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    const r0 = dt - 14;
    g += `<rect x="${X(r0)}" y="${Y(r0)}" width="${(bw - 2 * r0) * sc}" height="${(D - 2 * r0) * sc}" rx="${8 * sc}" fill="none" stroke="${C.steel}" stroke-width="${Math.max(1.2, 10 * sc)}"/>`;
    const dot = (cx, cy, d) => `<circle cx="${X(cx).toFixed(1)}" cy="${Y(cy).toFixed(1)}" r="${Math.max(2.5, d / 2 * sc).toFixed(1)}" fill="${C.steel}"/>`;
    const row = (br, y) => { if (!br) return; for (let i = 0; i < br.n; i++) g += dot(br.n === 1 ? bw / 2 : dt + (bw - 2 * dt) * i / (br.n - 1), y, br.d); };
    row(top, dt); row(bot, D - dt);
    if (col && top && top.n > 2) for (let i = 1; i < top.n - 1; i++) { const y = dt + (D - 2 * dt) * i / (top.n - 1); g += dot(dt, y, top.d) + dot(bw - dt, y, top.d); }
    const lab = (t, y) => { g += T(X(bw) + 14, Y(y) + 4, t, { a: 'start', fs: 11, b: 1 }) + Lne(X(bw) - 2, Y(y), X(bw) + 12, Y(y), C.axis, 0.7); };
    if (col) { if (top) lab(`${top.lab} por cara (total ${4 * top.n - 4})`, dt); }
    else { if (top) lab(top.lab, dt); if (bot) lab(bot.lab, D - dt); }
    g += Lne(X(0), Y(D) + 22, X(bw), Y(D) + 22, C.ink, 0.8) + T(X(bw / 2), Y(D) + 18, `b = ${f2(bw, 0)} mm`, { fs: 10 });
    g += Lne(X(0) - 22, Y(0), X(0) - 22, Y(D), C.ink, 0.8) + T(X(0) - 27, Y(D / 2), `D = ${f2(D, 0)} mm`, { fs: 10, r: -90 });
    g += Lne(X(0) - 26, Y(0), X(0) - 18, Y(0), C.ink, 0.8) + Lne(X(0) - 26, Y(D), X(0) - 18, Y(D), C.ink, 0.8);
    g += T(X(bw / 2), Y(D) + 46, `${col ? 'Zunchos' : 'Estribos'} ${interpTxt(b.est, S)} · dt = ${f2(dt, 0)} mm`, { fs: 10, c: C.axis });
    return `<div class="figure fig-sm">${svgWrap(W, H, g)}${caption(ctx, b.titulo || 'Sección transversal')}</div>`;
  },
});
