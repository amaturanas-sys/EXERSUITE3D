/**
 * MARKETPLACE · VENTANA 5 — MAKERS (v0.2.37)
 *
 * El foro de la comunidad DIY: diseños originales, búsqueda de patrocinio y
 * formación de equipos de trabajo. Cada hilo muestra su autor, su etiqueta,
 * el respaldo conseguido y las respuestas —incluidas las de las marcas, que
 * se marcan con su nombre— y el usuario puede apoyar, responder o publicar.
 *
 * Aquí también vive el mercado bidireccional makers ⇄ manufacturers: subir
 * un prefab para que lo coticen, o publicar el diseño para que lo licencien.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import { type MarketplaceAcciones, botonDemo, campo } from "./comunes";
import {
  ETIQUETAS_HILO,
  type EtiquetaHilo,
  HILOS,
  type HiloMaker,
  haceDias,
  marca,
  nombrePais,
} from "./datos";

const NOMBRE_ETIQUETA: Record<EtiquetaHilo, [string, string]> = {
  diseno: ["Diseño original", "Original design"],
  patrocinio: ["Busca patrocinio", "Seeking sponsorship"],
  equipo: ["Equipo de trabajo", "Work group"],
};

/** Tarjeta de un hilo del foro, con respuestas plegables. */
function tarjetaHilo(h: HiloMaker): HTMLElement {
  const arte = el("div", { class: "mk-hilo-arte" });
  arte.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${h.arte}</svg>`;

  // ---- Respaldo de la comunidad (sólo hilos de patrocinio)
  const respaldo: HTMLElement[] = [];
  if (h.patrocinio) {
    const { objetivo, logrado, marcas } = h.patrocinio;
    const pct = Math.round((logrado / objetivo) * 100);
    respaldo.push(
      el("div", { class: "mk-apoyo" }, [
        el("div", { class: "mk-apoyo-txt" }, [
          tt(`${logrado} de ${objetivo} reservas`, `${logrado} of ${objetivo} reservations`),
        ]),
        el("div", { class: "mk-barra" }, [el("div", { class: "mk-barra-fill", style: `width:${pct}%` })]),
        el("div", { class: "mk-apoyo-txt" }, [`${pct} %`]),
      ]),
      el("div", { class: "mk-apoyo-txt" }, [
        `${tt("Marcas interesadas:", "Interested brands:")} ${marcas.map((m) => marca(m).nombre).join(" · ")}`,
      ]),
    );
  }

  // ---- Respuestas plegables
  const respuestas = el("div", { class: "mk-respuestas mkc-oculto" }, h.respuestas.map((r) =>
    el("div", { class: r.deMarca ? "mk-respuesta de-marca" : "mk-respuesta" }, [
      el("span", { class: "mk-respuesta-autor" }, [r.deMarca ? `🏭 ${r.autor}` : r.autor]),
      el("span", { class: "mk-respuesta-txt" }, [tt(r.texto[0], r.texto[1])]),
    ]),
  ));
  const bResp = el("button", { class: "land-btn mk-btn" }, [
    tt(`💬 Respuestas (${h.respuestas.length})`, `💬 Replies (${h.respuestas.length})`),
  ]);
  bResp.addEventListener("click", () => respuestas.classList.toggle("mkc-oculto"));

  // ---- Apoyo (sube el contador en vivo, sólo en la maqueta)
  let apoyos = h.apoyos;
  let apoyado = false;
  const bApoyo = el("button", { class: "land-btn mk-btn mk-apoyo-btn" }, [`👍 ${apoyos}`]);
  bApoyo.addEventListener("click", () => {
    apoyado = !apoyado;
    apoyos += apoyado ? 1 : -1;
    bApoyo.replaceChildren(`👍 ${apoyos}`);
    bApoyo.classList.toggle("active", apoyado);
  });

  const bAccion = h.etiqueta === "equipo"
    ? botonDemo(tt("🤝 Unirme al equipo", "🤝 Join the group"), false, tt("✓ Solicitud demo enviada", "✓ Demo request sent"))
    : h.etiqueta === "patrocinio"
      ? botonDemo(tt("🏷 Reservar una unidad", "🏷 Reserve a unit"), true, tt("✓ Reserva demo anotada", "✓ Demo reservation logged"))
      : botonDemo(tt("🧩 Abrir el prefab", "🧩 Open the prefab"), false, tt("✓ Descarga demo", "✓ Demo download"));

  return el("div", { class: "mk-card mk-hilo" }, [
    el("div", { class: "mk-hilo-cab" }, [
      el("div", { class: "mk-iniciales" }, [h.iniciales]),
      el("div", { class: "mk-marca-datos" }, [
        el("div", { class: "mk-marca-nombre" }, [h.autor]),
        el("div", { class: "mk-marca-pais" }, [`${nombrePais(h.pais)} · ${haceDias(h.haceDias)}`]),
      ]),
      el("span", { class: `mk-etiqueta et-${h.etiqueta}` }, [
        tt(NOMBRE_ETIQUETA[h.etiqueta][0], NOMBRE_ETIQUETA[h.etiqueta][1]),
      ]),
    ]),
    el("div", { class: "mk-hilo-cuerpo" }, [
      arte,
      el("div", { class: "mk-hilo-txt" }, [
        el("div", { class: "mkc-nombre" }, [tt(h.titulo[0], h.titulo[1])]),
        el("div", { class: "mk-lema" }, [tt(h.cuerpo[0], h.cuerpo[1])]),
        ...respaldo,
      ]),
    ]),
    el("div", { class: "mkc-acciones" }, [bApoyo, bResp, bAccion]),
    respuestas,
  ]);
}

/** Compositor de hilo nuevo (demo). */
function compositor(): HTMLElement {
  const etiquetas = el("div", { class: "mkc-chips" });
  let elegida: EtiquetaHilo = "diseno";
  for (const [id, es, en] of ETIQUETAS_HILO) {
    if (id === "todo") continue;
    const c = el("button", { class: "mkc-chip" }, [tt(es, en)]);
    if (id === "diseno") c.classList.add("active");
    c.addEventListener("click", () => {
      elegida = id;
      for (const o of [...etiquetas.children]) o.classList.toggle("active", o === c);
    });
    etiquetas.append(c);
  }
  // `elegida` alimentará la publicación real cuando el foro tenga servidor.
  const bPublicar = botonDemo(tt("📣 Publicar en el foro", "📣 Post to the forum"), true, tt("✓ Hilo demo publicado", "✓ Demo thread posted"));
  bPublicar.addEventListener("click", () => bPublicar.setAttribute("data-etiqueta", elegida));

  return el("div", { class: "mk-card mk-compositor" }, [
    el("div", { class: "mk-marca" }, [tt("✍️ Abrir un hilo", "✍️ Start a thread")]),
    el("div", { class: "mk-lema" }, [
      tt(
        "Cuenta qué construiste o qué buscas. Si adjuntas el prefab exportado desde el Builder, cualquiera puede abrirlo y simularlo antes de responderte.",
        "Tell us what you built or what you're after. Attach the prefab exported from the Builder and anyone can open and simulate it before replying.",
      ),
    ]),
    campo(tt("Título", "Title"), tt("Ej.: Rack plegable para techo bajo", "E.g.: Folding rack for a low ceiling")),
    campo(tt("Descripción", "Description"), tt("Medidas, cargas probadas, qué necesitas del foro…", "Sizes, tested loads, what you need from the forum…"), "area"),
    el("div", { class: "mk-campo-tit" }, [tt("Etiqueta del hilo", "Thread tag")]),
    etiquetas,
    el("div", { class: "mkc-acciones" }, [
      botonDemo(tt("📎 Adjuntar prefab .json", "📎 Attach .json prefab"), false, tt("✓ Adjunto demo", "✓ Demo attachment")),
      bPublicar,
    ]),
  ]);
}

/** Mercado bidireccional: cotizar una construcción o vender un diseño. */
function bidireccional(): HTMLElement {
  return el("div", {}, [
    el("div", { class: "mk-titulo" }, [
      tt("🔁 Mercado bidireccional: makers ⇄ manufacturers", "🔁 Two-way market: makers ⇄ manufacturers"),
    ]),
    el("div", { class: "mk-grid" }, [
      el("div", { class: "mk-card" }, [
        el("div", { class: "mk-marca" }, [tt("🛠 Cotiza tu construcción", "🛠 Quote your build")]),
        el("div", { class: "mk-lema" }, [
          tt(
            "Diseñaste tu equipo en el Builder: súbelo y los fabricantes te ofertan su construcción. La comunidad puede apoyar tu proyecto.",
            "You designed your machine in the Builder: upload it and manufacturers bid to build it. The community can back your project.",
          ),
        ]),
        el("div", { class: "mk-item" }, [
          el("span", { class: "mk-item-nombre" }, [tt("Tu prefab .json → oferta en 72 h", "Your .json prefab → offer in 72 h")]),
        ]),
        el("div", { class: "mk-apoyo" }, [
          el("div", { class: "mk-apoyo-txt" }, [tt("Apoyo de la comunidad: 12 aportes", "Community backing: 12 pledges")]),
          el("div", { class: "mk-barra" }, [el("div", { class: "mk-barra-fill", style: "width:68%" })]),
          el("div", { class: "mk-apoyo-txt" }, ["68 %"]),
        ]),
        botonDemo(tt("📤 Solicitar cotización", "📤 Request a quote"), true),
      ]),
      el("div", { class: "mk-card" }, [
        el("div", { class: "mk-marca" }, [tt("💡 Vende tu diseño", "💡 Sell your design")]),
        el("div", { class: "mk-lema" }, [
          tt(
            "Las marcas exploran los diseños de la comunidad: si el tuyo les interesa, lo licencian o lo compran — tú conservas el crédito de autor.",
            "Brands browse community designs: if yours stands out they license or buy it — you keep author credit.",
          ),
        ]),
        el("div", { class: "mk-item" }, [
          el("span", { class: "mk-item-nombre" }, [tt("Publica desde Archivo → Exportar prefab", "Publish from File → Export prefab")]),
        ]),
        botonDemo(tt("🏷 Publicar mi diseño", "🏷 Publish my design")),
      ]),
    ]),
  ]);
}

/** VENTANA 5: foro de la comunidad de makers. */
export function ventanaMakers(acciones: MarketplaceAcciones): HTMLElement {
  let filtro: EtiquetaHilo | "todo" = "todo";
  const lista = el("div", { class: "mk-hilos" });
  const pintar = (): void => {
    lista.replaceChildren(
      ...HILOS.filter((h) => filtro === "todo" || h.etiqueta === filtro)
        .sort((a, b) => a.haceDias - b.haceDias)
        .map(tarjetaHilo),
    );
  };

  const chips = el("div", { class: "mkc-chips" });
  for (const [id, es, en] of ETIQUETAS_HILO) {
    const c = el("button", { class: "mkc-chip" }, [tt(es, en)]);
    if (id === "todo") c.classList.add("active");
    c.addEventListener("click", () => {
      filtro = id;
      for (const o of [...chips.children]) o.classList.toggle("active", o === c);
      pintar();
    });
    chips.append(c);
  }
  pintar();

  const bBiblioteca = el("button", { class: "land-btn mk-btn" }, [
    tt("🧩 Ver la biblioteca de modelos", "🧩 Browse the model library"),
  ]);
  bBiblioteca.addEventListener("click", () => acciones.verBiblioteca?.());

  return el("div", { class: "mk-ventana", id: "mk-makers" }, [
    el("div", { class: "mk-titulo" }, [tt("🔧 Makers — foro de la comunidad", "🔧 Makers — community forum")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Diseños originales, búsqueda de patrocinio y equipos de trabajo. Los hilos se responden con el prefab en la mano: cualquiera abre el diseño en el Builder, lo simula y opina sobre algo que ya movió.",
        "Original designs, sponsorship hunting and work groups. Threads are answered with the prefab in hand: anyone can open the design in the Builder, simulate it and comment on something they actually moved.",
      ),
    ]),
    el("div", { class: "mkc-acciones" }, [bBiblioteca]),
    chips,
    lista,
    compositor(),
    bidireccional(),
  ]);
}
