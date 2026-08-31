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

  // LA PLACA SE MONTA POR SU CARA, NO POR SU CANTO. La plancha se extruye en
  // su Z local, así que la cara que apoya en el poste es perpendicular a Z: se
  // pega a la cara +Z del poste, que es como la coloca la herramienta.
  const placa = ed.addComponent("placa-dentada");
  placa.params = { ...placa.params, dientes: 3, dienteEspaciado: 14, dienteCaraCm: 8 };
  placa.params.width = 8 + window.exersuite.dentada.medidas(placa.params).vuelo;
  placa.rebuildGeometry();
  const mm = window.exersuite.dentada.medidas(placa.params);
  placa.mesh.position.set(0, 100, 4 + mm.grosor / 2);
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 200));

  const gemela0 = [...ed.objects.values()].filter((o) => o.params.kind === "dentada").length;
  const g = ed.hacerDentadaDoble(placa);
  await new Promise((r) => setTimeout(r, 300));
  const placas = [...ed.objects.values()].filter((o) => o.params.kind === "dentada");
  const out = { antes: gemela0, despues: placas.length, gemelaCreada: !!g, grosor: +mm.grosor.toFixed(2) };
  if (!g) return out;

  // EL PLANO ESPEJO, RECONSTRUIDO COMO LO GUARDA LA HERRAMIENTA.
  const planoMundo = () => {
    const e = placa.params.dentadaEspejo;
    const host = ed.objects.get(e.host);
    host.mesh.updateMatrixWorld(true);
    return {
      n: new T.Vector3(...e.n).transformDirection(host.mesh.matrixWorld).normalize(),
      c: new T.Vector3(...e.c).applyMatrix4(host.mesh.matrixWorld),
    };
  };
  // «DOBLADA POR LA LÍNEA», MEDIDO SOBRE EL ACERO. Se reflejan vértices de la
  // malla de una placa y se busca el vértice más cercano en la otra: si las dos
  // son mitades espejadas, cada reflejo cae sobre un vértice de la gemela. No se
  // comparan coordenadas locales homólogas a propósito —el reflejo invierte el
  // eje del grosor, así que el punto (0,0,10) de una NO es el (0,0,10) de la
  // otra— y lo que importa es la pieza que se ve, no cómo esté rotulada.
  window.__errorEspejo = (A, B, n, c) => {
    const va = A.geometry.getAttribute("position");
    const vb = B.geometry.getAttribute("position");
    A.updateMatrixWorld(true);
    B.updateMatrixWorld(true);
    const paso = Math.max(1, Math.floor(va.count / 40));
    let peor = 0;
    for (let i = 0; i < va.count; i += paso) {
      const a = new T.Vector3().fromBufferAttribute(va, i).applyMatrix4(A.matrixWorld);
      const r = a.addScaledVector(n, -2 * a.clone().sub(c).dot(n));
      let cerca = Infinity;
      const p = new T.Vector3();
      for (let j = 0; j < vb.count; j++) {
        p.fromBufferAttribute(vb, j).applyMatrix4(B.matrixWorld);
        const d = p.distanceToSquared(r);
        if (d < cerca) cerca = d;
      }
      peor = Math.max(peor, Math.sqrt(cerca));
    }
    return +peor.toFixed(2);
  };
  const errorEspejo = () => {
    const { n, c } = planoMundo();
    return window.__errorEspejo(placa.mesh, g.mesh, n, c);
  };
  // El plano cae en el MEDIO EXACTO de la viga.
  const { n, c } = planoMundo();
  out.planoAlMedio = +Math.abs(c.clone().sub(poste.mesh.position).dot(n)).toFixed(2);
  out.espejo = errorEspejo();
  out.sep = +placa.mesh.position.distanceTo(g.mesh.position).toFixed(1);
  const eje = (o, v) => v.clone().applyQuaternion(o.mesh.quaternion);
  // El poste queda ENTRE las dos: cada placa de un lado del plano.
  out.aLadosOpuestos =
    Math.sign(placa.mesh.position.clone().sub(c).dot(n)) !==
    Math.sign(g.mesh.position.clone().sub(c).dot(n));
  // NO ESTÁ DEL REVÉS: puesta plana sobre la cara, la gemela conserva el giro.
  out.derecha = +Math.min(
    eje(placa, new T.Vector3(1, 0, 0)).dot(eje(g, new T.Vector3(1, 0, 0))),
    eje(placa, new T.Vector3(0, 1, 0)).dot(eje(g, new T.Vector3(0, 1, 0))),
    eje(placa, new T.Vector3(0, 0, 1)).dot(eje(g, new T.Vector3(0, 0, 1))),
  ).toFixed(3);

  // GIZMO: mover y girar la original se reproduce del lado contrario. Se la
  // sube, se la corre POR la cara y se la SEPARA de ella, que es donde una
  // copia corrida deja de valer y hace falta el espejo de verdad.
  placa.mesh.position.add(new T.Vector3(6, 25, 3));
  placa.mesh.rotateY(0.4);
  placa.mesh.rotateX(0.25);
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 300));
  out.subioLaGemela = +(g.mesh.position.y - 100).toFixed(1);
  out.espejoTrasElGizmo = errorEspejo();
  // Separada 3 cm de la cara, la gemela tiene que separarse otro tanto de la
  // suya: la distancia de cada una al plano es la misma.
  const d1 = Math.abs(placa.mesh.position.clone().sub(c).dot(n));
  const d2 = Math.abs(g.mesh.position.clone().sub(c).dot(n));
  out.equidistantes = +Math.abs(d1 - d2).toFixed(2);

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
ok(
  doble.planoAlMedio <= 0.2,
  "el plano de referencia cae en el MEDIO EXACTO de la viga",
  `${doble.planoAlMedio} cm del centro`,
);
ok(
  doble.espejo <= 0.2,
  "la gemela es la pareja DOBLADA por ese plano",
  `${doble.espejo} cm de desvío en el peor punto`,
);
ok(
  Math.abs(doble.sep - (8 + doble.grosor)) < 0.6,
  "puesta a ras, se separa el grosor del poste ni más ni menos",
  `${doble.sep} cm (poste 8 + plancha ${doble.grosor})`,
);
ok(doble.aLadosOpuestos, "el poste queda entre las dos placas");
ok(
  doble.derecha > 0.99,
  "la gemela NO sale del revés: sus tres ejes van como los de su pareja",
  `peor coseno ${doble.derecha}`,
);
ok(
  Math.abs(doble.subioLaGemela - 25) < 1,
  "mover la original con el gizmo mueve la gemela igual",
  `subió ${doble.subioLaGemela} cm`,
);
ok(
  doble.espejoTrasElGizmo <= 0.2,
  "…y tras correrla, separarla e inclinarla sigue siendo su reflejo exacto",
  `${doble.espejoTrasElGizmo} cm de desvío`,
);
ok(
  doble.equidistantes <= 0.2,
  "separarla de su cara separa a la gemela de la suya lo mismo",
  `${doble.equidistantes} cm de diferencia`,
);
ok(doble.dientesGemela === 5, "cambiar las propiedades se copia en la gemela", doble.dientesGemela);
ok(doble.quedan === 0, "y borrar una se lleva a la otra", doble.quedan);

// ── 6. LA MISMA DOBLE SOBRE UNA VIGA EN DIAGONAL ────────────────────────────
// El caso de la foto. Con la viga torcida, saltar por un eje que no sea el del
// grosor mide la viga A LO LARGO y manda la gemela a tomar el aire: el error se
// ve en centímetros, no en decimales.
const diagonal = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const viga = ed.addComponent("pilar-linea");
  viga.name = "Viga inclinada";
  viga.params = { kind: "beam", width: 8, depth: 8, ends: "plano", path: [[0, -90, 0], [0, 90, 0]] };
  viga.rebuildGeometry();
  viga.mesh.position.set(0, 110, 0);
  viga.mesh.rotation.set(0, 0, 0.6); // ~34° de inclinación, como en el rack
  viga.physics = { ...viga.physics, fixed: true };
  ed.bus.emit("objectTransformed", { object: viga });

  const placa = ed.addComponent("placa-dentada");
  placa.params = { ...placa.params, dientes: 5, dienteEspaciado: 12.5, dienteCaraCm: 8 };
  placa.params.width = 8 + window.exersuite.dentada.medidas(placa.params).vuelo;
  placa.rebuildGeometry();
  const mm = window.exersuite.dentada.medidas(placa.params);
  // Pegada a la cara +Z de la viga, girada con ella…
  placa.mesh.quaternion.copy(viga.mesh.quaternion);
  placa.mesh.position
    .copy(viga.mesh.position)
    .add(new T.Vector3(0, 0, 4 + mm.grosor / 2).applyQuaternion(viga.mesh.quaternion));
  // …y CORRIDA A MANO ANTES DE ENCENDER EL INTERRUPTOR, que es como se trabaja:
  // primero se coloca la placa donde va y después se pide la homóloga. El sitio
  // de la gemela sale del plano de la viga, no de dónde estuviera la placa al
  // activarla.
  placa.mesh.position.add(new T.Vector3(0, 30, 0).applyQuaternion(viga.mesh.quaternion));
  placa.mesh.position.add(new T.Vector3(2.5, 0, 0).applyQuaternion(viga.mesh.quaternion));
  ed.bus.emit("objectTransformed", { object: placa });
  await new Promise((r) => setTimeout(r, 200));

  const g = ed.hacerDentadaDoble(placa);
  await new Promise((r) => setTimeout(r, 300));
  if (!g) return { gemela: false };
  const eje = (o, v) => v.clone().applyQuaternion(o.mesh.quaternion);
  const salto = g.mesh.position.clone().sub(placa.mesh.position);
  const e = placa.params.dentadaEspejo;
  const n = new T.Vector3(...e.n).transformDirection(viga.mesh.matrixWorld).normalize();
  const c = new T.Vector3(...e.c).applyMatrix4(viga.mesh.matrixWorld);
  const peor = window.__errorEspejo(placa.mesh, g.mesh, n, c);
  // ¿La gemela sigue tocando la viga, o se fue a tomar el aire?
  const cajaViga = new T.Box3().setFromObject(viga.mesh);
  const alaViga = cajaViga.clampPoint(g.mesh.position, new T.Vector3()).distanceTo(g.mesh.position);
  return {
    gemela: true,
    sep: +salto.length().toFixed(1),
    esperado: +(8 + mm.grosor).toFixed(1),
    espejo: +peor.toFixed(2),
    planoAlMedio: +Math.abs(c.clone().sub(viga.mesh.position).dot(n)).toFixed(2),
    // La gemela tiene que haber subido lo mismo que subió la placa a mano.
    subida: +g.mesh.position.clone().sub(viga.mesh.position).dot(
      new T.Vector3(0, 1, 0).applyQuaternion(viga.mesh.quaternion),
    ).toFixed(1),
    porElGrosor: +Math.abs(salto.clone().normalize().dot(eje(placa, new T.Vector3(0, 0, 1)))).toFixed(3),
    derecha: +eje(placa, new T.Vector3(1, 0, 0)).dot(eje(g, new T.Vector3(1, 0, 0))).toFixed(3),
    pegadaALaViga: +alaViga.toFixed(1),
  };
});
console.log("DIAGONAL:", JSON.stringify(diagonal));
ok(diagonal.gemela, "sobre una viga inclinada también nace la gemela");
ok(
  diagonal.planoAlMedio <= 0.2,
  "el plano sigue en el medio exacto de la viga inclinada",
  `${diagonal.planoAlMedio} cm del centro`,
);
ok(
  diagonal.espejo <= 0.2,
  "activada DESPUÉS de mover la placa, la gemela nace ya reflejada",
  `${diagonal.espejo} cm de desvío`,
);
ok(
  Math.abs(diagonal.subida - 30) < 0.6,
  "…y a la misma altura por la viga que se le dio a la placa",
  `subió ${diagonal.subida} cm de los 30`,
);
ok(
  Math.abs(diagonal.sep - diagonal.esperado) < 1.2,
  "y se separa el grosor de la viga, no su largo",
  `${diagonal.sep} cm (se esperaban ~${diagonal.esperado})`,
);
ok(diagonal.porElGrosor > 0.99, "cruzando por la cara", `|cos| = ${diagonal.porElGrosor}`);
ok(diagonal.derecha > 0.99, "y derecha, no del revés", `coseno ${diagonal.derecha}`);
ok(
  diagonal.pegadaALaViga <= 1,
  "la gemela queda PEGADA a la viga, no suelta por el aire",
  `${diagonal.pegadaALaViga} cm de la viga`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
