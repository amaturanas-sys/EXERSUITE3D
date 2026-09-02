# AI_CONTEXT.md — EXERSUITE3D

> **Para quién es este documento.** Para un agente de IA (local o remoto) que va a
> leer, modificar y ampliar este repositorio sin haberlo visto nunca. No es un
> README de usuario: es el mapa mental que hay que tener cargado ANTES de tocar
> una línea. Léelo entero antes del primer cambio.
>
> **Cómo se hizo.** Barriendo el código real: siete lecturas paralelas del
> repositorio (núcleo, objetos, física, interfaz, arranque, maniquí, pruebas) con
> citas de archivo y línea. Las secciones de *estilo* y *deuda* se apoyan además
> en las listas de fragilidad que devolvió cada lectura. Nada aquí es suposición
> por el nombre de un archivo; cuando algo no está verificado, se dice.
>
> **Fecha del barrido:** 2026-08-26. **Versión del código:** 0.3.18.
> Si el repositorio ha avanzado mucho desde entonces, verifica antes de fiarte de
> un número de línea concreto: los conceptos aguantan, los números se mueven.

---

## 0. En una página

**Qué es.** Una aplicación de escritorio/móvil para **diseñar máquinas de
gimnasio** en 3D, simular su física y comprobar su **ergonomía** con un maniquí
articulado. No dibuja aproximaciones: dibuja piezas con medidas reales,
escaneadas de despieces de fabricante, que encajan entre sí como en el taller.

**Con qué está hecho.** TypeScript + Vite + three.js (render) + Rapier 3D (física,
WASM). **Sin ningún framework de interfaz**: el DOM se construye a mano. Se
empaqueta con Capacitor (APK Android) y Tauri (.exe Windows) desde el **mismo
bundle web**. Hay además un sitio de marketing aparte en `sitio-web/` (Next.js 14).

**Tamaño.** 79 archivos TypeScript, ~38.400 líneas en `src/`. 81 programas de
prueba en `pruebas/`. El archivo más grande, `src/core/Editor.ts`, tiene 12.329
líneas y es la clase central de todo.

**Lo que hay que interiorizar antes que nada:**

| # | Idea | Dónde vive |
|---|------|-----------|
| 1 | **1 unidad de mundo = 1 centímetro.** Sin excepciones ni factores ocultos. | `src/core/units.ts:1-6` |
| 2 | **Todo pasa por el `Editor`**, que habla con la interfaz solo por un bus de eventos tipado. | `src/core/Editor.ts`, `src/core/eventBus.ts` |
| 3 | **Las piezas DECLARAN lo que son**; el motor decide qué hacer leyendo esas banderas, no adivinando de la malla. | `src/objects/types.ts` (`ComponentDefinition`) |
| 4 | **DISEÑO ≠ PARTIDA**: se ve una cosa y manda otra. | `src/core/Editor.ts:6180-6309` |
| 5 | **Los comentarios cuentan qué bug motivó el código.** Son la documentación real. Léelos. | todo el repositorio |

---

## 1. Cómo levantar el proyecto

```bash
npm ci                    # instalar
npm run dev               # desarrollo (Vite, recarga en caliente)
npx tsc --noEmit -p tsconfig.json   # comprobación de tipos — SIEMPRE antes de commit
npm run build             # bundle de producción a dist/
```

Para correr la batería de pruebas (ver §8):

```bash
npm run build && npx vite preview --port 4174 --strictPort &   # DESDE LA RAÍZ
bash pruebas/correr-todo.sh
```

`npm test` está declarado como `vitest run` pero **no existe ningún test de
vitest** en el repositorio: ese script no prueba nada. La verificación real es la
batería de Playwright.

---

## 2. Arquitectura del sistema

### 2.1 La forma general

No hay capas ni inyección de dependencias. Hay **un objeto grande y muchos
módulos de dominio a los que ese objeto llama**:

```
                    ┌──────────────────────────────────────┐
   src/ui/*.ts  ◄───┤  editor.bus  (EventBus tipado)       │
   (paneles)    ────┤  ~60 eventos, Editor→UI              │
        │           └──────────────────────────────────────┘
        │ llamadas directas a métodos públicos
        │ + 3 callbacks inyectados (elegirRoldana, elegirBisagra, panelArticulaciones)
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  src/core/Editor.ts  (12.329 líneas)                    │
  │  escena · gizmo · piezas · grupos · herramientas ·      │
  │  historial · autoguardado · serialización · maniquí     │
  └───┬──────────────┬──────────────┬───────────────┬───────┘
      │              │              │               │
      ▼              ▼              ▼               ▼
  SceneManager   PhysicsWorld   src/objects/*   humanFigure
  (three.js)     (Rapier WASM)  (catálogo,      + poseLibrary
                                geometría)      + movimientos + armIK
```

**El Editor no conoce el DOM.** Emite eventos; los paneles se suscriben. Cuando
necesita preguntar algo a mitad de una herramienta, invoca un callback que la
interfaz le dejó puesto. Si esos callbacks están a `null` hay comportamiento por
defecto (roldana externa hacia arriba, bisagra con eje automático).

### 2.2 El patrón de MODO (la estructura más importante del Editor)

Cada herramienta es un **modo**: un flag privado + un `beginX()` + un `cancelX()`
+ una rama en `onPointerDown` + un evento en el bus.

`onPointerDown` (`src/core/Editor.ts:11607-12108`) es **una cascada de guardas con
`return`, y su ORDEN es la semántica**. De arriba abajo:

```
gizmo arrastrando → selección de área → arrastre directo → agarrar maniquí
→ colocar maniquí → freno de cable → apoyar mano/pie (IK)
→ ⟨GUARD DE SIMULACIÓN: aquí se corta todo lo de edición⟩
→ doblar por nodos → línea → cuerda → cable → terminal → placa dentada
→ roldana → bisagra → conectar → orbitar → selección normal
```

Dos ramas están **deliberadamente por encima** del guard de simulación —«apoyar
mano/pie» y «colocar maniquí»— porque tienen sentido con la física corriendo. El
comentario de `Editor.ts:11726-11732` lo explica. Reordenar la cascada rompe eso
sin producir ningún error visible.

**Para añadir una herramienta nueva hacen falta CINCO piezas.** Faltando una,
falla en silencio:

1. flag privado en `Editor`
2. `beginX()` que llame antes a `cancelarHerramientas()`
3. `cancelX()`
4. **entrada en `cancelarHerramientas()`** (`Editor.ts:3180`)
5. rama en `onPointerDown` + su evento en `EditorEvents`

El punto 4 es el que se olvida. Como cada rama hace `return` incondicional, un
modo que no se apaga **deja el visor sordo**: ni selecciona, ni deselecciona, ni
responde a otra herramienta. Está documentado en el propio código
(`Editor.ts:3191-3195`), donde cuenta que le pasó a la herramienta «✋ Agarrar».

### 2.3 DISEÑO vs PARTIDA (el concepto que más daño hace si se ignora)

- **DISEÑO** = el plano fabricable. De él salen la exportación, las acotaciones,
  la longitud de reposo de cada cable y el cero de cada articulación.
- **PARTIDA** = una condición de ensayo: dónde dejar el mecanismo para que **un
  cuerpo concreto** pueda empezar el gesto. Es propiedad del **maniquí**, no de la
  máquina: sin maniquí no hay partida (`partidaVigente()`, `Editor.ts:6175`).

**Se VE la partida y MANDA el diseño.** Las mallas pueden estar mostrando la
partida (`sincronizarPartidaVisible`, `Editor.ts:6206`) mientras el plano vive
aparte en `disenoDePartida`. Todo lo que necesite el plano tiene que pedirlo
envuelto en `conElDiseno(fn)` (`Editor.ts:6289-6309`), que repone el plano,
ejecuta y vuelve a pintar la partida.

`ponerPartida()` (`Editor.ts:8753`) es **la única puerta válida** para fijar una
partida, porque además rellena `disenoDePartida`. Una partida sin su plano deja a
`conElDiseno` sin sitio al que volver y **el plano fabricable se pierde para
siempre**.

### 2.4 Grupos y multiselección

Un grupo **no es un nodo de three.js**. Es `groups: Map<gid, {name, ids[]}>` más
un índice inverso `objGroup`. Las mallas nunca se reparentan. Para mover el
conjunto hay un `groupProxy` (un `Object3D` vacío) en el centroide: se calcula
`delta = actual · anterior⁻¹` y se premultiplica a la matriz de cada miembro.

**Crítico:** todo camino que mueva piezas en bloque debe llamar a
`transformarUniones(delta, ids)` (`Editor.ts:5238`), que aplica el mismo delta al
ancla y al eje de las articulaciones cuyas **dos** piezas van en el conjunto. El
ancla se guarda en coordenadas de **mundo**; sin esto el solver reconstruye la
bisagra en el punto viejo y la máquina se destroza al simular.

### 2.5 Historial y autoguardado

No hay comandos ni diffs: **cada paso del historial es el proyecto entero
serializado a string** (`JSON.stringify(this.serialize())`), con 300 ms de
debounce y 60 entradas de tope. Consecuencias que hay que tener presentes:

- Deshacer **recarga el proyecto entero y todos los ids de pieza cambian**.
  Cualquier referencia externa por id queda obsoleta tras un Ctrl+Z.
- `serialize()` llama a `reconciliarEdiciones()` (`Editor.ts:2951`): **serializar
  tiene efectos secundarios**, y ocurre en cada cambio.

Autoguardado en `localStorage` bajo `exersuite.autosave.v1`. No corre simulando,
ni suspendido, ni sobrescribe con una escena vacía.

---

## 3. Atributos diferenciados por clase de objeto

Este es el corazón del diseño y lo que hace que el proyecto escale: **una pieza
declara lo que es, y el resto del sistema le pregunta**. Nunca se adivina de la
malla ni se copia al objeto de escena.

Dos tipos en `src/objects/types.ts`:

- **`PrimitiveParams`** — la geometría de **una pieza concreta** de la escena.
  Siempre en cm. Se serializa entero, así que **todo lo que deba sobrevivir a
  guardar/cargar tiene que vivir aquí** (esa es la razón explícita de que
  `ventanas`, `canales`, `espejo`, `largoCm` y `pinOffsetCm` sean campos suyos).
- **`ComponentDefinition`** — la ficha de catálogo de un **tipo** de pieza. Se
  consulta **siempre** con `getDefinition(obj.componentId)`.

Las banderas, agrupadas por la clase de objeto que describen:

| Clase de objeto | Banderas | Qué significan |
|---|---|---|
| **Poste perforado** (pilares, montantes) | `holeStepCm`, `ejeCalce`, `holeDiameterCm`, `calceFase`, `calceFilas` | La grilla de pinholes es `calceFase + k·holeStepCm`, acotada por `calceFilas`. **No inventar filas**: sin `calceFilas` el límite es sintético y una jota acaba «calzada» sobre acero macizo. |
| **Pieza que CUELGA del poste** (jotas, ganchos, brazos) | `calceLocal`, `frenteCalce`, `postesCalce` | `calceLocal` es el punto del **manguito de ensamble**: al calzar, el eje del poste pasa por ahí y la pieza queda colocada, no flotando. `postesCalce: 2` = se tiende entre DOS pilares y sube/baja un agujero en ambos a la vez. |
| **Pieza PASANTE** (safety pin) | `ejePasante`, `params.pinOffsetCm` | No cuelga: **atraviesa**. Su eje local se acuesta sobre el `ejeCalce` del poste, perpendicular a la viga, con el sobrante repartido según el corrimiento. |
| **Pieza con pivote** (anclaje de cadena, jammer arms) | `pivoteLocal`, `ejePivote` | El cilindro del que cuelgan cadenas o articulan brazos, perpendicular al pin de calce. |
| **Pieza que carga discos** | `cargaDiscos {lados, diamCm, grosorCm, masaKg, mangaCm}` | `mangaCm` es la distancia al **hombro** de la manga, contra el que se apilan, como en una barra olímpica real. |
| **Pieza que recibe la barra** | `asientoBarra` | La física muestrea el **perfil real de la malla** y construye el canal (asiento, tope, respaldo) para que la barra quede retenida en vez de resbalar sobre una caja lisa. |
| **Pieza que se tiende entre dos pilares** | `largoAjustable {eje, extremosCm, minCm, maxCm}` | El largo se cambia en Propiedades y se aplica **por el centro** (ver §5.4). |
| **Tope de guía** | `topeGuia` | El motor descubre guías por la FORMA (fija, esbelta, coaxial); un tope de goma es corto y gordo, justo al revés, y **hay que declararlo**. |
| **Herramienta disfrazada de pieza** | `placement` | `'rope-chain' \| 'rope-strap' \| 'beam' \| 'tube'`: **no es una pieza**, es el BOTÓN de una herramienta de dos extremos. |
| **Curaduría de la paleta** | `paleta: 'oculta' \| 'despiece' \| 'retirada'` | Qué se LISTA. No afecta a lo que se puede construir. |

### 3.1 Dos reglas del catálogo que ya costaron caras

**(a) Ninguna definición con `placement` puede llevar etiqueta de curaduría.**
No es una pieza: es el botón de una herramienta, y retirarla **apaga la
herramienta entera**. El recuento de usos no lo ve venir porque lo que la
herramienta crea no lleva el id del botón. Pasó con `cadena-seguridad` y
`correa-seguridad` en v0.3.2; se restauraron en v0.3.5. Lo vigila
`pruebas/prueba-piezas-retiradas.mjs:115-122`.

**(b) Ningún id de componente se borra nunca.** Retirar una pieza es ponerle
`paleta`, no quitarla del arreglo. Si de verdad desaparece, tiene que entrar en
`COMPONENTES_RETIRADOS` con una sustituta (`componentLibrary.ts:1010`), para que
un proyecto viejo que aún la nombre abra completo.

**Una sola lista.** `catalogoVigente()` (`componentLibrary.ts:1000`) es la única
fuente de lo que se lista, y la consultan los **dos** sitios donde se eligen
piezas: `ComponentPalette.ts:270` y `LibraryView.ts:70`. No dupliques ese filtro
en ningún sitio nuevo.

---

## 4. Física y matemáticas

`src/physics/PhysicsWorld.ts` (2.655 líneas) traduce la escena a un mundo Rapier
y la devuelve traducida en cada fotograma.

### 4.1 Escala y mundo base

El editor mide en **centímetros**; Rapier es numéricamente más estable en
**metros**. Todo lo que entra al motor se multiplica por `S = 0.01` y todo lo que
sale se divide por él (`PhysicsWorld.ts:59`). **Un olvido produce errores de
factor 100 que parecen físicos y no lo son.** Excepciones deliberadas: los
ángulos (grados→radianes) y `cajasDeColision()`, que devuelve centímetros.

Gravedad `(0, −9.81, 0)`; **12 iteraciones de solver** porque las cadenas
flexibles bajo barras pesadas tienen razones de masa ~1000:1; CCD con 4
subpasos. El suelo es una **losa de 10 m de espesor** con la cara superior en
y=0: una losa fina la atravesaba una barra cargada en caída libre.

### 4.2 El orden de `build()` es obligatorio

```
agruparSoldadas → crear cuerpos (solo anfitriones y no-soldadas) → fundirSoldadas
→ detectarEmpotradas → detectarCalzados → joints → cables → cuerdas → detectarGuias
```

Las tres fases de fusión **reescriben `this.bodies`**, y las juntas, cables y
guías dependen de ese remapeo.

**`this.bodies` NO es una biyección id↔cuerpo.** Varias claves pueden apuntar al
mismo `RigidBody` tras fundir. Todo recorrido que asuma 1:1 debe deduplicar por
`body.handle`; el patrón está en `detectarGuias`, `cajasDeColision`,
`nodosPorCuerpo` y `posesDePiezas`.

### 4.3 Grupos rígidos: un mecanismo real no es una nube de cuerpos sueltos

Tres caminos distintos acaban en la misma maquinaria — la pieza **cede sus
colliders y su masa al cuerpo de un anfitrión** y `this.bodies` se remapea para
que juntas y cables la resuelvan al cuerpo compuesto:

1. **Soldaduras** — union-find sobre las uniones `locked`. Si algún miembro está
   anclado, el conjunto entero queda anclado (con aviso); si no, el anfitrión es
   el de más masa.
2. **Roldanas empotradas** — una polea cuyo centro cae dentro del volumen de otra
   pieza se funde con ella.
3. **Accesorios calzados** — una pieza de calce junto a un poste con grilla de
   pinholes forma **grupo rígido** con él: está fijada por su pin, no apoyada.

Los colliders recreados en el anfitrión van **siempre** con `setDensity(0)`: la
masa la aporta `setAdditionalMass()` y contarla dos veces desestabiliza el solver.

### 4.4 Articulaciones

`Joint` guarda el ancla en coordenadas de **mundo** y el eje de dos formas: la
letra `axis` (editable) y `axisVec`, un vector libre **que tiene prioridad**
cuando la unión giró con su grupo y ya no cae sobre un eje cardinal.

- **`locked` = soldadura, no articulación.** Una unión bloqueada se resuelve
  ANTES que nada como soldadura rígida y su joint se omite: crearlo además sería
  una restricción redundante peleando contra el ensamblaje.
- **Contactos.** Por omisión el motor **apaga** los contactos entre los dos
  cuerpos que une una articulación (en un pivote clásico se solapan a propósito y
  dejarlos chocar los expulsaría al arrancar). Una **bisagra real** montada sobre
  caras que no se solapan los necesita, o las vigas se atraviesan y la bisagra
  pliega hacia donde el material debería impedirlo: de ahí `Joint.contactos`.

### 4.5 Cables: restricción por gradientes, no cadena de cuerpos

Un cable **no es una cadena de cuerpos**: es una **restricción escalar** sobre los
cuerpos de sus nodos. Su longitud de reposo se mide en la pose de diseño.

El gradiente de la longitud total respecto de cada nodo es la suma de los
unitarios hacia sus vecinos. **Por eso una polea móvil sostenida por dos
segmentos siente el doble de tensión y se mueve la mitad: la desmultiplicación
2:1 o 3:1 EMERGE de la geometría, no está codificada en ninguna parte.**

Se corrige primero en **velocidad** con estabilización Baumgarte y solo el exceso
grosero se teletransporta en **posición**. En cada paso: 32 pasadas Gauss-Seidel
de velocidad y 8 de posición, porque la tensión debe propagarse por toda la
polea en un solo fotograma.

### 4.6 Guías tubulares: detección por forma + clamp cinemático

`detectarGuias()` es la rutina más delicada del archivo y **un acantilado de
umbrales numéricos** (largo ≥ 20, ratio 4×, largo ≥ 60, abrazo ≥ 5, solape ≥ 5,
lateral < 3, holgura 1 cm). Cada número viene de un bug concreto documentado
justo encima con su versión. **No los toques sin leer el comentario de al lado.**

### 4.7 Cuerdas de seguridad: física + geometría

A diferencia del cable, la cadena/correa **sí** se simula como cuerpos: de 4 a 30
cápsulas articuladas, con masa de cadena industrial (~6 kg/m) y amortiguación
alta porque una cadena real **disipa** el golpe.

Pero el solver no resiste el impulso de una barra de 180 kg en caída libre: las
juntas se estiran un instante y la barra se cuela. Así que, cuando ambos anclajes
son no-dinámicos, se materializa además **una barrera estática invisible** sobre
la rama inferior de la elipse `|PA| + |PB| = arco`, calculada por bisección. Es
la restricción de inextensibilidad **hecha geometría**.

### 4.8 Bisagras: escala de la placa, arco y freno (v0.3.19)

Tres invariantes que hay que respetar al tocar `Joint` o `applyDrag`:

**El recorrido se mide entre las DOS PLACAS, no en giro relativo.** `apertura0`
guarda el ángulo que forman en la pose de diseño y `sentidoApertura` hacia qué
lado crece; la conversión al giro que entiende el motor es
`sentido · (u − apertura0)`. **Si se asigna `apertura0` hay que reasignar
también `min`/`max` en esa escala**: dejarlos en la escala vieja (−90..0) manda
al solver un rango que ni siquiera contiene el cero y la pieza salta a una pose
absurda al arrancar. Ese fue el bug que costó la primera medición.

Desde v0.3.27 la escala es **dirigida y de vuelta entera**: `apertura0 ∈ [0,360)`
—0 enfrentadas, 180 extendidas, 360 la revolución— y `sentidoApertura` vale
siempre 1. Antes era el ángulo SIN SIGNO entre las palas, y un ángulo sin signo
**se dobla en sus extremos**: pasado 180 vuelve sobre sus pasos, así que no
había forma de expresar un recorrido que cruzara la extensión. La clave para que
el sentido salga constante es medir el ángulo de placa **alrededor del mismo eje
que usa la física** (`ejeMundo`): así el grado de placa y el giro del pasador
crecen a la par y la conversión se queda en una resta.

**El margen libre se queda en ±π**, aunque la escala llegue a 360. Subirlo a
±2π para «dejar sitio» a esos recorridos parece inofensivo y no lo es: el tope
de un revolute de Rapier se mide sobre un ángulo que vive en (−π, π], y con el
margen fuera de esa horquilla el freno deja de ceder a la mano (28,9° de
recorrido pasaron a 1,4 en `prueba-bisagra-mano`). ±π ya es la vuelta entera,
media a cada lado.

**El clic ES el sitio, no una pista.** El montaje por caras recibe un punto
sobre la cara de cada pieza: cada pala nace ahí y el pasador cae donde los dos
puntos se encuentran. Todo lo que se deduzca de las CAJAS de las piezas
—`soporteEnDireccion`, cantos, envolventes— es exactamente lo que hacía que la
bisagra apareciera lejos de donde se había señalado y que articular no cerrara
el hueco cuando las piezas estaban lejos. La dirección del eje sí sale de las
normales (no depende de dónde estén las piezas); el punto sale de los clics.

**UNA MÁQUINA PUEDE TENER VARIAS BISAGRAS, y los registros tienen que
admitirlo.** `frenos` guarda por cuerpo rígido **una lista**, no una entrada, y
`elegirBisagra(objectId, punto)` fija cuál se opera: la que **más mueve el punto
agarrado** —la de mayor radio— que es el arco que la pieza describe de verdad y
el que se dibuja. Antes había además un segundo mapa (`bisagras`) con el mismo
problema; ahora el arco vive DENTRO del registro del freno, así que elegir la
bisagra elige de una vez el arco, el eje, la sensibilidad y el recorrido. Ojo al
detalle que lo escondía: las piezas soldadas se funden en UN cuerpo, así que las
dos bisagras de una banca ajustable llegan al mismo `RigidBody` y la segunda
pisaba a la primera sin que nada fallara — simplemente el cursor mandaba siempre
sobre la misma.

**`soldada` SE ESCRIBE SIEMPRE, también en falso.** Omitirlo al serializar
parece ahorro y es pérdida de datos: la migración de v0.3.19 lee
`jd.soldada ?? jd.locked`, o sea que sin el dato deduce «soldada» de `locked`, y
`locked` es el **freno**. Toda bisagra frenada resucitaba como soldadura al
recargar, y la pieza que colgaba de ella quedaba muerta. Regla general: **un
campo cuyo `false` es significativo no se puede escribir como `x || undefined`**
cuando alguien río abajo hace `?? otraCosa`. Y como red: una unión con
`apertura0` es la articulación de una bisagra —las soldaduras del herraje no lo
llevan—, así que nunca se lee como soldadura; eso repara los proyectos que ya
se guardaron mal.

**Jerarquía: `tieneExtremoLibre()`.** Decide quién se arrima al articular y de
qué clic nace el pasador. Una pieza con una punta al aire es la que se mueve;
cosida por los dos lados, es la que manda; las dos libres, se encuentran a medio
camino (pesos 0,5/0,5) y la bisagra queda como una articulación de verdad.
**`physics.fixed` no sirve para esto**: una pieza estructural NACE anclada, así
que lo estaría todo. Sólo cuenta al revés — `fixed === false`, o sea soltada a
propósito, es móvil sin más que mirar.

**La mano nunca tira fuera del arco.** `enElArco()` lleva el objetivo del
resorte a la circunferencia del pasador —recalculada CADA PASO desde la pose
viva de los cuerpos, porque el pasador puede ir montado sobre otra pieza que se
mueve— antes de calcular el error. Tirar en línea recta es empujar contra el
pasador: la unión devuelve esa fuerza entera y la bisagra salta. En el ensayo
de dos placas la deriva del radio pasó de centímetros a 0,01–0,07 cm y el
esfuerzo sostenido de 290 kg a 9–90 kg. La UI hace la misma proyección en
`puntoDeArrastre`, y `arcoVivo()` refresca centro y eje sin tocar el radio (que
sí es invariante).

**Al separar `soldada` de `locked` hay que barrer TODOS los sitios que sueldan.**
No son sólo las herramientas de soldar y de bisagra: `standardMachines.ts` marca
sus bisagras de plegado con `bloqueada`, y olvidarlas dejó a las máquinas de
catálogo sin fundir —el brazo se volvió una cadena floja y cayeron seis suites
(`brazo-plano`, `atraviesa`, `mano-brazo`, `uppermachine`, `v251`,
`maniqui-usa`) mientras la prueba nueva de la bisagra daba verde—. La lección
es la de siempre: **un dato que significaba dos cosas se lee desde más sitios de
los que se recuerdan**; `grep` de `locked = true` no basta, hace falta también
`locked:` en literales.

**Una bisagra se opera por su ÁNGULO, no con el resorte de la mano (v0.3.21).**
`girarBisagra` mueve el TOPE de la articulación (`setLimits(t, t)`), que el
solver cumple exacto y que por construcción sólo genera impulsos alrededor del
pasador. Dos detalles que costaron medidas: un motor de posición
(`configureMotorPosition`) NO sirve —con la placa cargada se queda en 18–25°
de 40 pedidos, porque su par es proporcional al error—; y el mando tiene que
ACUMULAR el gesto pero con una ventana (±15°) respecto del ángulo real: si sólo
acumula se escapa cuando la placa topa, y si parte siempre del real pierde por
el camino lo que no recorre entre evento y evento (54° pedidos se quedaban en
32). El sentido del gesto sale de proyectar la tangente del arco en la
pantalla, para que subir la mano suba la pieza mire donde mire el pasador.
`orbit.enableZoom` se apaga mientras el puntero está sobre una bisagra: quedarse
el evento no basta, porque el control de órbita escucha en el mismo lienzo y el
orden de los oyentes no es nuestro.

**Una bisagra nace SIN topes numéricos (v0.3.23).** Sus placas arrancan en
línea, o sea con la apertura en 180 —justo encima del máximo por omisión—, así
que dejar `limitsEnabled` puesto la clavaba contra ese tope desde el primer
fotograma y parecía soldada aunque el lock switch estuviera abierto. Quien
frena una bisagra recién puesta es el MATERIAL (los contactos), no los grados.

**«Juntar» tiene que plantar el pasador en el CANTO de la primera pieza.**
Dejarlo en el punto medio entre las dos cierra sólo la mitad del hueco y las
deja igual de sueltas con el pasador flotando en medio.

**La bisagra se engancha (v0.3.22).** El clic la toma y la deja tomada; el
siguiente clic la suelta. `bisagraDrag` distingue `enganchada` (hasta el
próximo clic) de `arrastrando` (botón abajo): sin lo segundo, mover el ratón no
manda nada. OJO al medir: una placa apoyada en su tope sigue acomodándose uno o
dos grados sola, así que «el ratón no la mueve» se comprueba CONTANDO las
llamadas a `girarBisagra`, no midiendo el ángulo.

**`locked` significaba dos cosas.** Ahora `soldada` es la soldadura —la que
funde cuerpos en `agruparSoldadas`— y `locked` sin `soldada`, sobre un
`revolute`, es un FRENO: la bisagra se sostiene sola (límites fijados en su
ángulo actual), `grab` la suelta y `release` la vuelve a fijar en el ángulo
nuevo. Los proyectos anteriores se leen con `soldada = locked`, así que su
herraje se comporta igual que siempre.

### 4.9 Regla geométrica transversal

**Las pruebas geométricas se hacen en el frame LOCAL con `localSizeAbs()`, nunca
con la AABB de mundo.** La AABB se hincha y permuta ejes cuando la pieza está
girada; eso elegía anfitriones equivocados y perdía la esbeltez de los tubos.
Vale igual en el Editor (calce, roldanas, guías) que en la física.

---

## 5. Geometría procedural

### 5.1 La cadena de construcción de una malla

**El orden es fijo y está escrito idéntico en los CUATRO sitios donde se
construye una malla** (constructor, `rebuildGeometry`, `applyCustomGeometry`,
`revertToPrimitive`, en `SceneObject.ts`):

```
buildGeometry(params)  ó  malla real de biblioteca
        ↓
perforarGeometria(ventanas, canales)
        ↓
aLaMedida(largoCm)
        ↓
hornearEspejo(params.espejo)
```

Si añades un paso, hay que añadirlo en los cuatro.

### 5.2 Primitiva paramétrica vs malla real

Toda pieza nace de su primitiva, pero muchas tienen encima una **malla escaneada**
del despiece del fabricante (`public/models/components/manifest.json`). Cuando la
tiene, `customModel = true` y:

- su geometría **ya no es paramétrica** (cambiar `width` no la reconstruye);
- se guarda **siempre** una copia intacta en `geoOriginal`, porque perforar es
  destructivo y hay que poder recalar ventanas y canales sobre el original;
- los `defaults` de la definición siguen siendo **la medida oficial** aunque la
  malla difiera en décimas.

### 5.3 Perforado pasante (`perforar.ts`)

Un hueco es **un eje local pasante + un contorno CONVEXO** en el plano
perpendicular. Se recorta cada triángulo con Sutherland-Hodgman contra los `n`
semiplanos del contorno; el exterior del convexo se parte en `n` regiones
**disjuntas** («fuera del lado i, pero dentro de los lados 0..i−1»), de modo que
ningún trozo se emite dos veces ni se pierde. Lo que queda dentro no se emite
pero marca hasta dónde llega el material, y con eso se levantan las paredes
interiores.

Dos usuarios: **ventanas rectangulares** (roldana interna) y **canales tubulares**
(guías) aproximados por un polígono **circunscrito** (radio corregido
`r / cos(π/n)`) para que el círculo real quepa y no roce por las esquinas.

### 5.4 Estirar por el centro (`estirar.ts`)

Un brazo de seguridad se acopla **entre** dos pilares, y esa separación la decide
quien arma la estructura. Escalar la pieza entera la estropea (las placas se
estiran, los ganchos se alargan, los agujeros se vuelven óvalos), así que se hace
**lo del taller**: cortar el tubo por la mitad y meter o quitar un trozo recto.
`extremosCm` dice cuánto de cada punta es remate y viaja rígido.

`puntoTrasEstirar` aplica la misma cuenta a un punto que **no vive en la malla**
sino en la definición — es lo que hace que el `calceLocal` de un brazo alargado
siga cayendo donde está el manguito.

### 5.5 Piezas de línea (`linePieces.ts`)

Su forma la describe `params.path`: nodos locales por los que pasa una
Catmull-Rom con parametrización **chordal** (la uniforme sobreoscilaba y formaba
una sigmoidea imposible de corregir). Una viga **doblada** se particiona por
comba acumulada en tramos planos que **conservan sus pinholes** y codos que se
barren lisos: así una jota puede calzar en una cara diagonal.

### 5.6 Ramas nodales (v0.3.25)

`params.ramas: RamaNodal[]`, cada una `{ desde, path }` — el índice del nodo del
tronco del que sale y sus propios nodos locales. `buildBeamGeometry` /
`buildTubeGeometry` construyen primero el tronco y luego `conRamas()` barre cada
rama **con el mismo perfil de la pieza** y funde el resultado. Consecuencia que
importa: una rama **no es un cuerpo soldado**, es la misma malla y el mismo
cuerpo rígido; no hay `Joint` que registrar ni masa nueva que sumar, y todo lo
que ya sabía tratar la pieza (pinholes, física, gizmo) la trata sin cambios.

Al borrar un nodo del tronco hay que **arrastrar las ramas**: las que colgaban
de él se van con él, y las de índice mayor se reindexan (`desde--`). Olvidarlo
deja ramas apuntando a un nodo que ya no existe.

**Trampa de eventos que costó dos vueltas:** en Chromium los `pointerdown`
llegan siempre con `detail: 0` — el contador de clics solo lo llevan los eventos
de ratón (`click`, `dblclick`, `mousedown`). Un doble clic no se detecta desde
`pointerdown`; hace falta escuchador `dblclick`. Y en un modo que se cierra «al
pulsar fuera», ese cierre tiene que discriminar el cuerpo de la pieza: si no, el
primer clic del doble clic mata el modo y el segundo no encuentra nada. Lo mismo
con el botón derecho: su `pointerdown` llega ANTES que el `contextmenu`, así que
si el modo se cierra ahí, el menú contextual nunca llega a abrirse.

### 5.7 Placa dentada doble (v0.3.25)

**Los ejes locales de la placa** (de `buildDentadaGeometry`, y hay que tenerlos
delante antes de tocar nada): **X** = ancho de contacto, y por ahí asoman los
ganchos; **Y** = espina (el largo); **Z** = grosor, que es el eje de extrusión.
Luego **la cara que apoya en el poste es perpendicular a Z**. Cruzar el poste
por cualquier otro eje es cruzarlo *por dentro de su propia cara*.

**LA REFERENCIA ES LA VIGA, NO LA PLACA.** `params.dentadaEspejo` guarda el
**plano de simetría de la viga** —normal y punto, en coordenadas LOCALES del
anfitrión, para que lo siga si la viga se mueve— y la gemela es su pareja
**reflejada** en él: `colocarGemelaDentada()` no traslada, dobla. Ese es el
modelo que pidió el diseñador, y es el que hace que cada gesto salga copiado del
lado contrario sin casos especiales: correrla por la cara, separarla de ella,
inclinarla, o encender el interruptor **después** de haberla colocado a mano.

El plano pasa por `cajaOrientada(host).c` —el centro VERDADERO de la viga, no el
del mundo— y su normal se **ajusta al eje propio de la viga** más parecido a la
normal de la placa, para que caiga en su medio exacto aunque la placa no esté a
ras. Reflejar es su propio inverso, así que **las dos placas guardan el mismo
plano** y no hace falta signo ni distinguir cuál es la original;
`sincronizarDentadaGemela` copia los params tal cual salvo a quién señala cada
una como pareja (con un pestillo `sincronizandoDentada` para no entrar en
bucle).

**Un reflejo no es un giro, pero aquí se puede escribir como uno.** Las columnas
de la matriz salen `(M·X, M·Y, −M·Z)`: reflejar cambia la mano, y negar la
tercera columna la devuelve. Es legítimo **solo** porque la plancha se extruye
CENTRADA en su grosor y por tanto es simétrica respecto de su plano Z=0. La
consecuencia que rompe pruebas ingenuas: el punto local (0,0,10) de una placa
**no** es el (0,0,10) de la otra, aunque el acero de las dos coincida punto por
punto. Un espejo se comprueba sobre los **vértices de la malla**, no sobre
coordenadas homólogas.

Con la placa a ras el reflejo se reduce a cruzarla al otro costado sin tocarle
el giro. El `Ry(π)` que hubo en v0.3.25 es lo que sacaba la gemela con los
ganchos al otro canto y boca abajo.

Cuando hace falta medir el grosor del anfitrión se usa
`soporteEnDireccion(host, d) + soporteEnDireccion(host, −d)`. Los dos apoyos se
**suman** —juntos son el grosor entero—; restarlos da cero en cualquier pieza
simétrica.

**Cómo se escondieron los dos fallos anteriores:** la prueba montaba la placa
desplazada en **X** respecto del poste —por el canto, no por la cara—, o sea que
llevaba dentro el mismo malentendido que el código y le daba verde. Una prueba
que construye su escena con la misma idea equivocada que la implementación no
prueba nada. El caso que lo destapa a gritos es la **viga inclinada**: con el
eje equivocado se mide la viga a lo largo y el error salta en decenas de
centímetros, no en decimales. Cuando una pieza se coloca contra otra, la prueba
debe **colocarla como la coloca la herramienta**, y con el anfitrión torcido.

---

## 6. El maniquí

Existe para responder la pregunta que justifica la aplicación: **¿deja esta
máquina sitio al cuerpo que la va a usar, y a qué altura le queda cada agarre?**

### 6.1 Convención de signos (lo primero que hay que interiorizar)

Los huesos descansan a lo largo de **−Y local** y la figura mira a **+Z**.
Consecuencia: **una X positiva lleva el segmento hacia ATRÁS**. Hombro, codo y
cadera flexionan con X **negativa**; la rodilla con X **positiva**; y la
**columna, al revés que los miembros, se inclina hacia delante con X positiva**.
Izquierda en −X, derecha en +X; abducción = Z negativa.

**La pelvis es la raíz: la cadera NO cuelga del tronco.** Por eso `hipX` se mide
contra la vertical de la figura, no contra el tronco, y meter el ángulo anatómico
de flexión de cadera da una postura absurda.

### 6.2 Una postura es un estado ABSOLUTO

`applyPose` pone **todas** las articulaciones a cero y luego escribe las que la
postura nombra. **Lo que una postura no menciona ES CERO**, no «se queda como
estaba». Cualquier código que consuma una postura como meta debe asumirlo.

Toda escritura de rotación pasa por el rango de `JOINT_DOF`, y **los ejes sin
límite declarado se fuerzan a 0**. Nunca escribas `joint.rotation.*` sin clamp.

### 6.3 El gesto se instruye por ZONAS, no por articulaciones

Empujar es **extender el codo mientras se flexiona el hombro** — direcciones
opuestas, que es justo lo que un modelo articulación por articulación no puede
expresar. Por eso la instrucción es **zona + sentido**: `superior`, `inferior`,
`bisagra`, cada una con su patrón de pesos, × empuje/tracción.

Un **plan** de ejercicio es un **calendario** de fases, cada una con su meta (el
*nombre* de una postura de la biblioteca, única fuente de verdad de los ángulos)
y un umbral que **se lee del mundo en cada paso**, no del reloj.

### 6.4 Acomodaciones: lo que se RESUELVE, no se interpola

Seis reglas físicas que se satisfacen **resolviendo contra el mundo por
bisección** después del reparto, en un orden exacto: planta del pie, plomada del
brazo, mirada, apertura, roce de la barra y equilibrio sobre el medio del pie.

Reglas duras: los pies **no se deslizan** por el suelo (se captura la huella
antes y se replanta después); ningún segmento puede quedar bajo el suelo, y la
corrección **solo empuja hacia arriba**; el reparto del gesto **solo mueve el eje
X** — cualquier otro eje que deba cambiar necesita su propia acomodación.

Manos y pies **no llevan collider**: son los puntos por los que la figura agarra,
y si chocaran, la IK y el contacto se empujarían sin parar.

### 6.5 Apoyos: nada es horizontal (v0.3.11)

Hasta v0.3.11 la ergonomía suponía que todo asiento y toda plataforma están a
nivel. En una prensa de piernas no lo está ninguno, y de ahí salieron tres
defectos encadenados. Las reglas que quedaron:

- **El respaldo manda la inclinación del cuerpo.** Al sentarse, la figura copia
  la caída del respaldo —medida en la propia pieza, por la normal de su cara
  más delgada, tope 60°— y sólo entonces se desliza hacia atrás hasta tocarlo.
  Menos de 5° de caída no cambia nada: los bancos rectos siguen igual.
- **La espalda se REPLANTA en cada re-apoyo.** `apoyoEspalda` guarda la pieza,
  y el deslizamiento es idempotente (si ya está dentro, primero sale). Sin eso,
  el primer gesto despegaba a la persona de su respaldo.
- **«Pisar» guarda la CARA, no sólo el punto.** La normal viaja en el apoyo
  —también al guardar el proyecto— y toda la IK del pie se mide contra ella:
  el vuelo del tobillo, la nivelación de la suela y el residuo. Sin normal
  guardada se supone horizontal, que es el comportamiento anterior.
- **Una cara demasiado vertical no se pisa.** Rozando el canto de una placa el
  rayo devuelve la normal lateral; con `|n.y| < 0,3` se descarta.
- **El vuelo de la suela bajo el tobillo se MIDE, ya nivelado**, en vez de
  estimarlo: es una constante de la pieza y así el objetivo se calcula de una
  vez, sin perseguirlo fotograma a fotograma (perseguirlo oscilaba 18 cm).
- **El polo de la rodilla sale del eje izquierda-derecha del cuerpo**, no del
  frente: recostada, el frente casi coincide con la pierna y la IK se degenera.
  Lo mismo vale para el marco con el que se nivela el tobillo.
- **Arrastrar la figura con el gizmo RECOLOCA su apoyo** (v0.3.18): sin eso,
  `alturaDelApoyo` se queda en la cota de la colocación automática y el primer
  re-apoyo deshace la corrección manual.
- **Sentarse se resuelve BAJANDO hasta tocar** (`posarSobreElHierro`, v0.3.18),
  no igualando la cota a la caja de la pieza: esa caja es mala aproximación en
  cuanto el asiento no es una placa limpia.
- **Asiento y respaldo son un SITIO, no dos apoyos** (v0.3.17): marcar
  cualquiera de los dos sienta en el asiento. Y cuál es cuál no lo dice la
  inclinación —un respaldo tumbado 50° mira casi al cielo—, sino la relación:
  el asiento está más abajo, va cosido, y su cara llega al pie del respaldo o
  lo pasa. Sin esa última condición el bastidor se cuela como asiento.
- **DEUDA**: manos y pies no tienen collider, así que ninguna parte del cuerpo
  empuja piezas por contacto; sólo el apoyo fijado con «Pisar» mueve su pedal,
  y la mano sigue su agarre pero no tira de él.
- **La flexión de la rodilla se mide en la GEOMETRÍA**, no en Euler (v0.3.16):
  el ángulo entre fémur y tibia. En cuanto la pierna sale del plano sagital, el
  Euler en X deja de ser la flexión y una extensión sana se lee como −24°.
  Diagnosticar con esa lectura lleva a «arreglar» lo que no está roto.
- **Junto al bloqueo, la cadena cerrada del pedal es SINGULAR** (v0.3.16): la
  longitud de la pierna deja de depender del ángulo de la rodilla, así que la
  ecuación no puede colocar la placa. Ahí manda el gesto con un paso mínimo. Y
  la regla que ordena el final del recorrido: **empujando el pedal no retrocede,
  traccionando no avanza.**
- **Arrimarse al respaldo sólo mueve SI SE TOCA** (v0.3.15). El barrido que
  busca el punto justo antes de tocarlo se quedaba con el final de su recorrido
  cuando no encontraba nada: 45 cm hacia atrás por llamada, y esto corre en
  cada re-apoyo.
- **La IK deja LIBRE el giro de cada hueso sobre sí mismo** (v0.3.15), y eso se
  ve como muslos volteados. Se acota separando el cuaternión en dirección y
  torsión —por el eje del hueso, nunca con ángulos de Euler, que desplazan la
  articulación de abajo—: la rodilla no gira sobre su eje, la cadera hasta 20°.
- **Una banca plana es asiento Y respaldo** (v0.3.14): en el tramo central de
  una cara horizontal de 90 cm o más, sin respaldo cerca, la figura SE ACUESTA
  boca arriba (postura «Tumbado», `tumbadaEnElApoyo`); en los extremos se
  sienta. Tumbada, la cota de re-apoyo la da la ESPALDA (`baseDeLaEspalda`), no
  los glúteos, y no hay deslizamiento contra el respaldo: la espalda ya está
  encima.
- **El gizmo de la figura entera va en la CADERA** (v0.3.13), sobre el pivote
  `figuraProxy`, no sobre el grupo: el origen del rig no está donde está el
  cuerpo.
- **Quién es el respaldo se MIDE** (v0.3.13): placas perpendiculares al asiento,
  anchas, que se levantan por encima de él y cuya cara mira de lado; de ésas,
  **manda la más baja**. Lo de arriba es cabecera. El nombre sólo vale de
  respaldo del respaldo.
- **El polo de la rodilla toma su signo de la rodilla ACTUAL** (v0.3.13), no del
  frente de la figura: recostada, el frente no distingue lados y la IK saltaba
  de rama, volteando la pierna.
- **Si el punto pisado le queda lejos a la pierna**, el objetivo se acerca
  *sobre la misma cara* hasta donde alcanza. Quedarse corto hundía la planta.
- **La cara que se pisa MIRA AL CUERPO, no al cielo** (v0.3.12). Sobre un suelo
  las dos cosas coinciden; en una prensa no: la placa va por encima del que
  empuja. Marcar con el puntero la cara que se ve pone el pie en la cara
  paralela de enfrente.
- **La cadena del pie es CERRADA: el pie empuja su pedal** (v0.3.12). Si la
  pieza pisada puede correr —sus canales, o los de su conjunto, dan la
  dirección—, extender la pierna MUEVE LA MÁQUINA: la rodilla fija el largo de
  la pierna y de ahí sale, por una ecuación de segundo grado, dónde tiene que
  quedar la placa. Sin esto la IK deshacía el gesto y el cuerpo se despegaba
  del respaldo.

---

## 7. Mapa del repositorio

```
src/
  main.ts (525)                 Punto de entrada. bootEditor(), las 4 rutas de arranque,
                                goHome(), y el gancho de depuración window.exersuite.
  core/
    Editor.ts (12.329)          ★ La clase central. Todo pasa por aquí.
    eventBus.ts (20)            EventBus<Events> genérico. Todo el desacoplo Editor↔UI.
    project.ts (158)            Formato serializable. Contrato del .json, del autoguardado
                                y del historial.
    prefabIO.ts (297)           Exportar/importar prefabs v2.
    componentModels.ts (283)    Geometría ACTIVA de cada pieza (mallas .obj + modelos de usuario).
    figureSegments.ts (240)     Idem para los 16 segmentos del maniquí.
    appDb.ts (79)               Único punto de apertura de IndexedDB (un solo onupgradeneeded).
    descargas.ts (265)          Guardar/abrir con el gestor nativo de cada plataforma.
    armIK.ts (90)               IK analítica de dos huesos por ley de cosenos.
    units.ts (37)               1 unidad = 1 cm. La convención fundamental.
    i18n.ts (44) traducciones.ts (546)   ES/EN por diccionario.
    snapping.ts (108)           Imán de ensamblaje.
    performance.ts, modelStore.ts, modelLoading.ts, recentStore.ts, capturas.ts,
    maquinasModelo.ts, prefabsMaquina.ts, sitio.ts, figureSegmentStore.ts
  objects/
    types.ts (401)              ★ PrimitiveParams + ComponentDefinition. La columna vertebral.
    componentLibrary.ts (1.042) ★ El catálogo: 74 componentes + 3 primitivas + curaduría.
    SceneObject.ts (551)        La pieza viva: mesh + params + cadena de geometría.
    geometryFactory.ts (159)    PrimitiveParams → BufferGeometry.
    perforar.ts (279)           Perforado pasante real (Sutherland-Hodgman).
    estirar.ts (112)            Alargar por el centro dejando los remates intactos.
    linePieces.ts (453)         Vigas y tubos trazados por path, con pinholes reales.
    placaDentada.ts (521)       Placa con ganchos, generada entera desde su paso.
    espejar.ts (93)             Voltear HORNEANDO el espejo (nunca escala negativa).
    materials.ts (87)           20 presets PBR.
    standardMachines.ts (658)   Las 9 máquinas de fábrica (specs VERBATIM de .prefab.json).
    maquinas/upperMachine.ts (1.052)   La más compleja: 41 piezas, 16 uniones, 2 cables.
    maquinas/legPress.ts (1.173)   Prensa de piernas: 34 piezas, 29 uniones (v0.3.20).
    placaDentada.ts (≈600)      Plancha + diente en DOS partes; perfil del .stl (v0.3.23),
                                ancho editable, pernos que se reparten y espejo
                                de sentido (v0.3.24).
    humanFigure.ts (577) poseLibrary.ts (742) movimientos.ts (539) barraManiqui.ts (328)
    Rope.ts (249)               Cadenas y correas (NO son SceneObject).
  physics/
    PhysicsWorld.ts (2.655)     ★ El motor Rapier entero.
    joints.ts (98)              Modelo de datos de articulación.
    cables.ts (71)              Modelo de datos de cable y frenos.
  scene/
    SceneManager.ts (644)       Renderer, cámara, luces, suelo, contenedor `content`.
  ui/                           (sin framework: DOM a mano)
    dom.ts (60)                 el() y clear(). Los DOS únicos helpers de toda la app.
    PropertiesPanel.ts (1.190)  Inspector: decide qué secciones mostrar según la pieza.
    ArticulacionesPanel.ts (900) Ventana de Ergonomía (POSAR / SIMULAR).
    JointsPanel.ts (590)        Conexiones + el diálogo de la bisagra.
    LibraryView.ts (537) Toolbar.ts (485) ComponentPalette.ts (456) Landing.ts (471)
    SimulatorBar.ts (225) ComponentPreview.ts (141) dialogoDerecha.ts (45)
    lineToolDialog.ts, confirmDialog.ts, Instructivo.ts, ToolQuickBar.ts, marketplace/

pruebas/         81 programas .mjs de Playwright + correr-todo.sh + LEEME.md
docs/            inventario de piezas, cápsula del tiempo (capturas por versión), migración a Godot
sitio-web/       sitio de marketing Next.js 14 (proyecto APARTE, su propio package.json)
android/ src-tauri/   empaquetado APK y .exe
scripts/         verificar-apk.py y utilidades de release
godot/           kit de migración a Godot (CI propio en godot.yml)
```

---

## 8. Pruebas: cómo se verifica que algo funciona

**No son pruebas unitarias.** Son 81 programas independientes que arrancan
Chromium, cargan el **build real** servido en el puerto 4174, y miden la escena
de three.js desde dentro de la página a través de `window.exersuite`.

**Miden magnitudes físicas** — centímetros, grados, vértices, masas — **nunca
píxeles**. Las capturas PNG son para mirarlas, no para comparar.

### 8.1 El contrato de una prueba

```js
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
// ...
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
```

- El marcador de fallo es **`✗ ` con espacio detrás**: es el patrón literal que
  busca `correr-todo.sh`. Un `✗` pegado al texto no lo detecta.
- **Sin `process.exit` la prueba pasa por verde diga lo que diga.**
- El mensaje **siempre** lleva el número medido entre paréntesis, para que la
  salida sirva de informe aunque pase.
- Los errores de página se acumulan aparte y se imprimen con el prefijo literal
  `PAGEERROR`.

### 8.2 Dos reglas que evitan pruebas mentirosas

**Doble puerta.** `correr-todo.sh` declara rojo si la salida contiene una marca
**O** si el código de salida no es 0. Las dos, porque **una prueba que muere con
excepción no imprime ninguna marca** — un vistazo que solo busque `✗` la da por
buena. En v0.2.63 varias pruebas rotas pasaron por verdes exactamente así.

**Nunca esperes al reloj.** La simulación avanza por `requestAnimationFrame`, así
que un `waitForTimeout` no mide pasos de física: mide lo desahogada que va la
máquina. Se espera a que **la magnitud se quede quieta CUATRO lecturas seguidas,
y solo después de haberse movido**. Dos lecturas no bastan: el desplazamiento
suave hace mesetas (medido 131, 131 y de ahí saltó a 1447).

**Medir la propiedad, no el número.** En vez de «la rodilla pasa de 60°», se
escribe «la rodilla está tan doblada como el asiento permite — doblarla 6° más
mete la planta bajo el suelo». Y la lista esperada se lee **del catálogo de la
aplicación**, no de una copia escrita en la prueba, que envejecería sola.

### 8.3 El preámbulo canónico

Cópialo tal cual; los tiempos están calibrados:

```js
await p.goto("http://127.0.0.1:4174/");            await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER");                   await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto");         await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);
```

### 8.4 Trampas de la batería

- **El preview se levanta desde la RAÍZ del repositorio**, nunca desde `pruebas/`,
  o sirve un bundle que no es el recién construido.
- **`N=3` en `correr-todo.sh` y no se sube.** Nueve pruebas solo se pueden juzgar
  en serie; en paralelo dan rojo mentiroso por falta de CPU. Ante un fallo,
  **vuelve a correr esa prueba sola** antes de creértelo.
- Si el `vite preview` se muere a media tanda, se lleva por delante todas las que
  corrían (`ERR_CONNECTION_REFUSED`). No es un fallo de la aplicación.
- `prueba-sitio` necesita el Next.js levantado en el 3100; las otras no.
- **Una prueba que CLICA en el visor mide dos cosas a la vez** y sólo quiere
  medir una. En `prueba-prensa-maniqui` el clic sobre la placa validaba la
  captura de la cara Y decidía dónde acababa el pie: con el encuadre de la
  cámara movido, el pie caía en un extremo, la pierna arrancaba casi estirada y
  la sección de cinemática medía otra cosa. La captura se comprueba con el
  clic; los apoyos se fijan por API en un punto conocido.
- **`prueba-maquina-entera` falla a veces AUNQUE se corra sola**, y ya lo hacía
  en v0.3.10: su comprobación «simular no desarma la máquina» salta en unas 2 de
  cada 5 pasadas, con la misma pieza yéndose 41–51 cm. Verificado a mano contra
  el build de v0.3.10 (2 rojos de 5), así que un rojo suyo no indica regresión.
- **`prueba-bisagra-mano` y `prueba-mano-brazo` miden asentamientos físicos en
  tiempo de reloj**, así que en paralelo dan rojo mentiroso con facilidad (la
  placa no llega a caer siquiera entre dos lecturas). Se juzgan SOLAS.
- **El Euler de la pieza NO es el ángulo de la bisagra.** `prueba-mano-brazo`
  leía `Euler.x` del segmento del brazo y marcaba 0,0° mientras el extremo
  recorría 39 cm: la misma trampa que con la rodilla del maniquí. Se mide con
  `physics.anguloDeBisagra()` y con el camino que recorre el extremo.
- **`prueba-freno` falla a veces AUNQUE se corra sola**, y ya lo hacía en v0.3.10.
  Su última comprobación —«la pila recibe más recorrido» con freno que sin él—
  compara dos simulaciones de 50 pasos cronometrados cuyo resultado oscila entre
  12,4 y 13,8 cm en las dos ramas: la diferencia que busca cabe dentro de su
  propio ruido. Verificado a mano contra el build de v0.3.10 (1 rojo de 3
  pasadas), así que un rojo suyo NO es señal de regresión. Merece rehacerse con
  un criterio que no dependa del reloj.

---

## 9. Estado actual y deuda técnica

> Esta sección sale de las listas de fragilidad que devolvió cada lectura del
> código y del CHANGELOG. Es honesta: incluye cosas que **no** están arregladas.

### 9.1 Lo que está sólido

- **El catálogo y la geometría procedural.** Perforado, estirado, piezas de línea
  y placa dentada están cubiertos por pruebas que miden vértices y cotas.
- **Calce agujero por agujero** (jotas, brazos, safety pins) contra la grilla real
  de cada poste.
- **Guías tubulares** completas: canal perforado, topes, trayectoria circunscrita.
- **Bisagra real** con herraje visible (dos placas + pasador) y colisión real
  entre las piezas.
- **Soldar** (v0.3.9): agrupa y suelda por los puntos de contacto, de modo que el
  conjunto se funde en un solo cuerpo rígido al simular. Es la puerta de entrada
  a las estructuras compuestas móviles (brazos de press, jammer arms).
- **Cables multipolea** con desmultiplicación emergente de la geometría.
- **El maniquí**: rig escaneado, posturas, gesto por zonas, IK de manos y pies.
- **La serialización**: proyectos, prefabs y máquinas van y vienen sin pérdida.

### 9.2 Fragilidades reales, por riesgo

| Riesgo | Dónde | Qué pasa |
|---|---|---|
| **Alto** | `PhysicsWorld.ts:992` | `addCable()` hace `return` **silencioso** si un nodo referencia un objeto que no está en `bodies`. El cable desaparece sin aviso: la máquina no transmite y la geometría no muestra nada raro. Es el fallo más difícil de diagnosticar del proyecto. |
| **Alto** | `Editor.ts:3502-3535`, `project.ts:96-102` | `startParts`, `partidas` y `barra` referencian piezas **por índice** en `listObjects()`. Si al cargar se omite una pieza por componente desconocido, todos los índices posteriores se desplazan y las partidas apuntan a otra pieza. |
| **Alto** | `Editor.ts:2957` | `serialize()` filtra `o.imported`: **las mallas importadas por GLB no se guardan** y desaparecen al recargar, al autoguardar y en cualquier undo. |
| **Medio** | `PhysicsWorld.ts:1474` | `addJoint()` no comprueba que A y B resuelvan a cuerpos **distintos**. Dos piezas fundidas al mismo anfitrión y además unidas producen una junta de un cuerpo consigo mismo, sin guarda ni aviso. |
| **Medio** | `PhysicsWorld.ts:603-947` | `detectarGuias()` es un acantilado de umbrales numéricos, cada uno nacido de un bug concreto. Tocar uno sin leer su comentario revive el bug. |
| **Medio** | `Editor.ts:1195-1199, 6250-6268` | La bandera `partidaPintada` es frágil por construcción: un camino nuevo que mueva mallas sin ponerla a `false` hace que `reconciliarEdiciones` tome el gesto por una edición y **se lo reste al diseño**. |
| **Medio** | `Editor.ts:11944, 11998` | Con un diálogo abierto (`roldanaPidiendo` / `bisagraPidiendo`) el visor hace `return` incondicional. Si la promesa inyectada nunca resuelve, no hay salida salvo Escape. |
| **Medio** | `i18n.ts` + `traducciones.ts` | Las claves del diccionario **son las cadenas en español literales**. Retocar un texto (una coma, un emoji) rompe su traducción **en silencio**: degrada a español sin avisar. |
| **Medio** | `PropertiesPanel.ts:1144-1173` | `physicsSection` modifica el modelo **sin emitir nada**: cambiar masa o «fija» no marca el proyecto como sucio ni entra en el historial. |
| **Bajo** | `placaDentada.ts:107` | `DENTADA_BARRA_CM = 6.94` está acoplado a mano al collider de `barra-olimpica`. Si alguien cambia ese collider, la placa queda mal dimensionada y **nada lo detecta**. |
| **Bajo** | `eventBus.ts:8-11` | `on()` devuelve la función de baja, pero casi nadie la usa, y `dispose()` no limpia el bus. Un panel destruido con el Editor vivo sigue reaccionando sobre DOM muerto. |
| **Bajo** | `snapping.ts:78-98` | `computeSnap` es O(piezas × puntos²) **en cada frame de arrastre**. Se nota en escenas grandes. |

### 9.3 Deuda en las pruebas

- **24 de las 81 pruebas NO PUEDEN FALLAR**: no imprimen marcas ni llaman a
  `process.exit`, así que solo caen si revientan con una excepción.
- **No hay ningún CI que corra la batería.** `build.yml` solo compila y empaqueta.
  La batería es **una puerta manual antes de etiquetar**.
- `prueba-freno` tiene una aserción **saturada** que va y viene con el ruido del
  solver y **no es una regresión** (comprobado revirtiendo la física a antes de
  v0.2.90). Para que valga algo habría que medir con menos discos.
- `prueba-viewer.mjs:46` está **desactualizada**: exige que el viewer arranque
  simulando, y desde v0.3.6 ya no lo hace.
- El `LEEME.md` de pruebas dice «66 pruebas»; hoy hay 81.
- La ruta de Chromium está codificada **en cada uno de los 81 archivos**.

### 9.4 Estado de publicación

**Los tags `v0.3.6` y `v0.3.8` no existen en el repositorio**, pese a que hay
commits «Release v0.3.6» (`4f7f68c`) y «Release v0.3.8» (`e714efa`) y a que
`package.json` ya dice 0.3.8. El último tag publicado es **`v0.3.7`**. Es decir:
la versión actual está subida en los archivos y en el CHANGELOG pero **nunca se
publicó su GitHub Release**. Empujar el tag es lo único que falta.

---

## 10. Reglas de estilo

> Deducidas del código existente. **Respétalas: la coherencia de este repositorio
> es lo que lo hace legible a pesar de su tamaño.**

### 10.1 Idioma

- **Todo se escribe en español**: identificadores, comentarios, mensajes de
  commit, entradas del CHANGELOG y textos de interfaz.
- Los textos visibles se escriben **en español en el código** y se traducen sobre
  la marcha. **Nunca introduzcas claves tipo `ui.panel.title`: la clave ES la
  frase española.** Si es estática, va como hijo de `el()` y se traduce sola; si
  es dinámica, se escribe `tt("texto español", "english text")` en el punto de uso.

### 10.2 Comentarios: el rasgo más característico del proyecto

Los comentarios **no describen lo que hace el código: cuentan qué bug lo motivó**.
Son largos, van en prosa y citan la versión. Ejemplo real de `types.ts`:

```ts
/**
 * FILAS REALES de pinholes de calce que tiene la malla.
 *
 * Sin esto, la rejilla se extendía hasta 2 cm de las puntas del poste y se
 * inventaba agujeros que no existen: en la media columna POWERRACK el panel
 * anunciaba «agujero X de 19» donde la malla tiene 10, y la jota podía subir
 * casi medio metro por encima del pinhole más alto, calzada sobre acero
 * macizo con el pin apoyado en la nada.
 */
calceFilas?: number;
```

**Escribe así.** Cuando arregles algo, deja escrito **qué estaba mal y por qué la
solución es esa**. Es la única documentación que sobrevive, y es lo que impide
que el siguiente (humano o modelo) «simplifique» el código y reviva el bug.

Un número mágico **siempre** lleva encima el comentario que dice de dónde salió.

### 10.3 Formato

Comillas dobles, punto y coma, sangría de 2 espacios, ancho ~90 columnas.
Separadores de sección con `// ─── NOMBRE ───`. Sin `any` salvo en fronteras.
`npx tsc --noEmit` tiene que salir limpio.

### 10.4 Lo que en este repositorio NO se hace

- **No** se introduce React ni ningún framework de interfaz. El DOM se construye
  a mano con `el()` y `clear()`.
- **No** se usa escala negativa para voltear: el espejo se **hornea** en los
  vértices.
- **No** se usa la AABB de mundo para pruebas geométricas: se usa `localSizeAbs()`.
- **No** se comparten los `defaults` de la biblioteca por referencia: se clonan
  con `structuredClone` (compartirlos hacía que doblar una pieza mutara el
  catálogo y las siguientes nacieran deformadas).
- **No** se espera con `waitForTimeout` a que termine la física.
- **No** se borra un id de componente.
- **No** se corrigen a mano los números de una máquina estándar: se reemplaza el
  bloque entero por el contenido del `.prefab.json` nuevo.

### 10.5 Mensajes de commit

```
Release v0.3.8: la bisagra se monta sobre caras, no sobre piezas

<párrafo que cuenta qué estaba mal antes>

<viñetas con los cambios concretos>

Comprobado con pruebas/prueba-bisagra-caras.mjs (21 comprobaciones) y sin tocar
bisagra-fisica, v232, v245, rotgrupo, solape-ui, uppermachine ni auditoria.
```

Sin acentos en el título (compatibilidad de herramientas). El cuerpo sí los lleva.

---

## 11. Cómo hacer un cambio, de principio a fin

```bash
# 1. Entender. Lee los comentarios del código que vas a tocar: cuentan la historia.
#    Si tocas una herramienta modal, relee §2.2. Si tocas física, relee §4.2.

# 2. Cambiar. Respeta los invariantes. Si añades un campo que debe sobrevivir a
#    guardar/cargar, va en PrimitiveParams, no en estado privado de la clase.

npx tsc --noEmit -p tsconfig.json      # 3. Tipos limpios
npm run build                          # 4. Compila

# 5. Escribir la prueba. Mide una MAGNITUD FÍSICA, no un píxel. Con ✓/✗ y
#    process.exit. Si el cambio no se puede medir, probablemente no está terminado.
npx vite preview --port 4174 --host 127.0.0.1 &     # DESDE LA RAÍZ
node pruebas/prueba-lo-tuyo.mjs

# 6. Regresión. Corre las pruebas vecinas (las que tocan el mismo subsistema).
#    Un fallo en paralelo se vuelve a correr SOLO antes de creérselo.

# 7. Versión: sube los CINCO sitios obligatorios (§11.1) y mantén en sync los dos
#    lockfiles.

# 8. CHANGELOG: cabecera EXACTA `## [X.Y.Z] — AAAA-MM-DD` (el CI la busca así).

# 9. Capturas nuevas → docs/capsula-del-tiempo/<fecha>/

git add -A && git commit          # 10. Mensaje en español, como en §10.5
git push -u origin <rama>
git tag vX.Y.Z && git push origin vX.Y.Z    # 11. ESTO es lo que publica la release
```

### 11.1 Los cinco sitios de la versión

Ninguno puede quedarse atrás:

| Archivo | Línea | Qué |
|---|---|---|
| `package.json` | 3 | `version` |
| `src-tauri/Cargo.toml` | 3 | `version` |
| `src-tauri/tauri.conf.json` | 5 | `version` |
| `android/app/build.gradle` | 11 | `versionName` |
| `android/app/build.gradle` | 10 | **`versionCode`** — entero monótono. Sin subirlo, Android **rechaza la actualización**. |

Además conviene mantener en sync `package-lock.json` (líneas 3 y 9) y
`src-tauri/Cargo.lock`, que los generadores tocan.

### 11.2 Qué publica qué

- **Empujar el commit** dispara `build.yml` (compila APK y .exe) pero **no publica
  nada**.
- **Empujar un tag `v*`** es lo que crea la GitHub Release con el APK, el .exe y
  los instaladores, sacando las notas del CHANGELOG con `awk`.
- La rama de disparo está **escrita a mano** en `.github/workflows/build.yml:12`.
  Renombrar la rama de trabajo **apaga el CI en silencio**.
- El APK se firma con `android/app/exersuite.keystore`, que viaja versionado **a
  propósito** (la app se distribuye por sideload; cambiar de llave rompería la
  actualización de todos los que ya la tienen instalada). `scripts/verificar-apk.py`
  compara huellas y aborta si no coinciden.

---

## 12. Cómo usar este documento con una IA local

1. **Indexa este archivo con prioridad alta** junto al código. Si tu herramienta
   admite un «archivo de reglas» (`.cursorrules`, `CLAUDE.md`, `AGENTS.md`,
   `.continuerules`), enlaza o copia ahí las secciones **§2.2 (patrón de modo)**,
   **§3 (atributos por clase)**, **§10 (estilo)** y **§11 (flujo de cambio)**: son
   las que evitan los errores caros.
2. **Antes de cada tarea, carga el subsistema que toca**, no el repositorio
   entero: `Editor.ts` solo ya no cabe en la mayoría de ventanas de contexto.
   Usa el mapa de §7 para elegir.
3. **Pídele siempre la prueba junto al cambio.** En este proyecto un cambio sin
   una medida que lo respalde no está terminado. El formato está en §8.1.
4. **Desconfía de los números de línea** de este documento si el código ha
   avanzado: busca por nombre de símbolo, que es estable.
5. **Cuando algo se rompa, busca el comentario de al lado antes de reescribir.**
   Casi todo lo que parece raro en este repositorio está así porque la forma obvia
   no funcionaba, y el comentario lo cuenta.

### Lecturas complementarias dentro del repositorio

| Archivo | Por qué |
|---|---|
| `CHANGELOG.md` | La memoria del proyecto. Cada entrada cuenta qué se rompió y por qué. Es largo y vale la pena. |
| `pruebas/LEEME.md` | El manual de la batería y el mejor documento sobre cómo se verifica algo aquí. |
| `src/ui/Instructivo.ts` | El FAQ que ve el usuario: describe cada herramienta desde fuera. Útil para entender la intención. |
| `docs/capsula-del-tiempo/README.md` | Índice narrado, versión a versión, con capturas. |
| `src/objects/types.ts` | Si solo puedes leer un archivo de código, que sea este. |
