// =====================================================================
//  Plantillas — módulo «walls» (muros de contención y estructuras de retención)
//  Fuentes, fórmulas y ejemplos de validación: docs/referencias/walls.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Muros de contención';

// Bloque común de peligro sísmico (E.030-2018/2026, coeficiente pseudoestático)
const SISMO = `## Coeficientes sísmicos (método pseudoestático)
zona = 4 // Zona sísmica (E.030 Art. 10) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = si(zona == 4, 0.45, si(zona == 3, 0.35, si(zona == 2, 0.25, 0.10))) // Aceleración máxima en roca, en g (E.030 Tabla N° 1)
perfil = 2 // Perfil de suelo (E.030 Art. 12) [1 : S1 roca o suelo muy rígido|2 : S2 suelo intermedio|3 : S3 suelo blando]
S = si(perfil == 1, 1.00, si(perfil == 2, si(zona == 4, 1.05, si(zona == 3, 1.15, si(zona == 2, 1.20, 1.60))), si(zona == 4, 1.10, si(zona == 3, 1.20, si(zona == 2, 1.40, 2.00))))) // Factor de suelo (E.030-2018 Tabla N° 3)
PGA = Z*S // Aceleración máxima del terreno en la superficie (AASHTO 11.6.5.2: kh0 = Fpga·PGA)
kh = khWall(PGA) // kh = 0.5·kh0: el muro puede desplazarse 25–50 mm (AASHTO 11.6.5.2.2)
kv = 0 // Coeficiente vertical: se desprecia (AASHTO 11.6.5.2.2) [0..0.15]`;

// =====================================================================
//  1) MURO EN VOLADIZO CON SISMO
// =====================================================================
const voladizo = {
  id: 'wa-voladizo', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro en voladizo con sismo (M-O) — diseño completo',
  normas: 'RNE — NTE E.020, E.030, E.050 (39.13), E.060; AASHTO LRFD 11.6',
  desc: 'Estabilidad estática y sísmica (Mononobe–Okabe + inercia) con dentellón, diseño de pantalla, punta y talón por flexión y cortante (E.060), corte de barras y refuerzo de temperatura.',
  titulo: 'Diseño de muro de contención en voladizo H = 5.00 m con sismo',
  validacion: {
    fuente: 'Control: Rankine (Das, Principios de Ing. de Cimentaciones, cap. 7) + AASHTO 11.6.5 + E.060; motor validado con Das Ej. 8.1 y Sağlam P1 (tests/walls.test.mjs)',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Comprobados a mano: kh = 0.5·0.45·1.05, Ka = tan²(45° − 32°/2) y Pa = ½Ka·γ·H² + Ka·ws·H.',
    valores: [
      { var: 'kh', esperado: 0.23625, tol: 0.0005, desc: 'kh = 0.5·Z·S (AASHTO 11.6.5.2.2)' },
      { var: 'Ka', esperado: 0.30726, tol: 0.0005, desc: 'Ka de Rankine, φ = 32°' },
      { var: 'Pa', unidad: 'tonf/m', esperado: 8.834, tol: 0.002, desc: 'Empuje activo estático' },
      { var: 'FSv', esperado: 6.09, tol: 0.002, desc: 'FS al volteo, estático' },
      { var: 'FSd', esperado: 3.258, tol: 0.002, desc: 'FS al deslizamiento, estático' },
      { var: 'FSvs', esperado: 2.093, tol: 0.002, desc: 'FS al volteo con sismo' },
      { var: 'FSds', esperado: 1.296, tol: 0.002, desc: 'FS al deslizamiento con sismo' },
      { var: 'As', unidad: 'cm^2/m', esperado: 16.75, tol: 0.002, desc: 'Acero vertical en la base de la pantalla' },
    ],
  },
  blocks: [
    text(`# Generalidades
## Descripción
Muro de contención de concreto armado en voladizo (T invertida) que sostiene un relleno granular compactado de 4.40 m sobre la zapata. Incluye un **dentellón** (llave de corte) bajo la pantalla para movilizar empuje pasivo adicional frente al deslizamiento. Se analiza por metro lineal de muro.

## Normas y referencias
- RNE **NTE E.020** Cargas (sobrecarga sobre el relleno); **NTE E.030** Diseño Sismorresistente (factor de zona $Z$ y de suelo $S$).
- RNE **NTE E.050** Suelos y Cimentaciones: Art. 39.13 (muros de contención, FS mínimos 1.50 estático y 1.25 pseudodinámico) y Art. 21 (FS de capacidad portante 3.0 / 2.5).
- RNE **NTE E.060** Concreto Armado: 9.2.5 (combinación con empuje lateral $U = 1.4CM + 1.7CV + 1.7CE$; $U = 0.9CM + 1.7CE$), 9.2.3 (sismo $U = 1.25(CM+CV) \\pm CS$), 9.3 (factores $\\phi$), 10.5 (acero mínimo), 11.3 (cortante), 12.5 y 12.10 (anclaje y corte de barras), 14.3 (refuerzo de muros).
- AASHTO LRFD Bridge Design Specifications, Secc. 3.11 y 11.6 (método pseudoestático, $k_h = 0.5\\,k_{h0}$, inercia del muro y del suelo sobre el talón).
- B. M. Das, *Principios de ingeniería de cimentaciones*, cap. 7 y 8; J. Calavera, *Muros de contención y muros de sótano*; R. Morales, *Diseño en concreto armado*; R. Torres Belandria, *Análisis y diseño de muros de contención de concreto armado*.

## Metodología
1. Empuje activo de **Rankine** sobre el plano vertical que pasa por el extremo del talón (el suelo sobre el talón forma parte del muro).
2. Empuje sísmico total por **Mononobe–Okabe** con $\\delta = \\beta$ en el plano virtual; el incremento dinámico $\\Delta E_{ae} = E_{ae} - E_a$ se aplica a $0.6H$ (Seed y Whitman, 1970) y se añade la inercia $k_h W$ del muro y del suelo sobre el talón.
3. Estabilidad: volteo, deslizamiento (fricción + empuje pasivo frente a la punta y el dentellón), excentricidad y presiones de contacto.
4. Diseño por resistencia (E.060) de la pantalla, la punta y el talón; corte de barras y refuerzo mínimo.`),
    calc(`# Datos de diseño
## Geometría (por metro lineal)
H = 5.00 m // Altura total: fondo de cimentación a corona (E.050 39.13.5) [2..10]
hz = 0.60 m // Espesor de la zapata (predimensionado ≈ H/10 a H/12) [0.3..1.2]
B = 4.50 m // Ancho de la base (0.5H a 0.7H estático, Das 8.2; ≈ 0.9H por el sismo de zona 4 con pasivo reducido) [2..8]
Lp = 0.90 m // Longitud de la punta (≈ B/4 a B/3) [0.3..2.5]
t1 = 0.25 m // Espesor de la pantalla en la corona (≥ 0.20 m) [0.20..0.40]
t2 = 0.50 m // Espesor de la pantalla en la base (≈ H/10) [0.25..1.0]
bk = 0.50 m // Ancho del dentellón (bajo la pantalla) [0.3..1.0]
hk = 1.20 m // Profundidad del dentellón bajo la zapata [0..2]
Df = 1.20 m // Altura del suelo frente a la punta, desde el fondo de la zapata [0.6..2.5]
fp = 0.50 // Fracción del empuje pasivo que se considera (AASHTO Tabla 11.5.7-1: φep = 0.50; el pasivo requiere desplazamientos grandes y el suelo puede excavarse) [0 : despreciar el pasivo|0.50 : 50 % (recomendado)|1.00 : pasivo completo]
hp = H - hz // Altura de la pantalla
Lt = B - Lp - t2 // Longitud del talón
## Relleno (parámetros del EMS, E.050 16.2.9)
gammas = 1.90 tonf/m^3 // Peso unitario del relleno granular compactado [1.5..2.2]
phis = 32 deg // Ángulo de fricción interna del relleno [20..40]
beta = 0 deg // Inclinación de la superficie del relleno [0..30]
ws = 1.00 tonf/m^2 // Sobrecarga sobre el relleno (tránsito peatonal y vehicular liviano, E.020) [0..2]
## Suelo de cimentación
gammaf = 1.85 tonf/m^3 // Peso unitario del suelo frente al muro [1.5..2.2]
phif = 30 deg // Ángulo de fricción del suelo de cimentación [20..40]
mu = 0.55 // Coeficiente de fricción concreto–suelo tan δ (EMS, E.050 16.2.9 k) [0.30..0.70]
qa = 2.50 kgf/cm^2 // Presión admisible (FS = 3.0, E.050 Art. 21–22) [0.5..6]
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
gammac = 2.40 tonf/m^3 // Peso unitario del concreto armado (E.020 Anexo 1) [2.2..2.5]
rec = 5 cm // Recubrimiento de la pantalla, concreto expuesto al suelo (E.060 7.7.1 b) [2..7.5]
recz = 7.5 cm // Recubrimiento de la zapata vaciada contra el suelo (E.060 7.7.1 a) [5..10]
${SISMO}
## Coeficientes de empuje
Ka = KaRankine(phis, beta) // Activo de Rankine (Das, Principios, cap. 7, relleno inclinado; β = 0 → tan²(45° − φ/2))
Kae = KaeMO(phis, beta, kh, kv, beta) // Activo sísmico de Mononobe–Okabe, δ = β en el plano virtual (AASHTO 11.6.5.3)
DKae = Kae - Ka // Incremento dinámico del coeficiente
DKsw = DKaeSW(kh) // Comparación: Seed–Whitman ΔKae ≈ ¾ kh
Kp = KpRankine(phif) // Pasivo de Rankine del suelo frente a la punta
qas = qaSismoE050(qa) // Presión admisible sísmica: FS 2.5 en lugar de 3.0 (E.050 Art. 21)`),
    text(`# Estabilidad externa
Se consideran todas las fuerzas por metro de muro respecto a la arista exterior de la punta. La sobrecarga sobre el talón **no** se toma como fuerza estabilizante en el volteo y el deslizamiento (conservador), pero sí en las presiones de contacto. El empuje pasivo se calcula en toda la altura $D_f + h_k$ frente a la punta y el dentellón (en sismo con $K_{pe}$ de Mononobe–Okabe), pero solo se cuenta la fracción $f_p$ = {fp} (movilizar el pasivo completo exige desplazamientos del orden de 2–5 % de la altura; AASHTO aplica $\\phi_{ep} = 0.50$); el relleno frente al muro debe colocarse compactado y protegerse de la erosión y de excavaciones futuras. Se supone el relleno drenado (N.F. bajo la base); si el EMS indica nivel freático, ingréselo en el bloque (campo «Nivel freático»).`),
    { type: 'retwall', tipo: 'voladizo', metodo: 'rankine', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 't1', t2: 't2', bk: 'bk', hk: 'hk', xk: 'Lp', beta: 'beta', q: 'ws', gs: 'gammas', phi: 'phis', gc: 'gammac', gf: 'gammaf', phif: 'phif', mu: 'mu', Df: 'Df', fp: 'fp', kh: 'kh', kv: 'kv', qa: 'qa', qas: 'qas', fsv: '2.0', fsd: '1.5', fsvs: '1.5', fsds: '1.25', titulo: 'Muro en voladizo: fuerzas actuantes, empujes estático y sísmico y presiones en la base (condición estática)' },
    calc(`# Diseño de la pantalla
"La pantalla trabaja como un voladizo empotrado en la zapata. Combinaciones: $U_1 = 1.7\\,(CE + CV_{sc})$ (E.060 9.2.5) y, con sismo, $U_2 = 1.7\\,CE + 1.0\\,CS$ con el 50 % de la sobrecarga. La E.060 no da una combinación explícita de empuje y sismo: se conserva el factor 1.7 del empuje estático (E.060 9.2.5) y el sismo, que la E.030 da a nivel de resistencia, va con 1.0 (como ACI 318-19 5.3.8 y ASCE 7-16 2.3.6: $1.6H + 1.0E$; AASHTO Evento Extremo I: $1.5EH + 1.0EQ$). $CS$ incluye el incremento de Mononobe–Okabe a $0.6\\,h_p$ y la inercia de la pantalla.
## Flexión en la base de la pantalla
Mus = 1.7*(Ka*gammas*hp^3/6 + Ka*ws*hp^2/2) -> tonf*m/m // U = 1.7 CE (E.060 9.2.5)
MeE = Ka*gammas*hp^3/6 + Ka*0.5*ws*hp^2/2 -> tonf*m/m // Momento estático: empuje activo + 50 % de la sobrecarga
MeS = DKae*gammas*hp^2/2*0.6*hp + kh*gammac*(t1 + t2)/2*hp^2/2 -> tonf*m/m // Momento sísmico: ΔEae a 0.6 hp + inercia de la pantalla
Mue = 1.7*MeE + 1.0*MeS -> tonf*m/m // U = 1.7 CE + 1.0 CS
Mu = max(Mus, Mue) // Momento último de diseño
bar = 6 // Varilla vertical interior [5 : 5/8"|6 : 3/4"|8 : 1"]
d = t2 - rec - db(bar)/2 // Peralte efectivo
Rn = Mu/(0.9*d^2) -> kgf/cm^2 // φ = 0.90 (E.060 9.3.2.1)
rho = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Rn/(0.85*fc)))) // Cuantía requerida
As_req = rho*d -> cm^2/m // Acero requerido por metro
As_min = 0.0018*t2 -> cm^2/m // Acero mínimo de losas y muros en flexión (E.060 10.5.4 y 9.7.2)
As = max(As_req, As_min)
s = rounddown(max(Ab(bar)/As, 2.5 cm), 2.5 cm) // Espaciamiento de la varilla elegida
check s <= min(3*t2, 40 cm) // Espaciamiento máximo del refuerzo principal (E.060 10.5.4)
rhob = 0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Cuantía balanceada (β1 = 0.85)
check rho <= 0.75*rhob // Cuantía máxima (E.060 10.3.4)
## Cortante a una distancia d de la base (E.060 11.1.3)
zv = hp - d // Profundidad de la sección crítica desde la corona
Vus = 1.7*(Ka*gammas*zv^2/2 + Ka*ws*zv) -> tonf/m
VeE = Ka*gammas*zv^2/2 + Ka*0.5*ws*zv -> tonf/m // Cortante estático a la distancia d
VeS = DKae*gammas*zv^2/2 + kh*gammac*(t1 + t2)/2*zv -> tonf/m // Cortante sísmico a la distancia d
Vue = 1.7*VeE + 1.0*VeS -> tonf/m
Vu = max(Vus, Vue)
phiVc = 0.85*0.53*sqrtfc(fc)*d -> tonf/m // φVc = 0.85·0.53√f'c·b·d (E.060 11.3.1.1, φ = 0.85)
check Vu <= phiVc // Cortante en la pantalla (sin estribos)`),
    { type: 'wallrebar', hp: 'hp', t1: 't1', t2: 't2', Ka: 'Ka', gs: 'gammas', q: 'ws', DKae: 'DKae', kh: 'kh', gc: 'gammac', fc: 'fc', fy: 'fy', rec: 'rec', barra: 'bar', s: 's', corte: '0.5' },
    calc(`## Refuerzo horizontal y de la cara exterior (E.060 14.3)
tm = (t1 + t2)/2 // Espesor medio de la pantalla
Ash = 0.0020*tm -> cm^2/m // Cuantía horizontal mínima 0.0020 (barras ≤ 5/8", fy ≥ 4200; E.060 14.3.3)
sh_ext = rounddown(max(Ab(4)/(2/3*Ash), 2.5 cm), 2.5 cm) // 2/3 en la cara exterior expuesta, varilla de 1/2" (E.060 14.3.4)
sh_int = rounddown(max(Ab(3)/(1/3*Ash), 2.5 cm), 2.5 cm) // 1/3 en la cara en contacto con el relleno, varilla de 3/8"
check max(sh_ext, sh_int) <= min(3*tm, 40 cm) // Espaciamiento máximo (E.060 14.3.5)
Asv_ext = 0.0012*t2 -> cm^2/m // Refuerzo vertical mínimo de la cara exterior (E.060 14.3.2)
sv_ext = rounddown(max(Ab(4)/Asv_ext, 2.5 cm), 2.5 cm) // Varilla de 1/2" en la cara exterior
check sv_ext <= min(3*t2, 40 cm) // Espaciamiento del refuerzo vertical exterior
## Anclaje del refuerzo vertical en la zapata (E.060 12.5)
ldg = max(0.075*fy*db(bar)/sqrtfc(fc), 8*db(bar), 15 cm) // Longitud de desarrollo con gancho estándar
check ldg <= hz - recz // El gancho cabe en el peralte de la zapata
"Refuerzo de la pantalla: cara interior varilla {bar} (Ø según lista) @ {s} con la mitad de las barras cortadas a {hcorte} sobre la zapata; cara exterior 1/2\\" @ {sv_ext} vertical; horizontal 1/2\\" @ {sh_ext} (exterior) y 3/8\\" @ {sh_int} (interior).
# Diseño de la zapata
"Presiones de contacto de servicio obtenidas en la estabilidad. La longitud de contacto es $L_c = \\min\\left[B,\\ 3\\left(B/2 - e\\right)\\right]$ y la presión varía linealmente con pendiente $m = (q_{talón} - q_{punta})/L_c$. Mayoración: estático $1.7$ (E.060 9.2.5) y sísmico $1.25$ aplicado a toda la reacción (E.060 9.2.3: la reacción sísmica, dominada por $\\Delta E_{ae}$ y la inercia que ya están a nivel de resistencia, queda mayorada en exceso, lo que compensa el menor factor de su parte estática; verifíquese que $1.25\\,q_{sismo} \\ge 1.7\\,q_{estático}$ en la tabla de presiones); el peso propio de la punta se reduce con $0.9$ (E.060 9.2.5, carga muerta favorable).
check es >= 0 m // Resultante sísmica hacia la punta (hipótesis de L_ce; en estático |e| ≤ B/6: contacto total)
Lcs = min(B, max(3*(B/2 - e), 0.03*B)) // Longitud de contacto, estático
Lce = min(B, max(3*(B/2 - es), 0.03*B)) // Longitud de contacto, sismo (acotada si la resultante sale de la base)
slS = (qheel - qtoe)/Lcs // Pendiente del diagrama estático
slE = (qheels - qtoes)/Lce // Pendiente del diagrama sísmico
## Punta (voladizo desde la cara de la pantalla)
Mp(q0, sl) = q0*Lp^2/2 + sl*Lp^3/6 // Momento de la reacción del suelo bajo la punta
Mwp = gammac*hz*Lp^2/2 -> tonf*m/m // Momento del peso propio de la punta (relleno sobre la punta despreciado)
Mup = max(1.7*Mp(qtoe, slS), 1.25*Mp(qtoes, slE)) - 0.9*Mwp -> tonf*m/m // Momento último en la cara de la pantalla
dz = hz - recz - db(5)/2 // Peralte efectivo de la zapata (varilla de 5/8")
Asp = max(0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Mup/(0.9*0.85*fc*dz^2))))*dz, 0.0018*hz) -> cm^2/m // Acero inferior (mínimo E.060 10.5.4)
check Asp/dz <= 0.75*rhob // Cuantía máxima de la punta (E.060 10.3.4)
sp = rounddown(max(Ab(5)/Asp, 2.5 cm), 2.5 cm) // Varilla de 5/8"
check sp <= min(3*hz, 40 cm) // Espaciamiento máximo
Lv = Lp - dz // Tramo a d de la cara (E.060 11.1.3)
Vp(q0, sl) = q0*Lv + sl*Lv^2/2 // Resultante de la reacción entre la sección crítica y el borde
Vup = max(1.7*Vp(qtoe, slS), 1.25*Vp(qtoes, slE)) - 0.9*gammac*hz*Lv -> tonf/m
phiVcz = 0.85*0.53*sqrtfc(fc)*dz -> tonf/m
check Vup <= phiVcz // Cortante en la punta
## Talón (voladizo desde la cara posterior de la pantalla)
xb = Lp + t2 // Abscisa de la cara posterior de la pantalla
wds = gammas*hp + gammac*hz + ws // Carga descendente, estático
wde = gammas*hp + gammac*hz + 0.5*ws // Carga descendente, sismo
Mq(q0, sl, Lc) = si(Lc > xb, (q0 + sl*xb)*(min(Lc, B) - xb)^2/2 + sl*(min(Lc, B) - xb)^3/6, 0 tonf*m/m) // Momento de la reacción del suelo bajo el talón
Vq(q0, sl, Lc) = si(Lc > xb, (q0 + sl*xb)*(min(Lc, B) - xb) + sl*(min(Lc, B) - xb)^2/2, 0 tonf/m) // Resultante de la reacción bajo el talón
Mut = max(1.7*(wds*Lt^2/2 - Mq(qtoe, slS, Lcs)), 1.25*(wde*Lt^2/2 - Mq(qtoes, slE, Lce))) -> tonf*m/m // Momento último (tracción arriba)
Ast = max(0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Mut/(0.9*0.85*fc*dz^2))))*dz, 0.0018*hz) -> cm^2/m // Acero superior del talón
check Ast/dz <= 0.75*rhob // Cuantía máxima del talón (E.060 10.3.4)
sth = rounddown(max(Ab(5)/Ast, 2.5 cm), 2.5 cm) // Varilla de 5/8"
check sth <= min(3*hz, 40 cm) // Espaciamiento máximo
Vut = max(1.7*(wds*Lt - Vq(qtoe, slS, Lcs)), 1.25*(wde*Lt - Vq(qtoes, slE, Lce))) -> tonf/m // Cortante en la cara (reacción que tracciona: sección en la cara)
check Vut <= phiVcz // Cortante en el talón
## Refuerzo transversal de temperatura (E.060 9.7.2)
Astemp = 0.0018*hz -> cm^2/m // Repartido en ambas caras
stemp = rounddown(max(Ab(4)/(Astemp/2), 2.5 cm), 2.5 cm) // Varilla de 1/2" en cada cara
check stemp <= min(3*hz, 40 cm) // Espaciamiento máximo del refuerzo por temperatura
"Zapata: inferior 5/8\\" @ {sp} (punta), superior 5/8\\" @ {sth} (talón), transversal 1/2\\" @ {stemp} en ambas caras. Dentellón con el refuerzo vertical de la pantalla prolongado y estribos mínimos.`),
    text(`> **Drenaje (E.050 39.13.8):** colocar filtro de grava graduada o geodren detrás de la pantalla, lloraderos de PVC Ø 3" @ 1.50 m y tubería perforada en el talón para evitar presiones de agua, que no se han considerado en este cálculo. Juntas verticales de contracción cada 6–9 m.`),
    summary(),
  ],
};

// =====================================================================
//  2) MURO DE GRAVEDAD DE CONCRETO CICLÓPEO
// =====================================================================
const gravedad = {
  id: 'wa-gravedad', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro de gravedad de concreto ciclópeo',
  normas: 'RNE — NTE E.030, E.050 (39.13), E.060 Cap. 22 (concreto simple); Das; Calavera',
  desc: 'Empuje de Coulomb y Mononobe–Okabe, estabilidad estática y sísmica y esfuerzos de tracción, compresión y corte en secciones horizontales del cuerpo (concreto simple, E.060 Cap. 22).',
  titulo: 'Diseño de muro de gravedad de concreto ciclópeo H = 4.00 m',
  validacion: {
    fuente: 'Control: Coulomb y Mononobe–Okabe (Das cap. 7; Kramer §11.6) + E.060 Cap. 22; motor validado con Das Ej. 7.6 y Sağlam P2',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). kh = 0.5·Z·S se comprueba a mano.',
    valores: [
      { var: 'kh', esperado: 0.23625, tol: 0.0005, desc: 'kh = 0.5·Z·S' },
      { var: 'Ka', esperado: 0.4873, tol: 0.002, desc: 'Ka de Coulomb (trasdós inclinado, δ = 2φ/3)' },
      { var: 'Kae', esperado: 0.7481, tol: 0.002, desc: 'Kae de Mononobe–Okabe' },
      { var: 'FSv', esperado: 3.623, tol: 0.002, desc: 'FS al volteo, estático' },
      { var: 'FSd', esperado: 2.412, tol: 0.002, desc: 'FS al deslizamiento, estático' },
      { var: 'FSds', esperado: 1.277, tol: 0.002, desc: 'FS al deslizamiento con sismo' },
      { var: 'ft1e', unidad: 'kgf/cm^2', esperado: 2.178, tol: 0.002, desc: 'Tracción por flexión en la base del cuerpo, sismo' },
    ],
  },
  blocks: [
    text(`# Generalidades
## Descripción
Muro de gravedad de **concreto ciclópeo** (concreto $f'_c = 140$ kgf/cm² con 30 % de piedra grande de hasta 8") de sección trapezoidal, con talud en ambas caras, sobre un cimiento corrido del mismo material. La estabilidad se obtiene por peso propio: no lleva refuerzo, por lo que se verifican los esfuerzos de **tracción por flexión**, compresión y corte en secciones horizontales del cuerpo.

## Normas y referencias
- RNE **NTE E.050** Art. 39.13 (FS ≥ 1.50 estático y ≥ 1.25 pseudodinámico) y Art. 21 (capacidad portante); **NTE E.030** (Z, S).
- RNE **NTE E.060** Cap. 22 *Concreto estructural simple*: $M_n = 1.3\\sqrt{f'_c}\\,S$ (22.5.1), $V_n = 0.35\\sqrt{f'_c}\\,b\\,h$ (22.5.4), $\\phi = 0.65$ (9.3.2.5).
- Coulomb (1776) y Mononobe–Okabe en la forma de B. M. Das, *Principios de ingeniería de cimentaciones* (cap. 7) y AASHTO LRFD A11.3; J. Calavera, *Muros de contención y muros de sótano* (muros de gravedad).

## Metodología
El empuje activo se calcula con la teoría de **Coulomb** sobre el plano que une el extremo del talón (en el fondo) con la corona del trasdós; el suelo entre ese plano y el muro se incluye en el peso estabilizante. El empuje actúa inclinado $\\delta + \\theta$ respecto a la horizontal.`),
    calc(`# Datos de diseño
## Geometría
H = 4.00 m // Altura total (fondo de cimiento a corona) [1.5..6]
hz = 0.60 m // Altura del cimiento [0.4..1.2]
B = 2.80 m // Ancho de la base (≈ 0.5H a 0.7H, Das 8.2) [1..5]
Lp = 0.40 m // Punta del cimiento [0.2..1.0]
b1 = 0.40 m // Ancho de la corona (≥ 0.30 m) [0.30..0.80]
b2 = 1.80 m // Ancho del cuerpo en su base [0.8..3.5]
ie = 0.35 m // Proyección horizontal del talud frontal (paramento) [0..1.0]
ib = b2 - b1 - ie // Proyección horizontal del talud posterior (trasdós)
hp = H - hz // Altura del cuerpo
Df = 1.00 m // Altura de suelo frente al muro desde el fondo del cimiento [0.6..2.5]
fp = 0.50 // Fracción del empuje pasivo que se considera (AASHTO Tabla 11.5.7-1: φep = 0.50; el pasivo requiere desplazamientos grandes y el suelo puede excavarse) [0 : despreciar el pasivo|0.50 : 50 % (recomendado)|1.00 : pasivo completo]
bk = 0.50 m // Ancho del dentellón (uña) bajo el cimiento [0.3..1.0]
hk = 0.60 m // Profundidad del dentellón [0..1.5]
## Relleno y suelo de cimentación (EMS)
gammas = 1.90 tonf/m^3 // Peso unitario del relleno [1.5..2.2]
phis = 32 deg // Ángulo de fricción del relleno [20..40]
delta = 2/3*phis // Fricción muro–relleno (Das: 2φ/3 para concreto rugoso)
ws = 0.50 tonf/m^2 // Sobrecarga sobre el relleno (E.020) [0..2]
gammaf = 1.85 tonf/m^3 // Peso unitario del suelo de cimentación [1.5..2.2]
phif = 30 deg // Fricción del suelo de cimentación [20..40]
mu = 0.55 // Coeficiente de fricción en la base (EMS) [0.30..0.70]
qa = 2.00 kgf/cm^2 // Presión admisible (E.050 Art. 22) [0.5..6]
## Material
gammac = 2.30 tonf/m^3 // Peso unitario del concreto ciclópeo [2.2..2.5]
fc = 140 kgf/cm^2 // Resistencia del concreto ciclópeo (matriz f'c 140 + 30 % P.G.) [100 kgf/cm^2|140 kgf/cm^2|175 kgf/cm^2]
${SISMO}
qas = qaSismoE050(qa) // Presión admisible sísmica (E.050 Art. 21)
## Coeficientes de empuje (Coulomb)
theta = atan((B - Lp - ie - b1)/H) -> deg // Inclinación del plano talón–corona respecto a la vertical (+: el suelo apoya sobre él)
Ka = KaCoulomb(phis, delta, 0 deg, theta) // Das ec. 7.26
Kae = KaeMO(phis, delta, kh, kv, 0 deg, theta) // Mononobe–Okabe (AASHTO A11.3.1)
Kp = KpRankine(phif) // Pasivo frente al muro (δ = 0, conservador)`),
    { type: 'retwall', tipo: 'gravedad', metodo: 'coulomb', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 'b1', t2: 'b2', ie: 'ie', beta: '0 deg', q: 'ws', gs: 'gammas', phi: 'phis', delta: 'delta', gc: 'gammac', gf: 'gammaf', phif: 'phif', mu: 'mu', Df: 'Df', bk: 'bk', hk: 'hk', xk: 'Lp', fp: 'fp', kh: 'kh', kv: 'kv', qa: 'qa', qas: 'qas', fsv: '2.0', fsd: '1.5', fsvs: '1.5', fsds: '1.25', titulo: 'Muro de gravedad: fuerzas, empuje de Coulomb y presiones en la base' },
    calc(`# Esfuerzos en secciones horizontales del cuerpo (E.060 Cap. 22)
"Se analiza el cuerpo por encima de una sección horizontal a la profundidad $z$ bajo la corona. El empuje sobre el trasdós del cuerpo es el de Coulomb con $\\theta_s$ = inclinación del trasdós. Momentos respecto al centro de la sección, positivos si traccionan la cara posterior. Combinación $U = 0.9\\,CM + 1.7\\,CE$ (E.060 9.2.5, el peso reduce la tracción) y con sismo $U = 0.9\\,CM + 1.7\\,CE + 1.0\\,CS$ (E.060 9.2.3 y 9.2.5; ACI 318-19 5.3.8).
thetas = atan(ib/hp) -> deg // Inclinación del trasdós del cuerpo
Kas = KaCoulomb(phis, delta, 0 deg, thetas) // Coeficiente activo sobre el trasdós
Kaes = KaeMO(phis, delta, kh, kv, 0 deg, thetas) // Coeficiente sísmico sobre el trasdós
ang = delta + thetas // Inclinación del empuje respecto a la horizontal
@modo corto
bz(z) = b1 + (ie + ib)*z/hp // Ancho de la sección a la profundidad z
Wz(z) = gammac*(b1 + bz(z))*z/2 // Peso del cuerpo sobre la sección
MWz(z) = gammac*z*((ie*z/hp)/2*(2/3*ie*z/hp - bz(z)/2) + b1*(ie*z/hp + b1/2 - bz(z)/2) + (ib*z/hp)/2*(ie*z/hp + b1 + ib*z/(3*hp) - bz(z)/2)) // Momento del peso respecto al centro (+ detrás)
Pz(z) = Kas*gammas*z^2/2 + Kas*ws*z // Empuje activo sobre el trasdós
yP(z) = (Kas*gammas*z^3/6 + Kas*ws*z^2/2)/Pz(z) // Altura del empuje sobre la sección
xP(z) = bz(z) - ib*yP(z)/hp // Abscisa del punto de aplicación desde el paramento
Mu(z) = 1.7*Pz(z)*cos(ang)*yP(z) - 0.9*(MWz(z) + Pz(z)*sin(ang)*(xP(z) - bz(z)/2)) // Momento último
Pu(z) = 0.9*(Wz(z) + Pz(z)*sin(ang)) // Carga axial mínima
Mue(z) = 1.7*Pz(z)*cos(ang)*yP(z) + (Kaes - Kas)*gammas*z^2/2*cos(ang)*0.6*z + kh*gammac*z^2*(ie*z/hp/6 + b1/2 + ib*z/hp/6) - 0.9*(MWz(z) + Pz(z)*sin(ang)*(xP(z) - bz(z)/2)) // Momento último con sismo
ft(M, z) = 6*M/bz(z)^2 - Pu(z)/bz(z) // Esfuerzo en la cara posterior (+ tracción)
fcm(z) = (1.4*Wz(z) + 1.7*Pz(z)*sin(ang))/bz(z) + 6*abs(1.7*Pz(z)*cos(ang)*yP(z))/bz(z)^2 // Compresión máxima (conservador)
@modo completo
ftadm = 0.65*1.3*sqrtfc(fc) // Tracción por flexión admisible φ·1.3√f'c (E.060 22.5.1, φ = 0.65)
fcadm = 0.65*0.85*fc // Compresión admisible φ·0.85 f'c (E.060 22.5.3)
## Sección 1: base del cuerpo (z = hp)
z1 = hp
bz1 = bz(z1)
ft1 = ft(Mu(z1), z1) -> kgf/cm^2 // Esfuerzo en la cara posterior, estático
check ft1 <= ftadm // Tracción por flexión, estático (E.060 22.5.1)
ft1e = ft(Mue(z1), z1) -> kgf/cm^2 // Esfuerzo en la cara posterior, sismo
check ft1e <= ftadm // Tracción por flexión, sismo
fc1 = fcm(z1) -> kgf/cm^2
check fc1 <= fcadm // Compresión (E.060 22.5.3)
VE1 = 1.7*Pz(z1)*cos(ang) -> tonf/m // Cortante estático mayorado (1.7 CE)
VS1 = (Kaes - Kas)*gammas*z1^2/2*cos(ang) + kh*Wz(z1) -> tonf/m // Incremento sísmico: ΔEae + inercia del cuerpo
Vu1 = max(VE1, VE1 + VS1) -> tonf/m // Cortante último
phiVn1 = 0.65*0.35*sqrtfc(fc)*bz1 -> tonf/m // φVn = φ·0.35√f'c·b·h (E.060 22.5.4)
check Vu1 <= phiVn1 // Cortante en la sección 1
## Sección 2: mitad de la altura del cuerpo (z = hp/2)
z2 = hp/2
ft2 = max(ft(Mu(z2), z2), ft(Mue(z2), z2)) -> kgf/cm^2 // Máximo esfuerzo en la cara posterior
check ft2 <= ftadm // Tracción por flexión en la sección 2
VE2 = 1.7*Pz(z2)*cos(ang) -> tonf/m // Cortante estático mayorado (1.7 CE)
VS2 = (Kaes - Kas)*gammas*z2^2/2*cos(ang) + kh*Wz(z2) -> tonf/m // Incremento sísmico: ΔEae + inercia del cuerpo
Vu2 = max(VE2, VE2 + VS2) -> tonf/m // Cortante último
check Vu2 <= 0.65*0.35*sqrtfc(fc)*bz(z2) // Cortante en la sección 2
## Cimiento: tracción en la punta (voladizo de concreto simple)
Mupt = 1.7*qtoe*Lp^2/2 - 0.9*gammac*hz*Lp^2/2 -> tonf*m/m // Momento en la cara del paramento (presión máxima, conservador)
ftp = 6*Mupt/hz^2 -> kgf/cm^2
check ftp <= ftadm // Tracción por flexión en la punta del cimiento`),
    text(`> **Recomendaciones constructivas:** piedra grande limpia de hasta 8" (≤ 1/3 del espesor mínimo), sin contacto entre piedras; juntas de dilatación cada 8–10 m; drenaje con lloraderos Ø 3" @ 1.5 m y filtro granular (E.050 39.13.8).`),
    summary(),
  ],
};

// =====================================================================
//  3) MURO CON CONTRAFUERTES
// =====================================================================
const contrafuertes = {
  id: 'wa-contrafuertes', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro con contrafuertes',
  normas: 'RNE — NTE E.030, E.050 (39.13), E.060; Huntington; Calavera; Bowles',
  desc: 'Estabilidad estática y sísmica, pantalla como losa continua apoyada en contrafuertes (franjas horizontales y momento vertical de Huntington), diseño del contrafuerte en T con acero inclinado y tirantes de unión.',
  titulo: 'Diseño de muro de contención con contrafuertes H = 8.00 m',
  validacion: {
    fuente: 'Control: Rankine + M-O (Das cap. 7), AASHTO 11.6.5 y E.060; motor validado con Das Ej. 8.1',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). kh = 0.5·Z·S = 0.5·0.35·1.15 se comprueba a mano.',
    valores: [
      { var: 'kh', esperado: 0.20125, tol: 0.0005, desc: 'kh = 0.5·Z·S' },
      { var: 'Pa', unidad: 'tonf/m', esperado: 21.14, tol: 0.002, desc: 'Empuje activo estático' },
      { var: 'FSv', esperado: 5.381, tol: 0.002, desc: 'FS al volteo, estático' },
      { var: 'FSd', esperado: 2.848, tol: 0.002, desc: 'FS al deslizamiento, estático' },
      { var: 'FSds', esperado: 1.278, tol: 0.002, desc: 'FS al deslizamiento con sismo' },
      { var: 'Mneg', unidad: 'tonf*m/m', esperado: 4.939, tol: 0.002, desc: 'Momento negativo de la pantalla en el contrafuerte' },
      { var: 'Asdis', unidad: 'cm^2', esperado: 26.22, tol: 0.002, desc: 'Acero de tracción del contrafuerte' },
    ],
  },
  blocks: [
    text(`# Generalidades
## Descripción
Para alturas mayores de 6–7 m el muro en voladizo resulta antieconómico; los **contrafuertes** (placas triangulares unidas a la pantalla y al talón) convierten la pantalla y el talón en losas continuas apoyadas en ellos. La pantalla trabaja en **franjas horizontales** entre contrafuertes; cerca de la base, donde está restringida por la zapata, se desarrolla además un momento vertical. El contrafuerte es una **viga en voladizo de sección T** (ala = pantalla) con el refuerzo de tracción a lo largo de su borde inclinado.

## Normas y referencias
- RNE **NTE E.050** 39.13 (FS 1.50 / 1.25), **E.030**, **E.060** (9.2.5, 10, 11, 12, 14.3).
- W. Huntington, *Earth Pressures and Retaining Walls* (1957): coeficientes $M^- = pL^2/12$, $M^+ = pL^2/16$ en franjas horizontales y momento vertical en la base $M_v \\approx 0.03\\,p\\,h_p\\,L$ (recogidos por J. Bowles, *Foundation Analysis and Design* §12, y J. Calavera, *Muros de contención y muros de sótano*).
- B. M. Das, *Principios de ingeniería de cimentaciones* cap. 8.

## Hipótesis
La estabilidad se calcula por metro de muro despreciando el peso de los contrafuertes (conservador). Contrafuertes separados $S_c$ entre ejes con espesor $t_c$; luz libre de las losas $L_n = S_c - t_c$.`),
    calc(`# Datos de diseño
## Geometría
H = 8.00 m // Altura total [6..12]
hz = 0.70 m // Espesor de la zapata [0.5..1.2]
B = 6.50 m // Ancho de la base (≈ 0.8H por sismo) [3..10]
Lp = 1.30 m // Longitud de la punta [0.5..2.5]
tp = 0.30 m // Espesor de la pantalla (constante) [0.20..0.50]
Sc = 3.00 m // Separación de contrafuertes entre ejes (≈ H/3 a H/2) [2..5]
tc = 0.35 m // Espesor de los contrafuertes [0.20..0.60]
bk = 0.50 m // Ancho del dentellón [0.3..1.0]
hk = 1.40 m // Profundidad del dentellón [0..2]
Df = 1.50 m // Suelo frente a la punta desde el fondo [0.6..2.5]
fp = 0.50 // Fracción del empuje pasivo que se considera (AASHTO Tabla 11.5.7-1: φep = 0.50; el pasivo requiere desplazamientos grandes y el suelo puede excavarse) [0 : despreciar el pasivo|0.50 : 50 % (recomendado)|1.00 : pasivo completo]
hp = H - hz // Altura de la pantalla
Lt = B - Lp - tp // Longitud del talón
Ln = Sc - tc // Luz libre de la pantalla y del talón entre contrafuertes
## Suelos (EMS)
gammas = 1.90 tonf/m^3 // Peso unitario del relleno [1.5..2.2]
phis = 32 deg // Fricción del relleno [20..40]
ws = 1.00 tonf/m^2 // Sobrecarga (E.020) [0..2]
gammaf = 1.90 tonf/m^3 // Suelo de cimentación [1.5..2.2]
phif = 32 deg // Fricción del suelo de cimentación [20..40]
mu = 0.55 // Coeficiente de fricción en la base [0.30..0.70]
qa = 3.00 kgf/cm^2 // Presión admisible [0.5..6]
## Materiales
fc = 210 kgf/cm^2 // Concreto [210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
gammac = 2.40 tonf/m^3 // Peso unitario del concreto armado (E.020 Anexo 1) [2.2..2.5]
rec = 5 cm // Recubrimiento en pantalla y contrafuertes (E.060 7.7.1) [2..7.5]
${SISMO.replace('zona = 4 //', 'zona = 3 //')}
qas = qaSismoE050(qa)
## Coeficientes de empuje
Ka = KaRankine(phis) // Rankine
Kae = KaeMO(phis, 0 deg, kh, kv) // Mononobe–Okabe en el plano virtual (δ = β = 0)
DKae = Kae - Ka`),
    { type: 'retwall', tipo: 'voladizo', metodo: 'rankine', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 'tp', t2: 'tp', ie: '0 m', bk: 'bk', hk: 'hk', xk: 'Lp', q: 'ws', gs: 'gammas', phi: 'phis', gc: 'gammac', gf: 'gammaf', phif: 'phif', mu: 'mu', Df: 'Df', fp: 'fp', kh: 'kh', kv: 'kv', qa: 'qa', qas: 'qas', fsv: '2.0', fsd: '1.5', fsvs: '1.5', fsds: '1.25', contrafuerte: true, titulo: 'Muro con contrafuertes: sección típica (contrafuerte en línea discontinua), empujes y presiones' },
    calc(`# Pantalla: losa continua apoyada en los contrafuertes
## Presión de diseño en la franja inferior (z = hp)
pus = 1.7*Ka*(gammas*hp + ws) // Presión última estática (E.060 9.2.5)
pue = 1.7*Ka*(gammas*hp + 0.5*ws) + 1.0*DKae*gammas*hp/2 // Con sismo (U = 1.7 CE + 1.0 CS): incremento M-O como presión uniforme equivalente
pu = max(pus, pue) // Presión de diseño
## Franjas horizontales (Huntington)
Mneg = pu*Ln^2/12 -> tonf*m/m // En los contrafuertes, tracción en la cara del relleno
Mpos = pu*Ln^2/16 -> tonf*m/m // En el centro del vano, tracción en la cara exterior
d = tp - rec - db(5)/2 // Peralte efectivo (5/8")
Asreq(M) = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*M/(0.9*0.85*fc*d^2))))*d // Acero por metro para el momento M
rhob = 0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Cuantía balanceada (β1 = 0.85, E.060 10.3.2)
Asmin = 0.0018*tp -> cm^2/m // Mínimo (E.060 10.5.4)
Ashn = max(Asreq(Mneg), Asmin) -> cm^2/m // Horizontal, cara del relleno
Ashp = max(Asreq(Mpos), Asmin) -> cm^2/m // Horizontal, cara exterior
check Ashn/d <= 0.75*rhob // Cuantía máxima de la pantalla (E.060 10.3.4)
shn = rounddown(max(Ab(5)/Ashn, 2.5 cm), 2.5 cm) // 5/8"
shp = rounddown(max(Ab(5)/Ashp, 2.5 cm), 2.5 cm) // 5/8"
check max(shn, shp) <= min(3*tp, 40 cm) // Espaciamiento máximo (E.060 10.5.4)
Vup = pu*(Ln/2 - d) -> tonf/m // Cortante a d de la cara del contrafuerte
phiVc = 0.85*0.53*sqrtfc(fc)*d -> tonf/m
check Vup <= phiVc // Cortante en la pantalla
## Momento vertical en la base de la pantalla (Huntington)
Mv = 0.03*pu*hp*Ln -> tonf*m/m // Negativo en la unión con la zapata (cara del relleno)
Asv = max(Asreq(Mv), Asmin) -> cm^2/m
sv = rounddown(max(Ab(5)/Asv, 2.5 cm), 2.5 cm) // Vertical interior, en la franja inferior hp/4
check sv <= min(3*tp, 40 cm) // Espaciamiento máximo
"Momento vertical positivo $M_v/4$: se cubre con el refuerzo mínimo vertical de la cara exterior.
# Contrafuerte (viga T en voladizo)
alpha = atan(hp/Lt) -> deg // Inclinación del borde posterior (acero de tracción)
Mce = Ka*gammas*hp^3/6 -> tonf*m/m // Momento del empuje activo en la base, por metro
Mcw = Ka*ws*hp^2/2 -> tonf*m/m // Momento del empuje de la sobrecarga, por metro
Mcs = DKae*gammas*hp^2/2*0.6*hp + kh*gammac*tp*hp^2/2 -> tonf*m/m // Momento sísmico: incremento ΔKae a 0.6 hp + inercia de la pantalla
Muc = max(1.7*Sc*(Mce + Mcw), Sc*(1.7*(Mce + 0.5*Mcw) + Mcs)) -> tonf*m // Momento último en la base: máx. (U = 1.7 CE; U = 1.7 CE + 1.0 CS con 50 % de sobrecarga)
dh = tp + Lt - 10 cm // Brazo horizontal desde la cara exterior de la pantalla (compresión) al acero
bf = min(Sc, tc + 16*tp) // Ancho efectivo del ala (E.060 8.10.2)
Asc1 = Muc/(0.9*fy*sin(alpha)*0.95*dh) -> cm^2 // Primera aproximación
a = Asc1*fy/(0.85*fc*bf) // Bloque de compresión en el ala (pantalla)
Asc = Muc/(0.9*fy*sin(alpha)*(dh - a/2)) -> cm^2 // Acero inclinado de tracción
check a <= tp // El bloque de compresión queda dentro de la pantalla (sección T como rectangular)
Asminc = 0.7*sqrtfc(fc)/fy*tc*dh*sin(alpha) -> cm^2 // Mínimo (E.060 10.5.2)
Asdis = max(Asc, min(Asminc, 1.33*Asc)) // Acero de diseño: el mínimo puede sustituirse por 1.33 As requerido (E.060 10.5.3)
nc = ceil(Asdis/Ab(8)) // Número de varillas de 1"
check nc*Ab(8) >= Asdis // Acero colocado
Vce = Ka*gammas*hp^2/2 -> tonf/m // Empuje activo total por metro
Vcw = Ka*ws*hp -> tonf/m // Empuje de la sobrecarga por metro
Vcs = DKae*gammas*hp^2/2 + kh*gammac*tp*hp -> tonf/m // Incremento sísmico + inercia de la pantalla
Vuc = max(1.7*Sc*(Vce + Vcw), Sc*(1.7*(Vce + 0.5*Vcw) + Vcs)) -> tonf // Cortante en la base
Vnet = Vuc - Muc/(dh - a/2)*cos(alpha)/sin(alpha) -> tonf // Descontando la componente horizontal de la tracción inclinada (Bowles §12)
phiVcc = 0.85*0.53*sqrtfc(fc)*tc*dh*sin(alpha) -> tonf // Alma del contrafuerte, peralte perpendicular al acero
check Vnet <= phiVcc // Cortante en el contrafuerte
## Tirantes de unión (anclaje de la pantalla y del talón al contrafuerte)
Tuh = pu*Sc -> tonf/m // Tracción horizontal por metro de altura en la base
Ash = Tuh/(0.9*fy) -> cm^2/m // Estribos horizontales (2 ramas)
sth = min(rounddown(max(2*Ab(4)/Ash, 2.5 cm), 2.5 cm), 30 cm) // Estribo de 1/2" en dos ramas, separación ≤ 30 cm
check 2*Ab(4)/sth >= Ash // Tirantes horizontales suficientes
wn = 1.7*(gammas*hp + gammac*hz + ws - qheel) -> tonf/m^2 // Carga neta descendente sobre el talón (presión mínima del suelo)
Asvt = wn*Sc/(0.9*fy) -> cm^2/m // Tirantes verticales talón–contrafuerte
svt = min(rounddown(max(2*Ab(4)/Asvt, 2.5 cm), 2.5 cm), 30 cm) // Estribo de 1/2" en dos ramas
check 2*Ab(4)/svt >= Asvt // Tirantes verticales suficientes
# Talón y punta
Mtn = wn*Ln^2/12 -> tonf*m/m // Talón: losa continua entre contrafuertes (tracción arriba en los apoyos)
dz = hz - 7.5 cm - db(5)/2
Astal = max(0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Mtn/(0.9*0.85*fc*dz^2))))*dz, 0.0018*hz) -> cm^2/m
check Astal/dz <= 0.75*rhob // Cuantía máxima del talón (E.060 10.3.4)
stal = rounddown(max(Ab(5)/Astal, 2.5 cm), 2.5 cm)
check stal <= min(3*hz, 40 cm) // Espaciamiento máximo
Mpu = max(1.7*qtoe, 1.25*qtoes)*Lp^2/2 - 0.9*gammac*hz*Lp^2/2 -> tonf*m/m // Punta en voladizo (presión máxima uniforme, conservador)
Aspu = max(0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Mpu/(0.9*0.85*fc*dz^2))))*dz, 0.0018*hz) -> cm^2/m
check Aspu/dz <= 0.75*rhob // Cuantía máxima de la punta (E.060 10.3.4)
spu = rounddown(max(Ab(5)/Aspu, 2.5 cm), 2.5 cm)
check spu <= min(3*hz, 40 cm) // Espaciamiento máximo
Vupu = max(1.7*qtoe, 1.25*qtoes)*(Lp - dz) - 0.9*gammac*hz*(Lp - dz) -> tonf/m
check Vupu <= 0.85*0.53*sqrtfc(fc)*dz // Cortante en la punta
"Contrafuerte: {nc} varillas de 1\\" en el borde inclinado; tirantes horizontales 1/2\\" @ {sth} y verticales 1/2\\" @ {svt}. Pantalla: horizontal 5/8\\" @ {shn} (relleno) y @ {shp} (exterior) en la franja inferior; los espaciamientos pueden ampliarse en altura en proporción a la presión.`),
    summary(),
  ],
};

// =====================================================================
//  4) MURO DE SÓTANO
// =====================================================================
const sotano = {
  id: 'wa-sotano', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro de sótano apoyado en losas (empuje en reposo)',
  normas: 'RNE — NTE E.020, E.030, E.050, E.060; Calavera; Wood (1973)',
  desc: 'Empuje en reposo K0 (Jaky), modelo de viga apoyada en la losa y empotrada en el cimiento, sismo por Wood para muros rígidos, diseño por flexión de ambas caras, cortante, refuerzo mínimo y conexión con la losa por cortante-fricción.',
  titulo: 'Diseño de muro de sótano de concreto armado',
  validacion: {
    fuente: 'Control: empuje en reposo de Jaky (K0 = 1 − sen φ) + Seed–Whitman, viga apoyada-empotrada (E.060)',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). K0 = 1 − sen 30° = 0.5 y kh = 0.5·0.45·1.05 se comprueban a mano.',
    valores: [
      { var: 'K0', esperado: 0.5, tol: 0.0005, desc: 'K0 de Jaky, φ = 30°' },
      { var: 'kh', esperado: 0.23625, tol: 0.0005, desc: 'kh = 0.5·Z·S' },
      { var: 'Mub', unidad: 'tonf*m/m', esperado: 7.525, tol: 0.002, desc: 'Momento último en la base' },
      { var: 'Vu', unidad: 'tonf/m', esperado: 12.86, tol: 0.002, desc: 'Cortante último' },
      { var: 'Asb', unidad: 'cm^2/m', esperado: 8.521, tol: 0.002, desc: 'Acero en la base (cara del suelo)' },
    ],
  },
  blocks: [
    text(`# Generalidades
Los muros de sótano están arriostrados en su borde superior por la losa del primer piso, por lo que **no pueden desplazarse** lo suficiente para movilizar el estado activo: se diseñan con el **empuje en reposo** $K_0$ (Jaky). El muro se modela como una franja vertical de 1 m **apoyada** en la losa y **empotrada** en el cimiento (Calavera, *Muros de contención y muros de sótano*, cap. 9). El sismo se considera con la solución de **Wood (1973)** para muros rígidos: incremento uniforme $\\Delta p = k_h\\,\\gamma\\,H$ con $k_h = PGA$ (sin reducción por desplazamiento).

**Normas:** RNE NTE E.020 (sobrecarga), E.030 (PGA = Z·S), E.050 16.2.9 (K0 del EMS), E.060 9.2.5, 10.5, 11, 11.7 (cortante-fricción), 14.3.`),
    calc(`# Datos
hs = 3.20 m // Altura del muro entre el cimiento y la losa del primer piso [2.4..4.5]
tw = 0.30 m // Espesor del muro [0.20..0.50]
gammas = 1.90 tonf/m^3 // Peso unitario del suelo retenido [1.5..2.2]
phis = 30 deg // Fricción del suelo [20..40]
OCR = 1 // Relación de sobreconsolidación (relleno normalmente consolidado) [1..4]
ws = 1.00 tonf/m^2 // Sobrecarga en la vereda/pista contigua (E.020) [0..2]
fc = 210 kgf/cm^2 // Resistencia del concreto [210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
rec = 5 cm // Recubrimiento cara del suelo (E.060 7.7.1) [2..7.5]
${SISMO}
## Empujes
K0 = K0Jaky(phis, OCR) // Reposo: K0 = (1 − sen φ)·OCR^sen φ (Jaky 1944; Mayne y Kulhawy 1982)
pE = K0*gammas*hs // Presión del suelo en la base (triangular)
pQ = K0*ws // Presión de la sobrecarga (uniforme)
pS = PGA*gammas*hs // Incremento sísmico uniforme para muros rígidos (Wood 1973), kh = PGA
## Cargas últimas por metro (franja de 1 m)
wE1 = 1.7*pE*1 m -> tonf/m // U1 = 1.7 CE (E.060 9.2.5)
wQ1 = 1.7*pQ*1 m -> tonf/m
wE2 = 1.7*pE*1 m -> tonf/m // U2 = 1.7 CE + 1.0 CS (E.060 9.2.5 + 9.2.3; ACI 318-19 5.3.8)
wS2 = 1.0*(pS + 0.5*pQ)*1 m -> tonf/m // Sismo + 50 % de la sobrecarga
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5)
Iw = 1 m*tw^3/12 // Inercia de la franja`),
    { type: 'beam', tramos: 'hs', apoyos: 'A E', E: 'Ec', I: 'Iw', cargas: 'T 1 0 wE1\nU 1 wQ1', titulo: 'Combinación U1 = 1.7 CE: franja de muro (x = 0 en la losa, x = hs en el cimiento)' },
    { type: 'beam', tramos: 'hs', apoyos: 'A E', E: 'Ec', I: 'Iw', cargas: 'T 1 0 wE2\nU 1 wS2', sufijo: 's', titulo: 'Combinación U2 = 1.7 CE + 1.0 CS (Wood)' },
    calc(`# Diseño
Mub = max(abs(Mneg), abs(Mneg_s))/(1 m) -> tonf*m/m // Momento en el empotramiento (tracción en la cara del suelo)
Mup = max(Mpos, Mpos_s)/(1 m) -> tonf*m/m // Momento positivo máximo (tracción en la cara interior)
Vu = max(Vmax, Vmax_s)/(1 m) -> tonf/m // Cortante máximo
d = tw - rec - db(4)/2 // Peralte efectivo
Asreq(M) = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*M/(0.9*0.85*fc*d^2))))*d
rhob = 0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Cuantía balanceada (β1 = 0.85, E.060 10.3.2)
Asmin = 0.0018*tw -> cm^2/m // Mínimo en flexión (E.060 10.5.4)
Asb = max(Asreq(Mub), Asmin) -> cm^2/m // Vertical, cara del suelo en la base
Asp = max(Asreq(Mup), 0.0012*tw) -> cm^2/m // Vertical, cara interior (mínimo vertical de muros E.060 14.3.2)
check max(Asb, Asp)/d <= 0.75*rhob // Cuantía máxima (E.060 10.3.4)
sb = rounddown(max(Ab(4)/Asb, 2.5 cm), 2.5 cm) // Varilla de 1/2"
sp = rounddown(max(Ab(4)/Asp, 2.5 cm), 2.5 cm) // Varilla de 1/2"
check max(sb, sp) <= min(3*tw, 40 cm) // Espaciamiento máximo (E.060 14.3.5)
phiVc = 0.85*0.53*sqrtfc(fc)*d -> tonf/m
check Vu <= phiVc // Cortante (sin estribos, E.060 11.3)
Ash = 0.0020*tw -> cm^2/m // Horizontal mínimo (E.060 14.3.3), en dos capas
sh = rounddown(max(Ab(3)/(Ash/2), 2.5 cm), 2.5 cm) // 3/8" en cada cara
check sh <= min(3*tw, 40 cm) // Espaciamiento horizontal
## Conexión con la losa (cortante-fricción, E.060 11.7)
Ru = max(R1, R1_s)/(1 m) -> tonf/m // Reacción última en la losa
Avf = Ru/(0.85*fy*0.6) -> cm^2/m // μ = 0.6 (junta no rugosa), φ = 0.85
sd = rounddown(max(Ab(3)/Avf, 2.5 cm), 2.5 cm) // Pasadores de 3/8"
check sd <= 40 cm // Espaciamiento de pasadores
"Refuerzo: vertical 1/2\\" @ {sb} (cara del suelo, en la base y hasta $h_s/3$), 1/2\\" @ {sp} (cara interior), horizontal 3/8\\" @ {sh} en ambas caras; pasadores 3/8\\" @ {sd} a la losa. Impermeabilizar la cara del suelo y colocar drenaje perimetral.`),
    summary(),
  ],
};

// =====================================================================
//  9) COMPARATIVO DE COEFICIENTES DE EMPUJE
// =====================================================================
const comparativo = {
  id: 'wa-coeficientes', pais: 'PE', cat: CAT, icon: 'plot', settings: {},
  name: 'Coeficientes de empuje: Rankine, Coulomb y Mononobe–Okabe',
  normas: 'Das; AASHTO LRFD 3.11.5 y A11.3; Seed y Whitman (1970); Jaky (1944)',
  desc: 'Cálculo y comparación gráfica de K0, Ka y Kp de Rankine y Coulomb, Kae y Kpe de Mononobe–Okabe y el incremento dinámico de Seed–Whitman en función de φ y kh.',
  titulo: 'Coeficientes de empuje de tierras — comparación de teorías',
  validacion: {
    fuente: 'B. M. Das, Principles of Foundation Engineering (7.ª ed.), Ej. 7.6 (φ = 30°, δ = 15°, kh = 0.2, kv = 0 → Kae = 0.452) y tabla de Ka de Coulomb (φ = 30°, δ = 15° → 0.3014)',
    nota: 'Datos por defecto = datos del Ej. 7.6 de Das (Kae con δ = φ/2 = 15°). K0, Ka y Kp de Rankine para φ = 30° son valores exactos (0.5, 1/3 y 3).',
    valores: [
      { var: 'Kae', esperado: 0.452, tol: 0.002, desc: 'Das Ej. 7.6: Kae' },
      { var: 'KaC1', esperado: 0.3014, tol: 0.002, desc: 'Das, tabla de Coulomb: Ka (δ = 15°)' },
      { var: 'K0', esperado: 0.5, tol: 0.0005, desc: 'Jaky: 1 − sen 30°' },
      { var: 'KaR', esperado: 0.33333, tol: 0.0005, desc: 'Rankine: Ka = 1/3' },
      { var: 'KpR', esperado: 3, tol: 0.0005, desc: 'Rankine: Kp = 3' },
      { var: 'DKSW', esperado: 0.15, tol: 0.0005, desc: 'Seed–Whitman: ¾kh' },
    ],
  },
  blocks: [
    text(`# Generalidades
- **Reposo** (Jaky 1944): $K_0 = (1-\\sin\\phi)\\,OCR^{\\sin\\phi}$.
- **Rankine** (1857), muro liso y relleno con talud $\\beta$: $K_a = \\cos\\beta\\,\\dfrac{\\cos\\beta - \\sqrt{\\cos^2\\beta - \\cos^2\\phi}}{\\cos\\beta + \\sqrt{\\cos^2\\beta - \\cos^2\\phi}}$.
- **Coulomb** (1776), con fricción $\\delta$ y trasdós inclinado $\\theta$ (Das ec. 7.26): $K_a = \\dfrac{\\cos^2(\\phi-\\theta)}{\\cos^2\\theta\\,\\cos(\\delta+\\theta)\\left[1+\\sqrt{\\dfrac{\\sin(\\delta+\\phi)\\sin(\\phi-\\beta)}{\\cos(\\delta+\\theta)\\cos(\\theta-\\beta)}}\\right]^2}$.
- **Mononobe–Okabe** (1926–29), con $\\psi = \\arctan\\dfrac{k_h}{1-k_v}$: $K_{ae} = \\dfrac{\\cos^2(\\phi-\\theta-\\psi)}{\\cos\\psi\\cos^2\\theta\\cos(\\delta+\\theta+\\psi)\\left[1+\\sqrt{\\dfrac{\\sin(\\phi+\\delta)\\sin(\\phi-\\beta-\\psi)}{\\cos(\\delta+\\theta+\\psi)\\cos(\\beta-\\theta)}}\\right]^2}$, $E_{ae} = \\tfrac12\\gamma H^2(1-k_v)K_{ae}$.
- **Seed y Whitman** (1970): $\\Delta K_{ae} \\approx \\tfrac34 k_h$, aplicado a $0.6H$.`),
    calc(`# Datos
phi = 30 deg // Ángulo de fricción del relleno [28 deg|30 deg|32 deg|34 deg|36 deg]
beta = 0 deg // Talud del relleno [0..30]
theta = 0 deg // Inclinación del trasdós respecto a la vertical [-20..20]
kh = 0.20 // Coeficiente sísmico horizontal [0..0.40]
kv = 0 // Coeficiente sísmico vertical [0..0.15]
# Coeficientes
K0 = K0Jaky(phi) // Reposo (Jaky)
KaR = KaRankine(phi, beta) // Activo de Rankine
KpR = KpRankine(phi, beta) // Pasivo de Rankine
KaC0 = KaCoulomb(phi, 0 deg, beta, theta) // Coulomb, δ = 0 (= Rankine si β = θ = 0)
KaC1 = KaCoulomb(phi, phi/2, beta, theta) // Coulomb, δ = φ/2
KaC2 = KaCoulomb(phi, 2/3*phi, beta, theta) // Coulomb, δ = 2φ/3
KpC1 = KpCoulomb(phi, phi/2, beta, theta) // Pasivo de Coulomb, δ = φ/2 (no usar δ > φ/2: sobrestima Kp)
psi = psiMO(kh, kv) // Ángulo sísmico
check MOequil(phi, kh, kv, beta) >= 0 deg // Equilibrio sísmico del relleno: φ − β − ψ ≥ 0 (M-O tiene solución)
Kae = KaeMO(phi, phi/2, kh, kv, beta, theta) // Mononobe–Okabe activo, δ = φ/2
Kpe = KpeMO(phi, 0 deg, kh, kv, beta, theta) // Mononobe–Okabe pasivo, δ = 0
DKMO = Kae - KaC1 // Incremento dinámico exacto (M-O)
DKSW = DKaeSW(kh) // Seed–Whitman ¾kh
check round(abs(KaC0 - KaR), 9) <= 0.001 // Coulomb con δ = β = θ = 0 coincide con Rankine
check KaC2 <= KaR // La fricción en el trasdós reduce el empuje activo (Das 7.6)
check abs(DKSW - DKMO)/DKMO <= 0.20 // Seed–Whitman aproxima al incremento M-O dentro del 20 %
check Kpe <= KpR // El sismo reduce la resistencia pasiva`),
    { type: 'plot', expr: 'KaRankine(x*1 deg); KaCoulomb(x*1 deg, x/2*1 deg); KaCoulomb(x*1 deg, 2/3*x*1 deg); KaeMO(x*1 deg, x/2*1 deg, kh, kv); K0Jaky(x*1 deg)', var: 'x', desde: '20', hasta: '45', puntos: '100', xlabel: 'Ángulo de fricción φ [°]', ylabel: 'Coeficiente K', nombres: 'Ka Rankine; Ka Coulomb δ = φ/2; Ka Coulomb δ = 2φ/3; Kae Mononobe–Okabe (kh dato, δ = φ/2); K0 Jaky', leyenda: true, titulo: 'Coeficientes de empuje en función de φ (β = θ = 0)' },
    { type: 'plot', expr: 'KaeMO(phi, phi/2, x, kv) - KaCoulomb(phi, phi/2); DKaeSW(x)', var: 'x', desde: '0', hasta: '0.4', puntos: '100', xlabel: 'Coeficiente sísmico kh', ylabel: 'ΔKae', nombres: 'Incremento M-O (δ = φ/2); Seed–Whitman ¾ kh', leyenda: true, titulo: 'Incremento dinámico del coeficiente activo en función de kh' },
    { type: 'plot', expr: 'KaRankine(phi, x*1 deg); KaCoulomb(phi, phi/2, x*1 deg)', var: 'x', desde: '0', hasta: '29', puntos: '100', xlabel: 'Talud del relleno β [°]', ylabel: 'Ka', nombres: 'Rankine; Coulomb δ = φ/2', leyenda: true, titulo: 'Efecto del talud del relleno en Ka (φ dato)' },
    summary(),
  ],
};

// =====================================================================
//  5) MURO DE GAVIONES
// =====================================================================
const gaviones = {
  id: 'wa-gaviones', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro de gaviones',
  normas: 'RNE — NTE E.030, E.050 (39.13); Maccaferri; Das; AASHTO LRFD 11.6',
  desc: 'Muro de gravedad de gaviones escalonados: peso con porosidad, estabilidad estática y sísmica por hiladas (vectores), verificación de la junta entre hiladas (φ* y σ admisible de Maccaferri) y presiones en la base.',
  titulo: 'Diseño de muro de gaviones H = 4.00 m',
  validacion: {
    fuente: 'Control: Rankine + M-O (Das cap. 7) y manual Maccaferri (peso del gavión γp(1 − n))',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). γg = 2.6·(1 − 0.30) = 1.82 t/m³ y Ka = 1/3 se comprueban a mano.',
    valores: [
      { var: 'gammag', unidad: 'tonf/m^3', esperado: 1.82, tol: 0.0005, desc: 'Peso unitario del gavión γp(1 − n)' },
      { var: 'Ka', esperado: 0.33333, tol: 0.0005, desc: 'Ka de Rankine, φ = 30°' },
      { var: 'FSv', esperado: 3.597, tol: 0.002, desc: 'FS al volteo, estático' },
      { var: 'FSd', esperado: 2.202, tol: 0.002, desc: 'FS al deslizamiento, estático' },
      { var: 'FSds', esperado: 1.303, tol: 0.002, desc: 'FS al deslizamiento con sismo' },
      { var: 'qmax', unidad: 'tonf/m^2', esperado: 13.34, tol: 0.002, desc: 'Presión máxima en la base' },
    ],
  },
  blocks: [
    text(`# Generalidades
Muro de gravedad formado por **gaviones caja** de malla hexagonal de doble torsión (alambre galvanizado/PVC) rellenos de piedra, en 4 hiladas de 1.00 m con escalones hacia el relleno. Es una estructura flexible y permeable: tolera asentamientos diferenciales y no genera presión de agua si se coloca un geotextil filtrante entre el relleno y los gaviones.

**Referencias:** RNE NTE E.050 39.13 (FS 1.50 / 1.25) y Art. 21; E.030 (Z, S); Maccaferri do Brasil, *Estructuras flexibles en gaviones en obras de contención* (peso específico con porosidad, ángulo de fricción entre gaviones $\\phi^* = 25\\gamma_g - 10$ y esfuerzo normal admisible $\\sigma_{adm} = 50\\gamma_g - 30$, con $\\gamma_g$ en t/m³ y $\\sigma$ en t/m²); B. M. Das cap. 8. El empuje se calcula con Rankine en el plano vertical que pasa por el talón; el suelo sobre los escalones forma parte del muro.

> En zonas sísmicas 3 y 4 la inercia del propio muro suele gobernar el deslizamiento: se recomienda ensanchar la base o inclinar el muro 6° hacia el relleno.`),
    calc(`# Datos
h = 1.00 m // Altura de cada hilada (gavión caja de 1.0 m) [0.5..1.0]
b1 = 3.00 m // Ancho de la hilada 1 (base) [1.5..5]
b2 = 2.50 m // Ancho de la hilada 2 [1..4.5]
b3 = 2.00 m // Ancho de la hilada 3 [1..4]
b4 = 1.50 m // Ancho de la hilada 4 (corona) [1..3]
bv = [b1, b2, b3, b4] // Anchos de abajo hacia arriba (paramento vertical, escalones hacia el relleno)
nh = 4 // Número de hiladas [2..8]
H = nh*h // Altura total
B = b1 // Ancho de la base
## Materiales y suelos
gammap = 2.60 tonf/m^3 // Peso específico de la piedra (andesita/granito) [2.2..2.9]
np = 0.30 // Porosidad del relleno de piedra (Maccaferri: 0.30–0.40) [0.30..0.40]
gammag = gammap*(1 - np) // Peso específico del gavión
gammas = 1.80 tonf/m^3 // Peso unitario del relleno [1.5..2.2]
phis = 30 deg // Fricción del relleno [20..40]
ws = 1.00 tonf/m^2 // Sobrecarga (E.020) [0..2]
mu = 0.62 // Coeficiente de fricción gavión–suelo de fundación tan φf (EMS) [0.30..0.70]
qa = 2.00 kgf/cm^2 // Presión admisible [0.5..6]
${SISMO.replace('zona = 4 //', 'zona = 2 //')}
qas = qaSismoE050(qa)
# Empujes
Ka = KaRankine(phis) // Rankine (β = 0)
Ea = 0.5*Ka*gammas*H^2 -> tonf/m // Empuje del relleno, a H/3
Eq = Ka*ws*H -> tonf/m // Empuje de la sobrecarga, a H/2
Kae = KaeMO(phis, 0 deg, kh, kv) // Mononobe–Okabe en el plano vertical (δ = β = 0)
check MOequil(phis, kh, kv) >= 0 deg // Equilibrio sísmico del relleno: φ − β − ψ ≥ 0 (M-O tiene solución)
DEae = 0.5*(Kae - Ka)*gammas*H^2*(1 - kv) -> tonf/m // Incremento dinámico, a 0.6H (Seed–Whitman)
Eqe = Kae*0.5*ws*H -> tonf/m // Sobrecarga con sismo (50 %)
# Pesos y momentos estabilizantes (respecto a la arista exterior de la base)
kk = 1:4 // Índice de la hilada
yv = h*(kk - 1/2) // Altura del centroide de cada hilada
Wg = gammag*h*bv // Peso de los gaviones por hilada
Ws = gammas*h*(B - bv) // Peso del suelo sobre los escalones
Mg = Wg .* bv/2 // Momento de los gaviones (paramento vertical en x = 0)
Ms = Ws .* (B + bv)/2 // Momento del suelo sobre los escalones
SV = sum(Wg) + sum(Ws) -> tonf/m // Fuerza vertical total
Mr = sum(Mg) + sum(Ms) -> tonf*m/m // Momento estabilizante`),
    { type: 'table', columnas: 'Hilada = kk\nAncho [m] = bv\nW gavión [t/m] = Wg\nW suelo [t/m] = Ws\ny [m] = yv\nM gavión [t·m/m] = Mg\nM suelo [t·m/m] = Ms', total: true, titulo: 'Pesos y momentos estabilizantes por hilada' },
    calc(`# Estabilidad estática
Mo = Ea*H/3 + Eq*H/2 -> tonf*m/m // Momento de volteo
FSv = Mr/Mo // Volteo
check FSv >= FSminE050(0) // Volteo, estático (E.050 39.13.6)
FSd = mu*SV/(Ea + Eq) // Deslizamiento (sin empuje pasivo)
check FSd >= FSminE050(0) // Deslizamiento, estático (E.050 39.13.6)
xr = (Mr - Mo)/SV -> m // Posición de la resultante (sobrecarga sobre el muro despreciada)
e = B/2 - xr -> m // Excentricidad
check abs(e) <= B/6 // Resultante en el tercio central
qmax = SV/B*(1 + 6*abs(e)/B) -> tonf/m^2
qmin = SV/B*(1 - 6*abs(e)/B) -> tonf/m^2
check qmax <= qa // Presión máxima (E.050 Art. 22)
# Estabilidad sísmica
Fi = kh*SV -> tonf/m // Inercia del muro y del suelo sobre los escalones
Mi = kh*(sum(Wg .* yv) + sum(Ws .* yv)) -> tonf*m/m
Mos = Ea*H/3 + DEae*0.6*H + Eqe*H/2 + Mi -> tonf*m/m // Momento de volteo sísmico
FSvs = Mr/Mos
check FSvs >= FSminE050(1) // Volteo, sismo (E.050 39.13.6)
FSds = mu*SV/(Ea + DEae + Eqe + Fi)
check FSds >= FSminE050(1) // Deslizamiento, sismo (E.050 39.13.6)
es = B/2 - (Mr - Mos)/SV -> m
check abs(es) <= B/3 // Excentricidad sísmica (AASHTO 11.6.5.1)
qmaxs = si(abs(es) <= B/6, SV/B*(1 + 6*abs(es)/B), 2*SV/(3*max(B/2 - abs(es), 0.01*B))) -> tonf/m^2
check qmaxs <= qas // Presión máxima con sismo (E.050 Art. 21)`),
    { type: 'gabionwall', anchos: 'bv', h: 'h', Ka: 'Ka', gs: 'gammas', q: 'ws', qmax: 'qmax', qmin: 'qmin', e: 'e' },
    calc(`# Junta entre las hiladas 1 y 2 (estabilidad interna)
"Se verifica el bloque formado por las hiladas 2 a 4 sobre la hilada 1, con el empuje en el plano vertical que pasa por el talón de la hilada 2.
bu = [b2, b3, b4] // Anchos sobre la junta
Hu = 3*h // Altura sobre la junta
yu = h*([1, 2, 3] - 1/2) // Centroides sobre la junta
Wu = sum(gammag*h*bu) + sum(gammas*h*(b2 - bu)) -> tonf/m // Peso sobre la junta
Mru = sum(gammag*h*bu .* bu/2) + sum(gammas*h*(b2 - bu) .* (b2 + bu)/2) -> tonf*m/m
Eu = 0.5*Ka*gammas*Hu^2 + Ka*ws*Hu -> tonf/m
Mou = 0.5*Ka*gammas*Hu^2*Hu/3 + Ka*ws*Hu^2/2 -> tonf*m/m
phig = (25*gammag/(1 tonf/m^3) - 10)*1 deg // Ángulo de fricción entre gaviones φ* (Maccaferri)
FSdu = Wu*tan(phig)/Eu // Deslizamiento en la junta
check FSdu >= FSminE050(0) // Deslizamiento entre hiladas
FSdus = Wu*tan(phig)/(Eu + 0.5*(Kae - Ka)*gammas*Hu^2 + kh*Wu) // Deslizamiento en la junta con sismo
check FSdus >= FSminE050(1) // Deslizamiento entre hiladas, sismo
eu = b2/2 - (Mru - Mou)/Wu -> m
sigu = Wu/b2*(1 + 6*abs(eu)/b2) -> tonf/m^2 // Esfuerzo normal máximo en la junta
sigadm = (50*gammag/(1 tonf/m^3) - 30)*1 tonf/m^2 // Esfuerzo normal admisible en gaviones (Maccaferri)
check sigu <= sigadm // Compresión en la junta`),
    text(`> **Detalles:** malla 10×12 cm, alambre Ø 2.7 mm galvanizado (Zn/Al) con recubrimiento de PVC en ambientes agresivos; piedra de 4" a 8" (≥ 1.5 veces la abertura de la malla); tirantes cada 0.33 m de altura en el paramento; geotextil no tejido entre el relleno y los gaviones; base sobre material granular compactado de 0.20 m.`),
    summary(),
  ],
};

// =====================================================================
//  6) MURO DE SUELO REFORZADO (MSE) — AASHTO LRFD 11.10
// =====================================================================
const mse = {
  id: 'wa-mse', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro de suelo reforzado con geomallas (MSE, AASHTO 11.10)',
  normas: 'AASHTO LRFD 11.10 (MSE), 3.4.1, 3.11; FHWA-NHI-10-024; RNE E.030, E.050',
  desc: 'Estabilidad externa por LRFD (deslizamiento, excentricidad, capacidad portante con Meyerhof y caso sísmico) y estabilidad interna capa por capa: rotura (Tal con factores de reducción) y arranque (F*, α, Le) con vectores.',
  titulo: 'Muro de suelo mecánicamente estabilizado con geomallas H = 6.00 m',
  validacion: {
    fuente: 'Control: AASHTO LRFD 11.10 (estabilidad externa e interna de muros MSE con geomallas)',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Kaf = tan²(45° − 15°) = 1/3 y F1 = ½·Kaf·γf·H² se comprueban a mano.',
    valores: [
      { var: 'Kaf', esperado: 0.33333, tol: 0.0005, desc: 'Ka del relleno retenido, φ = 30°' },
      { var: 'F1', unidad: 'tonf/m', esperado: 11.4, tol: 0.001, desc: 'Empuje del relleno retenido ½Ka·γ·H²' },
      { var: 'Pdrv', unidad: 'tonf/m', esperado: 21.3, tol: 0.002, desc: 'Fuerza horizontal mayorada' },
      { var: 'sigv', unidad: 'tonf/m^2', esperado: 24.48, tol: 0.002, desc: 'Presión vertical de Meyerhof' },
      { var: 'Tal', unidad: 'tonf/m', esperado: 3.89, tol: 0.002, desc: 'Resistencia admisible de la geomalla' },
      { var: 'max(DCr)', esperado: 0.8475, tol: 0.002, desc: 'D/C de rotura de la capa más cargada' },
    ],
  },
  blocks: [
    text(`# Generalidades
Muro de **suelo mecánicamente estabilizado** (MSE) con refuerzo extensible de **geomalla** de HDPE/PET y paramento de bloques prefabricados. Se diseña por **LRFD** según AASHTO LRFD Bridge Design Specifications, art. 11.10 (y FHWA-NHI-10-024):
- **Externa** (11.10.5): el macizo reforzado de ancho $L$ se trata como un muro de gravedad sometido al empuje del relleno retenido: deslizamiento, excentricidad y capacidad portante (presión uniforme de Meyerhof sobre $L-2e$).
- **Interna** (11.10.6): método simplificado; esfuerzo horizontal $\\sigma_H = K_r\\,\\sigma_v$ con $K_r/K_a = 1$ para geosintéticos; tracción máxima $T_{max} = \\sigma_H S_v$; **rotura** con $T_{al} = T_{ult}/RF$ y **arranque** con $P_r = F^*\\alpha\\,\\sigma_v\\,C\\,L_e$ en la zona resistente, más allá de la superficie de Rankine $45° + \\phi_r/2$.
- Factores de carga (Tabla 3.4.1-1/2): $\\gamma_{EV} = 1.35$ (máx.) / $1.00$ (mín.), $\\gamma_{EH} = 1.50$, $\\gamma_{LS} = 1.75$; resistencia (Tabla 11.5.7-1): deslizamiento $\\phi_\\tau = 1.0$, capacidad portante $\\phi_b = 0.65$, rotura de geosintético $\\phi = 0.90$, arranque $\\phi = 0.90$.`),
    calc(`# Datos
H = 6.00 m // Altura del muro [3..12]
L = 4.50 m // Longitud del refuerzo (≥ 0.7H y ≥ 2.4 m) [2.4..10]
Sv = 0.60 m // Separación vertical de las geomallas [0.2..0.8]
nr = 10 // Número de capas [4..20]
zr = Sv*(1:nr) - Sv/2 // Profundidad de cada capa bajo la corona
## Suelos
gammar = 2.00 tonf/m^3 // Relleno reforzado (granular seleccionado) [1.7..2.3]
phir = 34 deg // Fricción del relleno reforzado [30..40]
gammaf = 1.90 tonf/m^3 // Relleno retenido [1.5..2.2]
phif = 30 deg // Fricción del relleno retenido [25..40]
phib = 30 deg // Fricción del suelo de fundación [25..40]
qn = 60 tonf/m^2 // Capacidad portante nominal del suelo de fundación (EMS) [20..150]
ws = 1.20 tonf/m^2 // Sobrecarga viva de tránsito: heq = 0.60 m (AASHTO Tabla 3.11.6.4-2) [0..2]
## Geomalla
Tult = 120 kN/m // Resistencia última a la tracción (ASTM D6637) [20..200]
RFID = 1.10 // Factor de daño de instalación [1.05..3.0]
RFCR = 2.60 // Factor de fluencia (creep), 75 años (HDPE) [1.6..5.0]
RFD = 1.10 // Factor de durabilidad [1.1..2.0]
alphar = alphaAASHTO(3) // Factor de escala α para geomallas (Tabla 11.10.6.3.2-1)
Cr = 2 // Perímetro efectivo (refuerzo en forma de lámina) [1..2]
check L >= max(0.7*H, 2.4 m) // Longitud mínima del refuerzo (11.10.2.1)
# Estabilidad externa (11.10.5)
Kaf = KaRankine(phif) // Empuje del relleno retenido (δ = β = 0)
F1 = 0.5*Kaf*gammaf*H^2 -> tonf/m // Empuje del suelo (EH), a H/3
F2 = Kaf*ws*H -> tonf/m // Empuje de la sobrecarga (LS), a H/2
V1 = gammar*H*L -> tonf/m // Peso del macizo reforzado (EV)
## Deslizamiento (Resistencia I: EV mín. 1.00; EH 1.50; LS 1.75)
mub = tan(min(phir, phif, phib)) // Fricción en la base: el menor de los ángulos (11.10.5.3)
Rt = 1.0*mub*1.00*V1 -> tonf/m // φτ = 1.0
Pdrv = 1.50*F1 + 1.75*F2 -> tonf/m
check Pdrv <= Rt // Deslizamiento (11.10.5.3)
## Excentricidad (Resistencia I)
eb = (1.50*F1*H/3 + 1.75*F2*H/2)/(1.00*V1) -> m
check eb <= L/3 // Resultante dentro de los 2/3 centrales en suelo (11.6.3.3)
## Capacidad portante (Resistencia I: EV 1.35, LS sobre el macizo 1.75)
Vb = 1.35*V1 + 1.75*ws*L -> tonf/m
Mb = 1.50*F1*H/3 + 1.75*F2*H/2 -> tonf*m/m
ebb = Mb/Vb -> m
sigv = Vb/max(L - 2*ebb, 0.01*L) -> tonf/m^2 // Presión uniforme de Meyerhof (11.6.3.2)
qR = 0.65*qn // φb = 0.65 (Tabla 11.5.7-1)
check sigv <= qR // Capacidad portante
${SISMO}
## Sismo (Evento Extremo I, 11.10.7.1)
PIR = 0.5*kh*gammar*H^2 -> tonf/m // Inercia del macizo de ancho 0.5H (11.10.7.1)
PAE = 0.375*kh*gammaf*H^2 -> tonf/m // Incremento dinámico del relleno retenido (Seed–Whitman)
Pdrve = F1 + 0.5*F2 + max(PIR + 0.5*PAE, 0.5*PIR + PAE) -> tonf/m // Envolvente de PIR + 50 % PAE (11.10.7.1) y PAE + 50 % PIR (11.6.5.1); γEQ = 0.5 para LS
Rte = mub*V1 -> tonf/m // φ = 1.0 en Evento Extremo (11.5.8)
check Pdrve <= Rte // Deslizamiento sísmico
MoEs = F1*H/3 + 0.5*F2*H/2 -> tonf*m/m // Momento de vuelco de los empujes estáticos (EH a H/3, LS al 50 % a H/2)
MoEq = max(PIR*H/2 + 0.5*PAE*0.6*H, 0.5*PIR*H/2 + PAE*0.6*H) -> tonf*m/m // Momento sísmico: envolvente de PIR + 0.5 PAE y 0.5 PIR + PAE (PIR a H/2, PAE a 0.6H)
ebe = (MoEs + MoEq)/V1 -> m // Excentricidad con sismo (envolvente de ambas combinaciones)
check ebe <= 0.4*L // Excentricidad sísmica: 8/10 centrales (11.6.5.1)
# Estabilidad interna (11.10.6)
Kar = KaRankine(phir) // Ka del relleno reforzado
KrKa = KrKaAASHTO(0 m, 3) // Kr/Ka = 1 para geosintéticos (Fig. 11.10.6.2.1-3)
Kr = KrKa*Kar
zn = zr[nr] // Profundidad de la capa inferior (la más cargada)
sigHn = Kr*(1.35*gammar*zn + 1.75*ws) -> tonf/m^2 // Esfuerzo horizontal mayorado en la capa inferior (11.10.6.2.1-1)
Tmaxn = sigHn*Sv -> tonf/m // Tracción máxima en la capa inferior (11.10.6.2.1-2, Rc = 1)
"Las mismas expresiones se aplican a cada capa $i$ con su profundidad $z_i$; los valores de todas las capas ($\\sigma_H$, $T_{max}$, $L_a$, $L_e$, $P_r$ y las relaciones D/C) se resumen en la tabla de estabilidad interna.
@ocultar
sigH = Kr*(1.35*gammar*zr + 1.75*ws) // Esfuerzo horizontal mayorado en cada capa (11.10.6.2.1-1)
Tmax = sigH*Sv -> tonf/m // Tracción máxima por metro de muro (11.10.6.2.1-2, Rc = 1)
@mostrar
## Rotura del refuerzo (11.10.6.4)
Tal = Tult/(RFID*RFCR*RFD) -> tonf/m // Resistencia de diseño a largo plazo
DCr = Tmax/(0.90*Tal) // Demanda/capacidad por capa
check max(DCr) <= 1 // Rotura de la geomalla (capa más cargada)
## Arranque (11.10.6.3)
La = (H - zr)*tan(45 deg - phir/2) // Longitud en la zona activa (superficie de Rankine)
Le = (L - La + 0.01 m + abs(L - La - 0.01 m))/2 // Longitud de anclaje en la zona resistente, max(L − La, 0.01 m) capa a capa
check min(Le) >= 0.90 m // Longitud de anclaje mínima (11.10.6.3.2)
Fst = FstarAASHTO(0 m, phir, 3) // F* = 0.67 tan φr para geosintéticos
Pr1 = Fst*alphar*gammar*zr[1]*Cr*Le[1] -> tonf/m // Resistencia al arranque de la capa superior (sin sobrecarga viva; demás capas en la tabla)
@ocultar
Pr = Fst*alphar*gammar*zr*Cr .* Le -> tonf/m // Resistencia al arranque (sin sobrecarga viva)
@mostrar
DCp = Tmax ./ (0.90*Pr) // Demanda/capacidad por capa
check max(DCp) <= 1 // Arranque de la geomalla (capa crítica)`),
    { type: 'table', columnas: 'Capa = 1:nr\nz [m] = zr\nσH [t/m²] = sigH\nTmax [t/m] = Tmax\nD/C rotura = DCr\nLa [m] = La\nLe [m] = Le\nPr [t/m] = Pr\nD/C arranque = DCp', titulo: 'Estabilidad interna por capa (rotura y arranque)', dec: '2' },
    { type: 'msewall', H: 'H', L: 'L', z: 'zr', phi: 'phir', tipo: 'extensible', q: 'ws', dc: '(DCr + DCp + abs(DCr - DCp))/2' },
    summary(),
  ],
};

// =====================================================================
//  7) TABLESTACA EN VOLADIZO (BLUM)
// =====================================================================
const PERFILES = '[973 cm^3/m : PZ 22|1623 cm^3/m : PZ 27|1300 cm^3/m : AZ 13-770|1800 cm^3/m : AZ 18-700|2600 cm^3/m : AZ 26-700]';
const tablestaca = {
  id: 'wa-tablestaca', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Tablestaca / muro pantalla en voladizo (Blum)',
  normas: 'Blum (1931); USS Steel Sheet Piling Design Manual; Das cap. 9; Bowles §13; RNE E.050',
  desc: 'Profundidad de empotramiento por el método simplificado de Blum (ΣM = 0 en el punto de giro, D = 1.2 D0), punto de cortante nulo, momento máximo y módulo resistente de la tablestaca, con verificación numérica.',
  titulo: 'Tablestaca metálica en voladizo — excavación de 4.00 m',
  validacion: {
    fuente: 'Control: método de Blum para tablestaca en voladizo en arena (Das cap. 9; USS Steel Sheet Piling Design Manual)',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). El bloque sheetpile comprueba Mmax con la solución cerrada (tests/walls.test.mjs).',
    valores: [
      { var: 'Ka', esperado: 0.30726, tol: 0.0005, desc: 'Ka de Rankine, φ = 32°' },
      { var: 'D0', unidad: 'm', esperado: 4.925, tol: 0.002, desc: 'Empotramiento teórico de Blum' },
      { var: 'D', unidad: 'm', esperado: 6, tol: 0.0001, desc: 'Empotramiento adoptado 1.2·D0 redondeado' },
      { var: 'Mmax', unidad: 'tonf*m/m', esperado: 21.81, tol: 0.002, desc: 'Momento máximo' },
      { var: 'Sreq', unidad: 'cm^3/m', esperado: 954.7, tol: 0.002, desc: 'Módulo resistente requerido' },
    ],
  },
  blocks: [
    text(`# Generalidades
Tablestaca (o muro pantalla) **en voladizo** que sostiene una excavación de altura $H$ en arena seca. Por debajo del fondo la pared gira alrededor de un punto $O$ a la profundidad $D_0$: sobre ella actúan el empuje activo detrás (en toda la altura $H + D_0$) y el pasivo delante; bajo $O$ se desarrolla una contrafuerza $R$ que **Blum** concentra en $O$. Equilibrio de momentos respecto a $O$:
$$\\tfrac16 K_{pd}\\,\\gamma D_0^3 = \\tfrac16 K_a\\gamma (H+D_0)^3 + \\tfrac12 K_a q (H+D_0)^2$$
y para desarrollar $R$ se prolonga la tablestaca: $D = 1.2\\,D_0$ (Blum; USS *Steel Sheet Piling Design Manual*). El coeficiente pasivo se reduce con un factor de seguridad $FS_p = 1.5$ (USS: 1.5–2.0). Sin nivel freático (para agua, usar pesos sumergidos y la presión neta del agua).`),
    calc(`# Datos
H = 4.00 m // Altura libre de la excavación [2..6]
gammas = 1.80 tonf/m^3 // Peso unitario de la arena [1.5..2.2]
phis = 32 deg // Ángulo de fricción [20..40]
ws = 1.00 tonf/m^2 // Sobrecarga en el borde de la excavación (E.020) [0..2]
FSp = 1.50 // Factor de seguridad sobre el empuje pasivo (USS 1.5–2.0) [1.5..2.0]
fys = 3515 kgf/cm^2 // Acero de la tablestaca ASTM A572 Gr 50 [2530..4570]
Sx = 1300 cm^3/m // Módulo resistente del perfil (catálogo) ${PERFILES}
# Coeficientes
Ka = KaRankine(phis) // Activo (δ = 0, conservador)
Kp = KpRankine(phis) // Pasivo (δ = 0)
Kpd = Kp/FSp // Pasivo de diseño
# Empotramiento (Blum)
D0 = D0Blum(H, gammas, Ka, Kpd, ws) // Profundidad del punto de giro (ΣMO = 0)
D = roundup(1.2*D0, 0.25 m) // Empotramiento de diseño (+20 % para la contrafuerza)
Lt = H + D // Longitud total de la tablestaca
R = Kpd*gammas*D0^2/2 - Ka*gammas*(H + D0)^2/2 - Ka*ws*(H + D0) -> tonf/m // Contrafuerza en O
check R >= 0 tonf/m // La contrafuerza resulta positiva (equilibrio de fuerzas posible)
# Momento máximo
"El momento máximo ocurre donde el cortante es nulo, a la profundidad $z_0$ bajo el fondo: $\\tfrac12(K_{pd} - K_a)\\gamma z^2 - (K_a\\gamma H + K_a q)\\,z - \\left(\\tfrac12 K_a\\gamma H^2 + K_a q H\\right) = 0$.
aq = (Kpd - Ka)*gammas/2
bq = -(Ka*gammas*H + Ka*ws)
cq = -(Ka*gammas*H^2/2 + Ka*ws*H)
z0 = (-bq + sqrt(bq^2 - 4*aq*cq))/(2*aq) // Profundidad del cortante nulo bajo el fondo
Mmax = Ka*gammas*(H + z0)^3/6 + Ka*ws*(H + z0)^2/2 - Kpd*gammas*z0^3/6 -> tonf*m/m // Momento máximo (servicio)`),
    { type: 'sheetpile', H: 'H', D: 'D0', Dt: 'D', gs: 'gammas', Ka: 'Ka', Kp: 'Kpd', q: 'ws' },
    calc(`# Verificación de la tablestaca
check abs(Mmaxn - Mmax) <= 0.02*Mmax // Comprobación: integración numérica del bloque = solución cerrada
sigadm = 0.65*fys // Esfuerzo admisible en flexión (USS Steel Sheet Piling Design Manual)
Sreq = Mmax/sigadm -> cm^3/m // Módulo resistente requerido
check Sreq <= Sx // Módulo resistente del perfil elegido
"Longitud total de la tablestaca: {Lt} (empotramiento {D}). Verificar además la hinca (SPT/rechazo), la corrosión (sobreespesor o protección) y la deflexión en la corona.`),
    summary(),
  ],
};

// =====================================================================
//  8) TABLESTACA ANCLADA (APOYO LIBRE)
// =====================================================================
const anclada = {
  id: 'wa-tablestaca-anclada', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Tablestaca anclada (método del apoyo libre)',
  normas: 'USS Steel Sheet Piling Design Manual; Das cap. 9; Bowles §13; AISC 360 (tirante y viga de reparto)',
  desc: 'Empotramiento por el método del apoyo libre (free earth support), fuerza en el anclaje, momento máximo, tablestaca, tirante, viga de reparto y ubicación del muerto de anclaje fuera de la cuña activa.',
  titulo: 'Tablestaca anclada — excavación de 6.00 m',
  validacion: {
    fuente: 'Control: método de apoyo libre (free earth support) y muerto de anclaje (Das cap. 9)',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). La fuerza del anclaje y el momento se comprueban por integración numérica dentro de la propia memoria.',
    valores: [
      { var: 'D', unidad: 'm', esperado: 2.942, tol: 0.002, desc: 'Empotramiento teórico (apoyo libre)' },
      { var: 'Ta', unidad: 'tonf/m', esperado: 7.959, tol: 0.002, desc: 'Fuerza en el anclaje por metro' },
      { var: 'Mmax', unidad: 'tonf*m/m', esperado: 14.92, tol: 0.002, desc: 'Momento máximo' },
      { var: 'Sreq', unidad: 'cm^3/m', esperado: 653, tol: 0.002, desc: 'Módulo resistente requerido' },
      { var: 'FSdm', esperado: 2.083, tol: 0.002, desc: 'FS del muerto de anclaje' },
    ],
  },
  blocks: [
    text(`# Generalidades
Con un nivel de anclaje (tirante y muerto, o ancla inyectada) cerca de la corona, la tablestaca se comporta como una viga apoyada en el anclaje y en el suelo pasivo. En el **método del apoyo libre** (*free earth support*) la punta puede rotar; la profundidad $D$ se obtiene con $\\Sigma M = 0$ respecto al anclaje:
$$\\tfrac12 K_{pd}\\gamma D^2\\left(H + \\tfrac23 D - a\\right) = \\tfrac12 K_a\\gamma (H+D)^2\\left[\\tfrac23(H+D) - a\\right] + K_a q (H+D)\\left[\\tfrac12(H+D) - a\\right]$$
y la fuerza del anclaje con $\\Sigma F_h = 0$. Se aplica $FS_p = 1.5$ al pasivo (USS). No se aplica la reducción de momentos de Rowe (conservador).`),
    calc(`# Datos
H = 6.00 m // Altura libre de la excavación [4..10]
a = 1.20 m // Profundidad del anclaje bajo la corona [0.5..2.0]
sa = 2.40 m // Separación horizontal de los tirantes [1.5..4.0]
gammas = 1.80 tonf/m^3 // Peso unitario de la arena [1.5..2.2]
phis = 32 deg // Ángulo de fricción [20..40]
ws = 1.00 tonf/m^2 // Sobrecarga [0..2]
FSp = 1.50 // Factor de seguridad del pasivo [1.5..2.0]
fys = 3515 kgf/cm^2 // Tablestaca ASTM A572 Gr 50 [2530..4570]
Sx = 1300 cm^3/m // Módulo resistente del perfil ${PERFILES}
fyt = 4200 kgf/cm^2 // Tirante: barra ASTM A615 Gr 60 [2800..4200]
bart = 11 // Barra del tirante [8 : 1"|9 : 1 1/8"|10 : 1 1/4"|11 : 1 3/8"|14 : 1 3/4"]
hd = 2.50 m // Altura del muerto de anclaje (bloque continuo de concreto desde la superficie) [1..4]
# Empotramiento y fuerza en el anclaje
Ka = KaRankine(phis)
Kp = KpRankine(phis)
Kpd = Kp/FSp
D = DFreeEarth(H, a, gammas, Ka, Kpd, ws) // ΣM respecto al anclaje = 0
Dd = roundup(D, 0.25 m) // Empotramiento colocado
Ta = Ka*gammas*(H + D)^2/2 + Ka*ws*(H + D) - Kpd*gammas*D^2/2 -> tonf/m // Fuerza del anclaje por metro (ΣFh = 0)
check Ta >= 0 tonf/m // Anclaje en tracción
# Momento máximo (cortante nulo sobre el fondo)
zq = (-Ka*ws + sqrt((Ka*ws)^2 + 2*Ka*gammas*Ta))/(Ka*gammas) // Profundidad bajo la corona donde V = 0
check zq <= H // El cortante nulo está sobre el fondo (hipótesis de la fórmula)
Mmax = Ta*(zq - a) - Ka*gammas*zq^3/6 - Ka*ws*zq^2/2 -> tonf*m/m // Momento máximo`),
    { type: 'sheetpile', H: 'H', D: 'D', Dt: 'Dd', a: 'a', gs: 'gammas', Ka: 'Ka', Kp: 'Kpd', q: 'ws' },
    calc(`# Verificaciones
check abs(Tn - Ta) <= 0.02*Ta // Comprobación numérica de la fuerza del anclaje
check abs(Mmaxn - Mmax) <= 0.02*Mmax // Comprobación numérica del momento máximo
sigadm = 0.65*fys // Esfuerzo admisible en flexión (USS)
Sreq = Mmax/sigadm -> cm^3/m
check Sreq <= Sx // Módulo resistente del perfil
## Tirante
Tt = Ta*sa -> tonf // Fuerza por tirante
Treq = Tt/(0.60*fyt) -> cm^2 // Área requerida, esfuerzo admisible 0.60 fy
check Treq <= Ab(bart) // Área de la barra del tirante
## Viga de reparto (2 canales C10×15.3, S = 2 × 221 cm³)
Mw = Ta*sa^2/10 -> tonf*m // Momento en la viga continua de reparto (USS)
Sw = 2*221 cm^3
check Mw/(0.60*2530 kgf/cm^2) <= Sw // Viga de reparto ASTM A36, 0.60 fy
## Ubicación del muerto de anclaje
Lmin = (H + Dd)*tan(45 deg - phis/2) + hd*tan(45 deg + phis/2) // Fuera de la cuña activa desde la punta y de la cuña pasiva del muerto (Das 9.13)
La = roundup(Lmin, 0.5 m) // Distancia colocada desde la tablestaca
Pdm = 0.5*gammas*hd^2*(Kp - Ka) -> tonf/m // Capacidad del muerto continuo (Das 9.13)
FSdm = Pdm*sa/Tt // Factor de seguridad del muerto (por tirante, muerto continuo)
check FSdm >= 2.0 // Capacidad del muerto de anclaje (Das 9.13: FS ≥ 2)
"Tirante Ø según lista @ {sa}, a {La} de la tablestaca; longitud total de la tablestaca {H + Dd}.`),
    summary(),
  ],
};

export default [voladizo, gravedad, contrafuertes, sotano, gaviones, mse, tablestaca, anclada, comparativo];
