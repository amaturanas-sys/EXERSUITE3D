"""Cuarta tanda: lo que todavía se puede sacar de las fotografías que hay.

REGLA DE ORO DEL RECORTE: la zona de origen tiene que medir al menos unos 450
px de ancho. Por debajo de eso, ampliar a los 640 del hueco se nota, y una
ficha borrosa es peor que el dibujo que sustituye. Esa regla es la que deja
fuera la mitad de los candidatos —la mancuerna de la pared, el árbol de discos,
la kettlebell— por mucho que el objeto esté ahí.
"""
import os
from PIL import Image, ImageDraw

ORIG = "/root/.claude/uploads/d6818ea3-7371-552e-8a35-b6a89145ac9a"
DEST = "/home/user/EXERSUITE3D/public/marketplace"
PRUEBA = "/tmp/claude-0/-home-user-EXERSUITE3D/d6818ea3-7371-552e-8a35-b6a89145ac9a/scratchpad"

RACK_ESTUDIO = "61ddd39f-1000039523.jpg"   # rack con brazos, de estudio
SALA = "b58541cc-1000039507.jpg"           # sala moderna: multipower y torre
GARAJE_OSC = "8bdf0c19-1000039513.jpg"     # garaje de hormigón, el oscuro
NAVE = "858260e5-1000039509.jpg"           # nave enorme en blanco y negro

TRABAJOS = [
    # La barra cromada con sus discos, en primer plano y de estudio.
    ("p-barra.webp", RACK_ESTUDIO, (0.24, 0.42, 0.62, 0.84), 0.50, 82),
    # El multipower de la sala: es el asunto principal de la fotografía.
    ("p-multipower.webp", SALA, (0.24, 0.03, 0.66, 0.97), 0.50, 80),
    # La torre de poleas con su pila, al otro lado de la misma sala.
    ("p-torre-poleas.webp", SALA, (0.58, 0.06, 0.97, 0.97), 0.50, 80),
    # El rack del garaje oscuro, que se quedó libre al cambiar el banner.
    ("p-rack.webp", GARAJE_OSC, (0.11, 0.06, 0.56, 0.97), 0.50, 80),
    # Las prensas de la nave: lejos y en blanco y negro, pero son prensas.
    ("p-prensa.webp", NAVE, (0.00, 0.50, 0.42, 0.95), 0.50, 80),
]

ANCHO, ALTO = 640, 416


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


hechas = []
total = 0
for destino, origen, zona, foco, q in TRABAJOS:
    im = Image.open(os.path.join(ORIG, origen)).convert("RGB")
    W, H = im.size
    x0, y0, x1, y1 = zona
    zonaPx = int((x1 - x0) * W)
    im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    im = encajar(im, ANCHO, ALTO, foco)
    ruta = os.path.join(DEST, destino)
    im.save(ruta, "WEBP", quality=q, method=6)
    kb = os.path.getsize(ruta) / 1024
    total += kb
    hechas.append((destino, ruta))
    aviso = "  ← se amplía" if zonaPx < 450 else ""
    print(f"{destino:22s} zona {zonaPx:4d}px  {kb:6.1f} KB{aviso}")
print(f"{'TOTAL':22s}                {total:6.1f} KB")

cols, S = 3, 320
filas = (len(hechas) + cols - 1) // cols
hoja = Image.new("RGB", (cols * S, filas * (int(S * 0.65) + 20)), (26, 26, 26))
d = ImageDraw.Draw(hoja)
for i, (nombre, ruta) in enumerate(hechas):
    im = Image.open(ruta).resize((S, int(S * ALTO / ANCHO)))
    x, y = (i % cols) * S, (i // cols) * (int(S * 0.65) + 20)
    hoja.paste(im, (x, y))
    d.text((x + 5, y + int(S * 0.65) + 4), nombre, fill=(255, 255, 255))
hoja.save(os.path.join(PRUEBA, "recortes2.png"))
print("hoja de contacto lista")
