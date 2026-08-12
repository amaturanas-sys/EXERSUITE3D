import { headers } from "next/headers";

import { consultarPago } from "@/lib/mercadopago";
import { crearTokenDescarga } from "@/lib/token";
import { kv } from "@/lib/redis";
import { CABECERA_IDIOMA, normalizarIdioma } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const T = {
  es: {
    gracias: "¡Gracias por tu compra!",
    listo: (id) =>
      `Tus descargas están listas. Los enlaces duran 48 horas — guarda esta página o tu nº de pago (${id}) para regenerarlos cuando quieras.`,
    android: "Descargar para Android (.apk)",
    windows: "Descargar para Windows (.exe)",
    pendienteTitulo: "Pago en proceso",
    pendiente:
      "Mercado Pago aún está confirmando tu pago. Recarga esta página en unos minutos (guarda la URL: incluye tu nº de pago).",
    rechazadoTitulo: "No pudimos confirmar el pago",
    rechazado: "Si crees que es un error, contáctanos indicando tu nº de operación de Mercado Pago.",
    sinPagoTitulo: "Falta el número de pago",
    sinPago: "Llega a esta página desde el checkout de Mercado Pago, o añade ?payment_id=<tu nº de pago> a la URL.",
    volver: "← Volver a la página principal",
  },
  en: {
    gracias: "Thank you for your purchase!",
    listo: (id) =>
      `Your downloads are ready. The links last 48 hours — keep this page or your payment number (${id}) to get new ones whenever you need.`,
    android: "Download for Android (.apk)",
    windows: "Download for Windows (.exe)",
    pendienteTitulo: "Payment in progress",
    pendiente:
      "Mercado Pago is still confirming your payment. Reload this page in a few minutes (keep the URL: it holds your payment number).",
    rechazadoTitulo: "We could not confirm the payment",
    rechazado: "If you think this is a mistake, contact us with your Mercado Pago operation number.",
    sinPagoTitulo: "The payment number is missing",
    sinPago: "Reach this page from the Mercado Pago checkout, or add ?payment_id=<your payment number> to the URL.",
    volver: "← Back to the main page",
  },
};

/**
 * Vuelta desde Mercado Pago: se verifica el pago EN EL SERVIDOR con la API
 * (nunca nos fiamos de la URL) y, si está aprobado y el monto coincide, se
 * emiten los enlaces de descarga firmados (48 h). Con el mismo nº de pago se
 * puede volver a esta página y regenerar los enlaces.
 *
 * El idioma sale de la cabecera que pone el middleware, que a su vez respeta
 * el `?lang` que Mercado Pago devuelve en la URL de vuelta.
 */
export default async function Gracias({ searchParams }) {
  const idioma = normalizarIdioma(headers().get(CABECERA_IDIOMA));
  const t = T[idioma];
  const paymentId = searchParams.payment_id || searchParams.collection_id || "";
  const { cargarContenido } = await import("@/lib/contenido");
  const c = await cargarContenido();

  let estado = "sin-pago";
  let enlaces = null;

  if (paymentId) {
    const pago = await consultarPago(paymentId);
    if (!pago) estado = "no-encontrado";
    else if (pago.estado === "approved" && Number(pago.monto) >= Number(c.precio.monto)) {
      estado = "aprobado";
      const token = crearTokenDescarga(pago.id);
      const base = (process.env.HF_SPACE_URL || "").replace(/\/$/, "");
      enlaces = {
        android: `${base}/descargar/android?token=${encodeURIComponent(token)}`,
        windows: `${base}/descargar/windows?token=${encodeURIComponent(token)}`,
      };
      try {
        if (kv) await kv.sadd("exersuite:compras", `${pago.id}:${pago.email}`);
      } catch {
        /* registro opcional */
      }
    } else if (pago.estado === "pending" || pago.estado === "in_process") {
      estado = "pendiente";
    } else {
      estado = "rechazado";
    }
  }

  return (
    <main className="gracias">
      <img src="/brand/logo-mark.png" alt="" width="72" style={{ borderRadius: 12 }} />
      {estado === "aprobado" && (
        <>
          <h1>{t.gracias}</h1>
          <p className="dim" style={{ marginTop: 10 }}>
            {t.listo(paymentId)}
          </p>
          <div className="descargas">
            <a className="boton grande" href={enlaces.android}>
              {t.android}
            </a>
            <a className="boton grande secundario" href={enlaces.windows}>
              {t.windows}
            </a>
          </div>
        </>
      )}
      {estado === "pendiente" && (
        <>
          <h1>{t.pendienteTitulo}</h1>
          <p className="dim">{t.pendiente}</p>
        </>
      )}
      {(estado === "rechazado" || estado === "no-encontrado") && (
        <>
          <h1>{t.rechazadoTitulo}</h1>
          <p className="dim">{t.rechazado}</p>
        </>
      )}
      {estado === "sin-pago" && (
        <>
          <h1>{t.sinPagoTitulo}</h1>
          <p className="dim">{t.sinPago}</p>
        </>
      )}
      <p style={{ marginTop: 34 }}>
        <a className="dim" href={idioma === "en" ? "/en" : "/"}>
          {t.volver}
        </a>
      </p>
    </main>
  );
}
