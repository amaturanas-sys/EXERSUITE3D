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

## Para traer alguna más

```bash
git clone --depth 1 https://github.com/affaan-m/ecc /tmp/ecc
cp -r /tmp/ecc/skills/<nombre> .claude/skills/
```

Y anótala aquí arriba, con la razón.
