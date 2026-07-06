import { NextResponse } from "next/server";
import { cargarContenido } from "@/lib/contenido";
import { crearPreferencia } from "@/lib/mercadopago";

export const runtime = "nodejs";

/** Crea el pago en Mercado Pago y devuelve la URL del checkout. */
export async function POST(req) {
  try {
    const c = await cargarContenido();
    const urlBase =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const url = await crearPreferencia({
      titulo: `${c.marca} — ${c.precio.titulo}`,
      monto: c.precio.monto,
      moneda: c.precio.moneda,
      urlBase,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("checkout:", e);
    return NextResponse.json(
      { error: "Pago no disponible ahora mismo. Revisa la configuración de Mercado Pago." },
      { status: 500 },
    );
  }
}
