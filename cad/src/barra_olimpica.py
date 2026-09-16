"""BARRA OLÍMPICA — la de 20 kg, con su moleteado de verdad.

Copiada de la ficha de despiece de una barra comercial y de una foto macro del
moleteado. Una barra no es un tubo: tiene cinco piezas y se notan todas.

DE FUERA ADENTRO, media barra:

    MANGA     Ø49.4 × 433, lisa. Es donde entran los discos: NOMINALMENTE es el
              Ø50 de ellos —la cota que no cambia en todo el juego— pero se
              tornea por debajo, porque dos piezas que miden lo mismo no entran
              una en otra.
    COLLAR    Ø62 × 12, el reborde que tope a los discos y separa manga de eje.
    EJE       Ø28, 1310 mm entre collares. El agarre.

Y EL EJE NO ES LISO DE PUNTA A PUNTA, que es de lo que va este modelo:

    · un tramo LISO en el centro, ±130 —donde va el logotipo y donde la barra
      roza el cuello en las cargadas—;
    · dos tramos MOLETEADOS a cada lado, de 130 a 600;
    · partidos por la MARCA DE AGARRE, un anillo liso de 8 mm en el 405, que es
      lo que se busca con el dedo para colocar las manos sin mirar;
    · y otro tramo LISO de 600 al collar, que nadie agarra.

EL MOLETEADO ES DE ANILLOS, Y ESO FUE UNA DECISIÓN MEDIDA, no una comodidad. Se
construyó primero el de ROMBO de verdad —cruzando los anillos con una corona de
surcos axiales, que es como se hace—, salió un sólido sano… y **1.9 millones de
triángulos**: cada anillo se parte en 28 trozos y el mallador afina cada uno por
su cuenta. Un disco de 45 lb, para comparar, son 38.000. La misma pieza sólo con
los anillos son 63.000, o sea TREINTA VECES menos por una diferencia que a la
distancia a la que se mira una barra no se ve. Así que anillos —que además es un
moleteado real, el recto—, y el rombo queda descartado con su número al lado por
si algún día compensa.

Los anillos salen de UN SOLO revolucionado: el cortador es una corona con la
cara interior en dientes de sierra, y al restarla deja los surcos de golpe.

POR QUÉ 6 mm DE PASO Y NO 1, que es lo que mide un moleteado de verdad: la barra
mide 2.2 m y en pantalla ocupa unos 800 píxeles, así que un diente de 1 mm no
llega ni a medio píxel y lo único que produce es parpadeo. A 6 mm el surco se
ve, se puede contar y no revienta la malla. Es una pieza para mirar, no para
tornear.

Sistema local: Z es el eje de la barra y NO se gira al exportar —a diferencia de
los discos—. El convenio de glTF convierte esa Z en la Y de la app, que es donde
la barra tenía su eje desde siempre: así entra de pie, como el cilindro que
sustituye, y nada de lo que ya estaba colocado se mueve.
"""

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── LA BARRA, EN MILÍMETROS ─────────────────────────────────────────────────
LARGO = 2200.0
EJE_R = 14.0            # Ø28, el agarre
ENTRE_COLLARES = 1310.0
COLLAR_R = 31.0
COLLAR_ANCHO = 12.0
# LA MANGA VA POR DEBAJO DE SU MEDIDA NOMINAL, y es a propósito. Manga y disco
# se llaman los dos «Ø50», pero si los dos MIDEN 50 el disco no entra: hace
# falta holgura. Se tornea a Ø49.4 y quedan 0.6 mm de juego, que es lo que
# permite enfilar un disco y sacarlo sin pelear.
MANGA_R = 24.7
CHAFLAN = 1.5

# ── EL MOLETEADO ────────────────────────────────────────────────────────────
CENTRO_LISO = 130.0     # media anchura del tramo liso del centro
KNURL_HASTA = 600.0     # hasta dónde llega el moleteado
MARCA = 405.0           # centro de la marca de agarre
MARCA_ANCHO = 8.0
DIENTE_PASO = 6.0       # paso del moleteado (ver la cabecera)
DIENTE_HONDO = 0.3


def _mangas() -> float:
    """Largo de cada manga para que la barra mida LARGO de punta a punta."""
    return (LARGO - ENTRE_COLLARES - 2.0 * COLLAR_ANCHO) / 2.0


def bandas() -> list[tuple[float, float]]:
    """Los cuatro tramos moleteados, en z, de un extremo al otro."""
    a, b = CENTRO_LISO, MARCA - MARCA_ANCHO / 2.0
    c, d = MARCA + MARCA_ANCHO / 2.0, KNURL_HASTA
    return [(-d, -c), (-b, -a), (a, b), (c, d)]


def _anillos(z0: float, z1: float):
    """El cortador de los surcos anulares de un tramo, de un solo revolucionado.

    Es una corona con la cara interior en dientes de sierra: donde el perfil
    llega a `EJE_R` no muerde, y donde baja a `EJE_R - DIENTE_HONDO` abre el
    surco. Restarla deja todos los anillos del tramo a la vez.
    """
    pts = []
    z = z0
    while z < z1 - 1e-9:
        pts.append((EJE_R, 0.0, z))
        pts.append((EJE_R - DIENTE_HONDO, 0.0, min(z + DIENTE_PASO / 2.0, z1)))
        z += DIENTE_PASO
    pts.append((EJE_R, 0.0, z1))
    pts.append((EJE_R + 6.0, 0.0, z1))
    pts.append((EJE_R + 6.0, 0.0, z0))
    return bd.revolve(bd.make_face(bd.Polyline(*pts, close=True)), axis=bd.Axis.Z)


@step(out="../STEP/barra_olimpica.step")
@stl(out="../STL/barra_olimpica.stl")
@glb(out="../GLB/barra_olimpica.glb")
def barra_olimpica():
    manga = _mangas()
    medio_eje = ENTRE_COLLARES / 2.0
    z_collar = medio_eje + COLLAR_ANCHO / 2.0
    z_manga = medio_eje + COLLAR_ANCHO + manga / 2.0

    pieza = bd.Cylinder(radius=EJE_R, height=ENTRE_COLLARES)
    for signo in (1.0, -1.0):
        pieza += bd.Pos(0.0, 0.0, signo * z_collar) * bd.Cylinder(
            radius=COLLAR_R, height=COLLAR_ANCHO
        )
        pieza += bd.Pos(0.0, 0.0, signo * z_manga) * bd.Cylinder(
            radius=MANGA_R, height=manga
        )

    # Las puntas, matadas: una manga de canto vivo no entra en un disco.
    puntas = [
        e
        for e in pieza.edges().filter_by(bd.GeomType.CIRCLE)
        if abs(e.radius - MANGA_R) < 0.01
        and abs(abs(e.center().Z) - LARGO / 2.0) < 0.01
    ]
    if puntas:
        pieza = bd.chamfer(puntas, length=CHAFLAN)

    # EL MOLETEADO, tramo a tramo.
    for z0, z1 in bandas():
        pieza -= _anillos(z0, z1)

    pieza.label = "barra_olimpica"
    return pieza


if __name__ == "__main__":
    barra_olimpica()
