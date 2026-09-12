"""LA HORQUILLA: alma soldable, dos orejas y el taladro sobre el eje.

Una sola fábrica para las DOS piezas que EXERSUITE3D monta con ella, porque en
el acero son la misma:

  · HORQUILLA — el alma se suelda en la cara que mira al pasador y las orejas
    salen hacia fuera; lo que gira entra entre ellas.
  · ABRAZADERA — el alma se suelda en la cara CONTRARIA y las orejas cruzan la
    viga por sus dos costados hasta el eje. Es lo que hace falta cuando el
    pasador ATRAVIESA la viga por un pinhole y no queda por delante de nada.

Lo único que cambia entre una y otra son los números: la garganta se abre a lo
que pasa entre las orejas —el brazo en una, la viga en la otra— y el vuelo es lo
que las orejas tienen que salvar hasta el eje. La forma es la misma, y por eso
vive aquí y no duplicada en cada modelo.

Sistema local (el de la pieza de la app, para que la malla importada caiga
igual):

    X = EJE DEL PASADOR (la garganta se abre en X)
    Y = alto de la horquilla
    Z = del alma hacia la boca (las orejas vuelan en +Z)

El origen queda EN EL EJE, no en el alma: colocarla es poner su origen donde
está el pasador.
"""
from __future__ import annotations

from cadgen import build123d as bd


def _oreja(alto: float, espesor: float, vuelo: float, agujero: float, x_interior: float):
    """Una oreja taladrada, con la punta redonda centrada en el eje.

    `x_interior` es dónde va su CARA INTERIOR, la que da a la garganta: es lo
    que hay que fijar para que las dos queden simétricas. Colocarlas por su
    centro deja la pieza descuadrada media chapa.
    """
    radio = alto / 2.0
    with bd.BuildPart() as oreja:
        with bd.BuildSketch(bd.Plane.XY):
            with bd.BuildLine():
                bd.Polyline((-vuelo, -radio), (0.0, -radio))
                bd.RadiusArc((0.0, -radio), (0.0, radio), radio, short_sagitta=False)
                bd.Polyline((0.0, radio), (-vuelo, radio), (-vuelo, -radio))
            bd.make_face()
            bd.Circle(agujero, mode=bd.Mode.SUBTRACT)
        bd.extrude(amount=espesor)
    # El boceto vive en XY (x = nuestra z, y = nuestra y) y se extruye en Z: un
    # cuarto de vuelta sobre Y lleva el espesor al eje X, ocupando [−esp, 0].
    pieza = oreja.part.rotate(bd.Axis.Y, -90.0)
    corrimiento = x_interior if x_interior < 0 else x_interior + espesor
    return pieza.moved(bd.Location((corrimiento, 0.0, 0.0)))


def horquilla(
    *,
    alto: float,
    espesor: float,
    garganta: float,
    vuelo: float,
    agujero: float,
    etiqueta: str,
):
    """La pieza entera: alma al fondo del vuelo y las dos orejas."""
    # El taladro nunca se come la oreja: como mucho, la mitad del semicírculo.
    radio = alto / 2.0
    agujero = min(agujero, radio * 0.75)
    ancho = garganta + 2.0 * espesor

    with bd.BuildPart() as pieza:
        # EL ALMA: la placa que cierra por detrás y que es la que se suelda.
        with bd.Locations(bd.Location((0.0, 0.0, -vuelo - espesor / 2.0))):
            bd.Box(ancho, alto, espesor)
        bd.add(_oreja(alto, espesor, vuelo, agujero, -garganta / 2.0))
        bd.add(_oreja(alto, espesor, vuelo, agujero, garganta / 2.0))

    part = pieza.part
    part.label = etiqueta
    return part
