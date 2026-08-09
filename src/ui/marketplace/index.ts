/**
 * MARKETPLACE (v0.2.37 · MAQUETA navegable)
 *
 * El hub que junta a usuarios, makers y marcas: un showroom virtual donde el
 * dueño de un gimnasio cotiza y simula la distribución de su sala con equipos
 * reales, la marca expone su catálogo en modelos de alta fidelidad levantados
 * por escáner fotográfico, y el diseñador aficionado encuentra foro,
 * patrocinio y quien le fabrique lo que dibujó.
 *
 * Siete ventanas, en el orden en que se recorren:
 *   1) NEWCOMERS — marcas recién llegadas.
 *   2) NEW ARRIVALS — estrenos y novedades.
 *   3) SUPPORT THE LOCAL ECONOMY — PyMEs y manufactura del país del usuario.
 *   4) VITRINA DIGITAL — historias por marca + catálogo con buscador.
 *   5) MAKERS — foro de la comunidad DIY.
 *   6) GOT A WISH — encargos del usuario a las marcas.
 *   7) JOIN EXERSUITE3D — puerta de entrada de las marcas al hub.
 *
 * Las marcas son ficticias y las acciones comerciales no operan (etiqueta
 * DEMO), pero la navegación es la definitiva: filtros, carrito compartido
 * entre vitrinas, historias, foro y conversaciones funcionan de verdad.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import { Carrito, type MarketplaceAcciones } from "./comunes";
import { ventanaLocal, ventanaNewcomers, ventanaNovedades } from "./descubrir";
import { ventanaDeseo } from "./deseo";
import { ventanaMakers } from "./makers";
import { ventanaUnirse } from "./unirse";
import { ventanaVitrina } from "./vitrina";

export type { MarketplaceAcciones } from "./comunes";

/** Las siete ventanas del hub, en orden de recorrido. */
const VENTANAS: [string, string, string][] = [
  ["newcomers", "🎉 Newcomers", "🎉 Newcomers"],
  ["novedades", "✨ New arrivals", "✨ New arrivals"],
  ["local", "🌱 Economía local", "🌱 Local economy"],
  ["vitrina", "🏬 Vitrina digital", "🏬 Showcase"],
  ["makers", "🔧 Makers", "🔧 Makers"],
  ["deseo", "🪄 Got a wish", "🪄 Got a wish"],
  ["unirse", "🤝 Join EXERSUITE3D", "🤝 Join EXERSUITE3D"],
];

const INICIAL = "vitrina";

/** Contenido de la vista Marketplace (maqueta) para la Home. */
export function renderMarketplace(cont: HTMLElement, acciones: MarketplaceAcciones = {}): void {
  const carrito = new Carrito();
  const cuerpo = el("div", { class: "mk-cuerpo" });
  const pestanas = el("div", { class: "mk-tabs" });
  let actual = "";

  const ir = (ventana: string, marcaId?: string): void => {
    actual = ventana;
    for (const p of [...pestanas.children]) {
      p.classList.toggle("active", (p as HTMLElement).dataset.ventana === ventana);
    }
    let vista: HTMLElement;
    if (ventana === "newcomers") vista = ventanaNewcomers(carrito, acciones, ir);
    else if (ventana === "novedades") vista = ventanaNovedades(carrito, acciones);
    else if (ventana === "local") vista = ventanaLocal(carrito, acciones, ir);
    else if (ventana === "makers") vista = ventanaMakers(acciones);
    else if (ventana === "deseo") vista = ventanaDeseo();
    else if (ventana === "unirse") vista = ventanaUnirse();
    // La vitrina se abre YA filtrada cuando se llega desde una ficha de marca.
    else vista = ventanaVitrina(cont, carrito, acciones, marcaId ?? null);
    cuerpo.replaceChildren(vista);
    cuerpo.scrollTop = 0;
  };

  for (const [id, es, en] of VENTANAS) {
    const p = el("button", { class: "mk-tab" }, [tt(es, en)]);
    p.dataset.ventana = id;
    p.addEventListener("click", () => {
      if (actual !== id) ir(id);
    });
    pestanas.append(p);
  }

  cont.append(
    el("div", { class: "mk-head" }, [
      el("div", { class: "land-aside-title" }, [
        tt("Marketplace — hub de usuarios, makers y marcas", "Marketplace — users, makers & brands hub"),
      ]),
      el("span", { class: "mk-demo" }, ["DEMO"]),
    ]),
    pestanas,
    el("div", { class: "mk-scroll" }, [
      cuerpo,
      el("div", { class: "mk-pie" }, [
        tt(
          "Maqueta de producto: las marcas mostradas son ficticias y las acciones comerciales aún no están operativas.",
          "Product mockup: brands shown are fictitious and commercial actions are not yet live.",
        ),
      ]),
    ]),
  );

  ir(INICIAL);
}
