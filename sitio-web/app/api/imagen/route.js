import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { kv } from "@/lib/redis";

export const runtime = "nodejs";

/**
 * Subida de imágenes desde el editor (galería del dispositivo): el cliente
 * las redimensiona/comprime a <950 KB y las manda como data-URL; se guardan
 * en Redis y se sirven desde /api/imagen/<id>.
 */
export async function POST(req) {
  const clave = req.headers.get("x-admin-password") || "";
  if (!process.env.ADMIN_PASSWORD || clave !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Escribe la contraseña del editor antes de subir imágenes." },
      { status: 401 },
    );
  }
  if (!kv) {
    return NextResponse.json(
      { error: "Falta configurar Upstash Redis para almacenar imágenes." },
      { status: 500 },
    );
  }
  let data = "";
  try {
    data = String((await req.json()).data || "");
  } catch {
    /* cuerpo inválido */
  }
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(data)) {
    return NextResponse.json({ error: "Formato de imagen no válido." }, { status: 400 });
  }
  if (data.length > 990_000) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx ~950 KB)." }, { status: 413 });
  }
  const id = crypto.createHash("sha256").update(data).digest("hex").slice(0, 20);
  await kv.set(`exersuite:img:${id}`, data);
  return NextResponse.json({ url: `/api/imagen/${id}` });
}
