import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { consultarPago } from "@/lib/mercadopago";
import { kv } from "@/lib/redis";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago (notificación servidor-a-servidor de cada pago).
 * Refuerza el circuito: aunque el comprador cierre el navegador antes de
 * volver a /gracias, el pago aprobado queda registrado en Redis.
 *
 * Si MP_WEBHOOK_SECRET está configurado (la "clave secreta" que muestra el
 * panel de Webhooks), se valida la firma x-signature de cada notificación.
 */
export async function POST(req) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";
  const tipo = url.searchParams.get("type") || url.searchParams.get("topic") || "";

  // Validación de firma (recomendación oficial de Mercado Pago).
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (secreto && dataId) {
    const firma = req.headers.get("x-signature") || "";
    const requestId = req.headers.get("x-request-id") || "";
    const partes = Object.fromEntries(
      firma.split(",").map((kv2) => kv2.trim().split("=")),
    );
    const manifiesto = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
    const esperada = crypto.createHmac("sha256", secreto).update(manifiesto).digest("hex");
    if (esperada !== partes.v1) {
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }
  }

  // Solo nos interesan las notificaciones de pago.
  if (tipo === "payment" && dataId) {
    try {
      const pago = await consultarPago(dataId);
      if (pago && pago.estado === "approved" && kv) {
        await kv.sadd("exersuite:compras", `${pago.id}:${pago.email}`);
      }
    } catch (e) {
      console.error("webhook mp:", e);
      // 200 igualmente: MP reintenta solo ante errores; el pago se verifica
      // de todos modos en /gracias.
    }
  }
  return NextResponse.json({ ok: true });
}
