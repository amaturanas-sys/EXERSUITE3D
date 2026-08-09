/**
 * MARKETPLACE · VENTANA 7 — JOIN EXERSUITE3D (v0.2.37)
 *
 * La puerta de entrada de las marcas: aquí un fabricante contacta a la
 * administración de EXERSUITE3D para exponer en la vitrina digital y llevar
 * su catálogo al entorno tridimensional mediante escáner fotográfico.
 *
 * Explica el trayecto completo (contacto → acuerdo → escaneo → publicación),
 * qué recibe la marca a cambio y qué hace falta para escanear una máquina.
 */

import { tt } from "../../core/i18n";
import { el } from "../dom";
import { botonDemo, campo } from "./comunes";
import { ARTE } from "./arte";
import { CATALOGO, MARCAS } from "./datos";

const PASOS: [string, string, string, string, string][] = [
  ["1", "Contacto", "Get in touch", "Cuéntanos qué fabricas y cuántas referencias quieres exponer.", "Tell us what you build and how many references you want to show."],
  ["2", "Acuerdo y ficha", "Agreement & profile", "Se firma el acuerdo de exposición y se abre la ficha de marca con tu país, tu historia y tu logotipo.", "We sign the listing agreement and open your brand profile with country, story and logo."],
  ["3", "Escaneo fotográfico 3D", "Photographic 3D scan", "Fotografiamos cada equipo por fotogrametría y lo convertimos en un modelo de alta fidelidad, a escala real y con sus puntos de anclaje.", "We shoot each machine with photogrammetry and turn it into a high-fidelity model at true scale, with its anchor points."],
  ["4", "Publicación", "Go live", "Tus productos entran a la vitrina, a las historias y a la biblioteca: el cliente los prueba en su sala antes de comprar.", "Your products land in the showcase, the stories and the library: customers try them in their own gym before buying."],
];

const VENTAJAS: [string, string, string, string, string][] = [
  ["🏬", "Vitrina permanente", "Permanent window", "Ficha de marca con historia, país y catálogo completo, más un turno en la fila de historias.", "Brand profile with story, country and full catalog, plus a slot in the stories row."],
  ["📐", "Prueba antes de comprar", "Try before you buy", "El comprador instala tu equipo en la simulación de su sala y comprueba medidas, holguras y recorridos.", "Buyers drop your gear into their own room simulation and check sizes, clearances and travel."],
  ["🪄", "Encargos directos", "Direct commissions", "Recibes los deseos de los usuarios con el prefab adjunto: valoras la fabricación sobre algo medible.", "You receive user wishes with the prefab attached: you assess manufacturing against something measurable."],
  ["🔧", "Acceso a la comunidad", "Community access", "Patrocinas diseños del foro de makers y detectas antes que nadie qué le falta al mercado.", "Sponsor designs from the makers forum and spot what the market is missing before anyone else."],
];

/** VENTANA 7: incorporación de marcas al hub. */
export function ventanaUnirse(): HTMLElement {
  const escaner = el("div", { class: "mk-preview mk-escaner" });
  escaner.innerHTML = `<svg viewBox="0 0 200 130" width="100%" height="100%">${ARTE.escaner}</svg>`;

  const escaneados = MARCAS.reduce((s, m) => s + m.escaneados, 0);

  const formulario = el("div", { class: "mk-card mk-formulario" }, [
    el("div", { class: "mk-marca" }, [tt("✉️ Escríbele a la administración", "✉️ Write to the administrators")]),
    el("div", { class: "mk-lema" }, [
      tt(
        "Responde una persona, no un formulario automático. Del primer correo a la publicación suelen pasar entre tres y seis semanas, según cuántas referencias haya que escanear.",
        "A person answers, not an autoresponder. From first e-mail to going live usually takes three to six weeks, depending on how many references need scanning.",
      ),
    ]),
    el("div", { class: "mk-fila-campos" }, [
      campo(tt("Marca", "Brand"), tt("Nombre comercial", "Trade name")),
      campo(tt("País de manufactura", "Manufacturing country"), tt("Dónde se fabrica", "Where it's built")),
    ]),
    el("div", { class: "mk-fila-campos" }, [
      campo(tt("Persona de contacto", "Contact person"), tt("Nombre y cargo", "Name and role")),
      campo(tt("Correo", "E-mail"), "contacto@tumarca.com", "email"),
      campo(tt("Referencias a exponer", "References to list"), "12", "numero"),
    ]),
    campo(
      tt("Cuéntanos de tu taller", "Tell us about your shop"),
      tt("Qué fabricas, desde cuándo, series cortas o producción continua…", "What you build, since when, short runs or continuous production…"),
      "area",
    ),
    el("label", { class: "mk-check" }, [
      el("input", { class: "mk-check-in", type: "checkbox", checked: true }),
      el("span", {}, [
        tt(
          "Quiero el escaneo fotográfico 3D de mi catálogo",
          "I want the photographic 3D scan of my catalog",
        ),
      ]),
    ]),
    el("label", { class: "mk-check" }, [
      el("input", { class: "mk-check-in", type: "checkbox" }),
      el("span", {}, [
        tt("Soy PyME o fabrico localmente", "We're an SME or manufacture locally"),
      ]),
    ]),
    el("div", { class: "mkc-acciones" }, [
      botonDemo(tt("📇 Adjuntar catálogo", "📇 Attach catalog"), false, tt("✓ Adjunto demo", "✓ Demo attachment")),
      botonDemo(tt("🤝 Solicitar incorporación", "🤝 Request to join"), true, tt("✓ Solicitud demo enviada", "✓ Demo request sent")),
    ]),
  ]);

  return el("div", { class: "mk-ventana", id: "mk-unirse" }, [
    el("div", { class: "mk-titulo" }, [tt("🤝 Join EXERSUITE3D", "🤝 Join EXERSUITE3D")]),
    el("div", { class: "mk-sub" }, [
      tt(
        "¿Fabricas equipamiento y quieres exponerlo aquí? Esta es la puerta de entrada: la administración de EXERSUITE3D lleva tu catálogo al entorno tridimensional con escáner fotográfico y lo publica en la vitrina digital.",
        "Do you build equipment and want it shown here? This is the way in: the EXERSUITE3D administrators bring your catalog into the 3D environment with photographic scanning and publish it in the digital showcase.",
      ),
    ]),
    el("div", { class: "mk-datos mk-datos-hub" }, [
      el("div", { class: "mk-dato" }, [
        el("div", { class: "mk-dato-num" }, [String(MARCAS.length)]),
        el("div", { class: "mk-dato-txt" }, [tt("marcas en la vitrina", "brands in the showcase")]),
      ]),
      el("div", { class: "mk-dato" }, [
        el("div", { class: "mk-dato-num" }, [String(escaneados)]),
        el("div", { class: "mk-dato-txt" }, [tt("modelos escaneados", "scanned models")]),
      ]),
      el("div", { class: "mk-dato" }, [
        el("div", { class: "mk-dato-num" }, [String(CATALOGO.length)]),
        el("div", { class: "mk-dato-txt" }, [tt("productos publicados", "published products")]),
      ]),
    ]),
    el("div", { class: "mk-titulo" }, [tt("Cómo entra una marca", "How a brand gets in")]),
    el("div", { class: "mk-pasos" }, PASOS.map(([n, es, en, des, den]) =>
      el("div", { class: "mk-paso" }, [
        el("div", { class: "mk-paso-num" }, [n]),
        el("div", {}, [
          el("div", { class: "mk-paso-tit" }, [tt(es, en)]),
          el("div", { class: "mk-lema" }, [tt(des, den)]),
        ]),
      ]),
    )),
    el("div", { class: "mk-custom" }, [
      escaner,
      el("div", { class: "mk-custom-controles" }, [
        el("div", { class: "mk-marca" }, [tt("El escaneo fotográfico, en corto", "Photographic scanning, in short")]),
        el("div", { class: "mk-lema" }, [
          tt(
            "Hacen falta unas 120 fotos por equipo con luz difusa y fondo despejado, más las medidas del fabricante para fijar la escala. El resultado es un modelo que se puede seccionar, medir y montar junto al resto de la biblioteca, con sus puntos de anclaje declarados para que se conecte a racks y poleas.",
            "It takes about 120 photos per machine with diffuse light and a clear background, plus the manufacturer's dimensions to lock the scale. The result is a model that can be sectioned, measured and assembled alongside the rest of the library, with declared anchor points so it hooks up to racks and pulleys.",
          ),
        ]),
        el("div", { class: "mk-lema" }, [
          tt(
            "Si tu equipo ya tiene modelo CAD, también sirve: se reduce y se ajusta al mismo formato.",
            "If your gear already has a CAD model, that works too: it gets decimated and fitted to the same format.",
          ),
        ]),
      ]),
    ]),
    el("div", { class: "mk-titulo" }, [tt("Qué gana tu marca", "What your brand gets")]),
    el("div", { class: "mk-grid" }, VENTAJAS.map(([ic, es, en, des, den]) =>
      el("div", { class: "mk-card" }, [
        el("div", { class: "mk-marca" }, [`${ic} ${tt(es, en)}`]),
        el("div", { class: "mk-lema" }, [tt(des, den)]),
      ]),
    )),
    formulario,
  ]);
}
