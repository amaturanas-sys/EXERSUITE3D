"""PIVOTE INDEXADO · SILLA — el que se calza en el pinhole del montante.

La versión que se quita y se pone sin herramienta: abraza el pilar por tres
caras, mete su ESPIGA en el agujero del montante y aprieta con una maneta por el
costado de enfrente. Para cambiar de altura se saca, se sube o se baja un nivel
y se vuelve a calzar.

Las cotas son las de la app (cm) pasadas a milímetros. La forma vive en
`lib/indexada.py`, compartida con la variante de soldar: en el acero son la
misma pieza con el culo distinto.
"""
from __future__ import annotations

from cadgen import glb, step, stl

from lib.indexada import comprueba, indexada

# ── COTAS (mm) ──────────────────────────────────────────────────────────────
PILAR_ANCHO = 60.0      # el montante que abraza
PILAR_FONDO = 60.0
ESPESOR = 8.0           # la chapa de la silla
VUELO = 30.0            # de la cara delantera del pilar al eje
SILLA_ALTO = 90.0

DISCO_R = 64.0
DISCO_ESPESOR = 10.0    # más gorda que la silla: es la que lleva la carga
EJE_R = 13.0            # el taladro del pasador: Ø25 con su holgura

# LA CORONA. Siete posiciones en media vuelta dan 30° de paso, que es UNA HORA
# de la esfera con la que la app pide los recorridos: el brazo no queda «en el
# agujero 4», queda a las 4.
POSICIONES = 7
ARCO = 180.0
ARCO_R = 48.0

ESPIGA_R = 12.0         # la espiga que entra en el pinhole del montante
ESPIGA = 26.0
MANETA_R = 6.0          # el paso del tornillo de la maneta

PASO_GRADOS = comprueba(
    arco_r=ARCO_R, disco_r=DISCO_R, posiciones=POSICIONES, arco=ARCO
)
# Lo que el pasador tiene que cruzar de lado a lado, que es lo que necesita saber
# `pasador_manija` para salir con el largo justo.
ANCHO = PILAR_ANCHO + 2.0 * ESPESOR + DISCO_ESPESOR


@step(out="../STEP/pivote_indexado.step")
@stl(out="../STL/pivote_indexado.stl")
@glb(out="../GLB/pivote_indexado.glb")
def pivote_indexado():
    return indexada(
        montaje="silla",
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
        etiqueta=f"pivote_indexado_silla_{POSICIONES}_tramos",
    )


if __name__ == "__main__":
    pivote_indexado()
