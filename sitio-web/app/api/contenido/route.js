import { NextResponse } from "next/server";
import { cargarContenido, guardarContenido } from "@/lib/contenido";

export const runtime = "nodejs";

/** Devuelve el contenido vigente (para el editor visual). */
export async function GET() {
  return NextResponse.json(await cargarContenido());
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
