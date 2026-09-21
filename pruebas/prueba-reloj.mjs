// PRUEBA: LOS ÁNGULOS SE PIDEN EN HORAS DEL RELOJ (v0.3.48).
//
// El grado de una articulación se cuenta desde su propia pose de diseño, así
// que el mismo número significa cosas distintas en dos bisagras de la misma
// máquina y no hay manera de comprobarlo mirando. La hora sí: **las 12 están
// siempre arriba y las 6 siempre abajo**, en toda la máquina.
//
// Lo que se mide:
//   · la aritmética de la esfera —una hora son 30°, un minuto 0,5°, y 4:30 cae
//     a medio camino entre el 4 y el 5—;
//   · que el 12 es el ARRIBA DEL MUNDO y no el de la pieza: una pieza colocada
//     encima del pivote marca las 12, a la derecha las 3, debajo las 6, sin
//     importar cómo naciera la unión;
//   · que dos horas NO bastan para definir un tramo —definen dos— y que elegir
//     el otro lado da el arco complementario, no el más grande ni el más chico;
//   · y que el HUD de la simulación habla en horas.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);

// ── 1. LA ARITMÉTICA DE LA ESFERA ────────────────────────────────────────
const aritmetica = await page.evaluate(() => {
  const R = window.exersuite.reloj;
  return {
    // Las horas de la primera tabla: 1 = 30°, 3 = 90°, 6 = 180°, 12 = 360 ≡ 0.
    horas: [1, 2, 3, 6, 9, 11, 12].map((h) => R.gradosDesdeHora({ hora: h, minuto: 0 })),
    // La aguja de la HORA: 4:30 cae a medio camino entre el 4 (120°) y el 5 (150°).
    mediaHora: R.gradosDesdeHora({ hora: 4, minuto: 30 }),
    unMinuto: R.gradosDesdeHora({ hora: 12, minuto: 1 }),
    // Ida y vuelta por el texto, que es por donde pasa lo que teclea el usuario.
    texto: [0, 45, 90, 135, 180, 270, 359].map((g) => R.formatearHora(g)),
    vuelta: ["12:00", "1:30", "3:00", "4:30", "6:00", "9:00"].map((t) => R.parsearHora(t)),
    // Las formas en que la gente escribe una hora dan todas lo mismo.
    formas: ["4:30", "4h30", "4 30", "4.5"].map((t) => R.parsearHora(t)),
    basura: ["", "13:00", "4:75", "hola", "-3"].map((t) => R.parsearHora(t)),
    // Una amplitud NO es una hora: se dice en tiempo y con su unidad.
    amplitudes: [15, 30, 45, 90, 360].map((g) => R.formatearAmplitud(g)),
  };
});
console.log("ARITMÉTICA:", JSON.stringify(aritmetica));
ok(
  JSON.stringify(aritmetica.horas) === JSON.stringify([30, 60, 90, 180, 270, 330, 0]),
  "una hora son 30°: la tabla de horas sale clavada",
  aritmetica.horas.join(" · "),
);
ok(aritmetica.mediaHora === 135, "y 4:30 son 135°: la AGUJA DE LA HORA, a medio camino entre el 4 y el 5", aritmetica.mediaHora);
ok(aritmetica.unMinuto === 0.5, "un minuto es medio grado", aritmetica.unMinuto);
ok(
  JSON.stringify(aritmetica.texto) === JSON.stringify(["12:00", "1:30", "3:00", "4:30", "6:00", "9:00", "11:58"]),
  "los grados se escriben como horas",
  aritmetica.texto.join(" · "),
);
ok(
  JSON.stringify(aritmetica.vuelta) === JSON.stringify([0, 45, 90, 135, 180, 270]),
  "y se vuelven a leer sin perder nada",
  aritmetica.vuelta.join(" · "),
);
ok(
  aritmetica.formas.every((v) => v === 135),
  "4:30, 4h30, «4 30» y 4.5 son la misma hora",
  aritmetica.formas.join(" · "),
);
ok(
  aritmetica.basura.every((v) => v === null),
  "y lo que no es una hora se rechaza en vez de adivinarse",
  aritmetica.basura.join(" · "),
);
ok(
  JSON.stringify(aritmetica.amplitudes) === JSON.stringify(["30 min", "1 h", "1 h 30 min", "3 h", "12 h"]),
  "una amplitud se dice en tiempo, no como si fuera una hora del reloj",
  aritmetica.amplitudes.join(" · "),
);

// ── 2. EL 12 ES EL ARRIBA DEL MUNDO ──────────────────────────────────────
const esfera = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const base = ed.addComponent("prim-box");
  base.mesh.position.set(0, 30, 0);
  base.mesh.updateMatrixWorld(true);
  const brazo = ed.addComponent("prim-box");
  const j = ed.connect(base.id, brazo.id, "revolute", new T.Vector3(0, 30, 0));
  j.axis = "z";
  // Se coloca el brazo en las cuatro direcciones cardinales del plano de giro y
  // se pregunta qué hora marca. Es la prueba entera: si el 12 fuera de la pieza
  // y no del mundo, esto no saldría.
  const donde = {};
  const sitios = { "12": [0, 20, 0], "3": [20, 0, 0], "6": [0, -20, 0], "9": [-20, 0, 0] };
  for (const [nombre, d] of Object.entries(sitios)) {
    brazo.mesh.position.set(d[0], 30 + d[1], d[2]);
    brazo.mesh.updateMatrixWorld(true);
    const r = ed.relojDeUnion(j);
    donde[nombre] = r ? window.exersuite.reloj.formatearHora(r.c0) : null;
  }
  // Y con el eje VERTICAL no hay reloj: el plano de giro es el suelo y ahí no
  // hay arriba. Decirlo es más útil que inventar una lectura que tiemble.
  brazo.mesh.position.set(20, 30, 0);
  brazo.mesh.updateMatrixWorld(true);
  j.axis = "y";
  const vertical = ed.relojDeUnion(j);
  return { donde, vertical };
});
console.log("ESFERA:", JSON.stringify(esfera));
ok(esfera.donde["12"] === "12:00", "una pieza ENCIMA del pivote marca las 12", esfera.donde["12"]);
ok(esfera.donde["3"] === "3:00", "a la derecha, las 3", esfera.donde["3"]);
ok(esfera.donde["6"] === "6:00", "debajo, las 6", esfera.donde["6"]);
ok(esfera.donde["9"] === "9:00", "y a la izquierda, las 9", esfera.donde["9"]);
ok(esfera.vertical === null, "con el eje vertical no hay esfera, y se dice", JSON.stringify(esfera.vertical));

// ── 3. DOS HORAS NO DEFINEN UN TRAMO: DEFINEN DOS ────────────────────────
const tramos = await page.evaluate(() => {
  const R = window.exersuite.reloj;
  const recta = { c0: 0, s: 1 };
  const derecha = R.tramoDesdeHoras(recta, 0, 90, false);     // de las 12 a las 3
  const alreves = R.tramoDesdeHoras(recta, 90, 0, false);     // …y de las 3 a las 12
  // Con el pasador al revés (s = −1) las mismas horas dan el mismo ARCO, sólo
  // que contado hacia atrás en la escala de la unión: eso es lo que el signo
  // tenía que absorber.
  const pasadorAlReves = R.tramoDesdeHoras({ c0: 0, s: -1 }, 0, 90, false);
  // Ida y vuelta: lo que se guarda se vuelve a enseñar igual, y también con el
  // pasador al revés, que es donde los campos se daban la vuelta solos.
  const ida = R.tramoDesdeHoras(recta, 60, 150, false);
  const vuelta = R.horasDesdeTramo(recta, ida.min, ida.max);
  const vueltaAlReves = R.horasDesdeTramo({ c0: 0, s: -1 }, pasadorAlReves.min, pasadorAlReves.max);
  // Y la escala de placa no da la vuelta: cruzar el 0 recorta y avisa.
  const cruza = R.tramoDesdeHoras({ c0: 30, s: 1 }, 0, 90, true);
  return { derecha, alreves, pasadorAlReves, ida, vuelta, vueltaAlReves, cruza };
});
console.log("TRAMOS:", JSON.stringify(tramos));
ok(
  tramos.derecha.max - tramos.derecha.min === 90,
  "de las 12 a las 3 son 90°: un cuarto de vuelta",
  `${tramos.derecha.min} … ${tramos.derecha.max}`,
);
ok(
  tramos.alreves.max - tramos.alreves.min === 270,
  "y de las 3 a las 12 son 270°: el ORDEN de las dos horas elige el arco, no su tamaño",
  `${tramos.alreves.min} … ${tramos.alreves.max}`,
);
ok(
  tramos.pasadorAlReves.max - tramos.pasadorAlReves.min === 90 && tramos.pasadorAlReves.min === -90,
  "con el pasador al revés el arco es el mismo, contado hacia atrás en la escala",
  `${tramos.pasadorAlReves.min} … ${tramos.pasadorAlReves.max}`,
);
ok(
  tramos.vuelta.desde === 60 && tramos.vuelta.hasta === 150,
  "lo que se guarda se vuelve a enseñar igual",
  JSON.stringify(tramos.vuelta),
);
ok(
  tramos.vueltaAlReves.desde === 0 && tramos.vueltaAlReves.hasta === 90,
  "y también con el pasador al revés: los campos no se dan la vuelta solos",
  JSON.stringify(tramos.vueltaAlReves),
);
ok(tramos.cruza.recortado === true, "y un tramo que cruza las placas enfrentadas se recorta y se avisa", JSON.stringify(tramos.cruza));

// ── 4. EL HUD HABLA EN HORAS ─────────────────────────────────────────────
const hud = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const base = ed.addComponent("prim-box");
  base.params = { kind: "box", width: 10, height: 10, depth: 10 };
  base.rebuildGeometry();
  base.mesh.position.set(0, 40, 0);
  base.physics.fixed = true;
  base.mesh.updateMatrixWorld(true);
  const brazo = ed.addComponent("prim-box");
  brazo.params = { kind: "box", width: 40, height: 4, depth: 4 };
  brazo.rebuildGeometry();
  brazo.mesh.position.set(22, 40, 0);
  brazo.mesh.updateMatrixWorld(true);
  const j = ed.connect(base.id, brazo.id, "revolute", new T.Vector3(0, 40, 0));
  j.axis = "z";
  j.limitsEnabled = false;
  // El brazo sale horizontal hacia la derecha: son las 3 en punto.
  return { reloj: ed.relojDeUnion(j) ? window.exersuite.reloj.formatearHora(ed.relojDeUnion(j).c0) : null };
});
console.log("HUD:", JSON.stringify(hud));
ok(hud.reloj === "3:00", "un brazo horizontal hacia la derecha está a las 3 en punto", hud.reloj);

// ── 5. EL PASADOR TAMBIÉN (v0.3.49) ──────────────────────────────────────
// Un pasador monta VARIAS uniones —una por brazo— y todas comparten un solo
// recorrido. Por eso su reloj sale de la REFERENCIA del pasador y no de
// ninguno de los brazos: las mismas horas tienen que querer decir las mismas
// direcciones para los dos, que es lo que un eje del que cuelgan dos brazos
// necesita y lo que los grados no daban.
const pin = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE, R = window.exersuite.reloj;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const caja = (nombre, w, h, d, x, y) => {
    const o = ed.addComponent("prim-box");
    o.name = nombre;
    o.params = { kind: "box", width: w, height: h, depth: d };
    o.rebuildGeometry();
    o.mesh.position.set(x, y, 0);
    o.mesh.updateMatrixWorld(true);
    return o;
  };
  // Un ancla DEBAJO del eje —o sea el pasador colgado de un poste— y dos brazos
  // que salen a lados opuestos: uno a las 3 y otro a las 9.
  const ancla = caja("Ancla", 8, 30, 8, 0, 45);
  const derecho = caja("Brazo derecho", 40, 6, 6, 22, 62);
  const izquierdo = caja("Brazo izquierdo", 40, 6, 6, -22, 62);
  const pas = ed.addComponent("pasador");
  pas.mesh.position.set(0, 62, 0);
  // El eje del pasador es su Y local: se tumba para que gire en el plano XY.
  pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
  pas.mesh.updateMatrixWorld(true);
  pas.params.pasadorAnclas = [ancla.id];
  pas.params.pasadorMoviles = [derecho.id, izquierdo.id];
  ed.aplicarPasador(pas);

  const reloj = ed.relojDePasador(pas);
  const horaDe = (grado) => R.formatearHora(reloj.c0 + reloj.s * grado);
  // Dónde marca cada brazo, y dónde está el cero de la escala del pasador.
  const brazos = reloj.poses.map(horaDe).sort();
  const cero = R.formatearHora(reloj.c0);

  // Se pide el recorrido EN HORAS: de las 3 a las 9 por arriba, o sea media
  // vuelta pasando por las 12.
  const t = R.tramoDesdeHoras(reloj, R.parsearHora("3:00"), R.parsearHora("9:00"), false);
  pas.params.pasadorLimite = true;
  pas.params.pasadorMin = t.min;
  pas.params.pasadorMax = t.max;
  ed.aplicarPasador(pas);
  const uniones = ed.listJoints()
    .filter((j) => !j.soldada && j.name.includes("pivote"))
    .map((j) => {
      // Se leen COMO LAS LEE EL PANEL, que las canoniza en sentido horario.
      const h = R.horasDesdeTramo(reloj, j.min, j.max);
      return {
        nombre: j.name,
        rango: [+j.min.toFixed(1), +j.max.toFixed(1)],
        desde: R.formatearHora(h.desde),
        hasta: R.formatearHora(h.hasta),
      };
    });
  return { brazos, cero, amplitud: +(t.max - t.min).toFixed(1), uniones };
});
console.log("PASADOR:", JSON.stringify(pin));
ok(
  JSON.stringify(pin.brazos) === JSON.stringify(["3:00", "9:00"]),
  "los dos brazos de un mismo pasador marcan las 3 y las 9",
  pin.brazos.join(" · "),
);
ok(
  pin.cero === "6:00",
  "y el cero de su escala cae donde está el ancla —debajo, las 6—, que es lo que "
    + "el reloj hace innecesario saber",
  pin.cero,
);
ok(pin.amplitud === 180, "de las 3 a las 9 por arriba son media vuelta", pin.amplitud);
ok(
  pin.uniones.length === 2
    && pin.uniones.every((u) => u.desde === "3:00" && u.hasta === "9:00"),
  "y LAS DOS uniones del pasador reciben el mismo tramo, dicho con las mismas horas",
  JSON.stringify(pin.uniones),
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
