// PRUEBA: DE DÓNDE SALE LA VIBRACIÓN (v0.3.95).
//
// EL CASO MÍNIMO, y por qué existe.
//
// En v0.3.94 se instrumentó la bisagra de la banca ajustable y apareció lo que
// invalidaba cinco versiones de medidas: **el respaldo no llega nunca al
// reposo**. Parece quieto en ~25° y su velocidad angular no se amortigua —
// media de 5 a 9 rad/s, picos clavados en 30, que es un tope del motor, y 3 a
// 4° de temblor, indefinidamente. Lo que se venía midiendo como «dónde se para
// la banca» era la media de esa vibración.
//
// La causa no se encontró quitando cosas de la banca: ni el carril, ni el
// pasador, ni el puntal, ni el perfil o el fondo del diente, ni apartar el
// herraje de la bisagra de 1 a 10 cm. Y la banca es un mecanismo de 18 piezas,
// 19 uniones y un lazo cerrado: cualquier conclusión sacada de ahí es
// indirecta.
//
// Esto es lo contrario. Se parte de lo que YA SE SABE ESTABLE —los dos cuerpos
// y la bisagra de `prueba-bisagra-rigida`, que dio 0,001 cm— y se añade **un
// solo ingrediente cada vez**, midiendo lo mismo en todos. El primero que
// dispare la vibración es la causa, y se ataca ahí en vez de en el JSON del
// banco.
//
// Los ingredientes, en orden, son las cuatro diferencias entre aquel caso
// limpio y la banca: cuerpos FUNDIDOS de varias piezas soldadas, colisionadores
// que SE SOLAPAN, un CONTACTO contra un tope, y un LAZO CERRADO.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const caja = (id, name, w, h, d, masa, pos, fija = false) => ({
  id, name, componentId: "prim-box", materialId: "acero",
  params: { kind: "box", width: w, height: h, depth: d },
  physics: { massKg: masa, fixed: fija },
  position: pos, quaternion: [0, 0, 0, 1], scale: [1, 1, 1],
});

const union = (name, a, b, anchor, soldada) => ({
  name, kind: "revolute", bodyAId: a, bodyBId: b, anchor, axis: "z", axisVec: [0, 0, 1],
  limitsEnabled: false, min: -180, max: 180,
  motor: { enabled: false, targetVel: 45, factor: 2 },
  locked: false, soldada, sensibilidad: 9,
});

const escena = (objects, joints) => ({ version: 1, objects, joints, cables: [], ropes: [], groups: [] });

// TODOS LOS CASOS VAN APOYADOS. Un brazo colgado al aire es un péndulo sin
// rozamiento: oscila para siempre y su velocidad angular nunca baja, lo cual
// no es vibración sino física. La primera versión de esta prueba medía eso y
// daba 161° de "temblor"; lo que interesa es un cuerpo que SE APOYA y debería
// quedarse quieto.
const TOPE = caja("tope", "Tope", 12, 6, 12, 0, [38, 78, 0], true);

// ── A. LO QUE YA SE SABE ESTABLE ────────────────────────────────────────────
// Un cuerpo, una bisagra y un apoyo. Es el patrón: si ÉSTA vibra, el problema
// no es ningún ingrediente sino el banco de pruebas.
const A = escena(
  [caja("ancla", "Ancla", 10, 10, 10, 0, [0, 100, 0], true),
   caja("brazo", "Brazo", 40, 6, 6, 5, [25, 100, 0]), TOPE],
  [union("Bisagra", "ancla", "brazo", [5, 100, 0], false)],
);

// ── B. EL BRAZO, FUNDIDO DE CUATRO PIEZAS ───────────────────────────────────
// Mismo brazo y misma masa total, pero hecho de cuatro trozos soldados que el
// motor funde en un cuerpo con cuatro colisionadores. Es lo que pasa en la
// banca, donde 18 piezas son 3 cuerpos.
const B = escena(
  [caja("ancla", "Ancla", 10, 10, 10, 0, [0, 100, 0], true),
   caja("b1", "Brazo", 10, 6, 6, 1.25, [10, 100, 0]),
   caja("b2", "Brazo 2", 10, 6, 6, 1.25, [20, 100, 0]),
   caja("b3", "Brazo 3", 10, 6, 6, 1.25, [30, 100, 0]),
   caja("b4", "Brazo 4", 10, 6, 6, 1.25, [40, 100, 0]), TOPE],
  [union("Bisagra", "ancla", "b1", [5, 100, 0], false),
   union("Soldadura 1", "b1", "b2", [15, 100, 0], true),
   union("Soldadura 2", "b2", "b3", [25, 100, 0], true),
   union("Soldadura 3", "b3", "b4", [35, 100, 0], true)],
);

// ── C. FUNDIDO Y CON LOS TROZOS SOLAPADOS ───────────────────────────────────
// Igual que B pero cada trozo se mete 1,45 cm en el siguiente, que es lo que
// mide la penetración de la placa de bisagra en la espina del respaldo.
const C = escena(
  [caja("ancla", "Ancla", 10, 10, 10, 0, [0, 100, 0], true),
   caja("b1", "Brazo", 10, 6, 6, 1.25, [10, 100, 0]),
   caja("b2", "Brazo 2", 10, 6, 6, 1.25, [18.55, 100, 0]),
   caja("b3", "Brazo 3", 10, 6, 6, 1.25, [27.1, 100, 0]),
   caja("b4", "Brazo 4", 10, 6, 6, 1.25, [35.65, 100, 0]), TOPE],
  [union("Bisagra", "ancla", "b1", [5, 100, 0], false),
   union("Soldadura 1", "b1", "b2", [14.3, 100, 0], true),
   union("Soldadura 2", "b2", "b3", [22.8, 100, 0], true),
   union("Soldadura 3", "b3", "b4", [31.4, 100, 0], true)],
);

// ── D. EL LAZO CERRADO ──────────────────────────────────────────────────────
// EL INGREDIENTE QUE FALTABA, y el único de la banca que no se había montado
// nunca aparte. El brazo ya no se apoya él: lo sostiene un PUNTAL colgado de
// él por una bisagra libre, cuyo pie descansa en un carril fijo. Con eso la
// cadena se cierra —anclaje → brazo → puntal → contacto → carril → anclaje— y
// el sistema deja de ser un árbol. Es la topología exacta del banco desde
// v0.3.90, cuando se le quitó la soldadura a la unión de arriba.
const D = escena(
  [caja("ancla", "Ancla", 10, 10, 10, 0, [0, 100, 0], true),
   caja("brazo", "Brazo", 40, 6, 6, 5, [25, 100, 0]),
   caja("puntal", "Puntal", 6, 30, 6, 1, [35, 85, 0]),
   caja("carril", "Carril", 40, 6, 20, 0, [35, 66, 0], true)],
  [union("Bisagra", "ancla", "brazo", [5, 100, 0], false),
   union("Bisagra del puntal", "brazo", "puntal", [35, 100, 0], false)],
);

// ── E. EL MISMO LAZO, PERO CON EL PUNTAL SOLDADO ────────────────────────────
// Si D vibra y E no, lo que vibra es la BISAGRA LIBRE del lazo, no el lazo:
// soldado, brazo y puntal son un cuerpo y la cadena vuelve a ser un árbol.
// Es la banca de antes de v0.3.90.
const E = escena(D.objects, [D.joints[0], { ...D.joints[1], soldada: true }]);

const CASOS = [
  ["A  simple, apoyado en un tope", A],
  ["B  FUNDIDO de 4 piezas, apoyado", B],
  ["C  fundido, SOLAPADO 1,45 cm, apoyado", C],
  ["D  LAZO CERRADO, puntal con bisagra libre", D],
  ["E  el mismo lazo, puntal SOLDADO", E],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1200);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2000);

const medir = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await new Promise((r) => setTimeout(r, 700));
    const brazo = [...ed.objects.values()].find((o) => o.name === "Brazo");
    if (!brazo) return { error: "la escena no se montó" };
    ed.toggleSimulation();
    // SE ESPERA A QUE LAS MASAS ESTÉN PUESTAS, no sólo a que exista el mapa de
    // cuerpos: leer antes da 0,003 kg para un brazo de 5 y hace creer que el
    // motor pierde la masa. Costó una falsa alarma entera en v0.3.94.
    let bodies = null, cuerpo = null;
    for (let k = 0; k < 40; k++) {
      await new Promise((r) => setTimeout(r, 100));
      bodies = ed.physics?.bodies;
      if (!bodies) continue;
      const id = [...ed.objects].find(([, o]) => o.name === "Brazo")?.[0];
      cuerpo = id ? bodies.get(id)?.body ?? null : null;
      if (cuerpo && cuerpo.mass() > 0.5) break;
    }
    if (!cuerpo) { ed.toggleSimulation(); return { error: "no se alcanzó el cuerpo del brazo" }; }
    const masa = +cuerpo.mass().toFixed(3);
    const ang = () => {
      brazo.mesh.updateMatrixWorld(true);
      const v = new T.Vector3(0, 1, 0).applyQuaternion(brazo.mesh.getWorldQuaternion(new T.Quaternion()));
      return Math.atan2(v.x, v.y) * 180 / Math.PI;
    };
    // FUERA DEL PLANO. Todas estas uniones son revolutas en Z, que por
    // definicion impiden el giro en X: el brazo no puede inclinarse de lado.
    // Si se inclina, la union no esta sujetando su eje, y eso es un fallo del
    // motor y no del mecanismo.
    const ladeo = () => {
      brazo.mesh.updateMatrixWorld(true);
      const v = new T.Vector3(0, 1, 0).applyQuaternion(brazo.mesh.getWorldQuaternion(new T.Quaternion()));
      return Math.asin(Math.max(-1, Math.min(1, v.z))) * 180 / Math.PI;
    };
    // Cuatro segundos para que caiga y se asiente, y sólo entonces se mide.
    await new Promise((r) => setTimeout(r, 4000));
    const A = [], W = [], Wc = [], L = [];
    for (let k = 0; k < 60; k++) {
      await new Promise((r) => requestAnimationFrame(r));
      const w = cuerpo.angvel();
      A.push(ang()); W.push(Math.hypot(w.x, w.y, w.z));
      Wc.push([w.x, w.y, w.z]); L.push(ladeo());
    }
    ed.toggleSimulation();
    await new Promise((r) => setTimeout(r, 200));
    return {
      masa,
      media: +(W.reduce((a, b) => a + b, 0) / W.length).toFixed(2),
      max: +Math.max(...W).toFixed(1),
      tope: W.filter((x) => x > 29.9).length,
      temblor: +(Math.max(...A) - Math.min(...A)).toFixed(2),
      // POR COMPONENTES. Un omega grande con el angulo quieto suele ser giro
      // FUERA del plano que se mide, que es otra cosa y no la vibracion que
      // se persigue.
      ejes: [0, 1, 2].map((i) => +(Wc.reduce((a, w) => a + Math.abs(w[i]), 0) / Wc.length).toFixed(2)),
      ladeo0: +L[0].toFixed(1), ladeo1: +L[L.length - 1].toFixed(1),
    };
  }, data);

console.log("Un cuerpo en reposo tiene la velocidad angular en cero.");
console.log("Lo que se mide es si la deja de verdad, o si el motor lo zarandea.\n");
console.log("  caso                                       masa   ω media   ω máx   temblor   ω por eje   ladeo fuera del plano");
const res = [];
for (const [nombre, data] of CASOS) {
  const r = await medir(data);
  if (r.error) { ok(false, `${nombre}: ${r.error}`); continue; }
  res.push({ nombre, ...r });
  console.log(
    `  ${nombre.padEnd(38)} ${String(r.masa).padStart(5)}   ${String(r.media).padStart(7)}   ${String(r.max).padStart(5)}   ${r.temblor}°   ejes ${r.ejes.join("/")}   ladeo ${r.ladeo0}° -> ${r.ladeo1}°`,
  );
}
console.log("");

// EL LISTÓN. En reposo la velocidad angular tiene que ser CERO; se deja un
// margen de 0,1 rad/s por la tolerancia del solver. La banca da de 5 a 9.
for (const r of res) {
  ok(r.media < 0.1, `${r.nombre.slice(0, 2)} llega al reposo`, `ω media ${r.media} rad/s, máx ${r.max}, ${r.tope}/60 en el tope`);
}
// UNA REVOLUTA EN Z NO DEJA LADEARSE. Si el brazo se inclina fuera del plano,
// la unión ha perdido su eje, y eso no es un mecanismo que se porte mal: es el
// motor soltando una restricción que prometió.
for (const r of res) {
  ok(Math.abs(r.ladeo1) < 1, `${r.nombre.slice(0, 2)} no se ladea: la revoluta sujeta su eje`,
    `se fue a ${r.ladeo1}° fuera del plano`);
}
// Y QUE EL PATRÓN SIGA LIMPIO: si A vibra, no es ningún ingrediente, es el
// banco de pruebas, y toda la escalera sobra.
const a = res.find((r) => r.nombre.startsWith("A"));
if (a) ok(a.media < 0.1, "el patrón sigue estable: lo que vibre lo habrá traído un ingrediente", `A da ${a.media} rad/s`);

console.log(fallos === 0 ? "\nTODO OK — ninguno de los ingredientes vibra; la causa está en otra parte" : `\n${fallos} FALLOS — el primer caso en rojo trae el ingrediente que vibra`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
