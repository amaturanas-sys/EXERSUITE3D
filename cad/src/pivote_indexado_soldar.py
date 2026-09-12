"""PIVOTE INDEXADO · SOLDAR — el mismo, con una cara plana en vez de la silla.

Cuando no hay pinhole al que calzarse —una viga lisa, un bastidor propio— la
silla no sirve de nada y sobra. Se cambia por una PLACA PLANA que se suelda
donde haga falta, y el disco con su corona queda igual.

Las cotas son las de la silla, para que las dos piezas sean intercambiables en
el diseño: el eje cae en el mismo sitio respecto de la cara de montaje.
"""
from __future__ import annotations

from cadgen import glb, step, stl

from lib.indexada import indexada
from pivote_indexado import (
    ARCO,
    ARCO_R,
    DISCO_ESPESOR,
    DISCO_R,
    EJE_R,
    ESPESOR,
    ESPIGA,
    ESPIGA_R,
    MANETA_R,
    PILAR_ANCHO,
    PILAR_FONDO,
    POSICIONES,
    SILLA_ALTO,
    VUELO,
)


@step(out="../STEP/pivote_indexado_soldar.step")
@stl(out="../STL/pivote_indexado_soldar.stl")
@glb(out="../GLB/pivote_indexado_soldar.glb")
def pivote_indexado_soldar():
    return indexada(
        montaje="soldar",
        pilar_ancho=PILAR_ANCHO,
        pilar_fondo=PILAR_FONDO,
        espesor=ESPESOR,
        vuelo=VUELO,
        silla_alto=SILLA_ALTO,
        disco_r=DISCO_R,
        disco_espesor=DISCO_ESPESOR,
        eje_r=EJE_R,
        arco_r=ARCO_R,
        posiciones=POSICIONES,
        arco=ARCO,
        espiga_r=ESPIGA_R,
        espiga=ESPIGA,
        maneta_r=MANETA_R,
        etiqueta=f"pivote_indexado_soldar_{POSICIONES}_tramos",
    )


if __name__ == "__main__":
    pivote_indexado_soldar()
