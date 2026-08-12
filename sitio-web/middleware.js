import { NextResponse } from "next/server";

import {
  CABECERA_IDIOMA,
  COOKIE_IDIOMA,
  IDIOMA_POR_DEFECTO,
  idiomaDeAcceptLanguage,
  normalizarIdioma,
} from "@/lib/i18n";

/**
 * IDIOMA DE LA PETICIÓN, decidido UNA vez y en el servidor.
 *
 * Precedencia: ?lang → cookie → Accept-Language → español (el producto cobra
 * en CLP). Se inyecta como cabecera de petición para que el layout —que pone
 * <html lang> y no recibe searchParams— y la página vean exactamente lo mismo,
 * y se fija la cookie de respuesta, que es lo único que un Server Component de
 * Next 14 no puede escribir por su cuenta.
 *
 * Decidirlo en el cliente (navigator.language / localStorage) daría un HTML de
 * servidor distinto del primer render de cliente: aviso de hidratación y un
 * parpadeo de idioma a la vista.
 */
export function middleware(req) {
  const url = req.nextUrl;

  // URLs limpias por idioma, para que exista una dirección rastreable de cada
  // uno sin partir app/ en app/[idioma] (lo que obligaría a mover /admin,
  // /gracias y las back_urls de Mercado Pago).
  const porRuta = url.pathname === "/en" ? "en" : url.pathname === "/es" ? "es" : null;

  const pedido = porRuta ?? url.searchParams.get("lang");
  const enCookie = req.cookies.get(COOKIE_IDIOMA)?.value;
  const idioma = pedido
    ? normalizarIdioma(pedido)
    : enCookie
      ? normalizarIdioma(enCookie)
      : (idiomaDeAcceptLanguage(req.headers.get("accept-language")) ?? IDIOMA_POR_DEFECTO);

  const cabeceras = new Headers(req.headers);
  cabeceras.set(CABECERA_IDIOMA, idioma);

  const destino = url.clone();
  if (porRuta) destino.pathname = "/";
  const res = porRuta
    ? NextResponse.rewrite(destino, { request: { headers: cabeceras } })
    : NextResponse.next({ request: { headers: cabeceras } });

  if (enCookie !== idioma) {
    // SameSite=Lax y NO Strict: el comprador vuelve de mercadopago.com a
    // /gracias por una navegación desde otro sitio, y con Strict el navegador
    // no mandaría la cookie — un comprador inglés vería la página en español
    // justo en el momento en que se le entrega lo que pagó.
    res.cookies.set(COOKIE_IDIOMA, idioma, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return res;
}

/**
 * Fuera de la API, los estáticos y las imágenes: ahí el middleware solo añade
 * latencia (y /api/imagen sube archivos de casi un mega).
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|capturas|favicon.ico|.*\\.png$).*)"],
};
