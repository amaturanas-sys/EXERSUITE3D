/**
 * Descarga de archivos que funciona en TODAS las versiones de la app:
 * - Web y Windows (Tauri/WebView2): ancla clásica con blob.
 * - APK Android (Capacitor): el WebView IGNORA el atributo download de las
 *   anclas con blobs — se escribe el archivo en la caché de la app y se abre
 *   la hoja de COMPARTIR del sistema (guardar en Archivos, Drive, enviar…).
 */

import { tt } from "./i18n";

function esAndroidNativo(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return cap?.isNativePlatform?.() === true;
}

function aBase64(datos: Uint8Array): string {
  let bin = "";
  const paso = 0x8000;
  for (let i = 0; i < datos.length; i += paso) {
    bin += String.fromCharCode(...datos.subarray(i, i + paso));
  }
  return btoa(bin);
}

export async function descargarArchivo(
  nombre: string,
  contenido: Uint8Array | string,
  mime: string,
): Promise<void> {
  const datos =
    typeof contenido === "string" ? new TextEncoder().encode(contenido) : contenido;

  if (esAndroidNativo()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const b64 = aBase64(datos);

    // v0.2.1: descarga DIRECTA al dispositivo (visible en la app Archivos,
    // carpeta Documentos/EXERSUITE3D), con la hoja de compartir como
    // alternativa (Drive, enviar…) o como respaldo si el sistema la bloquea.
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
    return;
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
 * accept= para los <input type="file">: el selector de Android filtra por
 * MIME y no conoce el de .glb/.gltf (bloquea el acceso a los archivos), así
 * que en la app nativa se abre sin filtro y se valida por extensión después.
 */
export function acceptSeguro(extensiones: string): string {
  return esAndroidNativo() ? "*/*" : extensiones;
}
