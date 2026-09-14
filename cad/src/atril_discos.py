"""ATRIL DE DISCOS — el cuerno que se cuelga de cualquier viga con pinholes.

La pieza de la foto: una placa que se apoya en la cara del montante, una LENGÜETA
que entra por un pinhole y carga el peso, un pasante abajo para el seguro, y un
CUERNO horizontal donde se ensartan los discos. Se cuelga y se descuelga sin
herramienta, y se sube o se baja de agujero como un estante.

CÓMO TRABAJA, que es lo que decide las cotas. La lengüeta entra en el agujero y
se apoya en su borde de abajo; el peso de los discos tira hacia fuera del cuerno
y quiere hacer girar la pieza, así que empuja el CANTO BAJO de la placa contra la
viga. Entre esos dos apoyos —la lengüeta arriba tirando, la placa abajo
empujando— queda cerrado el par. El seguro de abajo no sostiene nada mientras la
pieza esté cargada: está para que no se salte de su agujero cuando se descarga de
golpe, que es cuando un cuerno se suelta.

LA LENGÜETA TIENE QUE PASAR POR EL AGUJERO. Es la cota que manda y la que más
fácil se rompe al retocar: la sección de la punta —ancho por alto, con la nariz
incluida— entra en el pinhole por su DIAGONAL, no por su lado. `_comprueba()`
revienta el modelo antes de exportar si deja de caber, porque una lengüeta que no
entra no se ve en el render: se ve en el taller.

LA NARIZ es el escalón de la punta: una vez dentro, impide que la lengüeta se
salga hacia fuera si alguien levanta el cuerno por la punta.

Sistema local, el de la familia del pinhole:

    X = a lo ancho de la placa
    Y = alto
    Z = del montante hacia FUERA — el cuerno vuela en +Z

El origen queda EN EL EJE DEL CUERNO, sobre la cara delantera de la viga.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── LA VIGA A LA QUE SE CUELGA (mm) ─────────────────────────────────────────
PINHOLE_R = 12.5        # Ø25, el agujero del montante de la casa
PASO_PINHOLE = 50.0     # de agujero a agujero

# ── LA PLACA ────────────────────────────────────────────────────────────────
PLACA_ANCHO = 70.0
PLACA_ESPESOR = 8.0
# Arriba llega un poco por encima de la lengüeta; abajo baja hasta pasado el
# segundo pasante, que es lo que le da el brazo de palanca contra la viga.
PLACA_SOBRE = 25.0      # de la lengüeta al canto de arriba
PLACA_BAJO = 25.0       # del último pasante al canto de abajo

# ── LA LENGÜETA ─────────────────────────────────────────────────────────────
GANCHO_Y = PASO_PINHOLE         # un agujero por encima del cuerno
GANCHO_ANCHO = 16.0
GANCHO_ALTO = 12.0
GANCHO_VUELO = 24.0             # cuánto se mete en la viga
NARIZ_ALTO = 5.0                # el escalón de la punta, hacia abajo
NARIZ_ESPESOR = 6.0

# ── EL CUERNO ───────────────────────────────────────────────────────────────
CUERNO_R = 25.0         # Ø50: el orificio de un disco olímpico
CUERNO_LARGO = 250.0
CUERNO_PUNTA = 6.0      # el redondeo de la punta, para enhebrar sin arañar
COLLAR_R = 34.0         # el ensanche de la raíz, que es donde parte un cuerno
COLLAR = 12.0

# ── LOS PASANTES DEL SEGURO ─────────────────────────────────────────────────
TALADRO_R = 12.5
TALADROS_Y = (-PASO_PINHOLE, -2.0 * PASO_PINHOLE)

PLACA_ARRIBA = GANCHO_Y + GANCHO_ALTO / 2.0 + PLACA_SOBRE
PLACA_ABAJO = min(TALADROS_Y) - PLACA_BAJO
PLACA_ALTO = PLACA_ARRIBA - PLACA_ABAJO


def _comprueba() -> float:
    """Guardián de la lengüeta; devuelve la holgura que le queda en el agujero.

    Una lengüeta rectangular entra en un agujero redondo por su DIAGONAL. Es la
    cuenta que se olvida al ensanchar la lengüeta «para que aguante más», y el
    resultado es una pieza que no se puede colgar.
    """
    punta = math.hypot(GANCHO_ANCHO, GANCHO_ALTO + NARIZ_ALTO)
    holgura = 2.0 * PINHOLE_R - punta
    if holgura < 0.5:
        raise ValueError(
            f"la punta de la lengüeta mide {punta:.1f} mm de diagonal y el "
            f"pinhole {2 * PINHOLE_R:.1f}: no entra. Baja el ancho o la nariz"
        )
    if TALADRO_R > PINHOLE_R + 0.5:
        raise ValueError(
            "el pasante del seguro es más ancho que el pinhole de la viga: el "
            "seguro no cruzaría los dos"
        )
    return holgura


HOLGURA = _comprueba()


def atril():
    """La pieza entera: placa, lengüeta con su nariz, y el cuerno."""
    # LA PLACA. Su cara delantera queda en Z = 0, que es la cara de la viga: así
    # todo lo que vuela se mide desde donde de verdad empieza a volar.
    pieza = bd.Pos(
        0.0,
        (PLACA_ARRIBA + PLACA_ABAJO) / 2.0,
        -PLACA_ESPESOR / 2.0,
    ) * bd.Box(PLACA_ANCHO, PLACA_ALTO, PLACA_ESPESOR)

    # LA LENGÜETA, hacia DENTRO de la viga (−Z).
    z_punta = -PLACA_ESPESOR - GANCHO_VUELO
    pieza += bd.Pos(
        0.0, GANCHO_Y, (-PLACA_ESPESOR + z_punta) / 2.0
    ) * bd.Box(GANCHO_ANCHO, GANCHO_ALTO, GANCHO_VUELO)
    # LA NARIZ: el escalón de la punta, colgando por debajo de la lengüeta.
    pieza += bd.Pos(
        0.0,
        GANCHO_Y - GANCHO_ALTO / 2.0 - NARIZ_ALTO / 2.0,
        z_punta + NARIZ_ESPESOR / 2.0,
    ) * bd.Box(GANCHO_ANCHO, NARIZ_ALTO, NARIZ_ESPESOR)

    # EL COLLAR de la raíz y EL CUERNO. El collar muerde 2 mm dentro de la placa:
    # dos caras que sólo se tocan pueden quedarse sin fundir y sacar dos sólidos
    # donde debía haber uno.
    pieza += bd.Pos(0.0, 0.0, COLLAR / 2.0 - 2.0) * bd.Cylinder(
        radius=COLLAR_R, height=COLLAR + 4.0
    )
    cuerno = bd.Pos(0.0, 0.0, CUERNO_LARGO / 2.0) * bd.Cylinder(
        radius=CUERNO_R, height=CUERNO_LARGO
    )
    # LA PUNTA REDONDEADA, para enhebrar un disco sin ir buscando el canto.
    cuerno = bd.fillet(cuerno.edges().group_by(bd.Axis.Z)[-1], radius=CUERNO_PUNTA)
    pieza += cuerno

    # LOS PASANTES DEL SEGURO.
    for y in TALADROS_Y:
        # `bd.Cylinder` nace en el eje Z, que aquí es justo el espesor de la
        # placa: el taladro sale pasante sin girar nada.
        pieza -= bd.Pos(0.0, y, -PLACA_ESPESOR / 2.0) * bd.Cylinder(
            radius=TALADRO_R, height=4.0 * PLACA_ESPESOR
        )

    pieza.label = "atril_discos"
    return pieza


@step(out="../STEP/atril_discos.step")
@stl(out="../STL/atril_discos.stl")
@glb(out="../GLB/atril_discos.glb")
def atril_discos():
    return atril()


if __name__ == "__main__":
    atril_discos()
