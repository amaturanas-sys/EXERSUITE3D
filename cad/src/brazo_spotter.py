"""BRAZO SPOTTER — el brazo de seguridad en voladizo que se calza en un montante.

La pieza de las fotografías: una CULATA en U que abraza el montante de 3″, una
ESPIGA de Ø16 que lo cruza por arriba y carga el brazo, un pasante abajo para el
pomo de seguro, y un BRAZO en voladizo con su cuna forrada, su talón trasero, su
pestaña distal y una fila de once agujeros numerados.

CÓMO TRABAJA. La espiga cruza el montante por un pinhole y es la que sostiene:
todo el peso de la barra pasa por ella a cortante. El brazo tira hacia abajo en
la punta, así que la culata quiere girar y aprieta su canto bajo contra el
montante — ese es el segundo apoyo, y entre los dos queda cerrado el par. El
pomo de abajo no sostiene: impide que la pieza se salte de su agujero cuando se
descarga de golpe. Se sube y se baja de nivel como una jota, sin herramienta.

EL BRAZO SE ALARGA, Y LA PIEZA NO SE DEFORMA. Esto no es un detalle de la app:
DECIDE LA FORMA DEL MODELO. Alargar una malla escalándola entera convierte los
agujeros en óvalos y estira la culata; lo que se hace en el taller es cortar el
tubo por un tramo recto y meter o quitar un trozo. Para que eso se pueda hacer
aquí, el modelo reserva UNA ZONA LISA —`BANDA`— entre el talón y el primer
agujero, y `_comprueba()` revienta el modelo si algo se mete en ella:

    culata · cartela · talón │ BANDA │ agujeros 1-11 · cuna · pestaña
    ───── viaja rígido ───── │estira │ ────── viaja rígido ──────

Así la longitud del brazo la pone el usuario y el sitio de anclaje y la pestaña
distal salen indemnes, con sus cotas de fábrica al milímetro.

POR QUÉ LA CARTELA ES CORTA. En la foto el canto bajo del brazo cae en pico
junto al montante y sigue recto el resto. Podría caer en una pendiente larga,
pero entonces cruzaría la banda: al alargar, el tramo estirado y el rígido
tendrían pendientes distintas y quedaría un CODO a la vista. La cartela cabe
entera antes de la banda, y por eso el canto sale limpio a cualquier largo.

Sistema local:

    X = a lo ancho del brazo
    Y = alto
    Z = del montante hacia FUERA — el brazo vuela en +Z

El origen queda en la CARA DELANTERA del montante, a media altura del brazo.

LOS EJES QUE SALEN AL GLB. glTF es Y-arriba, así que al exportar se gira todo un
cuarto de vuelta: el Z de aquí acaba siendo el alto, y el Y, el fondo cambiado de
signo. La app puede deshacerlo girando la MALLA al insertarla (`orientacion`),
pero eso no arregla los ejes LOCALES de la geometría, y hay cosas que dependen de
ellos —por dónde se alarga la pieza, por dónde entran los discos, dónde cae el
punto de calce—. Así que el giro se hornea AQUÍ, al final: la pieza se exporta
con Z arriba y −Y hacia fuera, que es justo lo que el convenio de glTF convierte
en «Y arriba, Z hacia fuera» al otro lado.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── EL MONTANTE AL QUE SE CALZA (mm) ────────────────────────────────────────
PILAR = 76.2            # 3″, el de la foto
PASO_PINHOLE = 50.8     # 2″, el paso de ese montante
PINHOLE_R = 8.0         # Ø16, el herraje que declara la foto

# ── LA CULATA ───────────────────────────────────────────────────────────────
# ES UNA C QUE ABRE HACIA ATRÁS: la frente se apoya en la cara delantera del
# montante y las dos mejillas lo abrazan por los costados. Así la pieza se
# presenta DE FRENTE y el montante entra en la C; con la C al revés habría que
# calzarla por detrás, donde el rack tiene el resto de la estructura.
CULATA_ESPESOR = 8.0
CULATA_ALTO = 160.0
ESPIGA_Y = PASO_PINHOLE / 2.0 + 25.4    # arriba: la que carga
PASADOR_Y = -ESPIGA_Y                    # abajo: el seguro
ESPIGA_R = 8.0                           # Ø16, cruza el montante de lado a lado
ESPIGA_VUELO = 20.0                      # cuánto asoma por fuera de cada mejilla
PASADOR_R = 9.0                          # el paso del pomo moleteado, con holgura

# ── EL BRAZO ────────────────────────────────────────────────────────────────
BRAZO_ANCHO = 50.0
BRAZO_ALTO = 80.0
BRAZO_VUELO = 740.0     # de la frente de la culata a la punta: 74 cm de fábrica
# LA RAÍZ: dónde arranca el brazo. Es la cara de FUERA de la frente de la
# culata, y todas las cotas del brazo se miden desde ahí.
RAIZ = CULATA_ESPESOR

# LA CARTELA, bajo el brazo y junto a la culata. Entera ANTES de la banda.
CARTELA_LARGO = 150.0
CARTELA_CAIDA = 110.0

# EL TALÓN de la cuna y la PESTAÑA distal, los dos topes entre los que la barra
# se queda quieta.
TALON_Z = (80.0, 145.0)
TALON_ALTO = 70.0
PESTANA_Z = (685.0, 740.0)
PESTANA_ALTO = 55.0

# EL FORRO de la cuna: el listón sobre el que apoya la barra.
FORRO_ANCHO = 40.0
FORRO_ESPESOR = 10.0

# ── LA FILA DE AGUJEROS NUMERADOS ───────────────────────────────────────────
AGUJEROS = 11
AGUJERO_R = 6.0
AGUJERO_Z0 = 360.0
AGUJERO_PASO = 30.0
NUMERO_ALTO = 13.0      # el tamaño de letra del número junto a cada agujero
NUMERO_HONDO = 1.2      # cuánto se hunde en la cara

# ── LA ZONA LISA QUE ESTIRA ─────────────────────────────────────────────────
# Entre el talón y el primer agujero. Es la única parte del brazo que la app
# puede estirar, y tiene que estar VACÍA: cualquier cosa dentro se deformaría.
BANDA = (160.0, 340.0)


def _comprueba() -> None:
    """Guardián de la banda y de la fila de agujeros.

    Los dos errores que este modelo puede cometer y que no se ven en el render:
    meter algo en la zona que estira —y que saldría deformado en cuanto alguien
    cambie el largo— y apretar los agujeros hasta dejar sin acero el puente
    entre ellos.
    """
    if TALON_Z[1] > BANDA[0]:
        raise ValueError(
            f"el talón llega a {TALON_Z[1]} y la banda empieza en {BANDA[0]}: al "
            f"alargar el brazo el talón se estiraría"
        )
    if CARTELA_LARGO > BANDA[0]:
        raise ValueError(
            f"la cartela llega a {CARTELA_LARGO} y la banda empieza en {BANDA[0]}: "
            f"su pendiente saldría con un codo al alargar el brazo"
        )
    primero = AGUJERO_Z0 - AGUJERO_R
    if primero < BANDA[1]:
        raise ValueError(
            f"el primer agujero empieza en {primero} y la banda acaba en "
            f"{BANDA[1]}: se volvería un óvalo al alargar el brazo"
        )
    puente = AGUJERO_PASO - 2.0 * AGUJERO_R
    if puente < AGUJERO_R:
        raise ValueError(
            f"quedan {puente:.1f} mm de acero entre agujeros, menos que su propio "
            f"radio: sube el paso o baja el diámetro"
        )
    ultimo = AGUJERO_Z0 + (AGUJEROS - 1) * AGUJERO_PASO + AGUJERO_R
    if ultimo > PESTANA_Z[0]:
        raise ValueError(
            f"el último agujero acaba en {ultimo} y la pestaña empieza en "
            f"{PESTANA_Z[0]}: se comen el uno al otro"
        )
    if BANDA[1] <= BANDA[0]:
        raise ValueError("la banda elástica está del revés")


_comprueba()

ANCHO = PILAR + 2.0 * CULATA_ESPESOR    # lo que mide la culata de oreja a oreja


def _culata():
    """La C que abraza el montante, con su espiga y el paso del pomo."""
    semi = PILAR / 2.0
    atras = -PILAR - 4.0                 # las mejillas rebasan el montante
    # LA FRENTE, contra la cara delantera del montante. Es la chapa a la que va
    # soldado el brazo: sin ella el voladizo no tendría de dónde agarrarse.
    pieza = bd.Pos(0.0, 0.0, RAIZ / 2.0) * bd.Box(
        ANCHO, CULATA_ALTO, CULATA_ESPESOR
    )
    # LAS DOS MEJILLAS, que abrazan el montante por los costados.
    for lado in (-1.0, 1.0):
        pieza += bd.Pos(
            lado * (semi + CULATA_ESPESOR / 2.0), 0.0, (atras + RAIZ) / 2.0
        ) * bd.Box(CULATA_ESPESOR, CULATA_ALTO, RAIZ - atras)

    eje_x = bd.Rot(0.0, 90.0, 0.0)
    # LA ESPIGA: cruza el montante de lado a lado y asoma por fuera, que es de
    # donde se tira para sacarla. Es la que lleva todo el peso.
    largo_espiga = ANCHO + 2.0 * ESPIGA_VUELO
    pieza += bd.Pos(0.0, ESPIGA_Y, -PILAR / 2.0) * (
        eje_x * bd.Cylinder(radius=ESPIGA_R, height=largo_espiga)
    )
    # EL PASO DEL POMO, abajo: un agujero, no una espiga. El seguro es una pieza
    # aparte que entra desde fuera.
    pieza -= bd.Pos(0.0, PASADOR_Y, -PILAR / 2.0) * (
        eje_x * bd.Cylinder(radius=PASADOR_R, height=ANCHO + 40.0)
    )
    return pieza


def _brazo():
    """El voladizo: viga, cartela, talón, pestaña y forro.

    Todas las cotas van medidas desde la RAÍZ —la cara de fuera de la frente de
    la culata—, que es de donde el brazo vuela de verdad.
    """
    medio = RAIZ + BRAZO_VUELO / 2.0
    pieza = bd.Pos(0.0, 0.0, medio) * bd.Box(BRAZO_ANCHO, BRAZO_ALTO, BRAZO_VUELO)

    # LA CARTELA. Un triángulo en el plano YZ, extruido a lo ancho del brazo:
    # hondo junto al montante y en pico donde acaba. Cae por debajo de la viga.
    base = -BRAZO_ALTO / 2.0
    perfil = bd.Polygon(
        (0.0, base),
        (0.0, base - CARTELA_CAIDA),
        (CARTELA_LARGO, base),
        align=None,
    )
    # El polígono se dibuja en XY y hay que llevarlo al plano ZY del brazo.
    # OJO CON EL GIRO. `bd.Rot(0, 90, 0)` manda el largo del perfil a −Z y la
    # cartela sale HACIA ATRÁS, metida en la culata: el modelo valida como dos
    # sólidos y el bulto crece por donde no debe. El giro bueno es −90.
    cartela = bd.extrude(perfil, amount=BRAZO_ANCHO)
    cartela = bd.Pos(BRAZO_ANCHO / 2.0, 0.0, RAIZ) * (
        bd.Rot(0.0, -90.0, 0.0) * cartela
    )
    pieza += cartela

    # EL TALÓN y LA PESTAÑA, los dos topes de la cuna.
    for (z0, z1), alto in ((TALON_Z, TALON_ALTO), (PESTANA_Z, PESTANA_ALTO)):
        pieza += bd.Pos(
            0.0, BRAZO_ALTO / 2.0 + alto / 2.0, RAIZ + (z0 + z1) / 2.0
        ) * bd.Box(BRAZO_ANCHO, alto, z1 - z0)

    # EL FORRO de la cuna, entre los dos topes: el listón sobre el que apoya la
    # barra, que en la pieza de verdad es el plástico que no raya el moleteado.
    f0, f1 = TALON_Z[1], PESTANA_Z[0]
    pieza += bd.Pos(
        0.0, BRAZO_ALTO / 2.0 + FORRO_ESPESOR / 2.0, RAIZ + (f0 + f1) / 2.0
    ) * bd.Box(FORRO_ANCHO, FORRO_ESPESOR, f1 - f0)

    return pieza


def _numerados(pieza):
    """La fila de agujeros y su número hundido al lado, en la cara de fuera."""
    cara = BRAZO_ANCHO / 2.0
    for i in range(AGUJEROS):
        z = RAIZ + AGUJERO_Z0 + i * AGUJERO_PASO
        pieza -= bd.Pos(0.0, 10.0, z) * (
            bd.Rot(0.0, 90.0, 0.0)
            * bd.Cylinder(radius=AGUJERO_R, height=BRAZO_ANCHO + 20.0)
        )
        # EL NÚMERO, debajo de su agujero. Va HUNDIDO: en relieve se lo comería
        # el primer roce de un disco al pasar.
        texto = bd.Text(str(i + 1), font_size=NUMERO_ALTO)
        marca = bd.extrude(texto, amount=NUMERO_HONDO * 2.0)
        marca = marca.rotate(bd.Axis.Y, 90.0)
        pieza -= bd.Pos(cara - NUMERO_HONDO, -18.0, z) * marca
    return pieza


def brazo_spotter_pieza():
    pieza = _culata() + _brazo()
    pieza = _numerados(pieza)
    # EL CUARTO DE VUELTA DE EXPORTACIÓN (ver la cabecera). Aquí importa más que
    # en ninguna otra pieza: la app declara por qué EJE LOCAL se alarga el brazo,
    # y sin este giro ese eje no sería el del brazo.
    pieza = pieza.rotate(bd.Axis.X, 90.0)
    pieza.label = "brazo_spotter"
    return pieza


@step(out="../STEP/brazo_spotter.step")
@stl(out="../STL/brazo_spotter.stl")
@glb(out="../GLB/brazo_spotter.glb")
def brazo_spotter():
    return brazo_spotter_pieza()


if __name__ == "__main__":
    brazo_spotter()
