// PRUEBA: deformación por nodos con ramas (v0.3.25) y placa dentada doble.
//
// Lo que se mide:
//   · el doble clic mete un nodo DONDE SE TOCA, no partiendo el tramo mayor;
//   · el clic derecho sobre un nodo abre la burbuja con sus dos opciones;
//   · ramificar saca una prolongación PERPENDICULAR al trazado, y la segunda
//     rama del mismo nodo no se mete dentro de la primera;
//   · borrar quita ESE nodo y la trayectoria se recalcula por los que quedan;
//   · la placa doble copia medidas, posición y giro en su gemela.
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
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// ── 1. NODO NUEVO DONDE SE TOCA ─────────────────────────────────────────────
const prep = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const viga = ed.addComponent("pilar-linea");
  viga.name = "Viga";
  viga.params = {
    kind: "beam",
    width: 6,
    depth: 6,
    ends: "plano",
    path: [
      [0, -60, 0],
      [0, 0, 0],
      [0, 60, 0],
    ],
  };
  viga.rebuildGeometry();
  viga.mesh.position.set(0, 80, 0);
  ed.bus.emit("objectTransformed", { object: viga });
  ed.select(viga);
  ed.beginBendNodes();
  window.__viga = viga.id;
  // Un punto claramente dentro del tramo de arriba, a 3/4 de camino.
  const local = new T.Vector3(0, 40, 0);
  const mundo = local.clone().applyMatrix4(viga.mesh.matrixWorld);
  const v = mundo.clone().project(ed.sceneManager.camera);
  const rect = ed.canvas.getBoundingClientRect();
  return {
    nodos: viga.params.path.length,
    x: rect.left + ((v.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - v.y) / 2) * rect.height,
    bendActivo: ed.isBending(),
  };
});
ok(prep.bendActivo, "la herramienta de nodos está activa sobre la viga");
ok(prep.nodos === 3, "la viga arranca con 3 nodos", prep.nodos);

await page.mouse.dblclick(prep.x, prep.y);
await page.waitForTimeout(500);
const trasDoble = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const v = ed.objects.get(window.__viga);
  return {
    nodos: v.params.path.length,
    ys: v.params.path.map((n) => +n[1].toFixed(0)),
  };
});
console.log("DOBLE CLIC:", JSON.stringify(trasDoble));
ok(trasDoble.nodos === 4, "el doble clic añade un nodo", trasDoble.nodos);
ok(
  trasDoble.ys.some((y) => Math.abs(y - 40) < 12),
  "…y lo pone DONDE SE TOCÓ (y≈40), no partiendo el tramo por la mitad",
  trasDoble.ys.join(", "),
);

// ── 2. BURBUJA DE OPCIONES CON EL CLIC DERECHO ──────────────────────────────
const sitioNodo = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const v = ed.objects.get(window.__viga);
  const n = v.params.path[1];
  const mundo = new T.Vector3(n[0], n[1], n[2]).applyMatrix4(v.mesh.matrixWorld);
  const p = mundo.clone().project(ed.sceneManager.camera);
  const rect = ed.canvas.getBoundingClientRect();
  return {
    x: rect.left + ((p.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - p.y) / 2) * rect.height,
  };
});
await page.mouse.click(sitioNodo.x, sitioNodo.y, { button: "right" });
await page.waitForTimeout(400);
const burbuja = await page.evaluate(() => {
  const b = document.querySelector(".nodo-burbuja");
  return {
    hay: !!b,
    botones: b ? [...b.querySelectorAll("button")].map((x) => x.textContent) : [],
  };
});
console.log("BURBUJA:", JSON.stringify(burbuja));
ok(burbuja.hay, "el clic derecho sobre un nodo abre la burbuja");
ok(
  burbuja.botones.length === 2 && burbuja.botones.includes("🪾") && burbuja.botones.includes("🚫"),
  "con sus dos opciones: ramificar y eliminar",
  burbuja.botones.join(" "),
);

// ── 3. RAMIFICAR ────────────────────────────────────────────────────────────
await page.click(".nodo-burbuja button[title*='Ramific'], .nodo-burbuja button[title*='Branch']");
await page.waitForTimeout(600);
const rama1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const v = ed.objects.get(window.__viga);
  const r = v.params.ramas ?? [];
  if (r.length === 0) return { ramas: 0 };
  const a = new T.Vector3().fromArray(r[0].path[0]);
  const b = new T.Vector3().fromArray(r[0].path[1]);
  const dir = b.clone().sub(a).normalize();
  // Tangente del tronco en el nodo de origen.
  const p = v.params.path;
  const i = r[0].desde;
  const otro = p[i + 1] ?? p[i - 1];
  const tang = new T.Vector3().fromArray(otro).sub(a).normalize();
  return {
    ramas: r.length,
    desde: r[0].desde,
    nodosRama: r[0].path.length,
    perpendicular: +Math.abs(dir.dot(tang)).toFixed(3),
    largo: +a.distanceTo(b).toFixed(1),
    asas: ed.bendHandlesCount?.() ?? null,
  };
});
console.log("RAMA 1:", JSON.stringify(rama1));
ok(rama1.ramas === 1, "ramificar crea una rama", rama1.ramas);
ok(rama1.nodosRama === 2, "la rama nace con dos nodos, editables como los demás", rama1.nodosRama);
ok(
  rama1.perpendicular < 0.05,
  "y sale PERPENDICULAR al trazado en su origen",
  `|cos| = ${rama1.perpendicular}`,
);

// Segunda rama del mismo nodo: no puede nacer encima de la primera.
await page.mouse.click(sitioNodo.x, sitioNodo.y, { button: "right" });
await page.waitForTimeout(400);
await page.click(".nodo-burbuja button[title*='Ramific'], .nodo-burbuja button[title*='Branch']");
await page.waitForTimeout(600);
const rama2 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const v = ed.objects.get(window.__viga);
  const r = v.params.ramas ?? [];
  if (r.length < 2) return { ramas: r.length };
  const dir = (k) =>
    new T.Vector3()
      .fromArray(r[k].path[1])
      .sub(new T.Vector3().fromArray(r[k].path[0]))
      .normalize();
  return { ramas: r.length, coseno: +dir(0).dot(dir(1)).toFixed(3) };
});
console.log("RAMA 2:", JSON.stringify(rama2));
ok(rama2.ramas === 2, "se pueden crear varias ramas del mismo nodo", rama2.ramas);
ok(
  rama2.coseno < 0.6,
  "y la segunda busca el hueco libre en vez de meterse en la primera",
  `coseno entre ramas = ${rama2.coseno}`,
);

// ── 4. BORRAR UN NODO ───────────────────────────────────────────────────────
const antesBorrar = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const v = ed.objects.get(window.__viga);
  return { nodos: v.params.path.length, ys: v.params.path.map((n) => +n[1].toFixed(0)) };
});
await page.mouse.click(sitioNodo.x, sitioNodo.y, { button: "right" });
await page.waitForTimeout(400);
await page.click(".nodo-burbuja button[title*='Elimin'], .nodo-burbuja button[title*='Delete']");
await page.waitForTimeout(600);
const trasBorrar = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const v = ed.objects.get(window.__viga);
  return {
    nodos: v.params.path.length,
    ys: v.params.path.map((n) => +n[1].toFixed(0)),
    ramas: (v.params.ramas ?? []).length,
  };
});
console.log("BORRAR:", JSON.stringify({ antesBorrar, trasBorrar }));
ok(
  trasBorrar.nodos === antesBorrar.nodos - 1,
  "borrar quita UN nodo",
  `${antesBorrar.nodos} → ${trasBorrar.nodos}`,
);
ok(
  !trasBorrar.ys.includes(antesBorrar.ys[1]) || antesBorrar.ys.filter((y) => y === antesBorrar.ys[1]).length > 1,
  "…y es el que se eligió: la trayectoria se recalcula por los que quedan",
  `${antesBorrar.ys.join(",")} → ${trasBorrar.ys.join(",")}`,
);

// ── 5. PLACA DENTADA DOBLE ──────────────────────────────────────────────────
const doble = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.endBendNodes();
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  // Un poste recto y una placa sobre su cara.
  const poste = ed.addComponent("pilar-linea");
  poste.name = "Poste";
  poste.params = { kind: "beam", width: 8, depth: 8, ends: "plano", path: [[0, -80, 0], [0, 80, 0]] };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 100, 0);
  poste.physics = { ...poste.physics, fixed: true };
  ed.bus.emit("objectTransformed", { object: poste });

  const placa = ed.addComponent("placa-dentada");
  placa.params = { ...placa.params, dientes: 3, dienteEspaciado: 14, dienteCaraCm: 8 };
  const m = window.exersuite.dentada.medidas(placa.params);
  placa.params.width = 8 + m.vuelo;
  placa.rebuildGeometry();
  const mm = window.exersuite.dentada.medidas(placa.params);
  placa.mesh.position.set(4 + mm.grosor / 2 + mm.vuelo / 2, 100, 0);
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 200));

  const gemela0 = [...ed.objects.values()].filter((o) => o.params.kind === "dentada").length;
  const g = ed.hacerDentadaDoble(placa);
  await new Promise((r) => setTimeout(r, 300));
  const placas = [...ed.objects.values()].filter((o) => o.params.kind === "dentada");
  const out = { antes: gemela0, despues: placas.length, gemelaCreada: !!g };
  if (!g) return out;
  out.sep = +placa.mesh.position.distanceTo(g.mesh.position).toFixed(1);
  // Los ganchos de la gemela miran al lado contrario.
  const dirX = (o) => new T.Vector3(1, 0, 0).applyQuaternion(o.mesh.quaternion);
  out.opuestos = +dirX(placa).dot(dirX(g)).toFixed(2);

  // GIZMO: mover y girar la original arrastra a la gemela.
  placa.mesh.position.add(new T.Vector3(0, 25, 0));
  placa.mesh.rotateY(0.4);
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 300));
  out.sigueLaSep = +placa.mesh.position.distanceTo(g.mesh.position).toFixed(1);
  out.subioLaGemela = +(g.mesh.position.y - 100).toFixed(1);
  out.siguenOpuestos = +dirX(placa).dot(dirX(g)).toFixed(2);

  // PROPIEDADES: cambiar los ganchos se copia.
  placa.params.dientes = 5;
  placa.rebuildGeometry();
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 300));
  out.dientesGemela = g.params.dientes;

  // Y borrar una se lleva a la otra.
  ed.removeObject(placa);
  out.quedan = [...ed.objects.values()].filter((o) => o.params.kind === "dentada").length;
  return out;
});
console.log("DOBLE:", JSON.stringify(doble));
ok(doble.gemelaCreada && doble.despues === 2, "el interruptor crea la placa gemela", `${doble.antes} → ${doble.despues}`);
ok(doble.sep > 5, "la gemela se monta en la cara de enfrente, no encima", `${doble.sep} cm de separación`);
ok(doble.opuestos < -0.9, "y sus ganchos miran al lado contrario", `coseno ${doble.opuestos}`);
ok(
  Math.abs(doble.subioLaGemela - 25) < 1 && Math.abs(doble.sigueLaSep - doble.sep) < 1,
  "mover la original con el gizmo mueve la gemela igual",
  `subió ${doble.subioLaGemela} cm, separación ${doble.sigueLaSep} cm`,
);
ok(doble.siguenOpuestos < -0.9, "…y al girarla siguen enfrentadas", `coseno ${doble.siguenOpuestos}`);
ok(doble.dientesGemela === 5, "cambiar las propiedades se copia en la gemela", doble.dientesGemela);
ok(doble.quedan === 0, "y borrar una se lleva a la otra", doble.quedan);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
