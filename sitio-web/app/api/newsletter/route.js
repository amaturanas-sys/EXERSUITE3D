import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import { kv } from "@/lib/redis";

export const runtime = "nodejs";

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Alta en el newsletter con filtro de correos reales:
 * 1) sintaxis, 2) el dominio debe existir y tener registros MX (o A) — así se
 * descartan dominios inventados. Los correos válidos se guardan en Redis.
 */
export async function POST(req) {
  let email = "";
  try {
    email = String((await req.json()).email || "").trim().toLowerCase();
  } catch {
    /* cuerpo inválido */
  }
  if (!RE_EMAIL.test(email)) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }

  const dominio = email.split("@")[1];
  let real = false;
  try {
    const mx = await dns.resolveMx(dominio);
    real = mx.length > 0;
  } catch {
    try {
      real = (await dns.resolve(dominio)).length > 0;
    } catch {
      real = false;
    }
  }
  if (!real) {
    return NextResponse.json(
      { error: `El dominio "${dominio}" no existe o no recibe correo.` },
      { status: 400 },
    );
  }

  try {
    if (kv) {
      const nuevo = await kv.sadd("exersuite:newsletter", email);
      if (nuevo === 0) {
        return NextResponse.json({ mensaje: "Ese correo ya estaba suscrito. ¡Gracias!" });
      }
    } else {
      console.warn("newsletter sin Redis: no se persistió", email);
    }
  } catch (e) {
    console.error("newsletter:", e);
    return NextResponse.json({ error: "No se pudo guardar. Inténtalo más tarde." }, { status: 500 });
  }
  return NextResponse.json({ mensaje: "¡Listo! Te avisaremos de las novedades." });
}
