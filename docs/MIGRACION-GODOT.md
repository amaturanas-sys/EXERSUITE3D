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

## 7. Paridad con la app web y hoja de ruta

**Lee esto antes de ponerte**: el kit estuvo congelado en la web **v0.1.9** y la
app va por **v0.3.74**. Lo que sigue es el estado REAL medido con el motor
(Godot 4.4.1 headless, `tests/`), no una lista de intenciones.

### Ya funciona (✔)

| Función | Referencia web | Dónde está en Godot |
|---|---|---|
| Cargar y GUARDAR los `.json` de la web (piezas, materiales, escala, grupos, maniquí) | `Editor.loadProjectInner`, `Editor.serialize` | `world.gd`, `serializer.gd` |
| **Catálogo completo: 104 componentes y 20 materiales** | `componentLibrary.ts`, `materials.ts` | `data/components.json` (generado; ver §8) |
| **Paleta con las 38 piezas que se ofrecen** y burbuja de pesos en las que se venden por peso | `ComponentPalette.ts` | `component_library.gd::palette_components`, `editor_ui.gd` |
| **Las 54 piezas con malla propia** (26 `.glb` + 28 `.obj`) | `public/models/components` | `models/` + `model_store.gd` |
| **Herramienta de chapa** (elegir pieza → caras → burbuja → grosor), incluso sobre mallas de biblioteca | `chapa.ts`, `Editor.beginChapa` | `chapa.gd`, `editor.gd`, carril derecho de `editor_ui.gd` |
| **Huecos pasantes**: ventanas rectangulares y canales de guía, con paredes | `perforar.ts` | `perforar.gd` |
| Bisagra/corredera con límites y motor · cables con poleas · cuerdas en catenaria | `PhysicsWorld.ts`, `cables.ts`, `Rope.ts` | `world.gd` |
| Perfiles/tubos por línea, rectos y doblados · doblado por nodos | `linePieces.ts` | `geometry_factory.gd`, `editor.gd` |
| Pinholes reales en perfiles (CSG horneado) | `linePieces.ts` | `piece.gd::_beam_with_pinholes` |
| Gizmo mover/rotar · multiselección · grupos · duplicar/eliminar | `Editor.ts`, `TransformControls` | `editor.gd`, `gizmo.gd` |
| Maniquí a escala con pose e IK de manos · mano interactiva | `humanFigure.ts`, `armIK.ts` | `mannequin.gd`, `world.gd` |
| Sustituir modelos `.glb` por componente y por segmento | `componentModels.ts`, `modelStore.ts` | `model_store.gd`, `library_ui.gd` |
| Cámara orbital + táctil + vistas · autosave · recientes · landing | `OrbitControls`, `main.ts` | `orbit_camera.gd`, `main.gd`, `landing_ui.gd` |

### Lo que falta, por orden de lo que más se nota (⏳)

Cada línea dice DÓNDE está la lógica en la web y DÓNDE encajaría aquí. Son
piezas independientes: se pueden ir haciendo de una en una.

1. **Dos tipos de pieza paramétrica**: `dentada` (placa con ganchos) y
   `horquilla` (punto de anclaje). Web: `placaDentada.ts`, `horquilla.ts` →
   Godot: `geometry_factory.gd::_build_base`, un caso por tipo.
2. **Largo a medida** (`params.largoCm`): estirar la malla POR EL CENTRO sin
   deformar los remates. Web: `estirar.ts` → `geometry_factory.gd`, antes de
   la chapa en `build_mesh`.
3. **Espejado** (`params.espejo`): voltear la malla por ejes locales. Web:
   `espejar.ts` → mismo sitio.
4. **Moleteado** de barras y tubos (`params.moleteado`). Web: `linePieces.ts`
   (torno a mano con normales duras) → `geometry_factory.gd::_build_tube`.
5. **Dos materiales en una malla** (rótulo pintado de los discos, bandas del
   moleteado). Web: `modelLoading.ts::separarRotulo/separarBandas` →
   `piece.gd`, con dos `surface_override_material`.
6. **Herramientas de colocación que faltan**: roldana interna, placa dentada,
   freno de cable, pasador y pivote indexados, calce por pinholes. Web:
   `Editor.ts` (modos) → `editor.gd` (modos nuevos + `world.gd`).
7. **Recorridos en HORAS del reloj** para bisagras y pasadores. Web:
   `reloj.ts`, `recorridoReloj.ts` → panel de conexiones de `editor_ui.gd`.
8. **Interfaz en inglés**. Web: `i18n.ts` + `traducciones.ts` (cero cadenas
   sin traducir) → haría falta un `i18n.gd` y pasar los literales por él.
9. **Instructivo, prototipo sobre foto, mercado y hub**: son pantallas
   enteras de la web (`Instructivo.ts`, `PrototipoFoto.ts`, `marketplace/`)
   y no tienen equivalente aquí.

### Cómo comprobar que no rompes nada

```bash
godot --headless --path godot --import                    # registra clases
for f in $(find godot -name '*.gd' | sed 's|^godot/||'); do \
  godot --headless --path godot --check-only -s "res://$f"; done
godot --headless --path godot -s res://tests/smoke.gd     # física real
godot --headless --path godot -s res://tests/catalogo.gd  # catálogo y mallas
godot --headless --path godot -s res://tests/chapa.gd     # chapa, número a número
godot --headless --path godot -s res://tests/perforar.gd  # huecos pasantes
```

Las cuatro pruebas corren en el CI (`.github/workflows/godot.yml`) en cada
push que toque `godot/`, y además se suben capturas de la interfaz.

### Una trampa entre motores que conviene saber antes de tocar geometría

**three.js tiene por frente el giro ANTIHORARIO y Godot el HORARIO.** El
producto vectorial que en la web apunta hacia fuera, aquí apunta hacia DENTRO.
Todo `chapa.gd` pasa por `_cruz()` por esa razón: con la fórmula de la web, la
cara de arriba de un cubo salía mirando hacia abajo y la chapa dejaba la pieza
hueca y cerrada en vez de abrirla.

---

## 8. Regenerar `data/components.json` si cambias la biblioteca web

El catálogo de Godot NO se escribe a mano: sale del TypeScript de la app, así
que los componentes y los materiales son exactamente los mismos. Cada vez que
toques `componentLibrary.ts` o `materials.ts`, vuelve a generarlo:

```bash
# Desde la raíz del repo:
DUMP=/tmp/exersuite-dump && rm -rf $DUMP
npx tsc src/objects/componentLibrary.ts src/objects/types.ts src/objects/materials.ts \
  --outDir $DUMP --module esnext --target es2022 \
  --moduleResolution bundler --skipLibCheck

# `tsc` emite los imports relativos SIN extensión y Node los rechaza: se les
# añade `.js` antes de importar nada (esto faltaba y la receta no funcionaba).
python3 - <<'EOF'
import re, pathlib, os
D = pathlib.Path(os.environ.get("DUMP", "/tmp/exersuite-dump"))
for f in D.rglob("*.js"):
    s = f.read_text()
    s2 = re.sub(r'(from\s+")(\.[^"]*?)(")',
                lambda m: m.group(1) + m.group(2) + ("" if m.group(2).endswith(".js") else ".js") + m.group(3), s)
    if s2 != s: f.write_text(s2)
EOF

cd $DUMP && ln -sf "$OLDPWD/node_modules" node_modules
node --input-type=module -e "
const { COMPONENT_LIBRARY, PRIMITIVE_DEFS, CATEGORY_LABELS } = await import('./objects/componentLibrary.js');
const { MATERIAL_PRESETS } = await import('./objects/materials.js');
const out = { categories: CATEGORY_LABELS,
  materials: MATERIAL_PRESETS.map(p => ({id:p.id,label:p.label,color:p.color,metalness:p.metalness,roughness:p.roughness})),
  components: [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY] };
(await import('fs')).writeFileSync('$OLDPWD/godot/data/components.json', JSON.stringify(out, null, 1));
console.log('OK', out.components.length, 'componentes,', out.materials.length, 'materiales');
"
```

Y si añades o cambias mallas de biblioteca, cópialas también al proyecto Godot
(es la misma carpeta y el mismo manifiesto que usa la web):

```bash
cp public/models/components/* godot/models/
```

`tests/catalogo.gd` comprueba justo esto: que el catálogo, los materiales, la
paleta, las variantes y las mallas son los de la web y que todas cargan.

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
