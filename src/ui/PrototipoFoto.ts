import type { Editor } from "../core/Editor";
import { guardarCaptura } from "../core/capturas";
import { descargarArchivo } from "../core/descargas";
import { tt } from "../core/i18n";
import { el } from "./dom";

/** Color croma de la pantalla verde (el mismo del visor). */
const CROMA = { r: 0, g: 177, b: 64 };

/**
 * PROTOTIPO CON FOTO (v0.2.15): simulador de la estética y disposición del
 * espacio usando FOTOGRAFÍAS del usuario como referencia. El flujo:
 *  1. El usuario configura un espacio con las dimensiones del lugar real y
 *     carga una foto de ese lugar.
 *  2. La foto se SUPERPONE al visor con transparencia ajustable: mueve la
 *     cámara y los modelos hasta que encajen con la perspectiva de la foto.
 *  3. La PANTALLA VERDE deja el visor con fondo croma (suelo oculto) y la
 *     CAPTURA COMPUESTA recorta los modelos por croma y los solapa sobre la
 *     foto — un piloto/prototipo visual de lo que obtendría en su sitio.
 */
export class PrototipoFoto {
  readonly root: HTMLElement;
  /** Foto superpuesta al visor (guía de alineación con transparencia). */
  readonly overlay: HTMLImageElement;

  private foto: HTMLImageElement | null = null;
  private opacidad = 45;
  private bVerde: HTMLElement;

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
          this.aplicarOverlay();
          bCaptura.removeAttribute("disabled");
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

    // Opacidad de la foto superpuesta: 0 la esconde, 100 la muestra sólida.
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.value = String(this.opacidad);
    slider.title = tt("Transparencia de la foto superpuesta", "Overlay photo transparency");
    slider.addEventListener("input", () => {
      this.opacidad = +slider.value;
      this.aplicarOverlay();
    });

    this.bVerde = el("button", { class: "tool proto-btn" }, [
      tt("🟩 Pantalla verde", "🟩 Green screen"),
    ]);
    this.bVerde.addEventListener("click", () => {
      const on = !this.editor.isPantallaVerde();
      this.editor.setPantallaVerde(on);
      this.bVerde.classList.toggle("active", on);
    });

    const bCaptura = el("button", { class: "tool proto-btn primario" }, [
      tt("🎞 Captura compuesta (foto + modelos)", "🎞 Composite capture (photo + models)"),
    ]);
    bCaptura.setAttribute("disabled", "true");
    bCaptura.addEventListener("click", () => {
      void this.capturaCompuesta().then((ok) => {
        bCaptura.replaceChildren(
          ok ? tt("✓ Prototipo guardado", "✓ Prototype saved") : tt("✗ No se pudo", "✗ Failed"),
        );
        setTimeout(() => {
          bCaptura.replaceChildren(
            tt("🎞 Captura compuesta (foto + modelos)", "🎞 Composite capture (photo + models)"),
          );
        }, 1800);
      });
    });

    this.root = el("div", { class: "proto-body" }, [
      el("div", { class: "proto-ayuda" }, [
        tt(
          "Configura el espacio con las dimensiones del lugar real, carga su foto y alinea la cámara con la superposición; la captura compuesta recorta los modelos (croma) y los solapa sobre la foto.",
          "Set up the space with the real room's dimensions, load its photo and align the camera with the overlay; the composite capture chroma-keys the models over the photo.",
        ),
      ]),
      bFoto,
      thumb,
      el("div", { class: "proto-fila" }, [
        el("span", { class: "proto-etiqueta" }, [tt("Superponer", "Overlay")]),
        slider,
      ]),
      this.bVerde,
      bCaptura,
      input,
    ]);
  }

  private aplicarOverlay(): void {
    const visible = this.foto !== null && this.opacidad > 0;
    this.overlay.style.display = visible ? "block" : "none";
    this.overlay.style.opacity = String(this.opacidad / 100);
  }

  /**
   * Composición del prototipo: render con pantalla verde → recorte por croma
   * → foto de fondo (encuadre cover) + modelos encima. Guarda en la galería
   * de la Home y descarga el PNG.
   */
  private async capturaCompuesta(): Promise<boolean> {
    if (!this.foto) return false;
    const estaba = this.editor.isPantallaVerde();
    if (!estaba) this.editor.setPantallaVerde(true);
    const dataUrl = this.editor.captureViewportPNG();
    if (!estaba) this.editor.setPantallaVerde(false);

    const modelo = await cargarImagen(dataUrl);
    const W = modelo.naturalWidth;
    const H = modelo.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return false;

    // 1) Foto de fondo con encuadre COVER (llena el lienzo sin deformar).
    const fw = this.foto.naturalWidth;
    const fh = this.foto.naturalHeight;
    const k = Math.max(W / fw, H / fh);
    ctx.drawImage(this.foto, (W - fw * k) / 2, (H - fh * k) / 2, fw * k, fh * k);

    // 2) Modelos recortados por croma: el verde de la pantalla se vuelve
    //    transparente (tolerancia por dominancia del canal verde).
    const keyCv = document.createElement("canvas");
    keyCv.width = W;
    keyCv.height = H;
    const kctx = keyCv.getContext("2d");
    if (!kctx) return false;
    kctx.drawImage(modelo, 0, 0);
    const img = kctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const dist = Math.abs(r - CROMA.r) + Math.abs(g - CROMA.g) + Math.abs(b - CROMA.b);
      if (dist < 150 && g > r + 30 && g > b + 30) d[i + 3] = 0;
    }
    kctx.putImageData(img, 0, 0);
    ctx.drawImage(keyCv, 0, 0);

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
      console.error("No se pudo componer el prototipo:", err);
      return false;
    }
  }

  dispose(): void {
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
