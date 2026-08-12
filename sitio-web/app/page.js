import { headers } from "next/headers";

import Landing from "@/components/Landing";
import { cargarContenido } from "@/lib/contenido";
import { CABECERA_IDIOMA, normalizarIdioma, resolverContenido } from "@/lib/i18n";

/**
 * `force-dynamic` protege DOS cosas: que el contenido editado en /admin se vea
 * al instante y —desde el bilingüe— que la CDN no cachee un idioma y se lo
 * sirva a todo el mundo. No lo cambies por `revalidate` sin separar las URLs.
 */
export const dynamic = "force-dynamic";

export default async function Pagina() {
  const idioma = normalizarIdioma(headers().get(CABECERA_IDIOMA));
  const contenido = await cargarContenido();
  return <Landing contenido={resolverContenido(contenido, idioma)} idioma={idioma} />;
}
