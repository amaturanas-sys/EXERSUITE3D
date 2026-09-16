"""MANCUERNA HEXAGONAL — la de goma con el peso grabado, en CAD de taller.

La mancuerna de toda la vida: dos cabezas de prisma HEXAGONAL —que es lo que
impide que ruede al dejarla en el suelo— y un mango cromado entre ellas. El peso
va escrito en la cara de fuera de cada cabeza, hundido en un recuadro.

CINCO PESOS, CINCO MODELOS. No son el mismo objeto escalado: son cinco piezas
distintas y por eso son cinco modelos, cada uno con su archivo de salida. Lo que
comparten es la fábrica, igual que la horquilla y la abrazadera.

CÓMO CRECEN. La cabeza es un prisma, así que su volumen va con A²·L: para que el
peso crezca como debe, sus tres cotas van con la RAÍZ CÚBICA del peso. Se anclan
en la mancuerna de 35 lb del catálogo de referencia —135 mm entre caras, 340 de
largo total, 130 de mango, Ø34 de agarre— y de ahí sale todo lo demás. La de 50
comprueba el resultado: le tocan 132 mm de mango en la ficha del fabricante, y
aquí el mango es de 130 para todas, que es como se fabrican de verdad.

EL MANGO NO CRECE. Una mano es una mano: los 130 mm de agarre y los Ø34 son los
mismos en la de 10 y en la de 50. Lo único que engorda son las cabezas, y por eso
la de 50 se ve corta de mango al lado de la de 10 —igual que en el estante—.

Sistema local: X es el eje del mango, Y arriba, Z el fondo. El origen, en el
centro de la mancuerna. El hexágono nace con una CARA ABAJO, que es como se
apoya: de punta rodaría, y no rodar es toda la gracia de que sea hexagonal.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

from lib.moleteado import anillos

# ── COTAS DE REFERENCIA (mm), las de la mancuerna de 35 lb ───────────────────
REF_LIBRAS = 35.0
REF_ENTRECARAS = 135.0      # 13,5 cm de cara a cara del hexágono
REF_LARGO = 340.0           # 34 cm de punta a punta
MANGO_LARGO = 130.0         # 13 cm de agarre — IGUAL para todas
# EL MANGO VA MOLETEADO, como el de una mancuerna de verdad y con el mismo
# moleteado que la barra olímpica (`lib/moleteado.py`). Paso de 4 mm, más fino
# que los 6 de la barra: una mancuerna se mira de mucho más cerca.
MOLETEADO_LARGO = 104.0     # el tramo moleteado, centrado en el mango
MOLETEADO_PASO = 4.0
MOLETEADO_HONDO = 0.3
MANGO_R = 17.0              # Ø 34
COLLAR_R = 21.0             # el ensanche donde el mango entra en la cabeza
COLLAR_LARGO = 10.0

REF_CABEZA = (REF_LARGO - MANGO_LARGO) / 2.0   # 105 mm cada cabeza

# EL RECUADRO HUNDIDO con el número, en fracciones del entrecaras.
PANEL_ANCHO = 0.62
PANEL_ALTO = 0.40
PANEL_HONDO = 3.5           # cuánto se hunde el recuadro
NUMERO_ALTO = 0.26          # el tamaño de letra, también en fracciones
NUMERO_RELIEVE = 2.0        # cuánto sobresale el número DENTRO del recuadro

LIBRAS = (10, 20, 30, 40, 50)
# 1 lb = 0,45359237 kg. El peso de verdad de la pieza lo da su volumen; esto es
# lo que dice la etiqueta, que es lo que el usuario elige.
KG_POR_LIBRA = 0.45359237


def medidas(libras: float) -> dict[str, float]:
    """Las cotas de una mancuerna de `libras`, sacadas de la de referencia.

    La raíz cúbica no es un adorno: el volumen de un prisma va con el cubo de
    sus cotas, así que es lo único que hace que una de 50 pese cinco veces lo
    que una de 10 en vez de dos veces y media.
    """
    k = (libras / REF_LIBRAS) ** (1.0 / 3.0)
    entrecaras = REF_ENTRECARAS * k
    cabeza = REF_CABEZA * k
    return {
        "k": k,
        "entrecaras": entrecaras,
        "cabeza": cabeza,
        "largo": MANGO_LARGO + 2.0 * cabeza,
        # Un hexágono regular mide entrecaras = √3 · radio de circunferencia.
        "radio": entrecaras / math.sqrt(3.0),
    }


def _hexagono(radio: float):
    """El perfil del prisma, con una CARA ABAJO para que no ruede."""
    # SIN DESFASE. Con los vértices en 0°, 60°, 120°… el hexágono tiene una
    # ARISTA arriba y otra abajo; desfasándolos 30° tendría una PUNTA, que es lo
    # que hace rodar a una mancuerna y justo lo que ser hexagonal evita.
    puntos = []
    for i in range(6):
        t = math.radians(60.0 * i)
        puntos.append((radio * math.cos(t), radio * math.sin(t)))
    return bd.Polygon(*puntos, align=None)


def _cabeza(m: dict[str, float], libras: int, lado: float):
    """Una cabeza con su recuadro hundido y el número dentro.

    `lado` es +1 o −1: la cabeza de +X o la de −X. El número se lee desde fuera
    en las dos, así que el de la cara de −X va girado media vuelta.
    """
    dentro = lado * MANGO_LARGO / 2.0
    fuera = lado * m["largo"] / 2.0
    # EL PRISMA. El hexágono se dibuja en XY y se lleva al eje X.
    prisma = bd.extrude(_hexagono(m["radio"]), amount=m["cabeza"])
    prisma = prisma.rotate(bd.Axis.Y, 90.0 * lado)
    prisma = bd.Pos(dentro, 0.0, 0.0) * prisma

    # EL RECUADRO, hundido en la cara de fuera.
    ancho = m["entrecaras"] * PANEL_ANCHO
    alto = m["entrecaras"] * PANEL_ALTO
    hueco = bd.extrude(bd.Rectangle(ancho, alto), amount=PANEL_HONDO)
    hueco = bd.Pos(fuera - lado * PANEL_HONDO / 2.0, 0.0, 0.0) * (
        bd.Rot(0.0, 90.0, 0.0) * hueco
    )
    prisma -= hueco

    # Y EL NÚMERO, en relieve DENTRO del recuadro: así el grabado se ve aunque
    # la mancuerna esté tumbada contra otra, que es como viven en el estante.
    texto = bd.Text(str(libras), font_size=m["entrecaras"] * NUMERO_ALTO)
    numero = bd.extrude(texto, amount=NUMERO_RELIEVE)
    # Se lleva a la cara: girado para que se lea DESDE FUERA en las dos cabezas.
    numero = numero.rotate(bd.Axis.Y, 90.0)
    if lado < 0:
        numero = numero.rotate(bd.Axis.X, 180.0)
    hondo = fuera - lado * PANEL_HONDO
    numero = bd.Pos(hondo, 0.0, 0.0) * numero
    return prisma + numero


def mancuerna(libras: int):
    """La pieza entera: las dos cabezas, el mango y sus dos collares."""
    m = medidas(libras)
    eje = bd.Rot(0.0, 90.0, 0.0)
    # EL MANGO, de cabeza a cabeza. Se mete un poco dentro de cada una para que
    # funda sin costura.
    pieza = eje * bd.Cylinder(radius=MANGO_R, height=MANGO_LARGO + 2.0 * COLLAR_LARGO)
    # EL MOLETEADO DEL MANGO. Se labra alrededor de Z y se gira con el mismo
    # `eje` que el mango: es una pieza de revolución y girarla no cuesta nada.
    # Queda un dedo liso a cada punta, antes de los collares, como en la de
    # verdad —el moleteado muere antes de llegar al ensanche—.
    pieza -= eje * anillos(
        MANGO_R,
        -MOLETEADO_LARGO / 2.0,
        MOLETEADO_LARGO / 2.0,
        paso=MOLETEADO_PASO,
        hondo=MOLETEADO_HONDO,
    )
    for lado in (-1.0, 1.0):
        # EL COLLAR: el ensanche donde el mango entra en la cabeza. Sin él, un
        # cilindro de Ø34 clavado en un prisma de 135 se ve pegado con saliva.
        pieza += bd.Pos(lado * MANGO_LARGO / 2.0, 0.0, 0.0) * (
            eje * bd.Cylinder(radius=COLLAR_R, height=COLLAR_LARGO * 2.0)
        )
        pieza += _cabeza(m, libras, lado)
    pieza.label = f"mancuerna_hex_{libras}lb"
    return pieza


@step(out="../STEP/mancuerna_10lb.step")
@stl(out="../STL/mancuerna_10lb.stl")
@glb(out="../GLB/mancuerna_10lb.glb")
def mancuerna_10lb():
    return mancuerna(10)


@step(out="../STEP/mancuerna_20lb.step")
@stl(out="../STL/mancuerna_20lb.stl")
@glb(out="../GLB/mancuerna_20lb.glb")
def mancuerna_20lb():
    return mancuerna(20)


@step(out="../STEP/mancuerna_30lb.step")
@stl(out="../STL/mancuerna_30lb.stl")
@glb(out="../GLB/mancuerna_30lb.glb")
def mancuerna_30lb():
    return mancuerna(30)


@step(out="../STEP/mancuerna_40lb.step")
@stl(out="../STL/mancuerna_40lb.stl")
@glb(out="../GLB/mancuerna_40lb.glb")
def mancuerna_40lb():
    return mancuerna(40)


@step(out="../STEP/mancuerna_50lb.step")
@stl(out="../STL/mancuerna_50lb.stl")
@glb(out="../GLB/mancuerna_50lb.glb")
def mancuerna_50lb():
    return mancuerna(50)


if __name__ == "__main__":
    mancuerna_10lb()
    mancuerna_20lb()
    mancuerna_30lb()
    mancuerna_40lb()
    mancuerna_50lb()
