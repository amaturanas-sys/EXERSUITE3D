# Prefabs de máquinas

Prefabs `.json` en formato v2 (`exersuite3d-prefab`) listos para importar
desde la app: **Archivo → Importar prefab**, o para sustituir una máquina
estándar desde la Biblioteca.

Cada archivo describe la máquina pieza a pieza — componente, parámetros
(trazado, pinholes, ventanas, perfil), pose exacta con cuaternión, masa y
anclaje —, sus uniones (articulaciones y soldaduras) y sus cables.

## `uppermachine.prefab.json`

> Desde v0.2.36 esta máquina también viene **incorporada a la biblioteca de
> máquinas estándar** del Builder (paleta → Máquinas estándar → UpperMachine).
> El archivo se conserva aquí como definición literal y punto de partida para
> variantes.

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

### Afinado de los dos cables por la altura del carro

El carro de doble roldana cuelga de dos senos de cable opuestos: el del
**cable 1** (press de pecho) baja en dos ramales a los anclajes de suelo y
tira del carro hacia abajo; el del **cable 2** (jalón alto) sube en dos
ramales a las poleas altas y tira hacia arriba. Como las longitudes se
congelan en la pose de diseño, **la altura del carro fija de una vez el
largo de los dos cables**: bajarlo acorta el 1 y alarga el 2; subirlo hace
lo contrario. Medido: a 70 cm el cable 1 mide 389,6 y el 2 443,4; a 128,7
cm, 506,3 y 327,6.

Lo que realmente destrabó las dos estaciones, sin embargo, fue el cambio
que hizo el diseñador en la **barra de jalón**: bajarla 8,8 cm, acercarla
6,5 y sacar el cable por el otro lado de la polea alta frontal. Con eso el
último tramo pasa de casi horizontal a colgar VERTICAL, y el recorrido de
la barra se traduce 1:1 en cable recogido (antes, 16 cm de barra recogían
apenas 5). Además resuelve por geometría el cruce del cable con el mástil.

Rendimiento medido con esa barra (3 placas = 20,4 kg, varias repeticiones):

| | recorrido muerto | rango de placas |
|---|---|---|
| jalón alto | 5 – 7,6 cm | 23,5 – 26,6 cm |
| press de pecho (desde reposo) | ≈ 5 cm | 7,4 cm · 39,5 kg en la mano |

**Barrido de la altura del carro** (118 / 128,7 / 140 / 152 / 164 cm): el
rango del jalón se mueve entre 22 y 29 cm sin un óptimo que se sostenga al
repetir las medidas, y el press no cambia. **Rangos del brazo** probados
(libre, [−90°,0°], [−45°,0°], [−40°,−5°]): tampoco mejoran de forma
reproducible — limitarlo incluso resta recorrido al press cuando se usa
después del jalón. Por eso el prefab conserva la altura y el brazo libre
tal como los dejó el diseñador: ningún ajuste fino superó al original.

Dos techos del diseño, medidos, que sí acotan lo que se puede pedir:

- **Carga útil ≈ 20 kg.** El brazo de pecho pesa 19,2 kg y es lo único que
  contrarresta la tensión del cable 1; por encima de eso el cable levanta
  el brazo antes que las placas.
- **Recorrido del press ≈ 16 cm de cable.** El terminal sobre el brazo
  recoge 0,37 cm por grado (15,9 cm en 45°), y alejarlo del pivote no lo
  mejora: la recogida la gobierna el ÁNGULO entre el terminal y la roldana
  interna, no el radio. Para dar más recorrido al press hay que cambiar ese
  ángulo — reubicando la roldana interna del mástil o pasando el terminal
  al otro lado del pivote.
