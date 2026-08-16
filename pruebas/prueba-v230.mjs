// v0.2.30: la roldana INTERNA se aloja de verdad dentro de la viga —
// (A) la geometría del ANFITRIÓN se cala con dos ventanas pasantes iguales,
// (B) el EJE de giro va de pared a pared, (C) la rueda cabe sin chocar,
// (D) el cable transita por las ventanas sin marcarse en error,
// (E) todo sobrevive a guardar y recargar el proyecto.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Viga horizontal 110×12×12 y roldana interna dirigida hacia ABAJO.
const R = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const viga = ed.addComponent("prim-box", new T.Vector3(0, 100, 0));
  viga.name = "Viga";
  viga.mesh.name = "Viga";
  viga.params = { kind: "box", width: 110, height: 12, depth: 12 };
  viga.rebuildGeometry();
  viga.physics = { ...viga.physics, fixed: true };
  window.__viga = viga.id;
  const trisAntes = viga.mesh.geometry.attributes.position.count / 3;

  ed.select(null);
  ed.beginRoldana();
  ed.elegirEstructuraRoldana(viga);
  ed.colocarRoldanaEnEje(viga, new T.Vector3(20, 100, 0), "interna", "abajo");
  ed.cancelRoldana();

  const rold = [...ed.objects.values()].find((o) => o.name.startsWith("Roldana interna"));
  const eje = [...ed.objects.values()].find((o) => o.componentId === "eje-roldana");
  window.__rold = rold?.id;
  const v = viga.params.ventanas ?? [];
  const trisDespues = viga.mesh.geometry.attributes.position.count / 3;

  // (A) ¿Hay hueco REAL? Un rayo vertical por el centro de la rueda debe
  //     atravesar la viga SIN TOCAR NADA (el hueco es pasante); el mismo
  //     rayo junto al borde del hueco, o lejos de él, sigue dando 2
  //     impactos (material intacto).
  const ray = new T.Raycaster(
    new T.Vector3(20, 100 + 40, 0),
    new T.Vector3(0, -1, 0),
    0.1,
    200,
  );
  viga.mesh.updateMatrixWorld(true);
  const impactos = ray.intersectObject(viga.mesh, false).length;
  const rayoBorde = new T.Raycaster(
    new T.Vector3(20 + (viga.params.ventanas[0].dv / 2 + 1.5), 140, 0),
    new T.Vector3(0, -1, 0),
    0.1,
    200,
  );
  const impactosBorde = rayoBorde.intersectObject(viga.mesh, false).length;
  // Un rayo por una zona SIN calar debe seguir dando 2 (material intacto).
  const rayo2 = new T.Raycaster(
    new T.Vector3(-30, 140, 0),
    new T.Vector3(0, -1, 0),
    0.1,
    200,
  );
  const impactosSanos = rayo2.intersectObject(viga.mesh, false).length;

  // (B) El eje va de pared a pared, a lo largo del eje de GIRO de la rueda.
  const ejeGiro = new T.Vector3(0, 1, 0).applyQuaternion(rold.mesh.quaternion);
  const ejeDir = new T.Vector3(0, 1, 0).applyQuaternion(eje.mesh.quaternion);
  const largoEje = eje.params.height;

  // (C) La rueda cabe entre las paredes (12 cm) sin tocarlas.
  const grosorRueda = rold.localSizeAbs().y * Math.abs(rold.mesh.scale.y);

  return {
    ventanas: v.length,
    ventana: v[0] ?? null,
    trisAntes,
    trisDespues,
    impactos,
    impactosBorde,
    impactosSanos,
    ejeAlineado: +Math.abs(ejeDir.dot(ejeGiro)).toFixed(3),
    largoEje: +largoEje.toFixed(1),
    ejeEnCentro: +eje.mesh.position.distanceTo(rold.mesh.position).toFixed(2),
    grosorRueda: +grosorRueda.toFixed(2),
    radio: +(rold.localSizeAbs().x / 2).toFixed(2),
    agrupado: !!ed.objGroup.get(rold.id),
    // La roldana sigue siendo un punto de reenvío válido para los cables.
    esPolea: ed.isPulley(rold),
  };
});
console.log("A/B/C:", JSON.stringify(R));

// (D) Cable real por las dos ventanas: no debe marcarse en error.
const D = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const rold = ed.getObject(window.__rold);
  const arriba = ed.addComponent("terminal-cable", new T.Vector3(-45, 100, 0));
  arriba.physics = { ...arriba.physics, fixed: true };
  const abajo = ed.addComponent("agarre-d", new T.Vector3(20, 58, 0));
  ed.createCable([
    { objectId: arriba.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: rold.id, local: { x: 4, y: 0, z: 0 } },
    { objectId: abajo.id, local: { x: 0, y: 4, z: 0 } },
  ]);
  ed.select(null);
  const c = rold.mesh.position.clone();
  ed.orbit.enableDamping = false;
  ed.orbit.target.copy(c.clone().add(new T.Vector3(0, -3, 0)));
  ed.sceneManager.camera.position.copy(c.clone().add(new T.Vector3(17, -13, 30)));
  ed.orbit.update?.();
  ed.requestRender?.();
  return { cables: ed.listCables().length };
});
await page.waitForTimeout(900);
const D2 = await page.evaluate(() => ({
  invalidos: window.exersuite.editor.cablesInvalidos.size,
}));
console.log("D-cable:", JSON.stringify({ ...D, ...D2 }));
await page.screenshot({ path: "v230-roldana-interna.png" });

// (E) Guardar y recargar: las ventanas viajan en los params y se recalan.
const E = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const datos = ed.serialize();
  const viga = datos.objects.find((o) => o.name === "Viga");
  ed.loadProject(datos);
  const vivo = [...ed.objects.values()].find((o) => o.name === "Viga");
  const ray = new window.exersuite.THREE.Raycaster(
    new window.exersuite.THREE.Vector3(20, 140, 0),
    new window.exersuite.THREE.Vector3(0, -1, 0),
    0.1,
    200,
  );
  vivo.mesh.updateMatrixWorld(true);
  return {
    serializadas: (viga?.params?.ventanas ?? []).length,
    trasCargar: (vivo.params.ventanas ?? []).length,
    impactos: ray.intersectObject(vivo.mesh, false).length,
    ejeTrasCargar: [...ed.objects.values()].filter((o) => o.componentId === "eje-roldana").length,
  };
});
console.log("E-persistencia:", JSON.stringify(E));

const ok =
  R.ventanas === 1 && R.ventana.eje === "y" &&
  Math.abs(R.ventana.u) < 0.01 && Math.abs(R.ventana.v - 20) < 0.01 &&
  R.ventana.dv > 2 * R.radio && R.ventana.du > 1.5 &&
  R.trisDespues > R.trisAntes && R.impactos === 0 &&
  R.impactosBorde === 2 && R.impactosSanos === 2 &&
  R.ejeAlineado > 0.999 && R.largoEje >= 12 && R.ejeEnCentro < 0.01 &&
  R.grosorRueda + 0.5 < 12 && R.agrupado && R.esPolea &&
  D.cables === 1 && D2.invalidos === 0 &&
  E.serializadas === 1 && E.trasCargar === 1 && E.impactos === 0 && E.ejeTrasCargar === 1;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
