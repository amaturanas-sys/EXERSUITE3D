"use client";

import { useState } from "react";
import Lienzo from "./Lienzo";
import Widgets from "./Widgets";
import { elegirYSubir } from "@/lib/imagenes";

/**
 * La página de presentación. Con `editable` (desde /admin) cada texto se
 * puede pinchar y editar en el sitio, las secciones se muestran/ocultan y
 * las imágenes se suben desde la galería del dispositivo.
 *
 * OJO: T y Seccion viven a nivel de módulo (identidad estable). Definirlos
 * dentro del render remontaba TODO el subárbol en cada cambio de estado y
 * rompía el arrastre del lienzo y el foco de los textos.
 */

function T({ editable, onEdit, ruta, valor, etiqueta: Tag = "span", ...props }) {
  return editable ? (
    <Tag
      {...props}
      data-editable
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onEdit(ruta, e.currentTarget.textContent)}
    >
      {valor}
    </Tag>
  ) : (
    <Tag {...props}>{valor}</Tag>
  );
}

function Seccion({ editable, onEdit, id, visible, children }) {
  if (!editable && !visible) return null;
  return (
    <section
      className={`seccion ${editable ? "edit-seccion" : ""}`}
      style={editable && !visible ? { opacity: 0.35 } : undefined}
    >
      {editable && (
        <div className="edit-controles">
          <button onClick={() => onEdit(`${id}.visible`, !visible)}>
            {visible ? "Ocultar sección" : "Mostrar sección"}
          </button>
        </div>
      )}
      {children}
    </section>
  );
}

export default function Landing({ contenido, editable = false, onEdit = () => {}, clave = "" }) {
  const c = contenido;
  const ed = { editable, onEdit };

  return (
    <main style={{ "--accent": c.colorAcento }}>
      {/* ------------------------------------------------------------ hero */}
      <div className="contenedor">
        <div className="hero">
          <div>
            <T {...ed} ruta="hero.titulo" valor={c.hero.titulo} etiqueta="h1" />
            <T {...ed} ruta="hero.subtitulo" valor={c.hero.subtitulo} etiqueta="p" />
            {editable ? (
              <span className="boton grande">
                <T {...ed} ruta="hero.botonTexto" valor={c.hero.botonTexto} />
              </span>
            ) : (
              <a className="boton grande" href="#precio">
                {c.hero.botonTexto}
              </a>
            )}
          </div>
          <img src={c.hero.imagen} alt={c.marca} />
        </div>
      </div>

      {/* ----------------------------------------------- lienzo libre (Canva) */}
      {c.lienzo && (
        <Seccion {...ed} id="lienzo" visible={c.lienzo.visible}>
          <Lienzo
            lienzo={c.lienzo}
            editable={editable}
            clave={clave}
            onCambiar={(elementos) => onEdit("lienzo.elementos", elementos)}
          />
        </Seccion>
      )}

      {/* -------------------------------------------------- características */}
      <Seccion {...ed} id="caracteristicas" visible={c.caracteristicas.visible}>
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
      <Seccion {...ed} id="galeria" visible={c.galeria.visible}>
        <div className="contenedor">
          <T {...ed} ruta="galeria.titulo" valor={c.galeria.titulo} etiqueta="h2" />
          {editable && (
            <div className="lienzo-barra" style={{ marginBottom: 12 }}>
              <button
                onClick={async () => {
                  const url = await elegirYSubir(clave);
                  if (url) onEdit("galeria.imagenes", [...c.galeria.imagenes, url]);
                }}
              >
                + Subir foto de la galería
              </button>
              <button
                onClick={() => {
                  const url = window.prompt("URL de la imagen:");
                  if (url) onEdit("galeria.imagenes", [...c.galeria.imagenes, url.trim()]);
                }}
              >
                + Imagen por URL
              </button>
            </div>
          )}
          <div className="galeria">
            {c.galeria.imagenes.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} alt={`Captura ${i + 1}`} />
                {editable && (
                  <div className="edit-controles">
                    <button onClick={() => onEdit(`galeria.quitar`, i)}>Quitar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Seccion>

      {/* --------------------------------------------------------- historia */}
      {c.historia && (
        <Seccion {...ed} id="historia" visible={c.historia.visible}>
          <div className="contenedor historia">
            <T {...ed} ruta="historia.titulo" valor={c.historia.titulo} etiqueta="h2" />
            {c.historia.parrafos.map((p, i) => (
              <T key={i} {...ed} ruta={`historia.parrafos.${i}`} valor={p} etiqueta="p" />
            ))}
            <details className="historia-en">
              <summary>
                <T {...ed} ruta="historia.tituloEn" valor={c.historia.tituloEn} />
              </summary>
              {c.historia.parrafosEn.map((p, i) => (
                <T key={i} {...ed} ruta={`historia.parrafosEn.${i}`} valor={p} etiqueta="p" />
              ))}
            </details>
          </div>
        </Seccion>
      )}

      {/* ----------------------------------------------------------- precio */}
      <Seccion {...ed} id="precio" visible={c.precio.visible}>
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
            <BotonComprar deshabilitado={editable} texto={c.hero.botonTexto} />
            <p className="nota">
              <T {...ed} ruta="precio.notaPago" valor={c.precio.notaPago} />
            </p>
          </div>
        </div>
      </Seccion>

      {/* ---------------------------------- widgets: carruseles, tabs, vídeo */}
      {c.widgets && (editable || (c.widgets.visible && (c.widgets.lista || []).length > 0)) && (
        <Seccion {...ed} id="widgets" visible={c.widgets.visible}>
          <div className="contenedor">
            <Widgets
              widgets={c.widgets}
              editable={editable}
              clave={clave}
              onCambiar={(lista) => onEdit("widgets.lista", lista)}
            />
          </div>
        </Seccion>
      )}

      {/* ------------------------------------------------------- newsletter */}
      <Seccion {...ed} id="newsletter" visible={c.newsletter.visible}>
        <div className="contenedor" style={{ textAlign: "center" }}>
          <T {...ed} ruta="newsletter.titulo" valor={c.newsletter.titulo} etiqueta="h2" />
          <T {...ed} ruta="newsletter.texto" valor={c.newsletter.texto} etiqueta="p" className="dim" />
          <FormNewsletter deshabilitado={editable} botonTexto={c.newsletter.botonTexto} />
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

/** Botón de compra: crea la preferencia en el servidor y va a Mercado Pago. */
function BotonComprar({ deshabilitado, texto }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const comprar = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "No se pudo iniciar el pago");
      window.location.href = data.url;
    } catch (e) {
      setError(String(e.message || e));
      setCargando(false);
    }
  };

  return (
    <>
      <button className="boton grande" onClick={comprar} disabled={deshabilitado || cargando}>
        {cargando ? "Abriendo Mercado Pago…" : texto}
      </button>
      {error && <p className="aviso error">{error}</p>}
    </>
  );
}

/** Formulario del newsletter con validación en el servidor (sintaxis + MX). */
function FormNewsletter({ deshabilitado, botonTexto }) {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setEstado({ ok: res.ok, mensaje: data.mensaje || data.error });
      if (res.ok) setEmail("");
    } catch {
      setEstado({ ok: false, mensaje: "No se pudo enviar. Inténtalo de nuevo." });
    }
    setCargando(false);
  };

  return (
    <form className="news-form" onSubmit={enviar}>
      <input
        type="email"
        required
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={deshabilitado}
      />
      <button className="boton" disabled={deshabilitado || cargando}>
        {cargando ? "Comprobando…" : botonTexto}
      </button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
    </form>
  );
}
