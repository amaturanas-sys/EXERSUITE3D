// El caso real del propietario: YA publicó contenido desde /admin, así que en
// Redis hay un árbol español COMPLETO con el esquema viejo. Hay que comprobar
// que (a) lo suyo manda, (b) las secciones NUEVAS aparecen igual, (c) la
// historia inglesa que ya existía siembra la capa `en`, y (d) los arrays se
// solapan por índice sin perder elementos.
import { fusionar, resolverContenido, escribirRuta, contarTraducciones,
         idiomaDeAcceptLanguage } from "../sitio-web/lib/i18n.js";

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// ── El contenido de fábrica NUEVO (simplificado a lo que importa)
const FABRICA = {
  marca: "EXERSUITE3D",
  hero: { visible: true, titulo: "Título nuevo", subtitulo: "Sub nuevo", firma: "Firma", botonTexto: "Comprar", botonSecundario: "Ver" },
  paraQuien: { visible: true, titulo: "El problema", publico: [{ titulo: "A", texto: "a" }] },
  faq: { visible: true, titulo: "Preguntas", items: [{ p: "p1", r: "r1" }] },
  precio: { visible: true, titulo: "Licencia personal", monto: 9990, moneda: "CLP", montoTexto: "$9.990 CLP",
            incluye: ["uno", "dos", "tres", "cuatro"], notaPago: "Mercado Pago", requisitos: "Android…" },
  historia: { visible: true, titulo: "Nuestra historia", parrafos: ["p1", "p2"], parrafosEn: ["e1", "e2"] },
  en: { hero: { titulo: "New title", subtitulo: "New sub" }, faq: { titulo: "Questions" } },
};

// ── Lo que el propietario tiene HOY publicado en Redis (esquema viejo)
const GUARDADO = {
  marca: "EXERSUITE3D",
  colorAcento: "#c8102e",
  hero: { visible: true, titulo: "MI título de siempre", subtitulo: "Mi subtítulo",
          imagen: "/brand/logo-full-light.png", botonTexto: "Comprar y descargar" },
  precio: { visible: true, titulo: "Licencia personal", monto: 12990, moneda: "CLP",
            montoTexto: "$12.990 CLP", incluye: ["mi línea 1", "mi línea 2"], notaPago: "Pago seguro." },
  historia: { visible: true, titulo: "Nuestra historia", parrafos: ["mío 1", "mío 2"],
              tituloEn: "Read our story in English", parrafosEn: ["mine 1", "mine 2"] },
};

const fusionado = fusionar(FABRICA, GUARDADO);

ok(fusionado.hero.titulo === "MI título de siempre", "lo que el propietario escribió MANDA sobre el texto de fábrica");
ok(fusionado.precio.monto === 12990, `su precio se conserva (${fusionado.precio.monto})`);
ok(fusionado.colorAcento === "#c8102e", "y su color de acento");
ok(fusionado.paraQuien?.titulo === "El problema", "las secciones NUEVAS aparecen (paraQuien)");
ok(fusionado.faq?.items?.length === 1, "y la de preguntas frecuentes también");
ok(fusionado.hero.firma === "Firma" && fusionado.hero.botonSecundario === "Ver",
  "los campos nuevos DENTRO de una sección que él ya tenía también llegan (firma, botón 2)");
ok(fusionado.precio.requisitos === "Android…", "y los campos nuevos del precio");
ok(fusionado.hero.imagen === "/brand/logo-full-light.png", "su imagen de portada no se toca");

// Arrays: lo suyo manda por índice, sin perder los de fábrica que sobran
ok(fusionado.precio.incluye.length === 4, `los arrays se solapan por índice sin acortarse (${fusionado.precio.incluye.length})`);
ok(fusionado.precio.incluye[0] === "mi línea 1" && fusionado.precio.incluye[3] === "cuatro",
  `lo suyo delante, el resto de fábrica: [${fusionado.precio.incluye.join(" | ")}]`);

// ── Resolución al inglés
const en = resolverContenido(fusionado, "en");
ok(en.hero.titulo === "New title", "en inglés se sirve la traducción cuando existe");
ok(en.hero.subtitulo === "New sub", "y también la del subtítulo");
ok(en.precio.montoTexto === "$12.990 CLP", "lo que NO está traducido cae al español (el precio se respeta)");
ok(en.precio.titulo === "Licencia personal", "una sección sin capa inglesa se sirve entera en español");
const es = resolverContenido(fusionado, "es");
ok(es.hero.titulo === "MI título de siempre", "en español no se toca nada");

// ── Escritura de rutas creando lo que falta
const destino = structuredClone(GUARDADO);
escribirRuta(destino, "en.hero.titulo", "Traducido");
ok(destino.en.hero.titulo === "Traducido", "escribir en.hero.titulo crea la capa que no existía");
escribirRuta(destino, "en.precio.incluye.2", "third");
ok(Array.isArray(destino.en.precio.incluye) && destino.en.precio.incluye[2] === "third",
  "una ruta con índice crea un ARRAY, no un objeto con clave '2'");
ok(destino.hero.titulo === "MI título de siempre", "y el español no se ha tocado");

// ── Detección de idioma
ok(idiomaDeAcceptLanguage("en-US,en;q=0.9,es;q=0.8") === "en", "Accept-Language: en-US → inglés");
ok(idiomaDeAcceptLanguage("es-CL,es;q=0.9,en;q=0.8") === "es", "Accept-Language: es-CL → español");
ok(idiomaDeAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.7") === "en", "francés con inglés de respaldo → inglés");
ok(idiomaDeAcceptLanguage("de-DE") === null, "un idioma que no servimos no decide nada (cae al defecto)");
ok(idiomaDeAcceptLanguage("es;q=0.2,en;q=0.9") === "en", "se respeta el factor q, no el orden de escritura");

// ── Contador de traducciones
const cuenta = contarTraducciones(fusionado);
ok(cuenta.total > 0 && cuenta.hechas >= 2 && cuenta.faltan === cuenta.total - cuenta.hechas,
  `el contador de /admin cuadra (${cuenta.hechas}/${cuenta.total}, faltan ${cuenta.faltan})`);

console.log(fallos.length ? "\n❌ " + fallos.join(" · ") : "\n✅ todo correcto");
process.exit(fallos.length ? 1 : 0);
