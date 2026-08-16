/**
 * EL HUB (v0.2.63) — reforma sobre la maqueta conceptual del diseñador.
 *
 * Cambia la ESTRUCTURA, no solo la piel. Antes eran siete ventanas y cada una
 * era una página entera; ahora hay una sola página que se recorre de arriba
 * abajo:
 *
 *   CABECERA     logotipo, salida a la aplicación y sello HUB
 *   HISTORIAS    las siete marcas, permanentes y arriba del todo (antes vivían
 *                enterradas dentro de la Vitrina, en la cuarta pestaña)
 *   RECORRIDOS   un carrusel de cinco láminas; las pestañas lo NAVEGAN
 *   VENTANA      lo que hay debajo: el mercado, OnDemand o ForMakers
 *   UNIRSE       alta de marca, al pie de la misma página
 *
 * DOS GESTOS DISTINTOS, Y NO DA IGUAL CUÁL. La pestaña **mueve** el carrusel y
 * nada más: enseña la lámina del recorrido sin tocar lo de abajo. Lo que
 * **entra** en un recorrido es pulsar la lámina grande. Así hojear los cinco
 * recorridos es gratis —no reordena la página bajo el cursor— y entrar es un
 * acto deliberado. El carrusel se arrastra además con el cursor, igual que con
 * el dedo (ver `carrusel.ts`).
 *
 * ADÓNDE LLEVA CADA RECORRIDO. Tres de los cinco son cortes del mismo catálogo
 * y se quedan en el mercado, filtrándolo. Los otros dos NO son tienda y por eso
 * la ventana de abajo se cambia entera:
 *
 *   · ONDEMAND   diseños que su marca abre a modificación — color, grabado,
 *                piezas extra— y que el cliente puede prototipar en 3D antes
 *                de decidir la estética;
 *   · FORMAKERS  el tablón tipo Kickstarter de los diseñadores independientes,
 *                que buscan respaldo de la comunidad o una marca que se sume.
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
import { ARTE } from "./arte";
import { Carrito, type MarketplaceAcciones } from "./comunes";
import { arrastrable, suavidad } from "./carrusel";
import { lamina } from "./imagen";
import { panelOnDemand } from "./ondemand";
import { panelForMakers } from "./formakers";

/**
 * LOS CINCO RECORRIDOS.
 *
 * Cada uno es una lámina del carrusel y un destino. El destino manda sobre qué
 * pasa con la ventana de abajo al ENTRAR en el recorrido: `mercado` la deja
 * donde está y le aplica un filtro; `panel` la cambia por otra cosa.
 */
type Destino =
  | { tipo: "mercado"; filtro: ((p: Producto) => boolean) | null }
  | { tipo: "panel"; panel: "ondemand" | "formakers" };

interface Recorrido {
  id: string;
  etiqueta: string;
  titulo: [string, string];
  bajada: [string, string];
  destino: Destino;
  arte: string;
  /** Fotografía del banner, en `public/marketplace/`. */
  foto: string;
  /** Encuadre vertical del banner, si el centro no sirve. */
  foco?: string;
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
    destino: { tipo: "mercado", filtro: (p) => ESTRENOS.has(p.id) },
    arte: ARTE.jaula,
    foto: "rec-newarrivals.webp",
  },
  {
    id: "newcomers",
    etiqueta: "NewComers",
    titulo: ["NewComers", "NewComers"],
    bajada: [
      "Marcas que acaban de entrar y estrenan su vitrina digital",
      "Brands that just joined and are opening their digital showcase",
    ],
    destino: { tipo: "mercado", filtro: (p) => NUEVAS.has(p.marcaId) },
    arte: ARTE.trineo,
    foto: "rec-newcomers.webp",
  },
  {
    id: "community",
    etiqueta: "HelpYourCommunity",
    titulo: ["HelpYourCommunity", "HelpYourCommunity"],
    bajada: [
      "Talleres que fabrican cerca: envío corto, repuestos a mano",
      "Workshops that build nearby: short shipping, spares at hand",
    ],
    destino: { tipo: "mercado", filtro: (p) => PYMES.has(p.marcaId) },
    arte: ARTE.banco,
    foto: "rec-community.webp",
    foco: "center 22%",
  },
  {
    id: "ondemand",
    etiqueta: "OnDemand",
    titulo: ["OnDemand", "OnDemand"],
    bajada: [
      "Diseños de marca que se pintan, se graban y se amplían a tu gusto",
      "Brand designs you can paint, engrave and extend to taste",
    ],
    destino: { tipo: "panel", panel: "ondemand" },
    arte: ARTE.quimera,
    foto: "rec-ondemand.webp",
  },
  {
    id: "formakers",
    etiqueta: "ForMakers",
    titulo: ["ForMakers", "ForMakers"],
    bajada: [
      "Proyectos de la comunidad buscando respaldo o una marca que se sume",
      "Community projects looking for backing, or a brand to join in",
    ],
    destino: { tipo: "panel", panel: "formakers" },
    arte: ARTE.escaner,
    foto: "rec-formakers.webp",
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
 * gesto que ya usa toda la aplicación para hablar de carga, y en v0.2.67 los
 * dibujó como el disco de verdad de la marca: aro exterior grueso, buje y
 * agujero. Lleno en blanco, vacío en gris, y la cuenta escrita al lado
 * —«4/5»— porque a dieciocho píxeles contar aros cuesta.
 *
 * El dibujo se quedó en DOS aros. Los cuatro radios en diagonal del disco
 * real se probaron y a este tamaño lo único que hacían era emborronar el
 * centro: cinco discos seguidos parecían una fila de tuercas.
 *
 * Va en SVG y no en mapa de bits por dos razones: a este tamaño una fotografía
 * del disco sería un borrón, y el color tiene que poder cambiarlo el CSS. Todo
 * el dibujo usa `currentColor`, así que lleno y vacío son la misma pieza con
 * distinto color heredado.
 *
 * El dato de origen sigue siendo la cadena «★★★★★ 4.9» del catálogo: se cuentan
 * las estrellas llenas.
 */
const DISCO = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="4"/>
  <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="3.2"/>
</svg>`;

function discos(rating: string): HTMLElement {
  const llenos = (rating.match(/★/g) ?? []).length;
  const fila = el("div", { class: "hub-discos" });
  fila.setAttribute("role", "img");
  fila.setAttribute("aria-label", tt(`${llenos} de 5`, `${llenos} of 5`));
  for (let i = 0; i < 5; i++) {
    const d = el("span", { class: i < llenos ? "hub-disco lleno" : "hub-disco" });
    d.innerHTML = DISCO;
    fila.append(d);
  }
  fila.append(el("span", { class: "hub-nota" }, [`${llenos}/5`]));
  return fila;
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
    // Las fichas que ya tienen fotografía la enseñan; el resto, su dibujo. Van
    // diferidas: de dieciocho tarjetas, en pantalla caben tres.
    lamina(p.arte, "hub-foto", { foto: p.foto, diferida: true }),
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
  // El emblema va sobre blanco, como el avatar de una marca en cualquier otro
  // sitio: son logotipos de tinta oscura y sobre el negro del hub se perderían.
  const foto = lamina("", "hub-aro-foto", { foto: `marcas/${m.logo}` });
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
  // El logotipo completo —marca y nombre en una sola pieza— en vez del icono
  // pequeño más un <h1> repitiendo lo que el propio logotipo ya dice.
  const logo = el("div", { class: "hub-logo" });
  logo.innerHTML =
    `<img src="${import.meta.env.BASE_URL}brand/logo-hub.webp" alt="EXERSUITE3D">`;
  // El logotipo ya dice el nombre, así que el botón no tiene que repetirlo.
  const volver = el("button", { class: "hub-volver" }, [tt("← Volver", "← Back")]);
  volver.addEventListener("click", () => acciones.salir?.());
  const cabecera = el("header", { class: "hub-cabecera" }, [
    el("div", { class: "hub-cabecera-int" }, [
      el("div", { class: "hub-marca" }, [logo]),
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

  // ── Recorridos: pestañas que navegan + carrusel que entra ────────────────
  const nav = el("nav", { class: "hub-tabs" });
  const pista = el("div", { class: "hub-carrusel" });
  pista.setAttribute("role", "group");
  pista.setAttribute("aria-roledescription", tt("carrusel", "carousel"));
  const diapos: HTMLElement[] = [];
  const rotulos: HTMLElement[] = [];

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
  /** Se enciende con un recorrido puesto y es la forma corta de quitarlo. */
  const marbete = el("button", { class: "hub-marbete oculto", type: "button" });

  const tarjetas = CATALOGO.map((p) => ({ p, nodo: tarjeta(p, carrito, acciones) }));
  for (const { nodo } of tarjetas) rejilla.append(nodo);

  /** Qué diapositiva se está mirando. Mirar no es entrar. */
  let vista = 0;
  /**
   * ADÓNDE VA EL DESLIZAMIENTO SUAVE EN CURSO.
   *
   * Sin esto, `vista` se iba con la animación: el oyente de `scroll` la
   * reescribía en cada cuadro con la lámina que pasaba por delante, así que
   * pulsar la lámina antes de que el carrusel se parara entraba en un recorrido
   * INTERMEDIO —o en ninguno—. Mientras dura el viaje manda el destino, no lo
   * que se vea de camino.
   *
   * El plazo es la red de seguridad: si la animación se interrumpe —el usuario
   * agarra el carril a media caricia— nadie avisa de que ya no va a llegar, y
   * sin caducidad `vista` se quedaría congelada.
   */
  let viajando: number | null = null;
  let viajeHasta = 0;
  const PLAZO_VIAJE = 900;
  /** Qué recorrido está PUESTO, que es lo único que cambia la ventana. */
  let puesto: Recorrido | null = null;

  const filtroPuesto = (): ((p: Producto) => boolean) | null =>
    puesto && puesto.destino.tipo === "mercado" ? puesto.destino.filtro : null;

  const filtrar = (): void => {
    const q = buscador.value.trim().toLowerCase();
    const cat = selCat.value;
    const mk = selMarca.value;
    const pr = PRECIOS.find(([v]) => v === selPrecio.value)?.[3] ?? (() => true);
    const rec = filtroPuesto();
    let visibles = 0;
    for (const { p, nodo } of tarjetas) {
      const ok =
        (!rec || rec(p)) &&
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

  // ── El carrusel ──────────────────────────────────────────────────────────
  //
  // La diapositiva a la vista se calcula por `offsetLeft` y no por
  // `índice × ancho`: así el hueco entre láminas, el ancho del móvil o
  // cualquier lámina que en el futuro no ocupe el 100 % siguen dando la cuenta
  // correcta sin tocar esto.
  const cerca = (): number => {
    let mejor = 0;
    let d = Infinity;
    for (let i = 0; i < diapos.length; i++) {
      const dd = Math.abs(diapos[i].offsetLeft - pista.scrollLeft);
      if (dd < d) {
        d = dd;
        mejor = i;
      }
    }
    return mejor;
  };

  /** Cuántos equipos deja ver un recorrido de mercado, para el rótulo. */
  const cuantos = (r: Recorrido): number =>
    r.destino.tipo !== "mercado"
      ? 0
      : r.destino.filtro
        ? CATALOGO.filter(r.destino.filtro).length
        : CATALOGO.length;

  const rotulo = (r: Recorrido): string => {
    const on = puesto?.id === r.id;
    if (r.destino.tipo === "panel") {
      return on
        ? tt("← Volver al mercado", "← Back to the market")
        : tt(`Entrar en ${r.etiqueta} →`, `Enter ${r.etiqueta} →`);
    }
    return on
      ? tt("✕ Quitar el filtro", "✕ Clear the filter")
      : tt(`Ver los ${cuantos(r)} equipos →`, `See the ${cuantos(r)} items →`);
  };

  const pintarEstado = (): void => {
    for (let i = 0; i < RECORRIDOS.length; i++) {
      const r = RECORRIDOS[i];
      const b = nav.children[i] as HTMLElement;
      b.classList.toggle("activa", i === vista);
      b.classList.toggle("puesta", puesto?.id === r.id);
      b.setAttribute("aria-current", i === vista ? "true" : "false");
      diapos[i].classList.toggle("puesta", puesto?.id === r.id);
      diapos[i].setAttribute("aria-hidden", i === vista ? "false" : "true");
      rotulos[i].replaceChildren(rotulo(r));
    }
    const on = puesto !== null;
    marbete.classList.toggle("oculto", !on);
    if (on) marbete.replaceChildren(`${puesto!.etiqueta}  ✕`);
  };

  const mostrar = (i: number, suave = true): void => {
    vista = Math.max(0, Math.min(RECORRIDOS.length - 1, i));
    const modo = suave ? suavidad() : "auto";
    viajando = modo === "smooth" ? vista : null;
    viajeHasta = performance.now() + PLAZO_VIAJE;
    pista.scrollTo({ left: diapos[vista].offsetLeft, behavior: modo });
    pintarEstado();
  };

  /** ENTRAR en un recorrido: lo único que toca la ventana de abajo. */
  const entrar = (r: Recorrido): void => {
    puesto = puesto?.id === r.id ? null : r;
    const panel = puesto?.destino.tipo === "panel" ? puesto.destino.panel : null;
    mercado.classList.toggle("oculto", panel !== null);
    panelOD.classList.toggle("oculto", panel !== "ondemand");
    panelFM.classList.toggle("oculto", panel !== "formakers");
    filtrar();
    pintarEstado();
    const abajo = panel === "ondemand" ? panelOD : panel === "formakers" ? panelFM : mercado;
    abajo.scrollIntoView({ behavior: suavidad(), block: "start" });
  };

  for (let i = 0; i < RECORRIDOS.length; i++) {
    const r = RECORRIDOS[i];

    // La pestaña SOLO navega.
    const b = el("button", { class: "hub-tab", type: "button" }, [r.etiqueta]);
    b.dataset.rec = r.id;
    b.addEventListener("click", () => mostrar(i));
    nav.append(b);

    // La lámina es la que entra.
    const cta = el("button", { class: "hub-cta", type: "button" });
    const diapo = el("div", { class: "hub-diapo" }, [
      el("div", { class: "hub-banner" }, [
        lamina(r.arte, "hub-banner-foto", { foto: r.foto, foco: r.foco }),
        el("div", { class: "hub-banner-txt" }, [
          el("h2", {}, [tt(r.titulo[0], r.titulo[1])]),
          el("p", {}, [tt(r.bajada[0], r.bajada[1])]),
          cta,
        ]),
      ]),
    ]);
    diapo.dataset.rec = r.id;
    // Pulsar una lámina que no está centrada la centra; entrar exige tenerla
    // delante, que es lo que pidió el diseñador.
    diapo.addEventListener("click", () => (i === vista ? entrar(r) : mostrar(i)));
    diapos.push(diapo);
    rotulos.push(cta);
    pista.append(diapo);
  }

  marbete.addEventListener("click", () => {
    if (puesto) entrar(puesto);
  });

  // Arrastre con el cursor y ajuste al soltar; el dedo ya lo hacía solo.
  arrastrable(pista, () => mostrar(cerca()));

  // El desplazamiento nativo —rueda, dedo, teclado— también manda en la
  // pestaña marcada. Se lee en el siguiente cuadro para no leer el `scrollLeft`
  // una vez por píxel.
  let pendiente = 0;
  pista.addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = requestAnimationFrame(() => {
      pendiente = 0;
      const i = cerca();
      if (viajando !== null && performance.now() < viajeHasta) {
        // Va de camino: lo que pasa por delante no cuenta como mirar.
        if (i === viajando) viajando = null;
        return;
      }
      viajando = null;
      if (i !== vista) {
        vista = i;
        pintarEstado();
      }
    });
  });

  // Al cambiar el ancho, la diapositiva a la vista se queda a medio camino.
  new ResizeObserver(() => {
    if (pista.classList.contains("arrastrando")) return;
    pista.scrollLeft = diapos[vista].offsetLeft;
  }).observe(pista);

  for (const m of MARCAS) {
    carril.append(
      burbuja(m, (mm) => {
        // Una marca son sus PRODUCTOS: si abajo hay un panel puesto, se quita
        // primero, porque si no el filtro caería sobre un mercado escondido.
        if (puesto && puesto.destino.tipo === "panel") entrar(puesto);
        selMarca.value = mm.id;
        filtrar();
        mercado.scrollIntoView({ behavior: suavidad(), block: "start" });
      }),
    );
  }
  arrastrable(carril);

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
      el("div", { class: "hub-filtros-pie" }, [cuenta, marbete]),
      rejilla,
      vacio,
    ]),
  ]);

  // ── Las dos ventanas que NO son tienda ───────────────────────────────────
  const panelOD = panelOnDemand(acciones);
  const panelFM = panelForMakers(acciones);
  panelOD.classList.add("oculto");
  panelFM.classList.add("oculto");

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
        lamina(ARTE.escaner, "hub-unirse-foto", {
          foto: "unirse.webp",
          alt: tt(
            "Sala de máquinas de un gimnasio grande, con las filas de equipos alineadas",
            "The floor of a large gym, rows of equipment lined up",
          ),
          diferida: true,
        }),
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
      el("div", { class: "hub-int" }, [nav, pista]),
    ]),
    mercado,
    panelOD,
    panelFM,
    unirse,
    pie,
  );

  // Se abre en la primera lámina y con el mercado ENTERO: mirar no es entrar,
  // así que hasta que no se pulse una lámina no hay ningún recorrido puesto.
  mostrar(0, false);
  filtrar();
  // El país guardado sigue mandando en el orden del carril de historias.
  void paisUsuario();
}
