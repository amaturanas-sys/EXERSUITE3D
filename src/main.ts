import "./ui/styles.css";
import * as THREE from "three";
import { Editor } from "./core/Editor";
import { ComponentPalette } from "./ui/ComponentPalette";
import { Toolbar } from "./ui/Toolbar";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { MeasurementHUD } from "./ui/MeasurementHUD";

const app = document.getElementById("app")!;

const canvas = document.createElement("canvas");
canvas.id = "viewport";
app.append(canvas);

const editor = new Editor(canvas);

// Paneles de interfaz.
const palette = new ComponentPalette(editor);
const toolbar = new Toolbar(editor);
const inspector = new PropertiesPanel(editor);
const hud = new MeasurementHUD(editor);
app.append(palette.root, toolbar.root, inspector.root, hud.root);

editor.setMode("translate");
editor.start();

// Escena de bienvenida: una base + pilar para mostrar el espacio de trabajo.
const base = editor.addComponent("base-soporte");
base.mesh.position.set(0, 3, 0);
const pilar = editor.addComponent("pilar");
pilar.mesh.position.set(-25, 100, 0);
editor.select(null);

// Expone el editor para depuracion en consola.
(window as unknown as { exersuite: { editor: Editor; THREE: typeof THREE } }).exersuite = {
  editor,
  THREE,
};
