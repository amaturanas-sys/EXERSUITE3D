import { el, prepararModal } from "./dom";

export type SaveChoice = "save" | "discard" | "cancel";

/**
 * Diálogo modal de "cambios sin guardar" con tres opciones. Devuelve la elección
 * del usuario. Usado al volver a la Home desde un proyecto con cambios.
 */
export function confirmUnsavedChanges(): Promise<SaveChoice> {
  return new Promise((resolve) => {
    let done = false;
    let soltarFoco: (() => void) | null = null;
    const finish = (choice: SaveChoice) => {
      if (done) return;
      done = true;
      overlay.remove();
      soltarFoco?.();
      resolve(choice);
    };

    const saveBtn = el("button", { class: "land-btn primary" }, ["Guardar y salir"]);
    saveBtn.addEventListener("click", () => finish("save"));
    const discardBtn = el("button", { class: "land-btn" }, ["Salir sin guardar"]);
    discardBtn.addEventListener("click", () => finish("discard"));
    const cancelBtn = el("button", { class: "land-btn ghost" }, ["Cancelar"]);
    cancelBtn.addEventListener("click", () => finish("cancel"));

    const titulo = el("div", { class: "confirm-title" }, ["Cambios sin guardar"]);
    const dialog = el("div", { class: "confirm-dialog" }, [
      titulo,
      el("div", { class: "confirm-text" }, [
        "Tienes cambios en el proyecto actual. ¿Quieres guardarlos antes de volver a la pantalla de inicio?",
      ]),
      el("div", { class: "confirm-actions" }, [saveBtn, discardBtn, cancelBtn]),
    ]);
    const overlay = el("div", { class: "confirm-overlay" }, [dialog]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish("cancel");
    });
    document.getElementById("app")?.append(overlay);
    // El foco arranca en «Cancelar»: de las tres, es la que no hace nada
    // irreversible si se pulsa Intro por inercia.
    soltarFoco = prepararModal(dialog, titulo, cancelBtn, () => finish("cancel"));
  });
}
