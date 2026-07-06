import { consultarPago } from "@/lib/mercadopago";
import { crearTokenDescarga } from "@/lib/token";
import { kv } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Vuelta desde Mercado Pago: se verifica el pago EN EL SERVIDOR con la API
 * (nunca nos fiamos de la URL) y, si está aprobado y el monto coincide, se
 * emiten los enlaces de descarga firmados (48 h). Con el mismo nº de pago se
 * puede volver a esta página y regenerar los enlaces.
 */
export default async function Gracias({ searchParams }) {
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
          <h1>¡Gracias por tu compra!</h1>
          <p className="dim" style={{ marginTop: 10 }}>
            Tus descargas están listas. Los enlaces duran 48 horas — guarda esta
            página o tu nº de pago ({paymentId}) para regenerarlos cuando quieras.
          </p>
          <div className="descargas">
            <a className="boton grande" href={enlaces.android}>
              Descargar para Android (.apk)
            </a>
            <a className="boton grande secundario" href={enlaces.windows}>
              Descargar para Windows (.exe)
            </a>
          </div>
        </>
      )}
      {estado === "pendiente" && (
        <>
          <h1>Pago en proceso</h1>
          <p className="dim">
            Mercado Pago aún está confirmando tu pago. Recarga esta página en unos
            minutos (guarda la URL: incluye tu nº de pago).
          </p>
        </>
      )}
      {(estado === "rechazado" || estado === "no-encontrado") && (
        <>
          <h1>No pudimos confirmar el pago</h1>
          <p className="dim">
            Si crees que es un error, contáctanos indicando tu nº de operación de
            Mercado Pago.
          </p>
        </>
      )}
      {estado === "sin-pago" && (
        <>
          <h1>Falta el número de pago</h1>
          <p className="dim">
            Llega a esta página desde el checkout de Mercado Pago, o añade
            ?payment_id=&lt;tu nº de pago&gt; a la URL.
          </p>
        </>
      )}
      <p style={{ marginTop: 34 }}>
        <a className="dim" href="/">
          ← Volver a la página principal
        </a>
      </p>
    </main>
  );
}
