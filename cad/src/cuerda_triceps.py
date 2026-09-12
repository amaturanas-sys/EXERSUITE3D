"""CUERDA DE TRÍCEPS — accesorio ergonómico de polea, en CAD.

La cuerda que cuelga de la polea alta y se abre al extender los codos. Tres
piezas y ninguna de más:

  · la CUERDA, colcha de TRES CABOS torcidos, doblada en U invertida: dos
    ramales que cuelgan y un arco que los une por arriba;
  · la ABRAZADERA CROMADA que la muerde en la cumbre, con la oreja del
    mosquetón encima;
  · y los dos CASQUILLOS negros que rematan las puntas, que es lo que la mano
    encuentra al cerrar el puño.

LA TORSIÓN NO ES DECORACIÓN. Una cuerda dibujada como un tubo liso no es esta
pieza: lo que se reconoce de un vistazo es la colcha. Así que los tres cabos se
modelan de verdad —cada uno es un círculo barrido por SU hélice alrededor de la
directriz—, no un cilindro con una textura encima.

La directriz se recorre por longitud de arco: ramal recto, arco de medio punto,
ramal recto. Como la curva es PLANA, su binormal es constante (0,0,1) y la
normal sale de ella sin sorpresas — nada de marcos de Frenet degenerados en los
tramos rectos, que es donde un Frenet puro se vuelve loco.

Sistema local: X abre los dos ramales, Y arriba, Z el grueso. El origen, en la
boca de los casquillos —donde la cuerda entra en ellos—, que es la altura de las
manos: el mismo convenio que el agarre doble y la agarradera en D.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
CUERDA_R = 12.5         # media colcha: Ø 25, la de catálogo
SEMI = 45.0             # medio hueco entre los ejes de los dos ramales
RAMAL_ALTO = 187.5      # hasta dónde sube el tramo recto
RAMAL_BAJO = -20.0      # y hasta dónde baja, ya dentro del casquillo

# LOS TRES CABOS. Tres círculos de radio `r` cuyos centros giran a `d` del eje:
# se tocan entre sí cuando d·√3 = 2r, y la colcha mide d + r de radio. Se les
# da un pelo de solape para que suelden sin costura.
CABOS = 3
CABO_R = 5.9
CABO_D = 6.6
PASO = 80.0             # cuánto avanza la colcha en una vuelta entera
MUESTRAS = 260          # puntos por hebra: ~2 mm de cuerda por punto

# LA ABRAZADERA de la cumbre y su oreja.
COLLAR_R = 21.0
COLLAR_LARGO = 34.0
OREJA_Y = 40.0          # a qué altura sobre la cumbre está el centro del ojo
OREJA_R = 15.0
OJO_R = 7.5
OREJA_ESPESOR = 4.5     # a cada lado

# LOS CASQUILLOS de las puntas.
CASQUILLO_R = 28.0
CASQUILLO_HOMBRO = 10.0   # cuánto asoma por encima de la boca
CASQUILLO_CUELLO = -12.0  # dónde empieza la cúpula de abajo

CUMBRE_Y = RAMAL_ALTO + SEMI
LARGO_RAMAL = RAMAL_ALTO - RAMAL_BAJO
LARGO_ARCO = math.pi * SEMI
LARGO_TOTAL = 2.0 * LARGO_RAMAL + LARGO_ARCO


def _directriz(s: float):
    """Punto y tangente de la directriz a la longitud de arco `s`.

    Sube por el ramal izquierdo, cruza el arco de medio punto y baja por el
    derecho. Las tangentes casan en las dos juntas —(0,1,0) al entrar en el
    arco, (0,−1,0) al salir—, así que la cuerda no tiene esquinas.
    """
    if s <= LARGO_RAMAL:
        return (-SEMI, RAMAL_BAJO + s, 0.0), (0.0, 1.0, 0.0)
    if s <= LARGO_RAMAL + LARGO_ARCO:
        fi = (s - LARGO_RAMAL) / SEMI
        return (
            (-SEMI * math.cos(fi), RAMAL_ALTO + SEMI * math.sin(fi), 0.0),
            (math.sin(fi), math.cos(fi), 0.0),
        )
    t = s - LARGO_RAMAL - LARGO_ARCO
    return (SEMI, RAMAL_ALTO - t, 0.0), (0.0, -1.0, 0.0)


def _hebra(vuelta: float):
    """Un cabo: el círculo de la hebra barrido por su hélice.

    `vuelta` es su sitio en la colcha, en vueltas (0, 1/3, 2/3).
    """
    puntos = []
    for i in range(MUESTRAS + 1):
        s = LARGO_TOTAL * i / MUESTRAS
        (px, py, pz), (tx, ty, tz) = _directriz(s)
        # La curva es plana: binormal constante (0,0,1) y normal = B × T.
        nx, ny = -ty, tx
        ang = 2.0 * math.pi * (s / PASO + vuelta)
        c, sn = math.cos(ang), math.sin(ang)
        puntos.append(
            bd.Vector(
                px + CABO_D * (c * nx),
                py + CABO_D * (c * ny),
                pz + CABO_D * sn,
            )
        )
    camino = bd.Spline(*puntos)
    arranque = puntos[1] - puntos[0]
    seccion = bd.Plane(origin=puntos[0], z_dir=arranque) * bd.Circle(CABO_R)
    return bd.sweep(seccion, path=camino, is_frenet=True)


def _colcha():
    """La cuerda entera: los tres cabos, soldados en una sola colcha."""
    cuerda = _hebra(0.0)
    for k in range(1, CABOS):
        cuerda += _hebra(k / CABOS)
    return cuerda


def _casquillo(x: float):
    """El remate negro de una punta: cuello recto y cúpula abajo."""
    cuello = bd.Pos(x, (CASQUILLO_HOMBRO + CASQUILLO_CUELLO) / 2.0, 0.0) * (
        bd.Rot(90.0, 0.0, 0.0)
        * bd.Cylinder(
            radius=CASQUILLO_R,
            height=CASQUILLO_HOMBRO - CASQUILLO_CUELLO,
        )
    )
    return cuello + bd.Pos(x, CASQUILLO_CUELLO, 0.0) * bd.Sphere(radius=CASQUILLO_R)


def _abrazadera():
    """El herraje de la cumbre: el collar que muerde la cuerda y la oreja.

    El collar es MACIZO a propósito. Un anillo con su taladro se quedaría a
    unas décimas de la colcha —que además no es lisa, sino ondulada por los
    cabos— y saldrían dos sólidos sueltos en vez de una pieza. Relleno, la
    cuerda lo atraviesa y suelda seguro; y lo de dentro no se ve.
    """
    collar = bd.Pos(0.0, CUMBRE_Y, 0.0) * (
        bd.Rot(0.0, 90.0, 0.0) * bd.Cylinder(radius=COLLAR_R, height=COLLAR_LARGO)
    )
    perfil = bd.Polygon(
        (-16.0, CUMBRE_Y),
        (16.0, CUMBRE_Y),
        (10.0, CUMBRE_Y + OREJA_Y),
        (-10.0, CUMBRE_Y + OREJA_Y),
        align=None,
    )
    perfil += bd.Pos(0.0, CUMBRE_Y + OREJA_Y) * bd.Circle(OREJA_R)
    perfil -= bd.Pos(0.0, CUMBRE_Y + OREJA_Y) * bd.Circle(OJO_R)
    return collar + bd.extrude(perfil, amount=OREJA_ESPESOR, both=True)


@step(out="../STEP/cuerda_triceps.step")
@stl(out="../STL/cuerda_triceps.stl")
@glb(out="../GLB/cuerda_triceps.glb")
def cuerda_triceps():
    # MODO ÁLGEBRA A PROPÓSITO (ver `lib/tubos.py`): nada de `BuildPart`.
    pieza = _colcha() + _abrazadera()
    for lado in (-1.0, 1.0):
        pieza += _casquillo(lado * SEMI)
    pieza.label = "cuerda_triceps"
    return pieza


if __name__ == "__main__":
    cuerda_triceps()
