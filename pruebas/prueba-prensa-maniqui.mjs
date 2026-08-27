// EL MANIQUÍ EN LA PRENSA DE PIERNAS (v0.3.11 y v0.3.12).
//
// Sobre la prensa que armó el diseñador —asiento y respaldo tumbados ~50°, y
// una placa de apoyo inclinada 45° que corre por dos guías— se comprueba todo
// lo que fallaba al sentarlo y ponerlo a empujar:
//
//   A) LA ESPALDA APOYA. El respaldo va reclinado, así que la figura tiene que
//      recostarse para tocarlo. Antes se deslizaba hacia atrás con el tronco
//      vertical, tocaba sólo con la pelvis y la espalda se quedaba a 11,5 cm.
//   B) EL PIE PISA LA PLACA POR LA CARA QUE MIRA AL CUERPO. En una prensa la
//      placa va por ENCIMA y por delante del que empuja: la cara contra la que
//      apoya la planta mira hacia abajo y hacia él. Suponiendo que toda
//      superficie pisable mira al cielo, el pie salía al otro lado de la placa
//      y con la puntera del revés.
//   C) EL PIE EMPUJA LA PLACA COMO UN PEDAL. La cadena es cerrada: al extender
//      la pierna, quien viaja es la MÁQUINA. Antes la IK deshacía la extensión
//      en el mismo paso, el gesto no producía nada y el cuerpo acababa
//      arrastrado hacia la plataforma y despegado del respaldo.
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
await page.evaluate((p) => { window.__proy = p; }, PROY);
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
  // EL GIZMO DEL MANIQUÍ VA EN LA CADERA, su punto de equilibrio: con el
  // origen del rig 30 cm bajo el suelo aparecía lejos del cuerpo.
  const P = Object.getPrototypeOf(ed);
  P.selectFigureRoot.call(ed);
  const pelvisC = new T.Box3().setFromObject(window.__seg("pelvis")).getCenter(new T.Vector3());
  const gz = ed.gizmo.object;
  const antesPos = fig.position.clone();
  ed.figuraProxy.position.x += 20;
  P.aplicarDeltaDeLaFigura.call(ed);
  const arrastre = +fig.position.distanceTo(antesPos).toFixed(1);
  ed.figuraProxy.position.x -= 20;
  P.aplicarDeltaDeLaFigura.call(ed);
  // Y se suelta la selección: con el gizmo puesto sobre la figura, el clic de
  // «Pisar» de la sección siguiente se lo comería.
  ed.select(null);
  ed.gizmo.detach();
  return {
    respaldo: ed.apoyoEspalda ?? null,
    gizmoCadera: gz ? +gz.getWorldPosition(new T.Vector3()).distanceTo(pelvisC).toFixed(1) : 999,
    gizmoArrastre: arrastre,
    huecoTorso: +(-window.__pen(window.__obb(window.__seg("torso")), oR)).toFixed(2),
    huecoPelvis: +(-window.__pen(window.__obb(window.__seg("pelvis")), oR)).toFixed(2),
    reclina: +(Math.acos(Math.min(1, arriba.y)) * 180 / Math.PI).toFixed(1),
    glutesY: +new T.Box3().setFromObject(window.__seg("pelvis")).min.y.toFixed(1),
    asientoY: +new T.Box3().setFromObject(asiento.mesh).max.y.toFixed(1),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n2) SENTADA EN LA PRENSA:", JSON.stringify(sentada));
chequear(
  sentada.respaldo === montaje.ids.respaldo,
  `el RESPALDO elegido es el bajo, no la cabecera (${sentada.respaldo} vs ${montaje.ids.respaldo})`,
);
chequear(sentada.gizmoCadera <= 5, `y el gizmo del maniquí sale EN SU CADERA (${sentada.gizmoCadera} cm)`);
chequear(sentada.gizmoArrastre === 20, `arrastrar ese pivote mueve la figura igual (${sentada.gizmoArrastre} cm de 20)`);
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
  // EL PUNTO DE CLIC SE BUSCA EN PANTALLA, no se supone. Proyectar una
  // coordenada local fija depende de dónde haya quedado la cámara: desde este
  // ángulo, el rayo que apunta a la cara superior entra antes por el canto de
  // la placa o por un travesaño. Se barre la silueta de la placa y se elige el
  // primer sitio donde el rayo cae de verdad en una de sus dos caras grandes.
  const bb3 = geo.boundingBox;
  const esquinas = [];
  for (const x of [bb3.min.x, bb3.max.x]) for (const y of [bb3.min.y, bb3.max.y]) for (const z of [bb3.min.z, bb3.max.z]) {
    esquinas.push(aPantalla(new T.Vector3(x, y, z).applyMatrix4(placa.mesh.matrixWorld)));
  }
  const x0 = Math.min(...esquinas.map((p) => p.x)), x1 = Math.max(...esquinas.map((p) => p.x));
  const y0 = Math.min(...esquinas.map((p) => p.y)), y1 = Math.max(...esquinas.map((p) => p.y));
  const cad = ed.figureJoints().hipL.getWorldPosition(new T.Vector3());
  let elegido = null;
  // Del CENTRO hacia fuera: un punto pegado al borde de la placa deja el pie
  // en un extremo y la prueba mediría un caso raro en vez del normal.
  const orden = [];
  for (let j = 1; j < 10; j++) for (let i = 1; i < 10; i++) orden.push([i, j]);
  orden.sort((a, b) => (a[0] - 5) ** 2 + (a[1] - 5) ** 2 - ((b[0] - 5) ** 2 + (b[1] - 5) ** 2));
  for (const [i, j] of orden) {
    {
      if (elegido) break;
      const sx = x0 + ((x1 - x0) * i) / 10, sy = y0 + ((y1 - y0) * j) / 10;
      const ndc = new T.Vector2((sx / rect.width) * 2 - 1, -((sy / rect.height) * 2 - 1));
      ed.raycaster.setFromCamera(ndc, ed.sceneManager.camera);
      const h = ed.raycaster.intersectObjects(ed.sceneManager.content.children, true)[0];
      if (!h || !h.face) continue;
      let oid = null;
      for (let x = h.object; x && !oid; x = x.parent) if (x.userData.sceneObjectId) oid = x.userData.sceneObjectId;
      if (oid !== placa.id) continue;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
      // Vale cualquiera de las dos caras grandes: desde fuera sólo se ve la de
      // arriba, y marcarla tiene que llevar el pie a la de abajo, que es la
      // que se empuja. Lo que se descarta es el CANTO.
      if (Math.abs(n.dot(cad.clone().sub(h.point).normalize())) < 0.34) continue;
      elegido = { x: Math.round(sx), y: Math.round(sy) };
      break;
    }
  }
  const rodilla = ed.figureJoints().kneeL.getWorldPosition(new T.Vector3());
  return { placa: elegido, rodilla: aPantalla(rodilla) };
}, { ids: montaje.ids });
await page.evaluate(() => window.exersuite.editor.beginAttachFoot());
await page.mouse.click(puntoPlaca.rodilla.x, puntoPlaca.rodilla.y); await page.waitForTimeout(250);
await page.mouse.click(puntoPlaca.placa.x, puntoPlaca.placa.y); await page.waitForTimeout(400);
const conNormal = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const t = ed.footTargets.get("L");
  if (!t) return { hay: false };
  const obj = ed.objects.get(t.objectId);
  obj.mesh.updateMatrixWorld(true);
  const mundo = t.normal ? t.normal.clone().transformDirection(obj.mesh.matrixWorld).normalize() : null;
  const hacia = ed.figureJoints().hipL.getWorldPosition(new T.Vector3())
    .sub(t.local.clone().applyMatrix4(obj.mesh.matrixWorld)).normalize();
  return {
    hay: true,
    normal: t.normal ? [+t.normal.x.toFixed(2), +t.normal.y.toFixed(2), +t.normal.z.toFixed(2)] : null,
    miraAlCuerpo: mundo ? +mundo.dot(hacia).toFixed(2) : null,
  };
});
console.log("\n3) PISAR CON EL PUNTERO:", JSON.stringify(conNormal));
chequear(conNormal.hay, "el clic en la placa deja el pie izquierdo apoyado en ella");
chequear(!!conNormal.normal, "y guarda la NORMAL de la cara pisada, no sólo el punto");
chequear(
  (conNormal.miraAlCuerpo ?? -1) > 0.3,
  `esa cara MIRA AL CUERPO aunque se marcara la de fuera (${conNormal.miraAlCuerpo})`,
);

// ── 4. La planta se posa SOBRE la placa inclinada, no dentro ───────────────
const pisada = await page.evaluate(({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const placa = ed.objects.get(ids.placa);
  const geo = placa.mesh.geometry;
  const P = Object.getPrototypeOf(ed);
  // LOS DOS PIES SE FIJAN POR API, en un punto conocido de la cara inferior.
  // El clic de la sección 3 ya cumplió su papel —comprobar que la cara se
  // captura y se orienta hacia el cuerpo—, pero DÓNDE cae exactamente depende
  // del encuadre de la cámara, y con el pie en un extremo de la placa la
  // pierna arranca casi estirada y las medidas de la sección 5 miden otra
  // cosa. Aquí se busca cinemática, no punteria.
  ed.attachFoot("L", placa.id, new T.Vector3(-12, geo.boundingBox.min.y, 0), new T.Vector3(0, -1, 0));
  ed.attachFoot("R", placa.id, new T.Vector3(12, geo.boundingBox.min.y, 0), new T.Vector3(0, -1, 0));
  for (let i = 0; i < 3; i++) { P.updateFootIK.call(ed); ed.humanFigure.updateMatrixWorld(true); }
  const cara = () => {
    placa.mesh.updateMatrixWorld(true);
    const n = new T.Vector3(0, -1, 0).transformDirection(placa.mesh.matrixWorld).normalize();
    return { n, nivel: n.dot(new T.Vector3(0, geo.boundingBox.min.y, 0).applyMatrix4(placa.mesh.matrixWorld)) };
  };
  const suela = (l) => { const c = cara(); return +(P.plantaSegunNormal.call(ed, l, c.n) - c.nivel).toFixed(2); };
  window.__suela = suela;
  const { n } = cara();
  // ¿Está el pie ACOSTADO sobre la placa, y del derecho? Su eje «arriba» debe
  // seguir la normal de la cara —no la contraria—, y la puntera tiene que ir
  // hacia ARRIBA por la placa, que es como se pisa una prensa.
  const pieArriba = new T.Vector3(0, 1, 0)
    .transformDirection(window.__seg("pie-L").matrixWorld).normalize();
  const pieFrente = new T.Vector3(0, 0, 1)
    .transformDirection(window.__seg("pie-L").matrixWorld).normalize();
  return {
    suelaL: suela("L"), suelaR: suela("R"),
    normal: n.toArray().map((v) => +v.toFixed(2)),
    inclina: +(Math.asin(Math.min(1, Math.abs(n.z))) * 180 / Math.PI).toFixed(1),
    // Sin valor absoluto: del revés daría 180°, no 0°.
    paralelo: +(Math.acos(Math.max(-1, Math.min(1, pieArriba.dot(n)))) * 180 / Math.PI).toFixed(1),
    punteraArriba: +pieFrente.y.toFixed(2),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n4) LA PLANTA SOBRE LA PLACA:", JSON.stringify(pisada));
chequear(pisada.inclina > 40, `la placa está INCLINADA (${pisada.inclina}°), que es donde fallaba`);
chequear(pisada.normal[1] < 0, `la cara pisada MIRA AL CUERPO, hacia abajo (normal ${pisada.normal})`);
chequear(pisada.suelaL >= -1, `la planta izquierda NO atraviesa la placa (${pisada.suelaL} cm; antes −5,6)`);
chequear(pisada.suelaR >= -1, `la planta derecha NO atraviesa la placa (${pisada.suelaR} cm)`);
chequear(pisada.suelaL <= 1.5 && pisada.suelaR <= 1.5, "y tampoco quedan flotando sobre ella");
chequear(pisada.paralelo <= 12, `el pie se ACUESTA sobre la placa y NO del revés (${pisada.paralelo}° de desvío)`);
chequear(pisada.punteraArriba > 0.3, `y la puntera apunta HACIA ARRIBA por la placa (${pisada.punteraArriba})`);

// ── 5. El tren inferior EMPUJA LA PLACA y no saca a nadie del asiento ─────
const gesto = await page.evaluate(({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const placa = ed.objects.get(ids.placa), respaldo = ed.objects.get(ids.respaldo);
  const suela = window.__suela;
  const glutes = () => +new T.Box3().setFromObject(window.__seg("pelvis")).min.y.toFixed(1);
  const rodilla = () => +(ed.figureJoints().kneeL.rotation.x * 180 / Math.PI).toFixed(1);
  const P = Object.getPrototypeOf(ed);
  const antes = { glutes: glutes(), suela: suela("L"), rodilla: rodilla(), placa: placa.mesh.position.clone() };
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
    antes: { glutes: antes.glutes, rodilla: antes.rodilla },
    peorSuela: +peorSuela.toFixed(2), peorGlutes: +peorGlutes.toFixed(1),
    rodillaFin: rodilla(),
    // Cuánto ha viajado la placa por su guía.
    carrera: +placa.mesh.position.distanceTo(antes.placa).toFixed(1),
    huecoTorso: +(-window.__pen(window.__obb(window.__seg("torso")), window.__obb(respaldo.mesh))).toFixed(2),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n5) ACCIONANDO EL TREN INFERIOR:", JSON.stringify(gesto));
chequear(gesto.carrera > 15, `la PLACA viaja por su guía, empujada como un pedal (${gesto.carrera} cm)`);
chequear(
  gesto.rodillaFin < gesto.antes.rodilla - 30,
  `y la rodilla se EXTIENDE de verdad (${gesto.antes.rodilla}° → ${gesto.rodillaFin}°)`,
);
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

// ── 8. Ni se fuga ni se retuerce ──────────────────────────────────────────
const firme = await page.evaluate(async ({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const P = Object.getPrototypeOf(ed);
  await ed.loadProject(window.__proy);
  const byName = (n) => [...ed.objects.values()].find((o) => o.name.startsWith(n));
  const asiento = byName("Asiento"), respaldo = byName("Respaldo ("), placa = byName("Base de soporte");
  const eje = new T.Vector3(0, -0.701, -0.712).multiplyScalar(58);
  for (const o of [...ed.objects.values()]) if (!o.physics.fixed) {
    o.mesh.position.add(eje); o.mesh.updateMatrixWorld(true);
  }
  const caja = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEn({ punto: caja.getCenter(new T.Vector3()).setY(caja.max.y), obj: asiento });
  const fig = ed.humanFigure;
  const geo = placa.mesh.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  for (const l of ["L", "R"]) {
    ed.attachFoot(l, placa.id, new T.Vector3(l === "L" ? -12 : 12, geo.boundingBox.min.y, 0), new T.Vector3(0, -1, 0));
  }
  for (let i = 0; i < 3; i++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
  // EL RESPALDO SE VA LEJOS y se pide re-apoyo veinte veces. Hasta v0.3.14 el
  // barrido, al no encontrarlo, se quedaba con el final de su recorrido: 45 cm
  // hacia atrás POR LLAMADA, y la figura se marchaba de la máquina.
  const antes = fig.position.clone();
  respaldo.mesh.position.add(new T.Vector3(0, 0, -300));
  respaldo.mesh.updateMatrixWorld(true);
  for (let i = 0; i < 20; i++) P.reapoyarFigura.call(ed);
  const deriva = +fig.position.distanceTo(antes).toFixed(1);
  respaldo.mesh.position.add(new T.Vector3(0, 0, 300));
  respaldo.mesh.updateMatrixWorld(true);
  fig.position.copy(antes); fig.updateMatrixWorld(true);
  // Y LA PIERNA NO SE RETUERCE: la rodilla es bisagra y la cadera gira sobre
  // su eje lo que gira una cadera. Se mira al retraer, que es donde salía.
  ed.activarZona("superior", null);
  ed.activarZona("inferior", "sim");
  let peorRodilla = 0, peorCadera = 0;
  for (let i = 0; i < 12; i++) {
    ed.moverPrimitiva(-1, 5);
    for (let k = 0; k < 2; k++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
    // LA TORSIÓN, no el ángulo de Euler. Un hueso del rig descansa a lo largo
    // de Y, así que lo que gira SOBRE SÍ MISMO es la componente del cuaternión
    // en ese eje; la `z` de Euler forma parte de hacia dónde APUNTA el hueso y
    // tiene que poder moverse, o la pierna no alcanzaría.
    const torsion = (j) => {
      const g = new T.Quaternion(0, j.quaternion.y, 0, j.quaternion.w);
      if (g.lengthSq() < 1e-9) return 0;
      g.normalize();
      let a = 2 * Math.atan2(g.y, g.w);
      if (a > Math.PI) a -= 2 * Math.PI;
      if (a < -Math.PI) a += 2 * Math.PI;
      return Math.abs(a);
    };
    for (const l of ["L", "R"]) {
      peorRodilla = Math.max(peorRodilla, torsion(ed.figureJoints()[`knee${l}`]));
      peorCadera = Math.max(peorCadera, torsion(ed.figureJoints()[`hip${l}`]));
    }
  }
  return {
    deriva,
    rodillaTorcida: +(peorRodilla * 180 / Math.PI).toFixed(1),
    caderaGirada: +(peorCadera * 180 / Math.PI).toFixed(1),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n8) NI SE FUGA NI SE RETUERCE:", JSON.stringify(firme));
chequear(firme.deriva <= 1, `sin respaldo al alcance, veinte re-apoyos NO la mueven (${firme.deriva} cm; antes 45 por llamada)`);
chequear(firme.rodillaTorcida <= 0.5, `la rodilla es una BISAGRA: no gira sobre su eje (${firme.rodillaTorcida}° de torsión)`);
chequear(firme.caderaGirada <= 20.5, `y la cadera no se va de rotación al retraer (${firme.caderaGirada}° de torsión)`);

// ── 9. LA SESIÓN ENTERA, como la hace el diseñador ────────────────────────
// Colocar, guardar partidas por el recorrido, ir y volver, y aplicar una
// partida guardada. Los invariantes son los que se ven en sus capturas: la
// espalda en el respaldo Y los glúteos en el asiento a la vez, las dos piernas
// iguales, y la figura quieta mientras la que viaja es la máquina.
const sesion = await page.evaluate(async ({ AYUDA, ids }) => {
  eval(AYUDA);
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const P = Object.getPrototypeOf(ed);
  await ed.loadProject(window.__proy);
  const byName = (n) => [...ed.objects.values()].find((o) => o.name.startsWith(n));
  const asiento = byName("Asiento"), respaldo = byName("Respaldo ("), placa = byName("Base de soporte");
  const eje = new T.Vector3(0, -0.701, -0.712).multiplyScalar(58);
  for (const o of [...ed.objects.values()]) if (!o.physics.fixed) {
    o.mesh.position.add(eje); o.mesh.updateMatrixWorld(true);
  }
  const caja = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEn({ punto: caja.getCenter(new T.Vector3()).setY(caja.max.y), obj: asiento });
  const fig = ed.humanFigure;
  const geo = placa.mesh.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  for (const l of ["L", "R"]) {
    ed.attachFoot(l, placa.id, new T.Vector3(l === "L" ? -12 : 12, geo.boundingBox.min.y, 0), new T.Vector3(0, -1, 0));
  }
  for (let i = 0; i < 3; i++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
  const partida = fig.position.clone();
  const seg = (id) => new T.Box3().setFromObject(window.__seg(id));
  const grados = (j) => [j.rotation.x, j.rotation.y, j.rotation.z].map((v) => v * 180 / Math.PI);
  // FLEXIÓN DE LA RODILLA, MEDIDA EN LA GEOMETRÍA: el ángulo entre el fémur y
  // la tibia. 0° es la pierna recta. El ángulo de Euler NO sirve aquí: en
  // cuanto la pierna sale del plano sagital deja de ser la flexión, y una
  // extensión perfectamente sana se lee como −24°.
  const flexion = (l) => {
    const J = ed.figureJoints();
    const H = J[`hip${l}`].getWorldPosition(new T.Vector3());
    const K = J[`knee${l}`].getWorldPosition(new T.Vector3());
    const A = J[`ankle${l}`].getWorldPosition(new T.Vector3());
    const u = K.clone().sub(H).normalize(), w = A.clone().sub(K).normalize();
    return +(Math.acos(Math.max(-1, Math.min(1, u.dot(w)))) * 180 / Math.PI).toFixed(1);
  };
  const trazaIda = [], trazaVuelta = [];
  let peorEspalda = 0, peorAsiento = 0, peorDeriva = 0, peorAsimetria = 0;
  const mirar = () => {
    fig.updateMatrixWorld(true);
    peorEspalda = Math.max(peorEspalda, -window.__pen(window.__obb(window.__seg("torso")), window.__obb(respaldo.mesh)));
    peorAsiento = Math.max(peorAsiento, Math.abs(seg("pelvis").min.y - caja.max.y));
    peorDeriva = Math.max(peorDeriva, fig.position.distanceTo(partida));
    // LAS DOS PIERNAS, IGUALES. En las vistas frontales del diseñador se ve
    // que el gesto es simétrico; una diferencia grande sería una pierna
    // resuelta por otra rama de la IK.
    for (const fam of ["hip", "knee"]) {
      const a = grados(ed.figureJoints()[`${fam}L`]), b = grados(ed.figureJoints()[`${fam}R`]);
      // La Z va espejada por anatomía (abducción); X e Y tienen que coincidir.
      peorAsimetria = Math.max(peorAsimetria, Math.abs(a[0] - b[0]), Math.abs(a[1] + b[1]));
    }
  };
  mirar();
  const guardadas = [];
  // IDA: empuje completo, guardando una partida por el camino.
  ed.activarZona("superior", null);
  ed.activarZona("inferior", "sim");
  for (let i = 0; i < 16; i++) {
    ed.moverPrimitiva(1, 5);
    for (let k = 0; k < 2; k++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
    mirar();
    trazaIda.push([flexion("L"), +placa.mesh.position.length().toFixed(1)]);
    if (i === 5 || i === 11) guardadas.push(ed.guardarPartida());
  }
  const placaArriba = placa.mesh.position.clone();
  // VUELTA: tracción completa.
  for (let i = 0; i < 16; i++) {
    ed.moverPrimitiva(-1, 5);
    for (let k = 0; k < 2; k++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
    mirar();
    trazaVuelta.push([flexion("L"), +placa.mesh.position.length().toFixed(1)]);
  }
  const carreraIda = +placaArriba.distanceTo(placa.mesh.position).toFixed(1);
  // Y APLICAR UNA PARTIDA GUARDADA no descoloca a nadie.
  const aplicada = guardadas.length ? ed.aplicarPartida(guardadas[0]) : false;
  for (let k = 0; k < 2; k++) { P.updateFootIK.call(ed); fig.updateMatrixWorld(true); }
  mirar();
  // MONOTONÍA: empujando, la rodilla sólo se extiende y el pedal sólo se
  // aleja; traccionando, al revés. Un retroceso es la firma de la IK saltando
  // de rama, que es lo que se veía como piernas volteadas.
  const retrocesos = (traza, signo) => {
    let peor = 0;
    for (let i = 1; i < traza.length; i++) {
      peor = Math.max(peor, signo * (traza[i][0] - traza[i - 1][0]));
    }
    return +peor.toFixed(1);
  };
  return {
    flexionMax: Math.max(...trazaIda.map((t) => t[0])),
    flexionMin: Math.min(...trazaIda.map((t) => t[0])),
    saltoIda: retrocesos(trazaIda, 1),
    saltoVuelta: retrocesos(trazaVuelta, -1),
    vueltaAvanza: trazaVuelta[trazaVuelta.length - 1][0] - trazaVuelta[0][0],
    partidas: guardadas.length,
    aplicada,
    carreraIda,
    peorEspalda: +peorEspalda.toFixed(2),
    peorAsiento: +peorAsiento.toFixed(2),
    peorDeriva: +peorDeriva.toFixed(2),
    peorAsimetria: +peorAsimetria.toFixed(1),
  };
}, { AYUDA, ids: montaje.ids });
console.log("\n9) LA SESIÓN ENTERA:", JSON.stringify(sesion));
chequear(sesion.carreraIda > 15, `la placa recorre el gesto entero (${sesion.carreraIda} cm de ida)`);
chequear(sesion.peorDeriva <= 2, `la figura NO se mueve del sitio en las 32 pulsaciones (${sesion.peorDeriva} cm)`);
chequear(sesion.peorAsiento <= 2, `los glúteos siguen en el asiento todo el rato (${sesion.peorAsiento} cm)`);
chequear(sesion.peorEspalda <= 2, `y la espalda pegada al respaldo (${sesion.peorEspalda} cm el peor momento)`);
chequear(sesion.peorAsimetria <= 3, `las dos piernas van IGUALES (${sesion.peorAsimetria}° de diferencia)`);
chequear(sesion.partidas === 2 && sesion.aplicada, "guardar partidas por el camino y volver a una funciona");
chequear(
  sesion.flexionMax >= 60 && sesion.flexionMin <= 20,
  `la rodilla recorre el gesto entero, de flexionada a bloqueada (${sesion.flexionMax}° → ${sesion.flexionMin}°)`,
);
chequear(sesion.saltoIda <= 1, `empujando, la rodilla SÓLO se extiende (${sesion.saltoIda}° de retroceso)`);
chequear(sesion.saltoVuelta <= 1, `traccionando, SÓLO se flexiona (${sesion.saltoVuelta}° de retroceso)`);
chequear(
  sesion.vueltaAvanza > 20,
  `y la fase excéntrica arranca de verdad desde el bloqueo (${sesion.vueltaAvanza}° recuperados)`,
);

console.log("\n" + (errores.length ? errores.join("\n") + "\n" : ""));
console.log(fallos.length ? `✗ ${fallos.length} fallo(s)` : "TODO EN VERDE");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
