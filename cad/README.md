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
| Placa dentada (6 ganchos) | `src/placa_dentada.py` | `kind: "dentada"` |
| Carril de topes (5 muescas) | `src/carril_topes.py` | lo que arma «Brazo con pilar regulable» |

### Las cotas no se vuelven a deducir aquí

Los scripts NO recalculan las fórmulas de la app: llevan las medidas que
`medidasDentada()` y compañía **resuelven** en la app, leídas de ella y pasadas
a milímetros. Copiar la fórmula sería copiar también sus errores, y una prueba
que compara una copia contra su original siempre pasa.

### El carril sobresale de sus dedos

En la app el carril empieza y acaba EXACTAMENTE en el primer y el último tope,
con lo que los dos dedos de los extremos quedan medio en el aire: no hay acero
debajo de su mitad de fuera. Se dibuja, pero no se suelda. El modelo CAD saca
50 mm de carril por cada punta (`VUELO_EXTREMO`), y por eso mide 684 mm de largo
donde la app pone 500.

### Los pernos son TALADROS, no bultos

En la app los pernos se dibujan como cilindros salientes —detalle, para que la
placa no parezca pegada con saliva—. Aquí son agujeros pasantes de Ø 9 mm, que
es lo que un taller necesita. Por eso la placa mide 8 mm de grueso en el STEP y
12,8 en la app: esos 4,8 de más eran las cabezas de los pernos.

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
