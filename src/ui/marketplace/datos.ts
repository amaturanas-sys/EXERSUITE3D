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
}

export const MARCAS: Marca[] = [
  {
    id: "ironforge",
    nombre: "IronForge Equipment",
    corto: "IronForge",
    pais: "us",
    pyme: false,
    antiguedadMeses: 29,
    lema: ["Acero estructural para toda la vida", "Structural steel built to last"],
    historia: [
      "Fabricante de racks y accesorios de perfil 3×3\". Toda su línea está escaneada y calza con los pinholes de la biblioteca nativa.",
      "Maker of 3×3\" racks and attachments. Their whole line is scanned and matches the native library pinholes.",
    ],
    escaneados: 34,
    seguidores: 12840,
  },
  {
    id: "andes",
    nombre: "Andes Strength Co.",
    corto: "Andes",
    pais: "cl",
    pyme: true,
    antiguedadMeses: 18,
    lema: ["Poleas y pesos hechos en la cordillera", "Pulleys and weights made in the Andes"],
    historia: [
      "Taller mediano de Santiago especializado en torres de polea selectorizadas. Funde sus propias placas y cromas sus barras en planta.",
      "Mid-sized Santiago workshop focused on selectorized pulley towers. They cast their own plates and chrome their bars in house.",
    ],
    escaneados: 21,
    seguidores: 4610,
  },
  {
    id: "quimera",
    nombre: "Taller Quimera",
    corto: "Quimera",
    pais: "cl",
    pyme: true,
    antiguedadMeses: 12,
    lema: ["Tu diseño, fabricado a pedido", "Your design, built to order"],
    historia: [
      "Cinco personas, una plegadora y una mesa de corte. Fabrican por encargo a partir del prefab .json que exportes desde el Builder.",
      "Five people, a press brake and a cutting table. They build to order straight from the .json prefab you export in the Builder.",
    ],
    escaneados: 9,
    seguidores: 2380,
  },
  {
    id: "nordwerk",
    nombre: "Nordwerk Gym Systems",
    corto: "Nordwerk",
    pais: "de",
    pyme: false,
    antiguedadMeses: 2,
    lema: ["Ingeniería guiada, tolerancias de taller", "Guided engineering, machine-shop tolerances"],
    historia: [
      "Recién llegada al hub. Trae su multipower de guías lineales y una jaula modular; ambas ya escaneadas en alta fidelidad.",
      "Just landed on the hub. Brings its linear-rail multipower and a modular cage, both already scanned in high fidelity.",
    ],
    escaneados: 11,
    seguidores: 730,
  },
  {
    id: "pampa",
    nombre: "Pampa Fierro",
    corto: "Pampa",
    pais: "ar",
    pyme: true,
    antiguedadMeses: 1,
    lema: ["Hierro de campo, precio de barrio", "Country iron, neighborhood price"],
    historia: [
      "Herrería familiar de Rosario que pasó del portón al equipamiento. Trineos y mancuernas hexagonales fundidas a molde propio.",
      "Family ironworks in Rosario that moved from gates to gym gear. Sleds and hex dumbbells cast in their own molds.",
    ],
    escaneados: 6,
    seguidores: 410,
  },
  {
    id: "kaizen",
    nombre: "Kaizen Ironworks",
    corto: "Kaizen",
    pais: "jp",
    pyme: true,
    antiguedadMeses: 3,
    lema: ["Una pieza mejor cada día", "One better piece every day"],
    historia: [
      "Fundición pequeña de Niigata. Series cortas de kettlebells y plataformas de levantamiento con acabado a mano.",
      "Small Niigata foundry. Short runs of kettlebells and lifting platforms finished by hand.",
    ],
    escaneados: 7,
    seguidores: 1290,
  },
  {
    id: "terrafit",
    nombre: "TerraFit México",
    corto: "TerraFit",
    pais: "mx",
    pyme: true,
    antiguedadMeses: 14,
    lema: ["Máquinas de sala para gimnasios de barrio", "Floor machines for neighborhood gyms"],
    historia: [
      "Planta en Monterrey enfocada en máquinas de placas para gimnasios chicos: precio de sala completa, servicio en el país.",
      "Monterrey plant focused on plate-loaded machines for small gyms: whole-floor pricing, in-country service.",
    ],
    escaneados: 16,
    seguidores: 3120,
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
}

export const CATALOGO: Producto[] = [
  { id: "rack", marcaId: "ironforge", nombre: ["Power rack IF-700", "IF-700 power rack"], categoria: "racks", precio: 1290, antes: 1490, nota: ["Perfil 3×3\" · pruébalo en el Builder", "3×3\" profile · try it in the Builder"], rating: "★★★★★ 4.9", arte: ARTE.rack, lanzadoHaceDias: 420 },
  { id: "torre", marcaId: "andes", nombre: ["Torre de polea dual", "Dual pulley tower"], categoria: "poleas", precio: 2150, antes: 2490, nota: ["Pila selectorizada de 90 kg", "90 kg selectorized stack"], rating: "★★★★★ 4.8", arte: ARTE.torre, lanzadoHaceDias: 300 },
  { id: "banco", marcaId: "quimera", nombre: ["Banco plano clásico", "Classic flat bench"], categoria: "bancos", precio: 199, antes: 249, nota: ["El modelo de la biblioteca nativa", "The native library model"], rating: "★★★★★ 4.7", arte: ARTE.banco, lanzadoHaceDias: 500 },
  { id: "jota", marcaId: "ironforge", nombre: ["Jota con rodillo UHMW", "UHMW roller J-hook"], categoria: "accesorios", precio: 89, antes: 109, nota: ["Calza en pinholes de 5 cm", "Fits 5 cm pinholes"], rating: "★★★★☆ 4.6", arte: ARTE.jota, lanzadoHaceDias: 380 },
  { id: "cadenas", marcaId: "ironforge", nombre: ["Cadenas de seguridad (par)", "Safety chains (pair)"], categoria: "accesorios", precio: 59, nota: ["Detienen la barra como en la app", "They stop the bar, app-style"], rating: "★★★★★ 4.9", arte: ARTE.cadenas, lanzadoHaceDias: 260 },
  { id: "barra", marcaId: "andes", nombre: ["Barra olímpica 20 kg", "20 kg olympic barbell"], categoria: "pesos", precio: 189, nota: ["Cromada, Ø 28 mm, agarre medio", "Chromed, Ø 28 mm, medium knurl"], rating: "★★★★☆ 4.5", arte: ARTE.barra, lanzadoHaceDias: 210 },
  { id: "discos", marcaId: "quimera", nombre: ["Set discos bumper 100 kg", "100 kg bumper plate set"], categoria: "pesos", precio: 420, antes: 520, nota: ["Goma vulcanizada, rebote muerto", "Vulcanized rubber, dead bounce"], rating: "★★★★★ 4.8", arte: ARTE.discos, lanzadoHaceDias: 340 },
  { id: "multigrip", marcaId: "andes", nombre: ["Barra de jalón multigrip", "Multigrip lat bar"], categoria: "poleas", precio: 145, nota: ["Cromada, Ø 32 mm", "Chromed, Ø 32 mm"], rating: "★★★★☆ 4.4", arte: ARTE.multigrip, lanzadoHaceDias: 150 },
  { id: "arbol", marcaId: "ironforge", nombre: ["Árbol de discos", "Plate tree"], categoria: "accesorios", precio: 120, antes: 150, nota: ["Seis cuernos, base estable", "Six horns, stable base"], rating: "★★★★☆ 4.6", arte: ARTE.arbol, lanzadoHaceDias: 190 },
  { id: "quimera", marcaId: "quimera", nombre: ["Tu diseño, fabricado", "Your design, built"], categoria: "racks", precio: 0, nota: ["Sube tu prefab .json y recibe oferta", "Upload your .json prefab for a quote"], rating: "★★★★★ 5.0", arte: ARTE.quimera, lanzadoHaceDias: 95 },

  // ---- Estrenos y marcas recién llegadas (v0.2.37)
  { id: "jaula", marcaId: "nordwerk", nombre: ["Jaula modular NW-Kubus", "NW-Kubus modular cage"], categoria: "racks", precio: 1690, nota: ["Seis postes, dos estaciones de polea", "Six uprights, two pulley stations"], rating: "★★★★★ 4.9", arte: ARTE.jaula, lanzadoHaceDias: 11 },
  { id: "smith", marcaId: "nordwerk", nombre: ["Multipower NW-Linear", "NW-Linear multipower"], categoria: "maquinas", precio: 2390, antes: 2690, nota: ["Guías lineales, contrapeso ajustable", "Linear rails, adjustable counterweight"], rating: "★★★★★ 4.8", arte: ARTE.smith, lanzadoHaceDias: 26 },
  { id: "trineo", marcaId: "pampa", nombre: ["Trineo de empuje Pampa", "Pampa push sled"], categoria: "accesorios", precio: 340, nota: ["Patines de nylon, dos postes de carga", "Nylon skids, two loading posts"], rating: "★★★★★ 4.7", arte: ARTE.trineo, lanzadoHaceDias: 17 },
  { id: "mancuernas", marcaId: "pampa", nombre: ["Mancuernas hexagonales 2–20 kg", "2–20 kg hex dumbbells"], categoria: "pesos", precio: 690, antes: 790, nota: ["Fundición propia, mango moleteado", "Own foundry, knurled handle"], rating: "★★★★☆ 4.6", arte: ARTE.mancuernas, lanzadoHaceDias: 44 },
  { id: "kettlebell", marcaId: "kaizen", nombre: ["Kettlebell fundida 24 kg", "24 kg cast kettlebell"], categoria: "pesos", precio: 79, nota: ["Una sola pieza, asa pulida a mano", "Single piece, hand-polished handle"], rating: "★★★★★ 4.9", arte: ARTE.kettlebell, lanzadoHaceDias: 8 },
  { id: "plataforma", marcaId: "kaizen", nombre: ["Plataforma de levantamiento", "Lifting platform"], categoria: "accesorios", precio: 520, nota: ["Roble macizo sobre goma de 20 mm", "Solid oak over 20 mm rubber"], rating: "★★★★☆ 4.6", arte: ARTE.plataforma, lanzadoHaceDias: 33 },
  { id: "prensa", marcaId: "terrafit", nombre: ["Prensa de piernas 45° TF-45", "TF-45 45° leg press"], categoria: "maquinas", precio: 1450, antes: 1690, nota: ["Carro sobre rodamientos, doble tope", "Bearing-guided carriage, dual stop"], rating: "★★★★☆ 4.5", arte: ARTE.prensa, lanzadoHaceDias: 72 },
  { id: "bandas", marcaId: "terrafit", nombre: ["Bandas de resistencia (juego 5)", "Resistance bands (set of 5)"], categoria: "accesorios", precio: 45, antes: 59, nota: ["De 5 a 60 kg de asistencia", "5 to 60 kg of assistance"], rating: "★★★★☆ 4.3", arte: ARTE.bandas, lanzadoHaceDias: 130 },
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
    marcaId: "nordwerk",
    diapositivas: [
      { arte: ARTE.smith, titulo: ["Multipower NW-Linear", "NW-Linear multipower"], texto: ["Guías lineales rectificadas: la barra baja sin juego lateral.", "Ground linear rails: the bar tracks with no lateral play."] },
      { arte: ARTE.jaula, titulo: ["Jaula NW-Kubus", "NW-Kubus cage"], texto: ["Seis postes, dos estaciones de polea y perfil compatible con tus jotas.", "Six uprights, two pulley stations, profile compatible with your J-hooks."] },
      { arte: ARTE.escaner, titulo: ["Escaneadas en fábrica", "Scanned at the plant"], texto: ["Once modelos levantados con escáner fotográfico: se prueban a escala real en tu sala.", "Eleven models captured by photographic scanning: try them at true scale in your gym."] },
    ],
  },
  {
    marcaId: "pampa",
    diapositivas: [
      { arte: ARTE.trineo, titulo: ["Trineo de empuje", "Push sled"], texto: ["Patines de nylon para pasto sintético y cemento pulido.", "Nylon skids for turf and polished concrete."] },
      { arte: ARTE.mancuernas, titulo: ["Hexagonales de molde propio", "Hex dumbbells, own mold"], texto: ["De 2 a 20 kg, mango moleteado a máquina.", "2 to 20 kg, machine-knurled handle."] },
    ],
  },
  {
    marcaId: "kaizen",
    diapositivas: [
      { arte: ARTE.kettlebell, titulo: ["Fundida en una pieza", "Cast in one piece"], texto: ["Sin soldadura en el asa: se pule a mano hasta que no engancha.", "No weld on the handle: hand-polished until it stops catching."] },
      { arte: ARTE.plataforma, titulo: ["Plataforma de roble", "Oak platform"], texto: ["Roble macizo sobre goma de 20 mm; series de veinte al mes.", "Solid oak over 20 mm rubber; runs of twenty a month."] },
    ],
  },
  {
    marcaId: "ironforge",
    diapositivas: [
      { arte: ARTE.rack, titulo: ["IF-700 en oferta", "IF-700 on sale"], texto: ["El rack de siempre, perfil 3×3\", con 13 % de descuento este mes.", "The usual rack, 3×3\" profile, 13 % off this month."] },
      { arte: ARTE.jota, titulo: ["Jotas con rodillo UHMW", "UHMW roller J-hooks"], texto: ["El rodillo evita que el moleteado se coma la pintura del poste.", "The roller keeps the knurl from eating the upright's paint."] },
    ],
  },
  {
    marcaId: "andes",
    diapositivas: [
      { arte: ARTE.torre, titulo: ["Torre de polea dual", "Dual pulley tower"], texto: ["Pila de 90 kg fundida en casa; relación 1:1 y 2:1 en la misma columna.", "90 kg stack cast in house; 1:1 and 2:1 ratios on the same column."] },
      { arte: ARTE.barra, titulo: ["Cromado en planta", "Chromed on site"], texto: ["Barra de 20 kg, Ø 28 mm, agarre medio; garantía de por vida al eje.", "20 kg bar, Ø 28 mm, medium knurl; lifetime shaft warranty."] },
    ],
  },
  {
    marcaId: "quimera",
    diapositivas: [
      { arte: ARTE.quimera, titulo: ["Tu prefab, fabricado", "Your prefab, built"], texto: ["Exporta el .json desde el Builder y te devolvemos oferta en 72 h.", "Export the .json from the Builder and we quote you back in 72 h."] },
    ],
  },
  {
    marcaId: "terrafit",
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
      { autor: "Andes Strength Co.", deMarca: "andes", texto: ["Nos interesa. Podemos cotizar el bastidor cortado a medida si nos pasas el .json.", "We're interested. We can quote the frame cut to size if you send us the .json."] },
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
    patrocinio: { objetivo: 40, logrado: 27, marcas: ["pampa", "quimera"] },
    respuestas: [
      { autor: "Pampa Fierro", deMarca: "pampa", texto: ["Podemos hacer la bisagra en fundición. Nos faltan 13 reservas para que salga el molde.", "We can cast the hinge. We need 13 more reservations to justify the mold."] },
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
      { autor: "Nordwerk Gym Systems", deMarca: "nordwerk", texto: ["El perfil es sensato. Cuidado con el rozamiento del cable en el borde de la leva.", "The profile is sound. Mind the cable friction at the cam edge."] },
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
    patrocinio: { objetivo: 10, logrado: 6, marcas: ["terrafit"] },
    respuestas: [
      { autor: "TerraFit México", deMarca: "terrafit", texto: ["Tenemos el molde del tapiz. Con seis confirmados ya cerramos el precio de serie.", "We have the upholstery mold. With six confirmed we can lock the run price."] },
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
    marcaId: "nordwerk",
    estado: "presupuestado",
    haceDias: 6,
    arte: ARTE.jaula,
    mensajes: [
      { de: "tú", texto: ["Adjunto el prefab. Necesito la misma jaula pero 25 cm más baja, sin perder el recorrido del jalón.", "Prefab attached. I need the same cage 25 cm shorter without losing pulldown travel."] },
      { de: "Nordwerk Gym Systems", deMarca: "nordwerk", texto: ["Se puede: bajamos el travesaño y subimos la roldana al interior del perfil. Presupuesto adjunto.", "Doable: we drop the crossbeam and move the sheave inside the profile. Quote attached."] },
      { de: "tú", texto: ["¿La roldana interna mantiene el ángulo de salida del cable?", "Does the internal sheave keep the cable's exit angle?"] },
      { de: "Nordwerk Gym Systems", deMarca: "nordwerk", texto: ["Sí, con una segunda roldana de reenvío. Te mandamos el .json corregido para que lo simules.", "Yes, with a second idler. We'll send the corrected .json so you can simulate it."] },
    ],
  },
  {
    id: "d-banco",
    titulo: ["Banco con respaldo de 7 posiciones", "Bench with a 7-position backrest"],
    marcaId: "quimera",
    estado: "fabricando",
    haceDias: 21,
    arte: ARTE.banco,
    mensajes: [
      { de: "tú", texto: ["Quiero el banco de la biblioteca pero con respaldo escalonado y tapiz rojo.", "I want the library bench but with a stepped backrest and red upholstery."] },
      { de: "Taller Quimera", deMarca: "quimera", texto: ["Cortado y soldado. Entramos a tapicería esta semana.", "Cut and welded. Upholstery starts this week."] },
    ],
  },
];
