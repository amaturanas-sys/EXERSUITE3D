"use client";

import { useState } from "react";

import Lienzo from "./Lienzo";
import Widgets from "./Widgets";
import Hub from "./Hub";
import { elegirYSubir } from "@/lib/imagenes";
import { campoTraducido, rutaDeIdioma } from "@/lib/i18n";
import { txt, txtApi } from "@/lib/textos";

/**
 * La página de presentación. Con `editable` (desde /admin) cada texto se
 * puede pinchar y editar en el sitio, las secciones se muestran/ocultan y
 * las imágenes se suben desde la galería del dispositivo.
 *
 * BILINGÜE: el contenido llega YA RESUELTO al idioma (lib/i18n resolverContenido),
 * así que aquí se lee `c.hero.titulo` sin enterarse de nada. Lo único que
 * depende del idioma es la ESCRITURA: en /admin, editando en inglés, T manda
 * la ruta prefijada con `en.` para no pisar el español, que es la verdad.
 *
 * OJO: T y Seccion viven a nivel de módulo (identidad estable). Definirlos
 * dentro del render remontaba TODO el subárbol en cada cambio de estado y
 * rompía el arrastre del lienzo y el foco de los textos.
 */

function T({ editable, onEdit, idiomaEdicion, ruta, valor, etiqueta: Tag = "span", ...props }) {
  if (!editable) return <Tag {...props}>{valor}</Tag>;
  return (
    <Tag
      {...props}
      data-editable
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const texto = e.currentTarget.textContent;
        // El onBlur salta SIEMPRE, haya cambio o no. Sin esta comparación,
        // entrar y salir de un texto sin tocarlo congelaría el respaldo
        // español dentro del árbol inglés.
        if (texto === valor) return;
        onEdit(rutaDeIdioma(ruta, idiomaEdicion), texto);
      }}
    >
      {valor}
    </Tag>
  );
}

function Seccion({ editable, onEdit, onFabrica, id, visible, children }) {
  if (!editable && !visible) return null;
  return (
    <section
      className={`seccion ${editable ? "edit-seccion" : ""}`}
      style={editable && !visible ? { opacity: 0.35 } : undefined}
    >
      {editable && (
        <div className="edit-controles">
          {onFabrica && (
            <button
              onClick={() => onFabrica(id)}
              title="Sustituye los textos de esta sección por los que trae la versión nueva"
            >
              Textos de fábrica
            </button>
          )}
          <button onClick={() => onEdit(`${id}.visible`, !visible)}>
            {visible ? "Ocultar sección" : "Mostrar sección"}
          </button>
        </div>
      )}
      {children}
    </section>
  );
}

/** Un elemento de galería puede ser una URL suelta (legado) o un objeto. */
function normalizarImagen(item) {
  return typeof item === "string" ? { url: item } : (item ?? {});
}

export default function Landing({
  contenido,
  idioma = "es",
  editable = false,
  onEdit = () => {},
  onFabrica = null,
  idiomaEdicion = "es",
  clave = "",
}) {
  const c = contenido;
  const ed = { editable, onEdit, idiomaEdicion };

  return (
    <main style={{ "--accent": c.colorAcento }}>
      {!editable && <Idiomas idioma={idioma} />}

      {/* ------------------------------------------------------------ hero */}
      <div className="contenedor">
        <div className="hero">
          <div>
            <T {...ed} ruta="hero.titulo" valor={c.hero.titulo} etiqueta="h1" />
            <T {...ed} ruta="hero.subtitulo" valor={c.hero.subtitulo} etiqueta="p" />
            <div className="hero-acciones">
              {editable ? (
                <span className="boton grande">
                  <T {...ed} ruta="hero.botonTexto" valor={c.hero.botonTexto} />
                </span>
              ) : (
                <a className="boton grande" href="#precio">
                  {c.hero.botonTexto}
                </a>
              )}
              {(c.hero.botonSecundario || editable) && (
                editable ? (
                  <span className="boton grande secundario">
                    <T {...ed} ruta="hero.botonSecundario" valor={c.hero.botonSecundario || "(botón 2)"} />
                  </span>
                ) : (
                  <a className="boton grande secundario" href="#galeria">
                    {c.hero.botonSecundario}
                  </a>
                )
              )}
            </div>
            {(c.hero.firma || editable) && (
              <T {...ed} ruta="hero.firma" valor={c.hero.firma || "(firma)"} etiqueta="p" className="hero-firma" />
            )}
          </div>
          <img src={c.hero.imagen} alt={c.marca} />
        </div>
      </div>

      {/* ----------------------------------------------- lienzo libre (Canva) */}
      {c.lienzo && (
        <Seccion {...ed} onFabrica={onFabrica} id="lienzo" visible={c.lienzo.visible}>
          <Lienzo
            lienzo={c.lienzo}
            idioma={idioma}
            editable={editable}
            clave={clave}
            onCambiar={(elementos) => onEdit("lienzo.elementos", elementos)}
          />
        </Seccion>
      )}

      {/* --------------------------------------------- el problema y a quién */}
      {c.paraQuien && (
        <Seccion {...ed} onFabrica={onFabrica} id="paraQuien" visible={c.paraQuien.visible}>
          <div className="contenedor">
            <T {...ed} ruta="paraQuien.titulo" valor={c.paraQuien.titulo} etiqueta="h2" />
            <T {...ed} ruta="paraQuien.problema" valor={c.paraQuien.problema} etiqueta="p" className="problema" />
            <div className="tarjetas">
              {(c.paraQuien.publico ?? []).map((item, i) => (
                <div className="tarjeta" key={i}>
                  <T {...ed} ruta={`paraQuien.publico.${i}.titulo`} valor={item.titulo} etiqueta="h3" />
                  <T {...ed} ruta={`paraQuien.publico.${i}.texto`} valor={item.texto} etiqueta="p" />
                </div>
              ))}
            </div>
          </div>
        </Seccion>
      )}

      {/* -------------------------------------------------- características */}
      <Seccion {...ed} onFabrica={onFabrica} id="caracteristicas" visible={c.caracteristicas.visible}>
        <div className="contenedor">
          <T {...ed} ruta="caracteristicas.titulo" valor={c.caracteristicas.titulo} etiqueta="h2" />
          <div className="tarjetas">
            {c.caracteristicas.items.map((item, i) => (
              <div className="tarjeta" key={i}>
                <T {...ed} ruta={`caracteristicas.items.${i}.titulo`} valor={item.titulo} etiqueta="h3" />
                <T {...ed} ruta={`caracteristicas.items.${i}.texto`} valor={item.texto} etiqueta="p" />
              </div>
            ))}
          </div>
        </div>
      </Seccion>

      {/* ---------------------------------------------------------- galería */}
      <Seccion {...ed} onFabrica={onFabrica} id="galeria" visible={c.galeria.visible}>
        <div className="contenedor" id="galeria">
          <T {...ed} ruta="galeria.titulo" valor={c.galeria.titulo} etiqueta="h2" />
          {(c.galeria.texto || editable) && (
            <T {...ed} ruta="galeria.texto" valor={c.galeria.texto || "(pie de sección)"} etiqueta="p" className="dim" />
          )}
          {editable && (
            <div className="lienzo-barra" style={{ marginBottom: 12 }}>
              <button
                onClick={async () => {
                  const url = await elegirYSubir(clave);
                  if (url) onEdit("galeria.imagenes", [...c.galeria.imagenes, { url, pie: "" }]);
                }}
              >
                + Subir foto de la galería
              </button>
              <button
                onClick={() => {
                  const url = window.prompt("URL de la imagen:");
                  if (url) onEdit("galeria.imagenes", [...c.galeria.imagenes, { url: url.trim(), pie: "" }]);
                }}
              >
                + Imagen por URL
              </button>
            </div>
          )}
          <div className="galeria">
            {c.galeria.imagenes.map((item, i) => {
              const img = normalizarImagen(item);
              // El pie viaja DENTRO del objeto (pie / pieEn) y no en la capa
              // inglesa: la galería se reordena y se borra por índice, y una
              // capa por índice acabaría poniéndole a una foto el pie de otra.
              const pie = campoTraducido(img, "pie", idioma);
              return (
                <figure key={i} className="galeria-item">
                  <img src={img.url} alt={pie || `${txt(idioma, "chrome.captura")} ${i + 1}`} />
                  {(pie || editable) && (
                    <T
                      {...ed}
                      ruta={idiomaEdicion === "en" ? `galeria.imagenes.${i}.pieEn` : `galeria.imagenes.${i}.pie`}
                      // El pie NO usa la capa `en`: se escribe en su campo hermano.
                      idiomaEdicion="es"
                      valor={pie || "(pie de foto)"}
                      etiqueta="figcaption"
                    />
                  )}
                  {editable && (
                    <div className="edit-controles">
                      <button onClick={() => onEdit(`galeria.quitar`, i)}>Quitar</button>
                    </div>
                  )}
                </figure>
              );
            })}
          </div>
        </div>
      </Seccion>

      {/* ------------------------------------------------------------- FAQ */}
      {c.faq && (
        <Seccion {...ed} onFabrica={onFabrica} id="faq" visible={c.faq.visible}>
          <div className="contenedor">
            <T {...ed} ruta="faq.titulo" valor={c.faq.titulo} etiqueta="h2" />
            <div className="acordeon faq">
              {(c.faq.items ?? []).map((item, i) => (
                <details key={i}>
                  <summary>
                    <T {...ed} ruta={`faq.items.${i}.p`} valor={item.p} />
                  </summary>
                  <T {...ed} ruta={`faq.items.${i}.r`} valor={item.r} etiqueta="p" />
                </details>
              ))}
            </div>
          </div>
        </Seccion>
      )}

      {/* ----------------------------------------------------------- precio */}
      <Seccion {...ed} onFabrica={onFabrica} id="precio" visible={c.precio.visible}>
        <div className="contenedor" id="precio">
          <div className="precio-caja">
            <T {...ed} ruta="precio.titulo" valor={c.precio.titulo} etiqueta="h2" />
            <div className="precio-monto">
              <T {...ed} ruta="precio.montoTexto" valor={c.precio.montoTexto} />
            </div>
            <ul>
              {c.precio.incluye.map((linea, i) => (
                <li key={i}>
                  <T {...ed} ruta={`precio.incluye.${i}`} valor={linea} />
                </li>
              ))}
            </ul>
            <BotonComprar deshabilitado={editable} texto={c.hero.botonTexto} idioma={idioma} />
            <p className="nota">
              <T {...ed} ruta="precio.notaPago" valor={c.precio.notaPago} />
            </p>
            {(c.precio.requisitos || editable) && (
              <T {...ed} ruta="precio.requisitos" valor={c.precio.requisitos || "(requisitos)"} etiqueta="p" className="nota" />
            )}
            {(c.precio.letraChica || editable) && (
              <T {...ed} ruta="precio.letraChica" valor={c.precio.letraChica || "(letra chica)"} etiqueta="p" className="nota letra-chica" />
            )}
          </div>
        </div>
      </Seccion>

      {/* --------------------------------------------------------- historia */}
      {c.historia && (
        <Seccion {...ed} onFabrica={onFabrica} id="historia" visible={c.historia.visible}>
          <div className="contenedor historia">
            <T {...ed} ruta="historia.titulo" valor={c.historia.titulo} etiqueta="h2" />
            {c.historia.parrafos.map((p, i) => (
              <T key={i} {...ed} ruta={`historia.parrafos.${i}`} valor={p} etiqueta="p" />
            ))}
            {(c.historia.cierre || editable) && (
              <T {...ed} ruta="historia.cierre" valor={c.historia.cierre || "(cierre)"} etiqueta="p" className="historia-cierre" />
            )}
            {/* El desplegable inglés solo tiene sentido leyendo en español:
                con el sitio en inglés la historia YA se muestra traducida. */}
            {idioma === "es" && c.historia.parrafosEn?.length > 0 && (
              <details className="historia-en">
                <summary>
                  <T {...ed} ruta="historia.tituloEn" valor={c.historia.tituloEn} idiomaEdicion="es" />
                </summary>
                {c.historia.parrafosEn.map((p, i) => (
                  <T key={i} {...ed} ruta={`historia.parrafosEn.${i}`} valor={p} idiomaEdicion="es" etiqueta="p" />
                ))}
              </details>
            )}
          </div>
        </Seccion>
      )}

      {/* --------------------------------------- el hub, versión escaparate */}
      {c.hub && (
        <Seccion {...ed} onFabrica={onFabrica} id="hub" visible={c.hub.visible}>
          <div id="hub">
            {editable ? (
              /* En el panel solo se editan los textos: el catálogo lo manda la
                 aplicación y una rejilla viva estorbaría para escribir. */
              <div className="contenedor">
                <T {...ed} ruta="hub.titulo" valor={c.hub.titulo} etiqueta="h2" />
                <T {...ed} ruta="hub.texto" valor={c.hub.texto} etiqueta="p" className="dim" />
              </div>
            ) : (
              <Hub idioma={idioma} titulo={c.hub.titulo} texto={c.hub.texto} />
            )}
          </div>
        </Seccion>
      )}

      {/* ---------------------------------- widgets: carruseles, tabs, vídeo */}
      {c.widgets && (editable || (c.widgets.visible && (c.widgets.lista || []).length > 0)) && (
        <Seccion {...ed} onFabrica={onFabrica} id="widgets" visible={c.widgets.visible}>
          <div className="contenedor">
            <Widgets
              widgets={c.widgets}
              idioma={idioma}
              editable={editable}
              clave={clave}
              onCambiar={(lista) => onEdit("widgets.lista", lista)}
            />
          </div>
        </Seccion>
      )}

      {/* ------------------------------------------------------- newsletter */}
      <Seccion {...ed} onFabrica={onFabrica} id="newsletter" visible={c.newsletter.visible}>
        <div className="contenedor" style={{ textAlign: "center" }}>
          <T {...ed} ruta="newsletter.titulo" valor={c.newsletter.titulo} etiqueta="h2" />
          <T {...ed} ruta="newsletter.texto" valor={c.newsletter.texto} etiqueta="p" className="dim" />
          <FormNewsletter
            deshabilitado={editable}
            botonTexto={c.newsletter.botonTexto}
            idioma={idioma}
          />
        </div>
      </Seccion>

      {/* -------------------------------------------------------------- pie */}
      <footer className="pie">
        <div className="contenedor">
          <T {...ed} ruta="pie.texto" valor={c.pie.texto} etiqueta="div" />
          {(c.pie.contacto || editable) && (
            <T {...ed} ruta="pie.contacto" valor={c.pie.contacto || "(contacto)"} etiqueta="div" />
          )}
          {!editable && (
            <div style={{ marginTop: 10 }}>
              {/* Acceso discreto al editor, camuflado de número de build. */}
              <a href="/admin" className="enlace-editar">
                build 2b76c-r18
              </a>
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}

/**
 * Conmutador de idioma: dos enlaces de verdad, no botones. Funcionan sin
 * JavaScript, se pueden compartir y un rastreador los sigue; el middleware
 * fija la cookie al llegar, así que la elección persiste sin tocar el cliente.
 */
function Idiomas({ idioma }) {
  return (
    <nav className="idiomas" aria-label={txt(idioma, "chrome.idioma.cambiar")}>
      <a
        href="/es"
        hrefLang="es"
        rel="alternate"
        className={idioma === "es" ? "activo" : undefined}
        aria-current={idioma === "es" ? "true" : undefined}
      >
        ES
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="/en"
        hrefLang="en"
        rel="alternate"
        className={idioma === "en" ? "activo" : undefined}
        aria-current={idioma === "en" ? "true" : undefined}
      >
        EN
      </a>
    </nav>
  );
}

/** Botón de compra: crea la preferencia en el servidor y va a Mercado Pago. */
function BotonComprar({ deshabilitado, texto, idioma }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const comprar = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "x-idioma": idioma },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.codigo ? txtApi(idioma, data.codigo) : txt(idioma, "chrome.errorPago"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(String(e.message || e));
      setCargando(false);
    }
  };

  return (
    <>
      <button className="boton grande" onClick={comprar} disabled={deshabilitado || cargando}>
        {cargando ? txt(idioma, "chrome.abriendoPago") : texto}
      </button>
      {error && <p className="aviso error">{error}</p>}
    </>
  );
}

/** Formulario del newsletter con validación en el servidor (sintaxis + MX). */
function FormNewsletter({ deshabilitado, botonTexto, idioma }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setEstado(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idioma": idioma },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // La API devuelve un CÓDIGO estable y el cliente lo traduce: si no, un
      // visitante inglés recibiría el mensaje en español justo al suscribirse.
      const mensaje = data.codigo ? txtApi(idioma, data.codigo) : data.mensaje || data.error;
      setEstado({ ok: res.ok, mensaje });
      if (res.ok) setEmail("");
    } catch {
      setEstado({ ok: false, mensaje: txt(idioma, "chrome.errorEnvio") });
    }
    setCargando(false);
  };

  return (
    <form className="news-form" onSubmit={enviar}>
      <input
        type="email"
        required
        placeholder={txt(idioma, "chrome.correo")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={deshabilitado}
      />
      <button className="boton" disabled={deshabilitado || cargando}>
        {cargando ? txt(idioma, "chrome.comprobando") : botonTexto}
      </button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
    </form>
  );
}
