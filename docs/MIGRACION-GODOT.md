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
| `main/Main.tscn` + `main/main.gd` | Escena principal: entorno, suelo fijo, UI (Abrir proyecto / Demo / Simular / vistas) y demo integrada | `main.ts` (modo Simulador) |

**Estado**: el kit es un **simulador/visor funcional** de tus proyectos (el
equivalente al "modo Simulador" de la web) más la base geométrica y física
para construir encima el editor completo. La sección 7 lista la paridad y el
orden recomendado para portar lo que falta.

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

## 4. Tus modelos 3D (.glb) de la biblioteca

Godot importa `.glb` de forma nativa (mejor que la web: sin decodificador).

1. Crea `godot/models/` y copia ahí tus `.glb` con el **id del componente**
   como nombre: `models/polea.glb`, `models/asiento.glb`… (los mismos ids de
   `public/models/components/manifest.json` de la web).
2. En `piece.gd`, dentro de `create()`, añade justo después de construir
   `p.mesh_instance` este bloque para usar el modelo si existe:

```gdscript
var model_path := "res://models/%s.glb" % p.component_id
if ResourceLoader.exists(model_path):
    var scene: PackedScene = load(model_path)
    var inst := scene.instantiate()
    p.mesh_instance.queue_free()
    p.mesh_instance = MeshInstance3D.new()  # contenedor de medida
    p.add_child(inst)
    # Escala del modelo al tamaño del componente (la web "hornea" a cm;
    # aquí escala el AABB del glb al AABB de la primitiva):
    var target: Vector3 = GeometryFactory.build_mesh(p.params).get_aabb().size
    var src: AABB = _scene_aabb(inst)
    if src.size.length() > 0.001:
        var k: float = target.length() / src.size.length()
        inst.scale = Vector3.ONE * k
        inst.position = -src.get_center() * k
```

   (añade el helper `_scene_aabb` que recorre los `MeshInstance3D` del glb y
   une sus AABB; 10 líneas).

3. Los modelos de exportación de la web (`Exportar .glb` del prototipo) también
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
| **Editor**: seleccionar/mover/rotar/escalar piezas | ⏳ | `Editor.ts` (gizmo) | raycast + un gizmo (AssetLib tiene varios listos) |
| Paleta de piezas y añadir componentes | ⏳ | `ComponentPalette.ts` | `ItemList` de la UI + `Piece.create` con `ComponentLibrary.get_definition(id)` (ya devuelve `defaults`/`physics`) |
| Guardar `.json` (mismo formato) | ⏳ | `Editor.serialize` | recorre `world.pieces` invirtiendo `Units` (m→cm) |
| Trazado por línea con aim assist | ⏳ | `Editor.pickLinePlacePoint` | raycast al suelo + snap a nodos (los paths ya están en `params`) |
| Bending por nodos | ⏳ | `Editor.beginBendNodes` | asas = `Area3D` esferas; al arrastrar, reescribe `params.path` y `GeometryFactory.build_mesh` |
| Pinholes reales en perfiles | ⏳ | `linePieces.ts` (ExtrudeGeometry con holes) | `CSGBox3D` + bucle de `CSGCylinder3D` restados, o quedarte con la caja |
| IK de manos en agarres | ⏳ | `armIK.ts` (60 líneas, portable 1:1) | `mannequin.gd` |
| Biblioteca en bloque (ZIP), autosave, recientes | ⏳ | `componentModels.ts`, `recentStore.ts` | `FileAccess` + `user://` |

**Orden recomendado**: 1) guardar `.json` (cierra el ciclo con la web) →
2) paleta + colocar piezas → 3) gizmo de transformación → 4) trazado de línea
→ 5) bending → 6) el resto. Con 1–3 ya tienes un editor usable y **los dos
mundos comparten archivo de proyecto**, así que puedes migrar por fases sin
perder nada: diseña donde quieras, simula en Godot.

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

*Kit generado desde el estado v0.1.6 del proyecto web. Los archivos TS citados
son la fuente de verdad de cada algoritmo: todos están documentados en
español y las funciones portadas conservan nombres equivalentes.*
