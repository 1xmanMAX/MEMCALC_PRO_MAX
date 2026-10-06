// =====================================================================
//  Bloques — módulo «dynamics» (dinámica estructural y análisis sísmico)
//   thsdof    Tiempo-historia de 1 GDL lineal (Nigam-Jennings / Newmark-β) y bilineal (Newmark + Newton-Raphson)
//   respspec  Espectro de respuesta Sd, Sv, Sa de un acelerograma vs espectro de diseño
//   thmdof    Tiempo-historia de edificio de cortante por superposición modal + comparación espectral
//   pushover  Pushover de edificio de cortante (resortes bi/trilineales), N2, ATC-40, FEMA 440, ASCE 41
//   momcurv   Momento–curvatura por fibras de sección rectangular (Mander / Hognestad)
//   simqke    Acelerograma sintético compatible con un espectro (SIMQKE)
//  Núcleo numérico: src/norms/dynamics.js.  Referencias: docs/referencias/dynamics.md
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, K, settings, BARS } from '../engine.js';
import { C, Lne, svgWrap, niceTicks, caption, setVar, f2 } from '../blocks.js';
import {
  G, pwExact, newmarkLin, newmarkNL, njCoefs, spectrumNJ, logPeriods, recordParams, shearModes, rhoCQCw, combCQC, combSRSS,
  rayleighCoef, pushoverShear, nlShearTH, n2Method, atc40CSM, fema440ELM, coefMethod, reducedSa, momentCurvature, manderCurve, simqke, elCentro,
} from '../norms/dynamics.js';

const PI2 = 2 * Math.PI;
// texto SVG con halo blanco (legible sobre las curvas)
const TX = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 11}" fill="${o.c || C.ink}" text-anchor="${o.a || 'middle'}"${o.b ? ' font-weight="600"' : ''}${o.r ? ` transform="rotate(${o.r} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''} font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round">${esc(s)}</text>`;
const COLS = [C.blue, C.red, C.green, C.orange, '#8250df', '#0a7e8c', '#9a6700', '#6e7781'];
// ---------- unidades de presentación según el sistema de la memoria ----------
const sys = () => settings.sys || 'tec';
const UL = () => ({ tec: 'cm', si: 'mm', us: 'in' }[sys()] || 'cm');
const UF = () => ({ tec: 'tonf', si: 'kN', us: 'kip' }[sys()] || 'tonf');
const UM = () => ({ tec: 'tonf*m', si: 'kN*m', us: 'kip*ft' }[sys()] || 'tonf*m');
const UV = () => ({ tec: 'cm/s', si: 'mm/s', us: 'in/s' }[sys()] || 'cm/s');
const UPHI = () => ({ tec: 'm^-1', si: 'm^-1', us: 'in^-1' }[sys()] || 'm^-1');
const LPHI = () => (sys() === 'us' ? '1/in' : '1/m');
const conv = (v, from, to) => v / math.unit(1, to).toNumber(from);
const nL = (m) => conv(m, 'm', UL()), nF = (N) => conv(N, 'N', UF()), nM = (Nm) => conv(Nm, 'N*m', UM()), nV = (v) => conv(v, 'm/s', UV());
const lab = (u) => u.replace('*', '·');
const sum = (a) => a.reduce((x, y) => x + y, 0);
const vecU = (arr, f) => math.matrix(arr.map(f));
const uL = (m) => math.unit(nL(m), UL()), uF = (N) => math.unit(nF(N), UF()), uM = (Nm) => math.unit(nM(Nm), UM());
function sfx(b) { const s = String(b.sufijo || '').trim().replace(/[^A-Za-z0-9]/g, ''); return s ? '_' + s : ''; }
const truthy = (v) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on';
function scal(str, S, def) {
  const s = String(str ?? '').trim(); if (!s) return def;
  const v = math.evaluate(s, new Map(S)); if (math.isUnit(v)) return v.value; const n = Number(v);
  if (!isFinite(n)) throw new Error('Valor no numérico: ' + s); return n;
}
const zeta = (z) => (z >= 1 ? z / 100 : z);
function evalAny(str, S) {
  const s = String(str ?? '').trim(); if (!s) return undefined;
  let v; try { v = math.evaluate(s, new Map(S)); } catch (e) { v = undefined; }
  if (v === undefined || (typeof v !== 'number' && !math.isUnit(v) && !math.isMatrix(v) && !Array.isArray(v))) v = math.evaluate('[' + s + ']', new Map(S));
  return v;
}
// vector en SI; kind: mass (fuerza → peso/g; número → tonf de peso), stiff (número → tonf/m), force (tonf), length (m)
function vecSI(str, S, kind, label) {
  const v = evalAny(str, S); if (v === undefined) throw new Error('Indique ' + label);
  const a = (math.isMatrix(v) ? v.toArray() : Array.isArray(v) ? v : [v]).flat(Infinity);
  return a.map(x => {
    if (math.isUnit(x)) { const d = x.dimensions; if (kind === 'mass' && d[0] === 1 && d[1] === 1 && d[2] === -2) return x.value / G; return x.value; }
    const n = Number(x); if (!isFinite(n)) throw new Error('Valor no numérico en ' + label);
    return n * ({ mass: 1000, force: G * 1000, stiff: G * 1000, length: 1 }[kind] ?? 1);
  });
}
function chkLine(ctx, ok, eq, label, ratio) {
  ctx.checks.push({ ok, label, ratio, block: ctx.blockId });
  const badge = ok ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>';
  const r = ratio !== null && ratio !== undefined && isFinite(ratio) ? `<span class="dc">D/C = ${f2(ratio, 2)}</span>` : '';
  return `<div class="ln chk ${ok ? 'cok' : 'cbad'}"><div class="eq">${K(eq)}</div><div class="cm">${esc(label)} ${badge}${r}</div></div>`;
}
function tableHtml(ctx, title, heads, rows) {
  ctx.tab = (ctx.tab || 0) + 1;
  let h = `<table class="tbl"><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>`;
  for (const r of rows) h += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>';
  return `<div class="figure"><div class="cap">Tabla ${ctx.tab}${title ? ': ' + esc(title) : ''}</div>${h}</tbody></table></div>`;
}
const txt = (h) => `<div class="txt">${h}</div>`;
const sg = (x, p = 4) => (Math.abs(x) < 1e-14 ? '0' : String(+x.toPrecision(p)));
const fe = (x, d = 3) => (Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(d) : f2(x, d));
// ---------- memoización de cálculos pesados ----------
const MEMO = new Map();
function memo(key, fn) {
  if (MEMO.has(key)) return MEMO.get(key);
  const v = fn(); MEMO.set(key, v); if (MEMO.size > 40) MEMO.delete(MEMO.keys().next().value); return v;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length; }
// ---------- espectro como expresión en T (Sa/g o aceleración) ----------
function makeSa(expr, S) {
  const code = math.compile(String(expr || '').trim() || '0'), sc = new Map(S);
  const toAcc = (v) => {
    if (math.isUnit(v)) { const d = v.dimensions; if (d[0] === 0 && d[1] === 1 && d[2] === -2) return v.toNumber('m/s^2'); throw new Error('El espectro debe dar Sa/g (adimensional) o una aceleración'); }
    if (typeof v === 'number' && isFinite(v)) return v * G;
    throw new Error('El espectro no produce un valor numérico');
  };
  const ev = (Tn) => { sc.set('T', math.unit(Tn, 's')); try { return toAcc(code.evaluate(sc)); } catch (e) { sc.set('T', Tn); return toAcc(code.evaluate(sc)); } };
  const grid = new Map(), h = 0.001;
  const at = (i) => { let v = grid.get(i); if (v === undefined) { v = ev(i * h); grid.set(i, v); } return v; };
  const f = (Tn) => { if (!(Tn >= 0)) return at(0); if (Tn > 20) return ev(Tn); const i = Math.floor(Tn / h), t = Tn / h - i; return at(i) * (1 - t) + at(i + 1) * t; };
  f.exact = ev;
  return f;
}
// ---------- registros sísmicos ----------
const REG = new Map();      // registros generados (SIMQKE) por nombre
const REC_OPTS = [['elcentro', 'El Centro 1940 NS (Imperial Valley) — 31.2 s, PGA 0.319 g'], ['simqke', 'Sintético SIMQKE (generado por un bloque anterior)'], ['usuario', 'Pegado por el usuario (columna de valores o t–a)']];
const UNIT_OPTS = [['g', 'g'], ['m/s2', 'm/s²'], ['cm/s2', 'cm/s² (gal)'], ['in/s2', 'in/s²']];
const recFields = () => [
  F('registro', 'Acelerograma', '', 'select', REC_OPTS),
  F('nombre', 'Nombre del registro SIMQKE (si aplica)', 'sim'),
  F('datos', 'Datos del usuario: una columna de aceleraciones (Δt abajo) o dos columnas t a', '', 'area'),
  F('skip', 'Datos del usuario: líneas de encabezado a omitir (las líneas con texto se omiten siempre)', '0'),
  F('dt', 'Δt de los datos del usuario', '0.01 s'),
  F('unidad', 'Unidad de los datos del usuario', '', 'select', UNIT_OPTS),
  F('escala', 'Factor de escala del registro', '1'),
];
function getRecord(b, S) {
  const sc = scal(b.escala, S, 1);
  let r;
  const sel = b.registro || 'elcentro';
  if (sel === 'usuario') {
    const txtd = String(b.datos || '').trim(); if (!txtd) throw new Error('Pegue los valores del acelerograma en «Datos del usuario»');
    // formatos de CISMID/REDACIS, CSN (evtdb), SMC de USGS-NSMP o PEER AT2: se omiten el encabezado indicado y toda
    // línea con texto; números Fortran (1.0D-02) admitidos
    const nskip = Math.max(0, Math.round(scal(b.skip, S, 0)) || 0);
    const rows = txtd.split(/\r?\n/).slice(nskip).map(l => l.split('//')[0].trim()).filter(Boolean).map(l => l.split(/[\s,;]+/).filter(Boolean).map(t => Number(t.replace(/[dD]/, 'e')))).filter(r2 => r2.length && r2.every(x => isFinite(x)));
    if (!rows.length) throw new Error('No se encontraron valores numéricos en «Datos del usuario»');
    let a, dt;
    if (rows.every(r2 => r2.length === 2) && rows.length > 2) { a = rows.map(r2 => r2[1]); dt = rows[1][0] - rows[0][0]; }
    else { a = rows.flat(); dt = evalParam(b.dt, S, 's', 0.01); }
    if (a.some(x => !isFinite(x))) throw new Error('El acelerograma contiene valores no numéricos');
    if (!(dt > 0) || a.length < 4) throw new Error('Acelerograma inválido: se requieren al menos 4 valores y Δt > 0');
    const fu = { g: G, 'm/s2': 1, 'cm/s2': 0.01, 'in/s2': 0.0254 }[b.unidad || 'g'] ?? G;
    r = { ag: Float64Array.from(a, x => x * fu), dt, name: 'Registro del usuario', key: 'u' + hashStr(txtd) + dt + fu + '|' + nskip };
  } else if (sel === 'simqke') {
    const nm = String(b.nombre || 'sim').trim() || 'sim', g = REG.get(nm);
    if (!g) throw new Error(`No existe el registro sintético «${nm}»: agregue antes un bloque «Acelerograma sintético (SIMQKE)» con ese nombre`);
    r = { ...g };
  } else { const e = elCentro(); r = { ag: e.ag, dt: e.dt, name: e.name, key: 'ec' }; }
  if (sc !== 1) r = { ...r, ag: r.ag.map(x => x * sc), key: r.key + '*' + sc, name: r.name + ` × ${f2(sc, 3)}` };
  return r;
}
// ---------- gráficos ----------
function frame(x0, y0, w, h, xr, yr, o = {}) {
  const X = (v) => x0 + (v - xr[0]) / (xr[1] - xr[0]) * w, Y = (v) => y0 + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  let g = '';
  (o.xt || niceTicks(xr[0], xr[1], o.nx || 6)).forEach(t => { if (t < xr[0] - 1e-12 || t > xr[1] + 1e-12) return; g += Lne(X(t), y0, X(t), y0 + h, C.grid, 0.7) + TX(X(t), y0 + h + 12, o.xf ? o.xf(t) : f2(t, 2), { fs: 9, c: C.axis }); });
  (o.yt || niceTicks(yr[0], yr[1], o.ny || 4)).forEach(t => { if (t < yr[0] - 1e-12 || t > yr[1] + 1e-12) return; g += Lne(x0, Y(t), x0 + w, Y(t), C.grid, 0.7) + TX(x0 - 4, Y(t) + 3, o.yf ? o.yf(t) : f2(t, 2), { fs: 9, c: C.axis, a: 'end' }); });
  if (yr[0] < 0 && yr[1] > 0) g += Lne(x0, Y(0), x0 + w, Y(0), C.axis, 0.8);
  if (xr[0] < 0 && xr[1] > 0) g += Lne(X(0), y0, X(0), y0 + h, C.axis, 0.8);
  g += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${C.axis}"/>`;
  if (o.title) g += TX(x0 + (o.ta === 'start' ? 0 : w / 2), y0 - 7, o.title, { fs: 10.5, b: 1, a: o.ta || 'middle' });
  if (o.xl) g += TX(x0 + w / 2, y0 + h + 25, o.xl, { fs: 9.5 });
  if (o.yl) g += TX(x0 - 38, y0 + h / 2, o.yl, { fs: 9.5, r: -90 });
  return { g, X, Y };
}
const sym = (v, f = 1.12) => { const m = Math.max(...v.map(Math.abs)) * f || 1; return [-m, m]; };
// trayectoria de una serie temporal con decimación min/máx por píxel
function pathTS(arr, dt, fr, x0, w, scale = 1, maxPts = 900) {
  const n = arr.length, step = Math.max(1, Math.floor(n / maxPts));
  let d = '';
  if (step === 1) { for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + fr.X(i * dt).toFixed(1) + ',' + fr.Y(arr[i] * scale).toFixed(1); return d; }
  for (let i = 0; i < n; i += step) {
    let mn = Infinity, mx = -Infinity, imn = i, imx = i;
    for (let j = i; j < Math.min(n, i + step); j++) { const v = arr[j]; if (v < mn) { mn = v; imn = j; } if (v > mx) { mx = v; imx = j; } }
    const [a, c] = imn < imx ? [[imn, mn], [imx, mx]] : [[imx, mx], [imn, mn]];
    d += (i ? 'L' : 'M') + fr.X(a[0] * dt).toFixed(1) + ',' + fr.Y(a[1] * scale).toFixed(1) + 'L' + fr.X(c[0] * dt).toFixed(1) + ',' + fr.Y(c[1] * scale).toFixed(1);
  }
  void x0; void w; return d;
}
const pathXY = (xs, ys, fr) => xs.map((x, i) => (i ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(ys[i]).toFixed(1)).join('');
const P = (d, c, w = 1.3, dash = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"/>`;
const dot = (x, y, c, r = 3.2) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="0.8"/>`;
const mark = (x, y, c, shape = 'o', r = 4) => {
  if (shape === 's') return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" fill="${c}" stroke="#fff" stroke-width="0.8"/>`;
  if (shape === 'd') return `<path d="M${x.toFixed(1)},${(y - r - 1).toFixed(1)} l${r + 1},${r + 1} l${-r - 1},${r + 1} l${-r - 1},${-r - 1} z" fill="${c}" stroke="#fff" stroke-width="0.8"/>`;
  if (shape === 't') return `<path d="M${x.toFixed(1)},${(y - r - 1).toFixed(1)} l${r + 1},${2 * r + 1} h${-2 * r - 2} z" fill="${c}" stroke="#fff" stroke-width="0.8"/>`;
  return dot(x, y, c, r);
};
const legend = (x, y, items) => (items.length ? `<rect x="${x - 4}" y="${y - 8}" width="${Math.max(...items.map(it => String(it[0]).length)) * 5.2 + 34}" height="${items.length * 13 + 3}" fill="#fff" fill-opacity="0.88" rx="2"/>` : '') + items.map(([lbl, c, dash], i) => Lne(x, y + i * 13, x + 18, y + i * 13, c, 2, dash || '') + TX(x + 22, y + i * 13 + 3, lbl, { fs: 9, a: 'start' })).join('');
const peakAt = (a) => { let m = 0, i0 = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) { m = v; i0 = i; } } return { v: m, i: i0, s: Math.sign(a[i0]) || 1 }; };

// =====================================================================
//  1) TIEMPO-HISTORIA DE 1 GDL
// =====================================================================
registerBlock('thsdof', {
  name: 'Tiempo-historia de 1 GDL (lineal / bilineal)', icon: 'quake', group: 'Dinámica',
  fields: [
    ...recFields(),
    F('T', 'Periodo natural Tn', '1 s'),
    F('zeta', 'Amortiguamiento ζ', '0.05'),
    F('masa', 'Masa o peso del sistema (opcional, para fuerzas)', ''),
    F('modelo', 'Modelo del resorte', '', 'select', [['lineal', 'Elástico lineal'], ['bilineal', 'Bilineal (endurecimiento cinemático; α = 0 elastoplástico)']]),
    F('metodo', 'Método de integración', '', 'select', [['nj', 'Exacto por tramos lineales (Nigam-Jennings)'], ['avg', 'Newmark aceleración promedio (β = 1/4)'], ['lin', 'Newmark aceleración lineal (β = 1/6)']]),
    F('Cy', 'Bilineal: coeficiente de fluencia Cy = fy/(m·g) (o deje vacío y use Ry)', ''),
    F('Ry', 'Bilineal: factor de reducción Ry = fo/fy (fo = fuerza elástica máxima)', ''),
    F('alpha', 'Bilineal: rigidez post-fluencia α = k2/k', '0'),
    F('mucap', 'Ductilidad disponible μ (opcional, para verificar)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { registro: 'elcentro', T: '1 s', zeta: '0.05', modelo: 'lineal', metodo: 'nj', alpha: '0', unidad: 'g', escala: '1', nombre: 'sim' },
  hint: 'Resuelve ü + 2ζωu̇ + ω²u = −üg(t) con el método exacto por tramos (Nigam-Jennings, Chopra §5.2) o Newmark-β (Tabla 5.4.2); el modelo bilineal usa Newton-Raphson en cada paso (Tabla 5.7.1). Exporta <code>umax, tumax, vmax, amax, amax_g, An_g, PGA</code>; con masa <code>Vbmax</code>; bilineal <code>mu, uy, Cy</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const rec = getRecord(b, S);
    const Tn = evalParam(b.T, S, 's'); if (!(Tn > 0)) throw new Error('El periodo Tn debe ser mayor que cero');
    const z = zeta(scal(b.zeta, S, 0.05)); if (!(z >= 0 && z < 1)) throw new Error('ζ debe estar entre 0 y 1');
    const w = PI2 / Tn, nl = b.modelo === 'bilineal';
    let met = ['nj', 'avg', 'lin'].includes(b.metodo) ? b.metodo : 'nj';
    if (nl && met === 'nj') met = 'avg';
    const mass = String(b.masa || '').trim() ? vecSI(b.masa, S, 'mass', 'la masa')[0] : 0;
    const alpha = scal(b.alpha, S, 0);
    const CyIn = String(b.Cy || '').trim() ? scal(b.Cy, S) : null, RyIn = String(b.Ry || '').trim() ? scal(b.Ry, S) : null;
    if (nl && !(CyIn > 0) && !(RyIn > 0)) throw new Error('Modelo bilineal: indique Cy = fy/(m·g) o el factor Ry');
    const key = ['th', rec.key, Tn, z, nl, met, CyIn, RyIn, alpha].join('|');
    const R = memo(key, () => {
      const lin = met === 'nj' || nl ? pwExact(rec.ag, rec.dt, w, z) : newmarkLin(rec.ag, rec.dt, w, z, met === 'avg' ? 0.25 : 1 / 6);
      const u0 = peakAt(lin.u).v;
      if (!nl) return { ...lin, u0 };
      const fy = CyIn > 0 ? CyIn * G : w * w * u0 / RyIn;
      const r = newmarkNL(rec.ag, rec.dt, w, z, fy, alpha, met === 'lin' ? 1 / 6 : 0.25);
      return { ...r, u0, fy, lin };
    });
    const dt = rec.dt, N = rec.ag.length, dur = (N - 1) * dt;
    const pu = peakAt(R.u), pv = peakAt(R.v), pa = peakAt(R.at), pg = peakAt(rec.ag);
    const umax = Math.max(pu.v, R.upk || 0), An = w * w * umax;   // upk: pico también en los subpasos
    const ex = (n, v) => setVar(ctx, n + sf, v);
    ex('umax', uL(umax)); ex('tumax', math.unit(pu.i * dt, 's')); ex('vmax', math.unit(pv.v, 'm/s')); ex('amax', math.unit(pa.v, 'm/s^2'));
    ex('amax_g', pa.v / G); ex('An_g', An / G); ex('PGA', pg.v / G);
    let mu = 1, uy = 0, Cy = 0;
    if (nl) { uy = R.fy / (w * w); mu = umax / uy; Cy = R.fy / G; ex('mu', mu); ex('uy', uL(uy)); ex('Cy', Cy); ex('Ry', w * w * R.u0 / R.fy); ex('ures', uL(Math.abs(R.u[N - 1]))); }
    if (mass > 0) ex('Vbmax', uF(mass * (nl ? peakAt(R.fs).v : An)));
    // ---------- figura ----------
    const W = 720, x0 = 62, pw = 630, ph = 92;
    let g = '', y = 22;
    const accScale = 1 / G;
    { const fr = frame(x0, y, pw, ph, [0, dur], sym(Array.from(rec.ag, a => a * accScale)), { title: 'Aceleración del suelo üg(t)  —  ' + rec.name, ta: 'start', yl: 'üg [g]', yf: t => f2(t, 2) });
      g += fr.g + P(pathTS(rec.ag, dt, fr, x0, pw, accScale), C.ink, 0.9) + dot(fr.X(pg.i * dt), fr.Y(pg.s * pg.v * accScale), C.red) + TX(fr.X(pg.i * dt) + 6, fr.Y(pg.s * pg.v * accScale) + (pg.s > 0 ? 10 : -4), `PGA = ${f2(pg.v / G, 3)} g`, { fs: 9, a: 'start', c: C.red }); }
    y += ph + 40;
    { const s = nL(1); const fr = frame(x0, y, pw, ph, [0, dur], sym(Array.from(R.u, v => v * s)), { title: `Desplazamiento relativo u(t)  —  Tn = ${f2(Tn, 3)} s, ζ = ${f2(z * 100, 1)} %` + (nl ? `, Cy = ${f2(Cy, 3)}` : ''), ta: 'start', yl: `u [${UL()}]` });
      if (nl) g += Lne(x0, fr.Y(uy * s), x0 + pw, fr.Y(uy * s), C.orange, 0.8, '4 3') + Lne(x0, fr.Y(-uy * s), x0 + pw, fr.Y(-uy * s), C.orange, 0.8, '4 3') + TX(x0 + pw - 3, fr.Y(uy * s) - 3, '±uy', { fs: 8.5, a: 'end', c: C.orange });
      if (nl) g += P(pathTS(R.lin.u, dt, fr, x0, pw, s), C.axis, 0.8, '3 2');
      g += fr.g + P(pathTS(R.u, dt, fr, x0, pw, s), C.blue, 1.1) + dot(fr.X(pu.i * dt), fr.Y(pu.s * umax * s), C.red) + TX(fr.X(pu.i * dt) + 6, fr.Y(pu.s * umax * s) + (pu.s > 0 ? 10 : -4), `umax = ${f2(umax * s, 2)} ${UL()} (t = ${f2(pu.i * dt, 2)} s)`, { fs: 9, a: 'start', c: C.red });
      if (nl) g += legend(x0 + 8, y + 10, [['bilineal', C.blue], ['elástico', C.axis, '3 2']]); }
    y += ph + 40;
    if (nl) {
      const s = nL(1), lw = 300, lh = 190;
      const ys = Array.from(R.fs, f => f / G), xs = Array.from(R.u, v => v * s);
      const fr = frame(x0, y, lw, lh, sym(xs, 1.08), sym(ys, 1.15), { title: 'Lazo histerético fS/(m·g) – u', yl: 'fS/(m·g)', xl: `u [${UL()}]`, ny: 5 });
      const step = Math.max(1, Math.floor(N / 1500));
      let d = ''; for (let i = 0; i < N; i += step) d += (i ? 'L' : 'M') + fr.X(xs[i]).toFixed(1) + ',' + fr.Y(ys[i]).toFixed(1);
      g += fr.g + P(d, C.red, 0.9);
      const bx = x0 + lw + 50; let t = '';
      const lines = [['Resistencia de fluencia', `Cy = fy/(m·g) = ${f2(Cy, 3)}`], ['Desplazamiento de fluencia', `uy = ${f2(uy * s, 3)} ${UL()}`], ['Respuesta elástica', `uo = ${f2(R.u0 * s, 3)} ${UL()}  →  Ry = ${f2(w * w * R.u0 / R.fy, 2)}`], ['Desplazamiento máximo', `um = ${f2(umax * s, 3)} ${UL()}`], ['Ductilidad', `μ = um/uy = ${f2(mu, 2)}`], ['Deformación residual', `ures = ${f2(R.u[N - 1] * s, 3)} ${UL()}`], ['Energía histerética / m', `${f2(R.Es, 3)} m²/s²`], ['Iteraciones N-R (máx. por paso)', `${R.itMax}`]];
      lines.forEach(([a, c2], i) => { t += TX(bx, y + 14 + i * 22, a, { fs: 9, a: 'start', c: C.axis }) + TX(bx, y + 25 + i * 22, c2, { fs: 10, a: 'start', b: 1 }); });
      g += t; y += lh + 40;
    } else {
      const fr = frame(x0, y, pw, ph, [0, dur], sym(Array.from(R.u, v => v * w * w / G)), { title: 'Pseudo-aceleración A(t)/g = ω²u(t)/g', ta: 'start', yl: 'A/g' });
      g += fr.g + P(pathTS(R.u, dt, fr, x0, pw, w * w / G), C.green, 1) + dot(fr.X(pu.i * dt), fr.Y(pu.s * An / G), C.red) + TX(fr.X(pu.i * dt) + 6, fr.Y(pu.s * An / G) + (pu.s > 0 ? 10 : -4), `A/g = ${f2(An / G, 3)}`, { fs: 9, a: 'start', c: C.red });
      g += TX(x0 + pw / 2, y + ph + 25, 'Tiempo t [s]', { fs: 9.5 });
      y += ph + 40;
    }
    let h = `<div class="figure">${svgWrap(W, y - 6, g)}${caption(ctx, b.titulo || `Respuesta tiempo-historia de 1 GDL ${nl ? 'bilineal' : 'lineal'} ante ${rec.name}`)}</div>`;
    // ---------- método y coeficientes ----------
    const metName = { nj: 'exacto por tramos lineales de la excitación (Nigam-Jennings 1968; Chopra §5.2)', avg: 'de Newmark con aceleración promedio constante (γ = 1/2, β = 1/4; incondicionalmente estable)', lin: 'de Newmark con aceleración lineal (γ = 1/2, β = 1/6; estable si Δt/Tn ≤ 0.551)' }[met];
    h += txt(`Ecuación de movimiento por unidad de masa ${K('\\ddot u + 2\\zeta\\omega_n\\dot u + f_S(u)/m = -\\ddot u_g(t)')}, con ${K(`\\omega_n = 2\\pi/T_n = ${f2(w, 4)}\\;\\mathrm{rad/s}`)}, ${K(`\\Delta t = ${f2(dt, 4)}\\;\\mathrm{s}`)} (${N} pasos, ${K(`\\Delta t/T_n = ${f2(dt / Tn, 4)}`)}). Integración paso a paso por el método ${metName}.` + ((R.ns || 1) > 1 ? ` El paso se subdividió ${R.ns} veces (interpolación lineal de üg) para mantener Δt/Tn ≤ ${nl ? '1/40' : '1/20'}.` : '') + (nl ? ` En cada paso se resuelve ${K('\\hat p_{i+1} - f_S(u) - a_1 u = 0')} por Newton-Raphson con la rigidez tangente ${K('k_T + a_1')} (Chopra Tabla 5.7.1); el resorte bilineal tiene envolventes ${K('f = \\alpha k u \\pm (1-\\alpha) f_y')} con ${K(`\\alpha = ${f2(alpha, 3)}`)}.` : ''));
    if (met === 'nj' || nl) {
      const c = njCoefs(w, z, dt);
      if (met === 'nj') { const ft = (x) => { const t = fe(x, 5); const m = /^(-?[\d.]+)e([-+]\d+)$/.exec(t); return m ? `${m[1]}\\times 10^{${+m[2]}}` : t; };
        h += txt(`Recurrencia exacta con ${K('p = -\\ddot u_g')} (Chopra Ec. 5.2.5 y Tabla 5.2.1; coeficientes en unidades SI):`) + `<div class="txt">${K('\\begin{aligned} u_{i+1} &= A u_i + B\\dot u_i + C p_i + D p_{i+1} \\\\ \\dot u_{i+1} &= A\' u_i + B\'\\dot u_i + C\' p_i + D\' p_{i+1} \\end{aligned}', true)}${K(`\\begin{array}{llll} A = ${ft(c.A)} & B = ${ft(c.B)} & C = ${ft(c.C)} & D = ${ft(c.D)} \\\\ A' = ${ft(c.Ap)} & B' = ${ft(c.Bp)} & C' = ${ft(c.Cp)} & D' = ${ft(c.Dp)} \\end{array}`, true)}</div>`; }
    }
    const rows = []; for (let i = 0; i <= Math.min(6, N - 1); i++) rows.push([String(i), f2(i * dt, 2), sg(rec.ag[i] / G), sg(nL(R.u[i])), sg(nV(R.v[i])), sg(R.at[i] / G)]);
    h += tableHtml(ctx, 'Primeros pasos de la integración (para revisión manual)', ['i', K('t_i') + ' [s]', K('\\ddot u_g/g'), K('u_i') + ` [${UL()}]`, K('\\dot u_i') + ` [${lab(UV())}]`, K('\\ddot u^t_i/g')], rows);
    const res = [
      ['Desplazamiento máximo', K('D = u_{\\max}'), `${f2(nL(umax), 3)} ${UL()}`, `t = ${f2(pu.i * dt, 2)} s`],
      ['Velocidad relativa máxima', K('\\dot u_{\\max}'), `${f2(nV(pv.v), 2)} ${lab(UV())}`, `t = ${f2(pv.i * dt, 2)} s`],
      ['Aceleración absoluta máxima', K('\\ddot u^t_{\\max}/g'), f2(pa.v / G, 4), `t = ${f2(pa.i * dt, 2)} s`],
      ['Pseudo-aceleración', K('A/g = \\omega_n^2 D/g'), f2(An / G, 4), nl ? 'sistema inelástico' : 'Chopra Ec. 6.6.1'],
      ['Pseudo-velocidad', K('V = \\omega_n D'), `${f2(nV(w * umax), 2)} ${lab(UV())}`, ''],
    ];
    if (mass > 0) res.push(['Cortante basal máximo', K('V_{b,\\max}'), `${f2(nF(mass * (nl ? peakAt(R.fs).v : An)), 2)} ${lab(UF())}`, nl ? 'max |fS|' : 'm·A']);
    if (nl) res.push(['Ductilidad de desplazamiento', K('\\mu = u_m/u_y'), f2(mu, 3), `uy = ${f2(nL(uy), 3)} ${UL()}`]);
    h += tableHtml(ctx, 'Respuesta máxima', ['Magnitud', 'Símbolo', 'Valor', 'Observación'], res);
    if (met === 'lin' && !nl) h += chkLine(ctx, dt / (R.ns || 1) / Tn <= 0.551, `\\Delta t/T_n = ${f2(dt / (R.ns || 1) / Tn, 4)} \\le 0.551`, 'Estabilidad de Newmark con aceleración lineal (Chopra Ec. 5.4.13)', dt / (R.ns || 1) / Tn / 0.551);
    const mucap = String(b.mucap || '').trim() ? scal(b.mucap, S) : 0;
    if (nl && R.nfail > 0) h += chkLine(ctx, false, `\\text{pasos sin convergencia N-R} = ${R.nfail}`, 'Convergencia de Newton-Raphson en todos los pasos (reduzca Δt)', null);
    if (nl && mucap > 0) h += chkLine(ctx, mu <= mucap, `\\mu = ${f2(mu, 2)} \\le \\mu_{disp} = ${f2(mucap, 2)}`, 'Demanda de ductilidad ≤ ductilidad disponible', mu / mucap);
    return h;
  },
});

// =====================================================================
//  2) ESPECTRO DE RESPUESTA
// =====================================================================
registerBlock('respspec', {
  name: 'Espectro de respuesta de un acelerograma', icon: 'spectrum', group: 'Dinámica',
  fields: [
    ...recFields(),
    F('zetas', 'Amortiguamientos ζ (lista)', '0.02, 0.05, 0.10'),
    F('Tmax', 'Periodo máximo del espectro', '4 s'),
    F('nT', 'N.º de periodos (rejilla logarítmica)', '120'),
    F('Sa', 'Espectro de diseño en función de T (Sa/g), opcional', 'Z*U*CE030d(T, Tp, Tl)*S'),
    F('Tref', 'Periodo de referencia T1 (para exportar Sa(T1), Sd(T1)…)', 'T1'),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { registro: 'elcentro', zetas: '0.02, 0.05, 0.10', Tmax: '4 s', nT: '120', unidad: 'g', escala: '1', nombre: 'sim' },
  hint: 'Calcula, para cada periodo, el máximo del oscilador de 1 GDL por el método exacto de Nigam-Jennings (con vibración libre posterior): Sd = D, Sv = ωD, Sa = ω²D y la aceleración absoluta. Compara con un espectro de diseño (expresión en T). Exporta <code>PGA, PGV, Ia, D595, SaT, SdT, SvT, SaDisT, fesc, Tpk, Samax</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const rec = getRecord(b, S);
    const zs = String(b.zetas || '0.05').split(/[;,\s]+/).filter(Boolean).map(s => zeta(scal(s, S))).filter(z => z >= 0 && z < 1);
    if (!zs.length) throw new Error('Indique al menos un amortiguamiento ζ');
    const Tmax = evalParam(b.Tmax, S, 's', 4), nT = Math.min(400, Math.max(20, Math.round(scal(b.nT, S, 120))));
    const Tref = String(b.Tref || '').trim() ? evalParam(b.Tref, S, 's') : 0;
    const per = logPeriods(0.02, Tmax, nT, Tref > 0 && Tref <= Tmax ? [Tref] : []);
    const sp = memo(['rs', rec.key, zs.join(','), per.length, Tmax, Tref].join('|'), () => zs.map(z => spectrumNJ(rec.ag, rec.dt, per, z)));
    const prm = recordParams(rec.ag, rec.dt);
    const hasDis = String(b.Sa || '').trim() !== '';
    const SaD = hasDis ? makeSa(b.Sa, S) : null;
    const i5 = zs.reduce((bi, z, i) => (Math.abs(z - 0.05) < Math.abs(zs[bi] - 0.05) ? i : bi), 0);
    const s5 = sp[i5];
    const ex = (n, v) => setVar(ctx, n + sf, v);
    ex('PGA', prm.pga / G); ex('PGV', math.unit(prm.pgv, 'm/s')); ex('Ia', math.unit(prm.Ia, 'm/s')); ex('D595', math.unit(prm.D595, 's'));
    const pk = s5.reduce((a, s) => (s.PSA > a.PSA ? s : a), s5[0]);
    ex('Tpk', math.unit(pk.T, 's')); ex('Samax', pk.PSA / G);
    let rT = null, fesc = 0;
    if (Tref > 0) {
      rT = zs.map(z => spectrumNJ(rec.ag, rec.dt, [Tref], z)[0]);
      ex('SaT', rT[i5].PSA / G); ex('SdT', uL(rT[i5].D)); ex('SvT', math.unit(rT[i5].PSV, 'm/s')); ex('SAabsT', rT[i5].SA / G);
      if (hasDis) {
        ex('SaDisT', SaD(Tref) / G);
        let f = 0; for (const s of s5) if (s.T >= 0.2 * Tref - 1e-9 && s.T <= 1.5 * Tref + 1e-9) f = Math.max(f, SaD(s.T) / s.PSA);
        fesc = f; ex('fesc', fesc);
      }
    }
    // ---------- figura: Sa | Sv | Sd ----------
    const W = 720, pw = 196, ph = 170, top = 26;
    let g = '';
    const Ts = [0, ...per];
    const panels = [
      { t: 'Pseudo-aceleración Sa/g', f: (s) => s.PSA / G, z0: prm.pga / G, yl: 'Sa/g', x: 46 },
      { t: `Pseudo-velocidad Sv [${lab(UV())}]`, f: (s) => nV(s.PSV), z0: 0, yl: `Sv [${lab(UV())}]`, x: 46 + pw + 42 },
      { t: `Desplazamiento Sd [${UL()}]`, f: (s) => nL(s.D), z0: 0, yl: `Sd [${UL()}]`, x: 46 + 2 * (pw + 42) },
    ];
    const disT = hasDis ? Array.from({ length: 241 }, (_, i) => i * Tmax / 240) : [];
    panels.forEach((pn, k) => {
      let ymax = Math.max(...sp.flat().map(pn.f));
      let dis = null;
      if (hasDis) { dis = disT.map(t => k === 0 ? SaD(t) / G : k === 1 ? nV(SaD(t) * t / PI2) : nL(SaD(t) * (t / PI2) ** 2)); if (k === 0) ymax = Math.max(ymax, ...dis); }
      const fr = frame(pn.x, top, pw, ph, [0, Tmax], [0, ymax * 1.08], { title: pn.t, xl: 'T [s]', nx: 4, ny: 5 });
      g += fr.g;
      if (dis) g += P(pathXY(disT, dis, fr), C.ink, 1.6, '6 3');
      sp.forEach((s, j) => { g += P(pathXY(Ts, [pn.z0, ...s.map(pn.f)], fr), COLS[j % COLS.length], 1.4); });
      if (Tref > 0 && Tref <= Tmax) { g += Lne(fr.X(Tref), top, fr.X(Tref), top + ph, C.orange, 0.9, '3 3'); g += dot(fr.X(Tref), fr.Y(pn.f(rT[i5])), C.orange); }
    });
    const items = [...zs.map((z, j) => [`ζ = ${f2(z * 100, 1)} %`, COLS[j % COLS.length]]), ...(hasDis ? [['Espectro de diseño', C.ink, '6 3']] : []), ...(Tref > 0 ? [[`T1 = ${f2(Tref, 3)} s`, C.orange, '3 3']] : [])];
    for (let c = 0; c * 3 < items.length; c++) g += legend(60 + c * 220, top + ph + 42, items.slice(c * 3, c * 3 + 3));
    const Hh = top + ph + 42 + 3 * 13 + 4;
    let h = `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || `Espectros de respuesta de ${rec.name}` + (hasDis ? ' y espectro de diseño' : ''))}</div>`;
    h += txt(`Para cada periodo ${K('T_n')} se integra ${K('\\ddot u + 2\\zeta\\omega_n\\dot u + \\omega_n^2 u = -\\ddot u_g(t)')} con la recurrencia exacta de Nigam-Jennings (excitación lineal por tramos, ${K(`\\Delta t = ${f2(rec.dt, 4)}`)} s) incluyendo ${K('\\approx T_n')} de vibración libre después del registro; ${K('S_d = D = \\max|u|')}, ${K('S_v = \\omega_n D')}, ${K('S_a = \\omega_n^2 D')} (Chopra §6.6). Rejilla logarítmica de ${per.length} periodos entre 0.02 y ${f2(Tmax, 2)} s.`);
    h += txt(`Parámetros del registro: ${K(`PGA = ${f2(prm.pga / G, 4)}\\,g`)} (t = ${f2(prm.tpga, 2)} s), ${K(`PGV = ${f2(nV(prm.pgv), 2)}\\;\\mathrm{${lab(UV())}}`)}, intensidad de Arias ${K(`I_a = \\frac{\\pi}{2g}\\int a^2 dt = ${f2(prm.Ia, 3)}\\;\\mathrm{m/s}`)}, duración significativa ${K(`D_{5-95} = ${f2(prm.D595, 2)}\\;\\mathrm{s}`)} (${f2(prm.t5, 2)}–${f2(prm.t95, 2)} s), duración total ${f2(prm.dur, 2)} s. Comprobación: ${K(`S_a(T \\to 0) = ${f2(s5[0].SA / G, 4)}\\,g \\approx PGA`)}.`);
    const Tl = [0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 4].filter(t => t <= Tmax + 1e-9);
    if (Tref > 0 && !Tl.some(t => Math.abs(t - Tref) < 1e-6)) Tl.push(Tref);
    Tl.sort((a, c) => a - c);
    const vals = memo(['rst', rec.key, zs.join(','), Tl.join(',')].join('|'), () => zs.map(z => spectrumNJ(rec.ag, rec.dt, Tl, z)));
    const heads = [K('T') + ' [s]', ...zs.flatMap(z => [K(`S_d^{${f2(z * 100, 0)}\\%}`) + ` [${UL()}]`, K(`S_a^{${f2(z * 100, 0)}\\%}/g`)]), ...(hasDis ? [K('S_{a,dis}/g')] : [])];
    const rows = Tl.map((t, i) => [(Math.abs(t - Tref) < 1e-9 ? '<b>' + f2(t, 3) + '</b>' : f2(t, 2)), ...vals.flatMap(v => [f2(nL(v[i].D), 2), f2(v[i].PSA / G, 3)]), ...(hasDis ? [f2(SaD(t) / G, 3)] : [])]);
    h += tableHtml(ctx, 'Ordenadas espectrales del registro' + (hasDis ? ' y del espectro de diseño' : ''), heads, rows);
    if (Tref > 0) {
      const r5 = rT[i5];
      h += txt(`En ${K(`T_1 = ${f2(Tref, 3)}\\;\\mathrm{s}`)} con ${K(`\\zeta = ${f2(zs[i5] * 100, 1)}\\,\\%`)}: ${K(`S_d = ${f2(nL(r5.D), 3)}\\;\\mathrm{${UL()}}`)}, ${K(`S_v = ${f2(nV(r5.PSV), 2)}\\;\\mathrm{${lab(UV())}}`)}, ${K(`S_a = ${f2(r5.PSA / G, 4)}\\,g`)}` + (hasDis ? `; espectro de diseño ${K(`S_{a,dis} = ${f2(SaD(Tref) / G, 4)}\\,g`)} (razón registro/diseño = ${f2(r5.PSA / SaD(Tref), 3)}). Factor de escala mínimo para que el espectro del registro (5 %) no sea menor que el de diseño en ${K('0.2T_1 \\le T \\le 1.5T_1')} (criterio de E.030-2026 Art. 47.5 / ASCE 7 §16.2.3 para una componente): ${K(`f_{esc} = ${f2(fesc, 3)}`)}.` : '.'));
    }
    return h;
  },
});

// =====================================================================
//  3) TIEMPO-HISTORIA MODAL DE EDIFICIO DE CORTANTE
// =====================================================================
registerBlock('thmdof', {
  name: 'Tiempo-historia modal de edificio de cortante', icon: 'quake', group: 'Dinámica',
  fields: [
    F('masas', 'Pesos o masas por nivel (1 → n); números = tonf de peso', 'W_i'),
    F('rigideces', 'Rigidez lateral de cada entrepiso (1 → n); números = tonf/m', 'k_i'),
    F('alturas', 'Altura de cada entrepiso (1 → n); números = m', 'h_i'),
    ...recFields(),
    F('amort', 'Amortiguamiento', '', 'select', [['modal', 'Modal constante ζn = ζ'], ['rayleigh', 'Rayleigh (ζ en dos modos i, j)']]),
    F('zeta', 'ζ (modal o de los modos de Rayleigh)', '0.05'),
    F('modosR', 'Rayleigh: modos i, j', '1, 3'),
    F('nmodos', 'N.º de modos en la superposición (vacío = todos)', ''),
    F('comb', 'Combinación espectral para comparar', '', 'select', [['CQC', 'CQC (Der Kiureghian)'], ['SRSS', 'SRSS']]),
    F('Sa', 'Espectro de diseño Sa/g en función de T (opcional, columna adicional)', ''),
    F('dlim', 'Deriva límite Δ/h (opcional)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { masas: 'W_i', rigideces: 'k_i', alturas: 'h_i', registro: 'elcentro', amort: 'modal', zeta: '0.05', modosR: '1, 3', comb: 'CQC', unidad: 'g', escala: '1', nombre: 'sim' },
  hint: 'Resuelve K·φ = ω²·M·φ (Jacobi), integra cada coordenada modal Dn(t) con el método exacto de Nigam-Jennings y superpone u(t) = Σ Γn φn Dn(t) (Chopra §13.1). Compara las envolventes con el análisis espectral (CQC/SRSS) usando el espectro del propio registro. Exporta <code>T1…, u_techo, Vbmax, Mbmax, umax_i, deriva_i, Vmax_i, derivamax, u_rsa, Vb_rsa</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const m = vecSI(b.masas, S, 'mass', 'las masas'), k = vecSI(b.rigideces, S, 'stiff', 'las rigideces'), he = vecSI(b.alturas, S, 'length', 'las alturas');
    const n = m.length;
    if (k.length !== n || he.length !== n) throw new Error(`Se requieren ${n} rigideces y ${n} alturas (una por entrepiso)`);
    if ([...m, ...k, ...he].some(x => !(x > 0))) throw new Error('Masas, rigideces y alturas deben ser positivas');
    const rec = getRecord(b, S);
    const modes = shearModes(m, k);
    const nm = Math.min(n, Math.max(1, Math.round(scal(b.nmodos, S, n)) || n));
    const z0 = zeta(scal(b.zeta, S, 0.05));
    let zn, ray = null;
    if (b.amort === 'rayleigh') {
      const ij = String(b.modosR || '1, 3').split(/[;,\s]+/).filter(Boolean).map(x => Math.round(scal(x, S)));
      const i = Math.min(Math.max(ij[0] || 1, 1), n), j = Math.min(Math.max(ij[1] || Math.min(3, n), 1), n);
      if (i === j) throw new Error('Rayleigh: los modos i y j deben ser distintos');
      ray = { i, j, ...rayleighCoef(modes[i - 1].T, modes[j - 1].T, z0) };
      zn = modes.map(md => ray.a0 / (2 * md.w) + ray.a1 * md.w / 2);
    } else zn = modes.map(() => z0);
    const H = []; he.reduce((s, x, i) => (H[i] = s + x), 0);
    const key = ['md', rec.key, m.join(','), k.join(','), he.join(','), nm, zn.join(',')].join('|');
    const R = memo(key, () => {
      const N = rec.ag.length, u = Array.from({ length: n }, () => new Float64Array(N)), Dn = [];
      for (let r = 0; r < nm; r++) {
        const md = modes[r], D = pwExact(rec.ag, rec.dt, md.w, zn[r]).u; Dn.push(D);
        for (let i = 0; i < n; i++) { const c = md.Gam * md.phi[i]; const ui = u[i]; for (let t = 0; t < N; t++) ui[t] += c * D[t]; }
      }
      const dr = u.map((ui, i) => (i ? ui.map((x, t) => x - u[i - 1][t]) : ui.slice()));
      const V = dr.map((d, i) => d.map(x => k[i] * x));
      const Mb = new Float64Array(N); for (let t = 0; t < N; t++) { let s = 0; for (let i = 0; i < n; i++) s += (V[i][t] - (i + 1 < n ? V[i + 1][t] : 0)) * H[i]; Mb[t] = s; }
      return { u, dr, V, Mb, Dn };
    });
    const pk = (a) => peakAt(a);
    const uE = R.u.map(x => pk(x).v), dE = R.dr.map(x => pk(x).v), VE = R.V.map(x => pk(x).v);
    const roof = pk(R.u[n - 1]), base = pk(R.V[0]), mb = pk(R.Mb);
    // análisis espectral con el espectro del propio registro (Chopra §13.8)
    const spR = modes.slice(0, nm).map((md, r) => spectrumNJ(rec.ag, rec.dt, [md.T], zn[r])[0]);
    const ws = modes.slice(0, nm).map(md => md.w), zz = zn.slice(0, nm);
    const cmb = (rs) => (b.comb === 'SRSS' ? combSRSS(rs) : combCQC(rs, ws, zz));
    const rsa = (An) => {
      const um = modes.slice(0, nm).map((md, r) => md.phi.map(p => md.Gam * p * An[r] / (md.w * md.w)));
      const dm = um.map(u => u.map((x, i) => x - (i ? u[i - 1] : 0)));
      return { u: Array.from({ length: n }, (_, i) => cmb(um.map(x => x[i]))), d: Array.from({ length: n }, (_, i) => cmb(dm.map(x => x[i]))), V: Array.from({ length: n }, (_, i) => cmb(dm.map(x => k[i] * x[i]))), Vb: cmb(modes.slice(0, nm).map((md, r) => md.Meff * An[r])) };
    };
    const RS = rsa(spR.map(s => s.PSA));
    const hasDis = String(b.Sa || '').trim() !== '';
    const SaD = hasDis ? makeSa(b.Sa, S) : null;
    const RD = hasDis ? rsa(modes.slice(0, nm).map(md => SaD(md.T))) : null;
    // exportar
    const ex = (nme, v) => setVar(ctx, nme + sf, v);
    modes.forEach((md, i) => ex('T' + (i + 1), math.unit(md.T, 's')));
    ex('u_techo', uL(roof.v)); ex('t_techo', math.unit(roof.i * rec.dt, 's')); ex('Vbmax', uF(base.v)); ex('Mbmax', uM(mb.v));
    ex('umax_i', vecU(uE, uL)); ex('deriva_i', math.matrix(dE.map((d, i) => d / he[i]))); ex('Vmax_i', vecU(VE, uF));
    const drMax = Math.max(...dE.map((d, i) => d / he[i])); ex('derivamax', drMax);
    ex('u_rsa', uL(RS.u[n - 1])); ex('Vb_rsa', uF(RS.Vb)); if (RD) { ex('u_dis', uL(RD.u[n - 1])); ex('Vb_dis', uF(RD.Vb)); }
    const Wt = sum(m) * G; ex('CbTH', base.v / Wt);
    // ---------- figura ----------
    const W = 720, x0 = 62, pw = 630, ph = 84, dt = rec.dt, dur = (rec.ag.length - 1) * dt;
    let g = '', y = 22;
    { const s = nL(1); const fr = frame(x0, y, pw, ph, [0, dur], sym(Array.from(R.u[n - 1], v => v * s)), { title: `Desplazamiento del techo u${n}(t)  —  ${rec.name}`, ta: 'start', yl: `u [${UL()}]` });
      g += fr.g + P(pathTS(R.u[n - 1], dt, fr, x0, pw, s), C.blue, 1) + dot(fr.X(roof.i * dt), fr.Y(roof.s * roof.v * s), C.red) + TX(fr.X(roof.i * dt) + 6, fr.Y(roof.s * roof.v * s) + (roof.s > 0 ? 10 : -4), `${f2(roof.v * s, 2)} ${UL()} (t = ${f2(roof.i * dt, 2)} s)`, { fs: 9, a: 'start', c: C.red }); }
    y += ph + 38;
    { const s = nF(1); const fr = frame(x0, y, pw, ph, [0, dur], sym(Array.from(R.V[0], v => v * s)), { title: 'Cortante basal Vb(t)', ta: 'start', yl: `Vb [${lab(UF())}]`, xl: 'Tiempo t [s]' });
      g += fr.g + P(pathTS(R.V[0], dt, fr, x0, pw, s), C.green, 1) + dot(fr.X(base.i * dt), fr.Y(base.s * base.v * s), C.red) + TX(fr.X(base.i * dt) + 6, fr.Y(base.s * base.v * s) + (base.s > 0 ? 10 : -4), `${f2(base.v * s, 2)} ${lab(UF())} (t = ${f2(base.i * dt, 2)} s)`, { fs: 9, a: 'start', c: C.red }); }
    y += ph + 52;
    const hu = sys() === 'us' ? 'ft' : 'm', Hd = H.map(x => conv(x, 'm', hu)), Hm = Hd[n - 1], eh = 170, ew = 170;
    const env = (xx, title, xl, th, rs, dd, xf) => {
      const xm = Math.max(...th, ...rs, ...(dd || [])) * 1.15 || 1;
      const fr = frame(xx, y, ew, eh, [0, xm], [0, Hm], { title, xl, yl: xx < 100 ? 'Altura [' + hu + ']' : '', nx: 4, xf, yt: [0, ...Hd], yf: (t) => f2(t, 1) });
      const stair = (v) => { let d = `M${fr.X(0).toFixed(1)},${fr.Y(0).toFixed(1)}`; for (let i = 0; i < n; i++) d += `L${fr.X(v[i]).toFixed(1)},${fr.Y(i ? Hd[i - 1] : 0).toFixed(1)}L${fr.X(v[i]).toFixed(1)},${fr.Y(Hd[i]).toFixed(1)}`; return d; };
      const line = (v) => [[0, 0], ...v.map((x, i) => [x, Hd[i]])].map((p, i) => (i ? 'L' : 'M') + fr.X(p[0]).toFixed(1) + ',' + fr.Y(p[1]).toFixed(1)).join('');
      const draw = title.startsWith('Desplaz') ? line : stair;
      let s = fr.g + P(draw(th), C.blue, 2) + P(draw(rs), C.red, 1.5, '5 3');
      if (dd) s += P(draw(dd), C.ink, 1.2, '2 2');
      return s;
    };
    g += env(62, 'Desplazamiento máx.', `u [${UL()}]`, uE.map(nL), RS.u.map(nL), RD ? RD.u.map(nL) : null);
    g += env(62 + ew + 62, 'Deriva máx. Δ/h', 'Δ/h', dE.map((d, i) => d / he[i]), RS.d.map((d, i) => d / he[i]), RD ? RD.d.map((d, i) => d / he[i]) : null, (t) => f2(t, 4));
    g += env(62 + 2 * (ew + 62), 'Cortante de entrepiso máx.', `V [${lab(UF())}]`, VE.map(nF), RS.V.map(nF), RD ? RD.V.map(nF) : null, (t) => f2(t, 0));
    const dl = String(b.dlim || '').trim() ? scal(b.dlim, S) : 0;
    y += eh + 38;
    g += legend(70, y, [['Tiempo-historia (envolvente)', C.blue], [`Espectral ${b.comb === 'SRSS' ? 'SRSS' : 'CQC'} con el espectro del registro`, C.red, '5 3'], ...(RD ? [['Espectral con el espectro de diseño', C.ink, '2 2']] : [])]);
    y += 42;
    let h = `<div class="figure">${svgWrap(W, y, g)}${caption(ctx, b.titulo || `Tiempo-historia modal (${nm} modos) del edificio de ${n} niveles: respuesta del techo, cortante basal y envolventes`)}</div>`;
    h += txt(`Modos de ${K('\\mathbf K\\boldsymbol\\phi = \\omega^2\\mathbf M\\boldsymbol\\phi')} por Jacobi; factores ${K('\\Gamma_n = L_n/M_n')}, ${K('L_n = \\boldsymbol\\phi_n^T\\mathbf M\\boldsymbol\\iota')}. Cada coordenada modal ${K('D_n(t)')} es la respuesta de un 1 GDL ${K('(\\omega_n, \\zeta_n)')} a ${K('-\\ddot u_g')}, integrada exactamente (Nigam-Jennings); ${K('\\mathbf u(t) = \\sum_n \\Gamma_n\\boldsymbol\\phi_n D_n(t)')}, ${K('V_i(t) = k_i\\Delta_i(t)')} y ${K('M_b(t) = \\sum_j f_j(t) H_j')} (Chopra §13.1–13.2). ` + (ray ? `Amortiguamiento de Rayleigh ${K('\\mathbf C = a_0\\mathbf M + a_1\\mathbf K')} con ζ = ${f2(z0 * 100, 1)} % en los modos ${ray.i} y ${ray.j}: ${K(`a_0 = ${fe(ray.a0, 4)}\\;\\mathrm{s^{-1}},\\; a_1 = ${fe(ray.a1, 4)}\\;\\mathrm{s}`)}, ${K('\\zeta_n = a_0/(2\\omega_n) + a_1\\omega_n/2')}.` : `Amortiguamiento modal ζn = ${f2(z0 * 100, 1)} % en todos los modos.`));
    const rows1 = modes.map((md, r) => [String(r + 1) + (r < nm ? '' : ' *'), f2(md.T, 4), f2(md.w, 3), f2(md.Gam, 4), f2(md.ratio * 100, 2), f2(zn[r] * 100, 2), r < nm ? f2(nL(spR[r].D), 3) : '—', r < nm ? f2(spR[r].PSA / G, 4) : '—', r < nm ? f2(nL(pk(R.Dn[r]).v * md.Gam), 3) : '—']);
    h += tableHtml(ctx, 'Propiedades modales (φ normalizada al techo) y respuesta espectral del registro', ['Modo', K('T_n') + ' [s]', K('\\omega_n') + ' [rad/s]', K('\\Gamma_n'), K('M^*_n/M') + ' [%]', K('\\zeta_n') + ' [%]', K('D_n') + ` [${UL()}]`, K('A_n/g'), K('\\max|u_{techo,n}|') + ` [${UL()}]`], rows1);
    const rows2 = []; for (let i = n - 1; i >= 0; i--) rows2.push([String(i + 1), f2(nL(uE[i]), 3), f2(nL(RS.u[i]), 3), sg(dE[i] / he[i], 4), sg(RS.d[i] / he[i], 4), f2(nF(VE[i]), 2), f2(nF(RS.V[i]), 2), ...(RD ? [f2(nF(RD.V[i]), 2)] : [])]);
    h += tableHtml(ctx, `Envolventes por nivel: tiempo-historia (TH) vs espectral ${b.comb === 'SRSS' ? 'SRSS' : 'CQC'} (RSA)`, ['Nivel', K('u_{TH}') + ` [${UL()}]`, K('u_{RSA}') + ` [${UL()}]`, K('(\\Delta/h)_{TH}'), K('(\\Delta/h)_{RSA}'), K('V_{TH}') + ` [${lab(UF())}]`, K('V_{RSA}') + ` [${lab(UF())}]`, ...(RD ? [K('V_{dis}') + ` [${lab(UF())}]`] : [])], rows2);
    h += txt(`Picos: techo ${K(`u_{${n},\\max} = ${f2(nL(roof.v), 3)}\\;\\mathrm{${UL()}}`)} en t = ${f2(roof.i * rec.dt, 2)} s (RSA: ${f2(nL(RS.u[n - 1]), 3)}, razón ${f2(RS.u[n - 1] / roof.v, 3)}); cortante basal ${K(`V_{b,\\max} = ${f2(nF(base.v), 2)}\\;\\mathrm{${lab(UF())}}`)} = ${f2(base.v / Wt, 4)}·W en t = ${f2(base.i * rec.dt, 2)} s (RSA: ${f2(nF(RS.Vb), 2)}, razón ${f2(RS.Vb / base.v, 3)}); momento de volteo ${K(`M_{b,\\max} = ${f2(nM(mb.v), 1)}\\;\\mathrm{${lab(UM())}}`)}.` + (RD ? ` Con el espectro de diseño: ${K(`u_{techo} = ${f2(nL(RD.u[n - 1]), 3)}\\;\\mathrm{${UL()}}`)}, ${K(`V_b = ${f2(nF(RD.Vb), 2)}\\;\\mathrm{${lab(UF())}}`)}.` : ''));
    const mp = sum(modes.slice(0, nm).map(x => x.ratio));
    if (nm < n) h += chkLine(ctx, mp >= 0.9 - 1e-9, `\\sum M^*_n/M = ${f2(mp * 100, 2)}\\,\\% \\ge 90\\,\\%`, `Masa participativa de los ${nm} modos superpuestos`, 0.9 / mp);
    if (dl > 0) h += chkLine(ctx, drMax <= dl, `(\\Delta/h)_{\\max} = ${sg(drMax, 4)} \\le ${f2(dl, 4)}`, 'Deriva máxima de entrepiso (tiempo-historia)', drMax / dl);
    return h;
  },
});

// =====================================================================
//  3b) TIEMPO-HISTORIA NO LINEAL DE EDIFICIO DE CORTANTE
// =====================================================================
registerBlock('thnl', {
  name: 'Tiempo-historia no lineal de edificio de cortante', icon: 'quake', group: 'Dinámica',
  fields: [
    F('masas', 'Pesos o masas por nivel (1 → n); números = tonf de peso', 'W_i'),
    F('rigideces', 'Rigidez inicial de cada entrepiso (1 → n); números = tonf/m', 'k_i'),
    F('Vy', 'Cortante de fluencia de cada entrepiso (1 → n); números = tonf', 'Vy_i'),
    F('alturas', 'Altura de cada entrepiso (1 → n); números = m', 'h_i'),
    F('alpha', 'Rigidez post-fluencia α = k2/k (escalar o vector)', '0.03'),
    ...recFields(),
    F('zeta', 'Amortiguamiento ζ (Rayleigh con la rigidez inicial)', '0.05'),
    F('modosR', 'Rayleigh: modos i, j', '1, 3'),
    F('pdelta', 'Incluir P-Δ (columna ficticia con el peso de los niveles superiores)', '', 'check'),
    F('fP', 'P-Δ: carga de gravedad / peso sísmico', '1.0'),
    F('dlim', 'Deriva límite Δ/h (opcional)', ''),
    F('mulim', 'Ductilidad de entrepiso admisible μ (opcional)', ''),
    F('dreslim', 'Deriva residual admisible (opcional; FEMA P-58: 0.005)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: '0.03', registro: 'elcentro', zeta: '0.05', modosR: '1, 3', unidad: 'g', escala: '1', nombre: 'sim', fP: '1.0' },
  hint: 'Integra M·ü + C·u̇ + fS(u) = −M·ι·üg con Newmark (γ = 1/2, β = 1/4) y Newton-Raphson en cada paso (Chopra Tabla 16.3.3); resortes de entrepiso bilineales con endurecimiento cinemático (OpenSees Steel01), P-Δ opcional con columna ficticia y amortiguamiento de Rayleigh con la rigidez inicial. Compara con la respuesta elástica. Exporta <code>u_techo, Vbmax, derivamax, deriva_i, mu_i, mumax, dres, u_lin, CbNL</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const m = vecSI(b.masas, S, 'mass', 'las masas'), k = vecSI(b.rigideces, S, 'stiff', 'las rigideces'), Vy = vecSI(b.Vy, S, 'force', 'los cortantes de fluencia'), he = vecSI(b.alturas, S, 'length', 'las alturas');
    const n = m.length;
    if (k.length !== n || Vy.length !== n || he.length !== n) throw new Error(`Se requieren ${n} valores de rigidez, Vy y altura (uno por entrepiso)`);
    if ([...m, ...k, ...Vy, ...he].some(x => !(x > 0))) throw new Error('Masas, rigideces, resistencias y alturas deben ser positivas');
    const av = evalAny(b.alpha || '0.03', S), alpha = math.isMatrix(av) || Array.isArray(av) ? (math.isMatrix(av) ? av.toArray() : av).flat().map(Number) : Number(av);
    const al = Array.isArray(alpha) ? alpha : m.map(() => alpha);
    if (al.length !== n || al.some(a => !(a >= 0 && a < 1))) throw new Error('α debe estar entre 0 y 1 (escalar o un valor por entrepiso)');
    const rec = getRecord(b, S);
    const z0 = zeta(scal(b.zeta, S, 0.05)), pdelta = truthy(b.pdelta), fP = scal(b.fP, S, 1);
    const modes = shearModes(m, k);
    const ij = String(b.modosR || '1, 3').split(/[;,\s]+/).filter(Boolean).map(x => Math.round(scal(x, S)));
    const mi = Math.min(Math.max(ij[0] || 1, 1), n), mj = n === 1 ? 1 : Math.min(Math.max(ij[1] || Math.min(3, n), 1), n);
    const ray = n === 1 || mi === mj ? { a0: 0, a1: 2 * z0 / modes[0].w } : rayleighCoef(modes[mi - 1].T, modes[mj - 1].T, z0);
    const zn = modes.map(md => ray.a0 / (2 * md.w) + ray.a1 * md.w / 2);
    const hmax = modes[n - 1].T / 20;
    const H = []; he.reduce((s2, x, i) => (H[i] = s2 + x), 0);
    const key = ['nl', rec.key, m, k, Vy, al, he, z0, mi, mj, pdelta, fP].join('|');
    const R = memo(key, () => {
      const tf = Math.max(3, 5 * modes[0].T);   // vibración libre posterior para la deriva residual
      const o = { m, k, Vy, alpha: al, h: he, ag: rec.ag, dt: rec.dt, a0: ray.a0, a1: ray.a1, hmax, tfree: tf, tavg: 2 * modes[0].T };
      return { nl: nlShearTH({ ...o, pdelta, fP }), el: nlShearTH({ ...o, linear: true }) };
    });
    const nl = R.nl, el = R.el, dt = rec.dt, N = nl.N;
    const dy = Vy.map((v, i) => v / k[i]), mu = Array.from(nl.drPk, (d, i) => d / dy[i]), drr = Array.from(nl.drPk, (d, i) => d / he[i]);
    const drrE = Array.from(el.drPk, (d, i) => d / he[i]), dres = nl.dres.map((d, i) => Math.abs(d) / he[i]);
    const drMax = Math.max(...drr), muMax = Math.max(...mu), dresMax = Math.max(...dres), iCrit = mu.indexOf(muMax);
    const Wt = sum(m) * G, collapsed = nl.tCol !== null;
    const ex = (nme, v) => setVar(ctx, nme + sf, v);
    ex('u_techo', uL(nl.uPk[n - 1])); ex('t_techo', math.unit(nl.tuPk[n - 1], 's')); ex('Vbmax', uF(nl.VbPk)); ex('derivamax', drMax); ex('deriva_i', math.matrix(drr));
    ex('mu_i', math.matrix(mu)); ex('mumax', muMax); ex('dres', dresMax); ex('u_lin', uL(el.uPk[n - 1])); ex('Vb_lin', uF(el.VbPk)); ex('CbNL', nl.VbPk / Wt); ex('Ry1', el.VbPk / Vy[0]);
    // ---------- figura ----------
    const W = 720, x0 = 62, pw = 630, ph = 92;
    let g = '', y = 22;
    const roofNL = nl.U[n - 1], roofE = el.U[n - 1];
    { const s2 = nL(1); const fr = frame(x0, y, pw, ph, [0, (N - 1) * dt], sym([...Array.from(roofNL, v => v * s2), ...Array.from(roofE, v => v * s2)]), { title: `Desplazamiento del techo u${n}(t) — ${rec.name}`, ta: 'start', yl: `u [${UL()}]`, xl: 'Tiempo t [s]' });
      g += fr.g + P(pathTS(roofE, dt, fr, x0, pw, s2), C.axis, 0.8, '3 2') + P(pathTS(roofNL, dt, fr, x0, pw, s2), C.blue, 1.1);
      g += legend(x0 + 8, y + 10, [['no lineal' + (pdelta ? ' + P-Δ' : ''), C.blue], ['elástico', C.axis, '3 2']]);
      if (collapsed) g += Lne(fr.X(nl.tCol), y, fr.X(nl.tCol), y + ph, C.red, 1.2, '4 2') + TX(fr.X(nl.tCol) + 4, y + 12, `colapso (t = ${f2(nl.tCol, 2)} s)`, { fs: 9, a: 'start', c: C.red }); }
    y += ph + 50;
    // lazos de histéresis: entrepiso 1 y entrepiso crítico
    const loops = iCrit === 0 || n === 1 ? [0] : [0, iCrit];
    const lw = loops.length === 1 ? 300 : 280, lh = 180;
    loops.forEach((ii, q) => {
      const xx = x0 + q * (lw + 70), s2 = nL(1), sF = nF(1);
      const dX = Array.from(nl.U[ii], (u, t) => (u - (ii ? nl.U[ii - 1][t] : 0)) * s2), fY = Array.from(nl.Fs[ii], f => f * sF);
      const fr = frame(xx, y, lw, lh, sym(dX, 1.08), sym(fY, 1.15), { title: `Entrepiso ${ii + 1}: V – δ`, xl: `δ [${UL()}]`, yl: q === 0 ? `V [${lab(UF())}]` : '', ny: 5, nx: 5 });
      const step = Math.max(1, Math.floor(N / 1500)); let d = ''; for (let t = 0; t < N; t += step) d += (t ? 'L' : 'M') + fr.X(dX[t]).toFixed(1) + ',' + fr.Y(fY[t]).toFixed(1);
      const dM = dX.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
      g += fr.g + P(d, C.red, 0.9) + Lne(fr.X(-dM), fr.Y(Vy[ii] * sF), fr.X(dM), fr.Y(Vy[ii] * sF), C.orange, 0.7, '4 3') + Lne(fr.X(-dM), fr.Y(-Vy[ii] * sF), fr.X(dM), fr.Y(-Vy[ii] * sF), C.orange, 0.7, '4 3');
      g += TX(fr.X(-dM) + 4, y + 30, `μ = ${f2(mu[ii], 2)}`, { fs: 9.5, a: 'start', b: 1 });
    });
    if (loops.length === 1) { const bx = x0 + lw + 50; [['Periodo fundamental', `T1 = ${f2(modes[0].T, 3)} s`], ['Rayleigh (modos ' + mi + ', ' + mj + ')', `a0 = ${fe(ray.a0, 3)} 1/s, a1 = ${fe(ray.a1, 3)} s`], ['Techo no lineal / elástico', `${f2(nL(nl.uPk[n - 1]), 2)} / ${f2(nL(el.uPk[n - 1]), 2)} ${UL()}`], ['Cortante basal NL / elástico', `${f2(nF(nl.VbPk), 1)} / ${f2(nF(el.VbPk), 1)} ${lab(UF())}`], ['Ductilidad máxima', `μ = ${f2(muMax, 2)} (entrepiso ${iCrit + 1})`], ['Iteraciones N-R (máx.)', `${nl.itMax}`]].forEach(([a, c2], i) => { g += TX(bx, y + 14 + i * 26, a, { fs: 9, a: 'start', c: C.axis }) + TX(bx, y + 26 + i * 26, c2, { fs: 10, a: 'start', b: 1 }); }); }
    y += lh + 52;
    // envolventes
    const hu = sys() === 'us' ? 'ft' : 'm', Hd = H.map(x => conv(x, 'm', hu)), Hm = Hd[n - 1], eh = 170, ew = 280;
    const stair = (fr, v) => { let d = `M${fr.X(0).toFixed(1)},${fr.Y(0).toFixed(1)}`; for (let i = 0; i < n; i++) d += `L${fr.X(v[i]).toFixed(1)},${fr.Y(i ? Hd[i - 1] : 0).toFixed(1)}L${fr.X(v[i]).toFixed(1)},${fr.Y(Hd[i]).toFixed(1)}`; return d; };
    { const xm = Math.max(...drr, ...drrE) * 1.15 || 1; const fr = frame(62, y, ew, eh, [0, xm], [0, Hm], { title: 'Deriva máxima Δ/h', xl: 'Δ/h', yl: 'Altura [' + hu + ']', nx: 4, xf: t => f2(t, 4), yt: [0, ...Hd], yf: t => f2(t, 1) });
      g += fr.g + P(stair(fr, drrE), C.axis, 1.4, '5 3') + P(stair(fr, drr), C.blue, 2) + P(stair(fr, dres), C.orange, 1.2, '2 2'); }
    { const xm = Math.max(...mu, 1) * 1.15; const fr = frame(62 + ew + 70, y, ew, eh, [0, xm], [0, Hm], { title: 'Ductilidad de entrepiso μ = δmax/δy', xl: 'μ', nx: 4, xf: t => f2(t, 1), yt: [0, ...Hd], yf: t => f2(t, 1) });
      g += fr.g + P(stair(fr, mu), C.red, 2) + Lne(fr.X(1), y, fr.X(1), y + eh, C.axis, 0.8, '3 3'); }
    y += eh + 38;
    g += legend(70, y, [['No lineal' + (pdelta ? ' + P-Δ' : ''), C.blue], ['Elástico (mismo amortiguamiento)', C.axis, '5 3'], ['Deriva residual', C.orange, '2 2']]);
    y += 46;
    let h = `<div class="figure">${svgWrap(W, y, g)}${caption(ctx, b.titulo || `Tiempo-historia no lineal del edificio de cortante de ${n} niveles ante ${rec.name}`)}</div>`;
    h += txt(`Ecuación de movimiento ${K('\\mathbf M\\ddot{\\mathbf u} + \\mathbf C\\dot{\\mathbf u} + \\mathbf f_S(\\mathbf u) = -\\mathbf M\\boldsymbol\\iota\\,\\ddot u_g(t)')} con resortes de entrepiso bilineales de endurecimiento cinemático (${K('k_i')}, ${K('V_{y,i}')}, ${K('\\alpha_i k_i')}; equivalente a OpenSees <i>Steel01</i> sin transición) y amortiguamiento de Rayleigh ${K('\\mathbf C = a_0\\mathbf M + a_1\\mathbf K_0')} con la rigidez inicial (ζ = ${f2(z0 * 100, 1)} % en los modos ${mi} y ${mj}: ${K(`a_0 = ${fe(ray.a0, 4)}\\;\\mathrm{s^{-1}},\\; a_1 = ${fe(ray.a1, 4)}\\;\\mathrm{s}`)}; ζ1 = ${f2(zn[0] * 100, 2)} %). Integración de Newmark (γ = 1/2, β = 1/4, incondicionalmente estable) con ${K(`\\Delta t = ${f2(nl.hs, 4)}\\;\\mathrm{s}`)}${nl.ns > 1 ? ` (registro subdividido ${nl.ns} veces para ${K('\\Delta t \\le T_n/20')})` : ''} y Newton-Raphson en cada paso: ${K('\\hat{\\mathbf p}_{i+1} - \\mathbf f_S(\\mathbf u) - \\mathbf a_1\\mathbf u = \\mathbf 0')}, ${K('\\hat{\\mathbf K}_T = \\mathbf K_T + \\mathbf M/(\\beta\\Delta t^2) + \\gamma\\mathbf C/(\\beta\\Delta t)')} (tridiagonal; Chopra Tabla 16.3.3); máximo ${nl.itMax} iteraciones por paso${nl.nfail ? `, <b>${nl.nfail} pasos sin convergencia</b>` : ''}.` + (pdelta ? ` P-Δ con columna ficticia: ${K('V_i = F_i(\\delta_i) - (P_i/h_i)\\delta_i')}, ${K('P_i = ' + (fP !== 1 ? f2(fP, 2) + '\\,' : '') + 'g\\sum_{j\\ge i}m_j')} (estabilidad elástica ${K('P_i/(k_ih_i)')} = [${nl.theta.map((t, i) => f2(t / k[i], 4)).join(', ')}]).` : '') + ` Se añaden ${f2(nl.Nf * dt, 1)} s de vibración libre después del registro; la deriva residual es la media de la deriva en los últimos ${K('2T_1')}. Contraste: el mismo modelo con resortes elásticos.`);
    const rows = []; for (let i = n - 1; i >= 0; i--) rows.push([String(i + 1), f2(nF(Vy[i]), 1), f2(nL(dy[i]), 3), f2(nF(nl.Fpk[i]), 1), f2(nL(nl.drPk[i]), 3), sg(drr[i], 4), sg(drrE[i], 4), f2(mu[i], 2), sg(dres[i], 3), f2(nM(nl.Eh[i]), 2)]);
    h += tableHtml(ctx, 'Respuesta máxima por entrepiso: no lineal vs elástica', ['Entrepiso', K('V_y') + ` [${lab(UF())}]`, K('\\delta_y') + ` [${UL()}]`, K('|V|_{\\max}') + ` [${lab(UF())}]`, K('\\delta_{\\max}') + ` [${UL()}]`, K('(\\Delta/h)_{NL}'), K('(\\Delta/h)_{el}'), K('\\mu'), K('\\Delta_{\\mathrm{res}}/h'), K('E_h') + ` [${lab(UM())}]`], rows);
    h += txt(`Techo: ${K(`u_{${n},\\max} = ${f2(nL(nl.uPk[n - 1]), 3)}\\;\\mathrm{${UL()}}`)} (elástico ${f2(nL(el.uPk[n - 1]), 3)}; razón ${f2(nl.uPk[n - 1] / el.uPk[n - 1], 3)}); cortante basal ${K(`V_{b,\\max} = ${f2(nF(nl.VbPk), 1)}\\;\\mathrm{${lab(UF())}} = ${f2(nl.VbPk / Wt, 4)}W`)} frente a ${f2(nF(el.VbPk), 1)} elástico (${K(`R_\\mu = V_{b,el}/V_{y,1} = ${f2(el.VbPk / Vy[0], 2)}`)}); ductilidad máxima ${K(`\\mu = ${f2(muMax, 2)}`)} en el entrepiso ${iCrit + 1}; deriva residual máxima ${K(`${sg(dresMax, 3)}`)}.`);
    const tagPD = pdelta ? ', con P-Δ' : ', sin P-Δ';
    h += chkLine(ctx, !collapsed, collapsed ? `\\delta/h > 0.10\\;\\text{en}\\; t = ${f2(nl.tCol, 2)}\\,\\mathrm{s}` : `(\\Delta/h)_{\\max} = ${sg(drMax, 4)} < 0.10`, 'Sin colapso dinámico (deriva de entrepiso < 10 %)' + tagPD, collapsed ? null : drMax / 0.1);
    if (nl.nfail) h += chkLine(ctx, false, `\\text{pasos sin convergencia} = ${nl.nfail}`, 'Convergencia de Newton-Raphson', null);
    const dl = String(b.dlim || '').trim() ? scal(b.dlim, S) : 0, ml = String(b.mulim || '').trim() ? scal(b.mulim, S) : 0, rl = String(b.dreslim || '').trim() ? scal(b.dreslim, S) : 0;
    if (dl > 0) h += chkLine(ctx, !collapsed && drMax <= dl, `(\\Delta/h)_{\\max} = ${sg(drMax, 4)} \\le ${f2(dl, 4)}`, 'Deriva máxima de entrepiso (tiempo-historia no lineal)' + tagPD, drMax / dl);
    if (ml > 0) h += chkLine(ctx, !collapsed && muMax <= ml, `\\mu_{\\max} = ${f2(muMax, 2)} \\le ${f2(ml, 2)}`, 'Ductilidad de entrepiso ≤ admisible' + tagPD, muMax / ml);
    if (rl > 0) h += chkLine(ctx, !collapsed && dresMax <= rl, `(\\Delta_{\\mathrm{res}}/h)_{\\max} = ${sg(dresMax, 3)} \\le ${f2(rl, 4)}`, 'Deriva residual (reparabilidad, FEMA P-58)' + tagPD, dresMax / rl);
    return h;
  },
});

// =====================================================================
//  4) PUSHOVER + PUNTO DE DESEMPEÑO (N2, ATC-40, FEMA 440, ASCE 41)
// =====================================================================
const LEVELS_DEF = 'OP 0.005 // Operacional\nIO 0.010 // Ocupación inmediata (ASCE 41 / FEMA 356 C1-3)\nLS 0.020 // Seguridad de vida\nCP 0.040 // Prevención del colapso';
registerBlock('pushover', {
  name: 'Pushover y punto de desempeño (N2 / ATC-40 / FEMA 440)', icon: 'plot', group: 'Dinámica',
  fields: [
    F('masas', 'Pesos o masas por nivel (1 → n); números = tonf de peso', 'W_i'),
    F('rigideces', 'Rigidez inicial de cada entrepiso (1 → n); números = tonf/m', 'k_i'),
    F('Vy', 'Cortante de fluencia de cada entrepiso (1 → n); números = tonf', 'Vy_i'),
    F('alturas', 'Altura de cada entrepiso (1 → n); números = m', 'h_i'),
    F('alpha', 'Rigidez post-fluencia α = k2/k (escalar o vector)', '0.05'),
    F('fcr', 'Trilineal: Vcr/Vy (vacío = bilineal)', ''),
    F('r2', 'Trilineal: rigidez fisurada / inicial', '0.5'),
    F('patron', 'Patrón de cargas laterales', '', 'select', [['modal', 'Modal s = M·φ1 (EC8 / N2)'], ['triangular', 'Triangular s = m·h'], ['uniforme', 'Uniforme s = m']]),
    F('druEnd', 'Deriva de entrepiso al final de la curva (capacidad)', '0.04'),
    F('pdelta', 'Incluir P-Δ (columna ficticia con el peso de los niveles superiores)', '', 'check'),
    F('fP', 'P-Δ: carga de gravedad / peso sísmico', '1.0'),
    F('drcap', 'Degradación: deriva δc/h de inicio de la rama descendente (vacío = sin degradación)', ''),
    F('acap', 'Degradación: pendiente de la rama descendente −ac·k (ac)', '0.10'),
    F('rescap', 'Degradación: resistencia residual / Vy', '0.20'),
    F('Sa', 'Espectro elástico Sa/g (R = 1, ζ = 5 %) en función de T', 'Z*U*CE030d(T, Tp, Tl)*S'),
    F('Tc', 'Periodo de esquina TC (fin de la meseta: TP de E.030)', 'Tp'),
    F('metodo', 'Método que gobierna el desplazamiento objetivo', '', 'select', [['N2', 'N2 (Fajfar / EC8 Anexo B)'], ['ATC40', 'ATC-40 espectro de capacidad (Proc. A)'], ['FEMA440', 'FEMA 440 linealización equivalente'], ['ASCE41', 'ASCE 41 método de coeficientes']]),
    F('tipo', 'ATC-40: tipo de comportamiento estructural', '', 'select', [['A', 'Tipo A (histéresis estable)'], ['B', 'Tipo B (degradación moderada)'], ['C', 'Tipo C (histéresis pobre)']]),
    F('asitio', 'ASCE 41: coeficiente a del sitio', '', 'select', [['130', '130 (sitios A, B, C)'], ['90', '90 (sitio D)'], ['60', '60 (sitios E, F)']]),
    F('Cm', 'ASCE 41: factor de masa efectiva Cm', '1.0'),
    F('niveles', 'Niveles de desempeño: "nombre deriva // descripción"', LEVELS_DEF, 'area'),
    F('nivel', 'Nivel de desempeño objetivo', 'LS'),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: '0.05', patron: 'modal', druEnd: '0.04', Sa: 'Sa(T)', Tc: 'Tp', metodo: 'N2', tipo: 'B', asitio: '130', Cm: '1.0', niveles: LEVELS_DEF, nivel: 'LS', r2: '0.5' },
  hint: 'Curva de capacidad de un edificio de cortante con resortes de entrepiso bilineales o trilineales (control de desplazamiento por bisección), conversión a 1 GDL (Γ, m*) y formato ADRS, punto de desempeño por N2 (EC8 Anexo B), ATC-40 Procedimiento A (κ por tipo A/B/C), FEMA 440 (linealización equivalente) y ASCE 41 (C0·C1·C2). Exporta <code>dobj, dN2, dATC, dFEMA, dC, Vobj, Tstar, mu, derivamax, Gam, mstar, beffATC</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const m = vecSI(b.masas, S, 'mass', 'las masas'), k = vecSI(b.rigideces, S, 'stiff', 'las rigideces'), Vy = vecSI(b.Vy, S, 'force', 'los cortantes de fluencia'), he = vecSI(b.alturas, S, 'length', 'las alturas');
    const n = m.length;
    if (k.length !== n || Vy.length !== n || he.length !== n) throw new Error(`Se requieren ${n} valores de rigidez, Vy y altura (uno por entrepiso)`);
    if ([...m, ...k, ...Vy, ...he].some(x => !(x > 0))) throw new Error('Masas, rigideces, resistencias y alturas deben ser positivas');
    const av = evalAny(b.alpha || '0.05', S), alpha = math.isMatrix(av) || Array.isArray(av) ? (math.isMatrix(av) ? av.toArray() : av).flat().map(Number) : Number(av);
    const fcr = String(b.fcr || '').trim() ? scal(b.fcr, S) : 0, r2 = scal(b.r2, S, 0.5);
    const druEnd = scal(b.druEnd, S, 0.04);
    const pdelta = truthy(b.pdelta), fP = scal(b.fP, S, 1);
    const drcap = String(b.drcap || '').trim() ? scal(b.drcap, S) : 0;
    const capo = drcap > 0 ? { dr: drcap, ac: Math.abs(scal(b.acap, S, 0.1)), res: scal(b.rescap, S, 0.2) } : null;
    const pattern = ['modal', 'triangular', 'uniforme'].includes(b.patron) ? b.patron : 'modal';
    const Sa = makeSa(b.Sa || '0', S), Tc = evalParam(b.Tc, S, 's', 0.6);
    const type = ['A', 'B', 'C'].includes(b.tipo) ? b.tipo : 'B';
    const asit = Number(b.asitio) || 130, Cm = scal(b.Cm, S, 1);
    let po;
    try { po = memo(['po', m, k, Vy, he, alpha, fcr, r2, druEnd, pattern, pdelta, fP, JSON.stringify(capo)].join('|'), () => pushoverShear({ m, k, Vy, h: he, alpha, pattern, fcr, r2, druEnd, pdelta, fP, cap: capo })); }
    catch (e) { if (e.unstable === undefined) throw e; { const Ht = sum(he), T0 = shearModes(m, k)[0].T; ['dobj', 'dN2', 'dC'].forEach(nm => setVar(ctx, nm + sf, uL(Ht))); setVar(ctx, 'mu' + sf, 999); setVar(ctx, 'derivamax' + sf, 1); setVar(ctx, 'Tpo1' + sf, math.unit(T0, 's')); }   /* valores centinela finitos: estructura inestable */ return txt(esc(e.message) + ' — la estructura es inestable ante cargas de gravedad: no existe curva de capacidad (se exportan valores centinela: desplazamientos = altura total, μ = 999, deriva = 1).') + chkLine(ctx, false, `\\theta_{${e.unstable + 1}} = P/(k\\,h) \\ge 1`, 'Estabilidad elástica de entrepiso con P-Δ', null); }
    // pendiente global solo por P-Δ (para αP-Δ de ASCE 41 Ec. 7-32): pushover elastoplástico sin degradación
    let aPD = 0;
    if (pdelta) { const pe = memo(['poPD', m, k, Vy, he, fcr, r2, druEnd, pattern, fP].join('|'), () => pushoverShear({ m, k, Vy, h: he, alpha: 1e-5, pattern, fcr, r2, druEnd, pdelta, fP })); const c2 = pe.curve, A = c2[c2.length - 2], B = c2[c2.length - 1]; aPD = Math.min(((B.Vb - A.Vb) / (B.d - A.d || 1)) / (c2[1].Vb / c2[1].d), 0); }
    const Gm = po.Gam, ms = po.mstar, Wt = po.Mt * G;
    const cap = po.curve.slice(1).map(q => [q.d / Gm, q.Vb / Gm / ms]);    // ADRS: Sd (m), Sa (m/s²)
    const T1 = po.modes[0].T;
    const n2 = n2Method(cap, Sa, Tc);
    const atc = atc40CSM(cap, Sa, Tc, type);
    const fem = fema440ELM(cap, Sa);
    const curveG = po.curve.slice(1).map(q => [q.d, q.Vb]);
    const C0 = Gm;   // Γ1·φ_techo con φ_techo = 1 (ASCE 41 §7.4.3.3.2)
    const cm = coefMethod(curveG, Wt, Sa, T1, C0, asit, Cm, { alphaPD: aPD });
    const res = { N2: n2.dt * Gm, ATC40: atc && atc.ok ? atc.dp * Gm : NaN, FEMA440: fem && fem.ok ? fem.dp * Gm : NaN, ASCE41: cm.dt };
    const met = ['N2', 'ATC40', 'FEMA440', 'ASCE41'].includes(b.metodo) ? b.metodo : 'N2';
    const dEnd = po.dEnd;
    const solOk = isFinite(res[met]);    // sin punto de desempeño (ATC-40/FEMA 440 sin intersección) → NO CUMPLE
    const dobj = solOk ? res[met] : dEnd * 1.0000001;
    const within = solOk && dobj <= dEnd * (1 + 1e-9);
    const stAt = (d) => po.stateAt(Math.min(d, dEnd));
    const obj = stAt(dobj);
    const drr = obj.dr.map((d, i) => d / he[i]), drMax = Math.max(...drr);
    const dyStar = n2.dy, dyRoof = dyStar * Gm, mu = dobj / dyRoof;
    // niveles de desempeño
    const levels = String(b.niveles || LEVELS_DEF).split('\n').map(l => { const [a, c] = l.split('//'); const t = (a || '').trim().split(/\s+/); return t.length >= 2 ? { id: t[0], lim: scal(t.slice(1).join(' '), S), d: (c || '').trim() } : null; }).filter(Boolean).sort((a, c) => a.lim - c.lim);
    const lvl = levels.find(l => l.id.toLowerCase() === String(b.nivel || 'LS').trim().toLowerCase()) || levels[levels.length - 1];
    const reached = levels.find(l => drMax <= l.lim);
    // exportar
    const ex = (nme, v) => setVar(ctx, nme + sf, v);
    ex('dobj', uL(dobj)); ex('dN2', uL(res.N2)); if (isFinite(res.ATC40)) ex('dATC', uL(res.ATC40)); if (isFinite(res.FEMA440)) ex('dFEMA', uL(res.FEMA440)); ex('dC', uL(res.ASCE41));
    ex('Vobj', uF(obj.Vb)); ex('Tstar', math.unit(n2.Ts, 's')); ex('Fystar', uF(n2.Fy * ms)); ex('dystar', uL(n2.dy)); ex('mu', mu); ex('derivamax', drMax); ex('deriva_obj', math.matrix(drr));
    ex('Gam', Gm); ex('mstar', math.unit(ms, 'kg')); ex('Tpo1', math.unit(T1, 's')); ex('dcap', uL(dEnd)); const ev1 = po.ev.find(e => e.tipo === 'fluencia'); if (ev1) ex('Vyb', uF(ev1.Vb)); ex('Vbmax', uF(po.Vbmax)); ex('Te41', math.unit(cm.Te, 's'));
    if (atc && atc.ok) ex('beffATC', atc.beff / 100); if (fem && fem.ok) ex('beffFEMA', fem.beff / 100);
    if (lvl) ex('dlim_obj', lvl.lim);
    // ---------- figura 1: curva de capacidad | ADRS ----------
    const W = 720, top = 28, pw = 300, ph = 220;
    let g = '';
    const shapes = { N2: ['o', C.red], ATC40: ['s', C.green], FEMA440: ['d', '#8250df'], ASCE41: ['t', C.orange] };
    const mlbl = { N2: 'N2', ATC40: 'ATC-40', FEMA440: 'FEMA 440', ASCE41: 'ASCE 41' };
    {
      const xs = po.curve.map(q => nL(q.d)), ys = po.curve.map(q => nF(q.Vb));
      const xm = Math.max(xs[xs.length - 1], ...Object.values(res).filter(isFinite).map(nL)) * 1.05;
      const fr = frame(56, top, pw, ph, [0, xm], [0, Math.max(...ys) * 1.15], { title: 'Curva de capacidad Vb – u techo', xl: `u techo [${UL()}]`, yl: `Vb [${lab(UF())}]`, nx: 5, ny: 5, yf: t => f2(t, 0) });
      g += fr.g + P(pathXY(xs, ys, fr), C.blue, 2);
      po.ev.filter(e => e.d <= dEnd).forEach(e => { g += dot(fr.X(nL(e.d)), fr.Y(nF(e.Vb)), e.tipo === 'fluencia' ? C.ink : C.axis, 2.6) + (e.tipo === 'fluencia' ? TX(fr.X(nL(e.d)) + 4, fr.Y(nF(e.Vb)) + 11, 'y' + (e.i + 1), { fs: 8, a: 'start', c: C.axis }) : ''); });
      // bilineal N2 equivalente (sistema MDOF)
      g += P(`M${fr.X(0)},${fr.Y(0)}L${fr.X(nL(dyRoof)).toFixed(1)},${fr.Y(nF(n2.Fy * ms * Gm)).toFixed(1)}L${fr.X(nL(Math.min(n2.dt, cap[cap.length - 1][0]) * Gm)).toFixed(1)},${fr.Y(nF(n2.Fy * ms * Gm)).toFixed(1)}`, C.red, 1, '4 3');
      Object.entries(res).forEach(([kk, d]) => { if (!isFinite(d)) return; const st = stAt(d); g += mark(fr.X(nL(d)), fr.Y(nF(st.Vb)), shapes[kk][1], shapes[kk][0], kk === met ? 5 : 3.6); });
      g += Lne(fr.X(nL(dEnd)), top, fr.X(nL(dEnd)), top + ph, C.axis, 0.8, '2 3') + TX(fr.X(nL(dEnd)) - 3, top + 12, 'fin de la curva', { fs: 8, a: 'end', c: C.axis });
    }
    {
      const x0 = 56 + pw + 70;
      const capX = cap.map(p => nL(p[0])), capY = cap.map(p => p[1] / G);
      const Tg = Array.from({ length: 220 }, (_, i) => 0.02 + i * 0.02);
      const elX = Tg.map(t => nL(Sa(t) * (t / PI2) ** 2)), elY = Tg.map(t => Sa(t) / G);
      const xm = Math.max(capX[capX.length - 1], n2.det ? nL(n2.det) : 0, nL(n2.dt)) * 1.15;
      const ym = Math.max(...capY, Sa(Tc) / G) * 1.12;
      const fr = frame(x0, top, pw, ph, [0, xm], [0, ym], { title: 'Formato ADRS: Sa – Sd', xl: `Sd [${UL()}]`, yl: 'Sa/g', nx: 5, ny: 5 });
      const clip = `<clipPath id="adrs${ctx.blockId}"><rect x="${x0}" y="${top}" width="${pw}" height="${ph}"/></clipPath>`;
      let inner = P(pathXY(elX, elY, fr), C.ink, 1.4);
      if (atc && atc.ok) { const rY = Tg.map(t => atc.dem(t) / G), rX = Tg.map((t, i) => nL(rY[i] * G * (t / PI2) ** 2)); inner += P(pathXY(rX, rY, fr), C.green, 1.2, '6 3'); }
      if (fem && fem.ok) { const rY = Tg.map(t => Sa(t) / fem.B / G), rX = Tg.map((t, i) => nL(rY[i] * G * (t / PI2) ** 2)); inner += P(pathXY(rX, rY.map(v => v * fem.M), fr), '#8250df', 1.1, '2 2'); }
      // radial T* y bilineal N2
      const Ts = n2.Ts, rr = Math.min(ym * G, xm / nL(1) * (PI2 / Ts) ** 2);
      inner += Lne(fr.X(0), fr.Y(0), fr.X(nL(rr * (Ts / PI2) ** 2)), fr.Y(rr / G), C.red, 0.8, '3 3');
      inner += P(`M${fr.X(0)},${fr.Y(0)}L${fr.X(nL(n2.dy)).toFixed(1)},${fr.Y(n2.Fy / G).toFixed(1)}L${fr.X(nL(Math.max(n2.dt, n2.dy))).toFixed(1)},${fr.Y(n2.Fy / G).toFixed(1)}`, C.red, 1.2);
      inner += P(pathXY(capX, capY, fr), C.blue, 2.2);
      g += clip + fr.g + `<g clip-path="url(#adrs${ctx.blockId})">${inner}</g>`;
      g += mark(fr.X(nL(n2.dt)), fr.Y(Math.min(n2.Fy, n2.Fy) / G), shapes.N2[1], 'o', met === 'N2' ? 5 : 3.6);
      if (atc && atc.ok) g += mark(fr.X(nL(atc.dp)), fr.Y(atc.ap / G), shapes.ATC40[1], 's', met === 'ATC40' ? 5 : 3.6);
      if (fem && fem.ok) g += mark(fr.X(nL(fem.dp)), fr.Y(fem.ap / G), shapes.FEMA440[1], 'd', met === 'FEMA440' ? 5 : 3.6);
      g += TX(fr.X(nL(0.8 * rr * (Ts / PI2) ** 2)) - 6, fr.Y(0.8 * rr / G) + 3, `T* = ${f2(Ts, 3)} s`, { fs: 8.5, a: 'end', c: C.red });
    }
    const ly = top + ph + 44;
    g += legend(56, ly, [['Capacidad', C.blue], ['Espectro elástico 5 %', C.ink], ['Bilineal N2 (áreas iguales)', C.red]]);
    g += legend(300, ly, [[`ATC-40 reducido (βeff = ${atc && atc.ok ? f2(atc.beff, 1) : '—'} %)`, C.green, '6 3'], [`FEMA 440 MADRS (βeff = ${fem && fem.ok ? f2(fem.beff, 1) : '—'} %)`, '#8250df', '2 2']]);
    let lx = 560; Object.entries(res).forEach(([kk, d], i) => { if (!isFinite(d)) return; g += mark(lx + 4, ly - 3 + i * 13, shapes[kk][1], shapes[kk][0], 3.5) + TX(lx + 12, ly + i * 13, `${mlbl[kk]}: ${f2(nL(d), 1)} ${UL()}`, { fs: 9, a: 'start', b: kk === met ? 1 : 0 }); });
    let h = `<div class="figure">${svgWrap(W, ly + 50, g)}${caption(ctx, b.titulo || `Curva de capacidad (patrón ${pattern}), espectro de capacidad y puntos de desempeño`)}</div>`;
    // ---------- texto: conversión y métodos ----------
    h += txt(`Resortes de entrepiso ${fcr > 0 ? 'trilineales (fisuración en ' + K(`V_{cr} = ${f2(fcr, 2)}V_y`) + ', rigidez fisurada ' + K(`${f2(r2, 2)}k_i`) + ')' : 'bilineales'} con rigidez post-fluencia ${K('\\alpha k_i')}; para un edificio de cortante los cortantes de entrepiso son ${K('V_i = V_b\\,\\sum_{j\\ge i}s_j/\\sum s_j')} y el desplazamiento del techo ${K('u_N = \\sum_i \\delta_i(V_i)')}; la curva se obtiene por control de desplazamiento (bisección sobre ${K('V_b')}) hasta una deriva de entrepiso de ${f2(druEnd, 3)}. Forma ${K('\\boldsymbol\\Phi = \\mathbf s/\\mathbf m')} normalizada al techo: [${po.Phi.map(x => f2(x, 3)).join(', ')}]; ${K(`m^* = \\sum m_i\\Phi_i = ${f2(conv(ms, 'kg', sys() === 'us' ? 'kip*s^2/in' : sys() === 'si' ? 'tonne' : 'tonf*s^2/m'), 3)}\\;\\mathrm{${sys() === 'us' ? 'kip\\,s^2/in' : sys() === 'si' ? 't' : 'tonf\\,s^2/m'}}`)}, ${K(`\\Gamma = m^*/\\sum m_i\\Phi_i^2 = ${f2(Gm, 4)}`)}; ${K('S_d = u_N/\\Gamma')}, ${K('S_a = V_b/(\\Gamma m^*)')} (equivale a ATC-40: ${K(`PF_1\\phi_{N} = \\Gamma`)}, ${K(`\\alpha_1 = \\Gamma m^*/M = ${f2(po.alpha1, 4)}`)}). Periodo elástico ${K(`T_1 = ${f2(T1, 4)}\\;\\mathrm{s}`)}.`);
    if (pdelta || capo) h += txt((pdelta ? `Efecto P-Δ con una columna ficticia: cada entrepiso pierde la rigidez ${K('\\theta_i = P_i/h_i')}, con ${K('P_i = ' + (fP !== 1 ? f2(fP, 2) + '\\,' : '') + 'g\\sum_{j\\ge i} m_j')}: ${K('V_i = F_i(\\delta_i) - (P_i/h_i)\\,\\delta_i')}; coeficientes de estabilidad elástica ${K('P_i/(k_ih_i)')} = [${po.theta.map((t, i) => f2(t / k[i], 4)).join(', ')}]. ` : '') + (capo ? `Degradación de resistencia: a partir de la deriva ${K(`\\delta_c/h = ${f2(capo.dr, 4)}`)} la envolvente del resorte desciende con pendiente ${K(`-${f2(capo.ac, 3)}k_i`)} hasta la resistencia residual ${K(`${f2(capo.res, 2)}V_y`)} (modelo tipo ASCE 41 / Ibarra-Krawinkler sin degradación cíclica). ` : '') + `La curva se obtiene con la solución exacta del sistema de resortes en serie: hasta el máximo se invierte analíticamente la envolvente neta de cada entrepiso para el cortante ${K('V_i = V_b\\sum_{j\\ge i} s_j/\\sum s_j')}; después se controla la deriva del entrepiso crítico y los demás descargan con ${K('k_i - \\theta_i')}. Fin de la curva por ${po.endBy === 'resistencia' ? 'caída de la resistencia al 20 % del máximo' : po.endBy === 'convergencia' ? 'falta de convergencia' : 'deriva de entrepiso ' + f2(druEnd, 3)}; ${K(`V_{b,\\max} = ${f2(nF(po.Vbmax), 1)}\\;\\mathrm{${lab(UF())}}`)}` + (pdelta ? `; pendiente global por P-Δ ${K(`\\alpha_{P\\text{-}\\Delta} = ${f2(aPD, 4)}`)}.` : '.'));
    const mrows = [];
    mrows.push(['N2 (EC8 Anexo B)', `${K(`F_y^* = ${f2(nF(n2.Fy * ms), 1)}`)} ${lab(UF())}; ${K(`d_y^* = ${f2(nL(n2.dy), 2)}`)} ${UL()}; ${K(`T^* = ${f2(n2.Ts, 4)}`)} s; ${K(`S_e(T^*) = ${f2(n2.Se / G, 4)}g`)}; ${K(`q_u = ${f2(n2.qu, 3)}`)}; ${K(`d_{et}^* = ${f2(nL(n2.det), 2)}`)} ${UL()}; ${K(`d_t^* = ${f2(nL(n2.dt), 2)}`)} ${UL()} — ${esc(n2.regla)} (${n2.it} iter.)`, f2(nL(res.N2), 2)]);
    mrows.push(['ATC-40 Proc. A (tipo ' + type + ')', atc && atc.ok ? `${K(`d_y = ${f2(nL(atc.dy), 2)}`)} ${UL()}, ${K(`a_y = ${f2(atc.ay / G, 3)}g`)}; ${K(`\\beta_0 = ${f2(atc.b0, 2)}\\%`)}; ${K(`\\kappa = ${f2(atc.kap, 3)}`)}; ${K(`\\beta_{eff} = ${f2(atc.beff, 2)}\\%`)}; ${K(`SR_A = ${f2(atc.SRA, 3)},\\; SR_V = ${f2(atc.SRV, 3)}`)}; punto de desempeño (${f2(nL(atc.dp), 2)} ${UL()}; ${f2(atc.ap / G, 3)}g) (${atc.it} iter.)` : esc(atc ? atc.msg : '—'), atc && atc.ok ? f2(nL(res.ATC40), 2) : '—']);
    mrows.push(['FEMA 440 (§6.2, ELM)', fem && fem.ok ? `${K(`\\mu = ${f2(fem.mu, 2)}`)}; ${K(`\\alpha = ${f2(fem.alpha, 3)}`)}; ${K(`\\beta_{eff} = ${f2(fem.beff, 2)}\\%`)}; ${K(`T_{eff} = ${f2(fem.Teff, 4)}`)} s; ${K(`B = ${f2(fem.B, 3)}`)}; ${K(`M = ${f2(fem.M, 3)}`)}; ${K(`d_p = S_a(T_{eff})/B\\cdot(T_{eff}/2\\pi)^2`)} (${fem.it} iter.)` : esc(fem ? fem.msg : '—'), fem && fem.ok ? f2(nL(res.FEMA440), 2) : '—']);
    mrows.push(['ASCE 41-17 coeficientes', `${K(`C_0 = \\Gamma = ${f2(cm.C0, 3)}`)}; bilineal §7.4.3.2.4: ${K(`V_y = ${f2(nF(cm.Vy), 1)}`)} ${lab(UF())}, ${K(`K_e = 0.6V_y/\\delta_{0.6V_y}`)}, ${K(`T_e = T_i\\sqrt{K_i/K_e} = ${f2(cm.Te, 3)}`)} s; ${K(`\\mu_{strength} = ${f2(cm.mu, 3)}`)}${cm.a2 !== null ? `; ${K(`\\alpha_2 = ${f2(cm.a2, 3)},\\; \\alpha_e = ${f2(cm.ae, 3)},\\; \\mu_{\\max} = ${f2(cm.mumax, 2)}`)}` : ''}; ${K(`C_1 = ${f2(cm.C1, 3)}`)}; ${K(`C_2 = ${f2(cm.C2, 3)}`)}; ${K('\\delta_t = C_0C_1C_2S_a\\,T_e^2 g/4\\pi^2')}`, f2(nL(res.ASCE41), 2)]);
    h += tableHtml(ctx, 'Desplazamiento objetivo del techo por método', ['Método', 'Parámetros', K('u_{t}') + ` [${UL()}]`], mrows.map(r => [(r[0].startsWith(mlbl[met]) || (met === 'ATC40' && r[0].startsWith('ATC')) || (met === 'ASCE41' && r[0].startsWith('ASCE')) ? '<b>' + r[0] + '</b>' : r[0]), r[1], r[2]]));
    // estado por entrepiso
    const lvlOf = (d) => { const L = levels.find(l => d <= l.lim); return L ? L.id : '> ' + (levels[levels.length - 1] || { id: '' }).id; };
    const rows = []; for (let i = n - 1; i >= 0; i--) { const Vi = obj.Vb * po.Sx[i] + (po.theta ? po.theta[i] * obj.dr[i] : 0), dy = Vy[i] / k[i] * (fcr > 0 ? (fcr + (1 - fcr) / r2) : 1); rows.push([String(i + 1), f2(nF(Vi), 1), f2(nF(Vy[i]), 1), f2(Vi / Vy[i], 3), f2(nL(obj.dr[i]), 2), f2(obj.dr[i] / dy, 2), sg(drr[i], 3), lvlOf(drr[i])]); }
    h += tableHtml(ctx, `Estado de los entrepisos en el desplazamiento objetivo (${mlbl[met]}: ${f2(nL(dobj), 2)} ${UL()}, Vb = ${f2(nF(obj.Vb), 1)} ${lab(UF())})`, ['Entrepiso', K('V_i') + ` [${lab(UF())}]`, K('V_{y,i}') + ` [${lab(UF())}]`, K('V_i/V_{y,i}'), K('\\delta_i') + ` [${UL()}]`, K('\\mu_i = \\delta_i/\\delta_{y,i}'), K('\\delta_i/h_i'), 'Nivel'], rows);
    h += txt(`Ductilidad global ${K(`\\mu = u_t/(\\Gamma d_y^*) = ${f2(nL(dobj), 2)}/${f2(nL(dyRoof), 2)} = ${f2(mu, 2)}`)}; deriva máxima ${K(`(\\delta/h)_{\\max} = ${sg(drMax, 4)}`)} → nivel alcanzado: <b>${reached ? esc(reached.id + (reached.d ? ' — ' + reached.d : '')) : 'más allá de ' + esc((levels[levels.length - 1] || { id: '' }).id)}</b>. Niveles: ${levels.map(l => `${esc(l.id)} ${f2(l.lim * 100, 2)} %`).join(' · ')}.`);
    if (!solOk) h += chkLine(ctx, false, `\\text{${mlbl[met]}: sin punto de desempeño}`, esc(met === 'ATC40' ? (atc && atc.msg) || 'sin intersección' : met === 'FEMA440' ? (fem && fem.msg) || 'sin solución' : 'sin solución') + ' — la estructura no alcanza la demanda', null);
    else h += chkLine(ctx, within, `u_t = ${f2(nL(dobj), 2)} \\le u_{cap} = ${f2(nL(dEnd), 2)}\\;\\mathrm{${UL()}}`, `Desplazamiento objetivo (${mlbl[met]}) dentro de la capacidad de la curva`, dobj / dEnd);
    if (cm.a2 !== null && cm.a2 < 0) h += chkLine(ctx, !cm.unstable, `\\mu_{strength} = ${f2(cm.mu, 2)} \\le \\mu_{\\max} = \\Delta_d/\\Delta_y + |\\alpha_e|^{-h}/4 = ${f2(cm.mumax, 2)}`, 'Sin inestabilidad dinámica lateral con pendiente negativa (ASCE 41-17 Ec. 7-32)', cm.mu / cm.mumax);
    if (lvl) h += chkLine(ctx, within && drMax <= lvl.lim, `(\\delta/h)_{\\max} = ${sg(drMax, 4)} \\le ${f2(lvl.lim, 4)}`, `Deriva en el punto de desempeño ≤ límite del nivel ${lvl.id}${lvl.d ? ' (' + lvl.d + ')' : ''}`, drMax / lvl.lim);
    return h;
  },
});

// =====================================================================
//  5) MOMENTO–CURVATURA POR FIBRAS
// =====================================================================
function parseBar(tok) {
  const t = String(tok).trim().replace(/^#/, '');
  const mm = /^(?:ø|Ø|phi)?(\d+(?:\.\d+)?)\s*mm$/i.exec(t);
  if (mm) { const d = +mm[1]; return { db: d, Ab: Math.PI * d * d / 4 }; }
  const n = Math.round(Number(t)); const B = BARS[n]; if (!B) throw new Error('Varilla no reconocida: ' + tok + ' (use #3…#11 o 16mm)');
  return { db: B.d * 10, Ab: B.A * 100 };
}
registerBlock('momcurv', {
  name: 'Momento–curvatura por fibras (concreto armado)', icon: 'section', group: 'Dinámica',
  fields: [
    F('b', 'Ancho b', '40 cm'), F('h', 'Peralte h (dirección de flexión)', '60 cm'), F('rec', 'Recubrimiento libre hasta el estribo', '4 cm'),
    F('fc', "f'c", 'fc'), F('fy', 'fy', 'fy'), F('Es', 'Es', '200000 MPa'),
    F('capas', 'Capas de acero (desde la fibra superior): "n varilla d" — p. ej. "4 8 6 cm"', '4 8 6.6 cm\n2 8 30 cm\n4 8 53.4 cm', 'area'),
    F('estribo', 'Estribo: varilla (#3, 3, 10mm…)', '3'), F('s', 'Separación de estribos s', '10 cm'),
    F('nlb', 'Ramas paralelas a b (cortando h)', '2'), F('nlh', 'Ramas paralelas a h (cortando b)', '3'), F('fyh', 'fyh del estribo', 'fy'),
    F('P', 'Carga axial P (compresión +)', '0 tonf'),
    F('concreto', 'Modelo del concreto', '', 'select', [['mander', 'Mander (núcleo confinado + recubrimiento no confinado)'], ['hognestad', 'Hognestad (sin confinamiento)']]),
    F('confin', "Mander: f'cc con f'lx ≠ f'ly", '', 'select', [['triaxial', 'Superficie triaxial de 5 parámetros (ábaco de Mander 1988, Fig. 4)'], ['promedio', "Simplificación: f'l promedio (sobrestima f'cc)"], ['minimo', "Conservador: f'l mínimo"]]),
    F('k3', "Hognestad: f''c = k3·f'c", '0.85'),
    F('acero', 'Modelo del acero', '', 'select', [['park', 'Park-Paulay (fluencia, εsh, endurecimiento a fsu)'], ['bilineal', 'Bilineal con endurecimiento b = Esh/Es'], ['epp', 'Elastoplástico perfecto']]),
    F('bsh', 'Bilineal: b = Esh/Es', '0.01'), F('esh', 'Park: εsh', '0.008'), F('esu', 'εsu (acero longitudinal y de estribos)', '0.09'), F('rsu', 'fsu/fy', '1.35'),
    F('traccion', 'Considerar resistencia a tracción del concreto (Mcr)', '', 'check'),
    F('L', 'Longitud de cortante L (de la rótula al punto de inflexión)', '1.5 m'),
    F('mureq', 'Ductilidad de curvatura requerida μφ (opcional)', ''),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { b: '40 cm', h: '60 cm', rec: '4 cm', fc: '280 kgf/cm^2', fy: '4200 kgf/cm^2', Es: '200000 MPa', capas: '4 8 6.6 cm\n2 8 30 cm\n4 8 53.4 cm', estribo: '3', s: '10 cm', nlb: '2', nlh: '3', fyh: '4200 kgf/cm^2', P: '0 tonf', concreto: 'mander', k3: '0.85', acero: 'park', bsh: '0.01', esh: '0.008', esu: '0.09', rsu: '1.35', traccion: true, L: '1.5 m' },
  hint: 'Discretiza la sección en ~120 franjas (núcleo confinado de Mander y recubrimiento no confinado que se descascara) y barras; para cada curvatura busca la deformación que equilibra la carga axial (bisección) y suma momentos. Reporta fisuración, primera fluencia, momento nominal (εc = 0.004 o εs = 0.015), última (εcu de Priestley), ductilidad de curvatura, Lp de Paulay-Priestley y rotación plástica. Exporta <code>Mcr, My1, phiy1, Mn, phiy, Mu, phiu, muphi, Lp, thetap, muD, fcc, ecu</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const mm = (x, d) => evalParam(x, S, 'mm', d), MPa = (x, d) => evalParam(x, S, 'MPa', d);
    const bb = mm(b.b), hh = mm(b.h), cover = mm(b.rec, 40), fc = MPa(b.fc), fy = MPa(b.fy), Es = MPa(b.Es, 200000);
    if (!(bb > 0 && hh > 0 && fc > 0 && fy > 0)) throw new Error('Indique b, h, f\'c y fy positivos');
    const est = parseBar(b.estribo || '3');
    const layers = String(b.capas || '').split('\n').map(l => l.split('//')[0].trim()).filter(Boolean).map(l => {
      const t = l.split(/\s+/); if (t.length < 3) throw new Error('Capa inválida: "' + l + '" (use: n varilla d)');
      const nb = Math.round(Number(t[0])), br = parseBar(t[1]), d = mm(t.slice(2).join(' '));
      if (!(nb > 0) || !(d > 0 && d < hh)) throw new Error('Capa inválida: "' + l + '"');
      return { n: nb, db: br.db, As: nb * br.Ab, d };
    }).sort((p, q) => p.d - q.d);
    if (layers.length < 2) throw new Error('Defina al menos dos capas de acero');
    const Pn = evalParam(b.P, S, 'N', 0);
    const conc = b.concreto === 'hognestad' ? 'hognestad' : 'mander';
    const model = ['park', 'bilineal', 'epp'].includes(b.acero) ? b.acero : 'park';
    const steel = { fy, Es, model, b: scal(b.bsh, S, 0.01), esh: scal(b.esh, S, 0.008), esu: scal(b.esu, S, 0.09), fsu: scal(b.rsu, S, 1.35) * fy };
    const confMode = ['triaxial', 'promedio', 'minimo'].includes(b.confin) ? b.confin : 'triaxial';
    const p = { confMode, b: bb, h: hh, cover, dbh: est.db, s: mm(b.s, 100), nlb: scal(b.nlb, S, 2), nlh: scal(b.nlh, S, 2), fyh: MPa(b.fyh, fy), esuh: steel.esu, fc, conc, k3: scal(b.k3, S, 0.85), tension: truthy(b.traccion), steel, layers, P: Pn, nf: 120 };
    const R = memo('mc|' + JSON.stringify(p), () => momentCurvature(p));
    if (!R.fy1) {   // sin fluencia (p. ej. carga axial mayor que la capacidad o falla frágil por compresión): NO CUMPLE
      const UMm0 = UM(), uMom0 = (Nmm) => math.unit(conv(Nmm / 1000, 'N*m', UMm0), UMm0);
      const ex0 = (n, v) => setVar(ctx, n + sf, v);
      ex0('Mn', uMom0(R.Mmax)); ex0('Mu', uMom0(R.Mmax)); ex0('Mmax', uMom0(R.Mmax)); ex0('My1', uMom0(R.Mmax)); ex0('muphi', 1); ex0('muD', 1); ex0('thetap', 0); ex0('Lp', math.unit(0, 'cm'));
      if (conc === 'mander') { ex0('fcc', math.unit(R.conf.fcc, 'MPa')); ex0('ecu', R.conf.ecu); ex0('ke', R.conf.ke); }
      return txt(`La sección no alcanza la fluencia del acero ni ${K('\\varepsilon_c = 0.002')} antes de la falla (${esc(R.fail || 'sin equilibrio')}); con ${K(`P = ${f2(nF(Pn), 1)}\\;\\mathrm{${lab(UF())}}`)} la carga axial supera la capacidad o la falla es frágil. ${K(`M_{\\max} = ${f2(conv(R.Mmax / 1000, 'N*m', UMm0), 2)}\\;\\mathrm{${lab(UMm0)}}`)}.`) + chkLine(ctx, false, `\\text{sin fluencia: } \\mu_\\varphi = 1`, 'Comportamiento dúctil de la sección (fluencia antes de la falla)', null);
    }
    const Lmm = mm(b.L, 1500), dbl = Math.max(...layers.map(l => l.db));
    const Lp = Math.max(0.08 * Lmm + 0.022 * dbl * fy, 0.044 * dbl * fy);    // Paulay-Priestley (1992) Ec. 4.30; ≥ 2Lsp (Priestley 2007)
    const phiY = R.phiY, phiU = R.ult.phi, muphi = phiU / phiY, thp = (phiU - phiY) * Lp;
    const Dy = phiY * Lmm * Lmm / 3, Dp = thp * (Lmm - Lp / 2), muD = 1 + Dp / Dy;
    // unidades de salida
    const UMm = UM(), Mout = (Nmm) => conv(Nmm / 1000, 'N*m', UMm), phiOut = (pm) => conv(pm * 1000, 'm^-1', UPHI());
    const ex = (n, v) => setVar(ctx, n + sf, v);
    const uMom = (Nmm) => math.unit(Mout(Nmm), UMm), uPhi = (pm) => math.unit(phiOut(pm), UPHI());
    if (R.cr) { ex('Mcr', uMom(R.cr.M)); ex('phicr', uPhi(R.cr.phi)); }
    ex('My1', uMom(R.fy1.M)); ex('phiy1', uPhi(R.fy1.phi)); ex('Mn', uMom(R.Mn.M)); ex('phiy', uPhi(phiY)); ex('Mu', uMom(R.ult.M)); ex('phiu', uPhi(phiU));
    ex('muphi', muphi); ex('Lp', math.unit(Lp / 10, 'cm')); ex('thetap', thp); ex('muD', muD); ex('Mmax', uMom(R.Mmax));
    if (conc === 'mander') { ex('fcc', math.unit(R.conf.fcc, 'MPa')); ex('ecu', R.conf.ecu); ex('ke', R.conf.ke); }
    // ---------- figura: M–φ | sección | materiales ----------
    const W = 720, top = 26;
    let g = '';
    const xs = R.pts.map(q => phiOut(q.phi)), ys = R.pts.map(q => Mout(q.M));
    { const fr = frame(62, top, 330, 230, [0, Math.max(...xs) * 1.05], [0, Math.max(...ys) * 1.18], { title: 'Diagrama momento–curvatura', xl: `φ [${LPHI()}]`, yl: `M [${lab(UMm)}]`, nx: 5, ny: 5, xf: t => fe(t, 2), yf: t => f2(t, 0) });
      g += fr.g + P(pathXY(xs, ys, fr), C.blue, 2);
      g += P(`M${fr.X(0)},${fr.Y(0)}L${fr.X(phiOut(phiY)).toFixed(1)},${fr.Y(Mout(R.Mn.M)).toFixed(1)}L${fr.X(phiOut(phiU)).toFixed(1)},${fr.Y(Mout(R.ult.M)).toFixed(1)}`, C.red, 1.2, '5 3');
      const pt = (q, lbl, c, dy0 = -8) => q ? dot(fr.X(phiOut(q.phi)), fr.Y(Mout(q.M)), c) + TX(fr.X(phiOut(q.phi)) + 5, fr.Y(Mout(q.M)) + dy0, lbl, { fs: 9, a: 'start', c }) : '';
      g += pt(R.cr, 'Mcr', C.axis, 12) + pt(R.fy1, "M'y", C.green, 14) + pt({ phi: phiY, M: R.Mn.M }, 'Mn (φy)', C.red) + pt(R.ult, 'Mu', C.ink);
      g += legend(170, top + 192, [['Fibras', C.blue], ['Bilineal equivalente (Priestley)', C.red, '5 3']]);
    }
    { // sección
      const sx = 445, sy = top + 6, sc = Math.min(110 / bb, 200 / hh), wb = bb * sc, wh = hh * sc;
      g += TX(sx + wb / 2, top - 7, 'Sección', { fs: 10.5, b: 1 });
      g += `<rect x="${sx}" y="${sy}" width="${wb.toFixed(1)}" height="${wh.toFixed(1)}" fill="${C.conc}" stroke="${C.ink}"/>`;
      if (conc === 'mander') { const c1 = (cover + est.db / 2) * sc; g += `<rect x="${(sx + c1).toFixed(1)}" y="${(sy + c1).toFixed(1)}" width="${(wb - 2 * c1).toFixed(1)}" height="${(wh - 2 * c1).toFixed(1)}" fill="rgba(31,111,235,.12)" stroke="${C.blue}" stroke-width="1.3" rx="3"/>`; }
      const xc1 = sx + (cover + est.db + 0) * sc, xc2 = sx + wb - (cover + est.db) * sc;
      for (const l of layers) { for (let i = 0; i < l.n; i++) { const x = l.n === 1 ? (xc1 + xc2) / 2 : xc1 + (xc2 - xc1) * i / (l.n - 1); g += `<circle cx="${(x + (i === 0 ? l.db / 2 * sc : i === l.n - 1 ? -l.db / 2 * sc : 0)).toFixed(1)}" cy="${(sy + l.d * sc).toFixed(1)}" r="${Math.max(2, l.db / 2 * sc).toFixed(1)}" fill="${C.steel}"/>`; } }
      g += TX(sx + wb / 2, sy + wh + 13, `${f2(bb / 10, 0)} × ${f2(hh / 10, 0)} cm`, { fs: 9 });
      // perfil de deformaciones en la última
      const ux = sx + wb + 22, uw = 70, last = R.pts[R.pts.length - 1];
      const e1 = last.et, e2 = last.et - last.phi * hh, emax = Math.max(Math.abs(e1), Math.abs(e2));
      const Xe = (e) => ux + uw / 2 + e / emax * uw / 2;
      g += Lne(ux + uw / 2, sy, ux + uw / 2, sy + wh, C.axis, 0.8) + `<path d="M${ux + uw / 2},${sy} L${Xe(e1).toFixed(1)},${sy} L${Xe(e2).toFixed(1)},${(sy + wh).toFixed(1)} L${ux + uw / 2},${(sy + wh).toFixed(1)} Z" fill="${C.redF}" stroke="${C.red}"/>`;
      g += TX(ux + uw / 2, top - 7, 'ε (última)', { fs: 10.5, b: 1 }) + TX(Xe(e1), sy - 2 + 12, f2(e1 * 1000, 2) + '‰', { fs: 8.5, c: C.red }) + TX(Xe(e2), sy + wh + 12, f2(e2 * 1000, 1) + '‰', { fs: 8.5, c: C.red });
    }
    { // materiales
      const yy = top + 300, fr1 = frame(62, yy, 290, 130, [0, Math.max(R.ecuLim * 1.15, 0.006)], [0, (conc === 'mander' ? R.conf.fcc : fc) * 1.15], { title: 'Concreto σ–ε (compresión)', xl: 'ε', yl: 'σ [MPa]', nx: 5, ny: 4, xf: t => f2(t, 3) });
      const es = Array.from({ length: 121 }, (_, i) => i * R.ecuLim * 1.1 / 120);
      g += fr1.g + P(pathXY(es, es.map(R.sCore), fr1), C.blue, 1.8) + (conc === 'mander' ? P(pathXY(es, es.map(R.sCov), fr1), C.axis, 1.4, '4 3') + Lne(fr1.X(R.ecuLim), yy, fr1.X(R.ecuLim), yy + 130, C.red, 0.8, '3 3') + TX(fr1.X(R.ecuLim) - 3, yy + 12, 'εcu', { fs: 8.5, a: 'end', c: C.red }) : '');
      g += legend(200, yy + 14, conc === 'mander' ? [['confinado (Mander)', C.blue], ['no confinado', C.axis, '4 3']] : [['Hognestad', C.blue]]);
      const esu = model === 'epp' ? 0.05 : steel.esu, fr2 = frame(420, yy, 270, 130, [0, esu * 1.05], [0, (model === 'epp' ? fy : steel.fsu) * 1.15], { title: 'Acero σ–ε', xl: 'ε', yl: 'σ [MPa]', nx: 5, ny: 4, xf: t => f2(t, 3), yf: t => f2(t, 0) });
      const e2s = Array.from({ length: 151 }, (_, i) => i * esu / 150);
      g += fr2.g + P(pathXY(e2s, e2s.map(R.ss), fr2), C.ink, 1.8);
    }
    let h = `<div class="figure">${svgWrap(W, top + 300 + 170, g)}${caption(ctx, b.titulo || `Momento–curvatura por fibras de la sección ${f2(bb / 10, 0)} × ${f2(hh / 10, 0)} cm (P = ${f2(nF(Pn), 1)} ${lab(UF())})`)}</div>`;
    const As = layers.reduce((a, l) => a + l.As, 0);
    if (conc === 'mander') {
      const c = R.conf;
      h += txt(`Confinamiento (Mander, Priestley y Park 1988): núcleo ${K(`b_c \\times d_c = ${f2(c.bc, 0)} \\times ${f2(c.dc, 0)}\\;\\mathrm{mm}`)} (a ejes del estribo ${esc(b.estribo || '3')}), ${K(`\\sum (w'_i)^2 = ${f2(c.w2, 0)}\\;\\mathrm{mm^2}`)} (barras restringidas por ramas: ${c.nRb} por cara b, ${c.nRh} por cara h), ${K(`s' = ${f2(c.sp, 0)}\\;\\mathrm{mm}`)}, ${K(`\\rho_{cc} = ${f2(c.rcc, 4)}`)}; ${K(`k_e = \\frac{\\left(1 - \\sum (w'_i)^2/6b_cd_c\\right)(1 - s'/2b_c)(1 - s'/2d_c)}{1 - \\rho_{cc}} = ${f2(c.ke, 3)}`)}; ${K(`\\rho_b = ${f2(c.rb, 4)},\\; \\rho_h = ${f2(c.rh, 4)}`)}; ${K(`f'_{lx} = k_e\\rho_b f_{yh} = ${f2(c.flb, 2)}`)} y ${K(`f'_{ly} = k_e\\rho_h f_{yh} = ${f2(c.flh, 2)}\\;\\mathrm{MPa}`)}; ${c.mode === 'triaxial' ? `con presiones distintas, ${K("f'_{cc}")} se obtiene de la superficie de falla de 5 parámetros (William-Warnke, calibrada por Elwi-Murray) que Mander usó para el ábaco de confinamiento triaxial (Fig. 4): se busca ${K("\\sigma_3 = -f'_{cc}")} tal que ${K("(-f'_{lx}, -f'_{ly}, \\sigma_3)")} quede sobre la superficie ${K('\\tau_{oct} = \\tau(\\sigma_{oct}, \\theta)')}: ${K(`f'_{cc} = ${f2(c.fcc, 2)}\\;\\mathrm{MPa}`)} (con ${K("f'_l")} promedio = ${f2(c.fl, 2)} MPa la fórmula cerrada daría ${f2(c.fccAvg, 2)} MPa, ${f2((c.fccAvg / c.fcc - 1) * 100, 1)} % más)` : c.mode === 'minimo' ? `${K(`f'_l = \\min = ${f2(Math.min(c.flb, c.flh), 2)}\\;\\mathrm{MPa}`)} (conservador); ${K(`f'_{cc} = f'_{co}\\left(-1.254 + 2.254\\sqrt{1 + 7.94f'_l/f'_{co}} - 2f'_l/f'_{co}\\right) = ${f2(c.fcc, 2)}\\;\\mathrm{MPa}`)}` : `promedio ${K(`f'_l = ${f2(c.fl, 2)}\\;\\mathrm{MPa}`)} (simplificación: sobrestima ${K("f'_{cc}")} si ${K("f'_{lx} \\ne f'_{ly}")}); ${K(`f'_{cc} = f'_{co}\\left(-1.254 + 2.254\\sqrt{1 + 7.94f'_l/f'_{co}} - 2f'_l/f'_{co}\\right) = ${f2(c.fcc, 2)}\\;\\mathrm{MPa}`)}`} (${f2(c.fcc / fc, 3)}·f'c); ${K(`\\varepsilon_{cc} = 0.002[1 + 5(f'_{cc}/f'_{co} - 1)] = ${f2(c.ecc, 5)}`)}; ${K(`r = E_c/(E_c - E_{sec}) = ${f2(c.r, 3)}`)}; deformación última ${K(`\\varepsilon_{cu} = 0.004 + 1.4\\rho_s f_{yh}\\varepsilon_{su}/f'_{cc} = ${f2(c.ecu, 4)}`)} (Priestley et al. 1996). El recubrimiento sigue la curva no confinada hasta ${K('2\\varepsilon_{co}')} y se descascara en ${K('\\varepsilon_{sp} = 0.005')}.`);
    } else h += txt(`Concreto de Hognestad: ${K(`f''_c = ${f2(p.k3, 2)}f'_c = ${f2(R.conf.fpp, 2)}\\;\\mathrm{MPa}`)}, ${K(`\\varepsilon_0 = 2f''_c/E_c = ${f2(R.conf.ec0, 5)}`)} (${K('E_c = 4700\\sqrt{f\'_c}')}), rama descendente lineal hasta ${K("0.85f''_c")} en ${K(`\\varepsilon_{cu} = ${f2(R.ecuLim, 4)}`)}.`);
    h += txt(`Acero: ${{ park: `Park-Paulay (fluencia ${K(`f_y = ${f2(fy, 0)}`)} MPa hasta ${K(`\\varepsilon_{sh} = ${f2(steel.esh, 4)}`)}, endurecimiento hasta ${K(`f_{su} = ${f2(steel.fsu, 0)}`)} MPa en ${K(`\\varepsilon_{su} = ${f2(steel.esu, 3)}`)})`, bilineal: `bilineal con ${K(`E_{sh} = ${f2(steel.b, 3)}E_s`)} limitado a ${K('f_{su}')}`, epp: 'elastoplástico perfecto' }[model]}; ${K(`A_s = ${f2(As, 0)}\\;\\mathrm{mm^2}`)} en ${layers.length} capas (${K(`\\rho = ${f2(As / (bb * hh) * 100, 2)}\\,\\%`)}). ${p.tension ? `Tracción del concreto lineal hasta ${K(`f_r = 0.62\\sqrt{f'_c} = ${f2(R.fr, 2)}`)} MPa.` : 'Sin tracción en el concreto.'} Equilibrio ${K('N(\\varepsilon_0, \\varphi) = \\sum\\sigma_c A_c + \\sum(\\sigma_s - \\sigma_c)A_s = P')} por bisección; ${K('M = \\sum \\sigma A (h/2 - y)')}. Falla por ${esc(String(R.fail || 'fin del análisis').replace('ε_cu', 'εcu'))}.`);
    const fmtM = (Nmm) => f2(Mout(Nmm), 2), fmtP = (pm) => fe(phiOut(pm), 4);
    const rows = [];
    if (R.cr) rows.push(['Fisuración', K('M_{cr},\\;\\varphi_{cr}'), fmtM(R.cr.M), fmtP(R.cr.phi), 'fibra extrema en fr']);
    rows.push(['Primera fluencia', K("M'_y,\\;\\varphi'_y"), fmtM(R.fy1.M), fmtP(R.fy1.phi), 'por ' + R.fy1.by]);
    rows.push(['Nominal', K('M_n'), fmtM(R.Mn.M), fmtP(R.Mn.phi), 'εc = 0.004 o εs = 0.015']);
    rows.push(['Fluencia equivalente', K("\\varphi_y = \\varphi'_y M_n/M'_y"), fmtM(R.Mn.M), fmtP(phiY), 'bilineal de Priestley']);
    rows.push(['Última', K('M_u,\\;\\varphi_u'), fmtM(R.ult.M), fmtP(phiU), String(R.fail || '').replace('ε_cu', 'εcu')]);
    h += tableHtml(ctx, 'Puntos característicos del diagrama M–φ', ['Estado', 'Símbolo', `M [${lab(UMm)}]`, `φ [${LPHI()}]`, 'Criterio'], rows);
    h += txt(`Ductilidad de curvatura ${K(`\\mu_\\varphi = \\varphi_u/\\varphi_y = ${f2(muphi, 2)}`)}. Longitud de rótula plástica (Paulay y Priestley 1992) ${K(`L_p = 0.08L + 0.022d_bf_y = 0.08(${f2(Lmm, 0)}) + 0.022(${f2(dbl, 1)})(${f2(fy, 0)}) = ${f2(0.08 * Lmm + 0.022 * dbl * fy, 0)}\\;\\mathrm{mm}`)}, con el mínimo ${K(`L_p \\ge 0.044d_bf_y = ${f2(0.044 * dbl * fy, 0)}\\;\\mathrm{mm}`)} (Priestley et al. 2007), de modo que ${K(`L_p = ${f2(Lp, 0)}\\;\\mathrm{mm}`)}; rotación plástica ${K(`\\theta_p = (\\varphi_u - \\varphi_y)L_p = ${f2(thp, 4)}\\;\\mathrm{rad}`)}; voladizo equivalente: ${K(`\\Delta_y = \\varphi_yL^2/3 = ${f2(nL(Dy / 1000), 2)}\\;\\mathrm{${UL()}}`)}, ${K(`\\Delta_p = \\theta_p(L - L_p/2) = ${f2(nL(Dp / 1000), 2)}\\;\\mathrm{${UL()}}`)}, ${K(`\\mu_\\Delta = 1 + \\Delta_p/\\Delta_y = ${f2(muD, 2)}`)}.`);
    const mureq = String(b.mureq || '').trim() ? scal(b.mureq, S) : 0;
    if (mureq > 0) h += chkLine(ctx, muphi >= mureq, `\\mu_\\varphi = ${f2(muphi, 2)} \\ge ${f2(mureq, 2)}`, 'Ductilidad de curvatura disponible ≥ requerida', mureq / muphi);
    return h;
  },
});

// =====================================================================
//  6) ACELEROGRAMA SINTÉTICO COMPATIBLE (SIMQKE)
// =====================================================================
registerBlock('simqke', {
  name: 'Acelerograma sintético compatible con espectro (SIMQKE)', icon: 'quake', group: 'Dinámica',
  fields: [
    F('Sa', 'Espectro objetivo Sa/g (ζ = 5 %) en función de T', 'Z*U*CE030d(T, Tp, Tl)*S'),
    F('dur', 'Duración', '20 s'), F('dt', 'Δt', '0.01 s'),
    F('t1', 'Envolvente: fin de la subida t1', '2 s'), F('t2', 'Envolvente: fin de la fase intensa t2', '12 s'), F('cdec', 'Envolvente: decaimiento c [1/s]', '0.25'),
    F('seed', 'Semilla aleatoria', '12345'), F('nf', 'N.º de frecuencias', '300'), F('iters', 'Iteraciones de ajuste', '12'),
    F('Tmin', 'Periodo mínimo de control', '0.03 s'), F('Tmax', 'Periodo máximo de control', '4 s'),
    F('pgaref', 'PGA de referencia (p. ej. Z*U*S), en g', 'Z*U*S'),
    F('rmin', 'Razón mínima Sa,sint/Sa,obj exigida', '0.90'),
    F('nombre', 'Nombre del registro (para otros bloques)', 'sim'),
    F('sufijo', 'Sufijo de las variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  def: { Sa: 'Sa(T)', dur: '20 s', dt: '0.01 s', t1: '2 s', t2: '12 s', cdec: '0.25', seed: '12345', nf: '300', iters: '12', Tmin: '0.03 s', Tmax: '4 s', pgaref: '', rmin: '0.90', nombre: 'sim' },
  hint: 'Suma de senoides con fases aleatorias (semilla fija) modulada por la envolvente trapezoidal de Jennings; las amplitudes se corrigen iterativamente con Sa_obj/Sa_calc (ζ = 5 %, Nigam-Jennings) y se corrige la línea base (velocidad y desplazamiento finales nulos). El registro queda disponible con su nombre para «thsdof», «respspec» y «thmdof». Exporta <code>PGAsim, rmin, rmax, rPGA</code>.',
  render(b, ctx) {
    const S = ctx.scope, sf = sfx(b);
    const Sa = makeSa(b.Sa, S);
    const o = { dur: evalParam(b.dur, S, 's', 20), dt: evalParam(b.dt, S, 's', 0.01), t1: evalParam(b.t1, S, 's', 2), t2: evalParam(b.t2, S, 's', 12), cdec: scal(b.cdec, S, 0.25), seed: Math.round(scal(b.seed, S, 12345)), nf: Math.round(scal(b.nf, S, 300)), iters: Math.round(scal(b.iters, S, 12)), Tmin: evalParam(b.Tmin, S, 's', 0.03), Tmax: evalParam(b.Tmax, S, 's', 4) };
    if (!(o.dur > 1 && o.dt > 0 && o.dt <= 0.05 && o.nf >= 20 && o.nf <= 600 && o.iters >= 1 && o.iters <= 30)) throw new Error('SIMQKE: revise duración, Δt (≤ 0.05 s), N.º de frecuencias (20–600) e iteraciones (1–30)');
    if (o.dur / o.dt > 12000) throw new Error('SIMQKE: demasiados pasos (máximo 12 000)');
    const sig = [0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 6].map(t => Sa(t).toPrecision(6)).join(',');
    const R = memo('sq|' + JSON.stringify(o) + sig, () => simqke({ Sa, ...o }));
    const nm = String(b.nombre || 'sim').trim() || 'sim';
    const pga = peakAt(R.ag);
    REG.set(nm, { ag: R.ag, dt: R.dt, name: `Sintético SIMQKE «${nm}» (semilla ${o.seed})`, key: 'sq' + nm + hashStr(JSON.stringify(o) + sig) });
    const pref = String(b.pgaref || '').trim() ? scal(b.pgaref, S) : 0;
    const ex = (n, v) => setVar(ctx, n + sf, v);
    ex('PGAsim', pga.v / G); ex('rmin', R.ratioMin); ex('rmax', R.ratioMax); if (pref > 0) ex('rPGA', pga.v / G / pref);
    // figura
    const W = 720; let g = '', y = 22;
    { const fr = frame(62, y, 630, 100, [0, o.dur], sym(Array.from(R.ag, a => a / G)), { title: `Acelerograma sintético «${nm}» (Δt = ${f2(o.dt, 3)} s, ${R.N} puntos)`, ta: 'start', yl: 'a [g]', xl: 't [s]' });
      g += fr.g + P(pathTS(R.ag, o.dt, fr, 62, 630, 1 / G), C.ink, 0.8) + dot(fr.X(pga.i * o.dt), fr.Y(pga.s * pga.v / G), C.red) + TX(fr.X(pga.i * o.dt) + 6, fr.Y(pga.s * pga.v / G) + (pga.s > 0 ? 10 : -4), `PGA = ${f2(pga.v / G, 3)} g`, { fs: 9, a: 'start', c: C.red }); }
    y += 100 + 52;
    { const Tp = R.sp.map(s => s.T), fr = frame(62, y, 400, 190, [0, o.Tmax], [0, Math.max(...R.sp.map(s => s.SA / G), ...Tp.map(t => Sa(t) / G)) * 1.15], { title: 'Espectro de respuesta (ζ = 5 %) vs objetivo', xl: 'T [s]', yl: 'Sa/g', nx: 6, ny: 5 });
      const Tg = Array.from({ length: 201 }, (_, i) => o.Tmin + i * (o.Tmax - o.Tmin) / 200);
      g += fr.g + P(pathXY(Tg, Tg.map(t => 0.9 * Sa(t) / G), fr), C.axis, 0.9, '3 3') + P(pathXY(Tg, Tg.map(t => 1.3 * Sa(t) / G), fr), C.axis, 0.9, '3 3') + P(pathXY(Tg, Tg.map(t => Sa(t) / G), fr), C.ink, 1.8) + P(pathXY(Tp, R.sp.map(s => s.SA / G), fr), C.red, 1.4);
      g += legend(300, y + 14, [['objetivo', C.ink], ['sintético', C.red], ['0.9 y 1.3 × objetivo', C.axis, '3 3']]);
      const fr2 = frame(520, y, 172, 190, [1, o.iters], [0, Math.max(...R.hist.map(h2 => h2.max)) * 1.1], { title: 'Convergencia', xl: 'iteración', yl: 'Sa,sint / Sa,obj', nx: 4, ny: 5, xf: t => f2(t, 0) });
      g += fr2.g + P(pathXY(R.hist.map(h2 => h2.it), R.hist.map(h2 => h2.min), fr2), C.blue, 1.4) + P(pathXY(R.hist.map(h2 => h2.it), R.hist.map(h2 => h2.max), fr2), C.red, 1.4) + Lne(fr2.X(1), fr2.Y(1), fr2.X(o.iters), fr2.Y(1), C.ink, 0.8, '4 2');
      g += legend(fr2.X(1) + 60, y + 34, [['máx. en 0.03–4 s', C.red], ['mín. en 0.03–4 s', C.blue]]);
    }
    y += 190 + 40;
    let h = `<div class="figure">${svgWrap(W, y, g)}${caption(ctx, b.titulo || 'Acelerograma sintético compatible con el espectro objetivo (SIMQKE)')}</div>`;
    h += txt(`${K('a(t) = I(t)\\sum_k A_k\\sin(\\omega_k t + \\phi_k)')} con ${o.nf} frecuencias logarítmicas entre ${f2(R.fr[0], 2)} y ${f2(R.fr[R.fr.length - 1], 1)} Hz, fases uniformes ${K('\\phi_k \\sim U(0, 2\\pi)')} (semilla ${o.seed}) y envolvente ${K(`I(t) = (t/t_1)^2,\\; 1,\\; e^{-c(t - t_2)}`)} con ${K(`t_1 = ${f2(o.t1, 1)},\\; t_2 = ${f2(o.t2, 1)}\\;\\mathrm{s},\\; c = ${f2(o.cdec, 2)}`)}. Ajuste iterativo ${K('A_k \\leftarrow A_k\\,S_a^{obj}(T_k)/S_a^{calc}(T_k)')} (Gasparini y Vanmarcke 1976), corrección de línea base por mínimos cuadrados con ${K('v(t_f) = d(t_f) = 0')}; se conserva la mejor de ${o.iters} iteraciones (la ${R.best}.ª). En ${f2(o.Tmin, 2)}–${f2(o.Tmax, 2)} s la razón espectral queda entre ${K(`${f2(R.ratioMin, 3)}`)} y ${K(`${f2(R.ratioMax, 3)}`)} (media ${f2(R.ratioMean, 3)}). ${K(`PGA = ${f2(pga.v / G, 3)}\\,g`)}` + (pref > 0 ? `; ${K(`PGA/(ZUS) = ${f2(pga.v / G, 3)}/${f2(pref, 3)} = ${f2(pga.v / G / pref, 3)}`)}.` : '.'));
    const rmin = scal(b.rmin, S, 0.9);
    h += chkLine(ctx, R.ratioMin >= rmin, `\\min S_a^{sint}/S_a^{obj} = ${f2(R.ratioMin, 3)} \\ge ${f2(rmin, 2)}`, `Compatibilidad espectral en ${f2(o.Tmin, 2)}–${f2(o.Tmax, 2)} s (E.030-2026 Art. 47.6: cada registro ≥ 90 % del objetivo)`, rmin / R.ratioMin);
    return h;
  },
});
