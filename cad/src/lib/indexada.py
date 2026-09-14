"""EL PIVOTE QUE SE CLAVA POR TRAMOS: disco de posiciones y su montaje.

Una sola fábrica para las DOS piezas que EXERSUITE3D monta con ella, porque en
el acero son la misma con el culo distinto:

  · SILLA — abraza el pilar por tres caras y se sujeta a él por su PINHOLE: una
    espiga que entra en el agujero del montante y una maneta que aprieta por el
    costado de enfrente. Se quita y se pone de nivel sin herramienta.
  · SOLDAR — la misma pieza con una CARA PLANA en lugar de la silla, para
    pegarla donde no hay pinhole que valga.

Lo que no cambia es lo que hace el trabajo: **un disco en abanico con una corona
de agujeros**. El brazo va por fuera, ensartado en el mismo eje, y un seguro lo
clava en el agujero que toque.

CADA TRAMO ES UNA HORA DEL RELOJ, y no es casualidad: con 7 posiciones repartidas
en media vuelta el paso sale de 30°, que es exactamente una hora de la esfera con
la que la app pide los recorridos desde v0.3.48. El brazo no queda «en el agujero
4»: queda a las 3, a las 4, a las 5. Se dice y se comprueba mirando.

ES UNA PIEZA MENOS QUE EL `disco_indexado`. Aquel era un disco suelto que había
que soldar junto al pivote y alinear a mano con la horquilla; aquí los agujeros
están en la misma chapa que sostiene el eje, así que no hay nada que alinear.

Sistema local, el de la familia del pasador:

    X = EJE DEL PASADOR
    Y = alto
    Z = del pilar hacia la boca (el disco vuela en +Z)

El origen queda EN EL EJE.
"""
from __future__ import annotations

import math

from cadgen import build123d as bd

from disco_indexado import SEGURO_R


def comprueba(*, arco_r: float, disco_r: float, posiciones: int, arco: float) -> float:
    """Guardián de la corona; devuelve el paso en grados.

    Entre agujero y agujero tiene que quedar acero, y del agujero al canto
    también. Un disco que se rompe por el puente no sostiene nada, y el error se
    comete apretando posiciones sin tocar el radio.
    """
    paso = arco / (posiciones - 1)
    puente = 2.0 * arco_r * math.sin(math.radians(paso) / 2.0) - 2.0 * SEGURO_R
    canto = disco_r - arco_r - SEGURO_R
    if puente < SEGURO_R:
        raise ValueError(
            f"quedan {puente:.1f} mm de acero entre agujeros de la corona, menos "
            f"que su propio radio: baja las posiciones o sube el radio de la corona"
        )
    if canto < SEGURO_R:
        raise ValueError(
            f"quedan {canto:.1f} mm del agujero al canto del disco: sube su radio"
        )
    return paso


def _disco(
    *,
    disco_r: float,
    espesor: float,
    eje_r: float,
    arco_r: float,
    posiciones: int,
    arco: float,
    disco_arco: float,
    cubo_r: float,
    x_interior: float,
):
    """El abanico con su corona, puesto por su CARA INTERIOR.

    Colocar una chapa por su centro deja la pieza descuadrada medio espesor. Es
    el error que ya se pagó una vez en `lib/horquilla.py` y no se repite.
    """
    paso = comprueba(arco_r=arco_r, disco_r=disco_r, posiciones=posiciones, arco=arco)
    if disco_arco < arco:
        raise ValueError(
            f"la chapa del disco ({disco_arco:.0f}°) no llega a cubrir su propia "
            f"corona ({arco:.0f}°): habría agujeros al aire"
        )
    if disco_arco >= 359.9:
        perfil = bd.Circle(disco_r)
    else:
        # EL PACMAN (v0.3.52). Un disco redondo entero al lado de una corona que
        # sólo cubre media vuelta es acero que no hace nada y que sí CHOCA con
        # lo que haya detrás. Se recorta a su abanico y se le deja el CUBO
        # entero alrededor del eje, que es lo que agarra el pasador: un abanico
        # con el vértice en el propio taladro no agarraría nada.
        media = math.radians(disco_arco / 2.0)
        n = max(8, int(disco_arco / 5.0))
        fuera = disco_r * 1.3
        puntos = [(0.0, 0.0)]
        for i in range(n + 1):
            t = -media + 2.0 * media * i / n
            puntos.append((fuera * math.cos(t), fuera * math.sin(t)))
        perfil = (bd.Circle(disco_r) & bd.Polygon(*puntos, align=None)) + bd.Circle(cubo_r)
    perfil -= bd.Circle(eje_r)
    # LA CORONA, centrada en la boca (+Z): media vuelta que va de lo alto a lo
    # bajo pasando por delante, que es el recorrido que hace un brazo.
    for k in range(posiciones):
        ang = math.radians(-arco / 2.0 + k * paso)
        perfil -= bd.Pos(arco_r * math.cos(ang), arco_r * math.sin(ang)) * bd.Circle(SEGURO_R)
    # El boceto vive en XY (x = nuestra Z, y = nuestra Y) y se extruye en Z: un
    # cuarto de vuelta sobre Y lleva el espesor al eje X, ocupando [−esp, 0].
    pieza = bd.extrude(perfil, amount=espesor).rotate(bd.Axis.Y, -90.0)
    return bd.Pos(x_interior + espesor, 0.0, 0.0) * pieza


def indexada(
    *,
    montaje: str,
    pilar_ancho: float,
    pilar_fondo: float,
    espesor: float,
    vuelo: float,
    silla_alto: float,
    disco_r: float,
    disco_espesor: float,
    eje_r: float,
    arco_r: float,
    posiciones: int,
    arco: float,
    disco_arco: float,
    cubo_r: float,
    espiga_r: float,
    espiga: float,
    maneta_r: float,
    etiqueta: str,
):
    """La pieza entera: el disco y el culo que corresponda."""
    if montaje not in ("silla", "soldar"):
        raise ValueError(f"montaje desconocido: {montaje!r}")

    semi = pilar_ancho / 2.0
    frente = -vuelo                       # cara delantera del pilar
    fondo = -vuelo - pilar_fondo          # …y la de atrás
    # El disco va soldado POR FUERA del costado +X, mordiendo 2 mm dentro de él:
    # dos caras que sólo se tocan pueden quedarse sin fundir y sacar dos sólidos
    # donde debía haber uno.
    x_disco = semi + espesor - 2.0
    pieza = _disco(
        disco_r=disco_r,
        espesor=disco_espesor,
        eje_r=eje_r,
        arco_r=arco_r,
        posiciones=posiciones,
        arco=arco,
        disco_arco=disco_arco,
        cubo_r=cubo_r,
        x_interior=x_disco,
    )

    if montaje == "soldar":
        # CARA PLANA. El disco necesita algo a lo que ir soldado, y aquí ese algo
        # es la propia placa de montaje: se pega donde sea y se acabó el pinhole.
        placa_fondo = frente - espesor
        pieza += bd.Pos(0.0, 0.0, (placa_fondo + frente) / 2.0) * bd.Box(
            pilar_ancho + 2.0 * espesor, silla_alto, espesor
        )
        pieza.label = etiqueta
        return pieza

    # LA SILLA: dos costados y el fondo, que es la U que abraza el montante.
    # El costado se estira un poco por delante del pilar para que el disco tenga
    # dónde soldarse en toda su raíz.
    costado_frente = frente + espesor
    for lado in (-1.0, 1.0):
        pieza += bd.Pos(
            lado * (semi + espesor / 2.0),
            0.0,
            (fondo + costado_frente) / 2.0,
        ) * bd.Box(espesor, silla_alto, costado_frente - fondo)
    pieza += bd.Pos(0.0, 0.0, fondo - espesor / 2.0) * bd.Box(
        pilar_ancho + 2.0 * espesor, silla_alto, espesor
    )
    # LA ESPIGA DEL PINHOLE: sale de la cara interior del costado del disco y
    # entra en el agujero del montante. Es lo que aguanta el momento del brazo;
    # la maneta sólo aprieta.
    eje_espiga = bd.Rot(0.0, 90.0, 0.0)
    pieza += bd.Pos(semi - espiga / 2.0, 0.0, (frente + fondo) / 2.0) * (
        eje_espiga * bd.Cylinder(radius=espiga_r, height=espiga)
    )
    # Y EL PASO DE LA MANETA por el costado de enfrente.
    pieza -= bd.Pos(-semi - espesor / 2.0, 0.0, (frente + fondo) / 2.0) * (
        eje_espiga * bd.Cylinder(radius=maneta_r, height=4.0 * espesor)
    )

    pieza.label = etiqueta
    return pieza
