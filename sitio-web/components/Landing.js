"use client";

import { useState } from "react";

/**
 * La página de presentación. Con `editable` (desde /admin) cada texto se
 * puede pinchar y editar en el sitio (contentEditable), las secciones se
 * muestran/ocultan y las listas admiten añadir/quitar elementos.
 * `onEdit(ruta, valor)` informa cada cambio al editor.
 */
export default function Landing({ contenido, editable = false, onEdit = () => {} }) {
  const c = contenido;

  const T = ({ ruta, valor, etiqueta: Tag = "span", ...props }) =>
    editable ? (
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

  const Seccion = ({ id, visible, children }) => {
    if (!editable && !visible) return null;
    return (
      <section className={`seccion ${editable ? "edit-seccion" : ""}`} style={editable && !visible ? { opacity: 0.35 } : undefined}>
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
  };

  return (
    <main style={{ "--accent": c.colorAcento }}>
      {/* ------------------------------------------------------------ hero */}
      <div className="contenedor">
        <div className="hero">
          <div>
            <T ruta="hero.titulo" valor={c.hero.titulo} etiqueta="h1" />
            <T ruta="hero.subtitulo" valor={c.hero.subtitulo} etiqueta="p" />
            {editable ? (
              <span className="boton grande">
                <T ruta="hero.botonTexto" valor={c.hero.botonTexto} />
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

      {/* -------------------------------------------------- características */}
      <Seccion id="caracteristicas" visible={c.caracteristicas.visible}>
        <div className="contenedor">
          <T ruta="caracteristicas.titulo" valor={c.caracteristicas.titulo} etiqueta="h2" />
          <div className="tarjetas">
            {c.caracteristicas.items.map((item, i) => (
              <div className="tarjeta" key={i}>
                <T ruta={`caracteristicas.items.${i}.titulo`} valor={item.titulo} etiqueta="h3" />
                <T ruta={`caracteristicas.items.${i}.texto`} valor={item.texto} etiqueta="p" />
              </div>
            ))}
          </div>
        </div>
      </Seccion>

      {/* ---------------------------------------------------------- galería */}
      <Seccion id="galeria" visible={c.galeria.visible}>
        <div className="contenedor">
          <T ruta="galeria.titulo" valor={c.galeria.titulo} etiqueta="h2" />
          {c.galeria.imagenes.length === 0 && editable && (
            <p className="dim">Añade URLs de capturas desde la barra del editor.</p>
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

      {/* ----------------------------------------------------------- precio */}
      <Seccion id="precio" visible={c.precio.visible}>
        <div className="contenedor" id="precio">
          <div className="precio-caja">
            <T ruta="precio.titulo" valor={c.precio.titulo} etiqueta="h2" />
            <div className="precio-monto">
              <T ruta="precio.montoTexto" valor={c.precio.montoTexto} />
            </div>
            <ul>
              {c.precio.incluye.map((linea, i) => (
                <li key={i}>
                  <T ruta={`precio.incluye.${i}`} valor={linea} />
                </li>
              ))}
            </ul>
            <BotonComprar deshabilitado={editable} texto={c.hero.botonTexto} />
            <p className="nota">
              <T ruta="precio.notaPago" valor={c.precio.notaPago} />
            </p>
          </div>
        </div>
      </Seccion>

      {/* ------------------------------------------------------- newsletter */}
      <Seccion id="newsletter" visible={c.newsletter.visible}>
        <div className="contenedor" style={{ textAlign: "center" }}>
          <T ruta="newsletter.titulo" valor={c.newsletter.titulo} etiqueta="h2" />
          <T ruta="newsletter.texto" valor={c.newsletter.texto} etiqueta="p" className="dim" />
          <FormNewsletter deshabilitado={editable} botonTexto={c.newsletter.botonTexto} />
        </div>
      </Seccion>

      {/* -------------------------------------------------------------- pie */}
      <footer className="pie">
        <div className="contenedor">
          <T ruta="pie.texto" valor={c.pie.texto} etiqueta="div" />
          {(c.pie.contacto || editable) && (
            <T ruta="pie.contacto" valor={c.pie.contacto || "(contacto)"} etiqueta="div" />
          )}
          {!editable && (
            <div style={{ marginTop: 10 }}>
              <a href="/admin" className="enlace-editar" title="Editar la página">
                ✎ editar
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
  const [estado, setEstado] = useState(null); // {ok, mensaje}
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
