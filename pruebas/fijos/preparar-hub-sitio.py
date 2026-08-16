"""Lleva el catálogo del hub de la APLICACIÓN al sitio de marketing.

La verdad del catálogo vive en `src/ui/marketplace/datos.ts` y es TypeScript;
el sitio es Next.js en JavaScript y no puede importarlo. En vez de mantener dos
catálogos a mano —que es como se desincronizan— este guion lee el de la
aplicación y escribe `sitio-web/lib/hub-datos.json`.

SOLO PASAN LOS PRODUCTOS CON FOTOGRAFÍA. El dibujo SVG de cada ficha vive en
`arte.ts`, que tampoco viaja al sitio; y una tienda pública con la mitad de las
fichas en dibujo de relleno se ve a medio hacer. La regla deja el escaparate
público con lo que está terminado.

Se vuelve a correr cuando cambie el catálogo:

    python3 pruebas/fijos/preparar-hub-sitio.py
"""
import json
import os
import re
import shutil

RAIZ = "/home/user/EXERSUITE3D"
DATOS = os.path.join(RAIZ, "src/ui/marketplace/datos.ts")
SITIO = os.path.join(RAIZ, "sitio-web")
DEST_JSON = os.path.join(SITIO, "lib/hub-datos.json")
DEST_IMG = os.path.join(SITIO, "public/marketplace")
ORIG_IMG = os.path.join(RAIZ, "public/marketplace")

fuente = open(DATOS, encoding="utf-8").read()


def bloque(nombre):
    i = fuente.index(nombre)
    return fuente[i : fuente.index("\n];\n", i)]


# ---------------------------------------------------------------- marcas
marcas = []
for m in re.finditer(
    r'\{\s*id: "([^"]+)",\s*nombre: "([^"]+)",\s*corto: "([^"]+)",\s*pais: "([^"]+)",\s*'
    r"pyme: (true|false),\s*antiguedadMeses: (\d+),.*?logo: \"([^\"]+)\",",
    bloque("export const MARCAS"),
    re.S,
):
    marcas.append(
        {
            "id": m.group(1),
            "nombre": m.group(2),
            "corto": m.group(3),
            "pais": m.group(4),
            "pyme": m.group(5) == "true",
            "meses": int(m.group(6)),
            "logo": m.group(7),
        }
    )

# --------------------------------------------------------------- países
paises = {}
for m in re.finditer(
    r'\{ id: "([a-z]{2})", nombre: \["([^"]+)", "([^"]+)"\], bandera: "([^"]+)" \}',
    bloque("export const PAISES"),
):
    paises[m.group(1)] = {"es": m.group(2), "en": m.group(3), "bandera": m.group(4)}

# ------------------------------------------------------------ productos
productos = []
for linea in bloque("export const CATALOGO").split("\n"):
    if 'foto: "' not in linea:
        continue
    g = lambda p: (re.search(p, linea) or [None, None])[1]
    productos.append(
        {
            "id": g(r'id: "([^"]+)"'),
            "marcaId": g(r'marcaId: "([^"]+)"'),
            "es": re.search(r'nombre: \["([^"]+)", "([^"]+)"\]', linea).group(1),
            "en": re.search(r'nombre: \["([^"]+)", "([^"]+)"\]', linea).group(2),
            "categoria": g(r'categoria: "([^"]+)"'),
            "precio": int(g(r"precio: (\d+)")),
            "antes": int(g(r"antes: (\d+)") or 0),
            "notaEs": re.search(r'nota: \["([^"]+)", "([^"]+)"\]', linea).group(1),
            "notaEn": re.search(r'nota: \["([^"]+)", "([^"]+)"\]', linea).group(2),
            "discos": (g(r'rating: "([★☆]+)') or "").count("★"),
            "dias": int(g(r"lanzadoHaceDias: (\d+)")),
            "foto": g(r'foto: "([^"]+)"'),
        }
    )

# Solo viajan las marcas que tienen algo que enseñar.
conProducto = {p["marcaId"] for p in productos}
marcas = [m for m in marcas if m["id"] in conProducto]

datos = {
    "_generado": "pruebas/fijos/preparar-hub-sitio.py — no editar a mano",
    "paises": paises,
    "marcas": marcas,
    "productos": productos,
}
os.makedirs(os.path.dirname(DEST_JSON), exist_ok=True)
with open(DEST_JSON, "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, indent=1)

# ----------------------------------------------------------- imágenes
os.makedirs(os.path.join(DEST_IMG, "marcas"), exist_ok=True)
copiadas = 0
peso = 0
for p in productos:
    o = os.path.join(ORIG_IMG, p["foto"])
    shutil.copy2(o, os.path.join(DEST_IMG, p["foto"]))
    peso += os.path.getsize(o)
    copiadas += 1
for m in marcas:
    o = os.path.join(ORIG_IMG, "marcas", m["logo"])
    shutil.copy2(o, os.path.join(DEST_IMG, "marcas", m["logo"]))
    peso += os.path.getsize(o)
    copiadas += 1

print(f"marcas    {len(marcas):3d}")
print(f"productos {len(productos):3d} (de {bloque('export const CATALOGO').count('{ id: ')} del catálogo)")
print(f"imágenes  {copiadas:3d}  {peso / 1024:.0f} KB")
print(f"escrito   {DEST_JSON}")
