import { tt } from "../core/i18n";
import { el } from "./dom";

/** Acciones reales que el Marketplace puede disparar desde la Home. */
export interface MarketplaceAcciones {
  /** Abre la Biblioteca de modelos (el showroom navegable de piezas). */
  verBiblioteca?: () => void;
}

/** Botón de flujo comercial DEMO: confirma la solicitud en línea. */
function botonDemo(etiqueta: string, primario = false): HTMLElement {
  const b = el("button", { class: primario ? "land-btn primary mk-btn" : "land-btn mk-btn" }, [etiqueta]);
  b.addEventListener("click", () => {
    b.replaceChildren(tt("✓ Solicitud demo registrada", "✓ Demo request logged"));
    b.setAttribute("disabled", "true");
    setTimeout(() => {
      b.replaceChildren(etiqueta);
      b.removeAttribute("disabled");
    }, 2200);
  });
  return b;
}

/**
 * MARKETPLACE (v0.2.14 · MAQUETA navegable): el hub BIDIRECCIONAL donde
 * makers y manufacturers se encuentran —
 *  · Showroom virtual: marcas publican sus equipos y piezas, disponibles
 *    como ítems de biblioteca para probar en el Builder antes de comprar.
 *  · Cotización de manufactura: el usuario cotiza la construcción de su
 *    diseño propio con un fabricante y recibe apoyo de la comunidad.
 *  · Venta de diseños: un diseño maker puede ser comprado por marcas.
 *  · Personalización: pedido de equipo a medida con interfaz de pintura y
 *    colorización.
 * Todo el flujo comercial está maquetado (etiqueta DEMO): las marcas son
 * ficticias y los botones aún no operan transacciones reales.
 */

interface ItemMarca {
  nombre: string;
  precio: string;
  nota: string;
}

interface Marca {
  nombre: string;
  lema: string;
  items: ItemMarca[];
}

const MARCAS: Marca[] = [
  {
    nombre: "IronForge Equipment",
    lema: "Racks y jaulas de perfil 3×3\"",
    items: [
      { nombre: "Power rack IF-700", precio: "$ 1.290", nota: "Ítem de biblioteca · pruébalo en el Builder" },
      { nombre: "Jota con rodillo UHMW", precio: "$ 89", nota: "Calza en pinholes de 5 cm" },
    ],
  },
  {
    nombre: "Andes Strength Co.",
    lema: "Poleas y accesorios de cable",
    items: [
      { nombre: "Torre de polea dual", precio: "$ 2.150", nota: "Con pila selectorizada de 90 kg" },
      { nombre: "Barra de jalón multigrip", precio: "$ 145", nota: "Cromada, Ø 32 mm" },
    ],
  },
  {
    nombre: "Taller Quimera",
    lema: "Manufactura a pedido (acero nacional)",
    items: [
      { nombre: "Tu diseño, fabricado", precio: "cotiza", nota: "Sube tu prefab .json y recibe oferta" },
    ],
  },
];

/** Showroom: tarjetas de marcas con sus ítems de biblioteca. */
function seccionShowroom(acciones: MarketplaceAcciones): HTMLElement {
  const verEnBiblioteca = (): HTMLElement => {
    const b = el("button", { class: "land-btn mk-btn" }, [
      tt("🧩 Ver en biblioteca (showroom)", "🧩 View in library (showroom)"),
    ]);
    b.addEventListener("click", () => acciones.verBiblioteca?.());
    return b;
  };
  const tarjetas = MARCAS.map((m) =>
    el("div", { class: "mk-card" }, [
      el("div", { class: "mk-marca" }, [m.nombre]),
      el("div", { class: "mk-lema" }, [m.lema]),
      ...m.items.map((it) =>
        el("div", { class: "mk-item" }, [
          el("span", { class: "mk-item-nombre" }, [it.nombre]),
          el("span", { class: "mk-item-precio" }, [it.precio]),
          el("div", { class: "mk-item-nota" }, [it.nota]),
        ]),
      ),
      verEnBiblioteca(),
    ]),
  );
  return el("div", {}, [
    el("div", { class: "mk-titulo" }, [tt("🏬 Showroom virtual de marcas", "🏬 Virtual brand showroom")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Los equipos y piezas de cada marca se instalan como ítems de biblioteca: pruébalos en tu sala ANTES de comprar.",
        "Each brand's equipment installs as library items: try them in your gym BEFORE buying.",
      ),
    ]),
    el("div", { class: "mk-grid" }, tarjetas),
  ]);
}

/** Cotización de manufactura + venta de diseños (mercado bidireccional). */
function seccionBidireccional(): HTMLElement {
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
          el("div", { class: "mk-apoyo-txt" }, [
            tt("Apoyo de la comunidad: 12 aportes", "Community backing: 12 pledges"),
          ]),
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

/** Personalización: interfaz de pintura y colorización con vista previa. */
function seccionCustom(): HTMLElement {
  const COLORES = ["#1c1f26", "#b91c1c", "#1d4ed8", "#047857", "#b45309", "#6d28d9", "#e5e7eb"];
  let estructura = "#1c1f26";
  let tapiz = "#b91c1c";
  let objetivo: "estructura" | "tapiz" = "estructura";

  // Banco plano en SVG: la estructura y el tapiz se pintan en vivo.
  const svg = el("div", { class: "mk-preview" });
  const pintar = () => {
    // Silueta del BANCO PLANO CLÁSICO de la biblioteca: colchoneta sobre
    // espina central, pata trasera en L y pata delantera en arco.
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
  const marcarObjetivo = () => {
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
      tt("🎨 Equipo personalizado: pintura y colorización", "🎨 Custom equipment: paint & colorway"),
    ]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Elige los colores de estructura y tapizado con la interfaz de diseño gráfico y solicita tu equipo a medida.",
        "Pick frame and upholstery colors with the graphic design interface and order your custom build.",
      ),
    ]),
    el("div", { class: "mk-custom" }, [
      svg,
      el("div", { class: "mk-custom-controles" }, [
        el("div", { class: "mk-lema" }, [tt("Pintar:", "Paint:")]),
        el("div", { class: "mk-objetivos" }, [bEstructura, bTapiz]),
        paleta,
        botonDemo(tt("🧾 Solicitar equipo personalizado", "🧾 Order custom equipment"), true),
      ]),
    ]),
  ]);
}

/** Contenido de la vista Marketplace (maqueta) para la Home. */
export function renderMarketplace(cont: HTMLElement, acciones: MarketplaceAcciones = {}): void {
  cont.append(
    el("div", { class: "mk-head" }, [
      el("div", { class: "land-aside-title" }, [
        tt("Marketplace — hub de makers y manufacturers", "Marketplace — makers & manufacturers hub"),
      ]),
      el("span", { class: "mk-demo" }, ["DEMO"]),
    ]),
    el("div", { class: "mk-scroll" }, [
      seccionShowroom(acciones),
      seccionBidireccional(),
      seccionCustom(),
      el("div", { class: "mk-pie" }, [
        tt(
          "Maqueta de producto: las marcas mostradas son ficticias y las acciones comerciales aún no están operativas.",
          "Product mockup: brands shown are fictitious and commercial actions are not yet live.",
        ),
      ]),
    ]),
  );
}
