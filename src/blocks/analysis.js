// =====================================================================
//  Bloques gráficos — módulo «analysis» (análisis estructural)
//   frame2d   : análisis matricial de pórticos y armaduras planas
//   beamcase  : biblioteca de casos de vigas (fórmulas cerradas)
//   influence : líneas de influencia de vigas continuas
//   cross     : método de Cross (distribución de momentos) paso a paso
//  Referencias: Kassimali «Matrix Analysis of Structures» (2.ª ed.),
//  McGuire–Gallagher–Ziemian «Matrix Structural Analysis», Hibbeler
//  «Análisis estructural», AISC Manual Tabla 3-23, Roark (Tabla 8.1).
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, K, symTex, valTex } from '../engine.js';
import { C, T, Lne, svgWrap, niceTicks, caption, setVar, f2, solveBeam, blockBeam } from '../blocks.js';

// ---------------------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------------------
const EPS = 1e-9;
const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? '0' : f2(v, d));
const safeId = (s) => String(s).replace(/[^A-Za-z0-9]/g, '');
const PAL = ['#1b2733', '#1f6feb', '#8250df', '#0a7e8c', '#b35900', '#1a7f37', '#9a2d6b', '#5b6b7b'];
const COL = { N: '#8250df', V: C.green, M: C.blue, D: C.orange, T: '#1f6feb', Cc: '#d1242f' };
const FILL = { N: 'rgba(130,80,223,.15)', V: C.greenF, M: C.blueF };
const TH = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 10}" fill="${o.c || C.ink}" text-anchor="${o.a || 'middle'}"${o.b ? ' font-weight="600"' : ''}${o.r ? ` transform="rotate(${o.r.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''} font-family="Inter,Segoe UI,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(s)}</text>`;
const MK = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`;
const DEFS = `<defs>${MK('anB', C.blue)}${MK('anR', C.red)}${MK('anK', C.ink)}${MK('anG', C.green)}${MK('anP', '#8250df')}<pattern id="anH" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#7a8794" stroke-width="1"/></pattern></defs>`;
const arrow = (x1, y1, x2, y2, c, mk, w = 1.1) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}" marker-end="url(#${mk})"/>`;

function cleanLines(t) {
  return String(t || '').split('\n').map((raw, i) => ({ raw: raw.trim(), s: raw.split('//')[0].trim(), n: i + 1 })).filter(l => l.s);
}
function tokenize(s) {
  const out = []; let cur = '', depth = 0;
  for (const ch of s) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (/\s/.test(ch) && depth <= 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const DIRS = ['grav', 'proy', 'horiz', 'hproy', 'perp', 'axial'];
function isUnitTok(t, S) {
  if (DIRS.includes(t.toLowerCase())) return false;
  if (!/^[A-Za-z]/.test(t)) return false;
  const id = /^[A-Za-z_]\w*/.exec(t)[0]; if (S.has(id)) return false;
  try { math.unit('1 ' + t); return true; } catch (e) { return false; }
}
// une «número unidad» en un solo token: ["2", "tonf/m"] -> ["2 tonf/m"]
function mergeU(tk, S) {
  const res = [];
  for (const t of tk) {
    const prev = res[res.length - 1];
    if (prev !== undefined && /[\d.)%]$/.test(prev) && isUnitTok(t, S)) res[res.length - 1] = prev + ' ' + t;
    else res.push(t);
  }
  return res;
}
function evNum(str, S, unit, where) {
  try {
    const v = evalParam(str, S, unit);
    if (typeof v !== 'number' || !isFinite(v)) throw new Error('valor no numérico');
    return v;
  } catch (e) { throw new Error(where + ': no se pudo evaluar «' + str + '» (' + (unit ? 'unidad esperada ' + unit.replace(/\*/g, '·') + '; ' : '') + e.message + ')'); }
}
// lista de ids: "1,2,5", "1-4", "*"
function parseTargets(tok, ids, where) {
  if (tok === '*') return ids.map((_, i) => i);
  const out = [];
  for (const p of String(tok).split(',').map(s => s.trim()).filter(Boolean)) {
    const rg = /^(\d+)-(\d+)$/.exec(p);
    if (rg) { for (let k = +rg[1]; k <= +rg[2]; k++) { const i = ids.indexOf(String(k)); if (i < 0) throw new Error(where + ': no existe «' + k + '»'); out.push(i); } continue; }
    const i = ids.indexOf(p); if (i < 0) throw new Error(where + ': no existe «' + p + '»'); out.push(i);
  }
  return out;
}
// ---------------------------------------------------------------------
//  Lectura del modelo
// ---------------------------------------------------------------------
export function parseFrame(b, S) {
  const FU = b.unidades === 'kN' ? 'kN' : 'tonf';
  const U = { F: FU, w: FU + '/m', M: FU + '*m', E: FU + '/m^2', k: FU + '/m', g: FU + '/m^3', lab: FU === 'kN' ? 'kN' : 't' };
  const truss = b.tipo === 'armadura';
  // nudos
  const nodes = [], nids = [];
  for (const l of cleanLines(b.nudos)) {
    const tk = tokenize(l.s); const where = 'Nudos, línea ' + l.n + ' «' + l.s + '»';
    const v = mergeU(tk.slice(1), S);
    if (tk.length < 3 || v.length !== 2) throw new Error(where + ': use «id x y»');
    if (nids.includes(tk[0])) throw new Error(where + ': nudo repetido');
    nids.push(tk[0]); nodes.push({ id: tk[0], x: evNum(v[0], S, 'm', where), y: evNum(v[1], S, 'm', where) });
  }
  if (nodes.length < 2) throw new Error('Defina al menos dos nudos («id x y» por línea)');
  if (nodes.length > 400) throw new Error('Máximo 400 nudos');
  // secciones
  const secs = [], sids = [];
  for (const l of cleanLines(b.secciones)) {
    const where = 'Secciones, línea ' + l.n + ' «' + l.s + '»';
    let tk = tokenize(l.s); const opt = {};
    tk = tk.filter(t => { const m = /^(w|peso|as|g|h)=(.+)$/i.exec(t); if (m) { const k = m[1].toLowerCase(); opt[k === 'peso' ? 'w' : k] = m[2]; return false; } return true; });
    const id = tk[0]; let rest = tk.slice(1), E, A, I, desc = '', hs = null, As = null;
    const kind = (rest[0] || '').toLowerCase();
    if (kind === 'rect') {
      const v = mergeU(rest.slice(1), S); if (v.length !== 3) throw new Error(where + ': use «id rect b h E»');
      const bb = evNum(v[0], S, 'm', where), hh = evNum(v[1], S, 'm', where); E = evNum(v[2], S, U.E, where);
      A = bb * hh; I = bb * hh ** 3 / 12; desc = f2(bb * 100, 0) + '×' + f2(hh * 100, 0) + ' cm'; hs = hh; As = A * 5 / 6;
    } else if (kind === 'circ') {
      const v = mergeU(rest.slice(1), S); if (v.length !== 2) throw new Error(where + ': use «id circ D E»');
      const D = evNum(v[0], S, 'm', where); E = evNum(v[1], S, U.E, where);
      A = Math.PI * D * D / 4; I = Math.PI * D ** 4 / 64; desc = 'Ø ' + f2(D * 100, 1) + ' cm'; hs = D; As = 0.9 * A;
    } else {
      const v = mergeU(rest, S); if (v.length < 2 || v.length > 3) throw new Error(where + ': use «id E A I» (I se puede omitir en armaduras)');
      E = evNum(v[0], S, U.E, where); A = evNum(v[1], S, 'm^2', where); I = v[2] !== undefined ? evNum(v[2], S, 'm^4', where) : 0;
    }
    if (!(E > 0) || !(A > 0) || I < 0) throw new Error(where + ': E y A deben ser mayores que cero');
    if (sids.includes(id)) throw new Error(where + ': sección repetida');
    if (opt.h !== undefined) hs = evNum(opt.h, S, 'm', where);
    if (opt.as !== undefined) As = evNum(opt.as, S, 'm^2', where); else if (As === null) As = A * 5 / 6;
    const G = opt.g !== undefined ? evNum(opt.g, S, U.E, where) : null;
    if (!(As > 0) || (G !== null && !(G > 0))) throw new Error(where + ': As y G deben ser mayores que cero');
    sids.push(id); secs.push({ id, E, A, I, desc, h: hs, As, G, w: opt.w !== undefined ? evNum(opt.w, S, U.w, where) : null });
  }
  if (!secs.length) throw new Error('Defina al menos una sección: «id E A I» o «id rect b h E»');
  // barras
  const mems = [], mids = [];
  for (const l of cleanLines(b.barras)) {
    const where = 'Barras, línea ' + l.n + ' «' + l.s + '»';
    const tk = tokenize(l.s); if (tk.length < 3) throw new Error(where + ': use «id ni nj [sección] [ri|rj|rij] [zi=… zj=…]»');
    const ni = nids.indexOf(tk[1]), nj = nids.indexOf(tk[2]);
    if (ni < 0 || nj < 0) throw new Error(where + ': el nudo «' + (ni < 0 ? tk[1] : tk[2]) + '» no existe (nudos definidos: ' + (nids.length > 12 ? nids.slice(0, 12).join(', ') + '…' : nids.join(', ')) + ')');
    if (ni === nj) throw new Error(where + ': la barra une un nudo consigo mismo');
    let sec = 0, rel = [truss, truss], zi = null, zj = null;
    for (const t of tk.slice(3)) {
      const z = /^z(i|j)=(.+)$/i.exec(t);
      if (z) { const v = evNum(z[2], S, 'm', where); if (!(v >= 0)) throw new Error(where + ': la zona rígida debe ser ≥ 0'); if (z[1].toLowerCase() === 'i') zi = v; else zj = v; continue; }
      const r = /^r(i|j|ij|ji)$/i.exec(t);
      if (r) { const k = r[1].toLowerCase(); if (k.includes('i')) rel[0] = true; if (k.includes('j')) rel[1] = true; continue; }
      const si = sids.indexOf(t); if (si < 0) throw new Error(where + ': sección «' + t + '» no definida'); sec = si;
    }
    if (mids.includes(tk[0])) throw new Error(where + ': barra repetida');
    const n1 = nodes[ni], n2 = nodes[nj], L = Math.hypot(n2.x - n1.x, n2.y - n1.y);
    if (!(L > 1e-6)) throw new Error(where + ': longitud nula (nudos coincidentes)');
    const s = secs[sec];
    if (!(s.I > 0) && !(rel[0] && rel[1])) throw new Error(where + ': la sección «' + s.id + '» no tiene inercia I; solo es válida en barras biarticuladas');
    mids.push(tk[0]); mems.push({ id: tk[0], i: ni, j: nj, sec, rel, L, c: (n2.x - n1.x) / L, s: (n2.y - n1.y) / L, zi, zj, where });
  }
  // zonas rígidas (brazos rígidos): explícitas zi=/zj= o automáticas = factor·(peralte de las barras transversales)/2
  const fz = String(b.brazos || '').trim() ? evNum(String(b.brazos), S, '', 'Zonas rígidas') : 0;
  if (fz < 0 || fz > 1) throw new Error('Zonas rígidas: el factor debe estar entre 0 y 1');
  for (const m of mems) {
    for (const end of ['i', 'j']) {
      const key = 'z' + end; if (m[key] !== null) continue;
      let z = 0;
      if (fz > 0 && !truss) {
        const n = m[end];
        for (const o of mems) { if (o === m || (o.i !== n && o.j !== n)) continue; const h = secs[o.sec].h; if (h > 0 && Math.abs(m.c * o.c + m.s * o.s) < 0.5) z = Math.max(z, h / 2); }
      }
      m[key] = fz * z;
    }
    if (m.zi + m.zj > 0.8 * m.L) throw new Error(m.where + ': las zonas rígidas (zi + zj = ' + f2(m.zi + m.zj) + ' m) superan el 80 % de la longitud');
    if ((m.zi > 0 || m.zj > 0) && truss) throw new Error(m.where + ': las zonas rígidas no se usan en armaduras');
  }
  if (!mems.length) throw new Error('Defina al menos una barra («id ni nj [sección]»)');
  // apoyos
  const sup = nodes.map(() => ({ r: [0, 0, 0], k: [0, 0, 0], any: false, ang: null }));
  for (const l of cleanLines(b.apoyos)) {
    const where = 'Apoyos, línea ' + l.n + ' «' + l.s + '»';
    const tk = tokenize(l.s); if (tk.length < 2) throw new Error(where + ': use «nudo tipo» (E, A, Rx, Ry, G, 101, RI ángulo, K kx ky kθ)');
    const tg = parseTargets(tk[0], nids, where); const t = tk[1].toUpperCase();
    let r = null, k = null, ang = null;
    if (/^(E|EMP|EMPOTRADO|FIJO)$/.test(t)) r = [1, 1, 1];
    else if (/^(A|ART|ARTICULADO|P|PIN)$/.test(t)) r = [1, 1, 0];
    else if (/^(RY|R|RODILLO|RODILLOY)$/.test(t)) r = [0, 1, 0];
    else if (/^(RX|RODILLOX)$/.test(t)) r = [1, 0, 0];
    else if (/^(G|GUIA|DESLIZANTE)$/.test(t)) r = [0, 1, 1];
    else if (/^[01]{3}$/.test(t)) r = t.split('').map(Number);
    else if (/^(RI|RODILLOI|INCLINADO)$/.test(t)) {
      const v = mergeU(tk.slice(2), S); if (v.length !== 1) throw new Error(where + ': use «nudo RI α» (α = inclinación de la superficie de rodadura, en grados, antihorario desde x)');
      ang = evNum(v[0], S, 'deg', where); r = [0, 1, 0];
    }
    else if (/^(K|RESORTE)$/.test(t)) {
      const v = mergeU(tk.slice(2), S); if (!v.length) throw new Error(where + ': indique kx ky [kθ]');
      k = [evNum(v[0], S, U.k, where), v[1] !== undefined ? evNum(v[1], S, U.k, where) : 0, v[2] !== undefined ? evNum(v[2], S, U.M, where) : 0];
      if (k.some(x => x < 0)) throw new Error(where + ': rigidez de resorte negativa');
    } else throw new Error(where + ': tipo de apoyo «' + tk[1] + '» no reconocido (E, A, Rx, Ry, G, 101, RI α, K kx ky kθ)');
    for (const n of tg) {
      const s = sup[n]; s.any = true;
      if (ang !== null) { if (s.r[0] || s.r[1] || s.ang !== null) throw new Error(where + ': el nudo ' + nids[n] + ' ya tiene otro apoyo; el rodillo inclinado debe ser su único apoyo de traslación'); s.ang = ang; }
      else if (s.ang !== null && r && (r[0] || r[1])) throw new Error(where + ': el nudo ' + nids[n] + ' tiene un rodillo inclinado; no combine apoyos de traslación');
      if (r) r.forEach((v, i) => { if (v) s.r[i] = 1; }); if (k) k.forEach((v, i) => { s.k[i] += v; });
      if (s.ang !== null && (s.k[0] || s.k[1])) throw new Error(where + ': no se admiten resortes de traslación en un nudo con rodillo inclinado');
    }
  }
  // cargas
  const cases = []; const caseOf = (name) => { let c = cases.find(q => q.name === name); if (!c) { c = { name, loads: [] }; cases.push(c); } return c; };
  const pos = (t, where) => (/%$/.test(t) ? { pct: evNum(t.slice(0, -1), S, '', where) / 100 } : { v: evNum(t, S, 'm', where) });
  for (const l of cleanLines(b.cargas)) {
    const where = 'Cargas, línea ' + l.n + ' «' + l.s + '»';
    let s = l.s, cn = 'CM';
    const cm = /^([A-Za-z]\w*)\s*:\s*/.exec(s); if (cm) { cn = cm[1]; s = s.slice(cm[0].length); }
    const tk = tokenize(s); if (tk.length < 3) throw new Error(where + ': faltan datos');
    const lt = tk[0].toUpperCase();
    let raw = tk.slice(2), dir = 'grav';
    if (raw.length && DIRS.includes(raw[raw.length - 1].toLowerCase())) dir = raw.pop().toLowerCase();
    const v = mergeU(raw, S);
    const c = caseOf(cn);
    if (lt === 'N' || lt === 'D') {
      const tg = parseTargets(tk[1], nids, where);
      if (v.length < 2 || v.length > 3) throw new Error(where + (lt === 'N' ? ': use «N nudo Fx Fy [M]»' : ': use «D nudo dx dy [θ]»'));
      const vals = lt === 'N' ? [evNum(v[0], S, U.F, where), evNum(v[1], S, U.F, where), v[2] !== undefined ? evNum(v[2], S, U.M, where) : 0]
        : [evNum(v[0], S, 'm', where), evNum(v[1], S, 'm', where), v[2] !== undefined ? evNum(v[2], S, '', where) : 0];
      for (const n of tg) c.loads.push({ t: lt === 'N' ? 'N' : 'S', n, vals });
      continue;
    }
    const tg = parseTargets(tk[1], mids, where);
    let ld;
    if (lt === 'U' || lt === 'W') {
      if (v.length !== 1 && v.length !== 3) throw new Error(where + ': use «U barras w [a b] [dir]»');
      const w = evNum(v[0], S, U.w, where); ld = { t: 'D', w1: w, w2: w, a: v[1] ? pos(v[1], where) : { pct: 0 }, b: v[2] ? pos(v[2], where) : { pct: 1 } };
    } else if (lt === 'T') {
      if (v.length !== 2 && v.length !== 4) throw new Error(where + ': use «T barras w1 w2 [a b] [dir]»');
      ld = { t: 'D', w1: evNum(v[0], S, U.w, where), w2: evNum(v[1], S, U.w, where), a: v[2] ? pos(v[2], where) : { pct: 0 }, b: v[3] ? pos(v[3], where) : { pct: 1 } };
    } else if (lt === 'P') {
      if (v.length < 1 || v.length > 2) throw new Error(where + ': use «P barras P [a] [dir]»');
      ld = { t: 'P', P: evNum(v[0], S, U.F, where), a: v[1] ? pos(v[1], where) : { pct: 0.5 } };
    } else if (lt === 'M') {
      if (v.length < 1 || v.length > 2) throw new Error(where + ': use «M barras M [a]»');
      ld = { t: 'C', C: evNum(v[0], S, U.M, where), a: v[1] ? pos(v[1], where) : { pct: 0.5 } };
    } else throw new Error(where + ': tipo de carga «' + tk[0] + '» no reconocido (N, U, T, P, M, D)');
    for (const m of tg) c.loads.push({ ...ld, m, dir });
  }
  // peso propio
  if (String(b.pp || '').trim()) {
    const where = 'Peso propio «' + b.pp + '»';
    const tk = tokenize(String(b.pp).trim()); const cn = /^[A-Za-z]\w*$/.test(tk[0]) && !S.has(tk[0]) && tk.length > 1 ? tk.shift() : 'CM';
    const v = mergeU(tk, S); const g = evNum(v.join(' '), S, U.g, where);
    const c = caseOf(cn);
    mems.forEach((m, k) => { const sc = secs[m.sec]; const w = sc.w !== null ? sc.w : g * sc.A; if (w > 0) c.loads.push({ t: 'D', w1: w, w2: w, a: { pct: 0 }, b: { pct: 1 }, m: k, dir: 'grav', pp: true }); });
  }
  if (!cases.length) throw new Error('Defina al menos una carga («N nudo Fx Fy», «U barra w», …)');
  // combinaciones
  const combos = parseCombos(b.combinaciones, cases.map(c => c.name), S);
  // nombres de casos
  const cdesc = {};
  for (const l of cleanLines(b.casos)) { const m = /^([A-Za-z]\w*)\s*[:=]?\s*(.*)$/.exec(l.s); if (m) cdesc[m[1]] = m[2]; }
  // deformación por cortante (ν) y P-Δ
  const shTxt = String(b.cortante ?? '').trim();
  let shear = null;
  if (shTxt && !/^(no|0|false)$/i.test(shTxt)) { shear = /^(si|sí|true)$/i.test(shTxt) ? 0.2 : evNum(shTxt, S, '', 'Deformación por cortante (ν)'); if (!(shear >= 0 && shear < 0.5)) throw new Error('Deformación por cortante: ν debe estar entre 0 y 0.5'); }
  const pdelta = b.pdelta === true || /^(si|sí|true|1|x)$/i.test(String(b.pdelta ?? '').trim());
  const span = Math.max(1e-6, Math.max(...nodes.map(n => n.x)) - Math.min(...nodes.map(n => n.x)), Math.max(...nodes.map(n => n.y)) - Math.min(...nodes.map(n => n.y)));
  return { U, truss, nodes, nids, secs, mems, mids, sup, cases, combos, cdesc, shear, pdelta, span };
}

export function parseCombos(text, names, S) {
  const out = [];
  for (const l of cleanLines(text)) {
    const where = 'Combinaciones, línea ' + l.n + ' «' + l.s + '»';
    const m = /^([A-Za-z]\w*)\s*[:=]\s*(.+)$/.exec(l.s); if (!m) throw new Error(where + ': use «U1 = 1.4 CM + 1.7 CV»');
    // cada «±» duplica la combinación: 1 → a, b ; 2 → a, b, c, d (+ +, + −, − +, − −) …
    const parts = m[2].replace(/\+-|\+\/-/g, '±').split('±'), nPM = parts.length - 1;
    if (nPM > 4) throw new Error(where + ': máximo 4 signos ± por combinación');
    const variants = !nPM ? [[m[1], m[2]]] : Array.from({ length: 2 ** nPM }, (_, k) => [m[1] + String.fromCharCode(97 + k), parts.reduce((acc, q, i) => acc + (i ? ((k >> (nPM - i)) & 1 ? '-' : '+') : '') + q, '')]);
    for (const [nm, ex] of variants) {
      let node; try { node = math.parse(ex.replace(/·/g, '*')); } catch (e) { throw new Error(where + ': expresión no válida'); }
      const used = new Set(); node.traverse(n => { if (n.type === 'SymbolNode' && names.includes(n.name)) used.add(n.name); });
      for (const sym of node.filter(n => n.type === 'SymbolNode').map(n => n.name)) if (!names.includes(sym) && !S.has(sym) && !(sym in math)) throw new Error(where + ': el caso «' + sym + '» no tiene cargas');
      const code = node.compile();
      const val = (vals) => { const sc = new Map(S); names.forEach(n => sc.set(n, vals[n] || 0)); const r = code.evaluate(sc); if (typeof r !== 'number') throw new Error(where + ': los factores deben ser adimensionales'); return r; };
      const f0 = val({}); if (Math.abs(f0) > 1e-12) throw new Error(where + ': la combinación tiene un término constante');
      const f = {}; let sum = 0; const two = {};
      for (const n of names) { f[n] = val({ [n]: 1 }); sum += f[n]; two[n] = 2; }
      if (Math.abs(val(two) - 2 * sum) > 1e-9 * (1 + Math.abs(sum))) throw new Error(where + ': la combinación debe ser lineal en los casos');
      if (out.some(o => o.name === nm)) throw new Error(where + ': combinación repetida');
      out.push({ name: nm, f, txt: comboText(f) });
    }
  }
  return out;
}
const comboText = (f) => Object.entries(f).filter(([, v]) => Math.abs(v) > 1e-12).map(([k, v], i) => (v < 0 ? (i ? ' − ' : '−') : (i ? ' + ' : '')) + (Math.abs(Math.abs(v) - 1) < 1e-12 ? '' : f2(Math.abs(v), 3) + ' ') + k).join('');

// ---------------------------------------------------------------------
//  Solución por el método de rigidez directa
//   · elemento de 6 GDL (Euler-Bernoulli o Timoshenko), rótulas por condensación estática,
//   · brazos rígidos en los extremos (zonas rígidas de nudo), apoyos inclinados,
//   · matriz geométrica (P-Δ) iterativa, solución con LDLᵀ en banda (reordenamiento RCM).
// ---------------------------------------------------------------------
const G3 = [[-Math.sqrt(0.6), 5 / 9], [0, 8 / 9], [Math.sqrt(0.6), 5 / 9]];
// funciones de forma exactas de la viga de Timoshenko (ph = Φ = 12EI/(G·As·L²); ph = 0 → Hermite)
//   v(x) = Σ Nv·{vi, θi, vj, θj} ; giro de la sección ψ(x) = Σ Nψ·{…}  (Przemieniecki 1968; Reddy 1997)
function shapeV(x, L, ph = 0) {
  const z = x / L, c = 1 / (1 + ph);
  return [c * (1 - 3 * z * z + 2 * z ** 3 + ph * (1 - z)), c * L * (z - 2 * z * z + z ** 3 + ph / 2 * (z - z * z)), c * (3 * z * z - 2 * z ** 3 + ph * z), c * L * (-z * z + z ** 3 + ph / 2 * (z * z - z))];
}
function shapeR(x, L, ph = 0) {
  const z = x / L, c = 1 / (1 + ph);
  return [c * 6 / L * (z * z - z), c * (3 * z * z - 4 * z + 1 + ph * (1 - z)), -c * 6 / L * (z * z - z), c * (3 * z * z - 2 * z + ph * z)];
}
// rigidez local (Kassimali Ec. 6.6; con cortante: McGuire Ec. 4.34 / Przemieniecki)
function kLocal(E, A, I, L, ph = 0) {
  const q = 1 / (1 + ph), a = E * A / L, b = 12 * E * I / L ** 3 * q, c = 6 * E * I / L ** 2 * q, d = (4 + ph) * E * I / L * q, e = (2 - ph) * E * I / L * q;
  return [[a, 0, 0, -a, 0, 0], [0, b, c, 0, -b, c], [0, c, d, 0, -c, e], [-a, 0, 0, a, 0, 0], [0, -b, -c, 0, b, -c], [0, c, e, 0, -c, d]];
}
// matriz geométrica consistente (N + tracción) — McGuire Ec. 9.18 / Kassimali Ec. 10.x
function kGeo(N, L) {
  const t = N / L, a = 1.2 * t, b = t * L / 10, c = 2 * t * L * L / 15, d = t * L * L / 30;
  return [[0, 0, 0, 0, 0, 0], [0, a, b, 0, -a, b], [0, b, c, 0, -b, -d], [0, 0, 0, 0, 0, 0], [0, -a, -b, 0, a, -b], [0, b, -d, 0, -b, c]];
}
// condensación estática de los giros liberados (k y vectores de fuerzas de empotramiento q)
function condense(k, qs, rel) {
  const r = []; if (rel[0]) r.push(2); if (rel[1]) r.push(5);
  if (!r.length) return { k, qs };
  const a = [0, 1, 2, 3, 4, 5].filter(i => !r.includes(i));
  const krr = r.map(i => r.map(j => k[i][j]));
  const inv = krr.length === 1 ? [[1 / krr[0][0]]] : (() => { const [[p, q], [s, t]] = krr, det = p * t - q * s; return [[t / det, -q / det], [-s / det, p / det]]; })();
  const kc = k.map(row => row.slice());
  for (const i of a) for (const j of a) { let s = 0; for (let x = 0; x < r.length; x++) for (let y = 0; y < r.length; y++) s += k[i][r[x]] * inv[x][y] * k[r[y]][j]; kc[i][j] = k[i][j] - s; }
  for (const i of r) for (let j = 0; j < 6; j++) { kc[i][j] = 0; kc[j][i] = 0; }
  const qc = qs.map(q => { const o = q.slice(); for (const i of a) { let s = 0; for (let x = 0; x < r.length; x++) for (let y = 0; y < r.length; y++) s += k[i][r[x]] * inv[x][y] * q[r[y]]; o[i] = q[i] - s; } for (const i of r) o[i] = 0; return o; });
  return { k: kc, qs: qc };
}
const Tm = (c, s) => [[c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]];
const mulMV = (A, v) => A.map(r => r.reduce((t, x, j) => t + x * v[j], 0));
const mulTtV = (A, v) => A[0].map((_, j) => A.reduce((t, r, i) => t + r[j] * v[i], 0));
const TtKT = (T, k) => T[0].map((_, i) => T[0].map((__, j) => { let s = 0; for (let p = 0; p < 6; p++) { const tp = T[p][i]; if (!tp) continue; for (let q = 0; q < 6; q++) s += tp * k[p][q] * T[q][j]; } return s; }));
// brazos rígidos: u_cara = H·u_nudo  (v_i' = v_i + zi·θi ; v_j' = v_j − zj·θj)
const Hv = (u, zi, zj) => [u[0], u[1] + zi * u[2], u[2], u[3], u[4] - zj * u[5], u[5]];
const HtV = (f, zi, zj) => [f[0], f[1], f[2] + zi * f[1], f[3], f[4], f[5] - zj * f[4]];
function HtKH(k, zi, zj) {
  if (!zi && !zj) return k;
  const H = [[1, 0, 0, 0, 0, 0], [0, 1, zi, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, -zj], [0, 0, 0, 0, 0, 1]];
  return TtKT(H, k);
}

// cargas de una barra en coordenadas locales: {k:'d',a,b,px1,px2,py1,py2} | {k:'p',a,px,py} | {k:'c',a,c}
function localLoads(m, ld) {
  const L = m.L, c = m.c, s = m.s;
  const at = (p) => (p.pct !== undefined ? p.pct * L : p.v);
  const g2l = (gx, gy) => [c * gx + s * gy, -s * gx + c * gy];
  const point = ld.t !== 'D';
  const dirv = (w) => {
    switch (ld.dir) {
      case 'proy': return point ? g2l(0, -w) : g2l(0, -w * Math.abs(c));
      case 'horiz': return g2l(w, 0);
      case 'hproy': return point ? g2l(w, 0) : g2l(w * Math.abs(s), 0);
      case 'perp': return [0, w];
      case 'axial': return [w, 0];
      default: return g2l(0, -w);
    }
  };
  const tolL = Math.max(1e-7, 2e-3 * L); // tolerancia para posiciones redondeadas por el usuario
  if (ld.t === 'D') {
    const a = at(ld.a), b = at(ld.b);
    if (!(a >= -tolL && b <= L + tolL && b > a + EPS)) throw new Error('Carga en la barra ' + m.id + ': el tramo cargado [' + f2(a) + ', ' + f2(b) + '] m debe estar dentro de 0…' + f2(L) + ' m (con a < b)');
    const a1 = Math.max(0, a), b1 = Math.min(L, b);
    // si se recorta por redondeo, se interpola la intensidad en el extremo recortado
    const wl = (x) => ld.w1 + (ld.w2 - ld.w1) * (x - a) / (b - a);
    const p1 = dirv(wl(a1)), p2 = dirv(wl(b1));
    return { k: 'd', a: a1, b: b1, px1: p1[0], px2: p2[0], py1: p1[1], py2: p2[1] };
  }
  const a = at(ld.a);
  if (!(a >= -tolL && a <= L + tolL)) throw new Error('Carga en la barra ' + m.id + ': la posición a = ' + f2(a) + ' m está fuera de la barra (L = ' + f2(L) + ' m)');
  if (ld.t === 'P') { const p = dirv(ld.P); return { k: 'p', a: Math.min(L, Math.max(0, a)), px: p[0], py: p[1] }; }
  return { k: 'c', a: Math.min(L, Math.max(0, a)), c: ld.C };
}
// cargas nodales equivalentes  ∫Nᵀp dx  (Gauss 3 puntos: exacta para carga lineal × forma cúbica)
function equivLoads(L, lds, ph = 0) {
  const e = [0, 0, 0, 0, 0, 0];
  for (const l of lds) {
    if (l.k === 'd') {
      const h = (l.b - l.a) / 2, mid = (l.a + l.b) / 2; if (!(h > 0)) continue;
      for (const [g, wg] of G3) {
        const x = mid + g * h, t = (x - l.a) / (l.b - l.a);
        const px = l.px1 + (l.px2 - l.px1) * t, py = l.py1 + (l.py2 - l.py1) * t, N = shapeV(x, L, ph), W = wg * h;
        e[0] += W * px * (1 - x / L); e[3] += W * px * x / L;
        e[1] += W * py * N[0]; e[2] += W * py * N[1]; e[4] += W * py * N[2]; e[5] += W * py * N[3];
      }
    } else if (l.k === 'p') {
      const N = shapeV(l.a, L, ph);
      e[0] += l.px * (1 - l.a / L); e[3] += l.px * l.a / L;
      e[1] += l.py * N[0]; e[2] += l.py * N[1]; e[4] += l.py * N[2]; e[5] += l.py * N[3];
    } else {
      const D = shapeR(l.a, L, ph);
      e[1] += l.c * D[0]; e[2] += l.c * D[1]; e[4] += l.c * D[2]; e[5] += l.c * D[3];
    }
  }
  return e;
}
// reparte las cargas entre el tramo flexible y los brazos rígidos (estos las llevan por estática al nudo)
function splitLoads(lds, L, zi, zj) {
  if (!(zi > 0) && !(zj > 0)) return { flex: lds, rig: [0, 0, 0, 0, 0, 0] };
  const Lf = L - zi - zj, flex = [], e = [0, 0, 0, 0, 0, 0];
  const armI = (x, px, py, c) => { e[0] += px; e[1] += py; e[2] += py * x + c; };
  const armJ = (x, px, py, c) => { e[3] += px; e[4] += py; e[5] += py * (x - L) + c; };
  for (const l of lds) {
    if (l.k === 'd') {
      const at = (x) => { const t = (x - l.a) / (l.b - l.a); return [l.px1 + (l.px2 - l.px1) * t, l.py1 + (l.py2 - l.py1) * t]; };
      for (const [s0, s1, arm] of [[l.a, Math.min(l.b, zi), armI], [Math.max(l.a, zi), Math.min(l.b, L - zj), null], [Math.max(l.a, L - zj), l.b, armJ]]) {
        if (!(s1 > s0 + 1e-12)) continue;
        const p0 = at(s0), p1 = at(s1);
        if (!arm) { flex.push({ k: 'd', a: s0 - zi, b: s1 - zi, px1: p0[0], px2: p1[0], py1: p0[1], py2: p1[1] }); continue; }
        const h = (s1 - s0) / 2, mid = (s0 + s1) / 2;
        for (const [g, wg] of G3) { const x = mid + g * h, p = at(x); arm(x, wg * h * p[0], wg * h * p[1], 0); }
      }
    } else {
      const arm = l.a < zi - 1e-12 ? armI : l.a > L - zj + 1e-12 ? armJ : null;
      if (!arm) { flex.push({ ...l, a: Math.min(Lf, Math.max(0, l.a - zi)) }); continue; }
      if (l.k === 'p') arm(l.a, l.px, l.py, 0); else arm(l.a, 0, 0, l.c);
    }
  }
  return { flex, rig: e };
}
// fuerzas internas (N tracción +, V = dM/dx, M + tracción en la cara −y local) en x
function intForces(fi, lds, x, side) {
  let N = -fi[0], V = fi[1], M = -fi[2] + fi[1] * x;
  for (const l of lds) {
    if (l.k === 'd') {
      if (x <= l.a + 1e-12) continue;
      const e = Math.min(x, l.b), t = e - l.a, len = l.b - l.a;
      const kx = (l.px2 - l.px1) / len, ky = (l.py2 - l.py1) / len;
      N -= l.px1 * t + kx * t * t / 2;
      V += l.py1 * t + ky * t * t / 2;
      M += l.py1 * ((x - l.a) * t - t * t / 2) + ky * ((x - l.a) * t * t / 2 - t ** 3 / 3);
    } else {
      const inc = l.a < x - 1e-9 || (Math.abs(l.a - x) <= 1e-9 && side > 0);
      if (!inc) continue;
      if (l.k === 'p') { N -= l.px; V += l.py; M += l.py * (x - l.a); } else M -= l.c;
    }
  }
  return [N, V, M];
}

// ---------- álgebra: reordenamiento RCM + LDLᵀ en banda ----------
function rcmNodes(nN, mems) {
  const adj = Array.from({ length: nN }, () => new Set());
  for (const m of mems) { adj[m.i].add(m.j); adj[m.j].add(m.i); }
  const deg = adj.map(s => s.size), seen = new Uint8Array(nN), order = [];
  while (order.length < nN) {
    let st = -1; for (let i = 0; i < nN; i++) if (!seen[i] && (st < 0 || deg[i] < deg[st])) st = i;
    const q = [st]; seen[st] = 1;
    for (let h = 0; h < q.length; h++) { const nb = [...adj[q[h]]].filter(k => !seen[k]).sort((a, b) => deg[a] - deg[b]); for (const k of nb) { seen[k] = 1; q.push(k); } }
    order.push(...q);
  }
  return order.reverse();
}
function bandFactor(K, dofs, b) {
  const n = dofs.length, w = b + 1, Lb = new Float64Array(n * w), D = new Float64Array(n);
  for (let i = 0; i < n; i++) { const r = K[dofs[i]]; for (let k = Math.max(0, i - b); k <= i; k++) Lb[i * w + (i - k)] = r[dofs[k]]; }
  for (let j = 0; j < n; j++) {
    const jw = j * w, j0 = Math.max(0, j - b);
    let s = Lb[jw], sa = Math.abs(s);
    for (let k = j0; k < j; k++) { const l = Lb[jw + (j - k)], t = l * l * D[k]; s -= t; sa += Math.abs(t); }
    if (!(s > 1e-12 * sa)) {
      const e = new Error('singular'); e.dof = dofs[j]; e.neg = s < -1e-7 * sa;
      // modo del mecanismo: x_j = 1, A₁₁·x₁ = −A₁ⱼ  →  x₁ = −L₁₁⁻ᵀ·lⱼ
      const x = new Float64Array(j + 1); x[j] = 1;
      for (let i = j - 1; i >= 0; i--) { let t = 0; for (let k = i + 1; k <= Math.min(j, i + b); k++) t += Lb[k * w + (k - i)] * x[k]; x[i] = -t; }
      e.mode = new Map(); for (let i = 0; i <= j; i++) if (x[i]) e.mode.set(dofs[i], x[i]);
      throw e;
    }
    D[j] = s; Lb[jw] = 1;
    const iMax = Math.min(n - 1, j + b);
    for (let i = j + 1; i <= iMax; i++) {
      const iw = i * w; let t = Lb[iw + (i - j)];
      for (let k = Math.max(0, i - b); k < j; k++) t -= Lb[iw + (i - k)] * Lb[jw + (j - k)] * D[k];
      Lb[iw + (i - j)] = t / s;
    }
  }
  return {
    n, b, D,
    solve(rhs) {
      const x = Float64Array.from(rhs);
      for (let i = 0; i < n; i++) { const iw = i * w; let s = x[i]; for (let k = Math.max(0, i - b); k < i; k++) s -= Lb[iw + (i - k)] * x[k]; x[i] = s; }
      for (let i = 0; i < n; i++) x[i] /= D[i];
      for (let i = n - 1; i >= 0; i--) { let s = x[i]; const kMax = Math.min(n - 1, i + b); for (let k = i + 1; k <= kMax; k++) s -= Lb[k * w + (k - i)] * x[k]; x[i] = s; }
      return x;
    },
  };
}
// valores y vectores propios de una matriz simétrica (Jacobi cíclico)
function jacobiEig(A0) {
  const n = A0.length, A = A0.map(r => Float64Array.from(r)), V = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
  let nrm = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nrm += A[i][j] ** 2;
  for (let sw = 0; sw < 60; sw++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off <= 1e-26 * nrm) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p][q]; if (Math.abs(apq) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * apq), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { val: A.map((r, i) => r[i]), vec: V };
}

// ---------- preparación de la estructura ----------
const DOFN = ['ux', 'uy', 'θz'];
function prepStations(md, LL, nseg) {
  md.mems.forEach((m, mi) => {
    const set = []; for (let k = 0; k <= nseg; k++) set.push([m.L * k / nseg, 0]);
    if (m.zi > 0) set.push([m.zi, 0]); if (m.zj > 0) set.push([m.L - m.zj, 0]);
    for (const lc of LL) for (const l of lc[mi]) {
      if (l.k === 'd') { set.push([l.a, 0], [l.b, 0]); for (let k = 1; k < 8; k++) set.push([l.a + (l.b - l.a) * k / 8, 0]); }
      else if (l.a > 1e-9 && l.a < m.L - 1e-9) set.push([l.a, 1]);
    }
    set.sort((p, q) => p[0] - q[0]);
    const st = [];
    for (let k = 0; k < set.length;) {
      let j = k, jump = false; while (j < set.length && Math.abs(set[j][0] - set[k][0]) < 1e-9) { if (set[j][1]) jump = true; j++; }
      if (jump) st.push([set[k][0], -1], [set[k][0], 1]); else st.push([set[k][0], 0]);
      k = j;
    }
    st[0][1] = 1; st[st.length - 1][1] = -1;
    m.st = st;
  });
}
// datos de barra independientes de los casos
function prepMembers(md) {
  const { mems, secs } = md, nu = md.shear;
  mems.forEach((m) => {
    const sc = secs[m.sec], both = m.rel[0] && m.rel[1];
    m.Lf = m.L - (m.zi || 0) - (m.zj || 0);
    const I = sc.I > 0 ? sc.I : (both ? 1 : 0);
    let ph = 0;
    if (nu !== null && nu !== undefined && sc.I > 0 && !md.truss) { const G = sc.G || sc.E / (2 * (1 + nu)); m.GAs = G * sc.As; ph = 12 * sc.E * sc.I / (m.GAs * m.Lf ** 2); } else m.GAs = 0;
    m.ph = ph; m.k0 = kLocal(sc.E, sc.A, I, m.Lf, ph); m.T = Tm(m.c, m.s);
    m.dofs = [3 * m.i, 3 * m.i + 1, 3 * m.i + 2, 3 * m.j, 3 * m.j + 1, 3 * m.j + 2];
  });
}
// rotación de los GDL de traslación de un nudo con apoyo inclinado: u_global = R·u'  (u' = [u_t, u_n])
function rotK(K, n, c, s) {
  const x = 3 * n, y = x + 1, N = K.length;
  for (let i = 0; i < N; i++) { const a = K[i][x], b = K[i][y]; K[i][x] = c * a + s * b; K[i][y] = -s * a + c * b; }
  const rx = K[x], ry = K[y];
  for (let j = 0; j < N; j++) { const a = rx[j], b = ry[j]; rx[j] = c * a + s * b; ry[j] = -s * a + c * b; }
}
const rotV = (v, n, c, s, inv) => { const x = 3 * n, a = v[x], b = v[x + 1]; if (inv) { v[x] = c * a - s * b; v[x + 1] = s * a + c * b; } else { v[x] = c * a + s * b; v[x + 1] = -s * a + c * b; } };

// describe el modo de mecanismo (vector nulo de K) con los nudos que se mueven
function mechanismText(md, mode, incl) {
  const { nodes } = md, xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const span = Math.max(1e-6, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const tr = new Map(), rot = new Map();
  for (const [d, v] of mode) { const n = Math.floor(d / 3), k = d % 3; if (k < 2) { const q = tr.get(n) || [0, 0]; q[k] = v; tr.set(n, q); } else rot.set(n, v); }
  for (const [n, c, s] of incl) { const q = tr.get(n); if (q) tr.set(n, [c * q[0] - s * q[1], s * q[0] + c * q[1]]); }
  let tmax = 0; for (const q of tr.values()) tmax = Math.max(tmax, Math.hypot(q[0], q[1]));
  let rmax = 0; for (const v of rot.values()) rmax = Math.max(rmax, Math.abs(v) * span);
  const lst = (a) => (a.length > 6 ? a.slice(0, 6).join(', ') + '…' : a.join(', '));
  if (tmax >= 0.05 * rmax && tmax > 0) {
    const mv = [...tr.entries()].filter(([, q]) => Math.hypot(q[0], q[1]) > 0.3 * tmax);
    const dirs = new Set(mv.map(([, q]) => (Math.abs(q[0]) > 2 * Math.abs(q[1]) ? 'x' : Math.abs(q[1]) > 2 * Math.abs(q[0]) ? 'y' : 'xy')));
    const all = mv.length > 1 && tr.size === nodes.length && [...tr.values()].every(q => Math.abs(q[0] - mv[0][1][0]) + Math.abs(q[1] - mv[0][1][1]) < 1e-6 * tmax);
    const why = md.truss ? 'armadura no triangulada o apoyos que no impiden el movimiento de cuerpo rígido' : 'apoyos insuficientes o rótulas (ri/rj) que forman un mecanismo';
    return 'Estructura inestable (mecanismo): ' + (all ? 'toda la estructura se traslada' : 'los nudos ' + lst(mv.map(([n]) => nodes[n].id)) + ' se desplazan') + ' en ' + [...dirs].join('/') + ' sin oponer rigidez — ' + why + '.';
  }
  const rv = [...rot.entries()].filter(([, v]) => Math.abs(v) * span > 0.3 * rmax).map(([n]) => nodes[n].id);
  return 'Estructura inestable (mecanismo): el giro θz de los nudos ' + lst(rv) + ' no tiene rigidez — revise rótulas concurrentes (todas las barras liberadas en el nudo y además un apoyo/ carga que exige giro) o barras biarticuladas sin apoyo de giro.';
}
// ensambla K (con matriz geométrica si Ns) y prepara restricciones + factorización
function buildSystem(md, cases, LL, Ns) {
  const { nodes, mems, sup } = md, nN = nodes.length, nD = 3 * nN;
  const K = Array.from({ length: nD }, () => new Float64Array(nD));
  mems.forEach((m, mi) => {
    const sp = LL.map(lc => splitLoads(lc[mi], m.L, m.zi || 0, m.zj || 0));
    m.flex = sp.map(s => s.flex); m.qrig = sp.map(s => s.rig.map(v => -v));
    m.qf = m.flex.map(f => equivLoads(m.Lf, f, m.ph).map(v => -v));
    let k = m.k0;
    if (Ns && Ns[mi]) { const g = kGeo(Ns[mi], m.Lf); k = k.map((r, i) => r.map((v, j) => v + g[i][j])); }
    const cd = condense(k, m.qf, m.rel); m.kc = cd.k; m.qc = cd.qs;
    m.qn = cd.qs.map((q, ci) => HtV(q, m.zi || 0, m.zj || 0).map((v, p) => v + m.qrig[ci][p]));
    m.kg = TtKT(m.T, HtKH(cd.k, m.zi || 0, m.zj || 0));
    for (let p = 0; p < 6; p++) { const row = K[m.dofs[p]], kp = m.kg[p]; for (let q = 0; q < 6; q++) row[m.dofs[q]] += kp[q]; }
  });
  sup.forEach((s, n) => s.k.forEach((k, d) => { if (k) K[3 * n + d][3 * n + d] += k; }));
  const incl = []; sup.forEach((s, n) => { if (s.ang !== null && s.ang !== undefined) { const a = s.ang * Math.PI / 180; incl.push([n, Math.cos(a), Math.sin(a)]); } });
  for (const [n, c, s] of incl) rotK(K, n, c, s);
  // restricciones y giros sin rigidez (nudos con todas sus barras articuladas)
  const restr = new Uint8Array(nD), auto = [];
  sup.forEach((s, n) => s.r.forEach((r, d) => { if (r) restr[3 * n + d] = 1; }));
  for (let n = 0; n < nN; n++) {
    const d = 3 * n + 2; let kn = 0; for (let j = 0; j < nD; j++) kn = Math.max(kn, Math.abs(K[d][j]));
    const kr = Math.max(Math.abs(K[3 * n][3 * n]), Math.abs(K[3 * n + 1][3 * n + 1]));
    if (!restr[d] && kn <= 1e-12 * (kr || 1)) {
      const loaded = cases.some(c => c.loads.some(l => l.t === 'N' && l.n === n && Math.abs(l.vals[2]) > 0));
      if (loaded) throw new Error('El nudo ' + nodes[n].id + ' recibe un momento pero todas sus barras están articuladas en él (no puede tomar momento)');
      restr[d] = 1; auto.push(d);
    }
  }
  // orden de los GDL libres (RCM) y ancho de banda
  const ord = md._ord || (md._ord = rcmNodes(nN, mems));
  const free = [], fixd = [];
  for (const n of ord) for (let d = 0; d < 3; d++) (restr[3 * n + d] ? fixd : free).push(3 * n + d);
  const pos = new Int32Array(nD).fill(-1); free.forEach((d, i) => { pos[d] = i; });
  let bw = 0;
  for (const m of mems) { let lo = Infinity, hi = -1; for (const d of m.dofs) if (pos[d] >= 0) { lo = Math.min(lo, pos[d]); hi = Math.max(hi, pos[d]); } if (hi >= 0) bw = Math.max(bw, hi - lo); }
  for (let n = 0; n < nN; n++) { const ps = [0, 1, 2].map(d => pos[3 * n + d]).filter(p => p >= 0); if (ps.length) bw = Math.max(bw, Math.max(...ps) - Math.min(...ps)); }
  let fac = null;
  if (free.length) {
    try { fac = bandFactor(K, free, bw); } catch (e) {
      if (e.message !== 'singular') throw e;
      const n = Math.floor(e.dof / 3);
      if (Ns && e.neg) { const err = new Error('pandeo'); err.node = nodes[n].id; throw err; }
      throw new Error(mechanismText(md, e.mode, incl));
    }
  }
  return { K, restr, auto, free, fixd, fac, incl, bw };
}
// resuelve los casos con un sistema ya ensamblado
function solveCases(md, sys, cases, LL, pd, endOnly) {
  const { nodes, mems, sup } = md, nN = nodes.length, nD = 3 * nN;
  const { K, restr, auto, free, fixd, fac, incl } = sys;
  const res = cases.map((c, ci) => {
    const Fv = new Float64Array(nD), Ur = new Float64Array(nD);
    for (const m of mems) { const g = mulTtV(m.T, m.qn[ci]); for (let p = 0; p < 6; p++) Fv[m.dofs[p]] -= g[p]; }
    for (const l of c.loads) {
      if (l.t === 'N') l.vals.forEach((v, d) => { Fv[3 * l.n + d] += v; });
      if (l.t === 'S') l.vals.forEach((v, d) => {
        if (!v) return;
        if (sup[l.n].ang !== null && sup[l.n].ang !== undefined && d < 2) throw new Error('Desplazamiento impuesto en el nudo ' + nodes[l.n].id + ': no se admite en apoyos inclinados');
        if (!restr[3 * l.n + d] || auto.includes(3 * l.n + d)) throw new Error('Desplazamiento impuesto en el nudo ' + nodes[l.n].id + ': la dirección ' + ['x', 'y', 'θ'][d] + ' no está restringida por un apoyo');
        Ur[3 * l.n + d] = v;
      });
    }
    const F0 = Float64Array.from(Fv);
    for (const [n, cs, sn] of incl) rotV(Fv, n, cs, sn);
    const rhs = free.map(i => { let s = Fv[i]; const r = K[i]; for (const j of fixd) if (Ur[j]) s -= r[j] * Ur[j]; return s; });
    const x = fac ? fac.solve(rhs) : [];
    const u = new Float64Array(nD); free.forEach((d, k) => { u[d] = x[k]; }); fixd.forEach(d => { u[d] = Ur[d]; });
    if (!u.every(Number.isFinite) || Math.max(...md.nodes.map((n, i) => Math.hypot(u[3 * i], u[3 * i + 1]))) > 1e3 * md.span) throw new Error('Estructura inestable o casi inestable (' + c.name + '): los desplazamientos superan 1000 veces la dimensión del modelo; revise apoyos, rótulas y rigideces');
    const R = new Float64Array(nD);
    for (const d of fixd) { let s = 0; const r = K[d]; for (let j = 0; j < nD; j++) s += r[j] * u[j]; R[d] = s - Fv[d]; }
    for (const [n, cs, sn] of incl) { rotV(u, n, cs, sn, true); rotV(R, n, cs, sn, true); }
    sup.forEach((s, n) => s.k.forEach((k, d) => { if (k && !restr[3 * n + d]) R[3 * n + d] = -k * u[3 * n + d]; }));
    auto.forEach(d => { R[d] = 0; });
    if (endOnly) return { u, N: mems.map(m => { const ul = mulMV(m.T, m.dofs.map(d => u[d])), ff = mulMV(m.kc, Hv(ul, m.zi || 0, m.zj || 0)).map((v, p) => v + m.qc[ci][p]), f = HtV(ff, m.zi || 0, m.zj || 0).map((v, p) => v + m.qrig[ci][p]); return (-f[0] + f[3]) / 2; }) };
    const mf = mems.map((m, k) => recoverMember(md, m, k, u, ci, LL[ci][k], pd));
    // equilibrio global: Σ cargas + Σ reacciones (x, y, momento respecto del origen)
    let sx = 0, sy = 0, sm = 0;
    for (let n = 0; n < nN; n++) { const X = nodes[n].x, Y = nodes[n].y; sx += R[3 * n] + F0[3 * n]; sy += R[3 * n + 1] + F0[3 * n + 1]; sm += R[3 * n + 2] + F0[3 * n + 2] + X * (R[3 * n + 1] + F0[3 * n + 1]) - Y * (R[3 * n] + F0[3 * n]); }
    let lx = 0, ly = 0;
    for (let n = 0; n < nN; n++) { lx += F0[3 * n]; ly += F0[3 * n + 1]; }
    return { name: c.name, u, R, mf, eq: [sx, sy, pd ? NaN : sm], load: [lx, ly] };
  });
  return res;
}
// fuerzas en extremos, diagramas y deformada de una barra
function recoverMember(md, m, k, u, ci, lds, pd) {
  const sc = md.secs[m.sec], zi = m.zi || 0, zj = m.zj || 0;
  const ug = m.dofs.map(d => u[d]), ul = mulMV(m.T, ug);
  const ff = mulMV(m.kc, Hv(ul, zi, zj)).map((v, p) => v + m.qc[ci][p]);
  const f = HtV(ff, zi, zj).map((v, p) => v + m.qrig[ci][p]);
  const N = [], V = [], M = [];
  for (const [x, sd] of m.st) { const r = intForces(f, lds, x, sd); N.push(r[0]); V.push(r[1]); M.push(r[2]); }
  const EI = sc.E * sc.I, nst = m.st.length;
  const flexInt = m.st.map((s, p) => { if (!p) return false; const xm = (m.st[p - 1][0] + s[0]) / 2; return xm >= zi - 1e-9 && xm <= m.L - zj + 1e-9; });
  // deformada local: v = ∫∫M/EI − ∫V/GAs (V = dM/dx) con v(0) = vi, v(L) = vj ; axial lineal
  const shape = (Mv) => {
    // integración exacta para M lineal entre estaciones
    const th = [0], w = [0];
    for (let p = 1; p < nst; p++) {
      const h = m.st[p][0] - m.st[p - 1][0], fl = flexInt[p];
      th.push(th[p - 1] + (fl ? h * (Mv[p] + Mv[p - 1]) / (2 * EI) : 0));
      w.push(w[p - 1] + h * th[p - 1] + (fl ? h * h * (2 * Mv[p - 1] + Mv[p]) / (6 * EI) : 0) + (fl && m.GAs ? -h * (V[p] + V[p - 1]) / (2 * m.GAs) : 0));
    }
    const th0 = (ul[4] - ul[1] - w[nst - 1]) / m.L;
    return m.st.map(([x], p) => ul[1] + th0 * x + w[p]);
  };
  let vv;
  const bend = EI > 0 && !(m.rel[0] && m.rel[1] && md.truss);
  if (bend) {
    if (pd) {
      // P-δ dentro de la barra: M(x) = M₀(x) + N·(v(x) − vᵢ)  (equilibrio en la configuración deformada)
      const Nm = (-f[0] + f[3]) / 2, M0 = M.slice();
      vv = m.st.map(([x]) => ul[1] + (ul[4] - ul[1]) * x / m.L);
      for (let it = 0; it < 4; it++) { for (let p = 0; p < nst; p++) M[p] = M0[p] + Nm * (vv[p] - ul[1]); vv = shape(M); }
      for (let p = 0; p < nst; p++) M[p] = M0[p] + Nm * (vv[p] - ul[1]);
    } else vv = shape(M);
  } else vv = m.st.map(([x]) => ul[1] + (ul[4] - ul[1]) * x / m.L);
  const ua = m.st.map(([x]) => ul[0] + (ul[3] - ul[0]) * x / m.L);
  return { f, N, V, M, v: vv, ua, ul };
}

export function solveFrame(md, nseg = 40, opts = {}) {
  const cases = opts.cases || md.cases;
  if (!md._prep) {
    const LL0 = md.cases.map(c => md.mems.map(() => []));
    md.cases.forEach((c, ci) => c.loads.forEach(ld => { if (ld.m !== undefined) LL0[ci][ld.m].push(localLoads(md.mems[ld.m], ld)); }));
    prepStations(md, LL0, nseg); prepMembers(md); md._prep = true;
  }
  const LL = cases.map(c => md.mems.map(() => []));
  cases.forEach((c, ci) => c.loads.forEach(ld => { if (ld.m !== undefined) LL[ci][ld.m].push(localLoads(md.mems[ld.m], ld)); }));
  if (!opts.pdelta) {
    const sys = buildSystem(md, cases, LL, null);
    const res = solveCases(md, sys, cases, LL, false);
    return { res, restr: sys.restr, auto: sys.auto, free: sys.free, LL, bw: sys.bw };
  }
  // ---- 2.º orden (P-Δ): un sistema por caso, iteración sobre las fuerzas axiales ----
  let last = null;
  const res = cases.map((c, ci) => {
    const L1 = [LL[ci]]; let Ns = null, prev = null, r = null, it = 0, r1 = null, sys = null;
    const amax = (v) => { let a = 1e-12; for (const x of v) if (Math.abs(x) > a) a = Math.abs(x); return a; };
    for (it = 1; it <= 40; it++) {
      try { sys = buildSystem(md, [c], L1, Ns); } catch (e) {
        if (e.message === 'pandeo') throw new Error('Análisis P-Δ (' + c.name + '): la rigidez lateral se anula (carga axial ≥ carga crítica de pandeo) cerca del nudo ' + e.node + '. Aumente secciones o reduzca cargas.');
        throw e;
      }
      r = solveCases(md, sys, [c], L1, true, true)[0]; last = sys;
      if (it === 1) r1 = r;
      const um = amax(r.u);
      if (prev && amax(r.u.map((v, i) => v - prev[i])) <= 1e-7 * um) break;
      if (it > 2 && prev && um > 1e3 * amax(prev)) { it = 41; break; }
      prev = r.u; Ns = r.N;
    }
    if (it > 40) throw new Error('Análisis P-Δ (' + c.name + '): la iteración no converge (la carga axial se aproxima a la carga crítica de pandeo)');
    r = solveCases(md, sys, [c], L1, true)[0];
    const ux1 = Math.max(...md.nodes.map((n, i) => Math.abs(r1.u[3 * i]))), ux2 = Math.max(...md.nodes.map((n, i) => Math.abs(r.u[3 * i])));
    r.pd = { it, ux1, ux2, amp: ux1 > 1e-12 ? ux2 / ux1 : 1 };
    return r;
  });
  return { res, restr: last.restr, auto: last.auto, free: last.free, LL, bw: last.bw };
}

// combinación lineal de resultados
function combine(sol, f, name, md) {
  const nD = sol.res[0].u.length;
  const u = new Float64Array(nD), R = new Float64Array(nD);
  const mf = md.mems.map((m) => ({ f: [0, 0, 0, 0, 0, 0], N: m.st.map(() => 0), V: m.st.map(() => 0), M: m.st.map(() => 0), v: m.st.map(() => 0), ua: m.st.map(() => 0), ul: [0, 0, 0, 0, 0, 0] }));
  sol.res.forEach((r) => {
    const k = f[r.name] || 0; if (!k) return;
    for (let i = 0; i < nD; i++) { u[i] += k * r.u[i]; R[i] += k * r.R[i]; }
    r.mf.forEach((q, mi) => { const o = mf[mi]; for (const key of ['f', 'N', 'V', 'M', 'v', 'ua', 'ul']) q[key].forEach((v, p) => { o[key][p] += k * v; }); });
  });
  return { name, u, R, mf };
}
// cargas de una combinación como un caso nuevo (para el análisis no lineal P-Δ)
function comboCase(md, f, name) {
  const loads = [];
  for (const c of md.cases) {
    const k = f[c.name] || 0; if (!k) continue;
    for (const l of c.loads) {
      const o = { ...l };
      if (l.t === 'N' || l.t === 'S') o.vals = l.vals.map(v => v * k);
      else if (l.t === 'D') { o.w1 = l.w1 * k; o.w2 = l.w2 * k; } else if (l.t === 'P') o.P = l.P * k; else if (l.t === 'C') o.C = l.C * k;
      loads.push(o);
    }
  }
  return { name, loads };
}

// ---------------------------------------------------------------------
//  Análisis modal (masas concentradas en los nudos)
//   K φ = ω² M φ  → condensación exacta a los GDL con masa mediante la flexibilidad F = (K⁻¹)ₘₘ :
//   (M^½ F M^½) ψ = (1/ω²) ψ   (Chopra, «Dynamics of Structures», cap. 9-10)
// ---------------------------------------------------------------------
export function modalFrame(md, masses, nmodes = 6) {
  const { nodes, sup } = md, nD = 3 * nodes.length;
  const sys = buildSystem(md, [], [], null);
  if (!sys.fac) throw new Error('Análisis modal: no hay grados de libertad libres');
  const pos = new Int32Array(nD).fill(-1); sys.free.forEach((d, i) => { pos[d] = i; });
  const mdofs = [];
  masses.forEach((ms, n) => {
    if (!ms) return;
    const inc = sup[n].ang !== null && sup[n].ang !== undefined;
    const c = inc ? Math.cos(sup[n].ang * Math.PI / 180) : 1, s = inc ? Math.sin(sup[n].ang * Math.PI / 180) : 0;
    if (inc) { const mt = ms[0] * c * c + ms[1] * s * s; if (mt > 0 && pos[3 * n] >= 0) mdofs.push({ d: 3 * n, m: mt }); return; }
    for (let d = 0; d < 2; d++) if (ms[d] > 0 && pos[3 * n + d] >= 0) mdofs.push({ d: 3 * n + d, m: ms[d] });
  });
  if (!mdofs.length) throw new Error('Análisis modal: ninguna masa está en un grado de libertad libre');
  if (mdofs.length > 400) throw new Error('Análisis modal: máximo 400 grados de libertad con masa');
  const X = mdofs.map(q => { const e = new Float64Array(sys.free.length); e[pos[q.d]] = 1; return sys.fac.solve(e); });
  const nm = mdofs.length, sq = mdofs.map(q => Math.sqrt(q.m));
  const A = mdofs.map((p, i) => mdofs.map((q, j) => sq[i] * X[j][pos[p.d]] * sq[j]));
  for (let i = 0; i < nm; i++) for (let j = i + 1; j < nm; j++) { const a = (A[i][j] + A[j][i]) / 2; A[i][j] = a; A[j][i] = a; }
  const { val, vec } = jacobiEig(A);
  const idx = val.map((v, i) => i).filter(i => val[i] > 1e-300).sort((a, b) => val[b] - val[a]);
  // masas totales por dirección (traslación global de los nudos libres)
  const Mtot = [0, 0];
  masses.forEach((ms, n) => { if (!ms) return; const inc = sup[n].ang !== null && sup[n].ang !== undefined; for (let d = 0; d < 2; d++) if (inc ? pos[3 * n] >= 0 : pos[3 * n + d] >= 0) Mtot[d] += ms[d]; });
  const modes = [];
  for (const i of idx.slice(0, Math.min(nmodes, idx.length))) {
    const w2 = 1 / val[i], phi = mdofs.map((q, k) => vec[k][i] / sq[k]);
    // forma completa: u = K⁻¹ M φ ω²
    const uf = new Float64Array(sys.free.length);
    mdofs.forEach((q, k) => { const a = q.m * phi[k] * w2; const x = X[k]; for (let t = 0; t < uf.length; t++) uf[t] += x[t] * a; });
    const u = new Float64Array(nD); sys.free.forEach((d, t) => { u[d] = uf[t]; });
    for (const [n, c, s] of sys.incl) rotV(u, n, c, s, true);
    let umax = 0; for (let n = 0; n < nodes.length; n++) umax = Math.max(umax, Math.hypot(u[3 * n], u[3 * n + 1]));
    // normalización: máxima traslación = 1 con signo positivo en la mayor componente
    let big = 0; for (let n = 0; n < nodes.length; n++) for (let d = 0; d < 2; d++) if (Math.abs(u[3 * n + d]) > Math.abs(big)) big = u[3 * n + d];
    const sc = (big < 0 ? -1 : 1) / (umax || 1); for (let t = 0; t < nD; t++) u[t] *= sc;
    // participación en coordenadas globales
    let Mn = 0; const Ln = [0, 0];
    masses.forEach((ms, n) => { if (!ms) return; for (let d = 0; d < 2; d++) { const q = u[3 * n + d]; Mn += ms[d] * q * q; Ln[d] += ms[d] * q; } });
    const w = Math.sqrt(w2);
    modes.push({ w, T: 2 * Math.PI / w, f: w / (2 * Math.PI), u, gam: Ln.map(L => L / Mn), mef: Ln.map((L, d) => (Mtot[d] > 0 ? L * L / Mn / Mtot[d] : 0)) });
  }
  return { modes, Mtot, ndof: nm };
}

// ---------------------------------------------------------------------
//  Dibujo
// ---------------------------------------------------------------------
function makeView(nodes, W, o = {}) {
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const dx = xmax - xmin, dy = ymax - ymin, span = Math.max(dx, dy, 1e-6);
  const pl = o.pl ?? 50, pr = o.pr ?? 50, pt = o.pt ?? 40, pb = o.pb ?? 40, maxH = o.maxH ?? 440;
  let sc = dx > 1e-9 ? (W - pl - pr) / dx : Infinity;
  if (dy > 1e-9) sc = Math.min(sc, (maxH - pt - pb) / dy);
  if (!isFinite(sc)) sc = 100;
  const H = Math.max(o.minH ?? 120, dy * sc + pt + pb);
  const ox = pl + ((W - pl - pr) - dx * sc) / 2, oy = pt + ((H - pt - pb) - dy * sc) / 2;
  return { X: (x) => ox + (x - xmin) * sc, Y: (y) => oy + (ymax - y) * sc, sc, W, H, span, xmin, xmax, ymin, ymax, dx, dy };
}
const P = (v, n) => [v.X(n.x), v.Y(n.y)];
// orientación del apoyo: opuesta a las barras que llegan al nudo
function supDir(md, n, v) {
  const y0 = md.nodes[n].y, x0 = md.nodes[n].x, tol = 1e-6 * (v.span || 1);
  let below = false, above = false, left = false, right = false;
  for (const m of md.mems) {
    const o = m.i === n ? m.j : m.j === n ? m.i : -1; if (o < 0) continue;
    const q = md.nodes[o];
    if (q.y < y0 - tol) below = true; if (q.y > y0 + tol) above = true;
    if (q.x < x0 - tol) left = true; if (q.x > x0 + tol) right = true;
  }
  if (!below) return 0;
  if (!above) return 180;
  if (!left) return 90;
  if (!right) return -90;
  return 0;
}
function supportGlyph(md, n, v, col = C.ink) {
  const s = md.sup[n]; if (!s.any) return '';
  const [x, y] = P(v, md.nodes[n]);
  const r = s.r.join('');
  let rot = supDir(md, n, v), g = '';
  if (s.ang !== null) {
    // rodillo inclinado: superficie de rodadura a α (antihorario desde x)
    const a = s.ang, nx0 = -Math.sin(a * Math.PI / 180), ny0 = Math.cos(a * Math.PI / 180);
    const below = supDir(md, n, v) === 0 ? 1 : -1;
    rot = -a + (below > 0 ? 0 : 180); void nx0; void ny0;
    g = `<path d="M0,0 L-8,11 L8,11 Z" fill="#fff" stroke="${col}" stroke-width="1.3"/><circle cx="-4.5" cy="14" r="2.8" fill="#fff" stroke="${col}"/><circle cx="4.5" cy="14" r="2.8" fill="#fff" stroke="${col}"/><rect x="-15" y="17" width="30" height="5" fill="url(#anH)"/><line x1="-15" y1="17" x2="15" y2="17" stroke="${col}" stroke-width="1.2"/>`;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})">${g}</g>` + TH(x + 16, y + 26, 'α = ' + f2(a, 1) + '°', { fs: 8.5, c: '#5b6b7b', a: 'start' });
  }
  if (r === '111') g = `<rect x="-15" y="0" width="30" height="7" fill="url(#anH)" stroke="none"/><line x1="-15" y1="0" x2="15" y2="0" stroke="${col}" stroke-width="2.2"/>`;
  else if (r === '110') g = `<path d="M0,0 L-8,13 L8,13 Z" fill="#fff" stroke="${col}" stroke-width="1.3"/><rect x="-13" y="13" width="26" height="5" fill="url(#anH)"/><line x1="-13" y1="13" x2="13" y2="13" stroke="${col}" stroke-width="1.2"/>`;
  else if (r === '010' || r === '100') {
    if (r === '010') rot = rot === 180 ? 180 : 0; else rot = rot === -90 ? -90 : 90;
    g = `<path d="M0,0 L-8,11 L8,11 Z" fill="#fff" stroke="${col}" stroke-width="1.3"/><circle cx="-4.5" cy="14" r="2.8" fill="#fff" stroke="${col}"/><circle cx="4.5" cy="14" r="2.8" fill="#fff" stroke="${col}"/><rect x="-13" y="17" width="26" height="5" fill="url(#anH)"/><line x1="-13" y1="17" x2="13" y2="17" stroke="${col}" stroke-width="1.2"/>`;
  } else if (r === '011' || r === '101') {
    if (r === '011') rot = rot === 180 ? 180 : 0; else rot = rot === -90 ? -90 : 90;
    g = `<rect x="-11" y="0" width="22" height="5" fill="#fff" stroke="${col}"/><circle cx="-6" cy="8" r="2.8" fill="#fff" stroke="${col}"/><circle cx="6" cy="8" r="2.8" fill="#fff" stroke="${col}"/><rect x="-14" y="11" width="28" height="5" fill="url(#anH)"/><line x1="-14" y1="11" x2="14" y2="11" stroke="${col}" stroke-width="1.2"/>`;
  } else if (r !== '000') g = `<rect x="-6" y="-6" width="12" height="12" fill="none" stroke="${col}" stroke-dasharray="2 1.5"/>` + `<text x="0" y="20" font-size="8" text-anchor="middle" fill="${col}" font-family="Inter,Arial">${r}</text>`;
  let out = g ? `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})">${g}</g>` : '';
  // resortes
  const zig = (len) => { let d = 'M0,0 L0,4'; for (let k = 0; k < 6; k++) d += ` L${k % 2 ? -5 : 5},${4 + (k + 0.5) * (len - 8) / 6}`; return d + ` L0,${len - 4} L0,${len}`; };
  if (s.k[1]) out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="${zig(24)}" fill="none" stroke="${C.orange}" stroke-width="1.3"/><line x1="-10" y1="24" x2="10" y2="24" stroke="${col}" stroke-width="1.4"/><rect x="-10" y="24" width="20" height="4" fill="url(#anH)"/></g>`;
  if (s.k[0]) out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(90)"><path d="${zig(24)}" fill="none" stroke="${C.orange}" stroke-width="1.3"/><line x1="-10" y1="24" x2="10" y2="24" stroke="${col}" stroke-width="1.4"/></g>`;
  if (s.k[2]) out += `<path d="M${x + 7},${y} a7,7 0 1,1 -3,-5.7" fill="none" stroke="${C.orange}" stroke-width="1.3"/>` + TH(x + 12, y + 14, 'kθ', { fs: 8, c: C.orange });
  return out;
}
function hingeGlyphs(md, v) {
  let g = '';
  if (md.truss) return md.nodes.map(n => `<circle cx="${v.X(n.x).toFixed(1)}" cy="${v.Y(n.y).toFixed(1)}" r="3.4" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`).join('');
  for (const m of md.mems) {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, oi = Math.max(Math.min(7, L / 4), (m.zi || 0) * v.sc + 3.5), oj = Math.max(Math.min(7, L / 4), (m.zj || 0) * v.sc + 3.5);
    if (m.rel[0]) g += `<circle cx="${(a[0] + ex * oi).toFixed(1)}" cy="${(a[1] + ey * oi).toFixed(1)}" r="3.2" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`;
    if (m.rel[1]) g += `<circle cx="${(b[0] - ex * oj).toFixed(1)}" cy="${(b[1] - ey * oj).toFixed(1)}" r="3.2" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`;
  }
  return g;
}
function membersLine(md, v, col = '#9aa5b1', w = 1.6) { return md.mems.map(m => { const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]); return Lne(a[0], a[1], b[0], b[1], col, w); }).join(''); }
// colocador de etiquetas sin superposición
function labeler(Wb) {
  const boxes = [];
  const inside = (x, w) => !Wb || (x - w / 2 >= 2 && x + w / 2 <= Wb - 2);
  const hit = (x, y, w, h) => boxes.some(b => Math.abs(b.x - x) < (b.w + w) / 2 + 1 && Math.abs(b.y - y) < (b.h + h) / 2);
  return {
    add(x, y, w, h) { boxes.push({ x, y, w, h }); },
    place(cands, w, h) { for (const [x, y] of cands) if (inside(x, w) && !hit(x, y, w, h)) { boxes.push({ x, y, w, h }); return [x, y]; } return null; },
  };
}
function dims(md, v) {
  let g = '';
  const xs = [...new Set(md.nodes.map(n => +n.x.toFixed(4)))].sort((a, b) => a - b);
  const ys = [...new Set(md.nodes.map(n => +n.y.toFixed(4)))].sort((a, b) => a - b);
  const yb = v.Y(v.ymin) + 34;
  if (xs.length > 1 && xs.length <= 16) for (let k = 0; k < xs.length - 1; k++) {
    const x1 = v.X(xs[k]), x2 = v.X(xs[k + 1]); if (x2 - x1 < 14) continue;
    g += Lne(x1, yb, x2, yb, C.axis, 0.7) + Lne(x1, yb - 4, x1, yb + 4, C.axis, 0.7) + Lne(x2, yb - 4, x2, yb + 4, C.axis, 0.7);
    if (x2 - x1 > 26) g += T((x1 + x2) / 2, yb - 4, f2(xs[k + 1] - xs[k]), { fs: 9, c: '#5b6b7b' });
  }
  const xl = v.X(v.xmin) - 34;
  if (ys.length > 1 && ys.length <= 16) for (let k = 0; k < ys.length - 1; k++) {
    const y1 = v.Y(ys[k]), y2 = v.Y(ys[k + 1]); if (y1 - y2 < 14) continue;
    g += Lne(xl, y1, xl, y2, C.axis, 0.7) + Lne(xl - 4, y1, xl + 4, y1, C.axis, 0.7) + Lne(xl - 4, y2, xl + 4, y2, C.axis, 0.7);
    if (y1 - y2 > 26) g += T(xl - 4, (y1 + y2) / 2, f2(ys[k + 1] - ys[k]), { fs: 9, c: '#5b6b7b', r: -90 });
  }
  return g;
}
function drawModel(md, W) {
  const v = makeView(md.nodes, W, { pl: 70, pr: 50, pt: 36, pb: 56, maxH: 460 });
  let g = DEFS + dims(md, v);
  const multi = md.secs.length > 1;
  for (const m of md.mems) {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]);
    g += Lne(a[0], a[1], b[0], b[1], multi ? PAL[m.sec % PAL.length] : C.ink, md.truss ? 2 : 2.6);
  }
  // zonas rígidas: tramo grueso en los extremos
  for (const m of md.mems) {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]), ux = (b[0] - a[0]) / m.L, uy = (b[1] - a[1]) / m.L;
    if (m.zi > 0) g += Lne(a[0], a[1], a[0] + ux * m.zi, a[1] + uy * m.zi, C.ink, 5.5);
    if (m.zj > 0) g += Lne(b[0], b[1], b[0] - ux * m.zj, b[1] - uy * m.zj, C.ink, 5.5);
  }
  g += hingeGlyphs(md, v);
  md.nodes.forEach((n, k) => { g += supportGlyph(md, k, v); });
  const lb = labeler();
  md.nodes.forEach((n) => { const [x, y] = P(v, n); if (!md.truss) g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${C.ink}"/>`; lb.add(x, y, 8, 8); });
  // numeración de barras
  for (const m of md.mems) {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]); const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const w = 7 * String(m.id).length + 8;
    g += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="${w}" height="14" rx="3" fill="#fff" stroke="${multi ? PAL[m.sec % PAL.length] : C.axis}" stroke-width="0.9"/>` + T(x, y + 3.5, m.id, { fs: 9, c: C.ink });
    lb.add(x, y, w, 14);
  }
  md.nodes.forEach((n) => {
    const [x, y] = P(v, n); const w = 6.5 * String(n.id).length + 4;
    const p = lb.place([[x - 9, y - 9], [x + 9, y - 9], [x - 9, y + 13], [x + 9, y + 13], [x - 14, y], [x + 14, y]], w, 11);
    if (p) g += `<text x="${p[0].toFixed(1)}" y="${(p[1] + 3).toFixed(1)}" font-size="9.5" font-weight="600" fill="${C.red}" text-anchor="middle" font-family="Inter,Arial" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(n.id)}</text>`;
  });
  let leg = '';
  if (multi) leg = '<div class="legend">' + md.secs.map((s, i) => `<span><i style="background:${PAL[i % PAL.length]}"></i>${esc(s.id)}${s.desc ? ' (' + esc(s.desc) + ')' : ''}</span>`).join('') + '</div>';
  return svgWrap(W, v.H, g) + leg;
}
// cargas de un caso
function drawLoads(md, ci, W, maxH) {
  const v = makeView(md.nodes, W, { pl: 50, pr: 50, pt: 74, pb: 40, maxH, minH: 150 });
  let g = DEFS + membersLine(md, v, C.ink, 1.8) + hingeGlyphs(md, v);
  md.nodes.forEach((n, k) => { g += supportGlyph(md, k, v, '#5b6b7b'); });
  const c = md.cases[ci];
  const lu = md.U.lab;
  const dl = c.loads.filter(l => l.t === 'D' && l.m !== undefined && !l.pp);
  const hasPP = c.loads.some(l => l.pp);
  const maxW = Math.max(1e-12, ...dl.map(l => Math.max(Math.abs(l.w1), Math.abs(l.w2))));
  const stack = {};
  const lb = labeler(W);
  const ttl = c.name + (md.cdesc[c.name] ? ' — ' + md.cdesc[c.name] : '');
  lb.add(10 + ttl.length * 3.4, 14, ttl.length * 6.8, 18);
  if (hasPP) lb.add(10 + 70, 30, 140, 12);
  for (const l of dl) {
    const m = md.mems[l.m], n1 = md.nodes[m.i], n2 = md.nodes[m.j];
    const a = (l.a.pct !== undefined ? l.a.pct * m.L : l.a.v), b = (l.b.pct !== undefined ? l.b.pct * m.L : l.b.v);
    // dirección positiva de la carga en pantalla (unitaria)
    let dx = 0, dy = 1;
    if (l.dir === 'horiz' || l.dir === 'hproy') { dx = 1; dy = 0; }
    else if (l.dir === 'perp') { dx = -m.s; dy = -m.c; }
    else if (l.dir === 'axial') { dx = m.c; dy = -m.s; }
    // lado del diagrama: arriba de la barra (o a la izquierda si es vertical)
    let nx = -m.s, ny = -m.c; if (ny > 0) { nx = -nx; ny = -ny; } if (Math.abs(m.c) < 0.2) { nx = -1; ny = 0; }
    const key = l.m;
    const off = stack[key] || 0;
    const hmax = 28, hh = (w) => 7 + hmax * Math.abs(w) / maxW;
    stack[key] = off + Math.max(hh(l.w1), hh(l.w2)) + 4;
    const pt = (x) => { const p = [v.X(n1.x + (n2.x - n1.x) * x / m.L), v.Y(n1.y + (n2.y - n1.y) * x / m.L)]; return [p[0] + nx * off, p[1] + ny * off]; };
    const wAt = (x) => l.w1 + (l.w2 - l.w1) * (x - a) / (b - a);
    // flecha de la fuerza: F = w·d ; si apunta hacia la barra desde el lado del diagrama, la punta toca la barra
    const arr = (x) => {
      const w = wAt(x), fxs = dx * Math.sign(w || 1), fys = dy * Math.sign(w || 1), h = hh(w), p = pt(x);
      const into = fxs * nx + fys * ny <= 1e-9;
      if (into) return { t: [p[0] - fxs * h, p[1] - fys * h], h: p, top: [p[0] - fxs * h, p[1] - fys * h] };
      return { t: p, h: [p[0] + fxs * h, p[1] + fys * h], top: [p[0] + fxs * h, p[1] + fys * h] };
    };
    const pa = pt(a), pb = pt(b), slen = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const na = Math.max(3, Math.round(slen / 15));
    const col = C.blue, mk = 'anB';
    const tops = []; for (let k = 0; k <= na; k++) tops.push(arr(a + (b - a) * k / na));
    const poly = `M${pa[0].toFixed(1)},${pa[1].toFixed(1)} ` + tops.map(q => 'L' + q.top[0].toFixed(1) + ',' + q.top[1].toFixed(1)).join(' ') + ` L${pb[0].toFixed(1)},${pb[1].toFixed(1)} Z`;
    g += `<path d="${poly}" fill="${C.blueF}" stroke="none"/>`;
    g += `<path d="${tops.map((q, k) => (k ? 'L' : 'M') + q.top[0].toFixed(1) + ',' + q.top[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="1.1"/>`;
    for (const q of tops) { const L0 = Math.hypot(q.h[0] - q.t[0], q.h[1] - q.t[1]); if (L0 > 4) g += arrow(q.t[0], q.t[1], q.h[0] - (q.h[0] - q.t[0]) / L0 * 1.2, q.h[1] - (q.h[1] - q.t[1]) / L0 * 1.2, col, mk, 0.8); }
    const lab = (Math.abs(l.w1 - l.w2) < 1e-9 ? fx(l.w1) : fx(l.w1) + '→' + fx(l.w2)) + ' ' + lu + '/m' + (l.dir === 'proy' || l.dir === 'hproy' ? ' (proy.)' : '');
    const tm = tops[Math.floor(tops.length / 2)].top, base = pt((a + b) / 2), ux = tm[0] - base[0], uy = tm[1] - base[1], ul = Math.hypot(ux, uy) || 1;
    const w = lab.length * 5.4 + 4;
    const cands = []; for (const d0 of [10, 22, 34]) for (const sh of [0, 34, -34, 60, -60]) cands.push([tm[0] + ux / ul * d0 + (Math.abs(nx) > 0.9 ? 0 : sh), tm[1] + uy / ul * d0 + 3 + (Math.abs(nx) > 0.9 ? sh * 0.6 : 0)]);
    for (const sh of [0, 20, -20, 40, -40]) cands.push([base[0] - ux / ul * (12 + (Math.abs(nx) > 0.9 ? w / 2 : 0)), base[1] - uy / ul * 12 + 3 + sh]);
    const pp = lb.place(cands, w, 11);
    if (pp) g += TH(pp[0], pp[1], lab, { fs: 9.5, c: col });
  }
  if (hasPP) { const pc = c.loads.find(l => l.pp); void pc; g += T(10, 32, '+ peso propio de las barras (γ·A)', { fs: 9.5, c: '#5b6b7b', a: 'start' }); }
  // puntuales y momentos en barras
  for (const l of c.loads.filter(q => (q.t === 'P' || q.t === 'C') && q.m !== undefined)) {
    const m = md.mems[l.m], n1 = md.nodes[m.i], n2 = md.nodes[m.j];
    const a = l.a.pct !== undefined ? l.a.pct * m.L : l.a.v;
    const x = v.X(n1.x + (n2.x - n1.x) * a / m.L), y = v.Y(n1.y + (n2.y - n1.y) * a / m.L);
    if (l.t === 'P') {
      let dx = 0, dy = 1;
      if (l.dir === 'horiz' || l.dir === 'hproy') { dx = 1; dy = 0; } else if (l.dir === 'perp') { dx = -m.s; dy = -m.c; } else if (l.dir === 'axial') { dx = m.c; dy = -m.s; }
      const sg = l.P >= 0 ? 1 : -1, len = 36;
      g += arrow(x - dx * len * sg, y - dy * len * sg, x - dx * 2 * sg, y - dy * 2 * sg, C.red, 'anR', 1.8);
      g += TH(x - dx * (len + 8) * sg + (dx ? 0 : 0), y - dy * (len + 6) * sg + 3, fx(l.P) + ' ' + lu, { fs: 9.5, c: C.red, b: 1 });
    } else {
      const ccw = l.C >= 0;
      g += `<path d="M${x + 11},${y} A11,11 0 1,${ccw ? 0 : 1} ${x - 11},${y}" fill="none" stroke="${C.red}" stroke-width="1.5" marker-end="url(#anR)"/>` + TH(x, y - 16, fx(Math.abs(l.C)) + ' ' + lu + '·m', { fs: 9.5, c: C.red, b: 1 });
    }
  }
  // nodales
  for (const l of c.loads.filter(q => q.t === 'N')) {
    const [x, y] = P(v, md.nodes[l.n]); const [Fx, Fy, Mz] = l.vals;
    if (Math.abs(Fx) > 1e-12) { const sg = Fx > 0 ? 1 : -1; g += arrow(x - sg * 40, y, x - sg * 4, y, C.red, 'anR', 1.8); const p = lb.place([[x - sg * 22, y - 6], [x - sg * 22, y + 14]], 40, 11); g += TH(p ? p[0] : x - sg * 22, p ? p[1] : y - 6, fx(Fx) + ' ' + lu, { fs: 9.5, c: C.red, b: 1, a: 'middle' }); }
    if (Math.abs(Fy) > 1e-12) { const sg = Fy > 0 ? -1 : 1; g += arrow(x, y - sg * 40, x, y - sg * 4, C.red, 'anR', 1.8); const p = lb.place([[x + 4, y - sg * 46 + 3], [x + 24, y - sg * 46 + 3], [x - 24, y - sg * 46 + 3]], 44, 11); g += TH(p ? p[0] : x, p ? p[1] : y - sg * 46, fx(Math.abs(Fy)) + ' ' + lu, { fs: 9.5, c: C.red, b: 1 }); }
    if (Math.abs(Mz) > 1e-12) { const ccw = Mz > 0; g += `<path d="M${x + 13},${y} A13,13 0 1,${ccw ? 0 : 1} ${x - 13},${y}" fill="none" stroke="${C.red}" stroke-width="1.5" marker-end="url(#anR)"/>` + TH(x + 18, y - 14, fx(Math.abs(Mz)) + ' ' + lu + '·m', { fs: 9.5, c: C.red, b: 1, a: 'start' }); }
  }
  for (const l of c.loads.filter(q => q.t === 'S')) {
    const [x, y] = P(v, md.nodes[l.n]);
    g += TH(x + 16, y + 26, 'Δ = (' + l.vals.slice(0, 2).map(q => fx(q * 1000, 1)).join('; ') + ') mm', { fs: 9, c: '#8250df', a: 'start', b: 1 });
  }
  g += T(10, 16, ttl, { fs: 11.5, b: 1, a: 'start' });
  return { svg: g, H: v.H };
}
// diagramas N, V o M sobre la geometría
function drawDiagram(md, sets, key, W, opts = {}) {
  const v = makeView(md.nodes, W, { pl: 64, pr: 64, pt: 76, pb: 56, maxH: 480 });
  let g = DEFS;
  const all = sets.flatMap(s => s.mf.flatMap(q => q[key]));
  const amax = Math.max(1e-12, ...all.map(Math.abs));
  const ord = Math.max(24, Math.min(46, 0.1 * v.span * v.sc));
  const k = ord / amax;
  const col = COL[key], fill = FILL[key];
  const lb = labeler(W);
  lb.add(W / 2, 14, W, 20);
  md.nodes.forEach(n => { const [x, y] = P(v, n); lb.add(x, y, 8, 8); });
  g += membersLine(md, v, '#c3ccd5', 1.4);
  md.nodes.forEach((n, i) => { g += supportGlyph(md, i, v, '#9aa5b1'); });
  const labels = [];
  sets.forEach((set, si) => {
    md.mems.forEach((m, mi) => {
      const vals = set.mf[mi][key];
      const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]);
      const ex = (b[0] - a[0]), ey = (b[1] - a[1]);
      // normal: M positivo hacia la cara −y local (lado en tracción); N, V positivos hacia +y local
      const ny = key === 'M' ? [m.s, m.c] : [-m.s, -m.c];
      const pts = m.st.map(([x], p) => { const t = x / m.L; return [a[0] + ex * t + ny[0] * vals[p] * k, a[1] + ey * t + ny[1] * vals[p] * k]; });
      const d = `M${a[0].toFixed(1)},${a[1].toFixed(1)} ` + pts.map(q => 'L' + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + ` L${b[0].toFixed(1)},${b[1].toFixed(1)} Z`;
      if (vals.some(x => Math.abs(x) > amax * 1e-4)) g += `<path d="${d}" fill="${fill}" stroke="${col}" stroke-width="1.3" stroke-linejoin="round"${si ? ' stroke-dasharray="4 2.5"' : ''}/>`;
      // valores rotulados: extremos de barra y extremo interior
      const idx = new Set([0, vals.length - 1]);
      let imax = 0, imin = 0; vals.forEach((x, p) => { if (x > vals[imax]) imax = p; if (x < vals[imin]) imin = p; });
      const endMax = Math.max(Math.abs(vals[0]), Math.abs(vals[vals.length - 1]));
      for (const p of [imax, imin]) if (p > 0 && p < vals.length - 1 && Math.abs(vals[p]) > 1.03 * Math.abs(vals[0] + (vals[vals.length - 1] - vals[0]) * m.st[p][0] / m.L) && Math.abs(vals[p]) > 0.05 * amax) idx.add(p);
      let nLab = 0;
      // N: un solo rótulo por barra (valor de mayor magnitud, al centro); V constante: al centro
      if (key === 'N') { let ib = 0; vals.forEach((x, p) => { if (Math.abs(x) > Math.abs(vals[ib])) ib = p; }); idx.clear(); idx.add(Math.floor(vals.length / 2)); nLab = vals[ib]; }
      if (key === 'V' && Math.abs(vals[0] - vals[vals.length - 1]) < 1e-6 * amax + 1e-9) { idx.clear(); idx.add(Math.floor(vals.length / 2)); }
      for (const p of idx) {
        const val = key === 'N' ? nLab : vals[p];
        // rótulos de extremo pequeños (< 6 % del máximo) se omiten si no son el valor gobernante de la barra
        if (Math.abs(val) < 0.004 * amax || ((p === 0 || p === vals.length - 1) && key !== 'N' && Math.abs(val) < 0.06 * amax && Math.abs(val) < 0.999 * endMax)) continue;
        const q = pts[p], sg = val >= 0 ? 1 : -1;
        labels.push({ x: q[0], y: q[1], nx: ny[0] * sg, ny: ny[1] * sg, val, end: p === 0 || p === vals.length - 1, mem: mi, tx: m.st[p][0] / m.L, ex, ey });
      }
    });
  });
  // primero los valores mayores
  labels.sort((p, q) => Math.abs(q.val) - Math.abs(p.val));
  const done = [];
  for (const L of labels) {
    const s = fx(L.val), w = s.length * 5.6 + 4, h = 11;
    // valor duplicado en el mismo lugar (nudo compartido)
    if (done.some(d => Math.abs(d.x - L.x) < 22 && Math.abs(d.y - L.y) < 22 && Math.abs(d.val - L.val) < 1e-6 * amax + 1e-9)) continue;
    const el = Math.hypot(L.ex, L.ey) || 1, ux = L.ex / el, uy = L.ey / el;
    const cands = [];
    for (const dd of [9, 17, 27]) for (const sh of [0, 14, -14, 26, -26]) {
      const sx = L.end ? (L.tx < 0.5 ? 1 : -1) * Math.abs(sh) : sh;
      cands.push([L.x + L.nx * (dd + w * 0.3 * Math.abs(L.nx)) + ux * sx, L.y + L.ny * dd + uy * sx + 3.5 + (L.ny > 0.5 ? 2 : 0)]);
    }
    const p = lb.place(cands, w, h);
    if (!p) continue;
    done.push(L);
    g += `<circle cx="${L.x.toFixed(1)}" cy="${L.y.toFixed(1)}" r="1.9" fill="${col}"/>` + TH(p[0], p[1], s, { fs: 9.5, c: col, b: 1 });
  }
  const title = { N: 'Fuerza axial N [' + md.U.lab + '] (+ tracción)', V: 'Fuerza cortante V [' + md.U.lab + ']', M: 'Momento flector M [' + md.U.lab + '·m] — dibujado del lado en tracción' }[key];
  g += T(10, 16, title + (opts.sub ? ' · ' + opts.sub : ''), { fs: 11.5, b: 1, a: 'start' });
  return svgWrap(W, v.H, g);
}
function drawTruss(md, sets, W, opts = {}) {
  const v = makeView(md.nodes, W, { pl: 60, pr: 60, pt: 48, pb: 50, maxH: 460 });
  let g = DEFS;
  const env = sets.length > 1;
  const nt = md.mems.map((m, mi) => Math.max(0, ...sets.map(s => Math.max(...s.mf[mi].N))));
  const nc = md.mems.map((m, mi) => Math.min(0, ...sets.map(s => Math.min(...s.mf[mi].N))));
  const amax = Math.max(1e-12, ...nt, ...nc.map(Math.abs));
  md.nodes.forEach((n, i) => { g += supportGlyph(md, i, v, '#7a8794'); });
  const lb = labeler(W);
  md.nodes.forEach(n => { const [x, y] = P(v, n); lb.add(x, y, 10, 10); });
  md.mems.forEach((m, mi) => {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]);
    const N = env ? (nt[mi] >= -nc[mi] ? nt[mi] : nc[mi]) : sets[0].mf[mi].N[0];
    const zero = Math.abs(N) < 1e-4 * amax;
    const col = zero ? '#9aa5b1' : N > 0 ? COL.T : COL.Cc;
    g += Lne(a[0], a[1], b[0], b[1], col, zero ? 1.4 : 1.6 + 3.4 * Math.abs(N) / amax);
  });
  md.nodes.forEach((n) => { const [x, y] = P(v, n); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`; });
  md.mems.forEach((m, mi) => {
    const a = P(v, md.nodes[m.i]), b = P(v, md.nodes[m.j]);
    let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const s = env ? (nt[mi] > 1e-9 && nc[mi] < -1e-9 ? '+' + fx(nt[mi]) + ' / ' + fx(nc[mi]) : fx(nt[mi] >= -nc[mi] ? nt[mi] : nc[mi])) : fx(sets[0].mf[mi].N[0]);
    const N = env ? (nt[mi] >= -nc[mi] ? nt[mi] : nc[mi]) : sets[0].mf[mi].N[0];
    const col = Math.abs(N) < 1e-4 * amax ? C.axis : N > 0 ? COL.T : COL.Cc;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, w = s.length * 5.6 + 6;
    const nx = -Math.sin(ang * Math.PI / 180), ny = Math.cos(ang * Math.PI / 180);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const cands = []; for (const sh of [0, 0.18, -0.18, 0.3, -0.3]) for (const d of [-8, 9]) cands.push([mx + ux * sh * L + nx * d, my + uy * sh * L + ny * d + 3]);
    const p = lb.place(cands.map(q => [q[0], q[1]]), Math.abs(Math.cos(ang * Math.PI / 180)) * w + 8 * Math.abs(Math.sin(ang * Math.PI / 180)), Math.abs(Math.sin(ang * Math.PI / 180)) * w + 11 * Math.abs(Math.cos(ang * Math.PI / 180)));
    if (p) g += TH(p[0], p[1], s, { fs: 9, c: col, b: 1, r: ang });
  });
  g += T(10, 16, 'Fuerzas axiales N [' + md.U.lab + ']' + (opts.sub ? ' · ' + opts.sub : ''), { fs: 11.5, b: 1, a: 'start' });
  return svgWrap(W, v.H, g) + `<div class="legend"><span><i style="background:${COL.T}"></i>Tracción (+)</span><span><i style="background:${COL.Cc}"></i>Compresión (−)</span><span><i style="background:#9aa5b1"></i>Barra sin fuerza</span></div>`;
}
function drawDeformed(md, set, W) {
  const v = makeView(md.nodes, W, { pl: 60, pr: 60, pt: 48, pb: 46, maxH: 460 });
  let g = DEFS + membersLine(md, v, '#b8c2cc', 1.2).replace(/\/>/g, ' stroke-dasharray="4 3"/>');
  md.nodes.forEach((n, i) => { g += supportGlyph(md, i, v, '#9aa5b1'); });
  let dmax = 0;
  md.nodes.forEach((n, i) => { dmax = Math.max(dmax, Math.hypot(set.u[3 * i], set.u[3 * i + 1])); });
  md.mems.forEach((m, mi) => { const q = set.mf[mi]; q.v.forEach((vv, p) => { dmax = Math.max(dmax, Math.hypot(q.ua[p], vv)); }); });
  if (dmax < 1e-15) return '';
  const target = 0.08 * v.span, raw = target / dmax;
  const pw = 10 ** Math.floor(Math.log10(raw)), amp = [1, 2, 5, 10].map(f => f * pw).filter(f => f <= raw).pop() || pw;
  md.mems.forEach((m, mi) => {
    const q = set.mf[mi], n1 = md.nodes[m.i];
    const d = m.st.map(([x], p) => { const gx = m.c * q.ua[p] - m.s * q.v[p], gy = m.s * q.ua[p] + m.c * q.v[p]; return [v.X(n1.x + m.c * x + amp * gx), v.Y(n1.y + m.s * x + amp * gy)]; });
    g += `<path d="${d.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${C.orange}" stroke-width="2" stroke-linejoin="round"/>`;
  });
  // rótulos de desplazamientos máximos
  const lb = labeler(W);
  let ix = -1, iy = -1;
  md.nodes.forEach((n, i) => { if (ix < 0 || Math.abs(set.u[3 * i]) > Math.abs(set.u[3 * ix])) ix = i; if (iy < 0 || Math.abs(set.u[3 * i + 1]) > Math.abs(set.u[3 * iy + 1])) iy = i; });
  const mark = (i, txt) => { const n = md.nodes[i], x = v.X(n.x + amp * set.u[3 * i]), y = v.Y(n.y + amp * set.u[3 * i + 1]); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${C.orange}"/>`; const w = txt.length * 5.5; const p = lb.place([[x + w / 2 + 8, y - 8], [x - w / 2 - 8, y - 8], [x + w / 2 + 8, y + 14], [x - w / 2 - 8, y + 14], [x, y - 16], [x, y + 20]], w, 11); if (p) g += TH(p[0], p[1], txt, { fs: 9.5, c: '#8a4b00', b: 1 }); };
  if (Math.abs(set.u[3 * ix]) > 1e-12) mark(ix, 'Δx = ' + fx(set.u[3 * ix] * 1000) + ' mm (nudo ' + md.nodes[ix].id + ')');
  if (Math.abs(set.u[3 * iy + 1]) > 1e-12 && iy !== ix) mark(iy, 'Δy = ' + fx(set.u[3 * iy + 1] * 1000) + ' mm (nudo ' + md.nodes[iy].id + ')');
  else if (Math.abs(set.u[3 * iy + 1]) > 1e-12) mark(iy, 'Δy = ' + fx(set.u[3 * iy + 1] * 1000) + ' mm');
  g += T(10, 16, 'Deformada · ' + set.name + ' · amplificación ×' + f2(amp, 0), { fs: 11.5, b: 1, a: 'start' });
  return svgWrap(W, v.H, g);
}

// formas modales (hasta 6 paneles, 3 por fila)
function drawModes(md, modal, W) {
  const ms = modal.modes.slice(0, 6), cols = Math.min(3, ms.length), pw = W / cols;
  let g = '', H = 0;
  for (let r = 0; r < Math.ceil(ms.length / cols); r++) {
    let rh = 0; const row = [];
    ms.slice(r * cols, r * cols + cols).forEach((q, k) => {
      const v = makeView(md.nodes, pw, { pl: 26, pr: 26, pt: 40, pb: 22, maxH: 300, minH: 120 });
      const amp = 0.12 * v.span;
      let p = membersLine(md, v, '#c3ccd5', 1.1).replace(/\/>/g, ' stroke-dasharray="3 3"/>');
      md.nodes.forEach((n, i) => { p += supportGlyph(md, i, v, '#9aa5b1'); });
      for (const m of md.mems) {
        const n1 = md.nodes[m.i], u = q.u, d = [];
        const ul = mulMV(m.T, m.dofs.map(dd => u[dd])), herm = !m.rel[0] && !m.rel[1] && !md.truss;
        for (let t = 0; t <= 16; t++) {
          const x = m.L * t / 16, Nh = shapeV(x, m.L);
          const vl = herm ? Nh[0] * ul[1] + Nh[1] * ul[2] + Nh[2] * ul[4] + Nh[3] * ul[5] : ul[1] + (ul[4] - ul[1]) * t / 16, al = ul[0] + (ul[3] - ul[0]) * t / 16;
          d.push([v.X(n1.x + m.c * x + amp * (m.c * al - m.s * vl)), v.Y(n1.y + m.s * x + amp * (m.s * al + m.c * vl))]);
        }
        p += `<path d="${d.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ')}" fill="none" stroke="${C.orange}" stroke-width="1.8" stroke-linejoin="round"/>`;
      }
      p += T(10, 16, 'Modo ' + (r * cols + k + 1), { fs: 11, b: 1, a: 'start' }) + T(10, 30, 'T = ' + f2(q.T, 3) + ' s' + (modal.Mtot[0] > 0 ? ' · Mx ' + f2(100 * q.mef[0], 1) + ' %' : '') + (modal.Mtot[1] > 0 ? ' · My ' + f2(100 * q.mef[1], 1) + ' %' : ''), { fs: 9.5, c: '#5b6b7b', a: 'start' });
      row.push([k, p]); rh = Math.max(rh, v.H);
    });
    row.forEach(([k, p]) => { g += `<g transform="translate(${k * pw} ${H})">${p}</g>`; if (k) g += Lne(k * pw, H + 6, k * pw, H + rh - 6, C.grid, 1); });
    H += rh; if (r < Math.ceil(ms.length / cols) - 1) g += Lne(10, H, W - 10, H, C.grid, 1);
  }
  return svgWrap(W, H, DEFS + g);
}

// ---------------------------------------------------------------------
//  BLOQUE frame2d
// ---------------------------------------------------------------------
const HINT_FRAME = `<b>Unidades por defecto:</b> m, t (o kN), t/m, t·m; se aceptan variables y unidades del cálculo (<code>Ec</code>, <code>30 cm</code>, <code>2 tonf/m</code>). Escriba expresiones sin espacios o entre paréntesis: <code>(L1+L2)/2</code>.<br>
<b>Nudos:</b> <code>id x y</code>. <b>Secciones:</b> <code>id E A I</code> · <code>id rect b h E</code> · <code>id circ D E</code>; opciones <code>w=</code> peso por metro, <code>As=</code> área de corte, <code>G=</code>, <code>h=</code> peralte (para zonas rígidas automáticas).<br>
<b>Barras:</b> <code>id ni nj [sección] [ri|rj|rij] [zi=0.3 zj=0.25]</code> — rótula en el extremo i, j o ambos; <code>zi/zj</code> longitud del brazo rígido medida desde el nudo (la rótula queda en la cara).<br>
<b>Apoyos:</b> <code>nudo(s) tipo</code> — <code>E</code> empotrado · <code>A</code> articulado · <code>Ry</code> rodillo (restringe y) · <code>Rx</code> · <code>G</code> guiado · <code>101</code> (ux uy θ) · <code>RI 30</code> rodillo sobre superficie inclinada 30° · <code>K kx ky [kθ]</code> resortes. Listas <code>1,4,7</code> o <code>1-5</code>.<br>
<b>Cargas</b> (prefijo de caso <code>CM:</code>, <code>CV:</code>, <code>CS:</code>…): <code>N nudo Fx Fy [M]</code> nodal global (Fy + arriba, M + antihorario) · <code>U barras w [a b] [dir]</code> uniforme · <code>T barras w1 w2 [a b] [dir]</code> trapezoidal · <code>P barras P [a] [dir]</code> puntual · <code>M barras M [a]</code> momento (+ antihorario) · <code>D nudo dx dy [θ]</code> asentamiento. Barras: <code>3</code>, <code>1,2</code>, <code>1-4</code>, <code>*</code>; a, b desde el nudo i en m o <code>%</code>. <b>dir:</b> <code>grav</code> (defecto, + hacia abajo, por metro de barra) · <code>proy</code> (por metro de proyección horizontal) · <code>horiz</code> (+x por metro de barra) · <code>hproy</code> (+x por metro de proyección vertical) · <code>perp</code> (eje local y) · <code>axial</code>.<br>
<b>Combinaciones:</b> <code>U1 = 1.4 CM + 1.7 CV</code>, <code>U2 = 1.25(CM + CV) ± CS</code> (cada ± genera variantes a, b, c, d…). <b>P-Δ:</b> las combinaciones se resuelven en 2.º orden con la matriz geométrica (iterativo); exporta <code>ampPD</code>. <b>Cortante:</b> ν (p. ej. <code>0.2</code>) activa vigas de Timoshenko (G = E/2(1+ν)). <b>Zonas rígidas:</b> factor 0–1 × medio peralte de las barras que llegan al nudo.<br>
<b>Masas (modal):</b> <code>nudos peso [x|y]</code> (m = W/g) o <code>= CM + 0.25 CV [x]</code> (masa de las cargas verticales). Exporta <code>T1 T2…</code>, <code>MPx1 MPy1…</code> (fracción de masa efectiva), <code>SMPx SMPy</code>.<br>
<b>Exporta</b> <code>Mmax_k Mpos_k Mneg_k Vmax_k Nmax_k Nt_k Nc_k L_k</code> por barra, <code>Mmax Vmax Nmax deltamax</code>, <code>deltax_n deltay_n theta_n</code>, reacciones <code>R1x R1y R1m</code> (y <code>R1y_U1</code> por caso/combinación), grupos <code>Mmax_G Nc_G Lmax_G Lc_G NcL_G</code>, <code>delta_k</code>, <code>deriva_i derivamax</code>.`;

registerBlock('frame2d', {
  name: 'Pórtico / armadura 2D (rigidez)', icon: 'grid', group: 'Análisis',
  fields: [
    F('tipo', 'Tipo de estructura', '', 'select', [['portico', 'Pórtico plano (nudos rígidos)'], ['armadura', 'Armadura (barras articuladas, solo axial)']]),
    F('unidades', 'Unidades de fuerza', '', 'select', [['t', 'tonf, m'], ['kN', 'kN, m']]),
    F('nudos', 'Nudos: id x y', '1 0 0\n2 0 3\n3 6 3\n4 6 0', 'area'),
    F('secciones', 'Secciones: id E A I  |  id rect b h E', 'C rect 0.40 0.40 2.17e6\nV rect 0.30 0.60 2.17e6', 'area'),
    F('barras', 'Barras: id ni nj [sección] [ri|rj|rij]', '1 1 2 C\n2 2 3 V\n3 4 3 C', 'area'),
    F('apoyos', 'Apoyos: nudo tipo (E, A, Ry, Rx, G, K kx ky kθ)', '1 E\n4 E', 'area'),
    F('cargas', 'Cargas por caso (CM:, CV:, CS:…)', 'CM: U 2 2.5\nCV: U 2 1.0\nCS: N 2 3 0', 'area'),
    F('combinaciones', 'Combinaciones (vacío = suma de casos)', 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CS\nU3 = 0.9 CM ± CS', 'area'),
    F('casos', 'Descripción de casos (opcional): CM Carga muerta', 'CM Carga muerta\nCV Carga viva\nCS Sismo', 'area'),
    F('pp', 'Peso propio: caso γ (vacío = no)', 'CM 2.4 tonf/m^3'),
    F('grupos', 'Grupos de barras: nombre lista', 'VIG 2\nCOL 1,3', 'area'),
    F('ver', 'Diagramas para (caso/combinación; vacío = envolvente)', ''),
    F('servicio', 'Deformada y desplazamientos para (vacío = suma de casos)', ''),
    F('graficos', 'Gráficos (M V N D C = momento, cortante, axial, deformada, cargas)', 'C M V N D'),
    F('deflim', 'Deflexión límite de vigas L/… (vacío = no verificar)', '360'),
    F('deflbarras', 'Barras para la deflexión (vacío = horizontales)', ''),
    F('deriva_caso', 'Caso/combinación para derivas (vacío = no verificar)', 'CS'),
    F('deriva_f', 'Factor de amplificación de desplazamientos (p. ej. 0.75 R)', '0.75*8'),
    F('deriva_lim', 'Deriva límite Δ/h', '0.007'),
    F('pdelta', 'Efecto P-Δ en las combinaciones (análisis de 2.º orden)', '', 'check'),
    F('cortante', 'Deformación por cortante: ν (vacío = no; p. ej. 0.2)', ''),
    F('brazos', 'Zonas rígidas en nudos: factor 0–1 (vacío = no)', ''),
    F('masas', 'Masas (modal): nudos peso [x|y]  ·  = CM + 0.25 CV', '', 'area'),
    F('modos', 'N.º de modos a reportar', '3'),
    F('sufijo', 'Sufijo de variables exportadas (opcional)', ''),
    F('titulo', 'Título', ''),
  ],
  hint: HINT_FRAME,
  def: {
    tipo: 'portico', nudos: '1 0 0\n2 0 3.5\n3 6 3.5\n4 6 0', secciones: 'C rect 0.40 0.40 2.17e6\nV rect 0.30 0.60 2.17e6', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 E',
    cargas: 'CM: U 2 2.5\nCV: U 2 1.0\nCS: N 2 4 0', combinaciones: 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CS\nU3 = 0.9 CM ± CS', graficos: 'C M V N D',
  },
  render: renderFrame,
});

export function analyzeFrame(b, S) {
  const md = parseFrame(b, S);
  const sol = solveFrame(md);
  // conjuntos de resultados: casos (1.er orden) + combinaciones (1.er orden o P-Δ)
  const sets = new Map();
  sol.res.forEach(r => sets.set(r.name, { name: r.name, u: r.u, R: r.R, mf: r.mf, eq: r.eq, kind: 'caso' }));
  const mk = (f, name, txt) => {
    let r;
    if (md.pdelta) { r = solveFrame(md, 40, { cases: [comboCase(md, f, name)], pdelta: true }).res[0]; }
    else { r = combine(sol, f, name, md); r.eq = [0, 1, 2].map(d => sol.res.reduce((t, q) => t + (f[q.name] || 0) * q.eq[d], 0)); }
    r.kind = 'comb'; r.txt = txt; return r;
  };
  let combos = md.combos;
  if (!combos.length) combos = [{ name: md.cases.length > 1 ? 'TOTAL' : md.cases[0].name + '_', f: Object.fromEntries(md.cases.map(c => [c.name, 1])), txt: md.cases.map(c => c.name).join(' + '), auto: true }];
  for (const c of combos) { if (sets.has(c.name)) throw new Error('La combinación «' + c.name + '» tiene el mismo nombre que un caso'); sets.set(c.name, mk(c.f, c.name, c.txt)); }
  // análisis modal
  let modal = null;
  const ml = cleanLines(b.masas);
  if (ml.length) {
    const g0 = 9.80665, mass = md.nodes.map(() => null);
    const addM = (n, W, dir, where) => { if (!(W >= 0)) throw new Error(where + ': el peso debe ser ≥ 0'); const q = mass[n] || (mass[n] = [0, 0]); if (dir.includes('x')) q[0] += W / g0; if (dir.includes('y')) q[1] += W / g0; };
    for (const l of ml) {
      const where = 'Masas, línea ' + l.n + ' «' + l.s + '»';
      let str = l.s, dir = 'xy';
      const dm = /\s+(x|y|xy|yx)$/i.exec(str); if (dm) { dir = dm[1].toLowerCase(); str = str.slice(0, dm.index); }
      if (/^=/.test(str)) {
        // masas a partir de las cargas verticales (fuente de masa: p. ej. CM + 0.25 CV)
        const cb = parseCombos('X = ' + str.slice(1), md.cases.map(c => c.name), S)[0];
        const Wn = md.nodes.map(() => 0);
        md.cases.forEach((c, ci) => {
          const k = cb.f[c.name] || 0; if (!k) return;
          for (const ld of c.loads) {
            if (ld.t === 'N') { Wn[ld.n] -= k * ld.vals[1]; continue; }
            if (ld.m === undefined) continue;
            const m = md.mems[ld.m], e = equivLoads(m.L, [localLoads(m, ld)]), gl = mulTtV(m.T, e);
            Wn[m.i] -= k * gl[1]; Wn[m.j] -= k * gl[4];
          }
        });
        Wn.forEach((W, n) => { if (W > 1e-9) addM(n, W, dir, where); });
        continue;
      }
      const tk = tokenize(str); if (tk.length < 2) throw new Error(where + ': use «nudos peso [x|y]» o «= CM + 0.25 CV»');
      const tg = parseTargets(tk[0], md.nids, where); const W = evNum(mergeU(tk.slice(1), S).join(' '), S, md.U.F, where);
      for (const n of tg) addM(n, W, dir, where);
    }
    const nmod = Math.max(1, Math.min(12, Math.round(evalParam(b.modos, S, '', 3))));
    modal = modalFrame(md, mass, nmod); modal.mass = mass;
  }
  return { md, sol, sets, combos, mk, modal };
}

function renderFrame(b, ctx) {
  const S = ctx.scope;
  const { md, sol, sets, combos, mk, modal } = analyzeFrame(b, S);
  const sfx = b.sufijo ? '_' + safeId(b.sufijo) : '';
  const lu = md.U.lab, FU = md.U.F;
  const pick = (name, what) => {
    const k = String(name || '').trim(); if (!k) return null;
    if (sets.has(k)) return sets.get(k);
    if (/[+\-*()]/.test(k)) { const cb = parseCombos('X = ' + k, md.cases.map(c => c.name), S)[0]; return mk(cb.f, cb.txt, cb.txt); }
    throw new Error(what + ': no existe el caso o combinación «' + k + '» (disponibles: ' + [...sets.keys()].join(', ') + '; también se acepta una expresión como «CM + CV»)');
  };
  const verSet = pick(b.ver, 'Diagramas');
  const combSets = combos.map(c => sets.get(c.name));
  const envSets = verSet ? [verSet] : combSets;
  const serv = pick(b.servicio, 'Deformada') || (md.cases.length > 1 ? mk(Object.fromEntries(md.cases.map(c => [c.name, 1])), 'Servicio (Σ casos)', '') : sets.get(md.cases[0].name));
  // envolvente por estación
  const envOf = (mi, key) => { const st = md.mems[mi].st; const mx = st.map((_, p) => Math.max(...envSets.map(s => s.mf[mi][key][p]))); const mn = st.map((_, p) => Math.min(...envSets.map(s => s.mf[mi][key][p]))); return { mx, mn }; };
  // con zonas rígidas, los esfuerzos de diseño se toman en las caras (tramo flexible)
  const memRes = md.mems.map((m, mi) => {
    const M = envOf(mi, 'M'), V = envOf(mi, 'V'), N = envOf(mi, 'N');
    const ks = m.st.map((s, p) => p).filter(p => m.st[p][0] >= (m.zi || 0) - 1e-9 && m.st[p][0] <= m.L - (m.zj || 0) + 1e-9);
    const sel = (a) => ks.map(p => a[p]), k0 = ks[0], k1 = ks[ks.length - 1];
    // extremos interiores exactos: donde V cambia de signo, M es parabólico entre estaciones (M* = Ma − Va²·h / (2(Vb − Va)))
    let pk = [-Infinity, Infinity];
    for (const set of md.pdelta ? [] : envSets) {
      const q = set.mf[mi];
      for (let t = 1; t < ks.length; t++) {
        const pa = ks[t - 1], pb = ks[t], h = m.st[pb][0] - m.st[pa][0], Va = q.V[pa], Vb = q.V[pb];
        if (!(h > 1e-9) || !(Va * Vb < 0)) continue;
        const Ms = q.M[pa] - Va * Va * h / (2 * (Vb - Va));
        if (Number.isFinite(Ms)) { pk[0] = Math.max(pk[0], Ms); pk[1] = Math.min(pk[1], Ms); }
      }
    }
    const Mpos = Math.max(0, pk[0], ...sel(M.mx)), Mneg = Math.min(0, pk[1], ...sel(M.mn)), Vmax = Math.max(...sel(V.mx).map(Math.abs), ...sel(V.mn).map(Math.abs));
    const Nt = Math.max(0, ...N.mx), Nc = -Math.min(0, ...N.mn);
    return { Mpos, Mneg, Mmax: Math.max(Mpos, -Mneg), Vmax, Nt, Nc, Nmax: Math.max(Nt, Nc), M, V, N, Mi: [M.mn[k0], M.mx[k0]], Mj: [M.mn[k1], M.mx[k1]] };
  });
  const uM = FU + '*m';
  memRes.forEach((r, mi) => {
    const id = safeId(md.mems[mi].id);
    setVar(ctx, 'Mmax_' + id + sfx, math.unit(r.Mmax, uM)); setVar(ctx, 'Mpos_' + id + sfx, math.unit(r.Mpos, uM)); setVar(ctx, 'Mneg_' + id + sfx, math.unit(r.Mneg, uM));
    setVar(ctx, 'Vmax_' + id + sfx, math.unit(r.Vmax, FU)); setVar(ctx, 'Nmax_' + id + sfx, math.unit(r.Nmax, FU)); setVar(ctx, 'Nt_' + id + sfx, math.unit(r.Nt, FU)); setVar(ctx, 'Nc_' + id + sfx, math.unit(r.Nc, FU));
    setVar(ctx, 'L_' + id + sfx, math.unit(md.mems[mi].L, 'm'));
  });
  const gmax = (k) => Math.max(0, ...memRes.map(r => r[k]));
  setVar(ctx, 'Mmax' + sfx, math.unit(gmax('Mmax'), uM)); setVar(ctx, 'Vmax' + sfx, math.unit(gmax('Vmax'), FU)); setVar(ctx, 'Nmax' + sfx, math.unit(gmax('Nmax'), FU));
  setVar(ctx, 'Nt' + sfx, math.unit(gmax('Nt'), FU)); setVar(ctx, 'Nc' + sfx, math.unit(gmax('Nc'), FU));
  // grupos
  const groups = [];
  for (const l of cleanLines(b.grupos)) {
    const tk = tokenize(l.s); if (tk.length < 2) throw new Error('Grupos, línea ' + l.n + ': use «nombre lista_de_barras»');
    const ids = parseTargets(tk.slice(1).join(''), md.mids, 'Grupos, línea ' + l.n);
    const gr = { name: safeId(tk[0]), ids };
    for (const k of ['Mmax', 'Mpos', 'Vmax', 'Nmax', 'Nt', 'Nc']) gr[k] = Math.max(...ids.map(i => memRes[i][k]));
    gr.Mneg = Math.min(...ids.map(i => memRes[i].Mneg)); gr.Lmax = Math.max(...ids.map(i => md.mems[i].L));
    // barra que gobierna la compresión (para pandeo): la de mayor Nc·L²
    const ic = ids.reduce((p, i) => (memRes[i].Nc * md.mems[i].L ** 2 > memRes[p].Nc * md.mems[p].L ** 2 ? i : p), ids[0]);
    gr.NcL = memRes[ic].Nc; gr.Lc = md.mems[ic].L;
    groups.push(gr);
    const n = gr.name + sfx;
    setVar(ctx, 'Mmax_' + n, math.unit(gr.Mmax, uM)); setVar(ctx, 'Mpos_' + n, math.unit(gr.Mpos, uM)); setVar(ctx, 'Mneg_' + n, math.unit(gr.Mneg, uM));
    setVar(ctx, 'Vmax_' + n, math.unit(gr.Vmax, FU)); setVar(ctx, 'Nmax_' + n, math.unit(gr.Nmax, FU)); setVar(ctx, 'Nt_' + n, math.unit(gr.Nt, FU)); setVar(ctx, 'Nc_' + n, math.unit(gr.Nc, FU));
    setVar(ctx, 'Lmax_' + n, math.unit(gr.Lmax, 'm')); setVar(ctx, 'Lc_' + n, math.unit(gr.Lc, 'm')); setVar(ctx, 'NcL_' + n, math.unit(gr.NcL, FU));
  }
  // desplazamientos (servicio) y reacciones
  let dmax = 0;
  md.nodes.forEach((n, i) => {
    const id = safeId(n.id);
    setVar(ctx, 'deltax_' + id + sfx, math.unit(serv.u[3 * i] * 1000, 'mm')); setVar(ctx, 'deltay_' + id + sfx, math.unit(serv.u[3 * i + 1] * 1000, 'mm')); setVar(ctx, 'theta_' + id + sfx, serv.u[3 * i + 2]);
    dmax = Math.max(dmax, Math.hypot(serv.u[3 * i], serv.u[3 * i + 1]));
  });
  setVar(ctx, 'deltamax' + sfx, math.unit(dmax * 1000, 'mm'));
  const supN = md.nodes.map((n, i) => i).filter(i => md.sup[i].any);
  supN.forEach(i => {
    const id = safeId(md.nodes[i].id);
    const env = (d) => { if (verSet) return verSet.R[3 * i + d]; let best = 0; for (const s of combSets) if (Math.abs(s.R[3 * i + d]) > Math.abs(best)) best = s.R[3 * i + d]; return best; };
    setVar(ctx, 'R' + id + 'x' + sfx, math.unit(env(0), FU)); setVar(ctx, 'R' + id + 'y' + sfx, math.unit(env(1), FU)); setVar(ctx, 'R' + id + 'm' + sfx, math.unit(env(2), uM));
    for (const s of [...sets.values()]) {
      const sn = safeId(s.name);
      setVar(ctx, 'R' + id + 'x_' + sn + sfx, math.unit(s.R[3 * i], FU)); setVar(ctx, 'R' + id + 'y_' + sn + sfx, math.unit(s.R[3 * i + 1], FU)); setVar(ctx, 'R' + id + 'm_' + sn + sfx, math.unit(s.R[3 * i + 2], uM));
    }
  });
  // ---------- verificaciones ----------
  const checks = [];
  const W = 720;
  let html = '';
  const dlim = evalParam(b.deflim, S, '', 0);
  let deflInfo = null;
  if (dlim > 0 && !md.truss) {
    const list = String(b.deflbarras || '').trim() ? parseTargets(String(b.deflbarras).replace(/\s+/g, ''), md.mids, 'Barras para la deflexión') : md.mems.map((m, i) => i).filter(i => Math.abs(md.mems[i].s) < 0.2);
    let worst = null;
    for (const mi of list) {
      const m = md.mems[mi], q = serv.mf[mi];
      let d = 0; m.st.forEach(([x], p) => { const rel = q.v[p] - (q.v[0] + (q.v[q.v.length - 1] - q.v[0]) * x / m.L); if (Math.abs(rel) > Math.abs(d)) d = rel; });
      const lim = m.L / dlim, r = Math.abs(d) / lim;
      setVar(ctx, 'delta_' + safeId(m.id) + sfx, math.unit(Math.abs(d) * 1000, 'mm'));
      if (!worst || r > worst.r) worst = { mi, d, lim, r };
    }
    if (worst) {
      const m = md.mems[worst.mi];
      deflInfo = worst;
      checks.push({ ok: worst.r <= 1, label: `Deflexión relativa de la barra ${m.id} (${serv.name}): δ = ${fx(Math.abs(worst.d) * 1000)} mm ≤ L/${f2(dlim, 0)} = ${fx(worst.lim * 1000)} mm`, ratio: worst.r });
    }
  }
  const dcase = pick(b.deriva_caso, 'Derivas');
  let driftTb = '';
  if (dcase) {
    const fD = evalParam(b.deriva_f, S, '', 1), lim = evalParam(b.deriva_lim, S, '', 0.007);
    const cols = md.mems.map((m, i) => i).filter(i => Math.abs(md.mems[i].c) < 0.1);
    if (!cols.length) throw new Error('Derivas: no hay barras verticales (columnas)');
    const lv = new Map();
    for (const mi of cols) {
      const m = md.mems[mi], n1 = md.nodes[m.i], n2 = md.nodes[m.j];
      const lo = n1.y < n2.y ? m.i : m.j, hi = lo === m.i ? m.j : m.i;
      const h = Math.abs(n2.y - n1.y), dd = Math.abs(dcase.u[3 * hi] - dcase.u[3 * lo]);
      const key = f2(Math.min(n1.y, n2.y), 3) + '|' + f2(Math.max(n1.y, n2.y), 3);
      const cur = lv.get(key); const dr = dd * fD / h;
      if (!cur || dr > cur.dr) lv.set(key, { y1: Math.min(n1.y, n2.y), y2: Math.max(n1.y, n2.y), h, dd, dr, mem: m.id });
    }
    const rows = [...lv.values()].sort((p, q) => p.y1 - q.y1);
    let k = 0; driftTb = '<table class="tbl"><thead><tr><th>Entrepiso</th><th>Niveles y [m]</th><th>h [m]</th><th>Columna</th><th>Δ elástico [mm]</th><th>Δ × ' + f2(fD, 3) + ' [mm]</th><th>Δ/h</th><th>Límite</th><th>Estado</th></tr></thead><tbody>';
    let worst = null;
    for (const r of rows) {
      k++; const ok = r.dr <= lim;
      driftTb += `<tr><td>${k}</td><td>${fx(r.y1)} – ${fx(r.y2)}</td><td>${fx(r.h)}</td><td>${esc(r.mem)}</td><td>${fx(r.dd * 1000)}</td><td>${fx(r.dd * fD * 1000)}</td><td>${f2(r.dr, 4)}</td><td>${f2(lim, 4)}</td><td>${ok ? '<span class="ok">✔</span>' : '<span class="bad">✘</span>'}</td></tr>`;
      setVar(ctx, 'deriva_' + k + sfx, r.dr);
      if (!worst || r.dr > worst.dr) worst = { ...r, k };
    }
    driftTb += '</tbody></table>';
    setVar(ctx, 'derivamax' + sfx, worst.dr);
    checks.push({ ok: worst.dr <= lim, label: `Deriva máxima de entrepiso (${dcase.name}, entrepiso ${worst.k}): Δ/h = ${f2(worst.dr, 4)} ≤ ${f2(lim, 4)}`, ratio: worst.dr / lim });
  }
  for (const c of checks) ctx.checks.push({ ...c, block: ctx.blockId });

  // ---------- figuras ----------
  const gsel = String(b.graficos || 'C M V N D').toUpperCase();
  const want = (ch) => gsel.includes(ch);
  const ttl = b.titulo || (md.truss ? 'Modelo de la armadura plana' : 'Modelo del pórtico plano');
  html += `<div class="figure">${drawModel(md, W)}${caption(ctx, ttl + ' — geometría [m], numeración de nudos (rojo) y barras, apoyos y liberaciones')}</div>`;
  // tabla de secciones
  html += '<table class="tbl"><thead><tr><th>Sección</th><th>Descripción</th><th>E [' + lu + '/m²]</th><th>A [m²]</th><th>I [m⁴]</th><th>Barras</th></tr></thead><tbody>' +
    md.secs.map((s, i) => `<tr><td>${esc(s.id)}</td><td>${esc(s.desc || '—')}</td><td>${f2(s.E, 0)}</td><td>${f2(s.A, 4)}</td><td>${s.I > 0 ? f2(s.I, 6) : '—'}</td><td>${esc(md.mems.filter(m => m.sec === i).map(m => m.id).join(', ') || '—')}</td></tr>`).join('') + '</tbody></table>';
  if (want('C')) {
    const nC = md.cases.length, cols = nC > 1 ? 2 : 1, pw = W / cols;
    const panels = md.cases.map((c, ci) => drawLoads(md, ci, pw, nC > 1 ? 300 : 380));
    let g = '', H = 0;
    for (let r = 0; r < Math.ceil(nC / cols); r++) {
      const row = panels.slice(r * cols, r * cols + cols); const rh = Math.max(...row.map(p => p.H));
      row.forEach((p, k) => { g += `<g transform="translate(${k * pw} ${H})">${p.svg}</g>`; });
      if (cols > 1 && row.length > 1) g += Lne(pw, H + 6, pw, H + rh - 6, C.grid, 1);
      H += rh;
      if (r < Math.ceil(nC / cols) - 1) g += Lne(10, H, W - 10, H, C.grid, 1);
    }
    html += `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, 'Estados de carga [' + lu + ', ' + lu + '/m, ' + lu + '·m]')}</div>`;
  }
  // tabla de combinaciones
  html += '<table class="tbl"><thead><tr><th>Combinación</th><th>Expresión</th></tr></thead><tbody>' + combos.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.txt)}${c.auto ? ' (sin combinaciones definidas)' : ''}</td></tr>`).join('') + '</tbody></table>';
  const sub = verSet ? verSet.name + (verSet.txt ? ' = ' + verSet.txt : '') : (envSets.length > 1 ? 'Envolvente de ' + envSets.length + ' combinaciones (máx. continuo, mín. trazos)' : envSets[0].name);
  const envDraw = (key) => {
    if (verSet || envSets.length === 1) return [envSets[0]];
    const mx = { name: 'máx', mf: md.mems.map((m, mi) => ({ [key]: memRes[mi][key].mx })) }, mn = { name: 'mín', mf: md.mems.map((m, mi) => ({ [key]: memRes[mi][key].mn })) };
    return [mx, mn];
  };
  if (md.truss) {
    if (want('N') || want('M')) html += `<div class="figure">${drawTruss(md, envSets, W, { sub: sub.replace(' (máx. continuo, mín. trazos)', '') })}${caption(ctx, 'Fuerzas axiales en las barras de la armadura' + (envSets.length > 1 ? ' (envolvente: tracción máx. / compresión máx.)' : ''))}</div>`;
  } else {
    if (want('M')) html += `<div class="figure">${drawDiagram(md, envDraw('M'), 'M', W, { sub })}${caption(ctx, 'Diagrama de momento flector')}</div>`;
    if (want('V')) html += `<div class="figure">${drawDiagram(md, envDraw('V'), 'V', W, { sub })}${caption(ctx, 'Diagrama de fuerza cortante')}</div>`;
    if (want('N')) html += `<div class="figure">${drawDiagram(md, envDraw('N'), 'N', W, { sub })}${caption(ctx, 'Diagrama de fuerza axial')}</div>`;
  }
  if (want('D')) { const d = drawDeformed(md, serv, W); if (d) html += `<div class="figure">${d}${caption(ctx, 'Deformada amplificada (' + serv.name + ')')}</div>`; }

  // ---------- tablas ----------
  html += `<div class="dt">Desplazamientos nodales — ${esc(serv.name)}</div><table class="tbl"><thead><tr><th>Nudo</th><th>x [m]</th><th>y [m]</th><th>ux [mm]</th><th>uy [mm]</th><th>θz [rad]</th></tr></thead><tbody>` +
    md.nodes.map((n, i) => `<tr><td>${esc(n.id)}</td><td>${fx(n.x)}</td><td>${fx(n.y)}</td><td>${fx(serv.u[3 * i] * 1000, 3)}</td><td>${fx(serv.u[3 * i + 1] * 1000, 3)}</td><td>${sol.auto.includes(3 * i + 2) ? '—' : fx(serv.u[3 * i + 2], 6)}</td></tr>`).join('') + '</tbody></table>';
  // reacciones
  const rset = [...md.cases.map(c => sets.get(c.name)), ...combSets];
  html += `<div class="dt">Reacciones en los apoyos [${lu}, ${lu}·m]</div><table class="tbl"><thead><tr><th>Nudo</th>${rset.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>`;
  for (const i of supN) {
    for (let d = 0; d < 3; d++) {
      if (!md.sup[i].r[d] && !md.sup[i].k[d] && !(md.sup[i].ang !== null && d < 2)) continue;
      html += `<tr><td>${esc(md.nodes[i].id)} · ${['Rx', 'Ry', 'Mz'][d]}</td>${rset.map(s => `<td>${fx(s.R[3 * i + d])}</td>`).join('')}</tr>`;
    }
  }
  // equilibrio
  html += `<tr class="tot"><td>Σ cargas + Σ reacciones (Fx; Fy; Mz,O)</td>${rset.map(s => `<td>${fx(s.eq[0], 3)}; ${fx(s.eq[1], 3)}; ${Number.isFinite(s.eq[2]) ? fx(s.eq[2], 3) : '—'}</td>`).join('')}</tr>`;
  html += '</tbody></table>';
  // esfuerzos por barra
  const envName = verSet ? verSet.name : (envSets.length > 1 ? 'envolvente' : envSets[0].name);
  if (md.truss) {
    html += `<div class="dt">Fuerzas axiales por barra (${esc(envName)}) [${lu}]</div><table class="tbl"><thead><tr><th>Barra</th><th>Nudos</th><th>L [m]</th><th>Sección</th>${envSets.length === 1 ? '<th>N</th><th>Estado</th>' : '<th>N tracción máx.</th><th>N compresión máx.</th>'}</tr></thead><tbody>` +
      md.mems.map((m, mi) => { const r = memRes[mi]; const N = envSets[0].mf[mi].N[0]; return `<tr><td>${esc(m.id)}</td><td>${esc(md.nodes[m.i].id)}–${esc(md.nodes[m.j].id)}</td><td>${fx(m.L, 3)}</td><td>${esc(md.secs[m.sec].id)}</td>${envSets.length === 1 ? `<td>${fx(N)}</td><td>${Math.abs(N) < 1e-6 ? 'sin fuerza' : N > 0 ? '<span style="color:' + COL.T + '">Tracción</span>' : '<span style="color:' + COL.Cc + '">Compresión</span>'}</td>` : `<td>${fx(r.Nt)}</td><td>${fx(-r.Nc)}</td>`}</tr>`; }).join('') + '</tbody></table>';
  } else {
    html += `<div class="dt">Esfuerzos de diseño por barra (${esc(envName)}) [${lu}, ${lu}·m]</div><table class="tbl"><thead><tr><th>Barra</th><th>Nudos</th><th>L [m]</th><th>Secc.</th><th>Mi (−/+)${md.mems.some(m => m.zi > 0 || m.zj > 0) ? ' cara' : ''}</th><th>Mj (−/+)${md.mems.some(m => m.zi > 0 || m.zj > 0) ? ' cara' : ''}</th><th>M+ máx</th><th>M− máx</th><th>|V| máx</th><th>N tracc.</th><th>N compr.</th></tr></thead><tbody>` +
      md.mems.map((m, mi) => { const r = memRes[mi]; const pm = (a) => (Math.abs(a[0] - a[1]) < 1e-9 ? fx(a[0]) : fx(a[0]) + ' / ' + fx(a[1])); return `<tr><td>${esc(m.id)}</td><td>${esc(md.nodes[m.i].id)}–${esc(md.nodes[m.j].id)}</td><td>${fx(m.L, 3)}</td><td>${esc(md.secs[m.sec].id)}</td><td>${pm(r.Mi)}</td><td>${pm(r.Mj)}</td><td>${fx(r.Mpos)}</td><td>${fx(r.Mneg)}</td><td>${fx(r.Vmax)}</td><td>${fx(r.Nt)}</td><td>${fx(-r.Nc)}</td></tr>`; }).join('') + '</tbody></table>';
  }
  if (groups.length) {
    html += `<div class="dt">Resumen por grupos de barras [${lu}, ${lu}·m, m]</div><table class="tbl"><thead><tr><th>Grupo</th><th>Barras</th>${md.truss ? '' : '<th>M+ máx</th><th>M− máx</th><th>|V| máx</th>'}<th>N tracc.</th><th>N compr.</th><th>L máx</th></tr></thead><tbody>` +
      groups.map(gr => `<tr><td>${esc(gr.name)}</td><td>${esc(gr.ids.map(i => md.mems[i].id).join(', '))}</td>${md.truss ? '' : `<td>${fx(gr.Mpos)}</td><td>${fx(gr.Mneg)}</td><td>${fx(gr.Vmax)}</td>`}<td>${fx(gr.Nt)}</td><td>${fx(-gr.Nc)}</td><td>${fx(gr.Lmax)}</td></tr>`).join('') + '</tbody></table>';
  }
  if (driftTb) html += `<div class="dt">Control de derivas de entrepiso — ${esc(dcase.name)}</div>` + driftTb;
  // P-Δ: amplificación por combinación
  if (md.pdelta) {
    const pr = combSets.filter(q => q.pd);
    html += `<div class="dt">Análisis de segundo orden P-Δ (matriz geométrica, iterativo)</div><table class="tbl"><thead><tr><th>Combinación</th><th>Iteraciones</th><th>|ux| máx. 1.er orden [mm]</th><th>|ux| máx. P-Δ [mm]</th><th>Amplificación</th></tr></thead><tbody>` +
      pr.map(q => `<tr><td>${esc(q.name)}</td><td>${q.pd.it}</td><td>${fx(q.pd.ux1 * 1000, 3)}</td><td>${fx(q.pd.ux2 * 1000, 3)}</td><td>${f2(q.pd.amp, 3)}</td></tr>`).join('') + '</tbody></table>';
    const amp = Math.max(1, ...pr.map(q => q.pd.amp));
    setVar(ctx, 'ampPD' + sfx, amp);
  }
  // análisis modal
  if (modal) {
    const md0 = modal.modes;
    md0.forEach((q, k) => { setVar(ctx, 'T' + (k + 1) + sfx, math.unit(q.T, 's')); setVar(ctx, 'MPx' + (k + 1) + sfx, q.mef[0]); setVar(ctx, 'MPy' + (k + 1) + sfx, q.mef[1]); });
    const cum = [0, 0];
    const hx = modal.Mtot[0] > 0, hy = modal.Mtot[1] > 0;
    html += `<div class="dt">Análisis modal — masas concentradas (${modal.ndof} GDL dinámicos; masa total${hx ? ' x = ' + fx(modal.Mtot[0], 3) : ''}${hy ? ' y = ' + fx(modal.Mtot[1], 3) : ''} ${lu}·s²/m)</div><table class="tbl"><thead><tr><th>Modo</th><th>T [s]</th><th>f [Hz]</th><th>ω [rad/s]</th>${hx ? '<th>Γx</th><th>Masa efectiva x</th><th>Σ x</th>' : ''}${hy ? '<th>Γy</th><th>Masa efectiva y</th><th>Σ y</th>' : ''}</tr></thead><tbody>` +
      md0.map((q, k) => { cum[0] += q.mef[0]; cum[1] += q.mef[1]; return `<tr><td>${k + 1}</td><td>${f2(q.T, 4)}</td><td>${f2(q.f, 3)}</td><td>${f2(q.w, 3)}</td>${hx ? `<td>${f2(q.gam[0], 3)}</td><td>${f2(100 * q.mef[0], 1)} %</td><td>${f2(100 * cum[0], 1)} %</td>` : ''}${hy ? `<td>${f2(q.gam[1], 3)}</td><td>${f2(100 * q.mef[1], 1)} %</td><td>${f2(100 * cum[1], 1)} %</td>` : ''}</tr>`; }).join('') + '</tbody></table>';
    setVar(ctx, 'SMPx' + sfx, cum[0]); setVar(ctx, 'SMPy' + sfx, cum[1]);
    html += `<div class="figure">${drawModes(md, modal, W)}${caption(ctx, 'Formas modales normalizadas (máxima traslación = 1)')}</div>`;
  }
  // resumen
  const kv = [];
  const sh = (n, v) => kv.push(K(symTex(n) + '=' + valTex(v)));
  if (!md.truss) { sh('Mmax' + sfx, math.unit(gmax('Mmax'), uM)); sh('Vmax' + sfx, math.unit(gmax('Vmax'), FU)); }
  sh('Nt' + sfx, math.unit(gmax('Nt'), FU)); sh('Nc' + sfx, math.unit(gmax('Nc'), FU)); sh('deltamax' + sfx, math.unit(dmax * 1000, 'mm'));
  if (deflInfo) kv.push(K('\\delta_{' + esc(md.mems[deflInfo.mi].id) + '} = ' + fx(Math.abs(deflInfo.d) * 1000) + '\\,\\mathrm{mm} \\le L/' + f2(dlim, 0) + ' = ' + fx(deflInfo.lim * 1000) + '\\,\\mathrm{mm}'));
  html += `<div class="kv">${kv.join(' ')}</div>`;
  const opts = [md.pdelta ? 'Combinaciones con efecto P-Δ (2.º orden; los casos individuales en 1.er orden)' : 'Análisis elástico de 1.er orden (sin P-Δ)',
    md.shear !== null ? 'con deformación por cortante (Timoshenko, ν = ' + f2(md.shear, 2) + ', As = 5/6·A en secciones rectangulares)' : 'sin deformación por cortante',
    md.mems.some(m => m.zi > 0 || m.zj > 0) ? 'con zonas rígidas en nudos' : 'sin zonas rígidas'];
  html += `<div class="dt" style="text-transform:none;font-weight:400">Método de rigidez directa (${md.nodes.length} nudos, ${md.mems.length} barras, ${sol.free.length} GDL libres${sol.auto.length ? ', ' + sol.auto.length + ' giros de nudos articulados eliminados' : ''}). Convenciones: ejes globales x → derecha, y ↑; N + tracción; M + tracción en la cara inferior de la barra (eje local y a la izquierda de i→j). ${opts.join(' · ')}.</div>`;
  return html;
}

// ---------------------------------------------------------------------
//  BLOQUE beamcase — casos de vigas con fórmulas cerradas
// ---------------------------------------------------------------------
const SUPS = { SA: { t: 'Simplemente apoyada', s: 'A A' }, V: { t: 'Voladizo (empotrada en A, libre en B)', s: 'E L' }, EA: { t: 'Empotrada en A – apoyada en B', s: 'E A' }, EE: { t: 'Biempotrada', s: 'E E' } };
const LOADS = { U: 'Uniforme w', P: 'Puntual P a una distancia a de A', T: 'Triangular (0 en A → w en B)', Ti: 'Triangular (w en A → 0 en B)', M: 'Momento M₀ (horario) a una distancia a de A' };
// fórmulas cerradas (AISC Manual Tabla 3-23; Roark Tabla 8.1)
export function beamFormulas(sp, ld, L, w, P, M0, a, EI) {
  const b = L - a, F = [];
  const add = (sym, tex, val, u) => F.push({ sym, tex, val, u });
  const s3 = Math.sqrt(3);
  if (sp === 'SA') {
    if (ld === 'U') { add('R_A = R_B', '\\frac{wL}{2}', w * L / 2, 'F'); add('M_{max}', '\\frac{wL^2}{8}', w * L * L / 8, 'M'); add('\\delta_{max}', '\\frac{5wL^4}{384EI}', 5 * w * L ** 4 / (384 * EI), 'd'); }
    if (ld === 'P') { add('R_A', '\\frac{Pb}{L}', P * b / L, 'F'); add('R_B', '\\frac{Pa}{L}', P * a / L, 'F'); add('M_{max}', '\\frac{Pab}{L}', P * a * b / L, 'M'); const bb = Math.min(a, b); add('\\delta_{max}', '\\frac{P\\,b\'\\,(L^2-b\'^2)^{3/2}}{9\\sqrt{3}\\,EIL},\\; b\'=\\min(a,b)', P * bb * (L * L - bb * bb) ** 1.5 / (9 * s3 * EI * L), 'd'); }
    if (ld === 'T') { add('R_A', '\\frac{wL}{6}', w * L / 6, 'F'); add('R_B', '\\frac{wL}{3}', w * L / 3, 'F'); add('M_{max}', '\\frac{wL^2}{9\\sqrt{3}}', w * L * L / (9 * s3), 'M'); add('\\delta_{max}', '0.00652\\,\\frac{wL^4}{EI}', 0.0065222 * w * L ** 4 / EI, 'd'); }
    if (ld === 'Ti') { add('R_A', '\\frac{wL}{3}', w * L / 3, 'F'); add('R_B', '\\frac{wL}{6}', w * L / 6, 'F'); add('M_{max}', '\\frac{wL^2}{9\\sqrt{3}}', w * L * L / (9 * s3), 'M'); add('\\delta_{max}', '0.00652\\,\\frac{wL^4}{EI}', 0.0065222 * w * L ** 4 / EI, 'd'); }
    if (ld === 'M') { add('R_A = -R_B', '\\frac{M_0}{L}', M0 / L, 'F'); add('M_{max}', '\\frac{M_0\\,\\max(a,b)}{L}', Math.abs(M0) * Math.max(a, b) / L, 'M'); }
  } else if (sp === 'V') {
    if (ld === 'U') { add('R_A', 'wL', w * L, 'F'); add('M_A', '\\frac{wL^2}{2}', w * L * L / 2, 'M'); add('\\delta_B', '\\frac{wL^4}{8EI}', w * L ** 4 / (8 * EI), 'd'); }
    if (ld === 'P') { add('R_A', 'P', P, 'F'); add('M_A', 'Pa', P * a, 'M'); add('\\delta_B', '\\frac{Pa^2(3L-a)}{6EI}', P * a * a * (3 * L - a) / (6 * EI), 'd'); }
    if (ld === 'T') { add('R_A', '\\frac{wL}{2}', w * L / 2, 'F'); add('M_A', '\\frac{wL^2}{3}', w * L * L / 3, 'M'); add('\\delta_B', '\\frac{11wL^4}{120EI}', 11 * w * L ** 4 / (120 * EI), 'd'); }
    if (ld === 'Ti') { add('R_A', '\\frac{wL}{2}', w * L / 2, 'F'); add('M_A', '\\frac{wL^2}{6}', w * L * L / 6, 'M'); add('\\delta_B', '\\frac{wL^4}{30EI}', w * L ** 4 / (30 * EI), 'd'); }
    if (ld === 'M') { add('M_A', 'M_0', Math.abs(M0), 'M'); add('\\delta_B', '\\frac{M_0\\,a\\,(2L-a)}{2EI}', Math.abs(M0) * a * (2 * L - a) / (2 * EI), 'd'); }
  } else if (sp === 'EA') {
    if (ld === 'U') { add('R_A', '\\frac{5wL}{8}', 5 * w * L / 8, 'F'); add('R_B', '\\frac{3wL}{8}', 3 * w * L / 8, 'F'); add('M_A', '\\frac{wL^2}{8}', w * L * L / 8, 'M'); add('M^+_{max}', '\\frac{9wL^2}{128}', 9 * w * L * L / 128, 'M'); add('\\delta_{max}', '\\frac{wL^4}{185EI}', w * L ** 4 / (185 * EI), 'd'); }
    if (ld === 'P') { const RB = P * a * a * (3 * L - a) / (2 * L ** 3); add('R_B', '\\frac{Pa^2(3L-a)}{2L^3}', RB, 'F'); add('R_A', 'P - R_B', P - RB, 'F'); add('M_A', '\\frac{Pab(L+b)}{2L^2}', P * a * b * (L + b) / (2 * L * L), 'M'); add('M_P', 'R_B\\,b', RB * b, 'M'); }
    if (ld === 'T') { add('R_A', '\\frac{9wL}{40}', 9 * w * L / 40, 'F'); add('R_B', '\\frac{11wL}{40}', 11 * w * L / 40, 'F'); add('M_A', '\\frac{7wL^2}{120}', 7 * w * L * L / 120, 'M'); }
    if (ld === 'Ti') { add('R_A', '\\frac{2wL}{5}', 2 * w * L / 5, 'F'); add('R_B', '\\frac{wL}{10}', w * L / 10, 'F'); add('M_A', '\\frac{wL^2}{15}', w * L * L / 15, 'M'); }
  } else if (sp === 'EE') {
    if (ld === 'U') { add('R_A = R_B', '\\frac{wL}{2}', w * L / 2, 'F'); add('M_A = M_B', '\\frac{wL^2}{12}', w * L * L / 12, 'M'); add('M^+_{max}', '\\frac{wL^2}{24}', w * L * L / 24, 'M'); add('\\delta_{max}', '\\frac{wL^4}{384EI}', w * L ** 4 / (384 * EI), 'd'); }
    if (ld === 'P') { add('R_A', '\\frac{Pb^2(3a+b)}{L^3}', P * b * b * (3 * a + b) / L ** 3, 'F'); add('R_B', '\\frac{Pa^2(a+3b)}{L^3}', P * a * a * (a + 3 * b) / L ** 3, 'F'); add('M_A', '\\frac{Pab^2}{L^2}', P * a * b * b / (L * L), 'M'); add('M_B', '\\frac{Pa^2b}{L^2}', P * a * a * b / (L * L), 'M'); add('M_P', '\\frac{2Pa^2b^2}{L^3}', 2 * P * a * a * b * b / L ** 3, 'M'); add('\\delta_P', '\\frac{Pa^3b^3}{3EIL^3}', P * a ** 3 * b ** 3 / (3 * EI * L ** 3), 'd'); }
    if (ld === 'T') { add('R_A', '\\frac{3wL}{20}', 3 * w * L / 20, 'F'); add('R_B', '\\frac{7wL}{20}', 7 * w * L / 20, 'F'); add('M_A', '\\frac{wL^2}{30}', w * L * L / 30, 'M'); add('M_B', '\\frac{wL^2}{20}', w * L * L / 20, 'M'); add('\\delta_{max}', '\\frac{wL^4}{764EI}', w * L ** 4 / (764 * EI), 'd'); }
    if (ld === 'Ti') { add('R_A', '\\frac{7wL}{20}', 7 * w * L / 20, 'F'); add('R_B', '\\frac{3wL}{20}', 3 * w * L / 20, 'F'); add('M_A', '\\frac{wL^2}{20}', w * L * L / 20, 'M'); add('M_B', '\\frac{wL^2}{30}', w * L * L / 30, 'M'); add('\\delta_{max}', '\\frac{wL^4}{764EI}', w * L ** 4 / (764 * EI), 'd'); }
    if (ld === 'M') { add('M_A', '\\frac{M_0\\,b\\,(2a-b)}{L^2}', M0 * b * (2 * a - b) / (L * L), 'M'); add('M_B', '\\frac{M_0\\,a\\,(2b-a)}{L^2}', M0 * a * (2 * b - a) / (L * L), 'M'); add('R_A = -R_B', '\\frac{6M_0ab}{L^3}', 6 * M0 * a * b / L ** 3, 'F'); }
  }
  return F;
}
registerBlock('beamcase', {
  name: 'Caso de viga (fórmulas)', icon: 'beam', group: 'Análisis',
  fields: [
    F('apoyo', 'Condición de apoyo', '', 'select', Object.entries(SUPS).map(([k, v]) => [k, v.t])),
    F('carga', 'Tipo de carga', '', 'select', Object.entries(LOADS).map(([k, v]) => [k, v])),
    F('L', 'Luz L', '5 m'), F('w', 'Carga distribuida w (máx. si triangular)', '2 tonf/m'), F('P', 'Carga puntual P', '5 tonf'), F('M0', 'Momento M₀ (horario +)', '3 tonf*m'),
    F('a', 'Posición a desde A (P o M₀)', '2 m'), F('E', 'Módulo de elasticidad E', '2.17e6 tonf/m^2'), F('I', 'Inercia I', '0.0054 m^4'),
    F('deflim', 'Deflexión límite L/… (vacío = no verificar; voladizo: usa 2L)', '360'),
    F('sufijo', 'Sufijo de variables exportadas', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Fórmulas cerradas de la Tabla 3-23 del <i>AISC Steel Construction Manual</i> y la Tabla 8.1 de <i>Roark</i>; los diagramas V-M-δ se obtienen por el método de rigidez y coinciden con las fórmulas. En voladizos A es el empotramiento. Exporta <code>RA RB MA MB Mmax Mpos Mneg Vmax deltamax</code> (con sufijo). Unidades por defecto t, m.',
  def: { apoyo: 'SA', carga: 'U', L: '6 m', w: '2 tonf/m', P: '5 tonf', M0: '3 tonf*m', a: '2 m', E: '2.17e6 tonf/m^2', I: '0.0054 m^4' },
  render: renderBeamCase,
});
export function beamCaseSolve(sp, ld, L, w, P, M0, a, EI) {
  const sup = SUPS[sp].s.split(' ');
  const loads = ld === 'U' ? [{ t: 'U', span: '1', w, cas: 'CM' }] : ld === 'T' ? [{ t: 'T', span: '1', w1: 0, w2: w, cas: 'CM' }] : ld === 'Ti' ? [{ t: 'T', span: '1', w1: w, w2: 0, cas: 'CM' }] : ld === 'P' ? [{ t: 'P', x: a, P, cas: 'CM' }] : [{ t: 'M', x: a, M: M0, cas: 'CM' }];
  const r = solveBeam([0, L], sup, EI, loads, null, 80);
  return { r, sup, loads };
}
function renderBeamCase(b, ctx) {
  const S = ctx.scope;
  const sp = SUPS[b.apoyo] ? b.apoyo : 'SA', ld = LOADS[b.carga] ? b.carga : 'U';
  const L = evalParam(b.L, S, 'm', 6), w = evalParam(b.w, S, 'tonf/m', 2), P = evalParam(b.P, S, 'tonf', 5), M0 = evalParam(b.M0, S, 'tonf*m', 3);
  const a = evalParam(b.a, S, 'm', L / 2), E = evalParam(b.E, S, 'tonf/m^2', 2.17e6), I = evalParam(b.I, S, 'm^4', 0.0054);
  if (!(L > 0) || !(E > 0) || !(I > 0)) throw new Error('L, E e I deben ser mayores que cero');
  if ((ld === 'P' || ld === 'M') && !(a >= 0 && a <= L)) throw new Error('La posición a debe estar entre 0 y L');
  const EI = E * I;
  const { r } = beamCaseSolve(sp, ld, L, w, P, M0, a, EI);
  const sfx = b.sufijo ? '_' + safeId(b.sufijo) : '';
  const RA = r.reac[0].V, RB = r.reac[1].V, MA = r.reac[0].M, MB = r.reac[1].M;
  const mref = Math.max(...r.sM.map(Math.abs)) * 1e-9;
  const Mpos = Math.max(0, ...r.sM.map(v => (v > mref ? v : 0))), Mneg = Math.min(0, ...r.sM.map(v => (v < -mref ? v : 0))), Mmax = Math.max(Mpos, -Mneg), Vmax = Math.max(...r.sV.map(Math.abs)), dmax = Math.max(...r.sD.map(Math.abs));
  const mm = (v) => math.unit(v, 'tonf*m');
  setVar(ctx, 'RA' + sfx, math.unit(RA, 'tonf')); setVar(ctx, 'RB' + sfx, math.unit(sp === 'V' ? 0 : RB, 'tonf'));
  setVar(ctx, 'MA' + sfx, mm(sp === 'SA' ? 0 : -MA)); setVar(ctx, 'MB' + sfx, mm(sp === 'EE' ? MB : 0));
  setVar(ctx, 'Mmax' + sfx, mm(Mmax)); setVar(ctx, 'Mpos' + sfx, mm(Mpos)); setVar(ctx, 'Mneg' + sfx, mm(Mneg));
  setVar(ctx, 'Vmax' + sfx, math.unit(Vmax, 'tonf')); setVar(ctx, 'deltamax' + sfx, math.unit(dmax * 1000, 'mm'));
  // fórmulas
  const fm = beamFormulas(sp, ld, L, w, P, M0, a, EI);
  const unitOf = { F: 'tonf', M: 'tonf*m', d: 'mm' };
  const rows = fm.map(f => K(f.sym + ' = ' + f.tex + ' = ' + valTex(math.unit(f.u === 'd' ? f.val * 1000 : f.val, unitOf[f.u])))).map(x => `<div class="ln"><div class="eq">${x}</div></div>`).join('');
  // dibujo con el bloque de viga (mismo estilo de la app)
  const tmp = { scope: new Map(S), checks: [], inputs: [], toc: [], errors: [], state: ctx.state, blockId: ctx.blockId, prevVals: new Map(), heading: ctx.heading, fig: ctx.fig || 0, tab: ctx.tab || 0 };
  const cargas = ld === 'U' ? `U 1 ${w}` : ld === 'T' ? `T 1 0 ${w}` : ld === 'Ti' ? `T 1 ${w} 0` : ld === 'P' ? `P ${a} ${P}` : `M ${a} ${M0}`;
  const html = blockBeam({ tramos: String(L), apoyos: SUPS[sp].s.replace(' ', ', '), E: String(E), I: String(I), cargas, titulo: b.titulo || (SUPS[sp].t + ' — ' + LOADS[ld]) }, tmp);
  ctx.fig = tmp.fig;
  const htmlB = html.replace(/<div class="kv">[\s\S]*?<\/div>(?=<div class="cap">)/, '');
  // verificación de deflexión
  const dl = evalParam(b.deflim, S, '', 0);
  let chk = '';
  if (dl > 0) {
    const lim = (sp === 'V' ? 2 * L : L) / dl, ok = dmax <= lim;
    ctx.checks.push({ ok, label: `Deflexión máxima de la viga: δ = ${fx(dmax * 1000)} mm ≤ ${sp === 'V' ? '2L' : 'L'}/${f2(dl, 0)} = ${fx(lim * 1000)} mm`, ratio: dmax / lim, block: ctx.blockId });
    chk = `<div class="ln chk ${ok ? 'cok' : 'cbad'}"><div class="eq">${K('\\delta_{max} = ' + fx(dmax * 1000) + '\\,\\mathrm{mm} \\;' + (ok ? '\\le' : '>') + '\\; \\frac{' + (sp === 'V' ? '2L' : 'L') + '}{' + f2(dl, 0) + '} = ' + fx(lim * 1000) + '\\,\\mathrm{mm}')}</div><div class="cm">Deflexión admisible ${ok ? '<span class="ok">✔ CUMPLE</span>' : '<span class="bad">✘ NO CUMPLE</span>'}<span class="dc">D/C = ${f2(dmax / lim, 2)}</span></div></div>`;
  }
  const head = `<div class="txt"><b>${esc(SUPS[sp].t)}</b> — ${esc(LOADS[ld])}. ${K('L = ' + f2(L) + '\\,\\mathrm{m}')}, ${K('EI = ' + f2(EI, 1) + '\\,\\mathrm{t\\cdot m^2}')}${ld === 'P' || ld === 'M' ? ', ' + K('a = ' + f2(a) + '\\,\\mathrm{m},\\ b = L - a = ' + f2(L - a) + '\\,\\mathrm{m}') : ''}.</div>`;
  const kv = `<div class="kv">${[['RA' + sfx, math.unit(RA, 'tonf')], ...(sp !== 'V' ? [['RB' + sfx, math.unit(RB, 'tonf')]] : []), ['Mpos' + sfx, mm(Mpos)], ['Mneg' + sfx, mm(Mneg)], ['Vmax' + sfx, math.unit(Vmax, 'tonf')], ['deltamax' + sfx, math.unit(dmax * 1000, 'mm')]].map(([n, v]) => K(symTex(n) + '=' + valTex(v))).join(' ')}</div>`;
  return head + (rows ? `<div class="dt">Fórmulas cerradas (AISC Tabla 3-23 / Roark)</div>${rows}` : '') + htmlB + kv + chk;
}

// ---------------------------------------------------------------------
//  BLOQUE influence — líneas de influencia (viga continua)
// ---------------------------------------------------------------------
export function influenceLine(X, sup, efecto, loc, lado = 'der', npts = 240) {
  const Ltot = X[X.length - 1];
  const xs = new Set(); for (let k = 0; k <= npts; k++) xs.add(+(Ltot * k / npts).toFixed(9));
  X.forEach(x => xs.add(+x.toFixed(9)));
  if (efecto !== 'R') { const e = 2e-4 * Ltot; if (efecto === 'M') xs.add(+loc.toFixed(9)); else { xs.add(+Math.max(0, loc - e).toFixed(9)); xs.add(+Math.min(Ltot, loc + e).toFixed(9)); } }
  const pos = [...xs].sort((p, q) => p - q);
  const eta = [];
  for (const p of pos) {
    const loads = [{ t: 'P', x: p, P: 1, cas: 'CM' }];
    if (efecto !== 'R') loads.push({ t: 'P', x: loc, P: 0, cas: 'CM' });
    const r = solveBeam(X, sup, 1, loads, null, 2);
    if (efecto === 'R') { eta.push(r.reac[loc].V); continue; }
    const k = r.xs.findIndex(v => Math.abs(v - loc) < 1e-7);
    // índices de estaciones: elemento e → 3e, 3e+1, 3e+2 (t = 0, 0.5, 1)
    const left = k > 0 ? 3 * (k - 1) + 2 : 0, right = k < r.xs.length - 1 ? 3 * k : 3 * (k - 1) + 2;
    if (efecto === 'M') eta.push(r.sM[k > 0 ? left : right]);
    else eta.push(lado === 'izq' ? r.sV[k > 0 ? left : right] : r.sV[right]);
  }
  return { pos, eta };
}
registerBlock('influence', {
  name: 'Línea de influencia', icon: 'plot', group: 'Análisis',
  fields: [
    F('tramos', 'Longitudes de tramos', '8, 10, 8'), F('apoyos', 'Apoyos (A articulado, E empotrado, L libre)', 'A, A, A, A'),
    F('efecto', 'Efecto', '', 'select', [['M', 'Momento flector en una sección'], ['V', 'Fuerza cortante en una sección'], ['R', 'Reacción en un apoyo']]),
    F('x', 'Sección x desde el extremo izquierdo (M, V) o n.º de apoyo (R)', '4 m'),
    F('lado', 'Cortante a la', '', 'select', [['der', 'derecha de la sección'], ['izq', 'izquierda de la sección']]),
    F('wD', 'Carga muerta uniforme (toda la viga)', '0 tonf/m'), F('wL', 'Carga viva uniforme (áreas desfavorables)', '0 tonf/m'), F('P', 'Carga concentrada móvil', '0 tonf'),
    F('sufijo', 'Sufijo de variables', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Se obtiene moviendo una carga unitaria y resolviendo la viga por rigidez en cada posición (equivale al principio de Müller-Breslau). Ordenadas: R y V adimensionales, M en m. Con cargas: <code>Emax = wD·ΣA + wL·A⁺ + P·η⁺</code>. Exporta <code>etamax etamin Apos Aneg Emax Emin</code> (con sufijo).',
  def: { tramos: '8, 10, 8', apoyos: 'A, A, A, A', efecto: 'M', x: '4 m', wD: '2 tonf/m', wL: '1 tonf/m', P: '0 tonf' },
  render(b, ctx) {
    const S = ctx.scope;
    const Ls = String(b.tramos || '').split(/[;,]/).map(s => s.trim()).filter(Boolean).map(s => evalParam(s, S, 'm'));
    if (!Ls.length || Ls.some(l => !(l > 0))) throw new Error('Defina longitudes de tramo positivas');
    const X = [0]; Ls.forEach(l => X.push(X[X.length - 1] + l));
    const sup = String(b.apoyos || '').split(/[,\s]+/).filter(Boolean).map(s => s.toUpperCase()); while (sup.length < X.length) sup.push('A');
    const ef = ['M', 'V', 'R'].includes(b.efecto) ? b.efecto : 'M';
    let loc;
    if (ef === 'R') { loc = Math.round(evalParam(b.x, S, '', 1)) - 1; if (!(loc >= 0 && loc < X.length) || sup[loc] === 'L') throw new Error('N.º de apoyo inválido (1…' + X.length + ', no libre)'); }
    else { loc = evalParam(b.x, S, 'm', X[X.length - 1] / 2); if (!(loc >= 0 && loc <= X[X.length - 1])) throw new Error('La sección debe estar dentro de la viga'); }
    const { pos, eta } = influenceLine(X, sup, ef, loc, b.lado === 'izq' ? 'izq' : 'der');
    let Ap = 0, An = 0;
    for (let i = 1; i < pos.length; i++) {
      const h = pos[i] - pos[i - 1], e1 = eta[i - 1], e2 = eta[i];
      if (e1 * e2 >= 0) { const A = h * (e1 + e2) / 2; if (A > 0) Ap += A; else An += A; }
      else { const t = e1 / (e1 - e2); const A1 = t * h * e1 / 2, A2 = (1 - t) * h * e2 / 2; for (const A of [A1, A2]) { if (A > 0) Ap += A; else An += A; } }
    }
    const emax = Math.max(...eta), emin = Math.min(...eta);
    const xmaxP = pos[eta.indexOf(emax)], xminP = pos[eta.indexOf(emin)];
    const wD = evalParam(b.wD, S, 'tonf/m', 0), wL = evalParam(b.wL, S, 'tonf/m', 0), Pm = evalParam(b.P, S, 'tonf', 0);
    const Emax = wD * (Ap + An) + wL * Ap + Pm * Math.max(0, emax), Emin = wD * (Ap + An) + wL * An + Pm * Math.min(0, emin);
    const sfx = b.sufijo ? '_' + safeId(b.sufijo) : '';
    const uE = ef === 'M' ? 'm' : '', uA = ef === 'M' ? 'm^2' : 'm', uR = ef === 'M' ? 'tonf*m' : 'tonf';
    const U = (v, u) => (u ? math.unit(v, u) : v);
    setVar(ctx, 'etamax' + sfx, U(emax, uE)); setVar(ctx, 'etamin' + sfx, U(emin, uE)); setVar(ctx, 'Apos' + sfx, U(Ap, uA)); setVar(ctx, 'Aneg' + sfx, U(An, uA));
    setVar(ctx, 'Emax' + sfx, math.unit(Emax, uR)); setVar(ctx, 'Emin' + sfx, math.unit(Emin, uR));
    // dibujo
    const W = 720, pl = 60, pr = 30, sc = (W - pl - pr) / X[X.length - 1], px = (x) => pl + x * sc;
    let g = DEFS;
    const yb = 46;
    g += `<rect x="${px(0)}" y="${yb - 3}" width="${X[X.length - 1] * sc}" height="6" fill="#5b6b7b"/>`;
    X.forEach((x, i) => {
      const xx = px(x), t = sup[i];
      if (t === 'A') g += `<path d="M${xx},${yb + 3} l-8,13 h16 z" fill="#fff" stroke="${C.ink}"/><rect x="${xx - 12}" y="${yb + 16}" width="24" height="4" fill="url(#anH)"/>`;
      if (t === 'E') g += `<rect x="${i === 0 ? xx - 9 : xx}" y="${yb - 18}" width="9" height="36" fill="url(#anH)" stroke="${C.ink}"/>`;
      g += T(xx, yb + 34, String.fromCharCode(65 + i), { b: 1, fs: 10 });
    });
    for (let i = 0; i < Ls.length; i++) g += T((px(X[i]) + px(X[i + 1])) / 2, yb - 10, f2(Ls[i]) + ' m', { fs: 9.5, c: C.axis });
    if (ef !== 'R') { const xx = px(loc); g += Lne(xx, yb - 22, xx, yb + 22, C.red, 1.4, '4 2') + TH(xx, yb - 26, 'sección s (x = ' + f2(loc) + ' m)', { fs: 9.5, c: C.red, b: 1 }); }
    else g += `<line x1="${px(X[loc])}" y1="${yb + 62}" x2="${px(X[loc])}" y2="${yb + 22}" stroke="${C.red}" stroke-width="1.8" marker-end="url(#anR)"/>` + TH(px(X[loc]) + 6, yb + 58, 'R' + String.fromCharCode(65 + loc), { fs: 10, c: C.red, b: 1, a: 'start' });
    const H1 = ef === 'R' ? 120 : 92;
    // curva
    const Hd = 230, top = H1 + 26, bot = 26;
    let ymin = Math.min(0, emin), ymax = Math.max(0, emax); if (ymax - ymin < 1e-9) ymax = 1;
    const sy = (Hd - top + H1 - bot) / (ymax - ymin), py = (y) => top + (ymax - y) * sy;
    niceTicks(ymin, ymax, 4).forEach(t => { g += Lne(pl, py(t), W - pr, py(t), C.grid, 0.7) + T(pl - 6, py(t) + 3.5, f2(t, 2), { fs: 9, c: C.axis, a: 'end' }); });
    X.forEach(x => { g += Lne(px(x), yb + 22, px(x), py(Math.min(0, ymin)) + 4, C.grid, 0.7, '3 3'); });
    // áreas positivas/negativas
    const poly = (sgn) => { let d = `M${px(pos[0])},${py(0)} `; pos.forEach((x, i) => { const e = sgn > 0 ? Math.max(0, eta[i]) : Math.min(0, eta[i]); d += `L${px(x).toFixed(1)},${py(e).toFixed(1)} `; }); return d + `L${px(pos[pos.length - 1])},${py(0)} Z`; };
    g += `<path d="${poly(1)}" fill="${C.blueF}" stroke="none"/><path d="${poly(-1)}" fill="${C.redF}" stroke="none"/>`;
    g += `<path d="${pos.map((x, i) => (i ? 'L' : 'M') + px(x).toFixed(1) + ',' + py(eta[i]).toFixed(1)).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
    g += Lne(pl, py(0), W - pr, py(0), C.ink, 1);
    const lb = labeler();
    const mark = (x, e, c) => { const yy = py(e), up = e >= 0; g += `<circle cx="${px(x)}" cy="${yy}" r="2.8" fill="${c}"/>`; const p = lb.place([[px(x), yy + (up ? -8 : 15)], [px(x) + 30, yy + (up ? -8 : 15)], [px(x) - 30, yy + (up ? -8 : 15)]], 50, 11); if (p) g += TH(p[0], p[1], 'η = ' + f2(e, 3), { fs: 9.5, c, b: 1 }); };
    if (emax > 1e-9) mark(xmaxP, emax, C.blue);
    if (emin < -1e-9) mark(xminP, emin, C.red);
    const nm = ef === 'M' ? 'M_s' : ef === 'V' ? 'V_s' : 'R_' + String.fromCharCode(65 + loc);
    g += T(14, (top + Hd + H1 - bot) / 2, 'η (' + (ef === 'M' ? 'm' : '—') + ')', { fs: 10, r: -90, c: C.axis });
    const H = Hd + H1;
    const tb = `<table class="tbl"><thead><tr><th>Ordenada máx. η⁺</th><th>en x [m]</th><th>Ordenada mín. η⁻</th><th>en x [m]</th><th>Área A⁺ [${ef === 'M' ? 'm²' : 'm'}]</th><th>Área A⁻ [${ef === 'M' ? 'm²' : 'm'}]</th></tr></thead><tbody><tr><td>${f2(emax, 4)}</td><td>${f2(xmaxP)}</td><td>${f2(emin, 4)}</td><td>${f2(xminP)}</td><td>${f2(Ap, 4)}</td><td>${f2(An, 4)}</td></tr></tbody></table>`;
    const kv = (wD || wL || Pm) ? `<div class="kv">${K(symTex('Emax' + sfx) + ' = w_D\\,\\Sigma A + w_L A^+ + P\\,\\eta^+ = ' + valTex(math.unit(Emax, uR)))} ${K(symTex('Emin' + sfx) + ' = w_D\\,\\Sigma A + w_L A^- + P\\,\\eta^- = ' + valTex(math.unit(Emin, uR)))}</div>` : '';
    return `<div class="figure">${svgWrap(W, H, g)}${tb}${kv}${caption(ctx, b.titulo || ('Línea de influencia de $' + nm + '$ (carga unitaria móvil; positiva arriba)'))}</div>`;
  },
});

// ---------------------------------------------------------------------
//  BLOQUE cross — método de distribución de momentos (Hardy Cross)
// ---------------------------------------------------------------------
export function hardyCross(Ls, EIs, sup, spanLoads, opt = {}) {
  const nS = Ls.length, maxC = opt.ciclos || 12, tol = opt.tol ?? 1e-4, modif = !!opt.modificado;
  // extremos: e = 2*i (izq. tramo i), 2*i+1 (der.)
  const free = (j) => sup[j] === 'L';
  const cant = Ls.map((_, i) => (i === 0 && free(0)) || (i === nS - 1 && free(nS)));
  const pinnedEnd = (j) => sup[j] === 'A' && (j === 0 || j === nS) && !(j === 0 ? cant[0] : cant[nS - 1]);
  const Kr = Ls.map((L, i) => {
    if (cant[i]) return 0;
    const farPinnedL = pinnedEnd(i), farPinnedR = pinnedEnd(i + 1);
    const k = 4 * EIs[i] / L;
    if (modif && (farPinnedL || farPinnedR) && !(farPinnedL && farPinnedR)) return 0.75 * k;
    return k;
  });
  // MEP (horario +) por superposición de cargas (fórmulas cerradas)
  const fem = Ls.map((L, i) => {
    let ml = 0, mr = 0;
    for (const q of spanLoads[i] || []) {
      if (q.t === 'U') { ml -= q.w * L * L / 12; mr += q.w * L * L / 12; }
      else if (q.t === 'P') { const a = q.a, b = L - a; ml -= q.P * a * b * b / (L * L); mr += q.P * a * a * b / (L * L); }
      else if (q.t === 'T') { const w1 = q.w1, w2 = q.w2; ml -= w1 * L * L / 12 + (w2 - w1) * L * L / 30; mr += w1 * L * L / 12 + (w2 - w1) * L * L / 20; }
    }
    return [ml, mr];
  });
  const M = fem.map(f => f.slice());
  // voladizos: momento en el apoyo por estática
  const cantM = Ls.map((L, i) => {
    if (!cant[i]) return null;
    let m = 0; for (const q of spanLoads[i] || []) { const arm = (x) => (i === 0 ? L - x : x); if (q.t === 'U') m += q.w * L * L / 2; else if (q.t === 'P') m += q.P * arm(q.a); else if (q.t === 'T') { const W1 = q.w1 * L, W2 = (q.w2 - q.w1) * L / 2; m += W1 * L / 2 + W2 * (i === 0 ? L / 3 : 2 * L / 3); } }
    return m;
  });
  Ls.forEach((L, i) => { if (cant[i]) M[i] = i === 0 ? [0, cantM[i]] : [-cantM[i], 0]; });
  // modificado: liberar extremo articulado
  if (modif) Ls.forEach((L, i) => {
    if (cant[i]) return;
    if (pinnedEnd(i) && !pinnedEnd(i + 1)) { M[i][1] -= M[i][0] / 2; M[i][0] = 0; }
    if (pinnedEnd(i + 1) && !pinnedEnd(i)) { M[i][0] -= M[i][1] / 2; M[i][1] = 0; }
  });
  const fem2 = M.map(r => r.slice());
  // nudos y factores de distribución
  const joints = [];
  for (let j = 0; j <= nS; j++) {
    const ends = []; if (j > 0) ends.push([j - 1, 1]); if (j < nS) ends.push([j, 0]);
    const ks = ends.map(([i]) => Kr[i]), sk = ks.reduce((p, q) => p + q, 0);
    let fd = ends.map((e, k) => (sk > 0 ? ks[k] / sk : 0));
    const fixed = sup[j] === 'E';
    if (fixed) fd = fd.map(() => 0);
    if (free(j)) fd = fd.map(() => 0);
    if (modif && pinnedEnd(j)) fd = fd.map(() => 0);
    joints.push({ j, ends, fd, bal: !fixed && !free(j) && !(modif && pinnedEnd(j)) && sk > 0 });
  }
  const steps = [];
  const carry = (i, side) => {
    if (cant[i]) return 0;
    const far = side === 0 ? i + 1 : i;
    if (modif && pinnedEnd(far) && !(pinnedEnd(i) && pinnedEnd(i + 1))) return 0;
    if (free(far)) return 0;
    return 0.5;
  };
  for (let c = 0; c < maxC; c++) {
    const D = Ls.map(() => [0, 0]);
    let mx = 0;
    for (const jt of joints) {
      if (!jt.bal) continue;
      const unb = jt.ends.reduce((s, [i, sd]) => s + M[i][sd], 0);
      jt.ends.forEach(([i, sd], k) => { D[i][sd] = -jt.fd[k] * unb; mx = Math.max(mx, Math.abs(D[i][sd])); });
    }
    D.forEach((d, i) => { M[i][0] += d[0]; M[i][1] += d[1]; });
    const Tr = Ls.map(() => [0, 0]);
    const ref = Math.max(1e-9, ...fem.flat().map(Math.abs));
    if (mx < tol * ref || c === maxC - 1) { steps.push({ D, Tr }); break; }
    D.forEach((d, i) => { Tr[i][1] += d[0] * carry(i, 0); Tr[i][0] += d[1] * carry(i, 1); });
    Tr.forEach((t, i) => { M[i][0] += t[0]; M[i][1] += t[1]; });
    steps.push({ D, Tr });
  }
  return { Kr, fem, fem2, M, joints, steps, cant };
}
registerBlock('cross', {
  name: 'Método de Cross', icon: 'table', group: 'Análisis',
  fields: [
    F('tramos', 'Longitudes de tramos', '6, 8, 6'), F('apoyos', 'Apoyos (A, E, L libre en extremos)', 'E, A, A, A'),
    F('I', 'Inercias por tramo (una o lista)', '1, 1, 1'), F('E', 'Módulo E (opcional; se cancela si es constante)', '1'),
    F('cargas', 'Cargas por tramo: U tramo w | P tramo P a | T tramo w1 w2', 'U 1 2\nU 2 2\nP 3 6 3', 'area'),
    F('modificado', 'Rigidez modificada 3EI/L en extremos articulados', '', 'check'),
    F('ciclos', 'Número máximo de ciclos', '10'), F('sufijo', 'Sufijo de variables', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Convención de Cross: momentos en los extremos de barra positivos en sentido <b>horario</b>. MEP por fórmulas cerradas (biempotrada). Factor de transporte 1/2. Exporta <code>M_AB, M_BA…</code> (horario +), <code>Mapo1…</code> (momento flector en los apoyos, negativo = tracción arriba) y <code>Mpos1…</code> por tramo. Se compara con la solución exacta por rigidez.',
  def: { tramos: '6, 8, 6', apoyos: 'E, A, A, A', I: '1, 1, 1', E: '1', cargas: 'U 1 2\nU 2 2\nP 3 6 3', ciclos: '10' },
  render(b, ctx) {
    const S = ctx.scope;
    const Ls = String(b.tramos || '').split(/[;,]/).map(s => s.trim()).filter(Boolean).map(s => evalParam(s, S, 'm'));
    if (!Ls.length || Ls.some(l => !(l > 0))) throw new Error('Defina longitudes de tramo positivas');
    if (Ls.length > 8) throw new Error('Máximo 8 tramos');
    const nS = Ls.length;
    const sup = String(b.apoyos || '').split(/[,\s]+/).filter(Boolean).map(s => s.toUpperCase()); while (sup.length < nS + 1) sup.push('A');
    sup.forEach((s, j) => { if (!['A', 'E', 'L'].includes(s)) throw new Error('Apoyo «' + s + '» no válido (A, E, L)'); if (s === 'L' && j > 0 && j < nS) throw new Error('Un extremo libre (L) solo puede estar en los extremos de la viga'); });
    const Is = String(b.I || '1').split(/[;,]/).map(s => s.trim()).filter(Boolean).map(s => evalParam(s, S, 'm^4'));
    const E = evalParam(b.E, S, 'tonf/m^2', 1);
    const EIs = Ls.map((_, i) => E * (Is[i] ?? Is[Is.length - 1]));
    if (EIs.some(v => !(v > 0))) throw new Error('E e I deben ser positivos');
    const sl = Ls.map(() => []); const loadsB = [];
    for (const l of cleanLines(b.cargas)) {
      const tk = mergeU(tokenize(l.s), S); const t = tk[0].toUpperCase(), i = parseInt(tk[1]) - 1, where = 'Cargas, línea ' + l.n;
      if (!(i >= 0 && i < nS)) throw new Error(where + ': tramo inexistente');
      const X0 = Ls.slice(0, i).reduce((p, q) => p + q, 0);
      if (t === 'U') { const w = evNum(tk[2], S, 'tonf/m', where); sl[i].push({ t: 'U', w }); loadsB.push({ t: 'U', span: String(i + 1), w, cas: 'CM' }); }
      else if (t === 'P') { const P = evNum(tk[2], S, 'tonf', where), a = evNum(tk[3] ?? String(Ls[i] / 2), S, 'm', where); if (!(a >= 0 && a <= Ls[i])) throw new Error(where + ': a fuera del tramo'); sl[i].push({ t: 'P', P, a }); loadsB.push({ t: 'P', x: X0 + a, P, cas: 'CM' }); }
      else if (t === 'T') { const w1 = evNum(tk[2], S, 'tonf/m', where), w2 = evNum(tk[3], S, 'tonf/m', where); sl[i].push({ t: 'T', w1, w2 }); loadsB.push({ t: 'T', span: String(i + 1), w1, w2, cas: 'CM' }); }
      else throw new Error(where + ': use U, P o T');
    }
    const cyc = Math.max(1, Math.min(30, Math.round(evalParam(b.ciclos, S, '', 10))));
    const res = hardyCross(Ls, EIs, sup, sl, { ciclos: cyc, modificado: !!b.modificado });
    const lab = (j) => String.fromCharCode(65 + j);
    const ends = []; for (let i = 0; i < nS; i++) { ends.push([i, 0]); ends.push([i, 1]); }
    const nm = ([i, s]) => s === 0 ? lab(i) + lab(i + 1) : lab(i + 1) + lab(i);
    const cell = (v) => `<td>${Math.abs(v) < 5e-5 ? '0' : f2(v, 3)}</td>`;
    // encabezado de nudos
    let h = '<table class="tbl cross"><thead><tr><th>Nudo</th>';
    for (let j = 0; j <= nS; j++) { const span = (j > 0 ? 1 : 0) + (j < nS ? 1 : 0); h += `<th colspan="${span}">${lab(j)} (${sup[j] === 'E' ? 'empotrado' : sup[j] === 'L' ? 'libre' : 'articulado'})</th>`; }
    h += '</tr><tr><th>Extremo</th>' + ends.map(e => `<th>${nm(e)}</th>`).join('') + '</tr></thead><tbody>';
    h += '<tr><td>Rigidez K = ' + (b.modificado ? '4EI/L ó 3EI/L' : '4EI/L') + '</td>' + ends.map(([i]) => cell(res.Kr[i])).join('') + '</tr>';
    const fdOf = ([i, s]) => { const jt = res.joints[s === 0 ? i : i + 1]; const k = jt.ends.findIndex(([ii, ss]) => ii === i && ss === s); return jt.fd[k]; };
    h += '<tr><td>Factor de distribución FD</td>' + ends.map(e => cell(fdOf(e))).join('') + '</tr>';
    h += '<tr><td>MEP (horario +)</td>' + ends.map(([i, s]) => cell(res.fem[i][s])).join('') + '</tr>';
    if (b.modificado || res.cant.some(Boolean)) h += '<tr><td>MEP ajustado</td>' + ends.map(([i, s]) => cell(res.fem2[i][s])).join('') + '</tr>';
    res.steps.forEach((st, c) => {
      h += `<tr><td>Distribución ${c + 1}</td>` + ends.map(([i, s]) => cell(st.D[i][s])).join('') + '</tr>';
      if (st.Tr.some(t => Math.abs(t[0]) + Math.abs(t[1]) > 0)) h += `<tr><td>Transporte ${c + 1}</td>` + ends.map(([i, s]) => cell(st.Tr[i][s])).join('') + '</tr>';
    });
    h += '<tr class="tot"><td>Momento final Σ</td>' + ends.map(([i, s]) => cell(res.M[i][s])).join('') + '</tr></tbody></table>';
    // comparación con la solución exacta
    const X = [0]; Ls.forEach(l => X.push(X[X.length - 1] + l));
    // EI variable: se usa EI del tramo con mayor rigidez si es constante; si no, solo se reporta Cross
    const constEI = EIs.every(v => Math.abs(v - EIs[0]) < 1e-9 * EIs[0]);
    const sfx = b.sufijo ? '_' + safeId(b.sufijo) : '';
    ends.forEach(e => setVar(ctx, 'M_' + nm(e) + sfx, math.unit(res.M[e[0]][e[1]], 'tonf*m')));
    // momentos en apoyos (convención de viga): izquierdo de tramo i: M = +Mcw_i0 ; derecho: −Mcw_i1
    const Mapo = []; for (let j = 0; j <= nS; j++) Mapo.push(j < nS ? res.M[j][0] : -res.M[j - 1][1]);
    Mapo.forEach((v, j) => setVar(ctx, 'Mapo' + (j + 1) + sfx, math.unit(v, 'tonf*m')));
    // M+ por tramo (estática)
    const Mpos = Ls.map((L, i) => {
      let best = -Infinity;
      for (let k = 0; k <= 200; k++) {
        const x = L * k / 200; let m = res.M[i][0] * (1 - x / L) + (-res.M[i][1]) * x / L;
        for (const q of sl[i]) {
          if (q.t === 'U') m += q.w * x * (L - x) / 2;
          else if (q.t === 'P') m += q.P * (x <= q.a ? x * (L - q.a) / L : q.a * (L - x) / L);
          else if (q.t === 'T') { const w1 = q.w1, dw = q.w2 - q.w1; const RA = w1 * L / 2 + dw * L / 6; m += RA * x - w1 * x * x / 2 - dw * x ** 3 / (6 * L); }
        }
        if (res.cant[i]) m = NaN;
        if (m > best) best = m;
      }
      return isFinite(best) ? Math.max(0, best) : 0;
    });
    Mpos.forEach((v, i) => setVar(ctx, 'Mpos' + (i + 1) + sfx, math.unit(v, 'tonf*m')));
    let cmp = '';
    if (constEI && !res.cant.some(Boolean)) {
      const r = solveBeam(X, sup, EIs[0], loadsB, null, 4);
      const ex = X.map(x => { const k = r.sx.findIndex(v => Math.abs(v - x) < 1e-7); const vals = r.sx.map((v, kk) => Math.abs(v - x) < 1e-7 ? r.sM[kk] : null).filter(v => v !== null); return vals.length ? vals.reduce((p, q) => (Math.abs(q) > Math.abs(p) ? q : p), 0) : r.sM[k]; });
      let err = 0; Mapo.forEach((v, j) => { err = Math.max(err, Math.abs(v - ex[j])); });
      const ref = Math.max(1e-9, ...ex.map(Math.abs));
      setVar(ctx, 'errCross' + sfx, err / ref);
      cmp = '<div class="dt">Comparación con el método de rigidez (solución exacta)</div><table class="tbl"><thead><tr><th>Apoyo</th>' + X.map((_, j) => `<th>${lab(j)}</th>`).join('') + '</tr></thead><tbody>' +
        '<tr><td>M Cross [t·m]</td>' + Mapo.map(v => cell(v)).join('') + '</tr><tr><td>M rigidez [t·m]</td>' + ex.map(v => cell(v)).join('') + `</tr></tbody></table><div class="kv">${K('\\varepsilon_{max} = \\frac{\\max|M_{Cross} - M_{exacto}|}{|M|_{max}} = ' + f2(100 * err / ref, 3) + '\\%')}</div>`;
    }
    const kv = `<div class="kv">${Mapo.map((v, j) => K(symTex('Mapo' + (j + 1) + sfx) + '=' + valTex(math.unit(v, 'tonf*m')))).join(' ')} ${Mpos.map((v, i) => K(symTex('Mpos' + (i + 1) + sfx) + '=' + valTex(math.unit(v, 'tonf*m')))).join(' ')}</div>`;
    ctx.tab = (ctx.tab || 0) + 1;
    return `<div class="figure"><div class="cap">Tabla ${ctx.tab}: ${esc(b.titulo || 'Distribución de momentos por el método de Cross [t·m]')}</div>${h}</div>${kv}${cmp}`;
  },
});
