// Biblioteca de normas: carga perezosa del paquete comprimido y búsqueda
import { gunzipSync, strFromU8 } from 'fflate';
import { NORMAS_INDEX, NORMAS_GZ } from './data/normas.pack.js';
export { NORMAS_INDEX };
let cache = null;
export function loadNormas() {
  if (cache) return cache;
  if (!NORMAS_GZ) return (cache = []);
  const bin = Uint8Array.from(atob(NORMAS_GZ), c => c.charCodeAt(0));
  cache = JSON.parse(strFromU8(gunzipSync(bin)));
  return cache;
}
export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Busca en títulos y texto de todas las secciones. Devuelve [{doc, sec, score, snippet}]
export function searchNormas(q, opts = {}) {
  const docs = loadNormas().filter(d => !opts.doc || d.id === opts.doc);
  const terms = fold(q).split(/\s+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  const out = [];
  for (const d of docs) for (const s of d.secciones) {
    const tt = fold((s.id || '') + ' ' + (s.titulo || '')), tx = fold(s.texto || '');
    let score = 0, ok = true;
    for (const t of terms) { const a = tt.includes(t), b = tx.includes(t); if (!a && !b) { ok = false; break; } score += (a ? 5 : 0) + (b ? 1 : 0); }
    if (!ok) continue;
    const i = tx.indexOf(terms[0]);
    const snippet = i < 0 ? (s.texto || '').slice(0, 160) : (s.texto || '').slice(Math.max(0, i - 70), i + 110);
    out.push({ doc: d, sec: s, score, snippet });
    if (out.length > 400) break;
  }
  return out.sort((a, b) => b.score - a.score);
}
// Encuentra la sección de una cita normativa, p. ej. «E.060 9.3.2», «E.030 Art. 28», «NCh433 6.2.3»
export function findRef(ref) {
  const docs = loadNormas(), r = fold(ref).replace(/\s+/g, ' ');
  const doc = docs.find(d => (d.alias || [d.id]).concat([d.id]).some(a => r.includes(fold(a))));
  if (!doc) return null;
  const m = /(?:art(?:iculo|\.)?\s*)?(\d+(?:\.\d+)*)/.exec(r.replace(fold(doc.id), ''));
  if (!m) return { doc, sec: doc.secciones[0] };
  const num = m[1];
  let sec = doc.secciones.find(s => s.id === num || s.id === 'Art. ' + num || s.id === 'Artículo ' + num);
  for (let k = num.split('.').length; !sec && k > 0; k--) { const p = num.split('.').slice(0, k).join('.'); sec = doc.secciones.find(s => s.id === p || s.id === 'Art. ' + p); }
  return { doc, sec: sec || doc.secciones[0] };
}
