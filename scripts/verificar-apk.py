#!/usr/bin/env python3
"""
Comprueba que un APK está en condiciones de instalarse antes de publicarlo.

Nació de un fallo real: la v0.2.53 se publicó como build de DEPURACIÓN
(android:debuggable="true"), que es la bandera por la que Play Protect y las
capas de seguridad de los fabricantes bloquean un APK de origen desconocido.
Y antes de la v0.2.7 cada runner de CI firmaba con un debug.keystore efímero,
así que cada versión llevaba una llave distinta y Android se negaba a
actualizar sobre la anterior. Ninguna de las dos cosas se ve mirando el
workflow: hay que mirar el binario.

Uso:  python3 scripts/verificar-apk.py <ruta.apk> [--keystore <ruta>]

Sale con código 1 y explica qué falla. No necesita el SDK de Android: le
basta con keytool (que viene con el JDK) y pyaxmlparser.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import pathlib
import re
import struct
import subprocess
import sys
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parent.parent
KEYSTORE = RAIZ / "android" / "app" / "exersuite.keystore"
CLAVE_STORE = "exersuite3d"
ALIAS = "exersuite"

fallos: list[str] = []
notas: list[str] = []


def mal(msg: str) -> None:
    fallos.append(msg)


def bien(msg: str) -> None:
    notas.append(msg)


def huella_del_keystore(ks: pathlib.Path) -> str | None:
    """SHA-256 del certificado que hay en el keystore del proyecto."""
    if not ks.exists():
        return None
    r = subprocess.run(
        ["keytool", "-list", "-v", "-keystore", str(ks),
         "-storepass", CLAVE_STORE, "-alias", ALIAS],
        capture_output=True, text=True,
    )
    m = re.search(r"SHA256:\s+([0-9A-F:]+)", r.stdout)
    return m.group(1) if m else None


def huella_del_apk(apk: pathlib.Path) -> str | None:
    """SHA-256 del certificado con el que se firmó el APK."""
    r = subprocess.run(
        ["keytool", "-printcert", "-jarfile", str(apk)],
        capture_output=True, text=True,
    )
    m = re.search(r"SHA256:\s+([0-9A-F:]+)", r.stdout)
    return m.group(1) if m else None


def revisar_firma_v1(z: zipfile.ZipFile) -> None:
    """Toda entrada del zip debe estar en MANIFEST.MF con su digest correcto.

    Si falta alguna, o un digest no cuadra, es que el APK se tocó DESPUÉS de
    firmarlo y el instalador lo rechaza.
    """
    try:
        mf = z.read("META-INF/MANIFEST.MF").decode("utf-8", "replace")
    except KeyError:
        mal("no hay META-INF/MANIFEST.MF: el APK no lleva firma v1")
        return
    mf = mf.replace("\r\n", "\n").replace("\r", "\n").replace("\n ", "")
    firmados: dict[str, tuple[str, str]] = {}
    for bloque in mf.split("\n\n"):
        n = re.search(r"^Name: (.+)$", bloque, re.M)
        d = re.search(r"^SHA-256-Digest: (.+)$", bloque, re.M)
        algo = "sha256"
        if n and not d:
            d = re.search(r"^SHA1-Digest: (.+)$", bloque, re.M)
            algo = "sha1"
        if n and d:
            firmados[n.group(1).strip()] = (d.group(1).strip(), algo)

    entradas = [n for n in z.namelist()
                if not n.endswith("/") and not (
                    n.startswith("META-INF/") and n.count("/") == 1)]
    sin_firma = [n for n in entradas if n not in firmados]
    if sin_firma:
        mal(f"{len(sin_firma)} entradas del zip sin firmar, p.ej. {sin_firma[:3]}")

    malos = []
    for n in entradas:
        if n not in firmados:
            continue
        esperado, algo = firmados[n]
        h = hashlib.sha256() if algo == "sha256" else hashlib.sha1()
        h.update(z.read(n))
        if base64.b64encode(h.digest()).decode() != esperado:
            malos.append(n)
    if malos:
        mal(f"{len(malos)} entradas con digest que no cuadra, p.ej. {malos[:3]}")
    if not sin_firma and not malos:
        bien(f"firma v1 completa y correcta sobre {len(entradas)} entradas")


def revisar_firma_v2(apk: pathlib.Path) -> None:
    """Android 11+ exige v2 (o superior) para apps que apuntan a SDK 30+."""
    datos = apk.read_bytes()
    i = datos.rfind(b"APK Sig Block 42")
    if i < 0:
        mal("no hay APK Signing Block: el APK solo lleva firma v1 (JAR), "
            "que Android 11+ rechaza para targetSdk 30 o superior")
        return
    tam_pie = struct.unpack("<Q", datos[i - 8:i])[0]
    ini = i + 16 - tam_pie - 8
    tam_cab = struct.unpack("<Q", datos[ini:ini + 8])[0]
    if tam_cab != tam_pie:
        mal(f"APK Signing Block malformado: cabecera {tam_cab} != pie {tam_pie}")
        return
    ids = set()
    p = ini + 8
    fin = i - 8
    while p < fin:
        largo = struct.unpack("<Q", datos[p:p + 8])[0]
        if largo < 4 or p + 8 + largo > fin + 8:
            break
        ids.add(struct.unpack("<I", datos[p + 8:p + 12])[0])
        p += 8 + largo
    esquemas = []
    if 0x7109871A in ids:
        esquemas.append("v2")
    if 0xF05368C0 in ids:
        esquemas.append("v3")
    if not esquemas:
        mal("el APK Signing Block no contiene ni v2 ni v3")
    else:
        bien(f"firmado con {' + '.join(esquemas)}")


def revisar_zip(apk: pathlib.Path, z: zipfile.ZipFile) -> None:
    nombres = z.namelist()
    dup = len(nombres) - len(set(nombres))
    if dup:
        mal(f"{dup} entradas duplicadas en el zip")

    # Android 11+ exige resources.arsc SIN comprimir y alineado a 4 bytes.
    try:
        i = z.getinfo("resources.arsc")
    except KeyError:
        mal("falta resources.arsc")
        return
    if i.compress_type != zipfile.ZIP_STORED:
        mal("resources.arsc está COMPRIMIDO; Android 11+ rechaza el paquete")
    z.fp.seek(i.header_offset + 26)
    ln, le = struct.unpack("<HH", z.fp.read(4))
    off = i.header_offset + 30 + ln + le
    if off % 4:
        mal(f"resources.arsc no está alineado a 4 bytes (offset {off})")
    if i.compress_type == zipfile.ZIP_STORED and off % 4 == 0:
        bien("resources.arsc sin comprimir y alineado a 4 bytes")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("apk")
    ap.add_argument("--keystore", default=str(KEYSTORE))
    args = ap.parse_args()

    apk = pathlib.Path(args.apk)
    if not apk.exists():
        print(f"no existe {apk}", file=sys.stderr)
        return 1

    print(f"Verificando {apk}  ({apk.stat().st_size} bytes)")

    from pyaxmlparser import APK  # se importa aquí para dar un error claro

    a = APK(str(apk))

    # --- identidad, contra package.json (la versión manda desde ahí) ---
    paquete = json.loads((RAIZ / "package.json").read_text())
    if a.package != "com.exersuite.app":
        mal(f"paquete inesperado: {a.package}")
    else:
        bien(f"paquete {a.package}")
    if a.version_name != paquete["version"]:
        mal(f"versionName {a.version_name} no coincide con package.json "
            f"({paquete['version']})")
    else:
        bien(f"versión {a.version_name} (código {a.version_code})")

    # --- LO QUE ROMPIÓ LA v0.2.53: build de depuración publicado ---
    xml = a.get_android_manifest_axml().get_xml().decode("utf-8", "replace")
    app = re.search(r"<application[^>]*>", xml)
    app = app.group(0) if app else ""
    if 'debuggable="true"' in app:
        mal('android:debuggable="true": es un build de DEPURACIÓN. Play Protect '
            'y las capas de seguridad de los fabricantes lo bloquean al '
            'instalarlo de lado. Compila assembleRelease.')
    else:
        bien("no es un build de depuración")
    if 'testOnly="true"' in app:
        mal('android:testOnly="true": solo se instala con «adb install -t», '
            "nunca desde el gestor de archivos")

    # --- LO QUE ROMPIÓ LA v0.2.6: la llave de firma cambió ---
    esperada = huella_del_keystore(pathlib.Path(args.keystore))
    real = huella_del_apk(apk)
    if esperada is None:
        mal(f"no pude leer el keystore del proyecto en {args.keystore}")
    elif real is None:
        mal("el APK no tiene certificado legible: no está firmado")
    elif real != esperada:
        mal("FIRMADO CON OTRA LLAVE. Quien tenga instalada una versión "
            "anterior no podrá actualizar (Android lo rechaza).\n"
            f"       esperada: {esperada}\n"
            f"       en el APK: {real}")
    else:
        bien(f"firmado con la llave del proyecto ({real[:23]}…)")

    with zipfile.ZipFile(apk) as z:
        revisar_zip(apk, z)
        revisar_firma_v1(z)
    revisar_firma_v2(apk)

    print()
    for n in notas:
        print(f"  ✓ {n}")
    for f in fallos:
        print(f"  ✗ {f}")
    print()
    if fallos:
        print(f"NO PUBLICABLE: {len(fallos)} problema(s).")
        return 1
    print("APK en condiciones de publicarse.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
