// v0.2.96 · LA CINEMÁTICA DE LOS GESTOS CON BARRA, no solo sus extremos.
//
// El diseñador dio por buenas las cuatro posturas de los extremos y señaló que
// lo que estaba mal era LO QUE PASA ENTRE ELLAS:
//
//   Peso muerto — «los pies no se anclan a la superficie, y los brazos no
//   cuelgan con normalidad: deben operar como cuerdas, que soportan la barra
//   desde el punto de anclaje del hombro. El movimiento implica una extensión
//   de rodillas hasta subir la barra sobre la patela, luego extensión de cadera
//   para llevar la barra a nivel de la pelvis. En todo momento la barra viaja
//   verticalmente como cualquier cuerpo en el mundo real.»
//
//   Press vertical — «la barra discurre verticalmente atravesando la cabeza.
//   La trayectoria correcta es un empuje que primero aleja la barra del rostro
//   con flexión de hombros y luego discurre una curva sigmoidea que evita la
//   cabeza y se reposiciona en la vertical sobre la línea de equilibrio
//   (hombro, cadera, rodilla, pie) para finalmente completar una extensión de
//   codos llevando la barra a su punto más alto.»
//
// Por eso aquí no se mide una foto: se FILMA el gesto entero, paso a paso, y se
// juzga la trayectoria.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

// Filma un gesto entero: sube hasta agotarlo y vuelve a bajar.
const filmar = (ejercicio, pasos = 45) => p.evaluate(async ([ejercicio, pasos]) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  // LA FIGURA TARDA EN CARGAR y a veces no está al primer intento: se espera
  // por la CONDICIÓN, no por el reloj (ver LEEME: esperar por reloj es la
  // primera causa de rojo mentiroso).
  for (let i = 0; i < 20 && !ed.humanFigure; i++) {
    await ed.addHumanFigure();
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!ed.humanFigure) throw new Error("la figura no llegó a cargar");
  // Y SE PIDE EL EJERCICIO QUE TOCA, no «una barra»: con el enganche anterior
  // todavía puesto, un `if (!ed.barraManiqui)` filmaba dos veces el mismo gesto.
  for (let i = 0; i < 20 && ed.barraManiqui?.ejercicio !== ejercicio; i++) {
    ed.ponerBarraEnManos(ejercicio);
    await new Promise((r) => setTimeout(r, 300));
  }
  if (ed.barraManiqui?.ejercicio !== ejercicio) throw new Error("la barra no llegó a engancharse");
  ed.aplicarPosturaBarra("fondo");
  await new Promise((r) => setTimeout(r, 400));

  const fig = ed.humanFigure;
  const seg = (id) => { fig.updateMatrixWorld(true); let m = null; fig.traverse((n) => { if (n.userData?.segmentId === id) m = n; }); return m; };
  // PUNTA Y TALÓN COMO VÉRTICES MATERIALES. El centro de la caja del pie es
  // justo el punto que no viaja cuando el pie derrapa: mirarlo da falsos verdes.
  const pieMarcas = (lado) => {
    const m = seg(`pie-${lado}`); m.updateMatrixWorld(true);
    const pos = m.geometry.getAttribute("position");
    const v = new T.Vector3();
    const mundo = [];
    let punta = null, talon = null, zMax = -1e9, zMin = 1e9, minY = 1e9;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.z > zMax) { zMax = v.z; punta = v.clone(); }
      if (v.z < zMin) { zMin = v.z; talon = v.clone(); }
      const w = v.clone().applyMatrix4(m.matrixWorld);
      mundo.push(w);
      if (w.y < minY) minY = w.y;
    }
    const toca = mundo.filter((w) => w.y - minY < 0.5);
    const c = new T.Vector3();
    for (const w of toca) c.add(w);
    c.multiplyScalar(1 / Math.max(1, toca.length));
    // LA SUELA, ELEGIDA EN EL MARCO DEL PIE (v0.2.99). La banda de arriba se
    // elige por la Y del MUNDO, así que en cuanto el pie se inclina un poco
    // —8,15° en el fondo de la sentadilla— deja de coger la suela entera y se
    // queda con la puntera: el centro se va hacia delante y la referencia
    // miente 5,7 cm. Elegida por la Y LOCAL es la misma suela esté el pie como
    // esté, que es lo que hace la aplicación desde v0.2.97.
    let minLocal = 1e9;
    for (let i = 0; i < pos.count; i++) {
      const y = v.fromBufferAttribute(pos, i).y;
      if (y < minLocal) minLocal = y;
    }
    const suelaLocal = new T.Vector3();
    let nSuela = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y - minLocal >= 0.5) continue;
      suelaLocal.add(v.clone().applyMatrix4(m.matrixWorld));
      nSuela++;
    }
    suelaLocal.multiplyScalar(1 / Math.max(1, nSuela));
    return {
      punta: punta.applyMatrix4(m.matrixWorld).toArray(),
      talon: talon.applyMatrix4(m.matrixWorld).toArray(),
      huella: [c.x, 0, c.z],
      pisada: [suelaLocal.x, 0, suelaLocal.z],
      suela: minY,
    };
  };
  // ¿ATRAVIESA LA BARRA LA CABEZA? Se pregunta por INTERSECCIÓN de verdad y no
  // por holguras de silueta: la barra es un cilindro tumbado sobre X, así que
  // un vértice está dentro si su distancia al EJE, medida en el plano (y, z),
  // es menor que el radio. Cualquier otra medida —cajas envolventes, «cuánto
  // sobresale por delante»— da falsos positivos en cuanto la barbilla asoma más
  // que la barra, que es lo normal en un agarre frontal.
  const penetraCabeza = (barra, radio, adelante) => {
    let dentro = 0;
    const arriba = new T.Vector3(0, 1, 0);
    for (const id of ["cabeza", "cuello"]) {
      const m = seg(id); if (!m) continue;
      m.updateMatrixWorld(true);
      const pos = m.geometry.getAttribute("position");
      const v = new T.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const w = v.fromBufferAttribute(pos, i).clone().applyMatrix4(m.matrixWorld).sub(barra);
        const d = Math.hypot(w.dot(arriba), w.dot(adelante));
        if (radio - d > dentro) dentro = radio - d;
      }
    }
    return +dentro.toFixed(2);
  };
  const foto = () => {
    ed.sincronizarBarraManiqui();
    const J = ed.figureJoints();
    const bar = ed.getObject(ed.barraManiqui.objectId);
    const barra = bar.mesh.position.clone();
    const radio = bar.params?.radiusTop ?? 1.5;
    const a = new T.Vector3(0, 0, 1).applyQuaternion(fig.quaternion).setY(0).normalize();
    const L = pieMarcas("L"), R = pieMarcas("R");
    // EL MEDIO DEL PIE, COMO LO MIDE LA APP: el centroide de lo que toca el
    // suelo. Con el punto medio de punta y talón salía 0,33 cm desplazado y la
    // prueba se peleaba con el plantado por una diferencia de definición.
    const medioPie = new T.Vector3(...L.huella).add(new T.Vector3(...R.huella)).multiplyScalar(0.5);
    const pisada = new T.Vector3(...L.pisada).add(new T.Vector3(...R.pisada)).multiplyScalar(0.5);
    const g = (n) => +(J[n].rotation.x * 180 / Math.PI).toFixed(2);
    const dentro = penetraCabeza(barra, radio, a);
    // ¿A QUÉ DISTANCIA MIRA? Se traza el eje frontal de la cabeza hasta el
    // suelo y se mide cuánto avanza. `null` si mira por encima de la
    // horizontal, o sea si no corta el suelo en ninguna parte.
    const mirar = () => {
      const c = seg("cabeza"); if (!c) return null;
      c.updateMatrixWorld(true);
      const q = c.getWorldQuaternion(new T.Quaternion());
      const vista = new T.Vector3(0, 0, 1).applyQuaternion(q).normalize();
      if (vista.y > -1e-4) return null; // mira al cielo: no hay marca
      const ojo = c.getWorldPosition(new T.Vector3());
      return +(Math.hypot(vista.x, vista.z) * (ojo.y / -vista.y)).toFixed(0);
    };
    // ¿SE HUNDE LA BARRA EN EL CUERPO? Misma medida que con la cabeza: la
    // distancia de cada vértice al EJE de la barra contra su radio.
    const CARNE = ["pierna-L", "pierna-R", "muslo-L", "muslo-R", "pelvis"];
    const enLaCarne = () => {
      let dentro = 0;
      for (const id of CARNE) {
        const m = seg(id); if (!m) continue;
        m.updateMatrixWorld(true);
        const pos = m.geometry.getAttribute("position");
        const v = new T.Vector3();
        for (let i = 0; i < pos.count; i++) {
          const w = v.fromBufferAttribute(pos, i).clone().applyMatrix4(m.matrixWorld).sub(barra);
          const d = Math.hypot(w.y, w.dot(a));
          if (radio - d > dentro) dentro = radio - d;
        }
      }
      return +dentro.toFixed(2);
    };
    return {
      mirada: mirar(),
      carne: enLaCarne(),
      cuello: g("neck"),
      barraY: +barra.y.toFixed(2), barraX: +barra.x.toFixed(2),
      sagital: +barra.dot(a).toFixed(2),
      medioPie: +medioPie.dot(a).toFixed(2),
      // El mismo medio del pie, medido en el marco del pie: es el que vale
      // cuando el pie se inclina, o sea en la sentadilla.
      pisada: +pisada.dot(a).toFixed(2),
      // Cuántos cm de la barra quedan DENTRO de la malla de la cabeza. 0 = no
      // la toca.
      dentro,
      pieL: L, pieR: R,
      rodilla: g("kneeL"), cadera: g("hipL"), columna: g("spine"),
      hombro: g("shoulderL"), codo: g("elbowL"),
      fase: ed.faseDelGesto(),
    };
  };

  const subida = [foto()];
  for (let i = 0; i < pasos; i++) {
    const m = ed.moverPrimitiva(1);
    subida.push(foto());
    if (m === 0) break;
  }
  const bajada = [];
  for (let i = 0; i < pasos; i++) {
    const m = ed.moverPrimitiva(-1);
    bajada.push(foto());
    if (m === 0) break;
  }
  return { subida, bajada };
}, [ejercicio, pasos]);

const d3 = (a, b) => +Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]).toFixed(2);
const peor = (xs) => xs.reduce((s, v) => Math.max(s, v), 0);

// ══════════ PESO MUERTO ═══════════════════════════════════════════════════
console.log("\n── Peso muerto ──────────────────────────────────────────────");
const pm = await filmar("peso-muerto");
const S = pm.subida, B = pm.bajada;

// 1) LA BARRA VIAJA VERTICAL. Es la regla que el diseñador repitió: «en todo
//    momento la barra viaja verticalmente como cualquier cuerpo en el mundo
//    real». Antes se iba 121,44 cm por delante del medio del pie.
// LO QUE HACE VERTICAL A UNA TRAYECTORIA es que no se DESVÍE: se mide el
// recorrido sagital de la barra de punta a punta del gesto. Y aparte, que ese
// carril caiga sobre el medio del pie, con un centímetro de margen — el cero de
// esa referencia se movió medio centímetro al pasar a medir la huella donde el
// pie toca de verdad, y las posturas están calibradas contra el cero anterior.
// SE MIDE DESDE EL PASO 1. El paso 0 es la POSTURA tal cual la aplicó el
// diseñador; la plomada del brazo —que es quien clava la barra sobre el medio
// del pie— no ha corrido todavía, así que ese primer fotograma puede estar
// medio centímetro fuera del carril. Lo que este proyecto promete es que la
// barra no se desvía MIENTRAS SUBE.
//
// Y DESDE v0.2.98 EL CARRIL LO NEGOCIA EL CUERPO. El diseñador añadió la otra
// mitad de la regla: «la barra debe detectar colisión con la pierna, el muslo y
// cadera (de forma que la barra desliza anterior y sobre ellas, y al bloqueo no
// se hunde en el cuerpo)». Las dos reglas conviven porque la barra solo se
// aparta de la vertical LO QUE EL CUERPO LA EMPUJA, nunca por su cuenta: el
// carril es recto donde hay hueco y se abomba donde hay espinilla, muslo o
// cadera. Por eso aquí ya no se exige media décima de recto, sino que la
// desviación no supere el bulto del propio cuerpo.
const carril = S.slice(1).map((s) => s.sagital);
console.log("   carril sagital:", S.map((s) => +s.sagital.toFixed(1)).join(" "));
const recorrido = +(Math.max(...carril) - Math.min(...carril)).toFixed(2);
ok(recorrido < 6.5, `la barra sube pegada a la vertical (se abre ${recorrido} cm para pasar el cuerpo)`);
// EL MEDIO DEL PIE SIGUE SIENDO EL BLANCO donde el cuerpo no estorba: eso es lo
// que persigue la plomada, y el roce solo la adelanta.
const desvio = peor(S.map((s) => s.sagital - s.medioPie));
const atras = Math.min(...S.map((s) => s.sagital - s.medioPie));
ok(atras > -1, `y nunca cae POR DETRÁS del medio del pie (${atras.toFixed(2)} cm)`);
ok(desvio < 6.5, `ni se despega de él más que el bulto del cuerpo (${desvio.toFixed(2)} cm)`);
ok(peor(S.map((s) => Math.abs(s.barraX))) < 0.1, "y sin desviarse de lado");

// 2) Y SUBE, sin volver a bajar a mitad de camino (antes bajaba 10,15 cm).
let baja = 0;
for (let i = 1; i < S.length; i++) baja = Math.min(baja, S[i].barraY - S[i - 1].barraY);
ok(baja > -0.2, `la barra nunca retrocede (peor bajada ${baja.toFixed(2)} cm)`);
ok(S[S.length - 1].barraY - S[0].barraY > 55,
  `y recorre el gesto entero (${S[0].barraY} → ${S[S.length - 1].barraY} cm)`);

// 3) EL ORDEN: RODILLA Y LUEGO CADERA. «Extensión de rodillas hasta subir la
//    barra sobre la patela, luego extensión de cadera». Antes la rodilla no se
//    movía en absoluto: se quedaba clavada en 94,80° los 22 pasos.
const tiron = S.filter((s) => s.fase === "tirón");
const bloqueo = S.filter((s) => s.fase === "bloqueo");
ok(tiron.length >= 5 && bloqueo.length >= 5,
  `el gesto se parte en dos fases (${tiron.length} de tirón, ${bloqueo.length} de bloqueo)`);
const recorreRodilla = Math.abs(tiron[tiron.length - 1].rodilla - tiron[0].rodilla);
const recorreColumna = Math.abs(tiron[tiron.length - 1].columna - tiron[0].columna);
ok(recorreRodilla > 55, `en el TIRÓN manda la rodilla (${recorreRodilla.toFixed(1)}°)`);
ok(recorreColumna < 0.5, `y el tronco SOSTIENE, no se endereza (${recorreColumna.toFixed(2)}°)`);
const recorreColumnaB = Math.abs(bloqueo[bloqueo.length - 1].columna - bloqueo[0].columna);
ok(recorreColumnaB > 55, `en el BLOQUEO manda la espalda (${recorreColumnaB.toFixed(1)}°)`);

// 4) LOS PIES SON UN ANCLAJE, también DURANTE el gesto. Antes la punta barría
//    120,81 cm, el talón 78,37, y la planta se despegaba 11,54 cm.
for (const lado of ["pieL", "pieR"]) {
  const dPunta = peor(S.map((s) => d3(S[0][lado].punta, s[lado].punta)));
  const dTalon = peor(S.map((s) => d3(S[0][lado].talon, s[lado].talon)));
  const suela = peor(S.map((s) => Math.abs(s[lado].suela)));
  ok(dPunta < 0.5, `${lado}: la punta no se mueve en todo el gesto (${dPunta} cm)`);
  ok(dTalon < 0.5, `${lado}: ni el talón (${dTalon} cm)`);
  ok(suela < 0.2, `${lado}: y la planta no se despega (${suela} cm)`);
}

// 5) ATERRIZA EN EL BLOQUEO APROBADO, y no donde tope la primera articulación.
//    Antes moría con la cadera en su tope y la barra 24,89 cm por debajo.
const fin = S[S.length - 1];
ok(Math.abs(fin.rodilla) < 0.5 && Math.abs(fin.cadera) < 0.5 && Math.abs(fin.columna) < 0.5,
  `termina en el bloqueo aprobado (rodilla ${fin.rodilla}°, cadera ${fin.cadera}°, columna ${fin.columna}°)`);
// EL INVARIANTE NO ES UN ÁNGULO, ES LA PLOMADA. Fijar el hombro en −9,41 —el
// valor que trae la postura aprobada— era medir el medio, no el fin: el brazo
// es una cuerda y su ángulo lo resuelve la plomada contra la huella, así que
// cambia si cambia cómo se mide la huella. Lo que no puede cambiar es dónde
// acaba la barra.
// EN EL BLOQUEO MANDA EL MUSLO, NO EL MEDIO DEL PIE (v0.2.98). Antes se exigía
// que la barra acabase sobre la vertical del medio del pie con un centímetro de
// margen. De pie eso la metía 1,35 cm dentro de la pelvis y 0,93 dentro del
// muslo: la vertical ideal pasa POR DENTRO del cuerpo. El diseñador pidió que
// «al bloqueo no se hunde en el cuerpo», así que ahora acaba donde la deja la
// carne —unos 5,7 cm por delante del medio del pie, que es el grosor del
// muslo— y lo que se exige es que ahí no toque nada.
const salido = fin.sagital - fin.medioPie;
ok(salido > 0 && salido < 7,
  `acaba apoyada en el muslo, por delante del medio del pie `
  + `(${salido.toFixed(2)} cm, hombro ${fin.hombro}°)`);

// 6) Y LA BAJADA DESHACE LO MISMO, sin estado guardado: las fases se leen del
//    mundo, así que el gesto inverso las recorre al revés solo.
const vuelta = B[B.length - 1];
ok(Math.abs(vuelta.barraY - S[0].barraY) < 0.5,
  `la tracción devuelve la barra a su sitio (${vuelta.barraY} cm, partida ${S[0].barraY})`);
ok(Math.abs(vuelta.rodilla - S[0].rodilla) < 0.5 && Math.abs(vuelta.columna - S[0].columna) < 0.5,
  `y el cuerpo a su postura de suelo (rodilla ${vuelta.rodilla}°, columna ${vuelta.columna}°)`);
// Y LA BAJADA PASA POR LAS MISMAS POSTURAS, no solo por los mismos extremos.
// Aquí estaba escondido un fallo de verdad: la tracción buscaba «la última fase
// cuyo umbral está cruzado», y el umbral de la ÚLTIMA fase es `meta` —termina
// al llegar a su postura, no al cruzar nada—, así que esa fase nunca salía
// elegida. Bajando desde el bloqueo se cogía la fase de TIRÓN con la meta del
// suelo y el gesto entero se deshacía de un tramo: 32 pasos para subir y 20
// para bajar, por posturas que no eran las mismas (a rodilla 65° la columna iba
// a 53,5° bajando y a 78° subiendo). Se compara la columna que le corresponde a
// cada rodilla, interpolando la subida.
const columnaEn = (rodilla) => {
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i];
    if (rodilla <= a.rodilla && rodilla >= b.rodilla) {
      const t = a.rodilla === b.rodilla ? 0 : (a.rodilla - rodilla) / (a.rodilla - b.rodilla);
      return a.columna + t * (b.columna - a.columna);
    }
  }
  return null;
};
const desajustes = B.map((s) => {
  const c = columnaEn(s.rodilla);
  return c === null ? 0 : Math.abs(s.columna - c);
});
// EL CODO ENTRE FASES CAE UN PASO DESPLAZADO, y de ahí sale el residuo. La
// subida corta el tirón cuando la barra pasa la rótula —rodilla 24,8°, un paso
// antes de la postura del hito, porque el paso es de 5°— mientras que la bajada
// termina el bloqueo EN esa postura, rodilla 23,77°. Los dos tramos de bloqueo
// son rectas de (rodilla, 78°) a (0, 0) con arranques a 1° de distancia, así
// que sus pendientes difieren un 4%: hasta 3,2° a media bajada, cero en los dos
// extremos. Lo que esta prueba vigila es que no vuelva a ser lo de antes, que
// eran 25°: la bajada deshaciendo el gesto entero de un tramo.
console.log("   desajuste columna:", desajustes.map((d) => d.toFixed(1)).join(" "));
ok(peor(desajustes) < 5,
  `y BAJA POR DONDE SUBIÓ: a cada rodilla le toca su misma columna, sin pasarse `
  + `del paso de 5° ni en el codo entre fases (peor ${peor(desajustes).toFixed(2)}°)`);
ok(desajustes[desajustes.length - 1] < 0.5 && desajustes[0] < 0.5,
  `y en los dos extremos coinciden exactamente `
  + `(${desajustes[0].toFixed(2)}° arriba, ${desajustes[desajustes.length - 1].toFixed(2)}° abajo)`);
ok(Math.abs(B.length - S.length) <= 2,
  `con los mismos pasos en los dos sentidos (${S.length} subiendo, ${B.length} bajando)`);

const carrilB = B.slice(1).map((s) => s.sagital);
console.log("   carril de bajada:", B.map((s) => +s.sagital.toFixed(1)).join(" "));
console.log("   ...contra el medio del pie:", B.map((s) => +(s.sagital - s.medioPie).toFixed(1)).join(" "));
const recorridoB = +(Math.max(...carrilB) - Math.min(...carrilB)).toFixed(2);
ok(recorridoB < 6.5, `bajando, la barra recorre el mismo carril (${recorridoB} cm)`);

// 7) LA MIRADA NO SE SUELTA DE SU MARCA (v0.2.97). Lo pidió el diseñador con su
//    razón médica: «si es posible mantener la mirada en todo momento a 2 o 2.5
//    metros por delante de la figura sería ideal (en el mundo real, un peso
//    muerto que se baja con el cuello en flexión tiene mayor riesgo de producir
//    alguna lesión espinal)».
//
// ESTO NO ES UNA PRUEBA DE ADORNO: la acomodación estaba escrita y NO CORRÍA.
// El cuello se llama «neck» —sin lado— y se le buscaba como «neckL»/«neckR», de
// modo que se descartaba en silencio en los dos lados; encima el plan le ponía
// candado, porque los candados solo se abren para lo que el plan nombra. El
// resultado era un cuello clavado en −51,8° durante los 70 pasos: mirando al
// suelo a 1,6 m abajo y AL TECHO en el bloqueo (51,8° sobre la horizontal).
//    Y CON UN TECHO, que es el matiz de v0.2.98: «al ascender hasta el bloqueo,
//    eventualmente la posición del cuello se fija hasta alcanzar la postura
//    anatómica de quien mira hacia el frente (pasa de extensión a neutral)».
//    Sostener la marca de pie exigiría 32° de barbilla abajo, que nadie adopta
//    al terminar un peso muerto: el cuello recorre de extensión a neutral y ahí
//    se queda. Bajando se deshace solo, porque esto se resuelve del mundo.
const todo = [...S, ...B];
console.log("   cuello:", todo.filter((_, i) => i % 6 === 0).map((s) => s.cuello).join(" "));
console.log("   mirada (cm):", todo.filter((_, i) => i % 6 === 0).map((s) => s.mirada ?? "—").join(" "));
ok(todo.every((s) => s.cuello <= 0.01),
  `el cuello NUNCA pasa a flexión: va de extensión a neutral y para `
  + `(máximo ${Math.max(...todo.map((s) => s.cuello))}°)`);
ok(Math.abs(S[S.length - 1].cuello) < 0.5,
  `y en el bloqueo queda neutral, mirando al frente (${S[S.length - 1].cuello}°)`);
ok(Math.abs(B[B.length - 1].cuello - S[0].cuello) < 1.5,
  `bajando vuelve a su extensión de partida (${B[B.length - 1].cuello}° / ${S[0].cuello}°)`);
// MIENTRAS EL CUELLO TIENE RECORRIDO, la marca manda: se comprueba solo en los
// pasos que no están topados en neutral, que son en los que hay algo que exigir.
const conMarca = todo.filter((s) => s.cuello < -0.5);
ok(conMarca.every((s) => s.mirada !== null && s.mirada >= 190 && s.mirada <= 260),
  `y mientras le queda extensión, la vista se queda en su horquilla de 2 a 2,5 m `
  + `(${Math.min(...conMarca.map((s) => s.mirada))}–${Math.max(...conMarca.map((s) => s.mirada))} cm `
  + `en ${conMarca.length} de ${todo.length} pasos)`);

// 8) LA BARRA ROZA EL CUERPO, NO LO ATRAVIESA (v0.2.98). «La barra debe
//    detectar colisión con la pierna, el muslo y cadera (de forma que la barra
//    desliza anterior y sobre ellas, y al bloqueo no se hunde en el cuerpo).»
//    Antes se hundía 1,44 cm en la espinilla, 1,36 en el muslo y 1,35 en la
//    pelvis justo en el bloqueo.
console.log("   dentro de la carne:", todo.filter((_, i) => i % 4 === 0).map((s) => s.carne).join(" "));
ok(peor(S.map((s) => s.carne)) < 0.05,
  `subiendo, la barra no se mete en la pierna ni en el muslo ni en la cadera `
  + `(máx ${peor(S.map((s) => s.carne))} cm en ${S.length} pasos)`);
ok(peor(B.map((s) => s.carne)) < 0.05,
  `y bajando tampoco (máx ${peor(B.map((s) => s.carne))} cm)`);
ok(fin.carne < 0.05, `en el bloqueo la barra apoya, no se hunde (${fin.carne} cm)`);

// ══════════ PRESS VERTICAL ════════════════════════════════════════════════
console.log("\n── Press vertical ───────────────────────────────────────────");
const pv = await filmar("press-vertical");
const P = pv.subida;

// 1) LA BARRA SUBE Y NO BAJA. Antes moría con el codo bloqueado, el hombro a
//    medio camino y la barra 26,21 cm por debajo del bloqueo, tras bajar 1,30.
let bajaP = 0;
for (let i = 1; i < P.length; i++) bajaP = Math.min(bajaP, P[i].barraY - P[i - 1].barraY);
ok(bajaP > -0.2, `la barra nunca retrocede (peor bajada ${bajaP.toFixed(2)} cm)`);
ok(P[P.length - 1].barraY - P[0].barraY > 30,
  `y llega arriba del todo (${P[0].barraY} → ${P[P.length - 1].barraY} cm)`);

// 2) LA SIGMOIDE. Primero se aleja del rostro, luego vuelve a la vertical sobre
//    la línea de equilibrio. Una diagonal —lo que hacía antes— se delata porque
//    NO vuelve: acababa 36,41 cm por delante del medio del pie.
const aleja = P.map((s) => s.sagital - s.medioPie);
const vientre = Math.max(...aleja);
const iVientre = aleja.indexOf(vientre);
// EL VIENTRE CRECIÓ A PROPÓSITO. Con la salida nueva la barra ya arranca 9,2 cm
// por delante —«más hacia anterior e inferior», lo pidió el diseñador— y el
// vientre es aproximadamente esa partida más los 9,45 cm que aporta el gesto.
ok(vientre > 15 && vientre < 22,
  `la barra se ALEJA del rostro a mitad de camino (${vientre.toFixed(2)} cm en el paso ${iVientre})`);
ok(iVientre > 3 && iVientre < P.length - 4,
  `y el punto más alejado cae en MEDIO del recorrido, no al principio (paso ${iVientre} de ${P.length - 1})`);
ok(Math.abs(aleja[aleja.length - 1]) < 1,
  `y vuelve a la vertical sobre la línea de equilibrio (${aleja[aleja.length - 1].toFixed(2)} cm)`);

// 3) NO ATRAVIESA LA CABEZA. Se mide contra la SILUETA de la malla. Ojo: la
//    postura aprobada de partida ya arranca con la barra rozando (el agarre en
//    el rack la deja pegada a la cara), así que lo que se exige es que la
//    holgura no EMPEORE y que se despegue en cuanto el gesto arranca.
const dentros = P.map((s) => s.dentro);
console.log("   perfil de penetración:", dentros.join(" "));
console.log("   perfil de alejamiento:", P.map((s) => +(s.sagital - s.medioPie).toFixed(1)).join(" "));
const peorDentro = Math.max(...dentros);
ok(peorDentro < 1.5, `la barra no atraviesa la cabeza (penetración máx ${peorDentro} cm)`);
// LA BARBILLA SE ROZA AL SALIR DEL RACK, y no es cosa de la trayectoria: la
// postura aprobada «Press vertical» YA arranca con 0,82 cm de la barra
// dentro de la malla (el agarre frontal deja la barra sobre las clavículas,
// justo bajo el mentón). Despejarla del todo desde el paso 0 exige mover una
// postura que el diseñador dio por buena, así que lo que se exige aquí es que
// no EMPEORE mucho y que se despeje pronto. Medido: 0,82 al arrancar, pico de
// 1,42 y limpio a partir del paso 8 de 31.
// Y YA NO ROZA NI AL SALIR. La postura vieja arrancaba con 0,82 cm de la barra
// dentro de la malla —y su EJE atravesaba el cráneo 14,12 cm de lado a lado—;
// la salida nueva sale limpia desde el paso 0.
ok(dentros[0] === 0, `la salida del rack ya no toca la cara (${dentros[0]} cm en el paso 0)`);
const tocan = dentros.filter((h) => h > 0.05).length;
ok(tocan === 0, `y no la toca en ningún paso del gesto (${tocan} de ${dentros.length})`);
const mitad = dentros.slice(Math.ceil(dentros.length / 2));
ok(Math.max(...mitad) < 0.05,
  `de la mitad del gesto en adelante va despejada (${Math.max(...mitad)} cm)`);

// 4) TERMINA EN LA POSTURA APROBADA.
const finP = P[P.length - 1];
ok(Math.abs(finP.hombro + 166) < 0.5 && Math.abs(finP.codo) < 0.5,
  `termina en el bloqueo aprobado (hombro ${finP.hombro}°, codo ${finP.codo}°)`);

// 5) Y LOS PIES TAMPOCO SE MUEVEN EN EL PRESS.
const dPuntaP = peor(P.map((s) => d3(P[0].pieL.punta, s.pieL.punta)));
ok(dPuntaP < 0.5, `los pies siguen clavados durante el press (${dPuntaP} cm)`);

// 6) LA BAJADA VUELVE AL RACK.
const vueltaP = pv.bajada[pv.bajada.length - 1];
ok(Math.abs(vueltaP.barraY - P[0].barraY) < 0.5,
  `la tracción devuelve la barra al rack (${vueltaP.barraY} cm, partida ${P[0].barraY})`);

// ══════════ NO REGRESIÓN ══════════════════════════════════════════════════
// ══════════ SENTADILLAS ═══════════════════════════════════════════════════
//
// EL EQUILIBRIO (v0.2.99). «La limitación del rango de movimiento del tobillo
// (dorsiflexión limitada) hace que durante el movimiento la barra se desplace
// muy posterior al centro de gravedad (el medio del pie) [...] en el mundo real
// este atleta caería irremediablemente hacia atrás producto del peso de la
// barra.» Medido antes de arreglarlo: hasta 50,5 cm por detrás.
//
// Y LA DIFERENCIA ENTRE LAS DOS SALE SOLA, que es lo que se comprueba abajo:
// «backsquat permite mayor inclinación del torso porque usa más movilidad de
// cadera; en cambio, frontsquat mantiene un torso vertical para prevenir la
// caída de la barra a expensas de mayor rango de rodilla y tobillos». No está
// declarado en ninguna parte: es geometría del apoyo. La barra va rígida al
// tronco, apoyada en las clavículas o en los trapecios, y dejar el mismo punto
// del suelo debajo pide inclinaciones distintas.
const inclinacion = {};
for (const [ej, nombre] of [["sentadilla-frontal", "frontal"], ["sentadilla-trasera", "trasera"]]) {
  console.log(`\n── Sentadilla ${nombre} ─────────────────────────────────────`);
  const sq = await filmar(ej);
  const U = sq.subida, D = sq.bajada; // subida = ponerse de pie; bajada = bajar
  const todos = [...U, ...D];

  // 1) LA BARRA SE QUEDA SOBRE EL MEDIO DEL PIE. Es la regla física entera: la
  //    carga sobre la base de apoyo. Se mide contra la pisada en el marco del
  //    pie, que es la referencia que no miente cuando el pie se inclina.
//
//    SE MIDE DESDE EL PASO 1, como el carril del peso muerto: el paso 0 es la
//    POSTURA tal cual la aplica el diseñador, antes de que corra ninguna
//    acomodación. Y ahí hay algo que conviene tener anotado: la postura de la
//    sentadilla TRASERA trae la barra 14,1 cm por detrás del medio del pie, de
//    pie y en el fondo. No es un fallo del gesto —es la geometría del modelo:
//    el hombro del rig cae sobre el tobillo, el medio del pie está 9,1 cm por
//    delante y la barra se apoya otros 5 cm por detrás de la nuca—. El gesto lo
//    corrige en el primer paso; la postura estática, no, y ASÍ SE QUEDA por
//    decisión del diseñador: «la postura estaría bien tal cual, el gesto hace el
//    trabajo adecuado». O sea que el paso 0 no se mide, y no por indulgencia.
  const fuera = todos.map((s) => +(s.sagital - s.pisada).toFixed(2));
  const enGesto = [...U.slice(1), ...D].map((s) => +(s.sagital - s.pisada).toFixed(2));
  console.log(`   barra − medio del pie (paso 0 crudo: ${fuera[0]}):`,
    U.filter((_, i) => i % 4 === 0).map((s) => +(s.sagital - s.pisada).toFixed(1)).join(" "));
  ok(peor(enGesto.map(Math.abs)) < 3,
    `la barra se queda sobre el medio del pie en todo el gesto `
    + `(peor ${peor(enGesto.map(Math.abs))} cm, antes 50,5)`);
  ok(Math.min(...enGesto) > -3,
    `y en concreto NO se va por detrás, que es lo que le haría caerse `
    + `(${Math.min(...enGesto)} cm)`);
  // Y LA ANCHURA DE LA POSTURA NO SE CIERRA (v0.2.99): iba de 60,1 cm a 39,4.
  const anchos = todos.map((s) =>
    +Math.hypot(s.pieL.pisada[0] - s.pieR.pisada[0], s.pieL.pisada[2] - s.pieR.pisada[2]).toFixed(2));
  ok(Math.max(...anchos) - Math.min(...anchos) < 1.5,
    `y la postura no se cierra al bajar (${Math.min(...anchos)}–${Math.max(...anchos)} cm de separación, antes 39,4–60,1)`);

  // 2) EL GESTO PARA EN LA POSTURA APROBADA, no donde tope una articulación.
  //    Sin plan la sentadilla no tenía meta: seguía hasta rodilla 150° y cadera
  //    −134,6°, contra los 126° y −78,61° del modelo.
  const fondo = D[D.length - 1];
  ok(Math.abs(fondo.rodilla - 126) < 1 && Math.abs(fondo.cadera + 78.61) < 1,
    `el fondo es el del modelo (rodilla ${fondo.rodilla}°, cadera ${fondo.cadera}°)`);
  const arriba = U[U.length - 1];
  ok(Math.abs(arriba.rodilla) < 1 && Math.abs(arriba.cadera) < 1,
    `y arriba se termina de pie (rodilla ${arriba.rodilla}°, cadera ${arriba.cadera}°)`);

  // 3) LOS PIES SIGUEN SIENDO UN ANCLAJE.
  for (const lado of ["pieL", "pieR"]) {
    const d = peor(todos.map((s) => d3(U[0][lado].pisada, s[lado].pisada)));
    ok(d < 1.5, `${lado}: la pisada no viaja por el suelo (${d} cm)`);
  }

  inclinacion[nombre] = { fondo: fondo.columna, peor: Math.max(...todos.map((s) => s.columna)) };
  console.log(`   inclinación del tronco: ${todos.map((s) => s.columna).filter((_, i) => i % 6 === 0).join(" ")}`);
}

// 4) Y LA FRONTAL VA MÁS VERTICAL QUE LA TRASERA. Nadie lo declara: sale del
//    sitio donde se apoya la barra.
console.log(`\n   tronco en el fondo — frontal ${inclinacion.frontal.fondo}° · trasera ${inclinacion.trasera.fondo}°`);
ok(inclinacion.frontal.fondo < inclinacion.trasera.fondo - 10,
  `la FRONTAL mantiene el torso más vertical que la TRASERA `
  + `(${inclinacion.frontal.fondo}° contra ${inclinacion.trasera.fondo}° en el fondo)`);
ok(inclinacion.frontal.peor < 15,
  `y la frontal no llega a inclinarse en ningún momento (máximo ${inclinacion.frontal.peor}°)`);
ok(inclinacion.trasera.peor > 20,
  `mientras la trasera sí usa la cadera (máximo ${inclinacion.trasera.peor}°)`);

console.log("\n── Sin plan, todo sigue igual ───────────────────────────────");
// Una zona SIN plan tiene que comportarse exactamente como siempre: es lo que
// protege a las máquinas y a las sentadillas de este cambio.
const sinPlan = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.soltarBarraDelManiqui(true);
  await new Promise((r) => setTimeout(r, 300));
  ed.applyPose("Sentado");
  await new Promise((r) => setTimeout(r, 300));
  ed.activarZona("superior", null);
  ed.activarZona("bisagra", null);
  ed.activarZona("inferior", "sim");
  const J = ed.figureJoints();
  const g = (n) => +(J[n].rotation.x * 180 / Math.PI).toFixed(2);
  const antes = { rodilla: g("kneeL"), cadera: g("hipL") };
  const fase = ed.faseDelGesto();
  const movidas = ed.moverPrimitiva(1);
  return { fase, movidas, antes, rodilla: g("kneeL"), cadera: g("hipL") };
});
ok(sinPlan.fase === null, `sin ejercicio con plan no hay fase (${sinPlan.fase})`);
ok(sinPlan.movidas > 0, `y el 8/9 sigue moviendo la zona (${sinPlan.movidas} articulaciones)`);
ok(Math.abs(sinPlan.rodilla - sinPlan.antes.rodilla - -5) < 0.01,
  `con su paso de siempre: la rodilla extiende 5° exactos (${sinPlan.antes.rodilla}° → ${sinPlan.rodilla}°)`);
ok(Math.abs(sinPlan.cadera - sinPlan.antes.cadera - 4.5) < 0.01,
  `y la cadera sus 4,5° (peso 0,9) (${sinPlan.antes.cadera}° → ${sinPlan.cadera}°)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
