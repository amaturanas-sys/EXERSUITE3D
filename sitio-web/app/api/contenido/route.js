import { NextResponse } from "next/server";

import { CONTENIDO_DEFECTO, cargarContenido, guardarContenido } from "@/lib/contenido";

export const runtime = "nodejs";
/** Nunca cacheado: el editor tiene que ver lo último que se publicó. */
export const dynamic = "force-dynamic";

/**
 * Contenido vigente para el editor visual, MÁS los textos de fábrica.
 *
 * Los de fábrica van aparte para que /admin pueda ofrecer «traer los textos
 * nuevos» sección por sección: al haber contenido ya publicado en Redis, lo
 * guardado manda sobre lo que traiga una versión nueva, y sin esta salida no
 * habría manera de adoptar la presentación nueva sin borrarlo todo a mano.
 */
export async function GET() {
  return NextResponse.json({
    contenido: await cargarContenido(),
    fabrica: CONTENIDO_DEFECTO,
  });
}

/** Guarda el contenido editado. Protegido con la contraseña del panel. */
export async function POST(req) {
  const clave = req.headers.get("x-admin-password") || "";
  if (!process.env.ADMIN_PASSWORD || clave !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  try {
    const contenido = await req.json();
    await guardarContenido(contenido);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
