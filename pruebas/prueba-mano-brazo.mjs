// MANO INTERACTIVA sobre piezas ARTICULADAS: el brazo de press de la
// UpperMachine se moviliza con el puntero sobre el lienzo (no por API).
//
// Desde v0.3.21 el gesto es OTRO: una pieza colgada de una bisagra ya no se
// arrastra siguiendo su arco —el resorte de la mano siempre dejaba una
// componente que el pasador tenía que devolver— sino que se GIRA subiendo y
// bajando la mano, como un scroll. Lo que aquí se mide es que ese gesto mueve
// el brazo de verdad y que el pivote no se va de sitio.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// Arranca la simulación y deja que el conjunto se asiente.
const eje = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  ed.setSimHerramienta("mano"); // v0.2.41: la manipulación se elige a propósito
  const objs = [...ed.objects.values()];
  const b = ed.physics.ejeDeGiro(objs[39].id);
  return b ? { punto: b.punto.toArray().map((v) => +v.toFixed(1)), eje: b.eje.toArray().map((v) => +v.toFixed(2)) } : null;
});
ok(!!eje, `el motor conoce el eje de giro del brazo (${JSON.stringify(eje)})`);

// Apunta al AGARRE del brazo (tubo recto) y comprueba que el rayo lo alcanza
// justo antes de pulsar: la máquina sigue viva y el píxel caduca.
const mira = async () => page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const BRAZO = [32, 34, 35, 37, 38, 39, 40];
  const idOf = (id) => objs.findIndex((o) => o.id === id);
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const cam = ed.sceneManager.camera;
  for (const i of [39, 40, 37, 38, 34]) {
    const v = objs[i].mesh.position.clone().project(cam);
    const px = (v.x * 0.5 + 0.5) * rect.width;
    const py = (-v.y * 0.5 + 0.5) * rect.height;
    ed.raycaster.setFromCamera(new T.Vector2(v.x, v.y), cam);
    const h = ed.raycaster.intersectObjects(ed.sceneManager.content.children, true);
    if (h[0] && BRAZO.includes(idOf(h[0].object.userData.sceneObjectId))) {
      const e = new T.Euler().setFromQuaternion(objs[34].mesh.quaternion, "XYZ");
      return { x: Math.round(px + rect.left), y: Math.round(py + rect.top),
        i: idOf(h[0].object.userData.sceneObjectId), ang0: +T.MathUtils.radToDeg(e.x).toFixed(1) };
    }
  }
  return null;
});
let r = null;
for (let i = 0; i < 8 && !r; i++) { r = await mira(); if (!r) await page.waitForTimeout(400); }
ok(!!r, `hay un punto del brazo bajo el puntero (pieza ${r?.i})`);

// EL GESTO NUEVO: agarrar y mover la mano en vertical. Una sola dimensión.
const reconocida = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const objs = [...ed.objects.values()];
  return ed.physics.esBisagra(objs[39].id);
});
ok(reconocida, "el motor reconoce el brazo como pieza que se opera girando");

// EL SENTIDO CON RECORRIDO. El brazo pliega hacia UN lado —su unión trae
// límites—, así que se prueba antes por API cuál cede; es lo que hará el
// usuario en cuanto vea que no da de sí.
//
// Y OJO CON LA MEDIDA: el Euler X de la pieza no cambia aunque el brazo
// recorra medio metro (la misma trampa que con la rodilla del maniquí). Se
// mide el ÁNGULO DE LA UNIÓN y el desplazamiento del extremo, que es lo que
// se ve.
const sentido = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const objs = [...ed.objects.values()];
  const ph = ed.physics;
  const probar = async (signo) => {
    const a0 = ph.anguloDeBisagra(objs[39].id) ?? 0;
    ph.tomarBisagra(objs[39].id);
    for (let k = 0; k < 4; k++) {
      ph.girarBisagra(objs[39].id, 5 * signo);
      await new Promise((x) => setTimeout(x, 150));
    }
    await new Promise((x) => setTimeout(x, 700));
    const d = Math.abs((ph.anguloDeBisagra(objs[39].id) ?? 0) - a0);
    ph.soltarBisagra(objs[39].id);
    await new Promise((x) => setTimeout(x, 1200));
    return d;
  };
  const arriba = await probar(1);
  const abajo = await probar(-1);
  return { signo: arriba >= abajo ? 1 : -1, arriba: +arriba.toFixed(1), abajo: +abajo.toFixed(1) };
});
console.log("sentido con recorrido:", JSON.stringify(sentido));
ok(
  Math.max(sentido.arriba, sentido.abajo) > 5,
  `la bisagra del brazo cede al gesto (${sentido.arriba}° arriba, ${sentido.abajo}° abajo)`,
);

// Se vuelve a apuntar: el brazo ya no está donde estaba.
let r2 = null;
for (let i = 0; i < 8 && !r2; i++) { r2 = await mira(); if (!r2) await page.waitForTimeout(400); }
ok(!!r2, "el brazo sigue localizable bajo el puntero tras moverlo");

const antes = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  window.__ang = () => +(ed.physics?.anguloDeBisagra(objs[39].id) ?? 0).toFixed(1);
  window.__extremo = () => objs[34].mesh.getWorldPosition(new T.Vector3());
  window.__radio = () => {
    const bb = ed.physics?.ejeDeGiro(objs[39].id);
    if (!bb) return null;
    return +objs[39].mesh.position.clone().sub(bb.punto).projectOnPlane(bb.eje).length().toFixed(2);
  };
  window.__p0 = window.__extremo().toArray();
  return { ang: window.__ang(), radio: window.__radio(), p: window.__p0 };
});

await page.mouse.move(r2.x, r2.y);
await page.mouse.down();
const traza = [];
for (let k = 1; k <= 14; k++) {
  await page.mouse.move(r2.x, r2.y - sentido.signo * k * 18);
  await page.waitForTimeout(90);
  if (k % 5 === 0) {
    traza.push(await page.evaluate(() => ({ a: window.__ang(), r: window.__radio() })));
  }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "v238-brazo.png" });
const fin = await page.evaluate(() => {
  const T = window.exersuite.THREE;
  return {
    ang: window.__ang(),
    tomada: !!window.exersuite.editor.bisagraDrag,
    radio: window.__radio(),
    corrido: +window.__extremo().distanceTo(new T.Vector3().fromArray(window.__p0)).toFixed(1),
  };
});
await page.mouse.up();
console.log("traza:", JSON.stringify(traza));
console.log("fin:", JSON.stringify(fin), "ángulo inicial", antes.ang);

ok(fin.tomada, "la bisagra sigue tomada durante todo el gesto");
const giro = Math.abs(fin.ang - antes.ang);
ok(giro > 5, `mover la mano gira el brazo (${giro.toFixed(1)}° de unión)`);
ok(fin.corrido > 5, `y el extremo del brazo recorre camino (${fin.corrido} cm)`);
ok(
  Math.abs((fin.radio ?? 0) - antes.radio) <= 1,
  `el pivote no se mueve: el radio al pasador sigue en ${antes.radio} cm (ahora ${fin.radio})`,
);
ok(
  traza.every((t) => t.r !== null && Math.abs(t.r - antes.radio) <= 1),
  "…y tampoco a mitad de camino",
);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
