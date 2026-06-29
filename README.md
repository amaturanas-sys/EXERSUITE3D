# EXERSUITE3D

Plataforma de diseño 3D y simulación de físicas para **prototipar máquinas de
gimnasio**. Editor estilo SketchUp / NomadSculpt con medidas exactas en
centímetros, librería de componentes mecánicos y (próximamente) simulación de
palancas, poleas y pesos.

Objetivo multiplataforma desde un único código web:

- **Android (APK)** vía [Capacitor](https://capacitorjs.com/)
- **Windows (standalone)** vía [Tauri](https://tauri.app/) o Electron

## Stack

- **TypeScript** + **Vite**
- **[Three.js](https://threejs.org/)** para render 3D (1 unidad = 1 cm)
- **[Rapier](https://rapier.rs/)** (WASM) para simulación de física rígida

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # typecheck + bundle de producción en dist/
npm run preview    # sirve el build de producción
npm run typecheck  # solo comprobación de tipos
```

## Controles del editor

| Acción              | Atajo / interacción                     |
| ------------------- | --------------------------------------- |
| Orbitar cámara      | Arrastrar con el ratón / un dedo        |
| Pan / Zoom          | Click derecho-arrastrar / rueda / pinch |
| Seleccionar objeto  | Click sobre el objeto                   |
| Mover               | `W` o `G`                               |
| Rotar               | `E` o `R`                               |
| Escalar             | `S`                                     |
| Duplicar selección  | `Ctrl + D`                              |
| Eliminar selección  | `Supr` / `Backspace`                    |
| Deseleccionar       | `Esc`                                   |
| Simular / detener   | `Espacio` o botón **Simular**           |

## Arquitectura

```
src/
  core/        # unidades (cm), bus de eventos, Editor (orquestador + simulación)
  scene/       # SceneManager: escena, cámara, luces, grid en cm, entorno PBR
  objects/     # SceneObject, geometrías, librería de componentes y materiales
  physics/     # PhysicsWorld: integración de Rapier (cuerpos rígidos)
  ui/          # paleta, barra de herramientas, inspector, HUD de medidas
  main.ts      # punto de entrada y ensamblado
```

### Convención de unidades

`1 unidad de mundo de Three.js = 1 cm`. La rejilla usa celdas de 10 cm con
divisiones mayores cada metro. Todas las dimensiones del inspector se editan y
muestran en centímetros.

## Librería de componentes

Agrupada por categoría: **estructural** (pilares, bases, soportes),
**movimiento** (guías, rieles, fulcros, pivotes), **transmisión** (poleas,
roldanas, engranajes, cables, cadenas, listones de Kevlar, resortes),
**peso** (bloques, discos, contrapesos) y **ergonómico** (agarraderas,
asientos, respaldos). Cada componente lleva atributos físicos editables
(masa en kg, material, anclaje).

## Hoja de ruta

- [x] **Fase 1 — Base del editor**: viewport 3D, cámara orbital, grid en cm,
      selección, gizmos mover/rotar/escalar, librería de componentes, inspector
      con medidas exactas, HUD de medidas.
- [~] **Fase 2 — Física**: integración de Rapier ✔ (cuerpos rígidos, gravedad,
      masas, colisiones, Play/Stop con restauración del diseño). Pendiente:
      articulaciones/joints (pivotes, bisagras, correderas), cables y poleas,
      pilas de peso conectadas, motores.
- [ ] **Fase 3 — Modelado**: deformar, elongar, voltear, snapping a la rejilla,
      conexión entre objetos, agrupación multicomponente.
- [ ] **Fase 4 — Interoperabilidad**: exportar/importar glTF/OBJ multicomponente.
- [ ] **Fase 5 — Empaquetado**: APK con Capacitor y standalone de Windows con Tauri.
