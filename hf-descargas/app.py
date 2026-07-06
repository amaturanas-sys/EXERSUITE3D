"""
EXERSUITE3D — servidor de descargas (Hugging Face Space, Docker/FastAPI).

Custodia los binarios (Android .apk y Windows .exe) y solo los entrega con un
token HMAC firmado por la web de Vercel y no caducado. El MISMO secreto vive
en los dos lados:
  - Vercel:   variable de entorno DOWNLOAD_SECRET (firma los tokens)
  - Space HF: secret DOWNLOAD_SECRET (los verifica aquí)

Los archivos van en la carpeta bin/ del Space:
  bin/EXERSUITE3D.apk   (app Android)
  bin/EXERSUITE3D.exe   (app Windows)
"""

import base64
import hashlib
import hmac
import os
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="EXERSUITE3D descargas")

BIN = Path(__file__).parent / "bin"
ARCHIVOS = {
    "android": ("EXERSUITE3D.apk", "application/vnd.android.package-archive"),
    "windows": ("EXERSUITE3D.exe", "application/x-msdownload"),
}


def verificar_token(token: str) -> str:
    """Devuelve el payment_id si el token es válido y no expiró."""
    secreto = os.environ.get("DOWNLOAD_SECRET", "")
    if not secreto:
        raise HTTPException(500, "El Space no tiene configurado DOWNLOAD_SECRET")
    try:
        cuerpo, firma = token.split(".")
        esperada = hmac.new(secreto.encode(), cuerpo.encode(), hashlib.sha256).digest()
        recibida = base64.urlsafe_b64decode(firma + "=" * (-len(firma) % 4))
        if not hmac.compare_digest(esperada, recibida):
            raise ValueError("firma")
        payment_id, expira = (
            base64.urlsafe_b64decode(cuerpo + "=" * (-len(cuerpo) % 4)).decode().split(".")
        )
        if time.time() > int(expira):
            raise ValueError("expirado")
        return payment_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            403,
            "Enlace de descarga inválido o caducado. Vuelve a la página de "
            "gracias con tu nº de pago para regenerarlo.",
        )


@app.get("/")
def raiz():
    presentes = {so: (BIN / nombre).exists() for so, (nombre, _) in ARCHIVOS.items()}
    return JSONResponse({"servicio": "EXERSUITE3D descargas", "archivos": presentes})


@app.get("/descargar/{so}")
def descargar(so: str, token: str = ""):
    if so not in ARCHIVOS:
        raise HTTPException(404, "Plataforma desconocida (usa android o windows)")
    verificar_token(token)
    nombre, tipo = ARCHIVOS[so]
    ruta = BIN / nombre
    if not ruta.exists():
        raise HTTPException(503, f"El archivo {nombre} aún no está subido al Space")
    return FileResponse(ruta, media_type=tipo, filename=nombre)
