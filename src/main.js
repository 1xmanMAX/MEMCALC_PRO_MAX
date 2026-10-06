import { start } from './ui.js';
const go = () => {
  start();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && window.MC_PWA) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Latido para el lanzador de Windows (mantiene vivo el servidor local)
  if (location.hostname === '127.0.0.1' && location.port === '47613') {
    const ping = () => fetch('/ping', { cache: 'no-store' }).catch(() => {});
    ping(); setInterval(ping, 8000);
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
