import { NextResponse } from "next/server";
import { kv } from "@/lib/redis";

export const runtime = "nodejs";

/** Sirve una imagen subida desde el editor (guardada como data-URL en Redis). */
export async function GET(_req, { params }) {
  const id = String(params.id || "").replace(/[^a-f0-9]/g, "");
  const data = kv ? await kv.get(`exersuite:img:${id}`) : null;
  if (!data || typeof data !== "string") {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }
  const [, tipo, base64] = data.match(/^data:(image\/\w+);base64,(.+)$/) || [];
  if (!tipo) return NextResponse.json({ error: "Corrupta" }, { status: 500 });
  return new NextResponse(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
