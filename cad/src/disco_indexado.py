"""DISCO INDEXADO — el seguro que clava un brazo que pivota, en CAD de taller.

Lo que en las jaulas de verdad va junto al pivote de un brazo articulado: un
disco con una CORONA DE AGUJEROS alrededor de su centro. El brazo lleva un solo
taladro a esa misma distancia del eje, y un pin lo atraviesa y entra en el
agujero del disco que toque. El brazo queda clavado en ese ángulo. Es el mismo
gesto que el selector de una pila de pesos, aplicado a un giro en vez de a una
altura.

CÓMO REPARTE LOS ÁNGULOS. El disco no da cualquier ángulo: da los que sus
agujeros permiten. Con `AGUJEROS` repartidos en la vuelta entera, el paso es
360/N — con 24, quince grados—. Subirlo afina el ajuste y debilita el disco:
entre agujero y agujero tiene que quedar acero, y la cuenta está abajo, en
`PUENTE`, que avisa si se queda corto.

EL DISCO ES LA PIEZA QUIETA: va soldado a la horquilla o al soporte, y el brazo
gira por delante. Por eso su taladro central es el del pasador, no un eje
propio: se ensarta en el MISMO pasador que hace de pivote, y así no hay que
alinear nada.

Sistema local: el del pasador y el de la horquilla, para que las tres piezas
caigan juntas —X ES EL EJE DEL PASADOR, el disco vive en el plano YZ—.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
DIAMETRO = 200.0        # el disco entero
ESPESOR = 8.0           # chapa, como la de la horquilla
EJE_R = 13.0            # el taladro central: el pasador de 25 con su holgura
AGUJEROS = 24           # posiciones en la vuelta -> 15° de paso
CORONA_R = 82.0         # a qué distancia del eje está la corona
SEGURO_R = 6.5          # los agujeros de la corona: pin de 12 con holgura

PASO_GRADOS = 360.0 / AGUJEROS
# Acero entre dos agujeros consecutivos, medido de borde a borde por la corona.
PUENTE = 2.0 * CORONA_R * math.sin(math.pi / AGUJEROS) - 2.0 * SEGURO_R
# Y del agujero al canto del disco.
CANTO = DIAMETRO / 2.0 - CORONA_R - SEGURO_R

if PUENTE < SEGURO_R:
    raise ValueError(
        f"quedan {PUENTE:.1f} mm de acero entre agujeros, menos que su propio "
        f"radio: baja AGUJEROS o sube CORONA_R"
    )
if CANTO < SEGURO_R:
    raise ValueError(f"quedan {CANTO:.1f} mm del agujero al canto: sube DIAMETRO")


@step(out="../STEP/disco_indexado.step")
@stl(out="../STL/disco_indexado.stl")
@glb(out="../GLB/disco_indexado.glb")
def disco_indexado():
    with bd.BuildPart() as disco:
        with bd.BuildSketch(bd.Plane.XY):
            bd.Circle(DIAMETRO / 2.0)
            bd.Circle(EJE_R, mode=bd.Mode.SUBTRACT)
            # LA CORONA, repartida en la vuelta entera.
            with bd.PolarLocations(CORONA_R, AGUJEROS):
                bd.Circle(SEGURO_R, mode=bd.Mode.SUBTRACT)
        bd.extrude(amount=ESPESOR)

    # El disco nace en XY con su eje en Z; un cuarto de vuelta sobre Y pone ese
    # eje en X, que es el del pasador y el de la horquilla.
    part = disco.part.rotate(bd.Axis.Y, 90.0)
    part.label = f"disco_indexado_{AGUJEROS}_posiciones"
    return part


if __name__ == "__main__":
    disco_indexado()
