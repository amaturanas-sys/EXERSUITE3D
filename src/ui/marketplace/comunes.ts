/**
 * MARKETPLACE · PIEZAS COMUNES (v0.2.37)
 *
 * Lo que comparten las siete ventanas del hub: botones de flujo demo, ficha
 * de producto, carrito único, avatar de marca y controles de formulario. El
 * carrito vive una sola vez y lo comparten todas las vitrinas (vitrina
 * general, recién llegadas, estrenos y economía local): añadir desde
 * cualquiera de ellas suma al mismo pedido.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import { LOGOS } from "./arte";
import { type Marca, type Producto, marca, nombrePais, precio$ } from "./datos";

/** Acciones reales que el Marketplace puede disparar desde la Home. */
export interface MarketplaceAcciones {
  /** Abre la Biblioteca de modelos (el showroom navegable de piezas). */
  verBiblioteca?: () => void;
}

/** Botón de flujo comercial DEMO: confirma la solicitud en línea. */
export function botonDemo(etiqueta: string, primario = false, confirmacion?: string): HTMLElement {
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

/** Avatar cuadrado de la marca (monograma SVG). */
export function avatar(m: Marca, clase = "mk-avatar"): HTMLElement {
  const a = el("div", { class: clase });
  a.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%">${LOGOS[m.id] ?? ""}</svg>`;
  return a;
}

/** Cabecera de marca: avatar + nombre + país, reutilizada en varias ventanas. */
export function cabeceraMarca(m: Marca, extra?: string): HTMLElement {
  return el("div", { class: "mk-marca-head" }, [
    avatar(m),
    el("div", { class: "mk-marca-datos" }, [
      el("div", { class: "mk-marca-nombre" }, [m.nombre]),
      el("div", { class: "mk-marca-pais" }, [
        `${nombrePais(m.pais)}${m.pyme ? tt(" · PyME", " · SME") : ""}${extra ? ` · ${extra}` : ""}`,
      ]),
    ]),
  ]);
}

// ------------------------------------------------------------- el carrito
/** Carrito único del hub: cualquier vitrina suma al mismo pedido demo. */
export class Carrito {
  private items = new Map<string, { p: Producto; n: number }>();
  private oyentes: (() => void)[] = [];

  añadir(p: Producto): void {
    const e = this.items.get(p.id) ?? { p, n: 0 };
    e.n++;
    this.items.set(p.id, e);
    this.avisar();
  }

  vaciar(): void {
    this.items.clear();
    this.avisar();
  }

  unidades(): number {
    let n = 0;
    for (const e of this.items.values()) n += e.n;
    return n;
  }

  total(): number {
    let t = 0;
    for (const e of this.items.values()) t += e.n * e.p.precio;
    return t;
  }

  alCambiar(f: () => void): void {
    this.oyentes.push(f);
    f();
  }

  private avisar(): void {
    for (const f of this.oyentes) f();
  }
}

/** Barra del carrito: aparece con el primer artículo y se puede vaciar. */
export function barraCarrito(carrito: Carrito): HTMLElement {
  const resumen = el("span", { class: "mkc-carrito-txt" }, [""]);
  const bPedido = botonDemo(
    tt("🧾 Pedido demo", "🧾 Demo order"),
    true,
    tt("✓ Pedido demo registrado", "✓ Demo order logged"),
  );
  const bVaciar = el("button", { class: "land-btn mk-btn" }, [tt("Vaciar", "Empty")]);
  bVaciar.addEventListener("click", () => carrito.vaciar());
  const barra = el("div", { class: "mkc-carrito mkc-oculto" }, [resumen, bPedido, bVaciar]);
  carrito.alCambiar(() => {
    const n = carrito.unidades();
    barra.classList.toggle("mkc-oculto", n === 0);
    resumen.textContent = `🛒 ${n} ${n === 1 ? tt("artículo", "item") : tt("artículos", "items")} · ${precio$(carrito.total())}`;
  });
  return barra;
}

// -------------------------------------------------------- ficha de producto
export interface OpcionesFicha {
  /** Cinta extra sobre la imagen (ESTRENO, RECIÉN LLEGADA, LOCAL…). */
  cinta?: string;
  /** Clase de la cinta extra, para pintarla de otro color. */
  cintaClase?: string;
  /** Pie de la ficha: antigüedad del lanzamiento, distancia, etc. */
  pie?: string;
}

/** Ficha de producto: imagen, marca, precio, oferta y acciones. */
export function fichaProducto(
  p: Producto,
  carrito: Carrito,
  acciones: MarketplaceAcciones,
  op: OpcionesFicha = {},
): HTMLElement {
  const img = el("div", { class: "mkc-img" });
  img.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${p.arte}</svg>`;
  const hijos: HTMLElement[] = [img];

  if (p.antes) {
    const pct = Math.round((1 - p.precio / p.antes) * 100);
    hijos.push(el("span", { class: "mkc-badge" }, [`OFERTA −${pct}%`]));
  }
  if (op.cinta) hijos.push(el("span", { class: `mkc-cinta ${op.cintaClase ?? ""}` }, [op.cinta]));

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
    carrito.añadir(p);
    bAgregar.classList.add("active");
    setTimeout(() => bAgregar.classList.remove("active"), 350);
  });

  const bVer = el("button", { class: "land-btn mk-btn" }, [tt("🧩 Ver", "🧩 View")]);
  bVer.title = tt("Ver en biblioteca (showroom)", "View in library (showroom)");
  bVer.addEventListener("click", () => acciones.verBiblioteca?.());

  hijos.push(
    el("div", { class: "mkc-marca" }, [marca(p.marcaId).nombre]),
    el("div", { class: "mkc-nombre" }, [tt(p.nombre[0], p.nombre[1])]),
    el("div", { class: "mkc-rating" }, [p.rating]),
    el("div", { class: "mk-item-nota" }, [tt(p.nota[0], p.nota[1])]),
  );
  if (op.pie) hijos.push(el("div", { class: "mkc-pie" }, [op.pie]));
  hijos.push(precios, el("div", { class: "mkc-acciones" }, [bAgregar, bVer]));

  return el("div", { class: "mk-card mkc-card" }, hijos);
}

// ------------------------------------------------------------ formularios
/** Campo de formulario con etiqueta (input o textarea). */
export function campo(
  etiqueta: string,
  marcador: string,
  tipo: "texto" | "area" | "email" | "numero" = "texto",
): HTMLElement {
  const control = tipo === "area"
    ? el("textarea", { class: "mk-input mk-area", placeholder: marcador, rows: 3 })
    : el("input", {
        class: "mk-input",
        placeholder: marcador,
        type: tipo === "email" ? "email" : tipo === "numero" ? "number" : "text",
      });
  return el("label", { class: "mk-campo" }, [el("span", { class: "mk-campo-tit" }, [etiqueta]), control]);
}

/** Grupo de chips de selección múltiple (se marcan al pulsar). */
export function chipsSeleccion(opciones: { id: string; texto: string }[], clase = "mk-chip-sel"): HTMLElement {
  return el("div", { class: "mkc-chips" }, opciones.map((o) => {
    const c = el("button", { class: `mkc-chip ${clase}` }, [o.texto]);
    c.dataset.id = o.id;
    c.addEventListener("click", () => c.classList.toggle("active"));
    return c;
  }));
}

/** Encabezado de ventana: título grande + bajada explicativa. */
export function encabezado(titulo: string, bajada: string): HTMLElement {
  return el("div", {}, [
    el("div", { class: "mk-titulo" }, [titulo]),
    el("div", { class: "mk-sub" }, [bajada]),
  ]);
}
