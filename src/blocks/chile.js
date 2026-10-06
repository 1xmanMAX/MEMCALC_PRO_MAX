// =====================================================================
//  Bloques gráficos — módulo «chile»
//   spectrumCL : espectro de diseño NCh433+DS61 / NCh2369 (Of2003 y 2023/2025)
//   muroCL     : sección de muro de H.A., eje neutro y elementos de borde (DS60)
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, math, esc } from '../engine.js';
import { C, T, Lne, svgWrap, dimH, niceTicks, caption, setVar, pos, f2 } from '../blocks.js';

const SOIL = ['A', 'B', 'C', 'D', 'E'];
const S433 = { S: [0.90, 1.00, 1.05, 1.20, 1.30], To: [0.15, 0.30, 0.40, 0.75, 1.20], Tp: [0.20, 0.35, 0.45, 0.85, 1.35], n: [1.00, 1.33, 1.40, 1.80, 1.80], p: [2.0, 1.5, 1.6, 1.0, 1.0] };
const alpha = (T, To, p) => (1 + 4.5 * (T / To) ** p) / (1 + (T / To) ** 3);
const fn = (name, ...a) => math[name](...a);   // funciones registradas por src/norms/chile.js

function evalSoil(str, S, def) {
  if (str === undefined || String(str).trim() === '') return def;
  const v = math.evaluate(String(str), new Map(S));
  if (typeof v === 'string') { const k = SOIL.indexOf(v.trim().toUpperCase()); if (k < 0) throw new Error('Suelo inválido: ' + v); return k + 1; }
  return Math.round(Number(v));
}

// ---------------------------------------------------------------------
//  Espectro de diseño chileno
// ---------------------------------------------------------------------
registerBlock('spectrumCL', {
  name: 'Espectro NCh433 / NCh2369', icon: 'spectrum', group: 'Sismo',
  fields: [
    F('norma', 'Norma', 'NCh433', 'select', ['NCh433', 'NCh2369', 'NCh2369:2023']),
    F('zona', 'Zona sísmica (1, 2, 3)', 'zona'), F('suelo', 'Suelo (NCh433: 1=A…5=E · NCh2369.Of2003: 1=I…4=IV)', 'suelo'),
    F('I', 'Coeficiente de importancia I', 'I'), F('R', 'Ro (NCh433) o R (NCh2369)', 'Ro'),
    F('xi', 'Amortiguamiento ξ (solo NCh2369)', '0.05'), F('T', 'Periodo de la estructura T* [s]', 'Tx'),
    F('comparar', 'Comparar suelos A–E (NCh433)', '', 'check'), F('elastico', 'Mostrar espectro elástico', '', 'check'),
    F('tmax', 'Periodo máximo del gráfico [s]', '3'), F('titulo', 'Título', ''),
  ],
  hint: 'Dibuja el espectro de diseño Sa/g. NCh433+DS61: Sa = S·Ao·α/(R*/I) con R* según T*; NCh2369.Of2003: Sa = 2.75·Ao·I/R·(T\'/T)^n·(0.05/ξ)^0.4 ≤ I·Cmax. Exporta <b>Sa_T</b> (Sa/g en T*), <b>alpha_T</b> y <b>Rs</b> (R* o R).',
  def: { norma: 'NCh433', zona: '3', suelo: '3', I: '1', R: '11', xi: '0.05', T: '0.5', tmax: '3', comparar: false, elastico: true },
  render(b, ctx) {
    const S = ctx.scope, norma = b.norma || 'NCh433';
    const z = Math.round(evalParam(b.zona, S, '', 3)); const Ao = fn('AoNCh433', z);
    const soil = evalSoil(b.suelo, S, 3), I = evalParam(b.I, S, '', 1), R = evalParam(b.R, S, '', norma === 'NCh433' ? 11 : 3);
    const xi = evalParam(b.xi, S, '', 0.05), Ts = evalParam(b.T, S, 's', 0), Tmax = Math.max(0.5, evalParam(b.tmax, S, 's', 3));
    pos({ I, R });
    const ts = Array.from({ length: 361 }, (_, i) => Math.max(1e-4, Tmax * i / 360));
    const series = []; let Rs = R, sub = '';
    if (norma === 'NCh433') {
      const k = soil - 1; if (!(k >= 0 && k <= 4)) throw new Error('Suelo NCh433: 1 = A … 5 = E');
      Rs = Ts > 0 ? fn('RstarNCh433', math.unit(Ts, 's'), math.unit(S433.To[k], 's'), R) : R;
      const sa = (t, kk) => S433.S[kk] * Ao * I * alpha(t, S433.To[kk], S433.p[kk]);
      if (b.comparar) SOIL.forEach((s, kk) => { if (kk !== k) series.push({ n: 'Suelo ' + s + ' (diseño)', y: ts.map(t => sa(t, kk) / Rs), c: ['#8250df', '#0a7e8c', C.orange, '#6e7781', '#bf3989'][kk], w: 1.2, dash: '5 3' }); });
      if (b.elastico) series.push({ n: 'Elástico S·Ao·α·I', y: ts.map(t => sa(t, k)), c: C.axis, w: 1.4, dash: '6 3' });
      series.push({ n: `Diseño suelo ${SOIL[k]} (R* = ${f2(Rs)})`, y: ts.map(t => sa(t, k) / Rs), c: C.blue, w: 2.2, fill: true, main: true });
      sub = `NCh433+DS61 · zona ${z} (Ao = ${f2(Ao)} g) · suelo ${SOIL[k]} · I = ${f2(I)} · Ro = ${f2(R)}`;
    } else if (norma === 'NCh2369') {
      const Tp = fn('TpNCh2369', soil), n = fn('nNCh2369', soil);
      const cap = I * fn('CmaxNCh2369', R, xi, Ao);
      if (b.elastico) series.push({ n: 'Sin límite I·Cmax', y: ts.map(t => 2.75 * Ao * I / R * (Tp.toNumber('s') / t) ** n * (0.05 / xi) ** 0.4), c: C.axis, w: 1.2, dash: '6 3', clip: true });
      series.push({ n: `Diseño suelo ${['I', 'II', 'III', 'IV'][soil - 1]} (R = ${f2(R)}, ξ = ${f2(xi, 3)})`, y: ts.map(t => fn('SaNCh2369', math.unit(t, 's'), Tp, n, Ao, I, R, xi)), c: C.blue, w: 2.2, fill: true, main: true });
      series.push({ n: 'I·Cmax = ' + f2(cap, 3), y: ts.map(() => cap), c: C.red, w: 1, dash: '3 3' });
      sub = `NCh2369.Of2003 · zona ${z} (Ao = ${f2(Ao)} g) · I = ${f2(I)}`;
    } else {
      if (b.elastico) series.push({ n: 'Referencia SaH = 1.4·S·Ao·α', y: ts.map(t => 1.4 * S433.S[soil - 1] * Ao * alpha(t, [0.15, 0.30, 0.40, 0.75][soil - 1], [1.85, 1.60, 1.50, 1.00][soil - 1])), c: C.axis, w: 1.2, dash: '6 3' });
      series.push({ n: `Diseño suelo ${SOIL[soil - 1]} (R = ${f2(R)}, ξ = ${f2(xi, 3)})`, y: ts.map(t => fn('SaNCh2369v23', math.unit(t, 's'), soil, Ao, I, R, xi)), c: C.blue, w: 2.2, fill: true, main: true });
      sub = `NCh2369:2023 (oficial como NCh2369:2025) · zona ${z} · I = ${f2(I)}`;
    }
    const main = series.find(s => s.main);
    const W = 680, H = 320, pl = 62, pr = 18, pt = 18, pb = 42;
    const ymax = Math.max(...series.filter(s => !s.clip).flatMap(s => s.y), ...main.y) * 1.15;
    const X = (t) => pl + t / Tmax * (W - pl - pr), Y = (v) => pt + (1 - Math.min(v, ymax) / ymax) * (H - pt - pb);
    let g = '';
    niceTicks(0, Tmax, 8).forEach(t => { g += Lne(X(t), pt, X(t), H - pb, C.grid, 0.7) + T(X(t), H - pb + 14, f2(t, 2), { fs: 9, c: C.axis }); });
    niceTicks(0, ymax, 5).forEach(t => { g += Lne(pl, Y(t), W - pr, Y(t), C.grid, 0.7) + T(pl - 6, Y(t) + 3, f2(t, 3), { fs: 9, c: C.axis, a: 'end' }); });
    for (const s of series) {
      const d = ts.map((t, i) => (i ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(s.y[i]).toFixed(1)).join(' ');
      if (s.fill) g += `<path d="${d} L${X(Tmax)},${Y(0)} L${X(0)},${Y(0)} Z" fill="${C.blueF}" stroke="none"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
    }
    let SaT = null;
    if (Ts > 0 && Ts <= Tmax * 1.5) {
      if (norma === 'NCh433') { const k = soil - 1; SaT = S433.S[k] * Ao * I * alpha(Ts, S433.To[k], S433.p[k]) / Rs; setVar(ctx, 'alpha_T', alpha(Ts, S433.To[k], S433.p[k])); }
      else if (norma === 'NCh2369') SaT = fn('SaNCh2369', math.unit(Ts, 's'), fn('TpNCh2369', soil), fn('nNCh2369', soil), Ao, I, R, xi);
      else SaT = fn('SaNCh2369v23', math.unit(Ts, 's'), soil, Ao, I, R, xi);
      const xT = X(Math.min(Ts, Tmax));
      g += Lne(xT, Y(0), xT, Y(SaT), C.red, 1.4, '3 2') + `<circle cx="${xT.toFixed(1)}" cy="${Y(SaT).toFixed(1)}" r="4.5" fill="${C.red}"/>`;
      const right = xT > W - 230;
      g += T(xT + (right ? -8 : 8), Y(SaT) - 9, `T* = ${f2(Ts, 3)} s → Sa/g = ${f2(SaT, 4)}`, { fs: 10.5, a: right ? 'end' : 'start', c: C.red, b: 1 });
      setVar(ctx, 'Sa_T', SaT);
    }
    setVar(ctx, 'Rs', Rs);
    g += Lne(pl, Y(0), W - pr, Y(0)) + Lne(pl, pt, pl, H - pb);
    g += T((pl + W - pr) / 2, H - 6, 'Periodo T [s]', { fs: 11 }) + T(16, (pt + H - pb) / 2, 'Sa / g', { fs: 11, r: -90 });
    const leg = '<div class="legend">' + series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('') + '</div>';
    return `<div class="figure">${svgWrap(W, H, g)}${leg}${caption(ctx, b.titulo || 'Espectro de diseño — ' + sub)}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Muro de hormigón armado: sección, eje neutro y elementos de borde
// ---------------------------------------------------------------------
const AREA = (d) => Math.PI * d * d / 4;   // mm → mm²
function beta1(fc) { return fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7); }
// bars: [{y (mm desde el borde comprimido), A (mm²)}]; P en N (compresión +). Devuelve {c, Mn (N·mm)}
function wallSection(lw, tw, fc, fy, bars, P) {
  const Es = 200000, ecu = 0.003, b1 = beta1(fc);
  const force = (c) => {
    const a = Math.min(b1 * c, lw); let N = 0.85 * fc * a * tw, M = N * (lw / 2 - a / 2);
    for (const r of bars) {
      const es = ecu * (c - r.y) / c; let fs = Math.max(-fy, Math.min(fy, Es * es));
      if (r.y < a) fs -= 0.85 * fc;   // descuenta hormigón desplazado
      N += fs * r.A; M += fs * r.A * (lw / 2 - r.y);
    }
    return { N, M };
  };
  let lo = 1e-3 * lw, hi = 50 * lw;
  if (force(hi).N < P) throw new Error('Carga axial mayor que la resistencia a compresión pura del muro');
  if (force(lo).N > P) throw new Error('Tracción axial excede la capacidad del refuerzo');
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (force(m).N > P) hi = m; else lo = m; }
  const c = (lo + hi) / 2; return { c, Mn: force(c).M, b1 };
}

registerBlock('muroCL', {
  name: 'Muro H.A. — elementos de borde (DS60)', icon: 'wall', group: 'Concreto',
  fields: [
    F('lw', 'Largo del muro lw', 'lw'), F('e', 'Espesor e', 'e'), F('fc', "f'c", 'fc'), F('fy', 'fy', 'fy'),
    F('nb', 'Barras longitudinales por borde', '6'), F('dbb', 'Diámetro barras de borde [mm]', '18'), F('lb', 'Largo del elemento de borde (zona armada/confinada)', 'lb'),
    F('dbw', 'Malla: diámetro [mm] (2 capas)', '10'), F('sw', 'Malla: espaciamiento vertical', '20 cm'), F('rec', 'Recubrimiento al eje de barras', '4 cm'),
    F('Pu', 'Carga axial mayorada Pu (compresión +)', 'Pu'), F('Mu', 'Momento mayorado Mu', 'Mu'),
    F('du', 'Desplazamiento de diseño δu (para c límite)', 'du'), F('hw', 'Altura del muro hw', 'hw'), F('titulo', 'Título', ''),
  ],
  hint: 'Calcula por compatibilidad de deformaciones (εcu = 0.003, bloque de Whitney) la profundidad del eje neutro <b>c</b> para Pu y el momento nominal <b>Mn</b>; dibuja la sección con los elementos de borde y la zona a confinar <b>cc</b> = c − lw/(600·δu/hw) (DS60 21.9.6.4). Exporta c_w, Mn_w, phiMn_w, eps_t, cc_w, As_borde, rho_borde.',
  def: { lw: '4 m', e: '30 cm', fc: '30 MPa', fy: '420 MPa', nb: '8', dbb: '22', lb: '60 cm', dbw: '10', sw: '20 cm', rec: '4 cm', Pu: '250 tonf', Mu: '900 tonf*m', du: '8 cm', hw: '30 m' },
  render(b, ctx) {
    const S = ctx.scope;
    const lw = evalParam(b.lw, S, 'mm', 4000), tw = evalParam(b.e, S, 'mm', 300), fc = evalParam(b.fc, S, 'MPa', 30), fy = evalParam(b.fy, S, 'MPa', 420);
    const nb = Math.round(evalParam(b.nb, S, '', 8)), dbb = evalParam(b.dbb, S, '', 22), lb = evalParam(b.lb, S, 'mm', 600);
    const dbw = evalParam(b.dbw, S, '', 10), sw = evalParam(b.sw, S, 'mm', 200), rec = evalParam(b.rec, S, 'mm', 40);
    const Pu = evalParam(b.Pu, S, 'N', 0), Mu = b.Mu ? evalParam(b.Mu, S, 'N*mm', 0) : 0;
    const du = b.du ? evalParam(b.du, S, 'mm', 0) : 0, hw = b.hw ? evalParam(b.hw, S, 'mm', 0) : 0;
    pos({ lw, tw, fc, fy, nb, dbb, lb, dbw, sw, rec });
    if (nb < 4 || nb % 2) throw new Error('Use un número par de barras por borde (≥ 4, dos capas)');
    if (2 * lb >= lw) throw new Error('Los elementos de borde se superponen: reduzca lb');
    // barras de borde: nb/2 posiciones en cada capa, desde rec hasta lb − rec
    const nl = nb / 2, bars = [], draw = [];
    const ys = Array.from({ length: nl }, (_, i) => rec + (nl > 1 ? i * (lb - 2 * rec) / (nl - 1) : 0));
    for (const y of ys) for (const side of [y, lw - y]) { bars.push({ y: side, A: 2 * AREA(dbb) }); draw.push({ y: side, d: dbb, t: 'b' }); }
    // malla del alma (dos capas) entre elementos de borde
    const nw = Math.max(0, Math.floor((lw - 2 * lb) / sw) - 1), s0 = (lw - 2 * lb) / (nw + 1);
    for (let i = 1; i <= nw; i++) { const y = lb + i * s0; bars.push({ y, A: 2 * AREA(dbw) }); draw.push({ y, d: dbw, t: 'w' }); }
    const r = wallSection(lw, tw, fc, fy, bars, Pu);
    const c = r.c, Mn = r.Mn, ey = fy / 200000;
    const dt = lw - rec, et = 0.003 * (dt - c) / c;
    const phi = et >= 0.005 ? 0.9 : et <= ey ? 0.65 : 0.65 + 0.25 * (et - ey) / (0.005 - ey);
    const climit = du > 0 && hw > 0 ? lw / (600 * du / hw) : Infinity;
    const cc = Math.max(0, c - climit);
    const As = nb * AREA(dbb);
    setVar(ctx, 'c_w', math.unit(c / 10, 'cm')); setVar(ctx, 'Mn_w', math.unit(Mn / 9.80665e6, 'tonf*m'));
    setVar(ctx, 'phi_w', phi); setVar(ctx, 'phiMn_w', math.unit(phi * Mn / 9.80665e6, 'tonf*m')); setVar(ctx, 'eps_t', et);
    setVar(ctx, 'cc_w', math.unit(cc / 10, 'cm')); setVar(ctx, 'As_borde', math.unit(As / 100, 'cm^2')); setVar(ctx, 'rho_borde', As / (lb * tw));
    if (Mu > 0) ctx.checks.push({ ok: Mu <= phi * Mn, label: 'Flexocompresión del muro Mu ≤ φMn (ACI 318-08 21.9.5)', ratio: Mu / (phi * Mn), block: ctx.blockId });
    // ---- dibujo ----
    const W = 680, H = 222, ml = 30, mr = 30, sc = (W - ml - mr) / lw, ts = Math.max(tw * sc, 26), ox = ml, oy = 92;
    const X = (y) => ox + y * sc, Yt = oy, Yb = oy + ts;
    let g = '';
    g += `<rect x="${X(0)}" y="${Yt}" width="${lw * sc}" height="${ts}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
    // compresión: bloque a
    const a = r.b1 * c;
    g += `<rect x="${X(0)}" y="${Yt}" width="${Math.min(a, lw) * sc}" height="${ts}" fill="rgba(31,111,235,.13)"/>`;
    // elementos de borde
    for (const x0 of [0, lw - lb]) g += `<rect x="${X(x0)}" y="${Yt}" width="${lb * sc}" height="${ts}" fill="url(#hatch)" opacity=".55" stroke="${C.ink}" stroke-width=".8"/>`;
    // zona a confinar requerida
    if (cc > 0) g += `<rect x="${X(0)}" y="${Yt - 6}" width="${cc * sc}" height="${ts + 12}" fill="none" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 3"/>` + T(X(cc / 2), Yt - 10, `cc = ${f2(cc / 10, 1)} cm`, { fs: 10, c: C.red, b: 1 });
    // barras
    for (const d of draw) for (const yy of [Yt + Math.min(rec * sc, ts * 0.28), Yb - Math.min(rec * sc, ts * 0.28)]) g += `<circle cx="${X(d.y).toFixed(1)}" cy="${yy.toFixed(1)}" r="${d.t === 'b' ? 3.2 : 1.8}" fill="${d.t === 'b' ? C.steel : '#57606a'}"/>`;
    // estribos de borde
    for (const x0 of [0, lw - lb]) g += `<rect x="${X(x0 + rec * 0.6)}" y="${Yt + 3}" width="${(lb - 1.2 * rec) * sc}" height="${ts - 6}" fill="none" stroke="${C.green}" stroke-width="1" rx="2"/>`;
    // eje neutro
    g += Lne(X(c), Yt - 26, X(c), Yb + 26, C.blue, 1.5, '6 3') + T(X(c) + 4, Yt - 30, `eje neutro c = ${f2(c / 10, 1)} cm`, { fs: 10.5, a: 'start', c: C.blue, b: 1 });
    if (isFinite(climit) && climit < lw) g += Lne(X(climit), Yt - 14, X(climit), Yb + 14, C.orange, 1.2, '2 2') + T(X(climit) + 4, Yb + 26, `lw/(600·δu/hw) = ${f2(climit / 10, 1)} cm`, { fs: 10, a: 'start', c: C.orange });
    // diagrama de deformaciones
    const ys0 = 38, eEnd = 0.003 * (lw - c) / c, kx = 26 / Math.max(0.003, Math.abs(eEnd));
    g += Lne(X(0), ys0, X(lw), ys0, C.axis, 0.8);
    g += `<path d="M${X(0)},${ys0} L${X(0)},${ys0 - 0.003 * kx} L${X(lw)},${ys0 + eEnd * kx} L${X(lw)},${ys0} Z" fill="rgba(212,115,12,.12)" stroke="${C.orange}"/>`;
    g += T(X(0) + 4, ys0 - 0.003 * kx - 4, 'εcu = 0.003', { fs: 9.5, a: 'start', c: C.orange }) + T(X(lw) - 4, ys0 + eEnd * kx + 12, 'εt = ' + f2(et, 4) + ' (en la barra extrema)', { fs: 9.5, a: 'end', c: C.orange });
    g += T(X(0) + 2, Yb + 40, '← borde comprimido', { fs: 9.5, a: 'start', c: C.axis }) + T(X(lw) - 2, Yb + 40, 'borde traccionado →', { fs: 9.5, a: 'end', c: C.axis });
    g += dimH(X(0), X(lw), Yb + 66, `lw = ${f2(lw / 1000, 2)} m   ·   e = ${f2(tw / 10, 0)} cm   ·   borde ${f2(lb / 10, 0)} cm: ${nb}φ${f2(dbb, 0)}   ·   malla 2φ${f2(dbw, 0)}@${f2(sw / 10, 0)}`);
    const tbl = `<table class="tbl"><thead><tr><th>Pu [tonf]</th><th>c [cm]</th><th>c/lw</th><th>εt</th><th>φ</th><th>Mn [tonf·m]</th><th>φMn [tonf·m]</th>${Mu > 0 ? '<th>Mu [tonf·m]</th>' : ''}</tr></thead><tbody><tr><td>${f2(Pu / 9806.65, 1)}</td><td>${f2(c / 10, 1)}</td><td>${f2(c / lw, 3)}</td><td>${f2(et, 4)}</td><td>${f2(phi, 3)}</td><td>${f2(Mn / 9.80665e6, 1)}</td><td>${f2(phi * Mn / 9.80665e6, 1)}</td>${Mu > 0 ? `<td>${f2(Mu / 9.80665e6, 1)}</td>` : ''}</tr></tbody></table>`;
    return `<div class="figure">${svgWrap(W, H, `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="1"/></pattern></defs>` + g)}${tbl}${caption(ctx, b.titulo || 'Sección del muro, profundidad del eje neutro y elementos de borde (DS60 21.9.6)')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Fuerzas sísmicas por nivel y diagrama de corte de entrepiso
// ---------------------------------------------------------------------
function vecOf(str, S, unit) {
  const v = math.evaluate(String(str), new Map(S));
  const a = (math.isMatrix(v) ? v.toArray() : Array.isArray(v) ? v : [v]).flat(Infinity);
  return a.map(x => (math.isUnit(x) ? x.toNumber(unit) : Number(x)));
}
registerBlock('fuerzasCL', {
  name: 'Fuerzas sísmicas en altura', icon: 'quake', group: 'Sismo',
  fields: [F('Z', 'Alturas de nivel Zk (vector)', 'Zk'), F('F', 'Fuerzas por nivel Fk (vector)', 'Fkx'), F('V', 'Cortes de entrepiso Vk (vector, opcional)', 'Vkx'), F('u', 'Unidad de fuerza', 'tonf'), F('titulo', 'Título', '')],
  hint: 'Dibuja la elevación del edificio con las fuerzas sísmicas Fk aplicadas en cada nivel y el diagrama escalonado de esfuerzos de corte Vk.',
  def: { Z: '[3, 6, 9]', F: '[10, 20, 30]', V: '', u: 'tonf' },
  render(b, ctx) {
    const S = ctx.scope, un = (b.u || 'tonf').trim();
    const Z = vecOf(b.Z, S, 'm'), Fv = vecOf(b.F, S, un);
    let V = b.V ? vecOf(b.V, S, un) : null;
    if (!Z.length || Z.length !== Fv.length) throw new Error('Zk y Fk deben tener el mismo número de niveles');
    if (V && V.length !== Z.length) throw new Error('Vk debe tener un valor por nivel');
    if (!V) V = Fv.map((_, i) => Fv.slice(i).reduce((s, x) => s + x, 0));
    const H = Math.max(...Z), n = Z.length, W = 680, Hh = Math.min(460, 90 + 46 * n), pt = 22, pb = 36;
    const Y = (z) => Hh - pb - z / H * (Hh - pt - pb);
    const bx0 = 205, bx1 = 315, Fmax = Math.max(...Fv.map(Math.abs)), ka = 110 / (Fmax || 1);
    let g = `<defs><marker id="arF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/></marker></defs>`;
    g += `<rect x="${bx0 - 20}" y="${Y(0)}" width="${bx1 - bx0 + 40}" height="8" fill="url(#hatch)" stroke="${C.ink}" stroke-width=".6"/>`;
    g += `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="1"/></pattern></defs>`;
    for (const x of [bx0, (bx0 + bx1) / 2, bx1]) g += Lne(x, Y(0), x, Y(H), C.ink, 1.6);
    Z.forEach((z, i) => {
      g += `<rect x="${bx0 - 6}" y="${Y(z) - 3}" width="${bx1 - bx0 + 12}" height="6" fill="${C.conc}" stroke="${C.ink}" stroke-width="1"/>`;
      const L = Math.abs(Fv[i]) * ka;
      g += `<line x1="${(bx0 - 10 - L).toFixed(1)}" y1="${Y(z).toFixed(1)}" x2="${bx0 - 10}" y2="${Y(z).toFixed(1)}" stroke="${C.red}" stroke-width="2" marker-end="url(#arF)"/>`;
      g += T(bx0 - 16 - L, Y(z) + 4, `F${i + 1} = ${f2(Fv[i], 1)}`, { fs: 10, a: 'end', c: C.red });
      g += T(bx1 + 10, Y(z) + 4, `Z${i + 1} = ${f2(z, 2)} m`, { fs: 9.5, a: 'start', c: C.axis });
    });
    // diagrama de corte
    const vx0 = 440, vw = 160, Vmax = Math.max(...V.map(Math.abs)) || 1, kv = vw / Vmax;
    let d = `M${vx0},${Y(H)}`;
    for (let i = n - 1; i >= 0; i--) { const zt = Z[i], zb = i ? Z[i - 1] : 0; d += ` L${(vx0 + V[i] * kv).toFixed(1)},${Y(zt).toFixed(1)} L${(vx0 + V[i] * kv).toFixed(1)},${Y(zb).toFixed(1)}`; }
    d += ` L${vx0},${Y(0)} Z`;
    g += `<path d="${d}" fill="${C.blueF}" stroke="${C.blue}" stroke-width="1.6"/>` + Lne(vx0, Y(0), vx0, Y(H), C.ink, 1);
    V.forEach((v, i) => { const zm = ((i ? Z[i - 1] : 0) + Z[i]) / 2; g += T(vx0 + v * kv + 5, Y(zm) + 4, `V${i + 1} = ${f2(v, 1)}`, { fs: 10, a: 'start', c: C.blue }); });
    g += T(vx0 + vw / 2, Hh - 8, `Corte de entrepiso [${un}]`, { fs: 11 }) + T(bx0 - 40, Hh - 8, `Fuerzas por nivel [${un}]`, { fs: 11 });
    return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Fuerzas sísmicas por nivel y esfuerzo de corte de entrepiso')}</div>`;
  },
});

// ---------------------------------------------------------------------
//  Galpón de dos aguas: presiones de viento sobre el marco
// ---------------------------------------------------------------------
registerBlock('galponCL', {
  name: 'Galpón — presiones de viento', icon: 'steel', group: 'Cargas',
  fields: [F('B', 'Luz B', 'B'), F('he', 'Altura de alero', 'he'), F('theta', 'Pendiente del techo', 'theta'),
    F('pmb', 'Presión muro barlovento', 'pmb'), F('pms', 'Presión muro sotavento', 'pms'), F('ptb', 'Presión techo barlovento', 'ptb'), F('pts', 'Presión techo sotavento', 'pts'),
    F('u', 'Unidad de presión', 'kgf/m^2'), F('titulo', 'Título', '')],
  hint: 'Dibuja el marco transversal de un galpón de dos aguas con las presiones de viento (positivas hacia la superficie, negativas = succión).',
  def: { B: '20 m', he: '7 m', theta: '10 deg', pmb: '50 kgf/m^2', pms: '-35 kgf/m^2', ptb: '-55 kgf/m^2', pts: '-33 kgf/m^2', u: 'kgf/m^2' },
  render(b, ctx) {
    const S = ctx.scope, un = (b.u || 'kgf/m^2').trim();
    const B = evalParam(b.B, S, 'm', 20), he = evalParam(b.he, S, 'm', 7), th = evalParam(b.theta, S, 'rad', 0.17);
    const p = ['pmb', 'pms', 'ptb', 'pts'].map(k => evalParam(b[k], S, un, 0));
    pos({ B, he });
    const hc = he + B / 2 * Math.tan(th), W = 680, H = 330, sc = Math.min(330 / B, 210 / hc), ox = (W - B * sc) / 2, oy = H - 40;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc, pm = Math.max(...p.map(Math.abs)) || 1, k = 55 / pm;
    let g = `<defs><marker id="arW" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.blue}"/></marker></defs>`;
    g += Lne(X(-0.15 * B), Y(0), X(1.15 * B), Y(0), C.ink, 1.2);
    g += `<path d="M${X(0)},${Y(0)} L${X(0)},${Y(he)} L${X(B / 2)},${Y(hc)} L${X(B)},${Y(he)} L${X(B)},${Y(0)}" fill="none" stroke="${C.steel}" stroke-width="3"/>`;
    // flechas: dirección normal a la superficie; p > 0 empuja hacia la superficie
    const arrows = (x1, y1, x2, y2, nx, ny, pv, label, la) => {
      let s = ''; const L = Math.abs(pv) * k, n = 5;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, px = X(x1 + (x2 - x1) * t), py = Y(y1 + (y2 - y1) * t);
        const ex = px + nx * 4, ey = py - ny * 4, sx = px + nx * (4 + L), sy = py - ny * (4 + L);
        s += pv >= 0 ? `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${C.blue}" stroke-width="1.5" marker-end="url(#arW)"/>` : `<line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${C.red}" stroke-width="1.5" marker-end="url(#arr)"/>`;
      }
      const mx = X((x1 + x2) / 2) + nx * (L + 14), my = Y((y1 + y2) / 2) - ny * (L + 14);
      return s + T(mx, my, `${label} = ${f2(pv, 1)}`, { fs: 10.5, a: la, c: pv >= 0 ? C.blue : C.red, b: 1 });
    };
    const c = Math.cos(th), s0 = Math.sin(th);
    g += arrows(0, 0, 0, he, -1, 0, p[0], 'p barlovento', 'end');
    g += arrows(B, 0, B, he, 1, 0, p[1], 'p sotavento', 'start');
    g += arrows(0, he, B / 2, hc, -s0, c, p[2], 'p techo barlov.', 'end');
    g += arrows(B / 2, hc, B, he, s0, c, p[3], 'p techo sotav.', 'start');
    g += `<path d="M${X(-0.13 * B)},${Y(hc + 0.5)} l40,0" stroke="${C.ink}" stroke-width="2" marker-end="url(#ar)"/>` + T(X(-0.13 * B), Y(hc + 0.5) - 8, 'VIENTO', { fs: 10, a: 'start', b: 1 });
    g += dimH(X(0), X(B), Y(0) + 22, 'B = ' + f2(B, 2) + ' m');
    g += T(X(B / 2), Y(hc) + 20, `θ = ${f2(th * 180 / Math.PI, 1)}°  ·  hc = ${f2(hc, 2)} m`, { fs: 10, c: C.axis });
    g += `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/></marker></defs>`;
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || `Presiones de viento sobre el marco [${un}] (azul: presión, rojo: succión)`)}</div>`;
  },
});
