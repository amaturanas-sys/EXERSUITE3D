"""AGARRE DOBLE DE POLEA (doble D en V) — accesorio ergonómico, en CAD.

El agarre de dos mangos que cuelga de un cable: una oreja arriba para el
mosquetón y, bajando de ella, dos caballetes de varilla que terminan cada uno
en un mango. Se usa para remo neutro, jalón al pecho y todo lo que pida las dos
manos enfrentadas.

CÓMO ESTÁ HECHO, que es lo que decide las medidas:

  · Cada lado es UNA VARILLA doblada en caballete: sube desde un extremo del
    mango, hace cumbre y vuelve a bajar al otro extremo. Los dos caballetes se
    juntan arriba, donde los abraza el manguito.
  · El MANGO es tubo con una funda de goma en medio y un tope en cada punta:
    sin topes la mano se sale por el extremo, que es el motivo entero de que
    existan.
  · La OREJA va soldada al manguito, DE UNA PIEZA (sin giro). Así el cable
    trabaja siempre en el mismo plano, que es más simple de fabricar y de
    simular. La variante giratoria es otra pieza.

Sistema local: X a lo largo de los mangos, Y arriba, Z la separación entre los
dos. El origen queda en el centro de los dos mangos, que es por donde se coge.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from lib.tubos import varilla

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
ANCHO = 230.0           # punta a punta del mango, con sus topes
VARILLA_R = 8.0         # la varilla del bastidor

FUNDA_R = 15.0          # la goma donde va la mano
FUNDA_LARGO = 130.0

TOPE_R = 11.0           # el reborde que impide que la mano se salga
TOPE_LARGO = 18.0

SEPARACION = 95.0       # entre los ejes de los dos mangos
CUMBRE = 150.0          # cuánto sube el caballete sobre el mango
CUMBRE_Z = 20.0         # y cuánto se cierra hacia el centro al subir

MANGUITO_R = 14.0       # el que abraza las dos cumbres
MANGUITO_LARGO = 64.0

OREJA_ANCHO = 26.0
OREJA_ALTO = 46.0
OREJA_ESPESOR = 9.0
OREJA_AGUJERO_R = 10.0  # paso franco para un mosquetón

MEDIO = ANCHO / 2.0


def _lado(z: float):
    """Un mango con su caballete. `z` es de qué lado va."""
    signo = 1.0 if z > 0 else -1.0
    with bd.BuildPart() as lado:
        # EL MANGO: tubo de punta a punta.
        with bd.BuildSketch(bd.Plane.YZ.offset(-MEDIO)):
            bd.Circle(VARILLA_R)
        bd.extrude(amount=ANCHO)
        lado.part.move(bd.Location((0.0, 0.0, z)))
        # LA FUNDA de goma, en medio.
        with bd.Locations(bd.Location((0.0, 0.0, z))):
            bd.Cylinder(
                radius=FUNDA_R,
                height=FUNDA_LARGO,
                rotation=(0.0, 90.0, 0.0),
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
            )
        # LOS TOPES de las dos puntas.
        for lado_x in (-1.0, 1.0):
            with bd.Locations(
                bd.Location((lado_x * (MEDIO - TOPE_LARGO / 2.0), 0.0, z))
            ):
                bd.Cylinder(
                    radius=TOPE_R,
                    height=TOPE_LARGO,
                    rotation=(0.0, 90.0, 0.0),
                    align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
                )
        # EL CABALLETE: sube de una punta, hace cumbre y baja a la otra.
        apoyo = MEDIO - TOPE_LARGO - 10.0
        bd.add(
            varilla(
                [
                    (-apoyo, 0.0, z),
                    (-apoyo * 0.45, CUMBRE * 0.75, z - signo * CUMBRE_Z * 0.45),
                    (0.0, CUMBRE, z - signo * CUMBRE_Z),
                    (apoyo * 0.45, CUMBRE * 0.75, z - signo * CUMBRE_Z * 0.45),
                    (apoyo, 0.0, z),
                ],
                VARILLA_R,
            )
        )
    return lado.part


def _oreja():
    """La pala taladrada del cable: plana en XY, con el espesor en Z."""
    with bd.BuildPart() as oreja:
        with bd.BuildSketch(bd.Plane.XY):
            with bd.BuildLine():
                bd.Polyline(
                    (-OREJA_ANCHO / 2.0, 0.0),
                    (OREJA_ANCHO / 2.0, 0.0),
                    (OREJA_ANCHO / 2.0, OREJA_ALTO - OREJA_ANCHO / 2.0),
                )
                bd.RadiusArc(
                    (OREJA_ANCHO / 2.0, OREJA_ALTO - OREJA_ANCHO / 2.0),
                    (-OREJA_ANCHO / 2.0, OREJA_ALTO - OREJA_ANCHO / 2.0),
                    OREJA_ANCHO / 2.0,
                    short_sagitta=False,
                )
                bd.Polyline(
                    (-OREJA_ANCHO / 2.0, OREJA_ALTO - OREJA_ANCHO / 2.0),
                    (-OREJA_ANCHO / 2.0, 0.0),
                )
            bd.make_face()
        bd.extrude(amount=OREJA_ESPESOR / 2.0, both=True)
    # Nace en el origen y se sube a la cumbre, un poco por dentro del manguito
    # para que suelde contra él y no en el aire.
    return oreja.part.moved(bd.Location((0.0, CUMBRE - MANGUITO_R / 2.0, 0.0)))


@step(out="../STEP/agarre_doble.step")
@stl(out="../STL/agarre_doble.stl")
@glb(out="../GLB/agarre_doble.glb")
def agarre_doble():
    with bd.BuildPart() as agarre:
        bd.add(_lado(SEPARACION / 2.0))
        bd.add(_lado(-SEPARACION / 2.0))
        # EL MANGUITO que abraza las dos cumbres.
        with bd.Locations(bd.Location((0.0, CUMBRE, 0.0))):
            bd.Cylinder(
                radius=MANGUITO_R,
                height=MANGUITO_LARGO,
                rotation=(90.0, 0.0, 0.0),
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
            )
        # LA OREJA del cable, soldada encima y de una pieza.
        #
        # Se dibuja en su propio origen y se lleva a la cumbre al final. Hacerlo
        # con `Plane.XY.offset(CUMBRE)` la mandaba a z = 150 en vez de a y = 150
        # —el plano XY es el HORIZONTAL— y la pieza salía con 221 mm de fondo en
        # vez de 95: una pala plana asomando de lado.
        bd.add(_oreja())
        # El agujero del mosquetón, por el ESPESOR de la oreja (eje Z).
        with bd.Locations(
            bd.Location((0.0, CUMBRE + OREJA_ALTO - OREJA_ANCHO / 2.0, 0.0))
        ):
            bd.Cylinder(
                radius=OREJA_AGUJERO_R,
                height=OREJA_ESPESOR * 4.0,
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
                mode=bd.Mode.SUBTRACT,
            )

    part = agarre.part
    part.label = "agarre_doble_polea"
    return part


if __name__ == "__main__":
    agarre_doble()
