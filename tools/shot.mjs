// Captura de pantalla de MemoriaCalc con Playwright.
//   node tools/shot.mjs <html> <salida.png> [ancho] [alto] [clics] [opciones]
//   clics: selectores separados por «||». «[data-t=ID]» abre la plantilla ID (vía ?plantilla=ID).
//   opciones (después de los clics, en cualquier orden):
//     --scroll=SEL     desplaza la vista previa hasta SEL (p. ej. ".figure", "#paper .blk:nth-of-type(5)")
//     --fig=N          desplaza la vista previa hasta la figura N (1 = primera) y captura solo esa figura
//     --el=SEL         captura solo el elemento SEL
//     --paper          captura la memoria completa (todas las páginas de la vista previa)
//     --dark           tema oscuro
//     --wait=MS        espera adicional antes de capturar (por defecto 700)
import { chromium } from 'playwright';
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [file, out, w = '1440', h = '900', click] = args.filter(a => !a.startsWith('--'));
if (!file || !out) { console.log('Uso: node tools/shot.mjs <html> <salida.png> [ancho] [alto] [clics] [--scroll=SEL|--fig=N|--el=SEL|--paper|--dark]'); process.exit(1); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: opts.dark ? 'dark' : 'light' });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
let clicks = click ? click.split('||') : [];
let url = 'file://' + file;
const tm = clicks.length && /^\[data-t=["']?([\w-]+)["']?\]$/.exec(clicks[0].trim());
if (tm) { url += '?plantilla=' + tm[1]; clicks = clicks.slice(1); }
await p.addInitScript(() => { try { localStorage.setItem('mc_tour', 'done'); } catch (e) { /* */ } });
await p.goto(url);
await p.waitForTimeout(1200);
if (tm) await p.evaluate(() => document.querySelectorAll('.ov,.toast').forEach(o => o.remove()));
for (const c of clicks) {
  try {
    if (!(await p.$(c)) && /data-t=/.test(c)) { await p.evaluate(() => document.querySelector('[data-do=tpl]')?.click()); await p.waitForTimeout(300); }
    await p.click(c, { timeout: 2000 }); await p.waitForTimeout(700);
  } catch (e) { console.log('noclick', c); }
}
await p.evaluate(() => document.querySelectorAll('.toast').forEach(o => o.remove()));
const scrollTo = async (sel) => { const ok = await p.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.scrollIntoView({ block: 'start' }); return true; }, sel); if (!ok) console.log('noscroll', sel); return ok; };
if (opts.scroll) await scrollTo(String(opts.scroll));
let target = null;
if (opts.fig) { const sel = `#paper .figure >> nth=${(+opts.fig || 1) - 1}`; target = p.locator(sel); await target.scrollIntoViewIfNeeded().catch(() => console.log('nofig', opts.fig)); }
if (opts.el) { target = p.locator(String(opts.el)).first(); await target.scrollIntoViewIfNeeded().catch(() => console.log('noel', opts.el)); }
if (opts.paper) {
  // desplegar la vista previa a su altura natural y capturar el papel completo
  await p.evaluate(() => document.getElementById('paper')?.classList.add('cvoff'));
  await p.addStyleTag({ content: '#paper section.blk{content-visibility:visible!important}html,body,#app{height:auto!important;overflow:visible!important}.main{display:block!important}.left,.split,.sbar,.bnav,.top{display:none!important}.right{display:block!important;overflow:visible!important;height:auto!important}' });
  await p.waitForTimeout(300);
  target = p.locator('#paper');
}
await p.waitForTimeout(+opts.wait || 700);
if (target) await target.screenshot({ path: out }); else await p.screenshot({ path: out });
await b.close();
