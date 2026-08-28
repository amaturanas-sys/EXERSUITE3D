// Tipos compartidos para los objetos de la escena de EXERSUITE3D.

/** Primitivas geometricas base sobre las que se construyen los componentes. */
export type PrimitiveKind =
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus"
  | "plane"
  | "beam" // perfil de acero (pilar/travesano) trazado entre dos puntos
  | "tube" // tubo de acero trazado entre dos puntos
  | "dentada"; // placa de acero con ganchos, atornillada al costado de un pilar

/**
 * Parametros dimensionales de una primitiva, SIEMPRE en centimetros (o grados/segmentos).
 * Solo se usan los campos relevantes segun `kind`.
 */
export interface PrimitiveParams {
  kind: PrimitiveKind;
  // box / plane
  width?: number; // X (cm)
  height?: number; // Y (cm)
  depth?: number; // Z (cm)
  // cylinder / cone
  radiusTop?: number; // cm
  radiusBottom?: number; // cm
  // sphere
  radius?: number; // cm
  // torus
  tubeRadius?: number; // cm
  // discretizacion
  radialSegments?: number;
  // modelado avanzado
  /** Doblado a lo largo del eje Y, en grados. */
  bendDeg?: number;
  /** Torsion alrededor del eje Y, en grados. */
  twistDeg?: number;
  /** Bisel/redondeo de aristas (cm), solo cajas. */
  bevel?: number;
  /**
   * Altura del extremo +X (cm), solo cajas: si difiere de `height`, la caja
   * se vuelve un PRISMA TRAPEZOIDAL cuyo tope va de height (−X) a height2
   * (+X) — los muros bajo una techumbre inclinada tocan el techo en toda su
   * longitud, sin triángulos vacíos.
   */
  height2?: number;
  // piezas de linea (beam / tube)
  /**
   * Trayectoria de la pieza en coordenadas locales (cm). Los nodos describen la
   * forma general y se editan con la herramienta de doblado (bending): una
   * curva suave (Catmull-Rom) pasa por todos ellos.
   */
  path?: [number, number, number][];
  /** Extremos del perfil: corte plano o diagonal (solo beam recto). */
  ends?: "plano" | "diagonal";
  /**
   * Diametro de los agujeros (cm); 0 o ausente = sin agujeros.
   * - beam recto: pinholes laterales a lo largo de la pieza.
   * - box: DOS ORIFICIOS VERTICALES pasantes (eje Y) que abrazan los tubos
   *   guia de un sistema de poleas — como los cilindros huecos del carrier
   *   del TTP: la pieza se desliza por las guias verticales.
   */
  holeDiameter?: number;
  /** Distancia entre centros de los agujeros (cm). */
  holeSpacing?: number;
  /**
   * DISCOS MONTADOS en la pieza (carrier, barra olimpica, cuerno de carga,
   * atril): cantidad de discos ensamblados introduciendo el cilindro por el
   * orificio central — quedan suspendidos por la estructura y se mueven con
   * ella. La definicion del componente (cargaDiscos) fija lados y medidas.
   */
  discCount?: number;
  /**
   * VENTANAS RECTANGULARES PASANTES (v0.2.30): huecos calados de verdad en la
   * pieza — los abre la herramienta de roldana INTERNA en las dos caras que
   * quedan sobre y bajo la rueda, para que el cable pase sin obstruirse y la
   * rueda no choque con la cara. Viajan en los params, así que sobreviven a
   * la reconstrucción de la geometría, al guardado del proyecto y a los
   * prefabs.
   */
  ventanas?: VentanaRect[];
  /**
   * PLACA DENTADA (v0.2.73): cuántos ganchos lleva y cada cuánto.
   *
   * Son parámetros PROPIOS y no heredados del pilar: la placa se atornilla a
   * las caras que NO llevan pinholes, así que su grilla no tiene por qué
   * coincidir con la del poste. El largo de la plancha sale de estos dos —lo
   * que se pide es «doce ganchos cada cinco centímetros», y dejar el largo
   * suelto daría placas que terminan a medio diente—.
   */
  dientes?: number;
  /** Distancia entre centros de dientes (cm). */
  dienteEspaciado?: number;
  /** Alto de la repisa del diente (cm). Por defecto, 0,4 del paso. */
  dienteAlto?: number;
  /** Cuánto vuela el diente por delante de la plancha (cm). */
  dienteVuelo?: number;
  /**
   * ANCHO DE LA CARA DEL PILAR sobre la que se montó (cm), v0.3.23. La
   * superficie de contacto NUNCA lo supera: es lo que hace que la placa se
   * vea del tamaño del poste y no montada encima de él.
   */
  dienteCaraCm?: number;
  /**
   * DIÁMETRO QUE TIENE QUE ADMITIR LA CUNA (cm), v0.3.23. Por omisión el de
   * la barra olímpica tal como la ve el motor; poniéndole el de un tubo, la
   * misma placa pasa de ser una fila de jotas a ser el herraje que fija una
   * estructura tubular, igual que los pinholes fijan las jotas.
   */
  dienteAgarreCm?: number;
  /**
   * VOLTEO / ESPEJADO (v0.2.32): ejes locales en los que la pieza está
   * espejada. Se hornea en la GEOMETRÍA en lugar de usar una escala
   * negativa, porque una escala negativa invierte también los ejes del
   * gizmo y del arrastre preciso — el usuario tiraba de +X y la pieza se
   * iba a −X. Con el espejo horneado la pieza se ve igual y sus ejes
   * siguen concordando con el mundo.
   */
  espejo?: [boolean, boolean, boolean];
  /**
   * CANALES TUBULARES (v0.3.3): agujeros REDONDOS pasantes por donde discurre
   * una guía tubular. Los abre el vínculo con la guía, no el usuario a mano:
   * se colocan solos donde pasa cada guía cuando la pieza se suelta encima.
   * Es lo que convierte una plancha en el carro de una prensa de piernas o en
   * la pila de una torre de poleas: la pieza queda ENHEBRADA de verdad.
   */
  canales?: CanalTubo[];
  /**
   * ANCLAJES DE UNA GUÍA TUBULAR (v0.3.3): las piezas a las que está sujeta
   * por cada extremo, con el punto de amarre en coordenadas locales de esa
   * pieza. La guía se vuelve a tender cuando cualquiera de las dos se mueve.
   * Un prefab que no resuelva los ids deja la guía donde está, que es lo
   * correcto: el archivo ya trae su sitio.
   */
  anclajes?: {
    a?: { obj: string; local: [number, number, number] };
    b?: { obj: string; local: [number, number, number] };
  };
  /**
   * LARGO A MEDIDA (v0.3.2), en cm, de las piezas con `largoAjustable`: se
   * aplica estirando la malla POR EL CENTRO, sin tocar los remates. Ausente
   * = el largo de fábrica de la pieza.
   */
  largoCm?: number;
  /**
   * CORRIMIENTO DEL PASADOR (v0.3.7), en cm, de las piezas con `ejePasante`
   * (safety pin): cuánto se corre a lo largo del eje del agujero desde el
   * centro del poste. Con 0 el pasador queda simétrico —igual sobrante a los
   * dos lados—; positivo lo saca hacia el lado + del eje de los pinholes.
   */
  pinOffsetCm?: number;
}

/**
 * Hueco rectangular PASANTE en coordenadas LOCALES de la pieza (cm): un eje
 * por el que atraviesa y el rectángulo (centro + tamaños) en el plano
 * perpendicular. El par de coordenadas del plano es (Y,Z) para el eje X,
 * (Z,X) para el eje Y y (X,Y) para el eje Z.
 */
export interface VentanaRect {
  /** Eje local que atraviesa la pieza de lado a lado. */
  eje: "x" | "y" | "z";
  /** Centro del hueco: primera coordenada del plano perpendicular. */
  u: number;
  /** Centro del hueco: segunda coordenada del plano perpendicular. */
  v: number;
  /** Tamaño del hueco en la primera coordenada del plano. */
  du: number;
  /** Tamaño del hueco en la segunda coordenada del plano. */
  dv: number;
}

/**
 * CANAL TUBULAR (v0.3.3): agujero REDONDO pasante por el que discurre una
 * guía. Mismas coordenadas que la ventana —eje local pasante y centro (u,v)
 * en el plano perpendicular—, pero la sección es un círculo, que es lo que
 * deja una barra guía al atravesar el carro de una prensa o la pila de una
 * torre de poleas.
 */
export interface CanalTubo {
  /** Eje local que atraviesa la pieza de lado a lado. */
  eje: "x" | "y" | "z";
  /** Centro del canal en el plano perpendicular. */
  u: number;
  v: number;
  /** Radio del canal (cm): el de la guía más la holgura de deslizamiento. */
  radio: number;
  /** Lados del polígono que aproxima el círculo (def. 20). */
  lados?: number;
  /** Id de la guía que lo abrió, para poder rehacer el vínculo. */
  guia?: string;
}

/** Categorias funcionales de los componentes de una maquina de gimnasio. */
export type ComponentCategory =
  | "estructural"
  | "movimiento"
  | "peso"
  | "ergonomico"
  | "transmision"
  | "primitiva";

/**
 * Informacion de una pila de pesos selectorizada. El tubo selector arrastra las
 * placas enganchadas por el pin (la seleccionada y las de encima); las de debajo
 * no se mueven. La masa movilizada = selected * plateMassKg.
 */
export interface StackInfo {
  /** Numero total de placas del stack. */
  plateCount: number;
  /** Masa de cada placa (kg). */
  plateMassKg: number;
  /** Placas seleccionadas (desde arriba) que se movilizan. */
  selected: number;
}

/** Atributos fisicos/mecanicos editables de un componente. */
export interface PhysicalAttributes {
  /** Masa en kilogramos (0 = estatico/anclado). */
  massKg: number;
  /** Si esta anclado al "mundo" (no se mueve aunque tenga masa). */
  fixed: boolean;
}

/** Definicion de un tipo de componente en la libreria. */
export interface ComponentDefinition {
  id: string;
  label: string;
  category: ComponentCategory;
  /** Id del material PBR por defecto (ver materials.ts). */
  materialId: string;
  /** Geometria por defecto. */
  defaults: PrimitiveParams;
  /** Atributos fisicos por defecto. */
  physics: PhysicalAttributes;
  /** Si es una pila selectorizada, sus parametros por defecto. */
  stack?: StackInfo;
  /**
   * Colocación especial con herramienta de línea (dos extremos): cuerdas
   * (cadena/correa de seguridad) o piezas trazadas (perfil/tubo de acero).
   */
  placement?: "rope-chain" | "rope-strap" | "beam" | "tube";
  /**
   * Rotación de INSERCIÓN (auditoría de biblioteca): algunas piezas nacen
   * giradas para quedar en su orientación natural (p. ej. barras de
   * dominadas horizontales, discos de pie como rueda).
   */
  orientacion?: [number, number, number];
  /**
   * Paso de la grilla de agujeros de calce (cm) en postes verticales: las
   * jotas y brazos de seguridad suben/bajan por el poste AGUJERO POR AGUJERO
   * con este paso.
   */
  holeStepCm?: number;
  /**
   * Eje LOCAL horizontal por el que atraviesan los PINHOLES estandarizados
   * del poste (diámetro y paso nominales, presentes en AMBAS caras): el pin
   * de las jotas/brazos solo articula con estos orificios — no con los
   * agujeros accesorios de otras caras.
   */
  ejeCalce?: "x" | "z";
  /**
   * DIÁMETRO NOMINAL (cm) de esos pinholes.
   *
   * Hasta v0.3.6 la grilla decía dónde están los agujeros pero no cuánto
   * miden, y eso bastaba mientras solo colgaran jotas: el pin de una jota
   * entra por un agujero que su propia malla ya trae medido. Un SAFETY PIN,
   * en cambio, es el agujero: hay que saber cuánto mide para que el pasador
   * quepa de verdad en vez de atravesar el acero.
   */
  holeDiameterCm?: number;
  /**
   * Fase de la grilla de pinholes (cm): desplazamiento de la fila más
   * cercana al centro del poste a lo largo de su eje largo (medido en la
   * malla real). La grilla es fase + k·holeStepCm.
   */
  calceFase?: number;
  /**
   * FILAS REALES de pinholes de calce que tiene la malla.
   *
   * Sin esto, la rejilla se extendía hasta 2 cm de las puntas del poste y se
   * inventaba agujeros que no existen: en la media columna POWERRACK el panel
   * anunciaba «agujero X de 19» donde la malla tiene 10, y la jota podía subir
   * casi medio metro por encima del pinhole más alto, calzada sobre acero
   * macizo con el pin apoyado en la nada.
   *
   * Solo lo llevan las piezas cuya malla se sondeó de verdad; en las
   * primitivas sin malla escaneada la rejilla es sintética y no hay nada que
   * contradecir.
   */
  calceFilas?: number;
  /**
   * Punto local [x, z] del MANGUITO DE ENSAMBLE (cm): el espacio de la pieza
   * diseñado para abrazar el pilar (jotas, brazos de seguridad). Al calzar,
   * el eje del poste pasa por este punto — la pieza queda COLOCADA en la
   * estructura, no flotando. Sin él, se intenta detectar la cavidad en la
   * malla.
   */
  calceLocal?: [number, number];
  /**
   * Eje LOCAL horizontal con el que la pieza ENCARA el poste al calzar (el
   * pin/mordaza mira en esta dirección). Por defecto "z" (jotas y brazos);
   * el anclaje de cadena monta por "x".
   */
  frenteCalce?: "x" | "z";
  /**
   * EJE LOCAL DE LA PIEZA QUE ATRAVIESA EL AGUJERO (v0.3.7).
   *
   * Las jotas CUELGAN del poste: su manguito lo abraza por fuera y un pin
   * corto articula con los pinholes. Un SAFETY PIN no cuelga de nada — es una
   * barra que entra por un agujero, cruza la viga y sale por la cara opuesta,
   * con el sobrante repartido a los dos lados. Esta propiedad dice cuál de sus
   * ejes locales es esa barra: al calzar se acuesta sobre el eje de los
   * pinholes (`ejeCalce` del poste), perpendicular a la viga, y el pasador
   * queda cruzado como en el rack real.
   */
  ejePasante?: "x" | "y" | "z";
  /**
   * Cantidad de POSTES de los que se sostiene la pieza al calzar (def. 1).
   * Las jotas/ganchos cuelgan de UN pilar; el brazo de seguridad se TIENDE
   * entre DOS pilares a la vez: al calzar se alinea sobre la línea que los
   * une y subir/bajar lo mueve un agujero en AMBOS simultáneamente (misma
   * grilla).
   */
  postesCalce?: 1 | 2;
  /**
   * Punto local [x, z] del CILINDRO-PIVOTE (cm): el eje horizontal del que
   * cuelgan cadenas o se articulan BRAZOS móviles (jammer arms). Si falta,
   * el pivote es el centro de la pieza.
   */
  pivoteLocal?: [number, number];
  /**
   * Eje LOCAL del cilindro-pivote. En el anclaje de cadena es PERPENDICULAR
   * al pin de calce: el pin (frenteCalce) entra en los pinholes del pilar y
   * el brazo gira alrededor del cilindro perpendicular.
   */
  ejePivote?: "x" | "z";
  /**
   * La pieza CARGA DISCOS por su eje (se ensamblan por el orificio central
   * del disco y quedan suspendidos): lados de carga (1 = un extremo,
   * 2 = ambos), diametro/grosor del disco (cm) y masa por disco (kg).
   */
  cargaDiscos?: CargaDiscosDef;
  /**
   * La pieza tiene un ASIENTO CÓNCAVO que recibe la barra (jotas, brazos de
   * seguridad): su física debe seguir el PERFIL real de la malla — el motor
   * muestrea la superficie superior y construye el canal (asiento bajo,
   * tope delantero, respaldo) para que la barra quede RETENIDA en la
   * concavidad en vez de resbalar sobre una caja lisa.
   */
  asientoBarra?: boolean;
  /**
   * CURADURÍA DE LA PALETA (v0.2.18): qué hace la pieza en "Piezas
   * disponibles" del Builder. "oculta" = redundante con una pieza real o
   * plantilla interna; "despiece" = pieza INTERNA de una máquina real
   * (TTP/POWERRACK); "retirada" = pieza que no usa NADIE —ni una máquina,
   * ni un prefab, ni una prueba— y que se saca del listado para que el
   * inventario diga la verdad sobre lo que se puede construir.
   *
   * Desde v0.2.28 ninguna de las tres se lista en el Builder, pero la
   * etiqueta se conserva porque describe el papel de la pieza. Y SOLO
   * afecta a la paleta: prefabs, máquinas estándar, proyectos guardados y
   * la Biblioteca de modelos siguen resolviendo la pieza por su id, con su
   * misma geometría, su mismo material y su misma física. Retirar del
   * listado no es borrar: un prefab que ya lleve la pieza se sigue
   * insertando igual y se comporta igual.
   */
  paleta?: "oculta" | "despiece" | "retirada";
  /**
   * LARGO AJUSTABLE (v0.3.2): la pieza se tiende ENTRE DOS PILARES —brazo de
   * seguridad, barra de dominadas, multi-agarre—, y la separación entre esos
   * pilares la decide quien arma la estructura. Así que su largo se puede
   * cambiar en Propiedades, y se cambia POR EL CENTRO: los dos remates
   * (placas de montaje, ganchos) viajan rígidos hacia fuera y solo se estira
   * el tramo central, que es prismático. La forma general no se deforma.
   *
   * `eje` es el eje LOCAL del largo; `extremosCm`, cuánto de cada punta es
   * remate y no se toca. Ver `estirarPorElCentro` en `estirar.ts`.
   */
  largoAjustable?: {
    eje: "x" | "y" | "z";
    extremosCm: number;
    /** Topes del control de Propiedades (cm). */
    minCm?: number;
    maxCm?: number;
  };
  /**
   * TOPE DE UNA GUÍA TUBULAR (v0.3.3). El motor descubre las guías y sus
   * espaciadores por la FORMA —piezas fijas y esbeltas, coaxiales, la corta
   * montada sobre la larga—, y un tope de goma no pasa esa prueba: es corto y
   * GORDO, justo al revés. Así que se declara, y el motor lo toma por freno
   * del recorrido sin tener que adivinarlo. Su eje es su Y local, que es como
   * se monta sobre la guía.
   */
  topeGuia?: boolean;
  /** Descripcion corta para tooltips. */
  description: string;
}

/** Definicion de la carga de discos de una pieza (ver ComponentDefinition). */
export interface CargaDiscosDef {
  lados: 1 | 2;
  diamCm: number;
  grosorCm: number;
  masaKg: number;
  /**
   * Distancia del centro al HOMBRO de la manga de carga (cm, piezas de dos
   * lados): el cilindro del diámetro del orificio central del disco empieza
   * en esta deflección (cambio de grosor) y los discos se apilan contra
   * ella, como en una barra olímpica real. Medido en la malla oficial.
   */
  mangaCm?: number;
}
