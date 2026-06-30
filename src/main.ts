import "./ui/styles.css";
import * as THREE from "three";
import { Editor } from "./core/Editor";
import { ComponentPalette } from "./ui/ComponentPalette";
import { Toolbar } from "./ui/Toolbar";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { JointsPanel } from "./ui/JointsPanel";
import { PosePanel } from "./ui/PosePanel";
import { MeasurementHUD } from "./ui/MeasurementHUD";
import { LibraryWindow } from "./ui/LibraryWindow";
import { Landing } from "./ui/Landing";
import { addRecent } from "./core/recentStore";
import type { ProjectData } from "./core/project";

const app = document.getElementById("app")!;

let editor: Editor | null = null;
let libraryWin: LibraryWindow | null = null;

/**
 * Inicializa el editor 3D y toda la interfaz (solo la primera vez). Se difiere
 * hasta que el usuario elige una acción en la pantalla de inicio, para no gastar
 * recursos (WebGL/física) al arrancar.
 */
function bootEditor(): Editor {
  if (editor) return editor;

  const canvas = document.createElement("canvas");
  canvas.id = "viewport";
  app.append(canvas);

  editor = new Editor(canvas);

  const palette = new ComponentPalette(editor);
  const library = new LibraryWindow(editor);
  libraryWin = library;
  const toolbar = new Toolbar(editor, () => library.toggle());
  const inspector = new PropertiesPanel(editor);
  const joints = new JointsPanel(editor);
  const posePanel = new PosePanel(editor);
  const hud = new MeasurementHUD(editor);

  const rightDock = document.createElement("div");
  rightDock.id = "right-dock";
  rightDock.append(inspector.root, joints.root);

  // Crédito de atribución del esqueleto (CC BY-SA), visible solo al mostrarlo.
  const credit = document.createElement("a");
  credit.id = "credit";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.href = "https://anatomytool.org/content/open3dmodel-skeleton-english-labels";
  credit.textContent =
    "Esqueleto: Open3DModel · O.P. Gobée et al., LUMC (AnatomyTOOL) · CC BY-SA";
  credit.style.display = "none";

  app.append(palette.root, toolbar.root, rightDock, posePanel.root, hud.root, credit, library.root);

  editor.bus.on("humanFigureChanged", ({ present, mode }) => {
    credit.style.display = present && mode === "skeleton" ? "block" : "none";
  });

  editor.setMode("translate");
  editor.start();

  (window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
    editor,
    THREE,
  };
  return editor;
}

/** Carga los modelos de componente (archivo + usuario) una sola vez. */
let modelsLoaded: Promise<void> | null = null;
function ensureModels(ed: Editor): Promise<void> {
  if (!modelsLoaded) {
    modelsLoaded = (async () => {
      await ed.loadFileComponentModels();
      await ed.loadComponentModels();
    })();
  }
  return modelsLoaded;
}

async function startNew(): Promise<void> {
  const ed = bootEditor();
  await ensureModels(ed);
  ed.clearScene();
  ed.select(null);
}

async function startWithProject(data: ProjectData, name: string): Promise<void> {
  const ed = bootEditor();
  await ensureModels(ed);
  await ed.loadProject(data);
  try {
    await addRecent(name, data, Date.now());
  } catch {
    /* sin recientes */
  }
}

async function startContinue(): Promise<void> {
  const ed = bootEditor();
  await ensureModels(ed);
  const restored = await ed.restoreAutosave();
  if (!restored) {
    ed.clearScene();
    ed.select(null);
  }
}

/** Abre directamente la biblioteca sobre una escena vacía (sin cargar proyecto). */
async function startLibrary(): Promise<void> {
  const ed = bootEditor();
  await ensureModels(ed);
  ed.clearScene();
  ed.select(null);
  libraryWin?.show();
}

// Pantalla de inicio (no inicializa WebGL hasta elegir una acción).
let hasAutosave = false;
try {
  hasAutosave = !!localStorage.getItem("exersuite.autosave.v1");
} catch {
  hasAutosave = false;
}

const landing = new Landing({
  hasAutosave,
  onNew: () => {
    landing.hide();
    void startNew();
  },
  onOpenFile: async (file) => {
    try {
      const data = JSON.parse(await file.text()) as ProjectData;
      landing.hide();
      await startWithProject(data, file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      console.error("No se pudo abrir el archivo:", err);
      window.alert("Archivo de proyecto no válido.");
    }
  },
  onOpenRecent: (data, name) => {
    landing.hide();
    void startWithProject(data, name);
  },
  onContinue: () => {
    landing.hide();
    void startContinue();
  },
  onExploreLibrary: () => {
    landing.hide();
    void startLibrary();
  },
});
app.append(landing.root);
