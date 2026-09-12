"""PUNTO DE ANCLAJE — la ABRAZADERA, en CAD de taller.

La misma pieza que la horquilla, montada del revés: el alma se suelda en la
cara CONTRARIA a la que mira el pasador y las orejas cruzan la viga por sus dos
costados hasta el eje. Es lo que hace falta cuando el pasador ATRAVIESA la viga
por un pinhole y no queda por delante de ninguna cara — el caso que una
horquilla no puede resolver, porque sus orejas tendrían que atravesar el acero.

LOS NÚMEROS SON OTROS, Y AHÍ ESTÁ TODO. En la horquilla la garganta se abre a
lo que GIRA; aquí, a la viga que se CRUZA. Y el vuelo ya no va de la cara al
aire: va de la cara soldada, atravesando la viga, hasta el eje del pasador.

Cotas del caso medido en `pruebas/prueba-punto-anclaje.mjs`: poste de 70 × 50
con el pasador por su centro. La app resuelve garganta 54 —los 50 de fondo del
poste más 4 de holgura— y vuelo 35, que es media anchura del poste.

Las orejas, por tanto, salen 40 mm POR DELANTE de la cara de entrada del poste:
el radio de su punta redonda. No es un descuido — es lo que deja acero
alrededor del taladro por el lado por donde el pasador trabaja.
"""
from __future__ import annotations

from cadgen import glb, step, stl

from lib.horquilla import horquilla

ALTO = 80.0
ESPESOR = 8.0
GARGANTA = 54.0     # el fondo de la viga que cruza, más holgura
VUELO = 35.0        # de la cara soldada al eje, atravesando la viga
AGUJERO_R = 13.0


@step(out="../STEP/punto_anclaje_abrazadera.step")
@stl(out="../STL/punto_anclaje_abrazadera.stl")
@glb(out="../GLB/punto_anclaje_abrazadera.glb")
def punto_anclaje_abrazadera():
    return horquilla(
        alto=ALTO,
        espesor=ESPESOR,
        garganta=GARGANTA,
        vuelo=VUELO,
        agujero=AGUJERO_R,
        etiqueta="punto_anclaje_abrazadera",
    )


if __name__ == "__main__":
    punto_anclaje_abrazadera()
