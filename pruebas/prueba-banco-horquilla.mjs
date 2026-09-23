// PRUEBA: EL RESPALDO RECORRE DE 0° A 90° SIN CHOCAR (v0.3.97).
//
// La banca llevaba una bisagra de PLACAS —dos pletinas y un pasador— y ésa era
// la pieza que le comía el recorrido: en v0.3.92 se midió que la espina del
// respaldo penetraba **1,45 cm** en la placa de bisagra A, y era el contacto
// más profundo de toda la máquina.
//
// En v0.3.97 se sustituye por una HORQUILLA CON PASADOR, que es como va en la
// máquina de verdad. La pieza existía desde v0.3.32 y nadie la había montado
// aquí: sus orejas acaban en un semicírculo CENTRADO EN EL EJE —«la única
// forma que no choca», dice su propio código, porque cualquier esquina barre
// al girar un radio mayor que el del taladro— y pide que el extremo del brazo
// también sea redondo, que es lo que ahora lleva la espina (`extremoRedondo`).
//
// Lo que se mide es exactamente el requisito y nada más: se posa el respaldo
// en cada ángulo de 0 a 90 y se le pregunta al motor, por la FASE ESTRECHA, si
// alguna pieza del respaldo está penetrando en alguna del bastidor. El
// mecanismo —carril, pasador de apoyo y puntal— se quita a propósito: aquí no
// se juzga si la banca SE SOSTIENE, sino si la unión la deja LLEGAR.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const CONVENIO = "0° = respaldo HORIZONTAL, 90° = VERTICAL (el convenio de la máquina)";
const ANGULOS = JSON.parse(
  readFileSync(new URL("./datos/banco-rango.json", import.meta.url), "utf8"),
);

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const datos = ANGULOS.map((a) =>
  JSON.parse(readFileSync(new URL(`./datos/banco-rango-${a.grados}.json`, import.meta.url), "utf8")),
);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
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
    const resp = [...ed.objects.values()].find((o) => o.name === "Respaldo");
    const base = [...ed.objects.values()].find((o) => o.name === "Asiento");
    if (!resp || !base) return { error: "falta pieza de referencia" };
    ed.toggleSimulation();
    // SIN GRAVEDAD, Y ÉSA ES LA MEDIDA (v0.4.3). Aquí se pregunta por la
    // GEOMETRÍA de la pose —¿entra el respaldo en el hueco que la horquilla le
    // deja?—, no por si la banca se sostiene sola: el mecanismo se ha quitado a
    // propósito, así que el respaldo cuelga de un solo pasador y se desploma.
    // Mientras la unión estuvo AGARROTADA eso no se notaba —el propio choque lo
    // sujetaba—, y al dejarla girar libre el respaldo aparecía tumbado en todos
    // los ángulos. Con la gravedad a cero y las velocidades a cero la pose se
    // queda donde se la puso y los contactos se siguen calculando, que es justo
    // lo que hay que leer.
    //
    // EL MAPA DE CUERPOS SE REUSA MIENTRAS SE RECONSTRUYE EL MUNDO: entre
    // escena y escena devuelve cuerpos ya destruidos, y llamar a mass() sobre
    // uno revienta el WASM con «null pointer passed to rust». Se sondea con red.
    let bodies = null, listo = false;
    const quieto = () => {
      const w = ed.physics?.world;
      if (!w) return;
      w.gravity.x = 0; w.gravity.y = 0; w.gravity.z = 0;
      for (const e of (ed.physics?.bodies ?? new Map()).values()) {
        try {
          e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        } catch { /* cuerpo viejo */ }
      }
    };
    for (let k = 0; k < 300 && !listo; k++) {
      await new Promise((r) => setTimeout(r, 20));
      quieto();
      bodies = ed.physics?.bodies;
      if (!bodies) continue;
      const id = [...ed.objects].find(([, o]) => o.name === "Respaldo")?.[0];
      const c = id ? bodies.get(id)?.body : null;
      if (!c) continue;
      try { if (c.mass() > 0.5) listo = true; } catch { /* cuerpo viejo */ }
    }
    quieto();
    const world = ed.physics?.world;
    if (!world || !listo) { ed.toggleSimulation(); return { error: "el mundo no se montó" }; }

    const q = new T.Quaternion(), q2 = new T.Quaternion();
    const ang = () => {
      resp.mesh.updateMatrixWorld(true); base.mesh.updateMatrixWorld(true);
      const v = new T.Vector3(0, 1, 0)
        .applyQuaternion(resp.mesh.getWorldQuaternion(q))
        .applyQuaternion(base.mesh.getWorldQuaternion(q2).invert());
      return +(Math.atan2(v.x, v.y) * 180 / Math.PI).toFixed(1);
    };
    // CADA COLISIONADOR DICE DE QUIÉN ES (v0.4.3). Lo apunta el motor al
    // crearlo. Antes se adivinaba adjudicándoselo a la pieza con el centro más
    // cerca, y esa cuenta se equivocaba justo donde importa: el pasador vive
    // DENTRO de la horquilla y los dos centros están a milímetros, así que el
    // contacto del eje con el brazo —el que hay que descontar— salía firmado
    // por la horquilla y se colaba como si fuera un choque.
    const dueno = ed.physics.duenoDeColisionador;
    const situa = (col) => {
      const id = dueno.get(col.handle);
      return (id && ed.objects.get(id)?.name) || "¿?";
    };
    // LA FASE ESTRECHA, no la ancha. `contactPairsWith` sólo dice qué cajas se
    // solapan —daba 143 «contactos» entre 18 piezas—; lo que dice si dos piezas
    // SE TOCAN es el manifiesto, y sólo con puntos en penetración.
    //
    // Y SÓLO EL CUERPO DEL RESPALDO. La primera versión tomaba la peor
    // penetración de TODA la máquina y daba 5 cm constantes en los siete
    // ángulos: eran solapes de diseño —almohadillas embutidas en las vigas—
    // que no tienen nada que ver con la unión. Lo que se juzga aquí es si el
    // respaldo choca al girar, así que se mira su cuerpo y nadie más.
    const idResp = [...ed.objects].find(([, o]) => o.name === "Respaldo")?.[0];
    const cuerpoResp = idResp ? bodies.get(idResp)?.body : null;
    if (!cuerpoResp) { ed.toggleSimulation(); return { error: "sin cuerpo del respaldo" }; }
    let peor = 0, culpable = "";
    for (let i = 0; i < cuerpoResp.numColliders(); i++) {
      const c = cuerpoResp.collider(i);
      world.contactPairsWith(c, (otro) => {
        if (otro.parent()?.handle === cuerpoResp.handle) return;   // el cuerpo consigo mismo
        // EL PASADOR NO CUENTA. Un pasador atraviesa el brazo por un TALADRO,
        // y un taladro no existe en un colisionador macizo: su solape con la
        // viga es la pieza haciendo su trabajo, no un choque. Se reconoce
        // porque NO DEPENDE DEL ÁNGULO —1,48 a 1,78 cm en los siete, o sea el
        // radio del pasador—, mientras que un tope de recorrido crece según se
        // llega a él. Apagar `contactos` en la unión no lo quita: eso impide
        // RESOLVER el contacto, no que exista el manifiesto, que es lo que
        // aquí se lee.
        if (/^Pasador|^Eje/.test(situa(otro))) return;
        world.contactPair(c, otro, (man) => {
          for (let k = 0; k < man.numContacts(); k++) {
            const dist = man.contactDist(k);
            if (dist < peor) { peor = dist; culpable = `${situa(c)} ↔ ${situa(otro)}`; }
          }
        });
      });
    }
    const medido = ang();
    ed.toggleSimulation();
    await new Promise((r) => setTimeout(r, 200));
    return { medido, penetra: +(Math.abs(peor) * 100).toFixed(2), culpable };
  }, data);

console.log("El respaldo, posado de 0° a 90°, y lo que penetra en el resto.");
console.log(CONVENIO);
console.log("Con la bisagra de placas eran 1,45 cm en la placa A.\n");
console.log("  pedido   medido   penetra   entre");
const res = [];
for (let i = 0; i < ANGULOS.length; i++) {
  const r = await medir(datos[i]);
  if (r.error) { ok(false, `${ANGULOS[i].grados}°: ${r.error}`); continue; }
  res.push({ ...ANGULOS[i], ...r });
  console.log(
    `  ${String(ANGULOS[i].grados).padStart(5)}°   ${String(+(90 - Math.abs(r.medido)).toFixed(1)).padStart(5)}°   ${String(r.penetra).padStart(6)} cm   ${r.culpable || "—"}`,
  );
}
console.log("");

// LA POSE ES LA QUE SE PIDIÓ. Si el respaldo no arranca donde se le puso, lo
// que venga después no mide el rango sino otra cosa.
for (const r of res) {
  // El ángulo se mide desde la VERTICAL, así que el pedido en convenio de
  // máquina (0 = horizontal) sale como su complementario.
  ok(Math.abs(90 - Math.abs(r.medido) - r.grados) < 2,
    `a ${r.grados}° el respaldo está donde se le puso`, `se midió ${90 - Math.abs(r.medido)}°`);
}
// Y NADA CHOCA EN TODO EL RECORRIDO. Medio milímetro es tolerancia del solver;
// un centímetro es una pieza metida dentro de otra.
for (const r of res) {
  ok(r.penetra < 0.05, `a ${r.grados}° no choca nada`, `${r.penetra} cm entre ${r.culpable}`);
}

console.log(fallos === 0 ? "\nTODO OK — la horquilla deja el recorrido entero, de 0° a 90°" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
