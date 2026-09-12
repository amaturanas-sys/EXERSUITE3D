"""PLACA DENTADA (upright dentado) — la plancha de ganchos, en CAD de taller.

La misma pieza que EXERSUITE3D genera con `kind: "dentada"`, modelada con un
núcleo CAD para poder sacar STEP acotado. Las cotas NO se vuelven a deducir
aquí: son las que resuelve `medidasDentada()` en la app para la placa de
fábrica (6 ganchos a 12,5 cm de paso), leídas de la app y pasadas a milímetros.
Volver a escribir la fórmula sería copiarla: si la fórmula se equivoca, la
copia se equivoca igual y nadie se entera.

EL PERFIL, tal como lo enseña el modelo del diseñador:

  · Una ESPINA recta —banda lisa— que se atornilla a la cara del pilar.
  · Cada gancho VUELA por delante de esa espina, sin comerse su respaldo, que
    es lo que aguanta el momento.
  · El gancho es un FALDÓN en diagonal desde la espina, una CUNA redonda donde
    se sienta la barra, y un DEDO que sube por fuera y la encierra. La boca
    queda ARRIBA: la barra entra desde arriba y no puede salir de lado.

UNA DIFERENCIA A PROPÓSITO CON LA PIEZA DE LA APP: allí los pernos se dibujan
como cilindros salientes —detalle, para que la placa no parezca pegada con
saliva—. Aquí son TALADROS PASANTES, que es lo que un taller necesita.

Sistema local, el mismo que el de la app para que la malla importada caiga
igual: X el ancho de la plancha (los ganchos salen hacia +X), Y el largo, Z el
grosor.
"""
from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

# ── COTAS RESUELTAS POR LA APP (cm × 10) ────────────────────────────────────
PASO = 125.0
DIENTES = 6
ANCHO = 155.277        # espina + vuelo
ESPINA = 50.0
VUELO = 105.277
GARGANTA = 80.0        # el hueco donde se sienta la barra
DEDO = 25.277
DEDO_ALTO = 37.625
RAMPA = 32.362         # cuánto baja el faldón desde la cuna
GROSOR = 8.0
LARGO = 770.0
CANTO_ESPINA = -27.638  # X donde acaba la espina y empieza el vuelo
CARA_DEDO = 52.362      # X de la cara interior del dedo

# Cuánto muerde el diente la plancha, para que funda con ella sin costura.
SOLAPE = 6.0

# Asientos: la Y del punto más bajo de cada cuna.
ASIENTOS = (-312.5, -187.5, -62.5, 62.5, 187.5, 312.5)

# ── PERNOS ──────────────────────────────────────────────────────────────────
# Una columna sobre la espina y tres filas, que es lo que la app reparte para
# esta placa. Taladro de 9 mm: paso franco para un M8.
PERNO_R = 4.5
PERNO_X = -52.6385
PERNO_Y = (-347.5, 0.0, 347.5)

X_FUERA = ANCHO / 2.0            # el canto exterior, por donde sube el dedo
RADIO_CUNA = GARGANTA / 2.0
RADIO_PUNTA = min(DEDO / 2.0, DEDO_ALTO / 2.0)
CUNA_X = (CANTO_ESPINA + CARA_DEDO) / 2.0


def _contorno_diente(y: float) -> bd.Sketch:
    """El contorno de UN gancho, sentado a la altura `y`.

    Se recorre el perfil entero: faldón curvo de la espina al canto, dedo por
    fuera, punta roma, y de vuelta por la cuna. El arco de la cuna es media
    circunferencia del diámetro de la garganta — por eso la barra se sienta y
    no baila.
    """
    with bd.BuildSketch() as boceto:
        with bd.BuildLine():
            inicio = (CANTO_ESPINA - SOLAPE, y - RAMPA)
            # EL FALDÓN, CURVO: en el acero real es un radio de doblado, no una
            # esquina. Sale de la plancha y se levanta hasta el canto exterior.
            bd.Bezier(
                inicio,
                (CANTO_ESPINA + VUELO * 0.55, y - RAMPA * 0.5),
                (X_FUERA, y),
            )
            # El dedo sube por fuera…
            bd.Line((X_FUERA, y), (X_FUERA, y + DEDO_ALTO - RADIO_PUNTA))
            # …y remata en punta roma.
            bd.RadiusArc(
                (X_FUERA, y + DEDO_ALTO - RADIO_PUNTA),
                (X_FUERA - 2 * RADIO_PUNTA, y + DEDO_ALTO - RADIO_PUNTA),
                RADIO_PUNTA,
                short_sagitta=False,
            )
            bd.Line(
                (X_FUERA - 2 * RADIO_PUNTA, y + DEDO_ALTO - RADIO_PUNTA),
                (CARA_DEDO, y + RADIO_CUNA),
            )
            # LA CUNA, media circunferencia: el asiento de la barra.
            bd.RadiusArc(
                (CARA_DEDO, y + RADIO_CUNA),
                (CUNA_X - RADIO_CUNA, y + RADIO_CUNA),
                -RADIO_CUNA,
                short_sagitta=False,
            )
            bd.Line(
                (CUNA_X - RADIO_CUNA, y + RADIO_CUNA),
                (CANTO_ESPINA - SOLAPE, y + RADIO_CUNA),
            )
            bd.Line((CANTO_ESPINA - SOLAPE, y + RADIO_CUNA), inicio)
        bd.make_face()
    return boceto.sketch


@step(out="../STEP/placa_dentada.step")
@stl(out="../STL/placa_dentada.stl")
@glb(out="../GLB/placa_dentada.glb")
def placa_dentada():
    with bd.BuildPart() as placa:
        # LA PLANCHA: rectángulo liso, de su canto exterior hasta el canto de
        # la espina. Se estira y se estrecha sin tocar los ganchos.
        with bd.BuildSketch() as plancha:
            bd.Rectangle(
                CANTO_ESPINA + ANCHO / 2.0,
                LARGO,
                align=(bd.Align.MIN, bd.Align.CENTER),
            )
            bd.Plane.XY  # el boceto vive en XY; se extruye el grosor en Z
        bd.extrude(amount=GROSOR)
        # La plancha nace en X = −ancho/2, así que el rectángulo se corre.
        placa.part.move(bd.Location((-ANCHO / 2.0, 0.0, 0.0)))

        # LOS DIENTES, uno por asiento, mordiendo el canto de la plancha.
        for y in ASIENTOS:
            with bd.BuildSketch():
                bd.add(_contorno_diente(y))
            bd.extrude(amount=GROSOR)

        # LOS TALADROS de fijación, pasantes.
        for y in PERNO_Y:
            with bd.Locations(bd.Location((PERNO_X, y, 0.0))):
                bd.Cylinder(
                    radius=PERNO_R,
                    height=GROSOR * 3.0,
                    align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER),
                    mode=bd.Mode.SUBTRACT,
                )

    part = placa.part
    # El grosor se centra en Z, como en la app.
    part = part.moved(bd.Location((0.0, 0.0, -GROSOR / 2.0)))
    part.label = "placa_dentada_seis_ganchos"
    return part


if __name__ == "__main__":
    placa_dentada()
