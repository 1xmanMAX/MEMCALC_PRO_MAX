// Ayudantes para definir plantillas
export const calc = (src) => ({ type: 'calc', src: src.trim() });
export const text = (src) => ({ type: 'text', src: src.trim() });
export const summary = (titulo) => (titulo === undefined ? { type: 'summary' } : { type: 'summary', titulo });
export const pagebreak = () => ({ type: 'pagebreak' });
