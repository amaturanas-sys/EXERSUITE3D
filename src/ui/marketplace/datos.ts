/**
 * MARKETPLACE · DATOS (v0.2.37)
 *
 * Catálogo de la MAQUETA del hub: marcas, productos, historias, foro de
 * makers y conversaciones de encargo. Todo es ficticio y autocontenido — no
 * hay servidor detrás — pero está modelado como lo estará en producción para
 * que las siete ventanas se alimenten de una sola fuente.
 *
 * Las fechas NO se guardan absolutas sino como ANTIGÜEDAD (días o meses
 * atrás). Así «recién llegada» y «estreno» siguen siendo ciertos se abra la
 * app el año que se abra, sin tener que reeditar el catálogo.
 */

import { tt } from "../../core/i18n";
import { ARTE } from "./arte";

// ---------------------------------------------------------------- países
/** País del usuario: decide qué marcas cuentan como economía local. */
export interface Pais {
  id: string;
  nombre: [string, string];
  bandera: string;
}

export const PAISES: Pais[] = [
  { id: "cl", nombre: ["Chile", "Chile"], bandera: "🇨🇱" },
  { id: "ar", nombre: ["Argentina", "Argentina"], bandera: "🇦🇷" },
  { id: "mx", nombre: ["México", "Mexico"], bandera: "🇲🇽" },
  { id: "es", nombre: ["España", "Spain"], bandera: "🇪🇸" },
  { id: "us", nombre: ["Estados Unidos", "United States"], bandera: "🇺🇸" },
  { id: "de", nombre: ["Alemania", "Germany"], bandera: "🇩🇪" },
  { id: "jp", nombre: ["Japón", "Japan"], bandera: "🇯🇵" },
];

const PAIS_KEY = "exersuite.pais";

export function paisUsuario(): string {
  try {
    const v = localStorage.getItem(PAIS_KEY);
    if (v && PAISES.some((p) => p.id === v)) return v;
  } catch {
    /* sin almacenamiento: se asume el país por defecto */
  }
  return "cl";
}

export function setPaisUsuario(id: string): void {
  try {
    localStorage.setItem(PAIS_KEY, id);
  } catch {
    /* sin almacenamiento: la elección dura lo que la sesión */
  }
}

export function pais(id: string): Pais {
  return PAISES.find((p) => p.id === id) ?? PAISES[0];
}

export function nombrePais(id: string): string {
  const p = pais(id);
  return `${p.bandera} ${tt(p.nombre[0], p.nombre[1])}`;
}

// ---------------------------------------------------------------- marcas
export interface Marca {
  id: string;
  nombre: string;
  /** Nombre corto para el anillo de historias y espacios estrechos. */
  corto: string;
  pais: string;
  /** Pequeña o mediana empresa: entra en «apoya la economía local». */
  pyme: boolean;
  /** Meses que lleva en el hub (≤ 4 ⇒ recién llegada). */
  antiguedadMeses: number;
  lema: [string, string];
  historia: [string, string];
  /** Modelos ya levantados con escáner fotográfico 3D. */
  escaneados: number;
  seguidores: number;
  /**
   * Emblema recortado de la lámina de marcas, en
   * `public/marketplace/marcas/`. Es el que va en la burbuja del carril: el
   * logotipo entero llevaría el nombre a dos píxeles de alto.
   */
  logo: string;
}

export const MARCAS: Marca[] = [
  {
    id: "promax",
    nombre: "ProMax Fitness",
    corto: "ProMax",
    pais: "us",
    pyme: false,
    antiguedadMeses: 34,
    lema: ["Acero de sala para toda la vida", "Floor-grade steel built to last"],
    historia: [
      "El fabricante grande del hub: racks y jaulas de perfil 3×3\" con toda la línea escaneada y compatible con los pinholes de la biblioteca nativa.",
      "The hub's big manufacturer: 3×3\" racks and cages with the whole line scanned and matching the native library pinholes.",
    ],
    escaneados: 41,
    seguidores: 18200,
    logo: "icono-promax.webp",
  },
  {
    id: "steelcore",
    nombre: "Steel Core Gym",
    corto: "Steel Core",
    pais: "us",
    pyme: false,
    antiguedadMeses: 26,
    lema: ["El peso libre bien hecho", "Free weights, done right"],
    historia: [
      "Discos de goma vulcanizada y barras cromadas en planta propia. Series largas y tolerancias de catálogo, sin sorpresas entre unidades.",
      "Vulcanized rubber plates and bars chromed in their own plant. Long runs and catalog tolerances, no surprises between units.",
    ],
    escaneados: 28,
    seguidores: 9400,
    logo: "icono-steelcore.webp",
  },
  {
    id: "titan",
    nombre: "Titan Commercial",
    corto: "Titan",
    pais: "mx",
    pyme: false,
    antiguedadMeses: 22,
    lema: ["Máquinas de sala para gimnasios de barrio", "Floor machines for neighborhood gyms"],
    historia: [
      "Planta en Monterrey enfocada en máquinas de placas: precio de sala completa y servicio dentro del país, que es lo que decide una compra de veinte unidades.",
      "Monterrey plant focused on plate-loaded machines: whole-floor pricing and in-country service, which is what decides a twenty-unit order.",
    ],
    escaneados: 33,
    seguidores: 7600,
    logo: "icono-titan.webp",
  },
  {
    id: "equipx",
    nombre: "EquipX Pro",
    corto: "EquipX",
    pais: "de",
    pyme: false,
    antiguedadMeses: 19,
    lema: ["La pieza que le faltaba a tu rack", "The part your rack was missing"],
    historia: [
      "Accesorios de precisión: jotas, barras de jalón y herrajes que calzan en perfiles de otras marcas. Publican la cota de montaje de cada pieza.",
      "Precision attachments: J-hooks, lat bars and hardware that fit other brands' profiles. They publish the mounting dimension of every part.",
    ],
    escaneados: 24,
    seguidores: 5100,
    logo: "icono-equipx.webp",
  },
  {
    id: "flexion",
    nombre: "Flexion Stations",
    corto: "Flexion",
    pais: "es",
    pyme: true,
    antiguedadMeses: 15,
    lema: ["Estaciones que caben donde vives", "Stations that fit where you live"],
    historia: [
      "Taller valenciano de estaciones de polea y bancos regulables. Miden el techo antes de cotizar, que es de donde salen la mitad de las devoluciones.",
      "Valencian workshop making pulley stations and adjustable benches. They measure your ceiling before quoting, which is where half the returns come from.",
    ],
    escaneados: 17,
    seguidores: 3300,
    logo: "icono-flexion.webp",
  },
  {
    id: "ironworks",
    nombre: "Iron Works Commercial",
    corto: "Iron Works",
    pais: "cl",
    pyme: true,
    antiguedadMeses: 31,
    lema: ["Fundición y yunque, nada más", "Foundry and anvil, nothing else"],
    historia: [
      "Fundición de Talcahuano: kettlebells, árboles de discos y todo lo que se hace de una pieza. Sin soldadura no hay punto por donde ceder.",
      "A Talcahuano foundry: kettlebells, plate trees and everything made in one piece. With no weld there is no point to give way.",
    ],
    escaneados: 22,
    seguidores: 4800,
    logo: "icono-ironworks.webp",
  },
  {
    id: "vortex",
    nombre: "Vortex Workout",
    corto: "Vortex",
    pais: "ar",
    pyme: true,
    antiguedadMeses: 9,
    lema: ["Entrenamiento funcional sin obra", "Functional training with no building work"],
    historia: [
      "Bandas, trineos y anclajes portátiles para salas que se montan y se desmontan. Todo lo suyo entra por una puerta y pesa lo que una persona levanta.",
      "Bands, sleds and portable anchors for rooms that get set up and taken down. Everything they make fits through a door and weighs what one person can lift.",
    ],
    escaneados: 11,
    seguidores: 2100,
    logo: "icono-vortex.webp",
  },
  {
    id: "matrix",
    nombre: "Matrix Fitness Solutions",
    corto: "Matrix",
    pais: "jp",
    pyme: false,
    antiguedadMeses: 41,
    lema: ["Selectorizadas con tolerancia de taller", "Selectorized, machine-shop tolerances"],
    historia: [
      "La marca más antigua del hub. Multipowers de guías rectificadas y pilas selectorizadas que se sienten iguales en la unidad uno y en la trescientas.",
      "The oldest brand on the hub. Ground-rail multipowers and selectorized stacks that feel the same on unit one and unit three hundred.",
    ],
    escaneados: 38,
    seguidores: 15600,
    logo: "icono-matrix.webp",
  },
  {
    id: "powersquad",
    nombre: "Commercial Power Squad",
    corto: "Power Squad",
    pais: "mx",
    pyme: true,
    antiguedadMeses: 13,
    lema: ["Equipamos la sala entera", "We equip the whole floor"],
    historia: [
      "Cooperativa de cinco talleres de Guadalajara que cotizan juntos: se les pide el gimnasio completo y reparten la fabricación entre ellos.",
      "A co-op of five Guadalajara workshops that quote together: ask for the whole gym and they split the build among themselves.",
    ],
    escaneados: 14,
    seguidores: 2700,
    logo: "icono-powersquad.webp",
  },
  {
    id: "optimus",
    nombre: "Optimus Gym Equip",
    corto: "Optimus",
    pais: "es",
    pyme: false,
    antiguedadMeses: 28,
    lema: ["Lo mejor de cada categoría", "The best of each category"],
    historia: [
      "Catálogo corto y caro, elegido pieza a pieza. No hacen gama de entrada y lo dicen en la primera línea de su ficha.",
      "A short, expensive catalog, chosen piece by piece. They make no entry range and they say so in the first line of their listing.",
    ],
    escaneados: 26,
    seguidores: 6900,
    logo: "icono-optimus.webp",
  },
  {
    id: "velocity",
    nombre: "Velocity Trainers",
    corto: "Velocity",
    pais: "cl",
    pyme: true,
    antiguedadMeses: 3,
    lema: ["Para lo que se corre, no para lo que se levanta", "For what you run, not what you lift"],
    historia: [
      "Recién llegada. Trineos de velocidad y arneses de sprint para clubes de atletismo; vienen del mundo del rugby y se les nota en las cinchas.",
      "Just landed. Speed sleds and sprint harnesses for athletics clubs; they come from rugby and it shows in the strapping.",
    ],
    escaneados: 8,
    seguidores: 640,
    logo: "icono-velocity.webp",
  },
  {
    id: "apex",
    nombre: "Apex Fitness Gear",
    corto: "Apex",
    pais: "ar",
    pyme: true,
    antiguedadMeses: 2,
    lema: ["Sube tu propio techo", "Raise your own ceiling"],
    historia: [
      "Recién llegada. Jaulas modulares que crecen por módulos: se empieza con dos postes y se llega a seis sin cambiar nada de lo comprado.",
      "Just landed. Modular cages that grow by modules: start with two uprights and get to six without replacing anything you bought.",
    ],
    escaneados: 6,
    seguidores: 410,
    logo: "icono-apex.webp",
  },
  {
    id: "gymnast",
    nombre: "Gymnast Commercial",
    corto: "Gymnast",
    pais: "jp",
    pyme: true,
    antiguedadMeses: 17,
    lema: ["Madera, cincha y nada que se oxide", "Wood, webbing and nothing that rusts"],
    historia: [
      "Anillas, paralelas y plataformas de roble macizo acabadas a mano en Niigata. Series cortas y numeradas, con la veta a la vista.",
      "Rings, parallel bars and solid oak platforms hand-finished in Niigata. Short numbered runs, grain left visible.",
    ],
    escaneados: 13,
    seguidores: 3900,
    logo: "icono-gymnast.webp",
  },
  {
    id: "revolution",
    nombre: "Revolution Fitness",
    corto: "Revolution",
    pais: "de",
    pyme: false,
    antiguedadMeses: 4,
    lema: ["Ingeniería que se revisa sola", "Engineering that services itself"],
    historia: [
      "Recién llegada. Torres y prensas pensadas para el mantenimiento: cada punto de desgaste se alcanza sin desmontar la máquina.",
      "Just landed. Towers and presses designed around maintenance: every wear point is reachable without stripping the machine.",
    ],
    escaneados: 12,
    seguidores: 980,
    logo: "icono-revolution.webp",
  },
  {
    id: "precision",
    nombre: "Precision Gym",
    corto: "Precision",
    pais: "us",
    pyme: true,
    antiguedadMeses: 1,
    lema: ["Tu diseño, fabricado a pedido", "Your design, built to order"],
    historia: [
      "La más nueva del hub. Cinco personas, una plegadora y una mesa de corte: fabrican por encargo a partir del prefab .json que exportes del Builder.",
      "The newest on the hub. Five people, a press brake and a cutting table: they build to order straight from the .json prefab you export in the Builder.",
    ],
    escaneados: 5,
    seguidores: 320,
    logo: "icono-precision.webp",
  },
  {
    id: "evolution",
    nombre: "Evolution Fitness Products",
    corto: "Evolution",
    pais: "cl",
    pyme: true,
    antiguedadMeses: 7,
    lema: ["Cada versión corrige la anterior", "Each version fixes the last one"],
    historia: [
      "Taller de Santiago que publica el registro de cambios de cada máquina. Si algo se rompió en un gimnasio, la revisión siguiente lo lleva arreglado.",
      "A Santiago workshop that publishes the change log of every machine. If something broke in one gym, the next revision ships with it fixed.",
    ],
    escaneados: 10,
    seguidores: 1450,
    logo: "icono-evolution.webp",
  },
];

export function marca(id: string): Marca {
  return MARCAS.find((m) => m.id === id) ?? MARCAS[0];
}

/** Recién llegadas: cuatro meses o menos en el hub, la más nueva primero. */
export function marcasNuevas(): Marca[] {
  return MARCAS.filter((m) => m.antiguedadMeses <= 4).sort((a, b) => a.antiguedadMeses - b.antiguedadMeses);
}

/** PyMEs y marcas locales del país elegido; si no hay ninguna, todas las PyMEs. */
export function marcasLocales(paisId: string): { locales: Marca[]; resto: Marca[] } {
  const pymes = MARCAS.filter((m) => m.pyme);
  return {
    locales: pymes.filter((m) => m.pais === paisId),
    resto: pymes.filter((m) => m.pais !== paisId),
  };
}

// ------------------------------------------------------------- productos
export type Categoria = "racks" | "maquinas" | "poleas" | "pesos" | "bancos" | "accesorios";

export interface Producto {
  id: string;
  marcaId: string;
  nombre: [string, string];
  categoria: Categoria;
  precio: number;
  /** Precio anterior: si está, el producto va EN OFERTA. */
  antes?: number;
  nota: [string, string];
  rating: string;
  arte: string;
  /** Días desde el lanzamiento (≤ 90 ⇒ estreno). */
  lanzadoHaceDias: number;
  /**
   * Fotografía de la ficha, dentro de `public/marketplace/`. Sin ella va el
   * dibujo de `arte`, que es lo que tienen todavía la mayoría.
   */
  foto?: string;
}

export const CATALOGO: Producto[] = [

  { id: "pm-rack", marcaId: "promax", nombre: ["Power rack ProMax PR-9", "ProMax PR-9 power rack"], categoria: "racks", precio: 1690, antes: 1890, nota: ["Perfil 3×3\" · pruébalo en el Builder", "3×3\" profile · try it in the Builder"], rating: "★★★★★ 4.9", arte: ARTE.rack, lanzadoHaceDias: 420 },
  { id: "pm-jaula", marcaId: "promax", nombre: ["Jaula perimetral PM-Kubus", "PM-Kubus perimeter cage"], categoria: "racks", precio: 2490, nota: ["Seis postes y dos estaciones de polea", "Six uprights and two pulley stations"], rating: "★★★★★ 4.9", arte: ARTE.jaula, lanzadoHaceDias: 260 },
  { id: "pm-brazos", marcaId: "promax", nombre: ["Brazos de seguridad abatibles PR-Safe", "PR-Safe folding spotter arms"], categoria: "accesorios", precio: 390, antes: 450, nota: ["Se pliegan contra el poste y paran la barra", "Fold against the upright and catch the bar"], rating: "★★★★★ 4.9", arte: ARTE.jota, lanzadoHaceDias: 52, foto: "p-brazos.webp" },

  { id: "sc-discos", marcaId: "steelcore", nombre: ["Set discos bumper 150 kg", "150 kg bumper plate set"], categoria: "pesos", precio: 620, antes: 720, nota: ["Goma vulcanizada, rebote muerto", "Vulcanized rubber, dead bounce"], rating: "★★★★★ 4.9", arte: ARTE.discos, lanzadoHaceDias: 340, foto: "p-discos-pila.webp" },
  { id: "sc-barra", marcaId: "steelcore", nombre: ["Barra olímpica Steel Core 20 kg", "Steel Core 20 kg olympic bar"], categoria: "pesos", precio: 245, nota: ["Cromada, Ø 28 mm, moleteado medio", "Chromed, Ø 28 mm, medium knurl"], rating: "★★★☆☆ 3.8", arte: ARTE.barra, lanzadoHaceDias: 210, foto: "p-barra.webp" },

  { id: "ti-prensa", marcaId: "titan", nombre: ["Prensa de piernas 45° Titan", "Titan 45° leg press"], categoria: "maquinas", precio: 1580, antes: 1790, nota: ["Carro sobre rodamientos, doble tope", "Bearing-guided carriage, dual stop"], rating: "★★★★☆ 4.5", arte: ARTE.prensa, lanzadoHaceDias: 190, foto: "p-prensa.webp" },
  { id: "ti-jammer", marcaId: "titan", nombre: ["Torre de jammer arms TI-2", "TI-2 jammer arm tower"], categoria: "maquinas", precio: 1340, nota: ["Brazos independientes, ocho alturas", "Independent arms, eight heights"], rating: "★★★★☆ 4.5", arte: ARTE.smith, lanzadoHaceDias: 120 },

  { id: "ex-multigrip", marcaId: "equipx", nombre: ["Barra de jalón multigrip EX", "EX multigrip lat bar"], categoria: "poleas", precio: 165, nota: ["Cromada, Ø 32 mm, cinco agarres", "Chromed, Ø 32 mm, five grips"], rating: "★★★★☆ 4.5", arte: ARTE.multigrip, lanzadoHaceDias: 150, foto: "p-multigrip.webp" },
  { id: "ex-jota", marcaId: "equipx", nombre: ["Par de jotas con rodillo UHMW", "UHMW roller J-hook pair"], categoria: "accesorios", precio: 95, antes: 115, nota: ["Calza en pinholes de 5 cm", "Fits 5 cm pinholes"], rating: "★★★☆☆ 3.8", arte: ARTE.jota, lanzadoHaceDias: 380, foto: "p-pasador.webp" },
  { id: "ex-agarres", marcaId: "equipx", nombre: ["Par de agarres de estribo EX-Grip", "EX-Grip stirrup handle pair"], categoria: "accesorios", precio: 75, nota: ["Puño moldeado y mosquetón de acero", "Molded grip and steel carabiner"], rating: "★★★★★ 4.9", arte: ARTE.multigrip, lanzadoHaceDias: 24, foto: "p-agarres.webp" },

  { id: "fx-torre", marcaId: "flexion", nombre: ["Torre de polea dual Flexion", "Flexion dual pulley tower"], categoria: "poleas", precio: 2290, antes: 2590, nota: ["Pila selectorizada de 90 kg", "90 kg selectorized stack"], rating: "★★★★★ 4.9", arte: ARTE.torre, lanzadoHaceDias: 300, foto: "p-torre.webp" },
  { id: "fx-banco", marcaId: "flexion", nombre: ["Banco regulable de 7 posiciones", "7-position adjustable bench"], categoria: "bancos", precio: 320, nota: ["Respaldo escalonado, ruedas de traslado", "Stepped backrest, transport wheels"], rating: "★★★★☆ 4.5", arte: ARTE.banco, lanzadoHaceDias: 175 },
  { id: "fx-estacion", marcaId: "flexion", nombre: ["Estación de polea con banco FX-Duo", "FX-Duo pulley station with bench"], categoria: "maquinas", precio: 1290, nota: ["Jalón y extensión en 1,2 m de pared", "Pulldown and extension in 1.2 m of wall"], rating: "★★★★☆ 4.5", arte: ARTE.torre, lanzadoHaceDias: 66, foto: "p-estacion.webp" },

  { id: "iw-kettle", marcaId: "ironworks", nombre: ["Kettlebell fundida 24 kg", "24 kg cast kettlebell"], categoria: "pesos", precio: 72, nota: ["Una sola pieza, asa pulida a mano", "Single piece, hand-polished handle"], rating: "★★★★★ 4.9", arte: ARTE.kettlebell, lanzadoHaceDias: 95 },
  { id: "iw-arbol", marcaId: "ironworks", nombre: ["Árbol de discos de seis cuernos", "Six-horn plate tree"], categoria: "accesorios", precio: 135, antes: 165, nota: ["Base ancha, no vuelca cargado", "Wide base, won't tip when loaded"], rating: "★★★☆☆ 3.8", arte: ARTE.arbol, lanzadoHaceDias: 230 },

  { id: "vx-bandas", marcaId: "vortex", nombre: ["Bandas de resistencia (juego 5)", "Resistance bands (set of 5)"], categoria: "accesorios", precio: 49, antes: 62, nota: ["De 5 a 60 kg de asistencia", "5 to 60 kg of assistance"], rating: "★★★☆☆ 3.8", arte: ARTE.bandas, lanzadoHaceDias: 140 },
  { id: "vx-trineo", marcaId: "vortex", nombre: ["Trineo de empuje Vortex", "Vortex push sled"], categoria: "accesorios", precio: 365, nota: ["Patines de nylon, dos postes de carga", "Nylon skids, two loading posts"], rating: "★★★★★ 4.9", arte: ARTE.trineo, lanzadoHaceDias: 78 },

  { id: "mx-smith", marcaId: "matrix", nombre: ["Multipower Matrix M-Linear", "Matrix M-Linear multipower"], categoria: "maquinas", precio: 2590, antes: 2890, nota: ["Guías rectificadas, contrapeso ajustable", "Ground rails, adjustable counterweight"], rating: "★★★★★ 4.9", arte: ARTE.smith, lanzadoHaceDias: 320, foto: "p-smith.webp" },
  { id: "mx-cadenas", marcaId: "matrix", nombre: ["Cadenas de seguridad (par)", "Safety chains (pair)"], categoria: "accesorios", precio: 68, nota: ["Detienen la barra como en la app", "They stop the bar, app-style"], rating: "★★★★★ 4.9", arte: ARTE.cadenas, lanzadoHaceDias: 265, foto: "p-cadenas.webp" },

  { id: "ps-banco", marcaId: "powersquad", nombre: ["Banco plano de sala", "Commercial flat bench"], categoria: "bancos", precio: 210, nota: ["El modelo de la biblioteca nativa", "The native library model"], rating: "★★★☆☆ 3.8", arte: ARTE.banco, lanzadoHaceDias: 500 },
  { id: "ps-plataforma", marcaId: "powersquad", nombre: ["Plataforma de levantamiento", "Lifting platform"], categoria: "accesorios", precio: 540, nota: ["Roble macizo sobre goma de 20 mm", "Solid oak over 20 mm rubber"], rating: "★★★★☆ 4.5", arte: ARTE.plataforma, lanzadoHaceDias: 205 },

  { id: "op-rack", marcaId: "optimus", nombre: ["Rack Optimus O-700", "Optimus O-700 rack"], categoria: "racks", precio: 1450, nota: ["Cuatro postes, acabado en polvo", "Four uprights, powder coated"], rating: "★★★★★ 4.9", arte: ARTE.rack, lanzadoHaceDias: 285, foto: "p-rack.webp" },
  { id: "op-mancuernas", marcaId: "optimus", nombre: ["Mancuernas hexagonales 2–30 kg", "2–30 kg hex dumbbells"], categoria: "pesos", precio: 890, antes: 990, nota: ["Fundición propia, mango moleteado", "Own foundry, knurled handle"], rating: "★★★★☆ 4.5", arte: ARTE.mancuernas, lanzadoHaceDias: 160 },

  { id: "vl-trineo", marcaId: "velocity", nombre: ["Trineo de velocidad VT-Sprint", "VT-Sprint speed sled"], categoria: "accesorios", precio: 320, nota: ["Bajo y ancho: no cabecea al tirar", "Low and wide: no nosing under pull"], rating: "★★★★★ 4.9", arte: ARTE.trineo, lanzadoHaceDias: 12 },
  { id: "vl-bandas", marcaId: "velocity", nombre: ["Bandas de sprint con arnés", "Sprint bands with harness"], categoria: "accesorios", precio: 78, nota: ["Arnés acolchado, dos cinchas de tiro", "Padded harness, two pull straps"], rating: "★★★★☆ 4.5", arte: ARTE.bandas, lanzadoHaceDias: 21 },

  { id: "ap-jaula", marcaId: "apex", nombre: ["Jaula modular Apex A-6", "Apex A-6 modular cage"], categoria: "racks", precio: 1790, nota: ["Crece de dos postes a seis por módulos", "Grows from two uprights to six"], rating: "★★★★★ 4.9", arte: ARTE.jaula, lanzadoHaceDias: 9 },
  { id: "ap-barra", marcaId: "apex", nombre: ["Barra olímpica Apex 20 kg", "Apex 20 kg olympic bar"], categoria: "pesos", precio: 198, nota: ["Cromada, casquillos sobre agujas", "Chromed, needle-bearing sleeves"], rating: "★★★☆☆ 3.8", arte: ARTE.barra, lanzadoHaceDias: 30 },

  { id: "gy-anillas", marcaId: "gymnast", nombre: ["Anillas de madera con cinchas", "Wooden rings with straps"], categoria: "accesorios", precio: 88, nota: ["Abedul laminado, cincha de 4,5 m", "Laminated birch, 4.5 m strap"], rating: "★★★★★ 4.9", arte: ARTE.multigrip, lanzadoHaceDias: 110 },
  { id: "gy-plataforma", marcaId: "gymnast", nombre: ["Plataforma de roble macizo", "Solid oak platform"], categoria: "accesorios", precio: 580, nota: ["Acabada a mano, numerada", "Hand-finished, numbered"], rating: "★★★★★ 4.9", arte: ARTE.plataforma, lanzadoHaceDias: 33 },

  { id: "rv-torre", marcaId: "revolution", nombre: ["Torre de poleas Revolution R-2", "Revolution R-2 pulley tower"], categoria: "poleas", precio: 2450, nota: ["Roldanas accesibles sin desmontar", "Sheaves reachable without stripping"], rating: "★★★★★ 4.9", arte: ARTE.torre, lanzadoHaceDias: 18, foto: "p-torre-poleas.webp" },
  { id: "rv-prensa", marcaId: "revolution", nombre: ["Prensa de piernas RV-45", "RV-45 leg press"], categoria: "maquinas", precio: 1690, nota: ["Engrase de carro desde fuera", "Carriage greasing from outside"], rating: "★★★☆☆ 3.8", arte: ARTE.prensa, lanzadoHaceDias: 40 },

  { id: "pr-quimera", marcaId: "precision", nombre: ["Tu diseño, fabricado", "Your design, built"], categoria: "racks", precio: 0, nota: ["Sube tu prefab .json y recibe oferta", "Upload your .json prefab for a quote"], rating: "★★★★★ 4.9", arte: ARTE.quimera, lanzadoHaceDias: 6, foto: "p-quimera.webp" },
  { id: "pr-jota", marcaId: "precision", nombre: ["Jotas de precisión con rodillo", "Precision roller J-hooks"], categoria: "accesorios", precio: 105, nota: ["Cortadas a la cota de tu rack", "Cut to your rack's dimension"], rating: "★★★★★ 4.9", arte: ARTE.jota, lanzadoHaceDias: 55 },

  { id: "ev-smith", marcaId: "evolution", nombre: ["Multipower Evolution E-Linear", "Evolution E-Linear multipower"], categoria: "maquinas", precio: 2190, antes: 2390, nota: ["Registro de cambios publicado", "Published change log"], rating: "★★★★☆ 4.5", arte: ARTE.smith, lanzadoHaceDias: 240, foto: "p-multipower.webp" },
  { id: "ev-discos", marcaId: "evolution", nombre: ["Set discos bumper 100 kg", "100 kg bumper plate set"], categoria: "pesos", precio: 445, antes: 520, nota: ["Goma reciclada, rebote muerto", "Recycled rubber, dead bounce"], rating: "★★★★☆ 4.5", arte: ARTE.discos, lanzadoHaceDias: 130 },
];

export const CATEGORIAS: [Categoria | "todo", string, string][] = [
  ["todo", "Todo", "All"],
  ["racks", "Racks", "Racks"],
  ["maquinas", "Máquinas", "Machines"],
  ["poleas", "Poleas", "Pulleys"],
  ["pesos", "Pesos y barras", "Weights & bars"],
  ["bancos", "Bancos", "Benches"],
  ["accesorios", "Accesorios", "Accessories"],
];

/** Estrenos: lanzados hace 90 días o menos, el más reciente primero. */
export function productosNuevos(): Producto[] {
  return CATALOGO.filter((p) => p.lanzadoHaceDias <= 90).sort((a, b) => a.lanzadoHaceDias - b.lanzadoHaceDias);
}

// ------------------------------------------------------------- OnDemand
/**
 * QUÉ ADMITE PERSONALIZAR UN DISEÑO ABIERTO.
 *
 * OnDemand no es un catálogo aparte: son productos del catálogo de siempre que
 * su marca abre a modificación. Por eso la tabla va POR FUERA del producto,
 * indexada por su `id` — así se abre o se cierra un diseño sin tocar la ficha.
 */
export interface Personaliza {
  /** Qué partes se pintan. `tapiz` sólo donde hay acolchado. */
  partes: ("estructura" | "tapiz" | "detalle")[];
  /** Admite grabado o serigrafía de un texto propio. */
  lettering: boolean;
  /** Piezas extra de fábrica, con su recargo sobre el precio de lista. */
  extras: { id: string; nombre: [string, string]; precio: number }[];
  /** Plazo de fabricación del pedido personalizado, en semanas. */
  semanas: number;
}

export const PERSONALIZABLES: Record<string, Personaliza> = {
  "pm-rack": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 6,
    extras: [
      { id: "jotas", nombre: ["Par de jotas con rodillo UHMW", "UHMW roller J-hook pair"], precio: 89 },
      { id: "dominadas", nombre: ["Barra de dominadas multiagarre", "Multi-grip pull-up bar"], precio: 140 },
      { id: "cadenas", nombre: ["Cadenas de seguridad (par)", "Safety chains (pair)"], precio: 59 },
    ],
  },
  "ap-jaula": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 8,
    extras: [
      { id: "polea", nombre: ["Tercera estación de polea", "Third pulley station"], precio: 480 },
      { id: "plataforma", nombre: ["Plataforma de roble integrada", "Integrated oak platform"], precio: 520 },
      { id: "almacenaje", nombre: ["Postes de almacenaje de discos", "Plate storage posts"], precio: 95 },
    ],
  },
  "fx-banco": {
    partes: ["estructura", "tapiz"],
    lettering: true,
    semanas: 4,
    extras: [
      { id: "respaldo", nombre: ["Respaldo regulable de 7 posiciones", "7-position adjustable backrest"], precio: 120 },
      { id: "ruedas", nombre: ["Ruedas de traslado y asa", "Transport wheels and handle"], precio: 45 },
    ],
  },
  "fx-torre": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 7,
    extras: [
      { id: "multigrip", nombre: ["Barra de jalón multigrip", "Multigrip lat bar"], precio: 145 },
      { id: "triangulo", nombre: ["Agarre en triángulo", "Triangle grip"], precio: 55 },
      { id: "pila", nombre: ["Pila ampliada a 120 kg", "Stack upgraded to 120 kg"], precio: 310 },
    ],
  },
  "ti-prensa": {
    partes: ["estructura", "tapiz"],
    lettering: true,
    semanas: 9,
    extras: [
      { id: "tope", nombre: ["Doble tope de seguridad reforzado", "Reinforced dual safety stop"], precio: 130 },
      { id: "portadiscos", nombre: ["Cuatro cuernos portadiscos", "Four plate horns"], precio: 90 },
    ],
  },
  "mx-smith": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 8,
    extras: [
      { id: "contrapeso", nombre: ["Contrapeso ampliado", "Extended counterweight"], precio: 180 },
      { id: "banco", nombre: ["Banco plano a juego", "Matching flat bench"], precio: 199 },
    ],
  },
  "ps-plataforma": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 5,
    extras: [
      { id: "anclajes", nombre: ["Anclajes de bandas empotrados", "Recessed band anchors"], precio: 70 },
      { id: "cerco", nombre: ["Cerco de acero perimetral", "Perimeter steel frame"], precio: 160 },
    ],
  },
  "vx-trineo": {
    partes: ["estructura", "detalle"],
    lettering: true,
    semanas: 3,
    extras: [
      { id: "arnes", nombre: ["Arnés y cinchas de arrastre", "Harness and pull straps"], precio: 65 },
      { id: "patines", nombre: ["Juego de patines de repuesto", "Spare skid set"], precio: 40 },
    ],
  },
};

/** Los diseños que su marca abrió a personalización. */
export function catalogoOnDemand(): Producto[] {
  return CATALOGO.filter((p) => p.id in PERSONALIZABLES);
}

export function productosDe(marcaId: string): Producto[] {
  return CATALOGO.filter((p) => p.marcaId === marcaId);
}

// -------------------------------------------------------------- formatos
export function precio$(n: number): string {
  return `$ ${n.toLocaleString("es-CL")}`;
}

/** «hace 3 días» / «hace 2 semanas» / «hace 4 meses». */
export function haceDias(d: number): string {
  if (d <= 1) return tt("hoy", "today");
  if (d < 14) return tt(`hace ${d} días`, `${d} days ago`);
  if (d < 60) {
    const s = Math.round(d / 7);
    return tt(`hace ${s} semanas`, `${s} weeks ago`);
  }
  const m = Math.round(d / 30);
  return tt(`hace ${m} meses`, `${m} months ago`);
}

export function haceMeses(m: number): string {
  if (m <= 1) return tt("este mes", "this month");
  if (m < 12) return tt(`hace ${m} meses`, `${m} months ago`);
  const a = Math.floor(m / 12);
  return a === 1 ? tt("hace 1 año", "1 year ago") : tt(`hace ${a} años`, `${a} years ago`);
}

// ------------------------------------------------------------ historias
/** Diapositiva de la fila de historias (formato vertical, como Instagram). */
export interface Diapositiva {
  arte: string;
  titulo: [string, string];
  texto: [string, string];
}

export interface Historia {
  marcaId: string;
  diapositivas: Diapositiva[];
}

export const HISTORIAS: Historia[] = [
  {
    marcaId: "matrix",
    diapositivas: [
      { arte: ARTE.smith, titulo: ["Multipower NW-Linear", "NW-Linear multipower"], texto: ["Guías lineales rectificadas: la barra baja sin juego lateral.", "Ground linear rails: the bar tracks with no lateral play."] },
      { arte: ARTE.jaula, titulo: ["Jaula NW-Kubus", "NW-Kubus cage"], texto: ["Seis postes, dos estaciones de polea y perfil compatible con tus jotas.", "Six uprights, two pulley stations, profile compatible with your J-hooks."] },
      { arte: ARTE.escaner, titulo: ["Escaneadas en fábrica", "Scanned at the plant"], texto: ["Once modelos levantados con escáner fotográfico: se prueban a escala real en tu sala.", "Eleven models captured by photographic scanning: try them at true scale in your gym."] },
    ],
  },
  {
    marcaId: "apex",
    diapositivas: [
      { arte: ARTE.trineo, titulo: ["Trineo de empuje", "Push sled"], texto: ["Patines de nylon para pasto sintético y cemento pulido.", "Nylon skids for turf and polished concrete."] },
      { arte: ARTE.mancuernas, titulo: ["Hexagonales de molde propio", "Hex dumbbells, own mold"], texto: ["De 2 a 20 kg, mango moleteado a máquina.", "2 to 20 kg, machine-knurled handle."] },
    ],
  },
  {
    marcaId: "gymnast",
    diapositivas: [
      { arte: ARTE.kettlebell, titulo: ["Fundida en una pieza", "Cast in one piece"], texto: ["Sin soldadura en el asa: se pule a mano hasta que no engancha.", "No weld on the handle: hand-polished until it stops catching."] },
      { arte: ARTE.plataforma, titulo: ["Plataforma de roble", "Oak platform"], texto: ["Roble macizo sobre goma de 20 mm; series de veinte al mes.", "Solid oak over 20 mm rubber; runs of twenty a month."] },
    ],
  },
  {
    marcaId: "promax",
    diapositivas: [
      { arte: ARTE.rack, titulo: ["IF-700 en oferta", "IF-700 on sale"], texto: ["El rack de siempre, perfil 3×3\", con 13 % de descuento este mes.", "The usual rack, 3×3\" profile, 13 % off this month."] },
      { arte: ARTE.jota, titulo: ["Jotas con rodillo UHMW", "UHMW roller J-hooks"], texto: ["El rodillo evita que el moleteado se coma la pintura del poste.", "The roller keeps the knurl from eating the upright's paint."] },
    ],
  },
  {
    marcaId: "flexion",
    diapositivas: [
      { arte: ARTE.torre, titulo: ["Torre de polea dual", "Dual pulley tower"], texto: ["Pila de 90 kg fundida en casa; relación 1:1 y 2:1 en la misma columna.", "90 kg stack cast in house; 1:1 and 2:1 ratios on the same column."] },
      { arte: ARTE.barra, titulo: ["Cromado en planta", "Chromed on site"], texto: ["Barra de 20 kg, Ø 28 mm, agarre medio; garantía de por vida al eje.", "20 kg bar, Ø 28 mm, medium knurl; lifetime shaft warranty."] },
    ],
  },
  {
    marcaId: "precision",
    diapositivas: [
      { arte: ARTE.quimera, titulo: ["Tu prefab, fabricado", "Your prefab, built"], texto: ["Exporta el .json desde el Builder y te devolvemos oferta en 72 h.", "Export the .json from the Builder and we quote you back in 72 h."] },
    ],
  },
  {
    marcaId: "titan",
    diapositivas: [
      { arte: ARTE.prensa, titulo: ["Prensa 45° TF-45", "TF-45 45° press"], texto: ["Carro sobre rodamientos y doble tope de seguridad.", "Bearing-guided carriage and dual safety stop."] },
      { arte: ARTE.bandas, titulo: ["Juego de cinco bandas", "Set of five bands"], texto: ["De 5 a 60 kg de asistencia, látex en capas.", "5 to 60 kg of assistance, layered latex."] },
    ],
  },
];

// ---------------------------------------------------------- foro de makers
export type EtiquetaHilo = "diseno" | "patrocinio" | "equipo";

export const ETIQUETAS_HILO: [EtiquetaHilo | "todo", string, string][] = [
  ["todo", "Todo el foro", "Whole forum"],
  ["diseno", "Diseños originales", "Original designs"],
  ["patrocinio", "Busco patrocinio", "Seeking sponsorship"],
  ["equipo", "Equipos de trabajo", "Work groups"],
];

export interface HiloMaker {
  id: string;
  autor: string;
  iniciales: string;
  pais: string;
  titulo: [string, string];
  cuerpo: [string, string];
  etiqueta: EtiquetaHilo;
  haceDias: number;
  apoyos: number;
  arte: string;
  /** Sólo en hilos de patrocinio: respaldo conseguido sobre el objetivo. */
  patrocinio?: { objetivo: number; logrado: number; marcas: string[] };
  respuestas: { autor: string; texto: [string, string]; deMarca?: string }[];
}

export const HILOS: HiloMaker[] = [
  {
    id: "upper",
    autor: "Alberto M.",
    iniciales: "AM",
    pais: "cl",
    titulo: ["UpperMachine: torre multiestación de dos cables", "UpperMachine: two-cable multi-station tower"],
    cuerpo: [
      "Jalón alto y press de pecho compartiendo pila, con carro de doble roldana entre dos senos opuestos. El prefab completo va en la biblioteca estándar de la app: ábranlo y muévanlo en simulación antes de opinar.",
      "Lat pulldown and chest press sharing one stack, with a double-sheave carriage hung between two opposed bights. The full prefab ships in the app's standard library: open it and run the sim before commenting.",
    ],
    etiqueta: "diseno",
    haceDias: 3,
    apoyos: 184,
    arte: ARTE.torre,
    respuestas: [
      { autor: "R. Salinas", texto: ["La altura del carro es la que reparte el recorrido entre las dos estaciones, ¿verdad? Bajarlo alarga el jalón.", "The carriage height is what splits travel between the two stations, right? Lowering it lengthens the pulldown."] },
      { autor: "Flexion Stations", deMarca: "flexion", texto: ["Nos interesa. Podemos cotizar el bastidor cortado a medida si nos pasas el .json.", "We're interested. We can quote the frame cut to size if you send us the .json."] },
      { autor: "Alberto M.", texto: ["Va en camino. El brazo pesa 19 kg y es el único contrapeso, ojo con eso al escalarlo.", "On its way. The arm weighs 19 kg and is the only counterweight — watch that when scaling it."] },
    ],
  },
  {
    id: "jaula-garaje",
    autor: "Vera Ortiz",
    iniciales: "VO",
    pais: "ar",
    titulo: ["Rack de garaje plegable de 2,1 m", "2.1 m folding garage rack"],
    cuerpo: [
      "Se pliega contra la pared en 15 s y aguanta 250 kg en las barras de seguridad. Busco quien lo fabrique en serie corta: ya está validado en simulación con carga.",
      "Folds flat against the wall in 15 s and holds 250 kg on the safeties. Looking for someone to build a short run: already validated in sim under load.",
    ],
    etiqueta: "patrocinio",
    haceDias: 9,
    apoyos: 96,
    arte: ARTE.rack,
    patrocinio: { objetivo: 40, logrado: 27, marcas: ["apex", "precision"] },
    respuestas: [
      { autor: "Apex Fitness Gear", deMarca: "apex", texto: ["Podemos hacer la bisagra en fundición. Nos faltan 13 reservas para que salga el molde.", "We can cast the hinge. We need 13 more reservations to justify the mold."] },
      { autor: "D. Kovac", texto: ["Reservé una. ¿La bisagra lleva pasador de 12 o de 16?", "Reserved one. Is the hinge pin 12 or 16 mm?"] },
    ],
  },
  {
    id: "escaneo",
    autor: "Colectivo Tornillo",
    iniciales: "CT",
    pais: "es",
    titulo: ["Buscamos gente para catalogar accesorios antiguos", "Looking for people to catalog vintage attachments"],
    cuerpo: [
      "Queremos escanear y medir los agarres de los años 80 que nadie fabrica ya, y publicarlos como piezas libres para el Builder. Hacen falta manos con cámara y paciencia.",
      "We want to scan and measure the 1980s attachments nobody makes anymore and publish them as free Builder parts. We need hands with a camera and patience.",
    ],
    etiqueta: "equipo",
    haceDias: 16,
    apoyos: 61,
    arte: ARTE.escaner,
    respuestas: [
      { autor: "M. Tapia", texto: ["Me apunto con el trípode y la mesa giratoria. ¿Qué resolución están pidiendo?", "Count me in with tripod and turntable. What resolution are you asking for?"] },
    ],
  },
  {
    id: "leg-curl",
    autor: "Hana K.",
    iniciales: "HK",
    pais: "jp",
    titulo: ["Curl femoral con leva de radio variable", "Leg curl with variable-radius cam"],
    cuerpo: [
      "La leva compensa la curva de fuerza: 60 % de resistencia al inicio y 100 % al final del recorrido. Comparto el perfil de la leva para que lo critiquen.",
      "The cam compensates the strength curve: 60 % resistance at the start, 100 % at the end of travel. Sharing the cam profile for critique.",
    ],
    etiqueta: "diseno",
    haceDias: 22,
    apoyos: 143,
    arte: ARTE.prensa,
    respuestas: [
      { autor: "Matrix Fitness Solutions", deMarca: "matrix", texto: ["El perfil es sensato. Cuidado con el rozamiento del cable en el borde de la leva.", "The profile is sound. Mind the cable friction at the cam edge."] },
      { autor: "Hana K.", texto: ["Le puse una garganta de 6 mm y una guarda; con eso el cable no salta.", "I gave it a 6 mm groove and a keeper; the cable no longer jumps."] },
    ],
  },
  {
    id: "banco-barrio",
    autor: "Gimnasio La Esquina",
    iniciales: "GE",
    pais: "mx",
    titulo: ["Diez bancos para un gimnasio de barrio", "Ten benches for a neighborhood gym"],
    cuerpo: [
      "Abrimos en octubre y necesitamos diez bancos planos iguales, robustos y baratos. Buscamos taller que quiera el pedido completo.",
      "We open in October and need ten identical flat benches, sturdy and cheap. Looking for a shop that wants the whole order.",
    ],
    etiqueta: "patrocinio",
    haceDias: 5,
    apoyos: 38,
    arte: ARTE.banco,
    patrocinio: { objetivo: 10, logrado: 6, marcas: ["titan"] },
    respuestas: [
      { autor: "Titan Commercial", deMarca: "titan", texto: ["Tenemos el molde del tapiz. Con seis confirmados ya cerramos el precio de serie.", "We have the upholstery mold. With six confirmed we can lock the run price."] },
    ],
  },
];

// -------------------------------------------------- encargos (GOT A WISH)
export type EstadoDeseo = "enviado" | "revision" | "presupuestado" | "fabricando";

export const ESTADOS_DESEO: Record<EstadoDeseo, [string, string]> = {
  enviado: ["Enviado", "Submitted"],
  revision: ["En revisión", "Under review"],
  presupuestado: ["Presupuestado", "Quoted"],
  fabricando: ["En fabricación", "In production"],
};

export interface Deseo {
  id: string;
  titulo: [string, string];
  marcaId: string;
  estado: EstadoDeseo;
  haceDias: number;
  arte: string;
  mensajes: { de: string; deMarca?: string; texto: [string, string] }[];
}

export const DESEOS: Deseo[] = [
  {
    id: "d-jaula",
    titulo: ["Jaula corta para techo de 2,05 m", "Short cage for a 2.05 m ceiling"],
    marcaId: "matrix",
    estado: "presupuestado",
    haceDias: 6,
    arte: ARTE.jaula,
    mensajes: [
      { de: "tú", texto: ["Adjunto el prefab. Necesito la misma jaula pero 25 cm más baja, sin perder el recorrido del jalón.", "Prefab attached. I need the same cage 25 cm shorter without losing pulldown travel."] },
      { de: "Matrix Fitness Solutions", deMarca: "matrix", texto: ["Se puede: bajamos el travesaño y subimos la roldana al interior del perfil. Presupuesto adjunto.", "Doable: we drop the crossbeam and move the sheave inside the profile. Quote attached."] },
      { de: "tú", texto: ["¿La roldana interna mantiene el ángulo de salida del cable?", "Does the internal sheave keep the cable's exit angle?"] },
      { de: "Matrix Fitness Solutions", deMarca: "matrix", texto: ["Sí, con una segunda roldana de reenvío. Te mandamos el .json corregido para que lo simules.", "Yes, with a second idler. We'll send the corrected .json so you can simulate it."] },
    ],
  },
  {
    id: "d-banco",
    titulo: ["Banco con respaldo de 7 posiciones", "Bench with a 7-position backrest"],
    marcaId: "precision",
    estado: "fabricando",
    haceDias: 21,
    arte: ARTE.banco,
    mensajes: [
      { de: "tú", texto: ["Quiero el banco de la biblioteca pero con respaldo escalonado y tapiz rojo.", "I want the library bench but with a stepped backrest and red upholstery."] },
      { de: "Precision Gym", deMarca: "precision", texto: ["Cortado y soldado. Entramos a tapicería esta semana.", "Cut and welded. Upholstery starts this week."] },
    ],
  },
];
