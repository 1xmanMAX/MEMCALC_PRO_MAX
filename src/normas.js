// Biblioteca de normas: carga perezosa del paquete comprimido, búsqueda y resolución de citas
import { gunzipSync, strFromU8 } from 'fflate';
import { NORMAS_INDEX, NORMAS_GZ } from './data/normas.pack.js';
export { NORMAS_INDEX };
let cache = null;
// Descomprime el paquete (solo la primera vez que se abre la biblioteca)
export function loadNormas() {
  if (cache) return cache;
  if (!NORMAS_GZ) return (cache = []);
  try {
    const bin = Uint8Array.from(atob(NORMAS_GZ), c => c.charCodeAt(0));
    cache = JSON.parse(strFromU8(gunzipSync(bin)));
  } catch (e) { cache = []; }
  for (const d of cache) {
    d.secciones = Array.isArray(d.secciones) ? d.secciones : [];
    d.secciones.forEach((s, i) => { s._i = i; s.nivel = +s.nivel || 1; });
  }
  return cache;
}
export const normasLoaded = () => !!cache;
const DIA = new RegExp('[\\u0300-\\u036f]', 'g');
export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(DIA, '');
// términos de búsqueda (sin tildes, ≥ 2 caracteres)
export const searchTerms = (q) => fold(q).split(/\s+/).filter(t => t.length > 1);
// texto plegado (sin tildes) cacheado por sección: la búsqueda en vivo no repite el normalize
const FT = new WeakMap();
function folded(s) {
  let f = FT.get(s);
  if (!f) { f = { t: fold((s.id || '') + ' ' + (s.titulo || '')), x: fold(s.texto || '') }; FT.set(s, f); }
  return f;
}
// Busca en títulos y texto. Devuelve [{doc, sec, score, snippet}] (máx. `limit`)
export function searchNormas(q, opts = {}) {
  const docs = loadNormas().filter(d => !opts.doc || d.id === opts.doc);
  const terms = searchTerms(q);
  if (!terms.length) return [];
  const limit = opts.limit || 600, out = [];
  outer: for (const d of docs) sec: for (const s of d.secciones) {
    const f = folded(s);
    let score = 0;
    for (const t of terms) {
      const a = f.t.includes(t), b = f.x.includes(t);
      if (!a && !b) continue sec;
      score += (a ? 6 : 0) + (b ? 1 + Math.min(3, f.x.split(t).length - 2) * 0.25 : 0);
    }
    if (terms.length > 1 && f.x.includes(terms.join(' '))) score += 3; // frase exacta
    const tx = s.texto || '', i = f.x.indexOf(terms[0]);
    let snippet;
    if (i < 0) snippet = tx.slice(0, 170);
    else { const a = Math.max(0, tx.lastIndexOf(' ', Math.max(0, i - 70)) + 1); snippet = (a > 0 ? '…' : '') + tx.slice(a, i + 120).replace(/\s+/g, ' ') + (i + 120 < tx.length ? '…' : ''); }
    out.push({ doc: d, sec: s, score, snippet: snippet.replace(/\s+/g, ' ').trim() });
    if (out.length >= limit) break outer;
  }
  return out.sort((a, b) => b.score - a.score);
}
// Identificador de sección normalizado: «Art. 28» / «Artículo 28» / «28» → «28»; «Tabla N° 4» → «tabla 4»
const normId = (s) => fold(s).replace(/^cap(?:itulo|\.)?\s*(?=\d)/, 'capitulo ').replace(/\b(art(iculo|\.)?|secc?(ion|\.)?|numeral|inciso)\s*/g, '').replace(/n\s*[°º]\s*/g, '').replace(/[§\s]+/g, ' ').replace(/\s*\.\s*$/, '').trim();
const docAliases = (d) => [d.id, ...(Array.isArray(d.alias) ? d.alias : [])].filter(Boolean);
// Norma citada en un texto (índice ligero, sin descomprimir): la de alias más largo que aparece
export function refDoc(ref, docs = NORMAS_INDEX) {
  const r = fold(ref);
  let best = null, bl = 0;
  for (const d of docs) for (const a of docAliases(d)) {
    const fa = fold(a); if (fa.length < 2 || fa.length <= bl) continue;
    const k = r.indexOf(fa);
    // el alias debe estar delimitado: «E.060» no coincide con «E.0601»
    if (k >= 0 && !/[a-z0-9]/.test(r[k + fa.length] || '') && !/[a-z0-9]/.test(r[k - 1] || '')) { best = { d, k, len: fa.length }; bl = fa.length; }
  }
  return best;
}
// Encuentra la sección de una cita normativa, p. ej. «E.060 9.3.2», «E.030 Art. 28», «NCh433 6.2.3», «E.030-2026 Tabla N° 4».
// Devuelve { doc, sec, exact } o null.
export function findRef(ref) {
  const docs = loadNormas();
  const m0 = refDoc(ref, docs); if (!m0) return null;
  const doc = m0.d, secs = doc.secciones;
  if (!secs.length) return { doc, sec: null, exact: false };
  // resto de la cita sin el alias ni un año de edición pegado («-2026», «:2009», «.Of1996»)
  let rest = fold(ref).slice(m0.k + m0.len).replace(/^\s*(?:[-:]|\.of)\s*\d{2,4}\b/, '').replace(/^[\s,;:—–-]+/, '');
  const tab = /\b(tabla|figura|anexo|apendice|capitulo|cap\.)\s*(?:n\s*[°º]\s*)?([\w.]*\w)/.exec(rest);
  const m = /(\d+(?:\.\d+)*)/.exec(rest);
  // «Tabla 9.1» si aparece antes que un numeral («E.060 12.2.2, Tabla 12.1» → 12.2.2)
  if (tab && (!m || tab.index <= m.index)) {
    const key = (tab[1].startsWith('cap') ? 'capitulo' : tab[1]) + ' ' + tab[2];
    const kw = tab[1].startsWith('cap') ? 'cap(?:itulo|\\.)?' : tab[1];
    const rx = new RegExp('\\b' + kw + '\\s*(?:n\\s*[°º.]?\\s*)?' + tab[2].replace(/\./g, '\\.') + '(?![\\d.]*\\d)');
    const hit = secs.find(s => normId(s.id) === key) || secs.find(s => rx.test(fold(s.id + ' ' + (s.titulo || ''))))
      || secs.find(s => rx.test(fold(s.texto || '')));
    if (hit) return { doc, sec: hit, exact: true };
  }
  if (!m) return { doc, sec: null, exact: !rest.trim() }; // solo la norma: portada
  const num = m[1].replace(/\.$/, ''), parts = num.split('.');
  for (let k = parts.length; k > 0; k--) {
    const p = parts.slice(0, k).join('.');
    const sec = secs.find(s => normId(s.id) === p) || secs.find(s => normId(s.id) === 'capitulo ' + p);
    if (sec) return { doc, sec, exact: k === parts.length, num };
  }
  return { doc, sec: null, exact: false };
}
// Cita corta para copiar: «E.060 Art. 9.3.2»
export function citeOf(doc, sec) {
  if (!sec) return doc.id;
  const id = String(sec.id || '').trim();
  if (!id) return doc.id + ' — ' + (sec.titulo || '');
  const numeric = /^\d+(\.\d+)*[a-z]?$/i.test(id);
  return doc.id + ' ' + (numeric && /^(PE|CL)$/.test(doc.pais) ? 'Art. ' + id : id);
}
