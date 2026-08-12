# EXERSUITE3D — Tienda web (Vercel + Hugging Face + Mercado Pago)

Página de presentación y venta: `sitio-web/` (Next.js, se despliega en
Vercel) + `hf-descargas/` (Space de Hugging Face que custodia y entrega los
binarios solo tras el pago). Todo editable visualmente desde `/admin`.

## Cómo funciona

```
Visitante → Página (Vercel) → botón Comprar
        → Checkout Pro de MERCADO PAGO (tu cuenta de vendedor de Mercado Libre)
        → vuelve a /gracias?payment_id=…
        → Vercel VERIFICA el pago con la API de Mercado Pago (en el servidor)
        → emite enlaces de descarga FIRMADOS (HMAC, 48 h)
        → Space de Hugging Face verifica la firma y entrega APK/EXE
```

- Nadie puede descargar sin pagar: los binarios NO están en URLs públicas y
  el Space rechaza cualquier petición sin token válido.
- El comprador puede volver a `/gracias?payment_id=SU_NUMERO` cuando quiera
  para regenerar los enlaces.
- Newsletter: valida sintaxis + que el dominio exista y reciba correo (MX);
  guarda los suscriptores en Upstash Redis.

## Paso 1 — Credenciales de Mercado Pago (10 min)

1. Entra en <https://www.mercadopago.com/developers> con TU cuenta de
   vendedor de Mercado Libre → "Tus integraciones" → "Crear aplicación"
   (tipo: pagos online, Checkout Pro).
2. Copia el **Access Token de PRODUCCIÓN** (empieza por `APP_USR-…`).
   Ese token es el que liga los cobros a tu cuenta: el dinero llega a tu
   saldo de Mercado Pago como cualquier venta.

## Paso 2 — Upstash Redis gratis (5 min)

1. <https://upstash.com> → crea una base Redis (plan gratuito).
2. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
   (Guarda el contenido editado del /admin, los suscriptores y el registro
   de compras. Sin esto la página funciona, pero /admin no puede publicar.)

## Paso 3 — Desplegar en Vercel (10 min)

1. <https://vercel.com> → Add New → Project → importa este repositorio de
   GitHub → **Root Directory: `sitio-web`** (importante).
2. En Environment Variables añade:

   | Variable | Valor |
   |---|---|
   | `MP_ACCESS_TOKEN` | el Access Token de producción de Mercado Pago |
   | `DOWNLOAD_SECRET` | una frase larga aleatoria (invéntala; 30+ caracteres) |
   | `HF_SPACE_URL` | la URL de tu Space (paso 4), sin barra final |
   | `ADMIN_PASSWORD` | contraseña del editor /admin |
   | `UPSTASH_REDIS_REST_URL` | de Upstash |
   | `UPSTASH_REDIS_REST_TOKEN` | de Upstash |
   | `NEXT_PUBLIC_SITE_URL` | la URL pública final (p. ej. https://exersuite3d.vercel.app) |

3. Deploy. La página queda en `https://<proyecto>.vercel.app` (puedes
   conectar dominio propio en Settings → Domains).

## Paso 4 — Space de Hugging Face con los binarios (15 min)

1. <https://huggingface.co/new-space> → nombre `exersuite3d-descargas` →
   SDK **Docker** → público (los archivos NO son públicos: solo el endpoint).
2. Sube los archivos de la carpeta `hf-descargas/` de este repo
   (app.py, Dockerfile, requirements.txt, README.md).
3. Crea la carpeta `bin/` en el Space y sube (con Git LFS o por la web):
   - `bin/EXERSUITE3D.apk` ← el APK de la release de GitHub
   - `bin/EXERSUITE3D.exe` ← el EXE de la release de GitHub
4. Settings del Space → Variables and secrets → New secret:
   `DOWNLOAD_SECRET` = EXACTAMENTE el mismo valor que en Vercel.
5. Abre la URL del Space: debe responder
   `{"servicio":"EXERSUITE3D descargas","archivos":{"android":true,"windows":true}}`.
6. Pon esa URL en la variable `HF_SPACE_URL` de Vercel y redespliega.

> Con cada release nueva, sube los binarios actualizados a `bin/` del Space.

## Paso 4b — Webhook de Mercado Pago (recomendado)

1. Panel de developers → tu aplicación → **Webhooks** → modo Productivo.
2. URL: `https://TU-SITIO/api/webhook/mp` · Eventos: **Pagos**.
3. Copia la **clave secreta** que muestra el panel y añádela en Vercel como
   `MP_WEBHOOK_SECRET` → Redeploy. Cada notificación llega firmada
   (x-signature) y el servidor rechaza imitaciones.
4. Botón "Simular notificación" del panel → debe responder 200.

Con esto, los pagos aprobados quedan registrados en Redis
(`exersuite:compras`) aunque el comprador cierre el navegador sin volver a
/gracias.

## Paso 5 — Probar el circuito completo

1. En Mercado Pago developers activa el **modo de prueba** y usa las
   tarjetas de test, o haz una compra real de bajo monto y devuélvela.
2. Página → Comprar → pagar → debe volver a /gracias con los dos botones.
3. Comprueba que el enlace descarga, que un token manipulado da 403 y que
   pasada la caducidad pide regenerar.

## La página en dos idiomas (español e inglés)

El visitante la recibe en su idioma sin hacer nada: se decide con
`?lang` → cookie → `Accept-Language` → español, y hay un conmutador **ES · EN**
arriba a la derecha. Cada idioma tiene además su propia dirección, `/es` y
`/en`, por si quieres compartir una en concreto.

- **El español es la verdad.** Es lo que se guarda y lo que se sirve cuando no
  hay traducción, así que la página nunca sale con huecos en blanco.
- **El inglés es una capa encima**, y puede estar a medias: lo que traduzcas se
  ve en inglés y lo demás sigue saliendo en español.
- **Se traduce desde el mismo editor**: en `/admin`, pestaña **English**, y a
  escribir encima de lo que veas. Al lado tienes cuántas frases llevas
  traducidas y cuántas faltan.
- Lo que dice el programa (botones de estado, la página de gracias, los avisos
  del formulario) ya está en los dos idiomas y no hay que tocarlo. El propio
  panel `/admin` se queda en español a propósito.

## Editar la página (como en Canva)

- Entra en `https://tu-sitio/admin`.
- **Pincha cualquier texto y escribe** (título, subtítulo, tarjetas, precio
  en texto, notas, pie…). Cada sección tiene su botón Mostrar/Ocultar.
- **«Textos de fábrica»**, en cada sección, trae la redacción que venga con la
  versión nueva de la aplicación y descarta la tuya SOLO en esa sección. Es la
  forma de adoptar una presentación nueva sin perder el precio ni la galería.
  (Lo que ya publicaste manda siempre: una versión nueva nunca te lo pisa
  sola.)
- Barra superior: color de acento, **precio y moneda** (lo que se cobra de
  verdad), añadir imágenes a la galería (pega URLs de tus capturas).
- Escribe la contraseña (ADMIN_PASSWORD) y pulsa **Publicar cambios**: la
  página pública se actualiza al instante.

## Newsletter

- Los correos se validan (sintaxis + dominio con MX real) y se guardan en
  Redis, en el set `exersuite:newsletter`.
- Para exportarlos: consola de Upstash → Data Browser → `exersuite:newsletter`
  (o `SMEMBERS exersuite:newsletter`). Desde ahí puedes importarlos a
  cualquier servicio de envío (Mailchimp, Buttondown, Resend…).

## Preguntas frecuentes

- **¿Y si el comprador pierde el enlace?** Que vuelva a
  `/gracias?payment_id=SU_NUMERO` (aparece en su comprobante de Mercado
  Pago); los enlaces se regeneran gratis.
- **¿Puedo cambiar el precio?** Sí, desde /admin (recuerda actualizar
  también el texto visible del precio).
- **¿Reembolsos?** Se gestionan desde el panel normal de Mercado Pago.
- **¿Los binarios de Godot también?** El Space acepta más archivos: añade
  entradas al diccionario `ARCHIVOS` de `app.py` y más botones en
  `app/gracias/page.js`.
