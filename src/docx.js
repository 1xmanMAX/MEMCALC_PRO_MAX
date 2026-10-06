// =====================================================================
//  Exportación a Word (.docx) real: ecuaciones OMML editables,
//  figuras PNG, tablas, títulos con estilos, índice y numeración de páginas
// =====================================================================
import { zipSync, strToU8 } from 'fflate';
import { mml2omml } from 'mathml2omml';
import katex from 'katex';

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const X = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const ACC = '1F4E79', GRAY = '5D6B78', INK = '1B222B', HDR = 'EEF2F6';
const TEXT_W = 9354; // twips (A4 - márgenes)
const EMU_MAX = Math.round(TEXT_W / 1440 * 914400);

function omml(mathEl) {
  const ann = mathEl.querySelector('annotation');
  if (ann && ann.textContent.includes('\\begin{aligned}')) {
    // Word ajusta solo las ecuaciones largas: se exporta en una sola línea
    const t = ann.textContent.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '').replace(/\\\\\s*&=/g, ' =').replace(/&=/g, '=');
    try { const h = katex.renderToString(t, { output: 'mathml', throwOnError: true, strict: 'ignore' }); const d = new DOMParser().parseFromString(h, 'text/html'); const m2 = d.querySelector('math'); if (m2) mathEl = m2; } catch (e) { /* usa original */ }
  }
  const c = mathEl.cloneNode(true);
  c.querySelectorAll('annotation, annotation-xml').forEach(a => a.remove());
  let s = new XMLSerializer().serializeToString(c);
  try {
    let o = mml2omml(s);
    o = o.replace(/<m:argPr><m:scrLvl m:val="0"\/><\/m:argPr>/g, '').replace(/ xmlns:(m|w)="[^"]*"/g, '');
    o = o.replace(/<m:[A-Za-z]+ m:val="(undefined|null|NaN|)"\/>/g, '').replace(/<w:rPr\/>/g, '').replace(/<m:rPr><\/m:rPr>/g, '');
    o = o.replace(/(<m:t(?:\s[^>]*)?>)([\s\S]*?)(<\/m:t>)/g, (q, a, t, c) => a + X(t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) + c);
    return o;
  } catch (e) { return run(mathEl.textContent, {}); }
}
function rPr(f) {
  let p = '';
  if (f.font) p += `<w:rFonts w:ascii="${f.font}" w:hAnsi="${f.font}"/>`;
  if (f.b) p += '<w:b/>';
  if (f.i) p += '<w:i/>';
  if (f.color) p += `<w:color w:val="${f.color}"/>`;
  if (f.sz) p += `<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`;
  if (f.shd) p += `<w:shd w:val="clear" w:color="auto" w:fill="${f.shd}"/>`;
  return p ? `<w:rPr>${p}</w:rPr>` : '';
}
function run(text, f = {}) { if (!text) return ''; return `<w:r>${rPr(f)}<w:t xml:space="preserve">${X(text)}</w:t></w:r>`; }
function para(content, o = {}) {
  let pp = '';
  if (o.style) pp += `<w:pStyle w:val="${o.style}"/>`;
  if (o.keep) pp += '<w:keepNext/>';
  if (o.pb) pp += '<w:pageBreakBefore/>';
  if (o.spacing !== undefined) pp += `<w:spacing w:before="${o.before || 0}" w:after="${o.spacing}"/>`;
  if (o.jc) pp += `<w:jc w:val="${o.jc}"/>`;
  if (o.shd) pp += `<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>`;
  return `<w:p>${pp ? `<w:pPr>${pp}</w:pPr>` : ''}${content}</w:p>`;
}
const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

// ---------- texto en línea ----------
function inline(node, f = {}) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += run(n.textContent.replace(/\s+/g, ' '), f); continue; }
    if (n.nodeType !== 1) continue;
    const el = n, cls = el.classList, tag = el.tagName.toLowerCase();
    if (cls.contains('katex')) { const m = el.querySelector('math'); if (m) out += omml(m); continue; }
    if (cls.contains('katex-display')) { const m = el.querySelector('math'); if (m) out += omml(m); continue; }
    if (cls.contains('ok')) { out += run(' ✔ CUMPLE ', { b: 1, color: 'FFFFFF', shd: '1A7F37', sz: 18 }); continue; }
    if (cls.contains('nvb')) { out += run(' ⚠ NO VERIFICABLE ', { b: 1, color: 'FFFFFF', shd: 'B26B00', sz: 18 }); continue; }
    if (cls.contains('bad')) { out += run(' ✘ NO CUMPLE ', { b: 1, color: 'FFFFFF', shd: 'C62828', sz: 18 }); continue; }
    if (cls.contains('hn')) { if (el.textContent.trim()) out += run(el.textContent.trim() + '  ', f); continue; }
    if (cls.contains('capn')) { out += run(el.textContent + '. ', { ...f, b: 1, i: 0, color: INK }); continue; }
    if (cls.contains('govt')) { out += run(' ' + el.textContent.toUpperCase() + ' ', { b: 1, color: ACC, sz: 15 }); continue; }
    if (cls.contains('nref')) { out += run(' [' + el.textContent.trim() + ']', { ...f, b: 1, i: 0, color: ACC, sz: 16 }); continue; }
    if (cls.contains('dc')) { out += run('  ' + el.textContent + ' ', { color: GRAY, sz: 18 }); continue; }
    if (tag === 'br') { out += '<w:r><w:br/></w:r>'; continue; }
    if (tag === 'strong' || tag === 'b') { out += inline(el, { ...f, b: 1 }); continue; }
    if (tag === 'em' || tag === 'i') { out += inline(el, { ...f, i: 1 }); continue; }
    if (tag === 'code') { out += run(el.textContent, { ...f, font: 'Consolas', sz: 19 }); continue; }
    if (cls.contains('ierr')) { out += run(el.textContent, { ...f, color: 'C62828' }); continue; }
    out += inline(el, f);
  }
  return out;
}

// ---------- tablas ----------
function tblXml(rows, o = {}) {
  const border = o.noBorder ? '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
    : '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8C2CC"/><w:left w:val="single" w:sz="4" w:color="B8C2CC"/><w:bottom w:val="single" w:sz="4" w:color="B8C2CC"/><w:right w:val="single" w:sz="4" w:color="B8C2CC"/><w:insideH w:val="single" w:sz="4" w:color="B8C2CC"/><w:insideV w:val="single" w:sz="4" w:color="B8C2CC"/></w:tblBorders>';
  const ncol = Math.max(...rows.map(r => r.length));
  const widths = o.widths || Array(ncol).fill(Math.floor(TEXT_W / ncol));
  let x = `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_W}" w:type="dxa"/>${o.center ? '<w:jc w:val="center"/>' : ''}${border}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  rows.forEach((r, ri) => {
    x += `<w:tr>${ri === 0 && o.header ? '<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}`;
    for (let ci = 0; ci < ncol; ci++) {
      const c = r[ci] ?? '';
      const shd = ri === 0 && o.header ? `<w:shd w:val="clear" w:color="auto" w:fill="${HDR}"/>`
        : (o.rowFill && o.rowFill[ri]) ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.rowFill[ri]}"/>` : (o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : '');
      x += `<w:tc><w:tcPr><w:tcW w:w="${widths[ci]}" w:type="dxa"/>${shd}<w:vAlign w:val="center"/></w:tcPr>${c.startsWith('<w:p') ? c : para(c, { jc: o.jc ? o.jc[ci] : 'center', spacing: 20, before: 20 })}</w:tc>`;
    }
    x += '</w:tr>';
  });
  return x + '</w:tbl>' + para('', { spacing: 60 });
}
function htmlTable(t) {
  const rows = [...t.querySelectorAll('tr')].map(tr => [...tr.children].map(td => {
    const bar = td.querySelector('.dcbar');
    if (bar) return run(bar.textContent, { b: 1 });
    return inline(td, td.tagName === 'TH' ? { b: 1, color: '0D3B66' } : {});
  }));
  const hdr = !!t.querySelector('thead, th');
  if (t.classList.contains('sum') && rows[0] && rows[0].length === 6) {
    const trs = [...t.querySelectorAll('tr')];
    return tblXml(rows, { header: hdr, widths: [460, 3900, 1450, 800, 1050, 1694], jc: ['center', 'left', 'center', 'center', 'center', 'center'], rowFill: trs.map(tr => tr.classList.contains('gov') ? 'FBF6E7' : null) });
  }
  return tblXml(rows, { header: hdr });
}

// ---------- imágenes ----------
async function svgToPng(svg, scale = 2.2) {
  const vb = svg.viewBox.baseVal; const w = vb && vb.width ? vb.width : svg.clientWidth || 600, h = vb && vb.height ? vb.height : svg.clientHeight || 300;
  const c = svg.cloneNode(true); c.setAttribute('width', w); c.setAttribute('height', h); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
  const img = await loadImg(src);
  const cv = document.createElement('canvas'); cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
  return { bytes: await canvasBytes(cv), w, h };
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function canvasBytes(cv) { return new Promise(res => cv.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png')); }
async function imgToPng(img) {
  const i = await loadImg(img.src); const cv = document.createElement('canvas'); cv.width = i.naturalWidth; cv.height = i.naturalHeight;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(i, 0, 0);
  return { bytes: await canvasBytes(cv), w: i.naturalWidth, h: i.naturalHeight };
}

export async function buildDocx(root, meta) {
  const media = []; let nid = 1;
  const imgRun = (png, frac = 1) => {
    const id = media.length + 1; media.push(png.bytes);
    let cx = Math.round(EMU_MAX * frac), cy = Math.round(cx * png.h / png.w);
    const maxH = Math.round(8.6 * 914400); if (cy > maxH) { cx = Math.round(cx * maxH / cy); cy = maxH; }
    const did = nid++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${did}" name="Figura ${did}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${did}" name="img${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  };
  let body = '';
  let lnRows = [];
  const flushLn = () => { if (lnRows.length) { body += tblXml(lnRows, { noBorder: true, widths: [Math.round(TEXT_W * 0.70), TEXT_W - Math.round(TEXT_W * 0.70)], jc: ['left', 'right'] }); lnRows = []; } };

  async function walk(el) {
    for (const n of el.children) {
      const cls = n.classList, tag = n.tagName.toLowerCase();
      if (cls.contains('ln')) {
        const eq = n.querySelector('.eq'), cm = n.querySelector('.cm');
        if (cls.contains('lerr')) { body += para(run(n.textContent, { color: 'C62828' })); continue; }
        const chk = cls.contains('chk');
        const fill = cls.contains('cbad') ? 'FDECEC' : cls.contains('cok') ? 'EEF7F0' : null;
        if (cm && !chk) body += para(inline(cm, { i: 1, color: GRAY, sz: 17 }), { keep: 1, spacing: 0, before: 60 });
        else if (cm && chk) { const lab = cm.querySelector('.cmt'), ref = cm.querySelector('.nref'), st = cm.querySelector('.cst'); if (lab || ref) body += para((lab ? inline(lab, { b: 1, sz: 18 }) : '') + (ref ? inline({ childNodes: [ref] }, { sz: 18 }) : ''), { keep: 1, spacing: 0, before: 80, shd: fill }); if (st) { body += `<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="left"/></m:oMathParaPr>${eq && eq.querySelector('math') ? omml(eq.querySelector('math')) : ''}</m:oMathPara></w:p>` + para(inline(st, { b: 1, sz: 18 }), { jc: 'right', spacing: 100, shd: fill }); continue; } }
        const m = eq && eq.querySelector('math');
        const math = m ? omml(m) : '';
        body += `<w:p><w:pPr>${chk ? '' : ''}<w:keepNext w:val="${chk ? 1 : 0}"/><w:spacing w:before="20" w:after="${chk ? 0 : 60}"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="left"/></m:oMathParaPr>${math}</m:oMathPara></w:p>`;
        if (chk && cm) body += para(inline(cm, { b: 1, sz: 18 }), { jc: 'right', spacing: 100, shd: fill });
        continue;
      }
      flushLn();
      if (cls.contains('runhead') || cls.contains('gap') || tag === 'style') continue;
      if (cls.contains('pb')) { body += pageBreak(); continue; }
      if (tag === 'section' || cls.contains('md') || tag === 'div' && (cls.contains('figure') || cls.contains('blk'))) {
        if (cls.contains('figure')) await walkFigure(n); else await walk(n);
        continue;
      }
      if (cls.contains('cover')) { body += coverXml(meta); continue; }
      if (cls.contains('toc')) { body += para(run('CONTENIDO', { b: 1, color: ACC, sz: 28 })) + tocField(); continue; }
      if (/^h[2-5]$/.test(tag)) { const lvl = Math.min(3, +tag[1] - 1); body += para(inline(n), { style: 'Heading' + lvl, keep: 1 }); continue; }
      if (tag === 'p' || cls.contains('txt')) { body += para(inline(n, cls.contains('muted') ? { i: 1, color: GRAY } : {}), { jc: 'both' }); continue; }
      if (tag === 'blockquote') { body += para(inline(n), { shd: 'FFF8E1' }); continue; }
      if (tag === 'ul' || tag === 'ol') { [...n.children].forEach((li, i) => { body += para(run(tag === 'ul' ? '•  ' : (i + 1) + '.  ', {}) + inline(li)); }); continue; }
      if (tag === 'table') { body += htmlTable(n); continue; }
      if (cls.contains('sumhead')) {
        const big = n.querySelector('.sumbig'), col = big && big.classList.contains('bad') ? 'B42318' : big && big.classList.contains('nv') ? '8F5B00' : '1D6B40';
        body += para(run(big ? big.textContent : n.textContent, { b: 1, color: col, sz: 26 }), { spacing: 60, before: 60, keep: 1 });
        const stats = [...n.querySelectorAll('.sumstats > div')].map(d => [d.querySelector('b')?.textContent || '', d.querySelector('span')?.textContent || '']);
        if (stats.length) body += tblXml([stats.map(x => run(x[0], { b: 1, sz: 28, color: INK })), stats.map(x => run(x[1].toUpperCase(), { color: GRAY, sz: 15 }))], { noBorder: true, jc: stats.map(() => 'left') });
        const gov = n.querySelector('.sumgov'); if (gov) body += para(inline(gov, { sz: 19 }), { spacing: 40, keep: 1 });
        const note = n.querySelector('.sumnote'); if (note) body += para(run(note.textContent, { i: 1, color: GRAY, sz: 16 }), { spacing: 120, keep: 1 });
        continue;
      }
      if (cls.contains('ph') || cls.contains('warn')) { body += para(run(n.textContent, { i: 1, color: GRAY })); continue; }
      if (n.children.length) await walk(n); else if (n.textContent.trim()) body += para(inline(n));
    }
    flushLn();
  }
  async function walkFigure(fig) {
    for (const n of fig.children) {
      const cls = n.classList, tag = n.tagName.toLowerCase();
      try {
        if (tag === 'svg') { body += para(imgRun(await svgToPng(n), fig.classList.contains('fig-sm') ? 0.55 : 1), { jc: 'center', keep: 1 }); continue; }
        if (tag === 'img') { const w = parseFloat(getComputedStyle(fig).getPropertyValue('--w')) || 70; body += para(imgRun(await imgToPng(n), Math.min(1, w / 100)), { jc: 'center', keep: 1 }); continue; }
      } catch (e) { body += para(run('[figura no disponible]', { i: 1 })); continue; }
      if (tag === 'table') { body += htmlTable(n); continue; }
      if (cls.contains('cap')) { body += para(inline(n), { style: 'Caption', jc: 'center' }); continue; }
      if (cls.contains('dt')) { body += para(run(n.textContent, { b: 1, color: GRAY, sz: 17 }), { keep: 1 }); continue; }
      if (cls.contains('kv') || cls.contains('legend') || cls.contains('warn')) { body += para(inline(n), { jc: 'center' }); continue; }
      if (n.textContent.trim()) body += para(inline(n));
    }
  }
  await walk(root);

  const hasCover = !!root.querySelector('.cover');
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/>${hasCover ? '<w:titlePg/>' : ''}</w:sectPr>`;
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
  const hdr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${para(run(meta.empresa || meta.proyecto || 'Memoria de cálculo', { b: 1, color: ACC, sz: 16 }) + '<w:r><w:tab/></w:r>' + run(meta.titulo || '', { color: GRAY, sz: 16 }), { style: 'Header' })}</w:hdr>`;
  const fld = (code) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const ftr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${para(run((meta.titulo || '') + (meta.rev ? ' · Rev. ' + meta.rev : ''), { color: GRAY, sz: 16 }) + '<w:r><w:tab/></w:r>' + run('Pág. ', { color: GRAY, sz: 16 }) + fld('PAGE') + run(' de ', { color: GRAY, sz: 16 }) + fld('NUMPAGES'), { style: 'Footer' })}</w:ftr>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${media.map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img${i + 1}.png"/>`).join('')}</Relationships>`;
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(meta.titulo || '')}</dc:title><dc:creator>${X(meta.autor || 'MemoriaCalc')}</dc:creator><dc:subject>${X(meta.proyecto || '')}</dc:subject></cp:coreProperties>`),
    'word/document.xml': strToU8(docXml),
    'word/_rels/document.xml.rels': strToU8(rels),
    'word/styles.xml': strToU8(STYLES),
    'word/settings.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS}><w:updateFields w:val="true"/><w:defaultTabStop w:val="708"/><m:mathPr><m:mathFont m:val="Cambria Math"/><m:dispDef/><m:lMargin m:val="0"/><m:rMargin m:val="0"/><m:defJc m:val="left"/><m:wrapIndent m:val="1440"/><m:intLim m:val="subSup"/><m:naryLim m:val="undOvr"/></m:mathPr></w:settings>`),
    'word/header1.xml': strToU8(hdr),
    'word/footer1.xml': strToU8(ftr),
  };
  media.forEach((m, i) => { files[`word/media/img${i + 1}.png`] = m; });
  return zipSync(files, { level: 6 });
}

function tocField() {
  return `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:i/><w:color w:val="${GRAY}"/></w:rPr><w:t xml:space="preserve">Índice: si no aparece, haga clic derecho aquí y elija «Actualizar campo».</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
}
function coverXml(m) {
  const rows = [['Cliente / Entidad', m.cliente], ['Ubicación', m.ubicacion], ['Normativa', m.normas], ['Fecha', m.fecha], ['Revisión', m.rev || '0']].filter(r => r[1]);
  let x = '';
  if (m.empresa) x += para(run(m.empresa.toUpperCase(), { b: 1, color: INK, sz: 20 }), { jc: 'right', spacing: 0 });
  x += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="3D4854"/></w:pBdr><w:spacing w:after="0"/></w:pPr></w:p>';
  for (let i = 0; i < 5; i++) x += para('');
  x += para(run('MEMORIA DE CÁLCULO ESTRUCTURAL', { b: 1, color: ACC, sz: 20 }), { spacing: 120 });
  x += para(run(m.titulo || 'Memoria de cálculo', { b: 1, color: INK, sz: 52 }), { spacing: 120 });
  if (m.proyecto) x += para(run(m.proyecto, { color: '3D4854', sz: 28 }), { spacing: 360 });
  x += '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="24" w:space="1" w:color="' + ACC + '"/></w:pBdr><w:ind w:right="8300"/><w:spacing w:after="240"/></w:pPr></w:p>';
  if (rows.length) x += tblXml(rows.map(r => [run(r[0].toUpperCase(), { b: 1, color: GRAY, sz: 16 }), run(r[1], { sz: 20 })]), { noBorder: true, widths: [2600, TEXT_W - 2600], jc: ['left', 'left'] });
  for (let i = 0; i < 4; i++) x += para('');
  x += para(run('CONTROL DE REVISIONES', { b: 1, color: '3D4854', sz: 16 }), { spacing: 40, keep: 1 });
  const H = (t) => run(t, { b: 1, sz: 17 }), C = (t) => run(t || '', { sz: 17 });
  x += tblXml([[H('Rev.'), H('Fecha'), H('Descripción'), H('Elaboró'), H('Revisó'), H('Aprobó')], [C(m.rev || '0'), C(m.fecha), C('Emitido para revisión'), C(m.autor), C(m.revisor), C('')], ['', '', '', '', '', ''], ['', '', '', '', '', '']], { header: true, widths: [700, 1700, 2154, 1650, 1650, 1500], jc: ['center', 'left', 'left', 'left', 'left', 'left'] });
  const sig = (rol, name, extra) => para(run(rol.toUpperCase(), { b: 1, color: '3D4854', sz: 15 }), { spacing: 0 }) + para('', { spacing: 0 }) + para('', { spacing: 0 }) + para('', { spacing: 0 }) + para('', { spacing: 0 })
    + '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="3D4854"/></w:pBdr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>' + run('Firma y sello', { i: 1, color: 'A0A9B3', sz: 14 }) + '</w:p>'
    + para(run(name || ' ', { b: 1, sz: 17 }), { spacing: 0 }) + para(run(extra || ' ', { color: GRAY, sz: 16 }), { spacing: 0 });
  const w3 = Math.floor(TEXT_W / 3);
  x += tblXml([[sig('Elaboró', m.autor, m.cip), sig('Revisó', m.revisor, ''), sig('Aprobó', m.aprobador || '', m.cipaprob || '')]], { widths: [w3, w3, TEXT_W - 2 * w3] });
  return x;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-PE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="2" w:color="${ACC}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="${ACC}"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="16202A"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="${GRAY}"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="40" w:after="200"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="${GRAY}"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TEXT_W}"/></w:tabs><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${ACC}"/></w:pBdr><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TEXT_W}"/></w:tabs><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_W}"/></w:tabs><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_W}"/></w:tabs><w:spacing w:after="40"/><w:ind w:left="300"/></w:pPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
