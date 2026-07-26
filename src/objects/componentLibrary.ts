import type { ComponentCategory, ComponentDefinition } from "./types";

// Libreria de componentes de maquinas de gimnasio.
// Cada componente parte de una primitiva con dimensiones realistas (cm), un
// material PBR (ver materials.ts) y atributos fisicos por defecto. La paleta
// colorea los componentes por categoria; el material define el aspecto 3D.
// Estilo alineado con los disenos de referencia (POWERRACK, Rack_TTP001L,
// SanLorenzoGym): estructuras de acero negro, guias cromadas, acentos
// azul/naranja, pesos de hierro fundido.

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // ---------------------------------------------------------------- ESTRUCTURAL
  {
    id: "pilar",
    label: "Pilar estructural",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 8, height: 200, depth: 8 },
    physics: { massKg: 0, fixed: true },
    holeStepCm: 10,
    description: "Columna vertical de soporte de carga.",
  },
  {
    id: "pilar-linea",
    label: "Pilar / travesaño (línea)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: {
      kind: "beam",
      width: 5,
      depth: 5,
      ends: "plano",
      path: [[0, -50, 0], [0, -25, 0], [0, 0, 0], [0, 25, 0], [0, 50, 0]],
    },
    physics: { massKg: 0, fixed: true },
    placement: "beam",
    description:
      "Perfil de acero trazado entre dos puntos (perfiles 1:1/1:2/1:3, extremos plano/diagonal, pinholes). Se dobla por nodos.",
  },
  {
    id: "tubo-linea",
    label: "Tubo de acero (línea)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: {
      kind: "tube",
      radius: 2.4,
      path: [[0, -50, 0], [0, -25, 0], [0, 0, 0], [0, 25, 0], [0, 50, 0]],
    },
    physics: { massKg: 0, fixed: true },
    placement: "tube",
    description:
      "Tubo de acero trazado entre dos puntos, con medidas nominales. Se dobla por nodos.",
  },
  {
    id: "base-soporte",
    label: "Base de soporte",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 60, height: 6, depth: 60 },
    physics: { massKg: 0, fixed: true },
    description: "Base inferior que ancla la maquina al suelo.",
  },
  {
    id: "base-apoyo",
    label: "Base de apoyo",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 40, height: 4, depth: 40 },
    physics: { massKg: 0, fixed: true },
    description: "Apoyo intermedio o pata estabilizadora.",
  },
  {
    id: "soporte-peso",
    label: "Soporte de peso",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 30, height: 8, depth: 12 },
    physics: { massKg: 0, fixed: true },
    cargaDiscos: { lados: 1, diamCm: 44, grosorCm: 3, masaKg: 20 },
    description: "Atril/repisa de discos: los discos se ensamblan por su orificio central y quedan suspendidos.",
  },
  {
    id: "j-hook",
    label: "Gancho J / soporte barra",
    category: "estructural",
    materialId: "acero-negro",
    // Dimensiones del gancho REAL del despiece TTP001L (manguito sobre el
    // montante + brazo con tope y rodillo); el modelo 3D de biblioteca
    // sustituye la primitiva con esa malla.
    defaults: { kind: "box", width: 9, height: 24, depth: 26 },
    physics: { massKg: 0, fixed: true },
    calceLocal: [0, -9.7],
    description: "Gancho de seguridad que sostiene la barra en el rack (núcleo UHMW).",
  },
  {
    id: "montante-rack",
    label: "Montante de rack",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 7.6, height: 230, depth: 7.6 },
    physics: { massKg: 0, fixed: true },
    holeStepCm: 5,
    ejeCalce: "x",
    description: "Columna perforada de power rack (3x3\", grilla de pin).",
  },
  {
    id: "brazo-seguridad",
    label: "Brazo de seguridad",
    category: "estructural",
    materialId: "acero-negro",
    // Auditoría de biblioteca: el modelo correcto es el brazo en L con
    // gancho del despiece TTP (9×24×106) — sustituye al pipe recto antiguo.
    defaults: { kind: "box", width: 9, height: 24, depth: 106 },
    physics: { massKg: 0, fixed: true },
    calceLocal: [0, -49.3],
    description: "Brazo/spotter de seguridad real: detiene la barra a una altura dada.",
  },
  // ---- Partes reales del despiece TTP001L (malla auténtica de biblioteca)
  {
    id: "montante-ttp",
    label: "Pilar vertical TTP (5×7×204)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 5, height: 204, depth: 7 },
    physics: { massKg: 0, fixed: true },
    // Sonda de la malla real: 30 filas de pinholes pasantes por el eje X,
    // paso 5,0 cm, fila mas cercana al centro en y=-1,13.
    holeStepCm: 5,
    ejeCalce: "x",
    calceFase: -1.13,
    description:
      "Montante real del rack TTP001L con agujeros de calce (el gancho J entra con pin y giro).",
  },
  {
    id: "multiagarre-ttp",
    label: "Multi-agarre dominadas TTP",
    category: "estructural",
    materialId: "acero-negro",
    // Abanico ARQUEADO real de pullups (106×32): placas de montaje en ambos
    // extremos, rieles gemelos con travesaños y sección de agarre estriada
    // (malla corregida en la auditoría v0.2.4).
    defaults: { kind: "box", width: 32, height: 9.6, depth: 106.5 },
    physics: { massKg: 0, fixed: true },
    description: "Estación de dominadas multi-agarre real del TTP001L: abanico arqueado de 106 cm con placas en ambos extremos.",
  },
  {
    id: "pie-ttp",
    label: "Travesaño TTP (104)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 15, height: 5, depth: 104 },
    physics: { massKg: 0, fixed: true },
    description:
      "Travesaño real del TTP001L (104 cm) que cruza el marco a lo ancho: superior (corona trasera) e inferior (al suelo).",
  },
  {
    id: "columna-sup-ttp",
    label: "Columna horizontal superior TTP",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 94, height: 20, depth: 7 },
    physics: { massKg: 0, fixed: true },
    description:
      "Columna horizontal superior real del TTP001L (94 cm): corona los pilares de cada lado, con placas de encuadre.",
  },
  {
    id: "tubo-guia-ttp",
    label: "Tubo guía de poleas TTP",
    category: "estructural",
    materialId: "acero-pulido",
    defaults: { kind: "box", width: 4, height: 214, depth: 4 },
    physics: { massKg: 0, fixed: true },
    description:
      "Tubo de guía vertical real del TTP001L (4×4×214): por él corre el carro del sistema de poleas.",
  },
  {
    id: "riel-base-ttp",
    label: "Columna horizontal inferior TTP",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 141, height: 20, depth: 7 },
    physics: { massKg: 0, fixed: true },
    description:
      "Columna horizontal inferior real del TTP001L (141 cm), con placas de encuadre: la base de cada lado del marco.",
  },
  {
    id: "barra-lat-ttp",
    label: "Remo de polea alta TTP",
    category: "transmision",
    materialId: "cromo",
    defaults: { kind: "box", width: 75, height: 7, depth: 2 },
    physics: { massKg: 4, fixed: false },
    description: "Remo tubular real del TTP001L para la polea alta (jalón/remo), cuelga del cable.",
  },
  {
    id: "travesano-frontal-ttp",
    label: "Travesaño frontal TTP (118)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 118, height: 20, depth: 5.2 },
    physics: { massKg: 0, fixed: true },
    description: "Travesaño frontal real del TTP001L (118 cm) que corona el marco a lo ancho.",
  },
  {
    id: "soporte-polea-ttp",
    label: "Soporte de polea baja TTP",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 19, height: 13.3, depth: 7.2 },
    physics: { massKg: 0, fixed: true },
    description: "Puente real que sostiene la polea baja del TTP001L.",
  },
  {
    id: "placa-polea-ttp",
    label: "Placa de polea baja TTP",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 19, height: 7, depth: 26 },
    physics: { massKg: 0, fixed: true },
    description: "Placa base real del soporte de polea baja del TTP001L (19×26).",
  },
  {
    id: "bastidor-sup-ttp",
    label: "Bastidor superior TTP",
    category: "estructural",
    materialId: "acero-negro",
    // Viga real del sistema de polea alta (92×32): T que corona los tubos de
    // guía en un extremo, gancho de polea colgando bajo la T, placa media y
    // pestañas de anclaje al marco (malla corregida en la auditoría v0.2.4).
    defaults: { kind: "box", width: 32, height: 15, depth: 92.3 },
    physics: { massKg: 0, fixed: true },
    description: "Bastidor superior real del TTP001L: viga con T que corona la torre y puente del sistema de polea alta.",
  },
  {
    id: "pletina-ttp",
    label: "Pletina TTP (45)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 45, height: 5, depth: 7 },
    physics: { massKg: 0, fixed: true },
    description: "Pletina de unión real del kit TTP001L (45 cm).",
  },
  {
    id: "puente-carro-ttp",
    label: "Puente del carro TTP",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 3.5, height: 20.4, depth: 7.2 },
    physics: { massKg: 0, fixed: true },
    description: "Puente real del carro de poleas del TTP001L: une las dos poleas del carro.",
  },
  {
    id: "portadiscos-ttp",
    label: "Portadiscos de polea TTP",
    category: "peso",
    materialId: "acero-negro",
    // WEIGHTCARRIER real del TTP001L (archivo oficial): pin HORIZONTAL de 88
    // (sección 6×8, collarín hacia −Z) — soporta los discos y corre guiado
    // por los rieles del sistema de poleas (auditoría: horneado horizontal).
    defaults: { kind: "box", width: 6.1, height: 8.1, depth: 88 },
    physics: { massKg: 8, fixed: false },
    cargaDiscos: { lados: 2, diamCm: 34, grosorCm: 3, masaKg: 10, mangaCm: 14 },
    description:
      "Portadiscos real del TTP001L: barra deslizante que soporta los discos A CADA LADO (se ensamblan por el orificio central) y corre guiada por los rieles; el cable la eleva.",
  },
  {
    id: "manguito-guia-ttp",
    label: "Manguito de guía TTP (54)",
    category: "movimiento",
    materialId: "acero-pulido",
    defaults: { kind: "box", width: 6, height: 54, depth: 6 },
    physics: { massKg: 2, fixed: false },
    description: "Manguito real del carro del TTP001L: se desliza por el tubo de guía del sistema de poleas.",
  },
  // ---- Piezas reales del despiece POWERRACK (archivo por pieza)
  {
    id: "montante-pr",
    label: "Media columna POWERRACK (110)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 7, height: 110, depth: 7 },
    physics: { massKg: 0, fixed: true },
    // Sonda de la malla real: 10 filas de pinholes pasantes por el eje X,
    // paso 5,5 cm, fila mas cercana al centro en y=+1,13. Los dos agujeros
    // del eje Z (paso 7,5, solo abajo) son ACCESORIOS de union: no calzan.
    holeStepCm: 5.5,
    ejeCalce: "x",
    calceFase: 1.13,
    description:
      "Tramo real de columna perforada del POWERRACK (7×7×110): dos apilados forman cada poste de 220.",
  },
  {
    id: "travesano-pr",
    label: "Travesaño POWERRACK (70)",
    category: "estructural",
    materialId: "acero-negro",
    // Auditoría de biblioteca: identidad corregida — este es el travesaño
    // corto (70) que cruza a lo ancho; la pieza de 106 con placas es la
    // barra de pullups (barra-pr).
    defaults: { kind: "box", width: 70, height: 7, depth: 7 },
    physics: { massKg: 0, fixed: true },
    description: "Travesaño superior real del POWERRACK (70 cm): cruza el marco a lo ancho.",
  },
  {
    id: "larguero-pr",
    label: "Larguero POWERRACK (106)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 7, height: 7, depth: 106 },
    physics: { massKg: 0, fixed: true },
    description: "Larguero lateral real del POWERRACK (106 cm) que une los postes por la base.",
  },
  {
    id: "liston-pr",
    label: "Listón POWERRACK (106)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 7, height: 5, depth: 106 },
    physics: { massKg: 0, fixed: true },
    description: "Listón plano real del POWERRACK (106 cm).",
  },
  {
    id: "barra-pr",
    label: "Barra pullups POWERRACK (106)",
    category: "estructural",
    materialId: "acero-negro",
    // Auditoría de biblioteca: identidad corregida — la barra de dominadas
    // real es la pieza de 106 con placas de montaje en los extremos.
    defaults: { kind: "box", width: 7, height: 12, depth: 106 },
    physics: { massKg: 0, fixed: true },
    description: "Barra de pullups real del POWERRACK (106 cm) con placas de montaje en ambos extremos.",
  },
  {
    id: "jota-pr",
    label: "Anclaje de cadena POWERRACK",
    category: "estructural",
    materialId: "acero-negro",
    // Auditoría de biblioteca: rótulo corregido — no es una jota, es el
    // punto de ANCLAJE de las cadenas de seguridad (calza en los agujeros).
    // Anatomía (sonda por bandas + corrección del diseñador): tiene DOS
    // cilindros. El del eje X (posterior, x -6.6..+1.4) es el PIN DE CALCE
    // que entra en los pinholes del pilar (pasante por ambas caras); el del
    // eje Z (perpendicular, en x=+4) es el CILINDRO-PIVOTE con el que
    // articulan las cadenas y los brazos móviles.
    defaults: { kind: "box", width: 13.2, height: 13, depth: 7.4 },
    physics: { massKg: 0, fixed: true },
    calceLocal: [-2.3, 0],
    frenteCalce: "x",
    pivoteLocal: [4, 0],
    ejePivote: "z",
    description:
      "Anclaje real del POWERRACK: su pin posterior entra en los pinholes de la columna y el cilindro perpendicular es el pivote de cadenas y brazos móviles.",
  },
  {
    id: "jota-rodillo-pr",
    label: "Jota con rodillo POWERRACK",
    category: "estructural",
    materialId: "acero-negro",
    // Auditoría: malla reorientada con el brazo a lo largo de Z, como j-hook.
    // Anatomía (corrección del diseñador): el CILINDRO horizontal (+Z) es el
    // pin de ACOPLE que entra en los orificios del pilar; las placas a ambos
    // lados son la ABRAZADERA que rodea el poste; la superficie horizontal
    // POSTERIOR (−Z) con tope es la que soporta el peso (la barra) y evita
    // que caiga.
    defaults: { kind: "box", width: 7.4, height: 13, depth: 15.4 },
    physics: { massKg: 0, fixed: true },
    calceLocal: [0, 4],
    description:
      "Jota con rodillo real del POWERRACK: el cilindro es el pin de acople a los orificios del pilar, las placas laterales lo abrazan y la superficie posterior con tope recibe la barra.",
  },
  {
    id: "riel-base-pr",
    label: "Riel de base POWERRACK (118)",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 118, height: 5, depth: 11 },
    physics: { massKg: 0, fixed: true },
    description: "Riel de base real del POWERRACK (118 cm) que arriostra los postes al suelo.",
  },
  {
    id: "correa-seguridad",
    label: "Correa de seguridad",
    category: "estructural",
    materialId: "nylon",
    defaults: { kind: "box", width: 120, height: 0.6, depth: 4 },
    physics: { massKg: 0.3, fixed: false },
    placement: "rope-strap",
    description: "Strap de nylon de 3\" entre montantes: cuélgalo con la herramienta de línea (dos extremos).",
  },
  {
    id: "barra-dominadas",
    label: "Barra de dominadas",
    category: "estructural",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.6, radiusBottom: 1.6, height: 120 },
    physics: { massKg: 0, fixed: true },
    orientacion: [0, 0, Math.PI / 2],
    description: "Barra superior de pull-ups (gruesa/fina).",
  },
  {
    id: "barra-fondos",
    label: "Barra de fondos",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "cylinder", radiusTop: 2, radiusBottom: 2, height: 40 },
    physics: { massKg: 0, fixed: true },
    orientacion: [0, 0, Math.PI / 2],
    description: "Agarre paralelo para fondos (dips).",
  },
  {
    id: "landmine",
    label: "Landmine",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "cylinder", radiusTop: 2.6, radiusBottom: 2.6, height: 18 },
    physics: { massKg: 1, fixed: false },
    description: "Manguito pivotante para un extremo de barra.",
  },

  // ---------------------------------------------------------------- MOVIMIENTO
  {
    id: "guia",
    label: "Guia",
    category: "movimiento",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.5, height: 180 },
    physics: { massKg: 0, fixed: true },
    description: "Varilla vertical que guia el recorrido de la pila.",
  },
  {
    id: "riel",
    label: "Riel",
    category: "movimiento",
    materialId: "acero-pulido",
    defaults: { kind: "box", width: 4, height: 150, depth: 4 },
    physics: { massKg: 0, fixed: true },
    description: "Carril lineal para carros o asientos deslizantes.",
  },
  {
    id: "fulcro",
    label: "Fulcro",
    category: "movimiento",
    materialId: "turquesa",
    defaults: { kind: "cylinder", radiusTop: 2, radiusBottom: 2, height: 12 },
    physics: { massKg: 0, fixed: true },
    description: "Punto de apoyo fijo de una palanca.",
  },
  {
    id: "pivote",
    label: "Pivote",
    category: "movimiento",
    materialId: "turquesa",
    defaults: { kind: "cylinder", radiusTop: 1.2, radiusBottom: 1.2, height: 8 },
    physics: { massKg: 0.2, fixed: false },
    description: "Eje de rotacion de un brazo o palanca movil.",
  },
  {
    id: "pop-pin",
    label: "Pasador (pop-pin)",
    category: "movimiento",
    materialId: "acero-pulido",
    defaults: { kind: "cylinder", radiusTop: 0.8, radiusBottom: 0.8, height: 14 },
    physics: { massKg: 0.1, fixed: false },
    description: "Pasador de ajuste rapido con resorte.",
  },
  {
    id: "carro-cable",
    label: "Carro de cable",
    category: "movimiento",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 14, height: 16, depth: 10 },
    physics: { massKg: 1.5, fixed: false },
    description: "Trolley ajustable en altura del functional trainer.",
  },
  {
    id: "brazo-ajustable",
    label: "Brazo ajustable",
    category: "movimiento",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 8, height: 80, depth: 8 },
    physics: { massKg: 3, fixed: false },
    description: "Brazo-palanca pivotante con posiciones de detencion (jalon/remo).",
  },

  // ---------------------------------------------------------------- TRANSMISION
  {
    id: "polea",
    label: "Polea",
    category: "transmision",
    materialId: "nylon",
    defaults: { kind: "cylinder", radiusTop: 6, radiusBottom: 6, height: 3 },
    physics: { massKg: 0.5, fixed: false },
    description: "Rueda acanalada que redirige un cable.",
  },
  {
    id: "roldana",
    label: "Roldana",
    category: "transmision",
    materialId: "nylon",
    defaults: { kind: "cylinder", radiusTop: 4, radiusBottom: 4, height: 2.5 },
    physics: { massKg: 0.3, fixed: false },
    description: "Polea pequena de reenvio de cable.",
  },
  {
    id: "bloque-poleas",
    label: "Bloque de poleas",
    category: "transmision",
    materialId: "acero-negro",
    defaults: { kind: "cylinder", radiusTop: 5, radiusBottom: 5, height: 7 },
    physics: { massKg: 0.8, fixed: false },
    description: "Bloque de doble polea de reenvio (swivel) atornillado al montante.",
  },
  {
    id: "terminal-cable",
    label: "Terminal de cable",
    category: "transmision",
    materialId: "acero-pulido",
    defaults: { kind: "torus", radius: 2.2, tubeRadius: 0.7 },
    physics: { massKg: 0.1, fixed: true },
    description:
      "Ojal terminal: punto de anclaje de cable colocable sobre cualquier cara de una pieza.",
  },
  {
    id: "engranaje",
    label: "Engranaje",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 5, radiusBottom: 5, height: 2 },
    physics: { massKg: 0.6, fixed: false },
    description: "Rueda dentada para conversion de fuerzas.",
  },
  {
    id: "cable",
    label: "Cable",
    category: "transmision",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 0.4, radiusBottom: 0.4, height: 100 },
    physics: { massKg: 0.1, fixed: false },
    description: "Cable de acero que transmite la traccion.",
  },
  {
    id: "cadena-eslabones",
    label: "Cadena de eslabones",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 0.6, radiusBottom: 0.6, height: 80 },
    physics: { massKg: 0.4, fixed: false },
    description: "Cadena metalica de transmision.",
  },
  {
    id: "cadena-seguridad",
    label: "Cadena de seguridad",
    category: "transmision",
    materialId: "acero-negro",
    defaults: { kind: "cylinder", radiusTop: 0.7, radiusBottom: 0.7, height: 90 },
    physics: { massKg: 0.5, fixed: false },
    placement: "rope-chain",
    description: "Cadena de tope/seguridad del power rack: cuélgala con la herramienta de línea (dos extremos).",
  },
  {
    id: "liston-kevlar",
    label: "Liston de Kevlar",
    category: "transmision",
    materialId: "kevlar",
    defaults: { kind: "box", width: 3, height: 90, depth: 0.4 },
    physics: { massKg: 0.05, fixed: false },
    description: "Correa de alta resistencia y baja elongacion.",
  },
  {
    id: "resorte",
    label: "Resorte",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 3, radiusBottom: 3, height: 30 },
    physics: { massKg: 0.3, fixed: false },
    description: "Muelle elastico que almacena energia.",
  },
  {
    id: "leva",
    label: "Leva (cam)",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 8, radiusBottom: 8, height: 2.5 },
    physics: { massKg: 0.7, fixed: false },
    description: "Leva de resistencia variable: el radio efectivo r(θ) modela la curva de fuerza.",
  },

  // ---------------------------------------------------------------- PESO
  {
    id: "bloque-peso",
    label: "Bloque de peso",
    category: "peso",
    materialId: "hierro-fundido",
    // Los dos orificios verticales abrazan los tubos guia de un sistema de
    // poleas (separacion de los tubos guia del TTP: 13.3 cm): el bloque se
    // desliza por las guias como el carrier.
    defaults: { kind: "box", width: 30, height: 4, depth: 18, holeDiameter: 6, holeSpacing: 13.3 },
    physics: { massKg: 5, fixed: false },
    description:
      "Placa de la pila de pesos seleccionable, con dos orificios verticales que abrazan los tubos guía (se desliza por ellos como el carrier del TTP).",
  },
  {
    id: "disco-peso",
    label: "Disco de peso",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "cylinder", radiusTop: 22, radiusBottom: 22, height: 3 },
    physics: { massKg: 20, fixed: false },
    orientacion: [Math.PI / 2, 0, 0],
    description: "Disco olimpico para barras o ejes.",
  },
  {
    id: "contrapeso",
    label: "Contrapeso",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "box", width: 20, height: 20, depth: 20 },
    physics: { massKg: 15, fixed: false },
    description: "Masa de equilibrado del mecanismo.",
  },
  {
    id: "barra-olimpica",
    label: "Barra olimpica",
    category: "peso",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.45, radiusBottom: 1.45, height: 220, radialSegments: 24 },
    physics: { massKg: 20, fixed: false },
    cargaDiscos: { lados: 2, diamCm: 44, grosorCm: 3, masaKg: 20, mangaCm: 75 },
    description: "Barra olimpica de 2.2 m (barbell): carga discos por ambos extremos.",
  },
  {
    id: "pila-pesos",
    label: "Pila de pesos",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "box", width: 25, height: 90, depth: 18, holeDiameter: 6, holeSpacing: 13.3 },
    physics: { massKg: 102, fixed: false },
    stack: { plateCount: 15, plateMassKg: 6.8, selected: 5 },
    description:
      "Stack selectorizado: el tubo selector arrastra las placas del pin hacia arriba. Cada placa lleva los dos orificios verticales que abrazan los tubos guía del sistema de poleas.",
  },
  {
    id: "cuerno-carga",
    label: "Cuerno de carga",
    category: "peso",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 2.5, radiusBottom: 2.5, height: 25 },
    physics: { massKg: 0.5, fixed: false },
    cargaDiscos: { lados: 1, diamCm: 44, grosorCm: 3, masaKg: 20 },
    description: "Manguito olimpico donde se cargan los discos (plate-loaded): se ensamblan por el orificio central.",
  },
  {
    id: "micro-disco",
    label: "Micro-disco",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "cylinder", radiusTop: 6, radiusBottom: 6, height: 1.2 },
    physics: { massKg: 1.25, fixed: false },
    description: "Disco fraccional para saltos de peso pequenos.",
  },

  // ---------------------------------------------------------------- ERGONOMICO
  {
    id: "agarradera",
    label: "Agarradera",
    category: "ergonomico",
    materialId: "goma",
    defaults: { kind: "torus", radius: 8, tubeRadius: 1.5 },
    physics: { massKg: 0.4, fixed: false },
    description: "Mango o asa que toma el usuario.",
  },
  {
    id: "asiento",
    label: "Asiento",
    category: "ergonomico",
    materialId: "tapizado",
    defaults: { kind: "box", width: 40, height: 6, depth: 35 },
    physics: { massKg: 2, fixed: false },
    description: "Superficie de apoyo del usuario.",
  },
  {
    id: "respaldo",
    label: "Respaldo",
    category: "ergonomico",
    materialId: "tapizado",
    defaults: { kind: "box", width: 40, height: 50, depth: 6 },
    physics: { massKg: 2, fixed: false },
    description: "Soporte para la espalda.",
  },
  {
    id: "agarre-d",
    label: "Agarradera en D",
    category: "ergonomico",
    materialId: "goma",
    defaults: { kind: "torus", radius: 6, tubeRadius: 1.2 },
    physics: { massKg: 0.3, fixed: false },
    description: "Mango en D para cable (single handle).",
  },
  {
    id: "cuerda-triceps",
    label: "Cuerda de triceps",
    category: "ergonomico",
    materialId: "nylon",
    defaults: { kind: "cylinder", radiusTop: 1.2, radiusBottom: 1.2, height: 60 },
    physics: { massKg: 0.3, fixed: false },
    description: "Cuerda doble para pushdowns y face pulls.",
  },
  {
    id: "barra-jalon",
    label: "Barra de jalon",
    category: "ergonomico",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.4, radiusBottom: 1.4, height: 120 },
    physics: { massKg: 2, fixed: false },
    description: "Barra de lat pulldown moleteada.",
  },
  {
    id: "correa-tobillo",
    label: "Correa de tobillo",
    category: "ergonomico",
    materialId: "nylon",
    defaults: { kind: "box", width: 20, height: 8, depth: 1 },
    physics: { massKg: 0.2, fixed: false },
    description: "Correa acolchada para trabajo de cable en pierna.",
  },
];

/** Primitivas neutras disponibles ademas de los componentes. */
export const PRIMITIVE_DEFS: ComponentDefinition[] = [
  {
    id: "prim-box",
    label: "Caja",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "box", width: 30, height: 30, depth: 30 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva cubo/caja.",
  },
  {
    id: "prim-cylinder",
    label: "Cilindro",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "cylinder", radiusTop: 15, radiusBottom: 15, height: 30 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva cilindro.",
  },
  {
    id: "prim-sphere",
    label: "Esfera",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "sphere", radius: 15 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva esfera.",
  },
];

const BY_ID = new Map<string, ComponentDefinition>(
  [...COMPONENT_LIBRARY, ...PRIMITIVE_DEFS].map((d) => [d.id, d]),
);

export function getDefinition(id: string): ComponentDefinition | undefined {
  return BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  estructural: "Estructural",
  movimiento: "Movimiento",
  peso: "Peso",
  ergonomico: "Ergonomico",
  transmision: "Transmision",
  primitiva: "Primitivas",
};

/** Color de acento por categoria para los swatches de la paleta. */
export const CATEGORY_COLORS: Record<ComponentCategory, number> = {
  estructural: 0x6b7280,
  movimiento: 0xf59e0b,
  transmision: 0x3b82f6,
  peso: 0xeab308,
  ergonomico: 0x8b5cf6,
  primitiva: 0x94a3b8,
};
