// PRUEBA: UNA BISAGRA NO SE ESTIRA (v0.3.87).
//
// EL CASO MÍNIMO, y por qué existe.
//
// Persiguiendo por qué el respaldo de la banca ajustable cede al recostarlo
// se descartaron, midiendo, seis formas distintas de diente. Después se
// sospechó de las soldaduras y resultó que el motor ya las FUNDE en un solo
// cuerpo —18 piezas de la banca son 4 cuerpos—, así que no tienen nada que
// ceder. Lo único que quedaba entre los dos cuerpos era la BISAGRA, y ahí las
// medidas sobre la banca daban una separación de varios centímetros.
//
// Pero la banca es un mecanismo con contactos, topes y una manipulación por
// encima: cualquier conclusión sacada de ahí es indirecta. Esto es lo
// contrario: DOS CUERPOS Y UNA BISAGRA, sin contactos, sin topes y sin nadie
// tocando nada. Sólo gravedad.
//
// Lo que se mide es la única cosa que una bisagra promete: que sus dos anclas
// —la del cuerpo fijo y la del brazo— son EL MISMO PUNTO. Se sigue cada una
// en el marco de su cuerpo y se mira cuánto se separan, en reposo y en el
// golpe del primer balanceo, con tres cargas distintas.
//
// Si se separan aquí, el fallo es del motor y se puede atacar con confianza.
// Si no, el problema de la banca está en otro sitio y no hay que tocar la
// física.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

/** Ancla fija + brazo colgado de ella por una bisagra. Nada más. */
const escena = (masaKg) => ({
  version: 1,
  objects: [
    {
      id: "ancla",
      name: "Ancla",
      componentId: "prim-box",
      materialId: "acero",
      params: { kind: "box", width: 10, height: 10, depth: 10 },
      physics: { massKg: 0, fixed: true },
      position: [0, 100, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    {
      id: "brazo",
      name: "Brazo",
      componentId: "prim-box",
      materialId: "acero",
      params: { kind: "box", width: 40, height: 6, depth: 6 },
      physics: { massKg: masaKg, fixed: false },
      // Centrado 20 cm a la derecha del pivote: arranca horizontal y cae.
      position: [25, 100, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
  ],
  joints: [
    {
      name: "Bisagra",
      kind: "revolute",
      bodyAId: "ancla",
      bodyBId: "brazo",
      anchor: [5, 100, 0],
      axis: "z",
      axisVec: [0, 0, 1],
      limitsEnabled: false,
      min: -180,
      max: 180,
      motor: { enabled: false, targetVel: 45, factor: 2 },
      locked: false,
      soldada: false,
      sensibilidad: 9,
    },
  ],
  cables: [],
  ropes: [],
  groups: [],
});

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
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await new Promise((r) => setTimeout(r, 700));
    const ancla = ed.objects.get([...ed.objects.keys()].find((k) => ed.objects.get(k).name === "Ancla"));
    const brazo = ed.objects.get([...ed.objects.keys()].find((k) => ed.objects.get(k).name === "Brazo"));
    if (!ancla || !brazo) return { error: "la escena no se montó" };
    ancla.mesh.updateMatrixWorld(true);
    brazo.mesh.updateMatrixWorld(true);
    // EL ANCLA DE LA BISAGRA, ANOTADA EN CADA CUERPO. Si la unión cumple, los
    // dos puntos son el mismo para siempre, se mueva lo que se mueva.
    const P = new T.Vector3(5, 100, 0);
    const enAncla = ancla.mesh.worldToLocal(P.clone());
    const enBrazo = brazo.mesh.worldToLocal(P.clone());
    const separacion = () => {
      ancla.mesh.updateMatrixWorld(true);
      brazo.mesh.updateMatrixWorld(true);
      const a = ancla.mesh.localToWorld(enAncla.clone());
      const b = brazo.mesh.localToWorld(enBrazo.clone());
      return a.distanceTo(b);
    };
    const muestras = [];
    ed.toggleSimulation();
    // El brazo arranca horizontal y se desploma: el pico del primer balanceo
    // es la carga dinámica, y el reposo de después, la estática.
    for (let k = 0; k < 40; k++) {
      await new Promise((r) => setTimeout(r, 100));
      muestras.push(separacion());
    }
    const pico = Math.max(...muestras);
    const reposo = [];
    for (let k = 0; k < 10; k++) {
      await new Promise((r) => setTimeout(r, 300));
      reposo.push(separacion());
    }
    ed.toggleSimulation();
    await new Promise((r) => setTimeout(r, 300));
    return {
      pico: +pico.toFixed(3),
      reposo: +(reposo.reduce((a, b) => a + b, 0) / reposo.length).toFixed(3),
      cuerpos: ed.objects.size,
    };
  }, data);

console.log("La bisagra promete que sus dos anclas son el mismo punto.");
console.log("Separación medida, en centímetros:\n");
console.log("  carga        pico (golpe)   reposo");
const resultados = [];
for (const masa of [1, 5, 20]) {
  const r = await medir(escena(masa));
  if (r.error) { ok(false, r.error); break; }
  resultados.push({ masa, ...r });
  console.log(`  ${String(masa).padStart(3)} kg       ${String(r.pico).padStart(8)}   ${String(r.reposo).padStart(8)}`);
}
console.log("");

// UN MILÍMETRO ES TOLERANCIA DE SOLVER; UN CENTÍMETRO ES UNA UNIÓN QUE CEDE.
// Las piezas de este proyecto se miden en centímetros y las holguras reales
// de un herraje andan por el milímetro, así que ése es el listón.
for (const r of resultados) {
  ok(r.reposo < 0.1, `con ${r.masa} kg colgando, la bisagra no cede en reposo`, `${r.reposo} cm`);
}
for (const r of resultados) {
  ok(r.pico < 0.5, `y aguanta el golpe del primer balanceo con ${r.masa} kg`, `pico ${r.pico} cm`);
}
// Y QUE NO EMPEORE CON LA CARGA: si la separación crece con el peso, la unión
// es un muelle y el problema es de rigidez, no de tolerancia numérica.
if (resultados.length === 3) {
  const crece = resultados[2].reposo > resultados[0].reposo + 0.05;
  ok(!crece, "la separación no crece con la carga: la unión no es un muelle",
    `${resultados[0].reposo} cm con 1 kg → ${resultados[2].reposo} cm con 20 kg`);
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
