import { tt } from "../core/i18n";
import { el } from "./dom";

/** Acciones reales que el Marketplace puede disparar desde la Home. */
export interface MarketplaceAcciones {
  /** Abre la Biblioteca de modelos (el showroom navegable de piezas). */
  verBiblioteca?: () => void;
}

/** Botón de flujo comercial DEMO: confirma la solicitud en línea. */
function botonDemo(etiqueta: string, primario = false, confirmacion?: string): HTMLElement {
  const b = el("button", { class: primario ? "land-btn primary mk-btn" : "land-btn mk-btn" }, [etiqueta]);
  b.addEventListener("click", () => {
    b.replaceChildren(confirmacion ?? tt("✓ Solicitud demo registrada", "✓ Demo request logged"));
    b.setAttribute("disabled", "true");
    setTimeout(() => {
      b.replaceChildren(etiqueta);
      b.removeAttribute("disabled");
    }, 2200);
  });
  return b;
}

/**
 * MARKETPLACE (v0.2.17 · MAQUETA navegable): CATÁLOGO DE VENTA visual — cada
 * producto con su imagen, precio, OFERTA con descuento y carrito demo — más
 * el mercado bidireccional makers⇄manufacturers y la personalización con
 * pintura. Las marcas son ficticias y las compras no operan (etiqueta DEMO),
 * pero el catálogo se navega como una tienda real: filtros por categoría,
 * carrito con total y pedido de demostración.
 */

// ---- Paleta de las ilustraciones de producto (SVG autocontenidos)
const F = "#3a4048"; // acero estructural
const D = "#22262c"; // acero oscuro
const C = "#c9ced6"; // cromo
const R = "#c22d2d"; // acento rojo (tapiz/goma)
const G = "#8a929c"; // gris medio

/** Fila de agujeros de pinholes para las ilustraciones. */
function agujeros(cx: number, y0: number, n: number, paso = 11): string {
  let s = "";
  for (let i = 0; i < n; i++) s += `<circle cx="${cx}" cy="${y0 + i * paso}" r="1.8" fill="${D}"/>`;
  return s;
}

/** Cadena esquemática: eslabones alternados sobre una curva. */
function cadenita(x0: number, y0: number, x1: number, y1: number, comba: number, n = 9): string {
  let s = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + 4 * comba * t * (1 - t);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${i % 2 ? 5 : 3.2}" ry="${i % 2 ? 3.2 : 5}" fill="none" stroke="${G}" stroke-width="2.8"/>`;
  }
  return s;
}

const ARTE: Record<string, string> = {
  rack: `
    <rect x="46" y="112" width="44" height="6" rx="3" fill="${F}"/>
    <rect x="112" y="112" width="44" height="6" rx="3" fill="${F}"/>
    <rect x="60" y="18" width="10" height="96" rx="2" fill="${F}"/>
    <rect x="132" y="18" width="10" height="96" rx="2" fill="${F}"/>
    <rect x="54" y="10" width="94" height="9" rx="4" fill="${D}"/>
    ${agujeros(65, 32, 7)}${agujeros(137, 32, 7)}
    <path d="M70 58 h12 v9 h-7" fill="none" stroke="${R}" stroke-width="5" stroke-linecap="round"/>
    <path d="M132 58 h-12 v9 h7" fill="none" stroke="${R}" stroke-width="5" stroke-linecap="round"/>`,
  jota: `
    <rect x="64" y="22" width="18" height="88" rx="3" fill="${F}"/>
    ${agujeros(73, 34, 7)}
    <rect x="82" y="56" width="14" height="26" rx="3" fill="${D}"/>
    <path d="M96 62 h30 v24 h-14" fill="none" stroke="${D}" stroke-width="9" stroke-linecap="round"/>
    <rect x="98" y="74" width="30" height="13" rx="6.5" fill="${C}"/>
    <circle cx="89" cy="66" r="4" fill="${C}"/>`,
  cadenas: `
    ${cadenita(34, 38, 166, 38, 18)}
    ${cadenita(34, 72, 166, 72, 18)}
    <circle cx="30" cy="38" r="6" fill="${R}"/><circle cx="170" cy="38" r="6" fill="${R}"/>
    <circle cx="30" cy="72" r="6" fill="${R}"/><circle cx="170" cy="72" r="6" fill="${R}"/>`,
  torre: `
    <rect x="70" y="112" width="64" height="6" rx="3" fill="${F}"/>
    <rect x="78" y="12" width="9" height="102" rx="2" fill="${F}"/>
    <rect x="116" y="12" width="9" height="102" rx="2" fill="${F}"/>
    <rect x="74" y="6" width="55" height="8" rx="4" fill="${D}"/>
    <circle cx="101" cy="18" r="8" fill="none" stroke="${C}" stroke-width="3.4"/>
    <line x1="101" y1="26" x2="101" y2="52" stroke="${C}" stroke-width="2.4"/>
    <rect x="88" y="52" width="27" height="52" rx="3" fill="${D}"/>
    <line x1="88" y1="61" x2="115" y2="61" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="70" x2="115" y2="70" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="79" x2="115" y2="79" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="88" x2="115" y2="88" stroke="${G}" stroke-width="1.6"/>
    <rect x="84" y="56" width="35" height="6" rx="3" fill="${R}"/>`,
  multigrip: `
    <rect x="18" y="58" width="164" height="7" rx="3.5" fill="${C}"/>
    <rect x="30" y="52" width="9" height="19" rx="3" fill="${D}"/>
    <rect x="161" y="52" width="9" height="19" rx="3" fill="${D}"/>
    <path d="M78 58 l10 -16 h24 l10 16" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/>
    <path d="M86 58 l7 -10 h14 l7 10" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 65 q8 14 20 14 M140 65 q-8 14 -20 14" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/>`,
  banco: `
    <rect x="24" y="44" width="152" height="17" rx="6" fill="${R}"/>
    <rect x="42" y="62" width="112" height="8" rx="3" fill="${F}"/>
    <path d="M54 70 v16 q0 7 -8 9 l-14 4" fill="none" stroke="${F}" stroke-width="8" stroke-linecap="round"/>
    <rect x="22" y="98" width="38" height="7" rx="3" fill="${F}"/>
    <path d="M142 72 q18 5 19 20 q0 10 -9 11 M142 72 q-18 5 -19 20 q0 10 9 11" fill="none" stroke="${F}" stroke-width="7" stroke-linecap="round"/>
    <rect x="112" y="101" width="26" height="6" rx="3" fill="${F}"/>
    <rect x="144" y="101" width="26" height="6" rx="3" fill="${F}"/>`,
  barra: `
    <rect x="12" y="62" width="176" height="6" rx="3" fill="${C}"/>
    <rect x="24" y="55" width="26" height="20" rx="4" fill="${C}"/>
    <rect x="150" y="55" width="26" height="20" rx="4" fill="${C}"/>
    <rect x="50" y="57" width="7" height="16" rx="2" fill="${D}"/>
    <rect x="143" y="57" width="7" height="16" rx="2" fill="${D}"/>
    <line x1="66" y1="65" x2="134" y2="65" stroke="${G}" stroke-width="1.2" stroke-dasharray="2 3"/>`,
  discos: `
    <line x1="16" y1="112" x2="184" y2="112" stroke="${G}" stroke-width="2"/>
    <circle cx="70" cy="72" r="40" fill="${D}"/>
    <circle cx="70" cy="72" r="8" fill="${C}"/>
    <circle cx="122" cy="80" r="32" fill="${R}"/>
    <circle cx="122" cy="80" r="6.5" fill="${C}"/>
    <circle cx="162" cy="88" r="24" fill="${F}"/>
    <circle cx="162" cy="88" r="5" fill="${C}"/>`,
  arbol: `
    <rect x="70" y="108" width="64" height="7" rx="3" fill="${F}"/>
    <rect x="97" y="18" width="10" height="92" rx="3" fill="${F}"/>
    <rect x="60" y="40" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="106" y="40" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="60" y="72" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="106" y="72" width="38" height="6" rx="3" fill="${D}"/>
    <circle cx="66" cy="43" r="11" fill="${D}"/><circle cx="66" cy="43" r="3" fill="${C}"/>
    <circle cx="138" cy="43" r="11" fill="${R}"/><circle cx="138" cy="43" r="3" fill="${C}"/>
    <circle cx="66" cy="75" r="11" fill="${F}"/><circle cx="66" cy="75" r="3" fill="${C}"/>`,
  quimera: `
    <rect x="46" y="22" width="86" height="86" rx="5" fill="none" stroke="${G}" stroke-width="2.4" stroke-dasharray="6 4"/>
    <path d="M60 88 v-30 h20 v14 h22 v16" fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="146" cy="46" r="17" fill="none" stroke="${R}" stroke-width="5"/>
    <path d="M146 29 v-8 M146 63 v8 M129 46 h-8 M163 46 h8 M134 34 l-6 -6 M158 58 l6 6 M158 34 l6 -6 M134 58 l-6 6" stroke="${R}" stroke-width="4" stroke-linecap="round"/>`,
};

type Categoria = "racks" | "pesos" | "poleas" | "bancos" | "accesorios";

interface Producto {
  id: string;
  marca: string;
  nombre: [string, string];
  categoria: Categoria;
  precio: number;
  /** Precio anterior: si está, el producto va EN OFERTA. */
  antes?: number;
  nota: [string, string];
  rating: string;
  arte: string;
}

const CATALOGO: Producto[] = [
  { id: "rack", marca: "IronForge Equipment", nombre: ["Power rack IF-700", "IF-700 power rack"], categoria: "racks", precio: 1290, antes: 1490, nota: ["Perfil 3×3\" · pruébalo en el Builder", "3×3\" profile · try it in the Builder"], rating: "★★★★★ 4.9", arte: ARTE.rack },
  { id: "torre", marca: "Andes Strength Co.", nombre: ["Torre de polea dual", "Dual pulley tower"], categoria: "poleas", precio: 2150, antes: 2490, nota: ["Pila selectorizada de 90 kg", "90 kg selectorized stack"], rating: "★★★★★ 4.8", arte: ARTE.torre },
  { id: "banco", marca: "Taller Quimera", nombre: ["Banco plano clásico", "Classic flat bench"], categoria: "bancos", precio: 199, antes: 249, nota: ["El modelo de la biblioteca nativa", "The native library model"], rating: "★★★★★ 4.7", arte: ARTE.banco },
  { id: "jota", marca: "IronForge Equipment", nombre: ["Jota con rodillo UHMW", "UHMW roller J-hook"], categoria: "accesorios", precio: 89, antes: 109, nota: ["Calza en pinholes de 5 cm", "Fits 5 cm pinholes"], rating: "★★★★☆ 4.6", arte: ARTE.jota },
  { id: "cadenas", marca: "IronForge Equipment", nombre: ["Cadenas de seguridad (par)", "Safety chains (pair)"], categoria: "accesorios", precio: 59, nota: ["Detienen la barra como en la app", "They stop the bar, app-style"], rating: "★★★★★ 4.9", arte: ARTE.cadenas },
  { id: "barra", marca: "Andes Strength Co.", nombre: ["Barra olímpica 20 kg", "20 kg olympic barbell"], categoria: "pesos", precio: 189, nota: ["Cromada, Ø 28 mm, agarre medio", "Chromed, Ø 28 mm, medium knurl"], rating: "★★★★☆ 4.5", arte: ARTE.barra },
  { id: "discos", marca: "Taller Quimera", nombre: ["Set discos bumper 100 kg", "100 kg bumper plate set"], categoria: "pesos", precio: 420, antes: 520, nota: ["Goma vulcanizada, rebote muerto", "Vulcanized rubber, dead bounce"], rating: "★★★★★ 4.8", arte: ARTE.discos },
  { id: "multigrip", marca: "Andes Strength Co.", nombre: ["Barra de jalón multigrip", "Multigrip lat bar"], categoria: "poleas", precio: 145, nota: ["Cromada, Ø 32 mm", "Chromed, Ø 32 mm"], rating: "★★★★☆ 4.4", arte: ARTE.multigrip },
  { id: "arbol", marca: "IronForge Equipment", nombre: ["Árbol de discos", "Plate tree"], categoria: "accesorios", precio: 120, antes: 150, nota: ["Seis cuernos, base estable", "Six horns, stable base"], rating: "★★★★☆ 4.6", arte: ARTE.arbol },
  { id: "quimera", marca: "Taller Quimera", nombre: ["Tu diseño, fabricado", "Your design, built"], categoria: "racks", precio: 0, nota: ["Sube tu prefab .json y recibe oferta", "Upload your .json prefab for a quote"], rating: "★★★★★ 5.0", arte: ARTE.quimera },
];

const CATEGORIAS: [Categoria | "todo", string, string][] = [
  ["todo", "Todo", "All"],
  ["racks", "Racks", "Racks"],
  ["poleas", "Poleas", "Pulleys"],
  ["pesos", "Pesos y barras", "Weights & bars"],
  ["bancos", "Bancos", "Benches"],
  ["accesorios", "Accesorios", "Accessories"],
];

function precio$(n: number): string {
  return `$ ${n.toLocaleString("es-CL")}`;
}

/** CATÁLOGO DE VENTA: grilla de productos con imagen, oferta y carrito demo. */
function seccionCatalogo(acciones: MarketplaceAcciones): HTMLElement {
  const carrito = new Map<string, { p: Producto; n: number }>();

  // Barra del carrito (aparece con el primer artículo).
  const resumen = el("span", { class: "mkc-carrito-txt" }, [""]);
  const bPedido = botonDemo(
    tt("🧾 Pedido demo", "🧾 Demo order"),
    true,
    tt("✓ Pedido demo registrado", "✓ Demo order logged"),
  );
  const bVaciar = el("button", { class: "land-btn mk-btn" }, [tt("Vaciar", "Empty")]);
  const barraCarrito = el("div", { class: "mkc-carrito mkc-oculto" }, [resumen, bPedido, bVaciar]);
  const pintarCarrito = (): void => {
    let n = 0;
    let total = 0;
    for (const e of carrito.values()) {
      n += e.n;
      total += e.n * e.p.precio;
    }
    barraCarrito.classList.toggle("mkc-oculto", n === 0);
    resumen.textContent = `🛒 ${n} ${n === 1 ? tt("artículo", "item") : tt("artículos", "items")} · ${precio$(total)}`;
  };
  bVaciar.addEventListener("click", () => {
    carrito.clear();
    pintarCarrito();
  });

  const tarjeta = (p: Producto): HTMLElement => {
    const img = el("div", { class: "mkc-img" });
    img.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${p.arte}</svg>`;
    const hijos: HTMLElement[] = [img];
    if (p.antes) {
      const pct = Math.round((1 - p.precio / p.antes) * 100);
      hijos.push(el("span", { class: "mkc-badge" }, [`OFERTA −${pct}%`]));
    }
    const precios = p.precio > 0
      ? el("div", { class: "mkc-precios" }, [
          ...(p.antes ? [el("span", { class: "mkc-antes" }, [precio$(p.antes)])] : []),
          el("span", { class: "mkc-precio" }, [precio$(p.precio)]),
        ])
      : el("div", { class: "mkc-precios" }, [el("span", { class: "mkc-precio" }, [tt("cotiza", "get a quote")])]);
    const bAgregar = el("button", { class: "land-btn mk-btn mkc-agregar" }, [
      p.precio > 0 ? tt("🛒 Añadir", "🛒 Add") : tt("📤 Cotizar", "📤 Quote"),
    ]);
    bAgregar.addEventListener("click", () => {
      if (p.precio <= 0) {
        bAgregar.replaceChildren(tt("✓ Solicitud demo registrada", "✓ Demo request logged"));
        setTimeout(() => bAgregar.replaceChildren(tt("📤 Cotizar", "📤 Quote")), 1800);
        return;
      }
      const e = carrito.get(p.id) ?? { p, n: 0 };
      e.n++;
      carrito.set(p.id, e);
      pintarCarrito();
      bAgregar.classList.add("active");
      setTimeout(() => bAgregar.classList.remove("active"), 350);
    });
    const bVer = el("button", { class: "land-btn mk-btn" }, [tt("🧩 Ver", "🧩 View")]);
    bVer.title = tt("Ver en biblioteca (showroom)", "View in library (showroom)");
    bVer.addEventListener("click", () => acciones.verBiblioteca?.());
    hijos.push(
      el("div", { class: "mkc-marca" }, [p.marca]),
      el("div", { class: "mkc-nombre" }, [tt(p.nombre[0], p.nombre[1])]),
      el("div", { class: "mkc-rating" }, [p.rating]),
      el("div", { class: "mk-item-nota" }, [tt(p.nota[0], p.nota[1])]),
      precios,
      el("div", { class: "mkc-acciones" }, [bAgregar, bVer]),
    );
    return el("div", { class: "mk-card mkc-card" }, hijos);
  };

  const grilla = el("div", { class: "mkc-grid" });
  const chips = el("div", { class: "mkc-chips" });
  let activa: Categoria | "todo" = "todo";
  const pintarGrilla = (): void => {
    grilla.replaceChildren(
      ...CATALOGO.filter((p) => activa === "todo" || p.categoria === activa).map(tarjeta),
    );
  };
  for (const [cat, es, en] of CATEGORIAS) {
    const chip = el("button", { class: "mkc-chip" }, [tt(es, en)]);
    if (cat === "todo") chip.classList.add("active");
    chip.addEventListener("click", () => {
      activa = cat;
      for (const c of [...chips.children]) c.classList.toggle("active", c === chip);
      pintarGrilla();
    });
    chips.append(chip);
  }
  pintarGrilla();

  return el("div", {}, [
    el("div", { class: "mk-titulo" }, [tt("🏬 Catálogo de venta — showroom virtual", "🏬 Sales catalog — virtual showroom")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Los equipos de cada marca se instalan como ítems de biblioteca: pruébalos en tu sala ANTES de comprar. Las OFERTAS se marcan con su descuento.",
        "Each brand's equipment installs as library items: try them in your gym BEFORE buying. DEALS are tagged with their discount.",
      ),
    ]),
    chips,
    barraCarrito,
    grilla,
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
      seccionCatalogo(acciones),
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
