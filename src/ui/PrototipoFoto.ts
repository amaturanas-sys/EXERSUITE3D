import type { Editor } from "../core/Editor";
import type { HerramientaRapida } from "../core/Editor";
import { guardarCaptura } from "../core/capturas";
import { descargarArchivo } from "../core/descargas";
import { tt } from "../core/i18n";
import { el } from "./dom";

/**
 * PROTOTIPO CON FOTO (v0.2.16): simulador de la estética y disposición del
 * espacio con FOTOGRAFÍAS del usuario como referencia, CIRCUNSCRITO A SU
 * PROPIA INSTANCIA DE VISOR — se entra con 📸 Prototipo (barra superior del
 * Builder) y toda la interfaz de edición desaparece: solo el visor, la
 * órbita y esta ventana de controles. El Builder no carga ninguna sección
 * extra. El flujo, en cinco pasos:
 *  1. El área de trabajo se configura con las dimensiones del lugar REAL
 *     (planta libre o parámetros digitales) — es lo que hace coincidir la
 *     escala del prototipo con la superficie verdadera.
 *  2. El usuario compone su espacio colocando y armando los modelos.
 *  3. Al cargar la fotografía se entra en MODO CALCE: la foto se ubica
 *     DEBAJO del render dinámico, cuyo fondo se elimina (como pantalla
 *     verde) pero cuyo SUELO se preserva — orbitando se busca el punto de
 *     coincidencia entre el suelo del área de trabajo y el de la foto.
 *  4. La perspectiva se FIJA (la órbita queda bloqueada) y con el selector
 *     circular del SOL se arrastra la luz para que las sombras hagan
 *     sentido con la fotografía.
 *  5. La foto se PRODUCE por capas: fondo = fotografía del usuario; encima,
 *     la captura del suelo (vestido de goma tipo caucho con el logotipo
 *     discretamente impreso) con los modelos y las sombras que proyectan.
 */
export class PrototipoFoto {
  /** Ventana flotante del visor de prototipo (solo visible en el modo). */
  readonly root: HTMLElement;
  /** Fotografía del usuario, ubicada DEBAJO del render dinámico. */
  readonly overlay: HTMLImageElement;

  private foto: HTMLImageElement | null = null;
  private opacidadRender = 75;
  private activo = false;
  /** Herramienta del Builder a restaurar al salir del visor. */
  private herramientaPrevia: HerramientaRapida = "seleccion";
  private readonly bFijar: HTMLElement;
  private readonly dialSol: HTMLElement;
  private readonly slider: HTMLInputElement;
  /**
   * Desplazamiento de la FOTO de fondo (px CSS, v0.2.26): las fotos pueden
   * estar tomadas desde una altura distinta a la del visor 3D — arrastrarla
   * permite calzar mejor la perspectiva. Se replica en la producción.
   */
  private fotoDX = 0;
  private fotoDY = 0;
  /**
   * ZOOM de la FOTO de fondo (v0.2.29): además de moverla, se acerca o aleja
   * — con pinza de dos dedos, rueda del ratón o el control fino del panel —
   * para que su escala case con la del render. Se replica en la producción.
   */
  private fotoEscala = 1;
  private readonly bMoverFoto: HTMLElement;
  private readonly zoomFoto: HTMLInputElement;
  private readonly filaZoom: HTMLElement;
  private capaArrastre: HTMLElement | null = null;
  /** Perilla de inclinación del modelo (visible con la perspectiva fijada). */
  private readonly dialInclinacion: HTMLElement;
  private readonly lecturaInclinacion: HTMLElement;
  private readonly filaInclinacion: HTMLElement;
  private ponerAgujaInclinacion: (grados: number) => void = () => {};

  constructor(
    private editor: Editor,
    private opts: { onSalir?: () => void } = {},
  ) {
    this.overlay = document.createElement("img");
    this.overlay.id = "proto-overlay";
    this.overlay.alt = "";
    this.overlay.style.display = "none";

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.foto = img;
          thumb.src = img.src;
          thumb.style.display = "block";
          this.overlay.src = img.src;
          this.ponerEncuadreFoto(0, 0, 1); // foto nueva: centrada y a escala 1
          if (this.activo) this.entrarCalce();
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(f);
    });

    const bFoto = el("button", { class: "tool proto-btn" }, [
      tt("📁 Cargar foto del lugar", "📁 Load a photo of the place"),
    ]);
    bFoto.addEventListener("click", () => input.click());

    const thumb = document.createElement("img");
    thumb.className = "proto-thumb";
    thumb.alt = "";
    thumb.style.display = "none";

    // Transparencia del RENDER durante el calce: deja ver la foto de abajo
    // a través del suelo y los modelos mientras se busca la coincidencia.
    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.min = "20";
    this.slider.max = "100";
    this.slider.step = "1";
    this.slider.value = String(this.opacidadRender);
    this.slider.title = tt("Opacidad del render sobre la foto", "Render opacity over the photo");
    this.slider.addEventListener("input", () => {
      this.opacidadRender = +this.slider.value;
      this.aplicarOpacidad();
    });

    // Mover y ESCALAR la FOTO de fondo (v0.2.26 · zoom v0.2.29): el toggle
    // superpone una capa que captura el gesto — arrastrar la desplaza y la
    // PINZA de dos dedos (o la rueda del ratón) la acerca y aleja — para
    // calzar la perspectiva cuando la foto fue tomada desde otra altura o
    // con otra distancia focal. Doble toque sobre la capa la recentra.
    this.bMoverFoto = el("button", { class: "tool proto-btn" }, [
      tt("🖐 Mover y escalar foto", "🖐 Move & scale photo"),
    ]);
    this.bMoverFoto.addEventListener("click", () => {
      if (this.capaArrastre) this.terminarArrastreFoto();
      else this.iniciarArrastreFoto();
    });

    // Control fino del zoom de la foto (el gesto de pinza lo mueve también).
    this.zoomFoto = document.createElement("input");
    this.zoomFoto.type = "range";
    this.zoomFoto.min = "30";
    this.zoomFoto.max = "300";
    this.zoomFoto.step = "1";
    this.zoomFoto.value = "100";
    this.zoomFoto.title = tt("Zoom de la fotografía", "Photo zoom");
    this.zoomFoto.addEventListener("input", () => {
      this.ponerEncuadreFoto(this.fotoDX, this.fotoDY, +this.zoomFoto.value / 100);
    });
    this.filaZoom = el("div", { class: "proto-fila" }, [
      el("span", { class: "proto-etiqueta" }, [tt("Zoom foto", "Photo zoom")]),
      this.zoomFoto,
    ]);

    // Paso 4: fijar la perspectiva encontrada (bloquea la órbita).
    this.bFijar = el("button", { class: "tool proto-btn" }, [
      tt("📌 Fijar perspectiva", "📌 Lock perspective"),
    ]);
    this.bFijar.addEventListener("click", () => {
      const on = !this.editor.isOrbitaBloqueada();
      this.editor.setOrbitaBloqueada(on);
      this.bFijar.classList.toggle("active", on);
      this.dialSol.classList.toggle("proto-oculto", !on);
      // Con la perspectiva fijada aparece la PERILLA DE INCLINACIÓN: es el
      // ajuste fino que hace coincidir el plano del suelo del modelo con el
      // de la fotografía (la órbita ya no puede moverlo).
      this.dialInclinacion.classList.toggle("proto-oculto", !on);
      this.filaInclinacion.classList.toggle("proto-oculto", !on);
      if (on) {
        this.sincronizarInclinacion();
        this.opacidadRender = 100;
        this.slider.value = "100";
        this.aplicarOpacidad();
      }
    });

    // Selector circular del SOL: arrastra ☀ alrededor del área para elegir
    // desde dónde viene la luz (las sombras siguen al instante).
    const sol = el("div", { class: "proto-sol" }, ["☀"]);
    this.dialSol = el("div", { class: "proto-dial proto-oculto" }, [
      el("div", { class: "proto-dial-centro" }, ["🏋"]),
      sol,
    ]);
    let azimut = 33; // posición inicial coherente con la luz de fábrica
    const ponerSol = (): void => {
      const rad = (azimut * Math.PI) / 180;
      const R = 42; // % del radio del dial
      sol.style.left = `${50 + R * Math.sin(rad)}%`;
      sol.style.top = `${50 - R * Math.cos(rad)}%`;
    };
    ponerSol();
    const arrastrarSol = (ev: PointerEvent): void => {
      const r = this.dialSol.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      azimut = (Math.atan2(dx, -dy) * 180) / Math.PI;
      ponerSol();
      this.editor.setSolAzimut(azimut);
    };
    this.dialSol.addEventListener("pointerdown", (ev) => {
      this.dialSol.setPointerCapture(ev.pointerId);
      arrastrarSol(ev);
      const mover = (e: PointerEvent): void => arrastrarSol(e);
      const soltar = (): void => {
        this.dialSol.removeEventListener("pointermove", mover);
        this.dialSol.removeEventListener("pointerup", soltar);
      };
      this.dialSol.addEventListener("pointermove", mover);
      this.dialSol.addEventListener("pointerup", soltar);
    });

    // PERILLA DE INCLINACIÓN (v0.2.29): con la perspectiva fijada, gira el
    // punto de vista en vertical — el modelo se inclina — hasta que el plano
    // del suelo del render calza EXACTAMENTE con el de la fotografía. No
    // toca el azimut ni la distancia: solo el ángulo sobre el suelo.
    const aguja = el("div", { class: "proto-aguja" }, []);
    this.dialInclinacion = el("div", { class: "proto-dial proto-perilla proto-oculto" }, [
      el("div", { class: "proto-dial-centro" }, ["📐"]),
      aguja,
    ]);
    this.lecturaInclinacion = el("span", { class: "proto-lectura" }, ["—"]);
    const ponerAguja = (grados: number): void => {
      // 0° (a ras del suelo) a la derecha; 90° (cenital) arriba.
      aguja.style.transform = `rotate(${-grados}deg)`;
      this.lecturaInclinacion.textContent = `${Math.round(grados)}°`;
    };
    this.ponerAgujaInclinacion = ponerAguja;
    const arrastrarInclinacion = (ev: PointerEvent): void => {
      const r = this.dialInclinacion.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      // Ángulo del puntero respecto del eje horizontal (hacia arriba, +).
      const grados = Math.max(1, Math.min(89, (Math.atan2(-dy, Math.abs(dx)) * 180) / Math.PI));
      this.editor.setInclinacionVista(grados);
      ponerAguja(grados);
    };
    this.dialInclinacion.addEventListener("pointerdown", (ev) => {
      this.dialInclinacion.setPointerCapture(ev.pointerId);
      arrastrarInclinacion(ev);
      const mover = (e: PointerEvent): void => arrastrarInclinacion(e);
      const soltar = (): void => {
        this.dialInclinacion.removeEventListener("pointermove", mover);
        this.dialInclinacion.removeEventListener("pointerup", soltar);
      };
      this.dialInclinacion.addEventListener("pointermove", mover);
      this.dialInclinacion.addEventListener("pointerup", soltar);
    });
    // Ajuste fino de a 0,5° con los cursores (calce exacto del suelo).
    const paso = (d: number) => {
      const b = el("button", { class: "tool proto-mini" }, [d < 0 ? "−" : "+"]);
      b.addEventListener("click", () => {
        const g = this.editor.getInclinacionVista() + d;
        this.editor.setInclinacionVista(g);
        this.sincronizarInclinacion();
      });
      return b;
    };
    this.filaInclinacion = el("div", { class: "proto-fila proto-oculto" }, [
      el("span", { class: "proto-etiqueta" }, [tt("Inclinación", "Tilt")]),
      paso(-0.5),
      this.lecturaInclinacion,
      paso(0.5),
    ]);

    const bProducir = el("button", { class: "tool proto-btn primario" }, [
      tt("🎞 Producir fotografía", "🎞 Produce the photo"),
    ]);
    bProducir.addEventListener("click", () => {
      if (!this.foto) return;
      void this.producir().then((ok) => {
        bProducir.replaceChildren(
          ok ? tt("✓ Prototipo guardado", "✓ Prototype saved") : tt("✗ No se pudo", "✗ Failed"),
        );
        setTimeout(() => {
          bProducir.replaceChildren(tt("🎞 Producir fotografía", "🎞 Produce the photo"));
        }, 1800);
      });
    });

    // Cabecera del visor: identidad + salida de vuelta al Builder.
    const bVolver = el("button", { class: "tool", title: tt("Volver al Builder", "Back to the Builder") }, [
      tt("⌂ Volver", "⌂ Back"),
    ]);
    bVolver.addEventListener("click", () => {
      this.desactivar();
      this.opts.onSalir?.();
    });

    this.root = el("aside", { id: "proto-viewer" }, [
      el("div", { class: "proto-head" }, [
        el("span", { class: "proto-titulo" }, [tt("📸 Prototipo con foto", "📸 Photo prototype")]),
        bVolver,
      ]),
      el("div", { class: "proto-body" }, [
        el("div", { class: "proto-ayuda" }, [
          tt(
            "Compón tu espacio en el Builder con las dimensiones del lugar REAL y entra aquí: carga la foto (queda DEBAJO del render, sin fondo y con suelo), orbita hasta calzar ambos suelos — con 🖐 la mueves y le haces zoom (pinza o rueda) si fue tomada desde otra altura o distancia —, fija la perspectiva, afina el calce del suelo con la perilla 📐 de inclinación, arrastra el ☀ y produce la fotografía.",
            "Compose your space in the Builder at the REAL room's dimensions, then: load the photo (it sits UNDER the render — no background, floor kept), orbit until both floors match — use 🖐 to move and zoom it (pinch or wheel) if it was shot from another height or distance —, lock the perspective, fine-tune the floor match with the 📐 tilt knob, drag the ☀ and produce the photo.",
          ),
        ]),
        bFoto,
        thumb,
        el("div", { class: "proto-fila" }, [
          el("span", { class: "proto-etiqueta" }, [tt("Render", "Render")]),
          this.slider,
        ]),
        this.bMoverFoto,
        this.filaZoom,
        this.bFijar,
        this.filaInclinacion,
        this.dialInclinacion,
        this.dialSol,
        bProducir,
        input,
      ]),
    ]);
  }

  /** Entra a la INSTANCIA DE VISOR: interfaz de edición fuera, solo órbita. */
  activar(): void {
    if (this.activo) return;
    this.activo = true;
    this.editor.select(null);
    this.herramientaPrevia = this.editor.getHerramienta();
    this.editor.setHerramienta("orbitar");
    document.body.classList.add("modo-prototipo");
    if (this.foto) this.entrarCalce();
  }

  /** Sale del visor y restaura el Builder tal como estaba. */
  desactivar(): void {
    if (!this.activo) return;
    this.activo = false;
    this.salirCalce();
    this.bFijar.classList.remove("active");
    this.dialSol.classList.add("proto-oculto");
    document.body.classList.remove("modo-prototipo");
    this.editor.setHerramienta(this.herramientaPrevia);
  }

  isActivo(): boolean {
    return this.activo;
  }

  /** Paso 3: foto debajo, fondo del render fuera, suelo de caucho, sombras. */
  private entrarCalce(): void {
    this.overlay.style.display = "block";
    this.overlay.classList.add("detras");
    document.body.classList.add("modo-calce");
    this.editor.setModoCalce(true);
    this.aplicarOpacidad();
  }

  private salirCalce(): void {
    this.terminarArrastreFoto();
    this.overlay.style.display = "none";
    this.overlay.classList.remove("detras");
    document.body.classList.remove("modo-calce");
    this.editor.setModoCalce(false);
    this.canvasEl().style.opacity = "";
  }

  /** Aplica el encuadre de la foto (desplazamiento px CSS + escala). */
  private ponerEncuadreFoto(dx: number, dy: number, escala: number): void {
    this.fotoDX = dx;
    this.fotoDY = dy;
    this.fotoEscala = Math.min(3, Math.max(0.3, escala));
    this.overlay.style.transform = `translate(${dx}px, ${dy}px) scale(${this.fotoEscala})`;
    this.zoomFoto.value = String(Math.round(this.fotoEscala * 100));
  }

  /** Zoom de la foto ANCLADO a un punto de pantalla (pinza y rueda). */
  private zoomFotoEn(factor: number, cx: number, cy: number): void {
    const nueva = Math.min(3, Math.max(0.3, this.fotoEscala * factor));
    const k = nueva / this.fotoEscala;
    if (k === 1) return;
    // El punto bajo los dedos (o el puntero) se queda quieto: la foto crece
    // en torno a él, como en cualquier visor de imágenes.
    const r = this.canvasEl().getBoundingClientRect();
    const ox = r.left + r.width / 2 + this.fotoDX;
    const oy = r.top + r.height / 2 + this.fotoDY;
    this.ponerEncuadreFoto(
      this.fotoDX + (ox - cx) * (k - 1),
      this.fotoDY + (oy - cy) * (k - 1),
      nueva,
    );
  }

  /** Activa la capa de gesto de la foto (por encima del render). */
  private iniciarArrastreFoto(): void {
    if (this.capaArrastre || !this.foto) return;
    const capa = document.createElement("div");
    capa.id = "proto-drag";
    capa.title = tt(
      "Arrastra para mover la foto · pinza o rueda para el zoom · doble toque recentra",
      "Drag to move the photo · pinch or wheel to zoom · double-tap recenters",
    );
    // Punteros activos: 1 = arrastre; 2 = PINZA (mueve y escala a la vez).
    const activos = new Map<number, { x: number; y: number }>();
    const centro = (): { x: number; y: number } => {
      const p = [...activos.values()];
      return {
        x: p.reduce((s, q) => s + q.x, 0) / p.length,
        y: p.reduce((s, q) => s + q.y, 0) / p.length,
      };
    };
    const separacion = (): number => {
      const p = [...activos.values()];
      return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    };
    capa.addEventListener("pointerdown", (ev) => {
      capa.setPointerCapture(ev.pointerId);
      activos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    });
    capa.addEventListener("pointermove", (ev) => {
      const prev = activos.get(ev.pointerId);
      if (!prev) return;
      const antes = centro();
      const sepAntes = separacion();
      activos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const ahora = centro();
      // El centro del gesto arrastra la foto…
      this.ponerEncuadreFoto(
        this.fotoDX + ahora.x - antes.x,
        this.fotoDY + ahora.y - antes.y,
        this.fotoEscala,
      );
      // …y la separación de los dedos la escala en torno a ese centro.
      const sep = separacion();
      if (activos.size >= 2 && sepAntes > 10 && sep > 10) {
        this.zoomFotoEn(sep / sepAntes, ahora.x, ahora.y);
      }
    });
    const soltar = (ev: PointerEvent): void => {
      activos.delete(ev.pointerId);
    };
    capa.addEventListener("pointerup", soltar);
    capa.addEventListener("pointercancel", soltar);
    // Rueda del ratón / trackpad: zoom fino en el escritorio.
    capa.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        this.zoomFotoEn(ev.deltaY < 0 ? 1.06 : 1 / 1.06, ev.clientX, ev.clientY);
      },
      { passive: false },
    );
    capa.addEventListener("dblclick", () => this.ponerEncuadreFoto(0, 0, 1));
    document.body.append(capa);
    this.capaArrastre = capa;
    this.bMoverFoto.classList.add("active");
  }

  /** Pone la perilla y la lectura al ángulo real de la cámara. */
  private sincronizarInclinacion(): void {
    this.ponerAgujaInclinacion(this.editor.getInclinacionVista());
  }

  /** Quita la capa de arrastre (la órbita vuelve a mandar sobre el visor). */
  private terminarArrastreFoto(): void {
    this.capaArrastre?.remove();
    this.capaArrastre = null;
    this.bMoverFoto.classList.remove("active");
  }

  private canvasEl(): HTMLElement {
    return document.getElementById("viewport") ?? document.body;
  }

  private aplicarOpacidad(): void {
    if (this.foto) this.canvasEl().style.opacity = String(this.opacidadRender / 100);
  }

  /**
   * Paso 5 — PRODUCCIÓN por capas: fondo = fotografía del usuario (encuadre
   * cover); encima, la captura del render con fondo transparente — el suelo
   * de caucho con el logotipo, los modelos y sus sombras. La opacidad de
   * trabajo no afecta al PNG (se lee el lienzo real, no el CSS).
   */
  private async producir(): Promise<boolean> {
    if (!this.foto) return false;
    const estaba = this.editor.isModoCalce();
    if (!estaba) this.editor.setModoCalce(true);
    const dataUrl = this.editor.captureViewportPNG();
    if (!estaba) this.editor.setModoCalce(false);

    const render = await cargarImagen(dataUrl);
    const W = render.naturalWidth;
    const H = render.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return false;

    const fw = this.foto.naturalWidth;
    const fh = this.foto.naturalHeight;
    const k = Math.max(W / fw, H / fh);
    // El desplazamiento del calce (px CSS del visor) se lleva a la escala
    // real del PNG para que la producción coincida con lo que se ve.
    const vp = this.canvasEl().getBoundingClientRect();
    const esc = vp.width > 0 ? W / vp.width : 1;
    // El zoom del calce escala la foto EN TORNO AL CENTRO del encuadre, igual
    // que el `transform: scale()` del overlay, y el desplazamiento se aplica
    // después — así el PNG reproduce exactamente lo que se ve.
    const z = this.fotoEscala;
    const dw = fw * k * z;
    const dh = fh * k * z;
    ctx.drawImage(
      this.foto,
      (W - dw) / 2 + this.fotoDX * esc,
      (H - dh) / 2 + this.fotoDY * esc,
      dw,
      dh,
    );
    ctx.drawImage(render, 0, 0);

    const compuesta = cv.toDataURL("image/png");
    try {
      await guardarCaptura(compuesta);
      const base64 = compuesta.split(",")[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      await descargarArchivo(`exersuite3d-prototipo-${Date.now()}.png`, bytes, "image/png");
      return true;
    } catch (err) {
      console.error("No se pudo producir el prototipo:", err);
      return false;
    }
  }

  dispose(): void {
    this.desactivar();
    this.overlay.remove();
  }
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
