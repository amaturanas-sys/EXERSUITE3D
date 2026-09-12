"""Tubo de acero entre dos puntos: la primitiva de todo herraje de varilla.

Un agarre de polea, un estribo, un asa — todos son el mismo gesto: doblar
varilla y soldarla. Aquí eso se dibuja como tramos rectos con una bola en cada
codo, que es lo que hace que dos tramos consecutivos se fundan sin costura y sin
tener que barrer una curva por cada doblez.
"""
from __future__ import annotations

from cadgen import build123d as bd


def _sin_builder(quien: str) -> None:
    """Estas fábricas SOLO valen en modo álgebra.

    build123d decide qué hace `bd.Cylinder(...)` según haya o no un `BuildPart`
    abierto: sin él devuelve un sólido; con él LO AÑADE a la pieza en curso, en
    el origen, y de paso te lo devuelve. Llamar a `tubo()` dentro de un
    `with BuildPart()` mete entonces un tubo fantasma por el origen además del
    que pedías —así apareció el tubo transversal que atravesaba los dos mangos
    del agarre doble—. Mejor que salte aquí y no dentro de tres modelos.
    """
    ctx = bd.Builder._get_context(None, log=False)
    if ctx is not None:
        raise RuntimeError(
            f"{quien}() se ha llamado dentro de un {type(ctx).__name__}: "
            "estas fábricas son de modo álgebra y allí dejan piezas fantasma "
            "en el origen. Compón con + y bd.Pos/bd.Rot, sin BuildPart."
        )


def tubo(a, b, radio: float):
    """Un tramo recto de varilla de `radio`, de `a` a `b`."""
    _sin_builder("tubo")
    pa = bd.Vector(a)
    pb = bd.Vector(b)
    d = pb - pa
    largo = d.length
    if largo < 1e-6:
        raise ValueError("un tubo de largo cero: revisa los dos puntos")
    plano = bd.Plane(origin=(pa + pb) / 2, z_dir=d)
    return plano.location * bd.Cylinder(radius=radio, height=largo)


def codo(p, radio: float):
    """La bola que redondea un doblez y funde los dos tramos que llegan a él."""
    _sin_builder("codo")
    return bd.Location(bd.Vector(p)) * bd.Sphere(radius=radio)


def varilla(puntos, radio: float):
    """Una varilla doblada que pasa por todos los puntos, con sus codos."""
    partes = []
    for i in range(len(puntos) - 1):
        partes.append(tubo(puntos[i], puntos[i + 1], radio))
    for p in puntos[1:-1]:
        partes.append(codo(p, radio))
    solido = partes[0]
    for p in partes[1:]:
        solido = solido + p
    return solido
