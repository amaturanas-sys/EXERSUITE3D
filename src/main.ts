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

const app = document.getElementById("app")!;

const canvas = document.createElement("canvas");
canvas.id = "viewport";
app.append(canvas);

const editor = new Editor(canvas);

// Paneles de interfaz.
const palette = new ComponentPalette(editor);
const library = new LibraryWindow(editor);
const toolbar = new Toolbar(editor, () => library.toggle());
const inspector = new PropertiesPanel(editor);
const joints = new JointsPanel(editor);
const posePanel = new PosePanel(editor);
const hud = new MeasurementHUD(editor);

// Columna derecha: inspector (arriba) + conexiones (abajo).
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

// Restaura la última sesión autoguardada; si no hay, monta la escena de bienvenida.
void (async () => {
  // Modelos de componente, antes de restaurar la escena para que las piezas
  // usen el modelo en vez de la primitiva. Primero los definidos por archivo
  // (carpeta public/models/components/) y luego los de usuario (Biblioteca),
  // que tienen prioridad.
  await editor.loadFileComponentModels();
  await editor.loadComponentModels();
  const restored = await editor.restoreAutosave();
  if (!restored) {
    // Escena de bienvenida: una base + pilar para mostrar el espacio de trabajo.
    const base = editor.addComponent("base-soporte");
    base.mesh.position.set(0, 3, 0);
    const pilar = editor.addComponent("pilar");
    pilar.mesh.position.set(-25, 100, 0);
    editor.select(null);
  }
})();

// Expone el editor para depuracion en consola.
(window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
  editor,
  THREE,
};
