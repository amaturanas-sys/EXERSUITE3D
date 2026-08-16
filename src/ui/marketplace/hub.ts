/**
 * EL HUB (v0.2.62) — reforma sobre la maqueta conceptual del diseñador.
 *
 * Cambia la ESTRUCTURA, no solo la piel. Antes eran siete ventanas y cada una
 * era una página entera; ahora hay una sola página con tres franjas fijas y una
 * banda que cambia:
 *
 *   CABECERA     logotipo + sello HUB
 *   HISTORIAS    las siete marcas, permanentes y arriba del todo (antes vivían
 *                enterradas dentro de la Vitrina, en la cuarta pestaña)
 *   PESTAÑAS     cinco recorridos curados; cada uno pinta su banner
 *   MERCADO      el catálogo COMPLETO, siempre visible, con buscador y tres
 *                desplegables (antes estaba repartido en cuatro ventanas que
 *                vendían lo mismo con distinto filtro)
 *   UNIRSE       alta de marca, al pie de la misma página
 *
 * El maniquí de la aplicación no entra aquí: esto es la tienda.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import {
  CATALOGO,
  MARCAS,
  type Marca,
  type Producto,
  marca,
  marcasNuevas,
  paisUsuario,
  precio$,
  productosNuevos,
} from "./datos";
import { ARTE, LOGOS } from "./arte";
import { Carrito, type MarketplaceAcciones } from "./comunes";

/**
 * LOS CINCO RECORRIDOS.
 *
 * Cada pestaña es un banner y —esto es lo que hay que decidir— también un
 * FILTRO del mercado de abajo. Sin el filtro, cambiar de pestaña solo cambia
 * una fotografía y las cinco enseñan el mismo catálogo.
 */
interface Recorrido {
  id: string;
  etiqueta: string;
  titulo: [string, string];
  bajada: [string, string];
  /** Qué deja pasar al mercado. `null` = el catálogo entero. */
  filtro: ((p: Producto) => boolean) | null;
  arte: string;
}

const NUEVAS = new Set(marcasNuevas().map((m) => m.id));
const PYMES = new Set(MARCAS.filter((m) => m.pyme).map((m) => m.id));
const ESTRENOS = new Set(productosNuevos().map((p) => p.id));

const RECORRIDOS: Recorrido[] = [
  {
    id: "newarrivals",
    etiqueta: "NewArrivals",
    titulo: ["NewArrivals", "NewArrivals"],
    bajada: [
      "Los últimos equipos 3D listos para prototipar tu espacio",
      "The latest 3D equipment, ready to prototype your space",
    ],
    filtro: (p) => ESTRENOS.has(p.id),
    arte: ARTE.jaula,
  },
  {
    id: "newcomers",
    etiqueta: "NewComers",
    titulo: ["NewComers", "NewComers"],
    bajada: [
      "Marcas que acaban de entrar y estrenan su vitrina digital",
      "Brands that just joined and are opening their digital showcase",
    ],
    filtro: (p) => NUEVAS.has(p.marcaId),
    arte: ARTE.trineo,
  },
  {
    id: "community",
    etiqueta: "HelpYourCommunity",
    titulo: ["HelpYourCommunity", "HelpYourCommunity"],
    bajada: [
      "Talleres que fabrican cerca: envío corto, repuestos a mano",
      "Workshops that build nearby: short shipping, spares at hand",
    ],
    filtro: (p) => PYMES.has(p.marcaId),
    arte: ARTE.banco,
  },
  {
    id: "ondemand",
    etiqueta: "OnDemand",
    titulo: ["OnDemand", "OnDemand"],
    bajada: [
      "Tu diseño, fabricado: manda el prefab y recibe una valoración",
      "Your design, built: send the prefab and get a real quote",
    ],
    filtro: (p) => p.precio === 0,
    arte: ARTE.quimera,
  },
  {
    id: "formakers",
    etiqueta: "ForMakers",
    titulo: ["ForMakers", "ForMakers"],
    bajada: [
      "Diseños originales, patrocinio y equipos de trabajo",
      "Original designs, sponsorship and work groups",
    ],
    filtro: null,
    arte: ARTE.escaner,
  },
];

const CATEGORIAS_SEL: [string, string, string][] = [
  ["", "Categoría", "Category"],
  ["racks", "Racks", "Racks"],
  ["bancos", "Bancos", "Benches"],
  ["poleas", "Poleas", "Pulleys"],
  ["pesos", "Peso libre", "Free weights"],
  ["maquinas", "Máquinas", "Machines"],
  ["accesorios", "Accesorios", "Accessories"],
];

const PRECIOS: [string, string, string, (n: number) => boolean][] = [
  ["", "Precio", "Price", () => true],
  ["a", "$0 – $500", "$0 – $500", (n) => n > 0 && n <= 500],
  ["b", "$500 – $1.500", "$500 – $1,500", (n) => n > 500 && n <= 1500],
  ["c", "$1.500+", "$1,500+", (n) => n > 1500],
];

/** Un `<select>` con el aspecto del hub. */
function desplegable(id: string, opciones: [string, string, string][]): HTMLSelectElement {
  const s = el("select", { class: "hub-select", id }) as HTMLSelectElement;
  for (const [v, es, en] of opciones) {
    const o = el("option", { value: v }, [tt(es, en)]) as HTMLOptionElement;
    s.append(o);
  }
  return s;
}

/**
 * VALORACIÓN EN DISCOS.
 *
 * El diseñador cambió las estrellas por cinco discos de pesa, que es el mismo
 * gesto que ya usa toda la aplicación para hablar de carga. El dato de origen
 * sigue siendo la cadena «★★★★★ 4.9» del catálogo: se cuentan las estrellas
 * llenas.
 */
function discos(rating: string): HTMLElement {
  const llenos = (rating.match(/★/g) ?? []).length;
  const fila = el("div", { class: "hub-discos" });
  fila.setAttribute("role", "img");
  fila.setAttribute("aria-label", tt(`${llenos} de 5`, `${llenos} of 5`));
  for (let i = 0; i < 5; i++) {
    fila.append(el("span", { class: i < llenos ? "hub-disco lleno" : "hub-disco" }));
  }
  return fila;
}

/** Lámina de un producto: SVG de la hoja de arte, encuadrado como fotografía. */
function lamina(arte: string, clase = "hub-foto"): HTMLElement {
  const d = el("div", { class: clase });
  d.innerHTML = `<svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice"
    width="100%" height="100%" aria-hidden="true">${arte}</svg>`;
  return d;
}

/** Tarjeta de producto del mercado. */
function tarjeta(p: Producto, carrito: Carrito, acciones: MarketplaceAcciones): HTMLElement {
  const art = el("article", { class: "hub-card" });
  art.dataset.categoria = p.categoria;
  art.dataset.marca = p.marcaId;
  art.dataset.precio = String(p.precio);
  art.dataset.busca = [
    p.nombre[0],
    p.nombre[1],
    p.nota[0],
    p.nota[1],
    marca(p.marcaId).nombre,
    p.categoria,
  ]
    .join(" ")
    .toLowerCase();

  const precio = p.precio > 0
    ? el("span", { class: "hub-precio" }, [`${precio$(p.precio)} USD`])
    : el("span", { class: "hub-precio" }, [tt("A cotizar", "Get a quote")]);

  const anadir = el("button", { class: "hub-btn-card" }, [
    p.precio > 0 ? tt("Añadir", "Add") : tt("Cotizar", "Quote"),
  ]);
  anadir.addEventListener("click", () => {
    if (p.precio <= 0) {
      anadir.replaceChildren(tt("✓ Solicitado", "✓ Requested"));
      setTimeout(() => anadir.replaceChildren(tt("Cotizar", "Quote")), 1600);
      return;
    }
    carrito.añadir(p);
    anadir.classList.add("ok");
    setTimeout(() => anadir.classList.remove("ok"), 350);
  });

  const ver = el("button", { class: "hub-btn-card" }, [tt("Ver en 3D", "View in 3D")]);
  ver.addEventListener("click", () => acciones.verBiblioteca?.());

  art.append(
    lamina(p.arte),
    el("div", { class: "hub-card-cuerpo" }, [
      el("h3", { class: "hub-card-nombre" }, [tt(p.nombre[0], p.nombre[1])]),
      el("p", { class: "hub-card-marca" }, [marca(p.marcaId).nombre]),
      el("div", { class: "hub-card-pie" }, [precio, discos(p.rating)]),
      el("div", { class: "hub-card-acciones" }, [anadir, ver]),
    ]),
  );
  return art;
}

/** Burbuja de historia de una marca. */
function burbuja(m: Marca, alPulsar: (m: Marca) => void): HTMLElement {
  const aro = el("div", { class: m.antiguedadMeses <= 4 ? "hub-aro nuevo" : "hub-aro" });
  const foto = el("div", { class: "hub-aro-foto" });
  foto.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">${LOGOS[m.id] ?? ""}</svg>`;
  aro.append(foto);
  const b = el("button", { class: "hub-historia" }, [
    aro,
    el("span", { class: "hub-historia-txt" }, [m.corto]),
  ]);
  b.setAttribute("aria-label", tt(`Historia de ${m.nombre}`, `${m.nombre} story`));
  b.addEventListener("click", () => alPulsar(m));
  return b;
}

/** Campo del formulario de alta. */
function campoHub(etiqueta: string, tipo: "text" | "email" | "tel" | "area"): HTMLElement {
  const control = tipo === "area"
    ? el("textarea", { class: "hub-input hub-area", rows: 3 })
    : el("input", { class: "hub-input", type: tipo });
  return el("label", { class: "hub-campo" }, [
    el("span", {}, [etiqueta]),
    control,
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════

/** Las de siempre más la salida del hub, que vive en la cabecera. */
export type HubAcciones = MarketplaceAcciones & { salir?: () => void };

export function renderHub(cont: HTMLElement, acciones: HubAcciones = {}): void {
  const carrito = new Carrito();

  // ── Cabecera ─────────────────────────────────────────────────────────────
  const logo = el("div", { class: "hub-logo" });
  logo.innerHTML = `<img src="${import.meta.env.BASE_URL}brand/favicon-32.png" alt="" width="40" height="40">`;
  // En el teléfono la cabecera no da para la frase entera; la cola se esconde.
  const volver = el("button", { class: "hub-volver" }, [
    tt("← Volver", "← Back"),
    el("span", { class: "hub-volver-cola" }, [tt(" a EXERSUITE3D", " to EXERSUITE3D")]),
  ]);
  volver.addEventListener("click", () => acciones.salir?.());
  const cabecera = el("header", { class: "hub-cabecera" }, [
    el("div", { class: "hub-cabecera-int" }, [
      el("div", { class: "hub-marca" }, [logo, el("h1", {}, ["EXERSUITE3D"])]),
      el("div", { class: "hub-cabecera-der" }, [
        ...(acciones.salir ? [volver] : []),
        el("span", { class: "hub-sello" }, ["HUB"]),
      ]),
    ]),
  ]);

  // ── Historias ────────────────────────────────────────────────────────────
  const carril = el("div", { class: "hub-carril" });
  const historias = el("section", { class: "hub-historias" }, [
    el("div", { class: "hub-int" }, [carril]),
  ]);

  // ── Pestañas + banner ────────────────────────────────────────────────────
  const nav = el("nav", { class: "hub-tabs" });
  const banner = el("div", { class: "hub-banner" });

  // ── Mercado ──────────────────────────────────────────────────────────────
  const buscador = el("input", {
    class: "hub-buscar",
    type: "search",
    placeholder: tt("Buscar equipamiento…", "Search equipment…"),
  }) as HTMLInputElement;
  const selCat = desplegable("hub-cat", CATEGORIAS_SEL);
  const selMarca = desplegable("hub-marca", [
    ["", "Marca", "Brand"],
    ...MARCAS.map((m) => [m.id, m.nombre, m.nombre] as [string, string, string]),
  ]);
  const selPrecio = desplegable(
    "hub-precio",
    PRECIOS.map(([v, es, en]) => [v, es, en] as [string, string, string]),
  );
  const rejilla = el("div", { class: "hub-rejilla" });
  const vacio = el("p", { class: "hub-vacio oculto" }, [
    tt("No se encontraron productos.", "No products found."),
  ]);
  const cuenta = el("span", { class: "hub-cuenta" });

  const tarjetas = CATALOGO.map((p) => ({ p, nodo: tarjeta(p, carrito, acciones) }));
  for (const { nodo } of tarjetas) rejilla.append(nodo);

  let recorrido: Recorrido = RECORRIDOS[0];

  const filtrar = (): void => {
    const q = buscador.value.trim().toLowerCase();
    const cat = selCat.value;
    const mk = selMarca.value;
    const pr = PRECIOS.find(([v]) => v === selPrecio.value)?.[3] ?? (() => true);
    let visibles = 0;
    for (const { p, nodo } of tarjetas) {
      const ok =
        (!recorrido.filtro || recorrido.filtro(p)) &&
        (!q || nodo.dataset.busca!.includes(q)) &&
        (!cat || p.categoria === cat) &&
        (!mk || p.marcaId === mk) &&
        pr(p.precio);
      nodo.classList.toggle("oculto", !ok);
      if (ok) visibles++;
    }
    vacio.classList.toggle("oculto", visibles > 0);
    cuenta.textContent = tt(
      `${visibles} de ${CATALOGO.length} productos`,
      `${visibles} of ${CATALOGO.length} products`,
    );
  };

  const irA = (r: Recorrido): void => {
    recorrido = r;
    for (const b of [...nav.children]) {
      b.classList.toggle("activa", (b as HTMLElement).dataset.rec === r.id);
    }
    banner.replaceChildren(
      lamina(r.arte, "hub-banner-foto"),
      el("div", { class: "hub-banner-txt" }, [
        el("h2", {}, [tt(r.titulo[0], r.titulo[1])]),
        el("p", {}, [tt(r.bajada[0], r.bajada[1])]),
      ]),
    );
    filtrar();
  };

  for (const r of RECORRIDOS) {
    const b = el("button", { class: "hub-tab" }, [r.etiqueta]);
    b.dataset.rec = r.id;
    b.addEventListener("click", () => irA(r));
    nav.append(b);
  }

  for (const m of MARCAS) {
    carril.append(
      burbuja(m, (mm) => {
        selMarca.value = mm.id;
        filtrar();
        document.querySelector(".hub-mercado")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
  }

  buscador.addEventListener("input", filtrar);
  for (const s of [selCat, selMarca, selPrecio]) s.addEventListener("change", filtrar);

  const mercado = el("section", { class: "hub-mercado" }, [
    el("div", { class: "hub-int" }, [
      el("h2", { class: "hub-titulo" }, [tt("Mercado", "Market")]),
      el("div", { class: "hub-filtros" }, [
        el("div", { class: "hub-buscar-caja" }, [buscador]),
        selCat,
        selMarca,
        selPrecio,
      ]),
      el("div", { class: "hub-filtros-pie" }, [cuenta]),
      rejilla,
      vacio,
    ]),
  ]);

  // ── Unirse ───────────────────────────────────────────────────────────────
  const enviar = el("button", { class: "hub-enviar", type: "button" }, [
    tt("Enviar Solicitud", "Send request"),
  ]);
  const aviso = el("p", { class: "hub-aviso oculto" }, [
    tt("✓ Solicitud demo registrada.", "✓ Demo request logged."),
  ]);
  enviar.addEventListener("click", () => {
    aviso.classList.remove("oculto");
    setTimeout(() => aviso.classList.add("oculto"), 2600);
  });

  const unirse = el("section", { class: "hub-unirse" }, [
    el("div", { class: "hub-int hub-unirse-grid" }, [
      el("div", {}, [
        el("h2", { class: "hub-titulo" }, ["JOINEXERSUITE3D"]),
        el("p", { class: "hub-parrafo" }, [
          tt(
            "¿Eres una marca de equipamiento fitness? Solicita nuestro servicio de escaneo fotográfico 3D y publica tus productos en el Hub. Tus clientes podrán visualizar tu oferta, prototipar sus espacios y solicitar personalizados.",
            "Are you a fitness equipment brand? Request our 3D photographic scanning service and publish your products in the Hub. Your customers will be able to see your range, prototype their spaces and request custom builds.",
          ),
        ]),
        lamina(ARTE.escaner, "hub-unirse-foto"),
      ]),
      el("form", { class: "hub-form" }, [
        campoHub(tt("Nombre de la Marca", "Brand name"), "text"),
        campoHub(tt("Nombre de Contacto", "Contact name"), "text"),
        campoHub(tt("Correo Electrónico", "Email"), "email"),
        campoHub(tt("Teléfono", "Phone"), "tel"),
        campoHub(tt("Mensaje", "Message"), "area"),
        enviar,
        aviso,
      ]),
    ]),
  ]);

  const pie = el("footer", { class: "hub-pie" }, [
    el("p", {}, [
      tt(
        "© 2026 Exersuite3D — Diseño y prototipo 3D de equipamiento fitness",
        "© 2026 Exersuite3D — 3D design and prototyping of fitness equipment",
      ),
    ]),
    el("p", { class: "hub-pie-demo" }, [
      tt(
        "Maqueta de producto: las marcas mostradas son ficticias y las acciones comerciales aún no están operativas.",
        "Product mockup: brands shown are fictitious and commercial actions are not yet live.",
      ),
    ]),
  ]);

  cont.append(
    cabecera,
    historias,
    el("section", { class: "hub-recorridos" }, [
      el("div", { class: "hub-int" }, [nav, banner]),
    ]),
    mercado,
    unirse,
    pie,
  );

  irA(RECORRIDOS[0]);
  // El país guardado sigue mandando en el orden del carril de historias.
  void paisUsuario();
}
