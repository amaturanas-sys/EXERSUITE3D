"""Recorta los 16 logotipos de la lámina y deja dos piezas de cada uno.

  · `icono-<id>.webp`  el emblema solo, cuadrado. Es lo que cabe en la burbuja
    de 64 px del carril de marcas: metiendo el logotipo entero el nombre saldría
    a dos píxeles de alto y no se leería.
  · `logo-<id>.webp`   el conjunto completo con su nombre, para donde haya
    anchura.

El corte entre emblema y nombre se busca solo: dentro de cada celda se mira
cuánta tinta hay por fila y se parte por el hueco en blanco más ancho de la
mitad de arriba, que es la separación que dejó el diseñador.
"""
import os
import numpy as np
from PIL import Image

ORIG = "/root/.claude/uploads/d6818ea3-7371-552e-8a35-b6a89145ac9a/5d389d3d-1000039516.jpg"
DEST = "/home/user/EXERSUITE3D/public/marketplace/marcas"
os.makedirs(DEST, exist_ok=True)

# Orden de lectura de la lámina, fila a fila.
IDS = [
    "promax", "steelcore", "titan", "equipx",
    "flexion", "ironworks", "vortex", "matrix",
    "powersquad", "optimus", "velocity", "apex",
    "gymnast", "revolution", "precision", "evolution",
]

COLS = [(321, 477), (517, 697), (734, 906), (941, 1105)]
FILAS = [(130, 260), (279, 394), (413, 531), (544, 673)]

im = Image.open(ORIG).convert("RGB")
a = np.asarray(im).astype(int)
tinta = (255 - a.min(axis=2)) > 28


def recuadro(x0, x1, y0, y1, margen):
    """Ajusta la caja a la tinta que haya dentro y le da aire."""
    sub = tinta[y0:y1, x0:x1]
    ys, xs = np.nonzero(sub)
    return (
        x0 + xs.min() - margen,
        y0 + ys.min() - margen,
        x0 + xs.max() + 1 + margen,
        y0 + ys.max() + 1 + margen,
    )


def corte(x0, x1, y0, y1):
    """Fila por la que separar el emblema del nombre.

    No se exige una fila del todo limpia: en varios logotipos el nombre roza el
    emblema y no hay ni un píxel de aire. Vale con que la fila tenga MUY poca
    tinta comparada con la más cargada de la celda, que es lo que distingue el
    valle entre dos bloques de un trazo cualquiera.
    """
    filas = tinta[y0:y1, x0:x1].sum(axis=1)
    alto = len(filas)
    if filas.max() == 0:
        return None
    flojo = filas <= filas.max() * 0.08
    mejor, largo = None, 0
    hueco = None
    for i, v in enumerate(flojo):
        if v:
            if hueco is None:
                hueco = i
        else:
            if hueco is not None:
                # Solo cuentan los valles de la mitad de arriba: los de abajo
                # separan las dos líneas del nombre, no el emblema del nombre.
                if hueco > alto * 0.18 and hueco < alto * 0.68 and i - hueco > largo:
                    largo, mejor = i - hueco, hueco
                hueco = None
    return None if mejor is None else y0 + mejor


def cuadrar(caja, lienzo):
    """Centra el recorte en un cuadrado blanco: la burbuja es redonda."""
    x0, y0, x1, y1 = caja
    trozo = im.crop((x0, y0, x1, y1))
    w, h = trozo.size
    lado = max(w, h)
    fondo = Image.new("RGB", (lado, lado), (255, 255, 255))
    fondo.paste(trozo, ((lado - w) // 2, (lado - h) // 2))
    return fondo.resize((lienzo, lienzo), Image.LANCZOS)


k = 0
total = 0
for (y0, y1) in FILAS:
    for (x0, x1) in COLS:
        pid = IDS[k]
        k += 1

        # ---- Conjunto completo
        caja = recuadro(x0, x1, y0, y1, 8)
        entero = im.crop(caja)
        ancho = 340
        entero = entero.resize((ancho, round(entero.size[1] * ancho / entero.size[0])), Image.LANCZOS)
        r1 = os.path.join(DEST, f"logo-{pid}.webp")
        entero.save(r1, "WEBP", quality=82, method=6)

        # ---- Emblema solo
        # El borde de abajo se clava en el corte: dándole aire, como a los otros
        # tres lados, volvería a entrar la cabeza de las letras.
        y = corte(x0, x1, y0, y1)
        cx0, cy0, cx1, cy1 = recuadro(x0, x1, y0, y if y else y1, 6)
        cajaIcono = (cx0, cy0, cx1, min(cy1, y) if y else cy1)
        icono = cuadrar(cajaIcono, 160)
        r2 = os.path.join(DEST, f"icono-{pid}.webp")
        icono.save(r2, "WEBP", quality=86, method=6)

        kb = (os.path.getsize(r1) + os.path.getsize(r2)) / 1024
        total += kb
        print(f"{pid:11s} corte={'—' if y is None else y - y0:>4}  {kb:5.1f} KB")

print(f"{'TOTAL':11s} {'':10s} {total:5.1f} KB")
