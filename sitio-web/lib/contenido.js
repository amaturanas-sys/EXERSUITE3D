import { kv } from "./redis";
import { fusionar } from "./i18n";

/**
 * Contenido editable de la página (textos, imágenes, precio, secciones).
 * El panel /admin lo edita visualmente y lo guarda en Upstash Redis; si no
 * hay Redis configurado, se usa este contenido por defecto.
 *
 * BILINGÜE (v2): el español es la verdad y vive donde siempre. El inglés es
 * una capa opcional y esparsa colgada de la clave `en`, con la MISMA forma;
 * lo que no esté traducido se sirve en español. Ver lib/i18n.js.
 *
 * COLECCIONES CON IDENTIDAD (galería, widgets, lienzo): su traducción va como
 * campo hermano dentro del objeto (`pieEn`, `tituloEn`), porque se reordenan
 * y se borran y una capa por índice se la asignaría al elemento equivocado.
 */

/**
 * Sello del contenido de fábrica. Al subirlo, /admin ofrece traer los textos
 * nuevos sección por sección sin tocar lo que el propietario haya escrito.
 */
export const ESQUEMA_CONTENIDO = 2;

export const CONTENIDO_DEFECTO = {
  marca: "EXERSUITE3D",
  esquema: ESQUEMA_CONTENIDO,
  colorAcento: "#efede8",

  hero: {
    visible: true,
    titulo: "Comprueba que tu máquina le sirve a un cuerpo. Antes de soldarla.",
    subtitulo:
      "Diseña estructuras, roldanas, cables y contrapesos en centímetros reales, " +
      "simula su mecánica y siéntale dentro un maniquí con cuerpo físico: te dice, " +
      "medido, cuánto recorrido pierde la estación y dónde le falta holgura.",
    firma: "Lo hace un culturista que trabaja en salud, porque no encontró la herramienta que necesitaba.",
    imagen: "/capturas/01-builder-maquina-y-maniqui.png",
    botonTexto: "Comprar y descargar",
    botonSecundario: "Ver qué hace",
  },

  paraQuien: {
    visible: true,
    titulo: "El problema",
    problema:
      "Dibujas la máquina, la mandas a soldar y en el taller descubres que entre la mano " +
      "y el brazo de press quedan seis milímetros. El error ya está en acero.",
    publico: [
      {
        titulo: "Diseñador de equipamiento",
        texto: "Prueba el recorrido y la holgura con un cuerpo dentro antes de pasar el plano a fabricación.",
      },
      {
        titulo: "Dueño de gimnasio",
        texto: "Mide tu sala, distribuye las estaciones y enseña a tu cliente cómo quedará sobre una foto del local.",
      },
      {
        titulo: "Constructor aficionado",
        texto: "Arma tu propia estación con piezas reales y cotas exactas, en la tablet que ya tienes.",
      },
    ],
  },

  caracteristicas: {
    visible: true,
    titulo: "Lo que puedes comprobar antes de soldar",
    items: [
      {
        titulo: "Te dice cuántos centímetros faltan",
        texto:
          "Sienta un maniquí de 175 cm con cuerpo físico —14 articulaciones con rango humano— " +
          "y la máquina deja de atravesarlo. Si con alguien dentro la estación pierde recorrido, " +
          "lo ves en pantalla y no en el taller: en la máquina de ejemplo el asiento deja el cuerpo " +
          "a 0,6-3,3 cm del conjunto móvil, y esa es la holgura que hay que ganar.",
      },
      {
        titulo: "Ordenas un empuje, no dieciocho ángulos",
        texto:
          "Marcas la zona y el sentido. En tren superior, empujar es extender el codo mientras el hombro " +
          "flexiona: el gesto real de un press. Tren inferior, bisagra, un lado o los dos. " +
          "Marca inferior y bisagra a la vez y sale un peso muerto.",
      },
      {
        titulo: "El plano lo pone la postura, no un menú",
        texto:
          "Con el hombro a la altura del pecho el empuje sale horizontal; con los brazos arriba, vertical. " +
          "Cuatro posturas de partida y los cuatro movimientos clásicos —press de pecho, press militar, " +
          "remo y jalón— salen con dos teclas.",
      },
      {
        titulo: "Cables que tiran de verdad",
        texto:
          "Motor de física a 60 Hz sobre centímetros reales: bisagras montadas como herraje (dos placas y su " +
          "pasador), correderas, soldaduras que funden piezas en un solo cuerpo rígido, pilas selectorizadas " +
          "con su pin, y cable inextensible que pasa por las roldanas que tú coloques y acopla sus dos extremos.",
      },
      {
        titulo: "Dibujas en centímetros, no en «unidades»",
        texto:
          "1 unidad = 1 cm en toda la aplicación, con rejilla de 10 cm bajo el modelo. 41 piezas en la paleta " +
          "—73 en la biblioteca contando las que llegan dentro de una máquina— con 20 materiales y 8 máquinas " +
          "estándar que se insertan ya armadas. Bloqueo de eje, imán a extremos y nodos, y medida en vivo.",
      },
      {
        titulo: "El archivo se abre sin nosotros",
        texto:
          "Un .json de texto guarda tu diseño: piezas, uniones, cables, grupos y el maniquí con su postura. " +
          "Exporta .glb para seguir en SketchUp, Blender o Nomad. Sin suscripción y sin formato propietario. " +
          "(Los modelos 3D que importes viven en la Biblioteca del dispositivo, no dentro del .json.)",
      },
    ],
  },

  galeria: {
    visible: true,
    titulo: "La aplicación",
    texto: "Capturas reales de la versión 0.2.49, sin retoques.",
    imagenes: [
      {
        url: "/capturas/01-builder-maquina-y-maniqui.png",
        pie: "El taller completo: una estación armada pieza a pieza y un maniquí de 175 cm sentado en ella.",
        pieEn: "The full workshop: a station assembled part by part with a 175 cm mannequin seated on it.",
      },
      {
        url: "/capturas/02-ergonomia-zonas.png",
        pie: "La instrucción es el gesto: se marca la zona y su lado, y 8 empuja mientras 9 tracciona. Si el cuerpo choca con el hierro, la ventana lo avisa.",
        pieEn: "The instruction is the gesture: pick the zone and its side, then 8 pushes while 9 pulls. If the body hits the steel, the panel says so.",
      },
      {
        url: "/capturas/03-fisica-cables.png",
        pie: "Física real: al tirar de la barra el cable recorre las roldanas y levanta solo las placas seleccionadas.",
        pieEn: "Real physics: pulling the bar routes the cable through the sheaves and lifts only the selected plates.",
      },
      {
        url: "/capturas/04-roldana-dos-toques.png",
        pie: "La roldana se instala en dos toques: primero la estructura, que muestra su eje, y luego el punto exacto.",
        pieEn: "A sheave is installed in two taps: first the host structure, which shows its axis, then the exact point.",
      },
      {
        url: "/capturas/05-medir-preciso.png",
        pie: "Todo se mide: la barra inferior canta el tamaño real de la pieza y el arrastre preciso la mueve de 1 en 1 cm.",
        pieEn: "Everything is measured: the bottom bar states the part's real size and precise drag nudges it 1 cm at a time.",
      },
      {
        url: "/capturas/06-inventario.png",
        pie: "Ocho máquinas estándar y un inventario por categorías: se toca una y aparece armada.",
        pieEn: "Eight standard machines and a parts inventory by category: tap one and it appears assembled.",
      },
      {
        url: "/capturas/07-bisagra-herraje.png",
        pie: "Unir dos piezas monta un herraje de verdad: dos placas y su pasador, con eje, cara de plegado y recorrido en grados.",
        pieEn: "Joining two parts mounts real hardware: two leaves and their pin, with axis, folding face and travel in degrees.",
      },
      {
        url: "/capturas/08-home-instructivo.png",
        pie: "La puerta de entrada: un instructivo en preguntas frecuentes que responde antes de que preguntes.",
        pieEn: "The front door: a FAQ-style guide that answers before you ask.",
      },
    ],
  },

  lienzo: {
    visible: false,
    altura: 420,
    elementos: [
      {
        id: "muestra-titulo",
        tipo: "texto",
        texto: "Compón aquí tu banner",
        x: 360,
        y: 120,
        w: 480,
        fuente: "Impact, 'Arial Black', sans-serif",
        tam: 52,
        color: "#efede8",
        negrita: true,
        rot: 0,
        opacidad: 1,
      },
      {
        id: "muestra-logo",
        tipo: "imagen",
        url: "/brand/logo-mark.png",
        x: 80,
        y: 80,
        w: 220,
        rot: -6,
        opacidad: 0.9,
      },
    ],
  },

  historia: {
    visible: true,
    titulo: "Nuestra historia",
    parrafos: [
      "Cuando era muy niño, los computadores eran mi entretención. Ahí conocí una herramienta que me pareció maravillosa: dejaba construir con bloques, pieza a pieza, dentro de un mundo digital. Los juguetes de verdad no llegaban hasta mi país — \"sin envíos fuera de EE. UU.\", decía la letra chica — y aquella aplicación era gratuita. Construir ahí era posible, conveniente y feliz.",
      "Veinte años más tarde volví a acordarme de ese pasatiempo, pero esta vez por una necesidad que reconocí en mí y en los demás. Soy culturista amateur y profesional del área de la salud: he sido testigo y partícipe de lo que el deporte y la actividad física hacen por una persona. Y soy el primero en admitir mi privilegio, porque tuve los recursos para perseguir mi afán deportivo. Por eso mismo veo con preocupación el abandono y la desventaja en que está la participación deportiva en mi comunidad y en mi país: gente que se muere de debilidad, por falta de movimiento, atrapada entre el \"no tengo espacio\", el \"no tengo tiempo\" y el \"no me alcanza\".",
      "EXERSUITE3D nace como respuesta. Su primera fachada es la herramienta creativa, disponible para diseñadores profesionales, dueños de gimnasios e incluso constructores aficionados: involucrar al consumidor final en la toma de decisiones, para que sea libre de satisfacer su necesidad de movimiento en el espacio, el tiempo y el presupuesto que tenga disponible.",
      "Imagina un hub — un mercado — donde puedas armar el espacio de entrenamiento ideal para ti, estés donde estés hoy. Imagina ofrecer a tus clientes soluciones personalizadas sin invertir en formatos obsoletos; vender y competir con otras marcas por ese nicho que tanto cuesta encontrar. Imagina que tu diseño sea tan bueno que una marca lo construya para ti — y para muchos más — y seas, por siempre, un pionero.",
      "Ese es el sueño. AMST (2026)",
    ],
    // El desplegable inglés de la historia se conserva para el contenido ya
    // publicado; con el sitio en inglés la historia SE MUESTRA traducida y el
    // desplegable ya no hace falta.
    tituloEn: "Read our story in English",
    parrafosEn: [
      "When I was a little kid, computers were my entertainment. There I found a tool that seemed wonderful to me: it let you build with blocks, piece by piece, inside a digital world. Real toys never made it to my country — \"no shipping outside the US\", read the fine print — and that application was free. Building there was possible, affordable and joyful.",
      "Twenty years later I remembered that pastime, but this time because of a need I recognized in myself and in the people around me. I am an amateur bodybuilder and a healthcare professional: I have witnessed, and lived, what sport and physical activity do for a person. And I am the first to admit my privilege, because I had the resources to pursue my passion for training. That is exactly why it worries me to see how neglected and disadvantaged sports participation is in my community and my country: people dying of weakness, of lack of movement, trapped between \"I have no space\", \"I have no time\" and \"I can't afford it\".",
      "EXERSUITE3D was born as an answer. Its first face is the creative tool, available to professional designers, gym owners and even amateur builders: bringing the end consumer into the decision-making, so they are free to meet their need for movement within whatever space, time and budget they have.",
      "Imagine a hub — a marketplace — where you can put together the ideal training space for you, wherever you are today. Imagine offering your clients personalized solutions without investing in obsolete formats; selling and competing with other brands for that niche that is so hard to find. Imagine your design being so good that a brand builds it for you — and for many more — and you remain, forever, a pioneer.",
      "That is the dream. AMST (2026)",
    ],
    cierre:
      "Los rangos articulares del maniquí no son estimaciones: los puso alguien que trabaja en salud, y se " +
      "corrigen cuando una postura pide un ángulo que un cuerpo no tiene. El tobillo permite 20° de " +
      "dorsiflexión contra 50° de flexión plantar, no 45 y 45.",
  },

  precio: {
    visible: true,
    titulo: "Licencia personal",
    monto: 9990,
    moneda: "CLP",
    montoTexto: "$9.990 CLP",
    incluye: [
      "Descarga para Android (APK) y Windows (EXE)",
      "Un pago, sin suscripción",
      "Actualizaciones de la serie 0.x",
      "Funciona sin conexión: tus proyectos se guardan en tu dispositivo",
    ],
    requisitos: "Android 5.1 o superior · Windows de 64 bits · se recomienda tablet o equipo con GPU (hay presets de calidad Alto/Medio/Bajo para equipos modestos).",
    notaPago: "Pago seguro procesado por Mercado Pago.",
    letraChica: "El enlace de descarga vale 48 horas y se regenera gratis con tu número de pago.",
  },

  faq: {
    visible: true,
    titulo: "Preguntas antes de comprar",
    items: [
      {
        p: "¿Necesito saber CAD?",
        r: "No. Se traza como en un editor de dibujo: eliges la pieza, la sueltas y arrastras. La aplicación abre por su Instructivo, que son preguntas frecuentes con imágenes, y trae ocho máquinas completas que puedes desarmar para ver cómo están hechas.",
      },
      {
        p: "¿Funciona sin conexión?",
        r: "Sí. Es una aplicación instalada; el proyecto vive en tu dispositivo y se autoguarda. Solo necesitas conexión para comprar y descargar.",
      },
      {
        p: "¿Podré abrir mis archivos dentro de diez años?",
        r: "El proyecto es un .json de texto plano, legible sin la aplicación, y puedes exportar la geometría a .glb para abrirla en SketchUp, Blender o Nomad. Si mañana desaparecemos, tu diseño sigue abriéndose.",
      },
      {
        p: "¿Sirve en una tablet modesta?",
        r: "Está pensada para eso. Hay presets de calidad Alto/Medio/Bajo que ajustan resolución de render, sombras y reflejos.",
      },
      {
        p: "¿Qué pasa cuando salga la 1.0?",
        r: "La serie 0.x va incluida y avanza rápido: 59 versiones anotadas en el registro de cambios, cada una con sus mediciones. Compras al precio de hoy.",
      },
      {
        p: "¿Esto reemplaza a SolidWorks o Fusion?",
        r: "No, y no lo pretende. Ellos modelan geometría con tolerancias de fabricación. Esto simula el cable pasando por las roldanas que pusiste y sienta un cuerpo con rangos articulares humanos en el asiento para decirte si la máquina le sirve.",
      },
    ],
  },

  /**
   * EL HUB, VERSIÓN DE ESCAPARATE (v0.2.71).
   *
   * Abre la mitad de abajo de la página: arriba se presenta y se vende el
   * software, aquí se enseña que detrás hay marcas y equipos de verdad. El
   * catálogo NO se edita desde aquí —sale del de la aplicación, ver
   * `lib/hub-datos.json`—; lo editable es la entradilla.
   */
  hub: {
    visible: true,
    titulo: "Y dentro, un mercado de equipamiento real",
    texto:
      "Marcas de equipamiento comercial publican sus máquinas escaneadas en 3D. " +
      "Las pruebas a escala real en tu propia sala antes de comprar nada: si no " +
      "cabe, lo sabes antes de que salga de fábrica.",
  },

  widgets: {
    visible: true,
    lista: [],
  },

  newsletter: {
    visible: true,
    titulo: "¿Todavía no es para ti?",
    texto: "Déjanos tu correo y te avisamos cuando lo sea: cada versión nueva, con lo que cambió.",
    botonTexto: "Avísenme",
  },

  pie: {
    texto: "EXERSUITE3D — diseño y simulación 3D de máquinas de gimnasio.",
    contacto: "Dudas y soporte: amaturanas@uft.edu",
  },

  // ------------------------------------------------------------- inglés
  en: {
    hero: {
      titulo: "Check that your machine actually fits a body. Before you weld it.",
      subtitulo:
        "Design structures, sheaves, cables and counterweights in real centimetres, simulate their " +
        "mechanics and sit a mannequin with a physical body inside: it tells you, measured, how much " +
        "travel the station loses and where it runs out of clearance.",
      firma: "Built by a bodybuilder who works in healthcare, because the tool he needed did not exist.",
      botonTexto: "Buy and download",
      botonSecundario: "See what it does",
    },
    hub: {
      titulo: "And inside, a marketplace of real equipment",
      texto:
        "Commercial equipment brands publish their 3D-scanned machines. You try them at " +
        "true scale in your own room before buying anything: if it doesn't fit, you find " +
        "out before it leaves the factory.",
    },
    paraQuien: {
      titulo: "The problem",
      problema:
        "You draw the machine, send it to the welder, and in the workshop you find out there are six " +
        "millimetres between the hand and the press arm. The mistake is already in steel.",
      publico: [
        {
          titulo: "Equipment designer",
          texto: "Test travel and clearance with a body inside before the drawing goes to manufacturing.",
        },
        {
          titulo: "Gym owner",
          texto: "Measure your floor, lay out the stations and show your client how it will look over a photo of the real place.",
        },
        {
          titulo: "Amateur builder",
          texto: "Assemble your own station with real parts and exact dimensions, on the tablet you already own.",
        },
      ],
    },
    caracteristicas: {
      titulo: "What you can verify before welding",
      items: [
        {
          titulo: "It tells you how many centimetres are missing",
          texto:
            "Seat a 175 cm mannequin with a physical body — 14 joints with human ranges — and the machine " +
            "stops passing through it. If the station loses travel with someone inside, you see it on screen " +
            "and not in the workshop: on the sample machine the seat leaves the body 0.6-3.3 cm from the " +
            "moving assembly, and that is the clearance you have to win back.",
        },
        {
          titulo: "You command a push, not eighteen angles",
          texto:
            "Pick the zone and the direction. In the upper body, pushing means extending the elbow while the " +
            "shoulder flexes: the real gesture of a press. Lower body, hinge, one side or both. " +
            "Tick lower body and hinge together and you get a deadlift.",
        },
        {
          titulo: "The plane comes from the pose, not from a menu",
          texto:
            "With the shoulder at chest height the push is horizontal; with the arms overhead it is vertical. " +
            "Four starting poses and the four classic movements — chest press, overhead press, row and " +
            "pulldown — come out of two keys.",
        },
        {
          titulo: "Cables that really pull",
          texto:
            "A 60 Hz physics engine over real centimetres: hinges mounted as hardware (two leaves and their " +
            "pin), sliders, welds that fuse parts into a single rigid body, selectorised weight stacks with " +
            "their pin, and an inextensible cable that runs through the sheaves you place and couples both ends.",
        },
        {
          titulo: "You draw in centimetres, not in “units”",
          texto:
            "1 unit = 1 cm throughout, over a 10 cm grid. 41 parts in the palette — 73 in " +
            "the library counting the ones that only arrive inside a machine — with 20 materials and 8 standard " +
            "machines that drop in already assembled. Axis locking, snapping to ends and nodes, and live measurement.",
        },
        {
          titulo: "The file opens without us",
          texto:
            "A plain .json holds your design: parts, joints, cables, groups and the mannequin with its pose. " +
            "Export .glb to carry on in SketchUp, Blender or Nomad. No subscription and no proprietary format. " +
            "(3D models you import live in the device Library, not inside the .json.)",
        },
      ],
    },
    galeria: {
      titulo: "The application",
      texto: "Real screenshots of version 0.2.49, untouched.",
    },
    historia: {
      titulo: "Our story",
      cierre:
        "The mannequin's joint ranges are not estimates: they were set by someone who works in healthcare, " +
        "and they get corrected when a pose asks for an angle a body does not have. The ankle allows 20° of " +
        "dorsiflexion against 50° of plantar flexion, not 45 and 45.",
    },
    precio: {
      titulo: "Personal licence",
      incluye: [
        "Download for Android (APK) and Windows (EXE)",
        "One payment, no subscription",
        "Updates throughout the 0.x series",
        "Works offline: your projects are stored on your device",
      ],
      requisitos: "Android 5.1 or newer · 64-bit Windows · a tablet or machine with a GPU is recommended (High/Medium/Low quality presets are included for modest hardware).",
      notaPago: "Secure payment processed by Mercado Pago.",
      letraChica: "The download link is valid for 48 hours and can be regenerated for free with your payment number.",
    },
    faq: {
      titulo: "Questions before you buy",
      items: [
        {
          p: "Do I need to know CAD?",
          r: "No. You draw as in a sketching app: pick the part, drop it and drag. The application opens on its Guide, which is a FAQ with pictures, and ships eight complete machines you can take apart to see how they are made.",
        },
        {
          p: "Does it work offline?",
          r: "Yes. It is an installed application; the project lives on your device and autosaves. You only need a connection to buy and download.",
        },
        {
          p: "Will I be able to open my files in ten years?",
          r: "The project is a plain-text .json, readable without the application, and you can export the geometry to .glb to open it in SketchUp, Blender or Nomad. If we disappear tomorrow, your design still opens.",
        },
        {
          p: "Will it run on a modest tablet?",
          r: "That is exactly what it is meant for. There are High/Medium/Low quality presets that adjust render resolution, shadows and reflections.",
        },
        {
          p: "What happens when 1.0 arrives?",
          r: "The 0.x series is included and moves fast: 59 versions logged in the changelog, each with its measurements. You buy at today's price.",
        },
        {
          p: "Does this replace SolidWorks or Fusion?",
          r: "No, and it does not try to. They model geometry with manufacturing tolerances. This simulates the cable running through the sheaves you placed, and seats a body with human joint ranges to tell you whether the machine works for it.",
        },
      ],
    },
    newsletter: {
      titulo: "Not for you yet?",
      texto: "Leave your email and we will tell you when it is: every new version, with what changed.",
      botonTexto: "Keep me posted",
    },
    pie: {
      texto: "EXERSUITE3D — 3D design and simulation of gym machines.",
      contacto: "Questions and support: amaturanas@uft.edu",
    },
  },
};

const CLAVE = "exersuite:sitio:contenido";
const CLAVE_COPIA = "exersuite:sitio:contenido:bak";

/**
 * Rellena la capa inglesa con la traducción de la historia que ya existía
 * dentro de un <details>. No se borra `parrafosEn` del objeto guardado: el
 * `tituloEn` de hoy («Read our story in English») es el rótulo del desplegable,
 * no un título de sección.
 */
function sembrarHistoriaInglesa(contenido) {
  const h = contenido?.historia;
  if (!h?.parrafosEn?.length) return contenido;
  const en = contenido.en ?? {};
  if (en.historia?.parrafos?.length) return contenido;
  return {
    ...contenido,
    en: {
      ...en,
      historia: {
        titulo: "Our story",
        ...(en.historia ?? {}),
        parrafos: h.parrafosEn,
      },
    },
  };
}

/**
 * Contenido vigente: el guardado desde /admin FUSIONADO EN PROFUNDIDAD sobre
 * el de fábrica.
 *
 * La fusión superficial de antes (`{...DEFECTO, ...guardado}`) hacía invisible
 * en producción cualquier campo nuevo: si el objeto guardado traía `hero`
 * entero, sustituía al `hero` de fábrica con clave y todo, así que un campo
 * añadido después no llegaba nunca. Lo guardado sigue mandando; el defecto
 * solo rellena lo que falte.
 */
export async function cargarContenido() {
  try {
    if (kv) {
      const guardado = await kv.get(CLAVE);
      if (guardado) return sembrarHistoriaInglesa(fusionar(CONTENIDO_DEFECTO, guardado));
    }
  } catch {
    /* sin Redis: contenido por defecto */
  }
  return sembrarHistoriaInglesa(CONTENIDO_DEFECTO);
}

export async function guardarContenido(contenido) {
  if (!kv) throw new Error("Falta configurar Upstash Redis (KV) para guardar cambios.");
  // COPIA DE SEGURIDAD antes de sobrescribir: el editor publica el documento
  // entero, así que dos pestañas abiertas a la vez podrían pisarse. La copia
  // anterior queda a un GET de distancia.
  try {
    const previo = await kv.get(CLAVE);
    if (previo) await kv.set(CLAVE_COPIA, previo);
  } catch {
    /* si la copia falla, no se impide publicar */
  }
  await kv.set(CLAVE, contenido);
}
