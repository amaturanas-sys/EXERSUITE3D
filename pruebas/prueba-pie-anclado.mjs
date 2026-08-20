// v0.2.97 · EL PIE PIVOTA EN EL SITIO, NO DERRAPA.
//
// Decisión del diseñador, después de ver las dos versiones: «los apoyos del pie
// o pisada no deben deslizarse sobre la superficie, pero sí pueden experimentar
// un grado menor de rotación externa (que se transmite por abducción y rotación
// externa de la cadera al descender al bottom del squat)».
//
// O sea: la puntera puede girar —y gira 35,8°, que es lo que hace cualquiera al
// atornillar el pie— pero la HUELLA se queda donde está.
//
// Y OJO CON CÓMO SE MIDE, que es lo que llevó a la conclusión equivocada: la
// caja envolvente de three está alineada con el MUNDO, así que girar el pie
// sobre sí mismo ya le mueve el centro aunque el pie no viaje. Con la caja
// parecía que la huella saltaba 10,71 cm; medida donde el pie toca de verdad
// —el centroide de los vértices apoyados— se mueve 0,01 cm.
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
  for (let i = 0; i < 20 && !ed.humanFigure; i++) {
    await ed.addHumanFigure();
    await new Promise((r) => setTimeout(r, 400));
  }
  const seg = (id) => {
    const f = ed.humanFigure; f.updateMatrixWorld(true);
    let m = null; f.traverse((n) => { if (n.userData?.segmentId === id) m = n; });
    return m;
  };
  window.__pie = (lado) => {
    const m = seg(`pie-${lado}`); if (!m) return null;
    m.updateMatrixWorld(true);
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
    // LA HUELLA: el centroide de lo que toca. Es lo que no puede moverse.
    const toca = mundo.filter((w) => w.y - minY < 0.5);
    const c = new T.Vector3();
    for (const w of toca) c.add(w);
    c.multiplyScalar(1 / Math.max(1, toca.length));
    const q = new T.Quaternion(); m.getWorldQuaternion(q);
    const largo = new T.Vector3(0, 0, 1).applyQuaternion(q);
    const planta = new T.Vector3(0, 1, 0).applyQuaternion(q);
    return {
      huella: [+c.x.toFixed(2), +c.z.toFixed(2)],
      punta: punta.applyMatrix4(m.matrixWorld).toArray().map((x) => +x.toFixed(2)),
      talon: talon.applyMatrix4(m.matrixWorld).toArray().map((x) => +x.toFixed(2)),
      rumbo: +(Math.atan2(largo.x, largo.z) * 180 / Math.PI).toFixed(2),
      plantaY: +planta.y.toFixed(4),
      suela: +minY.toFixed(2),
      contacto: toca.length,
      // Semilongitud del pie: sirve para saber si el centro de giro cae DENTRO.
      medioPie: +(Math.hypot(punta.x - talon.x, punta.z - talon.z) / 2).toFixed(2),
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

const dist2 = (a, b) => +Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(2);

/**
 * ¿Es un PIVOTE o un DERRAPE? Se resuelve el punto fijo de la transformación
 * rígida del suelo entre las dos posturas: si cae dentro de la huella, el pie
 * gira sobre sí mismo; si cae fuera, el pie describe un arco alrededor de otro
 * sitio, que es lo que se ve como arrastre.
 */
const centroDeGiro = (a, b, angDeg) => {
  const t = angDeg * Math.PI / 180;
  const s = Math.sin(t), c = Math.cos(t);
  // b = R·(a − p) + p  ⇒  p = (b − R·a) · (I − R)^-1
  const dx = b[0] - (c * a[0] + s * a[1]);
  const dy = b[1] - (-s * a[0] + c * a[1]);
  // (I − R) = [[1−c, −s], [s, 1−c]]  ⇒  su inversa es (1/det)·[[1−c, s], [−s, 1−c]]
  const det = (1 - c) * (1 - c) + s * s;
  if (Math.abs(det) < 1e-9) return null;
  return [((1 - c) * dx + s * dy) / det, (-s * dx + (1 - c) * dy) / det];
};

for (const fam of ["frontal", "trasera"]) {
  console.log(`\n── Sentadilla ${fam} ──────────────────────────────────────`);
  const nombre = fam === "frontal" ? "Sentadilla frontal" : "Sentadilla trasera";
  const arriba = await medir(nombre);
  const fondo = await medir(`Sentadilla ${fam} (fondo)`);
  const vuelta = await medir(nombre);

  for (const lado of ["L", "R"]) {
    const dHuella = dist2(arriba[lado].huella, fondo[lado].huella);
    // LO QUE NO PUEDE PASAR: que la pisada viaje por el suelo.
    ok(dHuella < 0.5, `${fam} ${lado}: la HUELLA no se mueve al bajar (${dHuella} cm)`);
    ok(dist2(arriba[lado].huella, vuelta[lado].huella) < 0.5,
      `${fam} ${lado}: ni al volver a subir (${dist2(arriba[lado].huella, vuelta[lado].huella)} cm)`);
    // LO QUE SÍ PUEDE PASAR, y el diseñador quiere: la puntera gira hacia fuera.
    const giro = fondo[lado].rumbo - arriba[lado].rumbo;
    const haciaFuera = lado === "L" ? giro < 0 : giro > 0;
    ok(Math.abs(giro) > 25 && Math.abs(giro) < 45 && haciaFuera,
      `${fam} ${lado}: la puntera gira hacia FUERA al bajar (${giro.toFixed(1)}°)`);
    // Y ES UN PIVOTE: el centro de giro cae DENTRO del pie.
    const cg = centroDeGiro(arriba[lado].punta.filter((_, i) => i !== 1),
      fondo[lado].punta.filter((_, i) => i !== 1), giro);
    const dCentro = cg ? dist2(cg, arriba[lado].huella) : 1e9;
    ok(dCentro < arriba[lado].medioPie,
      `${fam} ${lado}: gira SOBRE SÍ MISMO — el centro de giro cae a ${dCentro} cm `
      + `de la huella, dentro del pie (medio pie: ${arriba[lado].medioPie} cm)`);
    // La planta apoya entera en los dos extremos.
    ok(arriba[lado].plantaY > 0.999 && fondo[lado].plantaY > 0.999,
      `${fam} ${lado}: la planta queda PLANA arriba y abajo `
      + `(${arriba[lado].plantaY} / ${fondo[lado].plantaY})`);
    const cambio = Math.abs(fondo[lado].contacto - arriba[lado].contacto)
      / Math.max(1, arriba[lado].contacto);
    ok(cambio < 0.05,
      `${fam} ${lado}: apoya la MISMA suela (${arriba[lado].contacto} → ${fondo[lado].contacto} vértices)`);
    ok(Math.abs(fondo[lado].suela) < 0.1,
      `${fam} ${lado}: la suela no flota en el fondo (${fondo[lado].suela} cm)`);
  }

  // LA APERTURA DEL FONDO SIGUE SIENDO LA DEL MODELO (36,2° medidos en el .obj).
  const giroFondo = Math.abs(fondo.L.rumbo);
  ok(giroFondo > 30 && giroFondo < 42,
    `${fam}: en el fondo la puntera está abierta como en el modelo (${giroFondo}°)`);
  // Y DE PIE EL PIE VA RECTO, que es la estampa que eligió el diseñador.
  ok(Math.abs(arriba.L.rumbo) < 3,
    `${fam}: de pie el pie va recto (${arriba.L.rumbo}°)`);

  // LA BARRA A PLOMO. Con la huella clavada, el avance de la pelvis ES el de la
  // barra: el tronco va rígido a ella y `spine` no cambia entre las dos.
  const avance = Math.hypot(fondo.pelvis[0] - arriba.pelvis[0], fondo.pelvis[2] - arriba.pelvis[2]);
  ok(avance < 0.5, `${fam}: la barra baja a plomo (la pelvis avanza ${avance.toFixed(2)} cm)`);
}

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
