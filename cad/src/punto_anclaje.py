"""PUNTO DE ANCLAJE — la HORQUILLA del pasador, en CAD de taller.

La pieza que EXERSUITE3D genera con `kind: "horquilla"` en su configuración por
defecto: el alma se suelda en la cara que mira al pasador y las orejas salen
hacia fuera, con lo que gira entrando entre ellas.

Las cotas son las de la app (cm) pasadas a milímetros. La forma vive en
`lib/horquilla.py`, compartida con la abrazadera: en el acero son la misma
pieza montada del revés.
"""
from __future__ import annotations

from cadgen import glb, step, stl

from lib.horquilla import horquilla

ALTO = 80.0         # horquillaAlto
ESPESOR = 8.0       # horquillaEspesor
GARGANTA = 42.0     # horquillaGarganta — el brazo que gira, con holgura
VUELO = 40.0        # horquillaVuelo — de la cara soldada al eje
AGUJERO_R = 13.0    # horquillaAgujero — el pasador de 25 con su holgura


@step(out="../STEP/punto_anclaje.step")
@stl(out="../STL/punto_anclaje.stl")
@glb(out="../GLB/punto_anclaje.glb")
def punto_anclaje():
    return horquilla(
        alto=ALTO,
        espesor=ESPESOR,
        garganta=GARGANTA,
        vuelo=VUELO,
        agujero=AGUJERO_R,
        etiqueta="punto_anclaje_horquilla",
    )


if __name__ == "__main__":
    punto_anclaje()
