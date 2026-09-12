#!/usr/bin/env python3
"""DE UNA MALLA CAD AL PREFAB DE EXERSUITE3D.

Convierte el STL que escribe un modelo de `cad/src/` en un `.json` con el
formato de prefab de la aplicación, listo para insertarlo con
«Archivo → Importar prefab…» sin importar un GLB a mano ni colocar la pieza a
ojo.

    python cad/a_prefab.py                      # todas las que haya en STL/
    python cad/a_prefab.py STL/carril_topes.stl # una

UNA SOLA CONVERSIÓN: LAS UNIDADES. cadgen trabaja en milímetros y la app en
centímetros, así que se divide por diez. Sin eso la pieza entra diez veces más
grande y parece que el modelo está mal cuando lo que está mal es la escala.

LOS EJES NO SE TOCAN, a diferencia del GLB. El GLB sale Y-arriba por el
convenio de glTF y hay que enderezarlo a mano al importarlo; aquí no, porque
cada modelo de `cad/src/` declara en su cabecera el sistema en el que está
escrito y los que copian una pieza de la app usan EL DE LA APP. Así el prefab
entra derecho. El carril de topes es la excepción a propósito —está en su
propio plano, porque la inclinación es del montaje— y hay que tumbarlo al
colocarlo.

La malla se INDEXA al escribirla: un STL repite cada vértice compartido por sus
caras, y soldarlos baja el fichero a la mitad larga sin tocar la forma.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
ORIGEN = RAIZ / "STL"
DESTINO = RAIZ / "JSON"

# El milímetro del CAD son 0,1 cm de la app.
A_CM = 0.1
# Cuánto se redondea un vértice: la centésima de centímetro son 0,1 mm, muy por
# debajo de lo que se corta en un taller, y recorta el fichero.
DECIMALES = 3


def _triangulos(ruta: Path) -> list[tuple[float, float, float]]:
    """Los vértices de un STL binario, en su orden de triángulo."""
    b = ruta.read_bytes()
    n = struct.unpack_from("<I", b, 80)[0]
    if 84 + n * 50 != len(b):
        raise ValueError(f"{ruta.name}: no es un STL binario de {n} triángulos")
    out: list[tuple[float, float, float]] = []
    for i in range(n):
        o = 84 + i * 50 + 12
        for k in range(3):
            x, y, z = struct.unpack_from("<3f", b, o + k * 12)
            out.append((x * A_CM, y * A_CM, z * A_CM))
    return out


def _indexar(verts: list[tuple[float, float, float]]) -> tuple[list[float], list[int]]:
    """Suelda los vértices repetidos y devuelve (posiciones, índices)."""
    unico: dict[tuple[float, float, float], int] = {}
    pos: list[float] = []
    idx: list[int] = []
    for v in verts:
        clave = (round(v[0], DECIMALES), round(v[1], DECIMALES), round(v[2], DECIMALES))
        i = unico.get(clave)
        if i is None:
            i = len(unico)
            unico[clave] = i
            pos.extend(clave)
        idx.append(i)
    return pos, idx


def prefab(ruta: Path) -> dict:
    pos, idx = _indexar(_triangulos(ruta))
    nombre = ruta.stem
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    dims = [
        round(max(xs) - min(xs), DECIMALES),
        round(max(ys) - min(ys), DECIMALES),
        round(max(zs) - min(zs), DECIMALES),
    ]
    return {
        "formato": "exersuite3d-prefab",
        "version": 2,
        "label": nombre,
        "piezas": [
            {
                # `comp` no genera nada cuando hay malla, pero el formato lo
                # pide y deja dicho de dónde vino la pieza.
                "comp": "imported",
                "nombre": nombre,
                "material": "acero",
                "pos": [0.0, 0.0, 0.0],
                "rotq": [0.0, 0.0, 0.0, 1.0],
                "fija": True,
                "dims": dims,
                "malla": {"pos": pos, "idx": idx},
            }
        ],
    }


def main(argv: list[str]) -> int:
    rutas = [Path(a) for a in argv[1:]] or sorted(ORIGEN.glob("*.stl"))
    if not rutas:
        print(f"no hay STL en {ORIGEN}", file=sys.stderr)
        return 1
    DESTINO.mkdir(exist_ok=True)
    for r in rutas:
        if not r.is_absolute():
            r = (Path.cwd() / r).resolve()
        datos = prefab(r)
        salida = DESTINO / f"{r.stem}.json"
        salida.write_text(json.dumps(datos, separators=(",", ":")), encoding="utf-8")
        m = datos["piezas"][0]
        print(
            f"{salida.relative_to(RAIZ)}  "
            f"{len(m['malla']['pos']) // 3} vértices · {len(m['malla']['idx']) // 3} caras · "
            f"{m['dims'][0]} × {m['dims'][1]} × {m['dims'][2]} cm · "
            f"{salida.stat().st_size // 1024} KB"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
