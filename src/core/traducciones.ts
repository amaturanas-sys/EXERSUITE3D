/**
 * Diccionario ES → EN de la interfaz (v0.2.1). Las claves son las cadenas
 * en español tal cual aparecen en el código; el helper el() del DOM las
 * traduce automáticamente cuando el idioma es inglés. Lo que no tenga
 * entrada se muestra en español (degradación elegante).
 */
export const TRADUCCIONES: Record<string, string> = {
  // ---- Landing / Home
  "Diseño y simulación 3D de máquinas de gimnasio":
    "3D design and simulation of gym machines",
  "🛠 BUILDER": "🛠 BUILDER",
  "▶ SIMULADOR": "▶ SIMULATOR",
  "📖 INSTRUCTIVO": "📖 GUIDE",
  "⚙ SETTINGS": "⚙ SETTINGS",
  "✦  Crear nuevo proyecto": "✦  Create new project",
  "📂  Abrir archivo…": "📂  Open file…",
  "🧩  Explorar biblioteca": "🧩  Browse library",
  "↻  Continuar sesión anterior": "↻  Resume previous session",
  "📂  Simular archivo…": "📂  Simulate a file…",
  "🖼  Capturas": "🖼  Screenshots",
  "↻  Sesión anterior": "↻  Previous session",
  "← Volver": "← Back",
  "Capturas del Simulador": "Simulator screenshots",
  "Cargando…": "Loading…",
  "Aún no hay capturas. En el Simulador, usa el botón 📷 Captura.":
    "No screenshots yet. In the Simulator, use the 📷 Capture button.",
  Descargar: "Download",
  Borrar: "Delete",
  "Calidad gráfica": "Graphics quality",
  "Resolución de render": "Render resolution",
  Sombras: "Shadows",
  "Sombras suaves": "Soft shadows",
  "Reflejos de entorno": "Environment reflections",
  "Antialias (suavizado)": "Antialiasing",
  "Sombreado simple (sin PBR)": "Simple shading (no PBR)",
  "Resolución dinámica": "Dynamic resolution",
  "Mínima (×0.5)": "Minimum (×0.5)",
  "Muy baja (×0.75)": "Very low (×0.75)",
  "Baja (×1)": "Low (×1)",
  "Media (×1.25)": "Medium (×1.25)",
  "Alta (×1.5)": "High (×1.5)",
  "Máxima (×2)": "Maximum (×2)",
  Bajo: "Low",
  Medio: "Medium",
  Alto: "High",
  "Los ajustes se guardan en este dispositivo y se aplican al abrir un proyecto.":
    "Settings are stored on this device and applied when opening a project.",
  "Proyectos recientes": "Recent projects",
  "Aún no hay proyectos. Crea uno nuevo o abre un archivo.":
    "No projects yet. Create a new one or open a file.",
  Dedicatoria: "Dedication",
  "Idioma / Language": "Idioma / Language",

  // Leyendas del maestro-detalle
  "Builder: el taller completo — construye máquinas desde piezas, edita con precisión y guarda tus proyectos.":
    "Builder: the full workshop — build machines from parts, edit with precision and save your projects.",
  "Simulador: abre un proyecto solo para correr su física e interactuar con él, sin herramientas de edición.":
    "Simulator: open a project just to run its physics and interact with it, with no editing tools.",
  "Instructivo: recorrido por las herramientas, los modelos, las funciones y los tipos de archivo.":
    "Guide: a tour of the tools, models, features and file types.",
  "Ajustes: calidad gráfica y rendimiento; se aplican al abrir un proyecto.":
    "Settings: graphics quality and performance; applied when a project opens.",

  // ---- Asistente de Nuevo proyecto
  "🆕 Nuevo proyecto": "🆕 New project",
  Sencillo: "Simple",
  Profesional: "Professional",
  "Herramientas básicas y máquinas estándar: ideal para plantear la distribución de una sala de gimnasio.":
    "Basic tools and standard machines: ideal for planning a gym floor layout.",
  "Todas las herramientas de diseño, física, conexiones y cables para prototipar máquinas al detalle.":
    "Every design, physics, joint and cable tool to prototype machines in detail.",
  "Canvas libre": "Free canvas",
  "Canvas completo": "Full canvas",
  "Suelo infinito sin límites: diseña sin restricciones de espacio.":
    "Infinite floor with no bounds: design without space constraints.",
  "Área de suelo con medidas reales, techo con altura y pendiente propias y paredes de anclaje opcionales. Lo que sobresalga del espacio se marca en rojo.":
    "Floor area with real measurements, a ceiling with its own height and slope, and optional anchor walls. Anything outside the space is flagged in red.",
  "← Atrás": "← Back",
  "Crear proyecto": "Create project",
  "Superficie o suelo": "Surface / floor",
  Rectángulo: "Rectangle",
  "✏️ Dibujar planta": "✏️ Draw floor plan",
  "Ancho del suelo · X (m)": "Floor width · X (m)",
  "Fondo del suelo · Z (m)": "Floor depth · Z (m)",
  "Toca para añadir vértices (imán a 0,5 m); cierra tocando el punto amarillo.":
    "Tap to add vertices (0.5 m snap); close by tapping the yellow point.",
  "↶ Deshacer punto": "↶ Undo point",
  "◼ Cerrar planta": "◼ Close plan",
  "✕ Limpiar": "✕ Clear",
  "Techumbre (capa oscura anclable, copia fiel del suelo)":
    "Ceiling (dark anchorable layer, faithful copy of the floor)",
  "Height A · altura extremo A (m)": "Height A · end A height (m)",
  "Height B · altura extremo B (m)": "Height B · end B height (m)",
  Pendiente: "Slope",
  "a lo ancho (eje X)": "across the width (X axis)",
  "a lo fondo (eje Z)": "across the depth (Z axis)",
  "Paredes (superficies de anclaje)": "Walls (anchor surfaces)",
  "Norte (+Z)": "North (+Z)",
  "Sur (−Z)": "South (−Z)",
  "Este (+X)": "East (+X)",
  "Oeste (−X)": "West (−X)",

  // ---- Barra y menús
  "⌂ Home": "⌂ Home",
  "▶ Simular": "▶ Simulate",
  Archivo: "File",
  Edición: "Edit",
  Selección: "Select",
  Ver: "View",
  Ejes: "Axes",
  Figura: "Figure",
  "Nuevo proyecto…": "New project…",
  "Guardar proyecto (.json)…": "Save project (.json)…",
  "Cargar proyecto…": "Load project…",
  "Importar modelo 3D…": "Import 3D model…",
  "Exportar prototipo (.glb)": "Export prototype (.glb)",
  "Rendimiento…": "Performance…",
  "↺ Deshacer (Ctrl+Z)": "↺ Undo (Ctrl+Z)",
  "↻ Rehacer (Ctrl+Y)": "↻ Redo (Ctrl+Y)",
  "Copiar (Ctrl+C)": "Copy (Ctrl+C)",
  "Pegar (Ctrl+V)": "Paste (Ctrl+V)",
  "Duplicar (Ctrl+D)": "Duplicate (Ctrl+D)",
  "Eliminar (Supr)": "Delete (Del)",
  Agrupar: "Group",
  Desagrupar: "Ungroup",
  Gizmo: "Gizmo",
  "Mover (W)": "Move (W)",
  "Rotar (E)": "Rotate (E)",
  "Escalar (S)": "Scale (S)",
  "Selección de área": "Area select",
  "Arrastrar piezas": "Drag parts",
  "Espacio: Local": "Space: Local",
  "Espacio: Global": "Space: Global",
  "Imán (encaje magnético)": "Snap (magnetic)",
  "Grid del suelo": "Floor grid",
  "Aristas de las piezas": "Part edges",
  "Modo de color": "Color mode",
  "Materiales reales": "Real materials",
  "Por categoría funcional": "By functional category",
  "Neutro (arcilla)": "Neutral (clay)",
  Perspectiva: "Perspective",
  Frontal: "Front",
  Lateral: "Side",
  Superior: "Top",
  Isométrica: "Isometric",
  "Todo el trazado se circunscribe al eje": "All drawing is constrained to the axis",
  "Bloquear eje X (tecla 1)": "Lock X axis (key 1)",
  "Bloquear eje Y (tecla 2)": "Lock Y axis (key 2)",
  "Bloquear eje Z (tecla 3)": "Lock Z axis (key 3)",
  "Liberar (0 / Esc)": "Release (0 / Esc)",
  "Autoguardado activo": "Autosave on",

  // ---- Paleta
  "Piezas disponibles": "Available parts",
  "Modo sencillo · piezas básicas": "Simple mode · basic parts",
  "Máquinas estándar": "Standard machines",
  "Rack de sentadillas": "Squat rack",
  "Jaula de potencia": "Power cage",
  "Banco plano": "Flat bench",
  Primitivas: "Primitives",
  Estructural: "Structural",
  Movimiento: "Motion",
  Peso: "Weight",
  Ergonomico: "Ergonomic",
  Transmision: "Transmission",

  // Componentes
  "Pilar estructural": "Structural post",
  "Pilar / travesaño (línea)": "Post / crossbar (line)",
  "Tubo de acero (línea)": "Steel tube (line)",
  "Base de soporte": "Support base",
  "Base de apoyo": "Foot base",
  "Soporte de peso": "Weight support",
  "Gancho J / soporte barra": "J-hook / bar support",
  "Montante de rack": "Rack upright",
  "Brazo de seguridad": "Safety arm",
  "Correa de seguridad": "Safety strap",
  "Barra de dominadas": "Pull-up bar",
  "Barra de fondos": "Dip bar",
  Landmine: "Landmine",
  Guia: "Guide rod",
  Riel: "Rail",
  Fulcro: "Fulcrum",
  Pivote: "Pivot",
  "Pasador (pop-pin)": "Pop-pin",
  "Carro de cable": "Cable trolley",
  "Brazo ajustable": "Adjustable arm",
  Polea: "Pulley",
  Roldana: "Sheave",
  "Bloque de poleas": "Pulley block",
  Engranaje: "Gear",
  Cable: "Cable",
  "Cadena de eslabones": "Link chain",
  "Cadena de seguridad": "Safety chain",
  "Listón de Kevlar": "Kevlar strap",
  Resorte: "Spring",
  "Leva (cam)": "Cam",
  "Bloque de peso": "Weight block",
  Moleteado: "Knurling",
  "Desde (%)": "From (%)",
  "Hasta (%)": "To (%)",
  "Disco de peso": "Weight plate",
  "Disco 10 lb": "10 lb plate",
  "Disco 5 lb": "5 lb plate",
  "Disco 25 lb": "25 lb plate",
  "Disco 35 lb": "35 lb plate",
  "Disco 45 lb": "45 lb plate",
  Contrapeso: "Counterweight",
  "Barra olímpica": "Olympic barbell",
  "Pila de pesos": "Weight stack",
  "Cuerno de carga": "Loading horn",
  "Micro-disco": "Micro plate",
  Agarradera: "Handle",
  Asiento: "Seat",
  Respaldo: "Backrest",
  "Agarradera en D": "D-handle",
  "Cuerda de tríceps": "Triceps rope",
  "Barra de jalón": "Lat pulldown bar",
  "Correa de tobillo": "Ankle strap",
  Caja: "Box",
  Cilindro: "Cylinder",
  Esfera: "Sphere",

  // ---- Paneles
  Propiedades: "Properties",
  Conexiones: "Connections",
  Posturas: "Poses",
  Nombre: "Name",
  Material: "Material",
  Dimensiones: "Dimensions",
  "Ancho X": "Width X",
  "Alto Y": "Height Y",
  "Fondo Z": "Depth Z",
  "Posicion (cm)": "Position (cm)",
  "Rotacion (grados)": "Rotation (degrees)",
  "Masa (kg)": "Mass (kg)",
  "Anclado (fijo)": "Anchored (fixed)",
  "Voltear (espejo)": "Flip (mirror)",
  "Selecciona un objeto para editar sus propiedades, o anade un componente desde la paleta.":
    "Select an object to edit its properties, or add a component from the palette.",
  "Articula piezas (bisagra/corredera) o traza un cable por poleas.":
    "Join parts (hinge/slider) or route a cable through pulleys.",
  "+ Bisagra": "+ Hinge",
  "Instalar una bisagra REAL (dos placas y su pasador) entre dos piezas":
    "Install a REAL hinge (two leaves and its pin) between two parts",
  "+ Corredera": "+ Slider",
  "+ Cable": "+ Cable",
  "Finalizar cable": "Finish cable",
  Postura: "Pose",
  Aplicar: "Apply",
  Actualizar: "Update",
  "Guardar como…": "Save as…",
  Eliminar: "Delete",
  "Restaurar def.": "Restore defaults",
  "✋ Agarrar maniquí": "✋ Grab mannequin",
  "Simetría L↔R": "L↔R symmetry",
  "🔒 Bloquear": "🔒 Lock",
  "🔓 Liberar": "🔓 Unlock",
  "Manos (IK)": "Hands (IK)",
  "Apoyar mano": "Rest hand",
  "Soltar manos": "Release hands",
  Articulación: "Joint",

  // ---- Simulador
  "⌂ Inicio": "⌂ Home",
  "📷 Captura": "📷 Capture",
  "🖐 Arrastra una pieza móvil para moverla con la mano · arrastra el maniquí para situarlo":
    "🖐 Drag a movable part to move it by hand · drag the mannequin to place it",

  // ---- Diálogos
  "Cambios sin guardar": "Unsaved changes",
  "Guardar y salir": "Save and exit",
  "Salir sin guardar": "Exit without saving",
  Cancelar: "Cancel",
  "Nuevo pilar / travesaño": "New post / crossbar",
  "Nuevo tubo de acero": "New steel tube",
  Colocar: "Place",
  "Perfil de acero": "Steel profile",
  "Tubo de acero": "Steel tube",
  "Medida nominal (mm)": "Nominal size (mm)",
  "Diámetro nominal (mm)": "Nominal diameter (mm)",
  "Corte plano": "Flat cut",
  "Corte diagonal (inglete 45°)": "Diagonal cut (45° miter)",
  "Agujeros (pinholes)": "Pinholes",
  "Dist. agujeros (cm)": "Hole spacing (cm)",

  // ---- Biblioteca
  "Biblioteca de modelos": "Model library",
  "← Volver a Home": "← Back to Home",
  Componentes: "Components",
  Maniquí: "Mannequin",
  "Exportar ZIP": "Export ZIP",
  "Importar ZIP": "Import ZIP",
  "Segmentos del maniquí": "Mannequin segments",
  "Forma por defecto": "Default shape",
  "Sustituir por modelo…": "Replace with model…",
  "Cambiar modelo…": "Change model…",
  Restablecer: "Reset",
  "Revisa cada pieza por separado y sustitúyela por un modelo 3D (.glb, .gltf u .obj). Se guarda en este navegador. En “Maniquí” puedes reemplazar cada segmento del cuerpo por uno más estético.":
    "Review each part separately and replace it with a 3D model (.glb, .gltf or .obj). It is stored in this browser. Under “Mannequin” you can replace each body segment with a nicer one.",
  Cerrar: "Close",

  // ---- Instructivo
  "📖 Instructivo de uso": "📖 User guide",
  "Primeros pasos": "First steps",
  "En el inicio elige Builder (diseñar) o Simulador (solo correr la física de un proyecto).":
    "On the home screen choose Builder (design) or Simulator (just run a project's physics).",
  "Crea un proyecto nuevo, abre un archivo .json o continúa una sesión reciente.":
    "Create a new project, open a .json file or resume a recent session.",
  "Al crear un proyecto el asistente pregunta el modo (Sencillo: piezas básicas · Profesional: todas las herramientas) y el espacio: canvas Libre (suelo infinito) o Completo, donde defines el suelo como rectángulo o DIBUJANDO su planta en metros (vértice a vértice, ideal para salas en L).":
    "When you create a project, the wizard asks for the mode (Simple: basic parts · Professional: every tool) and the workspace: Free canvas (infinite floor) or Full canvas, where you define the floor as a rectangle or by DRAWING its plan in meters (vertex by vertex, ideal for L-shaped rooms).",
  "En el canvas Completo la techumbre es una capa oscura copia fiel del suelo con sus alturas A/B y pendiente; las paredes N/S/E/O siguen el contorno y sirven de anclaje. Lo que sobresale del espacio se marca en rojo y su colocación se cancela.":
    "In the Full canvas the ceiling is a dark layer, a faithful copy of the floor with its A/B heights and slope; the N/S/E/W walls follow the outline and serve as anchors. Anything outside the space is flagged in red and its placement is cancelled.",
  "La escena se autoguarda en el dispositivo cada pocos segundos mientras trabajas.":
    "The scene autosaves on the device every few seconds while you work.",
  Construir: "Building",
  "Toca una pieza de la paleta para añadirla, o ARRÁSTRALA al visor para colocarla donde la sueltes (en táctil: mantén pulsado ~medio segundo y arrastra).":
    "Tap a part in the palette to add it, or DRAG it into the viewport to place it where you drop it (touch: press and hold ~half a second, then drag).",
  "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano y torre de polea con medidas comerciales, listas como grupo para plantear la sala.":
    "Standard machines (top of the palette): squat rack, power cage, flat bench and cable tower with commercial dimensions, ready as a group to plan the room.",
  "Los paneles se pliegan tocando su título (⯆/⯈), para despejar el visor en pantallas pequeñas.":
    "Panels collapse by tapping their title (⯆/⯈), clearing the viewport on small screens.",
  "Pilar/travesaño (línea) y Tubo (línea): dos toques —origen y destino— con imán a extremos y puntos medios de otras piezas.":
    "Post/crossbar (line) and Tube (line): two taps — origin and destination — snapping to ends and midpoints of other parts.",
  "Chapa (🪣, barra de la derecha): convierte una pieza maciza en una plancha de acero con su misma forma. Elige la pieza, toca las caras que sobran —se puede orbitar sin perderlas— y confirma el grosor en la burbuja: un cubo sin la cara de arriba es una cubeta.":
    "Sheet metal (🪣, right-hand bar): turns a solid part into a steel sheet of the same shape. Pick the part, tap the faces to remove —you can orbit without losing them— and confirm the thickness in the bubble: a cube without its top face is a tray.",
  "Doblar (nodos): con una pieza de línea seleccionada, edita su trayectoria arrastrando los nodos como en las curvas de Photoshop.":
    "Bend (nodes): with a line part selected, edit its path by dragging nodes, like Photoshop curves.",
  "Cuerdas (cadena/correa): toca los dos extremos; quedan colgando con su catenaria.":
    "Ropes (chain/strap): tap both ends; they hang with their catenary.",
  "Editar con precisión": "Precision editing",
  "La barra agrupa las herramientas en menús: Archivo, Edición, Selección, Ver y Ejes.":
    "The toolbar groups tools into menus: File, Edit, Select, View and Axes.",
  "Toca para seleccionar; Ctrl+clic (o Shift) añade a la selección; Área (menú Selección) dibuja un recuadro que selecciona todo lo que abarca.":
    "Tap to select; Ctrl+click (or Shift) adds to the selection; Area (Select menu) draws a box that selects everything it covers.",
  "Mover/Rotar/Escalar cambian el gizmo y Arrastrar lleva las piezas con el dedo (menú Selección).":
    "Move/Rotate/Scale switch the gizmo and Drag carries parts with your finger (Select menu).",
  "Teclas 1/2/3 (o el menú Ejes): bloquean TODO el trazado a un eje; 0 o Esc lo libera. La línea inferior muestra el desplazamiento en cm.":
    "Keys 1/2/3 (or the Axes menu): lock ALL drawing to one axis; 0 or Esc releases it. The bottom line shows the displacement in cm.",
  "Copiar/Pegar/Duplicar/Eliminar y Agrupar/Desagrupar viven en el menú Edición (Ctrl+C/V/D y Supr).":
    "Copy/Paste/Duplicate/Delete and Group/Ungroup live in the Edit menu (Ctrl+C/V/D and Del).",
  "↺/↻ o Ctrl+Z/Ctrl+Y deshacen y rehacen (hasta 60 pasos).":
    "↺/↻ or Ctrl+Z/Ctrl+Y undo and redo (up to 60 steps).",
  "Menú Ver: grid, aristas de las piezas, modo de color (materiales reales · por categoría · neutro) y perspectivas Frontal/Lateral/Superior/Isométrica.":
    "View menu: grid, part edges, color mode (real materials · by category · neutral) and Front/Side/Top/Isometric perspectives.",
  "Física y conexiones": "Physics and connections",
  "En Propiedades: material, masa (kg) y Anclado (las piezas ancladas o sin masa no caen).":
    "In Properties: material, mass (kg) and Anchored (anchored or massless parts do not fall).",
  "+ Bisagra y + Corredera articulan dos piezas (toca una y luego la otra).":
    "+ Hinge and + Slider join two parts (tap one, then the other).",
  "+ Cable traza un cable inextensible por poleas: toca los puntos de paso y Finalizar cable. Las poleas dan ventaja mecánica real (2:1…).":
    "+ Cable routes an inextensible cable through pulleys: tap the waypoints and Finish cable. Pulleys give real mechanical advantage (2:1…).",
  "Figura muestra el maniquí a escala; ajusta su altura en cm.":
    "Figure shows the mannequin to scale; adjust its height in cm.",
  "Posa sus articulaciones arrastrando los ejes, guarda posturas y usa Apoyar mano para fijar las manos a un agarre (IK).":
    "Pose its joints by dragging the axes, save poses and use Rest hand to pin hands to a grip (IK).",
  "✋ Agarrar maniquí (en Posturas): arrastra directamente un segmento del cuerpo; con 1/2/3 el movimiento se restringe a un eje.":
    "✋ Grab mannequin (in Poses): drag a body segment directly; 1/2/3 restricts the movement to one axis.",
  "🔒 Candado: bloquea articulaciones para que no se muevan al posar (representa técnica y ejercicio con precisión); Simetría L↔R replica cada cambio espejado en el otro lado.":
    "🔒 Lock: freeze joints so they don't move while posing (represent technique and exercise precisely); L↔R symmetry mirrors every change to the other side.",
  Simular: "Simulating",
  "▶ Simular (o Espacio) corre la física; los paneles se ocultan para máximo rendimiento.":
    "▶ Simulate (or Space) runs the physics; panels hide for maximum performance.",
  "Con la simulación corriendo, ARRASTRA las piezas móviles con el dedo: es la mano interactiva, como una persona usando la máquina.":
    "With the simulation running, DRAG movable parts with your finger: the interactive hand, like a person using the machine.",
  "Al detener, todo vuelve exactamente a su posición de diseño.":
    "When you stop, everything returns exactly to its design position.",
  "Biblioteca de modelos_instr": "Model library",
  "Sustituye cualquier componente o segmento del maniquí por tu propio modelo 3D (.glb/.gltf/.obj/.stl).":
    "Replace any component or mannequin segment with your own 3D model (.glb/.gltf/.obj/.stl).",
  "Exportar ZIP descarga toda tu colección; Importar ZIP la restaura o fusiona en otro dispositivo.":
    "Export ZIP downloads your whole collection; Import ZIP restores or merges it on another device.",
  "Tipos de archivo": "File types",
  "Proyecto .json: tu diseño completo (piezas, física, cables, maniquí); interoperable entre la app web, Windows y la versión Godot.":
    ".json project: your complete design (parts, physics, cables, mannequin); interoperable across the web app, Windows and the Godot version.",
  "Modelo .glb/.gltf/.obj/.stl: modelos 3D para sustituir componentes o segmentos del maniquí en la Biblioteca (los STL de CAD en milímetros se convierten solos a cm).":
    ".glb/.gltf/.obj/.stl model: 3D models to replace components or mannequin segments in the Library (CAD STLs in millimeters convert to cm automatically).",
  "Biblioteca .zip: tu colección completa de modelos, exportable e importable entre dispositivos.":
    ".zip library: your full model collection, exportable and importable between devices.",
  "Captura .png: fotografías del visor tomadas en el Simulador (galería en la Home).":
    ".png screenshot: viewport photos taken in the Simulator (gallery on the Home screen).",
  "Guardar y rendimiento": "Saving and performance",
  "Guardar descarga el proyecto .json (interoperable con la versión de escritorio y Godot); Exportar genera un .glb del prototipo.":
    "Save downloads the .json project (interoperable with the desktop and Godot versions); Export generates a .glb of the prototype.",
  "En Rendimiento elige preset Alto/Medio/Bajo, resolución de render y resolución dinámica según tu dispositivo.":
    "In Performance choose the High/Medium/Low preset, render resolution and dynamic resolution to match your device.",
  // ---- Roldanas y cadenas (diagramas Cables/Poleas y Cadenas)
  "Roldana: configuración": "Sheave: configuration",
  "Después, toca la cara de la pieza donde colocarla.":
    "Then tap the face of the part where it should go.",
  "Roldana externa": "External sheave",
  "Roldana interna": "Internal sheave",
  "Montada fuera de la cara de la pieza: el cable pasa por fuera.":
    "Mounted outside the part's face: the cable runs on the outside.",
  "Embutida dentro del pilar/travesaño: la rueda asoma por la apertura y el cable se reenvía por dentro.":
    "Embedded inside the post/crossbar: the wheel shows through the opening and the cable is routed inside.",
  "Cuerdas (cadena/correa): toca los dos anclajes (cualquier cara de una pieza, pared o techumbre) y define la CAÍDA en cm — la catenaria con la que cuelga.":
    "Ropes (chain/strap): tap the two anchors (any face of a part, wall or ceiling) and set the SAG in cm — the catenary it hangs with.",
  "Roldana (paleta): elige configuración interna (embutida en el pilar, la rueda asoma por la apertura) o externa (fuera de la cara) y tócala sobre la pieza — así defines ANTES los puntos de deslizamiento del cable.":
    "Sheave (palette): choose internal (embedded in the post, the wheel shows through the opening) or external (outside the face) and tap it onto the part — defining the cable's sliding points FIRST.",
  "+ Cable traza un cable inextensible punto a punto: ancla A → roldanas de paso → ancla B (Finalizar cable). Las poleas dan ventaja mecánica real (2:1…).":
    "+ Cable routes an inextensible cable point to point: anchor A → passing sheaves → anchor B (Finish cable). Pulleys give real mechanical advantage (2:1…).",
  "Terminal de cable": "Cable terminal",
  "Ojal terminal: punto de anclaje de cable colocable sobre cualquier cara de una pieza.":
    "Terminal eyelet: a cable anchor point placeable on any face of a part.",
  "🔒 Lock switch: bloqueada": "🔒 Lock switch: locked",
  "🔓 Lock switch: libre": "🔓 Lock switch: free",
  "Bloqueada: la articulación queda RÍGIDA en su pose actual (la máquina cambia de configuración con un clic)":
    "Locked: the joint becomes RIGID in its current pose (the machine changes configuration in one click)",
  "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.":
    "Cable terminal (palette): place anchor eyelets on any face; a cable in ERROR turns red if it crosses solid material or meets a sheave misaligned.",
  "Lock switch en cada bisagra/corredera (Conexiones): bloqueada queda rígida en su pose — transforma una máquina de empuje horizontal en vertical con un clic.":
    "Lock switch on every hinge/slider (Connections): locked it becomes rigid in its pose — turning a horizontal-push machine into a vertical one with one click.",
  "Nuestra historia": "Our story",
  "Rack con torre (TTP)": "Rack with tower (TTP)",
  "Árbol de discos": "Plate tree",
  "Rack doméstico 120×215×179 cm (despiece TTP001L): perfil 40×40, torre de dominadas multi-agarre, ganchos J a 127, porta-discos laterales y placa estabilizadora.":
    "Home rack 120×215×179 cm (TTP001L breakdown): 40×40 profile, multi-grip pull-up tower, J-hooks at 127, side plate storage and stabilizer plate.",
  "Poste porta-discos con 6 cuernos a 3 alturas y base en cruz.":
    "Plate storage post with 6 horns at 3 heights and a cross base.",
  "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano, torre de polea, rack con torre TTP (construido con las piezas REALES del despiece: montantes con agujeros de calce, ganchos J de pin+giro, rieles porta-discos, multi-agarre y patines) y árbol de discos — con medidas comerciales, listas como grupo para plantear la sala.":
    "Standard machines (top of the palette): squat rack, power cage, flat bench, cable tower, TTP tower rack (built from the REAL breakdown parts: uprights with keying holes, pin+twist J-hooks, plate storage rails, multi-grip and floor skids) and plate tree — with commercial dimensions, ready as a group to plan the room.",
  "Pilar vertical TTP (5×7×204)": "TTP vertical post (5×7×204)",
  "Riel porta-discos TTP": "TTP plate storage rail",
  "Multi-agarre dominadas TTP": "TTP multi-grip pull-up",
  "Travesaño TTP (104)": "TTP crossmember (104)",
  "Montante real del rack TTP001L con agujeros de calce (el gancho J entra con pin y giro).":
    "Real TTP001L rack upright with keying holes (the J-hook seats with pin and twist).",
  "Riel lateral de almacenamiento de discos del TTP001L, con manguitos y cuernos.":
    "TTP001L side plate-storage rail, with sleeves and horns.",
  "Estación de dominadas multi-agarre real del TTP001L (92×32 cm).":
    "Real TTP001L multi-grip pull-up station (92×32 cm).",
  "Patín/pie de suelo real del TTP001L (104 cm) que estabiliza cada marco.":
    "Real TTP001L floor skid (104 cm) stabilizing each frame.",
  "Brazo de seguridad TTP": "TTP safety arm",
  "Brazo de seguridad perforado real del TTP001L (86 cm), calza entre montantes.":
    "Real perforated TTP001L safety arm (86 cm), keys in between uprights.",
  "Columna horizontal inferior TTP": "TTP lower horizontal column",
  "Columna horizontal inferior real del TTP001L (141 cm), con placas de encuadre: la base de cada lado del marco.":
    "Real TTP001L lower horizontal column (141 cm), with gusset plates: the base of each side of the frame.",
  "Remo de polea alta TTP": "TTP high-pulley row bar",
  "Remo tubular real del TTP001L para la polea alta (jalón/remo), cuelga del cable.":
    "Real tubular TTP001L row bar for the high pulley (pulldown/row), hangs from the cable.",
  "Rack abierto 142×204×120 cm: montantes reales con agujeros de calce, ganchos J que abrazan el pilar y rieles de base con placas de encuadre.":
    "Open rack 142×204×120 cm: real uprights with keying holes, J-hooks that wrap the upright and base rails with gusset plates.",
  "Power cage 120×204×120 cm con montantes de calce, dominadas y pipes de seguridad.":
    "Power cage 120×204×120 cm with keyed uprights, pull-up bar and safety pipes.",
  "TTP001L pieza a pieza: 4 pilares, columnas inferiores y superiores, travesaños, 2 tubos de guía, 2 brazos de seguridad, 4 jotas, set de roldanas, remo de polea alta y pullups multigrip.":
    "TTP001L piece by piece: 4 posts, lower and upper columns, crossmembers, 2 guide tubes, 2 safety arms, 4 J-cups, pulley set, high-pulley row bar and multigrip pull-ups.",
  "Columna horizontal superior TTP": "TTP upper horizontal column",
  "Columna horizontal superior real del TTP001L (94 cm): corona los pilares de cada lado, con placas de encuadre.":
    "Real TTP001L upper horizontal column (94 cm): crowns the posts on each side, with gusset plates.",
  "Tubo guía de poleas TTP": "TTP pulley guide tube",
  "Tubo de guía vertical real del TTP001L (4×4×214): por él corre el carro del sistema de poleas.":
    "Real vertical TTP001L guide tube (4×4×214): the pulley-system carriage rides along it.",
  "Travesaño real del TTP001L (104 cm) que cruza el marco a lo ancho: superior (corona trasera) e inferior (al suelo).":
    "Real TTP001L crossmember (104 cm) spanning the frame widthwise: upper (rear crown) and lower (at the floor).",
  "Travesaño frontal TTP (118)": "TTP front crossmember (118)",
  "Travesaño frontal real del TTP001L (118 cm) que corona el marco a lo ancho.":
    "Real TTP001L front crossmember (118 cm) crowning the frame widthwise.",
  "Soporte de polea baja TTP": "TTP low pulley bracket",
  "Puente real que sostiene la polea baja del TTP001L.":
    "Real bridge that holds the TTP001L low pulley.",
  "Placa de polea baja TTP": "TTP low pulley plate",
  "Placa base real del soporte de polea baja del TTP001L (19×26).":
    "Real base plate of the TTP001L low pulley bracket (19×26).",
  "Bastidor superior TTP": "TTP top frame tray",
  "Bastidor superior real del TTP001L (106×32): bandeja del techo del sistema de poleas.":
    "Real TTP001L top frame (106×32): roof tray of the pulley system.",
  "Pletina TTP (45)": "TTP flat bar (45)",
  "Pletina de unión real del kit TTP001L (45 cm).": "Real joining flat bar of the TTP001L kit (45 cm).",
  "Manguito de guía TTP (54)": "TTP guide sleeve (54)",
  "Manguito real del carro del TTP001L: se desliza por el tubo de guía del sistema de poleas.":
    "Real TTP001L carriage sleeve: slides along the pulley-system guide tube.",
  "Media columna POWERRACK (110)": "POWERRACK half column (110)",
  "Tramo real de columna perforada del POWERRACK (7×7×110): dos apilados forman cada poste de 220.":
    "Real perforated POWERRACK column section (7×7×110): two stacked form each 220 post.",
  "Travesaño lateral POWERRACK (106)": "POWERRACK side crossmember (106)",
  "Travesaño lateral superior real del POWERRACK (106 cm, perforado).":
    "Real POWERRACK upper side crossmember (106 cm, perforated).",
  "Larguero POWERRACK (106)": "POWERRACK side rail (106)",
  "Larguero lateral real del POWERRACK (106 cm) que une los postes por la base.":
    "Real POWERRACK side rail (106 cm) joining the posts at the base.",
  "Listón POWERRACK (106)": "POWERRACK flat rail (106)",
  "Listón plano real del POWERRACK (106 cm).": "Real flat POWERRACK rail (106 cm).",
  "Barra pullups (106)": "Pull-up bar (106)",
  "Barra superior real del POWERRACK (70 cm): frontal y trasera, para dominadas.":
    "Real POWERRACK top bar (70 cm): front and rear, for pull-ups.",
  "Jota POWERRACK": "POWERRACK J-cup",
  "Jota de seguridad real del POWERRACK: calza en los agujeros de la columna.":
    "Real POWERRACK safety J-cup: keys into the column holes.",
  "Jota con rodillo": "Roller J-cup",
  "Jota con rodillo real del POWERRACK, para recibir la barra con suavidad.":
    "Real POWERRACK roller J-cup, receives the bar smoothly.",
  "Riel de base POWERRACK (118)": "POWERRACK base rail (118)",
  "Riel de base real del POWERRACK (118 cm) que arriostra los postes al suelo.":
    "Real POWERRACK base rail (118 cm) bracing the posts to the floor.",
  "POWERRACK pieza a pieza (118×220×122): postes de dos tramos perforados, doble barra de pullups, jotas de calce con y sin rodillo, pipes de seguridad y rieles de base.":
    "POWERRACK piece by piece (118×220×122): two-section perforated posts, double pull-up bar, keyed J-cups with and without roller, safety pipes and base rails.",
  "Portadiscos de polea TTP": "TTP pulley weight carrier",
  "Sostenedor de discos real del TTP001L: el cable del sistema de poleas lo eleva con los discos cargados en su pin.":
    "Real TTP001L weight carrier: the pulley-system cable lifts it with the plates loaded on its pin.",
  "Puente del carro TTP": "TTP carriage bridge",
  "Puente real del carro de poleas del TTP001L: une las dos poleas del carro.":
    "Real TTP001L pulley-carriage bridge: joins the carriage's two pulleys.",
  "Máquinas": "Machines",
  "Exportar OBJ": "Export OBJ",
  "Exportar STL": "Export STL",
  "Descargar el ensamblaje como OBJ": "Download the assembly as OBJ",
  "Descargar el ensamblaje como STL": "Download the assembly as STL",
  "No se pudo exportar la máquina.": "The machine could not be exported.",
  "Pestaña Máquinas: cada máquina estándar del modo Sencillo se puede EXPORTAR como STL u OBJ (el ensamblaje completo), editar fuera y SUSTITUIR por tu versión corregida — al insertarla usará tu modelo.":
    "Machines tab: every Simple-mode standard machine can be EXPORTED as STL or OBJ (the full assembly), edited elsewhere and REPLACED with your corrected version — inserting it will use your model.",
  "Exportar ZIP descarga toda tu colección (incluidas las máquinas sustituidas); Importar ZIP la restaura o fusiona en otro dispositivo.":
    "Export ZIP downloads your whole collection (replaced machines included); Import ZIP restores or merges it on another device.",
  "Exportar prefab de la selección (.json)…": "Export selection as prefab (.json)…",
  "Insertar prefab (.json)…": "Insert prefab (.json)…",
  "Prefab .prefab.json (Archivo → Exportar prefab de la selección): una máquina editada como archivo ESTRUCTURADO que reconoce cada parte y su función (componente, nombre, medidas, material y pose); se reinserta con Archivo → Insertar prefab.":
    "Prefab .prefab.json (File → Export selection as prefab): an edited machine as a STRUCTURED file that recognizes every part and its function (component, name, measurements, material and pose); reinsert it with File → Insert prefab.",
  "Arrastre preciso": "Precise drag",
  "Flechas del teclado · C cambia el eje de ▲▼ · Shift: pasos de 10 cm":
    "Keyboard arrows · C switches the ▲▼ axis · Shift: 10 cm steps",
  "Cambiar el eje de ▲▼ (tecla C)": "Switch the ▲▼ axis (key C)",
  "Arriba (flecha ↑)": "Up (↑ arrow)",
  "Abajo (flecha ↓)": "Down (↓ arrow)",
  "Izquierda (flecha ←)": "Left (← arrow)",
  "Derecha (flecha →)": "Right (→ arrow)",
  "¿Cómo empiezo un proyecto?": "How do I start a project?",
  "¿Qué diferencia al modo Sencillo del Profesional?": "What sets Simple mode apart from Professional?",
  "El modo Sencillo acota las herramientas a lo esencial: máquinas estándar completas, primitivas y unas pocas piezas básicas — ideal para plantear la distribución de una sala sin distracciones.":
    "Simple mode narrows the tools down to the essentials: complete standard machines, primitives and a few basic parts — ideal for planning a room layout without distractions.",
  "El modo Profesional muestra la paleta completa (despieces reales, roldanas, terminales), las conexiones (bisagras, correderas, cables) y el bloqueo de ejes.":
    "Professional mode shows the full palette (real breakdowns, sheaves, terminals), the joints (hinges, sliders, cables) and axis locking.",
  "El modo se elige al crear el proyecto y queda guardado con él.":
    "The mode is chosen when creating the project and is saved with it.",
  "¿Cómo funciona el canvas Completo (planta, techo y paredes)?": "How does the Full canvas work (floor plan, ceiling and walls)?",
  "¿Cómo construyo una máquina?": "How do I build a machine?",
  "¿Cómo edito con precisión?": "How do I edit precisely?",
  "ARRASTRE PRECISO (menú Selección): abre una ventana con cursores en pantalla (◀ ▶ mueven a los lados; ▲ ▼ suben/bajan o, con el switch de ejes, adelante/atrás). También sirven las flechas del teclado, la tecla C cambia el eje y Shift da pasos de 10 cm.":
    "PRECISE DRAG (Select menu): opens a window with on-screen cursors (◀ ▶ move sideways; ▲ ▼ go up/down or, with the axis switch, forward/back). Keyboard arrows also work, key C switches the axis and Shift gives 10 cm steps.",
  "Menú Ver: grid, aristas de las piezas, modo de color (materiales reales · por categoría · neutro) y perspectivas Frontal/Lateral/Superior/Isométrica. Los botones +/− junto al visor ajustan el zoom.":
    "View menu: grid, part edges, color mode (real materials · by category · neutral) and Front/Side/Top/Isometric perspectives. The +/− buttons next to the viewport adjust the zoom.",
  "¿Cómo funcionan la física y las conexiones (cables y poleas)?": "How do physics and connections work (cables and pulleys)?",
  "¿Cómo uso el maniquí?": "How do I use the mannequin?",
  "¿Cómo simulo la máquina?": "How do I simulate the machine?",
  "¿Qué es la Biblioteca de modelos y cómo sustituyo piezas o máquinas?": "What is the model Library and how do I replace parts or machines?",
  "¿Qué tipos de archivo maneja la app?": "Which file types does the app handle?",
  "¿Cómo guardo mi trabajo y ajusto el rendimiento?": "How do I save my work and tune performance?",
  Acercar: "Zoom in",
  Alejar: "Zoom out",
  "+ Nodo": "+ Node",
  "Subdivide el tramo más largo en su punto medio": "Subdivides the longest segment at its midpoint",
  "Doblar: arrastra los nodos (curva suave); al acercar un nodo al de OTRA pieza se suelda (imán). + Nodo añade un punto a la trayectoria.":
    "Bend: drag the nodes (smooth curve); bringing a node close to ANOTHER piece's node welds them (magnet). + Node adds a point to the path.",
  "Dudas y soporte técnico: ": "Questions and technical support: ",

  // ---- Piezas de la paleta que se habian quedado sin traducir (v0.3.59)
  "Placa dentada (upright)": "Toothed plate (upright)",
  "Atril de discos": "Plate horn shelf",
  "Brazo spotter (voladizo)": "Cantilever spotter arm",
  "Barra multi-agarre (dominadas)": "Multi-grip pull-up bar",
  "Carro de doble roldana": "Double-sheave trolley",
  "Anclaje de cadena": "Chain anchor",
  "Guía tubular": "Tubular guide",
  "Pasador": "Pin",
  "Punto de anclaje": "Anchor point",
  "Pivote indexado (silla)": "Indexed pivot (saddle)",
  "Pivote indexado (soldar)": "Indexed pivot (weld-on)",
  "Pasador con manija": "Pin with handle",
  "Tope de guía": "Guide stop",
  "Safety pin": "Safety pin",
  "Kettlebell": "Kettlebell",
  "Mancuerna hexagonal": "Hex dumbbell",
  "Agarre doble (polea)": "Double cable handle",

  // ---- Las piezas que se eligen por peso: la Biblioteca las lista una a
  // una desde v0.3.75, asi que sus fichas se ven y hay que traducirlas.
  "Kettlebell de 10 kg: bola de Ø13.2 cm con la base rebajada y el peso grabado en el costado.":
    "10 kg kettlebell: Ø13.2 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 15 kg: bola de Ø15.4 cm con la base rebajada y el peso grabado en el costado.":
    "15 kg kettlebell: Ø15.4 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 20 kg: bola de Ø17.2 cm con la base rebajada y el peso grabado en el costado.":
    "20 kg kettlebell: Ø17.2 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 25 kg: bola de Ø18.7 cm con la base rebajada y el peso grabado en el costado.":
    "25 kg kettlebell: Ø18.7 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 35 kg: bola de Ø21.2 cm con la base rebajada y el peso grabado en el costado.":
    "35 kg kettlebell: Ø21.2 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 45 kg: bola de Ø23.2 cm con la base rebajada y el peso grabado en el costado.":
    "45 kg kettlebell: Ø23.2 cm ball with a flattened base and the weight cast on its side.",
  "Kettlebell de 55 kg: bola de Ø24.9 cm con la base rebajada y el peso grabado en el costado.":
    "55 kg kettlebell: Ø24.9 cm ball with a flattened base and the weight cast on its side.",
  "Mancuerna hexagonal de 10 libras (4.5 kg): cabezas de goma con el peso grabado y mango cromado.":
    "10 lb hex dumbbell: rubber heads with the weight cast in and a chromed handle.",
  "Mancuerna hexagonal de 20 libras (9.1 kg): cabezas de goma con el peso grabado y mango cromado.":
    "20 lb hex dumbbell: rubber heads with the weight cast in and a chromed handle.",
  "Mancuerna hexagonal de 30 libras (13.6 kg): cabezas de goma con el peso grabado y mango cromado.":
    "30 lb hex dumbbell: rubber heads with the weight cast in and a chromed handle.",
  "Mancuerna hexagonal de 40 libras (18.1 kg): cabezas de goma con el peso grabado y mango cromado.":
    "40 lb hex dumbbell: rubber heads with the weight cast in and a chromed handle.",
  "Mancuerna hexagonal de 50 libras (22.7 kg): cabezas de goma con el peso grabado y mango cromado.":
    "50 lb hex dumbbell: rubber heads with the weight cast in and a chromed handle.",

  // ---- Maquinas estandar
  "Prensa de piernas": "Leg press",
  "Torre polea de discos": "Plate-loaded pulley tower",
  "Torre polea de pesos": "Weight-stack pulley tower",
  "UpperMachine": "UpperMachine",

  // ---- Cromo de la paleta y del catalogo
  "Toca para plegar o desplegar la sección": "Tap to fold or unfold the section",
  "Máquinas estándar ▾": "Standard machines ▾",
  "Descargar todos los modelos en un ZIP": "Download every model as a ZIP",
  "Cargar un ZIP de modelos y fusionar": "Load a model ZIP and merge",

  // ---- Descripciones de piezas y maquinas (v0.3.60). Son el tooltip de cada
  // boton de la paleta y la ficha del catalogo de modelos.
  "Brazo que pivota, pilar de apoyo y viga de topes. El largo del pilar se CALCULA a partir del recorrido que quieres.": "Pivoting arm, support post and stop beam. The post's length is COMPUTED from the travel you want.",
  "Rack de sentadillas del diseñador: dos montantes perforados de 212 cm con arcos superiores, barra de dominadas, jotas con rodillo, anclajes de cadena y base articulada.": "The designer's squat rack: two 212 cm perforated uprights with top arches, a pull-up bar, roller J-cups, chain anchors and a hinged base.",
  "Jaula de potencia del diseñador (112×219×129): cuatro pilares TTP perforados con columnas inferiores y superiores, travesaños, barra pullups multigrip, cuatro jotas de calce y dos brazos de seguridad.": "The designer's power cage (112×219×129): four perforated TTP posts with lower and upper columns, crossbeams, a multi-grip pull-up bar, four seating J-cups and two spotter arms.",
  "Banco plano clásico del diseñador (120×41×30): colchoneta tapizada sobre espina central, pata trasera en L, pata delantera en arco y bisagras de plegado bloqueadas.": "The designer's classic flat bench (120×41×30): an upholstered pad on a central spine, an L-shaped rear leg, an arched front leg and locked folding hinges.",
  "TTP001L corregido por el diseñador: 4 pilares girados al calce, columnas inferiores y superiores, travesaños y bastidor superior, 2 tubos de guía con manguitos y portadiscos móvil, 4 jotas, set de roldanas, remo de polea alta y pullups multigrip.": "The TTP001L as corrected by the designer: 4 posts turned to seat, lower and upper columns, crossbeams and top frame, 2 guide tubes with sleeves and a travelling plate carrier, 4 J-cups, a sheave set, a high-pulley row bar and a multi-grip pull-up bar.",
  "Torre multiestación del diseñador: pila selectorizada de 15 placas sobre tubos guía, carro de doble roldana, jalón alto con barra, y brazo de pecho COMPUESTO (segmento, arco en U, mangos y agarres soldados en un cuerpo rígido) que pivota desde el bastidor superior.": "The designer's multi-station tower: a 15-plate selectorised stack on guide tubes, a double-sheave trolley, a high lat pulldown with bar, and a COMPOUND chest arm (segment, U-arch, handles and grips welded into one rigid body) pivoting from the top frame.",
  "Torre de polea del diseñador con CARRIER PORTADISCOS (carga por discos): dos tubos guía con manguitos, poleas alta/baja/de torre, carro de doble roldana, remo de polea alta y barra de jalón bajo, con sus dos cables completos.": "The designer's pulley tower with a PLATE CARRIER (plate-loaded): two guide tubes with sleeves, high/low/tower pulleys, a double-sheave trolley, a high-pulley row bar and a low pulldown bar, with both cables complete.",
  "Variante de la torre del diseñador con BLOQUE DE PESOS: la pila seleccionable abraza los tubos guía en lugar del carrier portadiscos — mismo bastidor, poleas, remo de polea alta y jalón bajo con sus dos cables.": "Variant of the designer's tower with a WEIGHT STACK: the selectable stack hugs the guide tubes instead of the plate carrier — same frame, pulleys, high-pulley row and low pulldown with both cables.",
  "LegPress del diseñador: asiento reclinado con respaldo y reposacabezas sobre bastidor fijo, placa de empuje de 95×50 colgada del brazo articulado que corre por dos guías tubulares, y cuatro cuernos de carga. Es la máquina sobre la que se afinó la ergonomía del maniquí sentado.": "The designer's leg press: a reclined seat with backrest and headrest on a fixed frame, a 95×50 push plate hung from the articulated arm that runs along two tubular guides, and four loading horns. This is the machine the seated mannequin's ergonomics were tuned on.",
  "Primitiva cubo/caja.": "Cube/box primitive.",
  "Primitiva cilindro.": "Cylinder primitive.",
  "Primitiva esfera.": "Sphere primitive.",
  "Perfil de acero trazado entre dos puntos (perfiles 1:1/1:2/1:3, extremos plano/diagonal, pinholes). Se dobla por nodos.": "Steel profile drawn between two points (1:1/1:2/1:3 profiles, flat/diagonal ends, pinholes). Bends at its nodes.",
  "Tubo de acero trazado entre dos puntos, con medidas nominales. Se dobla por nodos.": "Steel tube drawn between two points, with nominal sizes. Bends at its nodes.",
  "Base inferior que ancla la maquina al suelo.": "Bottom base that anchors the machine to the floor.",
  "Plancha de acero con ganchos recortados en el canto, atornillada al costado de un pilar: hace de fila de jotas con mucho menos material. Se coloca tocando la cara del pilar y trazando principio y final.": "Steel plate with hooks cut into its edge, bolted to the side of a post: it does the job of a row of J-cups with far less material. Place it touching the post's face and draw its start and end.",
  "Brazo/spotter de seguridad real: detiene la barra a una altura dada. Su largo se ajusta a la separación entre pilares.": "A real spotter arm: it stops the bar at a given height. Its length adapts to the gap between posts.",
  "Atril de discos: se cuelga por su lengüeta en el pinhole de cualquier viga y guarda los discos ensartados en su cuerno. El seguro de abajo impide que se salte del agujero.": "Plate horn shelf: it hangs by its tongue in any beam's pinhole and stores the plates threaded on its horn. The pin below keeps it from jumping out of the hole.",
  "Brazo de seguridad en voladizo: se calza por su espiga en el pinhole de un montante y sube o baja de nivel como una jota. El largo del brazo se cambia en Propiedades sin deformar ni el anclaje ni la pestaña distal.": "Cantilever spotter arm: it seats by its spigot in an upright's pinhole and moves up or down a level like a J-cup. The arm's length is changed in Properties without deforming either the anchor or the distal lip.",
  "Barra multi-agarre de dominadas: abanico arqueado con placas de montaje en ambos extremos y agarres neutros, prono y ancho. Su largo se ajusta a la separación entre pilares.": "Multi-grip pull-up bar: an arched fan with mounting plates at both ends and neutral, pronated and wide grips. Its length adapts to the gap between posts.",
  "Barra de pullups real del POWERRACK (106 cm) con placas de montaje en ambos extremos. Su largo se ajusta a la separación entre pilares.": "The real POWERRACK pull-up bar (106 cm) with mounting plates at both ends. Its length adapts to the gap between posts.",
  "Anclaje real del POWERRACK: su pin posterior entra en los pinholes de la columna y el cilindro perpendicular es el pivote de cadenas y brazos móviles.": "The real POWERRACK anchor: its rear pin enters the column's pinholes and the perpendicular cylinder is the pivot for chains and moving arms.",
  "Jota con rodillo real del POWERRACK: el cilindro es el pin de acople a los orificios del pilar, las placas laterales lo abrazan y la superficie posterior con tope recibe la barra.": "The real POWERRACK roller J-cup: the cylinder is the pin that couples into the post's holes, the side plates hug it, and the backing surface with its stop receives the bar.",
  "Strap de nylon de 3\" entre montantes: cuélgalo con la herramienta de línea (dos extremos).": "3\" nylon strap between uprights: hang it with the line tool (two ends).",
  "Carro de poleas real del TTP001L: puente movil que SIEMPRE conserva sus dos roldanas (sup./inf.) — transmite la fuerza entre dos tramos de cable, como en el TTP con torre.": "The real TTP001L pulley trolley: a travelling bridge that ALWAYS keeps its two sheaves (upper/lower) — it carries the force between two runs of cable, as on the TTP with tower.",
  "Polea pequena de reenvio que se coloca SOBRE una estructura: toca la pieza anfitriona, elige el punto de su eje azul y precisa tipo (interna/externa) y direccion.": "Small idler pulley placed ON a structure: touch the host piece, pick the point of its blue axis, and state the type (internal/external) and the direction.",
  "Cadena de tope/seguridad del power rack: cuélgala con la herramienta de línea (dos extremos).": "Power rack stop/safety chain: hang it with the line tool (two ends).",
  "Barra guía cromada: se tiende entre dos anclajes y por ella corre el carro. Lo que va enhebrado en ella queda circunscrito a su recta.": "Chromed guide bar: it spans two anchors and the carriage runs along it. Whatever is threaded on it is confined to its straight line.",
  "Eje cilíndrico que hace de pivote: en Propiedades se le dicen qué piezas lo anclan y cuáles giran sobre él, con el recorrido en HORAS DEL RELOJ y el freno. Perfora lo que atraviesa, como una guía.": "Cylindrical axle that acts as a pivot: in Properties you say which parts anchor it and which turn on it, with the travel in CLOCK HOURS and the brake. It bores through whatever it crosses, like a guide.",
  "Horquilla soldable que sostiene un pasador por los dos lados: el alma va contra la cara de la viga y el brazo entra entre las orejas, cuya punta redonda le deja completar el recorrido. La coloca sola la herramienta de pasador.": "Weldable clevis that holds a pin from both sides: the web sits against the beam's face and the arm enters between the lugs, whose rounded tips let it complete its travel. The pin tool places it on its own.",
  "Pivote que se clava por tramos: un disco con 7 agujeros —una hora de paso— y una silla que abraza el montante y se calza en su pinhole con la espiga y la maneta. Se sube o se baja de nivel sin herramienta.": "Pivot that locks by steps: a disc with 7 holes —one hour per step— and a saddle that hugs the upright and seats in its pinhole with the spigot and the handle. It moves up or down a level without tools.",
  "El mismo pivote de 7 tramos, con una cara plana en vez de la silla: para pegarlo donde no hay pinhole al que calzarse. El eje cae en el mismo sitio respecto de la cara de montaje.": "The same 7-step pivot with a flat face instead of the saddle: to weld it where there is no pinhole to seat in. The axis lands in the same place relative to the mounting face.",
  "El eje del pivote indexado, que además se agarra: sobresale por fuera del brazo lo bastante para que una mano lo saque, suba o baje de pinhole y lo vuelva a calzar. Lleva cabeza de tope por dentro y taladro de clip por fuera.": "The indexed pivot's axle, which doubles as a grip: it sticks out past the arm far enough for a hand to pull it, move it up or down a pinhole and seat it again. It carries a stop head inside and a clip hole outside.",
  "Espaciador de goma que se monta sobre una guía tubular y detiene ahí el carro. Su largo y su diámetro se ajustan en Propiedades.": "Rubber spacer that mounts on a tubular guide and stops the carriage there. Its length and diameter are set in Properties.",
  "Pasador cromado que ATRAVIESA un pinhole del pilar y hace de tope de seguridad o de gancho. Calza agujero a agujero; su largo, su diámetro y el sobrante a cada lado se ajustan en Propiedades.": "Chromed pin that GOES THROUGH a post's pinhole and acts as a safety stop or a hook. It seats hole by hole; its length, its diameter and the overhang on each side are set in Properties.",
  "Pesa rusa de hierro con el peso grabado en el costado. Al tocarla se elige el peso: 10, 15, 20, 25, 35, 45 o 55 kg. El asa deja de crecer al llegar a su techo ergonómico y de ahí en adelante sólo engorda la bola.": "Cast-iron kettlebell with the weight engraved on its side. Touch it to pick the weight: 10, 15, 20, 25, 35, 45 or 55 kg. The handle stops growing once it reaches its ergonomic ceiling, and from there on only the ball gets bigger.",
  "Mancuerna hexagonal de goma con el peso grabado en la cara. Al tocarla se elige el peso: 10, 20, 30, 40 o 50 libras. Cada uno es una pieza distinta —otras cotas y otra masa—, no la misma estirada.": "Rubber hex dumbbell with the weight engraved on its face. Touch it to pick the weight: 10, 20, 30, 40 or 50 pounds. Each one is a different part —other dimensions, another mass—, not the same one stretched.",
  "Disco olimpico de hierro fundido con las letras STANDARD BARBELL en relieve por las dos caras y el peso en libras y en kilos. Al tocarlo se elige el peso: 5, 10, 25, 35 o 45 libras. El agujero mide siempre 5 cm para enfilar mangas olimpicas. Los de 35 y 45 llevan la cruz de cuatro radios con sus cuarteles vaciados; los de 5, 10 y 25 son lisos y llevan el rotulo dando la vuelta a la llanta.":
    "Cast-iron Olympic plate with STANDARD BARBELL raised on both faces and the weight in pounds and kilos. Touch it to pick the weight: 5, 10, 25, 35 or 45 pounds. The bore is always 5 cm so it threads onto Olympic sleeves. The 35 and 45 carry the four-spoke cross with its hollowed quarters; the 5, 10 and 25 are plain and wear their lettering all the way round the rim.",
  "Disco de 5 libras (2.3 kg): O19.7 cm por 1.65 de canto, sin cruz, con el alma vaciada por las dos caras y STANDARD, 5 LBS y 2.3 KGS dando la vuelta a la llanta.":
    "5 pound plate (2.3 kg): Ø19.7 cm by 1.65 thick, no cross, with the web hollowed on both faces and STANDARD, 5 LBS and 2.3 KGS running round the rim.",
  "Disco de 10 libras (4.5 kg): O23.5 cm por 2.16 de canto, sin cruz, con el alma vaciada por las dos caras y STANDARD, 10 LBS y 4.5 KGS dando la vuelta a la llanta.":
    "10 pound plate (4.5 kg): Ø23.5 cm by 2.16 thick, no cross, with the web hollowed on both faces and STANDARD, 10 LBS and 4.5 KGS running round the rim.",
  "Disco de 25 libras (11.3 kg): O27.9 cm por 3.56 de canto, sin cruz, con el alma vaciada por las dos caras y STANDARD, 25 LBS y 11.3 KGS dando la vuelta a la llanta.":
    "25 pound plate (11.3 kg): Ø27.9 cm by 3.56 thick, no cross, with the web hollowed on both faces and STANDARD, 25 LBS and 11.3 KGS running round the rim.",
  "Disco de 35 libras (15.9 kg): O34.9 cm por 3.56 de canto, con la cruz de cuatro radios, BARBELL y STANDARD en la llanta y 35 LBS / 15.9 KGS en los cuarteles.":
    "35 pound plate (15.9 kg): Ø34.9 cm by 3.56 thick, with the four-spoke cross, BARBELL and STANDARD on the rim and 35 LBS / 15.9 KGS in the quarters.",
  "Disco de 45 libras (20.4 kg): O44.1 cm por 3.56 de canto, el mayor del juego, con la cruz de cuatro radios y el alma vaciada hasta dejarla en 4 mm.":
    "45 pound plate (20.4 kg): Ø44.1 cm by 3.56 thick, the largest of the set, with the four-spoke cross and the web hollowed down to 4 mm.",
  "Barra olimpica de 2.2 m y 20 kg: mangas de O5 cm para los discos, collares de tope y eje de O2.8 cm con moleteado en las zonas de agarre, marca de agarre y tramos lisos en el centro y junto a los collares.":
    "2.2 m, 20 kg Olympic barbell: Ø5 cm sleeves for the plates, collars to stop them, and a Ø2.8 cm shaft knurled where the hands go, with a grip mark and smooth runs at the centre and next to the collars.",
  "Stack selectorizado: el tubo selector arrastra las placas del pin hacia arriba. Cada placa lleva los dos orificios verticales que abrazan los tubos guía del sistema de poleas.": "Selectorised stack: the selector tube drags the plates above the pin upwards. Each plate carries the two vertical holes that hug the pulley system's guide tubes.",
  "Manguito olimpico donde se cargan los discos (plate-loaded): se ensamblan por el orificio central.": "Olympic sleeve where the plates are loaded (plate-loaded): they assemble through the centre hole.",
  "Superficie de apoyo del usuario.": "Surface the user rests on.",
  "Soporte para la espalda.": "Back support.",
  "Agarre de dos mangos para cable: oreja arriba para el mosqueton y dos punos enfrentados. Para remo neutro y jalon al pecho.": "Two-handle cable attachment: a lug on top for the carabiner and two facing grips. For neutral rows and pulldowns to the chest.",
  "Estribo en D de una mano: oreja arriba para el mosqueton, funda de goma con sus dos collares abajo. Para polea alta o baja a un brazo.": "Single-hand D handle: a lug on top for the carabiner, a rubber sleeve with its two collars below. For high or low pulley work with one arm.",
  "Cuerda de tres cabos torcidos para polea: abrazadera con oreja arriba y casquillo en cada punta. Para extensiones de triceps y face pulls.": "Three-strand twisted rope for a pulley: a clamp with a lug on top and a ferrule at each end. For triceps extensions and face pulls.",

  // ---- Ultimos rincones que quedaban en castellano (v0.3.60)
  "Peso ▾": "Weight ▾",
  "Volver a la pantalla de inicio": "Back to the home screen",
  "Altura de la figura (cm)": "Figure height (cm)",
  "Autoguardado en este navegador": "Auto-saved in this browser",
  "🔩 Soldar": "🔩 Weld",
  "Agrupa las piezas Y las suelda por donde se tocan: al simular se mueven y chocan como un solo cuerpo": "Groups the parts AND welds them where they touch: in the simulation they move and collide as one body",
  "Marketplace (maqueta): hub de usuarios, makers y marcas — recién llegadas, estrenos, economía local, vitrina digital, foro maker, encargos e incorporación de marcas.": "Marketplace (mock-up): a hub for users, makers and brands — new arrivals, releases, local economy, digital showcase, maker forum, commissions and brand onboarding.",

  // ---- EL INSTRUCTIVO ENTERO (v0.3.61). 145 bloques: las 16 preguntas
  // frecuentes y todos sus puntos. Es la mitad larga de la interfaz y la
  // ultima que quedaba en castellano con la app en ingles.
  "¿Cómo calzo ganchos J, brazos de seguridad y anclajes en los pilares?": "How do I seat J-cups, spotter arms and anchors on the posts?",
  "¿Cómo funcionan los pesos: pila selectorizada, bloques guiados y discos?": "How do the weights work: selectorised stack, guided blocks and plates?",
  "¿Cómo creo brazos móviles (jammer arms)?": "How do I create moving arms (jammer arms)?",
  "¿Cómo veo mis equipos en una FOTO de mi espacio real (prototipo)?": "How do I see my equipment in a PHOTO of my real space (prototype)?",
  "¿Qué es el Marketplace?": "What is the Marketplace?",
  "El modo Profesional muestra la paleta completa (estructura, transmisión, movimiento, peso y ergonomía, con la roldana y los terminales de cable), las conexiones (bisagras, correderas, cables) y el bloqueo de ejes. Las piezas INTERNAS de las máquinas reales ya no se listan sueltas: viven dentro de sus máquinas y prefabs.": "Professional mode shows the full palette (structure, transmission, movement, weight and ergonomics, with the sheave and the cable terminals), the connections (hinges, sliders, cables) and axis locking. The INTERNAL parts of the real machines are no longer listed on their own: they live inside their machines and prefabs.",
  "En el canvas Completo la techumbre es una CARA PLANA oscura, copia fiel del suelo, con sus alturas A/B y su pendiente.": "On the Complete canvas the roof is a dark FLAT FACE, a faithful copy of the floor, with its A/B heights and its slope.",
  "Las paredes N/S/E/O son caras que van del suelo al techo SIN dejar huecos: bajo una techumbre inclinada su borde superior sigue la pendiente (trapezoidales).": "The N/S/E/W walls are faces running from floor to roof with NO gaps: under a sloped roof their top edge follows the slope (trapezoidal).",
  "Sin techumbre también puede haber paredes: suben hasta la altura que definas en el asistente (campo Altura de las paredes).": "There can be walls without a roof too: they rise to the height you set in the wizard (Wall height field).",
  "Lo que sobresale del espacio se marca en rojo y su colocación se cancela.": "Anything sticking out of the space is marked in red and its placement is cancelled.",
  "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano, rack con torre TTP, torre polea de discos, torre polea de pesos y árbol de discos — con medidas comerciales y armadas con las piezas REALES del despiece (montantes con agujeros de calce, ganchos J de pin+giro, rieles porta-discos, multi-agarre y patines). Cada una se inserta como GRUPO, lista para plantear la sala.": "Standard machines (top of the palette): squat rack, power cage, flat bench, TTP tower rack, plate-loaded pulley tower, weight-stack pulley tower and plate tree — with commercial dimensions and assembled from the REAL parts of the exploded view (uprights with seating holes, pin-and-swivel J-cups, plate rails, multi-grip bars and shoes). Each one is inserted as a GROUP, ready to lay out the room.",
  "La paleta lista solo piezas que se usan sueltas; las internas de cada máquina real llegan con la máquina o con su prefab. El Carro de doble roldana sí está a mano (Transmisión) y nace SIEMPRE con sus dos roldanas funcionales.": "The palette lists only parts used on their own; each real machine's internal parts arrive with the machine or with its prefab. The double-sheave trolley IS at hand (Transmission) and is ALWAYS born with its two working sheaves.",
  "VENTANA IZQUIERDA: una sola ventana con el logo y cuatro barras colapsables del mismo estilo — PIEZAS DISPONIBLES, PROPIEDADES, CONEXIONES y ARRASTRE PRECISO — con su propia barra de deslizamiento. Toca el título de cada barra para plegarla o desplegarla; todo el flujo de trabajo vive en la misma ventana.": "LEFT PANEL: a single panel with the logo and four collapsible bars in the same style — AVAILABLE PARTS, PROPERTIES, CONNECTIONS and PRECISE DRAG — each with its own scrollbar. Tap a bar's title to fold or unfold it; the whole workflow lives in one panel.",
  "TOOLBOX (barra vertical del borde derecho): siete atajos con icono — selección única, selección de área, mover, rotar, escalar, orbitar y DEFORMAR POR NODOS (activa el doblado de la pieza de línea seleccionada). Con selección u orbitar el gizmo queda inactivo (nada se arrastra por accidente); con orbitar el toque solo mueve la cámara.": "TOOLBOX (the vertical bar on the right edge): seven icon shortcuts — single selection, area selection, move, rotate, scale, orbit and DEFORM BY NODES (turns on bending for the selected line part). With selection or orbit the gizmo is inactive (nothing gets dragged by accident); with orbit, a touch only moves the camera.",
  "GRUPOS Y MULTISELECCIÓN EN NÚMEROS EXACTOS: con un grupo o varias piezas seleccionadas, Propiedades muestra la posición del centro (cm), la rotación del bloque (grados) y la escala (×) — escribe el valor y el bloque completo se transforma exactamente, igual que con el gizmo.": "GROUPS AND MULTI-SELECTION IN EXACT NUMBERS: with a group or several parts selected, Properties shows the centre's position (cm), the block's rotation (degrees) and the scale (×) — type the value and the whole block transforms exactly, just as with the gizmo.",
  "Copiar/Pegar/Duplicar/Eliminar, Agrupar/Desagrupar y 🔩 Soldar viven en el menú Edición (Ctrl+C/V/D y Supr).": "Copy/Paste/Duplicate/Delete, Group/Ungroup and 🔩 Weld live in the Edit menu (Ctrl+C/V/D and Del).",
  "GRUPOS: selecciona dos o más piezas (Mayús+toque o Selección de área) y Edición → Agrupar las une en un subensamblaje. Si alguna ya pertenece a un conjunto — el de una roldana (rueda + eje) o una máquina insertada —, ese conjunto se ABSORBE entero en el grupo nuevo, sin dejar piezas fuera. Después, tocar CUALQUIER pieza del grupo selecciona el grupo completo (Mayús+toque lo añade a una multiselección), y Desagrupar lo devuelve a piezas sueltas.": "GROUPS: select two or more parts (Shift+tap or Area selection) and Edit → Group joins them into a sub-assembly. If one already belongs to an assembly — a sheave's (wheel + axle) or an inserted machine's —, that assembly is ABSORBED whole into the new group, leaving no part out. From then on, tapping ANY part of the group selects the whole group (Shift+tap adds it to a multi-selection), and Ungroup returns it to loose parts.",
  "🔩 SOLDAR es la hermana de Agrupar, y resuelve lo que Agrupar no puede: un grupo se mueve junto EN EL EDITOR, pero al simular sus piezas siguen siendo cuerpos sueltos — un brazo compuesto de cuatro tubos agrupados se cae a cachos en cuanto lo cuelgas de un extremo. Soldar agrupa IGUAL y además crea una unión rígida por cada pareja del conjunto que se toca, en el punto donde se tocan. La física reconoce esas uniones y funde el conjunto en UN SOLO CUERPO: se mueve entero, choca entero y transmite esfuerzo entero. Es la misma soldadura que planta el imán de la herramienta de nodos al soltar un nodo sobre otra pieza, pero de todas de una vez.": "🔩 WELD is Group's sister, and it solves what Group cannot: a group moves together IN THE EDITOR, but in the simulation its parts are still separate bodies — an arm made of four grouped tubes falls apart the moment you hang it by one end. Weld groups THE SAME and also creates a rigid joint for every pair in the assembly that touches, at the point where they touch. The physics recognises those joints and fuses the assembly into ONE SINGLE BODY: it moves whole, collides whole and carries load whole. It is the same weld the node tool's magnet plants when you drop a node onto another part, but for all of them at once.",
  "Las soldaduras son uniones normales: aparecen en Conexiones con el nombre «Soldadura», se pueden DESBLOQUEAR (y entonces pasan a ser bisagras que giran) o borrar una a una. Si alguna pieza del conjunto no toca a ninguna otra, se avisa con su nombre — no se inventa una soldadura en el aire. Y si una de las piezas está marcada como FIJA, el conjunto entero queda anclado al simular: el aviso te lo dice, porque para un brazo móvil suele ser justo lo contrario de lo que buscas.": "Welds are ordinary joints: they appear in Connections under the name «Weld», they can be UNLOCKED (and then become hinges that turn) or deleted one by one. If some part of the assembly touches no other, you are warned by name — no weld is invented in mid-air. And if one of the parts is marked FIXED, the whole assembly is anchored in the simulation: the warning says so, because for a moving arm that is usually the opposite of what you want.",
  "Un grupo se mueve, gira y escala como un bloque —con el gizmo o con los números exactos de Propiedades— y su MECÁNICA viaja con él: las bisagras y correderas conservan su punto y su eje al girarlo, así que la máquina sigue funcionando en la simulación.": "A group moves, turns and scales as a block —with the gizmo or with the exact numbers in Properties— and its MECHANICS travel with it: hinges and sliders keep their point and their axis when you turn it, so the machine still works in the simulation.",
  "FÍSICA DEL CONJUNTO: con un grupo seleccionado, Propiedades trae la masa y el interruptor «Fijas» de TODAS sus piezas de una vez — no hay que desagrupar la máquina para tocarlas. Importa más de lo que parece: el motor solo circunscribe a sus guías tubulares los cuerpos MÓVILES, así que un carro marcado como fijo deja de correr por sus barras. Si alguna pieza del conjunto está enhebrada en guías y quedó fija, el panel te la nombra.": "PHYSICS OF THE ASSEMBLY: with a group selected, Properties brings up the mass and the «Fixed» switch for ALL its parts at once — no need to ungroup the machine to touch them. It matters more than it looks: the engine only confines MOVING bodies to their tubular guides, so a carriage marked as fixed stops running along its bars. If any part of the assembly is threaded on guides and was left fixed, the panel names it.",
  "VOLTEAR (espejo) en Propiedades espeja la pieza HORNEANDO el volteo en su geometría: la pieza se ve reflejada pero sus ejes siguen siendo los del mundo, así que el gizmo y el arrastre preciso continúan tirando hacia donde apuntan. Los proyectos antiguos con volteos guardados como escala negativa se convierten solos al abrirlos.": "FLIP (mirror) in Properties mirrors the part by BAKING the flip into its geometry: the part looks reflected but its axes are still the world's, so the gizmo and the precise drag keep pulling where they point. Old projects with flips saved as a negative scale convert themselves when opened.",
  "+ Bisagra instala una BISAGRA REAL, y se monta sobre CARAS, no sobre piezas: toca un PUNTO de la cara de la 1ª pieza —ahí se atornilla su placa, y queda marcado con un disco azul— y luego un punto de la cara de la 2ª. Con eso está dicho todo lo que antes había que adivinar: sobre qué superficie va cada placa y en qué sitio. El EJE DEL PIVOTE sale solo —es la arista donde se encuentran los planos de las dos palas—, así que el panel del costado derecho ya solo pide el tamaño de las placas, el recorrido EN HORAS DEL RELOJ —de qué hora a qué hora, contando por la derecha, con las 12 siempre arriba— y si JUNTAR LAS PIEZAS. Se montan DOS PLACAS PLANAS y el PASADOR cilíndrico que las articula; cada placa queda SOLDADA a su pieza, así que lo que gira en la simulación es exactamente el herraje que ves. El conjunto queda agrupado como \"Bisagra\" y puedes moverlo o borrarlo como una sola cosa.": "+ Hinge installs a REAL HINGE, and it mounts on FACES, not on parts: tap a POINT on the 1st part's face —that is where its leaf is bolted, and it is marked with a blue disc— and then a point on the 2nd part's face. That says everything that used to be guesswork: which surface each leaf goes on and where. The PIVOT AXIS follows on its own —it is the edge where the two leaves' planes meet—, so the panel on the right only asks for the leaf size, the travel IN CLOCK HOURS —from which hour to which, counting clockwise, with 12 always up— and whether to BRING THE PARTS TOGETHER. TWO FLAT LEAVES and the cylindrical PIN that articulates them are mounted; each leaf is WELDED to its part, so what turns in the simulation is exactly the hardware you see. The assembly is grouped as \"Hinge\" and you can move or delete it as one thing.",
  "JUNTAR LAS PIEZAS (encendido de fábrica): la segunda pieza se arrima hasta dejar su canto a la holgura del pasador, de modo que el pivote queda ADYACENTE A LAS DOS PLACAS, como el lomo de un libro, en vez de con las palas estiradas sobre un hueco. Si marcas dos caras PARALELAS —dos tablas sobre la misma mesa— además se enrasan y la bisagra sale plana; si marcas dos caras PERPENDICULARES —la cara de arriba de una caja y el costado de su tapa—, cada placa se pega a la suya y la charnela cae justo en la esquina. La primera pieza no se mueve nunca: es la referencia.": "BRING THE PARTS TOGETHER (on by default): the second part is drawn in until its edge is at the pin's clearance, so the pivot sits ADJACENT TO BOTH LEAVES, like the spine of a book, instead of with the leaves stretched over a gap. If you mark two PARALLEL faces —two boards on the same table— they are also brought flush and the hinge comes out flat; if you mark two PERPENDICULAR faces —the top face of a box and the side of its lid—, each leaf sticks to its own and the knuckle lands right in the corner. The first part never moves: it is the reference.",
  "LA CARA DECIDE HACIA DÓNDE PLIEGA, igual que en el mundo real: montada arriba, las dos piezas topan entre sí en cuanto la bisagra intenta cerrar hacia abajo (el material lo impide); montada abajo, ese mismo conjunto flexiona. Para lograrlo, las dos piezas unidas por una bisagra real SIGUEN CHOCANDO entre sí en la simulación — el interruptor \"Las piezas chocan entre sí\" de cada unión (Conexiones) lo controla, y conviene dejarlo apagado en pivotes donde las piezas se solapan a propósito, como un brazo metido en su anclaje.": "THE FACE DECIDES WHICH WAY IT FOLDS, just as in the real world: mounted on top, the two parts hit each other as soon as the hinge tries to close downwards (the material stops it); mounted underneath, that same assembly flexes. To make that work, two parts joined by a real hinge KEEP COLLIDING with each other in the simulation — each joint's \"Parts collide with each other\" switch (Connections) controls it, and it is best left off on pivots where the parts overlap on purpose, such as an arm sitting inside its anchor.",
  "+ Corredera articula dos piezas con un deslizamiento (toca una y luego la otra).": "+ Slider articulates two parts with a sliding motion (tap one and then the other).",
  "SOLDADURAS: una unión BLOQUEADA (Lock switch) deja de ser articulación y pasa a ser una SOLDADURA — las piezas unidas se simulan como UN SOLO CUERPO rígido con la masa de todas. Es lo que hace que un brazo compuesto (brazo + extensión soldada) pivote entero en su sitio en vez de salir despedido. Sus marcadores se dibujan pequeños y grises para distinguirlos de las articulaciones libres.": "WELDS: a LOCKED joint (Lock switch) stops being an articulation and becomes a WELD — the joined parts are simulated as ONE SINGLE rigid body with the mass of them all. That is what makes a compound arm (arm + welded extension) pivot whole in place instead of flying apart. Its markers are drawn small and grey to tell them from free articulations.",
  "Roldana (paleta, en dos pasos): toca la ESTRUCTURA que la alojará (puedes orbitar para buscarla), su eje mayor aparece como línea AZUL; toca el punto del eje donde va y el panel del costado derecho pide montaje y dirección — arriba/abajo/derecha/izquierda/anterior/posterior en los ejes GLOBALES, y el modelo se sigue viendo y orbitando mientras eliges. EXTERNA: nace con su MONTAJE (placa y mejillas) que la vincula a la estructura, nada queda flotando. INTERNA: se aloja DENTRO del perfil montada en un EJE que apoya en sus dos paredes, y CALA la estructura elegida con dos agujeros iguales y pasantes en las caras que quedan sobre y bajo la rueda (⊥ a su eje de giro) — el cable entra y sale sin obstruirse y la rueda cabe entera sin chocar con la cara, como el soporte de polea alta del TTP. El conjunto (rueda + eje) queda agrupado, y si luego agrupas la máquina entera se absorbe dentro de ella.": "Sheave (palette, in two steps): tap the STRUCTURE that will host it (you can orbit to find it) and its long axis appears as a BLUE line; tap the point on that axis where it goes and the panel on the right asks for the mounting and the direction — up/down/right/left/front/back in GLOBAL axes, and the model stays visible and orbitable while you choose. EXTERNAL: it is born with its MOUNTING (plate and cheeks) that ties it to the structure, nothing is left floating. INTERNAL: it is housed INSIDE the profile on an AXLE resting on both its walls, and it BORES the chosen structure with two equal through-holes on the faces above and below the wheel (⊥ to its axis of rotation) — the cable goes in and out unobstructed and the wheel fits whole without hitting the face, like the TTP's high-pulley bracket. The assembly (wheel + axle) is grouped, and if you later group the whole machine it is absorbed into it.",
  "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable VÁLIDO se dibuja en azul oscuro (destaca sobre el fondo claro) y el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.": "Cable terminal (palette): place anchor eyelets on any face; a VALID cable is drawn in dark blue (it stands out against the light background) and a cable in ERROR is painted red if it goes through material or enters a sheave crooked.",
  "⏺ FRENO DE CABLE (Conexiones): un clic sobre el trazado engarza ahí la ESFERA de tope de las máquinas reales; otro clic sobre ella la retira. La bola viaja con el cable mientras se tira, pero NO pasa por una roldana ni por un terminal: al llegar se interpone y ese lado deja de retraerse. Es lo que mantiene la tensión en el momento cero para que el esfuerzo sea parejo en todo el recorrido — y lo que impide que un extremo liviano (una barra colgando suelta) se trague el recorrido que debería mover el contrapeso. Colócalo en el ramal por donde se te escapa la tensión, cerca de la roldana contra la que quieras que tope.": "⏺ CABLE STOP (Connections): one click on the run threads the stop BALL of the real machines onto it; another click on the ball removes it. The ball travels with the cable while it is pulled, but it does NOT pass a sheave or a terminal: when it arrives it gets in the way and that side stops retracting. It is what keeps the tension at moment zero so the effort is even along the whole travel — and what stops a light end (a bar hanging loose) from swallowing the travel the counterweight should be moving. Put it on the run where the tension is escaping, near the sheave you want it to stop against.",
  "TRAMOS OCULTOS: cuando un tramo del cable va de una roldana INTERNA a otra roldana INTERNA DE LA MISMA viga, el cable discurre por DENTRO del perfil —que en el mundo real es hueco—, así que nada de lo que haya en ese volumen lo obstruye: ni la propia viga ni el mástil que la sostiene penetrando en ella. La regla es estricta y va tramo a tramo: entre roldanas de vigas distintas, de una interna a una externa, o en el resto del recorrido, el cable se sigue validando contra el material como siempre.": "HIDDEN RUNS: when a length of cable goes from one INTERNAL sheave to another INTERNAL sheave ON THE SAME beam, the cable runs INSIDE the profile —which in the real world is hollow—, so nothing in that volume obstructs it: neither the beam itself nor the mast holding it up that penetrates it. The rule is strict and applies run by run: between sheaves on different beams, from an internal one to an external one, or anywhere else along the path, the cable is still validated against material as always.",
  "Selecciona el gancho J, la jota con rodillo, el brazo de seguridad o el anclaje de cadena y usa Calce en el poste (Propiedades): los botones ▲/▼ lo suben y bajan AGUJERO POR AGUJERO siguiendo la grilla real de pinholes del montante (paso 5 cm en el TTP, 5,5 cm en el POWERRACK).": "Select the J-cup, the roller J-cup, the spotter arm or the chain anchor and use Seat on the post (Properties): the ▲/▼ buttons raise and lower it HOLE BY HOLE following the upright's real pinhole grid (5 cm pitch on the TTP, 5.5 cm on the POWERRACK).",
  "Al calzar, la pieza se ENSAMBLA a la estructura: su manguito abraza el pilar y el pin articula con los pinholes estandarizados — los orificios pasantes por ambas caras —, nunca con agujeros accesorios, y nunca queda flotando en el aire.": "When it seats, the part is ASSEMBLED to the structure: its sleeve hugs the post and the pin articulates with the standardised pinholes — the holes that go through both faces —, never with incidental holes, and it is never left floating in mid-air.",
  "Algunas piezas se sostienen de UN pilar (ganchos J, jotas, anclajes) y otras de DOS a la vez: el brazo de seguridad se TIENDE entre los dos pilares de su lado y ▲/▼ lo sube o baja un agujero en AMBOS simultáneamente.": "Some parts are held by ONE post (J-cups, roller J-cups, anchors) and others by TWO at once: the spotter arm is SPANNED between the two posts on its side and ▲/▼ raises or lowers it one hole on BOTH at the same time.",
  "También vale para los postes TRAZADOS con la herramienta de línea: el diámetro y la distancia de sus pinholes (del diálogo de trazado) definen la grilla, y la pieza se detiene en la última fila de agujeros.": "It also works for posts DRAWN with the line tool: the diameter and the spacing of their pinholes (from the drawing dialog) define the grid, and the part stops at the last row of holes.",
  "El accesorio RECONOCE la inclinación de la cara: en una estructura doblada por nodos, cada tramo recto — vertical, diagonal u horizontal — tiene su propia grilla, la pieza se alinea con el eje del tramo y ▲/▼ avanza a lo largo de él.": "The accessory RECOGNISES the face's slope: on a structure bent at its nodes, each straight run — vertical, diagonal or horizontal — has its own grid, the part aligns with the run's axis and ▲/▼ advances along it.",
  "⏺ LARGO A MEDIDA: el BRAZO DE SEGURIDAD, la BARRA PULLUPS y la BARRA MULTI-AGARRE no se acoplan a una máquina, se tienden ENTRE DOS PILARES — y esa separación la decides tú al armar la estructura. Por eso su largo se cambia en Propiedades («Largo a medida»), y se cambia POR EL CENTRO: los remates de los dos extremos —placas de montaje, manguito, ganchos— viajan enteros hacia fuera sin deformarse, y solo se estira el tramo recto del medio. No es escalar la pieza: el perfil no cambia y el punto de calce viaja con su manguito, así que la pieza alargada sigue calzando donde debe. «De fábrica» la devuelve a su medida original.": "⏺ LENGTH TO MEASURE: the SPOTTER ARM, the PULL-UP BAR and the MULTI-GRIP BAR do not couple to a machine, they are SPANNED BETWEEN TWO POSTS — and you decide that gap when you assemble the structure. That is why their length is changed in Properties («Length to measure»), and it is changed THROUGH THE MIDDLE: the finished ends —mounting plates, sleeve, hooks— travel outwards whole without deforming, and only the straight middle run stretches. It is not scaling the part: the profile does not change and the seating point travels with its sleeve, so the lengthened part still seats where it should. «Factory» returns it to its original size.",
  "⏺ GUÍAS TUBULARES (una Smith, una prensa de piernas, un hack squat): por dentro todas son la misma máquina —dos barras cromadas tendidas entre los travesaños del bastidor y un CARRO que solo puede correr por su recta—, y eso es lo que armas con cuatro piezas. La GUÍA TUBULAR se tiende como una pieza de línea: eliges el diámetro y das dos toques, el de inicio y el de final. Queda amarrada a las dos piezas que tocaste, así que si mueves el bastidor la guía se vuelve a tender sola, con su nuevo largo — con las dos puntas amarradas, el largo lo mandan los soportes, como en la máquina de verdad. El DIÁMETRO se retoca siempre en Propiedades (radio), y el largo también si dejaste alguna punta al aire.": "⏺ TUBULAR GUIDES (a Smith machine, a leg press, a hack squat): inside, they are all the same machine —two chromed bars spanned between the frame's crossbeams and a CARRIAGE that can only run along their line—, and that is what you assemble with four parts. The TUBULAR GUIDE is spanned like a line part: pick the diameter and give two taps, start and end. It is tied to the two parts you touched, so if you move the frame the guide re-spans itself with its new length — with both ends tied, the length is set by the supports, as on the real machine. The DIAMETER is always adjusted in Properties (radius), and so is the length if you left an end free.",
  "⏺ ENHEBRAR EL CARRO: manda la GUÍA. Selecciónala, enciende «Administrar vinculación» en sus Propiedades (puedes encender varias guías a la vez) y desde ahí haz clic en las piezas que deben correr por ella y colócalas con el gizmo. Al soltarlas quedan VINCULADAS: por cada guía administrada que las atraviesa se les abre un canal REDONDO de verdad en la malla, del diámetro del tubo más la holgura de deslizamiento — como el orificio pasante del carro de una prensa real. Mientras el interruptor esté apagado, mover una pieza junto a la guía no le hace nada; con él encendido, apartarla le quita el canal. La guía tiene que venir alineada con un eje de la pieza (hasta 12° de desvío): el carro va a escuadra con sus barras, también en la máquina de verdad.": "⏺ THREADING THE CARRIAGE: the GUIDE is in charge. Select it, turn on «Manage threading» in its Properties (you can turn on several guides at once) and from there click the parts that should run along it and place them with the gizmo. When you drop them they are THREADED: for each managed guide that crosses them a genuinely ROUND channel is opened in the mesh, the tube's diameter plus the sliding clearance — like the through-hole in a real press's carriage. While the switch is off, moving a part next to the guide does nothing to it; with it on, moving it away takes the channel out. The guide has to arrive aligned with one of the part's axes (up to 12° off): the carriage sits square to its bars on the real machine too.",
  "⏺ TOPES Y SAFETY PINS: el TOPE DE GUÍA es el espaciador de goma que se monta sobre la barra — suéltalo cerca de ella y se centra en su recta, alineado. Desde ahí acota el recorrido: el carro se detiene en él en vez de llegar abajo, y puedes poner topes a los dos lados. El SAFETY PIN ATRAVIESA el pinhole de un pilar de lado a lado, perpendicular a la viga, igual que un pin de verdad: reconoce la misma grilla de agujeros que las jotas —sube y baja con ▲/▼ agujero por agujero— y se ciñe al diámetro del agujero, porque uno más gordo no entraría. En Propiedades regulas su largo y el CORRIMIENTO: cuánto sobresale por cada lado, que es lo que decide dónde apoya la carga; «Centrar» lo deja simétrico.": "⏺ STOPS AND SAFETY PINS: the GUIDE STOP is the rubber spacer that mounts on the bar — drop it near it and it centres itself on its line, aligned. From there it limits the travel: the carriage stops at it instead of reaching the bottom, and you can put stops on both sides. The SAFETY PIN GOES THROUGH a post's pinhole from side to side, perpendicular to the beam, just like a real pin: it recognises the same hole grid as the J-cups —it moves up and down with ▲/▼ hole by hole— and it is limited to the hole's diameter, because a thicker one would not go in. In Properties you set its length and the OFFSET: how much sticks out on each side, which is what decides where the load rests; «Centre» leaves it symmetrical.",
  "⏺ CÓMO SE MUEVE LO ENHEBRADO: exactamente igual que la pila de pesos sobre sus tubos. El carro queda circunscrito a la RECTA de sus guías —no a la vertical—, así que en una prensa inclinada baja y avanza en profundidad a la vez, sin deriva lateral y sin volcar, y sus guías no rozan con él. Lo que lo detiene son los topes.": "⏺ HOW A THREADED PART MOVES: exactly like the weight stack on its tubes. The carriage is confined to the LINE of its guides —not to the vertical—, so on an inclined press it goes down and forward at the same time, without lateral drift and without tipping, and its guides do not rub against it. What stops it are the stops.",
  "En la SIMULACIÓN, los accesorios calzados quedan FIJADOS por su pin a la estructura: si esta es móvil (un brazo, un carro), viajan solidarios con ella sin caerse ni deslizar.": "In the SIMULATION, seated accessories are FIXED to the structure by their pin: if it moves (an arm, a carriage), they travel with it without falling off or sliding.",
  "La pila de pesos es selectorizada: mueve el PIN placa a placa (Propiedades) y el cable toma SOLO las placas seleccionadas, como en la máquina real.": "The weight stack is selectorised: move the PIN plate by plate (Properties) and the cable takes ONLY the selected plates, as on the real machine.",
  "El bloque de peso y la pila llevan DOS ORIFICIOS verticales que calzan con los tubos guía: colócalos entre dos tubos verticales y en la simulación se deslizan circunscritos a ellos, deteniéndose en los topes.": "The weight block and the stack carry TWO vertical holes that fit the guide tubes: place them between two vertical tubes and in the simulation they slide confined to them, stopping at the stops.",
  "El portadiscos (carrier), las barras olímpicas, los cuernos de carga y los atriles aceptan DISCOS MONTADOS (Propiedades): se ensamblan introduciendo el cilindro por el orificio central del disco, quedan suspendidos por la estructura y suman su masa.": "The plate carrier, the Olympic bars, the loading horns and the plate shelves accept MOUNTED PLATES (Properties): they assemble by passing the cylinder through the plate's centre hole, they hang from the structure and they add their mass.",
  "El motor reconoce solo el sistema de polea tubular guiada — carrier, 2 tubos guía y 2 espaciadores/stoppers — y circunscribe el carro a sus tubos sin uniones manuales.": "The engine recognises only the guided tubular pulley system — carrier, 2 guide tubes and 2 spacers/stoppers — and confines the carriage to its tubes with no manual joints.",
  "LA CARA CON RELIEVE MIRA HACIA FUERA, a los dos lados: en una barra cargada las letras y los números se leen desde cualquiera de los dos perfiles, como en un disco de verdad. Antes todos los discos se montaban con la misma orientación y en un extremo se veía el dorso liso.": "THE FACE WITH THE RELIEF LOOKS OUTWARDS, on both sides: on a loaded bar the letters and numbers read from either end, as on a real plate. Before, every plate was mounted the same way round and one end showed the plain back.",
  "Calza un Anclaje de cadena al pilar: su pin posterior entra en los pinholes y su cilindro perpendicular queda libre como PIVOTE.": "Seat a Chain anchor on the post: its rear pin enters the pinholes and its perpendicular cylinder is left free as a PIVOT.",
  "Selecciona una estructura tubular o tipo pilar, acércala al anclaje y pulsa Articular como brazo (sección Brazo móvil de Propiedades): la pieza se vuelve móvil y gira alrededor del cilindro, cayendo en el plano frontal del pilar como un jammer arm real.": "Select a tubular or post-like structure, bring it up to the anchor and press Articulate as arm (the Moving arm section of Properties): the part becomes mobile and turns around the cylinder, falling in the post's frontal plane like a real jammer arm.",
  "El brazo puede portar roldanas (soldador de nodos), cables/piolas, cuernos de carga con discos, o calzar piezas en sus propios pinholes — todo se mueve con él y expande la máquina.": "The arm can carry sheaves (node welder), cables/ropes, loading horns with plates, or seat parts in its own pinholes — everything moves with it and extends the machine.",
  "BRAZO COMPUESTO: si el brazo se prolonga con otra pieza, únelas con + Bisagra y deja la unión BLOQUEADA (o usa Lock switch): la simulación las funde en un solo cuerpo y el conjunto pivota entero desde su anclaje. Una pieza marcada como móvil sin masa declarada ya no queda estática en el aire — recibe una masa mínima de trabajo.": "COMPOUND ARM: if the arm is extended with another part, join them with + Hinge and leave the joint LOCKED (or use the Lock switch): the simulation fuses them into a single body and the assembly pivots whole from its anchor. A part marked as moving without a declared mass is no longer left static in mid-air — it is given a minimum working mass.",
  "🧍 COLOCAR MANIQUÍ (en la ventana del maniquí y en la barra de simulación): al soltarlo, la figura APOYA de verdad — glúteos sobre el asiento y espalda contra el respaldo, sin quedar flotando. Y SI EL RESPALDO VA TUMBADO —una prensa de piernas, un banco inclinado—, la figura SE RECUESTA con su misma inclinación para tocarlo de espalda entera, no sólo con la pelvis: ese apoyo es lo que la fija en la máquina, y sin él el empuje del tren inferior la sacaba del asiento. Apunta y el puntero va marcando dónde caería — verde sobre un APOYO ergonómico (asiento, respaldo, banco), azul sobre el SUELO. El clic lo deja puesto con su orientación: sentado sobre la cara del asiento mirando a su frente, o de pie mirando a la máquina más cercana. Vale en construcción y en simulación, en el Builder y en el Viewer. Sobre un banco reconoce si tocas un extremo o el medio: en el extremo SE SIENTA mirando hacia fuera, con las piernas colgando por el borde, y en el medio SE ACUESTA boca arriba a lo largo de él, porque una banca plana y larga hace de asiento y de respaldo a la vez — que es lo que es un banco de press. Se elige midiendo: cara horizontal, 90 cm o más de largo, el punto en el tramo central y ningún respaldo cerca; donde hay respaldo, el sitio es sentarse.": "🧍 PLACE MANNEQUIN (in the mannequin panel and on the simulation bar): when you drop it, the figure genuinely RESTS — buttocks on the seat and back against the backrest, not floating. AND IF THE BACKREST IS RECLINED —a leg press, an incline bench—, the figure LIES BACK at the same angle to touch it with its whole back, not just the pelvis: that contact is what holds it in the machine, and without it the drive of the lower body pushed it off the seat. Point and the cursor shows where it would land — green over an ergonomic SUPPORT (seat, backrest, bench), blue over the FLOOR. The click leaves it placed with its orientation: seated on the seat's face looking towards its front, or standing facing the nearest machine. It works while building and while simulating, in the Builder and in the Viewer. On a bench it recognises whether you touch an end or the middle: at the end it SITS facing outwards, legs hanging over the edge, and in the middle it LIES face up along it, because a long flat bench acts as seat and backrest at once — which is what a press bench is. It is decided by measuring: a horizontal face, 90 cm or more long, the point in the central run and no backrest nearby; where there is a backrest, the place is to sit.",
  "🦴 VENTANA DEL MANIQUÍ: una sola ventana con dos modos. En POSAR está todo lo que fija la postura de partida — postura guardada, agarrar, colocar, simetría, apoyo de manos y un SELECTOR DE ARTICULACIÓN con las ocho familias y su lado, para elegir cuál posar sin cazar el miembro en el visor. En SIMULAR está la ZONA del cuerpo que trabaja (tren superior, tren inferior, bisagra) con su lado: izquierda, derecha o los dos.": "🦴 MANNEQUIN PANEL: one panel with two modes. POSE holds everything that sets the starting posture — saved posture, grab, place, symmetry, hand support and a JOINT SELECTOR with the eight families and their side, to pick which one to pose without hunting for the limb in the viewport. SIMULATE holds the body ZONE that works (upper body, lower body, hinge) with its side: left, right or both.",
  "EL MOVIMIENTO SE INSTRUYE POR ZONAS, NO POR ARTICULACIONES: la tecla 8 EMPUJA (aleja la carga del cuerpo) y la 9 TRACCIONA (la acerca). Cada zona mueve sus articulaciones con el signo que le toca por anatomía: en el TREN SUPERIOR el empuje extiende el codo MIENTRAS flexiona el hombro —direcciones opuestas, que es justo lo que un modelo articulación por articulación no podía hacer—; en el TREN INFERIOR extiende rodilla y cadera con acomodación dinámica del tobillo para mantener la planta apoyada; en la BISAGRA extiende cadera y espalda. La tracción es la inversa exacta. Marcando varias zonas el gesto sale simultáneo, y con el lado sale simétrico, asimétrico o sectorizado.": "MOVEMENT IS INSTRUCTED BY ZONES, NOT BY JOINTS: key 8 PUSHES (drives the load away from the body) and 9 PULLS (brings it closer). Each zone moves its joints with the sign anatomy gives it: in the UPPER BODY the push extends the elbow WHILE flexing the shoulder —opposite directions, which is exactly what a joint-by-joint model could not do—; in the LOWER BODY it extends knee and hip with dynamic ankle accommodation to keep the sole down; in the HINGE it extends hip and back. The pull is the exact inverse. Mark several zones and the gesture comes out simultaneous, and with the side it comes out symmetric, asymmetric or sectorised.",
  "EL PLANO LO PONE LA POSTURA DE PARTIDA, NO EL BOTÓN: con el hombro a la altura del pecho el empuje sale horizontal (press de pecho) y con los brazos arriba, vertical (press militar); la tracción igual, desde delante es remo y desde arriba, jalón. La biblioteca trae las cuatro posturas de partida —Empuje horizontal, Empuje vertical, Tracción horizontal, Tracción vertical— para que los cuatro movimientos clásicos salgan con dos botones.": "THE PLANE IS SET BY THE STARTING POSTURE, NOT BY THE BUTTON: with the shoulder at chest height the push comes out horizontal (bench press) and with the arms up, vertical (overhead press); the pull likewise, from the front it is a row and from above, a pulldown. The library brings the four starting postures —Horizontal push, Vertical push, Horizontal pull, Vertical pull— so the four classic movements come out with two buttons.",
  "📌 PARTIDA DEL EJERCICIO: congela la postura del maniquí Y dónde está la máquina. Si el gesto es más fácil de montar desde el BLOQUEO —el final de la fase concéntrica—, arranca la simulación, lleva el conjunto móvil con la mano hasta ahí, acomoda la figura y pulsa 📌 Fijar partida: cada ▶ arrancará en ese punto y desde él saldrá la excéntrica. La partida vive aparte del diseño, que es el plano fabricable: parado sigues viendo y editando el diseño, y 🗑 Soltar máquina devuelve el arranque a él. El ↺ devuelve la figura a su postura de partida sin parar, y parar la simulación también.": "📌 EXERCISE START: freezes the mannequin's posture AND where the machine is. If the gesture is easier to set up from the LOCKOUT —the end of the concentric phase—, start the simulation, bring the moving assembly there by hand, settle the figure and press 📌 Set start: every ▶ will begin at that point and the eccentric will run from it. The start lives apart from the design, which is the manufacturable drawing: when stopped you still see and edit the design, and 🗑 Release machine gives the start back to it. ↺ returns the figure to its starting posture without stopping, and stopping the simulation does too.",
  "POSAR posa lo que toques: el candado NO manda aquí. Lo que fija la zona activa es qué mueve el gesto de 8/9 en SIMULAR, así que puedes posar una rodilla aunque el tren inferior no esté marcado.": "POSE poses whatever you touch: the lock does NOT rule here. What the active zone fixes is what the 8/9 gesture moves in SIMULATE, so you can pose a knee even if the lower body is not marked.",
  "🦶 PISAR UNA SUPERFICIE O PEDAL: el pie no siempre toca el suelo. En una prensa de piernas pisa la plataforma, en una extensión de rodillas queda al aire (cadena abierta) y sentado en un banco alto cuelga. Toca la pierna de la figura y luego la pieza donde apoya: la IK resuelve cadera, rodilla y tobillo, y el pie VIAJA CON LA PIEZA — si el pedal sube, la pierna lo acompaña. Soltar apoyos suelta manos y pies. La PLACA NO TIENE QUE ESTAR A NIVEL NI POR DEBAJO DE TI: al pisar se guarda la cara que tocas, así que sobre la plataforma inclinada de una prensa —que va por encima y por delante— el pie se ACUESTA sobre la cara que te mira, con la puntera hacia arriba por la pendiente, en vez de salir del revés o atravesarla. Marca la cara que VES y el pie se pone en la de enfrente, que es la que se empuja. Y SI ESA PIEZA PUEDE CORRER por una guía, el tren inferior LA EMPUJA como un gran pedal: tú te quedas en el asiento y lo que viaja es la máquina. Si el punto que marcas le queda lejos a la pierna, el pie se apoya en el sitio más cercano de esa misma cara al que llega — una persona pisa donde alcanza.": "🦶 STANDING ON A SURFACE OR PEDAL: the foot does not always touch the floor. On a leg press it stands on the platform, on a knee extension it hangs free (open chain) and seated on a high bench it dangles. Touch the figure's leg and then the part it rests on: the IK solves hip, knee and ankle, and the foot TRAVELS WITH THE PART — if the pedal rises, the leg goes with it. Release supports frees hands and feet. THE PLATE DOES NOT HAVE TO BE LEVEL OR BELOW YOU: when you step, the face you touch is recorded, so on a leg press's inclined platform —which is above and in front— the foot LIES on the face looking at you, toes up along the slope, instead of coming out inside out or going through it. Mark the face you SEE and the foot is placed on the opposite one, which is the one being pushed. AND IF THAT PART CAN RUN along a guide, the lower body PUSHES IT like a big pedal: you stay in the seat and what travels is the machine. If the point you mark is out of the leg's reach, the foot rests at the nearest place on that same face that it can reach — a person stands where they can.",
  "NADA DEL CUERPO QUEDA BAJO EL SUELO ni hundido en su apoyo, sea cual sea la pose. Si el banco es más bajo que la pierna, se ESTIRA LA RODILLA y se adelanta el pie, que es lo que hace una persona; y solo si aun estirada no llega, se levanta la figura — eso último es la señal de que ese asiento no le sirve a ese cuerpo. La corrección solo empuja hacia arriba: a un pie nunca se le fuerza a pisar.": "NO PART OF THE BODY IS LEFT UNDER THE FLOOR or sunk into its support, whatever the pose. If the bench is lower than the leg, the KNEE STRAIGHTENS and the foot goes forward, which is what a person does; and only if it still does not reach when straight is the figure raised — that last one is the sign that this seat does not suit that body. The correction only pushes upwards: a foot is never forced down onto something.",
  "Se usan números y no los cursores ▲▼ porque esas teclas las reclama el navegador para recorrer los botones de la interfaz. La articulación NO se frena contra el hierro: recorre su rango entero y, si el cuerpo choca, se avisa — ese choque es la evidencia de que la máquina no deja sitio, no un fallo que haya que esconder.": "Numbers are used instead of the ▲▼ arrows because the browser claims those keys to move through the interface's buttons. The joint does NOT brake against the steel: it runs its whole range and, if the body collides, you are told — that collision is the evidence that the machine leaves no room, not a fault to be hidden.",
  "EL MANIQUÍ TIENE CUERPO: al simular, cada segmento entra al motor con su forma real, así que las piezas móviles CHOCAN con él en vez de atravesarlo. No se desploma ni lo arrastran (su postura la mandas tú), y manos y pies quedan sin cuerpo a propósito, porque son los puntos por los que agarra la máquina. Si la figura quedó encajada en la estructura, se aparta lo mínimo al colocarla o al arrancar y se te dice cuánto.": "THE MANNEQUIN HAS A BODY: in the simulation each segment enters the engine with its real shape, so moving parts COLLIDE with it instead of going through it. It does not collapse and it is not dragged (you set its posture), and hands and feet are deliberately bodiless, because they are the points by which it grips the machine. If the figure ended up jammed in the structure, it is moved the minimum when placed or when starting, and you are told by how much.",
  "ÚSALO COMO COMPROBACIÓN ERGONÓMICA: si al sentar el maniquí una estación pierde recorrido, no es un fallo de la simulación — es que la máquina no deja holgura suficiente para el cuerpo que va a usarla, igual que pasaría con una persona. Ahí tienes qué corregir en el diseño: separar el asiento, subir el pivote, acortar el brazo.": "USE IT AS AN ERGONOMIC CHECK: if seating the mannequin costs a station its travel, that is not a simulation fault — it is the machine not leaving enough clearance for the body that will use it, exactly as would happen with a person. There you have what to fix in the design: move the seat back, raise the pivot, shorten the arm.",
  "🏋 BARRA EN MANOS (grupo BARRA de la ventana del maniquí): elige el ejercicio y la barra aparece PUESTA en el cuerpo, con sus discos y su peso. Cuatro configuraciones —sentadilla frontal, sentadilla trasera, press vertical y peso muerto— cada una con sus DOS extremos del recorrido (△ Arriba y ▽ Fondo), porque un rack se dimensiona por dónde queda la barra arriba, para colgarla, y dónde queda abajo, para que los brazos de seguridad la cojan si falla.": "🏋 BAR IN HANDS (the BAR group of the mannequin panel): pick the exercise and the bar appears PLACED on the body, with its plates and its weight. Four setups —front squat, back squat, overhead press and deadlift— each with its TWO ends of the travel (△ Top and ▽ Bottom), because a rack is dimensioned by where the bar sits at the top, to hang it, and where it sits at the bottom, so the spotter arms catch it if you fail.",
  "UN EJERCICIO NO ES UN REPARTO, ES UN CALENDARIO. Los cuatro gestos con barra traen su PLAN: qué articulaciones trabajan, en qué ORDEN y hasta dónde. El peso muerto se parte en dos fases —primero extensión de RODILLA hasta que la barra pasa la rótula, con el tronco sosteniendo su ángulo, y después extensión de CADERA y espalda hasta el bloqueo—, y el cambio de fase se lee del mundo en cada paso («¿ya está la barra por encima de la rodilla?»), no de un contador: por eso la bajada recorre las mismas posturas al revés sin guardar nada.": "AN EXERCISE IS NOT A SHARE-OUT, IT IS A SCHEDULE. The four barbell gestures bring their PLAN: which joints work, in what ORDER and how far. The deadlift is split into two phases —first KNEE extension until the bar passes the kneecap, with the trunk holding its angle, and then HIP and back extension to lockout—, and the phase change is read from the world at each step («is the bar above the knee yet?»), not from a counter: that is why the descent runs the same postures backwards without storing anything.",
  "Y CADA GESTO SE ACOMODA SOLO A LO QUE MANDA LA FÍSICA REAL, en cada paso y sin que haya que declararlo: el BRAZO cuelga como una cuerda desde el hombro y no como un puntal; la BARRA se queda sobre el medio del pie, que es lo que impide que la figura se caiga hacia atrás; la barra ROZA la espinilla, el muslo y la cadera pero no se hunde en ellos, así que en el peso muerto sube arrastrando como en el mundo real; la MIRADA no se suelta de una marca del suelo a 2,25 m mientras el tronco está inclinado —bajar en flexión cervical es lo que arriesga la espalda— y se queda en neutral, mirando al frente, en cuanto la figura se pone de pie.": "AND EVERY GESTURE ACCOMMODATES ITSELF TO WHAT REAL PHYSICS DICTATES, at each step and without having to declare it: the ARM hangs like a rope from the shoulder, not like a strut; the BAR stays over the middle of the foot, which is what stops the figure falling backwards; the bar BRUSHES the shin, the thigh and the hip but does not sink into them, so in the deadlift it goes up dragging as in the real world; the GAZE does not leave a mark on the floor 2.25 m away while the trunk is bent —going down in cervical flexion is what puts the back at risk— and returns to neutral, looking ahead, as soon as the figure stands up.",
  "LA FRONTAL Y LA TRASERA SE DIFERENCIAN SOLAS, sin declararlo en ninguna parte: la barra va rígida al tronco pero apoyada en sitios distintos —clavículas por delante, trapecios por detrás—, así que dejar el mismo punto del suelo debajo pide inclinaciones distintas. La frontal mantiene el torso VERTICAL a costa de más rodilla y más tobillo; la trasera se inclina hasta 27° y usa más cadera. En las dos, la cadera ABDUCE al descender para que la postura no se cierre, y el pie PIVOTA sobre su propia huella —la puntera se abre 36°— sin deslizarse por el suelo.": "THE FRONT AND BACK SQUAT TELL THEMSELVES APART, without being declared anywhere: the bar is rigid to the trunk but rests in different places —collarbones in front, traps behind—, so keeping the same point of the floor underneath calls for different inclinations. The front squat keeps the torso VERTICAL at the cost of more knee and more ankle; the back squat leans up to 27° and uses more hip. In both, the hip ABDUCTS on the way down so the posture does not close up, and the foot PIVOTS on its own footprint —the toes open 36°— without sliding along the floor.",
  "EL PRESS ESQUIVA LA CABEZA: la barra sale por delante del rostro con flexión de hombro y un grado de extensión cervical, describe una sigmoide que evita la cara y se recoloca en la vertical sobre la línea de equilibrio antes de que el codo termine de extender. No es una interpolación entre las dos puntas — es la trayectoria, y por eso no atraviesa la cabeza en ningún paso.": "THE PRESS DODGES THE HEAD: the bar goes out in front of the face with shoulder flexion and a degree of cervical extension, describes an S-curve that avoids the face and settles back onto the vertical over the line of balance before the elbow finishes extending. It is not an interpolation between the two ends — it is the path, and that is why it does not pass through the head at any step.",
  "DÓNDE APOYA NO ES LO MISMO EN LAS CUATRO: en los dos racks la barra la sostiene el CUERPO —deltoides y clavículas en la frontal, trapecios en la trasera— y su sitio se calcula por CONTACTO contra la malla del maniquí, así que apoya en la piel y no se hunde en ella; en press y peso muerto va en el puño. Doblar el codo lo enseña: en un rack la barra no se inmuta, en un press se va con la mano.": "WHERE IT RESTS IS NOT THE SAME IN ALL FOUR: in the two racking gestures the bar is held by the BODY —deltoids and collarbones in the front squat, traps in the back— and its place is worked out by CONTACT against the mannequin's mesh, so it rests on the skin and does not sink into it; in the press and the deadlift it is in the fist. Bending the elbow shows it: in a rack the bar does not stir, in a press it goes with the hand.",
  "⤓ RACKEAR: deja la barra en el gancho más cercano y libera al maniquí; ⤒ Desrackear se la devuelve. Los ganchos se leen solos de las piezas que saben recibir una barra (jotas, brazos de seguridad y cada diente de una placa dentada). Como un rack tiene DOS, se busca la pareja del gancho elegido y la barra se centra entre ambos.": "⤓ RACK: leaves the bar on the nearest hook and frees the mannequin; ⤒ Unrack gives it back. The hooks are read automatically from the parts that know how to receive a bar (J-cups, spotter arms and every tooth of a toothed plate). Since a rack has TWO, the partner of the chosen hook is found and the bar is centred between them.",
  "Poner la barra deja armada además la ZONA de movimiento del ejercicio, así que el 8/9 mueve lo que toca sin ir a marcarlo a mano.": "Placing the bar also sets up the exercise's movement ZONE, so 8/9 moves what it should without going to mark it by hand.",
  "Cada articulación dobla hacia SU lado anatómico: el CODO flexiona hacia delante (X negativa) y la RODILLA hacia atrás (X positiva), como en el cuerpo. Si guardaste posturas con una versión anterior, se migran solas al criterio correcto.": "Each joint bends towards ITS anatomical side: the ELBOW flexes forwards (negative X) and the KNEE backwards (positive X), as in the body. If you saved postures with an earlier version, they migrate themselves to the correct convention.",
  "TUS POSTURAS SE GUARDAN Y LAS DE FÁBRICA SE ACTUALIZAN. La biblioteca vive en el dispositivo: las que crees tú se conservan tal cual, y las de fábrica se refrescan con cada versión de la app SALVO las que hayas editado a mano, que se respetan. Así llegan las correcciones de los gestos sin pisar tu trabajo.": "YOUR POSTURES ARE KEPT AND THE FACTORY ONES ARE UPDATED. The library lives on the device: the ones you create are kept as they are, and the factory ones are refreshed with each version of the app EXCEPT those you have edited by hand, which are respected. That is how corrections to the gestures arrive without treading on your work.",
  "El puntero arranca en ÓRBITA: mirar la máquina no la mueve. La MANIPULACIÓN (✋) se elige a propósito y, al elegirla, la pieza que agarrarías SE RESALTA al pasar por encima — da igual que sea ergonómica (un asiento, un agarre) o estructural (un travesaño): lo que decide es el conjunto móvil al que pertenece. Si lo que hay delante está anclado, se te dice con su nombre.": "The pointer starts in ORBIT: looking at the machine does not move it. MANIPULATION (✋) is chosen on purpose and, once chosen, the part you would grab IS HIGHLIGHTED as you pass over it — whether it is ergonomic (a seat, a grip) or structural (a crossbeam) makes no difference: what decides is the moving assembly it belongs to. If what is in front is anchored, you are told by name.",
  "Con la simulación corriendo, ARRASTRA las piezas móviles con el dedo: es la mano interactiva. La fuerza de la mano SIEMPRE alcanza para operar los móviles, y la barra reporta la TENSIÓN MÁXIMA ejercida en kg y lb (✋ máx …).": "With the simulation running, DRAG the moving parts with your finger: this is the interactive hand. The hand's force is ALWAYS enough to operate the moving parts, and the bar reports the MAXIMUM TENSION applied in kg and lb (✋ max …).",
  "PIEZAS ARTICULADAS: si lo que agarras cuelga de una bisagra —el brazo de press de una torre, un pedal, una tapa— la mano SIGUE SU ARCO en vez de tirar contra el pasador, así que el brazo va detrás de tu dedo mientras recorres la curva que la máquina permite. Arrastra siguiendo ese arco (no en línea recta) y el recorrido sale entero; la tensión que se muestra es la que de verdad cuesta girarla.": "ARTICULATED PARTS: if what you grab hangs from a hinge —a tower's press arm, a pedal, a lid— the hand FOLLOWS ITS ARC instead of pulling against the pin, so the arm goes after your finger while you trace the curve the machine allows. Drag along that arc (not in a straight line) and the full travel comes out; the tension shown is what it really costs to turn it.",
  "El pivote es RÍGIDO en todo lo que no sea su giro: aunque empujes un brazo por uno solo de sus dos agarres, el conjunto describe su semicircunferencia sobre el eje del pasador sin torcerse ni salirse de plano, y por eso tira del cable como en la máquina real. Los TOPES de la unión (Conexiones) definen dónde descansa y hasta dónde llega el recorrido.": "The pivot is RIGID in everything that is not its rotation: even if you push an arm by only one of its two grips, the assembly describes its semicircle about the pin's axis without twisting or leaving the plane, and that is why it pulls the cable as on the real machine. The joint's STOPS (Connections) define where it rests and how far the travel goes.",
  "Si delante de la pieza que buscas hay algo ANCLADO (un montante, el respaldo), el agarre lo atraviesa y toma la primera pieza móvil que encuentre detrás: ya no hace falta orbitar para \"despejar\" el objetivo.": "If there is something ANCHORED in front of the part you want (an upright, the backrest), the grab goes through it and takes the first moving part it finds behind: you no longer have to orbit to \"clear\" the target.",
  "El botón 🌐 cambia a la herramienta de ÓRBITA: el arrastre solo mueve la cámara para visualizar, sin tocar piezas; ✋ vuelve a la mano.": "The 🌐 button switches to the ORBIT tool: dragging only moves the camera to look around, without touching parts; ✋ returns to the hand.",
  "DEMOSTRACIÓN DE MOVIMIENTO del maniquí: en el modo SIMULAR de la ventana 🦴 marca la ZONA que trabaja y su lado, y las teclas 8 y 9 la EMPUJAN y la TRACCIONAN dentro del rango humano. Con la zona activa la mano apoyada deja de mandar sobre el brazo: manda el gesto, y es el cuerpo el que empuja la pieza por contacto.": "MOVEMENT DEMONSTRATION for the mannequin: in the SIMULATE mode of the 🦴 panel mark the ZONE that works and its side, and keys 8 and 9 PUSH and PULL it within the human range. With the zone active, a resting hand stops ruling the arm: the gesture rules, and it is the body that pushes the part by contact.",
  "CON UNA BARRA PUESTA, el 8/9 recorre el EJERCICIO y no un reparto: el gesto aterriza en la postura del modelo —no donde tope la primera articulación—, se parte en las fases que le tocan y la tracción las deshace en orden inverso, paso por paso y por las mismas posturas. Si a la figura se le acaba el recorrido, se avisa; ese aviso es la conclusión ergonómica, no un fallo.": "WITH A BAR IN HAND, 8/9 runs the EXERCISE and not a share-out: the gesture lands on the model's posture —not wherever the first joint runs out—, it splits into the phases it should and the pull undoes them in reverse order, step by step and through the same postures. If the figure runs out of travel, you are told; that warning is the ergonomic conclusion, not a fault.",
  "Las JOTAS y brazos de seguridad sostienen la barra en su CONCAVIDAD real: apoyada en el gancho queda retenida por el asiento y el tope, sin rodar ni deslizar fuera.": "The J-CUPS and spotter arms hold the bar in their real CONCAVITY: resting on the hook it is held by the seat and the stop, without rolling or sliding off.",
  "Las CADENAS y correas son CUERDAS FLEXIBLES: cuelgan, ondulan y se hunden bajo la barra que cae (y la mecen); la caída definida al tenderlas fija su tensión inicial.": "CHAINS and straps are FLEXIBLE ROPES: they hang, they ripple and they sag under a falling bar (and rock it); the sag set when you span them fixes their initial tension.",
  "1) Configura el área de trabajo con las dimensiones del lugar REAL (planta libre o parámetros): que ambas superficies coincidan es lo que da un buen resultado. 2) Compón tu espacio colocando y armando los modelos.": "1) Set up the work area with the dimensions of the REAL place (free plan or parameters): the two surfaces matching is what gives a good result. 2) Compose your space by placing and assembling the models.",
  "La función es una HERRAMIENTA DEL VIEWER: abre tu proyecto en Home → ▶ Simulador y pulsa 📸 Prototipo en su barra — solo quedan el visor, la órbita y la ventana de controles (⌂ Volver te regresa al viewer). En el viewer las piezas no se editan: sin gizmo, solo posturas del maniquí y arrastre de móviles en simulación.": "The feature is a VIEWER TOOL: open your project from Home → ▶ Simulator and press 📸 Prototype on its bar — only the viewport, the orbit and the controls panel remain (⌂ Back returns you to the viewer). In the viewer parts are not edited: no gizmo, only mannequin postures and dragging moving parts in the simulation.",
  "3) Carga la fotografía del lugar: entra el MODO CALCE — la foto queda DEBAJO del render, cuyo fondo se elimina pero cuyo SUELO se preserva. ORBITA hasta el punto de coincidencia entre el suelo del área de trabajo y el de la foto (el control Render regula la transparencia del solapamiento). Si la foto fue tomada desde otra ALTURA o DISTANCIA, activa 🖐 Mover y escalar foto: arrastrarla la desplaza y la pinza de dos dedos (o la rueda) le hace ZOOM en torno a los dedos; doble toque la recentra y el control Zoom foto afina el valor. Encuadre y zoom se conservan en la producción.": "3) Load the photograph of the place: SEATING MODE begins — the photo sits UNDER the render, whose background is removed but whose FLOOR is kept. ORBIT to the point where the work area's floor matches the photo's (the Render control sets the transparency of the overlap). If the photo was taken from a different HEIGHT or DISTANCE, turn on 🖐 Move and scale photo: dragging it shifts it and a two-finger pinch (or the wheel) ZOOMS it around your fingers; a double tap recentres it and the Photo zoom control fine-tunes the value. Framing and zoom are kept in the final render.",
  "4) 📌 Fija la perspectiva (la órbita queda bloqueada) y aparece la PERILLA 📐 DE INCLINACIÓN: gírala — o usa los pasos de 0,5° — para inclinar el modelo hasta que su suelo calce EXACTAMENTE con el de la fotografía (no toca el giro ni la distancia, solo el ángulo de la vista sobre el suelo). Después arrastra el ☀ en el selector circular para elegir desde dónde viene la luz — las sombras deben hacer sentido con la fotografía.": "4) 📌 Fix the perspective (the orbit is locked) and the 📐 TILT KNOB appears: turn it — or use the 0.5° steps — to tilt the model until its floor matches the photograph's EXACTLY (it touches neither the rotation nor the distance, only the angle of the view over the floor). Then drag the ☀ in the circular selector to choose where the light comes from — the shadows must make sense with the photograph.",
  "5) 🎞 Producir fotografía renderiza por CAPAS: tu foto de fondo y, encima, el suelo del área de trabajo — vestido de goma tipo caucho con el logotipo discretamente impreso — con los modelos y las sombras que proyectan. El piloto queda en la galería de la Home y se descarga como PNG.": "5) 🎞 Produce photograph renders in LAYERS: your background photo and, over it, the work area's floor — dressed in rubber matting with the logo discreetly printed — with the models and the shadows they cast. The result goes to the gallery on the Home and downloads as a PNG.",
  "Es el HUB que junta a usuarios, makers y marcas en un showroom virtual: el dueño del gimnasio cotiza y simula la distribución de su sala con equipos reales, la marca expone su catálogo y el aficionado encuentra foro, patrocinio y quien le fabrique lo que dibujó. Se recorre por SIETE ventanas.": "It is the HUB that brings users, makers and brands together in a virtual showroom: the gym owner quotes and simulates the layout of their room with real equipment, the brand displays its catalogue, and the enthusiast finds a forum, sponsorship and someone to manufacture what they drew. You move through it in SEVEN windows.",
  "🎉 NEWCOMERS: las marcas recién llegadas al hub estrenan su vitrina — historia, país, modelos escaneados y catálogo. ✨ NEW ARRIVALS: los estrenos de los últimos tres meses, del más reciente al más antiguo, más lo que viene.": "🎉 NEWCOMERS: brands newly arrived at the hub open their showcase — history, country, scanned models and catalogue. ✨ NEW ARRIVALS: the last three months' releases, newest to oldest, plus what is coming.",
  "🌱 ECONOMÍA LOCAL: PyMEs y marcas que fabrican en TU país (lo eliges con las banderas y queda guardado); comprar ahí acorta el envío y deja el servicio y los repuestos a mano.": "🌱 LOCAL ECONOMY: SMEs and brands that manufacture in YOUR country (you pick it with the flags and it is remembered); buying there shortens the shipping and keeps service and spare parts at hand.",
  "🏬 VITRINA DIGITAL: la tienda. Arriba, las HISTORIAS de cada marca (formato Instagram: anillo, diapositivas, avance automático y toque a los lados) y su botón Ver productos deja el catálogo filtrado por esa marca. Abajo, el catálogo con BUSCADOR, filtro por categoría y carrito — que es el mismo en todas las ventanas.": "🏬 DIGITAL SHOWCASE: the shop. At the top, each brand's STORIES (Instagram format: ring, slides, automatic advance and a tap on either side) and their View products button leaves the catalogue filtered by that brand. Below, the catalogue with a SEARCH BOX, a category filter and a cart — which is the same one in every window.",
  "🔧 MAKERS: el foro de la comunidad DIY — diseños originales, búsqueda de patrocinio (con su barra de reservas y las marcas interesadas) y equipos de trabajo. Los hilos se responden con el prefab en la mano. Aquí vive también el mercado bidireccional: cotiza tu construcción o vende tu diseño.": "🔧 MAKERS: the DIY community's forum — original designs, the search for sponsorship (with its reservation bar and the interested brands) and work teams. Threads are answered with the prefab in hand. The two-way market lives here too: quote your build or sell your design.",
  "🪄 GOT A WISH: presenta TU diseño a las marcas y pide una valoración para fabricarlo. Viaja el prefab, la marca lo simula, y la conversación queda abierta con su estado (enviado · en revisión · presupuestado · en fabricación). Incluye la pintura de estructura y tapizado del encargo.": "🪄 GOT A WISH: present YOUR design to the brands and ask for a quote to manufacture it. The prefab travels, the brand simulates it, and the conversation stays open with its status (sent · under review · quoted · in production). It includes the frame paint and upholstery of the commission.",
  "🤝 JOIN EXERSUITE3D: la puerta de entrada de las marcas. Contacto → acuerdo y ficha → ESCÁNER FOTOGRÁFICO 3D del catálogo (unas 120 fotos por equipo más las medidas de fábrica) → publicación en la vitrina, las historias y la biblioteca.": "🤝 JOIN EXERSUITE3D: the brands' way in. Contact → agreement and profile → 3D PHOTOGRAPHIC SCAN of the catalogue (about 120 photos per machine plus the factory dimensions) → publication in the showcase, the stories and the library.",
  "Desde la ficha de cualquier producto, Ver abre la BIBLIOTECA DE MODELOS: el showroom navegable de todas las piezas y máquinas, donde además se sustituyen por modelos 3D propios.": "From any product's page, View opens the MODEL LIBRARY: the browsable showroom of every part and machine, where they can also be replaced with your own 3D models.",
  "Es una MAQUETA: las marcas son ficticias y las acciones comerciales no operan todavía (etiqueta DEMO), pero la navegación es la definitiva.": "It is a MOCK-UP: the brands are fictional and the commercial actions do not work yet (DEMO label), but the navigation is the final one.",
  "Pestaña Máquinas: cada máquina estándar se puede EXPORTAR como STL u OBJ (el ensamblaje completo), editar fuera y SUSTITUIR por tu versión corregida — al insertarla usará tu modelo.": "Machines tab: every standard machine can be EXPORTED as STL or OBJ (the complete assembly), edited outside and REPLACED with your corrected version — when inserted it will use your model.",
  "Ciclo de PREFABS por máquina: Exportar prefab (.json) descarga su definición pieza a pieza (componente, medidas, pose, uniones), la corriges en la app y con Sustituir por prefab pasa a ser la definición PERSISTENTE de esa máquina.": "PREFAB cycle per machine: Export prefab (.json) downloads its definition part by part (component, dimensions, pose, joints), you correct it in the app, and with Replace with prefab it becomes that machine's PERSISTENT definition.",
  "Guardar y abrir usan los diálogos NATIVOS del dispositivo: tú eliges dónde buscar y dónde guardar cada archivo (en Android se abre la app Archivos del sistema: memoria, Descargas, SD, Drive…).": "Save and open use the device's NATIVE dialogs: you choose where to look and where to save each file (on Android the system Files app opens: storage, Downloads, SD, Drive…).",
};
