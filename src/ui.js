// =====================================================================
//  MemoriaCalc — interfaz de usuario
// =====================================================================
import { runDoc } from './docrun.js';
import { TEMPLATES, CATEGORIES } from './templates.js';
import { K, esc, math, valText, FN_DOCS, CUSTOM_FN } from './engine.js';
import { BLOCKS } from './blockreg.js';

const VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const uid = () => Math.random().toString(36).slice(2, 10);
const debounce = (fn, ms) => { let t, last; const d = (...a) => { last = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); }; d.flush = () => { if (t) { clearTimeout(t); t = null; fn(...(last || [])); } }; return d; };

// ---------------- Iconos ----------------
const I = {
  logo: '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#0b5cad"/><path d="M8 22h16M10 22V12l6-4 6 4v10" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M13.5 22v-5h5v5" stroke="#7cc0ff" stroke-width="2" fill="none"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4H6l6 8-6 8h12"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  beam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 10h20v3H2z"/><path d="M5 13l-2 4h4zM19 13l-2 4h4z"/><path d="M8 4v4M12 4v4M16 4v4" stroke-linecap="round"/></svg>',
  section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="9.5" cy="17.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="17.5" r="1.2" fill="currentColor"/><circle cx="9.5" cy="6.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
  pm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 3v18h17"/><path d="M4 5c9 1 13 6 12 10s-6 5-12 5"/></svg>',
  footing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10 3h4v11h-4z"/><path d="M3 14h18v5H3z"/></svg>',
  wall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 3h3v14h9v4H3v-4h4z"/></svg>',
  spectrum: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M4 14l3-8h4c2 0 3 4 5 7s3 4 5 4"/></svg>',
  plot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M6 16c3-9 6-9 8-4s4 3 6-3"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/></svg>',
  pagebreak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 3v6h14V3M5 21v-6h14v6"/><path d="M3 12h2M8 12h3M13 12h3M19 12h2"/></svg>',
  summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h11l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h0"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
  html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  column: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 3h8v18H8z"/><path d="M8 7h8M8 17h8"/></svg>',
  soil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 10h18"/><path d="M8 4h8v6H8z"/><path d="M5 14l2 2M11 15l2 2M17 14l2 2M7 19l2 1M14 19l2 1"/></svg>',
  slab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 8h20v3H2z"/><path d="M5 11v5h3v-5M11 11v5h3v-5M17 11v5h3v-5"/></svg>',
  quake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/></svg>',
  bridge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 9h20v3H2z"/><path d="M5 12v8M19 12v8M2 20h20"/></svg>',
  steel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h14v3h-5.5v10H19v3H5v-3h5.5V7H5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7z"/></svg>',
  blank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ---------------- Tipos de bloque ----------------
const F = (k, l, ph = '', t = 'text', opt) => ({ k, l, ph, t, opt });
const TYPES = {
  calc: { name: 'Cálculo', icon: 'calc' },
  text: { name: 'Texto', icon: 'text' },
  image: { name: 'Imagen', icon: 'image' },
  beam: {
    name: 'Viga continua', icon: 'beam', fields: [
      F('tramos', 'Longitudes de tramos', '5, 6, 5 m'), F('apoyos', 'Apoyos (A, E, L)', 'A, A, A, A'),
      F('E', 'Módulo de elasticidad E', '2.17e6 tonf/m^2'), F('I', 'Inercia I', 'b*h^3/12'),
      F('cargas', 'Cargas (una por línea)', 'CM: U * 1.4*wD\nCV: U * 1.7*wL\nP 2.5 3 tonf', 'area'),
      F('alternancia', 'Alternancia de carga viva (envolvente)', '', 'check'), F('deflexion', 'Mostrar deformada', '', 'check'),
      F('convencion', 'Convención de momentos', '', 'select', [['traccion', 'Positivo abajo (tracción)'], ['arriba', 'Positivo arriba']]),
      F('sufijo', 'Sufijo de resultados', 'ej. V101'), F('titulo', 'Título de la figura', ''),
    ],
    hint: 'Cargas: <code>U tramo w</code> uniforme (<code>*</code> = todos, <code>1-2</code> rango) · <code>T tramo w1 w2</code> trapezoidal · <code>UP x1 x2 w</code> parcial · <code>P x P</code> puntual · <code>M x M</code> momento. Prefijo <code>CM:</code>/<code>CV:</code> para alternancia. Unidades por defecto t, m. Apoyos: A articulado, E empotrado, L libre. Exporta: <code>Mpos Mneg Vmax deltamax R1… Mpos1… Mapo1…</code>',
    def: { tramos: '5, 6', apoyos: 'A, A, A', E: '2.17e6 tonf/m^2', I: '0.3 m*(0.6 m)^3/12', cargas: 'CM: U * 3.2\nCV: U * 1.4', alternancia: true, deflexion: true },
  },
  section: {
    name: 'Sección C°A°', icon: 'section', fields: [
      F('b', 'Ancho b', '30 cm'), F('h', 'Peralte h', '60 cm'), F('recub', 'Recubrimiento', '4 cm'), F('estribo', 'Estribo #', '3'),
      F('sup', 'Acero superior', '2#5'), F('inf', 'Acero inferior (/ separa capas)', '3#5 + 2#4 / 2#5'), F('lat', 'Barras laterales por cara', '0'),
      F('bf', 'Ancho de ala bf (viga T)', ''), F('hf', 'Espesor de ala hf', ''), F('sest', 'Texto de estribos', '@ 15 cm'), F('titulo', 'Título', ''),
    ],
    hint: 'Barras: <code>3#5 + 2#4</code>, <code>2ø1/2"</code> o <code>4ø12mm</code>. Se permiten valores del cálculo con llaves: <code>{n}#{bar}</code>.',
    def: { b: '30 cm', h: '60 cm', recub: '4 cm', estribo: '3', sup: '2#5', inf: '3#5', lat: '0' },
  },
  pm: {
    name: 'Diagrama P–M', icon: 'pm', fields: [
      F('b', 'Ancho b', '40 cm'), F('h', 'Peralte h (dirección de flexión)', '50 cm'), F('fc', "f'c", '210 kgf/cm^2'), F('fy', 'fy', '4200 kgf/cm^2'),
      F('dp', 'Recubrimiento al eje de barras', '6 cm'), F('nx', 'Barras por cara (b)', '3'), F('ny', 'Barras intermedias por lado', '1'), F('barra', 'Varilla #', '6'),
      F('norma', 'Norma', '', 'select', [['E060', 'NTE E.060'], ['ACI', 'ACI 318-19']]), F('espiral', 'Columna zunchada (espiral)', '', 'check'),
      F('demandas', 'Demandas Pu, Mu (una por línea)', '150 tonf, 12 tonf*m // 1.4CM+1.7CV', 'area'), F('sufijo', 'Sufijo', ''), F('titulo', 'Título', ''),
    ],
    hint: 'Compatibilidad de deformaciones (εcu = 0.003, bloque de Whitney). Exporta <code>DCpm phiPnmax Ast rhog</code> y agrega una verificación por combinación.',
    def: { b: '40 cm', h: '50 cm', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2', dp: '6 cm', nx: '3', ny: '1', barra: '6', norma: 'E060', demandas: '150 tonf, 12 tonf*m // 1.4CM+1.7CV\n100 tonf, 18 tonf*m // 1.25(CM+CV)+CS' },
  },
  footing: {
    name: 'Zapata (dibujo)', icon: 'footing', fields: [
      F('B', 'Ancho B', '2 m'), F('L', 'Largo L', '2.2 m'), F('hz', 'Peralte hz', '0.6 m'), F('c1', 'Columna c1 (dir. L)', '0.5 m'),
      F('c2', 'Columna c2 (dir. B)', '0.4 m'), F('Df', 'Desplante Df', '1.5 m'), F('d', 'Peralte efectivo d (punzonamiento)', ''),
      F('q1', 'Presión q1', '15 tonf/m^2'), F('q2', 'Presión q2', ''), F('acero', 'Texto de refuerzo', 'Malla #5 @ 0.15 m'), F('titulo', 'Título', ''),
    ], def: { B: '2 m', L: '2.2 m', hz: '0.6 m', c1: '0.5 m', c2: '0.4 m', Df: '1.5 m', q1: '15 tonf/m^2', q2: '12 tonf/m^2' },
  },
  wall: {
    name: 'Muro (dibujo)', icon: 'wall', fields: [
      F('H', 'Altura total H', '4 m'), F('B', 'Base B', '2.8 m'), F('hz', 'Espesor zapata', '0.5 m'), F('punta', 'Punta', '0.7 m'),
      F('t1', 'Espesor corona t1', '0.25 m'), F('t2', 'Espesor base t2', '0.4 m'), F('Df', 'Relleno delante', '1 m'),
      F('Ka', 'Ka', '0.333'), F('gs', 'γ suelo', '1.8 tonf/m^3'), F('sc', 'Sobrecarga', '1 tonf/m^2'), F('titulo', 'Título', ''),
    ], def: { H: '4 m', B: '2.8 m', hz: '0.5 m', punta: '0.7 m', t1: '0.25 m', t2: '0.4 m', Df: '1 m', Ka: '0.333', gs: '1.8 tonf/m^3', sc: '1 tonf/m^2' },
  },
  spectrum: {
    name: 'Espectro E.030', icon: 'spectrum', fields: [
      F('Z', 'Z', '0.35'), F('U', 'U', '1.0'), F('S', 'S', '1.15'), F('Tp', 'Tp [s]', '0.6'), F('Tl', 'TL [s]', '2.0'), F('R', 'R', '8'),
      F('T', 'T de la estructura [s]', '0.34'), F('corto', 'Incluir rama T < 0.2Tp (dinámico)', '', 'check'), F('titulo', 'Título', ''),
    ], hint: 'Exporta <code>C</code> y <code>Sa_g</code> para el periodo T indicado.', def: { Z: '0.35', U: '1.0', S: '1.15', Tp: '0.6', Tl: '2.0', R: '8', T: '0.4' },
  },
  plot: {
    name: 'Gráfico', icon: 'plot', fields: [
      F('expr', 'Expresiones y(x) separadas por ;', 'w*x*(L - x)/2', 'text'), F('var', 'Variable', 'x'), F('desde', 'Desde', '0'), F('hasta', 'Hasta', '10'),
      F('puntos', 'Puntos', '200'), F('nombres', 'Nombres de series (;)', 'Serie 1; Serie 2'), F('xlabel', 'Etiqueta eje X', ''), F('ylabel', 'Etiqueta eje Y', ''), F('leyenda', 'Mostrar leyenda', '', 'check'), F('titulo', 'Título', ''),
    ], hint: 'Puede usar cualquier variable o función definida antes. Si la expresión tiene unidades se grafica en la unidad preferida.', def: { expr: 'sin(x)*exp(-x/5)', var: 'x', desde: '0', hasta: '20', puntos: '200' },
  },
  table: {
    name: 'Tabla', icon: 'table', fields: [
      F('columnas', 'Columnas: Encabezado [unidad] = expresión', 'Nivel = 1:4\nFuerza [tonf] = Fi', 'area'), F('dec', 'Decimales', '2'),
      F('total', 'Fila de totales', '', 'check'), F('titulo', 'Título', ''),
    ], hint: 'Cada expresión puede ser un vector (p.ej. <code>[1,2,3]</code>, <code>1:4</code>, o una variable vectorial).', def: { columnas: 'i = 1:5\ni² = (1:5).^2', dec: '2' },
  },
  pagebreak: { name: 'Salto de página', icon: 'pagebreak' },
  summary: { name: 'Resumen de verificaciones', icon: 'summary', fields: [F('titulo', 'Título de la sección (vacío = sin título)', 'Resumen de verificaciones')], hint: 'Tabla automática con todas las verificaciones del documento, su relación demanda/capacidad y estado.' },
};

for (const [k, v] of Object.entries(BLOCKS)) TYPES[k] = { name: v.name || k, icon: v.icon || 'calc', iconSvg: v.iconSvg, fields: v.fields || [], hint: v.hint, def: v.def, group: v.group };
const icon = (T) => (T && T.iconSvg) || I[T && T.icon] || I.calc;
const BASE_ADD = ['calc', 'text', 'image', 'beam', 'section', 'pm', 'footing', 'wall', 'spectrum', 'plot', 'table', 'summary', 'pagebreak'];

// ---------------- Estado ----------------
let doc = null;
let lastRes = null;
let selId = null;
let tab = (() => { try { return localStorage.getItem('mc_tab') || 'datos'; } catch (e) { return 'datos'; } })();
const EMBED = !!window.MC_ARTIFACT;
let mview = 'edit';
const collapsed = new Set();

const DEF_SETTINGS = { dec: 2, sys: 'tec', mode: 'completo', numbering: true, cover: true, toc: true, comma: false };
function newDoc(tpl) {
  const t = tpl || TEMPLATES.find(x => x.id === 'blanco');
  const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  const prev = doc && doc.meta ? doc.meta : loadMetaDefaults();
  return {
    id: uid(), v: 1, created: Date.now(), updated: Date.now(),
    meta: { titulo: t.titulo, proyecto: prev.proyecto || '', cliente: prev.cliente || '', ubicacion: prev.ubicacion || '', autor: prev.autor || '', cip: prev.cip || '', revisor: prev.revisor || '', empresa: prev.empresa || '', normas: t.normas || 'RNE — NTE E.020, E.060', fecha: today, rev: '0', logo: prev.logo || '' },
    settings: { ...DEF_SETTINGS, ...(t.settings || {}) },
    blocks: JSON.parse(JSON.stringify(t.blocks)).map(b => ({ ...b, id: uid() })),
  };
}
function loadMetaDefaults() { try { return JSON.parse(localStorage.getItem('mc_meta') || '{}'); } catch (e) { return {}; } }
function saveMetaDefaults() { try { const m = doc.meta; localStorage.setItem('mc_meta', JSON.stringify({ proyecto: m.proyecto, cliente: m.cliente, ubicacion: m.ubicacion, autor: m.autor, cip: m.cip, revisor: m.revisor, empresa: m.empresa, logo: m.logo })); } catch (e) { /* cuota */ } }

// ---------------- Almacenamiento (IndexedDB) ----------------
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('memoriacalc', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
async function dbOp(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('docs', mode); const st = tx.objectStore('docs'); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
const dbPut = (d) => dbOp('readwrite', s => s.put(d)).catch(() => { });
const dbGet = (id) => dbOp('readonly', s => s.get(id)).catch(() => null);
const dbAll = () => dbOp('readonly', s => s.getAll()).catch(() => []);
const dbDel = (id) => dbOp('readwrite', s => s.delete(id)).catch(() => { });
const autosave = debounce(() => { doc.updated = Date.now(); dbPut(JSON.parse(JSON.stringify(doc))); try { localStorage.setItem('mc_last', doc.id); } catch (e) { /* */ } }, 600);

// ---------------- Cálculo y vista previa ----------------
function compute() {
  const t0 = performance.now();
  lastRes = runDoc(doc);
  const m = doc.meta;
  const head = `<div class="runhead">${m.logo ? `<img src="${m.logo}" alt="">` : ''}<span><b>${esc(m.empresa || m.proyecto || 'Memoria de cálculo')}</b></span><span>${esc(m.titulo || '')}</span><span>${esc(m.fecha || '')} · Rev. ${esc(m.rev || '0')}</span></div>`;
  const paper = $('#paper');
  let td = paper.querySelector('.pt > tbody > tr > td');
  const ids = lastRes.parts.map(p => p.id).join(',');
  if (!td || paper._ids !== ids || paper._head !== head) {
    paper.innerHTML = `<table class="pt"><thead><tr><td>${head}</td></tr></thead><tbody><tr><td><div class="pre-blk"></div>${lastRes.parts.map(p => `<section class="blk" data-b="${p.id}"></section>`).join('')}</td></tr></tbody></table>`;
    paper._ids = ids; paper._head = head; paper._cache = {};
    td = paper.querySelector('.pt > tbody > tr > td');
  }
  const cache = paper._cache;
  if (cache.__head !== lastRes.head) { td.querySelector('.pre-blk').innerHTML = lastRes.head; cache.__head = lastRes.head; }
  const secs = td.querySelectorAll(':scope > section.blk');
  lastRes.parts.forEach((p, i) => { if (cache[p.id] !== p.html) { secs[i].innerHTML = p.html; cache[p.id] = p.html; } });
  updatePrintStyle();
  updateStatus();
  updateInputs();
  updateBlockErrors();
  $('#perf').textContent = Math.round(performance.now() - t0) + ' ms';
  if (follow && !isMobile()) {
    const f = follow; follow = null;
    const el = (f.l !== undefined && document.querySelector(`#paper .ln[data-b="${f.b}"][data-l="${f.l}"]`)) || document.querySelector(`#paper .blk[data-b="${f.b}"]`);
    if (el) {
      const r = el.getBoundingClientRect(), box = $('#right').getBoundingClientRect();
      if (r.top < box.top + 40 || r.top > box.bottom - 80) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (el.classList.contains('ln')) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
  }
}
const recompute = debounce(compute, 140);
const hist = { stack: [], i: -1, lock: false };
const snapshot = debounce(() => {
  if (hist.lock) return;
  const j = JSON.stringify(doc);
  if (hist.stack[hist.i] === j) return;
  hist.stack = hist.stack.slice(0, hist.i + 1); hist.stack.push(j);
  if (hist.stack.length > 80) hist.stack.shift(); hist.i = hist.stack.length - 1;
}, 700);
function resetHistory() { hist.stack = [JSON.stringify(doc)]; hist.i = 0; }
function undoRedo(dir) {
  snapshot.flush?.();
  const ni = hist.i + dir; if (ni < 0 || ni >= hist.stack.length) { toast(dir < 0 ? 'Nada que deshacer' : 'Nada que rehacer'); return; }
  hist.i = ni; hist.lock = true; doc = JSON.parse(hist.stack[ni]); inputsKey = ''; loadUI(); compute(); autosave();
  setTimeout(() => { hist.lock = false; }, 800);
  toast(dir < 0 ? 'Deshecho' : 'Rehecho');
}
function changed(re = true) { autosave(); snapshot(); if (re) recompute(); }

function updatePrintStyle() {
  const t = (doc.meta.titulo || 'Memoria de cálculo').replace(/["\\]/g, '');
  $('#printcss').textContent = `@page{size:A4;margin:14mm 14mm 16mm 18mm;@bottom-right{content:"Pág. " counter(page) " de " counter(pages);font:8pt Segoe UI,Arial;color:#667}@bottom-left{content:"${t}";font:8pt Segoe UI,Arial;color:#667}}`;
  document.title = (doc.meta.titulo || 'Memoria') + ' — MemoriaCalc';
}
function updateStatus() {
  const c = lastRes.ctx.checks, ok = c.filter(x => x.ok).length, bad = c.filter(x => !x.ok && !x.nv).length, err = lastRes.ctx.errors.length;
  $('#chips').innerHTML = (c.length ? `<span class="chip ok" data-go="ok" title="Verificaciones que cumplen">✔ ${ok}</span>` : '') + (bad ? `<span class="chip bad" data-go="bad" title="Verificaciones que no cumplen">✘ ${bad}</span>` : '') + (err ? `<span class="chip err" data-go="err" title="Errores">⚠ ${err}</span>` : '');
}
function updateBlockErrors() {
  document.querySelectorAll('.bk').forEach(el => {
    const id = el.dataset.id, errs = lastRes.ctx.errors.filter(e => e.block === id);
    const box = el.querySelector('.errs'); if (box) box.innerHTML = errs.map(e => `⚠ ${e.line ? 'Línea ' + e.line + ': ' : ''}${esc(e.msg)}`).join('<br>');
    const ta = el.querySelector('textarea.code'); if (ta) paintHL(ta);
  });
}

// ---------------- Panel de datos (entradas automáticas) ----------------
let inputsKey = '';
function updateInputs() {
  const ins = lastRes.ctx.inputs;
  const key = ins.map(i => i.block + ':' + i.line + ':' + i.name + ':' + (i.options ? i.options.join('|') : '')).join(',');
  const pane = $('#p-datos');
  if (key === inputsKey && pane.childElementCount) {
    // solo refrescar valores no enfocados
    ins.forEach(i => { const el = pane.querySelector(`[data-k="${i.block}:${i.line}"]`); if (el && el !== document.activeElement) { if (el.tagName === 'SELECT') el.value = norm(i.num + ' ' + i.unit); else el.value = i.num; } });
    renderCheckStrip();
    return;
  }
  inputsKey = key;
  if (!ins.length) { setTimeout(renderCheckStrip); pane.innerHTML = '<div class="empty">No hay datos de entrada.<br>Escriba en un bloque de cálculo líneas como <code>b = 30 cm // Ancho</code> y aparecerán aquí para editarlas rápidamente.</div>'; return; }
  const groups = [];
  for (const i of ins) {
    let g = groups.find(x => x.block === i.block);
    if (!g) { const t = lastRes.ctx.toc.find(x => x.id.startsWith('h' + i.block + '_')); const b = doc.blocks.find(x => x.id === i.block); g = { block: i.block, title: t ? t.text : (TYPES[b?.type]?.name || 'Datos'), items: [] }; groups.push(g); }
    g.items.push(i);
  }
  pane.innerHTML = groups.map(g => `<div class="ig"><div class="igh"><span>${esc(g.title)}</span><span>${g.items.length}</span></div>${g.items.map(i => {
    const lab = i.label ? esc(i.label.replace(/\$[^$]*\$/g, '').replace(/[*_`]/g, '')) : esc(i.name);
    if (i.options) {
      const cur = norm(i.num + ' ' + i.unit);
      return `<label class="inp" data-name="${esc(i.name)}"><span class="il">${lab}</span><span class="is">${K(i.tex)}</span><select data-k="${i.block}:${i.line}">${i.options.map((o, oi) => `<option value="${esc(norm(o))}"${norm(o) === cur ? ' selected' : ''}>${esc(prettyU(o))}${i.optLabels && i.optLabels[oi] ? ' — ' + esc(i.optLabels[oi]) : ''}</option>`).join('')}${i.options.map(norm).includes(cur) ? '' : `<option value="${esc(cur)}" selected>${esc(cur)}</option>`}</select></label>`;
    }
    return `<label class="inp" data-name="${esc(i.name)}"><span class="il">${lab}</span><span class="is">${K(i.tex)}</span><input data-k="${i.block}:${i.line}" value="${esc(i.num)}" inputmode="decimal" autocomplete="off"><span class="iu" title="${esc(i.unit)}">${esc(prettyU(i.unit))}</span></label>`;
  }).join('')}</div>`).join('');
  renderCheckStrip();
}
const prettyU = (u) => String(u || '').replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^4/g, '⁴').replace(/\*/g, '·');
function renderCheckStrip() {
  const pane = $('#p-datos');
  let strip = pane.querySelector('.cstrip');
  const ch = lastRes.ctx.checks;
  if (!ch.length && !lastRes.ctx.errors.length) { strip?.remove(); return; }
  if (!strip) { strip = h('<div class="cstrip"></div>'); pane.prepend(strip); }
  const bad = ch.filter(c => !c.ok).length;
  const errs = lastRes.ctx.errors;
  const sorted = [...ch].sort((a, b) => (a.ok - b.ok));
  const suspects = () => { const out = lastRes.ctx.inputs.filter(i => { const r = RANGES[i.name]; const x = parseFloat(i.num); return (r && (!r.u || r.u === i.unit.replace(/\s/g, '')) && (x < r.min || x > r.max)) || (x <= 0 && /^(b|h|d|L|B|t|fc|fy)/.test(i.name)); }); return out.length ? '<br><b>Posible causa:</b> ' + out.map(i => esc((i.label || i.name) + ' = ' + i.num + ' ' + prettyU(i.unit))).join(', ') : ''; };
  const where = (er) => { const inp = lastRes.ctx.inputs.find(i => i.block === er.block && i.line === er.line - 1); if (inp) return (inp.label || inp.name) + ': '; const bi = doc.blocks.findIndex(b => b.id === er.block); const b = doc.blocks[bi]; const ln = b && b.src ? (b.src.split('\n')[er.line - 1] || '').trim() : ''; return ln ? '«' + ln.slice(0, 40) + (ln.length > 40 ? '…' : '') + '» → ' : 'Bloque ' + (bi + 1) + ': '; };
  strip.innerHTML = (errs.length ? `<div class="csh err">⚠ Hay un error de cálculo${errs.length > 1 ? ' (y ' + (errs.length - 1) + ' consecuencia(s))' : ''}: toque para ir al código</div><div class="csl"><div class="cs no erow" data-gob="${errs[0].block}" data-gol="${Math.max(0, errs[0].line - 1)}"><span class="cl" style="white-space:normal">${esc(where(errs[0]))}${esc(errs[0].msg)}${suspects()}</span></div></div>` : '') + `<div class="csh ${bad ? 'bad' : 'ok'}">${bad ? '✘ ' + bad + ' de ' + ch.length + ' verificaciones no cumplen' : '✔ Cumplen las ' + ch.length + ' verificaciones'}</div><div class="csl">${sorted.map(c => { const r = c.ratio != null && isFinite(c.ratio) ? c.ratio : null; const col = !c.ok ? 'var(--bad)' : r !== null && r > 0.85 ? '#bf8700' : 'var(--ok)'; return `<div class="cs${c.ok ? '' : ' no'}" title="${esc(c.label)}" data-gob="${c.block}" data-gol="${c.line ?? ''}"><span class="cl">${esc(c.label.replace(/\$[^$]*\$/g, ''))}</span><span class="cb"><i style="width:${r === null ? 100 : Math.min(100, r * 100)}%;background:${col}"></i></span><b style="color:${col}">${r === null ? (c.ok ? '✔' : '✘') : r.toFixed(2)}</b></div>`; }).join('')}</div>`;
}
const RANGES = {
  fc: { u: 'kgf/cm^2', min: 140, max: 700, txt: "f'c usual entre 175 y 420 kgf/cm²" },
  fy: { u: 'kgf/cm^2', min: 2400, max: 6000, txt: 'fy usual 2800 a 4200 kgf/cm² (Grado 60 = 4200)' },
  Fy: { u: 'ksi', min: 30, max: 80, txt: 'Fy usual 36 a 65 ksi' },
  qa: { u: 'kgf/cm^2', min: 0.3, max: 6, txt: 'qa usual 0.5 a 4 kgf/cm²' },
  Z: { min: 0.1, max: 0.45, txt: 'Z de E.030: 0.10 a 0.45' },
};
const norm = (s) => String(s).trim().replace(/\s+/g, ' ');
let follow = null;
function setInputLine(blockId, line, fn) {
  follow = { b: blockId, l: line };
  const b = doc.blocks.find(x => x.id === blockId); if (!b) return;
  const lines = b.src.split('\n'); lines[line] = fn(lines[line]); b.src = lines.join('\n');
  const ta = document.querySelector(`.bk[data-id="${blockId}"] textarea.code`); if (ta && ta !== document.activeElement) { ta.value = b.src; paintHL(ta); }
  changed();
}

// ---------------- Editor de bloques ----------------
const HL_FN = new Set(['si', 'sqrt', 'sqrtfc', 'sqrtMPa', 'max', 'min', 'abs', 'ceil', 'floor', 'round', 'sin', 'cos', 'tan', 'cot', 'asin', 'acos', 'atan', 'log', 'log10', 'exp', 'sum', 'cumsum', 'nthRoot', 'cbrt', 'mean', 'sort', 'size']);
function hlLine(line) {
  const t = line.trimStart();
  if (!t) return esc(line);
  if (/^#{1,4}\s/.test(t)) return `<span class="h-hd">${esc(line)}</span>`;
  if (t[0] === '"' || t[0] === "'") return `<span class="h-tx">${esc(line)}</span>`;
  if (t[0] === '@') return `<span class="h-dir">${esc(line)}</span>`;
  let code = line, cm = '';
  const i = line.indexOf('//'); if (i >= 0) { code = line.slice(0, i); cm = line.slice(i); }
  let out = esc(code)
    .replace(/^(\s*)(check|verificar)\b/i, '$1<span class="h-kw">$2</span>')
    .replace(/^(\s*)([A-Za-z_][\w]*)(\s*(?:\([^)]*\))?\s*=)(?!=)/, '$1<span class="h-var">$2</span>$3')
    .replace(/(-&gt;)(.*)$/, '<span class="h-kw">$1</span><span class="h-un">$2</span>')
    .replace(/(^|[^\w.])(\d+\.?\d*(?:e[-+]?\d+)?)/gi, '$1<span class="h-num">$2</span>')
    .replace(/\b([A-Za-z_]\w*)(?=\()/g, (m0, f) => (HL_FN.has(f) || CUSTOM_FN.has(f) ? '<span class="h-fn">' + f + '</span>' : f))
    .replace(/\b(tonf|tf|kgf|kN|MPa|kPa|Pa|N|kip|ksi|psi|lbf|cm|mm|m|in|ft|deg|rad|s)\b(?![^<]*>)(?=(\^\d)?(\s|\/|\*|\)|,|$|\^))/g, '<span class="h-un">$1</span>');
  return out + (cm ? `<span class="h-cm">${esc(cm)}</span>` : '');
}
function paintHL(ta) {
  const pre = ta.previousElementSibling; if (!pre) return;
  const id = ta.closest('.bk')?.dataset.id;
  const errL = new Set((lastRes?.ctx.errors || []).filter(e => e.block === id).map(e => e.line - 1));
  pre.innerHTML = ta.value.split('\n').map((l, i) => errL.has(i) ? `<span class="h-err">${hlLine(l) || ' '}</span>` : hlLine(l)).join('\n') + '\n';
  autosize(ta);
}
function autosize(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }

const SNIPS = [
  ['x = 0 cm', 'nombre = 0 cm // descripción'], ['= expr', 'r = a*b'], ['→ unidad', ' -> tonf*m'], ['check', 'check Mu <= phiMn // Verificación'],
  ['# Título', '# Título'], ['"Texto', '"Texto con valor {x}'], ['si()', 'si(a > b, a, b)'], ["√f'c", 'sqrtfc(fc)'], ['Ab(#)', 'Ab(5)'], ['φ', 'phi'], ['@modo', '@modo corto'],
];
function blockSummary(b) {
  if (b.type === 'calc' || b.type === 'text') { const m = /^\s*#{1,4}\s+(.*)$/m.exec(b.src || ''); return m ? m[1] : (b.src || '').split('\n')[0].slice(0, 60); }
  return b.titulo || b.caption || '';
}
function renderBlocks() {
  const pane = $('#p-bloques');
  pane.innerHTML = '';
  doc.blocks.forEach((b, i) => { pane.appendChild(blockEl(b, i)); pane.appendChild(h(`<div class="ins"><button data-ins="${i + 1}">+ insertar aquí</button></div>`)); });
  pane.appendChild(h(`<div class="add"><button class="btn pri addt" data-addtoggle>${I.plus}Agregar bloque</button>${[...BASE_ADD, ...Object.keys(BLOCKS)].map(t => `<button class="btn" data-add="${t}">${icon(TYPES[t])}${TYPES[t].name}</button>`).join('')}</div>`));
  pane.querySelectorAll('textarea.code').forEach(paintHL);
  pane.querySelectorAll('textarea.auto').forEach(autosize);
}
function blockEl(b, i) {
  const T = TYPES[b.type] || { name: b.type, icon: 'calc' };
  const col = collapsed.has(b.id);
  const el = h(`<div class="bk${b.id === selId ? ' sel' : ''}${col ? ' col' : ''}" data-id="${b.id}">
    <div class="bkh"><div class="bt" data-act="toggle">${icon(T)}<span>${T.name}</span><em>${esc(blockSummary(b))}</em></div>
    <div class="bb"><button data-act="up" title="Subir">${I.up}</button><button data-act="down" title="Bajar">${I.down}</button><button data-act="dup" title="Duplicar">${I.dup}</button><button data-act="del" title="Eliminar">${I.del}</button></div></div>
    <div class="bkb"></div></div>`);
  const body = el.querySelector('.bkb');
  if (b.type === 'calc') {
    body.innerHTML = `<div class="snip">${SNIPS.map((s, k) => `<button data-snip="${k}" title="${esc(s[1])}">${esc(s[0])}</button>`).join('')}</div><div class="ed"><pre aria-hidden="true"></pre><textarea class="code" spellcheck="false" autocapitalize="off" autocomplete="off" rows="3">${esc(b.src || '')}</textarea></div><div class="errs"></div>`;
  } else if (b.type === 'text') {
    body.innerHTML = `<div class="ed"><pre aria-hidden="true"></pre><textarea class="code" spellcheck="true" rows="3" placeholder="Texto con **formato**, listas, tablas, $LaTeX$ y valores {variable}">${esc(b.src || '')}</textarea></div><div class="errs"></div>`;
  } else if (b.type === 'image') {
    body.innerHTML = `<div class="fg"><div class="imgdrop w" style="grid-column:1/-1" tabindex="0">${b.data ? `<img src="${b.data}" alt="">` : 'Toque para elegir una imagen, arrástrela aquí o péguela (Ctrl+V)'}</div>
      <label class="w">Leyenda<input data-f="caption" value="${esc(b.caption || '')}" placeholder="Descripción de la figura"></label>
      <label>Ancho (%)<input data-f="width" type="number" min="10" max="100" value="${b.width || 70}"></label></div><input type="file" accept="image/*" hidden>`;
  } else if (T.fields) {
    body.innerHTML = `<div class="fg">${T.fields.map(f => {
      const v = b[f.k];
      if (f.t === 'check') return `<label class="ck w"><input type="checkbox" data-f="${f.k}"${v || (f.k === 'deflexion' && v === undefined) ? ' checked' : ''}> ${f.l}</label>`;
      if (f.t === 'select') return `<label>${f.l}<select data-f="${f.k}">${f.opt.map(o => `<option value="${o[0]}"${(v || f.opt[0][0]) === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
      if (f.t === 'area') return `<label class="w">${f.l}<textarea data-f="${f.k}" class="auto" spellcheck="false" placeholder="${esc(f.ph)}">${esc(v || '')}</textarea></label>`;
      return `<label${f.k === 'titulo' || f.k === 'expr' || f.k === 'acero' ? ' class="w"' : ''}>${f.l}<input data-f="${f.k}"${['titulo', 'xlabel', 'ylabel', 'nombres', 'acero', 'sest'].includes(f.k) ? ' class="tx"' : ''} value="${esc(v ?? '')}" placeholder="${esc(f.ph)}" spellcheck="false" autocapitalize="off"></label>`;
    }).join('')}${T.hint ? `<div class="hint">${T.hint}</div>` : ''}</div><div class="errs"></div>`;
  } else {
    body.innerHTML = `<div class="hint" style="font-size:12px;color:var(--mut);padding:4px">${b.type === 'summary' ? 'Tabla automática con todas las verificaciones del documento, su relación demanda/capacidad y estado.' : 'Fuerza el inicio de una nueva página al imprimir.'}</div>`;
  }
  return el;
}
function insertBlock(type, at) {
  const T = TYPES[type];
  if (at === undefined) {
    const si = doc.blocks.findIndex(b => b.id === selId);
    if (si >= 0) at = si + 1;
    else {
      at = doc.blocks.length; while (at > 0 && ['summary', 'pagebreak'].includes(doc.blocks[at - 1].type)) at--;
      const prevB = doc.blocks[at - 1];
      if (at < doc.blocks.length && prevB && prevB.type === 'text' && /^\s*#{1,4}[^\n]*\s*$/.test(prevB.src || '')) at--;
    }
  }
  const b = { id: uid(), type, ...(T.def ? JSON.parse(JSON.stringify(T.def)) : {}) };
  if (type === 'calc') b.src = '';
  if (type === 'text') b.src = '';
  doc.blocks.splice(at ?? doc.blocks.length, 0, b);
  selId = b.id; renderBlocks(); changed();
  setTimeout(() => { const el = document.querySelector(`.bk[data-id="${b.id}"]`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.querySelector('textarea,input')?.focus(); }, 30);
}

// ---------------- Modales y utilidades ----------------
function toast(msg, action, fn) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h(`<div class="toast"><span>${msg}</span>${action ? `<button>${action}</button>` : ''}</div>`);
  if (action) t.querySelector('button').onclick = () => { fn(); t.remove(); };
  document.body.appendChild(t); setTimeout(() => t.remove(), action ? 6000 : (isMobile() ? 1700 : 2600));
}
function modal(title, content, wide = true) {
  const ov = h(`<div class="ov"><div class="md-box" style="${wide ? '' : 'width:min(560px,100%)'}"><div class="md-h"><h3>${title}</h3><button class="btn ghost ic" data-x>${I.x}</button></div><div class="md-c"></div></div></div>`);
  const c = ov.querySelector('.md-c'); if (typeof content === 'string') c.innerHTML = content; else c.appendChild(content);
  const close = () => { ov.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', esc_);
  document.body.appendChild(ov); return { ov, c, close };
}
function showTemplates(first) {
  const cats = [...CATEGORIES.filter(c => TEMPLATES.some(t => t.cat === c)), ...new Set(TEMPLATES.map(t => t.cat).filter(c => !CATEGORIES.includes(c)))];
  const m = modal(first ? 'Bienvenido a MemoriaCalc — elija una plantilla' : 'Nueva memoria desde plantilla',
    `<p style="margin:0 0 14px;color:var(--mut);font-size:13px">Cada plantilla es una memoria completa y editable: solo cambie los datos en la pestaña <b>Datos</b> y todo se recalcula al instante.</p>` +
    `<input id="tplq" class="tplq" placeholder="Buscar plantilla (p. ej. zapata, sismo, puente)…" autocomplete="off">` +
    cats.map(c => `<div class="sec" style="margin-top:6px">${c}</div><div class="tg">${TEMPLATES.filter(t => t.cat === c).map(t => `<button class="tc" data-t="${t.id}"><div class="ti">${I[t.icon] || I.calc}</div><div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div></button>`).join('')}</div>`).join(''));
  const q = m.c.querySelector('#tplq');
  q.addEventListener('input', () => {
    const v = q.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    m.c.querySelectorAll('.tc').forEach(c => { c.hidden = v && !c.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(v); });
    m.c.querySelectorAll('.tg').forEach(g => { const any = [...g.children].some(c => !c.hidden); g.hidden = !any; g.previousElementSibling.hidden = !any; });
  });
  if (!isMobile()) setTimeout(() => q.focus(), 50);
  m.c.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const t = TEMPLATES.find(x => x.id === b.dataset.t);
    doc = newDoc(t); selId = null; inputsKey = ''; m.close(); loadUI(); changed();
    setTab('datos'); if (isMobile()) setView('edit');
    toast('Plantilla «' + t.name + '» cargada');
  });
}
async function showLibrary() {
  const all = (await dbAll()).sort((a, b) => b.updated - a.updated);
  const m = modal('Mis memorias', `<table class="lib"><tbody>${all.map(d => `<tr data-id="${d.id}"><td class="t" data-open>${esc(d.meta?.titulo || 'Sin título')}<div style="font-weight:400;color:var(--mut);font-size:12px">${esc(d.meta?.proyecto || '')}</div></td><td style="color:var(--mut);font-size:12px;white-space:nowrap">${new Date(d.updated).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</td><td style="text-align:right;white-space:nowrap"><button class="btn" data-open>Abrir</button> <button class="btn ghost ic" data-del title="Eliminar">${I.del}</button></td></tr>`).join('') || '<tr><td class="empty">Aún no hay memorias guardadas.</td></tr>'}</tbody></table><p style="font-size:12px;color:var(--mut)">Las memorias se guardan automáticamente en este dispositivo. Use <b>Guardar archivo</b> para respaldarlas o compartirlas (.mcalc).</p>`);
  m.c.addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    if (e.target.closest('[data-del]')) { if (tr.dataset.id === doc.id) return toast('No se puede eliminar la memoria abierta'); await dbDel(tr.dataset.id); tr.remove(); return; }
    if (e.target.closest('[data-open]')) { const d = await dbGet(tr.dataset.id); if (d) { doc = migrate(d); inputsKey = ''; m.close(); loadUI(); compute(); } }
  });
}
function migrate(d) { d.settings = { ...DEF_SETTINGS, ...(d.settings || {}) }; d.meta = d.meta || {}; d.blocks = (d.blocks || []).map(b => ({ ...b, id: b.id || uid() })); return d; }

async function saveFile() {
  const data = JSON.stringify({ app: 'MemoriaCalc', version: VERSION, doc }, null, 1);
  const name = (doc.meta.titulo || 'memoria').replace(/[\\/:*?"<>|]+/g, '').slice(0, 80) + '.mcalc';
  if (window.showSaveFilePicker && !EMBED) {
    try {
      const fh = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Memoria de cálculo', accept: { 'application/json': ['.mcalc'] } }] });
      const w = await fh.createWritable(); await w.write(data); await w.close(); toast('Archivo guardado'); return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(name, data, 'application/json'); toast('Archivo descargado');
}
let dl = null;
function download(name, data, type) {
  if (EMBED) {
    if (!dl) { toast('La descarga no está disponible en esta vista'); return; }
    dl.save({ filename: name.replace(/\.mcalc$/, '.json'), data }).then(() => toast('Archivo listo')).catch(e => { if (e && e.code !== 'declined') toast('No se pudo guardar el archivo (' + (e.code || 'error') + ')'); });
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function openFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.mcalc,.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); const d = j.doc || j; if (!Array.isArray(d.blocks)) throw new Error(); doc = migrate(d); inputsKey = ''; loadUI(); compute(); autosave(); toast('Memoria abierta: ' + esc(doc.meta.titulo || f.name)); }
    catch (e) { toast('El archivo no es una memoria válida'); }
  };
  inp.click();
}
function exportHTML() {
  compute();
  const css = $('#katexcss').textContent + '\n' + $('#papercss').textContent + '\n' + $('#printcss').textContent;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.meta.titulo || 'Memoria')}</title><style>body{background:#eef1f5;margin:0;padding:24px 8px}@media print{body{background:#fff;padding:0}}${css}</style></head><body><div class="paper">${$('#paper').innerHTML}</div></body></html>`;
  download((doc.meta.titulo || 'memoria').replace(/[\\/:*?"<>|]+/g, '') + '.html', html, 'text/html');
  toast('HTML exportado');
}
async function exportWord() {
  compute();
  toast('Generando Word…');
  try {
    const { buildDocx } = await import('./docx.js');
    const bytes = await buildDocx($('#paper .pt > tbody > tr > td'), doc.meta);
    download((doc.meta.titulo || 'memoria').replace(/[\\/:*?"<>|]+/g, '') + '.docx', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    if (!EMBED) toast('Word exportado: ecuaciones editables, figuras e índice');
  } catch (e) { console.error(e); toast('No se pudo generar el Word: ' + esc(e.message || e)); }
}
function doPrint() { compute(); setTimeout(() => window.print(), 60); }

function showNormas() {
  const rows = [
    ['Perú (RNE)', 'NTE E.020 Cargas', '2006', 'Metrado, sobrecargas', 'Viga continua, aligerado, escalera'],
    ['Perú (RNE)', 'NTE E.030 Diseño Sismorresistente', '2018 · modif. RM 279-2025 y RM 183-2026', 'Suelo por Vs30, S/TP/TL interpolados, R0 (EMDL 3.5), Ia/Ip extremas, C/R ≥ 0.11, 100 % + 30 %, derivas Tabla 14', 'Sismo E.030-2026, sismo 2018 (transición), comparativo, espectro'],
    ['Perú (RNE)', 'NTE E.050 Suelos y Cimentaciones', '2018', 'Capacidad admisible, FS, incremento sísmico 30 %', 'Zapata, capacidad portante'],
    ['Perú (RNE)', 'NTE E.060 Concreto Armado', '2009 (en actualización, RM 066-2025)', 'Flexión, cortante, flexocompresión, punzonamiento, confinamiento sísmico, desarrollo', 'Viga, viga continua, columna, zapata, muro, aligerado, escalera'],
    ['Perú (RNE)', 'NTE E.070 Albañilería', '2006', 'Densidad de muros, esfuerzo axial, Vm, control de fisuración', 'Albañilería confinada'],
    ['Perú (RNE)', 'NTE E.090 Estructuras Metálicas', '2006 (basada en AISC LRFD)', 'Diseño en acero', 'Viga de acero (vía AISC 360)'],
    ['EE. UU.', 'ACI 318-19 / ACI 318-25', '2019 / 2025', 'φ variable con εt, Vc con efecto de tamaño λs, refuerzo mínimo', 'Viga ACI (SI)'],
    ['EE. UU.', 'ASCE/SEI 7-22', '2022', 'Fuerza lateral equivalente, Cu·Ta, Cs mínimo, exponente k, derivas con Cd', 'Sismo ELF ASCE 7-22, comparativo'],
    ['EE. UU.', 'ANSI/AISC 360-16 / 360-22', '2016 / 2022', 'Compacidad, pandeo lateral-torsional (F2), cortante (G2)', 'Viga de acero W'],
    ['EE. UU.', 'AASHTO LRFD Bridge Design Spec.', '9.ª / 10.ª ed.', 'HL-93, IM, franjas equivalentes, Resistencia I, Servicio I', 'Puente losa'],
    ['Europa', 'EN 1992-1-1 Eurocódigo 2', '2004 (+A1)', 'Bloque rectangular, x/d, VRd,c, bielas con cot θ', 'Viga Eurocódigo 2'],
    ['Europa', 'EN 1998-1 Eurocódigo 8', '2004', 'Espectro de diseño tipo 1 con q', 'Comparativo de espectros'],
    ['Japón', 'Building Standard Law (Orden de Aplicación Art. 88)', 'vigente', 'Ci = Z·Rt·Ai·Co, Qun = Ds·Fes·Qud, deriva 1/200', 'Sismo norma japonesa, comparativo'],
  ];
  modal('Normas implementadas', `<div class="helpc"><p>Resumen de las normas usadas por las plantillas y funciones de MemoriaCalc. Verifique siempre la versión vigente aplicable a su proyecto.</p>
  <table><tr><th>País</th><th>Norma</th><th>Versión</th><th>Qué se implementa</th><th>Dónde</th></tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>
  <h4>Funciones normativas disponibles en el editor</h4>
  <p><code>SE030(zona, Vs30)</code> · <code>TpE030(Vs30)</code> · <code>TlE030(Vs30)</code> · <code>CE030(T, TP, TL)</code> · <code>CE030d(T, TP, TL)</code> (dinámico) · <code>SaASCE7(T, SDS, SD1, TL)</code> · <code>CuASCE7(SD1)</code> · <code>SdEC8(T, ag, S, TB, TC, TD, q)</code> · <code>RtBSL(T, Tc)</code> · <code>AiBSL(α, T)</code> · <code>FsBSL(Rs)</code> · <code>FeBSL(Re)</code> · <code>lambdasACI(d)</code> · <code>MtruckHL93(L)</code>…</p></div>`);
}
function showHelp() {
  modal('Ayuda — sintaxis y funciones', `<div class="helpc">
  <h4>Bloque de cálculo</h4>
  <table><tr><th>Escriba</th><th>Resultado</th></tr>
  <tr><td><code>b = 30 cm // Ancho</code></td><td>Dato de entrada (editable en la pestaña Datos). El texto tras <code>//</code> es la descripción.</td></tr>
  <tr><td><code>fy = 4200 kgf/cm^2 // Acero [2800 kgf/cm^2|4200 kgf/cm^2]</code></td><td>Dato con lista desplegable</td></tr>
  <tr><td><code>As = rho*b*d</code></td><td>Fórmula simbólica = sustitución = resultado</td></tr>
  <tr><td><code>Mn = As*fy*(d - a/2) -> tonf*m</code></td><td>Convierte el resultado a la unidad indicada</td></tr>
  <tr><td><code>check Mu <= phiMn // Flexión</code></td><td>Verificación con ✔ CUMPLE / ✘ NO CUMPLE y relación D/C</td></tr>
  <tr><td><code># Título</code> · <code>## Subtítulo</code></td><td>Títulos numerados (aparecen en el índice)</td></tr>
  <tr><td><code>"Texto con {As} y $\\phi M_n$</code></td><td>Párrafo con valores calculados y LaTeX</td></tr>
  <tr><td><code>f(x) = 2*x + 1</code></td><td>Función de usuario</td></tr>
  <tr><td><code>@modo completo | corto | resultado</code></td><td>Nivel de detalle de las fórmulas</td></tr>
  <tr><td><code>@ocultar</code> … <code>@mostrar</code></td><td>Cálculos auxiliares que no se imprimen</td></tr>
  <tr><td><code>@dec 3</code> · <code>@salto</code></td><td>Decimales · salto de página</td></tr></table>
  <h4>Nombres de variables → símbolos</h4>
  <p><code>Mu</code>→M<sub>u</sub>, <code>As_min</code>→A<sub>s,min</sub>, <code>phiMn</code>→φM<sub>n</sub>, <code>beta1</code>→β<sub>1</sub>, <code>fc</code>→f'<sub>c</sub>, <code>gammac</code>→γ<sub>c</sub>, <code>FS</code>→FS. Letras griegas: alpha, beta, gamma, delta, epsilon, theta, lambda, mu, rho, sigma, tau, phi, psi, omega…</p>
  <p>⚠ Evite nombrar variables como unidades usadas después (<code>m</code>, <code>cm</code>, <code>s</code>, <code>N</code>, <code>t</code>).</p>
  <h4>Unidades</h4>
  <p>Longitud: <code>mm cm m in ft</code> · Fuerza: <code>kgf tonf (tf) N kN kip lbf</code> · Esfuerzo: <code>kgf/cm^2 tonf/m^2 Pa kPa MPa psi ksi</code> · Ángulo: <code>deg rad</code>. Combine libremente: <code>tonf*m</code>, <code>kN/m^2</code>.</p>
  <h4>Funciones</h4>
  <p><code>sqrt abs min max ceil floor round sin cos tan cot asin log log10 exp sum cumsum</code> · <code>si(cond, a, b)</code> · <code>sqrtfc(fc)</code> = √f'c en kgf/cm² (fórmulas empíricas E.060) · <code>sqrtMPa(fc)</code> · <code>Ab(n)</code>, <code>db(n)</code> área y diámetro de varilla #n · <code>Abmm(12)</code> · <code>roundup(x, 5 cm)</code>, <code>rounddown(x, 2.5 cm)</code> · <code>MtruckHL93(L) MtandemHL93(L) MlaneHL93(L) VtruckHL93(L)…</code> (AASHTO) · <code>CE030(T, Tp, TL)</code>.</p>
  <h4>Bloques gráficos</h4>
  <p><b>Viga continua</b>: análisis matricial con alternancia de carga viva, diagramas V, M, deformada y reacciones. <b>Diagrama P–M</b>: interacción de columnas rectangulares con verificación de combinaciones. <b>Sección</b>, <b>Zapata</b>, <b>Muro</b>: dibujos acotados. <b>Espectro E.030</b>, <b>Gráfico</b> de funciones y <b>Tabla</b> de vectores. Todos aceptan variables del cálculo en sus campos.</p>
  <h4>Atajos</h4>
  <p><code>Ctrl+S</code> guardar archivo · <code>Ctrl+P</code> imprimir / PDF · <code>Ctrl+O</code> abrir · clic en una línea de la vista previa para ir a su código.</p>
  <p style="color:var(--mut);font-size:12px">MemoriaCalc ${VERSION}. Motor: math.js (unidades), KaTeX (fórmulas), marked (texto). Inspirado en Calcpad, handcalcs y efficalc. Verifique siempre los resultados: el profesional responsable firma la memoria.</p></div>`);
}

function renderProject() {
  const m = doc.meta, s = doc.settings;
  const inp = (k, l, w) => `<label${w ? ' class="w"' : ''}>${l}<input data-m="${k}" value="${esc(m[k] || '')}"></label>`;
  $('#p-proyecto').innerHTML = `<div class="pf">
    <div class="sec" style="margin-top:0">Datos del proyecto (portada y encabezado)</div>
    ${inp('titulo', 'Título de la memoria', 1)}${inp('proyecto', 'Proyecto', 1)}${inp('cliente', 'Cliente / Entidad')}${inp('ubicacion', 'Ubicación')}
    ${inp('autor', 'Elaborado por')}${inp('cip', 'Reg. CIP')}${inp('revisor', 'Revisado por')}${inp('empresa', 'Empresa / Consultora')}
    ${inp('fecha', 'Fecha')}${inp('rev', 'Revisión')}${inp('normas', 'Normativa aplicada', 1)}
    <label class="w">Logo<div class="logo-p">${m.logo ? `<img src="${m.logo}" alt="">` : ''}<button class="btn" data-logo>${m.logo ? 'Cambiar' : 'Cargar logo'}</button>${m.logo ? '<button class="btn ghost" data-nologo>Quitar</button>' : ''}</div></label>
    <div class="sec">Presentación</div>
    <label>Decimales<select data-s="dec">${[0, 1, 2, 3, 4].map(n => `<option${s.dec == n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label>Sistema de unidades preferido<select data-s="sys"><option value="tec"${s.sys === 'tec' ? ' selected' : ''}>Técnico (t, t·m, kg/cm²)</option><option value="si"${s.sys === 'si' ? ' selected' : ''}>SI (kN, kN·m, MPa)</option><option value="us"${s.sys === 'us' ? ' selected' : ''}>Inglés (kip, kip·ft, ksi)</option></select></label>
    <label>Detalle de fórmulas<select data-s="mode"><option value="completo"${s.mode === 'completo' ? ' selected' : ''}>Completo (fórmula + sustitución + resultado)</option><option value="corto"${s.mode === 'corto' ? ' selected' : ''}>Corto (fórmula + resultado)</option><option value="res"${s.mode === 'res' ? ' selected' : ''}>Solo resultados</option></select></label>
    <label class="ck"><input type="checkbox" data-s="comma"${s.comma ? ' checked' : ''}> Coma decimal</label>
    <label class="ck"><input type="checkbox" data-s="cover"${s.cover !== false ? ' checked' : ''}> Portada</label>
    <label class="ck"><input type="checkbox" data-s="toc"${s.toc !== false ? ' checked' : ''}> Índice de contenido</label>
    <label class="ck"><input type="checkbox" data-s="numbering"${s.numbering !== false ? ' checked' : ''}> Numerar títulos</label>
    <div class="sec">Archivo</div>
    <div class="w" style="display:flex;flex-wrap:wrap;gap:6px;grid-column:1/-1"><button class="btn" data-do="save">${I.save}${EMBED ? 'Guardar archivo (.json)' : 'Guardar .mcalc'}</button><button class="btn" data-do="open">${I.open}Abrir</button>${EMBED ? '' : `<button class="btn" data-do="pdf">${I.pdf}Imprimir / PDF</button>`}<button class="btn" data-do="html">${I.html}Exportar HTML</button><button class="btn" data-do="word">${I.text}Exportar Word (.docx)</button></div>
    ${EMBED ? '<div class="w" style="grid-column:1/-1;font-size:12.5px;color:var(--tx);background:var(--acc-s);padding:10px;border-radius:8px">En esta versión web no se puede imprimir directamente. Para obtener el PDF: «Exportar HTML», abra el archivo en Chrome y use Compartir › Imprimir › Guardar como PDF. En Windows use MemoriaCalc.exe (PDF y Word directos).</div>' : ''}
    <div class="w" style="grid-column:1/-1;font-size:12px;color:var(--mut);margin-top:6px">Para PDF elija «Guardar como PDF» en el diálogo de impresión (A4, márgenes predeterminados, activar «Gráficos de fondo»).</div>
  </div>`;
}

// ---------------- Navegación ----------------
const isMobile = () => window.matchMedia('(max-width:900px)').matches;
function setTab(t) {
  tab = t; try { localStorage.setItem('mc_tab', t); } catch (e) { /* */ }
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  document.querySelectorAll('.bnav button').forEach(b => b.classList.toggle('on', isMobile() ? (mview === 'prev' ? b.dataset.v === 'prev' : b.dataset.v === t) : false));
  if (t === 'bloques') document.querySelectorAll('#p-bloques textarea').forEach(ta => ta.classList.contains('code') ? paintHL(ta) : autosize(ta));
}
function setView(v) { mview = v; $('.main').dataset.v = v; setTab(tab); }
function goToLine(bid, line) {
  selId = bid;
  if (isMobile()) setView('edit');
  setTab('bloques');
  collapsed.delete(bid);
  document.querySelectorAll('.bk').forEach(el => el.classList.toggle('sel', el.dataset.id === bid));
  let el = document.querySelector(`.bk[data-id="${bid}"]`);
  if (el && el.classList.contains('col')) { renderBlocks(); el = document.querySelector(`.bk[data-id="${bid}"]`); }
  if (!el) return;
  const ta = el.querySelector('textarea.code');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (ta && line !== undefined) {
    const lines = ta.value.split('\n'); let pos = 0; for (let i = 0; i < line && i < lines.length; i++) pos += lines[i].length + 1;
    setTimeout(() => { ta.focus({ preventScroll: true }); ta.setSelectionRange(pos, pos + (lines[line] || '').length); }, 250);
  }
}

function loadUI() {
  if (!hist.lock) resetHistory();
  $('#dtitle').value = doc.meta.titulo || '';
  renderBlocks(); renderProject(); setTab(tab);
}

// ---------------- Construcción de la interfaz ----------------
export function start() {
  document.body.innerHTML = `<div id="app">
  <header class="top">
    <div class="brand">${I.logo}<div><span>MemoriaCalc</span><small>Memorias de cálculo estructural</small></div></div>
    <input id="dtitle" class="dtitle" placeholder="Título de la memoria" spellcheck="false">
    <div class="chips" id="chips"></div>
    <div class="tb">
      <button class="btn hide-m" data-do="tpl" title="Nueva desde plantilla">${I.grid}<span>Plantillas</span></button>
      <button class="btn ghost ic hide-m" data-do="lib" title="Mis memorias">${I.folder}</button>
      <button class="btn ghost ic hide-m" data-do="save" title="Guardar archivo (Ctrl+S)">${I.save}</button>
      <button class="btn pri" data-do="pdf" title="Imprimir / PDF (Ctrl+P)">${I.pdf}<span class="hide-m">PDF</span></button>
      <button class="btn ghost ic" data-do="menu" title="Más">${I.more}</button>
    </div>
  </header>
  <div class="main" data-v="edit">
    <aside class="left">
      <nav class="tabs"><button class="tab" data-tab="datos">${I.data}Datos</button><button class="tab" data-tab="bloques">${I.edit}Editor</button><button class="tab" data-tab="proyecto">${I.gear}Proyecto</button><span style="flex:1"></span><span id="perf" style="font-size:11px;color:var(--mut);align-self:center;padding-right:6px"></span></nav>
      <div class="pane" id="p-datos"></div>
      <div class="pane" id="p-bloques"></div>
      <div class="pane" id="p-proyecto"></div>
    </aside>
    <div class="split" id="split"></div>
    <section class="right" id="right"><div class="paper" id="paper"></div></section>
  </div>
  <nav class="bnav"><button data-v="datos">${I.data}Datos</button><button data-v="bloques">${I.edit}Editor</button><button data-v="prev">${I.eye}Vista</button><button data-v="proyecto">${I.gear}Proyecto</button></nav>
  </div>`;

  // --- eventos globales ---
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-do]');
    if (d) {
      const a = d.dataset.do;
      if (a === 'tpl') showTemplates(); else if (a === 'lib') showLibrary(); else if (a === 'save') saveFile(); else if (a === 'open') openFile();
      else if (a === 'pdf') doPrint(); else if (a === 'html') exportHTML(); else if (a === 'word') exportWord(); else if (a === 'help') showHelp(); else if (a === 'normas') showNormas();
      else if (a === 'menu') { showMenu(d); return; }
      else if (a === 'theme') { const cur = document.documentElement.dataset.theme; const nx = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark'; if (nx) document.documentElement.dataset.theme = nx; else delete document.documentElement.dataset.theme; try { localStorage.setItem('mc_theme', nx); } catch (er) { /* */ } toast('Tema: ' + (nx === 'dark' ? 'oscuro' : nx === 'light' ? 'claro' : 'automático')); }
      else if (a === 'undo') undoRedo(-1); else if (a === 'redo') undoRedo(1);
      else if (a === 'new') { doc = newDoc(); inputsKey = ''; loadUI(); compute(); autosave(); }
      else if (a === 'dupdoc') { const c = JSON.parse(JSON.stringify(doc)); c.id = uid(); c.meta.titulo += ' (copia)'; doc = c; loadUI(); compute(); autosave(); toast('Copia creada'); }
      document.querySelectorAll('.menu').forEach(m => m.remove());
      return;
    }
    if (!e.target.closest('.menu')) document.querySelectorAll('.menu').forEach(m => m.remove());
    const tb = e.target.closest('.tab'); if (tb) { setTab(tb.dataset.tab); return; }
    const bn = e.target.closest('.bnav button'); if (bn) { if (bn.dataset.v === 'prev') setView('prev'); else { mview = 'edit'; $('.main').dataset.v = 'edit'; setTab(bn.dataset.v); } window.scrollTo(0, 0); return; }
    const ch = e.target.closest('[data-go]');
    if (ch) {
      const g = ch.dataset.go;
      if (g === 'err' && lastRes.ctx.errors.length) { const er = lastRes.ctx.errors[0]; goToLine(er.block, Math.max(0, er.line - 1)); }
      else { if (isMobile()) setView('prev'); const el = document.querySelector(g === 'bad' ? '#paper .cbad, #paper .bad' : '#paper .sum, #paper .cok'); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    const ln = e.target.closest('#paper .ln[data-b]');
    if (ln && !window.getSelection().toString()) { goToLine(ln.dataset.b, +ln.dataset.l); return; }
    const sec = e.target.closest('#paper .blk[data-b]');
    if (sec && e.target.closest('.figure') && !window.getSelection().toString()) { goToLine(sec.dataset.b); }
  });
  function showMenu(btn) {
    const had = document.querySelector('.menu.main-menu');
    document.querySelectorAll('.menu').forEach(m => m.remove());
    if (had) return;
    const r = btn.getBoundingClientRect();
    const m = h(`<div class="menu main-menu" style="top:${r.bottom + 6}px;right:${Math.max(8, window.innerWidth - r.right)}px">
      <button data-do="undo">${I.undo}Deshacer (Ctrl+Z)</button><button data-do="redo">${I.redo}Rehacer (Ctrl+Y)</button><hr><button data-do="tpl">${I.grid}Nueva desde plantilla</button><button data-do="new">${I.blank}Documento en blanco</button><button data-do="lib">${I.folder}Mis memorias</button><hr>
      <button data-do="open">${I.open}Abrir archivo .mcalc</button><button data-do="save">${I.save}Guardar archivo .mcalc</button><button data-do="dupdoc">${I.dup}Duplicar memoria</button><hr>
      <button data-do="pdf">${I.pdf}Imprimir / Guardar PDF</button><button data-do="html">${I.html}Exportar HTML</button><button data-do="word">${I.text}Exportar Word (.docx)</button><hr>
      <button data-do="theme">${I.moon}Cambiar tema</button><button data-do="normas">${I.book}Normas implementadas</button><button data-do="help">${I.help}Ayuda y sintaxis</button></div>`);
    if (EMBED) m.querySelectorAll('[data-do="pdf"]').forEach(b => b.hidden = true);
    document.body.appendChild(m);
  }
  $('#dtitle').addEventListener('input', e => { doc.meta.titulo = e.target.value; const pi = document.querySelector('[data-m="titulo"]'); if (pi) pi.value = e.target.value; changed(); });

  // datos
  $('#p-datos').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    const [bid, ln] = k.split(':'); const v = e.target.value.trim().replace(',', '.');
    if (e.target.tagName === 'SELECT') { const val = e.target.value; setInputLine(bid, +ln, l => { const ci = l.indexOf('//'); const cm = ci >= 0 ? ' ' + l.slice(ci) : ''; const eq = l.indexOf('='); return l.slice(0, eq + 1) + ' ' + val + cm; }); return; }
    const ok = /^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(v);
    const row = e.target.closest('.inp'); row.classList.toggle('bad', !ok);
    let msg = ok ? '' : 'Ingrese solo un número (punto o coma decimal); se mantiene el valor anterior.';
    if (ok) {
      const name = row.dataset.name, unit = (row.querySelector('.iu')?.title || '').replace(/\s/g, ''), x = parseFloat(v);
      const rg = RANGES[name]; if (rg && (!rg.u || rg.u === unit) && (x < rg.min || x > rg.max)) msg = '⚠ Valor poco usual: ' + rg.txt;
      if (!rg && x <= 0 && /^(b|h|d|L|B|t|fc|fy)/.test(name)) msg = '⚠ Normalmente debe ser mayor que cero';
    }
    let m = row.nextElementSibling; if (!m || !m.classList.contains('imsg')) { m = h('<div class="imsg"></div>'); row.after(m); }
    m.textContent = msg; m.hidden = !msg;
    if (ok) setInputLine(bid, +ln, l => l.replace(/^(\s*[^=]+=\s*)(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/, (m, a) => a + v));
  });
  $('#p-datos').addEventListener('click', e => {
    const g = e.target.closest('[data-gob]'); if (!g) return;
    if (g.classList.contains('erow')) { goToLine(g.dataset.gob, +g.dataset.gol); return; }
    if (isMobile()) setView('prev');
    const el = document.querySelector(`#paper .ln[data-b="${g.dataset.gob}"][data-l="${g.dataset.gol}"]`) || document.querySelector(`#paper .blk[data-b="${g.dataset.gob}"]`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  });
  $('#p-datos').addEventListener('keydown', e => {
    if (e.target.tagName !== 'INPUT' || !['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
    if (e.key === 'Enter') { const all = [...document.querySelectorAll('#p-datos input,#p-datos select')]; all[all.indexOf(e.target) + 1]?.focus(); e.preventDefault(); return; }
    const v = parseFloat(e.target.value); if (isNaN(v)) return;
    const dec = (e.target.value.split('.')[1] || '').length; const step = dec ? 10 ** -dec : 1;
    e.target.value = (v + (e.key === 'ArrowUp' ? step : -step)).toFixed(dec); e.target.dispatchEvent(new Event('input', { bubbles: true })); e.preventDefault();
  });

  // editor de bloques
  const pb = $('#p-bloques');
  pb.addEventListener('input', e => {
    const el = e.target.closest('.bk'); if (!el) return;
    if (e.target.classList.contains('code')) { const ln = e.target.value.slice(0, e.target.selectionStart).split('\n').length - 1; follow = { b: el.dataset.id, l: ln }; } else follow = { b: el.dataset.id };
    const b = doc.blocks.find(x => x.id === el.dataset.id); if (!b) return;
    if (e.target.classList.contains('code')) { b.src = e.target.value; paintHL(e.target); const em = el.querySelector('.bt em'); if (em) em.textContent = blockSummary(b); }
    else if (e.target.dataset.f) { const f = e.target.dataset.f; b[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (e.target.tagName === 'TEXTAREA') autosize(e.target); }
    changed();
  });
  pb.addEventListener('change', e => { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
  pb.addEventListener('focusin', e => { const el = e.target.closest('.bk'); if (el && selId !== el.dataset.id) { selId = el.dataset.id; document.querySelectorAll('.bk').forEach(x => x.classList.toggle('sel', x === el)); } });
  pb.addEventListener('scroll', () => { }, { passive: true });
  pb.addEventListener('keydown', e => {
    const ta = e.target; if (!ta.classList.contains('code')) return;
    if (ac.el && ac.ta === ta) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ac.nav = true; ac.sel = (ac.sel + (e.key === 'ArrowDown' ? 1 : -1) + ac.items.length) % ac.items.length; drawAC(); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && ac.nav)) { e.preventDefault(); acceptAC(); return; }
      if (e.key === 'Enter') closeAC();
      if (e.key === 'Escape') { e.preventDefault(); closeAC(); return; }
    }
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });
  pb.addEventListener('input', e => {
    if (!e.target.classList.contains('code')) return;
    if (e.target.closest('.bk')?.querySelector('.snip') && !(e.inputType || '').startsWith('delete')) suggest(e.target); else closeAC();
  });
  pb.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement?.classList.contains('code')) closeAC(); }, 150));
  pb.addEventListener('click', e => {
    if (e.target.closest('[data-addtoggle]')) { e.target.closest('.add').classList.toggle('open'); return; }
    const add = e.target.closest('[data-add]'); if (add) { insertBlock(add.dataset.add); return; }
    const ins = e.target.closest('[data-ins]'); if (ins) { showAddMenu(ins, +ins.dataset.ins); return; }
    const sn = e.target.closest('[data-snip]');
    if (sn) { const ta = sn.closest('.bk').querySelector('textarea'); ta.focus(); const s = SNIPS[+sn.dataset.snip][1]; const atStart = ta.selectionStart === 0 || ta.value[ta.selectionStart - 1] === '\n'; document.execCommand('insertText', false, (s.startsWith(' ') || atStart ? '' : '\n') + s); return; }
    const act = e.target.closest('[data-act]'); if (!act) { const dz = e.target.closest('.imgdrop'); if (dz) dz.closest('.bkb').querySelector('input[type=file]').click(); return; }
    const el = act.closest('.bk'); const i = doc.blocks.findIndex(x => x.id === el.dataset.id); const b = doc.blocks[i];
    const a = act.dataset.act;
    if (a === 'toggle') { if (collapsed.has(b.id)) collapsed.delete(b.id); else collapsed.add(b.id); el.classList.toggle('col'); if (!el.classList.contains('col')) el.querySelectorAll('textarea').forEach(t => t.classList.contains('code') ? paintHL(t) : autosize(t)); return; }
    if (a === 'up' && i > 0) { [doc.blocks[i - 1], doc.blocks[i]] = [doc.blocks[i], doc.blocks[i - 1]]; }
    else if (a === 'down' && i < doc.blocks.length - 1) { [doc.blocks[i + 1], doc.blocks[i]] = [doc.blocks[i], doc.blocks[i + 1]]; }
    else if (a === 'dup') { const c = JSON.parse(JSON.stringify(b)); c.id = uid(); doc.blocks.splice(i + 1, 0, c); }
    else if (a === 'del') { const removed = doc.blocks.splice(i, 1)[0]; toast('Bloque eliminado', 'Deshacer', () => { doc.blocks.splice(i, 0, removed); renderBlocks(); changed(); }); }
    else return;
    renderBlocks(); changed();
  });
  pb.addEventListener('change', e => {
    if (e.target.type !== 'file') return;
    const el = e.target.closest('.bk'); const b = doc.blocks.find(x => x.id === el.dataset.id);
    const f = e.target.files[0]; if (f) loadImage(f, url => { b.data = url; renderBlocks(); changed(); });
  });
  pb.addEventListener('dragover', e => { if (e.target.closest('.imgdrop')) e.preventDefault(); });
  pb.addEventListener('drop', e => {
    const dz = e.target.closest('.imgdrop'); if (!dz) return; e.preventDefault();
    const b = doc.blocks.find(x => x.id === dz.closest('.bk').dataset.id); const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadImage(f, url => { b.data = url; renderBlocks(); changed(); });
  });
  document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (!item) return;
    const sel = doc.blocks.find(x => x.id === selId);
    const f = item.getAsFile(); e.preventDefault();
    loadImage(f, url => {
      if (sel && sel.type === 'image') sel.data = url;
      else { const at = sel ? doc.blocks.indexOf(sel) + 1 : doc.blocks.length; const nb = { id: uid(), type: 'image', data: url, caption: '', width: 70 }; doc.blocks.splice(at, 0, nb); selId = nb.id; }
      renderBlocks(); changed(); toast('Imagen insertada');
    });
  });
  function showAddMenu(btn, at) {
    document.querySelectorAll('.menu').forEach(m => m.remove());
    const r = btn.getBoundingClientRect();
    const m = h(`<div class="menu" style="top:${Math.min(r.bottom + 4, window.innerHeight - 440)}px;left:${Math.max(8, r.left - 60)}px">${Object.keys(TYPES).map(t => `<button data-addat="${t}">${I[TYPES[t].icon]}${TYPES[t].name}</button>`).join('')}</div>`);
    m.addEventListener('click', e => { const b = e.target.closest('[data-addat]'); if (b) { m.remove(); insertBlock(b.dataset.addat, at); } });
    document.body.appendChild(m);
  }

  // proyecto
  const pp = $('#p-proyecto');
  pp.addEventListener('input', e => {
    if (e.target.dataset.m) { doc.meta[e.target.dataset.m] = e.target.value; if (e.target.dataset.m === 'titulo') $('#dtitle').value = e.target.value; saveMetaDefaults(); changed(); }
    if (e.target.dataset.s) { const k = e.target.dataset.s; doc.settings[k] = e.target.type === 'checkbox' ? e.target.checked : (k === 'dec' ? +e.target.value : e.target.value); changed(); }
  });
  pp.addEventListener('change', e => { if (e.target.dataset.s) e.target.dispatchEvent(new Event('input', { bubbles: true })); });
  pp.addEventListener('click', e => {
    if (e.target.closest('[data-logo]')) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => i.files[0] && loadImage(i.files[0], u => { doc.meta.logo = u; saveMetaDefaults(); renderProject(); changed(); }, 500); i.click(); }
    if (e.target.closest('[data-nologo]')) { doc.meta.logo = ''; saveMetaDefaults(); renderProject(); changed(); }
  });

  // atajos
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if ((k === 'z' || k === 'y') && !inField) { e.preventDefault(); undoRedo(k === 'y' || e.shiftKey ? 1 : -1); return; }
    if (k === 's') { e.preventDefault(); saveFile(); } else if (k === 'o') { e.preventDefault(); openFile(); } else if (k === 'p') { e.preventDefault(); doPrint(); }
  });
  window.addEventListener('beforeprint', () => { if (lastRes) compute(); });

  // divisor redimensionable
  const sp = $('#split');
  sp.addEventListener('pointerdown', e => {
    sp.setPointerCapture(e.pointerId); const left = $('.left');
    const mv = (ev) => { const w = Math.min(Math.max(320, ev.clientX), window.innerWidth - 360); left.style.width = w + 'px'; };
    const up = () => { sp.removeEventListener('pointermove', mv); sp.removeEventListener('pointerup', up); try { localStorage.setItem('mc_w', left.style.width); } catch (er) { /* */ } };
    sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up);
  });
  try { const w = localStorage.getItem('mc_w'); if (w) $('.left').style.width = w; const th = localStorage.getItem('mc_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* */ }
  window.addEventListener('resize', debounce(() => setTab(tab), 150));

  if (EMBED) {
    document.querySelectorAll('[data-do="pdf"]').forEach(b => b.hidden = true);
    try { window.claude?.use?.('downloads').then(n => { dl = n; }).catch(() => { }); } catch (e) { /* */ }
  }
  boot();
}


// ---------------- Autocompletado del editor ----------------
const ac = { el: null, ta: null, items: [], sel: 0, start: 0 };
const AC_FUN = [['sqrt', 'raíz'], ['sqrtfc', "√f'c (kgf/cm²)"], ['si', 'si(cond, a, b)'], ['max', 'máximo'], ['min', 'mínimo'], ['abs', 'valor absoluto'], ['ceil', 'redondeo arriba'], ['floor', 'redondeo abajo'], ['round', 'redondeo'], ['roundup', 'redondear ↑ a múltiplo'], ['rounddown', 'redondear ↓ a múltiplo'], ['Ab', 'área de varilla #n'], ['db', 'diámetro de varilla #n'], ['Abmm', 'área varilla mm'], ['sin', 'seno'], ['cos', 'coseno'], ['tan', 'tangente'], ['cot', 'cotangente'], ['atan', 'arcotangente'], ['log', 'ln'], ['log10', 'log10'], ['exp', 'eˣ'], ['sum', 'suma'], ['cumsum', 'suma acumulada'], ['MtruckHL93', 'M camión HL-93'], ['MtandemHL93', 'M tándem HL-93'], ['MlaneHL93', 'M carril HL-93'], ['VtruckHL93', 'V camión HL-93'], ['CE030', 'factor C E.030'], ['check', 'verificación']];
for (const f of FN_DOCS) if (!AC_FUN.some(a => a[0] === f.name)) AC_FUN.push([f.name, f.desc || f.cat || 'función normativa']);
const AC_UNIT = ['tonf', 'kgf', 'kN', 'N', 'MPa', 'kPa', 'kgf/cm^2', 'tonf/m^2', 'tonf/m', 'tonf*m', 'kN*m', 'kN/m', 'cm', 'mm', 'm', 'cm^2', 'm^2', 'cm^4', 'deg', 'kip', 'ksi', 'kip*ft', 'in', 'ft', 'tonf/m^3'];
function caretXY(ta) {
  const m = document.createElement('div'); const cs = getComputedStyle(ta);
  for (const p of ['fontFamily', 'fontSize', 'lineHeight', 'padding', 'border', 'letterSpacing', 'whiteSpace', 'wordWrap', 'overflowWrap', 'tabSize', 'boxSizing']) m.style[p] = cs[p];
  m.style.position = 'absolute'; m.style.visibility = 'hidden'; m.style.width = ta.clientWidth + 'px'; m.style.whiteSpace = 'pre-wrap';
  m.textContent = ta.value.slice(0, ta.selectionStart); const sp = document.createElement('span'); sp.textContent = '​'; m.appendChild(sp);
  document.body.appendChild(m); const r = ta.getBoundingClientRect(); const x = r.left + sp.offsetLeft, y = r.top + sp.offsetTop + parseFloat(cs.lineHeight || 20); m.remove();
  return { x, y };
}
function suggest(ta) {
  const pos = ta.selectionStart, before = ta.value.slice(0, pos);
  const line = before.slice(before.lastIndexOf('\n') + 1);
  if (/^\s*["'#@]/.test(line) || line.includes('//')) return closeAC();
  const m = /([A-Za-z_][\w]*)$/.exec(before); if (!m || m[1].length < 2) return closeAC();
  const pre = m[1], lo = pre.toLowerCase();
  const afterNum = /\d\s*[A-Za-z_]*$/.test(line.slice(0, line.length - pre.length + 1)) && /\d\s+$/.test(line.slice(0, line.length - pre.length));
  const vars = lastRes ? [...lastRes.ctx.scope.keys()].filter(k => typeof lastRes.ctx.scope.get(k) !== 'function') : [];
  const items = [];
  if (afterNum) AC_UNIT.filter(u => u.toLowerCase().startsWith(lo)).forEach(u => items.push({ t: u, d: 'unidad', k: 'u' }));
  vars.filter(v => v.toLowerCase().startsWith(lo)).forEach(v => { let d = ''; try { d = valText(lastRes.ctx.scope.get(v)); } catch (e) { /* */ } items.push({ t: v, d, k: 'v' }); });
  AC_FUN.filter(f => f[0].toLowerCase().startsWith(lo)).forEach(f => items.push({ t: f[0], d: f[1], k: 'f' }));
  if (!afterNum) AC_UNIT.filter(u => /^[a-z]+$/i.test(u) && u.toLowerCase().startsWith(lo) && u !== pre && u.length > 2).forEach(u => items.push({ t: u, d: 'unidad', k: 'u' }));
  if (!items.length) return closeAC();
  const rank = (it) => (it.t === pre ? 0 : it.t.startsWith(pre) ? 1 : 2) * 100 + it.t.length;
  items.sort((a, b) => rank(a) - rank(b));
  if (items.length === 1 && items[0].t === pre) return closeAC();
  ac.ta = ta; ac.items = items.slice(0, 9); ac.sel = 0; ac.nav = false; ac.start = pos - pre.length;
  if (!ac.el) { ac.el = h('<div class="acbox"></div>'); document.body.appendChild(ac.el); ac.el.addEventListener('mousedown', e => { const it = e.target.closest('[data-i]'); if (it) { e.preventDefault(); ac.sel = +it.dataset.i; acceptAC(); } }); }
  const { x, y } = caretXY(ta);
  drawAC();
  const bh = ac.el.offsetHeight, lh = 22;
  ac.el.style.left = Math.max(8, Math.min(x, window.innerWidth - 310)) + 'px';
  ac.el.style.top = (y + 2 + bh > window.innerHeight - 70 ? y - lh - bh - 2 : y + 2) + 'px';
}
function drawAC() { ac.el.innerHTML = '<div class="achint">Tab para completar · ↑↓ elegir</div>' + ac.items.map((it, i) => `<div data-i="${i}" class="aci${i === ac.sel ? ' on' : ''}"><b class="k-${it.k}">${esc(it.t)}</b><span>${esc(it.d || '')}</span></div>`).join(''); }
function acceptAC() {
  const it = ac.items[ac.sel], ta = ac.ta; if (!it) return closeAC();
  ta.focus(); ta.setSelectionRange(ac.start, ta.selectionStart);
  document.execCommand('insertText', false, it.t + (it.k === 'f' && it.t !== 'check' ? '(' : it.t === 'check' ? ' ' : ''));
  closeAC();
}
function closeAC() { if (ac.el) { ac.el.remove(); ac.el = null; } }

function loadImage(file, cb, max = 1600) {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      if (s === 1 && file.size < 400000) return cb(r.result);
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      cb(file.type === 'image/png' && file.size < 900000 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => toast('No se pudo leer la imagen');
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

async function boot() {
  let d = null, first = false;
  try { const id = localStorage.getItem('mc_last'); if (id) d = await dbGet(id); } catch (e) { /* */ }
  // archivo abierto con doble clic (lanzador de Windows)
  try {
    const tok = new URLSearchParams(location.search).get('abrir');
    if (tok && location.protocol.startsWith('http')) {
      const r = await fetch('/stash/' + encodeURIComponent(tok));
      if (r.ok) { const j = await r.json(); const dd = j.doc || j; if (Array.isArray(dd.blocks)) { d = dd; setTimeout(() => toast('Memoria abierta: ' + esc(dd.meta?.titulo || '')), 300); } }
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) { /* */ }
  if (!d) { doc = newDoc(TEMPLATES.find(t => t.id === 'viga')); first = true; } else doc = migrate(d);
  loadUI(); compute();
  if (first) { setTab('datos'); showTemplates(true); }
  void math;
}
