"""CARRIL DE TOPES — la viga con muescas donde asienta el pie del pilar.

La pieza que genera `crearBrazoConPilar` en EXERSUITE3D, aquí en CAD de taller.
Las cotas son las que la herramienta resuelve para la banca del diseñador
(brazo 42,6 · recorrido 70–100° · carril 50 cm a 30° · descentrado −2,8), leídas
de la app y pasadas a milímetros: cinco niveles cada 125, y un pilar de 42,86.

CADA NIVEL ES UNA MUESCA, NO UN BULTO. Un taco al lado del pie, en una viga
inclinada, se monta o se sortea —así se escapaba el pilar—. Hacen falta dos
dedos con el hueco justo del pie que suban por encima de su centro: cuna y
dedo, como el gancho de la placa dentada.

EL CARRIL SE MODELA EN SU PROPIO PLANO, no inclinado: la inclinación es cosa
del montaje, no de la pieza. X corre a lo largo del carril, Y lo cruza, Z sube.
La CARA DE ARRIBA de la viga es z = 0, que es la referencia de la que cuelga
todo: el eje del pie viaja 25 mm por encima (media anchura del pilar).

UNA DIFERENCIA CON LO QUE HOY DIBUJA LA APP, a propósito: allí el carril
empieza y acaba EXACTAMENTE en el primer y el último tope, con lo que los dos
dedos de los extremos quedan medio en el aire —no hay acero debajo de su mitad
de fuera—. Eso se dibuja, pero no se suelda. Aquí el carril sobresale
`VUELO_EXTREMO` por cada punta.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── COTAS RESUELTAS POR LA HERRAMIENTA (cm × 10) ────────────────────────────
PERFIL_VIGA = 60.0      # la viga de topes, cuadrada
PERFIL_PILAR = 50.0     # el pie que tiene que entrar en la muesca
PASO = 125.0            # entre niveles
NIVELES = 5

# La muesca: dos dedos con el hueco justo del pie más su holgura.
DEDO = 15.0
HOLGURA = 4.0
SEMI_HUECO = (PERFIL_PILAR + HOLGURA) / 2.0          # 27,0
DEDO_ALTO = PERFIL_PILAR / 2.0 + 15.0                # 40,0: pasa el centro del pie
DEDO_X = SEMI_HUECO + DEDO / 2.0                     # 34,5 del centro del nivel

# Lo que el carril sobresale por fuera del último dedo, para que haya acero
# debajo de toda su base y se pueda soldar.
VUELO_EXTREMO = 50.0

NIVEL_X = tuple(i * PASO for i in range(NIVELES))     # 0, 125, 250, 375, 500
CARA_DEDO_FUERA = DEDO_X + DEDO / 2.0                 # 42,0
X_MIN = NIVEL_X[0] - CARA_DEDO_FUERA - VUELO_EXTREMO
X_MAX = NIVEL_X[-1] + CARA_DEDO_FUERA + VUELO_EXTREMO
LARGO = X_MAX - X_MIN

# Redondeo de la arista de entrada de cada dedo: el pie baja sobre ella y una
# esquina viva lo engancha en vez de guiarlo.
RADIO_ENTRADA = 3.0


def _dedo(x_centro: float, nombre: str):
    """Un dedo: chapa de pie que sube de la cara de la viga."""
    with bd.BuildPart() as dedo:
        with bd.BuildSketch(bd.Plane.XY):
            bd.Rectangle(DEDO, PERFIL_VIGA)
        bd.extrude(amount=DEDO_ALTO)
        # La arista de arriba, redondeada por los dos cantos que miran al pie.
        bd.fillet(
            dedo.edges().filter_by(bd.Axis.Y).group_by(bd.Axis.Z)[-1],
            radius=RADIO_ENTRADA,
        )
    pieza = dedo.part.moved(bd.Location((x_centro, 0.0, 0.0)))
    pieza.label = nombre
    return pieza


@step(out="../STEP/carril_topes.step")
@stl(out="../STL/carril_topes.stl")
@glb(out="../GLB/carril_topes.glb")
def carril_topes():
    with bd.BuildPart() as carril:
        # LA VIGA. Su cara de arriba es z = 0: el pie del pilar se apoya ahí.
        with bd.BuildSketch(bd.Plane.XY):
            bd.Rectangle(LARGO, PERFIL_VIGA)
        bd.extrude(amount=-PERFIL_VIGA)
        carril.part.move(bd.Location(((X_MIN + X_MAX) / 2.0, 0.0, 0.0)))

        # LOS DIEZ DEDOS, dos por nivel, soldados a la cara de arriba.
        for i, x in enumerate(NIVEL_X):
            bd.add(_dedo(x - DEDO_X, f"dedo_{i}_arriba"))
            bd.add(_dedo(x + DEDO_X, f"dedo_{i}_abajo"))

    part = carril.part
    part.label = "carril_topes_cinco_muescas"
    return part


if __name__ == "__main__":
    carril_topes()
