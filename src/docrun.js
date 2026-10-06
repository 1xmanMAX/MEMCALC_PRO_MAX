// Ejecuta un documento completo -> HTML de la memoria + entradas + verificaciones
import { runCalc, richText, settings, esc, K, fmtPlain, errEs, math } from './engine.js';
import './norms/index.js';
import './blocks/index.js';
import { BLOCKS } from './blockreg.js';
import { blockBeam, blockSection, blockPM, blockFooting, blockWall, blockSpectrum, blockPlot, blockTable, caption } from './blocks.js';

const GRAPH = { beam: blockBeam, section: blockSection, pm: blockPM, footing: blockFooting, wall: blockWall, spectrum: blockSpectrum, plot: blockPlot, table: blockTable };

export function runDoc(doc) {
  const st = doc.settings || {};
  settings.dec = st.dec ?? 2;
  settings.sys = st.sys || 'tec';
  settings.comma = !!st.comma;
  const counters = [0, 0, 0, 0];
  const ctx = {
    scope: new Map(), checks: [], inputs: [], toc: [], errors: [], prevVals: new Map(),
    state: { mode: st.mode || 'completo', hidden: false, dec: settings.dec }, fig: 0, tab: 0,
    heading(lvl) {
      counters[lvl - 1]++; for (let i = lvl; i < 4; i++) counters[i] = 0;
      return st.numbering === false ? '' : counters.slice(0, lvl).join('.') + '.';
    },
  };
  // cada verificación recuerda la sección (título de nivel 1 y 2) en la que aparece
  let sec1 = null, sec2 = null;
  ctx.toc.push = function (...items) {
    for (const t of items) { if (t.lvl === 1) { sec1 = t; sec2 = null; } else if (t.lvl === 2) sec2 = t; }
    return Array.prototype.push.apply(this, items);
  };
  ctx.checks.push = function (...items) {
    for (const c of items) if (c && !c.sec) { c.sec = sec1; c.sub = sec2; }
    return Array.prototype.push.apply(this, items);
  };
  const parts = [];
  for (const b of doc.blocks) {
    ctx.blockId = b.id;
    let h = '';
    try {
      if (b.type === 'calc') h = runCalc(b.src, ctx);
      else if (b.type === 'text') h = renderText(b.src, ctx);
      else if (b.type === 'image') h = b.data ? `<div class="figure img" style="--w:${b.width || 70}%"><img src="${b.data}" alt="">${caption(ctx, b.caption || '')}</div>` : '<div class="ph img-empty">Imagen sin cargar (no se imprime)</div>';
      else if (b.type === 'pagebreak') h = '<div class="pb"></div>';
      else if (b.type === 'summary') {
        const t = b.titulo === undefined ? 'Resumen de verificaciones' : b.titulo;
        let hd = '';
        if (t) { const num = ctx.heading(1), id = 'h' + b.id + '_s'; ctx.toc.push({ lvl: 1, num, text: t, id, sum: true }); hd = `<h2 id="${id}" class="hd"><span class="hn">${num}</span>${esc(t)}</h2>`; }
        h = hd + '\u0001SUMMARY\u0001';
      }
      else if (GRAPH[b.type]) h = GRAPH[b.type](b, ctx);
      else if (BLOCKS[b.type]) h = BLOCKS[b.type].render(b, ctx);
      else throw new Error('Tipo de bloque desconocido: ' + b.type);
    } catch (e) {
      ctx.errors.push({ block: b.id, line: 0, msg: errEs(e) });
      h = `<div class="ln lerr"><span>⚠ ${esc(errEs(e))}</span></div>`;
    }
    parts.push({ id: b.id, html: polish(h) });
  }
  const sum = summaryHtml(ctx.checks, ctx.errors.length);
  let first = true;
  for (const p of parts) if (p.html.includes('\u0001SUMMARY\u0001')) { p.html = p.html.replace('\u0001SUMMARY\u0001', first ? sum : ''); first = false; }
  const cover = st.cover !== false ? coverHtml(doc) : '';
  const toc = st.toc !== false && ctx.toc.length ? tocHtml(ctx.toc, ctx.checks) : '';
  const body = parts.map(p => `<section class="blk" data-b="${p.id}">${p.html}</section>`).join('');
  return { html: cover + toc + body, head: cover + toc, parts, ctx };
}

function renderText(src, ctx) {
  // permite títulos numerados (#) dentro de bloques de texto
  const lines = String(src || '').split('\n');
  let buf = [], out = '';
  const flush = () => { if (buf.length) { out += '<div class="md">' + richText(buf.join('\n'), ctx.scope) + '</div>'; buf = []; } };
  lines.forEach((l, i) => {
    const m = /^(#{1,4})\s+(.*)$/.exec(l.trim());
    if (m) {
      flush();
      const lvl = m[1].length, num = ctx.heading(lvl), id = 'h' + ctx.blockId + '_' + i;
      ctx.toc.push({ lvl, num, text: m[2], id });
      out += `<h${lvl + 1} id="${id}" class="hd"><span class="hn">${num}</span>${richText(m[2], ctx.scope, true)}</h${lvl + 1}>`;
    } else buf.push(l);
  });
  flush();
  return out;
}

// ---------- referencias normativas ----------
// Un paréntesis final que cita una norma, p. ej. «(E.060 9.3.2)», «(ACI 318-19 22.5)», «(NCh433 Tabla 6.1)»
const NORM_RX = /(\bE\.?\s?0\d\d\b|\bACI\b|\bAISC\b|\bAISI\b|\bAASHTO\b|\bASCE\b|\bNCh\s?\d|\bD\.?S\.?\s?N?°?\s?\d|\bNTE\b|\bRNE\b|\bArt[íi]?c?u?l?o?\.?\s?\d|\bTabla\b|\bEc\.|§|\bAnexo\b|\bNotif\.|\bOrder\b|\bAIJ\b|\bPCA\b|\bFEMA\b|\bCIRSOC\b|\bNSR\b|\bEN\s?19|\bEurocódigo\b|\bcap\.|\bsec\.|\bcl\.)/i;
export function splitRef(s) {
  const m = /\(([^()]{2,70})\)\s*\.?\s*$/.exec(s || '');
  if (!m || !/\d/.test(m[1])) return null;
  const r = NORM_RX.exec(m[1]); if (!r || r.index > 2) return null; // la cita empieza por la norma o el artículo
  let ref = m[1].trim(), text = s.slice(0, m.index).replace(/[\s,;:—–-]+$/, '');
  const k = ref.search(/;\s/); // «Art. 33.2; la regularidad se verifica…» → la nota vuelve al texto
  if (k > 0) { text += (text ? ' ' : '') + '(' + ref.slice(k + 1).trim() + ')'; ref = ref.slice(0, k).trim(); }
  return { text, ref };
}
const refSpan = (r) => `<span class="nref">${r}</span>`;
function polish(h) {
  if (!h) return h;
  // comentario de línea: descripción + referencia normativa en el margen
  h = h.replace(/<div class="cm">([\s\S]*?)<\/div>/g, (all, inner) => {
    const k = inner.search(/<span class="(?:ok|bad|nvb)"/);
    const lab = k >= 0 ? inner.slice(0, k) : inner, rest = k >= 0 ? inner.slice(k) : '';
    if (/<div/.test(lab)) return all;
    const sp = splitRef(lab.replace(/\s+$/, ''));
    const L = sp ? (sp.text ? `<span class="cmt">${sp.text}</span>` : '') + refSpan(sp.ref) : (lab.trim() ? `<span class="cmt">${lab.trim()}</span>` : '');
    return `<div class="cm">${L}${rest ? `<span class="cst">${rest}</span>` : ''}</div>`;
  });
  // verificaciones con ancla (para enlazarlas desde el resumen)
  h = h.replace(/<div class="ln chk (cok|cbad)" data-b="([^"]*)" data-l="(\d+)">/g, (m, c, b, l) => `<div class="ln chk ${c}" id="v${b}_${l}" data-b="${b}" data-l="${l}">`);
  // rótulo de figuras y tablas
  h = h.replace(/<div class="cap">(Figura|Tabla) (\d+)(?::\s*)?/g, (m, k, n) => `<div class="cap"><span class="capn">${k} ${n}</span>${m.includes(':') ? ' ' : ''}`);
  return h;
}

// ---------- resumen de verificaciones ----------
const ratioOf = (c) => (c.ratio !== null && c.ratio !== undefined && isFinite(c.ratio) ? c.ratio : null);
const stateOf = (c) => (c.ok ? 'ok' : c.nv ? 'nv' : 'bad');
const badgeOf = (c) => (c.ok ? '<span class="ok">✔ CUMPLE</span>' : c.nv ? '<span class="nvb">⚠ NO VERIFICABLE</span>' : '<span class="bad">✘ NO CUMPLE</span>');
export function dcBar(r) {
  if (r === null) return '<span class="dcna">—</span>';
  const w = Math.min(100, Math.max(0, r * 100 / 1.25));
  const k = r > 1 ? 'hi' : r > 0.9 ? 'mid' : 'lo';
  return `<div class="dcbar ${k}"><b><i style="width:${w.toFixed(1)}%"></i><u></u></b><span>${r.toFixed(2)}</span></div>`;
}
export function summaryHtml(checks, nerr = 0) {
  if (!checks.length) return '<div class="ph">No hay verificaciones en el documento.</div>';
  const ok = checks.filter(c => c.ok).length, nv = checks.filter(c => c.nv).length, bad = checks.length - ok - nv;
  const big = bad ? `<div class="sumbig bad">✘ ${bad} VERIFICACIÓN(ES) NO CUMPLEN</div>` : (nv || nerr) ? `<div class="sumbig nv">⚠ MEMORIA INCOMPLETA: ${nv ? nv + ' verificación(es) no verificable(s)' : nerr + ' error(es) de cálculo'}</div>` : '<div class="sumbig ok">✔ TODAS LAS VERIFICACIONES CUMPLEN</div>';
  // orden: no cumple → no verificable → D/C descendente → orden del documento
  const rank = { bad: 0, nv: 1, ok: 2 };
  const rows = checks.map((c, i) => ({ c, i, r: ratioOf(c), s: stateOf(c) }))
    .sort((a, b) => rank[a.s] - rank[b.s] || (b.r ?? -1) - (a.r ?? -1) || a.i - b.i);
  const gov = rows.find(x => x.r !== null && x.s !== 'nv') || rows[0];
  const maxR = gov && gov.r !== null ? gov.r : null;
  const lab = (c) => { const sp = splitRef(c.label); return sp ? { t: sp.text || c.label, ref: sp.ref } : { t: c.label, ref: '' }; };
  const secTxt = (c) => (c.sub || c.sec) ? esc(((c.sub || c.sec).num || '').replace(/\.$/, '')) : '';
  const secTitle = (c) => (c.sub || c.sec) ? richText((c.sub || c.sec).text, new Map(), true) : '';
  const g = gov ? lab(gov.c) : null;
  let h = `<div class="sumbox sumhead">${big}<div class="sumstats">`
    + `<div><b>${checks.length}</b><span>verificaciones</span></div>`
    + `<div class="s-ok"><b>${ok}</b><span>cumplen</span></div>`
    + `<div class="s-bad${bad ? ' on' : ''}"><b>${bad}</b><span>no cumplen</span></div>`
    + (nv ? `<div class="s-nv on"><b>${nv}</b><span>no verificables</span></div>` : '')
    + `<div class="s-max"><b>${maxR === null ? '—' : maxR.toFixed(2)}</b><span>D/C máximo</span></div></div>`
    + (gov && maxR !== null ? `<div class="sumgov"><span class="govt">Gobierna</span> ${richText(g.t, new Map(), true)}${g.ref ? ' ' + refSpan(esc(g.ref)) : ''}${secTxt(gov.c) ? ` <span class="govs">— § ${secTxt(gov.c)}</span>` : ''}</div>` : '')
    + `<div class="sumnote">${ok} de ${checks.length} verificaciones conformes · ordenadas de mayor a menor demanda/capacidad (D/C); D/C ≤ 1,00 cumple.</div></div>`;
  h += '<table class="tbl sum"><thead><tr><th class="c-n">#</th><th class="c-v">Verificación</th><th class="c-r">Referencia</th><th class="c-s">Sección</th><th class="c-d">D/C</th><th class="c-e">Estado</th></tr></thead><tbody>';
  rows.forEach((x, k) => {
    const l = lab(x.c), id = x.c.line !== undefined && x.c.line !== null ? `v${x.c.block}_${x.c.line}` : '';
    const isGov = x === gov && maxR !== null;
    h += `<tr class="r-${x.s}${isGov ? ' gov' : ''}" data-gob="${esc(x.c.block || '')}" data-gol="${x.c.line ?? ''}"><td class="c-n">${k + 1}</td><td class="c-v">${id ? `<a href="#${id}">` : ''}${richText(l.t, new Map(), true)}${id ? '</a>' : ''}${isGov ? ' <span class="govt">gobierna</span>' : ''}</td><td class="c-r">${l.ref ? esc(l.ref) : '—'}</td><td class="c-s"${secTitle(x.c) ? ` title="${esc(String((x.c.sub || x.c.sec).text))}"` : ''}>${secTxt(x.c) || '—'}</td><td class="c-d">${dcBar(x.r)}</td><td class="c-e">${badgeOf(x.c)}</td></tr>`;
  });
  return h + '</tbody></table>';
}

// ---------- índice ----------
function tocHtml(toc, checks = []) {
  const stat = (t) => {
    const cs = checks.filter(c => c.sec === t);
    if (!cs.length || t.sum) return '';
    const bad = cs.filter(c => !c.ok && !c.nv).length, nv = cs.filter(c => c.nv).length;
    const rs = cs.map(ratioOf).filter(r => r !== null), mx = rs.length ? Math.max(...rs) : null;
    const st = bad ? `<em class="tbad">✘ ${bad} no cumple${bad > 1 ? 'n' : ''}</em>` : nv ? `<em class="tnv">⚠ ${nv} sin verificar</em>` : '<em class="tok">✔</em>';
    return `<span class="tst">${cs.length} verif.${mx !== null ? ` · D/C máx ${mx.toFixed(2)}` : ''} ${st}</span>`;
  };
  return '<div class="toc"><h2 class="toct">Contenido</h2><div class="tocl">' + toc.filter(t => t.lvl <= 2).map(t => `<a href="#${t.id}" class="tl${t.lvl}"><span class="tn">${esc(t.num)}</span><span class="tt">${richText(t.text, new Map(), true)}</span>${t.lvl === 1 ? stat(t) : ''}</a>`).join('') + '</div></div><div class="pb"></div>';
}

// ---------- portada ----------
function coverHtml(doc) {
  const m = doc.meta || {};
  const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : '';
  const sig = (rol, name, extra) => `<div class="csig"><div class="csig-r">${rol}</div><div class="csig-s"><span>Firma y sello</span></div><div class="csig-n">${esc(name || '')}</div><div class="csig-c">${extra ? esc(extra) : '&nbsp;'}</div></div>`;
  const blank = '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>';
  // la portada no lleva pie de página (va en el cuerpo para quedar después de #printcss)
  return `<div class="cover"><style>@page :first{@bottom-left{content:none}@bottom-right{content:none}@bottom-center{content:none}@top-left{content:none}@top-right{content:none}}</style>
    <div class="ctop">${m.logo ? `<img class="clogo" src="${m.logo}" alt="">` : ''}<div class="cfirm">${esc(m.empresa || '')}</div></div>
    <div class="cmain">
      <div class="ckind">MEMORIA DE CÁLCULO ESTRUCTURAL</div>
      <h1 class="ctitle">${esc(m.titulo || 'Memoria de cálculo')}</h1>
      ${m.proyecto ? `<div class="cproj">${esc(m.proyecto)}</div>` : ''}
      <div class="crule"></div>
      <table class="cmeta">${row('Cliente / Entidad', m.cliente)}${row('Ubicación', m.ubicacion)}${row('Normativa', m.normas)}${row('Fecha', m.fecha)}${row('Revisión', m.rev || '0')}</table>
    </div>
    <div class="cfoot">
      <div class="clab">Control de revisiones</div>
      <table class="crev"><thead><tr><th>Rev.</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th><th>Revisó</th><th>Aprobó</th></tr></thead><tbody><tr><td>${esc(m.rev || '0')}</td><td>${esc(m.fecha || '')}</td><td>Emitido para revisión</td><td>${esc(m.autor || '')}</td><td>${esc(m.revisor || '')}</td><td>${esc(m.aprobador || '')}</td></tr>${blank}${blank}</tbody></table>
      <div class="csigs">${sig('Elaboró', m.autor, m.cip)}${sig('Revisó', m.revisor, '')}${sig('Aprobó', m.aprobador, m.cipaprob || '')}</div>
    </div>
  </div><div class="pb"></div>`;
}
void K; void math; void fmtPlain;

// ---------- ajuste de ecuaciones anchas al imprimir ----------
// Una ecuación más ancha que la hoja hace que el navegador reduzca TODA la página
// («ajustar al ancho»). Antes de imprimir se mide cada ecuación con el ancho útil
// de A4: si no cabe junto al margen de referencias, el comentario pasa arriba;
// si aun así no cabe, solo esa ecuación se reduce.
export function fitEquations(root, on = true) {
  if (typeof document === 'undefined') return;
  const paper = root || document.querySelector('#paper') || document.querySelector('.paper');
  if (!paper) return;
  paper.querySelectorAll('.ln.fitw').forEach(l => l.classList.remove('fitw', 'al'));
  paper.querySelectorAll('.ln .eq > .katex[style*="zoom"]').forEach(k => { k.style.zoom = ''; });
  if (!on) return;
  paper.classList.add('fitm');
  const eqs = [...paper.querySelectorAll('.ln .eq')];
  const over = (e) => { const k = e.firstElementChild; return k ? k.getBoundingClientRect().width - e.clientWidth * 0.98 : 0; };
  const wide = eqs.filter(e => over(e) > 1);
  wide.forEach(e => { const ln = e.parentElement; if (!ln.classList.contains('al') && ln.querySelector('.cm')) ln.classList.add('fitw', 'al'); });
  const z = wide.map(e => { const k = e.firstElementChild, w = k.getBoundingClientRect().width, have = e.clientWidth; return w > have * 0.98 && have > 40 ? [k, Math.max(0.42, have * 0.97 / w)] : null; }).filter(Boolean);
  paper.classList.remove('fitm');
  z.forEach(([k, f]) => { k.style.zoom = f.toFixed(3); });
}
if (typeof window !== 'undefined' && !window.__mcFit) {
  window.__mcFit = fitEquations;
  window.addEventListener('beforeprint', () => fitEquations());
  window.addEventListener('afterprint', () => fitEquations(null, false));
}
