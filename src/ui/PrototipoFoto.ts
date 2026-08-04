import type { Editor } from "../core/Editor";
import { guardarCaptura } from "../core/capturas";
import { descargarArchivo } from "../core/descargas";
import { tt } from "../core/i18n";
import { el } from "./dom";

/**
 * PROTOTIPO CON FOTO (v0.2.16): simulador de la estética y disposición del
 * espacio con FOTOGRAFÍAS del usuario como referencia, en cinco pasos:
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
  readonly root: HTMLElement;
  /** Fotografía del usuario, ubicada DEBAJO del render dinámico. */
  readonly overlay: HTMLImageElement;

  private foto: HTMLImageElement | null = null;
  private opacidadRender = 75;

  constructor(private editor: Editor) {
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
          this.entrarCalce();
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
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "20";
    slider.max = "100";
    slider.step = "1";
    slider.value = String(this.opacidadRender);
    slider.title = tt("Opacidad del render sobre la foto", "Render opacity over the photo");
    slider.addEventListener("input", () => {
      this.opacidadRender = +slider.value;
      this.aplicarOpacidad();
    });

    // Paso 4: fijar la perspectiva encontrada (bloquea la órbita).
    const bFijar = el("button", { class: "tool proto-btn" }, [
      tt("📌 Fijar perspectiva", "📌 Lock perspective"),
    ]);
    bFijar.addEventListener("click", () => {
      const on = !this.editor.isOrbitaBloqueada();
      this.editor.setOrbitaBloqueada(on);
      bFijar.classList.toggle("active", on);
      dialSol.classList.toggle("proto-oculto", !on);
      if (on) {
        this.opacidadRender = 100;
        slider.value = "100";
        this.aplicarOpacidad();
      }
    });

    // Selector circular del SOL: arrastra ☀ alrededor del área para elegir
    // desde dónde viene la luz (las sombras siguen al instante).
    const sol = el("div", { class: "proto-sol" }, ["☀"]);
    const dialSol = el("div", { class: "proto-dial proto-oculto" }, [
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
      const r = dialSol.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      azimut = (Math.atan2(dx, -dy) * 180) / Math.PI;
      ponerSol();
      this.editor.setSolAzimut(azimut);
    };
    dialSol.addEventListener("pointerdown", (ev) => {
      dialSol.setPointerCapture(ev.pointerId);
      arrastrarSol(ev);
      const mover = (e: PointerEvent): void => arrastrarSol(e);
      const soltar = (): void => {
        dialSol.removeEventListener("pointermove", mover);
        dialSol.removeEventListener("pointerup", soltar);
      };
      dialSol.addEventListener("pointermove", mover);
      dialSol.addEventListener("pointerup", soltar);
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

    const bQuitar = el("button", { class: "tool proto-btn" }, [
      tt("✖ Quitar foto y salir", "✖ Remove photo & exit"),
    ]);
    bQuitar.addEventListener("click", () => {
      this.foto = null;
      thumb.style.display = "none";
      bFijar.classList.remove("active");
      dialSol.classList.add("proto-oculto");
      this.salirCalce();
    });

    this.root = el("div", { class: "proto-body" }, [
      el("div", { class: "proto-ayuda" }, [
        tt(
          "1) Configura el área de trabajo con las dimensiones del lugar REAL y 2) compón tu espacio. 3) Carga la foto del lugar: quedará DEBAJO del render (sin fondo, con suelo) — orbita hasta calzar ambos suelos. 4) Fija la perspectiva y arrastra el ☀ para que las sombras hagan sentido. 5) Produce la fotografía.",
          "1) Set the workspace to the REAL room's dimensions and 2) compose your space. 3) Load the room photo: it sits UNDER the render (no background, floor kept) — orbit until both floors match. 4) Lock the perspective and drag the ☀ so shadows make sense. 5) Produce the photo.",
        ),
      ]),
      bFoto,
      thumb,
      el("div", { class: "proto-fila" }, [
        el("span", { class: "proto-etiqueta" }, [tt("Render", "Render")]),
        slider,
      ]),
      bFijar,
      dialSol,
      bProducir,
      bQuitar,
      input,
    ]);
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
    this.overlay.style.display = "none";
    this.overlay.classList.remove("detras");
    document.body.classList.remove("modo-calce");
    this.editor.setModoCalce(false);
    this.canvasEl().style.opacity = "";
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
    ctx.drawImage(this.foto, (W - fw * k) / 2, (H - fh * k) / 2, fw * k, fh * k);
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
    if (document.body.classList.contains("modo-calce")) this.salirCalce();
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
