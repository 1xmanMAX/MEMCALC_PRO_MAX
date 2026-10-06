// QA visual y editorial de las plantillas de MemoriaCalc (Playwright + Chromium).
//
//   node build.mjs && node tools/qa-render.mjs [filtros…] [opciones]
//
//   filtros: IDs de plantilla (p. ej. wa-voladizo) o módulos con «mod:» (mod:peru, mod:base…).
//            Sin filtros se revisan todas las plantillas. «mod:base» = plantillas de src/templates.js.
//   opciones:
//     --out=DIR      carpeta de salida (por defecto /tmp/qa)
//     --no-shot      no guarda capturas (solo el informe)
//     --tiles        además de la captura completa, guarda la memoria en tramos de ~1300 px
//                    (DIR/tiles/ID-01.png…) más fáciles de revisar a simple vista
//     --figs       guarda además cada figura por separado (DIR/figs/ID-fN.png)
//     --json         imprime el informe completo en JSON por la salida estándar
//
//   Para cada plantilla abre dist/MemoriaCalc.html?plantilla=ID, detecta automáticamente:
//     · errores de KaTeX (span.err) y LaTeX crudo fuera de las fórmulas ($, \comando, ^{, _{)
//     · errores de cálculo (.lerr), valores no disponibles en el texto (.ierr)
//     · «NaN», «Infinity», «undefined», «null», «[object …]»
//     · restos numéricos absurdos (×10^{-12} o menores, 1e-15…) y ceros negativos (−0.00)
//     · textos SVG solapados entre sí o fuera del área visible de la figura
//     · ecuaciones más anchas que la hoja (con barra de desplazamiento) y tablas que desbordan
//     · caracteres no latinos (kanji/kana) o símbolos de riesgo (˚, º tras número, ⌀, �…)
//     · palabras frecuentes sin tilde, palabras duplicadas y anglicismos habituales
//     · figuras sin leyenda, títulos sin contenido, ausencia del resumen de verificaciones
//   y guarda una captura de la memoria completa (modo --paper de tools/shot.mjs) en DIR/ID.png.
//   El informe se escribe en DIR/report.json y se resume por consola.
import { chromium } from '../node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const filters = args.filter(a => !a.startsWith('--'));
const OUT = String(opts.out || '/tmp/qa');
fs.mkdirSync(OUT, { recursive: true });
if (opts.tiles) fs.mkdirSync(path.join(OUT, 'tiles'), { recursive: true });

// ---- lista de plantillas (id → módulo)
const MODS = ['peru', 'chile', 'japan', 'concrete', 'geotech', 'walls', 'bridges', 'steel', 'analysis', 'masonry', 'dynamics', 'extras'].filter((v, i, a) => a.indexOf(v) === i);
const modOf = new Map();
// (si un módulo no carga —p. ej. otro desarrollador lo está editando— se extraen los id con una expresión regular)
const idsOf = (file) => [...fs.readFileSync(file, 'utf8').matchAll(/^\s*id: '([\w-]+)'/gm)].map(m => m[1]);
let todo = [];
for (const m of MODS) {
  const file = path.join(ROOT, 'src/templates', m + '.js');
  let ids;
  try { ids = (await import(pathToFileURL(file).href)).default.map(t => t.id); } catch (e) { console.log(`(aviso) ${m}.js no carga en Node: ${e.message.split('\n')[0]}`); ids = idsOf(file); }
  for (const id of ids) modOf.set(id, m);
}
for (const id of idsOf(path.join(ROOT, 'src/templates.js'))) todo.push({ id, mod: 'base' });
for (const [id, mod] of modOf) todo.push({ id, mod });
if (filters.length) todo = todo.filter(t => filters.some(f => f.startsWith('mod:') ? t.mod === f.slice(4) : t.id === f));
if (!todo.length) { console.log('Ninguna plantilla coincide con', filters.join(' ')); process.exit(1); }

const HTML = path.join(ROOT, 'dist/MemoriaCalc.html');
if (!fs.existsSync(HTML)) { console.log('Falta dist/MemoriaCalc.html: ejecute «node build.mjs»'); process.exit(1); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('mc_tour', 'done'); } catch (e) { /* */ } });

// ---- análisis dentro de la página
function inspect() {
  const out = [];
  const paper = document.querySelector('#paper');
  if (!paper) return [{ kind: 'error', sev: 'E', msg: 'No se encontró #paper' }];
  const clip = (s, n = 110) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  // sección (título) más cercana anterior al elemento, para ubicar el problema
  const heads = [...paper.querySelectorAll('h2.hd,h3.hd,h4.hd')];
  const where = (el) => {
    let best = '';
    for (const h of heads) { if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = h.textContent; else break; }
    return clip(best, 60);
  };
  const add = (kind, sev, msg, el) => out.push({ kind, sev, msg: clip(msg, 200), at: el ? where(el) : '' });

  // 1) errores de KaTeX / del motor
  paper.querySelectorAll('.err').forEach(e => add('katex', 'E', 'KaTeX no pudo renderizar: ' + e.textContent, e));
  paper.querySelectorAll('.lerr').forEach(e => add('calc', 'E', 'Error de cálculo: ' + e.textContent, e));
  paper.querySelectorAll('.ierr').forEach(e => add('calc', 'E', 'Valor no disponible en el texto: ' + e.textContent, e));
  paper.querySelectorAll('.katex-error').forEach(e => add('katex', 'E', 'katex-error: ' + e.textContent, e));

  // 2) texto visible fuera de KaTeX (párrafos, comentarios, tablas, SVG)
  const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement;
    if (!p || p.closest('.katex,.katex-display,code,pre,style,script,.cover,.toc,.runhead')) continue;
    const s = n.nodeValue; if (!s.trim()) continue;
    texts.push({ s, el: p, svg: !!p.closest('svg') });
  }
  // textos TeX (fuente de cada fórmula)
  const tex = [...paper.querySelectorAll('annotation[encoding="application/x-tex"]')].map(a => ({ s: a.textContent, el: a }));

  const seen = new Set();
  const once = (kind, sev, msg, el) => { const k = kind + msg; if (seen.has(k)) return; seen.add(k); add(kind, sev, msg, el); };
  const SAFE = /[\u0009\u000a\u000d -~ -ÿΑ-ωᴀ-ᶿℓ̀-ͯȳ⅐-⅟†‡ϑϕϵ  ​‐-―‘-„•…′″⁄⁰-ₜ←-↕⇒∀-⋿≤≥⌀-⌒■-◿☐-☒✓-✘⚠─-╿·−⁡ıŒœŠš™€ΔΣΦΩ]/;
  const NOACCENT = /\b(seccion|calculo|calculos|analisis|segun|tambien|minimo|minima|maximo|maxima|numero|razon|direccion|compresion|traccion|flexion|torsion|revision|verificacion|combinacion|ecuacion|funcion|relacion|condicion|solicitacion|cimentacion|deformacion|area|areas|basico|critico|unico|unica|tecnico|tecnica|geometria|metodo|modulo|angulo|diametro|perimetro|parametro|parametros|dinamico|dinamica|sismico|sismica|estatico|estatica|elastico|elastica|plastico|plastica|ultimo|ultima|teorico|empirico|empirica|tipico|tipica|transicion|reduccion|distribucion|excitacion|aceleracion|regimen|indice|carateristica|caracteristica|caracteristicas|especifico|categoria|clasificacion|presion|tension|friccion|cohesion|adhesion|rotacion|traslacion|vibracion|disipacion|ductil|fragil|util|facil|dificil|nucleo|bovedas?|tunel|vehiculo|camion)\b/i;
  const ANGL = /\b(check|input|output|default|layout|performance|shear|moment|load|span|deck|girder|footing|bolt|weld|spacing|strength|design|buckling|bearing|slab|wall|beam|column|bracing|stiffness|drift|story|plot|fix|tips?)\b/i;
  for (const { s, el, svg } of texts) {
    if (/\bNaN\b/.test(s)) once('valor', 'E', '«NaN» en el texto: ' + s, el);
    if (/Infinity|∞/.test(s)) once('valor', 'E', '«Infinity» en el texto: ' + s, el);
    if (/\bundefined\b|\bnull\b|\[object /.test(s)) once('valor', 'E', 'undefined/null en el texto: ' + s, el);
    if (/\d(\.\d+)?e[-+]?\d{1,3}\b/i.test(s)) once('valor', 'W', 'Número en notación e (posible resto numérico): ' + s, el);
    if (/(^|[^\d.])[-−]0[.,]0+(?![\d]*[1-9])\b/.test(s)) once('valor', 'W', 'Cero negativo: ' + s, el);
    if (!svg && /\$|\\[a-zA-Z]{2,}|\^\{|_\{/.test(s)) once('latex', 'E', 'LaTeX crudo en el texto: ' + s, el);
    if (svg && /\\[a-zA-Z]{2,}|\^\{|_\{/.test(s)) once('latex', 'E', 'LaTeX crudo en la figura: ' + s, el);
    if (/[぀-ヿ㐀-鿿豈-﫿＀-￯]/.test(s)) once('glifo', 'W', 'Caracteres japoneses (requieren fuente CJK): ' + s, el);
    if (/˚/.test(s)) once('glifo', 'E', '«˚» (anillo) en lugar de «°»: ' + s, el);
    if (/\dº/.test(s)) once('glifo', 'W', '«º» (ordinal) usado como grado: ' + s, el);
    if (/[⌀�]/.test(s)) once('glifo', 'E', 'Símbolo con riesgo de no mostrarse (⌀ o �): ' + s, el);
    for (const ch of s) if (!SAFE.test(ch) && !/[぀-ヿ㐀-鿿＀-￯]/.test(ch)) { once('glifo', 'W', `Carácter poco común «${ch}» (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}): ` + s, el); break; }
    const m = NOACCENT.exec(s.replace(/[\w-]*-[\w-]+/g, '')); if (m && !el.closest('a,.nref')) once('orto', 'W', `Posible falta de tilde «${m[1]}»: ` + s, el);
    const d = /(?<!\p{L})(\p{L}{2,})\s+\1(?!\p{L})/u.exec(s); if (d && !/^(\d|la|lo)$/i.test(d[1])) once('orto', 'W', `Palabra repetida «${d[1]} ${d[1]}»: ` + s, el);
    const a = ANGL.exec(s); if (a && !svg && !el.closest('.nref,em,i')) once('estilo', 'I', `Posible anglicismo «${a[1]}»: ` + s, el);
  }
  for (const { s, el } of tex) {
    if (/\\mathrm\{NaN\}|NaN/.test(s)) once('valor', 'E', 'NaN en fórmula: ' + s, el);
    if (/Infinity|\\infty/.test(s)) once('valor', 'W', 'Infinito en fórmula: ' + s, el);
    if (/undefined/.test(s)) once('valor', 'E', 'undefined en fórmula: ' + s, el);
    if (/10\^\{\s*[-−]\s*(1[2-9]|[2-9]\d)\s*\}/.test(s)) once('valor', 'E', 'Resto numérico absurdo (×10⁻¹²…) en: ' + s, el);
    if (/(^|[=(\s,])[-−]\s*0\.0+(?!\d*[1-9])(\s|\\|$|\})/.test(s)) once('valor', 'W', 'Cero negativo en fórmula: ' + s, el);
    if (/[぀-ヿ㐀-鿿]/.test(s)) once('glifo', 'W', 'Kanji dentro de una fórmula: ' + s, el);
    { const um = /(?:^|[^\d.])(0\.00\d+)\\,\\mathrm\{(kgf\/cm\^\{2\}|tonf\/m\^\{2\}|MPa|m)\}/.exec(s); if (um) once('unidad', 'W', `Valor muy pequeño para la unidad mostrada (${um[1]} ${um[2]}); conviene otra unidad: ` + s, el); }
  }

  // 3) geometría: ecuaciones, tablas y figuras
  const pr = paper.getBoundingClientRect();
  const cs = getComputedStyle(paper);
  const innerR = pr.right - parseFloat(cs.paddingRight);
  // al imprimir, fitEquations (docrun.js) reduce con «zoom» las ecuaciones que no caben (mínimo 0.42):
  // se simula aquí y se informa el factor; < 0.75 se considera ilegible en papel.
  if (window.__mcFit) window.__mcFit();
  paper.querySelectorAll('.ln .eq').forEach(e => {
    const k = e.firstElementChild; const z = k && k.style.zoom ? parseFloat(k.style.zoom) : 1;
    const src = (e.querySelector('annotation')?.textContent || e.textContent).replace(/^\\displaystyle\s*/, '');
    if (z < 0.75) add('ancho', 'E', `Ecuación demasiado ancha: al imprimir se reduce al ${Math.round(z * 100)} %: ` + src, e);
    else if (z < 0.9) add('ancho', 'W', `Ecuación ancha: al imprimir se reduce al ${Math.round(z * 100)} %: ` + src, e);
    else if (e.scrollWidth > e.clientWidth + 2 && z === 1) add('ancho', 'W', `Ecuación más ancha que la hoja en pantalla (${e.scrollWidth} > ${e.clientWidth} px): ` + src, e);
  });
  paper.querySelectorAll('.katex-display').forEach(e => { if (e.scrollWidth > e.clientWidth + 2) add('ancho', 'E', 'Fórmula de bloque más ancha que la hoja: ' + (e.querySelector('annotation')?.textContent || ''), e); });
  paper.querySelectorAll('table').forEach(t => {
    if (t.closest('.cover,.toc') || t.classList.contains('pt')) return;
    const r = t.getBoundingClientRect();
    const par = t.parentElement;
    if (r.right > innerR + 2 || t.scrollWidth > t.clientWidth + 2 || (par && par.scrollWidth > par.clientWidth + 2 && getComputedStyle(par).overflowX !== 'visible'))
      add('tabla', 'E', `Tabla desborda la hoja (${Math.round(r.width)} px, borde ${Math.round(r.right - innerR)} px fuera): ` + t.textContent.slice(0, 80), t);
    // celdas cuyo contenido no cabe
    t.querySelectorAll('td,th').forEach(c => { if (c.scrollWidth > c.clientWidth + 3 && c.clientWidth > 0) once('tabla', 'W', 'Celda con contenido recortado: ' + c.textContent, c); });
  });
  // otros elementos que se salen de la hoja (figuras, bloques)
  paper.querySelectorAll('.figure svg, .md img, .figure img').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > innerR + 2) add('ancho', 'E', `Figura se sale de la hoja (${Math.round(r.right - innerR)} px)`, e); });

  let nfig = 0;
  paper.querySelectorAll('.figure').forEach(fig => {
    nfig++;
    const cap = fig.querySelector('.cap');
    if (!cap || !cap.textContent.trim()) add('figura', 'W', 'Figura sin leyenda', fig);
    fig.querySelectorAll('svg').forEach((svg, si) => {
      const sr = svg.getBoundingClientRect();
      if (sr.width < 5) return;
      const capt = clip(cap?.textContent || ('figura ' + nfig), 50);
      const T = [...svg.querySelectorAll('text')].map(t => ({ t, r: t.getBoundingClientRect(), s: t.textContent.trim() }))
        .filter(o => o.s && o.r.width > 0.5 && o.r.height > 0.5 && getComputedStyle(o.t).visibility !== 'hidden' && o.t.getAttribute('opacity') !== '0');
      for (const o of T) {
        const tol = 1.5;
        if (o.r.left < sr.left - tol || o.r.right > sr.right + tol || o.r.top < sr.top - tol || o.r.bottom > sr.bottom + tol)
          once('svg', 'E', `[${capt}] Texto fuera del área de la figura: «${o.s}» (${Math.round(Math.max(sr.left - o.r.left, o.r.right - sr.right, sr.top - o.r.top, o.r.bottom - sr.bottom))} px)`, fig);
      }
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
        const a = T[i].r, b = T[j].r;
        // reducir la caja vertical (la caja de texto incluye interlineado)
        const ah = a.height * 0.2, bh = b.height * 0.2;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom - ah, b.bottom - bh) - Math.max(a.top + ah, b.top + bh);
        if (w <= 1 || h <= 1) continue;
        const ov = w * h, mn = Math.min(a.width * a.height * 0.6, b.width * b.height * 0.6);
        if (ov > 0.12 * mn && ov > 6) once('svg', 'E', `[${capt}] Textos superpuestos: «${T[i].s}» / «${T[j].s}» (${Math.round(100 * ov / mn)} %)`, fig);
      }
    });
  });

  // 4) estructura: títulos vacíos, resumen, verificaciones que no cumplen
  const hs = [...paper.querySelectorAll('section.blk h2.hd, section.blk h3.hd, section.blk h4.hd')];
  for (let i = 0; i < hs.length; i++) {
    let n = hs[i].nextElementSibling;
    const nextIsHead = n && /^H[234]$/.test(n.tagName) && n.classList.contains('hd');
    const lastInBlock = !n;
    if (nextIsHead && (n.tagName <= hs[i].tagName)) add('estructura', 'W', 'Título sin contenido: ' + hs[i].textContent, hs[i]);
    else if (lastInBlock && hs[i].tagName !== 'H2') {
      const nb = hs[i].closest('section.blk')?.nextElementSibling;
      const f = nb && nb.firstElementChild;
      if (!f || (/^H[234]$/.test(f.tagName) && f.tagName <= hs[i].tagName)) add('estructura', 'W', 'Título sin contenido: ' + hs[i].textContent, hs[i]);
    }
  }
  const sum = paper.querySelector('.tbl.sum, .sum');
  if (!sum) add('estructura', 'W', 'La memoria no tiene resumen de verificaciones');
  const bad = paper.querySelectorAll('.tbl.sum .bad, .tbl.sum .r-bad, .chk.bad').length;
  if (bad) add('verif', 'E', `${bad} verificación(es) no cumplen con los datos por defecto`);
  const nchk = paper.querySelectorAll('.chk').length;
  return { issues: out, stats: { figs: nfig, eqs: paper.querySelectorAll('.ln').length, checks: nchk, h: Math.round(pr.height) } };
}

const PAPER_CSS = 'html,body,#app{height:auto!important;overflow:visible!important}.main{display:block!important}.left,.split,.sbar,.bnav,.top{display:none!important}.right{display:block!important;overflow:visible!important;height:auto!important}';
const report = [];
const t0 = Date.now();
for (const t of todo) {
  const page = await ctx.newPage();
  const perr = [];
  page.on('pageerror', e => perr.push(e.message));
  page.on('console', m => { if (m.type() === 'error') perr.push('console: ' + m.text()); });
  let res;
  try {
    await page.goto(pathToFileURL(HTML).href + '?plantilla=' + encodeURIComponent(t.id));
    await page.waitForSelector('#paper section.blk', { timeout: 15000 });
    // esperar a que la vista previa se estabilice
    let last = -1;
    for (let k = 0; k < 20; k++) { await page.waitForTimeout(250); const n = await page.evaluate(() => document.querySelector('#paper')?.innerHTML.length || 0); if (n === last) break; last = n; }
    await page.evaluate(() => document.querySelectorAll('.ov,.toast').forEach(o => o.remove()));
    await page.addStyleTag({ content: PAPER_CSS });
    // sin content-visibility:auto (style.css): las secciones fuera de pantalla no se pintan ni se miden
    await page.evaluate(() => document.querySelector('#paper')?.classList.add('cvoff'));
    await page.waitForTimeout(300);
    res = await page.evaluate(inspect);
    for (const e of perr) res.issues.push({ kind: 'js', sev: 'E', msg: e.slice(0, 200), at: '' });
    if (!opts['no-shot']) {
      const loc = page.locator('#paper');
      await loc.screenshot({ path: path.join(OUT, t.id + '.png'), timeout: 120000 });
      if (opts.figs) {
        fs.mkdirSync(path.join(OUT, 'figs'), { recursive: true });
        const figs = page.locator('#paper .figure');
        const n = await figs.count();
        for (let k = 0; k < n; k++) await figs.nth(k).screenshot({ path: path.join(OUT, 'figs', `${t.id}-f${k + 1}.png`), timeout: 30000 }).catch(() => {});
      }
      if (opts.tiles) {
        const bb = await loc.boundingBox();
        const TH = 1300; let k = 0;
        for (let y = 0; y < bb.height; y += TH) {
          k++;
          await page.screenshot({ path: path.join(OUT, 'tiles', `${t.id}-${String(k).padStart(2, '0')}.png`), fullPage: true, clip: { x: bb.x, y: bb.y + y, width: bb.width, height: Math.min(TH, bb.height - y) } });
        }
      }
    }
  } catch (e) {
    res = { issues: [{ kind: 'js', sev: 'E', msg: 'No se pudo renderizar: ' + e.message.slice(0, 200), at: '' }, ...perr.map(m => ({ kind: 'js', sev: 'E', msg: m, at: '' }))], stats: {} };
  }
  await page.close();
  report.push({ ...t, ...res });
  const nE = res.issues.filter(i => i.sev === 'E').length, nW = res.issues.filter(i => i.sev === 'W').length;
  console.log(`${nE ? '✘' : nW ? '·' : '✔'} ${t.id.padEnd(26)} ${String(nE).padStart(3)} E ${String(nW).padStart(3)} W  ${res.stats.figs ?? '-'} fig, ${res.stats.checks ?? '-'} verif.`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const all = report.flatMap(r => r.issues.map(i => ({ id: r.id, ...i })));
const byKind = {};
for (const i of all) byKind[i.kind + '/' + i.sev] = (byKind[i.kind + '/' + i.sev] || 0) + 1;
console.log(`\n${report.length} plantillas en ${((Date.now() - t0) / 1000).toFixed(0)} s. Hallazgos por tipo:`, byKind);
console.log('Informe: ' + path.join(OUT, 'report.json') + (opts['no-shot'] ? '' : ' · capturas: ' + OUT + '/ID.png'));
if (opts.json) console.log(JSON.stringify(report, null, 1));
process.exitCode = all.some(i => i.sev === 'E') ? 1 : 0;
