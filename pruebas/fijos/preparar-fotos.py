"""Mete las fotografías del hub en el repositorio con el tamaño que se usan.

Van dentro del APK y del ejecutable de Windows, así que se recortan al encuadre
que pide cada hueco y se guardan en WebP. El original de Alberto no se toca.
"""
import os
from PIL import Image

ORIG = "/root/.claude/uploads/d6818ea3-7371-552e-8a35-b6a89145ac9a"
DEST = "/home/user/EXERSUITE3D/public/marketplace"
os.makedirs(DEST, exist_ok=True)

# (fichero de origen, nombre de destino, ancho, alto, foco vertical 0..1, calidad)
#
# El foco vertical dice qué franja se conserva al recortar. Por defecto el
# centro; se sube o se baja donde el asunto no está en medio —la bandera del
# garaje chileno está en el tercio de arriba, y la nave enorme se lee mejor
# dejando el techo fuera—.
TRABAJOS = [
    # ---- Banners de los cinco recorridos
    ("b58541cc-1000039507.jpg", "rec-newarrivals.webp", 1400, 640, 0.50, 76),
    ("03c7cd71-1000039498.jpg", "rec-newcomers.webp",   1400, 640, 0.50, 76),
    ("4a2a833b-1000039510.jpg", "rec-community.webp",   1400, 640, 0.42, 76),
    ("cb9c0577-1000039515.jpg", "rec-ondemand.webp",    1400, 640, 0.50, 76),
    ("8bdf0c19-1000039513.jpg", "rec-formakers.webp",   1400, 640, 0.46, 76),
    # ---- Secciones
    ("858260e5-1000039509.jpg", "unirse.webp",          1000, 620, 0.50, 76),
    ("69f91077-1000039511.jpg", "fm-publica.webp",      1200, 500, 0.55, 76),
    # ---- Fichas de producto (20:13, el encuadre de la tarjeta)
    ("6a2b6060-1000039506.jpg", "p-torre.webp",          640, 416, 0.42, 78),
    ("df7b1773-1000039499.webp", "p-smith.webp",         640, 416, 0.50, 78),
    ("650c2ba9-1000039503.jpg", "p-multigrip.webp",      640, 416, 0.50, 78),
    ("970c83cc-1000039497.jpg", "p-quimera.webp",        640, 416, 0.45, 78),
    ("dd3cf2f7-1000039504.jpg", "p-cadenas.webp",        640, 416, 0.50, 78),
]


def recortar(im, ancho, alto, foco):
    """Recorta al encuadre pedido conservando la franja que marca `foco`."""
    objetivo = ancho / alto
    w, h = im.size
    if w / h > objetivo:                      # sobra a los lados
        nueva = int(h * objetivo)
        x = (w - nueva) // 2
        im = im.crop((x, 0, x + nueva, h))
    else:                                     # sobra arriba y abajo
        nueva = int(w / objetivo)
        y = int((h - nueva) * foco)
        y = max(0, min(h - nueva, y))
        im = im.crop((0, y, w, y + nueva))
    return im.resize((ancho, alto), Image.LANCZOS)


total = 0
for origen, destino, ancho, alto, foco, q in TRABAJOS:
    im = Image.open(os.path.join(ORIG, origen)).convert("RGB")
    antes = im.size
    im = recortar(im, ancho, alto, foco)
    ruta = os.path.join(DEST, destino)
    im.save(ruta, "WEBP", quality=q, method=6)
    kb = os.path.getsize(ruta) / 1024
    total += kb
    print(f"{destino:22s} {antes[0]}x{antes[1]} -> {ancho}x{alto}  {kb:6.1f} KB")

print(f"{'TOTAL':22s} {'':13s}    {total:6.1f} KB")
