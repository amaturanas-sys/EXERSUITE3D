"""PUNTO DE ANCLAJE — la horquilla del pasador, en CAD de verdad.

La misma pieza que EXERSUITE3D genera con `kind: "horquilla"`, pero aquí
modelada con un núcleo CAD (build123d) para poder sacar STEP de taller. Las
medidas son las de la app pasadas a milímetros —la app trabaja en centímetros y
cadgen en milímetros—, así que un parámetro de 8 cm se escribe 80 aquí.

El sistema local es el mismo que el de la pieza de la app, para que la malla
importada caiga con la misma orientación:

    X = EJE DEL PASADOR (la garganta se abre en X)
    Y = alto de la horquilla (corre a lo largo de la viga soldada)
    Z = del alma hacia la boca (las orejas vuelan en +Z)

El origen queda EN EL EJE, no en el alma.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

# Medidas por defecto de la pieza de la app (cm) × 10.
ALTO = 80.0         # horquillaAlto
ESPESOR = 8.0       # horquillaEspesor
GARGANTA = 42.0     # horquillaGarganta
VUELO = 40.0        # horquillaVuelo
AGUJERO_R = 13.0    # horquillaAgujero

RADIO = ALTO / 2.0          # la punta redonda, centrada en el eje
ANCHO = GARGANTA + 2 * ESPESOR


def _oreja(x_interior: float):
    """Una oreja: placa de espesor ESPESOR con la punta redonda y su taladro.

    `x_interior` es dónde va su CARA INTERIOR, la que da a la garganta: es lo
    que hay que fijar para que las dos orejas queden simétricas. Colocarlas por
    su centro deja la pieza descuadrada media chapa (medido: la caja iba de
    −33 a +29 en vez de ±29).
    """
    with bd.BuildPart() as oreja:
        with bd.BuildSketch(bd.Plane.XY):
            # El perfil se dibuja en (z, y) y luego se lleva a su sitio: el
            # rectángulo del alma al eje, rematado por el semicírculo.
            with bd.BuildLine() as perfil:
                bd.Polyline(
                    (-VUELO, -RADIO),
                    (0.0, -RADIO),
                )
                bd.RadiusArc((0.0, -RADIO), (0.0, RADIO), RADIO, short_sagitta=False)
                bd.Polyline(
                    (0.0, RADIO),
                    (-VUELO, RADIO),
                    (-VUELO, -RADIO),
                )
            bd.make_face()
            bd.Circle(AGUJERO_R, mode=bd.Mode.SUBTRACT)
        bd.extrude(amount=ESPESOR)
    # El boceto vive en XY (x = nuestra z, y = nuestra y) y se extruye en Z:
    # un cuarto de vuelta sobre Y lleva el espesor al eje X.
    pieza = oreja.part.rotate(bd.Axis.Y, -90.0)
    # Tras el giro el espesor ocupa [−ESPESOR, 0] en X, así que la cara
    # interior de la oreja izquierda es su borde 0 y la de la derecha su −8.
    corrimiento = x_interior if x_interior < 0 else x_interior + ESPESOR
    pieza = pieza.moved(bd.Location((corrimiento, 0.0, 0.0)))
    pieza.label = f"oreja_x_{x_interior:.0f}"
    return pieza


@step(out="../STEP/punto_anclaje.step")
@stl(out="../STL/punto_anclaje.stl")
@glb(out="../GLB/punto_anclaje.glb")
def punto_anclaje():
    with bd.BuildPart() as pieza:
        # EL ALMA: la placa que se suelda contra la cara de la viga.
        with bd.Locations(bd.Location((0.0, 0.0, -VUELO - ESPESOR / 2.0))):
            bd.Box(ANCHO, ALTO, ESPESOR)
        # LAS DOS OREJAS, a un lado y otro de la garganta.
        bd.add(_oreja(-GARGANTA / 2.0))
        bd.add(_oreja(GARGANTA / 2.0))
    part = pieza.part
    part.label = "punto_anclaje_horquilla"
    return part


if __name__ == "__main__":
    punto_anclaje()
