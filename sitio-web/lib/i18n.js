/**
 * BILINGÜE ES/EN (v1).
 *
 * El español es la VERDAD y no se mueve: el objeto guardado en Redis sigue
 * siendo el árbol español de cadenas planas, exactamente como está publicado.
 * El inglés es una capa OPCIONAL y ESPARSA colgada de la clave `en`:
 *
 *     { hero: { titulo: "Diseña…" },  en: { hero: { titulo: "Design…" } } }
 *
 * Al servir la página se superpone hoja a hoja con respaldo al español, así
 * que una traducción a medias nunca deja huecos en blanco, y añadir el inglés
 * no cambia el tipo de ningún campo ya publicado (lo que habría reventado,
 * por ejemplo, el título del cobro que se manda a Mercado Pago).
 *
 * EXCEPCIÓN deliberada: las colecciones con identidad propia —widgets.lista y
 * lienzo.elementos— llevan su traducción como campo HERMANO dentro del objeto
 * (`tituloEn`, `textoEn`, `pieEn`). Se reordenan, duplican y borran, y una
 * capa por índice reasignaría en silencio la traducción al widget equivocado.
 * Regla: la traducción vive donde escribe el editor.
 */

export const IDIOMAS = ["es", "en"];
export const IDIOMA_POR_DEFECTO = "es";
export const COOKIE_IDIOMA = "idioma";
/** Cabecera que el middleware inyecta para que layout y page vean lo mismo. */
export const CABECERA_IDIOMA = "x-idioma";

/** Subárboles que NO usan la capa `en` (llevan campos hermanos). */
const SIN_CAPA = ["widgets", "lienzo"];

export function normalizarIdioma(valor) {
  return valor === "en" ? "en" : IDIOMA_POR_DEFECTO;
}

/**
 * Idioma preferido según `Accept-Language`, respetando los factores q.
 * Devuelve null si el visitante no pide ninguno que sepamos servir.
 */
export function idiomaDeAcceptLanguage(cabecera) {
  if (!cabecera) return null;
  const preferencias = cabecera
    .split(",")
    .map((trozo) => {
      const [etiqueta, ...parametros] = trozo.trim().split(";");
      const q = parametros.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const peso = q ? Number.parseFloat(q.slice(2)) : 1;
      return { base: etiqueta.trim().toLowerCase().split("-")[0], peso };
    })
    .filter((p) => Number.isFinite(p.peso) && p.peso > 0)
    .sort((a, b) => b.peso - a.peso);
  for (const p of preferencias) if (IDIOMAS.includes(p.base)) return p.base;
  return null;
}

/** Lee una ruta ("hero.titulo", "precio.incluye.2") de un objeto. */
export function leerRuta(obj, ruta) {
  let cursor = obj;
  for (const parte of String(ruta).split(".")) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[parte];
  }
  return cursor;
}

/**
 * Escribe una ruta creando lo que falte por el camino. Decide entre objeto y
 * array mirando el SIGUIENTE segmento: con "incluye.2" hay que crear un array,
 * porque un objeto con clave "2" rompería el .map() que lo pinta.
 */
export function escribirRuta(obj, ruta, valor) {
  const partes = String(ruta).split(".");
  let cursor = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    const clave = partes[i];
    const siguienteEsIndice = /^\d+$/.test(partes[i + 1]);
    if (cursor[clave] === null || typeof cursor[clave] !== "object") {
      cursor[clave] = siguienteEsIndice ? [] : {};
    }
    cursor = cursor[clave];
  }
  cursor[partes.at(-1)] = valor;
  return obj;
}

/** Ruta de ESCRITURA según el idioma que se esté editando en /admin. */
export function rutaDeIdioma(ruta, idioma) {
  return idioma === "en" ? `en.${ruta}` : ruta;
}

/**
 * Fusión PROFUNDA: `base` aporta la forma completa y `encima` tiene prioridad.
 *
 * Los arrays se solapan POR ÍNDICE conservando la longitud de la base: si el
 * inglés trae 3 párrafos traducidos de 5, los otros 2 salen en español en vez
 * de desaparecer. Un hueco (undefined o null, que es en lo que JSON convierte
 * los huecos de un array disperso) deja pasar el de abajo.
 */
export function fusionar(base, encima) {
  if (encima === undefined || encima === null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(encima)) return encima;
    return base.map((elemento, i) => fusionar(elemento, encima[i]));
  }
  if (typeof base !== "object" || base === null) return encima;
  if (typeof encima !== "object" || Array.isArray(encima)) return encima;
  const salida = { ...base };
  for (const clave of Object.keys(encima)) {
    salida[clave] = clave in base ? fusionar(base[clave], encima[clave]) : encima[clave];
  }
  return salida;
}

/**
 * Superpone la capa `en` sobre el árbol español y devuelve el contenido listo
 * para pintar. Los componentes siguen leyendo `c.hero.titulo` sin enterarse.
 */
export function resolverContenido(contenido, idioma) {
  if (idioma !== "en" || !contenido || !contenido.en) return contenido;
  const { en, ...base } = contenido;
  const capa = { ...en };
  for (const clave of SIN_CAPA) delete capa[clave];
  return { ...fusionar(base, capa), en };
}

/**
 * Toma de un objeto de colección su campo traducido si existe.
 * `campoTraducido(w, "titulo", "en")` → w.tituloEn ?? w.titulo
 */
export function campoTraducido(objeto, campo, idioma) {
  if (!objeto) return undefined;
  if (idioma === "en") {
    const en = objeto[`${campo}En`];
    if (typeof en === "string" ? en.trim() !== "" : en !== undefined && en !== null) return en;
  }
  return objeto[campo];
}

/**
 * Cuántas hojas de texto del español tienen (o no) traducción inglesa.
 * Lo usa /admin para decir qué queda por traducir.
 */
export function contarTraducciones(contenido) {
  let total = 0;
  let hechas = 0;
  const recorrer = (nodo, capa) => {
    if (typeof nodo === "string") {
      total++;
      if (typeof capa === "string" && capa.trim() !== "") hechas++;
      return;
    }
    if (Array.isArray(nodo)) {
      nodo.forEach((v, i) => recorrer(v, Array.isArray(capa) ? capa[i] : undefined));
      return;
    }
    if (nodo && typeof nodo === "object") {
      for (const [k, v] of Object.entries(nodo)) {
        if (k === "en" || k === "visible" || k.endsWith("En")) continue;
        recorrer(v, capa && typeof capa === "object" ? capa[k] : undefined);
      }
    }
  };
  if (contenido) {
    const { en, ...base } = contenido;
    for (const clave of SIN_CAPA) delete base[clave];
    delete base.colorAcento;
    recorrer(base, en ?? {});
  }
  return { total, hechas, faltan: total - hechas };
}
