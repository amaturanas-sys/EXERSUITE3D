"""DISCOS DE PESO «STANDARD BARBELL» — cinco libras distintas, en CAD de taller.

El disco de hierro de toda la vida: un CUBO alrededor del agujero, una LLANTA
por fuera, y entre los dos el ALMA rebajada — o, en los grandes, tres RADIOS con
sus ventanas. En la llanta va el nombre grabado en relieve, siguiendo la curva.

EL AGUJERO NO CAMBIA NUNCA. Ø50, el de la manga olímpica. Un disco que no entra
en la barra no es un disco, así que ésta es la única cota que no se toca por
mucho que el peso suba: lo demás crece a su alrededor.

DE DÓNDE SALEN LAS COTAS. De la ficha del fabricante, no de una regla inventada:

    10 lb  Ø231 × 22      25 lb  Ø281 × 35      45 lb  Ø452 × 31
    15 lb  Ø254 × 26      35 lb  Ø370 × 30

Fíjate en que NO crecen ordenadamente: la de 25 es MÁS GRUESA que la de 35, y la
de 45 apenas más que la de 35 siendo mucho más grande. Es lo que hace un
fabricante de verdad —cada molde tiene su historia— y es justo la razón de
copiar la ficha en vez de inventarse una ley.

EL RELIEVE NO ES ADORNO: ES LO QUE DA EL PESO. Maciza, la de 45 pesaría 35,4 kg
en vez de 20,4: sobra el 42 % del material. Por eso este modelo no dibuja un
rebaje «que quede bonito» y luego mide a ver qué sale — hace lo contrario:

    se PIDE el peso de catálogo y se RESUELVE el rebaje que lo consigue.

`_resuelve_alma()` despeja el espesor del alma y `_resuelve_radios()` el ángulo
de los radios. Si la cuenta pide un alma más fina de lo que se puede fundir o
unos radios imposibles, el modelo revienta en vez de exportar una pieza que
miente sobre su peso.

DOS FAMILIAS, COMO EN LA FOTO. Las de 10, 15 y 25 son macizas con las dos caras
rebajadas; las de 35 y 45 llevan TRES RADIOS y sus ventanas pasantes, que es lo
que se ve al trasluz en el catálogo y lo que explica que a la de 45 le sobre un
42 % y a la de 10 sólo un 28 %.

Sistema local: Z es el eje del disco —el que enfila la barra— y el disco se
dibuja en el plano XY. Al final se gira un cuarto de vuelta sobre X, que es el
convenio de exportación de la casa: así el GLB llega a la app con el disco de
pie, como una rueda, y el agujero mirando a los lados.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── LA FICHA DEL FABRICANTE (mm) ────────────────────────────────────────────
FICHA = {
    10: (231.0, 22.0),
    15: (254.0, 26.0),
    25: (281.0, 35.0),
    35: (370.0, 30.0),
    45: (452.0, 31.0),
}
# Cuáles llevan radios y ventanas. Las tres pequeñas son macizas.
CON_RADIOS = {35, 45}

AGUJERO = 50.0          # Ø olímpico. LA COTA QUE NO CAMBIA.
RADIOS = 3              # cuántos brazos, en las que los llevan
DENSIDAD = 7.2e-3       # hierro fundido, g/mm³
LB = 0.45359237

# Las proporciones de la silueta, en fracciones del diámetro.
CUBO = 0.22             # hasta dónde llega el cubo macizo del centro
LLANTA = 0.86           # desde dónde empieza la llanta maciza de fuera

# ── LO QUE SE PUEDE FUNDIR ──────────────────────────────────────────────────
ALMA_MIN = 8.0          # un alma más fina que esto no sale del molde
RADIO_ANCHO_MIN = 14.0  # ni un radio más estrecho que esto

# ── EL GRABADO ──────────────────────────────────────────────────────────────
MARCA = "STANDARD BARBELL"
# CUÁNTO SOBRESALE LA LETRA. 2.5 mm, que es lo que levanta una letra fundida de
# verdad. Con 1.6 la marca estaba ahí y se medía, pero sobre el hierro oscuro de
# la app no daba sombra suficiente para leerse: el relieve de un disco se ve por
# el borde iluminado, no por el color.
RELIEVE = 2.5
TEXTO_ALTO = 0.55       # el tamaño de letra, en fracciones del ancho de llanta
TEXTO_ARCO = 150.0      # cuántos grados abarca el nombre
NUMERO_ALTO = 0.72      # el número de libras, ídem


def medidas(lb: int) -> dict[str, float]:
    """Las cotas de un disco de `lb` libras, con el relieve ya resuelto."""
    d, t = FICHA[lb]
    m = {
        "lb": float(lb),
        "diametro": d,
        "espesor": t,
        "r": d / 2.0,
        "r_agujero": AGUJERO / 2.0,
        "r_cubo": CUBO * d / 2.0,
        "r_llanta": LLANTA * d / 2.0,
        "objetivo_kg": lb * LB,
        "radios": float(lb in CON_RADIOS),
    }
    # El volumen que hay que quitar para que el peso sea el de catálogo.
    macizo = math.pi / 4.0 * (d * d - AGUJERO * AGUJERO) * t
    sobra = macizo - m["objetivo_kg"] * 1000.0 / DENSIDAD
    m["macizo_kg"] = macizo * DENSIDAD / 1000.0
    m["sobra"] = sobra
    if lb in CON_RADIOS:
        m["arco_radio"] = _resuelve_radios(m, sobra)
        m["alma"] = t
    else:
        m["alma"] = _resuelve_alma(m, sobra)
        m["arco_radio"] = 0.0
    return m


def _anillo(m: dict[str, float]) -> float:
    """Área del anillo entre el cubo y la llanta: donde vive el relieve."""
    return math.pi * (m["r_llanta"] ** 2 - m["r_cubo"] ** 2)


def _resuelve_alma(m: dict[str, float], sobra: float) -> float:
    """El espesor del alma que hace que el disco pese lo que dice la ficha.

    Se rebaja el anillo por las DOS caras; lo que se quita es su área por lo que
    se adelgaza. Despejar es trivial: lo que no es trivial es acordarse de que
    el resultado tiene que poder fundirse.
    """
    alma = m["espesor"] - sobra / _anillo(m)
    if alma < ALMA_MIN:
        raise ValueError(
            f"el disco de {m['lb']:.0f} lb pediría un alma de {alma:.1f} mm para "
            f"pesar {m['objetivo_kg']:.2f} kg, y de menos de {ALMA_MIN:.0f} no "
            f"sale del molde: ese peso necesita radios, no alma rebajada"
        )
    return alma


def _resuelve_radios(m: dict[str, float], sobra: float) -> float:
    """El arco que ocupa CADA VENTANA para que el disco pese lo que debe.

    Aquí no se adelgaza nada: se cala el anillo de lado a lado y lo que decide
    el peso es cuánto anillo se queda en forma de radios.
    """
    fraccion = sobra / (_anillo(m) * m["espesor"])
    if not 0.05 < fraccion < 0.90:
        raise ValueError(
            f"el disco de {m['lb']:.0f} lb pediría calar el {fraccion * 100:.0f}% "
            f"del anillo: fuera de lo que unos radios pueden dar"
        )
    arco_ventana = 360.0 * fraccion / RADIOS
    arco_radio = 360.0 / RADIOS - arco_ventana
    # Un radio se mide por lo ESTRECHO que queda donde nace, junto al cubo.
    ancho = 2.0 * m["r_cubo"] * math.sin(math.radians(arco_radio) / 2.0)
    if ancho < RADIO_ANCHO_MIN:
        raise ValueError(
            f"los radios del disco de {m['lb']:.0f} lb saldrían de {ancho:.1f} mm "
            f"donde nacen: menos de {RADIO_ANCHO_MIN:.0f} y se parten"
        )
    return arco_radio


def _texto_curvo(
    txt: str, radio: float, alto: float, centro: float, z: float, adentro: bool = False
):
    """Letras en relieve siguiendo la curva de la llanta.

    Se coloca letra a letra girando cada una alrededor del eje: `bd.Text` sólo
    sabe escribir recto, y una marca recta sobre una llanta de 45 cm se sale del
    anillo por las puntas.

    HACIA DÓNDE MIRAN LAS LETRAS. En el arco de ARRIBA su vertical apunta hacia
    afuera y el renglón se lee derecho. En el de ABAJO, con esa misma regla, el
    renglón sale cabeza abajo —que es lo que pasaba con el número de libras—: en
    la mitad inferior la vertical tiene que apuntar al CENTRO, y por eso
    `adentro` gira cada letra media vuelta. El orden no cambia: la primera letra
    sigue yendo al extremo de menor ángulo, que es el de la izquierda en las dos
    mitades.
    """
    # EL RENGLÓN DE ABAJO SE ESCRIBE AL REVÉS. El espejo del final invierte el
    # orden del arco además de cada letra. Arriba eso es justo lo que hace falta
    # —el renglón salía de derecha a izquierda—, pero abajo, al ir el arco en el
    # otro sentido, ya estaba bien: hay que deshacerlo aquí.
    letras = [c for c in (txt[::-1] if adentro else txt)]
    paso = TEXTO_ARCO / max(1, len(letras) - 1)
    pieza = None
    for i, c in enumerate(letras):
        if c == " ":
            continue
        ang = centro - TEXTO_ARCO / 2.0 + i * paso
        cara = bd.Text(c, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        cuerpo = bd.extrude(cara, amount=RELIEVE)
        # Cada letra mira hacia fuera del centro: se gira para que su vertical
        # apunte al radio y luego se lleva a su sitio del arco.
        cuerpo = cuerpo.rotate(bd.Axis.Z, ang + 90.0 if adentro else ang - 90.0)
        x = radio * math.cos(math.radians(ang))
        y = radio * math.sin(math.radians(ang))
        cuerpo = bd.Pos(x, y, z) * cuerpo
        pieza = cuerpo if pieza is None else pieza + cuerpo
    # SE ESCRIBE AL REVÉS PARA QUE SE LEA AL DERECHO. Medido, no razonado: con
    # el renglón escrito «bien» en el CAD, el disco llega a la app con la marca
    # espejada en las dos caras —la cadena de exportación le da la vuelta a la
    # lectura al pasar de Z-arriba a Y-arriba—. Así que se espeja aquí, contra
    # el plano que contiene el eje del disco: eso invierte cada letra Y el orden
    # del arco, que es exactamente lo que hay que deshacer.
    return None if pieza is None else bd.mirror(pieza, about=bd.Plane.YZ)


def disco(lb: int):
    """La pieza entera: cubo, llanta, relieve resuelto y grabado."""
    m = medidas(lb)
    t, r = m["espesor"], m["r"]

    pieza = bd.Cylinder(radius=r, height=t)
    pieza -= bd.Cylinder(radius=m["r_agujero"], height=t + 20.0)

    if m["radios"]:
        # VENTANAS PASANTES entre radio y radio.
        arco_ventana = 360.0 / RADIOS - m["arco_radio"]
        for i in range(RADIOS):
            centro = 360.0 * i / RADIOS + m["arco_radio"] / 2.0 + arco_ventana / 2.0
            corte = bd.extrude(
                _sector(m["r_cubo"], m["r_llanta"], centro, arco_ventana),
                amount=t + 20.0,
            )
            pieza -= bd.Pos(0.0, 0.0, -(t + 20.0) / 2.0) * corte
    else:
        # LAS DOS CARAS REBAJADAS, dejando el alma resuelta en medio.
        hondo = (t - m["alma"]) / 2.0
        anillo = bd.Circle(m["r_llanta"]) - bd.Circle(m["r_cubo"])
        # Un corte por cara, cada uno sobresaliendo 10 mm por fuera del disco
        # para que la resta sea limpia y no deje caras coplanares.
        rebaje = bd.extrude(anillo, amount=hondo + 10.0)
        pieza -= bd.Pos(0.0, 0.0, t / 2.0 - hondo) * rebaje
        pieza -= bd.Pos(0.0, 0.0, -t / 2.0 - 10.0) * rebaje

    # EL GRABADO, en la cara de fuera de la llanta.
    ancho_llanta = r - m["r_llanta"]
    radio_texto = m["r_llanta"] + ancho_llanta / 2.0
    marca = _texto_curvo(MARCA, radio_texto, ancho_llanta * TEXTO_ALTO, 90.0, t / 2.0)
    numero = _texto_curvo(
        f"{lb} LB", radio_texto, ancho_llanta * NUMERO_ALTO, 270.0, t / 2.0, adentro=True
    )
    # Y EL MISMO GRABADO POR DETRÁS. Un disco enfilado en la barra se ve por las
    # dos caras, y uno con la marca sólo por delante se delata en cuanto la
    # cámara pasa al otro lado.
    #
    # SE VOLTEA EL GRABADO, NO SE ESPEJA. La tentación es espejarlo contra el
    # plano del disco (`mirror` contra XY) y parece lo mismo, pero no lo es: eso
    # deja la letra con la MISMA huella en X e Y y sólo le cambia la cara, así
    # que mirándola desde atrás se lee al revés —la pieza entera sale simétrica y
    # una de las dos caras siempre queda invertida—. Lo que hace un molde de
    # verdad es dar media vuelta al disco, y eso es un GIRO de 180° sobre un eje
    # del propio disco: cambia de cara y además invierte la X, que es justo lo
    # que hace falta para que se lea bien desde el otro lado. El giro deja arriba
    # lo de arriba y abajo lo de abajo, así que la marca sigue en la llanta alta
    # y el número en la baja.
    for relieve in (marca, numero):
        if relieve is None:
            continue
        pieza += relieve
        pieza += relieve.rotate(bd.Axis.Y, 180.0)

    # El cuarto de vuelta del convenio de exportación (ver la cabecera).
    pieza = pieza.rotate(bd.Axis.X, 90.0)
    pieza.label = f"disco_barbell_{lb}lb"
    return pieza


def _sector(r0: float, r1: float, centro: float, arco: float):
    """Un trozo de anillo, de `r0` a `r1`, centrado en `centro` y de `arco`."""
    puntos = []
    n = 24
    for i in range(n + 1):
        a = math.radians(centro - arco / 2.0 + arco * i / n)
        puntos.append((r1 * math.cos(a), r1 * math.sin(a)))
    for i in range(n + 1):
        a = math.radians(centro + arco / 2.0 - arco * i / n)
        puntos.append((r0 * math.cos(a), r0 * math.sin(a)))
    return bd.Polygon(*puntos, align=None)


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
