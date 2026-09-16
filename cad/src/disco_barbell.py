"""DISCOS DE PESO «STANDARD BARBELL» — cinco libras distintas, en CAD de taller.

Copiados de dos referencias del fabricante: la foto del juego completo tirado en
el suelo y la ficha «PRODUCT DETAILS · Olympic Weight Plate Specifications».

CÓMO ES EL DISCO DE VERDAD, según esas fotos:

    · un CUBO redondo alrededor del agujero, en relieve;
    · una LLANTA ancha por fuera, del grueso entero;
    · entre los dos, CUATRO CUARTELES REBAJADOS separados por una CRUZ de
      cuatro radios rectos a 45°… pero sólo en los discos grandes: los chicos
      no llevan cruz, sólo un anillo rebajado;
    · en la llanta, «BARBELL» arriba y «STANDARD» abajo, y —ojo— TODAS las
      letras miran hacia AFUERA, así que la de abajo se lee del revés. No es un
      error: es como sale del molde y es como se ve en la foto;
    · las libras y los kilos, en dos renglones rectos, uno en el cuartel de la
      izquierda y otro en el de la derecha.

DE DÓNDE SALEN LAS COTAS. De la tabla del fabricante, que va en kilos:

    1.25 kg  Ø160 × 11        10 kg  Ø270 × 30        25 kg  Ø445 × 35
    2.5  kg  Ø200 × 16        15 kg  Ø347 × 32
    5    kg  Ø225 × 25        20 kg  Ø445 × 35

El juego que pide la herramienta va en LIBRAS, así que cada disco se sitúa en esa
tabla por su masa y se interpola entre las dos filas que lo abrazan. El de 45 lb
cae justo en la fila de 20 kg —Ø445 × 35—, que es exactamente el disco rotulado
«45 LBS · 20.4 KGS» de la ficha: la interpolación no se inventa ese, lo acierta.

EL AGUJERO NO CAMBIA NUNCA. Ø50, el de la manga olímpica, y la tabla lo repite
en las siete filas. Un disco que no entra en la barra no es un disco, así que
ésta es la única cota que no se toca por mucho que el peso suba.

EL REBAJE NO ES ADORNO: ES LO QUE DA EL PESO. Macizo, el de 45 lb pesaría 38.7
kg en vez de 20.4: sobra casi la mitad del material. Por eso este modelo no
dibuja un rebaje «que quede bonito» y luego mide a ver qué sale — hace lo
contrario:

    se PIDE el peso de catálogo y se RESUELVE la hondura del rebaje.

`medidas()` despeja cuánto hay que ahondar los cuarteles por cada cara para que
la pieza pese lo que dice la etiqueta, y revienta si eso dejara un alma más fina
de lo que se puede fundir, en vez de exportar una pieza que miente sobre su peso.

Sistema local: Z es el eje del disco —el que enfila la barra— y el disco se
dibuja en el plano XY. Al final se gira un cuarto de vuelta sobre X, que es el
convenio de exportación de la casa: así el GLB llega a la app con el disco de
pie, como una rueda, y el agujero mirando a los lados.
"""

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── LA FICHA DEL FABRICANTE ─────────────────────────────────────────────────
# kg → (Ø mm, canto mm). El agujero es Ø50 en todas las filas.
FICHA_KG = [
    (1.25, 160.0, 11.0),
    (2.50, 200.0, 16.0),
    (5.00, 225.0, 25.0),
    (10.0, 270.0, 30.0),
    (15.0, 347.0, 32.0),
    (20.0, 445.0, 35.0),
    (25.0, 445.0, 35.0),
]
LIBRA = 0.45359237      # kg por libra
LIBRAS = [10, 15, 25, 35, 45]

# ── LA PIEZA ────────────────────────────────────────────────────────────────
AGUJERO = 50.0          # Ø olímpico. LA COTA QUE NO CAMBIA.
DENSIDAD = 7.2e-3       # g/mm³, hierro fundido
CRUZ_DESDE = 15.0       # kg: de aquí arriba, la cruz de cuatro radios
RADIOS = 4
CUBO_FRAC = 0.20        # radio del cubo, en fracción del radio del disco
CUBO_PARED = 18.0       # …pero nunca menos que esta pared alrededor del agujero
LLANTA_FRAC = 0.83     # radio interior de la llanta, ídem
RADIO_FRAC = 0.13       # ancho de cada radio de la cruz, ídem
RADIO_MIN = 14.0
ALMA_MIN = 4.0          # lo más fino que se puede dejar el fondo del cuartel

# ── EL GRABADO ──────────────────────────────────────────────────────────────
MARCA_ARRIBA = "BARBELL"
MARCA_ABAJO = "STANDARD"
# CUÁNTO SOBRESALE LA LETRA. 2.5 mm, que es lo que levanta una letra fundida de
# verdad. Con menos la marca está y se mide, pero sobre el hierro oscuro de la
# app no da sombra suficiente para leerse: el relieve de un disco se ve por el
# borde iluminado, no por el color.
RELIEVE = 2.5
TEXTO_ALTO = 0.62       # alto de letra, en fracción del ancho de llanta
PASO_LETRA = 1.20       # separación entre letras, en anchos de letra
NUMERO_ALTO = 0.21      # alto del número, en fracción del ancho del cuartel
NUMERO_SEP = 1.25       # separación entre los dos renglones, en altos de letra


def cotas(lb: int) -> tuple[float, float, float]:
    """Diámetro, canto y masa de un disco de `lb` libras, según la ficha.

    Se entra en la tabla POR LA MASA y se interpola entre las dos filas que la
    abrazan. Fuera de la tabla se toma la fila del extremo: la ficha se acaba en
    25 kg y no hay nada que extrapolar.
    """
    kg = lb * LIBRA
    if kg <= FICHA_KG[0][0]:
        return FICHA_KG[0][1], FICHA_KG[0][2], kg
    for (k0, d0, t0), (k1, d1, t1) in zip(FICHA_KG, FICHA_KG[1:]):
        if kg <= k1:
            f = (kg - k0) / (k1 - k0)
            return d0 + f * (d1 - d0), t0 + f * (t1 - t0), kg
    return FICHA_KG[-1][1], FICHA_KG[-1][2], kg


def medidas(lb: int) -> dict:
    """Todas las cotas de un disco, con la hondura del rebaje YA RESUELTA."""
    diametro, espesor, kg = cotas(lb)
    r = diametro / 2.0
    r_agujero = AGUJERO / 2.0
    r_cubo = max(CUBO_FRAC * r, r_agujero + CUBO_PARED)
    r_llanta = LLANTA_FRAC * r
    radios = RADIOS if kg >= CRUZ_DESDE else 0
    ancho_radio = max(RADIO_FRAC * r, RADIO_MIN)

    if r_llanta - r_cubo < 3.0 * ALMA_MIN:
        raise ValueError(
            f"el disco de {lb} lb no deja anillo donde rebajar: cubo hasta "
            f"{r_cubo:.1f} y llanta desde {r_llanta:.1f}"
        )

    # EL ÁREA QUE SE REBAJA: el anillo entre cubo y llanta, menos lo que se
    # llevan los radios. Un radio es una barra recta que cruza el anillo, así
    # que su parte dentro del anillo es ancho × largo del tramo.
    anillo = math.pi * (r_llanta**2 - r_cubo**2)
    area = anillo - radios * ancho_radio * (r_llanta - r_cubo)

    # LO QUE HAY QUE QUITAR. Macizo con el agujero hecho, menos lo que debe
    # pesar. Se reparte a partes iguales entre las dos caras.
    macizo = math.pi * (r**2 - r_agujero**2) * espesor
    objetivo = (kg * 1000.0) / DENSIDAD
    hondo = (macizo - objetivo) / (2.0 * area)

    if hondo <= 0.0:
        raise ValueError(
            f"el disco de {lb} lb ya pesa {macizo * DENSIDAD / 1000:.2f} kg macizo "
            f"y la etiqueta pide {kg:.2f}: no hay nada que rebajar"
        )
    if espesor - 2.0 * hondo < ALMA_MIN:
        raise ValueError(
            f"el disco de {lb} lb pide rebajar {hondo:.1f} mm por cara sobre "
            f"{espesor:.1f} de canto: el fondo quedaría en "
            f"{espesor - 2 * hondo:.1f} mm y no se funde por debajo de {ALMA_MIN}"
        )

    return {
        "lb": lb,
        "kg": kg,
        "r": r,
        "espesor": espesor,
        "r_agujero": r_agujero,
        "r_cubo": r_cubo,
        "r_llanta": r_llanta,
        "radios": radios,
        "ancho_radio": ancho_radio,
        "hondo": hondo,
        "alma": espesor - 2.0 * hondo,
    }


# ── EL GRABADO ──────────────────────────────────────────────────────────────
#
# EL RENGLÓN VA AL REVÉS, LAS LETRAS NO. Medido con una probeta, no razonado:
# se exportaron cuatro tratamientos del mismo renglón a cuatro radios de un
# mismo disco —crudo, espejando el conjunto, espejando cada letra, y con el
# orden invertido— y se miraron en la app. El veredicto fue que las LETRAS
# llegan bien —una «G» es una «G»— y que lo único torcido es el ORDEN: escrito
# «FG» se lee «GF».
#
# Es lo que tiene dibujar sobre un círculo: el ángulo crece hacia la izquierda,
# así que un renglón que se lee de izquierda a derecha por arriba va de ángulo
# MAYOR a MENOR. Escribir hacia ángulos crecientes, que es lo natural en un
# bucle, sale del derecho pero al revés de como se lee.
#
# Nada de espejos, por tanto: sólo se recorre el renglón hacia atrás.


def _texto_curvo(txt: str, radio: float, alto: float, centro: float, z: float):
    """Letras en relieve siguiendo la curva de la llanta.

    Se coloca letra a letra girando cada una alrededor del eje: `bd.Text` sólo
    sabe escribir recto, y una marca recta sobre una llanta de 44 cm se sale del
    anillo por las puntas.

    TODAS LAS LETRAS MIRAN HACIA AFUERA, sin excepción — es lo que hace el molde
    y es por lo que en la foto el «STANDARD» de abajo se lee del revés.
    """
    letras = [c for c in txt]
    paso = math.degrees(PASO_LETRA * alto / radio)
    arco = paso * max(1, len(letras) - 1)
    pieza = None
    for i, c in enumerate(letras):
        if c == " ":
            continue
        # De ángulo MAYOR a MENOR: así el renglón se lee de izquierda a derecha.
        ang = centro + arco / 2.0 - i * paso
        cara = bd.Text(c, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        cuerpo = bd.extrude(cara, amount=RELIEVE)
        # Su vertical apunta al radio, y luego a su sitio del arco.
        cuerpo = cuerpo.rotate(bd.Axis.Z, ang - 90.0)
        x = radio * math.cos(math.radians(ang))
        y = radio * math.sin(math.radians(ang))
        cuerpo = bd.Pos(x, y, z) * cuerpo
        pieza = cuerpo if pieza is None else pieza + cuerpo
    return pieza


def _texto_recto(lineas: list[str], x: float, z: float, alto: float):
    """Dos renglones rectos, centrados en (`x`, 0), sobre el fondo del cuartel.

    Aquí no hay arco, así que no hay nada que invertir: un renglón recto llega a
    la app tal cual (ver la nota de arriba).
    """
    sep = NUMERO_SEP * alto
    pieza = None
    for i, linea in enumerate(lineas):
        y = ((len(lineas) - 1) / 2.0 - i) * sep
        cara = bd.Text(linea, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        cuerpo = bd.extrude(cara, amount=RELIEVE)
        cuerpo = bd.Pos(x, y, z) * cuerpo
        pieza = cuerpo if pieza is None else pieza + cuerpo
    return pieza


def disco(lb: int):
    """La pieza entera: cubo, cruz, llanta, rebaje resuelto y grabado."""
    m = medidas(lb)
    t, r = m["espesor"], m["r"]

    pieza = bd.Cylinder(radius=r, height=t)
    pieza -= bd.Cylinder(radius=m["r_agujero"], height=t + 20.0)

    # LOS CUARTELES. El anillo entre cubo y llanta, menos la cruz. Una barra es
    # simétrica respecto del centro, así que dos barras hacen los cuatro radios.
    zona = bd.Circle(m["r_llanta"]) - bd.Circle(m["r_cubo"])
    for i in range(m["radios"] // 2):
        ang = 45.0 + 90.0 * i
        zona -= bd.Rot(0.0, 0.0, ang - 90.0) * bd.Rectangle(m["ancho_radio"], 2.2 * r)

    # Un corte por cara, cada uno sobresaliendo 10 mm por fuera del disco para
    # que la resta sea limpia y no deje caras coplanares.
    hondo = m["hondo"]
    corte = bd.extrude(zona, amount=hondo + 10.0)
    pieza -= bd.Pos(0.0, 0.0, t / 2.0 - hondo) * corte
    pieza -= bd.Pos(0.0, 0.0, -t / 2.0 - 10.0) * corte

    # LA MARCA, en la llanta: «BARBELL» arriba y «STANDARD» abajo.
    ancho_llanta = r - m["r_llanta"]
    radio_texto = m["r_llanta"] + ancho_llanta / 2.0
    alto = ancho_llanta * TEXTO_ALTO
    textos = [
        _texto_curvo(MARCA_ARRIBA, radio_texto, alto, 90.0, t / 2.0),
        _texto_curvo(MARCA_ABAJO, radio_texto, alto, 270.0, t / 2.0),
    ]

    # LAS CIFRAS. En los discos con cruz van rectas, en dos renglones, dentro de
    # los cuarteles de los lados y apoyadas en su fondo —como en la foto—. En
    # los chicos no hay cuartel donde meterlas: van en la llanta, curvadas, y el
    # renglón de texto da la vuelta entera al disco.
    fondo = t / 2.0 - hondo
    kg = f"{m['kg']:.1f}"
    if m["radios"]:
        ancho_cuartel = m["r_llanta"] - m["r_cubo"]
        medio = (m["r_llanta"] + m["r_cubo"]) / 2.0
        alto_num = ancho_cuartel * NUMERO_ALTO
        textos.append(_texto_recto([str(lb), "LBS"], -medio, fondo, alto_num))
        textos.append(_texto_recto([kg, "KGS"], medio, fondo, alto_num))
    else:
        textos.append(_texto_curvo(f"{lb} LBS", radio_texto, alto, 180.0, t / 2.0))
        textos.append(_texto_curvo(f"{kg} KGS", radio_texto, alto, 0.0, t / 2.0))

    # EL MISMO GRABADO POR DETRÁS. Un disco enfilado en la barra se ve por las
    # dos caras, y uno con la marca sólo por delante se delata en cuanto la
    # cámara pasa al otro lado.
    #
    # SE VOLTEA, NO SE ESPEJA. La tentación es espejar contra el plano del disco
    # y parece lo mismo, pero no lo es: eso deja la letra con la MISMA huella en
    # X e Y y sólo le cambia la cara, así que mirándola desde atrás se lee al
    # revés. Lo que hace un molde de verdad es dar media vuelta al disco, y eso
    # es un GIRO de 180° sobre un eje del propio disco: cambia de cara y además
    # invierte la X. El giro deja arriba lo de arriba y abajo lo de abajo, así
    # que «BARBELL» sigue en la llanta alta y «STANDARD» en la baja; las cifras
    # sí cambian de lado, que es lo que pasa al voltear un disco de verdad.
    for relieve in textos:
        if relieve is None:
            continue
        pieza += relieve
        pieza += relieve.rotate(bd.Axis.Y, 180.0)

    # El cuarto de vuelta del convenio de exportación (ver la cabecera).
    pieza = pieza.rotate(bd.Axis.X, 90.0)
    pieza.label = f"disco_barbell_{lb}lb"
    return pieza


@step(out="../STEP/disco_barbell_10lb.step")
@stl(out="../STL/disco_barbell_10lb.stl")
@glb(out="../GLB/disco_barbell_10lb.glb")
def disco_barbell_10lb():
    return disco(10)


@step(out="../STEP/disco_barbell_15lb.step")
@stl(out="../STL/disco_barbell_15lb.stl")
@glb(out="../GLB/disco_barbell_15lb.glb")
def disco_barbell_15lb():
    return disco(15)


@step(out="../STEP/disco_barbell_25lb.step")
@stl(out="../STL/disco_barbell_25lb.stl")
@glb(out="../GLB/disco_barbell_25lb.glb")
def disco_barbell_25lb():
    return disco(25)


@step(out="../STEP/disco_barbell_35lb.step")
@stl(out="../STL/disco_barbell_35lb.stl")
@glb(out="../GLB/disco_barbell_35lb.glb")
def disco_barbell_35lb():
    return disco(35)


@step(out="../STEP/disco_barbell_45lb.step")
@stl(out="../STL/disco_barbell_45lb.stl")
@glb(out="../GLB/disco_barbell_45lb.glb")
def disco_barbell_45lb():
    return disco(45)


if __name__ == "__main__":
    disco_barbell_10lb()
    disco_barbell_15lb()
    disco_barbell_25lb()
    disco_barbell_35lb()
    disco_barbell_45lb()
