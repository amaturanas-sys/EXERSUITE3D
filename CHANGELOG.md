# Changelog

Todos los cambios notables de **EXERSUITE3D** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.2.1] — 2026-07-21

### Añadido

- **Interfaz bilingüe Español/English**: selector de idioma en SETTINGS
  (persiste en el dispositivo). Toda la interfaz — Home, asistente, menús,
  paneles, paleta, HUD, Instructivo y diálogos — se muestra en el idioma
  elegido; pensado para presentar el proyecto a una audiencia más amplia.
- **Descarga directa en Android**: al guardar proyectos, exportar la
  biblioteca (ZIP), GLB o capturas, la app ofrece descargar DIRECTAMENTE a
  Documentos/EXERSUITE3D (visible en la app Archivos) además de la hoja de
  compartir (Drive, enviar…), que queda como alternativa y como respaldo.
- Nueva dedicatoria (5 idiomas) orientada a la nueva audiencia.

### Corregido

- **Deshacer/Rehacer no respondía de forma encadenada**: al aplicar un paso
  de historial se re-apilaba una instantánea espuria (los ids internos
  cambian al recargar la escena) que truncaba la rama de rehacer y absorbía
  los deshacer siguientes. Ctrl+Z/Ctrl+Y y los ítems del menú Edición ya
  avanzan y retroceden paso a paso.
- **El asistente de Nuevo no cabía en pantallas bajas**: el panel limita su
  altura y el contenido (incluido el paso Dibujar planta) se desplaza con
  scroll; el botón Crear proyecto siempre queda alcanzable.
- **El área de trabajo personalizada ahora LUCE como la estándar**: el suelo
  del canvas completo es el mismo plano gris neutro con rejilla (celda de
  10 cm, mayores cada 1 m) y el logotipo como marca de agua, recortado
  exactamente a la planta definida (rectángulo o dibujada); fuera de ella no
  hay suelo. Se retiró el relleno turquesa; queda solo el contorno fino.

## [0.2.0] — 2026-07-20

Rediseño mayor de la interfaz y del flujo de trabajo (esquemas del usuario),
en la app web/APK/Windows. El kit Godot mantiene la paridad v0.1.9; el
rediseño v0.2.0 se portará en una iteración posterior.

### Añadido

- **Home maestro-detalle**: navegación Builder · Simulador · Instructivo ·
  Settings con panel de contenido y leyenda contextual; galería de capturas
  del Simulador y ajustes de rendimiento integrados en la Home.
- **Asistente de proyecto nuevo**: modo de trabajo **Sencillo** (piezas
  básicas y máquinas estándar, para plantear la distribución de una sala) o
  **Profesional** (todas las herramientas), y espacio de trabajo **Libre**
  (suelo infinito) o **Completo**.
- **Canvas Completo — definir área de trabajo**: el suelo se define como
  rectángulo con medidas o **dibujando su planta en metros** (lienzo con
  rejilla, imán a 0,5 m y cota por segmento; admite salas en L o
  irregulares). **Techumbre** opcional como capa oscura copia FIEL de la
  planta, con alturas A/B y pendiente (slope en ° y % calculado en vivo), y
  **paredes N/S/E/O** generadas borde a borde del contorno. Techo y paredes
  son piezas ancladas reales: admiten bisagras, cables y cuerdas y
  participan en la simulación.
- **Límites del espacio editable**: lo que sobresale de la planta, del suelo
  o del plano inclinado del techo se tiñe de rojo, el HUD cuenta las piezas
  fuera y la colocación se cancela al soltar el arrastre.
- **Barra con menús agrupados**: Archivo · Edición · Selección · **Ver**
  (grid, aristas de las piezas, modo de color materiales/por
  categoría/neutro y perspectivas Frontal/Lateral/Superior/Isométrica) ·
  Ejes (bloqueo X/Y/Z con distintivo). Barra compacta ideal para tablet.
- **Ergonomía del maniquí**: **candado por articulación** (las bloqueadas no
  se posan; persistido en el proyecto), **Simetría L↔R** (cada cambio se
  replica espejado) y **✋ Agarrar maniquí** (arrastra un segmento del cuerpo
  y rota la articulación libre más cercana; 1/2/3 restringe a un eje;
  agarrar la pelvis mueve la figura).
- **Máquinas estándar** en la paleta: rack de sentadillas (142×199×120 cm),
  jaula de potencia, banco plano y torre de polea alta/baja — prefabricados
  con componentes reales, agrupados y con medidas comerciales.
- **Arrastrar y soltar desde la paleta**: las piezas (y máquinas) se sueltan
  en el punto del suelo elegido; en táctil, mantener pulsado ~0,3 s.
- **Paneles plegables**: tocar el título de cualquier panel lo colapsa a su
  cabecera.
- **Modelos CAD integrados**: barra olímpica (2,20 m) y disco de 45 lb con
  malla real y colisionador primitivo a dimensiones reales.

### Corregido

- **Biblioteca del maniquí**: cada segmento muestra ahora su primitiva real
  (cabeza=esfera, torso=caja, muslo=cilindro…) en lugar del mismo cilindro
  para todos, compartiendo la geometría con el rig para que la sustitución
  por modelos mapee correctamente.

## [0.1.9] — 2026-07-17

### Corregido

- **Biblioteca: "Sustituir por modelo…" no dejaba elegir archivos en
  Android**: el selector del sistema filtra por tipo MIME y no conoce el de
  los `.glb`/`.gltf` (los mostraba bloqueados). En la app nativa los
  selectores se abren ahora sin filtro y el tipo se valida por extensión al
  elegir — aplica también a abrir proyectos `.json` e importar modelos.
- **Exportar/Importar ZIP de la biblioteca no funcionaba en el APK**: el
  WebView de Android ignora las descargas por ancla con blobs. Todas las
  descargas de la app (ZIP de biblioteca, guardar proyecto `.json`,
  exportar `.glb`) usan ahora un mecanismo compatible: en Android se escribe
  el archivo y se abre la hoja de compartir del sistema (guardar en
  Archivos, Drive, enviar…); en web y Windows, descarga normal.
- **Godot: los diálogos de archivo usan el selector NATIVO del sistema**
  (`use_native_dialog`): en Android abre el selector con acceso real al
  almacenamiento — sustituir modelos, abrir/guardar proyectos y el ZIP de la
  biblioteca ya acceden a los directorios del dispositivo.

### Añadido

- **Botón "📖 Instructivo" en el inicio**: abre una ventana con la guía de
  uso completa — primeros pasos, construcción, edición de precisión (ejes
  1/2/3, área, copiar/pegar, deshacer), física y conexiones, maniquí,
  simulación, biblioteca y rendimiento.

## [0.1.8] — 2026-07-06

### Añadido

- **Herramienta de selección completa** en el Builder web:
  - **Ctrl+clic** (o Shift+clic) añade/quita piezas de la selección; sobre
    una pieza agrupada, añade/quita el grupo entero.
  - **Selección de área**: botón "Área" en la barra — arrastra un recuadro
    tipo Paint y selecciona todo lo que cae dentro (con Ctrl, añade a lo ya
    seleccionado); los grupos entran como unidad.
  - La multiselección ahora lleva **gizmo propio en el centroide**: mover o
    rotar actúa sobre todo el conjunto en bloque (cuerdas y cables siguen a
    sus anclas).
- **Copiar / pegar / cortar / eliminar la selección**: botones Copiar y
  Pegar en la barra y atajos **Ctrl+C / Ctrl+V / Ctrl+X / Supr**; lo pegado
  aparece con un pequeño desplazamiento y queda seleccionado, listo para
  colocar. Funciona con piezas sueltas, multiselección y grupos (también
  piezas importadas).
- **Deshacer / Rehacer**: botones ↺/↻ en la barra y **Ctrl+Z / Ctrl+Y**
  (o Ctrl+Shift+Z). Historial por instantáneas del proyecto completo
  (piezas, articulaciones, cables, cuerdas, grupos y maniquí), con
  agrupación automática de cambios rápidos (arrastres del gizmo = un solo
  paso) y tope de 60 pasos.
- **Herramienta "Arrastrar"**: agarra cualquier pieza directamente en el
  visor y llévala sin pasar por las asas del gizmo; arrastra igualmente
  multiselecciones y grupos completos (cuerdas y cables siguen).
- **Eje de trabajo bloqueado (1=X, 2=Y, 3=Z; 0 o Esc libera; repetir la
  tecla también)**: restringe TODO el trazado al eje elegido para construir
  con precisión en 3D mirando una pantalla 2D — el gizmo muestra solo el
  asa de ese eje (mover y rotar), la herramienta Arrastrar desliza la pieza
  por la recta del eje, los **nodos de doblado** se mueven solo a lo largo
  del eje y el **trazado de pilares/travesaños/tubos** proyecta el segundo
  punto sobre el eje desde el primero. Botones X/Y/Z en la barra (para
  tablet) y aviso "EJE … BLOQUEADO" en la línea inferior.
- **Contador de desplazamiento en vivo**: durante cualquier arrastre o
  trazado, la línea inferior muestra la medida en centímetros — Δ por eje
  con bloqueo activo, Δ total con desglose X/Y/Z sin él, grados al rotar
  con el gizmo y longitud en vivo al trazar pilares/travesaños/tubos.

### Corregido

- **El eje Y no funcionaba con el bloqueo de eje**: el trazado y el imán
  dependían de que el puntero tocara suelo o superficies — al apuntar hacia
  arriba no había intersección y la herramienta no respondía. Con eje
  bloqueado, ahora el punto se calcula sobre la recta del eje más cercana
  al rayo del puntero (funciona "apuntando al cielo") y el imán de anclaje
  se desactiva para no corregir la posición fuera del eje.

## [0.1.7] — 2026-07-06

### Añadido

- **Kit de migración a Godot 4** (`godot/` + `docs/MIGRACION-GODOT.md`):
  proyecto Godot nativo que **abre los mismos proyectos `.json`** de la app y
  los simula con física nativa — piezas con material/escala, bisagras y
  correderas con límites y motor, **cables inextensibles con poleas 2:1
  emergente**, cuerdas en catenaria, perfiles/tubos por línea (rectos y
  doblados por Catmull-Rom), maniquí a escala con pose, **mano interactiva**,
  cámara orbital táctil con vistas y demo integrada. La biblioteca de datos
  (47 componentes, 20 materiales) se genera automáticamente desde el código
  TypeScript. La guía cubre instalación, uso de los modelos `.glb`,
  exportación a Windows/Android paso a paso y la hoja de ruta con la tabla de
  paridad para completar el editor en Godot.
- **Migración 1:1 definitiva a Godot** (`godot/`): el kit pasa de "núcleo
  funcional" a réplica completa lista para publicar —
  - **Identidad visual**: icono y splash de la marca, tema propio (paleta
    papel/tinta de la web) en toda la interfaz y **pantalla de inicio** con
    logo, Crear/Abrir/**Simulador**/Continuar/Biblioteca/Demo y **proyectos
    recientes**.
  - **Editor completo**: **anillos de rotación libre** en el gizmo,
    **multiselección** (Shift/Ctrl+clic) con arrastre en bloque y **grupos**
    (Agrupar/Desagrupar, interoperables con la web), y **pinholes reales** en
    perfiles (CSG: caja menos cilindros).
  - **Biblioteca de repertorio potenciada**: pantalla propia para **sustituir
    por un `.glb`** el modelo de cada componente **y de cada segmento del
    maniquí** (ajuste automático al hueco de la primitiva, persistencia en
    `user://`, carga en caliente sin reimportar, prioridad usuario →
    empaquetado → primitiva, y primitiva fantasma al seleccionar).
  - **Maniquí potenciado**: segmentos con los ids de la web, overrides de
    modelo por segmento e **IK de manos de dos huesos** que sigue los agarres
    durante la simulación; pose y manos viajan en el `.json` en ambos
    sentidos.
  - **Persistencia**: **autosave** cada 20 s (`user://autosave.json`, botón
    Continuar en el inicio) y **proyectos recientes** nativos.

### Cambiado

- **Resolución dinámica** (web): mientras se orbita, se arrastra sobre el
  lienzo o corre la simulación, el render baja a ×0,7 de la escala elegida y
  vuelve a nítido en reposo — la técnica de las apps nativas de escultura.
  Activa por defecto en los presets Medio y Bajo, con conmutador propio en
  Rendimiento.

- **Rendimiento web, segunda ronda**: la **escala de render** admite ×0.75 y
  ×0.5 (el preset **Bajo** pasa a ×0.75 — la palanca que usan las apps
  nativas de tablet); **sombreado simple** opcional (Lambert sin tone
  mapping ACES, una fracción del coste PBR por píxel, activo en Bajo);
  sombras del preset **Medio** a mapa de 1024 con filtro duro (las suaves
  PCF quedan para Alto, con conmutador propio); y la física se limita a
  **2 sub-pasos por frame** para eliminar la espiral de tirones cuando el
  equipo no llega a 60 fps (cámara ligeramente lenta en vez de saltos).
- **Rendimiento web (app v0.1.6)**: **render bajo demanda** — fuera de la
  simulación solo se repinta con interacción (puntero/teclado/rueda),
  movimiento de cámara o cambios de escena, con latido de seguridad cada
  500 ms; en tablets elimina el trabajo de GPU en reposo (fluidez, batería y
  temperatura). En móvil/tablet el preset de Rendimiento por defecto pasa a
  **"medio"** (DPR 1,25, sin antialias) — el usuario puede subirlo cuando
  quiera desde el panel Rendimiento.
- **Rendimiento Godot**: CI y binarios sobre **Godot 4.4.1** con **Jolt
  Physics** e **interpolación física 3D** (adiós stuttering 60 Hz ↔
  pantalla, solo en cuerpos dinámicos y con reset al restaurar el diseño);
  los **pinholes CSG se hornean** a malla estática tras el primer cálculo
  (coste cero por frame); overrides móviles (sin MSAA, sombra 1024 con
  filtro duro solo en Android); **bajo consumo en el Builder** (solo repinta
  con actividad); IK de manos solo al simular; y **tipografía del sistema**
  (Roboto/Segoe UI, la pila de la web) en toda la interfaz.
- **CI Godot**: nuevo job **"capturas"** que ejecuta la app con renderer por
  software (xvfb + gl_compatibility), fotografía Home/Builder/Biblioteca/
  Simulación y sube los PNG como artifact `capturas-ui` — revisión visual
  sin instalar el APK.
- **Godot: paridad visual y de herramientas 1:1 con la web v0.1.6** —
  - **Home** como el de la web: logotipo grande, selector **Builder /
    Simulador** con sus acciones (Crear nuevo proyecto, Abrir archivo…,
    Explorar biblioteca / Simular archivo…), tarjeta de **PROYECTOS
    RECIENTES** y **DEDICATORIA**.
  - **Barra del Builder** completa: **Simular en verde**, Mover/Rotar
    (filtran las asas del gizmo), **Grid** conmutable, Duplicar, Eliminar,
    Agrupar/Desagrupar, **Figura** con altura del maniquí en cm, vistas,
    zoom, proyecto y "Autoguardado activo".
  - **Paleta** como la web: cabecera con el logotipo, "PIEZAS DISPONIBLES" y
    tarjetas por pieza con **punto de color por categoría** (los
    CATEGORY_COLORS exactos de la web).
  - **Visor claro** como la web: fondo gris claro, **rejilla de 10 cm** con
    líneas mayores cada metro, **ejes X/Y/Z de colores** y rótulo "1 celda =
    10 cm · ejes en cm".
  - **Inspector** en tarjetas **PROPIEDADES** / **CONEXIONES** (bisagra,
    corredera, cable siempre a mano) con los mismos textos de la web.
  - **Biblioteca de modelos** como la web: **vista previa 3D giratoria** del
    ítem (primitiva o .glb sustituido), "Sustituir por modelo…",
    "Restablecer primitiva" y **Exportar/Importar ZIP** de toda la colección.
  - Diálogo **"Cambios sin guardar"** (Guardar y salir / Salir sin guardar /
    Cancelar) al volver al inicio.
  - Splash e iconos con los logotipos correctos (icono como la web: logo
    negro sobre blanco; splash con el logotipo claro sobre fondo oscuro).

### Eliminado

- **Figura de esqueleto**: se retira el modo "Esqueleto" de la figura humana
  (sin relevancia para el proyecto). El selector de tipo de figura
  desaparece de la barra, el modelo `overview-skeleton.glb` (1,25 MB) sale
  del paquete y los proyectos guardados con ese modo se abren con el
  maniquí.

### Corregido

- **Godot: el APK/EXE exportado salía sin la biblioteca de datos**: los
  `.json` no son recursos importados y el filtro de exportación no los
  incluía, por lo que los binarios nativos arrancaban sin componentes ni
  materiales (escena vacía). Ahora `data/*.json` y `extras/*.json` viajan
  dentro del paquete. Además, la interfaz se escala a la densidad real de la
  pantalla (`canvas_items`, diseño base 1280×800) para que botones y paneles
  se vean a tamaño correcto en tablets sin tocar la resolución del render 3D.

## [0.1.6] — 2026-07-04

### Cambiado

- **Ajuste completo de la interfaz a la pantalla del dispositivo**: la barra
  superior ya no se desborda —se limita al ancho visible y se desplaza
  horizontalmente (swipe/rueda) cuando las herramientas no caben—; los paneles
  laterales estrechan su ancho por tramos en pantallas medianas y, en móviles
  y tablets verticales, se convierten en **cajones ocultables** con pestañas
  (🧩 piezas, 🧰 propiedades/conexiones, 🧍 posturas) que dejan el viewport
  libre y mantienen todas las opciones accesibles. Se respetan las **zonas
  seguras** del dispositivo (notch, barras del sistema) en barra, paneles y
  barra de simulación.

## [0.1.5] — 2026-07-03

### Añadido

- **Modo Simulador desde la pantalla de inicio**: un selector **Builder /
  Simulador** permite abrir un proyecto (archivo, reciente o sesión anterior)
  solo para **correr su física**, sin construir ninguna herramienta de edición
  (paleta, inspector, paneles…) — ideal para mostrar un diseño gastando el
  mínimo de recursos. La física arranca sola y la única interfaz es la barra
  de simulación (Inicio, Pausar/Reanudar y las herramientas de abajo).
- **Barra de herramientas de simulación** (también en el Builder, al pulsar
  Simular): set de **perspectivas** (Frontal / Lateral / Superior / Isométrica,
  encuadrando el proyecto), **zoom** por botones (además de la rueda),
  **posicionamiento del maniquí** (arrástralo para situarlo frente a la
  máquina) y **mano interactiva**: arrastra cualquier pieza móvil y un resorte
  físico amortiguado tira de ella por el punto agarrado, como una persona real
  usando los agarres y barras de la máquina (la pieza palanquea, gira y
  arrastra lo que tenga conectado).
- **Crear pilar / travesaño (línea)**: nueva herramienta de la paleta que traza
  un perfil de acero entre dos puntos, como la línea recta de Paint. Un diálogo
  permite elegir **perfil 1:1 / 1:2 / 1:3**, **medida nominal** (40–100 mm),
  **extremos** (corte plano o diagonal en inglete a 45°) y **pinholes** reales
  (agujeros pasantes con diámetro y distancia configurables). Incluye **aim
  assist**: el cursor se imanta a extremos, nodos y puntos medios de otras
  piezas para encadenar estructuras complejas; el modo queda activo para trazar
  varias piezas seguidas (ESC para salir).
- **Crear tubo de acero (línea)**: igual que el pilar pero con sección circular
  y **medidas nominales** de tubo (⌀ 25–76 mm), con el mismo aim assist.
- **Bending (doblado por nodos)**: al seleccionar un pilar/travesaño o tubo, el
  botón **Doblar (nodos)** muestra los nodos de su trayectoria como asas
  arrastrables; arrastrarlos da forma a la pieza con una **curva suave**
  (Catmull-Rom), al estilo de las curvas editables de Photoshop. La forma se
  guarda con el proyecto y la física usa el volumen doblado. En piezas dobladas
  no aplican agujeros ni extremos diagonales (vuelven al enderezarlas).

### Cambiado

- Durante la simulación se **oculta toda la interfaz de edición** (paleta,
  inspector, conexiones, posturas, HUD y los grupos de herramientas de la
  barra): edición y simulación quedan como dos entornos separados, y al
  detener la física la interfaz vuelve tal cual estaba.

### Corregido

- **Articular piezas con orientaciones distintas** ya no produce un latigazo al
  iniciar la simulación: cuando los frames de diseño no son compatibles, la
  bisagra/corredera se crea a través de un cuerpo adaptador que respeta la
  orientación de ambas piezas (antes el solver reorientaba la pieza móvil de
  golpe para alinear los ejes locales).
- **Física**: la velocidad de la simulación ya no depende del refresco del
  monitor (paso fijo de 1/60 s con acumulador; a 120/144 Hz corría al doble).
  Collider del toro (aro) ajustado a su caja real (flotaba/empujaba a
  distancia); colliders de geometrías dobladas alineados con el centro real de
  la forma (colisionaban desplazados); iniciar la simulación dos veces seguidas
  (Espacio mantenido) ya no crea mundos de física duplicados sin liberar.
- **Guardar durante la simulación** (botón Guardar, Home → "Guardar y salir")
  serializa ahora el estado de **diseño**, no las posiciones simuladas del
  momento (antes guardaba la máquina "colapsada").
- **"Nuevo" durante la simulación** detiene la física antes de vaciar la
  escena (antes seguía simulando sobre una escena vacía y la edición quedaba
  bloqueada).
- **Cambios sin guardar**: posar el maniquí, tensar cuerdas, mover grupos y
  doblar piezas ya cuentan como cambios (antes se salía sin aviso de guardar).
- Las **cuerdas** siguen a sus anclas al mover un **grupo**, durante la
  **simulación** y al **restaurar** el diseño al detenerla (antes quedaban
  flotando en la posición antigua).
- **Cargar un proyecto** con una pieza desconocida (de otra versión) ya no
  aborta la carga completa: se omite esa pieza con aviso y se carga el resto.
  Abrir un proyecto reciente que falla muestra un error en vez de quedar en
  silencio. **Duplicar una pieza importada** (glb/obj) ya no lanza un error.
- **Desagrupar/eliminar un grupo** ya no deja el inspector mostrando los
  controles del grupo inexistente.
- **Atajos de teclado**: ya no se disparan al escribir o navegar en selectores
  y campos de la UI (Espacio arrancaba la simulación desde un desplegable,
  Supr borraba la pieza…); con un botón enfocado, Espacio activa el botón.
- **Alternar maniquí/esqueleto** ya no resucita una figura que el usuario
  quitó, y volver a mostrar el esqueleto ya no re-sube el modelo entero a GPU
  (la caché compartida se conservaba mal).
- **Abrir el mismo archivo dos veces** desde la pantalla de inicio funciona
  (el selector no se reseteaba tras un archivo inválido).
- **Fugas de memoria/GPU corregidas** al alternar proyecto ↔ Home: atajos
  globales de Toolbar y panel de Rendimiento que retenían el editor entero,
  contexto WebGL y entorno PMREM de la vista previa de la biblioteca,
  texturas del suelo, materiales de los ayudantes de articulaciones y de los
  cables, decodificador Draco duplicado por cada modelo cargado, y pilas
  selectorizadas que no se reconstruían al asignarles un modelo 3D.

### Rendimiento

- **Rapier se carga bajo demanda**: el módulo de física (~2,2 MB de WASM) se
  descarga al pulsar **Simular** por primera vez, no al abrir la app; la
  landing y el editor arrancan más ligeros.
- Las **cuerdas** reutilizan sus meshes (pool) y comparten una única geometría
  unitaria escalada por segmento: arrastrar la pieza anclada o el slider de
  tensión ya no clona ni re-sube geometrías a GPU.
- La **IK de manos** ya no recorre el árbol completo de la figura 3 veces por
  mano y por frame: solo recalcula la cadena hombro→muñeca consultada.
- Los **proyectos recientes** guardan sus metadatos (nombre/fecha) en un store
  aparte de IndexedDB (migración automática): listar la Home o podar ya no
  deserializa hasta 12 proyectos completos.
- Los visuales de **cables** solo se reconstruyen cuando algo se mueve (antes
  re-subían sus buffers a GPU en cada frame, incluso en reposo).
- El **snapping** ya no recalcula el bounding box de todas las geometrías en
  cada evento de arrastre (se degradaba con modelos personalizados grandes).
- El bundle se divide en chunks (`three`, `rapier`, app): descarga en paralelo
  y mejor caché del navegador entre versiones (el código propio pasa de
  3,2 MB a ~300 kB por actualización).

## [0.1.4] — 2026-07-01

### Añadido

- **Cable por poleas rediseñado**: la herramienta de cable se coloca ahora
  seleccionando **dos puntos de anclaje** que describen una **línea recta**
  (estilo “línea recta” de Paint), con **previsualización elástica** y un
  indicador que resalta el **punto de conexión** más cercano de la pieza
  señalada (anclaje facilitado por proximidad). Entre los dos extremos, las
  únicas superficies por las que el cable puede **deslizarse** son
  **roldanas/poleas** (`polea`, `roldana`, `bloque de poleas`): al hacer clic en
  una se añade como punto de reenvío y el trazado continúa; al hacer clic en
  cualquier otra pieza se cierra el cable (o **Enter/Finalizar**).
- **Cadenas y correas de seguridad como cuerdas**: se colocan con una
  herramienta de **línea** (clic en un extremo y luego en el otro, estilo “línea
  recta” de Paint). Cada extremo se **ancla** a la pieza más cercana (a su punto
  de anclaje) o a la superficie del suelo. Cuelgan describiendo una **catenaria**
  con **tensión/holgura ajustable** (panel Conexiones). Se dibujan como
  **segmentos articulados** (eslabones o listones), y la forma del segmento se
  toma de la biblioteca: al reemplazar el modelo de **Cadena de eslabones** o
  **Listón de Kevlar** en la biblioteca, las cuerdas usan ese modelo más preciso.
- **Reemplazo de segmentos del maniquí**: en la biblioteca (pestaña **Maniquí**)
  se puede sustituir cada parte del cuerpo (cabeza, torso, brazos, antebrazos,
  manos, muslos, piernas, pies…) por un modelo 3D más estético. El modelo se
  ajusta automáticamente al hueco de la parte (igualando su dimensión más larga
  y centrándolo), conserva la articulación y se guarda en el navegador; el
  maniquí se reconstruye al cambiarlo. La biblioteca queda en dos pestañas:
  **Componentes** y **Maniquí**.
- **Posado dinámico del maniquí por eje articular**: al seleccionar un segmento,
  el gizmo se coloca en la articulación y solo muestra los **ejes naturales** de
  esa articulación (bisagra en codo/rodilla = 1 eje; esférica en hombro/cadera =
  3 ejes; muñeca/tobillo = 2). Arrastrar el eje gira el segmento completo en
  torno a la articulación, dentro de **rangos anatómicos** (se limitan los
  ángulos y se bloquean los ejes no naturales, también en el editor numérico).
- **Exportar/importar la biblioteca en bloque** (ZIP), para mantener el
  repertorio entre dispositivos. Al importar, un diálogo de fusión clasifica
  cada modelo entrante frente al local (**Nuevo / Más reciente / Más antiguo /
  Sin cambios**) usando marcas de tiempo: por defecto aplica los nuevos y los
  más recientes, y **no** sobrescribe tus ediciones con versiones más antiguas
  ni con modelos por defecto (los que no cambiaron no viajan en el ZIP). El
  usuario marca/desmarca qué aplicar.
- **Opciones de rendimiento** (botón **Rendimiento** en el editor): presets
  Alto/Medio/Bajo y ajustes finos de resolución de render, sombras, reflejos de
  entorno y antialias, para diseñar con fluidez en equipos o tablets con poca
  potencia. Se guardan y se aplican en vivo (el antialias, al reabrir).
- **Volver a la Home** desde un proyecto (botón **⌂ Home**): sugiere guardar si
  hay cambios (Guardar y salir / Salir sin guardar / Cancelar) y libera por
  completo el editor, permitiendo trabajar en varios proyectos de forma
  secuencial sin reiniciar la app.

### Cambiado

- La **biblioteca de repertorio** ahora es una vista de la **Home** que muestra
  solo el ítem seleccionado en un visor 3D, sin ejecutar el entorno de diseño
  completo en segundo plano (menor consumo de recursos). El botón de biblioteca
  se retira del editor; se accede desde la pantalla de inicio. Toda la
  previsualización y el reemplazo de modelos ocurren en ese entorno separado.
- La paleta del editor pasa a ser una **bandeja de "piezas disponibles"** (estilo
  set de Lego): cada pieza se coloca en el diseño con el modelo 3D que le haya
  asignado la biblioteca, y se marca con un punto las que tienen modelo propio.
  Los modelos se comparten entre todos los proyectos (gestor único).

## [0.1.3] — 2026-06-30

### Añadido

- **Pantalla de inicio (launcher)**: al abrir la app se muestra una landing
  ligera —sin inicializar WebGL/física hasta elegir acción, para ahorrar
  recursos— con el logotipo grande y su lettering, botones **Crear nuevo** y
  **Abrir archivo…**, **Continuar sesión anterior** (autoguardado), una lista de
  **proyectos recientes** (IndexedDB) y un apartado de **dedicatoria** editable
  desde `public/dedicatoria.txt`.
- **Explorar biblioteca** desde la landing: abre la biblioteca sobre una escena
  vacía (sin cargar un proyecto) para revisar cada componente por separado con
  una **vista previa 3D** (turntable, orbitable) y sustituirlo por un modelo,
  haciendo más eficiente la edición del repertorio de piezas.
- **Guardar** pide ahora un nombre de proyecto (se usa para el archivo `.json` y
  para la entrada de proyectos recientes).
- Dedicatoria del autor en cinco idiomas (español, inglés, alemán, francés y
  portugués) con etiqueta de idioma en la pantalla de inicio.

### Corregido

- El autoguardado ya no sobrescribe la sesión anterior con una escena vacía:
  abrir "Crear nuevo" o "Explorar biblioteca" conserva la sesión hasta que haya
  contenido nuevo (sigue disponible en "Continuar sesión anterior").
- La vista previa de la biblioteca libera la geometría y el material de cada
  componente al cambiar de selección (evita fugas de memoria/GPU).

## [0.1.2] — 2026-06-30

### Añadido

- **Biblioteca de componentes**: ventana para sustituir la primitiva básica de
  cualquier componente por un modelo 3D diseñado en SketchUp o Nomad
  (`.glb`/`.gltf`/`.obj`). El modelo se fusiona, se escala a cm y se centra, se
  aplica a todas las instancias del componente y se guarda en el navegador
  (IndexedDB) para restaurarse al reabrir; botón **Restablecer** para volver a
  la primitiva.
- **Modelos por archivo**: carpeta `public/models/components/` con un
  `manifest.json` (id de componente → fichero) para reemplazar modelos solo con
  archivos, sin código ni la app. Se cargan al arrancar; un modelo puesto desde
  la Biblioteca tiene prioridad sobre el de archivo. Incluye `LEEME.md` con la
  lista de ids y las instrucciones.

### Cambiado

- **Suelo de trabajo** siempre presente e inamovible: plano gris neutro (escala
  de grises) que recibe sombras y muestra el logotipo de la app como marca de
  agua tenue, de bajo contraste. No es seleccionable ni se borra al limpiar la
  escena. Fondo y rejilla neutralizados a grises.

## [0.1.1] — 2026-06-30

### Añadido

- **Identidad de marca EXERSUITE3D**: el logotipo (placa olímpica + compás de
  dibujo) se integra como favicon, cabecera de la paleta (insignia + wordmark)
  e iconos nativos de la app (Android e iconos de Tauri), generados desde el
  arte de marca. Paleta monocroma industrial (tinta + papel hueso) en la
  interfaz: los estados activos/seleccionados usan el acento de marca.
- Este `CHANGELOG.md`.

### Cambiado

- El ejecutable de escritorio (Tauri) ahora se llama `EXERSUITE3D.exe` (antes
  `exersuite3d.exe`), vía `mainBinaryName` en `tauri.conf.json`.
- Los paneles laterales arrancan bajo la barra superior para no quedar tapados.

## [0.1.0] — 2026-06-30

Primera versión empaquetada, con binarios para Android y Windows publicados
automáticamente en la Release.

### Añadido

- **Editor 3D** estilo SketchUp / NomadSculpt: viewport con cámara orbital,
  grid en centímetros (1 unidad = 1 cm), selección, gizmos de mover/rotar/escalar
  y HUD de medidas. Librería de componentes mecánicos de gimnasio (estructurales,
  de movimiento, de transmisión, de peso y ergonómicos) con material PBR y
  atributos físicos editables, e inspector con medidas exactas.
- **Física (Rapier)**: cuerpos rígidos, gravedad, masas y colisiones, con
  Play/Stop que restaura el diseño. Articulaciones de bisagra (revolute) y
  corredera (prismatic) con eje, pivote, límites de recorrido y motor de
  velocidad.
- **Cables y poleas**: cable inextensible que pasa por poleas (puntos de paso) y
  acopla sus dos extremos por conservación de longitud; las poleas móviles
  producen el ratio 2:1 de forma emergente. Pila de pesos selectorizada con
  placas, varillas, tubo y pin animados.
- **Ensamblaje**: encaje magnético (snapping) en puntos de anclaje
  (centro/eje, extremos de cilindros, centros de cara) y agrupación
  multicomponente (subensamblajes) con nombrar/duplicar/desagrupar.
- **Modelado**: voltear (espejo) y deformación libre —doblar (bend), torcer
  (twist) y biselar/redondear aristas (cajas).
- **Figura humana de referencia**: maniquí posable con rig de articulaciones
  (rotación por gizmo y editor numérico de ángulos X/Y/Z) **o** esqueleto
  anatómico detallado (glTF/Draco, CC BY-SA con su crédito), a escala con altura
  editable en cm. Posturas estándar editables y ampliables (biblioteca
  persistente: aplicar, actualizar, guardar, eliminar, restaurar). Apoyo de
  manos en agarres con IK de dos huesos.
- **Proyecto**: guardar/cargar a archivo `.json` (piezas, joints, cables, grupos
  y personaje con su pose) y **autoguardado** en el navegador (localStorage) con
  restauración al reabrir.
- **Interoperabilidad glTF**: exportar el prototipo a `.glb` binario e importar
  modelos `.glb`/`.gltf` (Draco) u `.obj`.
- **Empaquetado multiplataforma** desde el mismo bundle web: Android (APK) con
  Capacitor y Windows (standalone) con Tauri.
- **CI/CD** (GitHub Actions): compila el APK (runner Linux) y el `.exe` +
  instaladores NSIS/MSI (runner Windows) en cada push y, al crear un tag `v*`,
  publica una GitHub Release con todos los binarios adjuntos.

[Sin publicar]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/amaturanas-sys/EXERSUITE3D/releases/tag/v0.1.0
