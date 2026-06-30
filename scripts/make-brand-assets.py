#!/usr/bin/env python3
"""Procesa las fotos del logotipo EXERSUITE3D en assets limpios de marca.

Umbraliza el arte negro sobre fondo claro, vuelve transparente el fondo
exterior (preservando los huecos blancos interiores del logo) y exporta
variantes recortadas y cuadradas para la interfaz, el favicon y los iconos
nativos (Tauri/Capacitor).
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

SRC = "/root/.claude/uploads/d6818ea3-7371-552e-8a35-b6a89145ac9a"
ICON = os.path.join(SRC, "6f5be151-1000038455.jpg")   # solo marca (placa+compás)
FULL = os.path.join(SRC, "a9949e2e-1000038456.jpg")   # lockup con wordmark
OUT = "/home/user/EXERSUITE3D/public/brand"
os.makedirs(OUT, exist_ok=True)

T = 110  # umbral: < T = arte negro


def clean(path):
    """Devuelve RGBA con arte negro, exterior transparente, huecos interiores blancos."""
    g = Image.open(path).convert("L")
    g = g.filter(ImageFilter.MedianFilter(5))  # quita el moteado de la pared
    a = np.array(g)
    # Pre-recorte por densidad: ignora motas sueltas fuera del logo.
    art0 = a < T
    h0, w0 = a.shape
    rows = art0.sum(1) > 0.02 * w0
    cols = art0.sum(0) > 0.02 * h0
    ys, xs = np.where(rows)[0], np.where(cols)[0]
    padx, pady = int(0.04 * w0), int(0.04 * h0)
    x0, x1 = max(0, xs.min() - padx), min(w0, xs.max() + padx)
    y0, y1 = max(0, ys.min() - pady), min(h0, ys.max() + pady)
    a = a[y0:y1, x0:x1]
    # 0 = arte (negro), 255 = claro
    b = np.where(a < T, 0, 255).astype("uint8")
    bm = Image.fromarray(b, "L")
    w, h = bm.size
    # Inunda el claro exterior desde el borde con el marcador 128.
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        if bm.getpixel(s) == 255:
            ImageDraw.floodfill(bm, s, 128, thresh=10)
    bb = np.array(bm)
    rgba = np.zeros((h, w, 4), "uint8")
    art = bb == 0
    ext = bb == 128
    inter = bb == 255  # huecos blancos interiores (knockout)
    rgba[art] = [17, 17, 17, 255]        # casi negro (tinta de marca)
    rgba[inter] = [255, 255, 255, 255]   # blanco knockout
    rgba[ext] = [0, 0, 0, 0]             # transparente
    im = Image.fromarray(rgba, "RGBA")
    # Recorta a la caja del arte (no transparente).
    alpha = im.split()[3]
    box = alpha.getbbox()
    return im.crop(box)


def square(im, size, bg=None, margin=0.10):
    """Centra `im` en un lienzo cuadrado, con margen relativo. bg=None => transparente."""
    w, h = im.size
    inner = int(size * (1 - 2 * margin))
    scale = min(inner / w, inner / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    r = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg is None else bg)
    canvas.alpha_composite(r, ((size - nw) // 2, (size - nh) // 2))
    return canvas


mark = clean(ICON)
full = clean(FULL)

# Marca transparente (para badge en la interfaz) y lockup transparente.
mark.save(os.path.join(OUT, "logo-mark.png"))
full.save(os.path.join(OUT, "logo-full.png"))

# Fuente cuadrada para iconos nativos: marca negra sobre blanco.
icon_src = square(mark, 1024, bg=(255, 255, 255, 255), margin=0.12)
icon_src.save("/home/user/EXERSUITE3D/scripts/icon-source.png")

# Favicons sobre blanco.
square(mark, 32, bg=(255, 255, 255, 255), margin=0.06).save(os.path.join(OUT, "favicon-32.png"))
square(mark, 180, bg=(255, 255, 255, 255), margin=0.10).save(os.path.join(OUT, "apple-touch-icon.png"))
# Marca blanca (invertida) sobre transparente, para superficies oscuras.
inv = np.array(mark)
black = (inv[:, :, 0] < 40) & (inv[:, :, 3] > 0)
white = (inv[:, :, 0] > 200) & (inv[:, :, 3] > 0)
inv[black] = [245, 245, 245, 255]
inv[white] = [0, 0, 0, 0]
Image.fromarray(inv, "RGBA").save(os.path.join(OUT, "logo-mark-light.png"))

for f in ["logo-mark.png", "logo-full.png", "logo-mark-light.png", "favicon-32.png", "apple-touch-icon.png"]:
    p = os.path.join(OUT, f)
    print(f, Image.open(p).size)
print("icon-source.png", Image.open("/home/user/EXERSUITE3D/scripts/icon-source.png").size)
