# EXERSUITE3D — Kit de migración a Godot 4

Proyecto Godot nativo con el núcleo de EXERSUITE3D: **abre los mismos
proyectos `.json` de la app web** y los simula con física nativa (Jolt),
incluyendo articulaciones, cables con poleas, cuerdas en catenaria, maniquí y
mano interactiva.

## Arranque rápido

1. Instala **Godot 4.3+ estándar** (https://godotengine.org/download).
2. Importar → selecciona `godot/project.godot` → Importar y editar.
3. **F5** para ejecutar: carga la demo. **▶ Simular** (o Espacio) arranca la
   física; arrastra las piezas móviles con el ratón (mano interactiva).
4. **📂 Abrir proyecto** → cualquier `.json` guardado con la app web.

## Guía completa

Lee **`../docs/MIGRACION-GODOT.md`**: instalación, estructura, cómo usar tus
modelos `.glb`, exportar a Windows/Android paso a paso, tabla de paridad con
la app web y hoja de ruta para completar el editor.

## Mapa de archivos

- `data/components.json` — los 104 componentes y 20 materiales exactos de la web
- `models/` — las 54 mallas de biblioteca (`.glb` y `.obj`) y su manifiesto
- `core/chapa.gd` — herramienta de chapa: de macizo a plancha doblada
- `core/perforar.gd` — huecos pasantes (ventanas y canales de guía)
- `core/units.gd` — cm (web) ↔ m (Godot)
- `core/component_library.gd` — biblioteca y materiales PBR
- `core/geometry_factory.gd` — primitivas + perfiles/tubos (rectos y doblados)
- `core/piece.gd` — pieza física (RigidBody3D)
- `core/world.gd` — cargador de proyectos, joints, cables, cuerdas, mano
- `core/mannequin.gd` — maniquí a escala con pose
- `core/orbit_camera.gd` — cámara orbital ratón/táctil + vistas
- `main/` — escena principal, entorno, UI y demo
- `tests/` — pruebas headless: humo, catálogo, chapa y perforado

## Antes de tocar nada

`../docs/MIGRACION-GODOT.md` §7 dice **qué está portado y qué no**, medido con
el motor y no a ojo, con la lógica de referencia de cada cosa que falta. §8
explica cómo regenerar el catálogo cuando cambies la biblioteca de la web.
