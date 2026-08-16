/**
 * ONDEMAND — diseños de marca abiertos a personalización.
 *
 * No es un catálogo aparte ni una tienda de segunda: son productos del mercado
 * de siempre cuya marca acepta modificarlos. El usuario elige uno, lo pinta,
 * le graba un texto, le añade piezas de fábrica y manda la petición.
 *
 * LA VISTA PREVIA SE PINTA DE VERDAD. Las ilustraciones de `arte.ts` llevan la
 * paleta cocida dentro de la cadena —se generan una vez al cargar el módulo— y
 * no hay forma de recolorearlas sin rehacerlas. Así que aquí se dibujan cuatro
 * siluetas paramétricas propias, una por familia de equipo, que reciben los
 * colores y el texto como argumentos. Son esquemáticas a propósito: lo que
 * tiene que quedar claro es QUÉ se está pintando, no cómo va a quedar el
 * acabado real.
 *
 * Debajo del personalizador van las solicitudes ya enviadas, que es donde
 * aterriza lo que se manda desde aquí: cada una abre un hilo con la marca y
 * avanza por cuatro estados hasta la fabricación.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import {
  CATALOGO,
  DESEOS,
  ESTADOS_DESEO,
  type Deseo,
  PERSONALIZABLES,
  type Personaliza,
  type Producto,
  catalogoOnDemand,
  haceDias,
  marca,
  precio$,
} from "./datos";
import type { MarketplaceAcciones } from "./comunes";
import { lamina } from "./imagen";

/** Paleta de fábrica: lo que la marca puede pintar sin recargo. */
const COLORES: [string, string, string][] = [
  ["#1c1f26", "Negro grafito", "Graphite black"],
  ["#4a4f57", "Gris acero", "Steel grey"],
  ["#e5e7eb", "Blanco hueso", "Bone white"],
  ["#b91c1c", "Rojo señal", "Signal red"],
  ["#e5440f", "Naranja Exersuite", "Exersuite orange"],
  ["#1d4ed8", "Azul cobalto", "Cobalt blue"],
  ["#047857", "Verde bosque", "Forest green"],
  ["#6d28d9", "Violeta", "Violet"],
  ["#b45309", "Ámbar", "Amber"],
];

type Parte = "estructura" | "tapiz" | "detalle";

const NOMBRE_PARTE: Record<Parte, [string, string]> = {
  estructura: ["Estructura", "Frame"],
  tapiz: ["Tapizado", "Upholstery"],
  detalle: ["Detalles", "Trim"],
};

interface Pintura {
  estructura: string;
  tapiz: string;
  detalle: string;
  texto: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SILUETAS PARAMÉTRICAS
//
// Cada una devuelve el interior de un <svg viewBox="0 0 320 200">. El texto
// grabado va sobre una cara plana y visible del equipo, que es donde una marca
// serigrafía de verdad.

function grabado(x: number, y: number, t: string, ancla = "middle"): string {
  if (!t) return "";
  // Se ESCAPA, no se borra: «Barras & Cía» es un rótulo perfectamente
  // normal, y suprimiendo el «&» el lienzo enseñaría algo distinto de lo que
  // el usuario tiene escrito. El recorte va antes que el escapado para que
  // los catorce caracteres sean los suyos y no los de la entidad.
  const limpio = t
    .slice(0, 14)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<text x="${x}" y="${y}" text-anchor="${ancla}" font-size="11"
    font-weight="900" letter-spacing="1.2" fill="#f2f2f2" opacity="0.92">${limpio}</text>`;
}

/** Bastidor de postes: racks, jaulas y multipower. */
function armazon(p: Pintura): string {
  const { estructura: e, detalle: d, texto } = p;
  let s = "";
  for (const x of [58, 96, 224, 262]) {
    s += `<rect x="${x}" y="34" width="13" height="140" rx="3" fill="${e}"/>`;
    for (let i = 0; i < 11; i++) s += `<circle cx="${x + 6.5}" cy="${44 + i * 12}" r="1.7" fill="#0e1013"/>`;
  }
  s += `<rect x="58" y="34" width="217" height="12" rx="3" fill="${e}"/>`;
  s += `<rect x="50" y="170" width="233" height="11" rx="4" fill="${e}"/>`;
  // Jotas y travesaño de seguridad: el «detalle» que se pinta aparte.
  s += `<rect x="52" y="104" width="26" height="9" rx="4" fill="${d}"/>`;
  s += `<rect x="242" y="104" width="26" height="9" rx="4" fill="${d}"/>`;
  s += `<rect x="96" y="128" width="128" height="8" rx="4" fill="${d}"/>`;
  s += grabado(166, 43, texto);
  return s;
}

/** Banco y prensa: lo que lleva acolchado. */
function banco(p: Pintura): string {
  const { estructura: e, tapiz: t, texto } = p;
  let s = "";
  s += `<rect x="70" y="118" width="190" height="12" rx="4" fill="${e}"/>`;
  s += `<path d="M88 118 L88 146 Q88 158 76 160 L48 168" stroke="${e}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  s += `<rect x="32" y="166" width="60" height="10" rx="5" fill="${e}"/>`;
  s += `<path d="M246 122 Q272 130 274 154 Q274 168 260 170 M246 122 Q220 130 218 154 Q218 168 232 170" stroke="${e}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  s += `<rect x="206" y="168" width="36" height="9" rx="4" fill="${e}"/>`;
  s += `<rect x="252" y="168" width="36" height="9" rx="4" fill="${e}"/>`;
  s += `<rect x="40" y="76" width="240" height="30" rx="9" fill="${t}"/>`;
  s += `<rect x="40" y="76" width="240" height="30" rx="9" fill="none" stroke="rgba(0,0,0,.25)"/>`;
  s += grabado(160, 152, texto);
  return s;
}

/** Torre de polea: dos columnas, pila y cable. */
function torre(p: Pintura): string {
  const { estructura: e, detalle: d, texto } = p;
  let s = "";
  s += `<rect x="76" y="28" width="16" height="150" rx="4" fill="${e}"/>`;
  s += `<rect x="228" y="28" width="16" height="150" rx="4" fill="${e}"/>`;
  s += `<rect x="76" y="28" width="168" height="13" rx="4" fill="${e}"/>`;
  s += `<rect x="60" y="174" width="200" height="11" rx="4" fill="${e}"/>`;
  // Pila selectorizada.
  s += `<rect x="140" y="66" width="40" height="102" rx="5" fill="${d}"/>`;
  for (let i = 0; i < 8; i++) {
    s += `<rect x="144" y="${70 + i * 12}" width="32" height="8" rx="2" fill="rgba(0,0,0,.35)"/>`;
  }
  s += `<path d="M84 42 L84 62 Q84 68 92 68 L140 84" stroke="#c9ced6" stroke-width="2.4" fill="none"/>`;
  s += `<path d="M236 42 L236 62 Q236 68 228 68 L180 84" stroke="#c9ced6" stroke-width="2.4" fill="none"/>`;
  s += `<circle cx="84" cy="40" r="7" fill="none" stroke="${d}" stroke-width="3.5"/>`;
  s += `<circle cx="236" cy="40" r="7" fill="none" stroke="${d}" stroke-width="3.5"/>`;
  s += grabado(160, 37, texto);
  return s;
}

/** Lo que va por el suelo: plataformas y trineos. */
function piso(p: Pintura): string {
  const { estructura: e, detalle: d, texto } = p;
  let s = "";
  s += `<rect x="42" y="92" width="236" height="62" rx="8" fill="${e}"/>`;
  s += `<rect x="112" y="92" width="96" height="62" fill="${d}"/>`;
  for (const x of [126, 145, 164, 183]) {
    s += `<rect x="${x}" y="98" width="6" height="50" rx="2" fill="rgba(0,0,0,.28)"/>`;
  }
  s += `<rect x="54" y="154" width="212" height="10" rx="5" fill="${d}"/>`;
  s += `<rect x="150" y="52" width="12" height="42" rx="4" fill="${d}"/>`;
  s += `<rect x="158" y="52" width="12" height="42" rx="4" fill="${d}"/>`;
  s += grabado(160, 128, texto);
  return s;
}

/** Qué silueta le toca a cada diseño abierto. */
const SILUETA: Record<string, (p: Pintura) => string> = {
  rack: armazon,
  jaula: armazon,
  smith: armazon,
  banco: banco,
  prensa: banco,
  torre: torre,
  plataforma: piso,
  trineo: piso,
};

// ═══════════════════════════════════════════════════════════════════════════

/** Hilo de una solicitud ya enviada, con su estado y su conversación. */
function tarjetaSolicitud(d: Deseo): HTMLElement {
  const m = marca(d.marcaId);
  // Las solicitudes siguen con el dibujo: son encargos de un diseño MODIFICADO,
  // así que ninguna fotografía de catálogo los retrata.
  const arte = lamina(d.arte, "od-sol-arte");

  const mensajes = el(
    "div",
    { class: "od-chat" },
    d.mensajes.map((msg) =>
      el("div", { class: msg.deMarca ? "od-msg de-marca" : "od-msg" }, [
        el("span", { class: "od-msg-de" }, [msg.deMarca ? m.nombre : tt("Tú", "You")]),
        el("span", { class: "od-msg-txt" }, [tt(msg.texto[0], msg.texto[1])]),
      ]),
    ),
  );

  const entrada = el("input", {
    class: "hub-input",
    type: "text",
    placeholder: tt("Escribe a la marca…", "Message the brand…"),
  }) as HTMLInputElement;
  const enviar = el("button", { class: "hub-btn-card", type: "button" }, [tt("Enviar", "Send")]);
  const mandar = (): void => {
    const txt = entrada.value.trim();
    if (!txt) return;
    // El texto va como nodo, no como cadena: `el()` traduce a sus hijos de tipo
    // cadena, y el diccionario tiene entradas de una palabra —«Peso», «Cable»,
    // «Ver»— que reescribirían el mensaje de una persona. Lo que escribe el
    // usuario es contenido, no interfaz.
    const cuerpo = el("span", { class: "od-msg-txt" });
    cuerpo.append(document.createTextNode(txt));
    mensajes.append(
      el("div", { class: "od-msg" }, [
        el("span", { class: "od-msg-de" }, [tt("Tú", "You")]),
        cuerpo,
      ]),
    );
    entrada.value = "";
    mensajes.scrollTop = mensajes.scrollHeight;
  };
  enviar.addEventListener("click", mandar);
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") mandar();
  });

  return el("article", { class: "od-solicitud" }, [
    el("div", { class: "od-sol-cab" }, [
      el("div", {}, [
        el("h4", { class: "od-sol-titulo" }, [tt(d.titulo[0], d.titulo[1])]),
        el("p", { class: "od-sol-marca" }, [`${m.nombre} · ${haceDias(d.haceDias)}`]),
      ]),
      el("span", { class: `od-estado est-${d.estado}` }, [
        tt(ESTADOS_DESEO[d.estado][0], ESTADOS_DESEO[d.estado][1]),
      ]),
    ]),
    el("div", { class: "od-sol-cuerpo" }, [
      arte,
      el("div", { class: "od-sol-hilo" }, [mensajes, el("div", { class: "od-chat-envio" }, [entrada, enviar])]),
    ]),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════

/** La sección entera de OnDemand. */
export function panelOnDemand(acciones: MarketplaceAcciones = {}): HTMLElement {
  const ABIERTOS = catalogoOnDemand();

  let elegido: Producto = ABIERTOS[0];
  let ficha: Personaliza = PERSONALIZABLES[elegido.id];
  let objetivo: Parte = "estructura";
  const pintura: Pintura = {
    estructura: "#1c1f26",
    tapiz: "#b91c1c",
    detalle: "#4a4f57",
    texto: "",
  };
  const extras = new Set<string>();

  // ---- Elegir el diseño
  const tira = el("div", { class: "od-tira" });

  // ---- Vista previa
  const lienzo = el("div", { class: "od-lienzo" });
  const repintar = (): void => {
    // Una parte que la ficha no abre no puede acabar pintada de un color que no
    // se puede tocar: se le da el de la estructura. Es el cinturón por si una
    // silueta y su ficha dejan de concordar.
    const usable: Pintura = {
      estructura: pintura.estructura,
      tapiz: ficha.partes.includes("tapiz") ? pintura.tapiz : pintura.estructura,
      detalle: ficha.partes.includes("detalle") ? pintura.detalle : pintura.estructura,
      texto: pintura.texto,
    };
    lienzo.innerHTML = `<svg viewBox="0 0 320 200" width="100%" height="100%"
      role="img" aria-label="${tt("Vista previa de la personalización", "Personalization preview")}"
      >${(SILUETA[elegido.id] ?? armazon)(usable)}</svg>`;
  };

  // ---- Partes que se pintan
  const botonesParte = el("div", { class: "od-partes" });
  const paleta = el("div", { class: "od-paleta" });

  const pintarPaleta = (): void => {
    paleta.replaceChildren(
      ...COLORES.map(([hex, es, en]) => {
        const sw = el("button", { class: "od-swatch", type: "button" });
        sw.style.background = hex;
        sw.dataset.color = hex;
        sw.title = tt(es, en);
        sw.setAttribute("aria-label", tt(es, en));
        if (pintura[objetivo] === hex) sw.classList.add("puesto");
        sw.addEventListener("click", () => {
          pintura[objetivo] = hex;
          repintar();
          pintarPaleta();
        });
        return sw;
      }),
    );
  };

  const pintarPartes = (): void => {
    botonesParte.replaceChildren(
      ...ficha.partes.map((parte) => {
        const b = el("button", { class: "od-parte", type: "button" }, [
          tt(NOMBRE_PARTE[parte][0], NOMBRE_PARTE[parte][1]),
        ]);
        b.dataset.parte = parte;
        const punto = el("span", { class: "od-punto" });
        punto.style.background = pintura[parte];
        b.prepend(punto);
        if (parte === objetivo) b.classList.add("activa");
        b.addEventListener("click", () => {
          objetivo = parte;
          pintarPartes();
          pintarPaleta();
        });
        return b;
      }),
    );
  };

  // ---- Grabado
  const letras = el("input", {
    class: "hub-input od-letras",
    type: "text",
    maxLength: 14,
    placeholder: tt("Tu texto (14 caracteres)", "Your text (14 characters)"),
  }) as HTMLInputElement;
  letras.addEventListener("input", () => {
    pintura.texto = letras.value;
    repintar();
  });
  const cajaLetras = el("label", { class: "hub-campo od-campo-letras" }, [
    el("span", {}, [tt("Grabado o serigrafía", "Engraving or screen print")]),
    letras,
  ]);

  // ---- Piezas extra
  const listaExtras = el("div", { class: "od-extras" });
  const total = el("p", { class: "od-total" });

  const recalcular = (): void => {
    const suma = ficha.extras
      .filter((x) => extras.has(x.id))
      .reduce((a, x) => a + x.precio, elegido.precio);
    total.replaceChildren(
      el("span", { class: "od-total-cifra" }, [`${precio$(suma)} USD`]),
      el("span", { class: "od-total-nota" }, [
        tt(
          `Estimación de lista · fabricación en ${ficha.semanas} semanas`,
          `List estimate · built in ${ficha.semanas} weeks`,
        ),
      ]),
    );
  };

  const pintarExtras = (): void => {
    listaExtras.replaceChildren(
      ...ficha.extras.map((x) => {
        const caja = el("input", { class: "od-check", type: "checkbox" }) as HTMLInputElement;
        caja.checked = extras.has(x.id);
        caja.addEventListener("change", () => {
          if (caja.checked) extras.add(x.id);
          else extras.delete(x.id);
          recalcular();
        });
        return el("label", { class: "od-extra" }, [
          caja,
          el("span", { class: "od-extra-nombre" }, [tt(x.nombre[0], x.nombre[1])]),
          el("span", { class: "od-extra-precio" }, [`+ ${precio$(x.precio)}`]),
        ]);
      }),
    );
  };

  // ---- Cambiar de diseño
  const titulo = el("h3", { class: "od-elegido" });
  const marcaTxt = el("p", { class: "od-elegido-marca" });

  const elegir = (p: Producto): void => {
    elegido = p;
    ficha = PERSONALIZABLES[p.id];
    extras.clear();
    // Si el diseño nuevo no tiene la parte que estaba seleccionada —un trineo
    // no lleva tapizado— el objetivo salta a la primera que sí tenga.
    if (!ficha.partes.includes(objetivo)) objetivo = ficha.partes[0];
    titulo.replaceChildren(tt(p.nombre[0], p.nombre[1]));
    marcaTxt.replaceChildren(marca(p.marcaId).nombre);
    for (const b of [...tira.children]) {
      b.classList.toggle("activa", (b as HTMLElement).dataset.prod === p.id);
    }
    pintarPartes();
    pintarPaleta();
    pintarExtras();
    recalcular();
    repintar();
  };

  for (const p of ABIERTOS) {
    const b = el("button", { class: "od-chip", type: "button" }, [tt(p.nombre[0], p.nombre[1])]);
    b.dataset.prod = p.id;
    b.addEventListener("click", () => elegir(p));
    tira.append(b);
  }

  // ---- Llevárselo al Builder
  //
  // La silueta de aquí arriba sirve para decidir rápido entre dos colores; la
  // estética se decide de verdad sobre el modelo, girándolo y mirándolo desde
  // donde va a quedar en la sala. Esta es la puerta de salida al software.
  const prototipar = el("button", { class: "hub-btn-card od-prototipar", type: "button" }, [
    tt("Prototipar en 3D →", "Prototype in 3D →"),
  ]);
  prototipar.addEventListener("click", () => acciones.verBiblioteca?.());

  // ---- Enviar
  const enviarBtn = el("button", { class: "hub-enviar", type: "button" }, [
    tt("Solicitar esta personalización", "Request this build"),
  ]);
  const aviso = el("p", { class: "hub-aviso oculto" });
  enviarBtn.addEventListener("click", () => {
    const n = extras.size;
    aviso.replaceChildren(
      tt(
        `✓ Solicitud demo enviada a ${marca(elegido.marcaId).nombre} · ${n} pieza${n === 1 ? "" : "s"} extra.`,
        `✓ Demo request sent to ${marca(elegido.marcaId).nombre} · ${n} extra part${n === 1 ? "" : "s"}.`,
      ),
    );
    aviso.classList.remove("oculto");
    setTimeout(() => aviso.classList.add("oculto"), 3200);
  });

  elegir(ABIERTOS[0]);

  return el("section", { class: "hub-panel hub-ondemand" }, [
    el("div", { class: "hub-int" }, [
      el("h2", { class: "hub-titulo" }, ["OnDemand"]),
      el("p", { class: "hub-parrafo hub-panel-bajada" }, [
        tt(
          `Diseños que su marca abre a modificación: eliges el color de cada parte, le grabas tu texto y le añades las piezas que quieras de fábrica. ${ABIERTOS.length} de los ${CATALOGO.length} equipos del mercado están abiertos.`,
          `Designs their brand opens to modification: pick the colour of each part, engrave your own text and add the factory parts you want. ${ABIERTOS.length} of the ${CATALOGO.length} pieces in the market are open.`,
        ),
      ]),

      el("div", { class: "od-tira-caja" }, [tira]),

      el("div", { class: "od-taller" }, [
        el("div", { class: "od-visor" }, [
          lienzo,
          el("div", { class: "od-visor-pie" }, [titulo, marcaTxt]),
        ]),
        el("div", { class: "od-controles" }, [
          el("h4", { class: "od-rotulo" }, [tt("Pintura", "Paint")]),
          botonesParte,
          paleta,
          cajaLetras,
          el("h4", { class: "od-rotulo" }, [tt("Piezas extra", "Extra parts")]),
          listaExtras,
          total,
          el("div", { class: "od-cierre" }, [enviarBtn, prototipar]),
          aviso,
        ]),
      ]),

      el("h3", { class: "od-seccion" }, [tt("Tus solicitudes", "Your requests")]),
      el("p", { class: "hub-parrafo hub-panel-bajada" }, [
        tt(
          "Cada solicitud abre un hilo directo con la marca y avanza por cuatro estados hasta la fabricación.",
          "Each request opens a direct thread with the brand and moves through four states up to production.",
        ),
      ]),
      el("div", { class: "od-solicitudes" }, DESEOS.map(tarjetaSolicitud)),
    ]),
  ]);
}
