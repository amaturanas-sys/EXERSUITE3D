# Plugins: 27 enlaces, 24 repositorios, 3 encendidos

Esta tanda no se copió: se **registró**. Un plugin de Claude Code no vive en
`.claude/skills/` sino en un *marketplace* declarado en `.claude/settings.json`
(`extraKnownMarketplaces` + `enabledPlugins`), que el CLI clona al arrancar la
sesión. Por eso aquí no hay ficheros de licencia: el código no entra al
repositorio, solo la referencia.

Se pidieron 27 URLs. Son 24 repositorios distintos —cuatro de los enlaces
apuntan a skills sueltas del mismo `anthropics/skills`— y de los 24 **solo 13
son plugins de Claude Code**. De esos 13, tres están encendidos.

El recuento honesto: **3 plugins activos, 44 skills, 0 servidores MCP, 0 coste
de contexto en reposo** (las skills se pagan al invocarse, no al cargarse). De
las 44, cuarenta son nuevas; las otras cuatro repiten el nombre de skills que
ya estaban copiadas en `.claude/skills/` —`systematic-debugging`,
`verification-before-completion`, `dispatching-parallel-agents`,
`subagent-driven-development`— y aparecen como `superpowers:<nombre>`. Es el
único solape de nombres, es deliberado, y el porqué está más abajo.

---

## Encendidos

### [`anthropics/skills`](https://github.com/anthropics/skills) → `example-skills` (12 skills)

Cubre cuatro de los enlaces pedidos de golpe: **`algorithmic-art`**,
**`theme-factory`**, **`web-artifacts-builder`** y **`skill-creator`**. Vienen
además `canvas-design`, `frontend-design`, `brand-guidelines`,
`doc-coauthoring`, `internal-comms`, `mcp-builder`, `slack-gif-creator` y
`webapp-testing`.

De estas doce, las que tienen trabajo aquí son `algorithmic-art` (la app
genera geometría paramétrica) y `theme-factory` / `web-artifacts-builder` (la
UI se monta a mano con `el()`, sin framework, y los temas están a pelo en CSS).
`skill-creator` es la que cierra el círculo: con 13 skills propias y 44
prestadas, escribir la siguiente conviene hacerlo con método.

`webapp-testing` se solapa en propósito con `e2e-testing`, que ya está y sabe
lo de esta casa —**el veredicto bueno es la corrida en serie**—, así que la de
fuera no la reemplaza; queda como segunda opinión.

Los otros cuatro plugins del mismo marketplace (`document-skills` para
xlsx/docx/pptx/pdf, `claude-api`, `academy-guide`, `discernment-nudge`) se
quedan apagados: aquí no se generan ofimáticos ni se construye contra la API.

### [`obra/superpowers`](https://github.com/obra/superpowers) → `superpowers` (15 skills)

Ya había cuatro copiadas a mano en `.claude/skills/` (ver `README.md`). Se
comprobó: **son idénticas byte a byte a las de origen.** Se dejan copiadas de
todos modos, y no por descuido — el contenedor de esta sesión se recicla y se
reclona, y `systematic-debugging` y `verification-before-completion` son la
disciplina con la que se trabaja aquí. Una copia local no depende de que el
clonado del marketplace salga bien. El plugin aporta las once restantes
(`brainstorming`, `test-driven-development`, `writing-plans`,
`executing-plans`, `requesting-code-review`, `receiving-code-review`,
`using-git-worktrees`, `writing-skills`, `finishing-a-development-branch`,
`using-superpowers`, `diagnosing-superpowers`).

El solape es deliberado: las cuatro aparecen dos veces, una como skill del
proyecto y otra como `superpowers:<nombre>`. Es ruido a cambio de no perder el
método si falla la red.

### [`muratcankoylan/Agent-Skills-for-Context-Engineering`](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering) → `context-engineering` (17 skills)

`context-compression`, `context-degradation`, `long-horizon-prompting`,
`memory-systems`, `multi-agent-patterns`, `filesystem-context` y diez más.

Es la que más pinta de teórica tiene y la que más falta hacía. Esta sesión ha
perdido el contexto dos veces y ha aprendido tres veces la misma lección por
medir mal (*retener ≠ recoger*, *alcanzar ≠ sostener*, *el final no es el
camino*). `context-compression` y `filesystem-context` van justo a eso;
`dispatching-parallel-agents` de superpowers reparte el trabajo, y estas
explican por qué se rompe cuando se rompe.

---

## Registrado, plugin apagado

### [`anthropics/claude-code`](https://github.com/anthropics/claude-code) — 13 plugins oficiales

El marketplace queda registrado (checkout disperso: `.claude-plugin` y
`plugins`), pero **`frontend-design` se apagó**: se comparó con la copia que
trae `example-skills` y es **idéntica byte a byte**. Encenderla duplicaría una
skill sin añadir nada. El enlace pedido está servido, por otra puerta.

Se deja el marketplace porque `code-review`, `pr-review-toolkit` y
`commit-commands` encajan con el flujo de aquí (rama de trabajo, `build.yml`,
release por tag) y quedan a una orden:
`claude plugin enable code-review@claude-code-plugins --scope project`.

### [`upstash/context7`](https://github.com/upstash/context7) — bloqueado por la red del entorno

Es un plugin legítimo y su MCP es HTTP puro, **sin clave de API**. Se registró,
se encendió, y se apagó al comprobar el servidor:

```
mcp.context7.com:443 — connect_rejected
la pasarela respondió 403 al CONNECT (denegación por política)
```

La política de red de este entorno no deja salir a ese host. Dejarlo encendido
solo produce un error de conexión en cada arranque. Se arregla desde los
ajustes del entorno (menú del entorno en la barra de título → *Edit* → *Network
access*): un nivel de acceso más amplio, o `mcp.context7.com` en los dominios
permitidos. Después:
`claude plugin enable context7@context7-marketplace --scope project`.

---

## Plugin de verdad, pero le falta algo que aquí no hay

Los cinco son plugins de Claude Code bien formados. Ninguno se registró, porque
un marketplace registrado se clona en cada arranque y estos no podrían
funcionar igual.

| Repositorio | Qué le falta |
| --- | --- |
| [`mem0ai/mem0`](https://github.com/mem0ai/mem0) | Clave de la plataforma Mem0 (`api_key`, obligatoria). Además manda el transcript de la sesión a mem0.ai: eso no es una decisión técnica, es una decisión sobre datos del proyecto. |
| [`MemPalace/mempalace`](https://github.com/MemPalace/mempalace) | El binario `mempalace-mcp` en el PATH, que se instala aparte. 45 herramientas MCP. |
| [`rohitg00/agentmemory`](https://github.com/rohitg00/agentmemory) | Un servidor escuchando en `localhost:3111` (`AGENTMEMORY_URL`, `AGENTMEMORY_SECRET`). |
| [`thedotmack/claude-mem`](https://github.com/thedotmack/claude-mem) | Su propia instalación, y la variante `cowork` va contra cmem.ai. |
| [`gastownhall/beads`](https://github.com/gastownhall/beads) | El binario `bd`. Es un gestor de incidencias; aquí el trabajo se lleva en el CHANGELOG, que es el que alimenta el cuerpo de la release. |

Ninguno se puede autorizar desde una sesión no interactiva. Cuando haya clave o
servicio, el patrón es el mismo de arriba: `claude plugin marketplace add <url>
--scope project` y `claude plugin enable <plugin>@<marketplace> --scope
project`.

[`headroomlabs-ai/headroom`](https://github.com/headroomlabs-ai/headroom) va en
la misma lista por otra razón: son hooks de `SessionStart` contra un servicio
alojado, sin skills.

---

## Plugin de verdad, apagado a propósito

Dos plugins de estilo. Los dos funcionarían aquí sin nada más, y los dos se
quedan fuera porque pelean con cómo se trabaja en este repositorio.

- [`JuliusBrussee/caveman`](https://github.com/JuliusBrussee/caveman) —
  *«habla como cavernícola, corta el relleno»*. 18 skills. El relleno conviene
  cortarlo, pero los informes de aquí son prosa en castellano con medidas
  dentro, y un formato telegráfico se lleva las medidas por delante.
- [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) —
  *«fuerza la solución más perezosa que funcione»*. Esta es la que más
  claramente contradice el método del proyecto: aquí se ha revertido dos veces
  un cambio de colisionadores porque su experimento de control no mostró
  efecto, y se han cerrado tres hilos con un resultado negativo medido. Eso es
  lo contrario de la solución más perezosa que funcione; es no dar por buena
  ninguna que no se haya medido.

Si se quieren probar, están a dos órdenes; quedan aquí anotados con el porqué
para que la decisión sea consciente y no un olvido.

---

## Tienen skills, pero no son plugins

Nueve repositorios con `SKILL.md` dentro y **sin `marketplace.json` en la raíz**,
así que `claude plugin marketplace add` los rechaza. Sus skills, además,
documentan sus propias herramientas: sirven para trabajar *en* ese proyecto, no
en este.

- [`ComposioHQ/awesome-claude-skills`](https://github.com/ComposioHQ/awesome-claude-skills)
  — su `marketplace.json` está en `composio-skills/`, no en la raíz, y el CLI
  falla con *«Marketplace file not found»*. No importa: se comparó su
  **`canvas-design`** con la de `anthropics/skills` y son **idénticas byte a
  byte**, y esa entra con `example-skills`. El enlace pedido está servido. Sus
  otros 106 plugins son automatizaciones de SaaS (de `ably` a `zoom`), que aquí
  no tienen nada que hacer.
- [`rtk-ai/rtk`](https://github.com/rtk-ai/rtk) — 12 skills en `.claude/skills/`
  para desarrollar rtk (TDD en Rust, su propio triaje).
- [`colbymchenry/codegraph`](https://github.com/colbymchenry/codegraph) — 2
  skills, las dos sobre extender codegraph.
- [`topoteretes/cognee`](https://github.com/topoteretes/cognee) — 7 skills, las
  siete sobre instalar y operar cognee.
- [`bytedance/deer-flow`](https://github.com/bytedance/deer-flow) — 22 skills en
  `skills/public/`, de un framework de investigación. Sin manifiesto.
- [`massgen/massgen`](https://github.com/massgen/massgen) — 19 skills para
  pilotar massgen.
- [`diegosouzapw/OmniRoute`](https://github.com/diegosouzapw/OmniRoute) — 23 883
  ficheros; es un enrutador de LLMs y sus skills documentan su propio CLI.
- [`decolua/9router`](https://github.com/decolua/9router) — 9 skills que llaman
  a la API de 9router, con clave.
- [`code-yeongyu/oh-my-openagent`](https://github.com/code-yeongyu/oh-my-openagent)
  — componentes de plugin para Codex y OpenCode, no marketplaces de Claude Code.

## No son plugins en absoluto

- [`deepset-ai/haystack`](https://github.com/deepset-ai/haystack) — framework
  de RAG en Python, 11 437 ficheros, cero `SKILL.md`. Se instala con `pip`, no
  se enchufa a una sesión.
- [`DeusData/codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp)
  — servidor MCP a secas: ni skills, ni manifiesto de plugin. Se añadiría con
  `claude mcp add`, no como plugin, y necesita sesión interactiva.

---

## Cómo se deshace

Todo está en `.claude/settings.json`. Para dejarlo como estaba basta borrar
`enabledPlugins` y `extraKnownMarketplaces`; las skills propias de
`.claude/skills/` no se tocaron.
