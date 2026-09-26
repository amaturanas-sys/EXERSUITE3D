import type { ProjectData } from "../core/project";
import { version as VERSION_APP } from "../../package.json";
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
import { clear, el, marcarActual } from "./dom";

/** Con qué se abre un proyecto: los tres modos de cada ficha (v0.3.77). */
export type ModoApertura = "builder" | "viewer" | "simulator";

export interface LandingActions {
  onNew: () => void;
  onOpenFile: (file: File, modo: ModoApertura) => void;
  onOpenRecent: (data: ProjectData, name: string, modo: ModoApertura) => void;
  onContinue: (modo: ModoApertura) => void;
  onDeleteRecent: (id: string) => Promise<void>;
  onExploreLibrary: () => void;
  hasAutosave: boolean;
}

type Vista = "instructivo" | "proyectos" | "marketplace" | "settings";

const LEYENDAS: Record<Vista, string> = {
  instructivo:
    "Instructivo: recorrido por las herramientas, los modelos, las funciones y los tipos de archivo.",
  proyectos:
    "Proyectos: crea, abre o continúa. Cada proyecto se abre con BUILDER para construirlo, con VIEWER para mirarlo pieza a pieza o con SIMULAR para correr su física.",
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
  private vista: Vista = "instructivo";

  private contenido: HTMLElement;
  private leyenda: HTMLElement;
  private navBtns = new Map<Vista, HTMLButtonElement>();
  private abrirProyecto: (modo?: ModoApertura) => void;

  constructor(private actions: LandingActions) {
    const base = import.meta.env.BASE_URL;

    // Búsqueda con el selector NATIVO del dispositivo (elige dónde buscar).
    this.abrirProyecto = (modo: ModoApertura = "builder") => {
      void elegirArchivo(".json", "Proyecto EXERSUITE3D (.json)").then((f) => {
        if (f) this.actions.onOpenFile(f, modo);
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
    // CUATRO ACCESOS, Y EL MODO SE ELIGE EN EL PROYECTO (v0.3.77). Antes
    // BUILDER y SIMULADOR eran dos entradas de la Home, así que había que
    // decidir CON QUÉ ibas a abrir antes de saber QUÉ ibas a abrir, y la misma
    // lista de proyectos salía dos veces. Ahora se entra por PROYECTOS y cada
    // ficha ofrece sus tres modos.
    const navDefs: [Vista, string][] = [
      ["instructivo", "📖 INSTRUCTIVO"],
      ["proyectos", "📁 PROYECTOS"],
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
    this.leyenda = el("div", { class: "land-leyenda" }, [LEYENDAS.instructivo]);

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
    this.vista = v;
    // El «aquí estás» no puede ser sólo color (v0.3.78).
    for (const [key, btn] of this.navBtns) marcarActual(btn, key === v);
    this.leyenda.textContent = t(LEYENDAS[v]);
    clear(this.contenido);
    if (v === "proyectos") this.renderProyectos();
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
  /**
   * EL MARKETPLACE TAMBIÉN SE TRAE AL ABRIRLO (v0.3.79): 67 kB del paquete
   * inicial —su catálogo, sus láminas, sus paneles— que sólo ve quien pulsa 🛒.
   */
  private abrirHub(): void {
    const capa = el("div", { class: "hub" });
    document.body.append(capa);
    void import("./marketplace/hub").then(({ renderHub }) => {
      // Si se salió del Marketplace mientras se traía, no se monta nada.
      if (!capa.isConnected) return;
      // El hub devuelve con qué soltarlo (v0.3.78): quitar la capa del DOM no
      // desconecta sus observadores, y cada visita dejaba uno reteniendo el
      // carrusel entero.
      const soltar = renderHub(capa, {
        salir: () => {
          soltar();
          capa.remove();
          this.setVista(this.vista === "marketplace" ? "instructivo" : this.vista);
        },
        verBiblioteca: () => {
          soltar();
          capa.remove();
          this.actions.onExploreLibrary();
        },
      });
    });
  }

  private accion(texto: string, primary: boolean, fn: () => void): HTMLElement {
    const b = el("button", { class: primary ? "land-btn primary" : "land-btn" }, [texto]);
    b.addEventListener("click", fn);
    return b;
  }

  // --------------------------------------------------------- vista Proyectos

  /**
   * LA SECCIÓN DE PROYECTOS (v0.3.77), tal como la pidió el diagrama: arriba
   * lo que se puede hacer —NUEVO, ABRIR, BIBLIOTECA y CONTINUAR— y debajo la
   * lista de proyectos, uno por ficha. El MODO ya no se elige aquí arriba: lo
   * elige cada ficha con sus tres botones, porque lo natural es decidir
   * primero QUÉ se abre y después CON QUÉ.
   */
  private renderProyectos(): void {
    // LOS CUATRO BOTONES, TRADUCIDOS (v0.4.4). Estaban en castellano duro desde
    // que existen; lo que lo destapó fue el desplegable de modos de v0.4.0, que
    // metió el botón dentro de un grupo con etiqueta y lo puso al alcance del
    // barrido de `prueba-ingles`. En inglés se leía «Choose how to open: 📂
    // ABRIR…», o sea la mitad de la frase en cada idioma.
    const acciones = el("div", { class: "land-actions" }, [
      this.accion(tt("✦  NUEVO", "✦  NEW"), true, () => this.actions.onNew()),
      this.conModos(tt("📂  ABRIR…", "📂  OPEN…"), "archivo", (m) => void this.abrirProyecto(m)),
      this.accion(tt("🧩  BIBLIOTECA", "🧩  LIBRARY"), false, () => this.actions.onExploreLibrary()),
    ]);
    if (this.actions.hasAutosave) {
      acciones.append(
        this.conModos(tt("↻  CONTINUAR", "↻  CONTINUE"), "sesion", (m) => this.actions.onContinue(m)),
      );
    }
    acciones.append(
      this.accion(tt("🖼  Capturas", "🖼  Screenshots"), false, () => this.renderCapturas()),
    );
    this.contenido.append(acciones, this.seccionRecientes());
  }

  /**
   * UN BOTÓN CON SUS TRES MODOS (v0.4.0).
   *
   * «Sesión anterior» y «Abrir un archivo» tenían cada uno un BOTÓN arriba y
   * además una FICHA en la lista: la misma acción dos veces en la misma
   * pantalla. Se quitan las fichas —eran la copia— pero no lo que aportaban,
   * que no era poco: eran el único sitio desde donde esas dos cosas podían
   * abrirse en VIEWER o en SIMULAR. Sin ellas, mirar un .json ajeno obligaba a
   * pasar antes por el taller, que es justo lo que v0.3.77 vino a arreglar.
   *
   * Así que el botón se queda con su clic de siempre —el modo taller, que es
   * lo que se quiere nueve de cada diez veces— y al lado lleva una flecha que
   * despliega los tres. Una sola entrada por acción, y ninguna capacidad
   * perdida.
   */
  private conModos(
    texto: string,
    marca: "sesion" | "archivo",
    abrir: (m: ModoApertura) => void,
  ): HTMLElement {
    const principal = this.accion(texto, false, () => abrir("builder"));
    const modos = el("div", { class: `land-modos-inline ${marca}`, hidden: true }, [
      ...(["builder", "viewer", "simulator"] as ModoApertura[]).map((m) => {
        const b = el("button", { class: "land-modo" }, [
          m === "builder" ? "BUILDER" : m === "viewer" ? "VIEWER" : "SIMULAR",
        ]);
        b.addEventListener("click", () => abrir(m));
        return b;
      }),
    ]);
    const flecha = el("button", {
      class: `land-desplegar ${marca}`,
      type: "button",
      "aria-expanded": "false",
      "aria-label": tt(`Elegir con qué abrir: ${texto.trim()}`, `Choose how to open: ${texto.trim()}`),
    }, ["▾"]);
    flecha.addEventListener("click", () => {
      const abierto = flecha.getAttribute("aria-expanded") === "true";
      flecha.setAttribute("aria-expanded", String(!abierto));
      modos.hidden = abierto;
    });
    return el("div", { class: "land-accion-doble" }, [
      el("div", { class: "land-accion-fila" }, [principal, flecha]),
      modos,
    ]);
  }

  /** Galería de capturas tomadas en el Simulador (📷). */
  private renderCapturas(): void {
    clear(this.contenido);
    const volver = this.accion("← Volver", false, () => this.setVista("proyectos"));
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
        // CADA CAPTURA SE DISTINGUE DE LA DE AL LADO (v0.3.78). Antes las diez
        // se anunciaban «captura», y sus botones ⬇ y ✕ eran idénticos entre sí:
        // no había forma de saber cuál se estaba borrando. La fecha ya estaba a
        // mano, se usaba dos líneas más abajo para el nombre del archivo.
        const cuando = new Date(cap.tomadaEn).toLocaleString();
        const img = el("img", {
          src: cap.dataUrl,
          alt: tt(`Captura del ${cuando}`, `Screenshot from ${cuando}`),
        });
        const dl = el("button", {
          class: "tool",
          title: tt(`Descargar la captura del ${cuando}`, `Download the screenshot from ${cuando}`),
          "aria-label": tt(`Descargar la captura del ${cuando}`, `Download the screenshot from ${cuando}`),
        }, ["⬇"]);
        dl.addEventListener("click", () => {
          const b64 = cap.dataUrl.split(",")[1];
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          void descargarArchivo(`exersuite3d-captura-${cap.tomadaEn}.png`, bytes, "image/png");
        });
        const del = el("button", {
          class: "tool danger",
          title: tt(`Borrar la captura del ${cuando}`, `Delete the screenshot from ${cuando}`),
          "aria-label": tt(`Borrar la captura del ${cuando}`, `Delete the screenshot from ${cuando}`),
        }, ["✕"]);
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

  /**
   * EL INSTRUCTIVO SE TRAE AL ABRIRLO (v0.3.79), no al arrancar la app. Son
   * 39 kB del paquete inicial que sólo mira quien pulsa 📖, y esto es una
   * pantalla completa: el retardo de traerla no se nota.
   */
  private renderInstructivoVista(): void {
    const cuerpo = el("div", { class: "instr-cuerpo land-instr-embed" });
    this.contenido.append(cuerpo);
    void import("./Instructivo").then(({ renderInstructivo }) => {
      // Si mientras se traía se cambió de sección, no se pinta encima.
      if (this.vista === "instructivo") renderInstructivo(cuerpo);
    });
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
      el("div", { class: "land-aside-title" }, ["Proyectos"]),
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
    // LA LISTA ES SÓLO DE PROYECTOS (v0.4.0). «Sesión anterior» y «Abrir un
    // archivo» tenían aquí una ficha CADA UNA además de su botón arriba, así
    // que las dos acciones salían por duplicado en la misma pantalla. Se
    // quedan los botones de arriba, que es donde el ojo los busca.
    if (!recents.length) {
      destino.append(
        el("div", { class: "land-empty" }, [
          "Aún no hay proyectos. Crea uno nuevo o abre un archivo.",
        ]),
      );
      return;
    }
    for (const r of recents) {
      destino.append(this.fichaDeProyecto(r, destino));
    }
  }

  /**
   * LA FICHA DE UN PROYECTO (v0.3.77): su nombre, su fecha, la X para
   * eliminarlo y sus TRES MODOS.
   *
   * Los tres abren el MISMO archivo y se diferencian en lo que dejan hacer:
   *
   *   · BUILDER — el taller entero, con sus herramientas;
   *   · VIEWER  — mirar y orbitar, con el despiece de la máquina pieza a
   *               pieza y las medidas del conjunto;
   *   · SIMULAR — correr la física, sin herramientas de edición.
   */
  private fichaDeProyecto(r: RecentMeta, lista: HTMLElement): HTMLElement {
    const abrir = (modo: ModoApertura) => async (): Promise<void> => {
      const data = await getRecent(r.id);
      if (data) this.actions.onOpenRecent(data, r.name, modo);
    };
    const modo = (texto: string, titulo: string, m: ModoApertura): HTMLElement => {
      const b = el("button", { class: "land-modo", title: titulo }, [texto]);
      b.addEventListener("click", () => void abrir(m)());
      return b;
    };
    // LA X BORRA, PERO NO A LA PRIMERA. Un proyecto es trabajo de horas y la
    // X está al lado de los botones que lo abren: se pregunta antes.
    const borrar = el("button", {
      class: "land-borrar",
      title: tt("Eliminar este proyecto", "Delete this project"),
    }, ["✕"]);
    borrar.addEventListener("click", (e) => {
      e.stopPropagation();
      const seguro = window.confirm(
        tt(`¿Eliminar «${r.name}»? No se puede deshacer.`, `Delete "${r.name}"? This cannot be undone.`),
      );
      if (!seguro) return;
      void this.actions.onDeleteRecent(r.id).then(() => void this.loadRecent(lista));
    });

    // LA FOTO DEL PROYECTO (v0.4.0), como en el esquema: la ficha de una
    // máquina se reconoce por su forma mucho antes que por su nombre. La toma
    // el editor al guardar; si un proyecto es viejo y no tiene, queda un hueco
    // con su inicial en vez de una imagen rota.
    const foto = r.foto
      ? el("img", {
          class: "land-foto",
          src: r.foto,
          alt: tt(`Vista del proyecto ${r.name}`, `View of project ${r.name}`),
          loading: "lazy",
          decoding: "async",
        })
      : el("div", { class: "land-foto vacia", "aria-hidden": "true" }, [
          (r.name || "?").trim().charAt(0).toUpperCase(),
        ]);

    return el("div", { class: "land-ficha" }, [
      foto,
      el("div", { class: "land-ficha-cab" }, [
        el("div", { class: "land-recent-name" }, [r.name]),
        borrar,
      ]),
      el("div", { class: "land-recent-date" }, [formatDate(r.savedAt)]),
      el("div", { class: "land-ficha-modos" }, [
        modo("BUILDER", tt("Abrir en el taller, con todas las herramientas", "Open in the workshop, with every tool"), "builder"),
        modo("VIEWER", tt("Mirar la máquina y su despiece, pieza a pieza", "Look at the machine and its parts, one by one"), "viewer"),
        modo("SIMULAR", tt("Correr la física del proyecto", "Run the project's physics"), "simulator"),
      ]),
    ]);
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
