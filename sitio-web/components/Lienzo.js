"use client";

import { useEffect, useRef, useState } from "react";
import { campoTraducido } from "@/lib/i18n";
import { elegirYSubir } from "@/lib/imagenes";

/**
 * Lienzo de composición libre estilo Canva.
 *
 * Modelo de interacción (pensado para táctil):
 *  - Un toque selecciona; arrastrar MUEVE el elemento (también los textos).
 *  - El texto se escribe con DOBLE toque o con el botón "Escribir" de la
 *    barra; al salir (blur) vuelve a ser arrastrable.
 *  - Asa grande en la esquina para escalar; X/Y/Ancho numéricos en la barra
 *    para precisión; flechas del teclado mueven 1 px (con Shift, 10 px).
 *  - Capas por orden de pintado; duplicar/copiar/pegar/eliminar.
 */

export const ANCHO_DISENO = 1200;

export const FUENTES = [
  ["Sistema", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"],
  ["Serif", "Georgia, 'Times New Roman', serif"],
  ["Elegante", "'Palatino Linotype', Palatino, serif"],
  ["Monoespaciada", "ui-monospace, Consolas, 'Roboto Mono', monospace"],
  ["Condensada", "'Arial Narrow', 'Roboto Condensed', sans-serif"],
  ["Impacto", "Impact, 'Arial Black', sans-serif"],
  ["Manuscrita", "'Segoe Script', 'Comic Sans MS', cursive"],
];

let _id = 0;
const nuevoId = () => `el-${Date.now().toString(36)}-${_id++}`;

export function nuevoTexto() {
  return {
    id: nuevoId(),
    tipo: "texto",
    texto: "Tu texto aquí",
    x: 400,
    y: 160,
    w: 400,
    fuente: FUENTES[0][1],
    tam: 42,
    color: "#e6e8ec",
    negrita: true,
    rot: 0,
    opacidad: 1,
  };
}

export function nuevaImagen(url) {
  return { id: nuevoId(), tipo: "imagen", url, x: 450, y: 120, w: 300, rot: 0, opacidad: 1 };
}

export default function Lienzo({ lienzo, idioma = "es", editable = false, clave = "", onCambiar = () => {} }) {
  // Igual que en los widgets: la traducción de un elemento va DENTRO del
  // elemento (textoEn), porque el lienzo se duplica, se reordena y se borra.
  const campo = (obj, nombre) => campoTraducido(obj, nombre, idioma);
  const sufijo = idioma === "en" ? "En" : "";
  const cont = useRef(null);
  const [escala, setEscala] = useState(1);
  const [selId, setSelId] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState(null);
  const [portapapeles, setPortapapeles] = useState(null);
  const drag = useRef(null);

  const elementos = lienzo.elementos || [];
  const sel = elementos.find((e) => e.id === selId) || null;

  // Escala del lienzo al ancho real del contenedor.
  useEffect(() => {
    const medir = () => {
      if (cont.current) setEscala(cont.current.clientWidth / ANCHO_DISENO);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (cont.current) ro.observe(cont.current);
    return () => ro.disconnect();
  }, []);

  const cambiar = (nuevos) => onCambiar(nuevos);
  const cambiarEl = (id, props) =>
    cambiar(elementos.map((e) => (e.id === id ? { ...e, ...props } : e)));

  // ------------------------------------------------------------ interacción
  const alPulsar = (e, el) => {
    if (!editable) return;
    if (editandoTexto === el.id) return; // escribiendo: deja trabajar al cursor
    e.stopPropagation();
    e.preventDefault();
    setSelId(el.id);
    if (editandoTexto) setEditandoTexto(null);
    drag.current = {
      modo: "mover",
      id: el.id,
      x0: e.clientX,
      y0: e.clientY,
      ex0: el.x,
      ey0: el.y,
    };
  };

  const alPulsarAsa = (e, el) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = { modo: "escalar", id: el.id, x0: e.clientX, w0: el.w, tam0: el.tam || 0 };
  };

  // Los movimientos se escuchan en window: el arrastre no se pierde aunque
  // el puntero salga del lienzo o el elemento se vuelva a renderizar.
  useEffect(() => {
    if (!editable) return;
    const mover = (e) => {
      const d = drag.current;
      if (!d) return;
      e.preventDefault();
      const els = elementosRef.current;
      const el = els.find((x) => x.id === d.id);
      if (!el) return;
      if (d.modo === "mover") {
        cambiar(
          els.map((x) =>
            x.id === d.id
              ? {
                  ...x,
                  x: Math.round(d.ex0 + (e.clientX - d.x0) / escalaRef.current),
                  y: Math.round(d.ey0 + (e.clientY - d.y0) / escalaRef.current),
                }
              : x,
          ),
        );
      } else {
        const w = Math.max(24, Math.round(d.w0 + (e.clientX - d.x0) / escalaRef.current));
        const props = { w };
        if (el.tipo === "texto" && d.tam0) props.tam = Math.max(8, Math.round((d.tam0 * w) / d.w0));
        cambiar(els.map((x) => (x.id === d.id ? { ...x, ...props } : x)));
      }
    };
    const soltar = () => (drag.current = null);
    window.addEventListener("pointermove", mover, { passive: false });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // Refs vivas para el manejador global (evita listeners obsoletos).
  const elementosRef = useRef(elementos);
  elementosRef.current = elementos;
  const escalaRef = useRef(escala);
  escalaRef.current = escala;

  // Atajos: flechas mueven (Shift ×10), Supr borra, Ctrl+C/V/D.
  useEffect(() => {
    if (!editable) return;
    const alTeclar = (ev) => {
      if (ev.target.isContentEditable || /input|select|textarea/i.test(ev.target.tagName)) return;
      if (!sel) return;
      const paso = ev.shiftKey ? 10 : 1;
      const flechas = {
        ArrowLeft: { x: sel.x - paso },
        ArrowRight: { x: sel.x + paso },
        ArrowUp: { y: sel.y - paso },
        ArrowDown: { y: sel.y + paso },
      };
      if (flechas[ev.key]) {
        ev.preventDefault();
        cambiarEl(sel.id, flechas[ev.key]);
        return;
      }
      if (ev.key === "Delete" || ev.key === "Backspace") eliminar();
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "c") copiar();
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "v") pegar();
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        duplicar();
      }
    };
    window.addEventListener("keydown", alTeclar);
    return () => window.removeEventListener("keydown", alTeclar);
  });

  // ----------------------------------------------------------- operaciones
  const anadirTexto = () => {
    const t = nuevoTexto();
    cambiar([...elementos, t]);
    setSelId(t.id);
  };
  const anadirImagenSubida = async () => {
    const url = await elegirYSubir(clave);
    if (!url) return;
    const im = nuevaImagen(url);
    cambiar([...elementos, im]);
    setSelId(im.id);
  };
  const anadirImagenUrl = () => {
    const url = window.prompt("URL de la imagen (PNG con transparencia, JPG…):");
    if (!url) return;
    const im = nuevaImagen(url.trim());
    cambiar([...elementos, im]);
    setSelId(im.id);
  };
  const eliminar = () => {
    if (!sel) return;
    cambiar(elementos.filter((e) => e.id !== sel.id));
    setSelId(null);
  };
  const copiar = () => sel && setPortapapeles(structuredClone(sel));
  const pegar = () => {
    if (!portapapeles) return;
    const nuevo = { ...structuredClone(portapapeles), id: nuevoId() };
    nuevo.x += 30;
    nuevo.y += 30;
    cambiar([...elementos, nuevo]);
    setSelId(nuevo.id);
  };
  const duplicar = () => {
    if (!sel) return;
    setPortapapeles(structuredClone(sel));
    const nuevo = { ...structuredClone(sel), id: nuevoId(), x: sel.x + 30, y: sel.y + 30 };
    cambiar([...elementos, nuevo]);
    setSelId(nuevo.id);
  };
  const moverCapa = (delta) => {
    if (!sel) return;
    const i = elementos.findIndex((e) => e.id === sel.id);
    const j = i + delta;
    if (j < 0 || j >= elementos.length) return;
    const nuevos = [...elementos];
    [nuevos[i], nuevos[j]] = [nuevos[j], nuevos[i]];
    cambiar(nuevos);
  };

  const num = (valor, props) => (
    <input
      type="number"
      style={{ width: 74 }}
      value={valor}
      onChange={(e) => sel && cambiarEl(sel.id, props(Number(e.target.value)))}
    />
  );

  // ------------------------------------------------------------- plantilla
  return (
    <div>
      {editable && (
        <div className="lienzo-barra">
          <button onClick={anadirTexto}>+ Texto</button>
          <button onClick={anadirImagenSubida}>+ Foto (subir)</button>
          <button onClick={anadirImagenUrl}>+ URL</button>
          <select
            value={selId ?? ""}
            onChange={(e) => setSelId(e.target.value || null)}
            title="Capas (de atrás a delante)"
          >
            <option value="">— capas —</option>
            {elementos.map((e, i) => (
              <option key={e.id} value={e.id}>
                {i + 1}. {e.tipo === "texto" ? `“${(e.texto || "").slice(0, 18)}”` : "imagen"}
              </option>
            ))}
          </select>
          {sel && (
            <>
              <button onClick={() => moverCapa(1)} title="Traer hacia delante">▲ capa</button>
              <button onClick={() => moverCapa(-1)} title="Enviar hacia atrás">▼ capa</button>
              {sel.tipo === "texto" && (
                <button onClick={() => setEditandoTexto(sel.id)}>✎ Escribir</button>
              )}
              <button onClick={duplicar}>Duplicar</button>
              <button onClick={copiar}>Copiar</button>
              <button onClick={pegar} disabled={!portapapeles}>Pegar</button>
              <button onClick={eliminar} style={{ color: "#ef4444" }}>Eliminar</button>
              <label>X {num(sel.x, (v) => ({ x: v }))}</label>
              <label>Y {num(sel.y, (v) => ({ y: v }))}</label>
              <label>Ancho {num(sel.w, (v) => ({ w: Math.max(24, v) }))}</label>
              {sel.tipo === "texto" && (
                <>
                  <select
                    value={sel.fuente}
                    onChange={(e) => cambiarEl(sel.id, { fuente: e.target.value })}
                  >
                    {FUENTES.map(([nombre, css]) => (
                      <option key={nombre} value={css}>{nombre}</option>
                    ))}
                  </select>
                  <label>Tam {num(sel.tam, (v) => ({ tam: Math.max(8, v) }))}</label>
                  <input
                    type="color"
                    value={sel.color}
                    onChange={(e) => cambiarEl(sel.id, { color: e.target.value })}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={!!sel.negrita}
                      onChange={(e) => cambiarEl(sel.id, { negrita: e.target.checked })}
                    />
                    Negrita
                  </label>
                </>
              )}
              <label>
                Giro
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={sel.rot || 0}
                  onChange={(e) => cambiarEl(sel.id, { rot: Number(e.target.value) })}
                />
              </label>
              <label>
                Opacidad
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={sel.opacidad ?? 1}
                  onChange={(e) => cambiarEl(sel.id, { opacidad: Number(e.target.value) })}
                />
              </label>
            </>
          )}
        </div>
      )}

      <div
        ref={cont}
        className={`lienzo ${editable ? "editando" : ""}`}
        style={{ height: (lienzo.altura || 420) * escala }}
        onPointerDown={() => {
          if (editable) {
            setSelId(null);
            setEditandoTexto(null);
          }
        }}
      >
        <div
          className="lienzo-espacio"
          style={{ width: ANCHO_DISENO, height: lienzo.altura || 420, transform: `scale(${escala})` }}
        >
          {elementos.map((el) => (
            <div
              key={el.id}
              className={`lienzo-el ${editable && el.id === selId ? "sel" : ""}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                transform: `rotate(${el.rot || 0}deg)`,
                opacity: el.opacidad ?? 1,
                zIndex: elementos.indexOf(el) + 1,
              }}
              onPointerDown={(e) => alPulsar(e, el)}
              onDoubleClick={(e) => {
                if (editable && el.tipo === "texto") {
                  e.stopPropagation();
                  setSelId(el.id);
                  setEditandoTexto(el.id);
                }
              }}
            >
              {el.tipo === "texto" ? (
                <div
                  style={{
                    fontFamily: el.fuente,
                    fontSize: el.tam,
                    color: el.color,
                    fontWeight: el.negrita ? 700 : 400,
                    lineHeight: 1.2,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    cursor: editandoTexto === el.id ? "text" : undefined,
                  }}
                  contentEditable={editable && editandoTexto === el.id}
                  suppressContentEditableWarning
                  ref={(nodo) => {
                    if (nodo && editable && editandoTexto === el.id) nodo.focus();
                  }}
                  onBlur={(e) => {
                    if (!editable) return;
                    cambiarEl(el.id, { [`texto${sufijo}`]: e.currentTarget.textContent });
                    setEditandoTexto(null);
                  }}
                >
                  {campo(el, "texto")}
                </div>
              ) : (
                <img src={el.url} alt="" draggable={false} style={{ width: "100%", display: "block" }} />
              )}
              {editable && el.id === selId && (
                <div className="lienzo-asa" onPointerDown={(e) => alPulsarAsa(e, el)} />
              )}
            </div>
          ))}
        </div>
      </div>
      {editable && (
        <p className="dim" style={{ fontSize: "0.85rem", marginTop: 6 }}>
          Un toque selecciona y arrastra · doble toque (o "✎ Escribir") edita el texto ·
          flechas del teclado mueven 1 px (Shift ×10)
        </p>
      )}
    </div>
  );
}
