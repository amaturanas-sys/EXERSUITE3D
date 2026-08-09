# Prefabs de máquinas

Prefabs `.json` en formato v2 (`exersuite3d-prefab`) listos para importar
desde la app: **Archivo → Importar prefab**, o para sustituir una máquina
estándar desde la Biblioteca.

Cada archivo describe la máquina pieza a pieza — componente, parámetros
(trazado, pinholes, ventanas, perfil), pose exacta con cuaternión, masa y
anclaje —, sus uniones (articulaciones y soldaduras) y sus cables.

## `uppermachine.prefab.json`

Torre multiestación del diseñador: pila de pesos selectorizada, carro de
doble roldana, polea alta con barra de remo y brazo de pecho compuesto que
pivota desde el bastidor superior.

Revisado en v0.2.34 contra el motor actual: las piezas del brazo compuesto
son móviles con masa real y quedan soldadas al conjunto (antes un mango
anclado congelaba el brazo entero), los terminales de cable viajan con la
pieza que arrastran, los volteos van horneados como espejo en lugar de
escala negativa, y el remate del mástil deja pasar el cable alto. La
geometría de las piezas no se alteró.
