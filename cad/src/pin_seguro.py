"""PIN DE SEGURO — el que clava el brazo en el disco indexado.

El mismo que lleva una pila de pesos en su selector, con tres partes y las tres
con trabajo: el VÁSTAGO, que atraviesa el brazo y entra en el agujero del disco;
el COLLARÍN, que topa contra el brazo y le dice hasta dónde entra; y el ASA, que
es por donde se saca —un pin sin asa acaba perdido detrás de la máquina—.

El vástago lleva un CHAFLÁN en la punta. No es adorno: con el brazo cargado los
dos agujeros nunca quedan perfectamente enfrentados, y un canto vivo se clava en
el borde en vez de entrar. El chaflán lo guía y termina de alinear.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from disco_indexado import SEGURO_R

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
# EL AJUSTE SALE DEL DISCO, no de un número escrito aquí. Son dos ficheros y la
# medida que los une es una sola: si el agujero cambia, el vástago cambia con
# él. Escrita dos veces, tarde o temprano son dos medidas distintas y el pin
# deja de entrar —o baila— sin que nadie haya tocado el pin.
HOLGURA = 0.5
VASTAGO_R = SEGURO_R - HOLGURA
VASTAGO_LARGO = 95.0    # el brazo (60) más el disco (8) y sobrante para sacarlo
CHAFLAN = 2.0           # el guiado de la punta

COLLARIN_R = 11.0
COLLARIN_LARGO = 10.0

ASA_R = 5.0             # la varilla del asa
ASA_ANCHO = 70.0        # de lado a lado
ASA_ALTO = 26.0         # lo que levanta, para meter los dedos


@step(out="../STEP/pin_seguro.step")
@stl(out="../STL/pin_seguro.stl")
@glb(out="../GLB/pin_seguro.glb")
def pin_seguro():
    with bd.BuildPart() as pin:
        # EL VÁSTAGO, a lo largo de +X: el mismo eje en el que entra.
        with bd.BuildSketch(bd.Plane.YZ):
            bd.Circle(VASTAGO_R)
        bd.extrude(amount=VASTAGO_LARGO)
        # El chaflán de la punta, que es lo que lo hace entrar cargado.
        bd.chamfer(
            pin.edges().filter_by(bd.GeomType.CIRCLE).group_by(bd.Axis.X)[-1],
            length=CHAFLAN,
        )
        # EL COLLARÍN: el tope contra el brazo.
        with bd.BuildSketch(bd.Plane.YZ):
            bd.Circle(COLLARIN_R)
        bd.extrude(amount=-COLLARIN_LARGO)

        # EL ASA: una U de varilla por detrás del collarín.
        y = ASA_ANCHO / 2.0 - ASA_R
        x0 = -COLLARIN_LARGO
        with bd.BuildLine() as recorrido:
            bd.Polyline(
                (x0, 0.0, 0.0),
                (x0 - ASA_ALTO, 0.0, 0.0),
            )
        bd.add(recorrido)
        for lado in (-1, 1):
            with bd.BuildSketch(bd.Plane.YZ.offset(x0 - ASA_ALTO)):
                with bd.Locations((lado * y, 0.0)):
                    bd.Circle(ASA_R)
            bd.extrude(amount=ASA_ALTO, dir=(1, 0, 0))
        # El puente que une las dos ramas.
        with bd.Locations(bd.Location((x0 - ASA_ALTO + ASA_R, 0.0, 0.0))):
            bd.Cylinder(
                radius=ASA_R,
                height=ASA_ANCHO,
                rotation=(90.0, 0.0, 0.0),
                align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
            )

    part = pin.part
    part.label = "pin_seguro_disco_indexado"
    return part


if __name__ == "__main__":
    pin_seguro()
