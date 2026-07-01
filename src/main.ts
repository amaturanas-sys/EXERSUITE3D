import "./ui/styles.css";
import * as THREE from "three";
import { Editor } from "./core/Editor";
import { ComponentPalette } from "./ui/ComponentPalette";
import { Toolbar } from "./ui/Toolbar";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { JointsPanel } from "./ui/JointsPanel";
import { PosePanel } from "./ui/PosePanel";
import { MeasurementHUD } from "./ui/MeasurementHUD";
import { PerformancePanel } from "./ui/PerformancePanel";
import { Landing } from "./ui/Landing";
import { LibraryView } from "./ui/LibraryView";
import { confirmUnsavedChanges } from "./ui/confirmDialog";
import { componentModels } from "./core/componentModels";
import { addRecent } from "./core/recentStore";
import type { ProjectData } from "./core/project";

const app = document.getElementById("app")!;

let editor: Editor | null = null;
let editorNodes: HTMLElement[] = [];
let landing: Landing | null = null;
let libraryView: LibraryView | null = null;

/**
 * Construye el editor 3D y su interfaz. Se difiere hasta que el usuario elige
 * una acción, y se destruye por completo al volver a la Home (para trabajar en
 * varios proyectos de forma secuencial sin acumular recursos).
 */
function bootEditor(): Editor {
  const canvas = document.createElement("canvas");
  canvas.id = "viewport";
  app.append(canvas);

  const ed = new Editor(canvas);
  editor = ed;

  const palette = new ComponentPalette(ed);
  const perfPanel = new PerformancePanel(ed);
  const toolbar = new Toolbar(ed, {
    onHome: () => void goHome(),
    onPerformance: () => perfPanel.toggle(),
  });
  const inspector = new PropertiesPanel(ed);
  const joints = new JointsPanel(ed);
  const posePanel = new PosePanel(ed);
  const hud = new MeasurementHUD(ed);

  const rightDock = document.createElement("div");
  rightDock.id = "right-dock";
  rightDock.append(inspector.root, joints.root);

  const credit = document.createElement("a");
  credit.id = "credit";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.href = "https://anatomytool.org/content/open3dmodel-skeleton-english-labels";
  credit.textContent =
    "Esqueleto: Open3DModel · O.P. Gobée et al., LUMC (AnatomyTOOL) · CC BY-SA";
  credit.style.display = "none";

  editorNodes = [canvas, palette.root, toolbar.root, rightDock, posePanel.root, hud.root, credit, perfPanel.root];
  app.append(...editorNodes);

  ed.bus.on("humanFigureChanged", ({ present, mode }) => {
    credit.style.display = present && mode === "skeleton" ? "block" : "none";
  });

  ed.setMode("translate");
  ed.start();

  (window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
    editor: ed,
    THREE,
  };
  return ed;
}

function ensureModels(): Promise<void> {
  return componentModels.ensureLoaded();
}

async function startNew(): Promise<void> {
  const ed = bootEditor();
  await ensureModels();
  ed.clearScene();
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
        const name = window.prompt("Nombre del proyecto:", "exersuite3d-proyecto");
        if (name === null) return; // cancela la salida
        const project = editor.serialize();
        const clean = (name.trim() || "exersuite3d-proyecto");
        const file = clean.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "proyecto";
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file}.json`;
        a.click();
        URL.revokeObjectURL(url);
        try {
          await addRecent(clean, project, Date.now());
        } catch {
          /* sin recientes */
        }
      }
    }
    editor.dispose();
    editor = null;
    for (const n of editorNodes) n.remove();
    editorNodes = [];
  }
  showLanding();
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
      landing?.hide();
      void startNew();
    },
    onOpenFile: async (file) => {
      try {
        const data = JSON.parse(await file.text()) as ProjectData;
        landing?.hide();
        await startWithProject(data, file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        console.error("No se pudo abrir el archivo:", err);
        window.alert("Archivo de proyecto no válido.");
      }
    },
    onOpenRecent: (data, name) => {
      landing?.hide();
      void startWithProject(data, name);
    },
    onContinue: () => {
      landing?.hide();
      void startContinue();
    },
    onExploreLibrary: () => {
      landing?.hide();
      void startLibrary();
    },
  });
  app.append(landing.root);
}

showLanding();
