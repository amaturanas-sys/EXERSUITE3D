import { NextResponse } from "next/server";
import dns from "node:dns/promises";

import { kv } from "@/lib/redis";
import { normalizarIdioma } from "@/lib/i18n";
import { txtApi } from "@/lib/textos";

export const runtime = "nodejs";

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Alta en el newsletter con filtro de correos reales:
 * 1) sintaxis, 2) el dominio debe existir y tener registros MX (o A) — así se
 * descartan dominios inventados. Los correos válidos se guardan en Redis.
 *
 * La respuesta lleva un CÓDIGO estable además del mensaje: el cliente lo
 * traduce al idioma que está leyendo. Sin esto, un visitante inglés recibía la
 * página traducida y el mensaje de suscripción en español.
 */
function responder(idioma, codigo, extra = {}, status = 200) {
  const mensaje = txtApi(idioma, codigo);
  const cuerpo = status >= 400 ? { codigo, error: mensaje } : { codigo, mensaje };
  return NextResponse.json({ ...cuerpo, ...extra }, { status });
}

export async function POST(req) {
  const idioma = normalizarIdioma(req.headers.get("x-idioma"));
  let email = "";
  try {
    email = String((await req.json()).email || "").trim().toLowerCase();
  } catch {
    /* cuerpo inválido */
  }
  if (!RE_EMAIL.test(email)) return responder(idioma, "email_invalido", {}, 400);

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
  if (!real) return responder(idioma, "dominio_sin_correo", { dominio }, 400);

  try {
    if (kv) {
      const nuevo = await kv.sadd("exersuite:newsletter", email);
      if (nuevo === 0) return responder(idioma, "ya_suscrito");
    } else {
      console.warn("newsletter sin Redis: no se persistió", email);
    }
  } catch (e) {
    console.error("newsletter:", e);
    return responder(idioma, "sin_almacen", {}, 500);
  }
  return responder(idioma, "suscrito");
}
