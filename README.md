# EXERSUITE3D

Plataforma de diseño 3D y simulación de físicas para **prototipar máquinas de
gimnasio**. Editor estilo SketchUp / NomadSculpt con medidas exactas en
centímetros, librería de componentes mecánicos y (próximamente) simulación de
palancas, poleas y pesos.

Objetivo multiplataforma desde un único código web:

- **Android (APK)** vía [Capacitor](https://capacitorjs.com/)
- **Windows (standalone)** vía [Tauri](https://tauri.app/) o Electron

## Stack

- **TypeScript** + **Vite**
- **[Three.js](https://threejs.org/)** para render 3D (1 unidad = 1 cm)
- **[Rapier](https://rapier.rs/)** (WASM) para simulación de física rígida

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # typecheck + bundle de producción en dist/
npm run preview    # sirve el build de producción
npm run typecheck  # solo comprobación de tipos
```

## Empaquetado (Android / Windows)

El mismo bundle web (`dist/`, con `base: "./"` para cargarse desde `file://`)
alimenta ambos empaquetados.

### Android — APK (Capacitor)

Requisitos: **Android Studio** + **Android SDK** y **JDK 17**. La configuración
está en [`capacitor.config.ts`](capacitor.config.ts) (`appId: com.exersuite.app`,
`webDir: dist`) y el proyecto nativo vive en [`android/`](android/).

```bash
npm run android:sync   # build web + copia a android/ y sincroniza plugins
npm run android:open   # abre Android Studio para compilar/firmar el APK
npm run android:apk    # alternativa CLI: genera app-debug.apk con Gradle
# (si clonas en limpio y falta android/: npm run android:add)
```

El APK de depuración queda en `android/app/build/outputs/apk/debug/`. Para una
APK/AAB de publicación, configura la firma en Android Studio (Build > Generate
Signed Bundle/APK).

### Windows — standalone (Tauri)

Requisitos: **Rust** (stable, target `x86_64-pc-windows-msvc`), **Microsoft C++
Build Tools** y **WebView2** (incluido en Windows 10/11). El crate de escritorio
está en [`src-tauri/`](src-tauri/) (`identifier: com.exersuite.app`).

```bash
npm run tauri:dev      # ejecuta la app de escritorio en modo desarrollo
npm run tauri:build    # genera el .exe + instaladores (NSIS / MSI) en
                       # src-tauri/target/release/bundle/
```

> El binario de Windows debe compilarse en Windows (o cruzado con el toolchain
> MSVC). En Linux, Tauri requiere además `webkit2gtk-4.1` para correr en local.

## Controles del editor

| Acción              | Atajo / interacción                     |
| ------------------- | --------------------------------------- |
| Orbitar cámara      | Arrastrar con el ratón / un dedo        |
| Pan / Zoom          | Click derecho-arrastrar / rueda / pinch |
| Seleccionar objeto  | Click sobre el objeto                   |
| Mover               | `W` o `G`                               |
| Rotar               | `E` o `R`                               |
| Escalar             | `S`                                     |
| Duplicar selección  | `Ctrl + D`                              |
| Eliminar selección  | `Supr` / `Backspace`                    |
| Deseleccionar       | `Esc`                                   |
| Simular / detener   | `Espacio` o botón **Simular**           |
| Guardar / cargar    | Botones **Guardar** / **Cargar** (proyecto a archivo `.json`) |
| Nuevo proyecto      | Botón **Nuevo**: vacía la escena y descarta el autoguardado |
| Autoguardado        | Automático en el navegador (localStorage); se restaura al reabrir. Indicador **Guardado ✓** en la barra |
| Exportar / importar | Botones **Exportar** (.glb) / **Importar** (.glb/.gltf/.obj) para intercambiar modelos 3D |
| Crear articulación  | **+ Bisagra** / **+ Corredera**, luego clic en pieza A y pieza B |
| Trazar cable        | **+ Cable**, clic en cada pieza (se ancla al punto más cercano al clic), **Enter** para cerrar |
| Encaje magnético    | Botón **Imán**: al mover una pieza, encaja en puntos de anclaje (centro/extremos/caras) de otras |
| Agrupar piezas      | **Shift+clic** para multiseleccionar → **Agrupar**; grupo: **nombrar/duplicar/desagrupar/eliminar** en el inspector |
| Voltear (espejo)    | Inspector → **Voltear X/Y/Z** sobre la pieza seleccionada |
| Modelado avanzado   | Inspector → **Doblar °**, **Torcer °** (todas) y **Bisel cm** (cajas) |
| Ángulo de articulación | Selecciona un miembro del maniquí → campos **X/Y/Z (grados)** en el panel Posturas |
| Figura humana       | Botón **Figura**; tipo **Maniquí / Esqueleto** y altura en cm |
| Posar figura        | Clic en un miembro del maniquí → rotar la articulación; panel **Posturas** para aplicar |
| Editar/crear postura | Posa a mano y **Actualizar** (sobrescribe) o **Guardar como…** (nueva); editables y persistentes |
| Apoyar mano (IK)    | Panel Posturas → **Apoyar mano** → clic en una mano y luego en un agarre; la mano se fija y lo sigue |

## Arquitectura

```
src/
  core/        # unidades (cm), bus de eventos, Editor (orquestador + simulación), snapping
  scene/       # SceneManager: escena, cámara, luces, grid en cm, entorno PBR
  objects/     # SceneObject, geometrías, librería de componentes, materiales, figura humana
  physics/     # PhysicsWorld (Rapier), joints (bisagra/corredera) y cables
  ui/          # paleta, toolbar, inspector, conexiones, HUD de medidas
  main.ts      # punto de entrada y ensamblado
```

## Assets de terceros y licencias

El esqueleto humano de referencia (`public/models/overview-skeleton.glb`) es una
conversión del modelo **Open3DModel** de O. Paul Gobée y col. (Dept. de Anatomía,
LUMC; vía caskanatomy.info / AnatomyTOOL), bajo **Creative Commons
Attribution-ShareAlike (CC BY-SA)**. La app muestra el crédito al activar el
esqueleto. Detalles en [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md).
La cláusula ShareAlike aplica al modelo y sus derivados (la malla), no al resto
del código de EXERSUITE3D.

## Convención de unidades

`1 unidad de mundo de Three.js = 1 cm`. La rejilla usa celdas de 10 cm con
divisiones mayores cada metro. Todas las dimensiones del inspector se editan y
muestran en centímetros.

## Librería de componentes

Agrupada por categoría: **estructural** (pilares, bases, soportes, montante de
rack, brazos/correas de seguridad, barras de dominadas y fondos, landmine),
**movimiento** (guías, rieles, fulcros, pivotes, pop-pin, carro de cable),
**transmisión** (poleas, roldanas, engranajes, cables, cadenas, listones de
Kevlar, resortes, leva de resistencia variable), **peso** (bloques, discos,
contrapesos, barra olímpica, pila de pesos, cuerno de carga, micro-disco) y
**ergonómico** (agarraderas, asientos, respaldos, D-handle, cuerda de tríceps,
barra de jalón, correa de tobillo). Cada componente lleva un material PBR y
atributos físicos editables (masa en kg, anclaje).

El diseño de los componentes, mecanismos, paletas de color y cinemática se
documenta en [`docs/REFERENCIAS.md`](docs/REFERENCIAS.md), una síntesis de
referencias de REP, Rogue, Titan, Hammer Strength, Cybex y Obelix.

## Hoja de ruta

- [x] **Fase 1 — Base del editor**: viewport 3D, cámara orbital, grid en cm,
      selección, gizmos mover/rotar/escalar, librería de componentes, inspector
      con medidas exactas, HUD de medidas.
- [~] **Fase 2 — Física**: integración de Rapier ✔ (cuerpos rígidos, gravedad,
      masas, colisiones, Play/Stop con restauración del diseño). Articulaciones ✔
      — bisagra (revolute) y corredera (prismatic) con eje, pivote, límites de
      recorrido y motor de velocidad. Cables y poleas ✔ — cable inextensible que
      pasa por poleas (puntos de paso) y acopla sus dos extremos por conservación
      de longitud (p. ej. agarradera ↔ pila de pesos). Pendiente: poleas móviles
      (ratio 2:1), motores de posición, leva de resistencia variable.
- [~] **Fase 3 — Modelado/ensamblaje**: snapping de ensamblaje ✔ (encaje
      magnético en puntos de anclaje: centro/eje, extremos de cilindros, centros
      de cara). Estilo visual ilustrativo ✔ (fondo claro de estudio, iluminación
      suave, figura azul, sombras tenues). Agrupación multicomponente ✔
      (subensamblajes: multiselección con Shift, mover/eliminar el grupo junto,
      desagrupar). Modelado ✔ — voltear (espejo) y deformación libre: doblar
      (bend), torcer (twist) y biselar/redondear aristas (cajas).
      Personaje posable ✔ (maniquí con rig de 12
      articulaciones rotables, apoyado en el suelo). Posturas estándar **editables
      y ampliables** ✔ (biblioteca persistente: aplicar, actualizar, guardar
      nuevas, eliminar, restaurar por defecto).
- [x] **Figura humana de referencia**: maniquí procedural **o** esqueleto
      anatómico detallado (glTF/Draco), a escala con altura editable en cm, para
      diseñar máquinas en torno al cuerpo.
- [x] **Guardar/cargar proyecto**: serializa toda la escena (piezas, joints,
      cables, grupos y personaje con su pose) a un archivo `.json` y la reconstruye.
      Además, **autoguardado** en el navegador (localStorage): los cambios se
      vuelcan de forma diferida y se restauran al reabrir la app.
- [~] **Fase 4 — Interoperabilidad**: exportar el prototipo a glTF binario ✔
      (`.glb`, con materiales) e importar modelos externos ✔ (`.glb`/`.gltf` con
      Draco u `.obj`): la malla se fusiona en una sola pieza, se aplica una
      heurística metros→cm y el objeto importado se centra y apoya en el suelo
      (no es paramétrico y no se reserializa al guardar el proyecto). Pendiente:
      preservar la jerarquía multicomponente al importar.
- [~] **Fase 5 — Empaquetado**: configuración lista para ambos destinos. Android
      con **Capacitor** (`capacitor.config.ts` + proyecto nativo en `android/`,
      scripts `android:sync/open/apk`) y Windows con **Tauri** (`src-tauri/` con
      `tauri.conf.json` y crate Rust, scripts `tauri:dev/build`). La compilación
      final del APK/`.exe` se hace en un host con Android SDK / toolchain de
      Windows; ver «Empaquetado» arriba.
