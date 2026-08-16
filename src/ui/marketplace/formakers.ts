/**
 * FORMAKERS — el tablón tipo Kickstarter de los diseñadores independientes.
 *
 * Aquí no se vende nada: se publica una idea y se busca con qué sacarla
 * adelante. Las dos vías son las que nombró el diseñador —respaldo de la
 * comunidad (reservas y apoyos) o colaboración directa con una marca que se
 * interese— y ambas van en la misma ficha, porque en la práctica un proyecto
 * empieza por una y termina por la otra.
 *
 * Los tres tipos de publicación:
 *
 *   · DISEÑO ORIGINAL   se enseña el prefab para que cualquiera lo abra en el
 *                       Builder, lo simule y opine sobre algo que ya movió;
 *   · BUSCA PATROCINIO  lleva barra de financiación —reservas conseguidas
 *                       sobre el objetivo— y la lista de marcas interesadas;
 *   · EQUIPO DE TRABAJO  se busca gente, no dinero.
 *
 * El dato vive en `HILOS` (datos.ts) desde v0.2.37; lo que cambia aquí es que
 * deja de ser una ventana escondida del marketplace y pasa a ser uno de los
 * cinco recorridos del hub.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import {
  ETIQUETAS_HILO,
  type EtiquetaHilo,
  HILOS,
  type HiloMaker,
  haceDias,
  marca,
  nombrePais,
} from "./datos";
import type { MarketplaceAcciones } from "./comunes";
import { lamina } from "./imagen";

const NOMBRE_ETIQUETA: Record<EtiquetaHilo, [string, string]> = {
  diseno: ["Diseño original", "Original design"],
  patrocinio: ["Busca patrocinio", "Seeking sponsorship"],
  equipo: ["Equipo de trabajo", "Work group"],
};

/** Qué botón cierra cada tipo de publicación. */
const ACCION: Record<EtiquetaHilo, [string, string, string, string]> = {
  diseno: ["Abrir el prefab", "Open the prefab", "✓ Descarga demo", "✓ Demo download"],
  patrocinio: ["Reservar una unidad", "Reserve a unit", "✓ Reserva demo anotada", "✓ Demo reservation logged"],
  equipo: ["Unirme al equipo", "Join the group", "✓ Solicitud demo enviada", "✓ Demo request sent"],
};

/** Barra de financiación: sólo la llevan los hilos que piden respaldo. */
function financiacion(h: HiloMaker): HTMLElement[] {
  if (!h.patrocinio) return [];
  const { objetivo, logrado, marcas } = h.patrocinio;
  const pct = Math.min(100, Math.round((logrado / objetivo) * 100));
  return [
    el("div", { class: "fm-fondeo" }, [
      el("div", { class: "fm-fondeo-cifras" }, [
        el("strong", {}, [String(logrado)]),
        el("span", {}, [
          tt(`de ${objetivo} reservas · ${pct} %`, `of ${objetivo} reservations · ${pct}%`),
        ]),
      ]),
      el("div", { class: "fm-barra" }, [
        el("div", { class: "fm-barra-relleno", style: `width:${pct}%` }),
      ]),
      el("p", { class: "fm-marcas" }, [
        `${tt("Marcas interesadas:", "Interested brands:")} ${marcas.map((m) => marca(m).nombre).join(" · ")}`,
      ]),
    ]),
  ];
}

/** Ficha de un proyecto. */
function tarjetaProyecto(h: HiloMaker): HTMLElement {
  const arte = lamina(h.arte, "fm-arte", { diferida: true });

  const respuestas = el(
    "div",
    { class: "fm-respuestas oculto" },
    h.respuestas.map((r) =>
      el("div", { class: r.deMarca ? "fm-respuesta de-marca" : "fm-respuesta" }, [
        el("span", { class: "fm-respuesta-autor" }, [r.autor]),
        el("span", { class: "fm-respuesta-txt" }, [tt(r.texto[0], r.texto[1])]),
      ]),
    ),
  );
  const verResp = el("button", { class: "hub-btn-card", type: "button" }, [
    tt(`Respuestas (${h.respuestas.length})`, `Replies (${h.respuestas.length})`),
  ]);
  verResp.addEventListener("click", () => respuestas.classList.toggle("oculto"));

  // El contador sube en vivo; es maqueta, no hay servidor detrás.
  let apoyos = h.apoyos;
  let apoyado = false;
  const bApoyo = el("button", { class: "hub-btn-card fm-apoyo", type: "button" }, [`♥ ${apoyos}`]);
  bApoyo.addEventListener("click", () => {
    apoyado = !apoyado;
    apoyos += apoyado ? 1 : -1;
    bApoyo.replaceChildren(`♥ ${apoyos}`);
    bApoyo.classList.toggle("puesto", apoyado);
  });

  const [es, en, okEs, okEn] = ACCION[h.etiqueta];
  const bAccion = el("button", { class: "hub-btn-card fm-accion", type: "button" }, [tt(es, en)]);
  bAccion.addEventListener("click", () => {
    bAccion.replaceChildren(tt(okEs, okEn));
    bAccion.classList.add("puesto");
    setTimeout(() => {
      bAccion.replaceChildren(tt(es, en));
      bAccion.classList.remove("puesto");
    }, 2000);
  });

  return el("article", { class: "fm-proyecto" }, [
    arte,
    el("div", { class: "fm-cuerpo" }, [
      el("div", { class: "fm-cab" }, [
        el("div", { class: "fm-avatar" }, [h.iniciales]),
        el("div", { class: "fm-autor" }, [
          el("strong", {}, [h.autor]),
          el("span", {}, [`${nombrePais(h.pais)} · ${haceDias(h.haceDias)}`]),
        ]),
        el("span", { class: `fm-etiqueta et-${h.etiqueta}` }, [
          tt(NOMBRE_ETIQUETA[h.etiqueta][0], NOMBRE_ETIQUETA[h.etiqueta][1]),
        ]),
      ]),
      el("h3", { class: "fm-titulo" }, [tt(h.titulo[0], h.titulo[1])]),
      el("p", { class: "fm-texto" }, [tt(h.cuerpo[0], h.cuerpo[1])]),
      ...financiacion(h),
      el("div", { class: "fm-acciones" }, [bApoyo, verResp, bAccion]),
      respuestas,
    ]),
  ]);
}

/** Publicar un proyecto propio. */
function compositor(): HTMLElement {
  const chips = el("div", { class: "fm-chips" });
  let elegida: EtiquetaHilo = "diseno";
  for (const [id, es, en] of ETIQUETAS_HILO) {
    if (id === "todo") continue;
    const c = el("button", { class: "fm-chip", type: "button" }, [tt(es, en)]);
    if (id === "diseno") c.classList.add("activa");
    c.addEventListener("click", () => {
      elegida = id;
      for (const o of [...chips.children]) o.classList.toggle("activa", o === c);
    });
    chips.append(c);
  }

  const campo = (etiqueta: string, marcador: string, area = false): HTMLElement => {
    const control = area
      ? el("textarea", { class: "hub-input hub-area", rows: 3, placeholder: marcador })
      : el("input", { class: "hub-input", type: "text", placeholder: marcador });
    return el("label", { class: "hub-campo" }, [el("span", {}, [etiqueta]), control]);
  };

  const publicar = el("button", { class: "hub-enviar", type: "button" }, [
    tt("Publicar mi proyecto", "Publish my project"),
  ]);
  const aviso = el("p", { class: "hub-aviso oculto" }, [
    tt("✓ Proyecto demo publicado.", "✓ Demo project published."),
  ]);
  publicar.addEventListener("click", () => {
    // `elegida` alimentará la publicación real cuando el foro tenga servidor.
    publicar.dataset.etiqueta = elegida;
    aviso.classList.remove("oculto");
    setTimeout(() => aviso.classList.add("oculto"), 2600);
  });

  return el("div", { class: "fm-compositor" }, [
    lamina("", "fm-comp-foto", {
      foto: "fm-publica.webp",
      alt: tt(
        "Un garaje con banco de trabajo, herramientas y un rack plegado contra la pared",
        "A garage with a workbench, tools and a rack folded against the wall",
      ),
      diferida: true,
    }),
    el("h3", { class: "fm-comp-titulo" }, [tt("Publica el tuyo", "Publish yours")]),
    el("p", { class: "hub-parrafo" }, [
      tt(
        "Cuenta qué construiste o qué buscas. Si adjuntas el prefab exportado del Builder, cualquiera puede abrirlo y simularlo antes de responderte —y una marca puede valorar la fabricación sin adivinar.",
        "Tell us what you built or what you're after. Attach the prefab exported from the Builder and anyone can open and simulate it before replying — and a brand can assess manufacturing without guessing.",
      ),
    ]),
    campo(tt("Título", "Title"), tt("Ej.: Rack plegable para techo bajo", "E.g.: Folding rack for a low ceiling")),
    campo(
      tt("Descripción", "Description"),
      tt("Medidas, cargas probadas, qué necesitas…", "Sizes, tested loads, what you need…"),
      true,
    ),
    el("div", { class: "fm-comp-rotulo" }, [tt("Qué buscas", "What you're after")]),
    chips,
    publicar,
    aviso,
  ]);
}

/** La sección entera de ForMakers. */
export function panelForMakers(acciones: MarketplaceAcciones = {}): HTMLElement {
  let filtro: EtiquetaHilo | "todo" = "todo";
  const lista = el("div", { class: "fm-lista" });
  const cuenta = el("p", { class: "hub-cuenta" });

  const pintar = (): void => {
    const vistos = HILOS.filter((h) => filtro === "todo" || h.etiqueta === filtro).sort(
      (a, b) => a.haceDias - b.haceDias,
    );
    lista.replaceChildren(...vistos.map(tarjetaProyecto));
    cuenta.textContent = tt(
      `${vistos.length} de ${HILOS.length} proyectos`,
      `${vistos.length} of ${HILOS.length} projects`,
    );
  };

  const chips = el("div", { class: "fm-chips" });
  for (const [id, es, en] of ETIQUETAS_HILO) {
    const c = el("button", { class: "fm-chip", type: "button" }, [tt(es, en)]);
    if (id === "todo") c.classList.add("activa");
    c.addEventListener("click", () => {
      filtro = id;
      for (const o of [...chips.children]) o.classList.toggle("activa", o === c);
      pintar();
    });
    chips.append(c);
  }
  pintar();

  const biblioteca = el("button", { class: "hub-btn-card", type: "button" }, [
    tt("Abrir la biblioteca de modelos →", "Open the model library →"),
  ]);
  biblioteca.addEventListener("click", () => acciones.verBiblioteca?.());

  return el("section", { class: "hub-panel hub-formakers" }, [
    el("div", { class: "hub-int" }, [
      el("h2", { class: "hub-titulo" }, ["ForMakers"]),
      el("p", { class: "hub-parrafo hub-panel-bajada" }, [
        tt(
          "Diseñadores independientes enseñan lo que están haciendo y buscan con qué sacarlo adelante: respaldo de la comunidad o una marca que se sume a fabricarlo. Los proyectos se responden con el prefab en la mano.",
          "Independent designers show what they are building and look for what it takes to finish it: community backing, or a brand that joins in to build it. Projects are answered with the prefab in hand.",
        ),
      ]),
      el("div", { class: "fm-filtros" }, [chips, biblioteca]),
      cuenta,
      lista,
      compositor(),
    ]),
  ]);
}
