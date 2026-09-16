"""EL MOLETEADO DE LA CASA — uno solo, para todo lo que se agarra.

Lo estrenó la barra olímpica y lo usan también las mancuernas: es el mismo
moleteado y por eso vive aquí, no copiado en cada pieza.

CÓMO SE HACE. No se dibujan pirámides una a una: se resta del cilindro UNA
corona cuya cara interior va en dientes de sierra, y eso abre todos los surcos
de una vez. Un solo revolucionado por tramo.

ES UN MOLETEADO RECTO —anillos—, no de rombo, y la decisión está medida: el de
rombo de verdad —cruzando estos anillos con una corona de generatrices— sale
bien pero multiplica la malla por treinta (1.9 millones de triángulos en la
barra, contra 63.000). A la distancia a la que se mira una barra o una mancuerna
no se distingue, así que se queda el recto, que además es un moleteado real.

EL PASO NO ES EL DE UN MOLETEADO DE TALLER, que ronda el milímetro. Una pieza de
2 m ocupa en pantalla unos 800 píxeles: un diente de 1 mm no llega ni a medio
píxel y lo único que produce es parpadeo. Cada pieza elige un paso que se vea a
la distancia a la que se la mira —6 mm la barra, 4 mm el mango de una mancuerna,
que se ve de cerca—.

`lib/` es código compartido, no modelos: aquí no hay ningún `@step`.
"""

from cadgen import build123d as bd

PASO = 6.0      # paso por omisión, en mm
HONDO = 0.3     # cuánto hunde cada surco
FUERA = 6.0     # cuánto sobresale el cortador por fuera, para restar limpio


def anillos(
    radio: float,
    z0: float,
    z1: float,
    paso: float = PASO,
    hondo: float = HONDO,
):
    """Cortador de los surcos de UN tramo, alrededor del eje Z, de `z0` a `z1`.

    Es una corona con la cara interior en dientes de sierra: donde el perfil
    llega a `radio` no muerde, y donde baja a `radio - hondo` abre el surco.
    Restarla del cilindro deja todos los anillos del tramo a la vez.

    Quien lo quiera en otro eje que gire el resultado: es una pieza de
    revolución alrededor de Z y girarla no le cuesta nada.
    """
    if z1 - z0 < paso:
        raise ValueError(
            f"el tramo de {z1 - z0:.1f} mm no da ni para un diente de {paso:.1f}"
        )
    pts = []
    z = z0
    while z < z1 - 1e-9:
        pts.append((radio, 0.0, z))
        pts.append((radio - hondo, 0.0, min(z + paso / 2.0, z1)))
        z += paso
    pts.append((radio, 0.0, z1))
    pts.append((radio + FUERA, 0.0, z1))
    pts.append((radio + FUERA, 0.0, z0))
    return bd.revolve(bd.make_face(bd.Polyline(*pts, close=True)), axis=bd.Axis.Z)
