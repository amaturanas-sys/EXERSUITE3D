// PRUEBA: la HERRAMIENTA DE PASADOR (v0.4.1) — el eje se pone tocando la cara.
//
// Hasta ahora el pasador se colocaba como una pieza suelta y había que armarlo
// a mano desde Propiedades. Esta prueba mide el gesto nuevo, que es el de la
// roldana: se enciende la herramienta desde la paleta, se orbita libremente y
// UN TOQUE elige pieza y cara; entonces se pregunta cómo se monta.
//
// Lo que se mide:
//   · el botón de la paleta enciende la herramienta (no suelta la pieza);
//   · tocar una cara abre el panel derecho compacto con las dos formas;
//   · ATRAVIESA: el eje sale perpendicular a esa cara, cruza la pieza y asoma
//     2 cm por cada lado, y la pieza tocada queda soldada a él;
//   · HORQUILLA: el eje va PARALELO a la cara, por delante de ella, y el
//     herraje que lo sostiene aparece soldado a esa misma cara;
//   · la herramienta sigue encendida para poner varios, y Esc la termina.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else {
    fallos++;
    console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`);
  }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2500);

// ── ESCENA: un poste alto y estrecho, que es donde va un pivote de verdad ────
// 20 × 60 × 20 centrado en (0, 40, 0): su eje largo es la vertical, así que la
// horquilla tiene que sacar el pasador por la horizontal.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  window.__T = T;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const poste = ed.addComponent("prim-box", new T.Vector3(0, 40, 0));
  poste.name = "Poste";
  poste.mesh.name = "Poste";
  poste.params = { kind: "box", width: 20, height: 60, depth: 20 };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 40, 0);
  ed.bus.emit("objectTransformed", { object: poste });
  window.__poste = poste.id;
  ed.select(null);
  // Cámara determinista mirando a la cara +X (sin damping: la proyección del
  // píxel tiene que coincidir con la cámara REAL en el momento del click).
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 40, 0);
  ed.sceneManager.camera.position.set(220, 70, 120);
  ed.orbit.update?.();
  ed.requestRender?.();
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
});
await page.waitForTimeout(500);

// ── 1. EL BOTÓN DE LA PALETA ENCIENDE LA HERRAMIENTA ────────────────────────
const antes = await page.evaluate(() => window.exersuite.editor.listObjects().length);
await page.click(".comp-btn:has-text('Pasador')");
await page.waitForTimeout(400);
const trasBoton = await page.evaluate(() => ({
  piezas: window.exersuite.editor.listObjects().length,
  pista: document.getElementById("hud")?.textContent ?? "",
}));
ok(
  trasBoton.piezas === antes,
  "el botón de la paleta NO suelta la pieza: enciende la herramienta",
  `${antes} → ${trasBoton.piezas}`,
);
ok(/pasador/i.test(trasBoton.pista), "y lo dice en la pista de abajo", trasBoton.pista);

// ── 2. ATRAVIESA: un toque en la cara +X ────────────────────────────────────
const px = await page.evaluate(() => window.__aPx(10, 40, 0));
await page.mouse.click(px.x, px.y);
await page.waitForTimeout(500);
const dialogo = await page.evaluate(() => {
  const p = document.getElementById("rold-panel");
  if (!p) return { hay: false };
  const r = p.getBoundingClientRect();
  return {
    hay: true,
    compacto: r.width < 340 && r.right > window.innerWidth * 0.7,
    opciones: [...p.querySelectorAll(".rold-opt")].map((b) => b.textContent.trim()),
  };
});
ok(dialogo.hay && dialogo.compacto, "tocar la cara abre el panel derecho compacto", JSON.stringify(dialogo));
ok(
  (dialogo.opciones ?? []).length === 2 && /atraviesa/i.test((dialogo.opciones ?? []).join("|")),
  "con las dos formas de montarlo",
  JSON.stringify(dialogo.opciones),
);
await page.click("#rold-panel .rold-opt:has-text('Atraviesa')");
await page.waitForTimeout(700);

const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  const pin = ed.listObjects().find((o) => o.componentId === "pasador");
  if (!pin) return { puesto: false };
  pin.mesh.updateMatrixWorld(true);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pin.mesh.getWorldQuaternion(new T.Quaternion()));
  const c = pin.mesh.getWorldPosition(new T.Vector3());
  const soldada = ed.listJoints().some(
    (j) => j.soldada && j.name.includes(`Pasador ${pin.id}`),
  );
  return {
    puesto: true,
    ejeX: Math.abs(eje.x),
    centro: [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)],
    largo: pin.params.height,
    soldada,
    anclas: (pin.params.pasadorAnclas ?? []).includes(window.__poste),
    herraje: ed.listObjects().filter((o) => o.componentId === "punto-anclaje").length,
  };
});
ok(A.puesto, "el pasador queda puesto");
ok(A.ejeX > 0.99, "su eje sale PERPENDICULAR a la cara tocada (+X)", `|x| = ${A.ejeX?.toFixed(3)}`);
ok(
  Math.abs(A.centro?.[0] ?? 9) < 1.5 && Math.abs((A.centro?.[1] ?? 0) - 40) < 1.5,
  "y en el plano medio del poste, a la altura de lo que se tocó",
  JSON.stringify(A.centro),
);
ok(A.largo === 24, "con 2 cm de sobrante por cada cara (20 + 4)", String(A.largo));
ok(A.soldada && A.anclas, "el poste queda de ANCLA, soldado al eje", JSON.stringify({ s: A.soldada, a: A.anclas }));
ok(A.herraje === 0, "y sin herraje: atravesando no hace falta horquilla", String(A.herraje));

// ── 3. LA HERRAMIENTA SIGUE ENCENDIDA: segundo toque, ahora con horquilla ───
const px2 = await page.evaluate(() => window.__aPx(10, 60, 0));
await page.mouse.click(px2.x, px2.y);
await page.waitForTimeout(500);
const sigue = await page.evaluate(() => !!document.getElementById("rold-panel"));
ok(sigue, "la herramienta sigue encendida para poner varios");
if (sigue) {
  await page.click("#rold-panel .rold-opt:has-text('Horquilla')");
  await page.waitForTimeout(800);
}

const B = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  const pins = ed.listObjects().filter((o) => o.componentId === "pasador");
  const pin = pins[pins.length - 1];
  if (!pin || pins.length < 2) return { puesto: false, n: pins.length };
  pin.mesh.updateMatrixWorld(true);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pin.mesh.getWorldQuaternion(new T.Quaternion()));
  const c = pin.mesh.getWorldPosition(new T.Vector3());
  const h = ed.listObjects().filter((o) => o.componentId === "punto-anclaje");
  return {
    puesto: true,
    n: pins.length,
    ejeX: Math.abs(eje.x),
    ejeZ: Math.abs(eje.z),
    x: +c.x.toFixed(2),
    y: +c.y.toFixed(2),
    horquillas: h.length,
    kind: h[0]?.params.kind ?? null,
    soldada: ed.listJoints().some((j) => j.soldada && /horquilla/i.test(j.name)),
  };
});
ok(B.puesto, "el segundo pasador queda puesto", `n = ${B.n}`);
ok((B.ejeX ?? 1) < 0.02, "su eje va PARALELO a la cara, no la atraviesa", `|x| = ${B.ejeX?.toFixed(3)}`);
ok((B.ejeZ ?? 0) > 0.99, "y perpendicular al largo del poste, que es como gira un brazo", `|z| = ${B.ejeZ?.toFixed(3)}`);
ok(
  Math.abs((B.x ?? 0) - 14) < 1.5,
  "queda por delante de la cara, a los 4 cm del vuelo (10 + 4)",
  String(B.x),
);
ok(B.horquillas === 1 && B.kind === "horquilla", "con su horquilla armada", JSON.stringify({ n: B.horquillas, k: B.kind }));
ok(B.soldada, "soldada a la cara que se tocó");

// ── 4. ESC TERMINA ──────────────────────────────────────────────────────────
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const px3 = await page.evaluate(() => window.__aPx(10, 20, 0));
await page.mouse.click(px3.x, px3.y);
await page.waitForTimeout(400);
const tras = await page.evaluate(
  () => window.exersuite.editor.listObjects().filter((o) => o.componentId === "pasador").length,
);
ok(tras === 2, "Esc termina la herramienta: el siguiente toque ya no pone eje", String(tras));

console.log(fallos ? `\n${fallos} FALLOS` : "\nTODO OK");
await browser.close();
process.exit(fallos ? 1 : 0);
