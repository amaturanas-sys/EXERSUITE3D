/**
 * Integración con Mercado Pago (la plataforma de cobro de tu cuenta de
 * Mercado Libre) por API REST directa: crear la preferencia de pago
 * (Checkout Pro) y verificar el estado de un pago.
 * Necesita MP_ACCESS_TOKEN (credenciales de producción del panel
 * developers.mercadopago.com de tu cuenta de vendedor).
 */
const API = "https://api.mercadopago.com";

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN");
  return t;
}

/**
 * Crea la preferencia de Checkout Pro y devuelve la URL de pago.
 *
 * `idioma` viaja en las URLs de vuelta: el comprador regresa desde
 * mercadopago.com, una navegación desde OTRO sitio, y no se puede dar por
 * hecho que el navegador mande la cookie de idioma en ese salto.
 */
export async function crearPreferencia({ titulo, monto, moneda, urlBase, idioma = "es" }) {
  const lang = idioma === "en" ? "en" : "es";
  // Referencia externa única por orden: mejora la conciliación y la
  // "calidad de integración" que mide el panel de Mercado Pago.
  const referencia = `exersuite3d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: "exersuite3d-licencia",
          title: titulo,
          description: "Licencia personal de EXERSUITE3D (Android + Windows)",
          category_id: "software",
          quantity: 1,
          currency_id: moneda,
          unit_price: Number(monto),
        },
      ],
      external_reference: referencia,
      notification_url: `${urlBase}/api/webhook/mp`,
      back_urls: {
        success: `${urlBase}/gracias?lang=${lang}`,
        pending: `${urlBase}/gracias?lang=${lang}`,
        failure: `${urlBase}/?pago=fallido&lang=${lang}`,
      },
      auto_return: "approved",
      statement_descriptor: "EXERSUITE3D",
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.init_point;
}

/** Consulta un pago por id y devuelve su estado y monto. */
export async function consultarPago(paymentId) {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return null;
  const p = await res.json();
  return {
    id: String(p.id),
    estado: p.status, // approved | pending | rejected…
    monto: p.transaction_amount,
    moneda: p.currency_id,
    email: p.payer?.email ?? "",
  };
}
