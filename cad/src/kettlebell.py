"""KETTLEBELL — la pesa rusa, en CAD de taller.

Una bola de hierro con la base rebajada para que se quede quieta, y un asa de
arco por la que se agarra. El peso va grabado en una cara plana mecanizada en el
costado.

SIETE PESOS, SIETE MODELOS, como las mancuernas: no son la misma pieza escalada.

DE DÓNDE SALEN LAS COTAS. No de una regla inventada: de la TABLA DE UN
FABRICANTE, la del despiece con las cuatro cotas A/B/C/D para 4, 8, 12, 16, 20 y
24 kg. Sobre esos seis puntos se ajusta, para cada cota, una recta en la RAÍZ
CÚBICA del peso —que es como tiene que ir, porque el peso va con el volumen— y
el ajuste cae encima de la tabla:

    C (Ø de la bola)   71,300·∛kg − 21,664   →  4:91/89  12:142/142  24:184/184
    A (ancho del asa)  25,008·∛kg + 161,985  →  4:202/201  16:225/225
    D (Ø del agarre)    7,059·∛kg +  15,839  →  8:30/30  16:34/33

El término independiente de C no es un parche: es la parte del peso que NO está
en la bola —el asa, que pesa casi lo mismo en todas—, y por eso una kettlebell
pequeña tiene la bola más chica de lo que el cubo diría.

EL ASA DEJA DE CRECER, Y ESO LO DICE LA PROPIA TABLA. De 4 a 24 kg la bola pasa
de Ø89 a Ø184 —más del doble— mientras el asa se mueve de 201 a 230 y se planta
ahí, y el agarre de Ø29 a Ø35 y se planta también. Una mano es una mano. Aquí se
recogen esos dos techos —`TOPE_ANCHO` y `TOPE_AGARRE_D`, los dos valores donde la
tabla se aplana— y el hueco de la mano se deja CONSTANTE, porque medido desde la
corona de la bola la tabla lo da entre 53 y 59 mm en todo su recorrido. Resultado:
de 25 kg en adelante el asa es EXACTAMENTE LA MISMA PIEZA y sólo engorda la bola,
que es lo que se ve en el estante.

EL ASA ES UN BARRIDO, no tres cilindros pegados. Su camino tiene tres puntos por
lado —el arranque sobre el hombro de la bola, el CODO ANCHO donde el asa saca su
mayor anchura, y la esquina del travesaño—, porque esa panza es justo lo que
hace que el asa mida más de ancho que la bola en las pesas pequeñas. Pegando
cilindros quedarían aristas vivas donde va la mano.

Sistema local: X de un codo al otro, Y el fondo, Z arriba. El origen queda en la
BASE, así que la pesa se apoya en z = 0.

LOS EJES QUE SALEN AL GLB. glTF es Y-arriba y el convenio de exportación manda el
Z de aquí al alto del otro lado. Como esta pieza ya se dibuja con Z arriba, sale
derecha sin girar nada: no necesita `orientacion` en la biblioteca.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── LAS TRES LEYES, ajustadas a la tabla del fabricante (mm) ────────────────
BOLA_P, BOLA_Q = 71.2999, -21.6644      # C: el Ø de la bola
ASA_P, ASA_Q = 25.0076, 161.9848        # A: el ancho total del asa
AGARRE_P, AGARRE_Q = 7.0590, 15.8389    # D: el Ø del tubo del agarre

# ── LOS DOS TECHOS, donde la tabla se aplana ────────────────────────────────
TOPE_ANCHO = 230.0          # A no pasa de aquí: es lo que la tabla hace en 20 kg
TOPE_AGARRE_D = 35.0        # D tampoco

# EL HUECO DE LA MANO, medido desde la CORONA de la bola —que es lo que los
# dedos encuentran— y no desde el hombro. La tabla lo da entre 53 y 59 mm de 4 a
# 24 kg, así que aquí es constante: ya estaba en su meseta ergonómica.
VENTANA_H = 57.0

# EL TRAVESAÑO es más estrecho que el ancho total: la diferencia es la panza de
# los codos, que es de donde sale la cota A del despiece.
TRAVESANO = 0.78            # en fracciones del ancho total
RAIZ_ASA = 0.55             # dónde nacen las patas, en fracciones del radio
FLECHA = 0.55               # a qué altura queda el codo ancho, entre raíz y arco
EMBEBIDO = 18.0             # cuánto se meten las patas dentro de la bola
CORTE_BASE = 0.065          # cuánto se rebana la bola por debajo, en fracciones de R

# ── LA CARA DEL GRABADO ─────────────────────────────────────────────────────
CHAPA_R = 0.42              # el radio de la cara plana, en fracciones de R
CHAPA_PROF = 6.0            # cuánto se hunde
NUMERO_ALTO = 0.42          # el tamaño del número, en fracciones del radio de la cara
NUMERO_RELIEVE = 3.0
KG_ALTO = 0.20

PESOS = (10, 15, 20, 25, 35, 45, 55)


def medidas(kg: float) -> dict[str, float]:
    """Las cuatro cotas del despiece para `kg`, con los techos ya aplicados.

    `topada` cuenta cuántas cotas del asa han llegado a su techo: es lo que hace
    visible la regla sin tener que medir la pieza.
    """
    r3 = kg ** (1.0 / 3.0)
    bola_d = BOLA_P * r3 + BOLA_Q
    ancho_crudo = ASA_P * r3 + ASA_Q
    agarre_crudo = AGARRE_P * r3 + AGARRE_Q
    ancho = min(ancho_crudo, TOPE_ANCHO)
    agarre_d = min(agarre_crudo, TOPE_AGARRE_D)
    return {
        "bola_d": bola_d,
        "bola_r": bola_d / 2.0,
        "ancho": ancho,
        "agarre_d": agarre_d,
        "agarre_r": agarre_d / 2.0,
        "ventana_h": VENTANA_H,
        "topada": float(
            (1 if ancho_crudo > TOPE_ANCHO - 1e-9 else 0)
            + (1 if agarre_crudo > TOPE_AGARRE_D - 1e-9 else 0)
        ),
    }


def _puntos(m: dict[str, float]) -> tuple[list[tuple[float, float, float]], float]:
    """El camino del asa y el radio de sus codos.

    Tres puntos por lado: la raíz sobre el hombro de la bola, el codo ancho —que
    es donde el asa saca la cota A— y la esquina del travesaño.
    """
    R = m["bola_r"]
    r = m["agarre_r"]
    zc = R * (1.0 - CORTE_BASE)            # centro de la bola; la base en z = 0
    corona = zc + R

    x_raiz = RAIZ_ASA * R
    z_raiz = zc + math.sqrt(max(R * R - x_raiz * x_raiz, 1.0)) - EMBEBIDO
    x_codo = m["ancho"] / 2.0 - r          # el eje del tubo en su punto más ancho
    x_trav = TRAVESANO * m["ancho"] / 2.0 - r
    z_arco = corona + m["ventana_h"] + r
    z_codo = z_raiz + FLECHA * (z_arco - z_raiz)

    pts = [
        (-x_raiz, 0.0, z_raiz), (-x_codo, 0.0, z_codo), (-x_trav, 0.0, z_arco),
        (x_trav, 0.0, z_arco), (x_codo, 0.0, z_codo), (x_raiz, 0.0, z_raiz),
    ]
    # EL RADIO DE LOS CODOS lo manda el tramo más corto: dos redondeos sobre un
    # mismo tramo no pueden comerse más que él, y un radio menor que el propio
    # tubo saca un barrido retorcido en vez de un arco.
    tramos = [
        math.dist(pts[i][::2], pts[i + 1][::2]) for i in range(len(pts) - 1)
    ]
    codo = min(0.38 * min(tramos), 70.0)
    return pts, codo


def _comprueba(m: dict[str, float], kg: float) -> None:
    """Guardián de lo que este modelo puede romper sin que se vea en el render."""
    pts, codo = _puntos(m)
    r = m["agarre_r"]
    R = m["bola_r"]
    if codo < r * 1.05:
        raise ValueError(
            f"en la de {kg:g} kg el codo del asa sale de {codo:.1f} mm para un "
            f"tubo de {r:.1f} de radio: el barrido se retuerce en la esquina"
        )
    x_raiz = abs(pts[0][0])
    if x_raiz > R - r:
        raise ValueError(
            f"en la de {kg:g} kg las patas nacen a {x_raiz:.1f} del eje y la bola "
            f"mide {R:.1f} de radio: el asa no llegaría a tocarla"
        )
    if NUMERO_RELIEVE >= CHAPA_PROF:
        raise ValueError("el grabado sobresaldría de la cara en la que va hundido")


def _asa(m: dict[str, float]):
    """El arco, barrido de verdad: una sección circular a lo largo del camino."""
    pts, codo = _puntos(m)
    camino = bd.FilletPolyline(*pts, radius=codo)
    perfil = bd.Plane(origin=camino @ 0, z_dir=camino % 0) * bd.Circle(m["agarre_r"])
    return bd.sweep(perfil, path=camino)


def _grabado(m: dict[str, float], zc: float, kg: int):
    """La cara plana del costado y el peso escrito dentro.

    Va HUNDIDA y el número en relieve dentro de ella: así el grabado sobrevive a
    que la pesa se deje caer de canto, que es como viven en el suelo del gimnasio.
    """
    R = m["bola_r"]
    cara_r = R * CHAPA_R
    y_cara = -(R - CHAPA_PROF)
    eje_y = bd.Rot(90.0, 0.0, 0.0)
    hueco = bd.Pos(0.0, (y_cara - 2.0 * R) / 2.0, zc) * (
        eje_y * bd.Cylinder(radius=cara_r, height=2.0 * R - abs(y_cara))
    )

    def letras(txt: str, alto: float, dz: float):
        t = bd.Text(txt, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        s = bd.extrude(t, amount=NUMERO_RELIEVE)
        # El texto nace mirando a +Z; este cuarto de vuelta lo pone mirando a −Y,
        # que es hacia donde da la cara, y de paso manda el relieve hacia fuera.
        s = s.rotate(bd.Axis.X, 90.0)
        return bd.Pos(0.0, y_cara, zc + dz) * s

    marca = letras(str(kg), cara_r * NUMERO_ALTO, cara_r * 0.16)
    marca += letras("KG", cara_r * KG_ALTO, -cara_r * 0.42)
    return hueco, marca


def kettlebell(kg: int):
    """La pieza entera: bola rebanada por la base, asa y grabado."""
    m = medidas(kg)
    _comprueba(m, kg)
    R = m["bola_r"]
    zc = R * (1.0 - CORTE_BASE)
    pieza = bd.Pos(0.0, 0.0, zc) * bd.Sphere(R)
    # La base plana: se rebana el casquete de abajo justo en z = 0, que es lo que
    # le da la cara con la que se queda quieta en el suelo.
    pieza -= bd.Pos(0.0, 0.0, -2.0 * R) * bd.Box(6.0 * R, 6.0 * R, 4.0 * R)

    hueco, marca = _grabado(m, zc, kg)
    pieza -= hueco
    pieza += marca
    pieza += _asa(m)
    pieza.label = f"kettlebell_{kg}kg"
    return pieza


@step(out="../STEP/kettlebell_10kg.step")
@stl(out="../STL/kettlebell_10kg.stl")
@glb(out="../GLB/kettlebell_10kg.glb")
def kettlebell_10kg():
    return kettlebell(10)


@step(out="../STEP/kettlebell_15kg.step")
@stl(out="../STL/kettlebell_15kg.stl")
@glb(out="../GLB/kettlebell_15kg.glb")
def kettlebell_15kg():
    return kettlebell(15)


@step(out="../STEP/kettlebell_20kg.step")
@stl(out="../STL/kettlebell_20kg.stl")
@glb(out="../GLB/kettlebell_20kg.glb")
def kettlebell_20kg():
    return kettlebell(20)


@step(out="../STEP/kettlebell_25kg.step")
@stl(out="../STL/kettlebell_25kg.stl")
@glb(out="../GLB/kettlebell_25kg.glb")
def kettlebell_25kg():
    return kettlebell(25)


@step(out="../STEP/kettlebell_35kg.step")
@stl(out="../STL/kettlebell_35kg.stl")
@glb(out="../GLB/kettlebell_35kg.glb")
def kettlebell_35kg():
    return kettlebell(35)


@step(out="../STEP/kettlebell_45kg.step")
@stl(out="../STL/kettlebell_45kg.stl")
@glb(out="../GLB/kettlebell_45kg.glb")
def kettlebell_45kg():
    return kettlebell(45)


@step(out="../STEP/kettlebell_55kg.step")
@stl(out="../STL/kettlebell_55kg.stl")
@glb(out="../GLB/kettlebell_55kg.glb")
def kettlebell_55kg():
    return kettlebell(55)


if __name__ == "__main__":
    kettlebell_10kg()
    kettlebell_15kg()
    kettlebell_20kg()
    kettlebell_25kg()
    kettlebell_35kg()
    kettlebell_45kg()
    kettlebell_55kg()
