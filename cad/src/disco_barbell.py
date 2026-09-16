"""DISCOS «STANDARD BARBELL» — cinco libras distintas, en CAD de taller.

Copiados de tres referencias: el OBJ original del disco —que es el que manda en
CÓMO SE CONSTRUYE—, el cartel del juego en libras con sus cotas en pulgadas, y
la ficha «Olympic Weight Plate Specifications».

CÓMO SE CONSTRUYE UN DISCO, medido en el OBJ original. No es una chapa plana:
es una RUEDA, y su perfil de dentro afuera dice tres cosas y sólo tres —

    · un CUBO macizo alrededor del agujero, del grueso entero;
    · un ALMA FINÍSIMA en el medio: en el OBJ, 5 mm sobre 61 de canto. Eso es
      el 8 %. El disco es casi hueco, y por eso pesa lo que pesa en vez del
      doble;
    · una LLANTA maciza por fuera, del grueso entero, que DOMINA a los radios
      por un escalón de 1 cm —en la foto no están a ras: la llanta sobresale, y
      ese escalón es lo que le da al disco su relieve y su sombra—, con el canto
      achaflanado. Y es ella la que PONE EL LÍMITE por fuera a los radios y al
      alma: lo vaciado llega hasta su borde interior y ahí se para. Ese anillo
      macizo del canto entero es mucho hierro —casi cuatro kilos en el de
      45 lb—, y es lo que permite que los radios sean tan estrechos como en la
      foto sin que el disco engorde.

El OBJ no lleva cruz ni letras —es la rueda pelada—; eso lo ponen las fotos.

LO QUE PONEN LAS FOTOS. En el cartel del juego, los de 45 y 35 lb llevan una
CRUZ de cuatro radios rectos que parte el alma en cuatro cuarteles; los de 25,
10 y 5 no la llevan, su alma es un anillo liso. Y el rotulado cambia con ello:

    con cruz   los CUATRO rótulos van DENTRO de los cuarteles, uno en cada uno:
               «BARBELL» curvado en el de arriba, «STANDARD» curvado en el de
               abajo, y las libras y los kilos en dos renglones rectos en los
               de los lados —«45 / LBS» a la izquierda, «20.4 / KGS» a la
               derecha—. La llanta va LIMPIA, sin una letra;
    sin cruz   los tres rótulos dan la vuelta al anillo vaciado: «STANDARD»
               arriba, las libras abajo a la izquierda y los kilos abajo a la
               derecha. La llanta, otra vez limpia.

EL ROTULADO VA EN EL FONDO DE LO VACIADO, NO EN LA LLANTA. Es lo que se ve en la
foto y no es un detalle de estilo: la letra queda hundida y protegida, que es
justo por lo que un disco se puede apilar y arrastrar sin comerse su marca.

TODAS las letras miran hacia AFUERA, en los dos casos, así que las de abajo se
leen del revés. No es un error: es como sale del molde y es como están en la
foto.

LAS COTAS, DEL CARTEL, EN PULGADAS Y EN LIBRAS —que es como se vende el juego,
sin interpolar desde una tabla en kilos—:

    45 lb  Ø17.375" × 1.4"     10 lb  Ø9.25"  × 0.85"
    35 lb  Ø13.75"  × 1.4"      5 lb  Ø7.75"  × 0.65"
    25 lb  Ø11"     × 1.4"

FÍJESE EN QUE 45, 35 Y 25 TIENEN EL MISMO CANTO: 1.4 pulgadas los tres. El disco
grande no es el chico engordado — crece de diámetro y se queda igual de grueso.
Eso es lo que ninguna proporción inventada acierta, y es la razón de copiar el
cartel en vez de escalar.

EL AGUJERO NO CAMBIA NUNCA. Ø50, el de la manga olímpica. Las tres referencias
lo repiten —«opening collars 5cm», «50 aperture»— en todas sus filas. Un disco
que no entra en la barra no es un disco.

EL ALMA NO SE DIBUJA: SE RESUELVE. Macizo, el de 45 lb pesaría 38.7 kg en vez de
20.4. Así que este modelo no ahonda el alma «a ojo» y luego mide a ver qué sale:

    se PIDE el peso de catálogo y se DESPEJA cuánto hay que ahondar por cara.

`medidas()` hace ese despeje y revienta si la cuenta pidiera un alma más fina de
lo que se puede fundir, en vez de exportar una pieza que miente sobre su peso.
Que al de 45 le salgan 2.7 mm de alma —el 7.7 % de su canto— no es casualidad:
el OBJ original tiene 5 sobre 61, que es el 8.2 %.

SOBRE EL MATERIAL. Se cuenta con hierro fundido, 7.2 g/cm³, que es de lo que
está hecho un disco de este tipo. Con la densidad del acero —7.85— habría que
vaciar tanto el de 45 que el alma no llegaría a milímetro y medio: no se funde.

Sistema local: Z es el eje del disco —el que enfila la barra— y el disco se
dibuja en el plano XY. Al final se gira un cuarto de vuelta sobre X, que es el
convenio de exportación de la casa: así el GLB llega a la app con el disco de
pie, como una rueda, y el agujero mirando a los lados.
"""

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── EL CARTEL DEL JUEGO ─────────────────────────────────────────────────────
# libras → (Ø pulgadas, canto pulgadas). El agujero es Ø50 mm en todas.
PULGADA = 25.4
CARTEL = {
    2.5: (6.25, 0.45),
    5: (7.75, 0.65),
    10: (9.25, 0.85),
    25: (11.0, 1.4),
    35: (13.75, 1.4),
    45: (17.375, 1.4),
}
LIBRA = 0.45359237      # kg por libra
LIBRAS = [5, 10, 25, 35, 45]

# ── LA RUEDA ────────────────────────────────────────────────────────────────
AGUJERO = 50.0          # Ø olímpico. LA COTA QUE NO CAMBIA.
DENSIDAD = 7.2e-3       # g/mm³, hierro fundido (ver la cabecera)
CRUZ_DESDE_LB = 35      # de aquí arriba, la cruz de cuatro radios
RADIOS = 4
# LAS PROPORCIONES SALEN DE LA FOTO, Y HAY QUE LEERLAS JUNTAS.
#
# Lo que hay que quitarle al disco está FIJADO por su peso de catálogo, así que
# un alma más fina sólo se consigue vaciando una superficie MENOR y más honda.
# Eso pone en tensión dos cosas que la foto pide a la vez: RADIOS ESTRECHOS —los
# del disco de verdad no llegan a la décima parte del radio— y un ALMA FINA.
# Radios estrechos dejan MÁS superficie que vaciar, y por tanto un alma más
# gorda. Parece un callejón sin salida y no lo es.
#
# LO QUE LO PAGA ES LA LLANTA. En la foto, la llanta es una banda ancha que
# llega al CANTO ENTERO del disco, y es ella la que pone el límite por fuera a
# los radios y al alma: nada de lo vaciado la muerde. Ese anillo macizo es mucho
# hierro —en el de 45 lb, casi cuatro kilos— y es el que compensa. Ensanchándola
# de 0.16 R a 0.195 R sobra masa para estrechar los radios de 0.16 R a 0.09 R y
# ADEMÁS bajar el alma de 3.0 a 2.7 mm.
CUBO_FRAC = 0.29        # radio del cubo, en fracción del radio del disco
CUBO_PARED = 18.0       # …pero nunca menos que esta pared alrededor del agujero
LLANTA_FRAC = 0.78      # radio interior de la llanta, ídem
RADIO_FRAC = 0.09       # ancho de cada radio de la cruz, ídem
RADIO_MIN = 12.0
# CUÁNTO SOBRESALE LA LLANTA SOBRE LOS RADIOS. En la foto los radios no están a
# ras de la llanta: ésta los domina, y ese escalón es lo que le da al disco su
# relieve y su sombra. 10 mm en los grandes, y nunca más de un tercio del canto
# —un escalón de 1 cm en una chapa de 16 no deja radio—.
#
# NO ES GRATIS: bajar los radios quita hierro, y ese hierro hay que devolverlo o
# el alma engorda. Lo devuelve, otra vez, la llanta: de 0.195 R a 0.22 R de
# ancho. Con eso el escalón entero sale y el alma se queda donde estaba.
SALIENTE = 10.0         # mm que la llanta domina a los radios
SALIENTE_FRAC = 0.30    # …pero nunca más de esta fracción del canto
# Y NUNCA TAN HONDO QUE SE COMA EL CUARTEL. El escalón baja los radios y el
# vaciado baja los cuarteles: si los dos acaban a la misma altura, la cruz
# desaparece. El de 35 lb lo enseñó —con 10 mm de escalón le quedaban 1.4 mm de
# cuartel por debajo—, así que se le exige esta holgura y el escalón cede.
CUARTEL_HOLGURA = 5.0
ALMA_MIN = 2.5          # lo más fino que se puede dejar el alma
CHAFLAN_FRAC = 0.09     # el canto de la llanta, matado, en fracción del grueso

# ── EL GRABADO ──────────────────────────────────────────────────────────────
# CUÁNTO SOBRESALE LA LETRA. 2.5 mm, que es lo que levanta una letra fundida de
# verdad. Con menos la marca está y se mide, pero sobre el hierro oscuro de la
# app no da sombra suficiente para leerse: el relieve de un disco se ve por el
# borde iluminado, no por el color.
RELIEVE = 2.5
# Los altos de letra van en fracción del ANCHO DE LO VACIADO —el cuartel o el
# anillo—, que es donde viven ahora. En los discos con cruz la letra curva tiene
# que caber además EN EL ARCO del cuartel: con 0.21 y el paso de abajo, la
# palabra más larga —«STANDARD», ocho letras— ocupa unos 72° de los 78 que deja
# el cuartel entre radio y radio. Subirlo la desborda.
TEXTO_CUARTEL = 0.21    # alto de la marca curva, en fracción del ancho del cuartel
TEXTO_ANILLO = 0.30     # ídem en los discos sin cruz, donde hay anillo entero
PASO_LETRA = 1.20       # separación entre letras, en anchos de letra
NUMERO_ALTO = 0.24      # alto del número, en fracción del ancho del cuartel
NUMERO_SEP = 1.25       # separación entre los dos renglones, en altos de letra
TEXTO_MARGEN = 0.62     # cuánto se separa el renglón del borde, en altos de letra


def cotas(lb: float) -> tuple[float, float, float]:
    """Diámetro y canto en mm, y masa en kg, de un disco de `lb` libras."""
    d, t = CARTEL[lb]
    return d * PULGADA, t * PULGADA, lb * LIBRA


def medidas(lb: float) -> dict:
    """Todas las cotas de un disco, con la hondura del alma YA RESUELTA."""
    diametro, espesor, kg = cotas(lb)
    r = diametro / 2.0
    r_agujero = AGUJERO / 2.0
    r_cubo = max(CUBO_FRAC * r, r_agujero + CUBO_PARED)
    r_llanta = LLANTA_FRAC * r
    radios = RADIOS if lb >= CRUZ_DESDE_LB else 0
    ancho_radio = max(RADIO_FRAC * r, RADIO_MIN)

    if r_llanta - r_cubo < 3.0 * ALMA_MIN:
        raise ValueError(
            f"el disco de {lb} lb no deja anillo donde vaciar: cubo hasta "
            f"{r_cubo:.1f} y llanta desde {r_llanta:.1f}"
        )

    # EL ÁREA QUE SE VACÍA: el anillo entre cubo y llanta, menos lo que se
    # llevan los radios. Un radio es una barra recta que cruza el anillo, así
    # que su parte dentro del anillo es ancho × largo del tramo.
    anillo = math.pi * (r_llanta**2 - r_cubo**2)
    area_radios = radios * ancho_radio * (r_llanta - r_cubo)
    area = anillo - area_radios
    saliente = min(SALIENTE, SALIENTE_FRAC * espesor) if radios else 0.0

    # LO QUE HAY QUE QUITAR. Macizo con el agujero hecho, menos lo que debe
    # pesar. Se reparte a partes iguales entre las dos caras.
    macizo = math.pi * (r**2 - r_agujero**2) * espesor
    objetivo = (kg * 1000.0) / DENSIDAD
    # EL ESCALÓN Y EL ALMA SE PERSIGUEN, así que se resuelven a la vez. Lo que
    # se lleva el escalón ya no hay que quitarlo del alma —luego un escalón más
    # hondo deja un alma más gorda—, y a su vez el escalón no puede acercarse al
    # fondo del cuartel más de lo que manda la holgura. Se itera: cada vuelta
    # recorta el escalón y el cuartel se ahonda, así que converge enseguida.
    def _hondo(sal: float) -> float:
        return (macizo - objetivo - area_radios * 2.0 * sal) / (2.0 * area)

    hondo = _hondo(saliente)
    for _ in range(8):
        tope = hondo - CUARTEL_HOLGURA
        nuevo = min(saliente, tope)
        if abs(nuevo - saliente) < 1e-3:
            break
        saliente = max(0.0, nuevo)
        hondo = _hondo(saliente)

    if hondo <= 0.0:
        raise ValueError(
            f"el disco de {lb} lb ya pesa {macizo * DENSIDAD / 1000:.2f} kg macizo "
            f"y la etiqueta pide {kg:.2f}: no hay nada que vaciar"
        )
    if saliente >= hondo:
        raise ValueError(
            f"el disco de {lb} lb pide un escalón de {saliente:.1f} mm y un alma "
            f"a {hondo:.1f}: los radios quedarían por debajo de los cuarteles"
        )
    if espesor - 2.0 * hondo < ALMA_MIN:
        raise ValueError(
            f"el disco de {lb} lb pide vaciar {hondo:.1f} mm por cara sobre "
            f"{espesor:.1f} de canto: el alma quedaría en "
            f"{espesor - 2 * hondo:.1f} mm y no se funde por debajo de {ALMA_MIN}"
        )

    return {
        "lb": lb,
        "kg": kg,
        "r": r,
        "espesor": espesor,
        "r_agujero": r_agujero,
        "r_cubo": r_cubo,
        "r_llanta": r_llanta,
        "radios": radios,
        "ancho_radio": ancho_radio,
        "hondo": hondo,
        "saliente": saliente,
        "alma": espesor - 2.0 * hondo,
    }


# ── EL GRABADO ──────────────────────────────────────────────────────────────
#
# EL RENGLÓN VA AL REVÉS, LAS LETRAS NO. Medido con una probeta, no razonado: se
# exportaron cuatro tratamientos del mismo renglón a cuatro radios de un mismo
# disco —crudo, espejando el conjunto, espejando cada letra, y con el orden
# invertido— y se miraron en la app. Las LETRAS llegan bien —una «G» es una
# «G»—; lo único torcido es el ORDEN: escrito «FG» se lee «GF».
#
# Es lo que tiene dibujar sobre un círculo: el ángulo crece hacia la izquierda,
# así que un renglón que se lee de izquierda a derecha por arriba va de ángulo
# MAYOR a MENOR. Escribir hacia ángulos crecientes, que es lo natural en un
# bucle, sale del derecho pero al revés de como se lee.
#
# Nada de espejos, por tanto: sólo se recorre el renglón hacia atrás.


def _texto_curvo(txt: str, radio: float, alto: float, centro: float, z: float):
    """Letras en relieve siguiendo la curva de la llanta.

    Se coloca letra a letra girando cada una alrededor del eje: `bd.Text` sólo
    sabe escribir recto, y una marca recta sobre una llanta de 44 cm se sale del
    anillo por las puntas.

    TODAS LAS LETRAS MIRAN HACIA AFUERA, sin excepción — es lo que hace el molde
    y es por lo que en la foto el «STANDARD» de abajo se lee del revés.
    """
    letras = [c for c in txt]
    paso = math.degrees(PASO_LETRA * alto / radio)
    arco = paso * max(1, len(letras) - 1)
    pieza = None
    for i, c in enumerate(letras):
        if c == " ":
            continue
        # De ángulo MAYOR a MENOR: así el renglón se lee de izquierda a derecha.
        ang = centro + arco / 2.0 - i * paso
        cara = bd.Text(c, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        cuerpo = bd.extrude(cara, amount=RELIEVE)
        # Su vertical apunta al radio, y luego a su sitio del arco.
        cuerpo = cuerpo.rotate(bd.Axis.Z, ang - 90.0)
        x = radio * math.cos(math.radians(ang))
        y = radio * math.sin(math.radians(ang))
        cuerpo = bd.Pos(x, y, z) * cuerpo
        pieza = cuerpo if pieza is None else pieza + cuerpo
    return pieza


def _texto_recto(lineas: list[str], x: float, z: float, alto: float):
    """Dos renglones rectos, centrados en (`x`, 0), sobre el fondo del cuartel.

    Aquí no hay arco, así que no hay nada que invertir: un renglón recto llega a
    la app tal cual (ver la nota de arriba).
    """
    sep = NUMERO_SEP * alto
    pieza = None
    for i, linea in enumerate(lineas):
        y = ((len(lineas) - 1) / 2.0 - i) * sep
        cara = bd.Text(linea, font_size=alto, align=(bd.Align.CENTER, bd.Align.CENTER))
        cuerpo = bd.extrude(cara, amount=RELIEVE)
        cuerpo = bd.Pos(x, y, z) * cuerpo
        pieza = cuerpo if pieza is None else pieza + cuerpo
    return pieza


def disco(lb: float):
    """La rueda entera: cubo, alma vaciada, llanta achaflanada y grabado."""
    m = medidas(lb)
    t, r = m["espesor"], m["r"]

    # LA RUEDA EN BRUTO, con el canto matado por fuera y por el agujero, como el
    # OBJ original —un disco de canto vivo no sale de ningún molde—.
    pieza = bd.Cylinder(radius=r, height=t)
    pieza -= bd.Cylinder(radius=m["r_agujero"], height=t + 20.0)
    chaflan = CHAFLAN_FRAC * t
    fuera = [e for e in pieza.edges().filter_by(bd.GeomType.CIRCLE)
             if abs(e.radius - r) < 0.01]
    pieza = bd.chamfer(fuera, length=chaflan)
    dentro = [e for e in pieza.edges().filter_by(bd.GeomType.CIRCLE)
              if abs(e.radius - m["r_agujero"]) < 0.01]
    pieza = bd.chamfer(dentro, length=chaflan / 2.0)

    # LO QUE SE VACÍA, EN DOS ALTURAS. El anillo entre cubo y llanta se parte en
    # los CUARTELES —hasta el alma, lo más hondo— y los RADIOS —sólo hasta el
    # escalón, para que la llanta los domine—. Una barra es simétrica respecto
    # del centro, así que dos barras hacen los cuatro radios.
    anillo = bd.Circle(m["r_llanta"]) - bd.Circle(m["r_cubo"])
    barras = None
    for i in range(m["radios"] // 2):
        ang = 45.0 + 90.0 * i
        b = bd.Rot(0.0, 0.0, ang - 90.0) * bd.Rectangle(m["ancho_radio"], 2.2 * r)
        barras = b if barras is None else barras + b
    cuarteles = anillo - barras if barras is not None else anillo
    radios_sk = anillo - cuarteles if barras is not None else None

    # Un vaciado por cara, cada uno sobresaliendo 10 mm por fuera del disco para
    # que la resta sea limpia y no deje caras coplanares.
    hondo = m["hondo"]
    corte = bd.extrude(cuarteles, amount=hondo + 10.0)
    pieza -= bd.Pos(0.0, 0.0, t / 2.0 - hondo) * corte
    pieza -= bd.Pos(0.0, 0.0, -t / 2.0 - 10.0) * corte
    if radios_sk is not None and m["saliente"] > 0.0:
        sal = m["saliente"]
        rebaje = bd.extrude(radios_sk, amount=sal + 10.0)
        pieza -= bd.Pos(0.0, 0.0, t / 2.0 - sal) * rebaje
        pieza -= bd.Pos(0.0, 0.0, -t / 2.0 - 10.0) * rebaje

    # EL ROTULADO, DENTRO DE LO VACIADO. Cambia con la cruz, como en la foto, y
    # en los dos casos se apoya en el FONDO —no en la llanta, que va limpia—.
    ancho = m["r_llanta"] - m["r_cubo"]
    fondo = t / 2.0 - hondo
    kg = f"{m['kg']:.1f}"

    if m["radios"]:
        # CON CRUZ: un rótulo por cuartel. Los de arriba y abajo, curvados
        # siguiendo el cuartel; los de los lados, rectos en dos renglones.
        alto = ancho * TEXTO_CUARTEL
        radio_texto = m["r_llanta"] - TEXTO_MARGEN * alto
        medio = (m["r_llanta"] + m["r_cubo"]) / 2.0
        alto_num = ancho * NUMERO_ALTO
        textos = [
            _texto_curvo("BARBELL", radio_texto, alto, 90.0, fondo),
            _texto_curvo("STANDARD", radio_texto, alto, 270.0, fondo),
            _texto_recto([f"{lb:g}", "LBS"], -medio, fondo, alto_num),
            _texto_recto([kg, "KGS"], medio, fondo, alto_num),
        ]
    else:
        # SIN CRUZ: los tres rótulos dan la vuelta al anillo, repartidos a
        # tercios — «STANDARD» arriba, las libras y los kilos abajo.
        alto = ancho * TEXTO_ANILLO
        radio_texto = m["r_llanta"] - TEXTO_MARGEN * alto
        textos = [
            _texto_curvo("STANDARD", radio_texto, alto, 90.0, fondo),
            _texto_curvo(f"{lb:g} LBS", radio_texto, alto, 210.0, fondo),
            _texto_curvo(f"{kg} KGS", radio_texto, alto, 330.0, fondo),
        ]

    # EL MISMO GRABADO POR DETRÁS. Un disco enfilado en la barra se ve por las
    # dos caras, y uno con la marca sólo por delante se delata en cuanto la
    # cámara pasa al otro lado.
    #
    # SE VOLTEA, NO SE ESPEJA. La tentación es espejar contra el plano del disco
    # y parece lo mismo, pero no lo es: eso deja la letra con la MISMA huella en
    # X e Y y sólo le cambia la cara, así que mirándola desde atrás se lee al
    # revés. Lo que hace un molde de verdad es dar media vuelta al disco, y eso
    # es un GIRO de 180° sobre un eje del propio disco: cambia de cara y además
    # invierte la X.
    for relieve in textos:
        if relieve is None:
            continue
        pieza += relieve
        pieza += relieve.rotate(bd.Axis.Y, 180.0)

    # El cuarto de vuelta del convenio de exportación (ver la cabecera).
    pieza = pieza.rotate(bd.Axis.X, 90.0)
    pieza.label = f"disco_barbell_{lb:g}lb"
    return pieza


@step(out="../STEP/disco_barbell_5lb.step")
@stl(out="../STL/disco_barbell_5lb.stl")
@glb(out="../GLB/disco_barbell_5lb.glb")
def disco_barbell_5lb():
    return disco(5)


@step(out="../STEP/disco_barbell_10lb.step")
@stl(out="../STL/disco_barbell_10lb.stl")
@glb(out="../GLB/disco_barbell_10lb.glb")
def disco_barbell_10lb():
    return disco(10)


@step(out="../STEP/disco_barbell_25lb.step")
@stl(out="../STL/disco_barbell_25lb.stl")
@glb(out="../GLB/disco_barbell_25lb.glb")
def disco_barbell_25lb():
    return disco(25)


@step(out="../STEP/disco_barbell_35lb.step")
@stl(out="../STL/disco_barbell_35lb.stl")
@glb(out="../GLB/disco_barbell_35lb.glb")
def disco_barbell_35lb():
    return disco(35)


@step(out="../STEP/disco_barbell_45lb.step")
@stl(out="../STL/disco_barbell_45lb.stl")
@glb(out="../GLB/disco_barbell_45lb.glb")
def disco_barbell_45lb():
    return disco(45)


if __name__ == "__main__":
    disco_barbell_5lb()
    disco_barbell_10lb()
    disco_barbell_25lb()
    disco_barbell_35lb()
    disco_barbell_45lb()
