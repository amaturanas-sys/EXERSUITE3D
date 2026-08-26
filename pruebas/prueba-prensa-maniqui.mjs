// EL MANIQUÍ EN LA PRENSA DE PIERNAS (v0.3.11).
//
// Sobre la prensa que armó el diseñador —asiento y respaldo tumbados ~50°, y
// una placa de apoyo inclinada 45° que corre por dos guías— se comprueban las
// tres cosas que fallaban:
//
//   A) LA ESPALDA APOYA. El respaldo va reclinado, así que la figura tiene que
//      recostarse para tocarlo. Antes se deslizaba hacia atrás con el tronco
//      vertical, tocaba sólo con la pelvis y la espalda se quedaba a 11,5 cm.
//   B) EL PIE PISA LA PLACA, NO LA ATRAVIESA. «Pisar» resolvía la IK midiendo
//      todo en el eje Y del mundo: sobre una cara inclinada la suela acababa
//      5,6 cm DENTRO de una placa de 3 cm de grosor.
//   C) EL GESTO NO LA LEVANTA. Con la espalda apoyada y la planta en su sitio,
//      accionar el tren inferior deja a la persona sentada donde estaba, en vez
//      de sacarla del asiento y dejarla de pie.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const AQUI = new URL(".", import.meta.url).pathname;
const PROY = JSON.parse(readFileSync(AQUI + "fijos/legpress-del-disenador.json", "utf8"));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const chequear = (ok, m) => { if (!ok) fallos.push(m); console.log((ok ? "✓ " : "✗ ") + m); };

// Cajas orientadas y penetración SAT, para medir contra el hierro de verdad y
// no contra cajas alineadas con el mundo (aquí no hay nada alineado).
const AYUDA = `
window.__obb = (mesh) => {
  const T = window.exersuite.THREE;
  const geo = mesh.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox; mesh.updateMatrixWorld(true);
  const q = new T.Quaternion(), esc = new T.Vector3();
  mesh.matrixWorld.decompose(new T.Vector3(), q, esc);
  const semi = bb.getSize(new T.Vector3()).multiplyScalar(0.5);
  const m = new T.Matrix4().makeRotationFromQuaternion(q);
  return { c: bb.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld),
    e: [new T.Vector3().setFromMatrixColumn(m,0), new T.Vector3().setFromMatrixColumn(m,1), new T.Vector3().setFromMatrixColumn(m,2)],
    h: [semi.x*Math.abs(esc.x), semi.y*Math.abs(esc.y), semi.z*Math.abs(esc.z)] };
};
// >0 penetración, <0 hueco.
window.__pen = (A, B) => {
  const T = window.exersuite.THREE;
  const d = new T.Vector3().subVectors(B.c, A.c);
  const ejes = [...A.e, ...B.e]; const cruz = new T.Vector3();
  for (const a of A.e) for (const b of B.e) { cruz.crossVectors(a,b); if (cruz.lengthSq()>1e-8) ejes.push(cruz.clone().normalize()); }
  let min = Infinity;
  for (const ax of ejes) { let ra=0, rb=0;
    for (let i=0;i<3;i++) ra += A.h[i]*Math.abs(A.e[i].dot(ax));
    for (let i=0;i<3;i++) rb += B.h[i]*Math.abs(B.e[i].dot(ax));
    const sep = Math.abs(d.dot(ax)) - (ra+rb);
    if (sep > 0) return -sep;
    if (-sep < min) min = -sep; }
  return min === Infinity ? 0 : min;
};
window.__seg = (id) => { let r=null; window.exersuite.editor.humanFigure.traverse(n=>{ if(n.isMesh && n.userData.segmentId===id) r=n; }); return r; };
`;

// ── 1. La prensa, con el carro en su posición baja (donde uno se sube) ─────
const montaje = await page.evaluate(async ({ PROY, AYUDA }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  await ed.loadProject(PROY);
  const byName = (n) => [...ed.objects.values()].find((o) => o.name.startsWith(n));
  const asiento = byName("Asiento"), respaldo = byName("Respaldo ("), placa = byName("Base de soporte");
  // El carro guardado está arriba del todo. Se baja por la guía —eje medido
  // entre sus dos anclajes— hasta donde una persona se sube a la máquina.
  const eje = new T.Vector3(0, -0.701, -0.712).multiplyScalar(58);
  for (const o of [...ed.objects.values()]) if (!o.physics.fixed) {
    o.mesh.position.add(eje); o.mesh.updateMatrixWorld(true);
  }
  const oR = window.__obb(respaldo.mesh);
  return {
    hay: !!(asiento && respaldo && placa),
    // Cuánto se aparta de la vertical el respaldo (por su cara delgada).
    inclinaRespaldo: +(Math.asin(Math.min(1, Math.abs(oR.e[2].y))) * 180 / Math.PI).toFixed(1),
    ids: { asiento: asiento.id, respaldo: respaldo.id, placa: placa.id },
  };
}, { PROY, AYUDA });
console.log("\n1) LA MÁQUINA DEL DISEÑADOR:", JSON.stringify(montaje));
chequear(montaje.hay, "la prensa trae asiento, respaldo y placa de apoyo");
chequear(montaje.inclinaRespaldo > 40, `y el respaldo va TUMBADO, no recto (${montaje.inclinaRespaldo}°)`);

// ── 2. Se sienta: la espalda tiene que TOCAR el respaldo ───────────────────
const sentada = await page.evaluate(async ({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const asiento = ed.objects.get(ids.asiento), respaldo = ed.objects.get(ids.respaldo);
  const caja = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEn({ punto: caja.getCenter(new T.Vector3()).setY(caja.max.y), obj: asiento });
  const fig = ed.humanFigure; fig.updateMatrixWorld(true);
  const oR = window.__obb(respaldo.mesh);
  // Lo que se recuesta el cuerpo: cuánto se aparta de la vertical su eje Y.
  const arriba = new T.Vector3(0, 1, 0).applyQuaternion(fig.quaternion);
  return {
    huecoTorso: +(-window.__pen(window.__obb(window.__seg("torso")), oR)).toFixed(2),
    huecoPelvis: +(-window.__pen(window.__obb(window.__seg("pelvis")), oR)).toFixed(2),
    reclina: +(Math.acos(Math.min(1, arriba.y)) * 180 / Math.PI).toFixed(1),
    glutesY: +new T.Box3().setFromObject(window.__seg("pelvis")).min.y.toFixed(1),
    asientoY: +new T.Box3().setFromObject(asiento.mesh).max.y.toFixed(1),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n2) SENTADA EN LA PRENSA:", JSON.stringify(sentada));
chequear(sentada.huecoTorso <= 1, `la ESPALDA toca el respaldo (hueco ${sentada.huecoTorso} cm; antes 11,52)`);
chequear(sentada.huecoTorso >= -1.5, "y no se mete dentro de él");
chequear(sentada.reclina > 40, `la figura se RECUESTA como el respaldo (${sentada.reclina}°)`);
chequear(
  Math.abs(sentada.glutesY - sentada.asientoY) <= 1.5,
  `y los glúteos descansan en la cara del asiento (${sentada.glutesY} vs ${sentada.asientoY})`,
);

// ── 3. «Pisar» con el puntero: se guarda la CARA, no sólo el punto ─────────
const puntoPlaca = await page.evaluate(({ ids }) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const placa = ed.objects.get(ids.placa);
  const geo = placa.mesh.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  placa.mesh.updateMatrixWorld(true);
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const aPantalla = (v) => {
    const q = v.clone().project(ed.sceneManager.camera);
    return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
  };
  const cara = new T.Vector3(-12, geo.boundingBox.max.y, 10).applyMatrix4(placa.mesh.matrixWorld);
  const rodilla = ed.figureJoints().kneeL.getWorldPosition(new T.Vector3());
  return { placa: aPantalla(cara), rodilla: aPantalla(rodilla) };
}, { ids: montaje.ids });
await page.evaluate(() => window.exersuite.editor.beginAttachFoot());
await page.mouse.click(puntoPlaca.rodilla.x, puntoPlaca.rodilla.y); await page.waitForTimeout(250);
await page.mouse.click(puntoPlaca.placa.x, puntoPlaca.placa.y); await page.waitForTimeout(400);
const conNormal = await page.evaluate(() => {
  const t = window.exersuite.editor.footTargets.get("L");
  return t ? { hay: true, normal: t.normal ? [+t.normal.x.toFixed(2), +t.normal.y.toFixed(2), +t.normal.z.toFixed(2)] : null } : { hay: false };
});
console.log("\n3) PISAR CON EL PUNTERO:", JSON.stringify(conNormal));
chequear(conNormal.hay, "el clic en la placa deja el pie izquierdo apoyado en ella");
chequear(!!conNormal.normal, "y guarda la NORMAL de la cara pisada, no sólo el punto");

// ── 4. La planta se posa SOBRE la placa inclinada, no dentro ───────────────
const pisada = await page.evaluate(({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const placa = ed.objects.get(ids.placa);
  const geo = placa.mesh.geometry;
  const P = Object.getPrototypeOf(ed);
  // El pie derecho se apoya con la API, para medir los dos.
  ed.attachFoot("R", placa.id, new T.Vector3(12, geo.boundingBox.max.y, 0), new T.Vector3(0, 1, 0));
  for (let i = 0; i < 3; i++) { P.updateFootIK.call(ed); ed.humanFigure.updateMatrixWorld(true); }
  placa.mesh.updateMatrixWorld(true);
  const n = new T.Vector3(0, 1, 0).transformDirection(placa.mesh.matrixWorld).normalize();
  const nivel = n.dot(new T.Vector3(0, geo.boundingBox.max.y, 0).applyMatrix4(placa.mesh.matrixWorld));
  const suela = (l) => +(P.plantaSegunNormal.call(ed, l, n) - nivel).toFixed(2);
  // ¿Está el pie ACOSTADO sobre la placa? Su eje «arriba» debe seguir la normal.
  const pieArriba = new T.Vector3(0, 1, 0)
    .transformDirection(window.__seg("pie-L").matrixWorld).normalize();
  return {
    suelaL: suela("L"), suelaR: suela("R"),
    inclina: +(Math.asin(Math.min(1, Math.abs(n.z))) * 180 / Math.PI).toFixed(1),
    paralelo: +(Math.acos(Math.min(1, Math.abs(pieArriba.dot(n)))) * 180 / Math.PI).toFixed(1),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n4) LA PLANTA SOBRE LA PLACA:", JSON.stringify(pisada));
chequear(pisada.inclina > 40, `la placa está INCLINADA (${pisada.inclina}°), que es donde fallaba`);
chequear(pisada.suelaL >= -1, `la planta izquierda NO atraviesa la placa (${pisada.suelaL} cm; antes −5,6)`);
chequear(pisada.suelaR >= -1, `la planta derecha NO atraviesa la placa (${pisada.suelaR} cm)`);
chequear(pisada.suelaL <= 1.5 && pisada.suelaR <= 1.5, "y tampoco quedan flotando sobre ella");
chequear(pisada.paralelo <= 12, `el pie se ACUESTA sobre la placa (${pisada.paralelo}° de desvío)`);

// ── 5. El tren inferior no la saca del asiento ─────────────────────────────
const gesto = await page.evaluate(({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const placa = ed.objects.get(ids.placa), respaldo = ed.objects.get(ids.respaldo);
  const geo = placa.mesh.geometry;
  const P = Object.getPrototypeOf(ed);
  const n = () => { placa.mesh.updateMatrixWorld(true); return new T.Vector3(0,1,0).transformDirection(placa.mesh.matrixWorld).normalize(); };
  const suela = (l) => { const v = n();
    return +(P.plantaSegunNormal.call(ed, l, v)
      - v.dot(new T.Vector3(0, geo.boundingBox.max.y, 0).applyMatrix4(placa.mesh.matrixWorld))).toFixed(2); };
  const glutes = () => +new T.Box3().setFromObject(window.__seg("pelvis")).min.y.toFixed(1);
  const antes = { glutes: glutes(), suela: suela("L") };
  ed.activarZona("superior", null);
  ed.activarZona("inferior", "sim");
  let peorSuela = 0, peorGlutes = 0;
  for (let i = 0; i < 14; i++) {
    ed.moverPrimitiva(1, 5);
    for (let k = 0; k < 2; k++) { P.updateFootIK.call(ed); ed.humanFigure.updateMatrixWorld(true); }
    peorSuela = Math.min(peorSuela, suela("L"));
    peorGlutes = Math.max(peorGlutes, Math.abs(glutes() - antes.glutes));
  }
  return {
    antes, peorSuela: +peorSuela.toFixed(2), peorGlutes: +peorGlutes.toFixed(1),
    glutesFin: glutes(),
    huecoTorso: +(-window.__pen(window.__obb(window.__seg("torso")), window.__obb(respaldo.mesh))).toFixed(2),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n5) ACCIONANDO EL TREN INFERIOR:", JSON.stringify(gesto));
chequear(gesto.peorGlutes <= 3, `la figura SIGUE SENTADA todo el gesto (se movió ${gesto.peorGlutes} cm)`);
chequear(gesto.peorSuela >= -1.5, `y la planta no se cuela en la placa en ningún paso (${gesto.peorSuela} cm)`);
chequear(gesto.huecoTorso <= 1.5, `la espalda sigue apoyada al terminar (hueco ${gesto.huecoTorso} cm)`);

// ── 6. Guardar y reabrir conserva la cara pisada ───────────────────────────
const ida = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const proy = ed.serialize();
  const guardadas = (proy.human.feet ?? []).map((f) => ({ side: f.side, normal: f.normal }));
  await ed.loadProject(proy);
  const t = ed.footTargets.get("L");
  return { guardadas, tras: t && t.normal ? [+t.normal.x.toFixed(2), +t.normal.y.toFixed(2), +t.normal.z.toFixed(2)] : null };
});
console.log("\n6) IDA Y VUELTA DEL PROYECTO:", JSON.stringify(ida));
chequear(ida.guardadas.length === 2, "el proyecto guarda los dos pies apoyados");
chequear(ida.guardadas.every((f) => f.normal), "con la cara que pisa cada uno");
chequear(!!ida.tras, "y al reabrirlo el pie sigue sabiendo sobre qué cara pisa");

// ── 7. Una superficie HORIZONTAL sigue comportándose igual ─────────────────
const llano = await page.evaluate(async ({ AYUDA }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  // Una tarima horizontal cualquiera: sin normal guardada, la IK del pie tiene
  // que seguir comportándose como antes de v0.3.11.
  const tarima = ed.addComponent("asiento");
  tarima.mesh.position.set(0, 20, 40);
  tarima.mesh.quaternion.identity();
  tarima.mesh.updateMatrixWorld(true);
  const geo = tarima.mesh.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  const alto = new T.Box3().setFromObject(tarima.mesh).max.y;
  await ed.addHumanFigure();
  const P = Object.getPrototypeOf(ed);
  for (const l of ["L", "R"]) {
    ed.attachFoot(l, tarima.id, new T.Vector3(l === "L" ? -8 : 8, geo.boundingBox.max.y, 0));
  }
  for (let i = 0; i < 3; i++) { P.updateFootIK.call(ed); ed.humanFigure.updateMatrixWorld(true); }
  const arriba = new T.Vector3(0, 1, 0);
  return {
    alto: +alto.toFixed(1),
    suelaL: +(P.plantaSegunNormal.call(ed, "L", arriba) - alto).toFixed(2),
    suelaR: +(P.plantaSegunNormal.call(ed, "R", arriba) - alto).toFixed(2),
  };
}, { AYUDA });
console.log("\n7) SIN NORMAL GUARDADA, SUPERFICIE LLANA:", JSON.stringify(llano));
chequear(Math.abs(llano.suelaL) <= 1.5 && Math.abs(llano.suelaR) <= 1.5,
  `una tarima horizontal se pisa como siempre (${llano.suelaL} / ${llano.suelaR} cm)`);

console.log("\n" + (errores.length ? errores.join("\n") + "\n" : ""));
console.log(fallos.length ? `✗ ${fallos.length} fallo(s)` : "TODO EN VERDE");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
