"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Landing from "@/components/Landing";
import { contarTraducciones, escribirRuta, resolverContenido } from "@/lib/i18n";

/**
 * Editor visual: la MISMA página en modo editable. Pincha cualquier texto y
 * escríbelo (como en Canva); cada sección tiene su botón Mostrar/Ocultar; la
 * barra superior gestiona idioma de edición, color de acento, precio, galería
 * y el guardado.
 *
 * El panel se queda en español a propósito: no es una interfaz de cara al
 * público, y traducirlo obligaría a mantener dos versiones de las etiquetas
 * de administración sin que nadie lo agradezca.
 */
export default function Admin() {
  // TODOS los hooks, arriba del return temprano: el orden de los hooks no
  // puede variar entre renders.
  const [contenido, setContenido] = useState(null);
  const [clave, setClave] = useState("");
  const [estado, setEstado] = useState("");
  const [sucio, setSucio] = useState(false);
  const [idiomaEdicion, setIdiomaEdicion] = useState("es");
  const [fabrica, setFabrica] = useState(null);

  useEffect(() => {
    fetch("/api/contenido")
      .then((r) => r.json())
      .then((data) => {
        setContenido(data.contenido ?? data);
        setFabrica(data.fabrica ?? null);
      });
  }, []);

  /**
   * Aplica un cambio por ruta ("hero.titulo", "en.precio.incluye.2"…).
   *
   * Escribe creando lo que falte por el camino: la clave `en` no existe en el
   * contenido ya publicado, así que el recorrido ingenuo reventaba con
   * «Cannot set properties of undefined» en la primera traducción.
   *
   * El idioma NO entra aquí: lo resuelve el componente T y llega con la ruta
   * ya prefijada. Si entrara, este useCallback con deps [] se quedaría con el
   * idioma del primer render para siempre.
   */
  const editar = useCallback((ruta, valor) => {
    setContenido((prev) => {
      const nuevo = structuredClone(prev);
      if (ruta === "galeria.quitar") nuevo.galeria.imagenes.splice(valor, 1);
      else escribirRuta(nuevo, ruta, valor);
      return nuevo;
    });
    setSucio(true);
    setEstado("");
  }, []);

  /** Trae los textos de fábrica de UNA sección, conservando si está visible. */
  const traerDeFabrica = useCallback(
    (seccion) => {
      if (!fabrica?.[seccion]) {
        setEstado(`La sección "${seccion}" no tiene textos de fábrica.`);
        return;
      }
      if (
        !window.confirm(
          `Se sustituyen los textos de "${seccion}" por los de la versión nueva.\n` +
            "Lo que hayas escrito en esa sección se pierde. ¿Seguimos?",
        )
      ) {
        return;
      }
      setContenido((prev) => {
        const nuevo = structuredClone(prev);
        const visible = nuevo[seccion]?.visible;
        nuevo[seccion] = structuredClone(fabrica[seccion]);
        if (visible !== undefined) nuevo[seccion].visible = visible;
        if (fabrica.en?.[seccion]) {
          nuevo.en = nuevo.en ?? {};
          nuevo.en[seccion] = structuredClone(fabrica.en[seccion]);
        }
        return nuevo;
      });
      setSucio(true);
      setEstado(`Sección "${seccion}" traída de fábrica. Recuerda publicar.`);
    },
    [fabrica],
  );

  const traduccion = useMemo(() => contarTraducciones(contenido), [contenido]);

  if (!contenido) return <p style={{ padding: 40 }}>Cargando…</p>;

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

  return (
    <>
      <div className="admin-barra">
        <strong>Editor</strong>
        <span className="dim">pincha cualquier texto para cambiarlo</span>
        <div className="admin-idiomas">
          {[
            ["es", "Español"],
            ["en", "English"],
          ].map(([id, etiqueta]) => (
            <button
              key={id}
              className={idiomaEdicion === id ? "activo" : undefined}
              onClick={() => setIdiomaEdicion(id)}
              title={
                id === "es"
                  ? "Editas el texto original. Es el que se sirve cuando no hay traducción."
                  : "Editas la traducción inglesa. Lo que dejes en blanco se sirve en español."
              }
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {idiomaEdicion === "en" && (
          <span className="dim" title="Hojas de texto con traducción inglesa">
            {traduccion.hechas}/{traduccion.total} traducidas
            {traduccion.faltan > 0 ? ` · faltan ${traduccion.faltan}` : " · completo"}
          </span>
        )}
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
      {idiomaEdicion === "en" && (
        <div className="admin-aviso">
          Estás editando la versión <strong>en inglés</strong>. Los textos que veas en español son el
          respaldo: escríbelos encima para traducirlos y déjalos como están para que se sirvan tal cual.
        </div>
      )}
      <Landing
        contenido={vistaPrevia(contenido, idiomaEdicion)}
        idioma={idiomaEdicion}
        editable
        onEdit={editar}
        onFabrica={fabrica ? traerDeFabrica : null}
        idiomaEdicion={idiomaEdicion}
        clave={clave}
      />
    </>
  );
}

/**
 * Lo que se ve mientras se edita. En inglés se superpone la capa `en` igual
 * que en producción, para editar viendo el resultado real; la escritura sigue
 * yendo a `en.<ruta>` porque la ruta la prefija el componente T.
 */
function vistaPrevia(contenido, idiomaEdicion) {
  return idiomaEdicion === "en" ? resolverContenido(contenido, "en") : contenido;
}
