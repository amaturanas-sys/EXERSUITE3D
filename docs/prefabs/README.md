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

### Afinado de los dos cables por la altura del carro

El carro de doble roldana cuelga de dos senos de cable opuestos: el del
**cable 1** (press de pecho) baja en dos ramales a los anclajes de suelo y
tira del carro hacia abajo; el del **cable 2** (jalón alto) sube en dos
ramales a las poleas altas y tira hacia arriba. Como las longitudes se
congelan en la pose de diseño, **la altura del carro fija de una vez el
largo de los dos cables**: bajarlo acorta el 1 y alarga el 2; subirlo hace
lo contrario.

Medido en simulación (jalón alto, dos repeticiones por medida):

| configuración | recorrido muerto | rango de placas |
|---|---|---|
| prefab del diseñador (carro a 128,7 cm, carro libre) | 10,7 – 15 cm | 9 – 23 cm |
| afinado (carro a 112 cm, guiado ±8 cm, brazo topado) | **4,9 – 5,8 cm** | 14 – 25 cm |

El recorrido muerto —los centímetros que se tiran antes de que las placas
se muevan— baja a un tercio. Para lograrlo hicieron falta dos condiciones
previas, porque sin ellas ninguna longitud de cable sirve:

- **Guía del carro** (corredera vertical con topes ±8 cm). El carro es unas
  40 veces más ligero que las placas seleccionadas, y la restricción de
  cable inextensible reparte el recorrido por masa inversa: flotando libre
  se llevaba TODO el tirón de cualquier estación y la pila no se movía. En
  la máquina real corre por sus tubos guía entre topes.
- **Tope del brazo**. Su pivote ya traía el rango [−90°, 0°] (0 = reposo,
  −90 = press a fondo) pero con los límites APAGADOS: el tirón del jalón se
  llevaba el brazo por encima de su reposo en lugar de mover la pila.

Dos límites del diseño que conviene tener presentes:

- **Carga máxima útil ≈ 20 kg** (3 placas). El brazo de pecho pesa 19,2 kg
  y es lo único que contrarresta la tensión del cable 1; por encima de ese
  valor el cable levanta el brazo antes que las placas. Con 13,6 kg el
  jalón mueve la pila 14–25 cm; con 34 kg apenas unos centímetros.
- **Recorrido del press ≈ 16 cm de cable**. El terminal del cable sobre el
  brazo recoge 0,37 cm por grado (15,9 cm en un giro de 45°), y alejarlo
  del pivote no lo mejora: la recogida la gobierna el ÁNGULO entre el
  terminal y la roldana interna, no el radio. Para dar más recorrido al
  press habría que reubicar esa roldana o el terminal cambiando ese ángulo.
