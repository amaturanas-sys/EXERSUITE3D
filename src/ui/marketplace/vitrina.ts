/**
 * MARKETPLACE · VENTANA 4 — VITRINA DIGITAL (v0.2.37)
 *
 * La tienda propiamente dicha: arriba una fila de HISTORIAS por marca (el
 * formato de Instagram: anillo, diapositivas verticales, avance automático y
 * toque a izquierda/derecha) y abajo el CATÁLOGO con buscador integrado,
 * filtro por categoría y por marca, más el carrito compartido del hub.
 *
 * La historia no es decorativa: su botón «Ver productos» deja el catálogo de
 * abajo filtrado por esa marca, que es como se navega una vitrina real.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import {
  type Carrito,
  type MarketplaceAcciones,
  barraCarrito,
  fichaProducto,
} from "./comunes";
import {
  type Categoria,
  CATALOGO,
  CATEGORIAS,
  HISTORIAS,
  type Historia,
  marca,
} from "./datos";
import { LOGOS } from "./arte";

const MS_DIAPOSITIVA = 4200;

/** Visor de historias a pantalla completa dentro de la vista Marketplace. */
function abrirHistoria(
  host: HTMLElement,
  historias: Historia[],
  iHistoria: number,
  alVerMarca: (marcaId: string) => void,
): void {
  let hi = iHistoria;
  let di = 0;
  let reloj: number | undefined;

  const progreso = el("div", { class: "mk-hv-progreso" });
  const arte = el("div", { class: "mk-hv-arte" });
  const titulo = el("div", { class: "mk-hv-titulo" });
  const texto = el("div", { class: "mk-hv-texto" });
  const marcaTxt = el("div", { class: "mk-hv-marca" });
  const logo = el("div", { class: "mk-hv-logo" });

  const bVer = el("button", { class: "land-btn primary mk-btn mk-hv-cta" }, [
    tt("Ver productos de la marca", "See the brand's products"),
  ]);
  const bCerrar = el("button", { class: "mk-hv-cerrar", title: "Cerrar" }, ["✕"]);
  const bPrev = el("button", { class: "mk-hv-zona mk-hv-prev", title: "Anterior" });
  const bNext = el("button", { class: "mk-hv-zona mk-hv-next", title: "Siguiente" });

  const visor = el("div", { class: "mk-hv" }, [
    el("div", { class: "mk-hv-caja" }, [
      progreso,
      el("div", { class: "mk-hv-cab" }, [logo, marcaTxt, bCerrar]),
      arte,
      titulo,
      texto,
      bVer,
      bPrev,
      bNext,
    ]),
  ]);

  const cerrar = (): void => {
    if (reloj !== undefined) window.clearInterval(reloj);
    visor.remove();
  };

  const pintar = (): void => {
    const h = historias[hi];
    const m = marca(h.marcaId);
    const d = h.diapositivas[di];
    logo.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%">${LOGOS[m.id] ?? ""}</svg>`;
    marcaTxt.textContent = m.nombre;
    arte.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${d.arte}</svg>`;
    titulo.textContent = tt(d.titulo[0], d.titulo[1]);
    texto.textContent = tt(d.texto[0], d.texto[1]);
    progreso.replaceChildren(
      ...h.diapositivas.map((_, i) =>
        el("div", { class: `mk-hv-barra ${i < di ? "vista" : i === di ? "activa" : ""}` }),
      ),
    );
  };

  const avanzar = (paso: number): void => {
    di += paso;
    if (di >= historias[hi].diapositivas.length) {
      hi++;
      di = 0;
      if (hi >= historias.length) return cerrar();
    } else if (di < 0) {
      hi--;
      if (hi < 0) {
        hi = 0;
        di = 0;
      } else {
        di = historias[hi].diapositivas.length - 1;
      }
    }
    pintar();
  };

  bCerrar.addEventListener("click", cerrar);
  bPrev.addEventListener("click", () => avanzar(-1));
  bNext.addEventListener("click", () => avanzar(1));
  bVer.addEventListener("click", () => {
    alVerMarca(historias[hi].marcaId);
    cerrar();
  });
  visor.addEventListener("click", (e) => {
    if (e.target === visor) cerrar();
  });

  pintar();
  host.append(visor);
  // El avance automático se detiene solo si el visor sale del documento.
  reloj = window.setInterval(() => {
    if (!visor.isConnected) return cerrar();
    avanzar(1);
  }, MS_DIAPOSITIVA);
}

/** Fila de historias: un anillo por marca, la más nueva primero. */
function filaHistorias(host: HTMLElement, alVerMarca: (marcaId: string) => void): HTMLElement {
  const orden = [...HISTORIAS].sort((a, b) => marca(a.marcaId).antiguedadMeses - marca(b.marcaId).antiguedadMeses);
  const fila = el("div", { class: "mk-historias" }, orden.map((h, i) => {
    const m = marca(h.marcaId);
    const anillo = el("div", { class: m.antiguedadMeses <= 4 ? "mk-anillo nueva" : "mk-anillo" });
    anillo.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%">${LOGOS[m.id] ?? ""}</svg>`;
    const b = el("button", { class: "mk-historia", title: m.nombre }, [
      anillo,
      el("span", { class: "mk-historia-txt" }, [m.corto]),
    ]);
    b.addEventListener("click", () => abrirHistoria(host, orden, i, alVerMarca));
    return b;
  }));
  return fila;
}

/** VENTANA 4: vitrina digital con historias arriba y catálogo abajo. */
export function ventanaVitrina(
  host: HTMLElement,
  carrito: Carrito,
  acciones: MarketplaceAcciones,
  marcaInicial: string | null = null,
): HTMLElement {
  let texto = "";
  let categoria: Categoria | "todo" = "todo";
  let marcaId: string | null = marcaInicial;

  const grilla = el("div", { class: "mkc-grid" });
  const vacio = el("div", { class: "mk-vacio mkc-oculto" }, [
    tt("Sin resultados: prueba con otra palabra o cambia de categoría.", "No results: try another word or switch category."),
  ]);
  const pill = el("div", { class: "mk-pill mkc-oculto" });
  const cuenta = el("span", { class: "mk-cuenta" }, [""]);

  const coincide = (p: (typeof CATALOGO)[number]): boolean => {
    if (categoria !== "todo" && p.categoria !== categoria) return false;
    if (marcaId && p.marcaId !== marcaId) return false;
    if (!texto) return true;
    const q = texto.toLowerCase();
    const saco = [
      p.nombre[0], p.nombre[1], p.nota[0], p.nota[1],
      marca(p.marcaId).nombre, p.categoria,
    ].join(" ").toLowerCase();
    return saco.includes(q);
  };

  const pintar = (): void => {
    const lista = CATALOGO.filter(coincide);
    grilla.replaceChildren(...lista.map((p) => fichaProducto(p, carrito, acciones)));
    vacio.classList.toggle("mkc-oculto", lista.length > 0);
    cuenta.textContent = tt(
      `${lista.length} de ${CATALOGO.length} productos`,
      `${lista.length} of ${CATALOGO.length} products`,
    );
    pill.classList.toggle("mkc-oculto", !marcaId);
    const filtrada = marcaId;
    if (filtrada) {
      const quitar = el("button", { class: "mk-pill-x", title: "Quitar filtro" }, ["✕"]);
      quitar.addEventListener("click", () => {
        marcaId = null;
        pintar();
      });
      pill.replaceChildren(el("span", {}, [`${tt("Marca:", "Brand:")} ${marca(filtrada).nombre}`]), quitar);
    }
  };

  // ---- Buscador
  const buscador = el("input", {
    class: "mk-input mk-buscador",
    placeholder: tt("Buscar producto, marca o categoría…", "Search product, brand or category…"),
    type: "search",
  });
  buscador.addEventListener("input", () => {
    texto = buscador.value.trim();
    pintar();
  });

  // ---- Chips de categoría
  const chips = el("div", { class: "mkc-chips" });
  for (const [cat, es, en] of CATEGORIAS) {
    const chip = el("button", { class: "mkc-chip" }, [tt(es, en)]);
    if (cat === "todo") chip.classList.add("active");
    chip.addEventListener("click", () => {
      categoria = cat;
      for (const c of [...chips.children]) c.classList.toggle("active", c === chip);
      pintar();
    });
    chips.append(chip);
  }

  pintar();

  return el("div", { class: "mk-ventana", id: "mk-vitrina" }, [
    el("div", { class: "mk-titulo" }, [tt("🏬 Vitrina digital", "🏬 Digital showcase")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Las historias de cada marca abren su escaparate; el catálogo de abajo se filtra con el buscador, por categoría o por la marca que elijas. Todo equipo se instala como ítem de biblioteca: pruébalo en tu sala ANTES de comprar.",
        "Each brand's story opens its window; the catalog below filters by search, category or brand. Every item installs as a library model: try it in your gym BEFORE you buy.",
      ),
    ]),
    filaHistorias(host, (id) => {
      marcaId = id;
      pintar();
      document.getElementById("mk-vitrina")?.scrollIntoView({ block: "nearest" });
    }),
    el("div", { class: "mk-busca-fila" }, [buscador, cuenta]),
    chips,
    pill,
    barraCarrito(carrito),
    grilla,
    vacio,
  ]);
}
