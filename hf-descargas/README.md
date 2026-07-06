---
title: EXERSUITE3D Descargas
emoji: 🏋️
colorFrom: gray
colorTo: gray
sdk: docker
pinned: false
---

# EXERSUITE3D — servidor de descargas

Entrega el APK (Android) y el EXE (Windows) **solo** a quien presenta un
token firmado por la web (emitido tras verificar el pago en Mercado Pago).

## Puesta en marcha

1. Crea un Space en huggingface.co → New Space → SDK **Docker** (público).
2. Sube TODOS los archivos de esta carpeta al Space.
3. Crea la carpeta `bin/` y sube los binarios (usa Git LFS, son grandes):
   - `bin/EXERSUITE3D.apk` — el APK de la release
   - `bin/EXERSUITE3D.exe` — el EXE de la release
4. En Settings → Variables and secrets añade el secret `DOWNLOAD_SECRET`
   con EXACTAMENTE el mismo valor que pusiste en Vercel.
5. La URL del Space (p. ej. `https://usuario-exersuite3d-descargas.hf.space`)
   va en la variable `HF_SPACE_URL` de Vercel.

Comprobación: abre la URL del Space — responde un JSON con qué archivos
están presentes. Una descarga sin token responde 403.
