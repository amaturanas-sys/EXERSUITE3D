import "./ui/styles.css";
import {
  abrirDialogoDerecha,
  cerrarDialogoDerecha,
  hayDialogoDerecha,
} from "./ui/dialogoDerecha";
import { descargarArchivo } from "./core/descargas";
import { el } from "./ui/dom";
import * as THREE from "three";
import { Editor } from "./core/Editor";
import { ComponentPalette } from "./ui/ComponentPalette";
import { Toolbar } from "./ui/Toolbar";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { JointsPanel } from "./ui/JointsPanel";
import { ArticulacionesPanel } from "./ui/ArticulacionesPanel";
import { MeasurementHUD } from "./ui/MeasurementHUD";
import { PerformancePanel } from "./ui/PerformancePanel";
import { SimulatorBar } from "./ui/SimulatorBar";
import { PreciseDrag } from "./ui/PreciseDrag";
import { Landing } from "./ui/Landing";
import { LibraryView } from "./ui/LibraryView";
import { confirmUnsavedChanges } from "./ui/confirmDialog";
import { componentModels } from "./core/componentModels";
import { figureSegments } from "./core/figureSegments";
import { prefabsMaquina } from "./core/prefabsMaquina";
import { parsearPrefab, prefabDeFabrica, serializarPrefab } from "./core/prefabIO";
import { medidasDentada, pasoMinimoDentada } from "./objects/placaDentada";
import { hornearMaquina } from "./core/maquinasModelo";
import {
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
  catalogoVigente,
} from "./objects/componentLibrary";
import { STANDARD_MACHINES, piezasDeMaquina } from "./objects/standardMachines";
import { APOYO_RACK, EJERCICIOS_BARRA } from "./objects/barraManiqui";
import { addRecent } from "./core/recentStore";
import { elegirWorkspace } from "./ui/WizardNuevo";
import type { ProjectData, WorkspaceData } from "./core/project";
import { tt } from "./core/i18n";
import { instalarSonidoUI } from "./ui/sonido";
import { crearBarraHerramientas } from "./ui/ToolQuickBar";
import { PrototipoFoto } from "./ui/PrototipoFoto";
import { SceneObject } from "./objects/SceneObject";

// Los discos montados en barras/cuernos/carriers usan la malla DISTINTIVA
// del "Disco de peso" de la biblioteca (v0.2.21): si el diseñador
// sustituyó su modelo, la carga completa lo hereda.
SceneObject.plantillaDisco = () => componentModels.geometryClone("disco-peso");

const app = document.getElementById("app")!;
// Detalle estético (v0.2.3): todos los botones hacen "click" al tocarlos.
instalarSonidoUI();

/**
 * Panel plegable (F4 v0.2.0): tocar su título lo colapsa a solo la cabecera
 * (y lo reexpande), en cualquier tamaño de pantalla.
 */
function hacerPlegable(panel: HTMLElement, inicialColapsado = false): void {
  const title = panel.querySelector(".panel-title");
  if (!title) return;
  const chev = document.createElement("span");
  chev.className = "plegar";
  chev.textContent = inicialColapsado ? "▸" : "▾";
  title.append(chev);
  if (inicialColapsado) panel.classList.add("colapsado");
  title.addEventListener("click", () => {
    const on = panel.classList.toggle("colapsado");
    chev.textContent = on ? "▸" : "▾";
  });
}

let editor: Editor | null = null;
let editorNodes: HTMLElement[] = [];
let editorDisposables: Array<() => void> = [];
let landing: Landing | null = null;
let libraryView: LibraryView | null = null;

/**
 * Construye el editor 3D y su interfaz. Se difiere hasta que el usuario elige
 * una acción, y se destruye por completo al volver a la Home (para trabajar en
 * varios proyectos de forma secuencial sin acumular recursos).
 */
function bootEditor(opts: { simulator?: boolean } = {}): Editor {
  const canvas = document.createElement("canvas");
  canvas.id = "viewport";
  app.append(canvas);

  const ed = new Editor(canvas);
  editor = ed;

  if (opts.simulator) {
    // Modo SIMULADOR (viewer): solo el viewport y la barra de simulación.
    // No se construye ninguna herramienta de edición (paneles, paleta,
    // inspector…): mostrar un proyecto no las necesita.
    document.body.classList.add("simulator-mode");
    // SIN GIZMO sobre los objetos en el viewer (v0.2.19): la herramienta
    // queda en selección — las piezas no se transforman; solo se posan las
    // articulaciones del maniquí y se arrastran móviles en simulación.
    ed.setHerramienta("seleccion");
    // El PROTOTIPO CON FOTO es herramienta del viewer.
    const prototipo = new PrototipoFoto(ed);
    // LA VENTANA DEL MANIQUÍ TAMBIÉN ES DEL VIEWER (v0.3.6).
    //
    // El viewer se montaba sin ella —«mostrar un proyecto no necesita
    // herramientas de edición»—, y el maniquí no es una herramienta de
    // edición: es la mitad del proyecto. Sin la ventana no había forma de
    // posarlo, ni de correr su gesto, ni de quitarlo de en medio para ver la
    // máquina. Y el botón que la abre ya existía en la barra de simulación
    // (`SimulatorBar`), llamando a `editor.panelArticulaciones` — que en el
    // viewer era null: el botón estaba ahí y no hacía nada.
    const articPanel = new ArticulacionesPanel(ed);
    ed.panelArticulaciones = articPanel;
    const simBar = new SimulatorBar(ed, {
      standalone: true,
      onHome: () => void goHome(),
      onPrototipo: () => prototipo.activar(),
    });
    ed.bus.on("simulationChanged", ({ running }) => {
      document.body.classList.toggle("simulating", running);
    });
    editorNodes = [canvas, prototipo.overlay, prototipo.root, articPanel.root, simBar.root];
    editorDisposables = [() => prototipo.dispose()];
    app.append(prototipo.overlay, prototipo.root, articPanel.root, simBar.root);
    ed.start();
    (window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
      editor: ed,
      THREE,
    };
    return ed;
  }

  const palette = new ComponentPalette(ed);
  const perfPanel = new PerformancePanel(ed);
  const precise = new PreciseDrag(ed);
  const toolbar = new Toolbar(ed, {
    onHome: () => void goHome(),
    onPerformance: () => perfPanel.toggle(),
    onPreciseToggle: () => precise.toggle(),
    isPreciseOn: () => precise.isActiva(),
  });

  // Barra de ZOOM del visor (v0.2.3): continuum discreto y sencillo en la
  // región inferior izquierda — botones − / + con barra deslizante entre ambos.
  const zoomBar = document.createElement("div");
  zoomBar.id = "zoom-bar";
  const D_MIN = 25;
  const D_MAX = 4000;
  const distAValor = (d: number) =>
    Math.round((100 * Math.log(D_MAX / d)) / Math.log(D_MAX / D_MIN));
  const valorADist = (v: number) => D_MAX * Math.pow(D_MIN / D_MAX, v / 100);
  const zoomSlider = document.createElement("input");
  zoomSlider.type = "range";
  zoomSlider.min = "0";
  zoomSlider.max = "100";
  zoomSlider.step = "1";
  zoomSlider.className = "zoom-slider";
  zoomSlider.title = tt("Zoom", "Zoom");
  zoomSlider.value = String(distAValor(ed.getZoomDistancia()));
  zoomSlider.addEventListener("input", () => ed.setZoomDistancia(valorADist(+zoomSlider.value)));
  const mkZoomBtn = (txt: string, factor: number, titulo: string) => {
    const b = document.createElement("button");
    b.className = "tool zoom-btn";
    b.textContent = txt;
    b.title = titulo;
    b.addEventListener("click", () => {
      ed.zoomCamara(factor);
      zoomSlider.value = String(distAValor(ed.getZoomDistancia()));
    });
    return b;
  };
  zoomBar.append(
    mkZoomBtn("−", 1.25, tt("Alejar", "Zoom out")),
    zoomSlider,
    mkZoomBtn("+", 0.8, tt("Acercar", "Zoom in")),
  );

  // Modo Sencillo (v0.2.3): la clase en <body> acota la interfaz por CSS
  // (sin bloqueo de Ejes; la paleta ya filtra sus piezas).
  const aplicarModo = () =>
    document.body.classList.toggle("modo-sencillo", ed.getWorkspace()?.modo === "sencillo");
  aplicarModo();
  ed.bus.on("workspaceChanged", aplicarModo);

  // El carril derecho lo cierra quien lo pida: el núcleo avisa y aquí se
  // obedece, sin que Editor.ts tenga que saber de paneles.
  ed.bus.on("dialogosCerrar", () => cerrarDialogoDerecha());

  const inspector = new PropertiesPanel(ed);
  const joints = new JointsPanel(ed);
  // VENTANA DEL MANIQUÍ (v0.2.45): una sola con dos modos — POSAR fija la
  // postura de partida y SIMULAR el candado articular y el 8/9. Sustituye a
  // las dos ventanas separadas (Posturas y Articulaciones).
  const articPanel = new ArticulacionesPanel(ed);
  ed.panelArticulaciones = articPanel;
  const hud = new MeasurementHUD(ed);

  // Barra de simulación del Builder: aparece al correr la física (la UI de
  // edición se oculta por CSS) con perspectivas, zoom y la mano interactiva.
  const simBar = new SimulatorBar(ed);

  // Pestañas para plegar/desplegar los paneles en pantallas pequeñas (las
  // muestra el CSS solo cuando los paneles pasan a ser cajones ocultables).
  const dockToggle = (id: string, label: string, cls: string, title: string) => {
    // Vía el() para que el emoji pase por el envoltorio de siluetas (v0.2.3).
    const b = el("button", { class: "dock-toggle" }, [label]);
    b.id = id;
    b.title = title;
    b.addEventListener("click", () => {
      const on = document.body.classList.toggle(cls);
      b.classList.toggle("active", on);
    });
    return b;
  };
  const toggleLeft = dockToggle("toggle-left", "🧩", "show-left", "Ventana de herramientas");
  const togglePoses = dockToggle("toggle-poses", "🧍", "show-poses", "Ventana del maniquí");

  // VENTANA IZQUIERDA APILADA (v0.2.13): UNA sola ventana con el logo y
  // cuatro barras colapsables del mismo estilo que "Piezas disponibles" —
  // Piezas, Propiedades, Conexiones y Arrastre preciso — circunscritas a
  // sus márgenes y con una única barra de deslizamiento. Las pestañas
  // laterales desaparecen; el Toolbox vive en la barra flotante derecha.
  const leftStack = document.createElement("div");
  leftStack.id = "left-stack";

  // La marca corona la ventana (sale de la paleta, que ahora es una barra más).
  const brand = palette.root.querySelector(".brand-header");
  if (brand) {
    const marca = el("div", { class: "panel seccion-brand" }, []);
    marca.append(brand);
    leftStack.append(marca);
  }

  // Sección ARRASTRE PRECISO: su ventana vive dentro de la barra; el título
  // la pliega/despliega activando o desactivando la herramienta.
  const tituloArrastre = el("div", { class: "panel-title" }, [
    tt("Arrastre preciso", "Precise drag"),
  ]);
  const chevArrastre = el("span", { class: "plegar" }, ["▸"]);
  tituloArrastre.append(chevArrastre);
  const seccionArrastre = el("aside", { class: "panel colapsado", id: "sec-arrastre" }, [
    tituloArrastre,
  ]);
  seccionArrastre.append(precise.root);
  tituloArrastre.addEventListener("click", () => precise.toggle());
  precise.onCambio = () => {
    const on = precise.isActiva();
    seccionArrastre.classList.toggle("colapsado", !on);
    chevArrastre.textContent = on ? "▾" : "▸";
  };

  // Paneles plegables desde su título (esquema F4). Propiedades y
  // Conexiones nacen plegadas (antes nacían escondidas en pestañas).
  hacerPlegable(palette.root);
  hacerPlegable(inspector.root, true);
  hacerPlegable(joints.root, true);

  leftStack.append(palette.root, inspector.root, joints.root, seccionArrastre);

  // Barra de herramientas rápidas flotante (v0.2.13): espejo del Toolbox.
  const toolQuick = crearBarraHerramientas(ed);

  // La barra superior puede ocupar VARIAS FILAS (v0.2.13): su altura real
  // se publica como --toolbar-h para que la ventana izquierda empiece justo
  // debajo, sin quedar tapada.
  const altoToolbar = new ResizeObserver(() => {
    document.documentElement.style.setProperty("--toolbar-h", `${toolbar.root.offsetHeight}px`);
  });
  altoToolbar.observe(toolbar.root);

  // La barra de SIMULACIÓN también crece en varias filas al estrecharse la
  // pantalla: su alto real se publica para que las ventanas del costado
  // derecho acaben justo encima de ella y nunca la pisen (v0.2.48).
  const altoSimbar = new ResizeObserver(() => {
    const alto = simBar.root.offsetParent === null ? 0 : simBar.root.offsetHeight;
    document.documentElement.style.setProperty("--simbar-h", `${alto}px`);
  });
  altoSimbar.observe(simBar.root);

  editorNodes = [canvas, leftStack, toolbar.root, articPanel.root, hud.root, perfPanel.root, simBar.root, toggleLeft, togglePoses, zoomBar, toolQuick];
  editorDisposables = [
    () => precise.dispose(),
    () => palette.dispose(),
    () => toolbar.dispose(),
    () => perfPanel.dispose(),
    () => altoToolbar.disconnect(),
    () => altoSimbar.disconnect(),
  ];
  app.append(...editorNodes);

  ed.setMode("translate");
  ed.start();

  (window as unknown as { exersuite: unknown }).exersuite = {
    editor: ed,
    THREE,
    // Utilidades del ciclo de prefabs expuestas en el gancho de depuración
    // (las suites de verificación ejercitan exportar→validar→insertar).
    prefabIO: { serializarPrefab, parsearPrefab },
    // El carril derecho, para que la verificación pueda comprobar que hay UN
    // dueño: quien abre cierra al anterior y cualquiera puede cerrar el que
    // haya (cambiar de herramienta, volver a la Home).
    dialogoDerecha: { abrirDialogoDerecha, cerrarDialogoDerecha, hayDialogoDerecha },
    // Medidas resueltas de la PLACA DENTADA. La prueba tiene que soltar la
    // barra en el CENTRO de la garganta, y ese centro depende de cuentas que
    // no se pueden deducir de los params sueltos. Calcularlas otra vez en el
    // guion de prueba seria copiar la formula: si la formula se equivoca, la
    // copia se equivoca igual y la prueba pasa.
    dentada: { medidas: medidasDentada, pasoMinimo: pasoMinimoDentada },
    // BARRA EN MANOS (v0.2.81): la tabla de ejercicios y los desplazamientos
    // medidos, por lo mismo — que la prueba compare contra la fuente y no
    // contra una copia de los números.
    barra: { ejercicios: EJERCICIOS_BARRA, apoyo: APOYO_RACK },
    // MODELO HORNEADO DE LAS MÁQUINAS (v0.3.2): es lo que enseña la pestaña
    // «Máquinas» de la Biblioteca y lo que se descarga como OBJ/STL. Se expone
    // para que la verificación pueda comparar ese modelo contra la máquina que
    // de verdad se inserta, en vez de mirarlos por separado.
    maquinas: { hornear: hornearMaquina, spec: piezasDeMaquina, lista: STANDARD_MACHINES },
    // EL CATÁLOGO (v0.3.2): la lista curada de piezas y la biblioteca entera.
    // La verificación compara contra ESTO lo que pintan la paleta y la ventana
    // de Biblioteca de modelos, en vez de contra una copia del listado escrita
    // en la prueba —que envejecería sola.
    catalogo: {
      vigente: () => catalogoVigente().map((d) => ({ id: d.id, label: d.label })),
      todas: () => [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY].map((d) => ({
        id: d.id, label: d.label, paleta: d.paleta ?? null,
        // `placement` marca las piezas que son HERRAMIENTA: la verificación
        // comprueba que ninguna de ellas lleve etiqueta de curaduría.
        placement: d.placement ?? null,
      })),
    },
  };
  return ed;
}

function ensureModels(): Promise<void> {
  return Promise.all([
    componentModels.ensureLoaded(),
    figureSegments.ensureLoaded(),
    prefabsMaquina.init(),
  ]).then(() => undefined);
}

async function startNew(ws?: WorkspaceData): Promise<void> {
  const ed = bootEditor();
  await ensureModels();
  ed.clearScene();
  if (ws) {
    ed.setWorkspace(ws, { crearPiezas: true });
    // El canvas completo se aprecia mejor entrando en perspectiva isométrica.
    if (ws.canvas === "completo") ed.setViewPreset("isometrica");
  }
  ed.select(null);
  ed.markClean();
}

async function startWithProject(data: ProjectData, name: string): Promise<void> {
  const ed = bootEditor();
  await ensureModels();
  await ed.loadProject(data);
  try {
    await addRecent(name, data, Date.now());
  } catch {
    /* sin recientes */
  }
}

async function startContinue(): Promise<void> {
  const ed = bootEditor();
  await ensureModels();
  const restored = await ed.restoreAutosave();
  if (!restored) {
    ed.clearScene();
    ed.select(null);
  }
  ed.markClean();
}

/** Vuelve a la Home, sugiriendo guardar si hay cambios. */
async function goHome(): Promise<void> {
  if (editor) {
    if (editor.isDirty()) {
      const choice = await confirmUnsavedChanges();
      if (choice === "cancel") return;
      if (choice === "save") {
        const name = window.prompt(tt("Nombre del proyecto:", "Project name:"), "exersuite3d-proyecto");
        if (name === null) return; // cancela la salida
        const project = editor.serialize();
        const clean = (name.trim() || "exersuite3d-proyecto");
        const file = clean.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "proyecto";
        await descargarArchivo(`${file}.json`, JSON.stringify(project, null, 2), "application/json");
        try {
          await addRecent(clean, project, Date.now());
        } catch {
          /* sin recientes */
        }
      }
    }
    editor.dispose();
    editor = null;
    for (const d of editorDisposables) d();
    editorDisposables = [];
    for (const n of editorNodes) n.remove();
    editorNodes = [];
    document.body.classList.remove(
      "simulator-mode",
      "simulating",
      "show-left",
      "show-poses",
    );
    // No retener el editor destruido desde la consola de depuración.
    (window as unknown as { exersuite?: unknown }).exersuite = undefined;
  }
  // Y el diálogo del costado derecho, que vivía suelto en <body>: sin esto se
  // quedaba flotando sobre la pantalla de inicio hasta recargar.
  cerrarDialogoDerecha();
  showLanding();
}

/** Abre un proyecto SOLO para simularlo (sin herramientas de edición). */
async function startSimulator(data: ProjectData, name: string): Promise<void> {
  const ed = bootEditor({ simulator: true });
  await ensureModels();
  await ed.loadProject(data);
  try {
    await addRecent(name, data, Date.now());
  } catch {
    /* sin recientes */
  }
  // EL ARCHIVO SE ABRE COMO SE GUARDÓ (v0.3.6). Antes el viewer arrancaba la
  // física en cuanto terminaba de cargar, así que lo primero que se veía no
  // era el proyecto sino su simulación: la postura que el diseñador había
  // dejado puesta en el Builder no llegaba a verse nunca. Simular es ahora un
  // gesto —el ▶ de la barra—, como en el Builder.
  ed.setViewPreset("isometrica");
}

/** Abre la biblioteca de repertorio como vista de Home (sin escena de diseño). */
async function startLibrary(): Promise<void> {
  await ensureModels();
  libraryView = new LibraryView(() => {
    libraryView?.dispose();
    libraryView = null;
    showLanding();
  });
  app.append(libraryView.root);
}

function showLanding(): void {
  let hasAutosave = false;
  try {
    hasAutosave = !!localStorage.getItem("exersuite.autosave.v1");
  } catch {
    hasAutosave = false;
  }
  landing = new Landing({
    hasAutosave,
    onNew: () => {
      // Asistente de proyecto nuevo: modo de trabajo + espacio (v0.2.0). Si el
      // usuario cancela, permanece en la Home.
      void elegirWorkspace().then((ws) => {
        if (!ws) return;
        landing?.hide();
        void startNew(ws);
      });
    },
    onOpenFile: async (file) => {
      const sim = landing?.mode === "simulator";
      try {
        const data = JSON.parse(await file.text()) as ProjectData;
        landing?.hide();
        const name = file.name.replace(/\.[^.]+$/, "");
        await (sim ? startSimulator(data, name) : startWithProject(data, name));
      } catch (err) {
        console.error("No se pudo abrir el archivo:", err);
        window.alert(tt("Archivo de proyecto no válido.", "Invalid project file."));
      }
    },
    onOpenRecent: (data, name) => {
      const sim = landing?.mode === "simulator";
      landing?.hide();
      (sim ? startSimulator(data, name) : startWithProject(data, name)).catch((err) => {
        console.error("No se pudo abrir el proyecto reciente:", err);
        window.alert("No se pudo abrir el proyecto reciente.");
      });
    },
    onContinue: () => {
      const sim = landing?.mode === "simulator";
      landing?.hide();
      if (sim) {
        void (async () => {
          const ed = bootEditor({ simulator: true });
          await ensureModels();
          await ed.restoreAutosave();
          // Igual que al abrir un archivo: se muestra el proyecto tal cual,
          // con su maniquí posado, y la física la arranca el ▶ de la barra.
          ed.setViewPreset("isometrica");
        })();
      } else {
        void startContinue();
      }
    },
    onExploreLibrary: () => {
      landing?.hide();
      void startLibrary();
    },
  });
  app.append(landing.root);
}

// Expuesto para depuración en consola.
(window as unknown as {
  exersuiteModels: typeof componentModels;
  exersuiteSegments: typeof figureSegments;
}).exersuiteModels = componentModels;
(window as unknown as { exersuiteSegments: typeof figureSegments }).exersuiteSegments =
  figureSegments;
// Utilidades del ciclo de prefabs v2 (depuración y pruebas automatizadas).
(window as unknown as { exersuitePrefabs: unknown }).exersuitePrefabs = {
  serializarPrefab,
  parsearPrefab,
  prefabDeFabrica,
  prefabsMaquina,
};

showLanding();
