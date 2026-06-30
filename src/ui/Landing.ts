import type { ProjectData } from "../core/project";
import { getRecent, listRecent, type RecentMeta } from "../core/recentStore";
import { clear, el } from "./dom";

export interface LandingActions {
  onNew: () => void;
  onOpenFile: (file: File) => void;
  onOpenRecent: (data: ProjectData, name: string) => void;
  onContinue: () => void;
  hasAutosave: boolean;
}

/**
 * Pantalla de inicio (launcher) ligera que se muestra antes de inicializar el
 * editor 3D, para no consumir recursos (WebGL/física) hasta que el usuario
 * elige qué hacer: nuevo, abrir archivo o un proyecto reciente.
 */
export class Landing {
  readonly root: HTMLElement;
  private recentList: HTMLElement;
  private fileInput: HTMLInputElement;

  constructor(private actions: LandingActions) {
    const base = import.meta.env.BASE_URL;

    this.fileInput = el("input", { type: "file", accept: ".json,application/json" });
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => {
      const f = this.fileInput.files?.[0];
      if (f) this.actions.onOpenFile(f);
    });

    const logo = el("img", { class: "land-logo", src: `${base}brand/logo-full-light.png`, alt: "EXERSUITE3D" });

    const tagline = el("div", { class: "land-tagline" }, [
      "Diseño y simulación 3D de máquinas de gimnasio",
    ]);

    const newBtn = el("button", { class: "land-btn primary" }, ["✦  Crear nuevo proyecto"]);
    newBtn.addEventListener("click", () => this.actions.onNew());

    const openBtn = el("button", { class: "land-btn" }, ["📂  Abrir archivo…"]);
    openBtn.addEventListener("click", () => this.fileInput.click());

    const actionsRow = el("div", { class: "land-actions" }, [newBtn, openBtn]);
    if (this.actions.hasAutosave) {
      const cont = el("button", { class: "land-btn ghost" }, ["↻  Continuar sesión anterior"]);
      cont.addEventListener("click", () => this.actions.onContinue());
      actionsRow.append(cont);
    }

    const dedication = el("div", { class: "land-dedication" }, ["…"]);
    void this.loadDedication(dedication, `${base}dedicatoria.txt`);

    const left = el("div", { class: "land-main" }, [
      el("div", { class: "land-brand" }, [logo, tagline]),
      actionsRow,
      dedication,
      this.fileInput,
    ]);

    this.recentList = el("div", { class: "land-recent-list" }, [
      el("div", { class: "land-empty" }, ["Cargando…"]),
    ]);
    const aside = el("aside", { class: "land-aside" }, [
      el("div", { class: "land-aside-title" }, ["Proyectos recientes"]),
      this.recentList,
    ]);

    this.root = el("div", { class: "landing" }, [
      el("div", { class: "land-grid" }, [left, aside]),
    ]);

    void this.loadRecent();
  }

  hide(): void {
    this.root.remove();
  }

  private async loadDedication(box: HTMLElement, url: string): Promise<void> {
    let text = "";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) text = (await res.text()).trim();
    } catch {
      /* sin dedicatoria */
    }
    clear(box);
    if (!text) {
      box.remove();
      return;
    }
    box.append(el("div", { class: "land-dedication-label" }, ["Dedicatoria"]));
    for (const para of text.split(/\n\s*\n/)) {
      box.append(el("p", {}, [para.trim()]));
    }
  }

  private async loadRecent(): Promise<void> {
    let recents: RecentMeta[];
    try {
      recents = await listRecent();
    } catch {
      recents = [];
    }
    clear(this.recentList);
    if (!recents.length) {
      this.recentList.append(
        el("div", { class: "land-empty" }, [
          "Aún no hay proyectos. Crea uno nuevo o abre un archivo.",
        ]),
      );
      return;
    }
    for (const r of recents) {
      const item = el("button", { class: "land-recent" }, [
        el("div", { class: "land-recent-name" }, [r.name]),
        el("div", { class: "land-recent-date" }, [formatDate(r.savedAt)]),
      ]);
      item.addEventListener("click", async () => {
        const data = await getRecent(r.id);
        if (data) this.actions.onOpenRecent(data, r.name);
      });
      this.recentList.append(item);
    }
  }
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
