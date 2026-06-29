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
| Crear articulación  | **+ Bisagra** / **+ Corredera**, luego clic en pieza A y pieza B |
| Trazar cable        | **+ Cable**, clic en cada pieza (se ancla al punto más cercano al clic), **Enter** para cerrar |
| Encaje magnético    | Botón **Imán**: al mover una pieza, encaja en puntos de anclaje (centro/extremos/caras) de otras |
| Figura humana       | Botón **Figura**; tipo **Maniquí / Esqueleto** y altura en cm |
| Posar figura        | Clic en un miembro del maniquí → rotar la articulación; panel **Posturas** para aplicar |
| Editar/crear postura | Posa a mano y **Actualizar** (sobrescribe) o **Guardar como…** (nueva); editables y persistentes |

## Arquitectura

```
src/
  core/        # unidades (cm), bus de eventos, Editor (orquestador + simulación), snapping
  scene/       # SceneManager: escena, cámara, luces, grid en cm, entorno PBR
  objects/     # SceneObject, geometrías, librería de componentes, materiales, figura humana
  physics/     # PhysicsWorld (Rapier), joints (bisagra/corredera) y cables
  ui/          # paleta, toolbar, inspector, conexiones, HUD de medidas
  main.ts      # punto de entrada y ensamblado
```

## Assets de terceros y licencias

El esqueleto humano de referencia (`public/models/overview-skeleton.glb`) es una
conversión del modelo **Open3DModel** de O. Paul Gobée y col. (Dept. de Anatomía,
LUMC; vía caskanatomy.info / AnatomyTOOL), bajo **Creative Commons
Attribution-ShareAlike (CC BY-SA)**. La app muestra el crédito al activar el
esqueleto. Detalles en [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md).
La cláusula ShareAlike aplica al modelo y sus derivados (la malla), no al resto
del código de EXERSUITE3D.

## Convención de unidades

`1 unidad de mundo de Three.js = 1 cm`. La rejilla usa celdas de 10 cm con
divisiones mayores cada metro. Todas las dimensiones del inspector se editan y
muestran en centímetros.

## Librería de componentes

Agrupada por categoría: **estructural** (pilares, bases, soportes, montante de
rack, brazos/correas de seguridad, barras de dominadas y fondos, landmine),
**movimiento** (guías, rieles, fulcros, pivotes, pop-pin, carro de cable),
**transmisión** (poleas, roldanas, engranajes, cables, cadenas, listones de
Kevlar, resortes, leva de resistencia variable), **peso** (bloques, discos,
contrapesos, barra olímpica, pila de pesos, cuerno de carga, micro-disco) y
**ergonómico** (agarraderas, asientos, respaldos, D-handle, cuerda de tríceps,
barra de jalón, correa de tobillo). Cada componente lleva un material PBR y
atributos físicos editables (masa en kg, anclaje).

El diseño de los componentes, mecanismos, paletas de color y cinemática se
documenta en [`docs/REFERENCIAS.md`](docs/REFERENCIAS.md), una síntesis de
referencias de REP, Rogue, Titan, Hammer Strength, Cybex y Obelix.

## Hoja de ruta

- [x] **Fase 1 — Base del editor**: viewport 3D, cámara orbital, grid en cm,
      selección, gizmos mover/rotar/escalar, librería de componentes, inspector
      con medidas exactas, HUD de medidas.
- [~] **Fase 2 — Física**: integración de Rapier ✔ (cuerpos rígidos, gravedad,
      masas, colisiones, Play/Stop con restauración del diseño). Articulaciones ✔
      — bisagra (revolute) y corredera (prismatic) con eje, pivote, límites de
      recorrido y motor de velocidad. Cables y poleas ✔ — cable inextensible que
      pasa por poleas (puntos de paso) y acopla sus dos extremos por conservación
      de longitud (p. ej. agarradera ↔ pila de pesos). Pendiente: poleas móviles
      (ratio 2:1), motores de posición, leva de resistencia variable.
- [~] **Fase 3 — Modelado/ensamblaje**: snapping de ensamblaje ✔ (encaje
      magnético en puntos de anclaje: centro/eje, extremos de cilindros, centros
      de cara). Estilo visual ilustrativo ✔ (fondo claro de estudio, iluminación
      suave, figura azul, sombras tenues). Pendiente: deformar/elongar/voltear,
      agrupación multicomponente. Personaje posable ✔ (maniquí con rig de 12
      articulaciones rotables, apoyado en el suelo). Posturas estándar **editables
      y ampliables** ✔ (biblioteca persistente: aplicar, actualizar, guardar
      nuevas, eliminar, restaurar por defecto).
- [x] **Figura humana de referencia**: maniquí procedural **o** esqueleto
      anatómico detallado (glTF/Draco), a escala con altura editable en cm, para
      diseñar máquinas en torno al cuerpo.
- [ ] **Fase 4 — Interoperabilidad**: exportar/importar glTF/OBJ multicomponente
      (incluida la opción de cargar un modelo humano/esqueleto detallado).
- [ ] **Fase 5 — Empaquetado**: APK con Capacitor y standalone de Windows con Tauri.
