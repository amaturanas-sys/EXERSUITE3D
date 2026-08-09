/**
 * MARKETPLACE · VENTANA 6 — GOT A WISH (v0.2.37)
 *
 * El usuario presenta SU diseño a las marcas y pide una valoración para que
 * se lo fabriquen. Tres partes:
 *   · el formulario de encargo (diseño, medidas, presupuesto, marcas a las
 *     que se dirige la petición);
 *   · la personalización de acabados —pintura de estructura y tapizado— que
 *     acompaña al encargo con una vista previa en vivo;
 *   · el espacio de conversación directa: cada encargo abre un hilo con la
 *     marca, con su estado (enviado · en revisión · presupuestado · en
 *     fabricación).
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import { botonDemo, campo, cabeceraMarca } from "./comunes";
import {
  DESEOS,
  ESTADOS_DESEO,
  MARCAS,
  type Deseo,
  haceDias,
  marca,
} from "./datos";

/** Formulario de encargo dirigido a una o varias marcas. */
function formularioDeseo(): HTMLElement {
  const marcas = el("div", { class: "mkc-chips" }, MARCAS.map((m) => {
    const c = el("button", { class: "mkc-chip mk-chip-marca" }, [m.nombre]);
    c.dataset.marca = m.id;
    c.addEventListener("click", () => c.classList.toggle("active"));
    return c;
  }));

  return el("div", { class: "mk-card mk-formulario" }, [
    el("div", { class: "mk-marca" }, [tt("🪄 Presenta tu deseo", "🪄 Submit your wish")]),
    el("div", { class: "mk-lema" }, [
      tt(
        "Adjunta el prefab que exportaste del Builder: la marca lo abre, lo simula y responde con una valoración de fabricación —no con una adivinanza.",
        "Attach the prefab you exported from the Builder: the brand opens it, simulates it and answers with a real manufacturing assessment — not a guess.",
      ),
    ]),
    campo(tt("Nombre del proyecto", "Project name"), tt("Ej.: Jaula corta para techo de 2,05 m", "E.g.: Short cage for a 2.05 m ceiling")),
    campo(tt("Qué necesitas", "What you need"), tt("Uso previsto, cargas, espacio disponible, plazos…", "Intended use, loads, available space, deadlines…"), "area"),
    el("div", { class: "mk-fila-campos" }, [
      campo(tt("Unidades", "Units"), "1", "numero"),
      campo(tt("Presupuesto máximo", "Budget cap"), "1500", "numero"),
      campo(tt("Correo de contacto", "Contact e-mail"), "tu@correo.cl", "email"),
    ]),
    el("div", { class: "mk-campo-tit" }, [tt("¿A qué marcas se lo mandamos?", "Which brands should we send it to?")]),
    marcas,
    el("div", { class: "mkc-acciones" }, [
      botonDemo(tt("📎 Adjuntar prefab .json", "📎 Attach .json prefab"), false, tt("✓ Adjunto demo", "✓ Demo attachment")),
      botonDemo(tt("🪄 Enviar mi deseo", "🪄 Send my wish"), true, tt("✓ Deseo demo enviado", "✓ Demo wish sent")),
    ]),
  ]);
}

/** Personalización de acabados: pintura de estructura y tapizado. */
function personalizacion(): HTMLElement {
  const COLORES = ["#1c1f26", "#b91c1c", "#1d4ed8", "#047857", "#b45309", "#6d28d9", "#e5e7eb"];
  let estructura = "#1c1f26";
  let tapiz = "#b91c1c";
  let objetivo: "estructura" | "tapiz" = "estructura";

  // Banco plano en SVG: la estructura y el tapiz se pintan en vivo.
  const svg = el("div", { class: "mk-preview" });
  const pintar = (): void => {
    svg.innerHTML = `<svg viewBox="0 0 320 170" width="100%" height="100%">
      <rect x="60" y="96" width="190" height="11" rx="4" fill="${estructura}"/>
      <path d="M78 96 L78 118 Q78 128 68 130 L40 136" stroke="${estructura}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <rect x="24" y="134" width="58" height="9" rx="4" fill="${estructura}"/>
      <path d="M236 100 Q262 106 264 126 Q264 140 250 142 M236 100 Q210 106 208 126 Q208 140 222 142" stroke="${estructura}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <rect x="196" y="140" width="34" height="8" rx="4" fill="${estructura}"/>
      <rect x="242" y="140" width="34" height="8" rx="4" fill="${estructura}"/>
      <rect x="30" y="60" width="260" height="26" rx="8" fill="${tapiz}"/>
    </svg>`;
  };
  pintar();

  const bEstructura = el("button", { class: "tool mk-objetivo active" }, [tt("Estructura", "Frame")]);
  const bTapiz = el("button", { class: "tool mk-objetivo" }, [tt("Tapizado", "Upholstery")]);
  const marcarObjetivo = (): void => {
    bEstructura.classList.toggle("active", objetivo === "estructura");
    bTapiz.classList.toggle("active", objetivo === "tapiz");
  };
  bEstructura.addEventListener("click", () => { objetivo = "estructura"; marcarObjetivo(); });
  bTapiz.addEventListener("click", () => { objetivo = "tapiz"; marcarObjetivo(); });

  const paleta = el("div", { class: "mk-paleta" }, COLORES.map((c) => {
    const sw = el("button", { class: "mk-swatch", style: `background:${c}` });
    sw.title = c;
    sw.addEventListener("click", () => {
      if (objetivo === "estructura") estructura = c;
      else tapiz = c;
      pintar();
    });
    return sw;
  }));

  return el("div", {}, [
    el("div", { class: "mk-titulo" }, [
      tt("🎨 Acabados del encargo: pintura y colorización", "🎨 Order finishes: paint & colorway"),
    ]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Elige los colores de estructura y tapizado; la marca recibe el acabado junto con el prefab.",
        "Pick frame and upholstery colors; the brand receives the finish along with the prefab.",
      ),
    ]),
    el("div", { class: "mk-custom" }, [
      svg,
      el("div", { class: "mk-custom-controles" }, [
        el("div", { class: "mk-lema" }, [tt("Pintar:", "Paint:")]),
        el("div", { class: "mk-objetivos" }, [bEstructura, bTapiz]),
        paleta,
        botonDemo(tt("🧾 Adjuntar acabado al encargo", "🧾 Attach finish to the order"), true),
      ]),
    ]),
  ]);
}

/** Hilo de conversación de un encargo con su marca. */
function tarjetaDeseo(d: Deseo): HTMLElement {
  const m = marca(d.marcaId);
  const arte = el("div", { class: "mk-hilo-arte" });
  arte.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${d.arte}</svg>`;

  const mensajes = el("div", { class: "mk-chat" }, d.mensajes.map((msg) =>
    el("div", { class: msg.deMarca ? "mk-msg de-marca" : "mk-msg" }, [
      el("span", { class: "mk-msg-de" }, [msg.deMarca ? `🏭 ${msg.de}` : tt("Tú", "You")]),
      el("span", { class: "mk-msg-txt" }, [tt(msg.texto[0], msg.texto[1])]),
    ]),
  ));

  const entrada = el("input", {
    class: "mk-input",
    placeholder: tt("Escribe a la marca…", "Message the brand…"),
    type: "text",
  });
  const bEnviar = el("button", { class: "land-btn primary mk-btn" }, [tt("Enviar", "Send")]);
  const enviar = (): void => {
    const txt = entrada.value.trim();
    if (!txt) return;
    mensajes.append(el("div", { class: "mk-msg" }, [
      el("span", { class: "mk-msg-de" }, [tt("Tú", "You")]),
      el("span", { class: "mk-msg-txt" }, [txt]),
    ]));
    entrada.value = "";
    mensajes.scrollTop = mensajes.scrollHeight;
  };
  bEnviar.addEventListener("click", enviar);
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviar();
  });

  return el("div", { class: "mk-card mk-deseo" }, [
    el("div", { class: "mk-hilo-cab" }, [
      cabeceraMarca(m, haceDias(d.haceDias)),
      el("span", { class: `mk-estado est-${d.estado}` }, [
        tt(ESTADOS_DESEO[d.estado][0], ESTADOS_DESEO[d.estado][1]),
      ]),
    ]),
    el("div", { class: "mk-hilo-cuerpo" }, [
      arte,
      el("div", { class: "mk-hilo-txt" }, [
        el("div", { class: "mkc-nombre" }, [tt(d.titulo[0], d.titulo[1])]),
        mensajes,
        el("div", { class: "mk-chat-envio" }, [entrada, bEnviar]),
      ]),
    ]),
  ]);
}

/** VENTANA 6: presenta tu diseño a las marcas y conversa con ellas. */
export function ventanaDeseo(): HTMLElement {
  return el("div", { class: "mk-ventana", id: "mk-deseo" }, [
    el("div", { class: "mk-titulo" }, [tt("🪄 Got a wish — tu diseño, valorado", "🪄 Got a wish — your design, assessed")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Presenta tu proyecto a las marcas y pide una valoración para fabricarlo. No es un formulario ciego: se manda el prefab, la marca lo simula y la conversación queda abierta hasta que haya presupuesto.",
        "Present your project to the brands and ask for a manufacturing assessment. It isn't a blind form: the prefab travels with it, the brand simulates it, and the conversation stays open until there's a quote.",
      ),
    ]),
    formularioDeseo(),
    el("div", { class: "mk-titulo" }, [tt("💬 Tus conversaciones", "💬 Your conversations")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Cada deseo abre un hilo directo con la marca y avanza por cuatro estados hasta la fabricación.",
        "Each wish opens a direct thread with the brand and moves through four states up to production.",
      ),
    ]),
    ...DESEOS.map(tarjetaDeseo),
    personalizacion(),
  ]);
}
