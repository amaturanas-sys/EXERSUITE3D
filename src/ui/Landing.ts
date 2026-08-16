import type { ProjectData } from "../core/project";
import { version as VERSION_APP } from "../../package.json";
import { renderInstructivo } from "./Instructivo";
import { renderHub } from "./marketplace/hub";
import { descargarArchivo, elegirArchivo } from "../core/descargas";
import { getRecent, listRecent, type RecentMeta } from "../core/recentStore";
import { borrarCaptura, listarCapturas } from "../core/capturas";
import {
  applyPreset,
  getPerf,
  setPerf,
  type PerfPreset,
  type PerfSettings,
} from "../core/performance";
import { getIdioma, setIdioma, t, tt } from "../core/i18n";
import { SITIO_WEB, SITIO_WEB_VISIBLE, sitioWebConIdioma } from "../core/sitio";
import { clear, el } from "./dom";

export interface LandingActions {
  onNew: () => void;
  onOpenFile: (file: File) => void;
  onOpenRecent: (data: ProjectData, name: string) => void;
  onContinue: () => void;
  onExploreLibrary: () => void;
  hasAutosave: boolean;
}

type Vista = "builder" | "simulator" | "instructivo" | "marketplace" | "settings";

const LEYENDAS: Record<Vista, string> = {
  builder:
    "Builder: el taller completo — construye máquinas desde piezas, edita con precisión y guarda tus proyectos.",
  simulator:
    "Simulador: abre un proyecto solo para correr su física e interactuar con él, sin herramientas de edición.",
  instructivo:
    "Instructivo: recorrido por las herramientas, los modelos, las funciones y los tipos de archivo.",
  marketplace:
    "Marketplace (maqueta): hub de usuarios, makers y marcas — recién llegadas, estrenos, economía local, vitrina digital, foro maker, encargos e incorporación de marcas.",
  settings: "Ajustes: calidad gráfica y rendimiento; se aplican al abrir un proyecto.",
};

/**
 * Pantalla de inicio en maestro-detalle (esquema v0.2.0): logotipo + cuatro
 * accesos (BUILDER, SIMULADOR, INSTRUCTIVO, SETTINGS) a la izquierda y un
 * panel de contenido que cambia según el modo, con leyenda contextual.
 * Ligera: el editor 3D no se inicializa hasta elegir qué hacer.
 */
export class Landing {
  readonly root: HTMLElement;
  /** Modo de apertura del editor (lo consulta main.ts al abrir proyectos). */
  mode: "builder" | "simulator" = "builder";

  private contenido: HTMLElement;
  private leyenda: HTMLElement;
  private navBtns = new Map<Vista, HTMLButtonElement>();
  private abrirProyecto: () => void;

  constructor(private actions: LandingActions) {
    const base = import.meta.env.BASE_URL;

    // Búsqueda con el selector NATIVO del dispositivo (elige dónde buscar).
    this.abrirProyecto = () => {
      void elegirArchivo(".json", "Proyecto EXERSUITE3D (.json)").then((f) => {
        if (f) this.actions.onOpenFile(f);
      });
    };

    const logo = el("img", {
      class: "land-logo",
      src: `${base}brand/logo-full-light.png`,
      alt: "EXERSUITE3D",
    });
    const tagline = el("div", { class: "land-tagline" }, [
      "Diseño y simulación 3D de máquinas de gimnasio",
    ]);

    // ---- Navegación (los cuatro accesos del esquema)
    const nav = el("nav", { class: "land-nav" });
    // El INSTRUCTIVO va primero (v0.2.3): es la puerta de entrada, en
    // formato de preguntas frecuentes.
    const navDefs: [Vista, string][] = [
      ["instructivo", "📖 INSTRUCTIVO"],
      ["builder", "🛠 BUILDER"],
      ["simulator", "▶ SIMULADOR"],
      ["marketplace", "🛒 MARKETPLACE"],
      ["settings", "⚙ SETTINGS"],
    ];
    for (const [vista, etiqueta] of navDefs) {
      const b = el("button", { class: "land-nav-item" }, [etiqueta]);
      b.addEventListener("click", () => this.setVista(vista));
      this.navBtns.set(vista, b);
      nav.append(b);
    }

    this.contenido = el("div", { class: "land-content" });
    this.leyenda = el("div", { class: "land-leyenda" }, [LEYENDAS.builder]);

    const dedication = el("div", { class: "land-dedication" }, ["…"]);
    void this.loadDedication(dedication, `${base}dedicatoria.txt`);

    // Pie de la Home (v0.2.3): versión instalada, crédito y canal de soporte.
    const soporte = el("a", { class: "land-soporte", href: "mailto:amaturanas@uft.edu" }, [
      "amaturanas@uft.edu",
    ]);
    const pie = el("div", { class: "land-footer" }, [
      el("div", {}, [`EXERSUITE3D v${VERSION_APP}`]),
      el("div", {}, ["Brought to you by A. Maturana Steinbrugge"]),
      el("div", {}, [el("span", {}, ["Dudas y soporte técnico: "]), soporte]),
      this.filaDelSitio(),
    ]);

    this.root = el("div", { class: "landing" }, [
      el("div", { class: "land-grid2" }, [
        el("div", { class: "land-col-nav" }, [
          el("div", { class: "land-brand" }, [logo, tagline]),
          nav,
          dedication,
          pie,
        ]),
        el("div", { class: "land-col-content" }, [this.contenido, this.leyenda]),
      ]),
    ]);

    this.setVista("instructivo");
  }

  hide(): void {
    this.root.remove();
  }

  /**
   * ENLACE AL SITIO DEL PROYECTO (v0.2.50).
   *
   * La dirección se muestra ESCRITA, no escondida tras un «aquí»: en el
   * empaquetado de escritorio la ventana puede negarse a abrir una pestaña
   * nueva y en la tablet el enlace sale al navegador del sistema, así que
   * quien lo lea siempre puede teclearlo o copiarlo. El botón de copiar es
   * la red de seguridad de esos casos.
   */
  private filaDelSitio(): HTMLElement {
    const enlace = el(
      "a",
      {
        class: "land-soporte",
        href: sitioWebConIdioma(),
        target: "_blank",
        rel: "noopener noreferrer",
        title: tt(
          "Página del proyecto: novedades, descargas y la historia detrás de EXERSUITE3D",
          "Project page: news, downloads and the story behind EXERSUITE3D",
        ),
      },
      [SITIO_WEB_VISIBLE],
    );
    const copiar = el("button", {
      class: "land-copiar",
      title: tt("Copiar la dirección", "Copy the address"),
    }, ["⧉"]);
    copiar.addEventListener("click", () => {
      void navigator.clipboard
        ?.writeText(SITIO_WEB)
        .then(() => {
          copiar.textContent = "✓";
          setTimeout(() => (copiar.textContent = "⧉"), 1400);
        })
        .catch(() => {
          /* sin portapapeles: la dirección se lee en pantalla */
        });
    });
    return el("div", { class: "land-sitio" }, [
      el("span", {}, [tt("Sitio del proyecto: ", "Project site: ")]),
      enlace,
      copiar,
    ]);
  }

  // ------------------------------------------------------------- navegación

  private setVista(v: Vista): void {
    this.mode = v === "simulator" ? "simulator" : "builder";
    for (const [key, btn] of this.navBtns) btn.classList.toggle("active", key === v);
    this.leyenda.textContent = t(LEYENDAS[v]);
    clear(this.contenido);
    if (v === "builder") this.renderBuilder();
    else if (v === "simulator") this.renderSimulador();
    else if (v === "instructivo") this.renderInstructivoVista();
    else if (v === "marketplace") this.abrirHub();
    else this.renderSettings();
  }

  /**
   * EL HUB, A PANTALLA COMPLETA (v0.2.62).
   *
   * La tienda no comparte marco con el editor: la maqueta del diseñador tiene
   * cabecera propia y no lleva la navegación lateral, así que se monta sobre
   * toda la ventana y se sale con un botón fijo que devuelve a la Home.
   */
  private abrirHub(): void {
    const capa = el("div", { class: "hub" });
    renderHub(capa, {
      salir: () => {
        capa.remove();
        this.setVista("instructivo");
      },
      verBiblioteca: () => {
        capa.remove();
        this.actions.onExploreLibrary();
      },
    });
    document.body.append(capa);
  }

  private accion(texto: string, primary: boolean, fn: () => void): HTMLElement {
    const b = el("button", { class: primary ? "land-btn primary" : "land-btn" }, [texto]);
    b.addEventListener("click", fn);
    return b;
  }

  // ----------------------------------------------------------- vista Builder

  private renderBuilder(): void {
    const acciones = el("div", { class: "land-actions" }, [
      this.accion("✦  Crear nuevo proyecto", true, () => this.actions.onNew()),
      this.accion("📂  Abrir archivo…", false, () => this.abrirProyecto()),
      this.accion("🧩  Explorar biblioteca", false, () => this.actions.onExploreLibrary()),
    ]);
    if (this.actions.hasAutosave) {
      acciones.append(
        this.accion("↻  Continuar sesión anterior", false, () => this.actions.onContinue()),
      );
    }
    this.contenido.append(acciones, this.seccionRecientes());
  }

  // --------------------------------------------------------- vista Simulador

  private renderSimulador(): void {
    const acciones = el("div", { class: "land-actions" }, [
      this.accion("📂  Simular archivo…", true, () => this.abrirProyecto()),
      this.accion("🖼  Capturas", false, () => this.renderCapturas()),
    ]);
    if (this.actions.hasAutosave) {
      acciones.append(this.accion("↻  Sesión anterior", false, () => this.actions.onContinue()));
    }
    this.contenido.append(acciones, this.seccionRecientes());
  }

  /** Galería de capturas tomadas en el Simulador (📷). */
  private renderCapturas(): void {
    clear(this.contenido);
    const volver = this.accion("← Volver", false, () => this.setVista("simulator"));
    const titulo = el("div", { class: "land-aside-title" }, ["Capturas del Simulador"]);
    const grid = el("div", { class: "land-caps" }, [
      el("div", { class: "land-empty" }, ["Cargando…"]),
    ]);
    this.contenido.append(el("div", { class: "land-actions" }, [volver]), titulo, grid);

    void (async () => {
      const caps = await listarCapturas().catch(() => []);
      clear(grid);
      if (!caps.length) {
        grid.append(
          el("div", { class: "land-empty" }, [
            "Aún no hay capturas. En el Simulador, usa el botón 📷 Captura.",
          ]),
        );
        return;
      }
      for (const cap of caps) {
        const img = el("img", { src: cap.dataUrl, alt: "captura" });
        const dl = el("button", { class: "tool", title: "Descargar" }, ["⬇"]);
        dl.addEventListener("click", () => {
          const b64 = cap.dataUrl.split(",")[1];
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          void descargarArchivo(`exersuite3d-captura-${cap.tomadaEn}.png`, bytes, "image/png");
        });
        const del = el("button", { class: "tool danger", title: "Borrar" }, ["✕"]);
        del.addEventListener("click", () => {
          void borrarCaptura(cap.id).then(() => this.renderCapturas());
        });
        grid.append(
          el("div", { class: "land-cap" }, [img, el("div", { class: "land-cap-acts" }, [dl, del])]),
        );
      }
    })();
  }

  // ------------------------------------------------------- vista Instructivo

  private renderInstructivoVista(): void {
    const cuerpo = el("div", { class: "instr-cuerpo land-instr-embed" });
    renderInstructivo(cuerpo);
    this.contenido.append(cuerpo);
  }

  // ---------------------------------------------------------- vista Settings

  private renderSettings(): void {
    const fila = (etiqueta: string, control: HTMLElement) =>
      el("label", { class: "land-set-fila" }, [el("span", {}, [etiqueta]), control]);

    // Presets Bajo / Medio / Alto (como el esquema)
    const presetRow = el("div", { class: "land-actions" });
    const marcar = (activo: PerfPreset) => {
      presetRow.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("primary", (b as HTMLElement).dataset.preset === activo);
      });
    };
    for (const p of ["bajo", "medio", "alto"] as const) {
      const b = el("button", { class: "land-btn" }, [p[0].toUpperCase() + p.slice(1)]);
      b.dataset.preset = p;
      b.addEventListener("click", () => {
        applyPreset(p);
        marcar(p);
        pintarDetalles();
      });
      presetRow.append(b);
    }
    marcar(getPerf().preset);

    const detalles = el("div", { class: "land-settings" });
    const pintarDetalles = () => {
      clear(detalles);
      const s = getPerf();
      const toggle = (
        texto: string,
        valor: boolean,
        aplicar: (v: boolean) => Partial<PerfSettings>,
      ) => {
        const cb = el("input", { type: "checkbox" });
        cb.checked = valor;
        cb.addEventListener("change", () => {
          setPerf({ ...getPerf(), preset: "custom", ...aplicar(cb.checked) });
          marcar("custom");
        });
        return fila(texto, cb);
      };
      const res = el("select", {});
      for (const [lbl, val] of [
        ["Mínima (×0.5)", 0.5],
        ["Muy baja (×0.75)", 0.75],
        ["Baja (×1)", 1],
        ["Media (×1.25)", 1.25],
        ["Alta (×1.5)", 1.5],
        ["Máxima (×2)", 2],
      ] as [string, number][]) {
        const o = el("option", { value: String(val) }, [lbl]);
        if (Math.abs(s.maxPixelRatio - val) < 0.001) o.selected = true;
        res.append(o);
      }
      res.addEventListener("change", () => {
        setPerf({ ...getPerf(), preset: "custom", maxPixelRatio: parseFloat(res.value) });
        marcar("custom");
      });
      detalles.append(
        fila("Resolución de render", res),
        toggle("Sombras", s.shadows, (v) => ({ shadows: v })),
        toggle("Sombras suaves", s.softShadows, (v) => ({ softShadows: v })),
        toggle("Reflejos de entorno", s.environment, (v) => ({ environment: v })),
        toggle("Antialias (suavizado)", s.antialias, (v) => ({ antialias: v })),
        toggle("Sombreado simple (sin PBR)", s.simpleShading, (v) => ({ simpleShading: v })),
        toggle("Resolución dinámica", s.dynamicResolution, (v) => ({ dynamicResolution: v })),
      );
    };
    pintarDetalles();

    // Idioma de la interfaz (v0.2.1): cambiarlo recarga la app.
    const idioma = el("select", {}, [
      el("option", { value: "es" }, ["Español"]),
      el("option", { value: "en" }, ["English"]),
    ]) as HTMLSelectElement;
    idioma.value = getIdioma();
    idioma.addEventListener("change", () => {
      setIdioma(idioma.value === "en" ? "en" : "es");
    });

    this.contenido.append(
      el("div", { class: "land-aside-title" }, ["Idioma / Language"]),
      el("div", { class: "land-settings" }, [fila("Idioma / Language", idioma)]),
      el("div", { class: "land-aside-title" }, ["Calidad gráfica"]),
      presetRow,
      detalles,
      el("div", { class: "land-empty" }, [
        "Los ajustes se guardan en este dispositivo y se aplican al abrir un proyecto.",
      ]),
    );
  }

  // ------------------------------------------------------------- recientes

  private seccionRecientes(): HTMLElement {
    const lista = el("div", { class: "land-recent-list" }, [
      el("div", { class: "land-empty" }, ["Cargando…"]),
    ]);
    void this.loadRecent(lista);
    return el("div", { class: "land-recientes" }, [
      el("div", { class: "land-aside-title" }, ["Proyectos recientes"]),
      lista,
    ]);
  }

  private async loadRecent(destino: HTMLElement): Promise<void> {
    let recents: RecentMeta[];
    try {
      recents = await listRecent();
    } catch {
      recents = [];
    }
    clear(destino);
    if (!recents.length) {
      destino.append(
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
      destino.append(item);
    }
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
    box.append(el("div", { class: "land-dedication-label" }, ["Nuestra historia"]));
    // Bloques [Idioma] con un párrafo por línea. Si existe el bloque del
    // idioma activo de la interfaz, se muestra SOLO ese (la historia completa
    // en tu idioma); si no, se apilan todos.
    const bloques: { lang: string | null; parrafos: string[] }[] = [];
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.trim().split("\n");
      const m = lines[0].match(/^\[(.+)\]$/);
      const parrafos = (m ? lines.slice(1) : lines).map((l) => l.trim()).filter(Boolean);
      if (parrafos.length) bloques.push({ lang: m ? m[1] : null, parrafos });
    }
    const preferido = getIdioma() === "en" ? "english" : "español";
    const propio = bloques.find((b) => b.lang?.toLowerCase() === preferido);
    const mostrar = propio ? [propio] : bloques;
    for (const b of mostrar) {
      if (!propio && b.lang) box.append(el("div", { class: "land-ded-lang" }, [b.lang]));
      for (const p of b.parrafos) box.append(el("p", {}, [p]));
    }
  }
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
