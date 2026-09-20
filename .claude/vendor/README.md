# Capacidades traídas de fuera

Dos orígenes, las dos licencias MIT y las dos copiadas aquí:
[ECC](https://github.com/affaan-m/ECC) (`LICENSE-ECC`) y
[superpowers](https://github.com/obra/superpowers) (`LICENSE-SUPERPOWERS`).

---

# Skills de superpowers

Cuatro de las quince, las que tapan un hueco sin pelearse con lo que ya hay:

- **`systematic-debugging`** — la causa raíz antes que el arreglo. Es la
  disciplina que hizo falta para encontrar que `el()` convertía `aria-label`
  en una propiedad inerte: el síntoma era «el botón no se anuncia», y parchear
  el botón no habría servido de nada.
- **`verification-before-completion`** — no se dice «verde» sin haberlo
  corrido en este mismo mensaje. Refuerza la regla de esta casa: en paralelo
  hay rojos falsos, **el veredicto bueno es el de la corrida en serie**.
- **`dispatching-parallel-agents`** y **`subagent-driven-development`** — cómo
  repartir trabajo entre los ocho revisores de `.claude/agents/` sin que el
  contexto del coordinador se llene.

Lo que se dejó fuera: `test-driven-development` (aquí las pruebas se escriben
contra el build, después, no antes), `using-git-worktrees` y
`finishing-a-development-branch` (chocan con el ritual de rama y versionado),
`requesting-` / `receiving-code-review` (ya vienen con el harness), y las
meta-skills del propio framework. **Tampoco se instalaron sus `hooks/`**: su
hook de arranque inyecta instrucciones para usar sus skills, y se pelearía con
el de graphify y con `CLAUDE.md`.

---

# Capacidades traídas de ECC

Origen: [affaan-m/ECC](https://github.com/affaan-m/ECC) v2.2.2, licencia MIT
(copia en `LICENSE-ECC`). Copyright (c) 2026 Affaan Mustafa.

ECC es un catálogo de *playbooks* para agentes: 292 skills, 68 agentes y 94
comandos. **No se instaló entero, y a propósito.** Las descripciones de las
skills se cargan en el contexto de CADA sesión, así que un catálogo de 292
encarece todas las consultas — justo lo contrario de lo que se busca. Y buena
parte de lo que enseña, este proyecto ya lo hace mejor y más concreto: su
`verification-loop` genérico es más flojo que la batería de 115 pruebas de
`pruebas/` con su veredicto en serie, y su `git-workflow` chocaría con el
ritual de versionado de este repo.

Lo que se trajo es lo que **suma sin solaparse**.

## Agentes (`.claude/agents/`)

Salen gratis hasta que se invocan, y devuelven un informe en vez de volcar
archivos: son los que más ahorran contexto.

| Agente | Para qué, aquí |
|---|---|
| `silent-failure-hunter` | Fallos que no se ven. Este repo ya tuvo el caso de libro: `serialize()` descartaba las piezas dibujadas y el proyecto se guardaba sin ellas, sin decir nada. |
| `typescript-reviewer` | Revisión del código de `src/`. |
| `type-design-analyzer` | Los tipos que se prestan a estados imposibles. |
| `performance-optimizer` | three.js y Rapier en Android: fugas de GPU, trabajo por fotograma, tamaño del bundle. |
| `code-simplifier` | Limpieza sin cacería de bugs. |
| `build-error-resolver` | Los builds de Vite, Tauri y Gradle. |
| `a11y-architect` | El DOM se construye a mano con `el()`, sin framework que ponga nada por ti. |
| `e2e-runner` | La batería de Playwright de `pruebas/`. |

## Skills (`.claude/skills/`)

Sólo tres, y las tres tapan un hueco real del stack:

- **`vite-patterns`** — el empaquetador de la app.
- **`e2e-testing`** — Playwright, que es de lo que vive `pruebas/`.
- **`frontend-a11y`** — accesibilidad, donde este proyecto no tenía nada.

## Lo que se dejó fuera, y por qué

- **`verification-loop`, `tdd-workflow`, `delivery-gate`** — más genéricos que
  la batería que ya hay.
- **`git-workflow`** — chocaría con el ritual de versionado del repo
  (`package.json`, `Cargo.toml`, `tauri.conf.json`, `build.gradle`, los dos
  lockfiles, y la cabecera del CHANGELOG con raya larga).
- **`security-review`, `code-review`** — ya vienen con el harness.
- **Las otras ~280 skills** — de otros lenguajes y otros dominios (Laravel,
  Django, Kotlin, redes, salud, trading). Están a un `git clone` de distancia
  si algún día hace falta una.

## Lo que se miró y NO entró

Tres repositorios más se clonaron, se leyeron y se descartaron, no por
calidad sino porque **no se enganchan donde corre esta sesión**:

- **[headroom](https://github.com/headroomlabs-ai/headroom)** — capa de
  compresión de contexto. Funciona como PROXY LOCAL (`headroom proxy`,
  `headroom wrap claude`): se mete entre el agente y la API del modelo. Aquí
  el endpoint lo fija el entorno remoto y la política de red no se toca.
  Su otra vía es un servidor MCP, que tampoco se añade desde dentro de la
  sesión. **Sitio correcto: el Claude Code local de Alberto.**
- **[claude-mem](https://github.com/thedotmack/claude-mem)** — memoria entre
  sesiones. Necesita un WORKER PERSISTENTE y un inicio de sesión por enlace
  mágico en el navegador. Este contenedor es efímero —el worker muere con él—
  y no hay navegador. Además su proveedor por defecto es alojado: mandaría las
  transcripciones de EXERSUITE3D a un tercero. **Sitio correcto: el local, y
  eligiendo proveedor a conciencia.**
- **[awesome-freellm-apis](https://github.com/open-free-llm-api/awesome-freellm-apis)**
  — directorio de APIs gratuitas. No amplía cuota: `ANTHROPIC_BASE_URL`
  cambia de MODELO, no de presupuesto, y enviaría el código a terceros.

La regla que sale de los tres: **lo que vive en `.claude/` funciona aquí; lo
que intercepta la llamada al modelo o necesita un proceso vivo, no.**

## Para traer alguna más

```bash
git clone --depth 1 https://github.com/affaan-m/ecc /tmp/ecc
cp -r /tmp/ecc/skills/<nombre> .claude/skills/
```

Y anótala aquí arriba, con la razón.
