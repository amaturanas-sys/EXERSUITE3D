"use client";

import { useEffect, useState } from "react";

/**
 * Widgets funcionales de la página: CARRUSEL de imágenes (flechas, puntos y
 * autoavance) y ACORDEÓN de pestañas desplegables (FAQ, especificaciones…).
 * En /admin se añaden, reordenan y editan en línea; el visitante los ve
 * plenamente funcionales.
 */

let _wid = 0;
const nuevoId = () => `w-${Date.now().toString(36)}-${_wid++}`;

export function nuevoCarrusel() {
  return {
    id: nuevoId(),
    tipo: "carrusel",
    titulo: "Galería destacada",
    diapositivas: [
      { imagen: "/brand/logo-full-light.png", pie: "Describe esta imagen" },
    ],
  };
}

export function nuevoAcordeon() {
  return {
    id: nuevoId(),
    tipo: "acordeon",
    titulo: "Preguntas frecuentes",
    items: [
      { titulo: "¿Cómo recibo la aplicación?", texto: "Tras el pago se muestran los enlaces de descarga para Android y Windows, válidos 48 horas y regenerables con tu nº de pago." },
      { titulo: "¿Sirve para mi dispositivo?", texto: "Android (tablet o móvil) y Windows de 64 bits." },
    ],
  };
}

export default function Widgets({ widgets, editable = false, onCambiar = () => {} }) {
  const lista = widgets.lista || [];
  const cambiar = (nueva) => onCambiar(nueva);
  const cambiarW = (id, props) =>
    cambiar(lista.map((w) => (w.id === id ? { ...w, ...props } : w)));
  const moverW = (id, delta) => {
    const i = lista.findIndex((w) => w.id === id);
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    const nueva = [...lista];
    [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    cambiar(nueva);
  };

  return (
    <div className="widgets">
      {editable && (
        <div className="lienzo-barra">
          <strong>Widgets</strong>
          <button onClick={() => cambiar([...lista, nuevoCarrusel()])}>+ Carrusel</button>
          <button onClick={() => cambiar([...lista, nuevoAcordeon()])}>+ Pestañas desplegables</button>
        </div>
      )}
      {lista.map((w) => (
        <div key={w.id} className={editable ? "widget edit-seccion" : "widget"}>
          {editable && (
            <div className="edit-controles">
              <button onClick={() => moverW(w.id, -1)}>↑</button>
              <button onClick={() => moverW(w.id, 1)}>↓</button>
              <button onClick={() => cambiar(lista.filter((x) => x.id !== w.id))}>
                Eliminar widget
              </button>
            </div>
          )}
          <Titulo
            valor={w.titulo}
            editable={editable}
            onCambiar={(t) => cambiarW(w.id, { titulo: t })}
          />
          {w.tipo === "carrusel" ? (
            <Carrusel w={w} editable={editable} onCambiar={(p) => cambiarW(w.id, p)} />
          ) : (
            <Acordeon w={w} editable={editable} onCambiar={(p) => cambiarW(w.id, p)} />
          )}
        </div>
      ))}
    </div>
  );
}

function Titulo({ valor, editable, onCambiar }) {
  return editable ? (
    <h2
      data-editable
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onCambiar(e.currentTarget.textContent)}
    >
      {valor}
    </h2>
  ) : (
    <h2>{valor}</h2>
  );
}

/* ------------------------------------------------------------- carrusel */

function Carrusel({ w, editable, onCambiar }) {
  const [i, setI] = useState(0);
  const n = w.diapositivas.length;
  const ir = (j) => setI(((j % n) + n) % n);

  // Autoavance cada 5 s (parado mientras se edita).
  useEffect(() => {
    if (editable || n < 2) return;
    const t = setInterval(() => setI((prev) => (prev + 1) % n), 5000);
    return () => clearInterval(t);
  }, [editable, n]);

  const d = w.diapositivas[Math.min(i, n - 1)] || w.diapositivas[0];

  const editarDiapo = (props) =>
    onCambiar({
      diapositivas: w.diapositivas.map((x, j) => (j === i ? { ...x, ...props } : x)),
    });

  return (
    <div className="carrusel">
      <div className="carrusel-marco">
        <img src={d.imagen} alt={d.pie || ""} />
        {n > 1 && (
          <>
            <button className="carrusel-flecha izq" onClick={() => ir(i - 1)} aria-label="Anterior">‹</button>
            <button className="carrusel-flecha der" onClick={() => ir(i + 1)} aria-label="Siguiente">›</button>
          </>
        )}
      </div>
      {(d.pie || editable) && (
        <p
          className="carrusel-pie dim"
          data-editable={editable || undefined}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => editable && editarDiapo({ pie: e.currentTarget.textContent })}
        >
          {d.pie || "(pie de foto)"}
        </p>
      )}
      <div className="carrusel-puntos">
        {w.diapositivas.map((_, j) => (
          <button
            key={j}
            className={j === i ? "activo" : ""}
            onClick={() => ir(j)}
            aria-label={`Diapositiva ${j + 1}`}
          />
        ))}
      </div>
      {editable && (
        <div className="lienzo-barra" style={{ marginTop: 8 }}>
          <button
            onClick={() => {
              const url = window.prompt("URL de la imagen:");
              if (url) {
                onCambiar({ diapositivas: [...w.diapositivas, { imagen: url.trim(), pie: "" }] });
                setI(n);
              }
            }}
          >
            + Diapositiva
          </button>
          <button
            onClick={() => {
              const url = window.prompt("Nueva URL para esta diapositiva:", d.imagen);
              if (url) editarDiapo({ imagen: url.trim() });
            }}
          >
            Cambiar imagen
          </button>
          <button
            disabled={n <= 1}
            onClick={() => {
              onCambiar({ diapositivas: w.diapositivas.filter((_, j) => j !== i) });
              setI(Math.max(0, i - 1));
            }}
          >
            Quitar diapositiva
          </button>
          <span className="dim">
            {i + 1} / {n}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- pestañas desplegables */

function Acordeon({ w, editable, onCambiar }) {
  const editarItem = (j, props) =>
    onCambiar({ items: w.items.map((x, k) => (k === j ? { ...x, ...props } : x)) });

  return (
    <div className="acordeon">
      {w.items.map((item, j) => (
        <details key={j} open={editable || undefined}>
          <summary>
            <span
              data-editable={editable || undefined}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => editable && editarItem(j, { titulo: e.currentTarget.textContent })}
            >
              {item.titulo}
            </span>
            {editable && (
              <button
                className="acordeon-quitar"
                onClick={(e) => {
                  e.preventDefault();
                  onCambiar({ items: w.items.filter((_, k) => k !== j) });
                }}
              >
                Quitar
              </button>
            )}
          </summary>
          <p
            data-editable={editable || undefined}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => editable && editarItem(j, { texto: e.currentTarget.textContent })}
          >
            {item.texto}
          </p>
        </details>
      ))}
      {editable && (
        <div className="lienzo-barra" style={{ marginTop: 8 }}>
          <button
            onClick={() =>
              onCambiar({
                items: [...w.items, { titulo: "Nueva pestaña", texto: "Contenido…" }],
              })
            }
          >
            + Pestaña
          </button>
        </div>
      )}
    </div>
  );
}
