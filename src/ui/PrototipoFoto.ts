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
  private readonly bMoverFoto: HTMLElement;
  private capaArrastre: HTMLElement | null = null;

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
          this.ponerOffsetFoto(0, 0); // foto nueva: encuadre centrado
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

    // Mover la FOTO de fondo (v0.2.26): el toggle superpone una capa que
    // captura el arrastre y desplaza la fotografía — para calzar la
    // perspectiva cuando la foto fue tomada desde otra altura. Doble toque
    // sobre la capa recentra la foto.
    this.bMoverFoto = el("button", { class: "tool proto-btn" }, [
      tt("🖐 Mover foto", "🖐 Move photo"),
    ]);
    this.bMoverFoto.addEventListener("click", () => {
      if (this.capaArrastre) this.terminarArrastreFoto();
      else this.iniciarArrastreFoto();
    });

    // Paso 4: fijar la perspectiva encontrada (bloquea la órbita).
    this.bFijar = el("button", { class: "tool proto-btn" }, [
      tt("📌 Fijar perspectiva", "📌 Lock perspective"),
    ]);
    this.bFijar.addEventListener("click", () => {
      const on = !this.editor.isOrbitaBloqueada();
      this.editor.setOrbitaBloqueada(on);
      this.bFijar.classList.toggle("active", on);
      this.dialSol.classList.toggle("proto-oculto", !on);
      if (on) {
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
            "Compón tu espacio en el Builder con las dimensiones del lugar REAL y entra aquí: carga la foto (queda DEBAJO del render, sin fondo y con suelo), orbita hasta calzar ambos suelos — y si la foto fue tomada desde otra altura, muévela con 🖐 —, fija la perspectiva, arrastra el ☀ y produce la fotografía.",
            "Compose your space in the Builder at the REAL room's dimensions, then: load the photo (it sits UNDER the render — no background, floor kept), orbit until both floors match — and drag the photo with 🖐 if it was shot from a different height —, lock the perspective, drag the ☀ and produce the photo.",
          ),
        ]),
        bFoto,
        thumb,
        el("div", { class: "proto-fila" }, [
          el("span", { class: "proto-etiqueta" }, [tt("Render", "Render")]),
          this.slider,
        ]),
        this.bMoverFoto,
        this.bFijar,
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

  /** Aplica el desplazamiento de la foto (px CSS) al overlay. */
  private ponerOffsetFoto(dx: number, dy: number): void {
    this.fotoDX = dx;
    this.fotoDY = dy;
    this.overlay.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
  }

  /** Activa la capa de arrastre de la foto (por encima del render). */
  private iniciarArrastreFoto(): void {
    if (this.capaArrastre || !this.foto) return;
    const capa = document.createElement("div");
    capa.id = "proto-drag";
    capa.title = tt(
      "Arrastra para mover la foto · doble toque recentra",
      "Drag to move the photo · double-tap recenters",
    );
    let ultX = 0;
    let ultY = 0;
    let arrastrando = false;
    capa.addEventListener("pointerdown", (ev) => {
      capa.setPointerCapture(ev.pointerId);
      arrastrando = true;
      ultX = ev.clientX;
      ultY = ev.clientY;
    });
    capa.addEventListener("pointermove", (ev) => {
      if (!arrastrando) return;
      this.ponerOffsetFoto(this.fotoDX + ev.clientX - ultX, this.fotoDY + ev.clientY - ultY);
      ultX = ev.clientX;
      ultY = ev.clientY;
    });
    capa.addEventListener("pointerup", () => {
      arrastrando = false;
    });
    capa.addEventListener("dblclick", () => this.ponerOffsetFoto(0, 0));
    document.body.append(capa);
    this.capaArrastre = capa;
    this.bMoverFoto.classList.add("active");
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
    ctx.drawImage(
      this.foto,
      (W - fw * k) / 2 + this.fotoDX * esc,
      (H - fh * k) / 2 + this.fotoDY * esc,
      fw * k,
      fh * k,
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
