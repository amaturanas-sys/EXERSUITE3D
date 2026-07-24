package com.exersuite.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Puente con el gestor de archivos NATIVO del dispositivo (Storage Access
 * Framework):
 *  - guardar(): abre el diálogo "Guardar como…" del sistema (el usuario
 *    navega y elige carpeta y nombre: Descargas, SD, Drive…) y escribe ahí
 *    el contenido.
 *  - abrir(): abre el selector de documentos del sistema para buscar el
 *    archivo en cualquier ubicación y devuelve su nombre y contenido.
 *
 * Ambos métodos rechazan con el mensaje "cancelado" si el usuario cierra el
 * diálogo sin elegir, para que la app lo distinga de un error real.
 */
@CapacitorPlugin(name = "Archivos")
public class Archivos extends Plugin {

  // ------------------------------------------------------------- guardar
  @PluginMethod
  public void guardar(PluginCall call) {
    String nombre = call.getString("nombre", "archivo");
    String mime = call.getString("mime", "application/octet-stream");
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(mime);
    intent.putExtra(Intent.EXTRA_TITLE, nombre);
    startActivityForResult(call, intent, "alGuardar");
  }

  @ActivityCallback
  private void alGuardar(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
        || result.getData().getData() == null) {
      call.reject("cancelado");
      return;
    }
    Uri uri = result.getData().getData();
    try {
      byte[] datos = Base64.decode(call.getString("datos", ""), Base64.DEFAULT);
      OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt");
      if (out == null) throw new Exception("sin flujo de salida");
      try {
        out.write(datos);
        out.flush();
      } finally {
        out.close();
      }
      JSObject res = new JSObject();
      res.put("uri", uri.toString());
      res.put("nombre", nombreDe(uri));
      call.resolve(res);
    } catch (Exception e) {
      call.reject("No se pudo escribir el archivo: " + e.getMessage());
    }
  }

  // --------------------------------------------------------------- abrir
  @PluginMethod
  public void abrir(PluginCall call) {
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    // Sin filtro MIME: el selector de Android no conoce los tipos de
    // .glb/.obj/.stl/.prefab.json y los dejaría en gris. La app valida por
    // extensión después.
    intent.setType("*/*");
    startActivityForResult(call, intent, "alAbrir");
  }

  @ActivityCallback
  private void alAbrir(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
        || result.getData().getData() == null) {
      call.reject("cancelado");
      return;
    }
    Uri uri = result.getData().getData();
    try {
      InputStream in = getContext().getContentResolver().openInputStream(uri);
      if (in == null) throw new Exception("sin flujo de entrada");
      ByteArrayOutputStream buf = new ByteArrayOutputStream();
      try {
        byte[] trozo = new byte[16384];
        int n;
        while ((n = in.read(trozo)) > 0) buf.write(trozo, 0, n);
      } finally {
        in.close();
      }
      JSObject res = new JSObject();
      res.put("nombre", nombreDe(uri));
      res.put("mime", getContext().getContentResolver().getType(uri));
      res.put("datos", Base64.encodeToString(buf.toByteArray(), Base64.NO_WRAP));
      call.resolve(res);
    } catch (Exception e) {
      call.reject("No se pudo leer el archivo: " + e.getMessage());
    }
  }

  /** Nombre visible del documento (DISPLAY_NAME) o el final de la ruta. */
  private String nombreDe(Uri uri) {
    String nombre = null;
    Cursor c = getContext().getContentResolver().query(uri, null, null, null, null);
    if (c != null) {
      try {
        int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
        if (idx >= 0 && c.moveToFirst()) nombre = c.getString(idx);
      } finally {
        c.close();
      }
    }
    if (nombre == null || nombre.isEmpty()) {
      String path = uri.getLastPathSegment();
      nombre = path == null ? "archivo" : path.substring(path.lastIndexOf('/') + 1);
    }
    return nombre;
  }
}
