# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# Agentes y skills de ECC

En `.claude/agents/` hay ocho revisores traídos de [ECC](https://github.com/affaan-m/ECC)
(MIT). Devuelven un informe en vez de volcar archivos en el contexto, así que
son la vía barata para revisar mucho código:

- `silent-failure-hunter` — errores tragados y datos que se pierden sin avisar.
- `typescript-reviewer`, `type-design-analyzer`, `code-simplifier`.
- `performance-optimizer` — fugas de GPU, trabajo por fotograma, bundle.
- `a11y-architect` — el DOM se monta a mano con `el()`, sin framework.
- `build-error-resolver`, `e2e-runner`.

Y tres skills que tapan huecos del stack: `vite-patterns`, `e2e-testing` y
`frontend-a11y`.

# Skills de superpowers

Cuatro de [superpowers](https://github.com/obra/superpowers) (MIT), de método:

- `systematic-debugging` — la causa raíz antes que el arreglo.
- `verification-before-completion` — no se dice «verde» sin haberlo corrido.
  Aquí eso significa: **en paralelo hay rojos falsos; el veredicto bueno es la
  corrida en serie.**
- `dispatching-parallel-agents`, `subagent-driven-development` — cómo repartir
  trabajo entre los revisores de `.claude/agents/`.

El porqué de cada selección —y de lo que se dejó fuera, incluidos tres
repositorios enteros que no se enganchan en este entorno— está en
`.claude/vendor/README.md`.
