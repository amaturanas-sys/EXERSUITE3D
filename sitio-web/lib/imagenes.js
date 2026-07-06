/**
 * Utilidades del editor para subir imágenes desde la galería del dispositivo:
 * selector de archivo + redimensionado/compresión en el navegador (máx.
 * 1600 px y ~950 KB; los PNG conservan la transparencia) + subida a
 * /api/imagen. Devuelve la URL servida por la propia web.
 */

export function elegirArchivo(accept = "image/*") {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function subirImagen(file, clave, { max = 1600 } = {}) {
  if (!file) return null;
  if (!clave) throw new Error("Escribe la contraseña del editor (arriba) antes de subir.");
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * k));
  canvas.height = Math.max(1, Math.round(bmp.height * k));
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);

  const esPng = file.type === "image/png";
  let data = canvas.toDataURL(esPng ? "image/png" : "image/jpeg", 0.85);
  // PNG enorme: reintenta como JPEG (se pierde transparencia) antes de fallar.
  if (data.length > 950_000 && esPng) data = canvas.toDataURL("image/jpeg", 0.85);
  if (data.length > 950_000) throw new Error("La imagen es demasiado grande incluso comprimida.");

  const res = await fetch("/api/imagen", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": clave },
    body: JSON.stringify({ data }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "No se pudo subir la imagen.");
  return j.url;
}

/** Flujo completo: elegir de la galería → comprimir → subir → URL (o null). */
export async function elegirYSubir(clave) {
  const f = await elegirArchivo();
  if (!f) return null;
  try {
    return await subirImagen(f, clave);
  } catch (e) {
    window.alert(String(e.message || e));
    return null;
  }
}
