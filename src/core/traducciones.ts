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
  "Torre de polea (alta/baja)": "Cable tower (high/low)",
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
  "Liston de Kevlar": "Kevlar strap",
  Resorte: "Spring",
  "Leva (cam)": "Cam",
  "Bloque de peso": "Weight block",
  "Disco de peso": "Weight plate",
  Contrapeso: "Counterweight",
  "Barra olimpica": "Olympic barbell",
  "Pila de pesos": "Weight stack",
  "Cuerno de carga": "Loading horn",
  "Micro-disco": "Micro plate",
  Agarradera: "Handle",
  Asiento: "Seat",
  Respaldo: "Backrest",
  "Agarradera en D": "D-handle",
  "Cuerda de triceps": "Triceps rope",
  "Barra de jalon": "Lat pulldown bar",
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
  "Montante TTP (5×7×204)": "TTP upright (5×7×204)",
  "Riel porta-discos TTP": "TTP plate storage rail",
  "Multi-agarre dominadas TTP": "TTP multi-grip pull-up",
  "Patín de suelo TTP": "TTP floor skid",
  "Montante real del rack TTP001L con agujeros de calce (el gancho J entra con pin y giro).":
    "Real TTP001L rack upright with keying holes (the J-hook seats with pin and twist).",
  "Riel lateral de almacenamiento de discos del TTP001L, con manguitos y cuernos.":
    "TTP001L side plate-storage rail, with sleeves and horns.",
  "Estación de dominadas multi-agarre real del TTP001L (92×32 cm).":
    "Real TTP001L multi-grip pull-up station (92×32 cm).",
  "Patín/pie de suelo real del TTP001L (104 cm) que estabiliza cada marco.":
    "Real TTP001L floor skid (104 cm) stabilizing each frame.",
  "Marco soldado TTP": "TTP welded frame",
  "Marco soldado completo del TTP001L: montantes, travesaños con placas de encuadre y base.":
    "Complete welded TTP001L frame: uprights, crossmembers with gusset plates and base.",
  "Brazo de seguridad TTP": "TTP safety arm",
  "Brazo de seguridad perforado real del TTP001L (86 cm), calza entre montantes.":
    "Real perforated TTP001L safety arm (86 cm), keys in between uprights.",
  "Riel de base TTP": "TTP base rail",
  "Riel de base real con placas de encuadre en los extremos (141 cm): arriostra los marcos al suelo.":
    "Real base rail with gusset plates at the ends (141 cm): braces the frames to the floor.",
  "Barra lat TTP": "TTP lat bar",
  "Barra de jalón (lat) real del TTP001L, cuelga del cable de la polea alta.":
    "Real TTP001L lat pulldown bar, hangs from the high pulley cable.",
  "Rack abierto 142×204×120 cm: montantes reales con agujeros de calce, ganchos J que abrazan el pilar y rieles de base con placas de encuadre.":
    "Open rack 142×204×120 cm: real uprights with keying holes, J-hooks that wrap the upright and base rails with gusset plates.",
  "Power cage 120×204×120 cm con montantes de calce, dominadas y pipes de seguridad.":
    "Power cage 120×204×120 cm with keyed uprights, pull-up bar and safety pipes.",
  "TTP001L fiel al armado: marco soldado con placas de encuadre, doble polea alta, polea de torre, carro de poleas, polea baja con barra lat, ganchos J, brazos de seguridad y porta-discos.":
    "TTP001L true to the assembly: welded frame with gusset plates, double high pulley, tower pulley, pulley carriage, low pulley with lat bar, J-hooks, safety arms and plate storage.",
};
