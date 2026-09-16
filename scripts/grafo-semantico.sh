#!/usr/bin/env bash
#
# LAS PASADAS DEL GRAFO QUE GASTAN MODELO, contra el endpoint que tú decidas.
#
#     scripts/grafo-semantico.sh nombres   # nombra las comunidades (barato)
#     scripts/grafo-semantico.sh todo      # + lee docs, PDFs e imágenes
#
# El resto de graphify —leer el código con tree-sitter, agrupar, consultar— es
# local y gratis, y no pasa por aquí: para eso está `graphify update .`.
#
# La configuración vive en `.env.grafo`, que NO se versiona. Plantilla en
# `.env.grafo.example`. El porqué, en docs/GRAFO-BACKEND.md.
set -euo pipefail
cd "$(dirname "$0")/.."

MODO="${1:-nombres}"
ENVF=".env.grafo"

if [ ! -f "$ENVF" ]; then
  echo "Falta $ENVF. Cópialo de la plantilla y rellénalo:" >&2
  echo "    cp .env.grafo.example $ENVF" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; . "./$ENVF"; set +a

: "${OPENAI_BASE_URL:?falta OPENAI_BASE_URL en $ENVF}"
: "${OPENAI_API_KEY:?falta OPENAI_API_KEY en $ENVF}"
: "${OPENAI_MODEL:?falta OPENAI_MODEL en $ENVF}"

# QUE FALLE PRONTO Y CLARO. Sin esto, un router apagado se come el timeout de
# graphify —600 s por petición— antes de decir nada.
echo "Comprobando $OPENAI_BASE_URL ..."
if ! curl -fsS --max-time 15 "$OPENAI_BASE_URL/models" \
     -H "Authorization: Bearer $OPENAI_API_KEY" >/dev/null 2>&1; then
  echo "No responde $OPENAI_BASE_URL/models. ¿Está el router levantado?" >&2
  exit 1
fi

case "$MODO" in
  nombres)
    # Sólo los nombres de las comunidades. Lo que sale de la máquina son
    # nombres de símbolos y de archivos, no el cuerpo del código.
    graphify label . --backend=openai --model="$OPENAI_MODEL"
    ;;
  todo)
    # LA PASADA COMPLETA. OJO: esto SÍ manda el CONTENIDO de los documentos del
    # proyecto al endpoint. Con un router de tramos gratuitos eso son terceros
    # que a menudo entrenan con lo que reciben. Decisión consciente, no un
    # detalle: por eso va en un modo aparte y con este aviso.
    echo "Esto manda el contenido de docs/PDFs/imágenes a $OPENAI_BASE_URL."
    read -r -p "¿Seguir? [s/N] " r
    [ "$r" = "s" ] || [ "$r" = "S" ] || { echo "Cancelado."; exit 0; }
    graphify extract . --backend openai --model "$OPENAI_MODEL" --max-concurrency 2
    ;;
  *)
    echo "Modos: nombres | todo" >&2
    exit 2
    ;;
esac
