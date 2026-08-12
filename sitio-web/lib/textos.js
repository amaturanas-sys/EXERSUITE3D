/**
 * CADENAS DE LA INTERFAZ que el visitante ve pero el propietario NO edita:
 * botones de estado, flechas del carrusel, la página /gracias entera y los
 * mensajes que devuelven las rutas de API.
 *
 * Van aquí y no en el contenido de Redis a propósito: mezclarlas obligaría a
 * traducir el código desde el editor. Frontera: lo que se escribe en /admin
 * vive en Redis; lo que dice el programa vive aquí.
 *
 * El panel /admin se queda en español: no es una interfaz de cara al público.
 */

const TEXTOS = {
  es: {
    "chrome.idioma.es": "Español",
    "chrome.idioma.en": "English",
    "chrome.idioma.cambiar": "Cambiar idioma",
    "chrome.verEnIngles": "Read this page in English",
    "chrome.verEnEspanol": "Ver esta página en español",
    "chrome.abriendoPago": "Abriendo Mercado Pago…",
    "chrome.comprobando": "Comprobando…",
    "chrome.errorPago": "No se pudo iniciar el pago",
    "chrome.errorEnvio": "No se pudo enviar. Inténtalo de nuevo.",
    "chrome.correo": "tu@correo.com",
    "chrome.captura": "Captura",
    "chrome.anterior": "Anterior",
    "chrome.siguiente": "Siguiente",
    "chrome.irA": "Ir a la imagen",
    "chrome.sitio": "Sitio del proyecto",

    "gracias.titulo": "¡Gracias por tu compra!",
    "gracias.verificando": "Verificando el pago…",
    "gracias.listo": "Tu pago está confirmado. Descarga EXERSUITE3D:",
    "gracias.android": "⬇  Descargar para Android (APK)",
    "gracias.windows": "⬇  Descargar para Windows (EXE)",
    "gracias.caduca": "Los enlaces caducan en 48 horas. Puedes volver a esta página con tu número de pago para regenerarlos.",
    "gracias.pendiente": "El pago aún no está aprobado. Si acabas de pagar, espera un momento y recarga.",
    "gracias.sinPago": "Falta el número de pago en la dirección.",
    "gracias.volver": "← Volver a la página",

    "api.email_invalido": "Ese correo no parece válido.",
    "api.dominio_sin_correo": "El dominio de ese correo no recibe correo.",
    "api.ya_suscrito": "Ya estabas suscrito. ¡Gracias!",
    "api.suscrito": "Listo, te avisaremos de cada versión nueva.",
    "api.sin_almacen": "Ahora mismo no podemos guardar tu correo. Inténtalo más tarde.",
    "api.pago_no_configurado": "La tienda no está configurada todavía.",
    "api.error_generico": "Algo salió mal. Inténtalo de nuevo.",
  },
  en: {
    "chrome.idioma.es": "Español",
    "chrome.idioma.en": "English",
    "chrome.idioma.cambiar": "Change language",
    "chrome.verEnIngles": "Read this page in English",
    "chrome.verEnEspanol": "Ver esta página en español",
    "chrome.abriendoPago": "Opening Mercado Pago…",
    "chrome.comprobando": "Checking…",
    "chrome.errorPago": "Could not start the payment",
    "chrome.errorEnvio": "Could not send it. Please try again.",
    "chrome.correo": "you@email.com",
    "chrome.captura": "Screenshot",
    "chrome.anterior": "Previous",
    "chrome.siguiente": "Next",
    "chrome.irA": "Go to image",
    "chrome.sitio": "Project site",

    "gracias.titulo": "Thank you for your purchase!",
    "gracias.verificando": "Verifying the payment…",
    "gracias.listo": "Your payment is confirmed. Download EXERSUITE3D:",
    "gracias.android": "⬇  Download for Android (APK)",
    "gracias.windows": "⬇  Download for Windows (EXE)",
    "gracias.caduca": "The links expire in 48 hours. You can come back to this page with your payment number to get new ones.",
    "gracias.pendiente": "The payment is not approved yet. If you just paid, wait a moment and reload.",
    "gracias.sinPago": "The payment number is missing from the address.",
    "gracias.volver": "← Back to the page",

    "api.email_invalido": "That email does not look valid.",
    "api.dominio_sin_correo": "That email's domain does not receive mail.",
    "api.ya_suscrito": "You were already subscribed. Thank you!",
    "api.suscrito": "Done — we will let you know about every new version.",
    "api.sin_almacen": "We cannot store your email right now. Please try later.",
    "api.pago_no_configurado": "The store is not set up yet.",
    "api.error_generico": "Something went wrong. Please try again.",
  },
};

/** Traduce una clave de interfaz. Si falta, devuelve la española. */
export function txt(idioma, clave) {
  const tabla = TEXTOS[idioma === "en" ? "en" : "es"];
  return tabla[clave] ?? TEXTOS.es[clave] ?? clave;
}

/** Traduce un CÓDIGO de respuesta de la API ("email_invalido"). */
export function txtApi(idioma, codigo) {
  return txt(idioma, `api.${codigo}`);
}
