# Migración de EXERSUITE3D a Godot — Guía completa

Esta guía te lleva **paso a paso, sin necesidad de más consultas**, desde cero
hasta tener EXERSUITE3D corriendo **nativo** en Godot en Windows y Android,
cargando tus proyectos `.json` actuales. El repo incluye en `godot/` un
**proyecto Godot 4 funcional** (el "kit") con el núcleo ya programado.

> **Por qué Godot**: la app web corre sobre WebGL + WASM dentro de un WebView
> (Capacitor/Tauri). Godot renderiza con Vulkan/GLES nativo y su física (Jolt)
> corre en C++ sin capa WASM: en tablets y equipos modestos el margen de
> rendimiento es mucho mayor, y el empaquetado APK/EXE es de primera clase.

---

## 1. Qué incluye el kit (`godot/`)

| Archivo | Qué hace | Origen en la web |
|---|---|---|
| `project.godot` | Proyecto Godot 4.3+ configurado (renderer **mobile**, física a 60 Hz, gravedad 9,81) | `vite.config.ts` + convenios |
| `data/components.json` | Los **47 componentes** y **20 materiales** EXACTOS de la app (generado automáticamente desde el TypeScript) | `componentLibrary.ts`, `materials.ts` |
| `core/units.gd` | Conversión **cm (web) ↔ m (Godot)**; toda posición del `.json` se convierte aquí | convenio 1 unidad = 1 cm |
| `core/component_library.gd` | Carga del JSON, definiciones por id y materiales PBR equivalentes | `componentLibrary.ts`, `materials.ts` |
| `core/geometry_factory.gd` | Primitivas + **perfiles/tubos por línea** (rectos y **doblados**: barrido de la sección por Catmull-Rom con transporte paralelo) | `geometryFactory.ts`, `linePieces.ts` |
| `core/piece.gd` | Pieza = `RigidBody3D` (congelada al diseñar, dinámica al simular), malla + colisión + material + escala | `SceneObject.ts` |
| `core/world.gd` | **Cargador de proyectos `.json`**, articulaciones nativas (bisagra/corredera con límites y motor), **cables por conservación de longitud** (ratio 2:1 emergente), **cuerdas en catenaria** (MultiMesh), **mano interactiva** (resorte crítico) | `Editor.ts`, `PhysicsWorld.ts`, `Rope.ts`, `cables.ts` |
| `core/mannequin.gd` | Maniquí posable simplificado a escala (aplica las poses guardadas en el proyecto) | `humanFigure.ts` |
| `core/orbit_camera.gd` | Cámara orbital ratón + táctil (pellizco para zoom) y presets Frontal/Lateral/Superior/Iso | `OrbitControls` + `setViewPreset` |
| `core/serializer.gd` | **Guardar `.json`** en el formato exacto de la web (interoperable en ambos sentidos) | `Editor.serialize` |
| `core/gizmo.gd` | Gizmo de traslación (flechas X/Y/Z) **+ anillos de rotación libre** por eje | `TransformControls` |
| `core/editor.gd` | Controlador del editor: selección (**multiselección con Shift/Ctrl**), **grupos**, colocación de piezas, **línea con aim assist**, **doblado por nodos**, cuerdas, bisagras/correderas, cables, duplicar/eliminar, mano interactiva | `Editor.ts` |
| `core/model_store.gd` | **Sustitución de modelos .glb** por componente y por segmento del maniquí; persiste en `user://` (equivalente nativo del IndexedDB) y carga `.glb` en caliente con `GLTFDocument` | `componentModels.ts`, `modelStore.ts` |
| `core/mannequin.gd` | Maniquí posable con los **ids de segmento de la web**, overrides de modelo por segmento e **IK de manos** (dos huesos) | `humanFigure.ts`, `armIK.ts` |
| `main/ui_theme.gd` | Tema visual con la identidad de la app (paleta "papel/tinta" de la web) | `styles.css` |
| `main/landing_ui.gd` | **Pantalla de inicio**: logo, Crear/Abrir/**Simulador**/Continuar/Biblioteca/Demo y **proyectos recientes** | `main.ts` (landing) |
| `main/library_ui.gd` | **Biblioteca de repertorio**: asignar/restablecer un `.glb` a cada componente y a cada segmento del maniquí | `LibraryPanel` web |
| `main/editor_ui.gd` | UI del Builder: barra (Inicio/Nuevo/Abrir/Guardar/Simular/vistas/zoom/Agrupar/Biblioteca), **paleta de 47 piezas**, **inspector** y línea de estado; los paneles se ocultan al simular; **modo Simulador** sin herramientas de edición | `Toolbar.ts`, `ComponentPalette.ts`, `PropertiesPanel.ts`, `JointsPanel.ts`, `SimulatorBar.ts` |
| `main/Main.tscn` + `main/main.gd` | Escena principal: landing, entorno, suelo fijo, demo integrada y **autosave cada 20 s** (`user://autosave.json`) | `main.ts` |

**Estado**: el kit es la **migración 1:1 funcional**: pantalla de inicio con
identidad visual (icono, splash y tema propios), abre y GUARDA los mismos
`.json` que la web (incluidos grupos y pose/manos del maniquí), coloca piezas
desde la paleta (47 componentes), selecciona/multiselecciona, mueve y **rota**
con gizmo, agrupa, edita dimensiones/material/física, traza perfiles y tubos
por línea con aim assist, dobla por nodos, muestra **pinholes reales** (CSG),
sustituye modelos `.glb` de biblioteca y maniquí desde la app, y simula con
física nativa, IK de manos y mano interactiva. La sección 7 detalla la paridad.

---

## 2. Instalar Godot y abrir el proyecto

1. Descarga **Godot 4.3 o superior (versión estándar, NO la .NET)** desde
   https://godotengine.org/download — es un solo ejecutable, sin instalación.
2. Ábrelo → **Importar** → navega a la carpeta `godot/` de este repo →
   selecciona `project.godot` → **Importar y editar**.
3. La primera vez Godot reimporta recursos (segundos). Pulsa **F5** (o ▶ arriba
   a la derecha) para ejecutar: verás la **demo** (pilar + brazo con bisagra +
   bloque + cadena + maniquí).
4. Prueba: botón **▶ Simular** (o Espacio) — el brazo pendulea por la bisagra,
   el bloque cae, la cadena cuelga. **Arrastra el bloque con el ratón** durante
   la simulación: es la mano interactiva.
5. **📂 Abrir proyecto** → elige cualquier `.json` guardado con la app web:
   se cargan piezas (con material y escala), articulaciones, cables, cuerdas y
   maniquí con su pose.

> **Física Jolt (recomendado)**: en Godot 4.4+ ve a
> `Proyecto → Configuración del proyecto → Física → 3D → Physics Engine` y
> elige **Jolt Physics**. Es notablemente más estable y rápida que la física
> por defecto. En 4.3, instala la extensión "Godot Jolt" desde la AssetLib.

---

## 3. Estructura y convenios (léelo antes de tocar código)

- **Unidades**: Godot trabaja en **metros**. Los `.json` de la web están en
  **centímetros**. TODO paso de datos web→Godot pasa por `Units.cm()` /
  `Units.arr_cm()`. Si añades código nuevo que lea el `.json`, usa siempre
  estas utilidades (el error clásico de migración es mezclar unidades).
- **Ejes**: three.js y Godot son ambos "Y arriba, mano derecha"; las
  posiciones y cuaterniones se copian tal cual (ya convertidos a metros). La
  única excepción es el **toro** (three: plano XY / Godot: plano XZ):
  `piece.gd` ya lo compensa rotando la malla 90° en X.
- **Piezas**: cada pieza es un `RigidBody3D` con `freeze = true` fuera de la
  simulación. Al simular, solo se descongelan las que tienen `massKg > 0` y
  `fixed == false` (mismas reglas que la web).
- **La biblioteca de datos es la misma**: `data/components.json` se genera
  desde el TS. Si cambias componentes en la web, regenera el JSON (sección 8).

---

## 4. Tus modelos 3D (.glb) de la biblioteca — YA INTEGRADO

La sustitución de modelos está **integrada en la app** (`model_store.gd` +
`library_ui.gd`), no hace falta tocar código:

1. Dentro de la app: **🧩 Biblioteca** (desde el inicio o desde la barra del
   Builder) → pestaña **Componentes** o **Maniquí** → selecciona el ítem →
   **📂 Asignar modelo .glb…** → elige el archivo. El modelo se copia a
   `user://models/` (o `user://mannequin/`) y desde ese momento TODAS las
   piezas de ese componente lo usan, ajustado y centrado al hueco de la
   primitiva (mismo criterio de "horneado" que la web). **Restablecer
   primitiva** deshace la sustitución. Los ítems con modelo se marcan con ●.
2. Alternativa "empaquetada": copia tus `.glb` en `godot/models/` con el id
   del componente como nombre (`models/polea.glb`…) y quedarán dentro del
   APK/EXE. La prioridad es: modelo del usuario (`user://`) → modelo
   empaquetado (`res://models/`) → primitiva paramétrica.
3. La colisión física siempre proviene de la primitiva (estable y barata); el
   `.glb` es visual. Al seleccionar una pieza con modelo sustituido se muestra
   la primitiva como fantasma translúcido.
4. Los modelos de exportación de la web (`Exportar .glb` del prototipo) también
   se abren directamente: arrastra el archivo dentro del editor de Godot.

---

## 5. Exportar a Windows (.exe)

1. `Editor → Gestionar plantillas de exportación → Descargar e instalar`
   (una vez por versión de Godot).
2. `Proyecto → Exportar… → Añadir… → Windows Desktop`.
3. En el preset: **Ruta de exportación** = `EXERSUITE3D.exe`;
   opcional: icono (usa `public/brand/favicon-32.png` convertido a .ico), y en
   `Binary Format → Embed PCK` activado para un único .exe autocontenido.
4. **Exportar proyecto** → obtienes el .exe nativo (Vulkan; si un equipo viejo
   no arranca, en Configuración del proyecto pon
   `rendering/renderer/rendering_method = gl_compatibility`).

## 6. Exportar a Android (.apk)

1. Instala **Android Studio** (solo por el SDK) o el "command line tools" y
   acepta licencias. Instala también un **JDK 17**.
2. En Godot: `Editor → Configuración del editor → Exportar → Android`:
   - `Java SDK Path` → carpeta del JDK 17.
   - `Android SDK Path` → carpeta del SDK.
3. `Proyecto → Instalar plantilla de compilación de Android…` (usa Gradle).
4. `Proyecto → Exportar… → Añadir… → Android`:
   - **Package → Unique Name**: `com.exersuite.app` (el mismo de Capacitor).
   - **Keystore**: para pruebas usa el debug autogenerado; para publicar crea
     uno: `keytool -genkey -v -keystore exersuite.keystore -alias exersuite
     -keyalg RSA -keysize 2048 -validity 10000`.
   - **Version → Code/Name**: sigue la serie actual (code 8, name 0.1.7…).
5. **Exportar proyecto** → `EXERSUITE3D.apk`. Godot exporta ARM64 por defecto
   (revisa `Architectures: arm64-v8a` activado).
6. Rendimiento en tablets modestas: ya está configurado el renderer
   **mobile**; si hiciera falta más, baja
   `lights_and_shadows/directional_shadow/size` a 1024 y desactiva la sombra
   del sol (`sun.shadow_enabled = false` en `main.gd`).

---

## 7. Paridad con la app web y hoja de ruta para completar el editor

Ya funciona en el kit (✔) / pendiente de portar (⏳), con el archivo TS de
referencia donde está TODA la lógica a portar:

| Función | Estado | Referencia web | Dónde encajarlo en Godot |
|---|---|---|---|
| Cargar proyectos `.json` (piezas, materiales, escala) | ✔ | `Editor.loadProjectInner` | `world.gd` |
| Bisagra/corredera con límites y motor | ✔ | `PhysicsWorld.addJoint` | `world.gd::_create_joints` |
| Cables inextensibles + poleas 2:1 emergente | ✔ | `PhysicsWorld.solveCable*` | `world.gd::_solve_cable` |
| Cuerdas (cadena/correa) en catenaria | ✔ | `Rope.ts` | `world.gd::_update_ropes` |
| Perfiles/tubos por línea, rectos y doblados | ✔ | `linePieces.ts` | `geometry_factory.gd` |
| Maniquí a escala con pose | ✔ (simplificado) | `humanFigure.ts` | `mannequin.gd` |
| Mano interactiva (resorte) | ✔ | `PhysicsWorld.applyDrag` | `world.gd::_physics_process` |
| Cámara orbital + táctil + vistas | ✔ | `OrbitControls`/`setViewPreset` | `orbit_camera.gd` |
| Suelo fijo + entorno | ✔ | `SceneManager.ts` | `main.gd` |
| **Editor**: seleccionar y mover con gizmo 3 ejes | ✔ | `Editor.ts` | `editor.gd` + `gizmo.gd` |
| Paleta de piezas y añadir componentes | ✔ | `ComponentPalette.ts` | `editor_ui.gd` (paleta) + `world.add_component` |
| Guardar `.json` (mismo formato) | ✔ | `Editor.serialize` | `serializer.gd` (incluye grupos y pose/manos del maniquí) |
| Trazado por línea con aim assist | ✔ | `Editor.pickLinePlacePoint` | `editor.gd::_pick_line_point` (imán en píxeles de pantalla) |
| Bending por nodos | ✔ | `Editor.beginBendNodes` | `editor.gd` (asas capa 4, arrastre en plano de cámara) |
| Crear cuerdas / bisagras / correderas / cables | ✔ | `Editor.ts` | `editor.gd` (modos) + `world.add_*` |
| Gizmo de rotación libre continua (anillos) | ✔ | `TransformControls` | `gizmo.gd` (anillos torus por eje) + `editor.gd::_ring_angle` |
| Grupos (subensamblajes) + multiselección | ✔ | `Editor.ts` (groups) | `editor.gd` (Shift/Ctrl+clic, Agrupar/Desagrupar, arrastre en bloque) |
| Pinholes reales en perfiles | ✔ | `linePieces.ts` (ExtrudeGeometry con holes) | `piece.gd::_beam_with_pinholes` (CSGBox3D − CSGCylinder3D) |
| IK de manos en agarres | ✔ | `armIK.ts` | `mannequin.gd::solve_hand_ik` + `world.gd::_update_hands` |
| Sustitución de modelos .glb (biblioteca + maniquí) | ✔ | `componentModels.ts`, `modelStore.ts` | `model_store.gd` + `library_ui.gd` (`user://`) |
| Autosave + proyectos recientes | ✔ | `recentStore.ts` | `main.gd` (Timer 20 s) + `landing_ui.gd` (`user://recents`) |
| Pantalla de inicio Builder/Simulador | ✔ | `main.ts` (landing) | `landing_ui.gd` + `main.gd` |
| Identidad visual (icono, splash, tema) | ✔ | `public/brand`, `styles.css` | `project.godot` + `ui_theme.gd` |
| Escala libre continua con gizmo | ⏳ | `TransformControls` | edita dimensiones en el inspector (equivalente funcional) |

**El ciclo completo ya está cerrado**: puedes diseñar en Godot, guardar, abrir
en la web (y al revés) — los dos mundos comparten archivo de proyecto, así que
la migración puede ser gradual sin perder ningún diseño.

---

## 8. Regenerar `data/components.json` si cambias la biblioteca web

```bash
# Desde la raíz del repo:
npx tsc src/objects/componentLibrary.ts src/objects/types.ts src/objects/materials.ts \
  --outDir /tmp/exersuite-dump --module esnext --target es2022 \
  --moduleResolution bundler --skipLibCheck
cd /tmp/exersuite-dump && ln -sf "$OLDPWD/node_modules" node_modules
node --input-type=module -e "
const { COMPONENT_LIBRARY, PRIMITIVE_DEFS, CATEGORY_LABELS } = await import('./componentLibrary.js');
const { MATERIAL_PRESETS } = await import('./materials.js');
const out = { categories: CATEGORY_LABELS,
  materials: MATERIAL_PRESETS.map(p => ({id:p.id,label:p.label,color:p.color,metalness:p.metalness,roughness:p.roughness})),
  components: [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY] };
(await import('fs')).writeFileSync('$OLDPWD/godot/data/components.json', JSON.stringify(out, null, 1));
console.log('OK', out.components.length, 'componentes');
"
```

## 9. Problemas típicos y su solución

- **"Parse error" al abrir un script**: comprueba que usas Godot **4.3+**
  (el kit usa `static var` y sintaxis 4.x; Godot 3 no sirve).
- **Las piezas atraviesan el suelo**: la escena la construye `main.gd`; si
  creas otra escena principal, recuerda añadir un suelo con `StaticBody3D`.
- **Un proyecto carga "gigante" o "diminuto"**: alguna ruta de datos no pasó
  por `Units` (cm→m). Busca el número: 100× de diferencia = son cm.
- **La bisagra gira raro**: el eje de `HingeJoint3D` es el **Z local del nodo
  joint** (ya lo orienta `_frame_with_z`); si añades joints a mano, orienta el
  nodo, no los cuerpos.
- **APK lento**: activa Jolt (sección 2), baja la sombra a 1024 o desactívala,
  y mantén el renderer `mobile`.
- **Pantallas con notch**: `Proyecto → Configuración → Display → Window →
  Handheld → Orientation` ya está en `sensor_landscape`; para respetar el
  notch activa `display/window/handheld/use_safe_area` en tu versión si está
  disponible o consulta `DisplayServer.get_display_safe_area()`.

---

*Kit generado desde el estado v0.1.6 del proyecto web y completado como
migración 1:1 (identidad visual, editor completo, biblioteca sustituible,
maniquí con IK, autosave/recientes). Los archivos TS citados son la fuente de
verdad de cada algoritmo: todos están documentados en español y las funciones
portadas conservan nombres equivalentes.*
