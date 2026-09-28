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

# Skills y agentes de la tercera tanda

- `ui-ux-pro-max` — reglas de UI/UX con accesibilidad como prioridad 1.
- `changelog-from-commits`, `deterministic-checks`, `skill-audit`.
- `game-developer` (agente) — three.js, WebGL y optimización de render, que es
  el dominio de esta aplicación y no lo cubría ningún otro.

El porqué de cada selección —y de lo que se dejó fuera, incluidos tres
repositorios enteros que no se enganchan en este entorno— está en
`.claude/vendor/README.md`.

# Plugins registrados

Estos no se copiaron: están declarados en `.claude/settings.json` y el CLI los
clona al arrancar. Cinco encendidos, 46 skills, 6 agentes, ningún servidor MCP:

- `example-skills` (de [anthropics/skills](https://github.com/anthropics/skills))
  — `algorithmic-art`, `theme-factory`, `web-artifacts-builder`,
  `skill-creator`, `canvas-design` y siete más.
- `superpowers` (de [obra/superpowers](https://github.com/obra/superpowers)) —
  las once que no estaban ya copiadas a mano: `test-driven-development`,
  `writing-plans`, `brainstorming`, `requesting-code-review`…
- `context-engineering` (de [Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering))
  — `context-compression`, `filesystem-context`, `memory-systems`,
  `long-horizon-prompting` y trece más.
- `code-review` y `pr-review-toolkit` (del marketplace oficial de
  [anthropics/claude-code](https://github.com/anthropics/claude-code)) — la
  skill `review-pr` y seis agentes de revisión. **Ojo con dos cosas:**
  `pr-review-toolkit` cuesta ~2 879 tokens en cada sesión (las descripciones
  de sus agentes se cargan siempre), y tres de sus agentes se llaman igual que
  tres de los de ECC en `.claude/agents/` sin ser los mismos —los del plugin
  son la versión completa; los de ECC, la recortada que devuelve informe
  corto—. Un nombre a secas es ambiguo: usa el prefijo
  `pr-review-toolkit:` cuando quieras el del plugin.

De las 27 URLs pedidas, 24 repositorios distintos: 13 son plugins de Claude
Code y 11 no lo son. `.claude/vendor/PLUGINS.md` los recorre uno a uno —
cuáles piden clave o servicio, cuál bloquea la política de red del entorno,
cuáles se apagaron a propósito por chocar con el método de aquí, y cuáles son
frameworks que no se enchufan a una sesión.
