/**
 * Guardado y apertura de archivos con el GESTOR NATIVO de cada plataforma,
 * eligiendo siempre el usuario dónde buscar y dónde guardar:
 *
 * - APK Android (Capacitor): plugin propio «Archivos» sobre el Storage
 *   Access Framework — "Guardar como…" (ACTION_CREATE_DOCUMENT) y "Abrir
 *   documento" (ACTION_OPEN_DOCUMENT) de la app Archivos del sistema, con
 *   navegación libre (Descargas, SD, Drive…). Si el binario es antiguo y no
 *   trae el plugin, se cae al flujo clásico (Documentos/EXERSUITE3D o la
 *   hoja de compartir).
 * - Web y Windows (Tauri/WebView2): File System Access API
 *   (showSaveFilePicker / showOpenFilePicker) — los diálogos nativos del
 *   sistema operativo. Si el navegador no la trae, ancla con blob e
 *   <input type="file"> clásicos.
 */

import { tt } from "./i18n";

// ---------------------------------------------------------------- helpers

interface PluginArchivos {
  guardar(opts: { nombre: string; mime: string; datos: string }): Promise<{ nombre?: string }>;
  abrir(opts?: Record<string, never>): Promise<{ nombre: string; mime?: string; datos: string }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { Archivos?: PluginArchivos };
}

function capacitor(): CapacitorGlobal | undefined {
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

function esAndroidNativo(): boolean {
  return capacitor()?.isNativePlatform?.() === true;
}

function pluginArchivos(): PluginArchivos | undefined {
  return capacitor()?.Plugins?.Archivos;
}

function aBase64(datos: Uint8Array): string {
  let bin = "";
  const paso = 0x8000;
  for (let i = 0; i < datos.length; i += paso) {
    bin += String.fromCharCode(...datos.subarray(i, i + paso));
  }
  return btoa(bin);
}

function deBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const datos = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i);
  return datos;
}

/** ¿El usuario cerró el diálogo sin elegir? (no es un error real) */
function esCancelacion(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /cancelado|canceled|cancelled/i.test(msg);
}

/** Extensión simple del nombre (".json" de "rack.prefab.json"). */
function extensionDe(nombre: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(nombre);
  return m ? `.${m[1].toLowerCase()}` : null;
}

// --------------------------------------------------------------- GUARDAR

type SaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable(): Promise<{ write(d: BlobPart): Promise<void>; close(): Promise<void> }> }>;

/**
 * Guarda un archivo dejando que el USUARIO ELIJA EL DESTINO con el diálogo
 * nativo de la plataforma. Devuelve sin hacer nada si lo cancela.
 */
export async function descargarArchivo(
  nombre: string,
  contenido: Uint8Array | string,
  mime: string,
): Promise<void> {
  const datos =
    typeof contenido === "string" ? new TextEncoder().encode(contenido) : contenido;

  if (esAndroidNativo()) {
    const plugin = pluginArchivos();
    if (plugin) {
      try {
        const res = await plugin.guardar({ nombre, mime, datos: aBase64(datos) });
        window.alert(tt(`✓ Guardado: ${res.nombre ?? nombre}`, `✓ Saved: ${res.nombre ?? nombre}`));
        return;
      } catch (err) {
        if (esCancelacion(err)) return;
        console.warn("Guardar como… nativo falló, se usa el flujo clásico:", err);
      }
    }
    await guardarAndroidClasico(nombre, datos);
    return;
  }

  // Web / Windows: diálogo "Guardar como" del sistema si el WebView lo trae.
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const ext = extensionDe(nombre);
      const handle = await picker({
        suggestedName: nombre,
        types: ext ? [{ description: nombre, accept: { [mime]: [ext] } }] : undefined,
      });
      const flujo = await handle.createWritable();
      await flujo.write(new Blob([datos as unknown as BlobPart], { type: mime }));
      await flujo.close();
      return;
    } catch (err) {
      if (esCancelacion(err)) return;
      console.warn("showSaveFilePicker no disponible, se usa el ancla clásica:", err);
    }
  }

  const blob = new Blob([datos as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Flujo Android CLÁSICO (respaldo para binarios sin el plugin «Archivos»):
 * descarga directa a Documentos/EXERSUITE3D o la hoja de compartir.
 */
async function guardarAndroidClasico(nombre: string, datos: Uint8Array): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const b64 = aBase64(datos);

  const directo = window.confirm(
    tt(
      `Guardar ${nombre}\n\nAceptar: descargar a Documentos/EXERSUITE3D (app Archivos).\nCancelar: elegir destino con la hoja de compartir (Drive, enviar…).`,
      `Save ${nombre}\n\nOK: download to Documents/EXERSUITE3D (Files app).\nCancel: pick a destination with the share sheet (Drive, send…).`,
    ),
  );
  if (directo) {
    try {
      try {
        await Filesystem.requestPermissions();
      } catch {
        /* API moderna: sin permiso explícito */
      }
      await Filesystem.writeFile({
        path: `EXERSUITE3D/${nombre}`,
        data: b64,
        directory: Directory.Documents,
        recursive: true,
      });
      window.alert(tt(`✓ Guardado en Documentos/EXERSUITE3D/${nombre}`, `✓ Saved to Documents/EXERSUITE3D/${nombre}`));
      return;
    } catch (err) {
      console.warn("Descarga directa no disponible, se abre compartir:", err);
    }
  }

  const { Share } = await import("@capacitor/share");
  const escrito = await Filesystem.writeFile({
    path: nombre,
    data: b64,
    directory: Directory.Cache,
  });
  await Share.share({
    title: nombre,
    dialogTitle: `Guardar ${nombre}`,
    files: [escrito.uri],
  });
}

// ----------------------------------------------------------------- ABRIR

type OpenFilePicker = (opts: {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{ getFile(): Promise<File> }[]>;

/**
 * Abre el selector NATIVO de la plataforma para buscar un archivo donde el
 * usuario quiera. `extensiones` es la lista para el filtro (".json,.obj").
 * Devuelve null si el usuario cancela.
 */
export async function elegirArchivo(
  extensiones: string,
  descripcion?: string,
): Promise<File | null> {
  if (esAndroidNativo()) {
    const plugin = pluginArchivos();
    if (plugin) {
      try {
        const res = await plugin.abrir({});
        const bytes = deBase64(res.datos);
        return new File([bytes as unknown as BlobPart], res.nombre || "archivo", {
          type: res.mime || "application/octet-stream",
        });
      } catch (err) {
        if (esCancelacion(err)) return null;
        console.warn("Abrir nativo falló, se usa el <input> clásico:", err);
      }
    }
    return abrirConInput(extensiones);
  }

  const picker = (window as unknown as { showOpenFilePicker?: OpenFilePicker }).showOpenFilePicker;
  if (picker) {
    try {
      const exts = extensiones
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^\.[a-z0-9]+$/.test(e));
      const [handle] = await picker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: exts.length
          ? [{ description: descripcion ?? exts.join(" "), accept: { "application/octet-stream": exts } }]
          : undefined,
      });
      return handle ? await handle.getFile() : null;
    } catch (err) {
      if (esCancelacion(err)) return null;
      console.warn("showOpenFilePicker no disponible, se usa el <input> clásico:", err);
    }
  }

  return abrirConInput(extensiones);
}

/** Respaldo universal: <input type="file"> efímero. */
function abrirConInput(extensiones: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptSeguro(extensiones);
    input.style.display = "none";
    document.body.append(input);
    const terminar = (f: File | null) => {
      input.remove();
      resolve(f);
    };
    input.addEventListener("change", () => terminar(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => terminar(null));
    input.click();
  });
}

/**
 * accept= para los <input type="file">: el selector de Android filtra por
 * MIME y no conoce el de .glb/.gltf (bloquea el acceso a los archivos), así
 * que en la app nativa se abre sin filtro y se valida por extensión después.
 */
function acceptSeguro(extensiones: string): string {
  return esAndroidNativo() ? "*/*" : extensiones;
}
