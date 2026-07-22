import "./ui/styles.css";
import { descargarArchivo } from "./core/descargas";
import { el } from "./ui/dom";
import * as THREE from "three";
import { Editor } from "./core/Editor";
import { ComponentPalette } from "./ui/ComponentPalette";
import { Toolbar } from "./ui/Toolbar";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { JointsPanel } from "./ui/JointsPanel";
import { PosePanel } from "./ui/PosePanel";
import { MeasurementHUD } from "./ui/MeasurementHUD";
import { PerformancePanel } from "./ui/PerformancePanel";
import { SimulatorBar } from "./ui/SimulatorBar";
import { PreciseDrag } from "./ui/PreciseDrag";
import { Landing } from "./ui/Landing";
import { LibraryView } from "./ui/LibraryView";
import { confirmUnsavedChanges } from "./ui/confirmDialog";
import { componentModels } from "./core/componentModels";
import { figureSegments } from "./core/figureSegments";
import { addRecent } from "./core/recentStore";
import { elegirWorkspace } from "./ui/WizardNuevo";
import type { ProjectData, WorkspaceData } from "./core/project";
import { tt } from "./core/i18n";
import { instalarSonidoUI } from "./ui/sonido";

const app = document.getElementById("app")!;
// Detalle estético (v0.2.3): todos los botones hacen "click" al tocarlos.
instalarSonidoUI();

/**
 * Panel plegable (F4 v0.2.0): tocar su título lo colapsa a solo la cabecera
 * (y lo reexpande), en cualquier tamaño de pantalla.
 */
function hacerPlegable(panel: HTMLElement): void {
  const title = panel.querySelector(".panel-title");
  if (!title) return;
  const chev = document.createElement("span");
  chev.className = "plegar";
  chev.textContent = "▾";
  title.append(chev);
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
    // Modo SIMULADOR: solo el viewport y la barra de simulación. No se
    // construye ninguna herramienta de edición (paneles, paleta, inspector…):
    // mostrar un proyecto no las necesita y serían un gasto de recursos.
    document.body.classList.add("simulator-mode");
    const simBar = new SimulatorBar(ed, { standalone: true, onHome: () => void goHome() });
    ed.bus.on("simulationChanged", ({ running }) => {
      document.body.classList.toggle("simulating", running);
    });
    editorNodes = [canvas, simBar.root];
    editorDisposables = [];
    app.append(simBar.root);
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

  // PESTAÑAS LATERALES (v0.2.3): Propiedades, Conexiones y Arrastre preciso
  // se muestran on demand desde etiquetas verticales en el costado izquierdo
  // — un click abre la ventana, otro click la esconde.
  const tabStrip = document.createElement("div");
  tabStrip.id = "tab-strip";
  const mkTab = (etiqueta: string, isOn: () => boolean, alternar: () => void) => {
    const b = document.createElement("button");
    b.className = "side-tab";
    b.textContent = etiqueta;
    b.classList.toggle("active", isOn());
    b.addEventListener("click", () => {
      alternar();
      b.classList.toggle("active", isOn());
    });
    return b;
  };
  // Las tres ventanas arrancan ESCONDIDAS: se llaman desde sus pestañas.
  const tabProp = mkTab(
    tt("Propiedades", "Properties"),
    () => document.body.classList.contains("show-prop"),
    () => document.body.classList.toggle("show-prop"),
  );
  const tabConx = mkTab(
    tt("Conexiones", "Connections"),
    () => document.body.classList.contains("show-conx"),
    () => document.body.classList.toggle("show-conx"),
  );
  const tabArr = mkTab(
    tt("Arrastre preciso", "Precise drag"),
    () => precise.isActiva(),
    () => precise.toggle(),
  );
  precise.onCambio = () => tabArr.classList.toggle("active", precise.isActiva());
  tabStrip.append(tabProp, tabConx, tabArr);
  const inspector = new PropertiesPanel(ed);
  const joints = new JointsPanel(ed);
  const posePanel = new PosePanel(ed);
  const hud = new MeasurementHUD(ed);

  const rightDock = document.createElement("div");
  rightDock.id = "right-dock";
  rightDock.append(inspector.root, joints.root);

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
  const toggleLeft = dockToggle("toggle-left", "🧩", "show-left", "Piezas disponibles");
  const toggleRight = dockToggle("toggle-right", "🧰", "show-right", "Propiedades y conexiones");
  const togglePoses = dockToggle("toggle-poses", "🧍", "show-poses", "Posturas del maniquí");

  // Paneles plegables desde su título (esquema F4).
  for (const p of [palette.root, inspector.root, joints.root, posePanel.root]) hacerPlegable(p);

  editorNodes = [canvas, palette.root, toolbar.root, rightDock, posePanel.root, hud.root, perfPanel.root, simBar.root, toggleLeft, toggleRight, togglePoses, zoomBar, precise.root, tabStrip];
  editorDisposables = [
    () => precise.dispose(),
    () => palette.dispose(),
    () => toolbar.dispose(),
    () => perfPanel.dispose(),
  ];
  app.append(...editorNodes);

  ed.setMode("translate");
  ed.start();

  (window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
    editor: ed,
    THREE,
  };
  return ed;
}

function ensureModels(): Promise<void> {
  return Promise.all([componentModels.ensureLoaded(), figureSegments.ensureLoaded()]).then(
    () => undefined,
  );
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
      "show-right",
      "show-poses",
    );
    // No retener el editor destruido desde la consola de depuración.
    (window as unknown as { exersuite?: unknown }).exersuite = undefined;
  }
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
  await ed.toggleSimulation();
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
          await ed.toggleSimulation();
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

showLanding();
