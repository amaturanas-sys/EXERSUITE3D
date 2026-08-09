/**
 * MARKETPLACE · VENTANAS 1-2-3 — DESCUBRIR (v0.2.37)
 *
 *   1) NEWCOMERS — las marcas recién llegadas al hub presentan su vitrina.
 *   2) NEW ARRIVALS — los estrenos y novedades de todo el catálogo.
 *   3) SUPPORT THE LOCAL ECONOMY — PyMEs y marcas que fabrican en el país
 *      del usuario (el país se elige aquí mismo y queda guardado).
 *
 * Las tres comparten el mismo grano: una ficha de marca con su historia y
 * sus estadísticas, y debajo sus productos con el carrito común del hub.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import {
  type Carrito,
  type MarketplaceAcciones,
  barraCarrito,
  botonDemo,
  cabeceraMarca,
  fichaProducto,
} from "./comunes";
import {
  type Marca,
  PAISES,
  haceDias,
  haceMeses,
  marca,
  marcasLocales,
  marcasNuevas,
  nombrePais,
  paisUsuario,
  productosDe,
  productosNuevos,
  setPaisUsuario,
} from "./datos";

/** Navegación entre ventanas del hub (la usa el índice del Marketplace). */
export type IrA = (ventana: string, marcaId?: string) => void;

/** Cifra destacada de la ficha de marca. */
function dato(valor: string, etiqueta: string): HTMLElement {
  return el("div", { class: "mk-dato" }, [
    el("div", { class: "mk-dato-num" }, [valor]),
    el("div", { class: "mk-dato-txt" }, [etiqueta]),
  ]);
}

/** Ficha completa de una marca con sus productos debajo. */
function fichaMarca(
  m: Marca,
  carrito: Carrito,
  acciones: MarketplaceAcciones,
  ir: IrA,
  cinta?: string,
): HTMLElement {
  const productos = productosDe(m.id);
  const bSeguir = botonDemo(tt("＋ Seguir", "＋ Follow"), false, tt("✓ Siguiendo (demo)", "✓ Following (demo)"));
  const bVitrina = el("button", { class: "land-btn mk-btn" }, [tt("🏬 Ver en la vitrina", "🏬 See in the showcase")]);
  bVitrina.addEventListener("click", () => ir("vitrina", m.id));

  return el("div", { class: "mk-marca-ficha" }, [
    el("div", { class: "mk-marca-fila" }, [
      cabeceraMarca(m, haceMeses(m.antiguedadMeses)),
      ...(cinta ? [el("span", { class: "mk-cinta-marca" }, [cinta])] : []),
    ]),
    el("div", { class: "mk-lema" }, [tt(m.lema[0], m.lema[1])]),
    el("div", { class: "mk-marca-historia" }, [tt(m.historia[0], m.historia[1])]),
    el("div", { class: "mk-datos" }, [
      dato(String(m.escaneados), tt("modelos escaneados", "scanned models")),
      dato(String(productos.length), tt("productos publicados", "published products")),
      dato(m.seguidores.toLocaleString("es-CL"), tt("seguidores", "followers")),
    ]),
    el("div", { class: "mkc-grid mk-grid-marca" }, productos.map((p) => fichaProducto(p, carrito, acciones))),
    el("div", { class: "mkc-acciones" }, [bSeguir, bVitrina]),
  ]);
}

// -------------------------------------------------------- 1) NEWCOMERS
export function ventanaNewcomers(carrito: Carrito, acciones: MarketplaceAcciones, ir: IrA): HTMLElement {
  const nuevas = marcasNuevas();
  return el("div", { class: "mk-ventana", id: "mk-newcomers" }, [
    el("div", { class: "mk-titulo" }, [tt("🎉 Newcomers — marcas recién llegadas", "🎉 Newcomers — brands that just landed")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Fabricantes que acaban de entrar al hub y estrenan su vitrina digital. Sus modelos ya están levantados con escáner fotográfico: instálalos en tu sala y compruébalos a escala real antes de decidir.",
        "Manufacturers that just joined the hub and are opening their digital window. Their models are already captured by photographic scanning: drop them into your gym and check them at true scale before deciding.",
      ),
    ]),
    barraCarrito(carrito),
    ...nuevas.map((m) => fichaMarca(m, carrito, acciones, ir, tt("RECIÉN LLEGADA", "JUST LANDED"))),
    el("div", { class: "mk-nota-fin" }, [
      tt(
        "¿Tu marca todavía no está aquí? La ventana «Join EXERSUITE3D» es la puerta de entrada.",
        "Brand not here yet? The «Join EXERSUITE3D» window is the way in.",
      ),
    ]),
  ]);
}

// ------------------------------------------------------ 2) NEW ARRIVALS
const PROXIMOS: [string, string, string][] = [
  ["Andes Strength Co.", "Torre de polea de brazo giratorio", "Swivel-arm pulley tower"],
  ["IronForge Equipment", "Rack IF-900 con doble jaula", "IF-900 rack with dual cage"],
  ["Kaizen Ironworks", "Barra hexagonal forjada", "Forged hex bar"],
];

export function ventanaNovedades(carrito: Carrito, acciones: MarketplaceAcciones): HTMLElement {
  const nuevos = productosNuevos();
  const rejilla: HTMLElement = nuevos.length > 0
    ? el("div", { class: "mkc-grid" }, nuevos.map((p) =>
        fichaProducto(p, carrito, acciones, {
          cinta: tt("ESTRENO", "NEW"),
          cintaClase: "mkc-cinta-nuevo",
          pie: `${tt("Publicado", "Published")} ${haceDias(p.lanzadoHaceDias)} · ${marca(p.marcaId).nombre}`,
        }),
      ))
    : el("div", { class: "mk-vacio" }, [tt("Sin estrenos por ahora.", "No new releases right now.")]);
  return el("div", { class: "mk-ventana", id: "mk-novedades" }, [
    el("div", { class: "mk-titulo" }, [tt("✨ New arrivals — estrenos del hub", "✨ New arrivals — fresh on the hub")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Todo lo lanzado en los últimos tres meses, de lo más reciente a lo más antiguo. Un estreno se puede probar en el Builder el mismo día que aparece en la vitrina.",
        "Everything launched in the last three months, newest first. A new release can be tried in the Builder the same day it hits the showcase.",
      ),
    ]),
    barraCarrito(carrito),
    rejilla,
    el("div", { class: "mk-titulo" }, [tt("🕓 Próximamente", "🕓 Coming soon")]),
    el("div", { class: "mk-grid" }, PROXIMOS.map(([m, es, en]) =>
      el("div", { class: "mk-card" }, [
        el("div", { class: "mk-marca" }, [tt(es, en)]),
        el("div", { class: "mk-lema" }, [m]),
        botonDemo(tt("🔔 Avisarme", "🔔 Notify me"), false, tt("✓ Aviso demo activado", "✓ Demo alert on")),
      ]),
    )),
    el("div", { class: "mk-nota-fin" }, [
      tt("Los estrenos también aparecen en las historias de cada marca.", "New releases also show up in each brand's stories."),
    ]),
  ]);
}

// ------------------------------------------ 3) SUPPORT THE LOCAL ECONOMY
export function ventanaLocal(carrito: Carrito, acciones: MarketplaceAcciones, ir: IrA): HTMLElement {
  const cont = el("div", { class: "mk-ventana", id: "mk-local" });
  const lista = el("div", {});

  const pintar = (): void => {
    const p = paisUsuario();
    const { locales, resto } = marcasLocales(p);
    const hijos: HTMLElement[] = [];
    if (locales.length === 0) {
      hijos.push(el("div", { class: "mk-vacio" }, [
        tt(
          "Todavía no hay marcas PyME registradas en este país. Anímalas a entrar desde «Join EXERSUITE3D».",
          "No SME brands registered in this country yet. Nudge them in from «Join EXERSUITE3D».",
        ),
      ]));
    } else {
      hijos.push(el("div", { class: "mk-titulo" }, [
        `${tt("Fabrican en", "Manufacturing in")} ${nombrePais(p)}`,
      ]));
      for (const m of locales) hijos.push(fichaMarca(m, carrito, acciones, ir, tt("MANUFACTURA LOCAL", "MADE LOCALLY")));
    }
    if (resto.length > 0) {
      hijos.push(
        el("div", { class: "mk-titulo" }, [tt("Otras PyMEs del hub", "Other SMEs on the hub")]),
        el("div", { class: "mk-sub" }, [
          tt(
            "Talleres pequeños de otros países: series cortas, trato directo y piezas de repuesto sin catálogo cerrado.",
            "Small shops abroad: short runs, direct dealing and spare parts without a locked catalog.",
          ),
        ]),
      );
      for (const m of resto) hijos.push(fichaMarca(m, carrito, acciones, ir));
    }
    lista.replaceChildren(...hijos);
  };

  const selector = el("div", { class: "mkc-chips mk-paises" }, PAISES.map((pa) => {
    const c = el("button", { class: "mkc-chip mk-pais" }, [`${pa.bandera} ${tt(pa.nombre[0], pa.nombre[1])}`]);
    c.dataset.pais = pa.id;
    if (pa.id === paisUsuario()) c.classList.add("active");
    c.addEventListener("click", () => {
      setPaisUsuario(pa.id);
      for (const o of [...selector.children]) o.classList.toggle("active", o === c);
      pintar();
    });
    return c;
  }));

  pintar();
  cont.append(
    el("div", { class: "mk-titulo" }, [
      tt("🌱 Support the local economy", "🌱 Support the local economy"),
    ]),
    el("div", { class: "mk-sub" }, [
      tt(
        "Pequeña y mediana empresa, y marcas que fabrican en tu país: comprar aquí acorta el envío, deja el servicio y los repuestos a mano, y sostiene talleres que trabajan por encargo. Elige tu país para ordenar la vitrina.",
        "Small and medium businesses, and brands manufacturing in your country: buying here shortens shipping, keeps service and spares within reach, and sustains shops that build to order. Pick your country to sort the showcase.",
      ),
    ]),
    selector,
    barraCarrito(carrito),
    lista,
  );
  return cont;
}
