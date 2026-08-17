// v0.2.73 · PLACA DENTADA (upright dentado).
//
// Comprueba las tres cosas que el diseño promete y que no se ven en una
// captura: que la herramienta de tres toques pone la placa PEGADA a la cara
// que se tocó, que su espina copia el ANCHO de esa cara y el gancho vuela
// entero por fuera del canto, y que una barra soltada sobre un gancho SE
// QUEDA ahí — que es el motivo entero de la pieza.
//
// La última parte se mide en simulación, no en la malla: un gancho que se ve
// bien y deja escapar la barra no sirve de nada.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2000);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// ---------------------------------------------------------------------------
// 1. Un pilar vertical y la herramienta en tres toques, todo por la API del
//    editor: los toques se simulan situando la cámara y proyectando puntos,
//    igual que hace una persona con el ratón.
// ---------------------------------------------------------------------------
const r1 = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const pilar = ed.addComponent("montante-rack");   // 7,6 × 230 × 7,6
  pilar.mesh.position.set(0, 115, 0);
  ed.bus.emit("objectTransformed", { object: pilar });

  // Cámara de frente al pilar, mirando su cara +Z.
  ed.orbit.target.set(0, 115, 0);
  ed.sceneManager.camera.position.set(0, 130, 260);
  ed.orbit.update?.();
  ed.sceneManager.camera.updateMatrixWorld(true);
  ed.requestRender?.();

  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const proy = (v) => {
    const q = v.clone().project(ed.sceneManager.camera);
    return {
      x: rect.left + (q.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-q.y * 0.5 + 0.5) * rect.height,
    };
  };
  // Deja los tres toques listos para que el guion los reproduzca con el ratón.
  // Toque 1: la cara +Z, del lado +X (los ganchos saldrán hacia +X).
  const caraX = proy(new T.Vector3(2.6, 115, 3.9));
  // Toques 2 y 3: principio y final de la placa, sobre la trayectoria.
  const abajo = proy(new T.Vector3(0, 80, 3.9));
  const arriba = proy(new T.Vector3(0, 140, 3.9));
  ed.beginPlacaDentada();
  return { caraX, abajo, arriba, piezas: ed.objects.size };
});

await page.mouse.click(r1.caraX.x, r1.caraX.y); await page.waitForTimeout(250);
const guia = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  return { piezas: ed.objects.size };
});
await page.mouse.click(r1.abajo.x, r1.abajo.y); await page.waitForTimeout(200);
await page.mouse.click(r1.arriba.x, r1.arriba.y); await page.waitForTimeout(400);

const m = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const placa = [...ed.objects.values()].find((o) => o.componentId === "placa-dentada");
  if (!placa) return { hay: false };
  const pilar = [...ed.objects.values()].find((o) => o.componentId === "montante-rack");
  const caja = new T.Box3().setFromObject(placa.mesh);
  const cajaPilar = new T.Box3().setFromObject(pilar.mesh);
  return {
    hay: true,
    params: { ...placa.params },
    pos: placa.mesh.position.toArray(),
    caja: { min: caja.min.toArray(), max: caja.max.toArray() },
    pilar: { min: cajaPilar.min.toArray(), max: cajaPilar.max.toArray() },
    fija: placa.physics?.fixed === true,
  };
});

ok(guia.piezas === r1.piezas, "el toque en la cara solo elige: todavía no crea la placa");
ok(m.hay, "los tres toques crean la placa dentada");

if (m.hay) {
  // --- El largo sale de los dos puntos trazados (80 → 140 = 60 cm).
  ok(Math.abs(m.params.height - 60) < 1.5,
    `el largo lo dan los dos puntos: ${m.params.height?.toFixed(1)} cm de 60 pedidos`);
  ok(Math.abs((m.caja.max[1] - m.caja.min[1]) - 60) < 2,
    `la plancha mide de alto lo trazado: ${(m.caja.max[1] - m.caja.min[1]).toFixed(1)} cm`);
  ok(Math.abs((m.caja.min[1] + m.caja.max[1]) / 2 - 110) < 1.5,
    `y queda centrada entre los dos puntos (y=110): ${((m.caja.min[1] + m.caja.max[1]) / 2).toFixed(1)}`);

  // --- El ancho lo copia de la cara: espina 7,6 + vuelo del gancho.
  const vuelo = m.params.width - 7.6;
  ok(vuelo > 8.5 && vuelo < 11,
    `la espina copia el ancho de la cara (7,6) y el gancho vuela ${vuelo.toFixed(2)} cm`);

  // --- Los ganchos van al paso configurado y caben los que caben.
  ok(m.params.dienteEspaciado === 8, "el paso entre ganchos es el configurado (8 cm)");
  ok(m.params.dientes === 7, `en 60 cm a paso 8 caben 7 ganchos: salieron ${m.params.dientes}`);

  // --- SE APOYA en la cara +Z que se tocó, no la atraviesa ni flota.
  const hueco = m.caja.min[2] - m.pilar.max[2];
  ok(hueco > -0.35 && hueco < 0.35,
    `la espalda de la placa se apoya en la cara +Z del pilar (holgura ${hueco.toFixed(2)} cm)`);

  // --- Y el gancho vuela por FUERA del canto +X, sin comerse la espina.
  ok(Math.abs(m.caja.min[0] - m.pilar.min[0]) < 0.5,
    `la espina arranca en el canto −X del pilar (${m.caja.min[0].toFixed(2)} vs ${m.pilar.min[0].toFixed(2)})`);
  ok(m.caja.max[0] - m.pilar.max[0] > 3.5,
    `y el gancho sale entero por el canto +X: ${(m.caja.max[0] - m.pilar.max[0]).toFixed(2)} cm por fuera`);

  ok(m.fija, "la placa nace fija: es estructura atornillada, no una pieza suelta");
}

// ---------------------------------------------------------------------------
// 2. Tocar la TAPA del extremo no vale — por ahí no corre ninguna trayectoria.
// ---------------------------------------------------------------------------
const tapa = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = ed.objects.size;
  const pilar = [...ed.objects.values()].find((o) => o.componentId === "montante-rack");
  ed.beginPlacaDentada();
  // Un toque sintético sobre la tapa superior (normal +Y).
  ed.elegirCaraDentada?.(pilar, new T.Vector3(0, 230, 0), new T.Vector3(0, 1, 0));
  const sinCara = ed.dentadaCara == null;
  ed.cancelPlacaDentada();
  return { sinCara, antes, despues: ed.objects.size };
});
ok(tapa.sinCara !== false, "tocar la tapa del extremo no elige cara (la placa corre a lo largo)");
ok(tapa.antes === tapa.despues, "y no planta nada");

// ---------------------------------------------------------------------------
// 3. LO QUE IMPORTA: una barra soltada sobre los ganchos se queda en ellos.
//
// Hace falta un rack de VERDAD, con sus dos montantes: una barra de 220 cm
// apoyada en una sola plancha de 8 mm se vuelca, y con razón. Los dos pilares
// se separan por Z —que es la dirección en la que corre la barra a través de
// las gargantas— y las dos placas miran al mismo lado.
// ---------------------------------------------------------------------------
const fisica = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const placaA = [...ed.objects.values()].find((o) => o.componentId === "placa-dentada");

  // Segundo montante, 120 cm por detrás, con su placa en la cara −Z y los
  // ganchos hacia el mismo +X que la primera.
  const pilarB = ed.addComponent("montante-rack");
  pilarB.mesh.position.set(0, 115, 120);
  ed.bus.emit("objectTransformed", { object: pilarB });
  ed.beginPlacaDentada();
  ed.elegirCaraDentada(pilarB, new T.Vector3(2.6, 115, 116.2), new T.Vector3(0, 0, -1));
  ed.colocarPlacaDentada(new T.Vector3(0, 80, 120), new T.Vector3(0, 140, 120));
  ed.cancelPlacaDentada();
  const placaB = [...ed.objects.values()].filter((o) => o.componentId === "placa-dentada")[1];

  const cA = new T.Box3().setFromObject(placaA.mesh);
  const cB = placaB ? new T.Box3().setFromObject(placaB.mesh) : null;
  // La barra CRUZA las dos gargantas: su eje va por Z, no por X. Se suelta
  // dentro del hueco del gancho y desde un palmo corto — naciendo pegada a
  // la espina el motor la expulsaría de un empujón. Así se re-enracka de
  // verdad.
  const barra = ed.addComponent("barra-olimpica");
  const cajaBarra = new T.Box3().setFromObject(barra.mesh);
  const radio = (cajaBarra.max.x - cajaBarra.min.x) / 2;
  const pilarA = [...ed.objects.values()].find((o) => o.componentId === "montante-rack");
  const cantoPilar = new T.Box3().setFromObject(pilarA.mesh).max.x;
  const cx = cantoPilar + (cA.max.x - cantoPilar) * 0.42;   // dentro de la garganta
  const cy = cA.max.y - 6;                                  // un gancho alto
  barra.mesh.position.set(cx, cy + 5, 60);
  barra.mesh.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
  barra.physics = { ...barra.physics, fixed: false };
  ed.bus.emit("objectTransformed", { object: barra });
  return {
    id: barra.id,
    xSoltada: cx,
    yGancho: cy,
    radio,
    cantoPilar,
    bordePlaca: cA.max.x,
    dosPlacas: !!cB,
    zB: cB ? (cB.min.z + cB.max.z) / 2 : null,
  };
});
ok(fisica.dosPlacas, "la segunda placa se coloca en la cara −Z del otro montante");

await page.evaluate(() => window.exersuite.editor.toggleSimulation());
await page.waitForTimeout(4500);

const reposo = await page.evaluate((id) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const barra = ed.objects.get(id);
  const placa = [...ed.objects.values()].find((o) => o.componentId === "placa-dentada");
  const caja = new T.Box3().setFromObject(placa.mesh);
  return {
    pos: barra.mesh.position.toArray(),
    simulando: ed.simulating === true,
    placa: { min: caja.min.toArray(), max: caja.max.toArray() },
  };
}, fisica.id);

ok(reposo.simulando, "la simulación está corriendo");
ok(reposo.pos[1] > reposo.placa.min[1],
  `la barra queda RETENIDA por un gancho y no cae al suelo (y=${reposo.pos[1].toFixed(1)}, pie de la placa ${reposo.placa.min[1].toFixed(1)})`);
ok(Math.abs(reposo.pos[1] - (fisica.yGancho + fisica.radio)) < 1,
  `y SE SIENTA en la cuna del gancho sobre el que se soltó (y=${reposo.pos[1].toFixed(2)}, cuna ${(fisica.yGancho + fisica.radio).toFixed(2)})`);
ok(reposo.pos[0] > fisica.cantoPilar && reposo.pos[0] < fisica.bordePlaca,
  `sin escapar por la boca: sigue entre el canto del pilar y el dedo (x=${reposo.pos[0].toFixed(2)} en [${fisica.cantoPilar.toFixed(1)}, ${fisica.bordePlaca.toFixed(1)}])`);

await page.screenshot({ path: "salidas/placa-dentada.png" });

// ---------------------------------------------------------------------------
// 4. En un PILAR DIAGONAL: la trayectoria es el eje de la pieza, no la vertical.
// ---------------------------------------------------------------------------
await page.evaluate(() => window.exersuite.editor.stopSimulation());
await page.waitForTimeout(600);

const rDiag = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const p = ed.addComponent("montante-rack");
  p.mesh.position.set(120, 100, 0);
  // 35° de inclinación en el plano X-Y.
  p.mesh.quaternion.setFromAxisAngle(new T.Vector3(0, 0, 1), -35 * Math.PI / 180);
  ed.bus.emit("objectTransformed", { object: p });
  ed.beginPlacaDentada();
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(p.mesh.quaternion);
  const nrm = new T.Vector3(0, 0, 1).applyQuaternion(p.mesh.quaternion);
  const lat = new T.Vector3(1, 0, 0).applyQuaternion(p.mesh.quaternion);
  // Toque sintético: cara +Z local, del lado +X local.
  ed.elegirCaraDentada(p, p.mesh.position.clone().addScaledVector(lat, 2.6).addScaledVector(nrm, 3.9), nrm);
  const a = p.mesh.position.clone().addScaledVector(eje, -25);
  const b = p.mesh.position.clone().addScaledVector(eje, 25);
  ed.colocarPlacaDentada(a, b);
  const placas = [...ed.objects.values()].filter((o) => o.componentId === "placa-dentada");
  const placa = placas[placas.length - 1];
  if (!placa) return { hay: false };
  const ejePlaca = new T.Vector3(0, 1, 0).applyQuaternion(placa.mesh.quaternion);
  return {
    hay: true,
    placas: placas.length,
    // Ángulo entre el eje de la placa y el del pilar: deben coincidir.
    desvio: T.MathUtils.radToDeg(ejePlaca.angleTo(eje)),
    // Y el eje de la placa NO es la vertical del mundo.
    contraVertical: T.MathUtils.radToDeg(ejePlaca.angleTo(new T.Vector3(0, 1, 0))),
    largo: placa.params.height,
  };
});

ok(rDiag.hay && rDiag.placas === 3, "la herramienta también coloca sobre un pilar diagonal");
ok(rDiag.hay && rDiag.desvio < 1.5,
  `la placa corre por el eje del pilar diagonal (desvío ${rDiag.desvio?.toFixed(2)}°)`);
ok(rDiag.hay && Math.abs(rDiag.contraVertical - 35) < 2,
  `y no por la vertical del mundo (${rDiag.contraVertical?.toFixed(1)}° de inclinación, 35 pedidos)`);
ok(rDiag.hay && Math.abs(rDiag.largo - 50) < 1.5,
  `con el largo trazado (${rDiag.largo?.toFixed(1)} cm de 50)`);

await page.screenshot({ path: "salidas/placa-dentada-diagonal.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
