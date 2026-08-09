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

Revisado contra el motor actual (v0.2.34–v0.2.35): las piezas del brazo
compuesto son móviles con masa real y quedan soldadas al conjunto (antes un
mango anclado congelaba el brazo entero), los terminales de cable viajan con
la pieza que arrastran y los volteos van horneados como espejo en lugar de
escala negativa.

**La geometría de las piezas no se alteró en absoluto**: trazados, nodos,
pinholes, ventanas, perfil (viga o tubo) y dimensiones son los del original.
El mástil conserva su longitud íntegra —es el apoyo estructural del bastidor
superior— y el cruce del cable alto con su remate lo resuelve la regla de
TRAMOS OCULTOS del validador: entre dos roldanas internas de la misma viga
el cable va por dentro del perfil.
