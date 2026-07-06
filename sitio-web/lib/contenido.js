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
