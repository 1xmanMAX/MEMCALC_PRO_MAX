// =====================================================================
//  Plantillas — módulo «chile»
//  Sistema de unidades: técnico (tonf, m, cm, kgf/m²) como es habitual en la
//  práctica chilena; los materiales de hormigón/acero se dan en MPa (NCh170, NCh204, DS60).
// =====================================================================
import { calc, text, summary } from './_h.js';

const ST = { sys: 'tec', dec: 3 };

export default [
  // ===================================================================
  // 1) NCh433 + DS61 — análisis estático
  // ===================================================================
  {
    id: 'cl-nch433-estatico', pais: 'CL', cat: 'Sismo — Chile', icon: 'quake', settings: ST,
    name: 'Análisis sísmico estático NCh433 + DS61',
    normas: 'NCh433.Of1996 Mod.2009 · D.S. N° 61 (V. y U.) 2011 · NCh1537.Of2009 · NCh3171',
    desc: 'Edificio de muros de H.A. de 5 pisos: peso sísmico con % de sobrecarga, C con Cmín/Cmáx (Tabla 6.4 y factor f), Qo = C·I·P, distribución Ak, torsión accidental y deformaciones (0.002 h en CM, 0.001 h adicional).',
    titulo: 'Análisis sísmico estático — NCh433.Of1996 Mod.2009 + DS61',
    blocks: [
      text(`# Generalidades
**Proyecto:** edificio habitacional de 5 pisos estructurado con **muros de hormigón armado** en ambas direcciones, losas macizas que actúan como diafragma rígido. Ubicación: Viña del Mar, V Región (**zona sísmica 3**). Suelo de fundación: grava arenosa densa, $\\bar V_{s30} = 420$ m/s según estudio de mecánica de suelos → **suelo tipo C** (DS61 Tabla 4.2).

**Normas:** NCh433.Of1996 Modificada 2009 *Diseño sísmico de edificios* con las disposiciones del **Decreto Supremo N° 61 (V. y U.) de 2011** (clasificación de suelos por $V_{s30}$, parámetros $S$, $T_o$, $T'$, $n$, $p$ de la Tabla 6.3); NCh1537.Of2009 (cargas permanentes y sobrecargas de uso); NCh3171 (combinaciones de carga, sismo mayorado por 1,4).

**Método:** análisis estático (NCh433 6.2), aplicable porque el edificio no supera 5 pisos ni 20 m de altura (6.2.1 b). Las solicitaciones sísmicas están en nivel de diseño (reducidas por $R$) y las deformaciones se verifican con esas mismas fuerzas (5.9).

> **Vigencia.** La NCh433.Of1996 Mod.2009 + DS61 rige **hasta la entrada en vigencia de la NCh433:2026**. Esa norma fue oficializada por el D.Ex. N° 28 MINVU (D.O. 10-08-2026) y entra en vigencia seis meses después, alrededor del 10-02-2027. Para proyectos que se presenten desde esa fecha, use la plantilla «Análisis sísmico NCh433:2026 (vigente desde 2027)».`),
      calc(`# Parámetros sísmicos
zona = 3 // Zona sísmica según la comuna (NCh433 4.1, Tabla 4.1) [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433(zona) // Aceleración efectiva máxima Ao/g (Tabla 6.2)
suelo = 3 // Tipo de suelo de fundación (DS61 Tabla 4.2) [1 : A — roca, suelo cementado (Vs30 ≥ 900 m/s)|2 : B — roca blanda o suelo muy denso (Vs30 ≥ 500 m/s)|3 : C — suelo denso o firme (Vs30 ≥ 350 m/s)|4 : D — suelo medianamente denso (Vs30 ≥ 180 m/s)|5 : E — suelo de compacidad media (Vs30 < 180 m/s)]
S = SNCh433(suelo) // Factor de amplificación del suelo (DS61 Tabla 6.3)
Tp = TpNCh433(suelo) // Periodo T' del suelo (Tabla 6.3)
n = nNCh433(suelo) // Exponente n (Tabla 6.3)
uso = 2 // Categoría de ocupación (NCh433 Tabla 4.3) [1 : I — bajo riesgo|2 : II — habitación, oficinas|3 : III — aglomeración de personas|4 : IV — esenciales]
I = INCh433(uso) // Coeficiente de importancia (Tabla 6.1)
R = 7 // Factor de modificación de la respuesta (Tabla 5.1) [7 : Muros o pórticos de H.A. · acero SMF|6 : H.A. y albañilería (criterio A) · acero EBF o STMF|5.5 : Madera · acero SCBF|5 : Acero, marcos intermedios (IMF)|4 : Albañilería confinada o armada llena · acero OMF|3 : Albañilería armada sin llenar · acero OCBF|2 : Otros sistemas]
## Geometría y peso sísmico
N = 5 // Número de pisos sobre el nivel basal
hp = 2.6 m // Altura de entrepiso
H = N*hp // Altura total del edificio sobre el nivel basal
check N <= 5 // Método estático: no más de 5 pisos (6.2.1 b)
check H <= 20 m // Método estático: altura no mayor que 20 m (6.2.1 b)
Ap = 320 m^2 // Área de la planta tipo
qD = 0.95 tonf/m^2 // Carga permanente: losa, muros, terminaciones y tabiques (NCh1537)
qL = 0.20 tonf/m^2 // Sobrecarga de uso, vivienda 2,0 kPa (NCh1537 Tabla 4)
qDt = 0.75 tonf/m^2 // Carga permanente del nivel de techo
psc = 0.25 // Fracción de la sobrecarga en la masa sísmica (5.5.1) [0.25 : Sin aglomeración usual de personas|0.50 : Con aglomeración usual de personas]
Pp = Ap*(qD + psc*qL) // Peso sísmico de un piso tipo
Pt = Ap*qDt // Peso sísmico del techo (sobrecarga de techo nula, 6.2.3.3)
Pk = concat(Pp*ones(N - 1), [Pt]) // Peso sísmico por nivel (1 → N; techo en el nivel N)
Zk = hp*(1:N) // Altura de cada nivel sobre el nivel basal
P = sum(Pk) // Peso total sobre el nivel basal (6.2.3.3)
## Periodos fundamentales
Tx = 0.32 s // Periodo del modo con mayor masa traslacional en X, T*x (modelo 3D, 6.2.4)
Ty = 0.26 s // Periodo del modo con mayor masa traslacional en Y, T*y
# Coeficiente sísmico y esfuerzo de corte basal
Cx = CNCh433(Tx, S, Tp, n, Ao, R) // Coeficiente sísmico en X (ec. 6-2)
Cy = CNCh433(Ty, S, Tp, n, Ao, R) // Coeficiente sísmico en Y (ec. 6-2)
Cmin = CminNCh433(S, Ao) // Valor mínimo Ao·S/(6g) (6.2.3.1.1)
q = 1.0 // Menor fracción del corte de piso tomada por muros de H.A. en la mitad inferior del edificio, del modelo (6.2.3.1.3)
f = fNCh433(q) // Factor de reducción de Cmáx para edificios de muros (ec. 6-3)
Cmax = f*CmaxNCh433(R, S, Ao) // Valor máximo (Tabla 6.4 × f)
Cdx = min(max(Cx, Cmin), Cmax) // Coeficiente sísmico de diseño en X
Cdy = min(max(Cy, Cmin), Cmax) // Coeficiente sísmico de diseño en Y
check Cdx >= Cmin // C no menor que Ao·S/(6g) en X (6.2.3.1.1)
check Cdy >= Cmin // C no menor que Ao·S/(6g) en Y (6.2.3.1.1)
Qox = Cdx*I*P // Esfuerzo de corte basal en X (ec. 6-1)
Qoy = Cdy*I*P // Esfuerzo de corte basal en Y (ec. 6-1)
"Con los datos por defecto $C > C_{máx}$ en ambas direcciones: el diseño queda controlado por el coeficiente sísmico máximo (Tabla 6.4 × f), situación usual en edificios chilenos de muros de periodo corto. El factor $f$ de 6.2.3.1.3 solo es aplicable si el edificio está estructurado con muros de H.A. (o muros de H.A. con pórticos y albañilería confinada) y $q$ es el menor cociente entre el corte tomado por los muros de H.A. y el corte total en los pisos de la mitad inferior; si no se justifica $q$, use $q = 0{,}5$ ($f = 1$).
# Distribución de las fuerzas en altura
Ak = AkNCh433(Zk) // Factores Ak (ec. 6-5)
Fkx = Ak .* Pk / sum(Ak .* Pk) * Qox // Fuerza horizontal en cada nivel, sismo X (ec. 6-4)
Fky = Ak .* Pk / sum(Ak .* Pk) * Qoy // Fuerza horizontal en cada nivel, sismo Y (ec. 6-4)
Vkx = Qox - cumsum(Fkx) + Fkx // Esfuerzo de corte de entrepiso, sismo X
Vky = Qoy - cumsum(Fky) + Fky // Esfuerzo de corte de entrepiso, sismo Y
## Torsión accidental (6.2.8)
bkx = 16 m // Dimensión de la planta en X (para sismo Y)
bky = 20 m // Dimensión de la planta en Y (para sismo X)
ekx = 0.10*bky*Zk/H // Excentricidad accidental para el sismo según X (6.2.8)
eky = 0.10*bkx*Zk/H // Excentricidad accidental para el sismo según Y (6.2.8)
Mtx = Fkx .* ekx // Momento de torsión accidental por nivel, sismo X (mismo signo en todos los niveles)
Mty = Fky .* eky // Momento de torsión accidental por nivel, sismo Y`),
      { type: 'table', columnas: 'Nivel = 1:N\n$Z_k$ [m] = Zk\n$P_k$ [tonf] = Pk\n$A_k$ = Ak\n$F_{kx}$ [tonf] = Fkx\n$V_{kx}$ [tonf] = Vkx\n$M_{tx}$ [tonf·m] = Mtx\n$F_{ky}$ [tonf] = Fky\n$V_{ky}$ [tonf] = Vky', dec: '3', total: false, titulo: 'Distribución de las fuerzas sísmicas en altura y torsión accidental (NCh433 6.2.5 y 6.2.8)' },
      { type: 'fuerzasCL', Z: 'Zk', F: 'Fkx', V: 'Vkx', u: 'tonf', titulo: 'Fuerzas sísmicas estáticas y corte de entrepiso, sismo según X' },
      { type: 'plot', expr: 'CNCh433(x s, S, Tp, n, Ao, R); Cmax + 0*x; Cmin + 0*x; min(max(CNCh433(x s, S, Tp, n, Ao, R), Cmin), Cmax)', var: 'x', desde: '0.2', hasta: '2', puntos: '300', xlabel: 'Periodo T* [s]', ylabel: 'C', leyenda: true, nombres: "C = 2.75·S·Ao/(gR)·(T'/T*)^n; Cmáx (Tabla 6.4 × f); Cmín = Ao·S/(6g); C de diseño", titulo: 'Coeficiente sísmico en función del periodo (NCh433 6.2.3.1)' },
      calc(`# Deformaciones sísmicas (5.9)
"Desplazamientos relativos de entrepiso obtenidos del modelo con las fuerzas estáticas de diseño, **incluyendo la torsión accidental** (5.9.1).
dcmx = [0.08, 0.11, 0.12, 0.12, 0.11] cm // Desplazamiento relativo de entrepiso en el centro de masas, sismo X
dpx = [0.11, 0.15, 0.16, 0.16, 0.15] cm // Desplazamiento relativo máximo en cualquier punto de la planta, sismo X
dcmy = [0.06, 0.08, 0.09, 0.09, 0.08] cm // Desplazamiento relativo en el centro de masas, sismo Y
dpy = [0.09, 0.12, 0.13, 0.13, 0.12] cm // Desplazamiento relativo máximo en cualquier punto, sismo Y
derx = dcmx/hp // Deriva en el centro de masas, X
dery = dcmy/hp // Deriva en el centro de masas, Y
check max(derx) <= 0.002 // Deriva en el CM, sismo X (5.9.2)
check max(dery) <= 0.002 // Deriva en el CM, sismo Y (5.9.2)
check max((dpx - dcmx)/hp) <= 0.001 // Exceso de deriva en cualquier punto respecto del CM, sismo X (5.9.3)
check max((dpy - dcmy)/hp) <= 0.001 // Exceso de deriva en cualquier punto respecto del CM, sismo Y (5.9.3)`),
      { type: 'table', columnas: 'Piso = 1:N\n$\\delta_{CM,x}$ [cm] = dcmx\nDeriva CM X = derx\n$(\\delta_{máx}-\\delta_{CM})/h$ X = (dpx - dcmx)/hp\n$\\delta_{CM,y}$ [cm] = dcmy\nDeriva CM Y = dery\n$(\\delta_{máx}-\\delta_{CM})/h$ Y = (dpy - dcmy)/hp', dec: '5', titulo: 'Control de deformaciones de entrepiso (NCh433 5.9.2 y 5.9.3)' },
      text(`> **Notas.** (1) Los elementos se diseñan con las combinaciones de NCh3171 usando $1{,}4E$ (DS60 9.1.4). (2) Si la torsión accidental produce variaciones de desplazamientos ≤ 20 % puede despreciarse en el diseño (6.1.2). (3) Para edificios de H.A. el desplazamiento de diseño en el techo para muros (DS60) es $\\delta_u = 1{,}3\\,S_{de}(T_{ag})$ (5.9.5), ver la plantilla de muros.`),
      summary(),
    ],
  },
  // ===================================================================
  // 2) NCh433 + DS61 — espectro de diseño y análisis modal espectral
  // ===================================================================
  {
    id: 'cl-nch433-modal', pais: 'CL', cat: 'Sismo — Chile', icon: 'spectrum', settings: ST,
    name: 'Espectro NCh433 + DS61 y análisis modal espectral',
    normas: 'NCh433.Of1996 Mod.2009 · D.S. N° 61 (V. y U.) 2011',
    desc: 'Espectro Sa = S·Ao·α/(R*/I) con R* según T*, análisis modal de un modelo de cortante, combinación CQC, corte basal mínimo ISAoP/6g y máximo I·Cmáx·P con factores de escala, y derivas.',
    titulo: 'Espectro de diseño y análisis modal espectral — NCh433 + DS61',
    blocks: [
      text(`# Generalidades
Edificio de oficinas de 6 pisos de hormigón armado en Santiago (**zona sísmica 2**), estructurado con muros y marcos, fundado sobre la grava de Santiago (**suelo tipo B**, $V_{s30} \\ge 500$ m/s). Se aplica el **análisis modal espectral** de NCh433 6.3 con el espectro de diseño modificado por el DS61. El modelo es un **edificio de cortante** por dirección (diafragmas rígidos, masas concentradas en los pisos) con las rigideces laterales de entrepiso obtenidas del modelo tridimensional; en el modelo 3D completo la torsión accidental se incluye desplazando los centros de masas $\\pm 0{,}05\\,b_k$ (6.3.4 a).

> **Vigencia.** La NCh433.Of1996 Mod.2009 + DS61 rige **hasta la entrada en vigencia de la NCh433:2026**. Esa norma fue oficializada por el D.Ex. N° 28 MINVU (D.O. 10-08-2026) y entra en vigencia seis meses después, alrededor del 10-02-2027. Para proyectos que se presenten desde esa fecha, use la plantilla «Análisis sísmico NCh433:2026 (vigente desde 2027)».`),
      calc(`# Parámetros del espectro de diseño
zona = 2 // Zona sísmica (NCh433 4.1) [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433(zona) // Ao/g (Tabla 6.2)
suelo = 2 // Tipo de suelo (DS61 Tabla 4.2) [1 : A|2 : B|3 : C|4 : D|5 : E]
S = SNCh433(suelo) // Parámetro S (DS61 Tabla 6.3)
To = ToNCh433(suelo) // Periodo To (Tabla 6.3)
p = pNCh433(suelo) // Exponente p (Tabla 6.3)
uso = 2 // Categoría de ocupación (Tabla 4.3) [1 : I|2 : II|3 : III|4 : IV]
I = INCh433(uso) // Coeficiente de importancia (Tabla 6.1)
Ro = 11 // Factor Ro para el espectro (Tabla 5.1) [11 : Muros o pórticos de H.A. · acero SMF|10 : Acero EBF o STMF|9 : H.A. y albañilería (criterio A)|8 : Acero SCBF|7 : Madera|6 : Acero IMF|5 : Acero OMF u OCBF|4 : Albañilería confinada o armada llena|3 : Albañilería armada sin llenar]
R = 7 // Factor R asociado, para Cmáx (Tabla 5.1)
# Análisis modal
Pk = [380, 380, 380, 380, 380, 300] tonf // Peso sísmico por nivel, D + 25 % SC (5.5.1)
kx = [60000, 56000, 52000, 46000, 38000, 28000] tonf/m // Rigidez lateral de entrepiso, dirección X (modelo)
hp = 2.6 m // Altura de entrepiso
P = sum(Pk) // Peso sísmico total
Tn = TmodosCL(Pk, kx) // Periodos de vibrar (ordenados de mayor a menor)
Mn = MeffModosCL(Pk, kx) // Masa equivalente de cada modo / masa total (ec. 6-6)
check sum(Mn) >= 0.90 // Suma de masas equivalentes ≥ 90 % (6.3.3)
Ts = Tn[1] // T*: periodo del modo con mayor masa traslacional en X
Rs = RstarNCh433(Ts, To, Ro) // Factor de reducción R* (ec. 6-10)
alfa = alphaNCh433(Tn, To, p) // Factor de amplificación de cada modo (ec. 6-9)
Sa = SaNCh433(Tn, S, To, p, Ao, Rs, I) // Pseudo-aceleración de diseño Sa/g de cada modo (ec. 6-8)
## Fuerzas y cortes modales
Fm = FmodalCL(Pk, kx, Sa) // Fuerzas modales Fin = Γn·φin·Pi·San (niveles × modos)
Vm = cortesCL(Fm) // Cortes de entrepiso por modo
V = cqcNCh433(Vm, Tn) // Superposición CQC, ξ = 0.05 (ec. 6-13 y 6-14)
Qo = V[1] // Esfuerzo de corte basal del análisis modal
# Limitaciones del esfuerzo de corte basal (6.3.7)
Qmin = I*S*Ao*P/6 // Corte basal mínimo I·S·Ao·P/(6g) (6.3.7.1)
Cmax = CmaxNCh433(R, S, Ao) // Cmáx (Tabla 6.4)
Qmax = I*Cmax*P // Corte basal que no es necesario exceder (6.3.7.2); sin el factor f de 6.2.3.1.3 (edificio mixto muros-marcos, criterio conservador)
fs = si(Qo < Qmin, Qmin/Qo, 1) // Factor de amplificación de esfuerzos y desplazamientos (6.3.7.1)
fr = si(Qo > Qmax, Qmax/Qo, 1) // Factor de reducción opcional de esfuerzos, no de desplazamientos (6.3.7.2)
Vd = fs*fr*V // Cortes de entrepiso de diseño
check fs*fr*Qo >= Qmin // Corte basal de diseño ≥ mínimo (6.3.7.1)
check fs*fr*Qo <= Qmax // Corte basal de diseño ≤ I·Cmáx·P (6.3.7.2)
# Deformaciones sísmicas (5.9)
Um = UmodalCL(Pk, kx, Sa) // Desplazamientos modales (niveles × modos)
dm = cqcNCh433(entrepisoCL(Um), Tn) // Desplazamiento relativo de entrepiso, CQC
d = fs*dm // Desplazamiento de diseño (incluye el factor por corte mínimo; 6.3.7.2 no reduce desplazamientos)
check max(d)/hp <= 0.002 // Deriva en el centro de masas (5.9.2)
"El modelo de cortante plano entrega desplazamientos en el centro de masas. La verificación de 5.9.3 (exceso de deriva ≤ 0,001 h en cualquier punto de la planta) y el análisis con los centros de masas desplazados ±0,05 b (6.3.4 a) deben hacerse con el modelo tridimensional.`),
      { type: 'spectrumCL', norma: 'NCh433', zona: 'zona', suelo: 'suelo', I: 'I', R: 'Ro', T: 'Ts', tmax: '3', comparar: true, elastico: false, titulo: 'Espectro de diseño NCh433 + DS61 (suelo del proyecto en azul; otros suelos con el mismo R* en trazos)' },
      { type: 'table', columnas: 'Modo = 1:6\n$T_n$ [s] = Tn\n$M_n^*/M$ = Mn\n$\\alpha$ = alfa\n$S_a/g$ = Sa', dec: '4', titulo: 'Periodos, masas equivalentes y pseudo-aceleraciones de diseño' },
      { type: 'table', columnas: 'Piso = 1:6\n$P_k$ [tonf] = Pk\n$V$ CQC [tonf] = V\n$V$ diseño [tonf] = Vd\n$\\Delta$ [cm] = d\nDeriva = d/hp', dec: '4', titulo: 'Cortes de entrepiso (CQC) y deformaciones de diseño' },
      { type: 'fuerzasCL', Z: 'hp*(1:6)', F: 'Vd - concat(Vd[2:6], [0] tonf)', V: 'Vd', u: 'tonf', titulo: 'Fuerzas equivalentes de piso y corte de entrepiso de diseño (análisis modal espectral)' },
      summary(),
    ],
  },
  // ===================================================================
  // 2b) NCh433:2026 — análisis sísmico (vigente desde febrero de 2027)
  // ===================================================================
  {
    id: 'cl-nch433-2026', pais: 'CL', cat: 'Sismo — Chile', icon: 'quake', settings: ST,
    name: 'Análisis sísmico NCh433:2026 (vigente desde 2027)',
    normas: 'NCh433:2026 (D.Ex. N° 28 MINVU, D.O. 10-08-2026) · NCh1537 · NCh3171',
    desc: 'Clasificación del sitio con Vs30 y periodo predominante Tg (H/V), coeficiente sísmico con Cmín/Cmáx, Qo = C·I·P, fuerzas Ak, torsión accidental, espectro de diseño con R*, límites de corte del análisis modal y deformaciones. Los parámetros no confirmados quedan editables con advertencia.',
    titulo: 'Análisis sísmico — NCh433:2026 Diseño sísmico de edificios',
    blocks: [
      text(`# Generalidades
**Proyecto:** edificio habitacional de 5 pisos estructurado con **muros de hormigón armado** en ambas direcciones y losas macizas que actúan como diafragma rígido. Ubicación: Viña del Mar, V Región (**zona sísmica 3**). Suelo de fundación: grava arenosa densa. El sondaje de 30 m con perfil de $V_s$ dio $V_{s30} = 420$ m/s y la razón espectral H/V (método de Nakamura) dio un periodo predominante $T_g = 0{,}32$ s.

**Norma:** **NCh433:2026** *Diseño sísmico de edificios*. El INN la aprobó en marzo de 2026 y el MINVU la declaró Norma Oficial por el **D.Ex. N° 28** (Diario Oficial, 10-08-2026). Entra en vigencia **seis meses después de esa publicación, alrededor del 10-02-2027**. Desde esa fecha reemplaza a la NCh433.Of1996 Mod.2009 y al D.S. N° 61 (V. y U.) de 2011. Hasta entonces rige la NCh433 Mod.2009 + DS61 (plantilla «Análisis sísmico estático NCh433 + DS61»). Se complementa con NCh1537 (cargas) y NCh3171 (combinaciones).

**Qué cambia respecto de NCh433 + DS61.** La norma nueva es sobre todo un texto refundido de la NCh433 Mod.2009 con el DS61. Los cambios técnicos son estos:
- **Clasificación del sitio.** Se hace con $V_{s30}$ **y** con el periodo predominante del terreno $T_g$. Si $T_g$ no cumple el límite de la clase obtenida con $V_{s30}$, el sitio baja un nivel. El sondaje de 30 m pasa a ser obligatorio en la mayoría de los proyectos.
- **Sistemas nuevos.** Se incorporan los sistemas de acero conformado en frío y el marco plataforma de madera ($R = 6{,}5$).
- **Deriva.** En estructuras de acero y en marco plataforma de madera la deriva admisible sube a $0{,}0025\\,h$.
- **Fallas activas.** Construir sobre ellas exige estudios adicionales.

El espectro de diseño de la Tabla 7, $A_o$, $I$, $C_{máx}$ y $R^*$ **se mantienen** iguales a los del DS61.

**Método:** análisis estático (6.2), aplicable porque el edificio no supera 5 pisos ni 20 m de altura (6.2.1 b). Se calcula además el espectro de diseño (6.3.5) y los límites del corte basal para el análisis modal espectral (6.3.7).

> **ADVERTENCIA (fuentes).** No se tuvo acceso al texto oficial de la NCh433:2026, que es de venta en el INN. Los artículos, ecuaciones y tablas se citan según el **proyecto prNCh433 en consulta pública (INN, 2022)**. Las diferencias con la versión final se tomaron de fuentes públicas (AICE, ICHA, Instituto de la Construcción, Centro UC de Innovación en Madera y seminario UANDES 2026). Según ICHA, en la versión final la tabla de factores R es la **Tabla 5**, así que **la numeración puede no coincidir**. Hay datos que quedan **editables y marcados «por confirmar»**: el alcance del límite de deriva $0{,}0025\\,h$, el límite absoluto $0{,}003\\,h$ en cualquier punto (5.9.3 del proyecto), el $R_o$ del marco plataforma de madera y los R/Ro del acero conformado en frío. Verifíquelos con el texto oficial antes de usar esta memoria. Detalle en docs/referencias/chile-2026.md.`),
      calc(`# Clasificación sísmica del sitio (4.2)
Vs30 = 420 m/s // Velocidad de ondas de corte de los 30 m superiores, Vs30 = Σhi/Σ(hi/Vsi) (4.2.2.4, ec. 1)
Tg = 0.32 s // Periodo predominante del terreno por razón espectral H/V, NCh3793; use 0 s si el H/V es plano (4.2.2.6)
sueloVs = sueloVsNCh433v26(Vs30) // Primera clasificación por Vs30 (Tabla 2): 1 = A … 5 = E
suelo = sueloNCh433v26(Vs30, Tg) // Clasificación final: si Tg no cumple, se degrada un nivel (4.2.3.1)
"Tabla 2 del proyecto: A $V_{s30} \\ge 900$ m/s y $T_g < 0{,}15$ s; B $\\ge 500$ m/s y $T_g < 0{,}30$ s; C $\\ge 350$ m/s y $T_g < 0{,}40$ s; D $\\ge 180$ m/s y $T_g < 1{,}00$ s; E $< 180$ m/s. En A, B y C también se acepta «H/V plano». El ejemplo del comentario C4.2.3.1 es $V_{s30} = 520$ m/s con $T_g = 0{,}51$ s: la clase B por $V_{s30}$ no se ratifica y el sitio queda como **suelo C**. Los suelos potencialmente licuables, los depósitos especiales y la topografía irregular requieren un espectro de sitio (4.2.1.2, suelo F).
# Parámetros sísmicos
zona = 3 // Zona sísmica según la comuna (4.1, Tabla 1; la zonificación de algunas comunas cambió respecto de 2009) [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433v26(zona) // Aceleración efectiva máxima Ao/g (Tabla 6)
S = SNCh433v26(suelo) // Parámetro del suelo S (Tabla 7)
To = ToNCh433v26(suelo) // Periodo To (Tabla 7)
Tp = TpNCh433v26(suelo) // Periodo T' (Tabla 7)
n = nNCh433v26(suelo) // Exponente n (Tabla 7)
p = pNCh433v26(suelo) // Exponente p (Tabla 7)
uso = 2 // Categoría de ocupación (4.3, Tabla 3) [1 : I — bajo riesgo|2 : II — habitación, oficinas|3 : III — aglomeración de personas|4 : IV — esenciales]
I = INCh433v26(uso) // Coeficiente de importancia (Tabla 5 del proyecto)
R = 7 // Factor de modificación de la respuesta R (5.7, tabla de factores R) [7 : Muros o pórticos de H.A. · acero SMF|6.5 : Madera, marco plataforma (NCh433:2026)|6 : H.A. y albañilería (criterio A) · acero EBF o STMF|5.5 : Madera (otros) · acero SCBF|5 : Acero, marcos intermedios (IMF)|4 : Albañilería confinada o armada llena · acero OMF|3 : Albañilería armada sin llenar · acero OCBF|2 : Otros sistemas]
Ro = 11 // Factor Ro del espectro, asociado a R (5.7). POR CONFIRMAR para madera marco plataforma y acero conformado en frío [11 : Muros o pórticos de H.A. · acero SMF|10 : Acero EBF o STMF|9 : H.A. y albañilería (criterio A)|8 : Acero SCBF|7 : Madera (valor 2009)|6 : Acero IMF|5 : Acero OMF u OCBF|4 : Albañilería confinada o armada llena|3 : Albañilería armada sin llenar]
## Geometría, método y peso sísmico
N = 5 // Número de pisos sobre el nivel basal
hp = 2.6 m // Altura de entrepiso
H = N*hp // Altura total del edificio sobre el nivel basal
check N <= 5 // Método estático: no más de 5 pisos (6.2.1 b)
check H <= 20 m // Método estático: altura no mayor que 20 m (6.2.1 b)
Ap = 320 m^2 // Área de la planta tipo
qD = 0.95 tonf/m^2 // Carga permanente: losa, muros, terminaciones y tabiques (NCh1537)
qL = 0.20 tonf/m^2 // Sobrecarga de uso, vivienda 2,0 kPa (NCh1537)
qDt = 0.75 tonf/m^2 // Carga permanente del nivel de techo
psc = 0.25 // Fracción de la sobrecarga en la masa sísmica (5.5.1) [0.25 : Sin aglomeración usual de personas|0.50 : Con aglomeración usual de personas]
Pk = concat(Ap*(qD + psc*qL)*ones(N - 1), [Ap*qDt]) // Peso sísmico por nivel (1 → N; techo sin sobrecarga, 6.2.3.3)
Zk = hp*(1:N) // Altura de cada nivel sobre el nivel basal
P = sum(Pk) // Peso total sobre el nivel basal (6.2.3.3)
Tx = 0.32 s // Periodo del modo con mayor masa traslacional en X, T*x (6.2.4, modelo 3D)
Ty = 0.26 s // Periodo del modo con mayor masa traslacional en Y, T*y
# Coeficiente sísmico y esfuerzo de corte basal (6.2.3)
Cx = CNCh433v26(Tx, S, Tp, n, Ao, R) // Coeficiente sísmico en X (ec. 4)
Cy = CNCh433v26(Ty, S, Tp, n, Ao, R) // Coeficiente sísmico en Y (ec. 4)
Cmin = CminNCh433v26(S, Ao) // Valor mínimo Ao·S/(6g) (6.2.3.1.1)
q = 1.0 // Menor fracción del corte tomada por los muros de H.A. en la mitad inferior del edificio (6.2.3.1.3)
f = fNCh433v26(q) // Factor de reducción de Cmáx para edificios de muros (ec. 5)
Cmax = f*CmaxNCh433v26(R, S, Ao) // Valor máximo (Tabla 8 × f)
Cdx = min(max(Cx, Cmin), Cmax) // Coeficiente sísmico de diseño en X
Cdy = min(max(Cy, Cmin), Cmax) // Coeficiente sísmico de diseño en Y
check Cdx >= Cmin // C no menor que Ao·S/(6g) en X (6.2.3.1.1)
check Cdy >= Cmin // C no menor que Ao·S/(6g) en Y (6.2.3.1.1)
Qox = Cdx*I*P // Esfuerzo de corte basal en X (ec. 3)
Qoy = Cdy*I*P // Esfuerzo de corte basal en Y (ec. 3)
"Si $R$ no figura en la Tabla 8 (por ejemplo $R = 5$ o $R = 6{,}5$), $C_{máx}$ se interpola linealmente entre los valores tabulados. Ese es un criterio del módulo, no de la norma: para $R = 6{,}5$ resulta $0{,}35\\,S A_o/g$, igual que para $R = 6$ y $R = 7$.
# Distribución de las fuerzas en altura y torsión accidental
Ak = AkNCh433v26(Zk) // Factores Ak (ec. 7)
Fkx = Ak .* Pk / sum(Ak .* Pk) * Qox // Fuerza horizontal en cada nivel, sismo X (ec. 6)
Fky = Ak .* Pk / sum(Ak .* Pk) * Qoy // Fuerza horizontal en cada nivel, sismo Y (ec. 6)
Vkx = Qox - cumsum(Fkx) + Fkx // Esfuerzo de corte de entrepiso, sismo X
Vky = Qoy - cumsum(Fky) + Fky // Esfuerzo de corte de entrepiso, sismo Y
bkx = 16 m // Dimensión de la planta en X (para sismo Y)
bky = 20 m // Dimensión de la planta en Y (para sismo X)
Mtx = Fkx .* (0.10*bky*Zk/H) // Momento de torsión accidental por nivel, sismo X: ±0,10·bky·Zk/H (6.2.8)
Mty = Fky .* (0.10*bkx*Zk/H) // Momento de torsión accidental por nivel, sismo Y: ±0,10·bkx·Zk/H (6.2.8)`),
      { type: 'table', columnas: 'Nivel = 1:N\n$Z_k$ [m] = Zk\n$P_k$ [tonf] = Pk\n$A_k$ = Ak\n$F_{kx}$ [tonf] = Fkx\n$V_{kx}$ [tonf] = Vkx\n$M_{tx}$ [tonf·m] = Mtx\n$F_{ky}$ [tonf] = Fky\n$V_{ky}$ [tonf] = Vky', dec: '3', total: false, titulo: 'Distribución de las fuerzas sísmicas en altura y torsión accidental (NCh433:2026, 6.2.5 y 6.2.8)' },
      { type: 'fuerzasCL', Z: 'Zk', F: 'Fkx', V: 'Vkx', u: 'tonf', titulo: 'Fuerzas sísmicas estáticas y corte de entrepiso, sismo según X (NCh433:2026)' },
      calc(`# Espectro de diseño y límites del análisis modal espectral (6.3.5 y 6.3.7)
Rsx = RstarNCh433v26(Tx, To, Ro) // Factor de reducción R* con T* de X (ec. 12)
Sax = SaNCh433v26(Tx, S, To, p, Ao, Rsx, I) // Ordenada espectral de diseño Sa/g en T*x (ec. 10 y 11)
Qmin = I*S*Ao*P/6 // Corte basal mínimo I·S·Ao·P/(6g) del análisis modal (6.3.7.1)
Qmax = I*Cmax*P // Corte basal que no es necesario exceder, I·Cmáx·P (6.3.7.2)
check Qmin <= Qmax // Intervalo admisible del corte basal modal
"Si el análisis modal espectral del modelo 3D entrega un corte basal menor que $Q_{mín}$, los esfuerzos **y los desplazamientos** se amplifican hasta alcanzarlo. Si supera $Q_{máx}$, pueden reducirse solo los esfuerzos, no los desplazamientos (6.3.7).`),
      { type: 'spectrumCL', norma: 'NCh433:2026', zona: 'zona', suelo: 'suelo', I: 'I', R: 'Ro', T: 'Tx', tmax: '3', comparar: true, elastico: true, titulo: 'Espectro de diseño NCh433:2026: suelo del proyecto y otros suelos con el mismo R*' },
      calc(`# Deformaciones sísmicas (5.9)
"Desplazamientos relativos de entrepiso del modelo con las fuerzas de diseño, **incluida la torsión accidental** (5.9.1).
dcmx = [0.08, 0.11, 0.12, 0.12, 0.11] cm // Desplazamiento relativo de entrepiso en el centro de masas, sismo X
dpx = [0.11, 0.15, 0.16, 0.16, 0.15] cm // Desplazamiento relativo máximo en cualquier punto de la planta, sismo X
dcmy = [0.06, 0.08, 0.09, 0.09, 0.08] cm // Desplazamiento relativo en el centro de masas, sismo Y
dpy = [0.09, 0.12, 0.13, 0.13, 0.12] cm // Desplazamiento relativo máximo en cualquier punto, sismo Y
dlim = 0.002 // Deriva admisible en el CM (5.9.2). 0,0025 en acero y madera marco plataforma: confirmar el alcance exacto en el texto oficial [0.002 : 0,002 — general (H.A., albañilería, otros)|0.0025 : 0,0025 — acero y madera marco plataforma (por confirmar)]
dabs = 0.003 // Límite absoluto de deriva en cualquier punto (prNCh433 5.9.3, POR CONFIRMAR en el texto oficial)
check max(dcmx/hp) <= dlim // Deriva en el CM, sismo X (5.9.2)
check max(dcmy/hp) <= dlim // Deriva en el CM, sismo Y (5.9.2)
check max((dpx - dcmx)/hp) <= 0.001 // Exceso de deriva en cualquier punto respecto del CM, sismo X (5.9.3)
check max((dpy - dcmy)/hp) <= 0.001 // Exceso de deriva en cualquier punto respecto del CM, sismo Y (5.9.3)
check max(dpx/hp) <= dabs // Deriva en cualquier punto ≤ 0,003 h, sismo X (prNCh433 5.9.3, por confirmar)
check max(dpy/hp) <= dabs // Deriva en cualquier punto ≤ 0,003 h, sismo Y (prNCh433 5.9.3, por confirmar)`),
      { type: 'table', columnas: 'Piso = 1:N\n$\\delta_{CM,x}$ [cm] = dcmx\nDeriva CM X = dcmx/hp\nDeriva máx. X = dpx/hp\n$\\delta_{CM,y}$ [cm] = dcmy\nDeriva CM Y = dcmy/hp\nDeriva máx. Y = dpy/hp', dec: '5', titulo: 'Control de deformaciones de entrepiso (NCh433:2026, 5.9)' },
      text(`> **Notas.** (1) Los elementos de H.A. se diseñan con NCh3171 y $1{,}4E$ (DS60). El desplazamiento de diseño del techo es $\\delta_u = 1{,}3\\,S_{de}(T_{ag})$ (5.9.5, ec. 2), con $S_{de}$ y $C_d^*$ iguales a los del DS61 (Tabla 9). (2) La torsión accidental puede despreciarse si cambia los desplazamientos en ≤ 20 % (6.1.2). (3) Los casos especiales de 4.2.1.3 (≤ 500 m², ≤ 2 niveles y < 8 m; o conjuntos de viviendas de ≤ 2 niveles y < 200 m² cada una, en terrenos < 8 000 m²) pueden omitir el sondaje de 30 m. En ese caso se diseñan por el método estático con el $C_{máx}$ del suelo E. Estos umbrales vienen del proyecto de 2022 y deben confirmarse en el texto oficial.`),
      summary(),
    ],
  },
  // ===================================================================
  // 2c) Comparación NCh433 + DS61 vs NCh433:2026
  // ===================================================================
  {
    id: 'cl-nch433-comparacion', pais: 'CL', cat: 'Sismo — Chile', icon: 'spectrum', settings: ST,
    name: 'Comparación NCh433 + DS61 vs NCh433:2026',
    normas: 'NCh433.Of1996 Mod.2009 + DS61 (2011) · NCh433:2026 (vigente ≈ feb-2027)',
    desc: 'Mismo edificio calculado con ambas versiones: clasificación del sitio (DS61 vs Vs30 + Tg), parámetros del suelo, coeficiente sísmico, corte basal, espectros de diseño y derivas escaladas al nuevo corte.',
    titulo: 'Comparación del análisis sísmico NCh433 + DS61 y NCh433:2026',
    blocks: [
      text(`# Generalidades
Se compara un mismo edificio de 5 pisos de muros de H.A. en zona 3 con las dos versiones de la norma de diseño sísmico de edificios:
- **NCh433.Of1996 Mod.2009 + D.S. N° 61 (2011).** Rige **hasta la entrada en vigencia de la NCh433:2026**, seis meses después del D.O. del 10-08-2026, es decir, alrededor del 10-02-2027.
- **NCh433:2026** (D.Ex. N° 28 MINVU).

El espectro, $A_o$, $I$, $C_{máx}$ y $R^*$ son los mismos en ambas. La diferencia práctica para un edificio de muros de H.A. está en la **clasificación del sitio**: la norma 2026 exige ratificar con el periodo predominante $T_g$ (H/V) la clase obtenida con $V_{s30}$, y si no se cumple el sitio baja un nivel. En el ejemplo, $V_{s30} = 420$ m/s clasifica como C según el DS61, pero $T_g = 0{,}45$ s supera el límite de 0,40 s y el sitio pasa a **suelo D** con la norma 2026. En edificios de acero o de madera marco plataforma, la deriva admisible de la versión 2026 puede ser $0{,}0025\\,h$ (por confirmar).

> **ADVERTENCIA.** La norma 2026 se cita según el proyecto prNCh433 (INN, 2022) y fuentes públicas de 2026, porque el texto oficial no estuvo disponible. Ver la plantilla «Análisis sísmico NCh433:2026» y docs/referencias/chile-2026.md.`),
      calc(`# Datos comunes
zona = 3 // Zona sísmica [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433(zona) // Ao/g (igual en ambas versiones)
uso = 2 // Categoría de ocupación [1 : I|2 : II|3 : III|4 : IV]
I = INCh433(uso) // Coeficiente de importancia (igual en ambas versiones)
R = 7 // Factor R [7 : Muros o pórticos de H.A. · acero SMF|6 : H.A. y albañilería (criterio A) · acero EBF o STMF|5.5 : Acero SCBF|5 : Acero IMF|4 : Albañilería confinada|3 : Albañilería armada sin llenar]
Ro = 11 // Factor Ro del espectro [11 : Muros o pórticos de H.A. · acero SMF|10 : Acero EBF o STMF|9 : H.A. y albañilería (criterio A)|8 : Acero SCBF|6 : Acero IMF|4 : Albañilería confinada|3 : Albañilería armada sin llenar]
N = 5 // Número de pisos
hp = 2.6 m // Altura de entrepiso
H = N*hp // Altura total
check N <= 5 // Método estático aplicable en ambas versiones (6.2.1 b)
Pk = concat(320 m^2*(0.95 tonf/m^2 + 0.25*0.20 tonf/m^2)*ones(N - 1), [320 m^2*0.75 tonf/m^2]) // Peso sísmico por nivel (D + 25 % SC; techo solo D)
P = sum(Pk) // Peso sísmico total
Tx = 0.32 s // T* en X (modelo 3D)
q = 1.0 // Fracción mínima del corte tomada por los muros de H.A. (6.2.3.1.3)
f = fNCh433(q) // Factor f (igual en ambas versiones)
# Clasificación del sitio
Vs30 = 420 m/s // Vs30 medido (sondaje de 30 m y ensayo geofísico)
Tg = 0.45 s // Periodo predominante del terreno por H/V (0 s = H/V plano)
suelo61 = 3 // Suelo según DS61 Tabla 4.2: Vs30 más parámetros geotécnicos del estudio [1 : A|2 : B|3 : C|4 : D|5 : E]
suelo26 = sueloNCh433v26(Vs30, Tg) // Suelo según NCh433:2026: Vs30 y Tg, con degradación de un nivel (4.2.3.1)
# NCh433 + DS61
S61 = SNCh433(suelo61) // S (DS61 Tabla 6.3)
Cx61 = CNCh433(Tx, S61, TpNCh433(suelo61), nNCh433(suelo61), Ao, R) // C (ec. 6-2)
Cmin61 = CminNCh433(S61, Ao) // Cmín (6.2.3.1.1)
Cmax61 = f*CmaxNCh433(R, S61, Ao) // Cmáx (Tabla 6.4 × f)
Cd61 = min(max(Cx61, Cmin61), Cmax61) // C de diseño
check Cd61 >= Cmin61 // C ≥ Cmín (DS61)
Qo61 = Cd61*I*P // Corte basal NCh433 + DS61
Rs61 = RstarNCh433(Tx, ToNCh433(suelo61), Ro) // R* (ec. 6-10)
Sa61 = SaNCh433(Tx, S61, ToNCh433(suelo61), pNCh433(suelo61), Ao, Rs61, I) // Sa/g en T* (ec. 6-8)
# NCh433:2026
S26 = SNCh433v26(suelo26) // S (Tabla 7)
Cx26 = CNCh433v26(Tx, S26, TpNCh433v26(suelo26), nNCh433v26(suelo26), Ao, R) // C (ec. 4)
Cmin26 = CminNCh433v26(S26, Ao) // Cmín (6.2.3.1.1)
Cmax26 = f*CmaxNCh433v26(R, S26, Ao) // Cmáx (Tabla 8 × f)
Cd26 = min(max(Cx26, Cmin26), Cmax26) // C de diseño
check Cd26 >= Cmin26 // C ≥ Cmín (2026)
Qo26 = Cd26*I*P // Corte basal NCh433:2026
Rs26 = RstarNCh433v26(Tx, ToNCh433v26(suelo26), Ro) // R* (ec. 12)
Sa26 = SaNCh433v26(Tx, S26, ToNCh433v26(suelo26), pNCh433v26(suelo26), Ao, Rs26, I) // Sa/g en T* (ec. 10)
# Comparación
rQ = Qo26/Qo61 // Razón de cortes basales 2026 / DS61
rSa = Sa26/Sa61 // Razón de ordenadas espectrales en T*
"Con los datos por defecto ambos cortes quedan controlados por $C_{máx}$. Como el suelo pasa de C a D, el cambio de $S$ (1,05 → 1,20) multiplica el corte basal por {rQ}. Si $T_g$ cumple el límite, ambas versiones dan el mismo resultado.
## Deformaciones (análisis elástico lineal: se escalan con el corte basal)
dcm61 = [0.08, 0.11, 0.12, 0.12, 0.11] cm // Desplazamiento relativo en el CM con las fuerzas DS61 (modelo)
dcm26 = dcm61*rQ // Desplazamiento relativo con las fuerzas de la versión 2026
dlim26 = 0.002 // Deriva admisible NCh433:2026 [0.002 : 0,002 — general|0.0025 : 0,0025 — acero y madera marco plataforma (por confirmar)]
check max(dcm61/hp) <= 0.002 // Deriva en el CM, DS61 (5.9.2)
check max(dcm26/hp) <= dlim26 // Deriva en el CM, NCh433:2026 (5.9.2)`),
      { type: 'table', columnas: 'Piso = 1:N\n$P_k$ [tonf] = Pk\nDeriva DS61 = dcm61/hp\nDeriva 2026 = dcm26/hp', dec: '5', titulo: 'Derivas en el centro de masas con ambas versiones' },
      { type: 'plot', expr: 'SaNCh433(x s, S61, ToNCh433(suelo61), pNCh433(suelo61), Ao, Rs61, I); SaNCh433v26(x s, S26, ToNCh433v26(suelo26), pNCh433v26(suelo26), Ao, Rs26, I)', var: 'x', desde: '0.02', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa / g', leyenda: true, nombres: 'NCh433 + DS61 (suelo según DS61); NCh433:2026 (suelo según Vs30 y Tg)', titulo: 'Espectros de diseño con el R* de cada versión' },
      summary(),
    ],
  },
  // ===================================================================
  // 3) NCh2369 — nave industrial de acero
  // ===================================================================
  {
    id: 'cl-nch2369', pais: 'CL', cat: 'Sismo — Chile', icon: 'steel', settings: ST,
    name: 'Sismo industrial NCh2369 — nave de acero',
    normas: 'NCh2369.Of2003 Diseño sísmico de estructuras e instalaciones industriales · comparación NCh2369:2023 (oficial 2025)',
    desc: 'Nave de acero de un piso con arriostramiento continuo de techo: C con amortiguamiento (0.05/ξ)^0.4, Cmín = 0.25Ao/g y Cmáx de la Tabla 5.7, corte basal, deformación d = R1·dd ≤ 0.015h y espectro de diseño.',
    titulo: 'Análisis sísmico de nave industrial — NCh2369',
    blocks: [
      text(`# Generalidades
Nave industrial de acero para bodega y taller, ubicada en Rancagua (**zona sísmica 3**), de 60 m de largo, 24 m de luz y 10 m de altura de alero, con marcos transversales arriostrados, **arriostramiento continuo de techo** y uniones de terreno apernadas. Se analiza la dirección transversal con el **método estático** de NCh2369.Of2003 (5.3), aplicable por tener altura menor que 20 m y respuesta asimilable a un sistema de un grado de libertad (5.2.2 a).

La **NCh2369:2023** (oficializada como NCh2369:2025 por D.Ex. N° 12/2026 del MINVU) reemplaza a la versión 2003: usa la clasificación de suelos A–E y un espectro de referencia $1{,}4\\,S A_o\\,\\alpha$. Al final se compara su espectro de diseño con el de la versión 2003.

> **Vigencia.** La NCh2369:2025 fue oficializada por el D.Ex. N° 12 MINVU (D.O. 09-03-2026). El D.Ex. N° 36 (2026) amplió a 18 meses el plazo de entrada en vigencia, que queda en el **10-09-2027**. Hasta esa fecha los permisos se evalúan con la NCh2369.Of2003. La comparación 2023 de esta memoria usa el texto de la consulta pública (NCh2369:2023); confirme cualquier diferencia con el texto oficial 2025.`),
      calc(`# Parámetros sísmicos
zona = 3 // Zona sísmica (NCh2369 Tabla 5.1 / Figura 5.1) [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433(zona) // Aceleración efectiva máxima Ao/g (Tabla 5.2)
suelo = 2 // Tipo de suelo (Tabla 5.3) [1 : I — roca|2 : II — grava/arena densa, suelo cohesivo duro|3 : III — arena no saturada medianamente densa|4 : IV — suelo cohesivo saturado blando]
Tp = TpNCh2369(suelo) // Periodo T' (Tabla 5.4)
n = nNCh2369(suelo) // Exponente n (Tabla 5.4)
uso = 2 // Categoría de la instalación (4.3.1) [1 : C1 — crítica|2 : C2 — normal|3 : C3 — menor]
I = INCh2369(uso) // Coeficiente de importancia (4.3.2)
R = 5 // Factor de modificación de la respuesta (Tabla 5.6) [5 : Un piso con arriostramiento continuo de techo (3.4)|4 : Nave liviana (3.6)|3 : Un piso sin arriostramiento continuo (3.5)|2 : Otras estructuras|1 : Estructura elástica]
xi = 0.03 // Razón de amortiguamiento (Tabla 5.5) [0.02 : Marcos de acero soldados|0.03 : Marcos de acero con uniones de terreno apernadas|0.05 : Hormigón armado y albañilería]
## Peso sísmico (5.1.3)
L = 60 m // Largo de la nave
B = 24 m // Luz de los marcos
H = 10 m // Altura de alero
check H <= 20 m // Método estático solo para estructuras de hasta 20 m (5.2.2 a)
qtec = 0.040 tonf/m^2 // Cubierta, costaneras, vigas y arriostramientos de techo
qinst = 0.015 tonf/m^2 // Instalaciones colgadas permanentes
qmuro = 0.030 tonf/m^2 // Revestimiento lateral y costaneras de muros
qsc = 0.030 tonf/m^2 // Sobrecarga de techo (no se incluye: factor 0 en techos, 5.1.3)
Pt = (qtec + qinst)*L*B + 0*qsc*L*B // Peso del techo (sobrecarga de techo con coeficiente 0)
Pm = qmuro*2*(L + B)*H/2 // Mitad superior de los muros perimetrales
Pc = 12 tonf // Mitad superior del peso de columnas y arriostramientos verticales
P = Pt + Pm + Pc // Peso sísmico sobre el nivel basal
## Periodo fundamental (5.3.4)
K = 5200 tonf/m // Rigidez lateral total de los marcos transversales (análisis del modelo)
Ts = 2*pi*sqrt(P/(K*9.80665 m/s^2)) // Periodo de un grado de libertad T* = 2π√(P/gK)
# Coeficiente sísmico (5.3.3)
C = CNCh2369(Ts, Tp, n, Ao, R, xi) // C = 2.75·Ao/(gR)·(T'/T*)^n·(0.05/ξ)^0.4 (ec. 5-2)
Cmax = CmaxNCh2369(R, xi, Ao) // Valor máximo (Tabla 5.7; ×0.75 zona 2, ×0.50 zona 1)
Cmin = CminNCh2369(Ao) // Valor mínimo 0.25·Ao/g (5.3.3.2)
Cd = min(max(C, Cmin), Cmax) // Coeficiente sísmico de diseño
check Cd >= Cmin // C ≥ 0.25 Ao/g (5.3.3.2)
Qo = Cd*I*P // Esfuerzo de corte basal (ec. 5-1)
sm = 6 m // Separación entre marcos transversales
Qmarco = Qo*sm/L // Corte en un marco interior, área tributaria s/L (11 marcos a 6 m; el arriostramiento continuo de techo reparte según rigidez, aquí iguales)
"La acción sísmica vertical se considera con un coeficiente $A_o/g$ solo en los casos de 5.1.1 a) y b) (voladizos, estructuras sensibles); no aplica a esta nave.
# Deformaciones sísmicas (6.1 y 6.3)
dd = Qo/K // Desplazamiento lateral con las solicitaciones reducidas por R
Qmin = 0.25*I*Ao*P // Corte basal mínimo de referencia (5.4.5)
R1 = si(Qo/Qmin <= 1, R*max(Qo/Qmin, 0.5), R) // Factor R1 (6.1)
d = R1*dd // Deformación sísmica d = d0 + R1·dd con d0 = 0 (ec. 6-1)
check d <= 0.015*H // Deformación máxima, otras estructuras (6.3 d)
"Como $d \\le 0{,}015\\,h$ no es necesario considerar el efecto P-Delta (6.4).
hv = 6 m // Altura de la estructura vecina (bodega existente de albañilería, rígida: d0 y R1·dd despreciables)
sep = max(R1*dd, 0.002*(H + hv), 30 mm) // Separación mínima S = máx(√((R1·dd)ᵢ² + (R1·dd)ⱼ²) + d0ᵢ + d0ⱼ; 0,002(hᵢ + hⱼ); 30 mm) (6.2.1)
sepp = 60 mm // Separación proyectada a la estructura vecina
check sepp >= sep // Separación entre estructuras (6.2.1)`),
      { type: 'spectrumCL', norma: 'NCh2369', zona: 'zona', suelo: 'suelo', I: 'I', R: 'R', xi: 'xi', T: 'Ts', tmax: '2.5', elastico: false, titulo: 'Espectro de diseño NCh2369.Of2003 con amortiguamiento ξ y límite I·Cmáx (ec. 5-5)' },
      calc(`# Comparación con NCh2369:2023 (oficial como NCh2369:2025)
"La versión 2023 clasifica el suelo por $V_{s30}$ (Tabla 4, A–E) y define el coeficiente sísmico del análisis estático como la ordenada del espectro de diseño en $T^*$ (5.5.1). Para esta nave la **Tabla 6, ítem 5.5** (edificio industrial de un piso con arriostramiento continuo de techo y anclajes dúctiles, uniones empernadas) da los mismos $R = 5$ y $\\xi = 0{,}03$.
suelo23 = 2 // Suelo según NCh2369:2023 Tabla 4 (grava densa, Vs30 ≥ 500 m/s) [1 : A|2 : B|3 : C|4 : D — exige espectro de sitio salvo R = 1]
S23 = SNCh433(suelo23) // Parámetro S (Tabla 5)
cat23 = 2 // Categoría de ocupación (Tabla 1) [1 : I|2 : II|3 : III|4 : IV]
I23 = INCh2369v23(cat23) // Coeficiente de importancia (4.3.2)
R23 = 5 // Factor R (Tabla 6, ítem 5.5)
xi23 = 0.03 // Amortiguamiento ξ (Tabla 6, ítem 5.5, uniones empernadas)
C23 = SaNCh2369v23(Ts, suelo23, Ao, I23, R23, xi23) // C = Sa(T*)/g, incluye I (ec. 1, 1.1 y 3; 5.5.1)
Cmin23 = CminNCh2369v23(I23, S23, Ao) // Cmín = 0,25·I·S·Ao/g (5.12.1)
Q23 = max(C23, Cmin23)*P // Esfuerzo de corte basal Q0 = C·P (ec. 5)
r23 = Q23/Qo // Razón entre el corte basal 2023 y el de la versión 2003`),
      { type: 'plot', expr: 'SaNCh2369(x s, Tp, n, Ao, I, R, xi); SaNCh2369v23(x s, suelo23, Ao, I23, R23, xi23); SaVNCh2369v23(x s, suelo23, Ao, I23)', var: 'x', desde: '0.02', hasta: '2.5', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa / g', leyenda: true, nombres: 'NCh2369.Of2003 horizontal, suelo II; NCh2369:2023 horizontal, suelo B (Tabla 6 ítem 5.5); NCh2369:2023 vertical (RV = 2, ξV = 0,03)', titulo: 'Comparación de espectros de diseño NCh2369.Of2003 y NCh2369:2023/2025' },
      summary(),
    ],
  },
  // ===================================================================
  // 4) Muro de hormigón armado — NCh430 + DS60
  // ===================================================================
  {
    id: 'cl-muro-ds60', pais: 'CL', cat: 'Sismo — Chile', icon: 'wall', settings: ST,
    name: 'Muro de H.A. — NCh430 + DS60 (ACI 318-08)',
    normas: 'D.S. N° 60 (V. y U.) 2011 · ACI 318-08 · NCh430 · NCh433 + DS61 (5.9.5, 6.3.5.5)',
    desc: 'Muro especial: desplazamiento de diseño δu = 1.3·Sde(Tag), esbeltez lu/16, Pu ≤ 0.35f\'cAg, eje neutro por compatibilidad, εc ≤ 0.008, elementos de borde (c ≥ lw/(600δu/hw)), armadura de borde y corte.',
    titulo: 'Diseño de muro de hormigón armado — DS60 (ACI 318-08)',
    blocks: [
      text(`# Generalidades
Diseño del muro **M-1** (eje 3) de un edificio habitacional de 16 pisos en Santiago (**zona 2**, **suelo B**). El D.S. N° 60 (V. y U.) de 2011 adopta el **ACI 318-08** con modificaciones originadas por el terremoto del Maule de 2010 (reemplaza a NCh430.Of2008 en lo que se oponga): muros con **doble malla** (21.9.2.2), límite de carga axial $P_u \\le 0{,}35 f'_c A_g$ (21.9.5.3), **capacidad de curvatura** con $\\varepsilon_c \\le 0{,}008$ (21.9.5.4), elementos de borde con $c \\ge l_w/(600\\,\\delta_u/h_w)$ **sin** el límite inferior 0,007 del ACI (21.9.6.2), espesor de elementos de borde ≥ 300 mm (21.9.6.4 f). El desplazamiento de diseño $\\delta_u$ proviene del espectro elástico de desplazamientos del DS61. La NCh433:2026, vigente alrededor del 10-02-2027 (D.Ex. N° 28 MINVU), mantiene $\\delta_u = 1{,}3\\,S_{de}(T_{ag})$ y los $C_d^*$ del DS61 (prNCh433 5.9.5 y Tabla 9). Lo que cambia es la clasificación del suelo, que ahora usa $V_{s30}$ y $T_g$.`),
      calc(`# Materiales
fc = 30 MPa // Hormigón G30 (NCh170), f'c en probeta cilíndrica
fy = 420 MPa // Acero A630-420H (NCh204, DS60 21.1.5.2)
# Geometría del muro
lw = 6.0 m // Largo del muro
ew = 25 cm // Espesor del alma
hw = 41.6 m // Altura total del muro (16 pisos × 2.60 m)
Ht = hw // Altura total para la razón de aspecto (21.9.5.4)
lu = 2.40 m // Altura libre de entrepiso
Ag = lw*ew // Área bruta de la sección
check ew >= lu/16 // Espesor mínimo para no requerir análisis de inestabilidad (DS60 21.9.1.1)
# Solicitaciones de diseño (NCh3171, 1.2D + L ± 1.4E, DS60 9.1.4)
Pu = 520 tonf // Carga axial mayorada máxima consistente con δu
Mu = 1900 tonf*m // Momento mayorado en la base
Vu = 115 tonf // Corte mayorado en la base
check Pu <= 0.35*fc*Ag // Límite de carga axial (DS60 21.9.5.3)
# Desplazamiento de diseño en el techo (NCh433 5.9.5 y 6.3.5.5, DS61)
zona = 2 // Zona sísmica [1 : Zona 1|2 : Zona 2|3 : Zona 3]
Ao = AoNCh433(zona) // Ao/g (Tabla 6.2)
suelo = 2 // Tipo de suelo (DS61) [1 : A|2 : B|3 : C|4 : D]
Tx = 0.75 s // Periodo del modo con mayor masa traslacional, secciones brutas
Tag = 1.5*Tx // Periodo agrietado: 1,5 veces el de secciones brutas (5.9.5)
Cd = CdNCh433(Tag, suelo) // Parámetro Cd* (Tabla 6.5)
Sde = SdeNCh433(Tag, suelo, Ao) // Espectro elástico de desplazamientos (ec. 6-12)
deltau = 1.3*Sde // Desplazamiento lateral de diseño en el techo (ec. 5-1)
du = deltau/hw // Razón δu/hw`),
      calc(`# Armadura propuesta
dbb = 22 mm // Diámetro de las barras de borde
nb = 8 // Número de barras por elemento de borde (dos capas)
lb = 60 cm // Largo del elemento de borde
dbt = 10 mm // Diámetro de estribos y trabas de borde
sb = 10 cm // Espaciamiento vertical de estribos en el borde
dbw = 10 mm // Malla del alma: diámetro (dos capas, 21.9.2.2)
sw = 20 cm // Malla del alma: espaciamiento horizontal y vertical`),
      { type: 'muroCL', lw: 'lw', e: 'ew', fc: 'fc', fy: 'fy', nb: 'nb', dbb: 'dbb/(1 mm)', lb: 'lb', dbw: 'dbw/(1 mm)', sw: 'sw', rec: '4 cm', Pu: 'Pu', du: 'deltau', hw: 'hw', titulo: 'Muro M-1: sección, eje neutro para Pu y elementos de borde (DS60 21.9.6)' },
      calc(`# Capacidad de curvatura (DS60 21.9.5.4)
c = c_w // Profundidad del eje neutro para Pu y Mn (compatibilidad, εcu = 0.003)
check Mu <= phiMn_w // Resistencia a flexocompresión (ACI 318-08 21.9.5.1, 10.2)
"La verificación de capacidad de curvatura rige para muros con $H_t/l_w \\ge 3$ (aquí $H_t/l_w$ = {Ht/lw}) y se hace con la mayor carga axial consistente con $\\delta_u$. La demanda de curvatura se evalúa con las dos expresiones de uso habitual (rótula plástica $l_p = l_w/2$) y se adopta la mayor:
epsy = fy/(200000 MPa) // Deformación de fluencia del acero
phiy = 2*epsy/lw -> m^-1 // Curvatura de fluencia aproximada φy = 2εy/lw
deltay = 11/40*phiy*Ht^2 -> cm // Desplazamiento de fluencia en el techo (carga lateral triangular)
lp = lw/2 // Longitud de la rótula plástica
phiu1 = 2*deltau/(Ht*lw) -> m^-1 // Demanda de curvatura simplificada (ec. 21-7a)
phiu2 = phiy + (deltau - deltay)/(lp*(Ht - lp/2)) -> m^-1 // Demanda con curvatura de fluencia (ec. 21-7b)
phiu = max(phiu1, phiu2) // Demanda de curvatura adoptada
epsilonc = phiu*c // Deformación unitaria en la fibra más comprimida εc = φu·c
check epsilonc <= 0.008 // Deformación unitaria máxima del hormigón (DS60 21.9.5.4)
# Elementos de borde (DS60 21.9.6)
clim = lw/(600*du) // Profundidad límite del eje neutro (ec. 21-8)
reqb = si(c >= clim, 1, 0) // 1 = se requiere elemento de borde (21.9.6.2)
lconf = reqb*max(c - clim, c - 0.1*lw, c/2) // Longitud horizontal a confinar: envolvente de c − lw/(600·δu/hw) (DS60) y de máx(c − 0,1lw; c/2) (ACI 318-08 21.9.6.4 a)
ewmin = reqb*300 mm // Espesor mínimo del elemento de borde si se requiere (DS60 21.9.6.4 f)
check lb >= lconf // Largo del elemento de borde ≥ longitud a confinar (21.9.6.4 a)
check ew >= ewmin // Espesor del elemento de borde (21.9.6.4 f)
## Armadura de borde (DS60 21.9.2.4 y 21.9.6.5)
check dbb <= min(ew, lb)/9 // Diámetro longitudinal ≤ 1/9 de la menor dimensión del borde (21.9.2.4 a)
check dbt >= dbb/3 // Diámetro transversal ≥ 1/3 del longitudinal (21.9.2.4 b)
rhob = rho_borde // Cuantía longitudinal del elemento de borde
hx = 20 cm // Separación horizontal entre barras amarradas por estribos o trabas en el borde
so = min(max(100 mm + (350 mm - hx)/3, 100 mm), 150 mm) // so = 100 + (350 − hx)/3, entre 100 y 150 mm (ACI 318-08 21.6.4.3 c)
smax = si(reqb > 0, min(ew/3, 6*dbb, so), si(rhob > 2.8/(fy/(1 MPa)), min(6*dbb, 200 mm), 200 mm)) // Espaciamiento máximo: con elemento de borde 21.9.6.4 c → 21.6.4.3; sin él 21.9.6.5 a
check sb <= smax // Espaciamiento de estribos de borde
hxmax = si(reqb > 0, min(200 mm, ew/2), 350 mm) // hx máximo: 200 mm y e/2 en elementos de borde (DS60 21.9.6.4 c); 350 mm en otro caso (21.6.4.2)
check hx <= hxmax // Separación horizontal hx entre barras amarradas
nr = 4 // Ramas de estribos y trabas que cruzan el núcleo, perpendiculares al largo del muro
bc = ew - 2*2 cm // Dimensión del núcleo confinado medida a los bordes exteriores del estribo
Ash = nr*pi*dbt^2/4 -> cm^2 // Área de refuerzo transversal provista
Ashreq = reqb*0.09*sb*bc*fc/fy -> cm^2 // Ash ≥ 0,09·s·bc·f'c/fyt solo si se requiere elemento de borde (ec. 21-5)
check Ash >= Ashreq // Refuerzo transversal de confinamiento (ACI 318-08 21.9.6.4 c)
# Diseño a corte (ACI 318-08 21.9.4)
Acv = lw*ew // Área de corte
alphac = si(hw/lw <= 1.5, 0.25, si(hw/lw >= 2, 0.17, 0.25 - 0.16*(hw/lw - 1.5))) // Coeficiente αc (21.9.4.1)
rhot = 2*pi*dbw^2/4/(ew*sw) // Cuantía horizontal de la malla (dos capas)
check rhot >= 0.0025 // Cuantía mínima distribuida (21.9.2.1)
check sw <= 450 mm // Espaciamiento máximo de la malla (21.9.2.1)
Vn = Acv*(alphac*sqrtMPa(fc) + rhot*fy) -> tonf // Resistencia nominal a corte (ec. 21-7)
Vnmax = 0.66*Acv*sqrtMPa(fc) -> tonf // Límite superior de Vn (21.9.4.4)
phiv = 0.60 // Factor de reducción: muro no diseñado por capacidad (9.3.4 a)
phiVn = phiv*min(Vn, Vnmax) // Resistencia de diseño a corte
check Vu <= phiVn // Corte en la base`),
      text(`> **Notas.** El refuerzo que resiste flexión y carga axial inducidas por sismo en elementos de borde debe ser A630-420H o A706 (DS60 21.1.5.2). En empalmes de la zona crítica con cuantía > 2,8/fy se verifica la ec. 21-6a (21.9.2.3 e). La separación horizontal $h_x$ entre barras amarradas dentro del núcleo confinado no debe exceder 200 mm ni la mitad del espesor del elemento (21.9.6.4 c).`),
      summary(),
    ],
  },
  // ===================================================================
  // 5) Viento NCh432 sobre galpón
  // ===================================================================
  {
    id: 'cl-viento-galpon', pais: 'CL', cat: 'Cargas y combinaciones', icon: 'steel', settings: ST,
    name: 'Viento NCh432 sobre galpón',
    normas: 'NCh432:2010 (procedimiento analítico, base ASCE 7-05) · comparación NCh432.Of71 · NCh3171',
    desc: 'Galpón de dos aguas: qz = 0.613·Kz·Kzt·Kd·V²·I, coeficientes Cp de muros y techo, presión interna ±GCpi, cargas por marco, levantamiento en anclajes (0.9D + 1.6W) y comparación con NCh432.Of71.',
    titulo: 'Cargas de viento sobre galpón — NCh432',
    blocks: [
      text(`# Generalidades
Galpón cerrado de acero de 40 m × 20 m, techo a dos aguas con pendiente de 10°, marcos transversales cada 6 m, ubicado en campo abierto (**exposición C**). Se determina la acción del viento normal a la cumbrera sobre el **sistema principal resistente** (marcos) con el procedimiento analítico de **NCh432:2010** (adaptación del capítulo 6 de ASCE 7-05) y se compara con la presión básica de la antigua **NCh432.Of71**, todavía usada como referencia en la práctica chilena.

> **Vigencia.** En julio de 2025 el INN publicó la **NCh432:2025** (base ASCE 7-22). El MOP la declaró Norma Oficial con un decreto publicado en el D.O. el 18-08-2025, que deroga la NCh432.Of71 y fija la entrada en vigencia seis meses después. Esa versión trae una nueva zonificación y nuevas velocidades básicas de viento, que **no** están implementadas aquí porque no se tuvo acceso al texto oficial. Los coeficientes de esta memoria corresponden a la versión 2010 (procedimiento ASCE 7-05). Para proyectos nuevos, verifique con la NCh432:2025.`),
      calc(`# Parámetros del viento
V = 35 m/s // Velocidad básica (ráfaga de 3 s a 10 m, exposición C), mapa de zonas de NCh432:2010 [30 m/s|35 m/s|40 m/s|45 m/s|50 m/s|55 m/s]
expo = 2 // Categoría de exposición [1 : B — urbana/suburbana|2 : C — campo abierto|3 : D — frente al mar]
Iw = 1.00 // Factor de importancia [0.87 : Categoría I|1.00 : Categoría II|1.15 : Categorías III y IV]
Kzt = 1.0 // Factor topográfico (terreno plano)
Kd = 0.85 // Factor de direccionalidad (edificios, sistema principal)
G = 0.85 // Factor de efecto de ráfaga (estructura rígida)
GCpi = 0.18 // Coeficiente de presión interna, edificio cerrado [0.18 : Cerrado|0.55 : Parcialmente cerrado|0 : Abierto]
# Geometría
L = 40 m // Largo del galpón (paralelo a la cumbrera)
B = 20 m // Ancho del galpón (luz de los marcos, en la dirección del viento)
he = 7.0 m // Altura de alero
theta = 10 deg // Pendiente del techo
hc = he + B/2*tan(theta) // Altura de cumbrera
h = (he + hc)/2 // Altura media del techo
s = 6.0 m // Separación entre marcos
# Presión por velocidad
Kh = KzNCh432(h, expo) // Coeficiente de exposición a la altura media h
qh = qzNCh432(h, V, expo, Iw, Kzt, Kd) // Presión por velocidad a la altura h
qe = qzNCh432(he, V, expo, Iw, Kzt, Kd) // Presión por velocidad a la altura de alero (muro de barlovento)
# Coeficientes de presión externa (viento normal a la cumbrera)
Cpb = 0.8 // Muro de barlovento
Cps = CpMuroSotNCh432(B/L) // Muro de sotavento según L/B (L en la dirección del viento)
Cptb = CpTechoNCh432(theta, h/B, 1) // Techo de barlovento, caso de succión (θ < 10°: valor del borde de barlovento, envolvente)
Cpts = CpTechoSotNCh432(theta, h/B) // Techo de sotavento
# Presiones de diseño p = q·G·Cp − qh·(±GCpi)
pmb = qe*G*Cpb + qh*GCpi -> kgf/m^2 // Muro de barlovento con succión interna
pms = qh*G*Cps - qh*GCpi -> kgf/m^2 // Muro de sotavento con presión interna
ptb = qh*G*Cptb - qh*GCpi -> kgf/m^2 // Techo de barlovento con presión interna (máxima succión)
pts = qh*G*Cpts - qh*GCpi -> kgf/m^2 // Techo de sotavento con presión interna
pnet = qe*G*Cpb - qh*G*Cps -> kgf/m^2 // Presión horizontal neta sobre los muros (barlovento + sotavento)
pmin = 48.9 kgf/m^2 // Carga mínima de diseño 0,48 kN/m² (ASCE 7-05 6.1.4.1)
check pnet >= pmin // Carga de viento mínima 0,48 kN/m² sobre el área proyectada (ASCE 7-05 6.1.4.1)
## Cargas sobre el marco interior
wmb = pmb*s -> tonf/m // Muro de barlovento (empuje)
wms = pms*s -> tonf/m // Muro de sotavento (succión)
wtb = ptb*s -> tonf/m // Techo de barlovento (succión, normal al techo)
wts = pts*s -> tonf/m // Techo de sotavento (succión, normal al techo)
# Levantamiento en anclajes (NCh3171: 0,9D + 1,6W)
qDt = 0.045 tonf/m^2 // Peso propio de la cubierta, costaneras y marco
r = hc - he // Altura de la cumbrera sobre el alero
Rup = -(3*wtb + wts)*B/8 + ((wmb - wms)*he^2/2 + (wtb - wts)*r*(he + r/2))/B -> tonf // Levantamiento en la base de barlovento por equilibrio global del marco (momentos respecto de la base de sotavento): componentes verticales del techo + volcamiento de muros y componentes horizontales del techo
Rd = qDt*s*B/2 -> tonf // Reacción por peso propio por columna
Tu = 1.6*Rup - 0.9*Rd -> tonf // Tracción mayorada en los pernos de una columna
phiRn = 4*0.75*0.75*400 MPa*285 mm^2 -> tonf // 4 pernos φ3/4" ASTM F1554 Gr.36: φ·0.75·Fu·Ab (AISC 360 J3.6)
check Tu <= phiRn // Tracción en pernos de anclaje
"La resistencia del anclaje en el hormigón (arrancamiento del cono, extracción y desprendimiento lateral, ACI 318 Apéndice D) y el corte basal en los pernos deben verificarse aparte.
# Comparación con NCh432.Of71
qof = qNCh432Of71(hc, 2) // Presión básica a la altura de cumbrera, campo abierto (Tabla 1)
Cof = 1.2*sin(theta) - 0.4 // Factor de forma del techo de barlovento (Of71, Fig. A.9)
pOf_muro = (0.8 + 0.4)*qof -> kgf/m^2 // Presión horizontal neta en muros, Of71 (barlovento 0,8 + sotavento 0,4)
pOf_techo = Cof*qof -> kgf/m^2 // Techo de barlovento, Of71`),
      { type: 'galponCL', B: 'B', he: 'he', theta: 'theta', pmb: 'pmb', pms: 'pms', ptb: 'ptb', pts: 'pts', u: 'kgf/m^2', titulo: 'Presiones de diseño NCh432:2010 sobre el marco interior, viento normal a la cumbrera [kgf/m²] (azul: presión, rojo: succión)' },
      { type: 'table', columnas: 'Superficie = ["Muro barlovento", "Muro sotavento", "Techo barlovento", "Techo sotavento"]\n$C_p$ = [Cpb, Cps, Cptb, Cpts]\n$p$ [kgf/m²] = [pmb, pms, ptb, pts]\n$w$ marco [tonf/m] = [wmb, wms, wtb, wts]', dec: '3', titulo: 'Presiones de diseño NCh432:2010 (positivo: hacia la superficie) y cargas sobre el marco interior' },
      { type: 'plot', expr: 'qzNCh432(x m, V, 1, Iw)/(1 kgf/m^2); qzNCh432(x m, V, 2, Iw)/(1 kgf/m^2); qzNCh432(x m, V, 3, Iw)/(1 kgf/m^2); qNCh432Of71(x m, 2)/(1 kgf/m^2)', var: 'x', desde: '0', hasta: '30', puntos: '200', xlabel: 'Altura z [m]', ylabel: 'q [kgf/m²]', leyenda: true, nombres: 'qz NCh432:2010 exposición B; qz exposición C; qz exposición D; Presión básica NCh432.Of71 (campo abierto)', titulo: 'Presión por velocidad en altura (V = 35 m/s, Kd = 0,85) y presión básica de NCh432.Of71' },
      summary(),
    ],
  },
  // ===================================================================
  // 6) NCh3171 — combinaciones de carga
  // ===================================================================
  {
    id: 'cl-nch3171', pais: 'CL', cat: 'Cargas y combinaciones', icon: 'table', settings: ST,
    name: 'Combinaciones de carga NCh3171',
    normas: 'NCh3171.Of2010 Diseño estructural — Disposiciones generales y combinaciones de carga · DS60 9.1.4',
    desc: 'Combinaciones por resistencia (LRFD, sismo 1,4E) y por tensiones admisibles para una columna, con envolvente de carga axial y verificación.',
    titulo: 'Combinaciones de carga — NCh3171',
    blocks: [
      text(`# Generalidades
Combinaciones de carga de **NCh3171** para el diseño por resistencia (factores de carga y resistencia) y por tensiones admisibles. Las solicitaciones sísmicas $E$ se determinan con NCh433/NCh2369 (nivel de diseño, reducidas por $R$), por lo que en el diseño por resistencia se mayoran por **1,4** (NCh3171; DS60 9.1.4). El sismo no se combina con otras cargas eventuales (NCh433 5.2.2) y actúa con ambos signos.

**Notación:** $D$ carga permanente, $L$ sobrecarga de uso, $L_r$ sobrecarga de techo, $S$ nieve, $W$ viento, $E$ sismo. Ejemplo: carga axial en una columna de primer piso (compresión positiva).`),
      calc(`# Solicitaciones de servicio
D = 85 tonf // Carga permanente (NCh1537)
L = 28 tonf // Sobrecarga de uso (NCh1537)
Lr = 4 tonf // Sobrecarga de techo
S = 0 tonf // Nieve (NCh431)
W = 6 tonf // Viento (NCh432), ± según dirección
E = 32 tonf // Sismo (NCh433), ± según dirección
fL = 1.0 // Factor de L en las combinaciones con W y E [1.0 : General|0.5 : L0 ≤ 5 kPa, excepto estacionamientos y lugares de reunión]
Ltec = max(Lr, S) // Carga de techo dominante (Lr o S)
# Diseño por resistencia
U = [1.4*D, 1.2*D + 1.6*L + 0.5*Ltec, 1.2*D + 1.6*Ltec + fL*L, 1.2*D + 1.6*Ltec + 0.8*W, 1.2*D + 1.6*Ltec - 0.8*W, 1.2*D + 1.6*W + fL*L + 0.5*Ltec, 1.2*D - 1.6*W + fL*L + 0.5*Ltec, 1.2*D + 1.4*E + fL*L + 0.2*S, 1.2*D - 1.4*E + fL*L + 0.2*S, 0.9*D + 1.6*W, 0.9*D - 1.6*W, 0.9*D + 1.4*E, 0.9*D - 1.4*E] // Combinaciones mayoradas (NCh3171)
Pumax = max(U) // Compresión máxima mayorada
Pumin = min(U) // Mínima (tracción si es negativa)
phiPn = 260 tonf // Resistencia de diseño de la columna a compresión (del diseño del elemento)
check Pumax <= phiPn // Resistencia a compresión
check Pumin >= 0 tonf // La columna no queda en tracción
# Diseño por tensiones admisibles
Ua = [D, D + L, D + Ltec, D + 0.75*L + 0.75*Ltec, D + W, D - W, D + E, D - E, D + 0.75*W + 0.75*L + 0.75*Ltec, D + 0.75*E + 0.75*L + 0.75*S, D - 0.75*E + 0.75*L + 0.75*S, 0.6*D + W, 0.6*D - W, 0.6*D + E, 0.6*D - E] // Combinaciones de servicio (NCh3171)
Pamax = max(Ua) // Compresión máxima de servicio
Pamin = min(Ua) // Mínima de servicio
check Pamin >= 0 tonf // Sin tracción en servicio (fundación sin anclaje a tracción)`),
      { type: 'table', columnas: 'N° = 1:13\nCombinación por resistencia = ["1,4D", "1,2D + 1,6L + 0,5(Lr o S)", "1,2D + 1,6(Lr o S) + L", "1,2D + 1,6(Lr o S) + 0,8W", "1,2D + 1,6(Lr o S) − 0,8W", "1,2D + 1,6W + L + 0,5(Lr o S)", "1,2D − 1,6W + L + 0,5(Lr o S)", "1,2D + 1,4E + L + 0,2S", "1,2D − 1,4E + L + 0,2S", "0,9D + 1,6W", "0,9D − 1,6W", "0,9D + 1,4E", "0,9D − 1,4E"]\n$P_u$ [tonf] = U', dec: '2', titulo: 'Combinaciones de carga por resistencia (NCh3171; sismo según DS60 9.1.4)' },
      { type: 'table', columnas: 'N° = 1:15\nCombinación de servicio = ["D", "D + L", "D + (Lr o S)", "D + 0,75L + 0,75(Lr o S)", "D + W", "D − W", "D + E", "D − E", "D + 0,75W + 0,75L + 0,75(Lr o S)", "D + 0,75E + 0,75L + 0,75S", "D − 0,75E + 0,75L + 0,75S", "0,6D + W", "0,6D − W", "0,6D + E", "0,6D − E"]\n$P$ [tonf] = Ua', dec: '2', titulo: 'Combinaciones de carga por tensiones admisibles (NCh3171)' },
      summary(),
    ],
  },
];
