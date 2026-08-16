# Batería de pruebas de EXERSUITE3D

63 pruebas de extremo a extremo que corren **sobre el build real** con Playwright
sobre Chromium: levantan la aplicación, la manejan como la manejaría una persona
—clics en la paleta, arrastres, la herramienta de colocar— y comprueban lo que
sale midiendo la escena de three.js desde dentro de la página.

No son pruebas unitarias y no usan `vitest`. Cada `prueba-*.mjs` es un programa
independiente que se puede correr solo.

## Cómo correrlas

```bash
npm run build
npx vite preview --port 4174 --strictPort &
bash pruebas/correr-todo.sh
```

El resumen queda en `pruebas/salidas/_resumen.txt` y la salida de cada una en
`pruebas/salidas/<nombre>.txt`. Para una sola:

```bash
cd pruebas && node prueba-maniqui-serie.mjs
```

La suite entera tarda **unos 35 minutos**.

### Requisitos

- **El preview en el puerto 4174.** Levántalo desde la raíz del repositorio, no
  desde `pruebas/`, o servirá un bundle que no es el que acabas de construir.
- **Chromium.** Por defecto se usa el que trae Playwright en
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. En otra máquina, apunta
  a uno propio:
  ```bash
  CHROMIUM=/ruta/al/chrome bash pruebas/correr-todo.sh
  ```
- **`prueba-sitio` necesita además el sitio de marketing** en el puerto 3100:
  ```bash
  cd sitio-web && npm run dev -- --port 3100
  ```
  Sin él esa prueba sale en rojo; las otras 62 no la necesitan.

### Concurrencia

`correr-todo.sh` corre **tres a la vez** (`N=3`). Subirlo hace fallar a las que
miden tiempos de simulación —`atraviesa` y `cable-oculto` son las primeras en
caer— y bajarlo a 1 tarda el triple sin arreglar nada más. Se puede cambiar con
`N=1 bash pruebas/correr-todo.sh`.

Si una prueba falla en la tanda completa pero pasa sola, es esto.

## Cómo están escritas

Cada aserción es un `ok(condición, mensaje)` y la prueba imprime `✓` o `✗`. El
guion busca `❌`, `✗ ` o `PAGEERROR` en la salida, así que **un error de página
no capturado también la tumba**, que es lo que se quiere.

Las pruebas miden magnitudes físicas —centímetros, grados, cotas del suelo— y no
píxeles. Las capturas que dejan son para mirarlas, no para comparar.

### Umbrales: medir la propiedad, no el número

Varias aserciones compararon durante un tiempo contra números sacados del rig de
primitivas que tenía el maniquí (cilindros y cajas). Al pasar el maniquí a un
cuerpo escaneado con su propio esqueleto, esos números dejaron de valer sin que
nada se hubiera roto: la rodilla de un cuerpo sentado la fija el ASIENTO, y el
recorrido de un puño depende de lo largo que sea el brazo.

La regla, desde v0.2.61: **comprobar la propiedad, no el número**. En vez de
«la rodilla pasa de 60°», «la rodilla está tan doblada como el asiento permite
—doblarla 6° más mete la planta bajo el suelo—». Así no hay que recalibrar nada
con el próximo cuerpo. Los ayudantes comunes viven en
[`ayudantes-maniqui.mjs`](ayudantes-maniqui.mjs), con el razonamiento de cada uno
escrito al lado.

Dos trampas que ya costaron caras y están documentadas ahí:

- **La caja de un segmento no es su piel.** Cada pieza del maniquí lleva un
  collarín que se mete dentro de su vecina para que la articulación no se abra al
  doblarla. Ese collarín no pisa nada y al girar el pie puede quedar más bajo que
  la suela: midiendo cajas se ven hundimientos donde no los hay.
- **`humanFigure.position.y` no dice si está sentada.** La raíz del rig está en
  el suelo, entre los pies, no a la altura de la cadera. Para saber si está
  sentada se miran los glúteos contra la cara del asiento.

## Rojos conocidos

No todo está en verde, y conviene saber qué es qué antes de mirar un fallo:

| prueba | por qué |
|---|---|
| `sitio` | necesita el Next.js en el 3100 (ver arriba) |
| `atraviesa`, `cable-oculto` | solo fallan al correr en paralelo |
| `garaje`, `garaje2`, `prototipo`, `prototipo2`, `fable-v214`, `uppermachine`, `freno`, `v251` | rojos de antes, sin revisar |

El estado al día de cada versión está en el [CHANGELOG](../CHANGELOG.md), en la
sección «Sabido».

## Ficheros

- `prueba-*.mjs` — las pruebas, una por asunto.
- `ayudantes-maniqui.mjs` — ayudantes de página compartidos para juzgar al
  maniquí (la planta del pie, la piel más baja, la rodilla al tope, sentada
  sobre un apoyo).
- `correr-todo.sh` — corre todas y resume.
- `fijos/` — datos de entrada que alguna prueba necesita (prefabs).
- `salidas/` — lo que producen. No se versiona.
