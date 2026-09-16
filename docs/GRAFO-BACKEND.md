# El backend LLM del grafo

graphify tiene **dos mitades muy distintas**, y sólo una gasta modelo:

| | Qué hace | Coste |
|---|---|---|
| **AST** | lee el código con tree-sitter | local, gratis, nada sale de la máquina |
| **Semántica** | nombra las comunidades; lee docs, PDFs e imágenes | llama a un LLM |

El día a día es la primera: `graphify update .` rehace las 3412 aristas del
proyecto en poco más de un minuto sin tocar ninguna API. Esta ficha es sólo para
la segunda.

## Las tres variables

```bash
cp .env.grafo.example .env.grafo    # y rellena
scripts/grafo-semantico.sh nombres  # nombra las comunidades
scripts/grafo-semantico.sh todo     # + lee docs, PDFs e imágenes
```

`.env.grafo` está en `.gitignore`: la clave no se versiona. Vale cualquier
endpoint compatible con OpenAI —`OPENAI_BASE_URL`, `OPENAI_API_KEY`,
`OPENAI_MODEL`—, así que sirven por igual la API de OpenAI, un llama.cpp o
vLLM en local, o un router de tramos gratuitos como
[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi), que agrega 34
proveedores detrás de un solo `/v1` usando **tus** claves.

El script comprueba `/v1/models` antes de empezar. Sin eso, un router apagado se
come el timeout de graphify —600 s por petición— antes de decir nada.

## Qué sale de la máquina, y esto es lo que hay que decidir

Los dos modos NO son lo mismo, y por eso son dos:

  · **`nombres`** manda nombres de símbolos y de archivos, no el cuerpo del
    código. Es lo que hace falta para convertir «Community 47» en «Arm IK
    Solver».
  · **`todo`** manda el **contenido** de los documentos del proyecto. Con un
    router de tramos gratuitos eso significa terceros cuyos planes gratuitos a
    menudo entrenan con lo que reciben. El script pide confirmación antes.

Dicho de otro modo: apuntar la semántica a un agregador gratuito **invierte** la
propiedad que hacía atractivo a graphify para el código —«nada sale de tu
máquina»—. Para el AST esa propiedad sigue intacta pase lo que pase aquí; para
los documentos, no. Es una decisión, no un detalle de configuración.

## Lo que este cableado NO acelera

Conviene decirlo para no esperar de aquí lo que no puede dar. De esta sesión de
desarrollo, lo único que consume LLM es lo de arriba. **No** pasan por ningún
endpoint:

  · el modelado CAD (`cad/src/*.py`), que es Python local con build123d;
  · la batería de 106 pruebas, que son navegadores locales y tarda lo que tarda;
  · los builds, los commits y el versionado;
  · ni el asistente que escribe el código, cuyo modelo lo fija su propio
    entorno y no una variable de este repositorio.

## El estado de hoy

Las 319 comunidades **ya están nombradas** —se hizo con el CLI de `claude`, que
graphify detecta solo cuando no hay ninguna clave puesta— y `GRAPH_REPORT.md`
está versionado con esos nombres dentro, precisamente para que nadie tenga que
volver a pagar esa pasada al clonar. La pasada `todo` sobre docs, PDFs e
imágenes **no se ha corrido nunca**.
