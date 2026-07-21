import { kv } from "./redis";

/**
 * Contenido editable de la página (textos, imágenes, precio, secciones).
 * El panel /admin lo edita visualmente y lo guarda en Upstash Redis; si no
 * hay Redis configurado, se usa este contenido por defecto.
 */
export const CONTENIDO_DEFECTO = {
  marca: "EXERSUITE3D",
  colorAcento: "#efede8",
  hero: {
    visible: true,
    titulo: "Diseña y simula máquinas de gimnasio en 3D",
    subtitulo:
      "Construye estructuras, poleas, cables y contrapesos con física real. " +
      "Prueba tu máquina con un maniquí a escala antes de fabricarla.",
    imagen: "/brand/logo-full-light.png",
    botonTexto: "Comprar y descargar",
  },
  caracteristicas: {
    visible: true,
    titulo: "Qué incluye",
    items: [
      {
        titulo: "Biblioteca de 47 componentes",
        texto: "Pilares, guías, poleas, levas, discos, agarres y más, con 20 materiales.",
      },
      {
        titulo: "Física de verdad",
        texto: "Bisagras, correderas, cables inextensibles con poleas y cuerdas con catenaria.",
      },
      {
        titulo: "Maniquí ergonómico",
        texto: "Figura humana a escala con posturas e IK de manos para validar agarres.",
      },
      {
        titulo: "Herramientas precisas",
        texto: "Bloqueo de eje X/Y/Z, contador en cm, deshacer/rehacer y selección por área.",
      },
      {
        titulo: "Android y Windows",
        texto: "App nativa para tablet Android y aplicación de escritorio para Windows.",
      },
      {
        titulo: "Tus proyectos son tuyos",
        texto: "Archivos .json abiertos e interoperables; exporta modelos .glb.",
      },
    ],
  },
  galeria: {
    visible: true,
    titulo: "La aplicación",
    imagenes: [],
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
    tituloEn: "Read our story in English",
    parrafosEn: [
      "When I was a little kid, computers were my entertainment. There I found a tool that seemed wonderful to me: it let you build with blocks, piece by piece, inside a digital world. Real toys never made it to my country — \"no shipping outside the US\", read the fine print — and that application was free. Building there was possible, affordable and joyful.",
      "Twenty years later I remembered that pastime, but this time because of a need I recognized in myself and in the people around me. I am an amateur bodybuilder and a healthcare professional: I have witnessed, and lived, what sport and physical activity do for a person. And I am the first to admit my privilege, because I had the resources to pursue my passion for training. That is exactly why it worries me to see how neglected and disadvantaged sports participation is in my community and my country: people dying of weakness, of lack of movement, trapped between \"I have no space\", \"I have no time\" and \"I can't afford it\".",
      "EXERSUITE3D was born as an answer. Its first face is the creative tool, available to professional designers, gym owners and even amateur builders: bringing the end consumer into the decision-making, so they are free to meet their need for movement within whatever space, time and budget they have.",
      "Imagine a hub — a marketplace — where you can put together the ideal training space for you, wherever you are today. Imagine offering your clients personalized solutions without investing in obsolete formats; selling and competing with other brands for that niche that is so hard to find. Imagine your design being so good that a brand builds it for you — and for many more — and you remain, forever, a pioneer.",
      "That is the dream. AMST (2026)",
    ],
  },
  precio: {
    visible: true,
    titulo: "Licencia personal",
    monto: 9990,
    moneda: "CLP",
    montoTexto: "$9.990 CLP",
    incluye: [
      "Descarga para Android (APK) y Windows (EXE)",
      "Actualizaciones de la serie 0.x",
      "Enlace de descarga válido 48 horas (reutilizable con tu nº de pago)",
    ],
    notaPago: "Pago seguro procesado por Mercado Pago.",
  },
  widgets: {
    visible: true,
    lista: [],
  },
  newsletter: {
    visible: true,
    titulo: "Novedades del proyecto",
    texto: "Déjanos tu correo y te avisamos de nuevas versiones y funciones.",
    botonTexto: "Suscribirme",
  },
  pie: {
    texto: "EXERSUITE3D — diseño y simulación 3D de máquinas de gimnasio.",
    contacto: "",
  },
};

const CLAVE = "exersuite:sitio:contenido";

/** Contenido vigente: el guardado desde /admin o el de por defecto. */
export async function cargarContenido() {
  try {
    if (kv) {
      const guardado = await kv.get(CLAVE);
      if (guardado) return { ...CONTENIDO_DEFECTO, ...guardado };
    }
  } catch {
    /* sin Redis: contenido por defecto */
  }
  return CONTENIDO_DEFECTO;
}

export async function guardarContenido(contenido) {
  if (!kv) throw new Error("Falta configurar Upstash Redis (KV) para guardar cambios.");
  await kv.set(CLAVE, contenido);
}
