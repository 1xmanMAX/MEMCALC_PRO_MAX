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
        if (t) { const num = ctx.heading(1), id = 'h' + b.id + '_s'; ctx.toc.push({ lvl: 1, num, text: t, id }); hd = `<h2 id="${id}" class="hd"><span class="hn">${num}</span>${esc(t)}</h2>`; }
        h = hd + '\u0001SUMMARY\u0001';
      }
      else if (GRAPH[b.type]) h = GRAPH[b.type](b, ctx);
      else if (BLOCKS[b.type]) h = BLOCKS[b.type].render(b, ctx);
      else throw new Error('Tipo de bloque desconocido: ' + b.type);
    } catch (e) {
      ctx.errors.push({ block: b.id, line: 0, msg: errEs(e) });
      h = `<div class="ln lerr"><span>⚠ ${esc(errEs(e))}</span></div>`;
    }
    parts.push({ id: b.id, html: h });
  }
  const sum = summaryHtml(ctx.checks, ctx.errors.length);
  let first = true;
  for (const p of parts) if (p.html.includes('\u0001SUMMARY\u0001')) { p.html = p.html.replace('\u0001SUMMARY\u0001', first ? sum : ''); first = false; }
  const cover = st.cover !== false ? coverHtml(doc) : '';
  const toc = st.toc !== false && ctx.toc.length ? tocHtml(ctx.toc) : '';
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

export function summaryHtml(checks, nerr = 0) {
  if (!checks.length) return '<div class="ph">No hay verificaciones en el documento.</div>';
  const ok = checks.filter(c => c.ok).length, nv = checks.filter(c => c.nv).length, bad = checks.length - ok - nv;
  const big = bad ? `<div class="sumbig bad">✘ ${bad} VERIFICACIÓN(ES) NO CUMPLEN</div>` : (nv || nerr) ? `<div class="sumbig nv">⚠ MEMORIA INCOMPLETA: ${nv ? nv + ' verificación(es) no verificable(s)' : nerr + ' error(es) de cálculo'}</div>` : '<div class="sumbig ok">✔ TODAS LAS VERIFICACIONES CUMPLEN</div>';
  let h = `<div class="sumhead">${big}<div>${ok} de ${checks.length} verificaciones conformes</div></div>`;
  h += '<table class="tbl sum"><thead><tr><th>#</th><th>Verificación</th><th>Demanda / Capacidad</th><th>Estado</th></tr></thead><tbody>';
  checks.forEach((c, i) => {
    const r = c.ratio !== null && c.ratio !== undefined && isFinite(c.ratio) ? c.ratio : null;
    const w = r === null ? 0 : Math.min(100, Math.max(0, r * 100));
    const col = r === null ? '#999' : r <= 0.85 ? '#1a7f37' : r <= 1 ? '#bf8700' : '#d1242f';
    h += `<tr><td>${i + 1}</td><td>${richText(c.label, new Map(), true)}</td><td>${r === null ? '—' : `<div class="dcbar"><i style="width:${(w * 0.72).toFixed(1)}%;background:${col}"></i><span>${r.toFixed(2)}</span></div>`}</td><td>${c.ok ? '<span class="ok">✔ CUMPLE</span>' : c.nv ? '<span class="nvb">⚠ NO VERIFICABLE</span>' : '<span class="bad">✘ NO CUMPLE</span>'}</td></tr>`;
  });
  return h + '</tbody></table>';
}

function tocHtml(toc) {
  return '<div class="toc"><h2 class="toct">Contenido</h2>' + toc.filter(t => t.lvl <= 2).map(t => `<a href="#${t.id}" class="tl${t.lvl}"><span>${esc(t.num)}</span> ${richText(t.text, new Map(), true)}</a>`).join('') + '</div><div class="pb"></div>';
}

function coverHtml(doc) {
  const m = doc.meta || {};
  const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : '';
  return `<div class="cover">
    ${m.logo ? `<img class="clogo" src="${m.logo}" alt="">` : ''}
    <div class="ckind">MEMORIA DE CÁLCULO ESTRUCTURAL</div>
    <h1 class="ctitle">${esc(m.titulo || 'Memoria de cálculo')}</h1>
    ${m.proyecto ? `<div class="cproj">${esc(m.proyecto)}</div>` : ''}
    <table class="cmeta">${row('Proyecto', m.proyecto)}${row('Cliente / Entidad', m.cliente)}${row('Ubicación', m.ubicacion)}${row('Elaborado por', m.autor)}${row('Reg. CIP', m.cip)}${row('Revisado por', m.revisor)}${row('Normativa', m.normas)}${row('Fecha', m.fecha)}${row('Revisión', m.rev)}</table>
    <table class="crev"><thead><tr><th>Rev.</th><th>Fecha</th><th>Descripción</th><th>Elaboró</th><th>Revisó</th></tr></thead><tbody><tr><td>${esc(m.rev || '0')}</td><td>${esc(m.fecha || '')}</td><td>Emitido para revisión</td><td>${esc(m.autor || '')}</td><td>${esc(m.revisor || '')}</td></tr></tbody></table>
    ${m.empresa ? `<div class="cfirm">${esc(m.empresa)}</div>` : ''}
  </div><div class="pb"></div>`;
}
void K; void math;
