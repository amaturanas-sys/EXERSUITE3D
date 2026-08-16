"use client";

import { useMemo, useState } from "react";
import datos from "../lib/hub-datos.json";

/**
 * EL HUB, VERSIÓN DE ESCAPARATE.
 *
 * La aplicación tiene el hub completo —cinco recorridos, personalización de
 * acabados, foro de proyectos—. Aquí abajo va una versión CORTA: enseñar que
 * hay marcas y equipos de verdad detrás, y dejar clara la frase que vende el
 * software, que es «esto se prueba a escala real antes de comprarlo».
 *
 * Por eso solo hay dos filtros y no seis, ninguna ficha abre un detalle, y no
 * se puede comprar nada: quien quiera entrar de verdad, se descarga la
 * aplicación. El botón de cada tarjeta lleva al precio, no a un carrito.
 *
 * EL CATÁLOGO NO SE ESCRIBE AQUÍ. Sale de `lib/hub-datos.json`, que genera
 * `pruebas/fijos/preparar-hub-sitio.py` leyendo el catálogo de la aplicación.
 * Solo pasan los productos que tienen fotografía: un escaparate público con la
 * mitad de las fichas en dibujo de relleno se ve a medio hacer.
 */

const TEXTOS = {
  es: {
    todo: "Todo el catálogo",
    estrenos: "Recién lanzados",
    nuevas: "Marcas recién llegadas",
    cerca: "Talleres que fabrican cerca",
    cuenta: (n, t) => `${n} de ${t} equipos`,
    marca: "Marca",
    quitar: "Quitar filtro",
    ver: "Probarlo en 3D",
    oferta: "antes",
    vacio: "No hay equipos con ese filtro.",
  },
  en: {
    todo: "Whole catalog",
    estrenos: "Just launched",
    nuevas: "Brands that just joined",
    cerca: "Workshops that build nearby",
    cuenta: (n, t) => `${n} of ${t} items`,
    marca: "Brand",
    quitar: "Clear filter",
    ver: "Try it in 3D",
    oferta: "was",
    vacio: "No items match that filter.",
  },
};

/** El disco de pesa de la marca: el mismo dibujo que usa la aplicación. */
function DiscoDefs() {
  return (
    <svg className="hub-defs" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="hub-disco-pesa" viewBox="0 0 100 100">
          <path id="hub-arco-sup" d="M 17,50 A 33,33 0 0 1 83,50" fill="none" />
          <path id="hub-arco-inf" d="M 17,50 A 33,33 0 0 0 83,50" fill="none" />
          <mask id="hub-disco-mascara">
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="48" fill="#fff" />
            <circle cx="50" cy="50" r="43" fill="none" stroke="#000" strokeWidth="2.4" />
            <g stroke="#000" strokeWidth="4.6">
              <line x1="61.31" y1="38.69" x2="78.28" y2="21.72" />
              <line x1="38.69" y1="38.69" x2="21.72" y2="21.72" />
              <line x1="38.69" y1="61.31" x2="21.72" y2="78.28" />
              <line x1="61.31" y1="61.31" x2="78.28" y2="78.28" />
            </g>
            <circle cx="50" cy="50" r="15" fill="none" stroke="#000" strokeWidth="2.6" />
            <circle cx="50" cy="50" r="7.2" fill="#000" />
            <g fill="#000" fontWeight="700" textAnchor="middle">
              <text fontSize="10" letterSpacing="0.2">
                <textPath href="#hub-arco-sup" startOffset="50%">BARBEL</textPath>
              </text>
              <text fontSize="7.6">
                <textPath href="#hub-arco-inf" startOffset="50%">STANDARD</textPath>
              </text>
              <text x="29" y="48" fontSize="9">45</text>
              <text x="29" y="57" fontSize="9">LBS</text>
              <text x="71" y="48" fontSize="9">45</text>
              <text x="71" y="57" fontSize="9">LBS</text>
            </g>
          </mask>
          <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#hub-disco-mascara)" />
        </symbol>
      </defs>
    </svg>
  );
}

function Discos({ n }) {
  return (
    <div className="hub-discos" role="img" aria-label={`${n}/5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < n ? "hub-disco lleno" : "hub-disco"}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <use href="#hub-disco-pesa" />
          </svg>
        </span>
      ))}
      <span className="hub-nota">{n}/5</span>
    </div>
  );
}

export default function Hub({ idioma = "es", titulo, texto }) {
  const t = TEXTOS[idioma] ?? TEXTOS.es;
  const [recorrido, setRecorrido] = useState("todo");
  const [marcaId, setMarcaId] = useState("");

  const porId = useMemo(
    () => Object.fromEntries(datos.marcas.map((m) => [m.id, m])),
    [],
  );

  const RECORRIDOS = [
    { id: "todo", etiqueta: t.todo, pasa: () => true },
    { id: "estrenos", etiqueta: t.estrenos, pasa: (p) => p.dias <= 90 },
    { id: "nuevas", etiqueta: t.nuevas, pasa: (p) => porId[p.marcaId]?.meses <= 4 },
    { id: "cerca", etiqueta: t.cerca, pasa: (p) => porId[p.marcaId]?.pyme },
  ];

  const visibles = useMemo(() => {
    const r = RECORRIDOS.find((x) => x.id === recorrido) ?? RECORRIDOS[0];
    return datos.productos.filter((p) => r.pasa(p) && (!marcaId || p.marcaId === marcaId));
  }, [recorrido, marcaId, porId]);

  /**
   * El precio se agrupa A MANO y no con `toLocaleString`.
   *
   * Esto lo pinta el servidor y lo vuelve a pintar el navegador, y los dos no
   * tienen por qué traer los mismos datos de idioma: Node puede escribir
   * «1,690» donde el navegador escribe «1.690». React lo ve como una página
   * distinta, tira la hidratación entera (error #423) y la sección se queda sin
   * oyentes: los filtros dejan de responder sin dar la cara. Agrupando con una
   * expresión regular, servidor y navegador escriben siempre lo mismo.
   */
  const precio = (n) => {
    const sep = idioma === "en" ? "," : ".";
    return `$ ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep)}`;
  };

  return (
    <div className="contenedor hub-sitio">
      <DiscoDefs />

      <h2>{titulo}</h2>
      <p className="dim hub-bajada">{texto}</p>

      {/* Las marcas. Pulsar una filtra; volver a pulsarla lo deshace. */}
      <div className="hub-marcas">
        {datos.marcas.map((m) => (
          <button
            key={m.id}
            type="button"
            className={marcaId === m.id ? "hub-marca activa" : "hub-marca"}
            onClick={() => setMarcaId(marcaId === m.id ? "" : m.id)}
            title={m.nombre}
          >
            <span className={m.meses <= 4 ? "hub-aro nuevo" : "hub-aro"}>
              <img src={`/marketplace/marcas/${m.logo}`} alt="" draggable="false" />
            </span>
            <span className="hub-marca-txt">{m.corto}</span>
          </button>
        ))}
      </div>

      {/* Los recorridos, reducidos a los tres que son un corte del catálogo. */}
      <div className="hub-chips">
        {RECORRIDOS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={recorrido === r.id ? "hub-chip activa" : "hub-chip"}
            onClick={() => setRecorrido(r.id)}
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      <p className="hub-cuenta">
        {t.cuenta(visibles.length, datos.productos.length)}
        {marcaId && (
          <button type="button" className="hub-marbete" onClick={() => setMarcaId("")}>
            {porId[marcaId]?.corto} ✕
          </button>
        )}
      </p>

      {visibles.length === 0 ? (
        <p className="dim">{t.vacio}</p>
      ) : (
        <div className="hub-rejilla">
          {visibles.map((p) => {
            const m = porId[p.marcaId];
            const pais = datos.paises[m?.pais];
            return (
              <article key={p.id} className="hub-card">
                <img
                  className="hub-card-foto"
                  src={`/marketplace/${p.foto}`}
                  alt={idioma === "en" ? p.en : p.es}
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
                <div className="hub-card-cuerpo">
                  <h3>{idioma === "en" ? p.en : p.es}</h3>
                  <p className="hub-card-marca">
                    {m?.nombre}
                    {pais && <span className="hub-card-pais"> · {pais.bandera}</span>}
                  </p>
                  <p className="hub-card-nota dim">{idioma === "en" ? p.notaEn : p.notaEs}</p>
                  <div className="hub-card-pie">
                    <span className="hub-precio">
                      {precio(p.precio)}
                      {p.antes > 0 && (
                        <span className="hub-antes">
                          {t.oferta} {precio(p.antes)}
                        </span>
                      )}
                    </span>
                    <Discos n={p.discos} />
                  </div>
                  {/* Secundario a propósito: el botón que manda en la página es el
                      de comprar, y quince tarjetas en color de acento se lo comerían. */}
                  <a className="boton secundario hub-card-boton" href="#precio">
                    {t.ver}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
