"use client";

import { useEffect, useState } from "react";
import { campoTraducido } from "@/lib/i18n";
import { elegirYSubir } from "@/lib/imagenes";

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

export function nuevoVideo(url) {
  return { id: nuevoId(), tipo: "video", titulo: "Vídeo", url, pie: "" };
}

/**
 * Reconoce la URL de un vídeo y devuelve cómo incrustarlo:
 * YouTube (watch/youtu.be/shorts), Vimeo, Instagram (p/reel), TikTok,
 * Facebook y archivos de vídeo directos (.mp4/.webm).
 */
export function analizarVideo(url) {
  const u = String(url || "").trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/))) {
    return { src: `https://www.youtube.com/embed/${m[1]}`, vertical: u.includes("/shorts/") };
  }
  if ((m = u.match(/vimeo\.com\/(\d+)/))) {
    return { src: `https://player.vimeo.com/video/${m[1]}`, vertical: false };
  }
  if ((m = u.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/))) {
    return { src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, vertical: true };
  }
  if ((m = u.match(/tiktok\.com\/.*video\/(\d+)/))) {
    return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, vertical: true };
  }
  if (/facebook\.com|fb\.watch/.test(u)) {
    return {
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`,
      vertical: false,
    };
  }
  if (/\.(mp4|webm|ogv)(\?|$)/i.test(u)) {
    return { archivo: u, vertical: false };
  }
  // Último recurso: intenta incrustar la URL tal cual (no todas lo permiten).
  return u ? { src: u, vertical: false, dudoso: true } : null;
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

export default function Widgets({ widgets, idioma = "es", editable = false, clave = "", onCambiar = () => {} }) {
  // La traducción de un widget viaja DENTRO del widget (tituloEn, pieEn,
  // textoEn) y no en la capa `en` del contenido: la lista se reordena, se
  // duplica y se borra, y una capa por índice acabaría dándole a un widget
  // el texto de otro. Regla: la traducción vive donde escribe el editor.
  const campo = (obj, nombre) => campoTraducido(obj, nombre, idioma);
  const sufijo = idioma === "en" ? "En" : "";
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
          <button
            onClick={() => {
              const url = window.prompt(
                "URL del vídeo (YouTube, Shorts, Vimeo, Instagram, TikTok, Facebook o .mp4):",
              );
              if (url) cambiar([...lista, nuevoVideo(url.trim())]);
            }}
          >
            + Vídeo
          </button>
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
            valor={campo(w, "titulo")}
            editable={editable}
            onCambiar={(t) => cambiarW(w.id, { [`titulo${sufijo}`]: t })}
          />
          {w.tipo === "carrusel" && (
            <Carrusel w={w} idioma={idioma} editable={editable} clave={clave} onCambiar={(p) => cambiarW(w.id, p)} />
          )}
          {w.tipo === "acordeon" && (
            <Acordeon w={w} idioma={idioma} editable={editable} onCambiar={(p) => cambiarW(w.id, p)} />
          )}
          {w.tipo === "video" && (
            <Video w={w} idioma={idioma} editable={editable} onCambiar={(p) => cambiarW(w.id, p)} />
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

function Carrusel({ w, idioma = "es", editable, clave, onCambiar }) {
  const campo = (obj, nombre) => campoTraducido(obj, nombre, idioma);
  const sufijo = idioma === "en" ? "En" : "";
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
        <img src={d.imagen} alt={campo(d, "pie") || ""} />
        {n > 1 && (
          <>
            <button className="carrusel-flecha izq" onClick={() => ir(i - 1)} aria-label="Anterior">‹</button>
            <button className="carrusel-flecha der" onClick={() => ir(i + 1)} aria-label="Siguiente">›</button>
          </>
        )}
      </div>
      {(campo(d, "pie") || editable) && (
        <p
          className="carrusel-pie dim"
          data-editable={editable || undefined}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => editable && editarDiapo({ [`pie${sufijo}`]: e.currentTarget.textContent })}
        >
          {campo(d, "pie") || "(pie de foto)"}
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
            onClick={async () => {
              const url = await elegirYSubir(clave);
              if (url) {
                onCambiar({ diapositivas: [...w.diapositivas, { imagen: url, pie: "" }] });
                setI(n);
              }
            }}
          >
            + Foto (subir)
          </button>
          <button
            onClick={() => {
              const url = window.prompt("URL de la imagen:");
              if (url) {
                onCambiar({ diapositivas: [...w.diapositivas, { imagen: url.trim(), pie: "" }] });
                setI(n);
              }
            }}
          >
            + URL
          </button>
          <button
            onClick={async () => {
              const url = await elegirYSubir(clave);
              if (url) editarDiapo({ imagen: url });
            }}
          >
            Cambiar (subir)
          </button>
          <button
            onClick={() => {
              const url = window.prompt("Nueva URL para esta diapositiva:", d.imagen);
              if (url) editarDiapo({ imagen: url.trim() });
            }}
          >
            Cambiar (URL)
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

/* --------------------------------------------------------------- vídeo */

function Video({ w, idioma = "es", editable, onCambiar }) {
  const campo = (obj, nombre) => campoTraducido(obj, nombre, idioma);
  const sufijo = idioma === "en" ? "En" : "";
  const info = analizarVideo(w.url);

  return (
    <div className={`video ${info?.vertical ? "vertical" : ""}`}>
      {info?.archivo ? (
        <div className="video-marco">
          <video src={info.archivo} controls playsInline style={{ width: "100%", display: "block" }} />
        </div>
      ) : info?.src ? (
        <div className="video-marco">
          <iframe
            src={info.src}
            title={w.titulo || "Vídeo"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <p className="dim">Pega la URL de un vídeo para mostrarlo aquí.</p>
      )}
      {(campo(w, "pie") || editable) && (
        <p
          className="carrusel-pie dim"
          data-editable={editable || undefined}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => editable && onCambiar({ [`pie${sufijo}`]: e.currentTarget.textContent })}
        >
          {campo(w, "pie") || "(pie del vídeo)"}
        </p>
      )}
      {editable && (
        <div className="lienzo-barra" style={{ marginTop: 8 }}>
          <button
            onClick={() => {
              const url = window.prompt("Nueva URL del vídeo:", w.url);
              if (url) onCambiar({ url: url.trim() });
            }}
          >
            Cambiar vídeo
          </button>
          <span className="dim">
            {info?.dudoso
              ? "⚠ Plataforma no reconocida: se intentará incrustar tal cual"
              : w.url}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- pestañas desplegables */

function Acordeon({ w, idioma = "es", editable, onCambiar }) {
  const campo = (obj, nombre) => campoTraducido(obj, nombre, idioma);
  const sufijo = idioma === "en" ? "En" : "";
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
              onBlur={(e) => editable && editarItem(j, { [`titulo${sufijo}`]: e.currentTarget.textContent })}
            >
              {campo(item, "titulo")}
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
            onBlur={(e) => editable && editarItem(j, { [`texto${sufijo}`]: e.currentTarget.textContent })}
          >
            {campo(item, "texto")}
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
