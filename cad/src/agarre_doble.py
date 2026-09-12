"""AGARRE DOBLE DE POLEA (doble D) — accesorio ergonómico, en CAD.

El agarre de dos mangos que cuelga de un cable. La topología es lo que hay que
acertar, y no es la que parece a primera vista:

  · Arriba va una PLACA PLANA a dos aguas, vertical y paralela a los mangos,
    con el agujero del mosquetón cerca de su cumbre. No es un manguito: es
    chapa cortada, y por eso el conjunto se ve plano de perfil.
  · De CADA ESQUINA BAJA de esa placa salen DOS tubos, uno a cada mango. Son
    cuatro en total, cruzados en aspa — y esas dos parejas son las dos Λ
    anidadas que se ven mirando la pieza de frente.
  · Los dos MANGOS quedan PARALELOS, no en V, uno delante del otro.

El error de la primera versión fue montar un caballete independiente por mango
—dos tubos que subían a su propia cumbre—: sale un tipi, no un doble D. La
diferencia está en de dónde bajan los tubos: de UNA placa común, no de dos
cumbres.

Cada mango lleva funda de goma en medio y un remate REDONDO en cada punta. El
remate no es un tope cilíndrico: es una bola, y se nota al usarlo —la mano
resbala hasta el extremo y lo que la para es esa curva—.

Sistema local: X a lo largo de los mangos, Y arriba, Z la separación entre
ellos. El origen, en el centro de los dos mangos.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from lib.tubos import tubo

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
ANCHO = 230.0           # punta a punta del mango
SEPARACION = 100.0      # entre los ejes de los dos mangos
TUBO_R = 8.0            # la varilla del bastidor

FUNDA_R = 15.0
FUNDA_LARGO = 130.0
BOLA_R = 11.5           # el remate redondo de cada punta

# LA PLACA a dos aguas.
PLACA_BAJO = 86.0       # a qué altura está su canto inferior
PLACA_ALTO = 128.0      # y su cumbre
PLACA_SEMI_BAJO = 64.0  # medio ancho abajo…
PLACA_SEMI_ALTO = 37.0  # …y arriba, que es lo que le da las dos aguas
PLACA_ESPESOR = 9.0
AGUJERO_R = 9.0
AGUJERO_Y = 112.0

MEDIO = ANCHO / 2.0
# Donde el tubo se encuentra con el mango: por dentro de la bola del remate.
APOYO_X = MEDIO - BOLA_R - 6.0
# Y donde arranca de la placa: sus dos esquinas bajas.
ESQUINA_X = PLACA_SEMI_BAJO - TUBO_R


def _mango(z: float):
    """Un mango: tubo de punta a punta, funda de goma y las dos bolas."""
    with bd.BuildPart() as mango:
        with bd.Locations(bd.Location((0.0, 0.0, z))):
            bd.Cylinder(
                radius=TUBO_R,
                height=ANCHO - 2 * BOLA_R,
                rotation=(0.0, 90.0, 0.0),
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
            )
            bd.Cylinder(
                radius=FUNDA_R,
                height=FUNDA_LARGO,
                rotation=(0.0, 90.0, 0.0),
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
            )
        # LAS BOLAS de las puntas.
        for lado in (-1.0, 1.0):
            with bd.Locations(bd.Location((lado * (MEDIO - BOLA_R), 0.0, z))):
                bd.Sphere(radius=BOLA_R)
    return mango.part


def _placa():
    """La chapa a dos aguas, con su agujero. Vertical, en el plano XY."""
    with bd.BuildPart() as placa:
        with bd.BuildSketch(bd.Plane.XY):
            bd.Polygon(
                (-PLACA_SEMI_BAJO, PLACA_BAJO),
                (PLACA_SEMI_BAJO, PLACA_BAJO),
                (PLACA_SEMI_ALTO, PLACA_ALTO),
                (-PLACA_SEMI_ALTO, PLACA_ALTO),
                align=None,
            )
            with bd.Locations((0.0, AGUJERO_Y)):
                bd.Circle(AGUJERO_R, mode=bd.Mode.SUBTRACT)
        bd.extrude(amount=PLACA_ESPESOR / 2.0, both=True)
    return placa.part


@step(out="../STEP/agarre_doble.step")
@stl(out="../STL/agarre_doble.stl")
@glb(out="../GLB/agarre_doble.glb")
def agarre_doble():
    with bd.BuildPart() as agarre:
        bd.add(_mango(SEPARACION / 2.0))
        bd.add(_mango(-SEPARACION / 2.0))
        bd.add(_placa())
        # LOS CUATRO TUBOS EN ASPA: de cada esquina baja de la placa, uno a
        # cada mango. Aquí está la pieza.
        for lado_x in (-1.0, 1.0):
            arranque = (lado_x * ESQUINA_X, PLACA_BAJO + TUBO_R * 0.5, 0.0)
            for lado_z in (-1.0, 1.0):
                bd.add(
                    tubo(
                        arranque,
                        (lado_x * APOYO_X, 0.0, lado_z * SEPARACION / 2.0),
                        TUBO_R,
                    )
                )
            # La bola que funde los dos tubos con la placa en esa esquina.
            bd.add(bd.Location(bd.Vector(arranque)) * bd.Sphere(radius=TUBO_R))

    part = agarre.part
    part.label = "agarre_doble_polea"
    return part


if __name__ == "__main__":
    agarre_doble()
