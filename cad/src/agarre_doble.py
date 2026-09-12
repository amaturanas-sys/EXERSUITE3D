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

from lib.tubos import codo, tubo

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
    eje = bd.Rot(0.0, 90.0, 0.0)
    pieza = eje * bd.Cylinder(radius=TUBO_R, height=ANCHO - 2 * BOLA_R)
    pieza += eje * bd.Cylinder(radius=FUNDA_R, height=FUNDA_LARGO)
    for lado in (-1.0, 1.0):
        pieza += bd.Pos(lado * (MEDIO - BOLA_R), 0.0, 0.0) * bd.Sphere(radius=BOLA_R)
    return bd.Pos(0.0, 0.0, z) * pieza


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


@step(out="../STEP/agarre_doble.step")
@stl(out="../STL/agarre_doble.stl")
@glb(out="../GLB/agarre_doble.glb")
def agarre_doble():
    # MODO ÁLGEBRA A PROPÓSITO. Con un `BuildPart` abierto, las fábricas de
    # `lib.tubos` —y cualquier `bd.Sphere(...)` suelto— se convierten en
    # operaciones del constructor y depositan una copia en el ORIGEN: así
    # aparecía un tubo de Ø16 atravesando los dos mangos de lado a lado, que no
    # existe en la pieza real y estorbaría a las manos.
    agarre = _mango(SEPARACION / 2.0) + _mango(-SEPARACION / 2.0) + _placa()
    # LOS CUATRO TUBOS EN ASPA: de cada esquina baja de la placa, uno a cada
    # mango. Aquí está la pieza.
    for lado_x in (-1.0, 1.0):
        arranque = (lado_x * ESQUINA_X, PLACA_BAJO + TUBO_R * 0.5, 0.0)
        for lado_z in (-1.0, 1.0):
            agarre += tubo(
                arranque,
                (lado_x * APOYO_X, 0.0, lado_z * SEPARACION / 2.0),
                TUBO_R,
            )
        # La bola que funde los dos tubos con la placa en esa esquina.
        agarre += codo(arranque, TUBO_R)

    agarre.label = "agarre_doble_polea"
    return agarre


if __name__ == "__main__":
    agarre_doble()
