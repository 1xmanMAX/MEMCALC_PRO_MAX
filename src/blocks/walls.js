// =====================================================================
//  Bloques gráficos — módulo «walls»
//   · retwall   : estabilidad de muros (voladizo / gravedad / dentellón / talud)
//   · wallrebar : momentos en la pantalla, capacidad y corte de barras
// =====================================================================
import { registerBlock, F } from '../blockreg.js';
import { evalParam, esc, math, K, fmtPlain, BARS } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, f2 } from '../blocks.js';

const { sin, cos, tan, atan, sqrt, PI, max, min, abs } = Math;
const D2R = PI / 180;
const U = (v, u) => math.unit(v, u);
const angP = (s, S, def) => { if (s === undefined || s === null || String(s).trim() === '') return def; const v = math.evaluate(String(s), new Map(S)); return math.isUnit(v) ? v.toNumber('rad') : Number(v) * D2R; };
const bool = (v, def) => (v === undefined || v === '' ? def : v === true || v === 'true' || v === '1' || v === 1 || v === 'si' || v === 'sí');

// ---------- coeficientes (mismas expresiones que src/norms/walls.js) ----------
function KaRk(phi, beta) { const cb = cos(beta), r = sqrt(max(0, cb * cb - cos(phi) ** 2)); return cb * (cb - r) / (cb + r); }
function KpRk(phi) { return (1 + sin(phi)) / (1 - sin(phi)); }
function KaCl(phi, delta, beta, theta) { const a = sin(phi + delta) * sin(phi - beta), b = cos(delta + theta) * cos(theta - beta); return cos(phi - theta) ** 2 / (cos(theta) ** 2 * cos(delta + theta) * (1 + sqrt(max(0, a / b))) ** 2); }
function KaeM(phi, delta, kh, kv, beta, theta) {
  const psi = atan(kh / (1 - kv));
  // φ − β − ψ < 0: sin equilibrio; se anula la raíz (EN 1998-5 E.4) y el bloque marca NO CUMPLE
  const a = sin(phi + delta) * max(0, sin(phi - beta - psi)), b = cos(delta + theta + psi) * cos(beta - theta);
  return cos(phi - theta - psi) ** 2 / (cos(psi) * cos(theta) ** 2 * cos(delta + theta + psi) * (1 + sqrt(max(0, a / b))) ** 2);
}
function KpeM(phi, kh, kv) { // δ = 0, β = 0, θ = 0
  const psi = atan(kh / (1 - kv)), r = sqrt(sin(phi) * max(0, sin(phi - psi)) / cos(psi));
  return cos(phi - psi) ** 2 / (cos(psi) * cos(psi) * (1 - r) ** 2);
}
// polígono: recorte por la recta horizontal y = yc (below = parte inferior) y propiedades (área, centroide)
function clipY(poly, yc, below) {
  const out = [], inside = (p) => (below ? p[1] <= yc : p[1] >= yc);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (yc - a[1]) / (b[1] - a[1]); out.push([a[0] + t * (b[0] - a[0]), yc]); }
  }
  return out;
}
function polyProps(p) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length], c = x1 * y2 - x2 * y1; A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c; }
  if (abs(A) < 1e-12) return { A: 0, x: 0, y: 0 };
  return { A: abs(A) / 2, x: cx / (3 * A), y: cy / (3 * A) };
}
const tri = (p) => { // área y centroide de un triángulo
  const A = abs((p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1])) / 2;
  return { A, x: (p[0][0] + p[1][0] + p[2][0]) / 3, y: (p[0][1] + p[1][1] + p[2][1]) / 3 };
};

// =====================================================================
//  retwall — estabilidad externa de muros de contención
// =====================================================================
function renderRetwall(b, ctx) {
  const S = ctx.scope;
  const P = (k, u, d) => evalParam(b[k], S, u, d);
  const tipo = String(b.tipo || 'voladizo');
  const H = P('H', 'm', 5), B = P('B', 'm', 3.2), hz = P('hz', 'm', 0.5), p = P('punta', 'm', 0.8);
  const t1 = P('t1', 'm', 0.25), t2 = P('t2', 'm', 0.45);
  const ie = P('ie', 'm', t2 - t1);
  const ib = t2 - t1 - ie;
  const bk = P('bk', 'm', 0), hk = P('hk', 'm', 0), xk = P('xk', 'm', p);
  const beta = angP(b.beta, S, 0), phi = angP(b.phi, S, 30 * D2R), delta = angP(b.delta, S, 2 / 3 * phi);
  const gs = P('gs', 'tonf/m^3', 1.8), gc = P('gc', 'tonf/m^3', 2.4), q = P('q', 'tonf/m^2', 0);
  const gf = P('gf', 'tonf/m^3', gs), phif = angP(b.phif, S, phi), cf = P('cf', 'tonf/m^2', 0);
  const mu = P('mu', '', tan(2 / 3 * phif)), ca = P('ca', 'tonf/m^2', 2 / 3 * cf);
  const Df = P('Df', 'm', hz), fp = P('fp', '', 0);
  const kh = P('kh', '', 0), kv = P('kv', '', 0), ysis = P('ysis', '', 0.6), qsis = P('qsis', '', 0.5);
  const qa = P('qa', 'tonf/m^2', 0), qas = P('qas', 'tonf/m^2', 1.2 * qa);
  // nivel freático en el relleno (altura sobre el fondo de la base; 0 = relleno drenado)
  const hw = max(0, P('hw', 'm', 0)), gw = P('gw', 'tonf/m^3', 1.0), gsat = P('gsat', 'tonf/m^3', gs + 0.2);
  const gsub = gsat - gw;
  const fsv = P('fsv', '', 1.5), fsd = P('fsd', '', 1.5), fsvs = P('fsvs', '', 1.25), fsds = P('fsds', '', 1.25);
  const metodo = /coul/i.test(b.metodo || '') ? 'coulomb' : 'rankine';
  const qest = bool(b.qest, false), verif = bool(b.verif, true), si = bool(b.si, false);
  const sfx = String(b.sufijo || '').trim();
  for (const [k, v] of Object.entries({ H, B, hz, t1, t2 })) if (!(v > 0)) throw new Error('El parámetro ' + k + ' debe ser mayor que cero');
  if (ie < -1e-9 || ib < -1e-9) throw new Error('Talud de la pantalla incoherente: 0 ≤ ie ≤ t2 − t1');
  if (p + t2 > B + 1e-9) throw new Error('La punta más el espesor de la pantalla excede el ancho de la base B');
  if (hz >= H) throw new Error('El espesor de la zapata debe ser menor que la altura total H');
  if (beta > phi) throw new Error('El talud del relleno β no puede superar a φ');
  if (hw > 0 && !(gsub > 0)) throw new Error('Con nivel freático, γsat debe ser mayor que γw');
  if (!(fp >= 0 && fp <= 1)) throw new Error('La fracción de empuje pasivo fp debe estar entre 0 y 1');
  const hp = H - hz, xbb = p + t2, xbt = p + ie + t1, Lt = B - xbb, Lb = B - xbt;
  const seis = kh > 0;

  // ---------- pesos ----------
  const parts = [];
  const add = (id, desc, A, g, x, y, grp) => { if (A > 1e-9) parts.push({ id, desc, A, g, W: A * g, x, y, grp }); };
  // suelo: polígono [[x,y],...]; si hay nivel freático se divide en parte seca (γ) y saturada (γsat)
  const addSoil = (id, desc, poly) => {
    if (hw > 0) {
      const lo = polyProps(clipY(poly, hw, true)), hi = polyProps(clipY(poly, hw, false));
      if (hi.A > 1e-9) add(id, desc, hi.A, gs, hi.x, hi.y, 's');
      if (lo.A > 1e-9) add(id + 'w', desc + ' (bajo el N.F., γsat)', lo.A, gsat, lo.x, lo.y, 's');
    } else { const pp = polyProps(poly); add(id, desc, pp.A, gs, pp.x, pp.y, 's'); }
  };
  add('1', 'Pantalla (rectángulo)', t1 * hp, gc, p + ie + t1 / 2, hz + hp / 2, 'm');
  if (ie > 1e-9) { const t = tri([[p, hz], [p + ie, hz], [p + ie, H]]); add('2', 'Pantalla (triángulo frontal)', t.A, gc, t.x, t.y, 'm'); }
  if (ib > 1e-9) { const t = tri([[xbt, hz], [xbb, hz], [xbt, H]]); add('3', 'Pantalla (triángulo posterior)', t.A, gc, t.x, t.y, 'm'); }
  add('4', tipo === 'gravedad' ? 'Base / cimiento' : 'Zapata', B * hz, gc, B / 2, hz / 2, 'm');
  if (bk > 0 && hk > 0) add('5', 'Dentellón (llave de corte)', bk * hk, gc, xk + bk / 2, -hk / 2, 'm');
  let Hv, theta = 0, xplane = (y) => B, Kth, tb;
  if (metodo === 'rankine') {
    Hv = H + Lb * tan(beta);
    if (Lt > 1e-9) addSoil('S1', 'Relleno sobre el talón', [[xbb, hz], [B, hz], [B, H], [xbb, H]]);
    if (ib > 1e-9) addSoil('S2', 'Relleno sobre el trasdós inclinado', [[xbt, H], [xbb, H], [xbb, hz]]);
    if (beta > 1e-9 && Lb > 1e-9) addSoil('S3', 'Cuña del talud sobre el talón', [[xbt, H], [B, H], [B, Hv]]);
  } else {
    Hv = H; theta = atan(Lb / H); xplane = (y) => B - Lb * y / H;
    const xph = xplane(hz);
    if (xph - xbb > 1e-9 || ib > 1e-9) addSoil('S1', 'Suelo entre el trasdós y el plano de Coulomb', [[xbb, hz], [xph, hz], [xbt, H]]);
  }
  const Ka = b.Ka ? P('Ka', '', 0.33) : (metodo === 'rankine' ? KaRk(phi, beta) : KaCl(phi, delta, beta, theta));
  // ángulo del empuje con la horizontal
  tb = metodo === 'rankine' ? beta : delta + theta;
  Kth = metodo === 'rankine' ? 1 : cos(theta) * cos(beta) / cos(theta - beta);
  const Kae = seis ? (b.Kae ? P('Kae', '', Ka) : (metodo === 'rankine' ? KaeM(phi, beta, kh, kv, beta, 0) : KaeM(phi, delta, kh, kv, beta, theta))) : Ka;
  // relleno sumergido (agua retenida, Matsuzawa et al. 1985; Kramer 1996 §11.6.2): kh' = kh·γsat/γ'
  const khw = hw > 0 ? kh * gsat / gsub : kh;
  const Kaew = seis && hw > 0 ? (b.Kae ? Kae : (metodo === 'rankine' ? KaeM(phi, beta, khw, kv, beta, 0) : KaeM(phi, delta, khw, kv, beta, theta))) : Kae;
  const Kp = b.Kp ? P('Kp', '', 3) : KpRk(phif);
  const Kpe = seis ? KpeM(phif, kh, kv) : Kp;

  // ---------- empujes ----------
  // empuje del suelo por tramos (seco sobre el N.F. con γ, sumergido con γ'): resultante y altura
  const yw = min(hw, Hv), dw = Hv - yw;
  const soilThr = (K1, K2) => { // K1 sobre el N.F., K2 bajo el N.F.
    const s1 = gs * dw, P1 = 0.5 * K1 * s1 * dw, y1 = yw + dw / 3;
    if (yw <= 0) return { P: P1, y: y1 };
    const a = K2 * s1, c = K2 * (s1 + gsub * yw), P2 = (a + c) / 2 * yw, y2 = yw * (c + 2 * a) / (3 * (a + c) || 1);
    const P = P1 + P2; return { P, y: P > 0 ? (P1 * y1 + P2 * y2) / P : Hv / 3 };
  };
  const EA = soilThr(Ka, Ka), Pa = EA.P, Pq = Ka * q * Hv * Kth;
  const EAE = seis ? soilThr(Kae, Kaew) : EA;
  const Pae = seis ? EAE.P * (1 - kv) : Pa, DPae = Pae - Pa;
  const Pw = 0.5 * gw * yw * yw, Uw = 0.5 * gw * yw * B; // agua: hidrostático en el plano y subpresión triangular (talón → punta)
  const Pqe = seis ? Kae * qsis * q * Hv * Kth : 0;
  const Dp = Df + (bk > 0 ? hk : 0), ybot = bk > 0 ? -hk : 0;
  const pass = (Kx) => { const P1 = 0.5 * Kx * gf * Dp * Dp, P2 = 2 * cf * sqrt(Kx) * Dp; const Pt = fp * (P1 + P2); const yy = Pt > 0 ? ybot + fp * (P1 * Dp / 3 + P2 * Dp / 2) / Pt : 0; return { P: Pt, y: abs(yy) < 1e-9 ? 0 : yy }; };
  const Pp = pass(Kp), Ppe = pass(Kpe);
  const xa = (y) => xplane(y);
  const ch = cos(tb), sv = sin(tb);
  const thr = [];
  const wTh = { id: 'Ew', desc: 'Presión hidrostática del agua en el relleno (N.F. a ' + f2(yw) + ' m)', P: Pw / cos(theta), y: yw / 3, ch: cos(theta), sv: sin(theta) };
  thr.push({ id: 'Ea', desc: 'Empuje activo del relleno' + (yw > 0 ? ' (γ\' bajo el N.F.)' : ''), P: Pa, y: EA.y, c: 'e' });
  if (q > 0) thr.push({ id: 'Eq', desc: 'Empuje de la sobrecarga', P: Pq, y: Hv / 2, c: 'e' });
  if (yw > 0) thr.push(wTh);
  const thrS = [];
  thrS.push({ id: 'Ea', desc: 'Empuje activo estático', P: Pa, y: EA.y });
  if (yw > 0) thrS.push(wTh);
  if (seis) thrS.push({ id: 'ΔEae', desc: 'Incremento dinámico M-O (a ' + f2(ysis, 2) + 'H)', P: DPae, y: ysis * Hv });
  if (Pqe > 0) thrS.push({ id: 'Eqe', desc: 'Sobrecarga en sismo (' + f2(qsis, 2) + 'q, Kae)', P: Pqe, y: Hv / 2 });

  // ---------- estabilidad ----------
  const sumW = (f = 1) => parts.reduce((t, r) => t + r.W * f, 0);
  const sumMW = (f = 1) => parts.reduce((t, r) => t + r.W * f * r.x, 0);
  const qW = q * Lb, qx = xbt + Lb / 2;
  function stab(list, wf, Ppass, inert, qf) {
    let Fh = 0, Fv = 0, Mo = 0, Mrv = 0;
    for (const t of list) { const c1 = t.ch ?? ch, s1 = t.sv ?? sv; Fh += t.P * c1; Fv += t.P * s1; Mo += t.P * c1 * t.y; Mrv += t.P * s1 * xa(t.y); }
    if (Uw > 0) { Fv -= Uw; Mo += Uw * 2 * B / 3; } // subpresión: reduce ΣV y su momento se suma al de volteo
    let Mi = 0, Fi = 0;
    if (inert) for (const r of parts) { Fi += kh * r.W; Mi += kh * r.W * r.y; }
    const V = sumW(wf) + Fv + (qest ? qf * qW : 0), Mr = sumMW(wf) + Mrv + (qest ? qf * qW * qx : 0);
    const MoT = Mo + Mi, FhT = Fh + Fi;
    const FSv = Mr / MoT, Rs = mu * V + ca * B + Ppass.P, FSd = Rs / FhT;
    const Vq = V + (qest ? 0 : qf * qW), Mq = Mr + (qest ? 0 : qf * qW * qx);
    const xr = (Mq - MoT) / Vq, e = B / 2 - xr, ea = abs(e);
    let qmax, qmin, Lc = B;
    if (ea <= B / 6 + 1e-12) { qmax = Vq / B * (1 + 6 * ea / B); qmin = Vq / B * (1 - 6 * ea / B); }
    else if (ea < B / 2) { Lc = 3 * (B / 2 - ea); qmax = 2 * Vq / Lc; qmin = 0; }
    else { Lc = 0.03 * B; qmax = 2 * Vq / Lc; qmin = 0; } // resultante fuera de la base (vuelca): valor acotado, el bloque marca NO CUMPLE
    return { Fh, Fv, Mo, Mrv, Fi, Mi, V, Mr, MoT, FhT, FSv, Rs, FSd, Vq, Mq, xr, e, qmax, qmin, Lc, toeMax: e >= 0 };
  }
  const st = stab(thr, 1, Pp, false, 1);
  const ss = seis ? stab(thrS, 1 - kv, Ppe, true, qsis) : null;

  // ---------- exportar ----------
  const tf = (v) => U(v, 'tonf/m'), tfm = (v) => U(v, 'tonf*m/m'), tm2 = (v) => U(v, 'tonf/m^2');
  const ex = (n, v) => setVar(ctx, n + sfx, v);
  ex('Ka', Ka); ex('Kp', Kp); ex('Hv', U(Hv, 'm')); ex('Pa', tf(Pa + Pq)); ex('Pah', tf((Pa + Pq) * ch)); ex('SV', tf(st.V)); ex('SMr', tfm(st.Mr)); ex('SMo', tfm(st.MoT));
  ex('FSv', st.FSv); ex('FSd', st.FSd); ex('xr', U(st.xr, 'm')); ex('e', U(st.e, 'm')); ex('qmax', tm2(st.qmax)); ex('qmin', tm2(st.qmin)); ex('Ep', tf(Pp.P)); ex('yEa', U(EA.y, 'm'));
  if (yw > 0) { ex('Pw', tf(Pw)); ex('Uw', tf(Uw)); }
  ex('qtoe', tm2(st.toeMax ? st.qmax : st.qmin)); ex('qheel', tm2(st.toeMax ? st.qmin : st.qmax));
  if (seis) {
    ex('Kae', Kae); ex('Pae', tf(Pae)); ex('DPae', tf(DPae)); ex('FSvs', ss.FSv); ex('FSds', ss.FSd); ex('es', U(ss.e, 'm')); ex('qmaxs', tm2(ss.qmax)); ex('qmins', tm2(ss.qmin));
    ex('qtoes', tm2(ss.toeMax ? ss.qmax : ss.qmin)); ex('qheels', tm2(ss.toeMax ? ss.qmin : ss.qmax));
  }
  const rows = [
    { l: 'Factor de seguridad al volteo F.S.v = ΣMr/ΣMo', a: st.FSv, s: ss && ss.FSv, la: fsv, ls: fsvs, ge: true },
    { l: 'Factor de seguridad al deslizamiento F.S.d = (μΣV + ca·B + Ep)/ΣFh', a: st.FSd, s: ss && ss.FSd, la: fsd, ls: fsds, ge: true },
    { l: 'Excentricidad |e| (estático ≤ B/6: sin tracción; sismo ≤ B/3)', a: abs(st.e), s: ss && abs(ss.e), la: B / 6, ls: B / 3, ge: false, u: 'm' },
  ];
  if (qa > 0) rows.push({ l: 'Presión máxima en el suelo q<sub>max</sub> ≤ q<sub>a</sub>', a: st.qmax, s: ss && ss.qmax, la: qa, ls: qas, ge: false, u: si ? 'kPa' : 't/m²', k: si ? 9.80665 : 1 });
  const lbl = ['Volteo', 'Deslizamiento', 'Excentricidad en la base (resultante en el núcleo)', 'Presión máxima sobre el suelo'];
  const art = [' (E.050 39.13.6)', ' (E.050 39.13.6)', ' (estático: núcleo central B/6, Das 8.4; sismo: 2/3 centrales, AASHTO 11.6.5.1)', ' (E.050 Art. 21–22)'];
  if (verif && seis) { const mg = phi - beta - atan(khw / (1 - kv)); ctx.checks.push({ ok: mg >= -1e-12, label: 'Equilibrio sísmico del relleno φ − β − ψ = ' + f2(mg / D2R, 1) + '° ≥ 0 (Mononobe–Okabe)', ratio: mg >= 0 ? (beta + atan(khw / (1 - kv))) / phi : 1 + (-mg) / phi, block: ctx.blockId }); }
  if (verif) rows.forEach((r, i) => {
    const okA = r.ge ? r.a >= r.la : r.a <= r.la + 1e-12;
    ctx.checks.push({ ok: okA && isFinite(r.a), label: lbl[i] + ' — estático' + art[i], ratio: r.ge ? r.la / r.a : r.a / r.la, block: ctx.blockId });
    if (ss) { const okS = r.ge ? r.s >= r.ls : r.s <= r.ls + 1e-12; ctx.checks.push({ ok: okS && isFinite(r.s), label: lbl[i] + ' — sismo' + art[i], ratio: r.ge ? r.ls / r.s : r.s / r.ls, block: ctx.blockId }); }
  });

  // ---------- tablas ----------
  const kF = si ? 9.80665 : 1, uF = si ? 'kN/m' : 't/m', uM = si ? 'kN·m/m' : 't·m/m', uG = si ? 'kN/m³' : 't/m³', uP = si ? 'kPa' : 't/m²';
  const n2 = (v, d = 2) => fmtPlain(v, d);
  let t1h = `<table class="tbl"><thead><tr><th>#</th><th>Elemento</th><th>Área [m²]</th><th>γ [${uG}]</th><th>W [${uF}]</th><th>x [m]</th><th>W·x [${uM}]</th>${seis ? `<th>y [m]</th><th>k<sub>h</sub>·W·y [${uM}]</th>` : ''}</tr></thead><tbody>`;
  for (const r of parts) t1h += `<tr><td>W${esc(r.id)}</td><td style="text-align:left">${esc(r.desc)}</td><td>${n2(r.A, 3)}</td><td>${n2(r.g * kF)}</td><td>${n2(r.W * kF)}</td><td>${n2(r.x, 3)}</td><td>${n2(r.W * r.x * kF)}</td>${seis ? `<td>${n2(r.y, 3)}</td><td>${n2(kh * r.W * r.y * kF)}</td>` : ''}</tr>`;
  t1h += `<tr class="tot"><td>Σ</td><td></td><td></td><td></td><td>${n2(sumW() * kF)}</td><td></td><td>${n2(sumMW() * kF)}</td>${seis ? `<td></td><td>${n2(parts.reduce((t, r) => t + kh * r.W * r.y, 0) * kF)}</td>` : ''}</tr></tbody></table>`;
  const thrRow = (t) => { const c1 = t.ch ?? ch, s1 = t.sv ?? sv; return `<tr><td>${esc(t.id)}</td><td style="text-align:left">${esc(t.desc)}</td><td>${n2(t.P * kF)}</td><td>${n2(t.P * c1 * kF)}</td><td>${n2(t.P * s1 * kF)}</td><td>${n2(t.y, 3)}</td><td>${n2(xa(t.y), 3)}</td><td>${n2(t.P * c1 * t.y * kF)}</td><td>${n2(t.P * s1 * xa(t.y) * kF)}</td></tr>`; };
  let t2h = `<table class="tbl"><thead><tr><th>Caso</th><th>Empuje</th><th>E [${uF}]</th><th>E<sub>h</sub></th><th>E<sub>v</sub></th><th>y [m]</th><th>x [m]</th><th>M<sub>o</sub> = E<sub>h</sub>·y</th><th>M<sub>r</sub> = E<sub>v</sub>·x</th></tr></thead><tbody>`;
  t2h += thr.map(t => thrRow(t).replace('<tr>', '<tr><td rowspan="1">Estático</td>')).join('');
  if (seis) t2h += thrS.map(t => thrRow(t).replace('<tr>', '<tr><td>Sismo</td>')).join('') + `<tr><td>Sismo</td><td>Fi</td><td style="text-align:left">Inercia del muro y del suelo (k<sub>h</sub>ΣW)</td><td>${n2(ss.Fi * kF)}</td><td>${n2(ss.Fi * kF)}</td><td>0</td><td>—</td><td>—</td><td>${n2(ss.Mi * kF)}</td><td>0</td></tr>`;
  if (Uw > 0) t2h += `<tr><td>Ambos</td><td>U</td><td style="text-align:left">Subpresión en la base (triangular: γ<sub>w</sub>h<sub>w</sub> en el talón, 0 en la punta)</td><td>${n2(Uw * kF)}</td><td>—</td><td>−${n2(Uw * kF)}</td><td>—</td><td>${n2(2 * B / 3, 3)}</td><td>${n2(Uw * 2 * B / 3 * kF)}</td><td>—</td></tr>`;
  if (Pp.P > 0) t2h += `<tr><td>Estático</td><td>Ep</td><td style="text-align:left">Empuje pasivo (${f2(fp * 100, 0)} %, D = ${f2(Dp)} m)</td><td>${n2(Pp.P * kF)}</td><td>${n2(Pp.P * kF)}</td><td>0</td><td>${n2(Pp.y, 3)}</td><td>—</td><td>—</td><td>—</td></tr>`;
  t2h += '</tbody></table>';
  // fila con 10 celdas → la cabecera necesita una columna más
  t2h = t2h.replace('<th>Empuje</th>', '<th>Id</th><th>Empuje</th>');
  const fmtR = (v, u) => (isFinite(v) ? n2(v, u === 'm' ? 3 : 2) + (u ? ' ' + u : '') : '∞');
  let t3h = `<table class="tbl"><thead><tr><th>Verificación</th><th>Estático</th><th>Mínimo / Máximo</th>${ss ? '<th>Sismo</th><th>Mínimo / Máximo</th>' : ''}</tr></thead><tbody>`;
  for (const r of rows) {
    const k = r.k || 1;
    const okA = r.ge ? r.a >= r.la : r.a <= r.la + 1e-12, okS = ss ? (r.ge ? r.s >= r.ls : r.s <= r.ls + 1e-12) : true;
    const mk = (ok) => (ok ? '<span class="ok">✔</span>' : '<span class="bad">✘</span>');
    t3h += `<tr><td style="text-align:left">${r.l}</td><td>${fmtR(r.a * k, r.u)} ${mk(okA)}</td><td>${r.ge ? '≥ ' : '≤ '}${fmtR(r.la * k, r.u)}</td>${ss ? `<td>${fmtR(r.s * k, r.u)} ${mk(okS)}</td><td>${r.ge ? '≥ ' : '≤ '}${fmtR(r.ls * k, r.u)}</td>` : ''}</tr>`;
  }
  t3h += '</tbody></table>';
  // ecuaciones resumen (KaTeX)
  const ln = (s) => `<div class="ln"><div class="eq">${K(s)}</div></div>`;
  const kt = (v, d = 2) => fmtPlain(v * kF, d);
  const uK = si ? '\\mathrm{kN}' : '\\mathrm{t}';
  let eqs = '';
  const Kname = metodo === 'rankine' ? `K_a = ${fmtPlain(Ka, 4)}\\;\\text{(Rankine, }\\beta=${fmtPlain(beta / D2R, 1)}^\\circ)` : `K_a = ${fmtPlain(Ka, 4)}\\;\\text{(Coulomb, }\\delta=${fmtPlain(delta / D2R, 1)}^\\circ,\\ \\theta=${fmtPlain(theta / D2R, 2)}^\\circ,\\ \\beta=${fmtPlain(beta / D2R, 1)}^\\circ)`;
  eqs += ln(Kname + (seis ? `\\qquad K_{ae} = ${fmtPlain(Kae, 4)}\\;\\text{(M-O, }k_h=${fmtPlain(kh, 3)},\\ k_v=${fmtPlain(kv, 3)})` : ''));
  eqs += ln((yw > 0 ? `E_a = K_a\\left[\\tfrac12\\gamma d_w^2 + \\gamma d_w h_w + \\tfrac12\\gamma' h_w^2\\right] = ${kt(Pa)}\\;${uK}/\\mathrm{m}\\;(d_w = ${fmtPlain(dw, 2)},\\ h_w = ${fmtPlain(yw, 2)}\\,\\mathrm{m},\\ \\gamma' = ${kt(gsub)})\\qquad E_w = \\tfrac12\\gamma_w h_w^2 = ${kt(Pw)}\\qquad U = \\tfrac12\\gamma_w h_w B = ${kt(Uw)}` : `E_a = \\tfrac12 K_a\\,\\gamma\\,H'^2 = \\tfrac12\\cdot ${fmtPlain(Ka, 4)}\\cdot ${kt(gs)}\\cdot ${fmtPlain(Hv, 3)}^2 = ${kt(Pa)}\\;${uK}/\\mathrm{m}`) + (q > 0 ? `\\qquad E_q = K_a\\,q\\,H'${Kth !== 1 ? '\\,\\tfrac{\\cos\\theta\\cos\\beta}{\\cos(\\theta-\\beta)}' : ''} = ${kt(Pq)}\\;${uK}/\\mathrm{m}` : ''));
  if (seis) eqs += ln((yw > 0 ? `K_{ae}' = ${fmtPlain(Kaew, 4)}\\;(k_h' = k_h\\gamma_{sat}/\\gamma' = ${fmtPlain(khw, 3)},\\ \\text{bajo el N.F.})\\qquad ` : '') + `E_{ae} = ${yw > 0 ? '' : "\\tfrac12 K_{ae}\\,\\gamma\\,H'^2(1-k_v) = "}${kt(Pae)}\\;${uK}/\\mathrm{m}\\qquad \\Delta E_{ae} = E_{ae}-E_a = ${kt(DPae)}\\;${uK}/\\mathrm{m}`);
  eqs += ln(`F.S._v = \\dfrac{\\Sigma M_r}{\\Sigma M_o} = \\dfrac{${kt(st.Mr)}}{${kt(st.MoT)}} = ${fmtPlain(st.FSv, 2)}\\qquad F.S._d = \\dfrac{\\mu\\,\\Sigma V + c_a B + E_p}{\\Sigma F_h} = \\dfrac{${fmtPlain(mu, 3)}\\cdot ${kt(st.V)} + ${kt(ca * B)} + ${kt(Pp.P)}}{${kt(st.FhT)}} = ${fmtPlain(st.FSd, 2)}`);
  eqs += ln(`\\bar x = \\dfrac{\\Sigma M_r - \\Sigma M_o}{\\Sigma V} = \\dfrac{${kt(st.Mq)} - ${kt(st.MoT)}}{${kt(st.Vq)}} = ${fmtPlain(st.xr, 3)}\\,\\mathrm{m}\\qquad e = \\dfrac{B}{2}-\\bar x = ${fmtPlain(st.e, 3)}\\,\\mathrm{m}\\qquad q_{max,min} = ${kt(st.qmax)}\\,/\\,${kt(st.qmin)}\\;${si ? '\\mathrm{kPa}' : '\\mathrm{t/m^2}'}`);
  if (ss) eqs += ln(`\\text{Sismo: } F.S._v = \\dfrac{${kt(ss.Mr)}}{${kt(ss.MoT)}} = ${fmtPlain(ss.FSv, 2)}\\quad F.S._d = \\dfrac{${fmtPlain(mu, 3)}\\cdot ${kt(ss.V)} + ${kt(ca * B)} + ${kt(Ppe.P)}}{${kt(ss.FhT)}} = ${fmtPlain(ss.FSd, 2)}\\quad e = ${fmtPlain(ss.e, 3)}\\,\\mathrm{m}\\quad q_{max} = ${kt(ss.qmax)}`);

  // ---------- dibujo ----------
  const W = 760, Hh = 500;
  const pressW = 120, passW = Pp.P > 0 ? 70 : 20, xL0 = 100, leftM = xL0 + passW + 10;
  const yTop = Hv + (q > 0 ? 0.5 : 0.2), yBot = min(ybot, 0) - 0.15;
  const xR = B + 0.9;
  const sc = min((W - leftM - pressW - 30) / (xR + 0.3), (Hh - 40 - 120) / (yTop - yBot));
  const ox = leftM, oy = 30 + (yTop) * sc;
  const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
  let g = arrowDefs + `<defs><marker id="arb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.blue}"/></marker><marker id="aro" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.orange}"/></marker></defs>`;
  const xs = X(xR + 0.3);
  // relleno
  const yAt = (x) => (x <= xbt ? H : H + (x - xbt) * tan(beta));
  g += `<path d="M${X(xbb)},${Y(hz)} L${X(xbt)},${Y(H)} L${xs},${Y(yAt(xR + 0.3))} L${xs},${Y(yBot)} L${X(B)},${Y(yBot)} L${X(B)},${Y(hz)} Z" fill="url(#soilp)" opacity=".75"/>`;
  g += Lne(X(xbt), Y(H), xs, Y(yAt(xR + 0.3)), C.soil, 2);
  // suelo de cimentación y frente
  g += `<rect x="${xL0}" y="${Y(yBot + 0.001)}" width="${xs - xL0}" height="${0.15 * sc}" fill="url(#soilp)" opacity=".5"/>`;
  g += `<path d="M${xL0},${Y(Df)} L${X(p)},${Y(Df)} L${X(p)},${Y(hz)} L${X(0)},${Y(hz)} L${X(0)},${Y(min(0, ybot))} L${xL0},${Y(min(0, ybot))} Z" fill="url(#soilp)" opacity=".55"/>`;
  g += Lne(xL0, Y(Df), X(p), Y(Df), C.soil, 2);
  // muro
  let wp = `M${X(0)},${Y(0)} `;
  if (bk > 0 && hk > 0) wp += `L${X(xk)},${Y(0)} L${X(xk)},${Y(-hk)} L${X(xk + bk)},${Y(-hk)} L${X(xk + bk)},${Y(0)} `;
  wp += `L${X(B)},${Y(0)} L${X(B)},${Y(hz)} L${X(xbb)},${Y(hz)} L${X(xbt)},${Y(H)} L${X(p + ie)},${Y(H)} L${X(p)},${Y(hz)} L${X(0)},${Y(hz)} Z`;
  g += `<path d="${wp}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.6"/>`;
  if (bool(b.contrafuerte, false)) g += `<path d="M${X(xbt)},${Y(H)} L${X(B)},${Y(hz)} L${X(xbb)},${Y(hz)} Z" fill="rgba(150,160,170,.18)" stroke="${C.ink}" stroke-dasharray="6 3"/>` + T(X((xbb + B) / 2) + 10, Y(hz + 0.35 * hp), 'contrafuerte', { fs: 10, c: C.ink, r: -atan(hp / (B - xbt)) / D2R });
  // centroides
  for (const r of parts) g += `<circle cx="${X(r.x)}" cy="${Y(r.y)}" r="2.6" fill="${r.grp === 'm' ? C.ink : '#7a5a2a'}"/>` + T(X(r.x) + 4, Y(r.y) - 4, 'W' + r.id, { fs: 9, a: 'start', c: r.grp === 'm' ? C.ink : '#7a5a2a' });
  // sobrecarga
  if (q > 0) { const y0 = Y(yAt(xbt)) - 22; g += `<rect x="${X(xbt)}" y="${y0 - 6}" width="${xs - X(xbt)}" height="6" fill="rgba(212,115,12,.18)" stroke="${C.orange}" stroke-width=".8"/>`; for (let i = 0; i <= 8; i++) { const x = xbt + (xR + 0.3 - xbt) * i / 8; g += Lne(X(x), Y(yAt(x)) - 22, X(x), Y(yAt(x)) - 3, C.orange, 0.9).replace('/>', ' marker-end="url(#aro)"/>'); } g += T(X(xbt) + 4, y0 - 10, 'q = ' + f2(q * kF) + ' ' + uP, { fs: 10, a: 'start', c: C.orange }); }
  // plano de empuje y diagrama
  const xb0 = X(xR + 0.3) + 8;
  if (metodo === 'rankine') g += Lne(X(B), Y(0), X(B), Y(Hv), C.red, 1, '5 3') + T(X(B) - 4, Y(Hv * 0.75), 'plano virtual', { fs: 9, a: 'end', c: C.red, r: -90 });
  else g += Lne(X(B), Y(0), X(xbt), Y(H), C.red, 1, '5 3') + T(X(B - Lb * 0.12) + 6, Y(H * 0.12), 'plano de Coulomb', { fs: 9, a: 'start', c: C.red, r: -90 + theta / D2R });
  const pS = (y) => Ka * (y >= yw ? gs * (Hv - y) : gs * dw + gsub * (yw - y)); // presión del suelo (efectiva) a la altura y
  const pWt = (y) => (y < yw ? gw * (yw - y) : 0); // presión del agua
  const pa = pS(0), pw0 = pWt(0), pq = Ka * q * Kth, pd = seis ? 2 * DPae / Hv : 0; // ΔEae dibujado como triángulo invertido
  const pmax = max(pa + pq + pw0, 1e-6) + (seis ? pd : 0), ph = (pressW - 20) / pmax, yH = Y(Hv), y0 = Y(0);
  if (pq > 0) g += `<path d="M${xb0},${yH} L${xb0 + pq * ph},${yH} L${xb0 + pq * ph},${y0} L${xb0},${y0} Z" fill="rgba(212,115,12,.18)" stroke="${C.orange}"/>`;
  const ys = yw > 0 && yw < Hv ? [Hv, yw, 0] : [Hv, 0];
  g += `<path d="M${xb0 + pq * ph},${yH} ${ys.map(y => `L${(xb0 + (pq + pS(y)) * ph).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')} L${xb0 + pq * ph},${y0} Z" fill="${C.redF}" stroke="${C.red}"/>`;
  if (yw > 0) g += `<path d="M${xb0 + (pq + pS(yw)) * ph},${Y(yw)} L${xb0 + (pq + pa + pw0) * ph},${y0} L${xb0 + (pq + pa) * ph},${y0} Z" fill="${C.blueF}" stroke="${C.blue}"/>` + T(xb0 + (pq + pa + pw0) * ph + 2, Y(yw / 2), 'agua', { fs: 9, a: 'start', c: C.blue });
  if (seis) g += `<path d="M${xb0 + pq * ph},${yH} L${xb0 + (pq + pd) * ph},${yH} L${xb0 + (pq + pa + pw0) * ph},${y0}" fill="none" stroke="${C.blue}" stroke-dasharray="4 2"/>`;
  for (let i = 1; i <= 7; i++) { const yy = Hv * (1 - i / 7.5), w = pq + pS(yy) + pWt(yy); g += Lne(xb0 + w * ph, Y(yy), xb0 + 2, Y(yy), C.red, 0.7).replace('/>', ' marker-end="url(#arr)"/>'); }
  g += T(xb0 + (pq + pa + pw0) * ph + 3, y0 + 12, f2((pa + pq + pw0) * kF) + ' ' + uP, { fs: 9, a: 'middle', c: C.red });
  if (yw > 0) { g += Lne(X(xbb), Y(yw), xs, Y(yw), C.blue, 1.2, '7 3') + `<path d="M${xs - 30},${Y(yw) - 9} l8,0 l-4,7 z" fill="${C.blue}"/>` + T(xs - 34, Y(yw) - 3, 'N.F.', { fs: 9, a: 'end', c: C.blue, b: 1 });
    g += `<path d="M${X(0)},${Y(min(0, ybot)) + 2} L${X(B)},${Y(min(0, ybot)) + 2} L${X(B)},${Y(min(0, ybot)) + 2 + 10} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width=".8"/>`; }
  if (pq > 0) g += T(xb0, yH - 4, 'Ka·q = ' + f2(pq * kF), { fs: 9, a: 'start', c: C.orange });
  if (seis) g += T(xb0 + (pq + pd) * ph + 3, yH + 12, 'sismo (M-O)', { fs: 9, a: 'start', c: C.blue });
  // resultantes
  const arrowAt = (yy, lab, col, mk) => { const xx = X(metodo === 'rankine' ? B : xa(yy)); return Lne(xx + 46, Y(yy) - 46 * tan(tb), xx + 2, Y(yy), col, 1.6).replace('/>', ` marker-end="url(#${mk})"/>`) + T(xx + 48, Y(yy) - 46 * tan(tb) - 3, lab, { fs: 10, a: 'start', c: col, b: 1 }); };
  g += arrowAt(EA.y, 'Ea', C.red, 'arr');
  if (q > 0) g += arrowAt(Hv / 2, 'Eq', C.orange, 'aro');
  if (seis) g += arrowAt(ysis * Hv, 'ΔEae', C.blue, 'arb');
  // pasivo
  if (Pp.P > 0) {
    const kpp = Kp * gf * Dp + 2 * cf * sqrt(Kp), phh = (passW - 10) / kpp, xf = X(0);
    const yA = Y(Df), yB = Y(ybot);
    g += `<path d="M${xf},${yA} L${xf - 2 * cf * sqrt(Kp) * phh * fp},${yA} L${xf - kpp * phh * fp},${yB} L${xf},${yB} Z" fill="${C.greenF}" stroke="${C.green}"/>`;
    g += T(xf - kpp * phh * fp - 2, yB + 12, 'Ep', { fs: 10, a: 'middle', c: C.green, b: 1 });
  }
  // presiones en la base
  { const qm = max(st.qmax, 1e-6), pb = 45 / qm, yb = Y(min(0, ybot)) + 14;
    const qT = st.toeMax ? st.qmax : st.qmin, qH = st.toeMax ? st.qmin : st.qmax;
    let path;
    if (st.Lc < B - 1e-9) { const xL = st.toeMax ? 0 : B - st.Lc, xR2 = st.toeMax ? st.Lc : B; path = st.toeMax ? `M${X(0)},${yb} L${X(0)},${yb + st.qmax * pb} L${X(xR2)},${yb} Z` : `M${X(xL)},${yb} L${X(B)},${yb + st.qmax * pb} L${X(B)},${yb} Z`; }
    else path = `M${X(0)},${yb} L${X(0)},${yb + qT * pb} L${X(B)},${yb + qH * pb} L${X(B)},${yb} Z`;
    g += `<path d="${path}" fill="${C.blueF}" stroke="${C.blue}"/>`;
    g += T(X(0) - 4, yb + qT * pb, f2(qT * kF) + ' ' + uP, { fs: 9, a: 'end', c: C.blue });
    g += T(X(B) + 4, yb + max(qH * pb, 4), f2(qH * kF) + ' ' + uP, { fs: 9, a: 'start', c: C.blue });
    g += Lne(X(st.xr), yb - 30, X(st.xr), yb - 2, C.blue, 1.5).replace('/>', ' marker-end="url(#arb)"/>') + T(X(st.xr) + 4, yb - 20, 'R (e = ' + f2(st.e * 100, 1) + ' cm)', { fs: 9, a: 'start', c: C.blue });
    // cotas inferiores
    const yd = yb + 45 + 24;
    g += dimH(X(0), X(B), yd + 16, 'B = ' + f2(B) + ' m') + dimH(X(0), X(p), yd, 'punta ' + f2(p) + ' m') + dimH(X(xbb), X(B), yd, (tipo === 'gravedad' ? 'talón ' : 'talón ') + f2(Lt) + ' m');
    if (t2 * sc > 40) g += dimH(X(p), X(xbb), yd, f2(t2));
  }
  g += dimV(xL0 - 66, Y(H), Y(0), 'H = ' + f2(H) + ' m') + dimV(xL0 - 14, Y(hz), Y(0), 'hz = ' + f2(hz) + ' m', C.ink, -1);
  if (Df > hz + 1e-6) g += dimV(xL0 - 40, Y(Df), Y(0), 'Df = ' + f2(Df) + ' m', C.ink, -1);
  g += T(X(p + ie) - 4, Y(H) + 12, 't1 = ' + f2(t1) + ' m', { fs: 10, a: 'end' });
  if (bk > 0 && hk > 0) g += T(X(xk) - 4, Y(-hk / 2) + 3, 'dentellón ' + f2(bk) + '×' + f2(hk), { fs: 9, a: 'end' });
  if (beta > 0) g += T(xs - 4, Y(yAt(xR + 0.3)) - 4, 'β = ' + f2(beta / D2R, 1) + '°', { fs: 10, a: 'end', c: '#7a5a2a' });
  const ttl = b.titulo || (tipo === 'gravedad' ? 'Muro de gravedad: geometría, fuerzas, empujes y presiones en la base' : 'Muro en voladizo: geometría, fuerzas, empujes y presiones en la base');
  ctx.tab = (ctx.tab || 0) + 1; const ta = ctx.tab; ctx.tab++; const tb2 = ctx.tab; ctx.tab++; const tc = ctx.tab;
  return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, ttl)}</div>` +
    `<div class="figure"><div class="cap">Tabla ${ta}: Fuerzas verticales y momentos estabilizantes respecto a la punta (por metro de muro)</div>${t1h}</div>` +
    `<div class="figure"><div class="cap">Tabla ${tb2}: Empujes y momentos respecto a la punta (${metodo === 'rankine' ? 'Rankine en el plano vertical del talón' : 'Coulomb en el plano trasdós–talón'}${seis ? '; sismo por Mononobe–Okabe' : ''})</div>${t2h}</div>` +
    eqs +
    `<div class="figure"><div class="cap">Tabla ${tc}: Resumen de estabilidad externa</div>${t3h}</div>`;
}

registerBlock('retwall', {
  name: 'Estabilidad de muro de contención', icon: 'wall', group: 'Muros',
  fields: [
    F('tipo', 'Tipo', 'voladizo', 'select', ['voladizo', 'gravedad']), F('metodo', 'Teoría de empuje', 'rankine', 'select', ['rankine', 'coulomb']),
    F('H', 'Altura total H (base a corona)', '5 m'), F('B', 'Ancho de la base B', '3.2 m'), F('hz', 'Espesor de zapata hz', '0.5 m'), F('punta', 'Longitud de la punta', '0.8 m'),
    F('t1', 'Espesor de corona t1', '0.25 m'), F('t2', 'Espesor en la base t2', '0.45 m'), F('ie', 'Talud frontal (proyección horizontal)', 't2 - t1'),
    F('bk', 'Dentellón: ancho', '0 m'), F('hk', 'Dentellón: profundidad', '0 m'), F('xk', 'Dentellón: distancia desde la punta', ''),
    F('beta', 'Talud del relleno β', '0 deg'), F('q', 'Sobrecarga q', '1 tonf/m^2'), F('gs', 'γ relleno', '1.8 tonf/m^3'), F('phi', 'φ relleno', '30 deg'), F('delta', 'δ muro-suelo (Coulomb)', '2/3*phi'),
    F('gc', 'γ del muro', '2.4 tonf/m^3'), F('gf', 'γ suelo de fundación', ''), F('phif', 'φ suelo de fundación', ''), F('cf', 'c suelo de fundación', '0'),
    F('mu', 'μ base (def. tan(2φf/3))', ''), F('ca', 'Adherencia ca (def. 2cf/3)', ''), F('Df', 'Altura de suelo frente a la punta (desde el fondo)', ''), F('fp', 'Fracción de empuje pasivo (0–1)', '0'),
    F('hw', 'Nivel freático: altura sobre el fondo de la base (0 = drenado)', '0 m'), F('gsat', 'γsat del relleno (def. γ + 0.2)', ''), F('gw', 'γ del agua', '1 tonf/m^3'),
    F('kh', 'kh (0 = sin sismo)', '0'), F('kv', 'kv', '0'), F('ysis', 'Altura de ΔEae (×H)', '0.6'), F('qsis', 'Fracción de q en sismo', '0.5'),
    F('qa', 'Presión admisible qa', '2.5 kgf/cm^2'), F('qas', 'qa sísmica (def. 1.2qa)', ''),
    F('fsv', 'FS volteo mín.', '1.5'), F('fsd', 'FS deslizamiento mín.', '1.5'), F('fsvs', 'FS volteo sismo', '1.25'), F('fsds', 'FS desliz. sismo', '1.25'),
    F('qest', 'Sobrecarga estabiliza', false, 'check'), F('contrafuerte', 'Dibujar contrafuerte', false, 'check'), F('si', 'Tablas en kN', false, 'check'), F('sufijo', 'Sufijo de variables', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Estabilidad externa (volteo, deslizamiento, excentricidad y presiones) de muros en voladizo o de gravedad, con dentellón, talud del relleno, sobrecarga y sismo (Mononobe–Okabe + inercia). Nivel freático opcional en el relleno (γ\' bajo el N.F., empuje hidrostático, subpresión triangular y, en sismo, k<sub>h</sub>\' = k<sub>h</sub>γ<sub>sat</sub>/γ\'). Exporta <code>FSv, FSd, e, qmax, qmin, Ka, Pa</code> y, con sismo, <code>Kae, Pae, FSvs, FSds, es, qmaxs</code>.',
  def: { tipo: 'voladizo', metodo: 'rankine', H: '5 m', B: '3.2 m', hz: '0.5 m', punta: '0.8 m', t1: '0.25 m', t2: '0.45 m', q: '1 tonf/m^2', gs: '1.8 tonf/m^3', phi: '30 deg', qa: '2.5 kgf/cm^2', fsv: '2', fsd: '1.5' },
  render: renderRetwall,
});

// =====================================================================
//  wallrebar — momentos en la pantalla y corte del refuerzo vertical
// =====================================================================
function renderWallRebar(b, ctx) {
  const S = ctx.scope;
  const P = (k, u, d) => evalParam(b[k], S, u, d);
  const hp = P('hp', 'm', 4.5), t1 = P('t1', 'm', 0.25), t2 = P('t2', 'm', 0.45);
  const Ka = P('Ka', '', 0.33), gs = P('gs', 'tonf/m^3', 1.8), q = P('q', 'tonf/m^2', 0);
  const DK = P('DKae', '', 0), kh = P('kh', '', 0), gc = P('gc', 'tonf/m^3', 2.4), ysis = P('ysis', '', 0.6), qsis = P('qsis', '', 0.5);
  const fE = P('fE', '', 1.7), fQ = P('fQ', '', 1.7), fE2 = P('fE2', '', 1.7), fS = P('fS', '', 1.0);
  const fc = P('fc', 'kgf/cm^2', 210), fy = P('fy', 'kgf/cm^2', 4200), rec = P('rec', 'cm', 5);
  const bar = Math.round(P('barra', '', 5)), s = P('s', 'cm', 20), corte = P('corte', '', 0.5);
  const sfx = String(b.sufijo || '').trim();
  if (!BARS[bar]) throw new Error('Varilla no reconocida: #' + bar);
  if (!(hp > 0 && t1 > 0 && t2 >= t1 && s > 0)) throw new Error('Revise hp, t1 ≤ t2 y el espaciamiento s');
  const db = BARS[bar].d, Ab = BARS[bar].A;
  const As = Ab * 100 / s; // cm²/m
  const th = (z) => t1 + (t2 - t1) * z / hp; // espesor a la profundidad z (m)
  const dz = (z) => th(z) * 100 - rec - db / 2; // cm
  const phiMn = (A, z) => { const a = A * fy / (0.85 * fc * 100); return 0.9 * A * fy * (dz(z) - a / 2) / 1e5; }; // t·m/m
  const Mus = (z) => fE * Ka * gs * z ** 3 / 6 + fQ * Ka * q * z * z / 2;
  const Mse = (z) => fE2 * (Ka * gs * z ** 3 / 6 + Ka * qsis * q * z * z / 2) + fS * (DK * gs * z * z / 2 * ysis * z + kh * gc * (t1 + th(z)) / 2 * z * z / 2);
  const Mu = (z) => max(Mus(z), DK > 0 || kh > 0 ? Mse(z) : 0);
  const Vu = (z) => max(fE * Ka * gs * z * z / 2 + fQ * Ka * q * z, DK > 0 || kh > 0 ? fE2 * (Ka * gs * z * z / 2 + Ka * qsis * q * z) + fS * (DK * gs * z * z / 2 + kh * gc * (t1 + th(z)) / 2 * z) : 0);
  // corte teórico: profundidad donde Mu = φMn de las barras que continúan
  const Ar = As * (1 - corte);
  let zt = 0;
  { let lo = 0, hi = hp; if (Mu(hp) <= phiMn(Ar, hp)) zt = hp; else { for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Mu(m) <= phiMn(Ar, m)) lo = m; else hi = m; } zt = lo; } }
  const dcut = dz(zt) / 100, ext = max(dcut, 12 * db / 100); // E.060 12.10.3
  const ld = max(fy * db / ((bar <= 6 ? 6.6 : 5.3) * sqrt(fc)), 30) / 100; // ld en tracción (E.060 12.2.2, ψt = ψe = λ = 1)
  let hcut = hp - zt + ext; hcut = Math.ceil(hcut * 20 - 1e-9) / 20; // redondeo a 5 cm hacia arriba
  const hcut2 = max(hcut, ld);
  const zc = hp - hcut2; // profundidad del extremo real de las barras cortadas
  const cap = (z) => (corte > 0 && z < zc ? phiMn(Ar, z) : phiMn(As, z));
  let dcmax = 0, zdc = 0;
  for (let i = 1; i <= 200; i++) { const z = hp * i / 200, r = Mu(z) / cap(z); if (r > dcmax) { dcmax = r; zdc = z; } }
  // exportar
  const ex = (n, v) => setVar(ctx, n + sfx, v);
  ex('Mub', U(Mu(hp), 'tonf*m/m')); ex('Vub', U(Vu(hp), 'tonf/m')); ex('phiMnb', U(phiMn(As, hp), 'tonf*m/m')); ex('Asv', U(As, 'cm^2/m'));
  ex('hcorte', U(corte > 0 ? hcut2 : hp, 'm')); ex('DCpant', dcmax);
  ctx.checks.push({ ok: dcmax <= 1, label: 'Flexión de la pantalla en toda la altura con el corte de barras (E.060 10.2, 12.10)', ratio: dcmax, block: ctx.blockId });
  // dibujo
  const W = 720, Hh = 420, top = 40, bot = 50, sc = (Hh - top - bot) / hp;
  const Y = (z) => top + z * sc;
  let g = arrowDefs;
  const ex0 = 120, tsc = min(160 / t2, sc * 1.2);
  // pantalla (cara frontal inclinada, trasdós vertical a la derecha)
  const xBack = ex0 + 150;
  g += `<path d="M${xBack - t1 * tsc},${Y(0)} L${xBack},${Y(0)} L${xBack},${Y(hp)} L${xBack - t2 * tsc},${Y(hp)} Z" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  g += `<rect x="${xBack - t2 * tsc - 40}" y="${Y(hp)}" width="${t2 * tsc + 120}" height="22" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.2"/>`;
  g += `<rect x="${xBack + 1}" y="${Y(0)}" width="60" height="${hp * sc}" fill="url(#soilp)" opacity=".6"/>`;
  const sl = corte > 0 ? 2 * s : s;
  const xs1 = xBack - rec / 100 * tsc - 3, xs2 = xs1 - 5;
  g += `<path d="M${xs1},${Y(0) + 6} L${xs1},${Y(hp) + 16} L${xs1 - 40},${Y(hp) + 16}" fill="none" stroke="${C.red}" stroke-width="2.2"/>`;
  if (corte > 0) g += `<path d="M${xs2},${Y(zc)} L${xs2},${Y(hp) + 12} L${xs2 - 34},${Y(hp) + 12}" fill="none" stroke="${C.blue}" stroke-width="2.2"/>`;
  g += dimV(ex0 - 30, Y(0), Y(hp), 'hp = ' + f2(hp) + ' m');
  if (corte > 0) g += dimV(xBack + 80, Y(zc), Y(hp), 'hc = ' + f2(hcut2) + ' m', C.blue, 1);
  g += T(xBack - t1 * tsc / 2, Y(0) - 6, 't1 = ' + f2(t1) + ' m', { fs: 10 }) + T(xBack - t2 * tsc / 2, Y(hp) + 36, 't2 = ' + f2(t2) + ' m', { fs: 10 });
  g += T(xs1 - 6, Y(hp * 0.25), `${BARS[bar].n} @ ${f2(sl, 0)}`, { fs: 10, c: C.red, a: 'end' }) + (corte > 0 ? T(xs2 - 6, Y(zc + (hp - zc) * 0.5), `${BARS[bar].n} @ ${f2(sl, 0)} (alternas)`, { fs: 10, c: C.blue, a: 'end' }) : '');
  // diagrama
  const dx0 = 400, dW = 290;
  const Mm = max(phiMn(As, hp), Mu(hp)) * 1.1, mx = (M) => dx0 + M / Mm * dW;
  niceTicks(0, Mm, 5).forEach(t => { g += Lne(mx(t), Y(0), mx(t), Y(hp), C.grid, 0.7) + T(mx(t), Y(hp) + 14, f2(t, 1), { fs: 9, c: C.axis }); });
  const zz = []; for (let i = 0; i <= 120; i++) zz.push(hp * i / 120);
  g += `<path d="M${mx(0)},${Y(0)} ${zz.map(z => 'L' + mx(Mu(z)).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ')} L${mx(0)},${Y(hp)} Z" fill="${C.redF}" stroke="${C.red}" stroke-width="1.8"/>`;
  g += `<path d="${zz.map((z, i) => (i ? 'L' : 'M') + mx(cap(z)).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="2"/>`;
  if (corte > 0) g += Lne(mx(0), Y(zt), mx(Mm), Y(zt), C.axis, 0.8, '4 3') + T(mx(Mm), Y(zt) - 3, 'corte teórico', { fs: 9, a: 'end', c: C.axis });
  g += Lne(mx(0), Y(0), mx(0), Y(hp), C.ink, 1) + Lne(mx(0), Y(hp), mx(Mm), Y(hp), C.ink, 1);
  g += T(dx0 + dW / 2, Hh - 12, 'Momento [t·m/m] — Mu (rojo) y φMn (azul)', { fs: 10 });
  g += T(mx(Mu(hp)) + 4, Y(hp) - 6, 'Mu = ' + f2(Mu(hp)), { fs: 9, a: 'start', c: C.red }) + T(mx(phiMn(As, hp)) - 3, Y(hp) - 20, 'φMn = ' + f2(phiMn(As, hp)), { fs: 9, a: 'end', c: C.blue });
  g += T(dx0 + dW / 2, 22, 'D/C máx = ' + f2(dcmax, 2) + ' (z = ' + f2(zdc, 2) + ' m)', { fs: 10, b: 1, c: dcmax <= 1 ? C.green : C.red });
  const cap1 = b.titulo || `Refuerzo vertical de la pantalla: ${BARS[bar].n} @ ${f2(s, 1)} cm${corte > 0 ? `, ${f2(corte * 100, 0)} % de las barras se cortan a ${f2(hcut2)} m sobre la zapata` : ''}`;
  const ln = (t) => `<div class="ln"><div class="eq">${K(t)}</div></div>`;
  const eqs = ln(`A_s = \\dfrac{A_b}{s} = \\dfrac{${fmtPlain(Ab, 2)}}{${fmtPlain(s / 100, 3)}} = ${fmtPlain(As, 2)}\\;\\mathrm{cm^2/m}\\qquad \\phi M_{n,base} = ${fmtPlain(phiMn(As, hp), 2)}\\;\\mathrm{t\\cdot m/m}\\;\\ge\\; M_u = ${fmtPlain(Mu(hp), 2)}`) +
    (corte > 0 ? ln(`z_{teo} = ${fmtPlain(zt, 3)}\\,\\mathrm{m}\\;(\\phi M_n(${fmtPlain(Ar, 2)}) = M_u)\\qquad h_c = h_p - z_{teo} + \\max(d,\\,12d_b) = ${fmtPlain(hp - zt, 3)} + ${fmtPlain(ext, 3)} \\to ${fmtPlain(hcut2, 2)}\\,\\mathrm{m}\\;(\\ge \\ell_d = ${fmtPlain(ld, 2)}\\,\\mathrm{m})`) : '');
  return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, cap1)}</div>` + eqs;
}

registerBlock('wallrebar', {
  name: 'Refuerzo de pantalla de muro', icon: 'wall', group: 'Muros',
  fields: [
    F('hp', 'Altura de la pantalla hp', '4.5 m'), F('t1', 'Espesor corona t1', '0.25 m'), F('t2', 'Espesor base t2', '0.45 m'),
    F('Ka', 'Ka', 'Ka'), F('gs', 'γ relleno', '1.8 tonf/m^3'), F('q', 'Sobrecarga q', '1 tonf/m^2'),
    F('DKae', 'ΔKae = Kae − Ka (0 sin sismo)', '0'), F('kh', 'kh (inercia de la pantalla)', '0'), F('gc', 'γ concreto', '2.4 tonf/m^3'),
    F('fE', 'Factor empuje (E.060 9.2.5)', '1.7'), F('fQ', 'Factor sobrecarga', '1.7'), F('fE2', 'Factor del empuje estático con sismo (1.7: E.060 9.2.5 + ACI 318-19 5.3.8)', '1.7'), F('fS', 'Factor sismo', '1.0'), F('qsis', 'Fracción de q con sismo', '0.5'),
    F('fc', "f'c", '210 kgf/cm^2'), F('fy', 'fy', '4200 kgf/cm^2'), F('rec', 'Recubrimiento libre', '5 cm'),
    F('barra', 'Varilla #', '5'), F('s', 'Espaciamiento', '20 cm'), F('corte', 'Fracción de barras cortadas', '0.5'), F('sufijo', 'Sufijo', ''), F('titulo', 'Título', ''),
  ],
  hint: 'Momento último a lo largo de la pantalla: U1 = 1.7(CE + sobrecarga) (E.060 9.2.5) y, con sismo, U2 = 1.7 CE + 1.0 CS (incremento M-O a 0.6z + inercia; 50 % de la sobrecarga), capacidad φMn del refuerzo colocado y altura de corte de las barras alternas (E.060 12.10.3: prolongar max(d, 12db)). Exporta <code>Mub, Vub, phiMnb, Asv, hcorte</code>.',
  def: { hp: '4.5 m', t1: '0.25 m', t2: '0.45 m', Ka: '0.33', gs: '1.8 tonf/m^3', q: '1 tonf/m^2', barra: '5', s: '20 cm', corte: '0.5' },
  render: renderWallRebar,
});

// ---------- utilidades para vectores (listas o matrices de math.js) ----------
function evalVec(str, S, unit) {
  if (str === undefined || str === null || String(str).trim() === '') return [];
  const v = math.evaluate(String(str), new Map(S));
  const arr = math.isMatrix(v) ? v.toArray().flat() : Array.isArray(v) ? v.flat() : [v];
  return arr.map(x => (math.isUnit(x) ? (unit ? x.toNumber(unit) : x.value) : Number(x)));
}

// =====================================================================
//  gabionwall — dibujo de muro de gaviones escalonado
// =====================================================================
registerBlock('gabionwall', {
  name: 'Muro de gaviones (dibujo)', icon: 'wall', group: 'Muros',
  fields: [F('anchos', 'Anchos de las hiladas, de abajo hacia arriba', '[3, 2.5, 2, 1.5] m'), F('h', 'Altura de hilada', '1 m'), F('frente', 'Retiro frontal por hilada', '0 m'),
    F('Ka', 'Ka', 'Ka'), F('gs', 'γ relleno', '1.8 tonf/m^3'), F('q', 'Sobrecarga', '0'), F('qmax', 'q máx en la base', ''), F('qmin', 'q mín en la base', ''), F('e', 'Excentricidad', ''), F('titulo', 'Título', '')],
  hint: 'Dibuja el muro de gaviones con hiladas escalonadas (escalones hacia el relleno o retiros frontales), el empuje sobre el plano vertical del talón y las presiones en la base.',
  def: { anchos: '[3, 2.5, 2, 1.5] m', h: '1 m', Ka: '0.333', gs: '1.8 tonf/m^3' },
  render(b, ctx) {
    const S = ctx.scope;
    const bw = evalVec(b.anchos, S, 'm'), h = evalParam(b.h, S, 'm', 1), fr = evalParam(b.frente, S, 'm', 0);
    if (!bw.length || bw.some(x => !(x > 0))) throw new Error('Anchos de hiladas no válidos');
    const Ka = evalParam(b.Ka, S, '', 0.33), gs = evalParam(b.gs, S, 'tonf/m^3', 1.8), q = evalParam(b.q, S, 'tonf/m^2', 0);
    const qmax = evalParam(b.qmax, S, 'tonf/m^2', 0), qmin = evalParam(b.qmin, S, 'tonf/m^2', 0), e = evalParam(b.e, S, 'm', 0);
    const n = bw.length, H = n * h, B = bw[0];
    const W = 720, Hh = 430, sc = min(380 / (B + 2.2), 300 / (H + 0.6)), ox = 110, oy = 40 + (H + 0.4) * sc;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    let g = arrowDefs;
    g += `<path d="M${X(0)},${Y(H)} ${bw.map((w, i) => `L${X(fr * i + w)},${Y(H - (n - 1 - i) * h)}`).join(' ')}" fill="none"/>`;
    g += `<rect x="${X(-0.8)}" y="${Y(0)}" width="${X(B + 1.6) - X(-0.8)}" height="14" fill="url(#soilp)" opacity=".5"/>`;
    // relleno detrás (hasta el plano del talón y más allá)
    let path = `M${X(B + 1.6)},${Y(H)} L${X(fr * (n - 1) + bw[n - 1])},${Y(H)}`;
    for (let i = n - 1; i >= 0; i--) { const xr = fr * i + bw[i]; path += ` L${X(xr)},${Y(i * h + h)} L${X(xr)},${Y(i * h)}`; }
    path += ` L${X(B + 1.6)},${Y(0)} Z`;
    g += `<path d="${path}" fill="url(#soilp)" opacity=".75"/>` + Lne(X(fr * (n - 1) + bw[n - 1]), Y(H), X(B + 1.6), Y(H), C.soil, 2);
    // hiladas con celdas de 1 m
    bw.forEach((w, i) => {
      const x0 = fr * i, y0 = i * h;
      g += `<rect x="${X(x0)}" y="${Y(y0 + h)}" width="${w * sc}" height="${h * sc}" fill="#d9dde3" stroke="${C.ink}" stroke-width="1.3"/>`;
      for (let c = 1; c < Math.round(w); c++) g += Lne(X(x0 + c), Y(y0), X(x0 + c), Y(y0 + h), C.ink, 0.6);
      for (let k = 0; k < Math.round(w * 3); k++) { const cx = X(x0 + (k + 0.5) * w / Math.round(w * 3)), cy = Y(y0 + h / 2) + ((k % 2) ? 4 : -4); g += `<circle cx="${cx}" cy="${cy}" r="${Math.max(2, sc * 0.07)}" fill="#9aa5b1" opacity=".8"/>`; }
      g += `<pattern id="mesh${i}" width="6" height="6" patternUnits="userSpaceOnUse"></pattern>`;
      g += T(X(x0 + w) - 4, Y(y0 + h) + 12, 'b' + (i + 1) + ' = ' + f2(w) + ' m', { fs: 9, a: 'end', c: C.ink });
    });
    g += Lne(X(B), Y(0), X(B), Y(H), C.red, 1, '5 3');
    // empuje
    const pa = Ka * gs * H, pq = Ka * q, ph = 100 / max(pa + pq, 1e-6), xb = X(B + 1.6) + 10;
    if (pq > 0) g += `<path d="M${xb},${Y(H)} L${xb + pq * ph},${Y(H)} L${xb + pq * ph},${Y(0)} L${xb},${Y(0)} Z" fill="rgba(212,115,12,.18)" stroke="${C.orange}"/>`;
    g += `<path d="M${xb + pq * ph},${Y(H)} L${xb + (pq + pa) * ph},${Y(0)} L${xb + pq * ph},${Y(0)} Z" fill="${C.redF}" stroke="${C.red}"/>`;
    g += T(xb + (pq + pa) * ph, Y(0) + 13, f2(pa + pq) + ' t/m²', { fs: 9, c: C.red });
    if (q > 0) { for (let i = 0; i <= 8; i++) { const x = bw[n - 1] + fr * (n - 1) + (B + 1.6 - bw[n - 1] - fr * (n - 1)) * i / 8; g += Lne(X(x), Y(H) - 20, X(x), Y(H) - 3, C.orange, 0.9).replace('/>', ' marker-end="url(#arr)"/>'); } g += T(X(B + 1.6), Y(H) - 24, 'q = ' + f2(q) + ' t/m²', { fs: 10, a: 'end', c: C.orange }); }
    g += Lne(X(B) + 50, Y(H / 3), X(B) + 2, Y(H / 3), C.red, 1.6).replace('/>', ' marker-end="url(#arr)"/>') + T(X(B) + 52, Y(H / 3) - 3, 'Ea', { fs: 10, a: 'start', c: C.red, b: 1 });
    // presiones
    if (qmax > 0) {
      const pb = 45 / qmax, yb = Y(0) + 22, Lc = abs(e) <= B / 6 ? B : 3 * (B / 2 - abs(e));
      const qT = e >= 0 ? qmax : qmin, qH = e >= 0 ? qmin : qmax;
      g += Lc < B ? `<path d="M${X(0)},${yb} L${X(0)},${yb + qmax * pb} L${X(Lc)},${yb} Z" fill="${C.blueF}" stroke="${C.blue}"/>` : `<path d="M${X(0)},${yb} L${X(0)},${yb + qT * pb} L${X(B)},${yb + qH * pb} L${X(B)},${yb} Z" fill="${C.blueF}" stroke="${C.blue}"/>`;
      g += T(X(0) - 4, yb + qT * pb, f2(qT) + ' t/m²', { fs: 9, a: 'end', c: C.blue }) + T(X(B) + 4, yb + max(qH * pb, 4), f2(qH) + ' t/m²', { fs: 9, a: 'start', c: C.blue });
    }
    g += dimV(ox - 40, Y(H), Y(0), 'H = ' + f2(H) + ' m') + dimH(X(0), X(B), Y(0) + 85, 'B = ' + f2(B) + ' m');
    return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Muro de gaviones: hiladas, empuje de Rankine en el plano del talón y presiones en la base')}</div>`;
  },
});

// =====================================================================
//  msewall — dibujo de muro de suelo reforzado (MSE)
// =====================================================================
registerBlock('msewall', {
  name: 'Muro de suelo reforzado (dibujo)', icon: 'wall', group: 'Muros',
  fields: [F('H', 'Altura H', '6 m'), F('L', 'Longitud del refuerzo L', '4.5 m'), F('z', 'Profundidades de los refuerzos (vector)', 'zr'), F('phi', 'φ del relleno reforzado', '34 deg'),
    F('tipo', 'Refuerzo', 'extensible', 'select', ['extensible', 'inextensible']), F('q', 'Sobrecarga', '0'), F('dc', 'D/C por capa (vector, opcional)', ''), F('titulo', 'Título', '')],
  hint: 'Dibuja el macizo reforzado, las capas de refuerzo, la superficie de falla interna (Rankine para refuerzos extensibles, bilineal 0.3H para inextensibles, AASHTO Fig. 11.10.6.3.1-1) y la relación D/C de cada capa.',
  def: { H: '6 m', L: '4.5 m', z: '[0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9, 4.5, 5.1, 5.7] m', phi: '34 deg', tipo: 'extensible' },
  render(b, ctx) {
    const S = ctx.scope;
    const H = evalParam(b.H, S, 'm', 6), L = evalParam(b.L, S, 'm', 4.5), phi = angP(b.phi, S, 34 * D2R), q = evalParam(b.q, S, 'tonf/m^2', 0);
    const zs = evalVec(b.z, S, 'm'), dc = evalVec(b.dc, S, '');
    const inext = /inext/i.test(b.tipo || '');
    const W = 720, Hh = 420, sc = min(420 / (L + 3.2), 330 / (H + 0.8)), ox = 90, oy = 40 + (H + 0.5) * sc;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    let g = arrowDefs;
    g += `<rect x="${X(-0.8)}" y="${Y(0)}" width="${(L + 3.6) * sc}" height="14" fill="url(#soilp)" opacity=".5"/>`;
    g += `<rect x="${X(0)}" y="${Y(H)}" width="${L * sc}" height="${H * sc}" fill="#efe3c6" stroke="${C.soil}"/>`;
    g += `<rect x="${X(L)}" y="${Y(H)}" width="${2.6 * sc}" height="${H * sc}" fill="url(#soilp)" opacity=".75"/>`;
    g += `<rect x="${X(-0.18)}" y="${Y(H)}" width="${0.18 * sc}" height="${H * sc}" fill="${C.conc}" stroke="${C.ink}"/>`;
    for (let k = 1; k < Math.ceil(H / 1.5); k++) g += Lne(X(-0.18), Y(k * 1.5), X(0), Y(k * 1.5), C.ink, 0.6);
    zs.forEach((z, i) => {
      const r = dc[i]; const col = r === undefined ? C.green : r <= 1 ? C.green : C.red;
      g += Lne(X(0), Y(H - z), X(L), Y(H - z), col, 2);
      if (r !== undefined) g += T(X(L) + 4, Y(H - z) + 3, r.toFixed(2), { fs: 9, a: 'start', c: col });
    });
    // superficie de falla interna
    if (inext) g += `<path d="M${X(0)},${Y(0)} L${X(0.3 * H)},${Y(H / 2)} L${X(0.3 * H)},${Y(H)}" fill="none" stroke="${C.red}" stroke-width="1.4" stroke-dasharray="6 3"/>`;
    else g += Lne(X(0), Y(0), X(H * tan(PI / 4 - phi / 2)), Y(H), C.red, 1.4, '6 3');
    g += T(X(inext ? 0.3 * H : H * tan(PI / 4 - phi / 2) / 2) + 6, Y(inext ? H * 0.75 : H / 2), inext ? 'superficie bilineal (0.3H)' : 'Rankine 45° + φ/2', { fs: 10, a: 'start', c: C.red });
    if (q > 0) for (let i = 0; i <= 10; i++) { const x = (L + 2.4) * i / 10; g += Lne(X(x), Y(H) - 20, X(x), Y(H) - 3, C.orange, 0.9).replace('/>', ' marker-end="url(#arr)"/>'); }
    if (q > 0) g += T(X(0), Y(H) - 24, 'q = ' + f2(q) + ' t/m²', { fs: 10, a: 'start', c: C.orange });
    g += Lne(X(L) + 60, Y(H / 3), X(L) + 2, Y(H / 3), C.red, 1.6).replace('/>', ' marker-end="url(#arr)"/>') + T(X(L) + 62, Y(H / 3) - 3, 'F1 (relleno retenido)', { fs: 10, a: 'start', c: C.red });
    g += dimV(ox - 40, Y(H), Y(0), 'H = ' + f2(H) + ' m') + dimH(X(0), X(L), Y(0) + 30, 'L = ' + f2(L) + ' m');
    if (zs.length > 1) g += T(X(L / 2), Y(0) + 50, `${zs.length} capas de refuerzo, Sv = ${f2(zs[1] - zs[0])} m${dc.length ? ' (número: D/C máx. de rotura o arranque)' : ''}`, { fs: 10, c: C.axis });
    return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || 'Muro de suelo reforzado: refuerzos, superficie de falla interna y empuje del relleno retenido')}</div>`;
  },
});

// =====================================================================
//  sheetpile — tablestaca en voladizo (Blum) o anclada (apoyo libre)
// =====================================================================
registerBlock('sheetpile', {
  name: 'Tablestaca: presiones y momentos', icon: 'wall', group: 'Muros',
  fields: [F('H', 'Altura libre (excavación) H', '4 m'), F('D', 'Empotramiento de cálculo (D0 en voladizo)', 'D0'), F('Dt', 'Empotramiento total colocado', ''), F('a', 'Profundidad del anclaje (vacío = voladizo)', ''),
    F('gs', 'γ suelo', '1.8 tonf/m^3'), F('Ka', 'Ka', 'Ka'), F('Kp', 'Kp de diseño', 'Kpd'), F('q', 'Sobrecarga', '0'), F('sufijo', 'Sufijo', ''), F('titulo', 'Título', '')],
  hint: 'Integra numéricamente las presiones netas (activa detrás y pasiva delante bajo el fondo) y obtiene cortantes y momentos. En voladizo (Blum) la contrafuerza R se concentra en la punta de D0; anclada (apoyo libre) calcula la fuerza T del anclaje. Exporta <code>Mmaxn, Tn, Rn</code>.',
  def: { H: '4 m', D: '3 m', gs: '1.8 tonf/m^3', Ka: '0.307', Kp: '2.17', q: '1 tonf/m^2' },
  render(b, ctx) {
    const S = ctx.scope;
    const H = evalParam(b.H, S, 'm', 4), D = evalParam(b.D, S, 'm', 3), Dt = evalParam(b.Dt, S, 'm', D), anch = b.a !== undefined && String(b.a).trim() !== '';
    const a = anch ? evalParam(b.a, S, 'm', 1) : 0, gs = evalParam(b.gs, S, 'tonf/m^3', 1.8), Ka = evalParam(b.Ka, S, '', 0.33), Kp = evalParam(b.Kp, S, '', 3), q = evalParam(b.q, S, 'tonf/m^2', 0);
    const sfx = String(b.sufijo || '').trim();
    if (!(H > 0 && D > 0)) throw new Error('H y D deben ser mayores que cero');
    const L = H + D, N = 800, dz = L / N;
    const pa = (z) => Ka * (gs * z + q), pp = (z) => (z > H ? Kp * gs * (z - H) : 0), net = (z) => pa(z) - pp(z);
    // fuerza total y momento respecto a la punta / anclaje
    let F = 0, Mtop = 0; for (let i = 0; i < N; i++) { const z = (i + 0.5) * dz, p = net(z) * dz; F += p; Mtop += p * (z - a); }
    const Tan = anch ? F : 0, R = anch ? 0 : -F; // voladizo: contrafuerza en la punta
    const zz = [], V = [], M = []; let cum = 0;
    for (let i = 0; i <= N; i++) {
      const z = i * dz; if (i > 0) cum += net(z - dz / 2) * dz;
      const v = cum - (anch && z > a ? Tan : 0);
      zz.push(z); V.push(v); M.push(i ? M[i - 1] + (V[i - 1] + v) / 2 * dz : 0);
    }
    let Mmax = 0, zM = 0; M.forEach((mm, i) => { if (abs(mm) > abs(Mmax)) { Mmax = mm; zM = zz[i]; } });
    setVar(ctx, 'Mmaxn' + sfx, U(abs(Mmax), 'tonf*m/m')); setVar(ctx, 'zMn' + sfx, U(zM, 'm'));
    if (anch) setVar(ctx, 'Tn' + sfx, U(Tan, 'tonf/m')); else setVar(ctx, 'Rn' + sfx, U(R, 'tonf/m'));
    // dibujo
    const W = 720, Hh = 440, top = 50, sc = (Hh - top - 40) / (H + Dt), cx = 230;
    const Y = (z) => top + z * sc;
    let g = arrowDefs;
    g += `<rect x="${cx}" y="${Y(0)}" width="140" height="${(H + Dt) * sc}" fill="url(#soilp)" opacity=".75"/>` + Lne(cx, Y(0), cx + 140, Y(0), C.soil, 2);
    g += `<rect x="${cx - 140}" y="${Y(H)}" width="140" height="${Dt * sc}" fill="url(#soilp)" opacity=".6"/>` + Lne(cx - 140, Y(H), cx, Y(H), C.soil, 2);
    g += `<rect x="${cx - 3}" y="${Y(0) - 8}" width="6" height="${(H + Dt) * sc + 8}" fill="${C.steel}"/>`;
    if (anch) g += Lne(cx, Y(a), cx + 130, Y(a) + 18, C.ink, 1.6) + `<rect x="${cx + 126}" y="${Y(a) + 8}" width="12" height="22" fill="${C.conc}" stroke="${C.ink}"/>` + T(cx + 70, Y(a) - 6, 'T = ' + f2(Tan) + ' t/m', { fs: 10, b: 1 });
    const pmax = max(pa(L), Kp * gs * D), ps = 110 / pmax;
    g += `<path d="M${cx + 3},${Y(0)} L${cx + 3 + pa(0) * ps},${Y(0)} L${cx + 3 + pa(L) * ps},${Y(L)} L${cx + 3},${Y(L)} Z" fill="${C.redF}" stroke="${C.red}"/>`;
    g += `<path d="M${cx - 3},${Y(H)} L${cx - 3 - Kp * gs * D * ps},${Y(L)} L${cx - 3},${Y(L)} Z" fill="${C.greenF}" stroke="${C.green}"/>`;
    if (!anch) g += Lne(cx + 60, Y(L), cx + 6, Y(L), C.blue, 2).replace('/>', ' marker-end="url(#ar)"/>') + T(cx + 62, Y(L) - 6, 'R = ' + f2(R) + ' t/m', { fs: 10, a: 'start', c: C.blue });
    g += T(cx + 3 + pa(L) * ps, Y(L) + 14, 'activo ' + f2(pa(L)), { fs: 9, c: C.red }) + T(cx - 3 - Kp * gs * D * ps, Y(L) + 14, 'pasivo ' + f2(Kp * gs * D), { fs: 9, c: C.green });
    if (Dt > 1.03 * D) g += Lne(cx - 20, Y(L), cx + 20, Y(L), C.blue, 1, '3 2') + T(cx - 24, Y(L) - 5, anch ? 'D cálculo' : 'O (D0)', { fs: 9, a: 'end', c: C.blue, b: 1 });
    g += dimV(40, Y(0), Y(H), 'H = ' + f2(H) + ' m') + dimV(40, Y(H), Y(H + Dt), 'D = ' + f2(Dt) + ' m');
    // diagrama de momentos
    const mx0 = 480, mW = 150, Mm = max(...M.map(abs), 1e-6);
    niceTicks(0, Mm, 4).forEach(t => { g += Lne(mx0 + t / Mm * mW, Y(0), mx0 + t / Mm * mW, Y(L), C.grid, 0.7) + T(mx0 + t / Mm * mW, Y(L) + 14, f2(t, 1), { fs: 9, c: C.axis }); });
    g += `<path d="M${mx0},${Y(0)} ${zz.map((z, i) => 'L' + (mx0 + abs(M[i]) / Mm * mW).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ')} L${mx0},${Y(L)} Z" fill="${C.blueF}" stroke="${C.blue}" stroke-width="1.6"/>`;
    g += Lne(mx0, Y(0), mx0, Y(L), C.ink) + Lne(mx0 - 10, Y(H), mx0 + mW, Y(H), C.axis, 0.8, '4 3');
    g += T(mx0 + abs(Mmax) / Mm * mW - 4, Y(zM) + 16, 'Mmáx = ' + f2(abs(Mmax)) + ' t·m/m (z = ' + f2(zM) + ' m)', { fs: 10, a: 'end', c: C.blue, b: 1 }) + T(mx0 + mW / 2, top - 18, 'Momento flector |M| [t·m/m]', { fs: 10 });
    return `<div class="figure">${svgWrap(W, Hh, g)}${caption(ctx, b.titulo || (anch ? 'Tablestaca anclada (apoyo libre): presiones, anclaje y momentos' : 'Tablestaca en voladizo (Blum): presiones, contrafuerza y momentos'))}</div>`;
  },
});
