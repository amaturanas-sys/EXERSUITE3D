# CAD de taller

Aquí viven las piezas de EXERSUITE3D modeladas con un **núcleo CAD de verdad**
(build123d, vía [cadgen](https://www.texttocad.dev)), no con las primitivas de
three.js. Lo que la app dibuja sirve para diseñar y simular; lo que hay aquí
sirve para **fabricar**: un STEP se abre en cualquier CAD y se manda a cortar.

El puente funciona en los dos sentidos:

    build123d  →  STEP   → el taller
               →  GLB    → «Importar modelo 3D…» en EXERSUITE3D

## Cómo se usa

```bash
python -m pip install -r ../.claude/skills/cad/requirements.txt   # una vez
python cad/src/punto_anclaje.py                                   # construye
```

Un script escribe **todas** sus salidas de una vez: las declara con decoradores
(`@step`, `@stl`, `@glb`) y al ejecutarlo aparecen en sus carpetas. Para
revisarlo sin abrir nada:

```bash
cadgen step inspect validate STEP/punto_anclaje.step   # ¿es un sólido sano?
cadgen step inspect refs     STEP/punto_anclaje.step   # caja, caras, aristas
```

## LAS UNIDADES NO SON LAS MISMAS

La app trabaja en **centímetros** y cadgen en **milímetros**. Un parámetro de la
pieza de la app —`horquillaAlto: 8`— se escribe aquí `80.0`. Está anotado en
cada script; al importar el GLB, la app lo lee otra vez en centímetros y los
números vuelven a cuadrar (medido en el punto de anclaje: 58 × 80 × 88 mm en el
STEP, 5,8 × 8,8 × 8,0 cm al importarlo).

Y el GLB sale **Y arriba**, así que la pieza entra girada un cuarto de vuelta
sobre X respecto de la orientación nativa de la app. Es un giro al colocarla,
no un error del modelo.

## Qué hay

| Pieza | Script | Equivale en la app a |
|---|---|---|
| Punto de anclaje (horquilla) | `src/punto_anclaje.py` | `kind: "horquilla"` |

## La estructura

```
cad/
  src/      los scripts: es lo ÚNICO que se edita a mano
  STEP/     el sólido, para el taller y para inspeccionar
  STL/      malla, para impresión
  GLB/      malla, para importar en EXERSUITE3D
```

El skill que gobierna todo esto está instalado en `.claude/skills/cad/`
(MIT, de [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad)).
