"""AGARRE EN D SIMPLE (una mano) — accesorio ergonómico, en CAD.

El estribo que se engancha a un cable para trabajar un brazo solo. Es la pieza
PLANA de la familia: todo —varilla y chapa— vive en un mismo plano, y por eso
cuelga de canto y la mano entra por el hueco sin que nada estorbe.

  · Una VARILLA doblada en D: el tramo recto de abajo es el mango, sube por los
    dos costados y converge arriba. Los dobleces son achaflanados, no en ángulo
    recto: la mano roza ese canto al tirar.
  · Arriba, la misma PLACA a dos aguas del agarre doble, con el agujero del
    mosquetón cerca de la cumbre, soldada entre las dos puntas de la varilla.
  · Abajo, la FUNDA de goma sobre el mango, con un COLLAR cromado en cada punta
    que la sujeta —ahí es donde la pieza real enseña el tope de la mano—.

A diferencia del doble, aquí NO hay nada cruzando: la D es una sola curva
cerrada sobre el plano XY.

Sistema local: X a lo largo del mango, Y arriba, Z el grueso. El origen, en el
centro del mango.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from lib.tubos import varilla

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
TUBO_R = 8.0            # la varilla del estribo

MANGO_SEMI = 70.0       # medio mango, de eje a eje del doblez
CHAFLAN = 12.0          # cuánto se come el doblez del tramo recto
HOMBRO_Y = 32.0         # altura a la que el costado ya sube derecho

FUNDA_R = 15.0
FUNDA_LARGO = 94.0
COLLAR_R = 12.5         # el tope cromado de cada punta de la funda
COLLAR_LARGO = 9.0

# LA PLACA a dos aguas, la misma familia que el agarre doble.
PLACA_BAJO = 118.0
PLACA_ALTO = 168.0
PLACA_SEMI_BAJO = 46.0
PLACA_SEMI_ALTO = 26.0
PLACA_ESPESOR = 9.0
AGUJERO_R = 9.0
AGUJERO_Y = 152.0

# Las dos puntas de la varilla mueren dentro de las esquinas bajas de la placa.
ESQUINA_X = PLACA_SEMI_BAJO - TUBO_R
ESQUINA_Y = PLACA_BAJO + TUBO_R * 0.5


def _estribo():
    """La D: una sola varilla doblada, de punta a punta por el mango."""
    return varilla(
        [
            (-ESQUINA_X, ESQUINA_Y, 0.0),
            (-MANGO_SEMI, HOMBRO_Y, 0.0),
            (-MANGO_SEMI + CHAFLAN, 0.0, 0.0),
            (MANGO_SEMI - CHAFLAN, 0.0, 0.0),
            (MANGO_SEMI, HOMBRO_Y, 0.0),
            (ESQUINA_X, ESQUINA_Y, 0.0),
        ],
        TUBO_R,
    )


def _empunadura():
    """La funda de goma del mango y sus dos collares."""
    eje = bd.Rot(0.0, 90.0, 0.0)
    pieza = eje * bd.Cylinder(radius=FUNDA_R, height=FUNDA_LARGO)
    for lado in (-1.0, 1.0):
        sitio = lado * (FUNDA_LARGO / 2.0 + COLLAR_LARGO / 2.0)
        pieza += bd.Pos(sitio, 0.0, 0.0) * (
            eje * bd.Cylinder(radius=COLLAR_R, height=COLLAR_LARGO)
        )
    return pieza


def _placa():
    """La chapa a dos aguas, con su agujero. Vertical, en el plano XY."""
    perfil = bd.Polygon(
        (-PLACA_SEMI_BAJO, PLACA_BAJO),
        (PLACA_SEMI_BAJO, PLACA_BAJO),
        (PLACA_SEMI_ALTO, PLACA_ALTO),
        (-PLACA_SEMI_ALTO, PLACA_ALTO),
        align=None,
    )
    perfil -= bd.Pos(0.0, AGUJERO_Y) * bd.Circle(AGUJERO_R)
    return bd.extrude(perfil, amount=PLACA_ESPESOR / 2.0, both=True)


@step(out="../STEP/agarre_simple.step")
@stl(out="../STL/agarre_simple.stl")
@glb(out="../GLB/agarre_simple.glb")
def agarre_simple():
    # MODO ÁLGEBRA A PROPÓSITO: con un `BuildPart` abierto, las fábricas de
    # `lib.tubos` dejan una copia fantasma en el origen (ver `lib/tubos.py`).
    agarre = _estribo() + _empunadura() + _placa()
    agarre.label = "agarre_simple_polea"
    return agarre


if __name__ == "__main__":
    agarre_simple()
