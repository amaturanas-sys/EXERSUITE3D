# Batería de pruebas de EXERSUITE3D

66 pruebas de extremo a extremo que corren **sobre el build real** con Playwright
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
  Sin él esa prueba sale en rojo; las otras 61 no la necesitan.

### Concurrencia

`correr-todo.sh` corre **tres a la vez** (`N=3`). Subirlo hace fallar a las que
miden tiempos de simulación —`atraviesa` y `cable-oculto` son las primeras en
caer, y con ellas `800-debug`, `800-debug3` y `uppermachine-lib`— y bajarlo a 1
tarda el triple sin arreglar nada más. Se puede cambiar con
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

Medido en serie en v0.2.89: **63 verdes y 3 rojos** de 66.

| prueba | por qué |
|---|---|
| `fable-v214` | rojo de antes: se agota el tiempo antes de arrancar |
| `uppermachine` | 5 aserciones: entran 41 piezas de 42 y 16 uniones de 18 |
| `v251` | 1 aserción: las piernas siguen entrando 2,5 cm en el banco |

**Los cuatro rojos del asistente ya no lo son.** `garaje`, `garaje2`,
`prototipo` y `prototipo2` llevaban versiones reventando con
`reading 'click' of null` y se daban por «rojos de antes, sin revisar». No era
la aplicación: **la herramienta de PROTOTIPO se mudó del Builder al visor** y
las cuatro seguían buscando el panel viejo, `#sec-prototipo`, que ya no existe.
Reescritas al camino real —componer en el Builder, Home → ▶ SIMULADOR → sesión
anterior, y 📸 Prototipo en la barra—, las cuatro pasan.

Y de paso quedó escrito lo que `prueba-prototipo` YA NO puede comprobar: los
botones «Pantalla verde» y «Captura compuesta» que medía no existen desde que
la herramienta se rehízo. La pantalla verde sigue en la API del editor pero no
la alcanza ningún mando, así que comprobarla sería medir código muerto y dar
una sensación de cobertura que no existe.

`freno` y `atraviesa`, fichadas como intermitentes, llevan dos tandas en verde
en serie. `cable-oculto`, los tres `800-debug` y `uppermachine-lib` solo caen en
paralelo. `sitio` pasa con el Next.js en el 3100.

### Esperar por RELOJ es la primera causa de rojo mentiroso

Dos pruebas daban por rotas cosas que funcionaban, y las dos por lo mismo:
contaban milisegundos en vez de esperar a que pasara algo.

- `hub` esperaba **700 ms** el viaje del carrusel, que dura **900** (`PLAZO_VIAJE`).
  Pasaba de milagro; el día que la máquina iba cargada, llegaba tarde.
- `placa-dentada` esperaba **2,6 s** a que cayera una barra. La simulación
  avanza por `requestAnimationFrame`, así que ese tope no mide pasos de física:
  mide lo desahogada que va la máquina. Con la batería al lado daba por
  inservibles dos ganchos de cuatro que funcionan.

Desde v0.2.75 esperan **a que la magnitud se quede quieta**, con tope por si
nunca se para. Dos trampas al escribir esa espera, y las dos las pisé:

- **Hay que exigir que se haya MOVIDO antes de aceptar la quietud.** Si no, se
  acepta la de los primeros milisegundos —cuando todavía no ha arrancado nada—
  y se lee el valor de salida por bueno. Esto mordió DOS veces: en `hub` daba
  un cero por bueno, y en `placa-dentada` daba por inservibles los cuatro
  ganchos de una placa que en serie los sujeta todos, porque con la batería al
  lado la simulación avanza tan pocos pasos entre lecturas que la barra parece
  quieta estando en el aire.
- **Dos lecturas quietas no bastan.** El desplazamiento suave hace mesetas a
  media animación: medido, 131, 131 y de ahí saltó a 1447.

La comprobación de que una espera así está bien escrita es correrla **con la
máquina cargada a propósito** —tres pruebas más en paralelo— y ver que sigue
verde. Si solo se prueba en una máquina ociosa, no se ha probado.

### Cuidado al juzgar un rojo: hay pruebas que revientan SIN imprimir un solo `✗`

Cuando una prueba muere con una excepción no capturada —el preview caído, un
selector que ya no existe— no llega a imprimir ninguna marca. Un vistazo que
solo busque `✗` la dará por buena. **Hay que mirar también el código de
salida**, que es lo que hace `correr-todo.sh`:

```bash
out=$(node prueba-x.mjs 2>&1); code=$?
malas=$(echo "$out" | grep -cE "✗|❌|PAGEERROR")
[ "$code" -eq 0 ] && [ "$malas" -eq 0 ] && echo VERDE || echo ROJO
```

Este error costó dar por verdes, en v0.2.63, unas cuantas que estaban rotas.

**Antes de dar por rojo nada, mira si el preview seguía vivo.** En la tanda de
v0.2.63 el `vite preview` del 4174 se murió a media carrera y se llevó por
delante a las nueve que corrían en ese momento. En la salida se ve claro:

```
page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4174/
```

Eso no es un fallo de la aplicación. Se levanta otra vez el preview y se repiten
esas pruebas.

Las nueve del maniquí —`maniqui-serie`, `maniqui-usa`, `maniqui-fisico`,
`apoyos`, `colocar`, `zonas`, `press-maquina`, `solape-ui` y `mano-brazo`— están
en verde.

`hub` también, con sus 62 comprobaciones, y `sitio`, con el Next.js arriba. Es la única que además deja las vistas
previas del hub (`hub-*.png`), que se miran, no se comparan.

`auditoria` (v0.2.77) reproduce los fallos del barrido adversarial, uno por
bloque: la herramienta que se come el clic de la siguiente, la línea guía que
sobrevive a «Nuevo proyecto», el arrastre de órbita que plantaba geometría, el
agujero que reventaba el perfil, el movimiento a mano que no avisaba, el .json
ajeno que vaciaba la escena, el ancla que se quedaba clavada y las partidas que
se colaban entre proyectos. No comprueban que el arreglo esté puesto —eso lo
diría un grep— sino que el fallo ya no pasa.

`sentadilla` (v0.2.75) mide que la postura de sentadilla sea CONGRUENTE y no
solo baja. No comprueba los cuatro números de la biblioteca de posturas —eso
sería comprobar que una constante vale lo que vale— sino las relaciones que
hacen que una sentadilla sea una sentadilla: la espinilla inclinada, el muslo
en la horizontal, la planta plana en el suelo, y que la cadena cuadre entre sí
(muslo − rodilla = espinilla). Los umbrales salen de medir el modelo del
diseñador, no de la aplicación.

Desde v0.2.78 cubre además las dos sentadillas CON BARRA. Ahí protege los dos
hechos que salieron de medir la secuencia del diseñador: que frontal y trasera
**comparten pierna** —en el modelo los extremos de muslo, tibia y pie coinciden
unidad a unidad, así que si alguien afina una y no la otra esto lo caza— y que
lo único que las separa es el rack, medido por dónde cae la mano: DELANTE del
hombro en la frontal y DETRÁS en la trasera. Ojo con la identidad plana `muslo
− rodilla = espinilla`: en estas NO vale, porque la cadera abre 36° y saca la
pierna del plano sagital; el ángulo que se conserva es el de la rodilla medido
en 3D.

`barra-maniqui` (v0.2.81) comprueba que la BARRA y el CUERPO estén de acuerdo.
Un rack se dimensiona por dónde queda la barra cargada, así que una barra que
se despega del cuerpo, que se queda plantada cuando la figura baja o que no cae
donde la espera el gancho arruina la medida sin que se note en la captura. La
comprobación que más vale no mide contra una constante sino contra el SUELO: en
la salida del peso muerto el disco tiene que APOYAR. Si la figura no llega a la
barra, flota — y eso es exactamente lo que pasaba antes de corregir la postura.

Desde v0.2.83 protege además los DOS fallos de apoyo que solo se vieron
midiendo, porque ninguno se notaba en una captura: que la barra APOYE en la piel
y no se hunda en ella —se mide la distancia de cada vértice al EJE de la barra,
que es un cilindro tumbado y toca por donde quiere—, y que la mano la SUJETE en
vez de apoyarse encima, con el puño envolviéndola. En su primera versión la mano
quedaba 8,2 cm por encima del eje y el puño 54° cruzado con la barra.

Ojo con una aserción que se RETIRÓ de aquí: decía que en los racks la barra no
debía estar en el puño. Era falsa — en un rack frontal la mano la toca, y debe
tocarla. Lo que distingue un rack de un press no es si la mano llega, sino QUIÉN
SOSTIENE la barra, y eso se comprueba doblando el codo: en el rack la barra no
se inmuta, en el press se va con la mano.

Y desde v0.2.84, que elegir un ejercicio deja armada su ZONA de movimiento y
solo esa, y que el empuje mueve la barra de verdad — 41 cm en el peso muerto,
20 en la sentadilla frontal, 6 en el press—, que es el recorrido completo de la
función de punta a punta.

`placa-dentada` (v0.2.73) mide la herramienta de tres toques y, sobre todo, la
FÍSICA: monta un rack de dos montantes con su placa cada uno y suelta una barra
sobre **cada uno** de sus ganchos. Que la placa se vea bien no dice nada — los
dos fallos que ha encontrado eran invisibles en la geometría: una placa
impecable que la barra atravesaba (el motor la había tomado por riel de guía) y
otra, también impecable, en la que la barra no ENTRABA en ningún gancho salvo
el de arriba.

De ahí la regla de esta prueba: **la barra se suelta sobre todos los ganchos, no
sobre uno**. La primera versión probaba el de más arriba, que es el único sin
otro diente encima, y por eso daba verde con once ganchos inservibles. Deja
`placa-dentada.png` y `placa-dentada-diagonal.png`.

El estado al día de cada versión está en el [CHANGELOG](../CHANGELOG.md), en la
sección «Sabido».

## Ficheros

- `prueba-*.mjs` — las pruebas, una por asunto.
- `ayudantes-maniqui.mjs` — ayudantes de página compartidos para juzgar al
  maniquí (la planta del pie, la piel más baja, la rodilla al tope, sentada
  sobre un apoyo).
- `correr-todo.sh` — corre todas y resume.
- `fijos/` — datos de entrada que alguna prueba necesita: los dos prefabs de la
  UpperMachine y `foto-garaje.jpg`, la fotografía que cargan las cinco pruebas
  del prototipo sobre foto.
- `salidas/` — lo que producen. No se versiona.
