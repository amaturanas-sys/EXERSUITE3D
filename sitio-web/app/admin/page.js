"use client";

import { useEffect, useState } from "react";
import Landing from "@/components/Landing";

/**
 * Editor visual: la MISMA página en modo editable. Pincha cualquier texto y
 * escríbelo (como en Canva); cada sección tiene su botón Mostrar/Ocultar; la
 * barra superior gestiona color de acento, precio, galería y el guardado.
 */
export default function Admin() {
  const [contenido, setContenido] = useState(null);
  const [clave, setClave] = useState("");
  const [estado, setEstado] = useState("");
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    fetch("/api/contenido")
      .then((r) => r.json())
      .then(setContenido);
  }, []);

  if (!contenido) return <p style={{ padding: 40 }}>Cargando…</p>;

  /** Aplica un cambio por ruta ("hero.titulo", "precio.incluye.2"…). */
  const editar = (ruta, valor) => {
    setContenido((prev) => {
      const nuevo = structuredClone(prev);
      if (ruta === "galeria.quitar") {
        nuevo.galeria.imagenes.splice(valor, 1);
      } else {
        const partes = ruta.split(".");
        let cursor = nuevo;
        for (const p of partes.slice(0, -1)) cursor = cursor[p];
        cursor[partes.at(-1)] = valor;
      }
      return nuevo;
    });
    setSucio(true);
    setEstado("");
  };

  const guardar = async () => {
    setEstado("Guardando…");
    const res = await fetch("/api/contenido", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": clave },
      body: JSON.stringify(contenido),
    });
    const data = await res.json();
    if (res.ok) {
      setEstado("✓ Publicado");
      setSucio(false);
    } else {
      setEstado(`Error: ${data.error}`);
    }
  };

  const anadirImagen = () => {
    const url = window.prompt("URL de la imagen (captura de la app):");
    if (url) editar("galeria.imagenes", [...contenido.galeria.imagenes, url.trim()]);
  };

  return (
    <>
      <div className="admin-barra">
        <strong>Editor</strong>
        <span className="dim">pincha cualquier texto para cambiarlo</span>
        <label>
          Acento{" "}
          <input
            type="color"
            value={contenido.colorAcento}
            onChange={(e) => editar("colorAcento", e.target.value)}
          />
        </label>
        <label>
          Precio{" "}
          <input
            type="number"
            style={{ width: 90 }}
            value={contenido.precio.monto}
            onChange={(e) => editar("precio.monto", Number(e.target.value))}
          />
        </label>
        <select
          value={contenido.precio.moneda}
          onChange={(e) => editar("precio.moneda", e.target.value)}
        >
          {["CLP", "ARS", "MXN", "COP", "PEN", "UYU", "BRL"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button className="boton secundario" onClick={anadirImagen}>
          + Imagen a la galería
        </button>
        <span style={{ flex: 1 }} />
        <input
          type="password"
          placeholder="Contraseña"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        <button className="boton" onClick={guardar} disabled={!sucio && estado === "✓ Publicado"}>
          Publicar cambios
        </button>
        {estado && <span className="dim">{estado}</span>}
      </div>
      <Landing contenido={contenido} editable onEdit={editar} />
    </>
  );
}
