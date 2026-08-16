"""Recortes de producto de las tres fotografías nuevas.

Las tres traen MÁS DE UN producto dentro, así que de cada una salen varios
recortes: la foto de los agarres lleva además una pila de discos, y la del rack
lleva su propio detalle del pasador en un recuadro. Recortar es lo que las
convierte en fichas; usarlas enteras dejaría cinco tarjetas enseñando la misma
escena.
"""
import os
from PIL import Image

ORIG = "/root/.claude/uploads/d6818ea3-7371-552e-8a35-b6a89145ac9a"
DEST = "/home/user/EXERSUITE3D/public/marketplace"
PRUEBA = "/tmp/claude-0/-home-user-EXERSUITE3D/d6818ea3-7371-552e-8a35-b6a89145ac9a/scratchpad"

AGARRES = "62e5f22d-1000039524.jpg"   # los dos agarres de estribo, con discos detrás
BRAZOS = "61ddd39f-1000039523.jpg"    # brazos de seguridad sobre el rack, con detalle
GARAJE = "7269ff9e-1000039514.jpg"    # garaje de hormigón, bien iluminado

# destino, origen, zona (x0,y0,x1,y1 en fracción), ancho, alto, foco, calidad
TRABAJOS = [
    ("p-agarres.webp", AGARRES, (0.04, 0.08, 0.98, 0.96), 640, 416, 0.50, 80),
    ("p-discos-pila.webp", AGARRES, (0.36, 0.60, 0.70, 0.95), 640, 416, 0.50, 80),
    ("p-brazos.webp", BRAZOS, (0.06, 0.20, 0.76, 0.95), 640, 416, 0.50, 80),
    ("p-pasador.webp", BRAZOS, (0.705, 0.02, 0.985, 0.40), 640, 416, 0.50, 82),
    ("p-estacion.webp", GARAJE, (0.17, 0.13, 0.53, 0.96), 640, 416, 0.50, 80),
    # El banner de ForMakers: el mismo garaje que ya estaba, pero con luz.
    ("rec-formakers.webp", GARAJE, (0.0, 0.0, 1.0, 1.0), 1400, 640, 0.46, 76),
]


def encajar(im, ancho, alto, foco):
    objetivo = ancho / alto
    w, h = im.size
    if w / h > objetivo:
        nueva = int(h * objetivo)
        im = im.crop(((w - nueva) // 2, 0, (w - nueva) // 2 + nueva, h))
    else:
        nueva = int(w / objetivo)
        y = max(0, min(h - nueva, int((h - nueva) * foco)))
        im = im.crop((0, y, w, y + nueva))
    return im.resize((ancho, alto), Image.LANCZOS)


total = 0
hechas = []
for destino, origen, zona, ancho, alto, foco, q in TRABAJOS:
    im = Image.open(os.path.join(ORIG, origen)).convert("RGB")
    W, H = im.size
    x0, y0, x1, y1 = zona
    im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    im = encajar(im, ancho, alto, foco)
    ruta = os.path.join(DEST, destino)
    im.save(ruta, "WEBP", quality=q, method=6)
    kb = os.path.getsize(ruta) / 1024
    total += kb
    hechas.append((destino, ruta))
    print(f"{destino:22s} {ancho}x{alto}  {kb:6.1f} KB")
print(f"{'TOTAL':22s}          {total:6.1f} KB")

# Hoja de contacto para mirarlas de una vez.
cols, S = 3, 320
filas = (len(hechas) + cols - 1) // cols
hoja = Image.new("RGB", (cols * S, filas * (int(S * 0.65) + 20)), (26, 26, 26))
from PIL import ImageDraw

d = ImageDraw.Draw(hoja)
for i, (nombre, ruta) in enumerate(hechas):
    im = Image.open(ruta)
    im = im.resize((S, int(S * im.size[1] / im.size[0])))
    x, y = (i % cols) * S, (i // cols) * (int(S * 0.65) + 20)
    hoja.paste(im, (x, y))
    d.text((x + 5, y + int(S * 0.65) + 4), nombre, fill=(255, 255, 255))
hoja.save(os.path.join(PRUEBA, "recortes.png"))
print("hoja de contacto lista")
