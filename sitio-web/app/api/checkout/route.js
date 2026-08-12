import { NextResponse } from "next/server";
import { cargarContenido } from "@/lib/contenido";
import { crearPreferencia } from "@/lib/mercadopago";
import { normalizarIdioma } from "@/lib/i18n";
import { txtApi } from "@/lib/textos";

export const runtime = "nodejs";

/**
 * Crea el pago en Mercado Pago y devuelve la URL del checkout.
 *
 * El TÍTULO del cobro se compone con textos del árbol ESPAÑOL, que es el que
 * siempre tiene valor: es lo que le aparece al comprador en su comprobante y
 * en el panel de ventas, y ahí conviene una sola redacción estable pase lo que
 * pase con las traducciones.
 */
export async function POST(req) {
  const idioma = normalizarIdioma(req.headers.get("x-idioma"));
  try {
    const c = await cargarContenido();
    const urlBase = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const url = await crearPreferencia({
      titulo: `${c.marca} — ${c.precio.titulo}`,
      monto: c.precio.monto,
      moneda: c.precio.moneda,
      // El comprador vuelve a /gracias en el idioma en el que estaba leyendo,
      // aunque el navegador no mande la cookie al volver de otro sitio.
      urlBase: `${urlBase}`,
      idioma,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("checkout:", e);
    return NextResponse.json(
      { codigo: "pago_no_configurado", error: txtApi(idioma, "pago_no_configurado") },
      { status: 500 },
    );
  }
}
