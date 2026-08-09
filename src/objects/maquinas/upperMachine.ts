import type { CableSpec, PiezaSpec, UnionSpec } from "../standardMachines";

/**
 * UPPERMACHINE — torre multiestación del diseñador (v0.2.36).
 *
 * Definición LITERAL exportada desde la app y revisada contra el motor
 * actual: 41 piezas con su geometría exacta (trazados, pinholes, ventanas,
 * perfil viga o tubo), 16 uniones y 2 cables.
 *
 * Mecánica: una pila selectorizada de 15 placas × 6,8 kg corre por sus dos
 * tubos guía. El CARRO DE DOBLE ROLDANA flota entre los senos de los dos
 * cables —el del jalón tira de él hacia arriba, el del press hacia abajo—,
 * de modo que su altura fija de una vez el largo de ambos (los cables son
 * inextensibles y su longitud se congela en la pose de diseño).
 *
 * · JALÓN ALTO: barra → dos poleas altas → carro → polea de torre → pila.
 *   El cable sale de la polea frontal colgando VERTICAL, así que el
 *   recorrido de la barra se traduce 1:1 en cable recogido: 23-27 cm de
 *   placas con 5-7 cm de recorrido muerto (medido con 3 placas).
 * · PRESS DE PECHO: el brazo COMPUESTO —segmento superior, arco en U, dos
 *   mangos y dos agarres, todo soldado en un solo cuerpo rígido— pivota
 *   desde el bastidor y recoge cable por su terminal: 7,4 cm de placas.
 *
 * Su carga útil práctica ronda los 20 kg: el brazo pesa 19,2 kg y es el
 * único contrapeso de la tensión del cable del press.
 */
export const UPPER_MACHINE: PiezaSpec[] = [
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0.0, -33.147247, -55.079636],
        [0.0, -25.022212, -84.968508],
        [0, -0.0, -90.087131],
        [-0.0, 25.022212, -84.998235],
        [-0.0, 32.827777, -55.047343]
      ]
    },
    material: "acero-negro",
    pos: [0.042, 2.5, 59.9413],
    rotq: [0, 0, -0.707107, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [70.8256, 5, 38.1335]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0, -44.949961, 0],
        [0, -22.47498, 0],
        [0, 0, 0],
        [0, 22.47498, 0],
        [0, 44.949961, 0]
      ]
    },
    material: "acero-negro",
    pos: [0.042, 2.5, 17.0268],
    rotq: [0.707107, 0, 0, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [5, 5, 89.8999]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 2.5,
      holeSpacing: 5,
      path: [
        [0.0, -64.234526, 0.0],
        [0, -22.47498, 0],
        [-0.022212, 17.558055, 0.628436],
        [-0.044424, 57.59109, 1.256872],
        [-0.022212, 77.63421, 2.246536],
        [0.0, 97.677331, 21.558803],
        [0.0, 116.421952, 22.147247],
        [0.0, 145.052633, 22.367194]
      ],
      ventanas: [
        {
          eje: "z",
          u: 0.0,
          v: 104.657001,
          du: 3.441992,
          dv: 9.614
        }
      ]
    },
    material: "acero-negro",
    pos: [0.042, 66.7345, -15.3885],
    rotq: [0, 0, 0, 1],
    fija: true,
    masaKg: 0,
    dims: [5.042, 209.314, 27.5317]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0, -46.951447, -2.470604],
        [0, -16.332311, -4.096062],
        [0, -14.928378, -15.965047],
        [0, -12.294444, -54.731651],
        [0, -11.23749, -67.424941]
      ]
    },
    material: "acero-negro",
    pos: [0.042, 49.4514, 54.507],
    rotq: [0, 0, 0, 1],
    fija: true,
    masaKg: 0,
    dims: [5, 38.2865, 69.6462]
  },
  {
    comp: "asiento",
    nombre: "Asiento",
    params: {
      kind: "box",
      width: 35,
      height: 6,
      depth: 40,
      bevel: 10
    },
    material: "tapizado",
    pos: [-0.0024, 38.497, 30.9101],
    rotq: [0.026177, 0, 0, 0.999657],
    fija: true,
    masaKg: 2,
    dims: [35, 8.0852, 40.2592]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0, -30.216921, -2.470604],
        [0, -16.332311, -4.096062],
        [0, -14.928378, -15.965047],
        [0, -12.294444, -54.731651],
        [0.044424, -16.309899, -89.639216]
      ],
      espejo: [true, false, false]
    },
    material: "acero-negro",
    pos: [-0.0024, 126.7962, 16.0853],
    rotq: [0, 0.707107, 0.707107, 0],
    fija: true,
    masaKg: 0,
    dims: [5.0489, 89.9769, 20.6809]
  },
  {
    comp: "respaldo",
    nombre: "Respaldo",
    params: {
      kind: "box",
      width: 35,
      height: 60,
      depth: 6,
      bevel: 5
    },
    material: "tapizado",
    pos: [-0.0024, 82.0492, 8.3514],
    rotq: [-0.034899, 0, 0, 0.999391],
    fija: true,
    masaKg: 2,
    dims: [35, 60.2724, 10.1708]
  },
  {
    comp: "respaldo",
    nombre: "Respaldo 2",
    params: {
      kind: "box",
      width: 20,
      height: 25,
      depth: 6,
      bevel: 5
    },
    material: "tapizado",
    pos: [0.1257, 125.0266, 5.4854],
    rotq: [-0.034899, 0, 0, 0.999391],
    fija: true,
    masaKg: 2,
    dims: [20, 25.3576, 7.7293]
  },
  {
    comp: "tubo-guia-ttp",
    nombre: "Tubo guía izq.",
    params: {
      kind: "box",
      width: 4,
      height: 214,
      depth: 4
    },
    material: "acero-pulido",
    pos: [-6.3995, 106.5949, -61.9853],
    rotq: [0, 0, 0, 1],
    fija: true,
    masaKg: 0,
    dims: [4, 213.792, 4]
  },
  {
    comp: "tubo-guia-ttp",
    nombre: "Tubo guía der.",
    params: {
      kind: "box",
      width: 4,
      height: 214,
      depth: 4
    },
    material: "acero-pulido",
    pos: [6.9113, 106.5949, -61.9853],
    rotq: [0, 0, 0, 1],
    fija: true,
    masaKg: 0,
    dims: [4, 213.792, 4]
  },
  {
    comp: "roldana",
    nombre: "Polea alta frontal",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.0887, 210.6949, 17.0147],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "roldana",
    nombre: "Polea alta trasera",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.0887, 210.6949, -27.9853],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "roldana",
    nombre: "Polea de torre",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.0887, 202.6949, -55.9853],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "roldana",
    nombre: "Carro: polea sup.",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.0887, 135.6949, -32.9853],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: false,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "roldana",
    nombre: "Carro: polea inf.",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.0887, 122.6949, -32.9853],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: false,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "puente-carro-ttp",
    nombre: "Puente del carro",
    params: {
      kind: "box",
      width: 3.5,
      height: 20.4,
      depth: 7.2
    },
    material: "acero-negro",
    pos: [-0.0887, 128.6949, -32.9853],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 0.2,
    dims: [3.514, 20.4, 7.214]
  },
  {
    comp: "placa-polea-ttp",
    nombre: "Placa polea baja",
    params: {
      kind: "box",
      width: 19,
      height: 7,
      depth: 26,
      espejo: [true, false, false]
    },
    material: "acero-negro",
    pos: [-0.0887, 3.1949, -45.5853],
    rotq: [0, 1, 0, 0],
    fija: true,
    masaKg: 0,
    dims: [19.024, 7, 26]
  },
  {
    comp: "barra-lat-ttp",
    nombre: "Remo de polea alta",
    params: {
      kind: "box",
      width: 75,
      height: 7,
      depth: 2
    },
    material: "cromo",
    pos: [0.042, 201.1339, 20.7568],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 4,
    dims: [74.93, 6.794, 1.8]
  },
  {
    comp: "pletina-ttp",
    nombre: "Pletina TTP",
    params: {
      kind: "box",
      width: 45,
      height: 5,
      depth: 7
    },
    material: "acero-negro",
    pos: [-0.0887, 3.1949, -62.0853],
    rotq: [0, 0, 0, 1],
    fija: true,
    masaKg: 0,
    dims: [45, 5, 7]
  },
  {
    comp: "bastidor-sup-ttp",
    nombre: "Bastidor superior TTP",
    params: {
      kind: "box",
      width: 32,
      height: 15,
      depth: 92.3
    },
    material: "acero-negro",
    pos: [-0.2087, 206.5449, -18.8853],
    rotq: [0, 1, 0, 0],
    fija: true,
    masaKg: 0,
    dims: [32.092, 15, 92.26]
  },
  {
    comp: "pila-pesos",
    nombre: "Bloque de pesos",
    params: {
      kind: "box",
      width: 25,
      height: 90,
      depth: 18,
      holeDiameter: 6,
      holeSpacing: 13.3
    },
    material: "hierro-fundido",
    pos: [0.2563, 52.8951, -61.9853],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 102,
    dims: [25, 90, 22]
  },
  {
    comp: "roldana",
    nombre: "Roldana externa",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [-0.2087, 205.0675, -19.2526],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "soporte-roldana",
    nombre: "Placa de montaje",
    params: {
      kind: "box",
      width: 5,
      height: 0.8,
      depth: 5.8
    },
    material: "acero-negro",
    pos: [-0.2087, 208.7745, -19.2526],
    rotq: [-0.707107, 0, 0.707107, 0],
    fija: true,
    masaKg: 0,
    dims: [5.8, 0.8, 5]
  },
  {
    comp: "soporte-roldana",
    nombre: "Mejilla de soporte",
    params: {
      kind: "box",
      width: 4,
      height: 4.907,
      depth: 0.8
    },
    material: "acero-negro",
    pos: [-2.2587, 206.721, -19.2526],
    rotq: [-0.707107, 0, 0.707107, 0],
    fija: true,
    masaKg: 0,
    dims: [0.8, 4.907, 4]
  },
  {
    comp: "soporte-roldana",
    nombre: "Mejilla de soporte",
    params: {
      kind: "box",
      width: 4,
      height: 4.907,
      depth: 0.8
    },
    material: "acero-negro",
    pos: [1.8413, 206.721, -19.2526],
    rotq: [-0.707107, 0, 0.707107, 0],
    fija: true,
    masaKg: 0,
    dims: [0.8, 4.907, 4]
  },
  {
    comp: "terminal-cable",
    nombre: "Terminal de cable",
    params: {
      kind: "torus",
      radius: 2.2,
      tubeRadius: 0.7
    },
    material: "acero-pulido",
    pos: [0.4523, 7.0149, -43.9595],
    rotq: [0, 0.707107, 0, 0.707107],
    fija: true,
    masaKg: 0.1,
    dims: [1.4, 5.8, 5.8]
  },
  {
    comp: "roldana",
    nombre: "Roldana externa 2",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [0.042, 9.107, -24.8569],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "soporte-roldana",
    nombre: "Placa de montaje",
    params: {
      kind: "box",
      width: 5,
      height: 0.8,
      depth: 5.8
    },
    material: "acero-negro",
    pos: [0.042, 5.4, -24.8569],
    rotq: [0, -0.707107, 0, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [5.8, 0.8, 5]
  },
  {
    comp: "soporte-roldana",
    nombre: "Mejilla de soporte",
    params: {
      kind: "box",
      width: 4,
      height: 4.907,
      depth: 0.8
    },
    material: "acero-negro",
    pos: [-2.008, 7.4535, -24.8569],
    rotq: [0, -0.707107, 0, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [0.8, 4.907, 4]
  },
  {
    comp: "soporte-roldana",
    nombre: "Mejilla de soporte",
    params: {
      kind: "box",
      width: 4,
      height: 4.907,
      depth: 0.8
    },
    material: "acero-negro",
    pos: [2.092, 7.4535, -24.8569],
    rotq: [0, -0.707107, 0, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [0.8, 4.907, 4]
  },
  {
    comp: "roldana",
    nombre: "Roldana interna",
    params: {
      kind: "cylinder",
      radiusTop: 4,
      radiusBottom: 4,
      height: 2.5
    },
    material: "nylon",
    pos: [0.042, 171.3915, 6.9021],
    rotq: [0, 0, -0.707107, 0.707107],
    fija: true,
    masaKg: 0.3,
    dims: [2.344, 7.214, 7.214]
  },
  {
    comp: "eje-roldana",
    nombre: "Eje de la roldana",
    params: {
      kind: "cylinder",
      radiusTop: 0.9,
      radiusBottom: 0.9,
      height: 5.041992
    },
    material: "acero-pulido",
    pos: [0.042, 171.3915, 6.9021],
    rotq: [0, 0, -0.707107, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [5.042, 1.8, 1.8]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0, -8.3016, -1.232049],
        [-0.0, 4.052349, -0.0],
        [-0.0, 11.845876, 1.619386],
        [-0.0, 13.898617, 8.089259],
        [-0.0, 26.505176, 10.397512]
      ],
      espejo: [false, false, true]
    },
    material: "acero-negro",
    pos: [0.042, 167.535, 24.0002],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 4,
    dims: [5, 35.3947, 16.5935]
  },
  {
    comp: "jota-pr",
    nombre: "Anclaje de cadena POWERRACK",
    params: {
      kind: "box",
      width: 13.2,
      height: 13,
      depth: 7.4
    },
    material: "acero-negro",
    pos: [0.042, 191.7771, 9.1569],
    rotq: [-0.002152, 0.707104, 0.002152, -0.707104],
    fija: true,
    masaKg: 0,
    dims: [7.394, 13.0981, 13.279]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [-0.0, -16.706165, -15.281062],
        [-0.0, -15.7707, -32.702924],
        [0.0, -14.835235, -50.124785],
        [0.0, -13.89977, -67.546647],
        [0.0, -12.964305, -84.968508],
        [0.292584, -0.044424, -93.585843],
        [-0.0, 12.697754, -84.998235],
        [-0.0, 13.85782, -67.52964],
        [-0.0, 15.017885, -50.061044],
        [-0.0, 16.177951, -32.592449],
        [-0.0, 17.338017, -15.123853]
      ]
    },
    material: "acero-negro",
    pos: [-0.0024, 65.6476, 24.9397],
    rotq: [0.5, -0.5, 0.5, 0.5],
    fija: false,
    masaKg: 10,
    dims: [39.0357, 81.1718, 5.3658]
  },
  {
    comp: "terminal-cable",
    nombre: "Terminal de cable 2",
    params: {
      kind: "torus",
      radius: 2.2,
      tubeRadius: 0.7
    },
    material: "acero-pulido",
    pos: [-0.0776, 166.8214, 19.7493],
    rotq: [0, 0.707107, 0, 0.707107],
    fija: false,
    masaKg: 0.1,
    dims: [1.4, 5.8, 5.8]
  },
  {
    comp: "pilar-linea",
    nombre: "Pilar / travesaño",
    params: {
      kind: "beam",
      depth: 5,
      width: 5,
      ends: "plano",
      holeDiameter: 0,
      holeSpacing: 5,
      path: [
        [0.0, -30.060134, -7.107134],
        [0, -15.030067, 0],
        [0.0, -1.104557, -0.108559],
        [0, 15.030067, 0],
        [0, 30.060134, -7.050284]
      ]
    },
    material: "acero-negro",
    pos: [-1.0626, 2.5, 62.0853],
    rotq: [0, 0, 0.707107, 0.707107],
    fija: true,
    masaKg: 0,
    dims: [62.3076, 5, 12.3171]
  },
  {
    comp: "tubo-linea",
    nombre: "Tubo de acero",
    params: {
      kind: "tube",
      radius: 1.5,
      path: [
        [16.957127, 0.061551, -0.712328],
        [12.959757, -14.990343, 0],
        [6.263287, -15.362533, 0],
        [4.321148, -1.965003, 0],
        [4.426522, 8.855583, 0],
        [4.964316, 14.836873, 0],
        [12.845908, 20.550659, -0.356164],
        [18.697225, 26.264444, -0.712328]
      ]
    },
    material: "acero-negro",
    pos: [-34.2976, 80.7099, 25.652],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 2,
    dims: [17.0678, 44.5619, 3.7236]
  },
  {
    comp: "tubo-linea",
    nombre: "Tubo de acero",
    params: {
      kind: "tube",
      radius: 1.5,
      path: [
        [16.957127, 0.061551, -0.712328],
        [12.959757, -14.990343, 0],
        [6.263287, -15.362533, 0],
        [4.321148, -1.965003, 0],
        [4.426522, 8.855583, 0],
        [4.964316, 14.836873, 0],
        [12.845908, 20.550659, -0.356164],
        [18.697225, 26.264444, -0.712328]
      ],
      espejo: [true, false, false]
    },
    material: "acero-negro",
    pos: [34.2976, 80.7099, 25.6853],
    rotq: [0, 0, 0, 1],
    fija: false,
    masaKg: 2,
    dims: [17.0678, 44.5619, 3.7236]
  },
  {
    comp: "tubo-linea",
    nombre: "Tubo de acero",
    params: {
      kind: "tube",
      radius: 1.6,
      path: [
        [0, -6.827809, 0],
        [0, -3.413904, 0],
        [0, 0, 0],
        [0, 3.413904, 0],
        [0, 6.827809, 0]
      ]
    },
    material: "acero-negro",
    pos: [23.0535, 89.6025, 25.3125],
    rotq: [0.038714, 0, -0.707965, 0.705185],
    fija: false,
    masaKg: 0.6,
    dims: [13.8182, 3.444, 4.1114]
  },
  {
    comp: "tubo-linea",
    nombre: "Tubo de acero",
    params: {
      kind: "tube",
      radius: 1.6,
      path: [
        [0, -6.827809, 0],
        [0, -3.413904, 0],
        [0, 0, 0],
        [0, 3.413904, 0],
        [0, 6.827809, 0]
      ]
    },
    material: "acero-negro",
    pos: [-23.1024, 89.6025, 25.2853],
    rotq: [-0.038239, 3.3e-05, -0.70649, 0.706689],
    fija: false,
    masaKg: 0.6,
    dims: [13.8142, 3.3843, 4.1021]
  }
];

/** Uniones: 11 del diseño original + 5 soldaduras del brazo compuesto. */
export const UPPER_MACHINE_UNIONES: UnionSpec[] = [
  {
    tipo: "bisagra",
    fija: 2,
    movil: 3,
    eje: "z",
    ancla: [0.042, 111.6845, -15.3885],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 2,
    movil: 3,
    eje: "z",
    ancla: [0.042, 55.497, -15.3885],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 1,
    movil: 3,
    eje: "z",
    ancla: [0.042, 2.5, 52.0364],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 5,
    movil: 2,
    eje: "z",
    ancla: [-0.0024, 124.3256, -14.1316],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 1,
    movil: 2,
    eje: "z",
    ancla: [0.042, 2.5, -15.3885],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 3,
    movil: 5,
    eje: "z",
    ancla: [0.042, 37.157, -0.2246],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 33,
    movil: 32,
    eje: "x",
    ancla: [0.042, 191.7527, 13.1569],
    min: -90,
    max: 0,
    limites: false
  },
  {
    tipo: "bisagra",
    fija: 32,
    movil: 34,
    eje: "z",
    ancla: [0.042, 159.2334, 25.2322],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 1,
    movil: 36,
    eje: "z",
    ancla: [0.042, 2.5, 61.9767],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 34,
    movil: 37,
    eje: "z",
    ancla: [-15.6003, 106.9743, 24.9397],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 34,
    movil: 37,
    eje: "z",
    ancla: [-17.3404, 80.7714, 24.9397],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 34,
    movil: 38,
    eje: "z",
    ancla: [15.6003, 106.9743, 24.9397],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 34,
    movil: 38,
    eje: "z",
    ancla: [17.3404, 80.7714, 24.9397],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 37,
    movil: 40,
    eje: "z",
    ancla: [-28.7, 89.6, 25.3],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 38,
    movil: 39,
    eje: "z",
    ancla: [28.7, 89.6, 25.3],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  },
  {
    tipo: "bisagra",
    fija: 32,
    movil: 35,
    eje: "z",
    ancla: [-0.0776, 166.8214, 19.7493],
    min: -90,
    max: 0,
    limites: true,
    bloqueada: true
  }
];

/** Cable 1: press de pecho · Cable 2: jalón alto. */
export const UPPER_MACHINE_CABLES: CableSpec[] = [
  {
    nodos: [
      {
        pieza: 25,
        local: [0, 0, 0]
      },
      {
        pieza: 14,
        local: [3.6067, 0, 0.0444]
      },
      {
        pieza: 26,
        local: [-3.6061, 0, 0.0824]
      },
      {
        pieza: 21,
        local: [3.4699, 0, -0.9849]
      },
      {
        pieza: 30,
        local: [2.8915, 0, -2.1564]
      },
      {
        pieza: 35,
        local: [0, 0, 0]
      }
    ]
  },
  {
    nodos: [
      {
        pieza: 20,
        local: [0, 45, 0]
      },
      {
        pieza: 12,
        local: [3.5755, 0, -0.4757]
      },
      {
        pieza: 13,
        local: [-3.5692, 0, 0.5206]
      },
      {
        pieza: 11,
        local: [2.539, 0, -2.562]
      },
      {
        pieza: 10,
        local: [3.0951, 0, 1.8522]
      },
      {
        pieza: 17,
        local: [0, 3.397, 0]
      }
    ]
  }
];
