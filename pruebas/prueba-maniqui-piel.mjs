// PRUEBA: LA PIEL DEL MANIQUÍ (v0.4.14).
//
// Desde v0.4.14 el maniquí se VE con una sola malla con skinning —el cuerpo con
// rig que aportó el diseñador, aligerado— y se MIDE con sus dieciséis segmentos
// de siempre, que siguen ahí sin dibujarse. Esta prueba guarda las dos
// promesas de ese reparto:
//
//   · LO QUE SE VE ES LO QUE SE MIDE. En cada postura, la planta, lo más bajo
//     del cuerpo, el asiento y las manos de la piel caen donde los de los
//     segmentos: si se separasen, el maniquí pisaría o se sentaría en un sitio
//     y se dibujaría en otro.
//   · NO SATURA EL MOTOR. Un solo objeto que dibujar en vez de dieciséis, y un
//     presupuesto de triángulos (el maniquí anterior dibujaba 47.024).
//
// Y que lo demás sigue igual: la piel cuelga de los mismos pivotes que posan
// las posturas, el clic sigue dando con un segmento —que es quien dice qué
// articulación es—, y al cambiar la talla la piel se rehace con ella.
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";
import { AYUDANTES } from "./ayudantes-maniqui.mjs";

let fallos = 0;
const ok = (c, m, dato) => {
  if (c) console.log(`✓ ${m}`);
  else { fallos++; console.log(`✗ ${m}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Por pasos, no por reloj: ver pruebas/arnes.mjs (v0.4.10).
const pausa = await prepararPasos(page);
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await pausa(1000);
await page.click("text=📁 PROYECTOS"); await pausa(300);
await page.click(".land-actions button:has-text('NUEVO')"); await pausa(300);
await page.click(".wizard-carta:has-text('Profesional')"); await pausa(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await pausa(1500);
await page.evaluate(AYUDANTES);

// ── 1. LA PIEL ESTÁ, Y CUELGA DE LOS PIVOTES ───────────────────────────────
const montaje = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.addHumanFigure();
  const f = ed.humanFigure;
  const piel = f.userData.piel;
  const joints = f.userData.joints;
  let segmentos = 0, segmentosVisibles = 0, segmentosDibujados = 0, dibujados = 0;
  f.traverse((m) => {
    if (!m.isMesh) return;
    if (m.material.visible) dibujados++;
    if (!m.userData.humanFigurePart) return;
    segmentos++;
    if (m.visible) segmentosVisibles++;
    if (m.material.visible) segmentosDibujados++;
  });
  const enPivotes = piel
    ? piel.skeleton.bones.every((b) => b === f || Object.values(joints).includes(b))
    : false;
  return {
    piel: !!piel?.isSkinnedMesh,
    huesos: piel?.skeleton.bones.length ?? 0,
    raizEsLaFigura: piel?.skeleton.bones[0] === f,
    enPivotes,
    tris: piel ? piel.geometry.index.count / 3 : 0,
    segmentos, segmentosVisibles, segmentosDibujados, dibujados,
  };
});
ok(montaje.piel, "el maniquí lleva piel con skinning");
ok(montaje.huesos === 15 && montaje.raizEsLaFigura && montaje.enPivotes,
  "sus 15 huesos son la figura y los 14 pivotes del rig, no un esqueleto aparte",
  JSON.stringify(montaje));
ok(montaje.tris >= 10000 && montaje.tris <= 30000,
  `con un presupuesto de triángulos: ${montaje.tris} (el anterior dibujaba 47.024)`);
ok(montaje.segmentos === 16 && montaje.segmentosVisibles === 16,
  "los 16 segmentos siguen en la figura y siguen «visibles» para el motor y las medidas");
ok(montaje.segmentosDibujados === 0 && montaje.dibujados === 1,
  `pero sólo se dibuja la piel: ${montaje.dibujados} objeto en vez de 16`,
  JSON.stringify(montaje));

// ── 2. LO QUE SE VE ES LO QUE SE MIDE, EN CADA POSTURA ─────────────────────
const medir = () => page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const f = ed.humanFigure;
  f.updateMatrixWorld(true);
  const piel = f.userData.piel;
  const nombres = piel.skeleton.bones.map((b) => b === f ? "raiz"
    : Object.entries(f.userData.joints).find(([, j]) => j === b)[0]);
  const si = piel.geometry.getAttribute("skinIndex");
  const sw = piel.geometry.getAttribute("skinWeight");
  const v = new T.Vector3();
  // De la piel: lo más bajo por hueso dominante, y los puntos RÍGIDOS de cada
  // muñeca (todo su peso en ella), que son los mismos puntos que el segmento
  // de la mano y tienen que estar exactamente donde él.
  const bajo = {}, rigidos = { wristL: [], wristR: [] };
  let minimo = Infinity;
  // EL ASIENTO es la pelvis y la MITAD ALTA de los muslos: lo que se posa al
  // sentarse. La corva no. Con la rodilla doblada la piel se recoge ahí —va a
  // medias con muslo y pierna— y el segmento rígido no, así que en el peso
  // muerto, donde nada se sienta y la nalga ya no cuelga, lo más bajo de los
  // muslos era la corva y comparaba otra cosa: 1,6 cm de pliegue de rodilla.
  // La altura de reposo de cada junta sale de la matriz de ligado de la piel.
  const reposoY = (h) => new T.Matrix4().copy(piel.skeleton.boneInverses[nombres.indexOf(h)]).invert().elements[13];
  const mitadMuslo = { hipL: (reposoY("hipL") + reposoY("kneeL")) / 2, hipR: (reposoY("hipR") + reposoY("kneeR")) / 2 };
  const reposo = piel.geometry.getAttribute("position");
  const enAsiento = {};
  for (let i = 0; i < si.count; i++) {
    let d = 0, w = -1;
    for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > w) { w = sw.getComponent(i, k); d = si.getComponent(i, k); }
    piel.getVertexPosition(i, v).applyMatrix4(piel.matrixWorld);
    const h = nombres[d];
    if (h === "raiz" || (mitadMuslo[h] !== undefined && reposo.getY(i) >= mitadMuslo[h])) {
      enAsiento[h] = Math.min(enAsiento[h] ?? Infinity, v.y);
    }
    bajo[h] = Math.min(bajo[h] ?? Infinity, v.y);
    minimo = Math.min(minimo, v.y);
    if (w > 0.99 && rigidos[h]) rigidos[h].push(v.clone());
  }
  // De los segmentos: su piel propia (sin collarín) y todos sus puntos. Con
  // `hasta`, sólo lo que en reposo queda por encima de esa cota del pivote.
  const seg = (id, hasta = -Infinity) => {
    let m = null;
    f.traverse((n) => { if (n.isMesh && n.userData.segmentId === id) m = n; });
    const pos = m.geometry.getAttribute("position");
    const pts = [];
    let y = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const w = new T.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld);
      pts.push(w);
      const local = pos.getY(i) * m.scale.y + m.position.y;
      if (m.userData.jointName !== "" && local > 0) continue;
      if (local < hasta) continue;
      y = Math.min(y, w.y);
    }
    return { bajo: y, pts };
  };
  // Distancia de cada punto rígido de la mano al punto más cercano del
  // segmento: la peor de todas.
  const mano = (l) => {
    const pts = seg(`mano-${l}`).pts;
    let peor = 0;
    for (const p of rigidos[`wrist${l}`]) {
      let d = Infinity;
      for (const q of pts) d = Math.min(d, p.distanceToSquared(q));
      peor = Math.max(peor, Math.sqrt(d));
    }
    return peor;
  };
  const r = (x) => +x.toFixed(2);
  // EL ASIENTO, lo más bajo de pelvis y mitad alta de los muslos (ver arriba).
  // En el segmento del muslo, la mitad es la de la rodilla en su pivote.
  const J = f.userData.joints;
  const asientoPiel = Math.min(enAsiento.raiz, enAsiento.hipL, enAsiento.hipR);
  const asientoSeg = Math.min(seg("pelvis").bajo,
    seg("muslo-L", J.kneeL.position.y / 2).bajo, seg("muslo-R", J.kneeR.position.y / 2).bajo);
  return {
    piel: { minimo: r(minimo), pieL: r(bajo.ankleL), pieR: r(bajo.ankleR), asiento: r(asientoPiel) },
    seg: { minimo: window.__pielMasBaja(), pieL: window.__planta("L"), pieR: window.__planta("R"), asiento: r(asientoSeg) },
    manos: ["L", "R"].map((l) => r(mano(l))),
  };
});

for (const postura of ["De pie", "Sentado", "Sentadilla", "Remo", "Peso muerto"]) {
  await page.evaluate((p) => { window.exersuite.editor.applyPose(p); }, postura);
  await pausa(200);
  const m = await medir();
  console.log(`  ${postura}: piel ${JSON.stringify(m.piel)} · segmentos ${JSON.stringify(m.seg)} · manos ${m.manos.join(" / ")}`);
  const d = (a, b) => Math.abs(a - b);
  ok(d(m.piel.pieL, m.seg.pieL) < 0.3 && d(m.piel.pieR, m.seg.pieR) < 0.3,
    `${postura}: la planta que se ve es la que pisa (${m.piel.pieL}/${m.piel.pieR} contra ${m.seg.pieL}/${m.seg.pieR})`);
  ok(d(m.piel.minimo, m.seg.minimo) < 1,
    `${postura}: lo más bajo del cuerpo coincide (${m.piel.minimo} contra ${m.seg.minimo})`);
  // Queda ~1 cm: la franja del pliegue del glúteo (±1,5 cm) dobla mezclada en
  // la piel y rígida en el segmento. Con el corte por mayoría de vértices eran
  // 3,6 cm, y un solo vértice ajeno llegaba a 8,9.
  ok(d(m.piel.asiento, m.seg.asiento) < 1.5,
    `${postura}: el asiento que se ve es el que se posa (${m.piel.asiento} contra ${m.seg.asiento})`);
  ok(m.manos.every((x) => x < 0.05),
    `${postura}: la mano que se ve es la que agarra (${m.manos.join(" / ")} cm de desvío)`);
}

// ── 3. EL CLIC SIGUE DANDO CON UN SEGMENTO ─────────────────────────────────
const clic = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const f = ed.humanFigure;
  ed.applyPose("De pie");
  f.updateMatrixWorld(true);
  const objetivo = f.userData.joints.spine.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 20, 0));
  const desde = objetivo.clone().add(new T.Vector3(0, 0, 300).applyQuaternion(f.quaternion));
  const rc = new T.Raycaster(desde, objetivo.clone().sub(desde).normalize());
  const hits = rc.intersectObject(f, true);
  return { n: hits.length, primero: hits[0]?.object.userData.segmentId ?? null,
           tocaPiel: hits.some((h) => h.object.userData.pielManiqui) };
});
ok(clic.primero === "torso" && !clic.tocaPiel,
  `un rayo al pecho da con el segmento del torso, no con la piel (${clic.primero})`, JSON.stringify(clic));

// ── 4. OTRA TALLA, OTRA PIEL ───────────────────────────────────────────────
const talla = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.setHumanHeight(160);
  for (let i = 0; i < 100 && ed.humanFigure?.userData.heightCm !== 160; i++) await new Promise((r) => setTimeout(r, 20));
  const f = ed.humanFigure;
  f.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(f);
  const piel = f.userData.piel;
  const v = new T.Vector3();
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < piel.geometry.getAttribute("position").count; i++) {
    piel.getVertexPosition(i, v).applyMatrix4(piel.matrixWorld);
    lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
  }
  return { caja: +(bb.max.y - bb.min.y).toFixed(2), piel: +(hi - lo).toFixed(2), suelo: +lo.toFixed(2), conPiel: !!piel };
});
ok(talla.conPiel && Math.abs(talla.caja - 160) < 0.5 && Math.abs(talla.piel - 160) < 1 && Math.abs(talla.suelo) < 0.5,
  `a 160 cm la figura se rehace con piel, de 160 de alto y en el suelo (${JSON.stringify(talla)})`);

console.log("\nERRORES:", errores.length ? errores.join("\n") : "ninguno");
if (errores.length) fallos += errores.length;
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
