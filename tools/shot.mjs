import { chromium } from 'playwright';
const [,, file, out, w='1440', h='900', click] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('file://' + file);
await p.waitForTimeout(1200);
if (click) { for (const c of click.split('||')) { try { await p.click(c, {timeout:2000}); await p.waitForTimeout(700);} catch(e){console.log('noclick',c)} } }
await p.screenshot({ path: out });
await b.close();
