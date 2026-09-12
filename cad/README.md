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
python cad/src/punto_anclaje.py    # construye STEP + STL + GLB
python cad/a_prefab.py             # y el JSON para meterlo en la app
```

`a_prefab.py` escribe en `JSON/` un prefab por pieza —la malla entera, en
centímetros— que se inserta con «Archivo → Importar prefab…». Los ejes no se
tocan (el GLB sí sale Y-arriba y hay que enderezarlo a mano); sólo cambian las
unidades.

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
| Punto de anclaje · horquilla | `src/punto_anclaje.py` | `kind: "horquilla"` |
| Punto de anclaje · abrazadera | `src/punto_anclaje_abrazadera.py` | `pasadorAbraza: true` |
| Placa dentada (6 ganchos) | `src/placa_dentada.py` | `kind: "dentada"` |
| Carril de topes (5 muescas) | `src/carril_topes.py` | lo que arma «Brazo con pilar regulable» |
| Disco indexado (24 posiciones) | `src/disco_indexado.py` | — (añadido opcional al pivote) |
| Pin de seguro | `src/pin_seguro.py` | — (va con el disco) |
| Agarre doble de polea | `src/agarre_doble.py` | `agarre-doble` (en la paleta) |
| Agarradera en D (una mano) | `src/agarre_simple.py` | `agarre-d` (en la paleta) |
| Cuerda de tríceps | `src/cuerda_triceps.py` | `cuerda-triceps` (en la paleta) |

### Una pieza de `cad/` en la PALETA

El agarre doble no se inserta como prefab: es un COMPONENTE. La receta, para las
variantes que vengan:

1. el modelo en `src/`, que escribe su GLB;
2. `cp GLB/<pieza>.glb public/models/components/<id>.glb`;
3. la entrada `"<id>": "<id>.glb"` en `public/models/components/manifest.json`;
4. y el componente en `componentLibrary.ts` con su bulto de reserva, su masa y
   —si el GLB lo deja tumbado— su `orientacion` de inserción.

### El seguro del pivote

El disco y el pin son un sistema: el disco se ensarta en el mismo pasador que
hace de pivote y va soldado al soporte; el brazo gira por delante con un solo
taladro a la misma distancia del eje, y el pin los atraviesa. 24 agujeros, 15°
de paso.

Las dos medidas que los unen NO se escriben dos veces. El vástago del pin sale
del agujero del disco menos la holgura (`from disco_indexado import SEGURO_R`),
y el disco se niega a construirse si entre agujero y agujero queda menos acero
que el radio del propio agujero. Subir `AGUJEROS` afina el paso y adelgaza ese
puente: el guardián dice cuándo se pasó.

### Una forma, dos piezas

La horquilla y la abrazadera salen de la MISMA fábrica (`src/lib/horquilla.py`),
porque en el acero son la misma pieza montada del revés. Lo único que cambia
son los números: la garganta se abre a lo que pasa entre las orejas —el brazo
que gira en una, la viga que se cruza en la otra— y el vuelo es lo que las
orejas tienen que salvar hasta el eje.

| | Garganta | Vuelo | Envolvente |
|---|---|---|---|
| Horquilla | 42 (el brazo) | 40 (cara → eje) | 58 × 80 × 88 |
| Abrazadera | 54 (la viga) | 35 (cara → eje, cruzando) | 70 × 80 × 83 |

`lib/` es código compartido, no modelos: nada de lo que hay ahí lleva `@step`.

### UNA CUERDA TORCIDA CUESTA LO QUE CUESTA

La colcha de la cuerda de tríceps son TRES BARRIDOS HELICOIDALES —un círculo
por cada cabo, siguiendo su propia hélice alrededor de la directriz—, y eso
tiene un precio que ninguna otra pieza de aquí paga:

  · el STEP pesa **19 MB**, más que todas las demás piezas juntas: son tres
    superficies de forma libre con cien tramos cada una;
  · y la malla, con la tolerancia de casa, salía con **900.000 caras** y 21 MB
    de GLB. Quien manda ahí es la tolerancia ANGULAR (`mesh_angular_tolerance`),
    no la lineal —que es RELATIVA a la diagonal de la pieza y apenas muerde—:
    con 1,1 rad baja a 105.000 caras y 2 MB sin que el torcido se vuelva un
    prisma.

Dos cosas que se probaron y NO se quedaron, para no volver a intentarlas:

  · **taponar el canalillo del centro** con un alma barrida. Con `CABO_R <
    CABO_D` los tres cabos se tocan entre sí pero no llegan al eje, así que por
    dentro queda un hueco de menos de un milímetro —como en la cuerda de
    verdad—. El alma lo cerraba, sí, y de paso subía la malla de 105.000 a
    642.000 caras y el GLB de 2 a 14 MB, todo por superficie que desde fuera no
    se ve.
  · **pedir marco de Frenet en la directriz**. Frenet se apoya en la curvatura y
    la directriz tiene dos tramos RECTOS: el barrido revienta con
    `MakePipeShell::MakeSolid`. Las hélices de los cabos no dan ese problema
    porque no dejan de curvarse nunca.

### MODO ÁLGEBRA O `BuildPart`, PERO NO LOS DOS

`build123d` decide qué hace `bd.Cylinder(...)` según haya o no un `BuildPart`
abierto: sin él DEVUELVE un sólido; con él **lo añade a la pieza en curso, en el
origen**, y además te lo devuelve. Una fábrica escrita para modo álgebra
—`lib/tubos.py`— llamada dentro de un `with BuildPart()` deja entonces una copia
fantasma en el origen por cada llamada. Así apareció el tubo que atravesaba los
dos mangos del agarre doble (v0.3.46): cuatro cilindros de Ø 16 solapados en el
centro.

Las fábricas de `lib/tubos.py` ahora se niegan a construirse dentro de un
constructor y lo dicen. Un modelo que las use se compone con `+` y
`bd.Pos`/`bd.Rot`, sin `BuildPart`.

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
