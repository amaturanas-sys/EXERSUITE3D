// v0.2.52 · Ninguna parte del cuerpo bajo el suelo, en ninguna pose ni
// colocación. Y los pies según toca: pisando, flotando (cadena abierta) o
// apoyados en una plataforma o pedal.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
const errores = [];
const nueva = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
  await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
  await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
  return page;
};
/** Utilidades que se inyectan en la página. */
const utiles = async (page) => page.evaluate(() => {
  const T = window.exersuite.THREE;
  // Cota mas baja de la PIEL del cuerpo, y por segmento.
  //
  // Se mide la piel propia, no la caja del segmento.  Desde 0.2.60 cada pieza
  // lleva un collarin que se mete dentro de su vecina para que la articulacion
  // no se abra al doblarla; ese collarin no es piel que pise nada, vive dentro
  // de otra carne, y la aplicacion dejo de contarlo a proposito.  Midiendo la
  // caja, esta prueba veia 0,76 cm de cuerpo bajo el suelo llevando el gesto
  // inferior al tope cuando la planta del pie estaba clavada en 0,00: lo que
  // bajaba era el collarin del pie.  El hermano __pie ya media asi.
  //
  // Se sigue informando de la caja (cajaMin) para no perder de vista cuanto
  // asoma el collarin, que en posturas forzadas se ve.
  window.__bajoSuelo = () => {
    const fig = window.exersuite.editor.humanFigure;
    if (!fig) return null;
    fig.updateMatrixWorld(true);
    const v = new T.Vector3();
    let peor = 0, quien = null, minY = Infinity, caja = Infinity;
    fig.traverse((m) => {
      if (!m.isMesh || !m.visible || !m.userData.humanFigurePart) return;
      caja = Math.min(caja, new T.Box3().setFromObject(m).min.y);
      const pos = m.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) * m.scale.y + m.position.y > 0) continue;   // collarin
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld);
        if (v.y < minY) { minY = v.y; quien = m.userData.segmentId; }
        if (-v.y > peor) peor = -v.y;
      }
    });
    return { bajoSuelo: +Math.max(0, peor).toFixed(2), minY: +minY.toFixed(2),
             masBajo: quien, cajaMin: +caja.toFixed(2) };
  };
  // LA PLANTA, no el fondo de la caja del pie.  Desde que el maniqui es un
  // cuerpo troceado, la pieza del pie lleva un collarin que sube por la pierna
  // para que el tobillo no se abra al doblarlo; al girar el pie ese collarin
  // queda por debajo de la suela y la caja miente por casi 10 cm.  La geometria
  // vive en el marco del TOBILLO, asi que la piel propia del pie es la que
  // tiene y <= 0 y el collarin la de arriba.
  window.__pie = (lado) => {
    const fig = window.exersuite.editor.humanFigure;
    fig.updateMatrixWorld(true);
    let malla = null;
    fig.traverse((m) => { if (m.isMesh && m.userData.segmentId === `pie-${lado}`) malla = m; });
    if (!malla) return null;
    const caja = new T.Box3().setFromObject(malla);
    const pos = malla.geometry.getAttribute("position");
    const v = new T.Vector3();
    let planta = Infinity;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) * malla.scale.y + malla.position.y > 0) continue;
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(malla.matrixWorld);
      if (v.y < planta) planta = v.y;
    }
    if (!Number.isFinite(planta)) planta = caja.min.y;
    return { y: +planta.toFixed(2), c: caja.getCenter(new T.Vector3()).toArray().map((v) => +v.toFixed(1)) };
  };
});

// ══════════ 1 · NINGUNA POSE HUNDE EL CUERPO, DE PIE Y SENTADO
{
  const page = await nueva();
  await utiles(page);
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 700));
    const medidas = {};
    // (a) De pie, recorriendo TODAS las posturas de la biblioteca.
    for (const nombre of ed.listPoseNames()) {
      ed.applyPose(nombre);
      medidas[`pie:${nombre}`] = __bajoSuelo().bajoSuelo;
    }
    // (b) Sentado en un banco plano — el caso que hundía los pies 3 cm.
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("Banco plano")).click();
    await new Promise((x) => setTimeout(x, 1800));
    const banco = [...ed.objects.values()].find((o) => /colchoneta/i.test(o.name));
    const caja = new T.Box3().setFromObject(banco.mesh);
    const cen = caja.getCenter(new T.Vector3());
    await Object.getPrototypeOf(ed).colocarFiguraEn.call(ed,
      { punto: new T.Vector3(cen.x + 40, caja.max.y, cen.z), obj: banco });
    await new Promise((x) => setTimeout(x, 500));
    medidas["sentado en banco"] = __bajoSuelo().bajoSuelo;
    const sentado = { ...__bajoSuelo(), pie: __pie("L"), alturaBanco: +caja.max.y.toFixed(1) };
    // (c) Y posando a mano una rodilla hasta el extremo de su rango.
    ed.selectJoint("kneeL");
    ed.setJointAngle("x", 150);
    medidas["rodilla al tope"] = __bajoSuelo().bajoSuelo;
    // (d) Y moviendo el gesto por zonas hasta el final del recorrido.
    ed.activarZona("inferior", "sim");
    for (let k = 0; k < 30; k++) ed.moverPrimitiva(-1, 5);
    medidas["tracción inferior a tope"] = __bajoSuelo().bajoSuelo;
    for (let k = 0; k < 40; k++) ed.moverPrimitiva(1, 5);
    medidas["empuje inferior a tope"] = __bajoSuelo().bajoSuelo;
    return { medidas, sentado };
  });
  console.log("\n1) NADA BAJO EL SUELO");
  for (const [k, v] of Object.entries(r.medidas)) console.log(`   ${k.padEnd(28)} ${v} cm bajo el suelo`);
  console.log("   sentado en el banco:", JSON.stringify(r.sentado));
  const peor = Math.max(...Object.values(r.medidas));
  ok(peor <= 0.05, `ninguna postura ni colocación mete el cuerpo bajo el suelo (peor caso: ${peor} cm)`);
  ok(r.sentado.pie.y >= -0.05, `sentado en un banco de ${r.sentado.alturaBanco} cm el pie ya no se hunde (planta a ${r.sentado.pie.y} cm)`);
  await page.close();
}

// ══════════ 2 · LOS PIES PUEDEN FLOTAR (CADENA ABIERTA)
{
  const page = await nueva();
  await utiles(page);
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("Banco plano")).click();
    await new Promise((x) => setTimeout(x, 1800));
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 600));
    const banco = [...ed.objects.values()].find((o) => /colchoneta/i.test(o.name));
    const caja = new T.Box3().setFromObject(banco.mesh);
    const cen = caja.getCenter(new T.Vector3());
    await Object.getPrototypeOf(ed).colocarFiguraEn.call(ed,
      { punto: new T.Vector3(cen.x + 40, caja.max.y, cen.z), obj: banco });
    await new Promise((x) => setTimeout(x, 400));
    const sentado = __pie("L").y;
    // Extensión de rodillas: la pierna se estira y el pie SUBE, al aire.
    ed.selectJoint("kneeL");
    ed.setJointAngle("x", 0);
    ed.selectJoint("kneeR");
    ed.setJointAngle("x", 0);
    const extendido = __pie("L").y;
    return { sentado, extendido, bajo: __bajoSuelo().bajoSuelo };
  });
  console.log("\n2) CADENA ABIERTA: EL PIE FLOTA");
  console.log(`   planta del pie sentado: ${r.sentado} cm · con la rodilla extendida: ${r.extendido} cm`);
  ok(r.extendido > r.sentado + 5,
    `al extender la rodilla el pie SUBE y queda al aire (${r.sentado} → ${r.extendido} cm): no se le fuerza a pisar`);
  ok(r.bajo <= 0.05, `y sigue sin haber nada bajo el suelo (${r.bajo} cm)`);
  await page.close();
}

// ══════════ 3 · PISAR UNA PLATAFORMA O PEDAL
{
  const page = await nueva();
  await utiles(page);
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("Banco plano")).click();
    await new Promise((x) => setTimeout(x, 1800));
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 600));
    const banco = [...ed.objects.values()].find((o) => /colchoneta/i.test(o.name));
    const caja = new T.Box3().setFromObject(banco.mesh);
    const cen = caja.getCenter(new T.Vector3());
    await Object.getPrototypeOf(ed).colocarFiguraEn.call(ed,
      { punto: new T.Vector3(cen.x + 40, caja.max.y, cen.z), obj: banco });
    await new Promise((x) => setTimeout(x, 400));
    const antes = __pie("L");

    // Se añade una PLATAFORMA elevada delante, como el pedal de una prensa.
    const frente = new T.Vector3(0, 0, 1).applyQuaternion(ed.humanFigure.quaternion);
    const p = ed.humanFigure.position.clone().addScaledVector(frente, 55);
    const plataforma = await ed.addPrimitive?.("prim-box", new T.Vector3(p.x, 26, p.z))
      ?? (() => {
        const b = [...document.querySelectorAll("#palette .comp-btn")]
          .find((x) => (x.textContent ?? "").trim().endsWith("Caja"));
        b.click();
        return null;
      })();
    await new Promise((x) => setTimeout(x, 900));
    const caj = [...ed.objects.values()].find((o) => /caja|box/i.test(o.name) && o.id !== banco.id);
    if (!caj) return { error: "sin plataforma" };
    caj.mesh.position.set(p.x, 26, p.z);
    caj.mesh.scale.set(1.4, 0.5, 1.2);
    caj.mesh.updateMatrixWorld(true);
    const cajaPlat = new T.Box3().setFromObject(caj.mesh);

    // 🦶 Pisar: la planta va a la cara superior de la plataforma.
    for (const lado of ["L", "R"]) {
      const destino = new T.Vector3(0, 0, 0);
      const inv = new T.Matrix4().copy(caj.mesh.matrixWorld).invert();
      const puntoMundo = new T.Vector3(
        cajaPlat.getCenter(new T.Vector3()).x + (lado === "L" ? -8 : 8),
        cajaPlat.max.y,
        cajaPlat.getCenter(new T.Vector3()).z,
      );
      ed.attachFoot(lado, caj.id, puntoMundo.clone().applyMatrix4(inv));
    }
    // Se resuelve la IK como en cada frame.
    for (let i = 0; i < 5; i++) {
      Object.getPrototypeOf(ed).updateFootIK.call(ed);
      await new Promise((x) => setTimeout(x, 50));
    }
    const despues = __pie("L");
    const platY = +cajaPlat.max.y.toFixed(2);
    // Y al mover la plataforma, el pie la sigue.
    caj.mesh.position.y += 12;
    caj.mesh.updateMatrixWorld(true);
    Object.getPrototypeOf(ed).updateFootIK.call(ed);
    const trasSubir = __pie("L");
    return { antes, despues, platY, trasSubir, apoyados: ed.hasAttachedFeet(), bajo: __bajoSuelo().bajoSuelo };
  });
  console.log("\n3) PISAR UNA PLATAFORMA");
  console.log("   ", JSON.stringify(r));
  ok(!r.error, r.error ? `no se pudo montar la plataforma (${r.error})` : "se monta la plataforma de prueba");
  if (!r.error) {
    ok(r.apoyados, "los dos pies quedan apoyados en la plataforma");
    ok(Math.abs(r.despues.y - r.platY) < 1,
      `la planta se posa SOBRE la cara de la plataforma, sin hundirse (pie a ${r.despues.y} cm, plataforma a ${r.platY} cm)`);
    ok(r.trasSubir.y > r.despues.y + 5,
      `y al subir la plataforma el pie la SIGUE (${r.despues.y} → ${r.trasSubir.y} cm)`);
    ok(r.bajo <= 0.05, `sin nada bajo el suelo (${r.bajo} cm)`);
  }
  await page.close();
}

console.log("\nERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
