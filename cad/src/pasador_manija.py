"""PASADOR-MANIJA — el eje del pivote indexado, que además se agarra.

El cilindro que hace de pivote del brazo. Lo que lo distingue de un perno es que
**sobresale por fuera lo bastante para que una mano lo coja**: con él se saca el
pivote de su pinhole, se sube o se baja un nivel y se vuelve a calzar, sin
herramienta y sin soltar la pieza. En las fotos de catálogo es esa barra que
asoma por el costado.

Tres detalles que no son adorno:

  · la CABEZA de dentro, que topa contra el disco y le impide pasarse de largo;
  · la CÚPULA de la punta, para que la mano no encuentre un canto vivo;
  · y el TALADRO TRANSVERSAL por fuera del brazo, donde entra el clip que lo
    retiene. Un pasador sin retén se camina solo con la vibración.

LAS MEDIDAS QUE LO ATAN AL PIVOTE NO SE ESCRIBEN DOS VECES. El vástago sale del
taladro del disco menos la holgura, y dónde empieza y acaba cada tramo sale de
las cotas del propio pivote (`from pivote_indexado import …`). Si el disco
engorda, el pasador lo sigue.

EL DISCO NO ESTÁ CENTRADO —es uno solo, soldado a un costado—, así que el
pasador tampoco: entra por dentro, cruza el disco y el brazo, y sale por fuera
hecho manija.

Sistema local: X es el eje, como toda la familia; el origen, en el eje del
pivote, para que entre sin colocarlo.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from pivote_indexado import DISCO_ESPESOR, EJE_R, ESPESOR, PILAR_ANCHO

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
HOLGURA = 0.5
VASTAGO_R = EJE_R - HOLGURA

BRAZO = 40.0            # el perfil del brazo que gira POR FUERA del disco
MANIJA = 135.0          # …y lo que sobresale de él para la mano

CABEZA_R = 17.0         # el tope de dentro
CABEZA_LARGO = 12.0
CUPULA_R = VASTAGO_R    # el remate de la punta: media bola del propio vástago
CLIP_R = 3.0            # el taladro transversal del retén
CLIP_HOLGURA = 6.0      # a qué distancia del brazo cae

DISCO_DENTRO = PILAR_ANCHO / 2.0 + ESPESOR - 2.0
DISCO_FUERA = DISCO_DENTRO + DISCO_ESPESOR
BRAZO_FUERA = DISCO_FUERA + BRAZO
CLIP_X = BRAZO_FUERA + CLIP_HOLGURA
CABEZA_DENTRO = PILAR_ANCHO / 2.0 - CABEZA_LARGO
PUNTA = BRAZO_FUERA + MANIJA

if CLIP_X <= BRAZO_FUERA:
    raise ValueError("el taladro del clip cae dentro del brazo: sube CLIP_HOLGURA")
if PUNTA < CLIP_X + 3.0 * CLIP_R:
    raise ValueError("no queda manija suficiente por fuera del clip: sube MANIJA")


@step(out="../STEP/pasador_manija.step")
@stl(out="../STL/pasador_manija.stl")
@glb(out="../GLB/pasador_manija.glb")
def pasador_manija():
    # MODO ÁLGEBRA A PROPÓSITO (ver `lib/tubos.py`).
    eje = bd.Rot(0.0, 90.0, 0.0)
    largo = PUNTA - CABEZA_DENTRO
    pieza = bd.Pos((CABEZA_DENTRO + PUNTA) / 2.0, 0.0, 0.0) * (
        eje * bd.Cylinder(radius=VASTAGO_R, height=largo)
    )
    # LA CABEZA, por dentro: es lo que topa contra el disco cuando se empuja.
    pieza += bd.Pos(CABEZA_DENTRO + CABEZA_LARGO / 2.0, 0.0, 0.0) * (
        eje * bd.Cylinder(radius=CABEZA_R, height=CABEZA_LARGO)
    )
    # LA CÚPULA de la punta.
    pieza += bd.Pos(PUNTA, 0.0, 0.0) * bd.Sphere(radius=CUPULA_R)
    # Y EL TALADRO DEL CLIP, justo por fuera del brazo.
    pieza -= bd.Pos(CLIP_X, 0.0, 0.0) * bd.Cylinder(
        radius=CLIP_R, height=4.0 * VASTAGO_R
    )

    pieza.label = "pasador_manija"
    return pieza


if __name__ == "__main__":
    pasador_manija()
