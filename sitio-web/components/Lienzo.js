"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lienzo de composición libre estilo Canva: elementos de TEXTO (con fuente,
 * tamaño, color) e IMAGEN (URLs, ideal PNG con transparencia) posicionados
 * a mano, con capas (orden = z), arrastre, escalado por asa, rotación,
 * opacidad, duplicar, copiar/pegar y eliminar.
 *
 * El diseño vive en un espacio fijo de 1200 px de ancho y se escala completo
 * al ancho real del contenedor: lo que compones es EXACTAMENTE lo que se ve
 * en cualquier pantalla.
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
    texto: "Doble clic para editar",
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

export default function Lienzo({ lienzo, editable = false, onCambiar = () => {} }) {
  const cont = useRef(null);
  const [escala, setEscala] = useState(1);
  const [selId, setSelId] = useState(null);
  const [portapapeles, setPortapapeles] = useState(null);
  const drag = useRef(null); // {modo:"mover"|"escalar", id, x0, y0, ex0, ey0, w0}

  const elementos = lienzo.elementos || [];
  const sel = elementos.find((e) => e.id === selId) || null;

  // Escala del lienzo al ancho real.
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
    e.stopPropagation();
    setSelId(el.id);
    drag.current = {
      modo: "mover",
      id: el.id,
      x0: e.clientX,
      y0: e.clientY,
      ex0: el.x,
      ey0: el.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const alPulsarAsa = (e, el) => {
    e.stopPropagation();
    drag.current = { modo: "escalar", id: el.id, x0: e.clientX, w0: el.w, tam0: el.tam || 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const alMover = (e) => {
    const d = drag.current;
    if (!d) return;
    const el = elementos.find((x) => x.id === d.id);
    if (!el) return;
    if (d.modo === "mover") {
      cambiarEl(d.id, {
        x: Math.round(d.ex0 + (e.clientX - d.x0) / escala),
        y: Math.round(d.ey0 + (e.clientY - d.y0) / escala),
      });
    } else {
      const w = Math.max(24, Math.round(d.w0 + (e.clientX - d.x0) / escala));
      const props = { w };
      // El texto escala también su tamaño de letra (proporcional al ancho).
      if (el.tipo === "texto" && d.tam0) props.tam = Math.max(8, Math.round((d.tam0 * w) / d.w0));
      cambiarEl(d.id, props);
    }
  };

  const alSoltar = () => (drag.current = null);

  // Atajos: Supr borra, Ctrl+C/V copia y pega, Ctrl+D duplica.
  useEffect(() => {
    if (!editable) return;
    const alTeclar = (ev) => {
      if (ev.target.isContentEditable || /input|select|textarea/i.test(ev.target.tagName)) return;
      if (!sel) return;
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
  const anadirImagen = () => {
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
    copiar();
    if (sel) {
      const nuevo = { ...structuredClone(sel), id: nuevoId(), x: sel.x + 30, y: sel.y + 30 };
      cambiar([...elementos, nuevo]);
      setSelId(nuevo.id);
    }
  };
  /** Capas: el orden del array ES el orden de pintado (última = delante). */
  const moverCapa = (delta) => {
    if (!sel) return;
    const i = elementos.findIndex((e) => e.id === sel.id);
    const j = i + delta;
    if (j < 0 || j >= elementos.length) return;
    const nuevos = [...elementos];
    [nuevos[i], nuevos[j]] = [nuevos[j], nuevos[i]];
    cambiar(nuevos);
  };

  // ------------------------------------------------------------- plantilla
  return (
    <div>
      {editable && (
        <div className="lienzo-barra">
          <button onClick={anadirTexto}>+ Texto</button>
          <button onClick={anadirImagen}>+ Imagen</button>
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
              <button onClick={duplicar}>Duplicar</button>
              <button onClick={copiar}>Copiar</button>
              <button onClick={pegar} disabled={!portapapeles}>Pegar</button>
              <button onClick={eliminar} style={{ color: "#ef4444" }}>Eliminar</button>
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
                  <input
                    type="number"
                    style={{ width: 64 }}
                    value={sel.tam}
                    title="Tamaño (px)"
                    onChange={(e) => cambiarEl(sel.id, { tam: Number(e.target.value) })}
                  />
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
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerDown={() => editable && setSelId(null)}
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
                  }}
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onDoubleClick={(e) => editable && e.currentTarget.focus()}
                  onBlur={(e) => editable && cambiarEl(el.id, { texto: e.currentTarget.textContent })}
                >
                  {el.texto}
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
    </div>
  );
}
