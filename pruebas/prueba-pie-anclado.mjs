// v0.2.96 · EL PIE ES UN ANCLAJE, Y NO SE MUEVE.
//
// Regla del diseñador, literal: «los pies son anclaje en la superficie y el
// resto del cuerpo opera con la cinemática ya descrita, ya que la sentadilla es
// un ejercicio de cadena cerrada».
//
// Lo que había: el CENTRO del pie apenas se movía —0,23 cm, y por eso el
// plantado por traslación lo daba por bueno— pero el pie GIRABA 34,98° sobre sí
// mismo al bajar y volvía a 0° al subir. La PUNTA viajaba 10,13 cm (9,52 hacia
// fuera, 3,48 atrás y 2,23 de levantamiento) y el TALÓN 9,82 cm en sentido
// contrario, alrededor de un punto fijo situado a 29,43 cm del centro del pie:
// fuera del pie. No pivotaba, derrapaba — casi 20 cm de arrastre por pie en
// cada repetición.
//
// POR ESO SE MIDE LA PUNTA Y EL TALÓN, y no el centro: el centro de la caja es
// justo el único punto del pie que no viaja cuando el pie derrapa. Una prueba
// que mire ahí da verde con el pie patinando.
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

await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  await ed.addHumanFigure();
  await new Promise((r) => setTimeout(r, 900));
  const seg = (id) => {
    const f = ed.humanFigure; f.updateMatrixWorld(true);
    let m = null; f.traverse((n) => { if (n.userData?.segmentId === id) m = n; });
    return m;
  };
  // La huella real del pie: punta y talón como VÉRTICES MATERIALES, más el
  // rumbo, la planta y cuántos vértices tocan de verdad el suelo.
  window.__pie = (lado) => {
    const m = seg(`pie-${lado}`); if (!m) return null;
    m.updateMatrixWorld(true);
    const pos = m.geometry.getAttribute("position");
    const v = new T.Vector3();
    let punta = null, talon = null, zMax = -1e9, zMin = 1e9, minY = 1e9;
    const mundo = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.z > zMax) { zMax = v.z; punta = v.clone(); }
      if (v.z < zMin) { zMin = v.z; talon = v.clone(); }
      const w = v.clone().applyMatrix4(m.matrixWorld);
      mundo.push(w);
      if (w.y < minY) minY = w.y;
    }
    const q = new T.Quaternion(); m.getWorldQuaternion(q);
    const largo = new T.Vector3(0, 0, 1).applyQuaternion(q);
    const planta = new T.Vector3(0, 1, 0).applyQuaternion(q);
    return {
      punta: punta.applyMatrix4(m.matrixWorld).toArray().map((x) => +x.toFixed(2)),
      talon: talon.applyMatrix4(m.matrixWorld).toArray().map((x) => +x.toFixed(2)),
      rumbo: +(Math.atan2(largo.x, largo.z) * 180 / Math.PI).toFixed(2),
      plantaY: +planta.y.toFixed(4),
      suela: +minY.toFixed(2),
      contacto: mundo.filter((w) => w.y - minY < 0.5).length,
    };
  };
  window.__pelvis = () => {
    ed.humanFigure.updateMatrixWorld(true);
    return ed.humanFigure.position.toArray().map((x) => +x.toFixed(2));
  };
});

const medir = async (postura) => p.evaluate(async (postura) => {
  const ed = window.exersuite.editor;
  ed.applyPose(postura);
  await new Promise((r) => setTimeout(r, 400));
  return { L: window.__pie("L"), R: window.__pie("R"), pelvis: window.__pelvis() };
}, postura);

const dist = (a, b) => +Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]).toFixed(2);

for (const fam of ["frontal", "trasera"]) {
  console.log(`\n── Sentadilla ${fam} ──────────────────────────────────────`);
  const arriba = await medir(`Sentadilla ${fam} (arriba)`);
  const fondo = await medir(`Sentadilla ${fam} (fondo)`);
  const vuelta = await medir(`Sentadilla ${fam} (arriba)`);

  for (const lado of ["L", "R"]) {
    // EL PIE CLAVADO: medio centímetro es ya generoso para un anclaje.
    ok(dist(arriba[lado].punta, fondo[lado].punta) < 0.5,
      `${fam} ${lado}: la PUNTA se queda al bajar (${dist(arriba[lado].punta, fondo[lado].punta)} cm)`);
    ok(dist(arriba[lado].talon, fondo[lado].talon) < 0.5,
      `${fam} ${lado}: el TALÓN se queda al bajar (${dist(arriba[lado].talon, fondo[lado].talon)} cm)`);
    ok(Math.abs(fondo[lado].rumbo - arriba[lado].rumbo) < 0.5,
      `${fam} ${lado}: el pie no GIRA (${arriba[lado].rumbo}° → ${fondo[lado].rumbo}°)`);
    // Y la planta apoya entera en los dos extremos, no de canto.
    ok(arriba[lado].plantaY > 0.999 && fondo[lado].plantaY > 0.999,
      `${fam} ${lado}: la planta queda PLANA arriba y abajo `
      + `(${arriba[lado].plantaY} / ${fondo[lado].plantaY})`);
    const cambioContacto = Math.abs(fondo[lado].contacto - arriba[lado].contacto)
      / Math.max(1, arriba[lado].contacto);
    ok(cambioContacto < 0.05,
      `${fam} ${lado}: apoya la MISMA suela (${arriba[lado].contacto} → ${fondo[lado].contacto} vértices)`);
    ok(Math.abs(fondo[lado].suela) < 0.1,
      `${fam} ${lado}: la suela no flota en el fondo (${fondo[lado].suela} cm)`);
    // Y el ciclo cierra: subir devuelve el pie a su marca.
    ok(dist(arriba[lado].punta, vuelta[lado].punta) < 0.5,
      `${fam} ${lado}: subir devuelve la punta a su marca (${dist(arriba[lado].punta, vuelta[lado].punta)} cm)`);
  }

  // LA APERTURA DEL FONDO SIGUE SIENDO LA DEL MODELO (36,2° medidos en el .obj
  // del diseñador). Anclar el pie no puede lograrse enderezándolo: eso sería
  // ganar la prueba cambiando el ejercicio.
  const giro = Math.abs(fondo.L.rumbo);
  ok(giro > 30 && giro < 42, `${fam}: la puntera sigue abierta como en el modelo (${giro}°)`);

  // LA BARRA A PLOMO. Con los pies clavados, el avance de la pelvis ES el
  // avance de la barra: el tronco va rígido a ella y `spine` no cambia entre
  // las dos posturas.
  const avance = Math.hypot(fondo.pelvis[0] - arriba.pelvis[0], fondo.pelvis[2] - arriba.pelvis[2]);
  ok(avance < 0.5, `${fam}: la barra baja a plomo (la pelvis avanza ${avance.toFixed(2)} cm)`);
}

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
