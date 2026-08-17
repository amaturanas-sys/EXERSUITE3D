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
  // El intervalo de fábrica son 12,5 cm, y no es capricho: por debajo de ~12
  // la barra deja de entrar en los ganchos de en medio (ver el bloque 3).
  ok(Math.abs(m.params.dienteEspaciado - 12.5) < 0.01,
    `el paso entre ganchos es el de fábrica (${m.params.dienteEspaciado} cm)`);
  ok(m.params.dientes === 4, `en 60 cm a paso 12,5 caben 4 ganchos: salieron ${m.params.dientes}`);

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
// 3. LO QUE IMPORTA: una barra soltada sobre CADA gancho se queda en él.
//
// En TODOS, no solo en el de arriba. Es la comprobación que faltaba en la
// primera versión de esta prueba y que dejó pasar el fallo más gordo de la
// pieza: al paso con el que nació —8 cm— la barra solo entraba en el gancho
// de más arriba, el único que no tiene otro diente encima. Los otros once
// estaban dibujados y no servían para nada, y la placa se veía perfecta.
//
// Hace falta un rack de VERDAD, con sus dos montantes: una barra de 220 cm
// apoyada en una sola plancha de 8 mm se vuelca, y con razón. Los dos pilares
// se separan por Z —que es la dirección en la que corre la barra a través de
// las gargantas— y las dos placas miran al mismo lado.
// ---------------------------------------------------------------------------
const rack = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  // Segundo montante, 120 cm por detrás, con su placa en la cara −Z y los
  // ganchos hacia el mismo +X que la primera.
  const pilarB = ed.addComponent("montante-rack");
  pilarB.mesh.position.set(0, 115, 120);
  ed.bus.emit("objectTransformed", { object: pilarB });
  ed.beginPlacaDentada();
  ed.elegirCaraDentada(pilarB, new T.Vector3(2.6, 115, 116.2), new T.Vector3(0, 0, -1));
  ed.colocarPlacaDentada(new T.Vector3(0, 80, 120), new T.Vector3(0, 140, 120));
  ed.cancelPlacaDentada();
  const placas = [...ed.objects.values()].filter((o) => o.componentId === "placa-dentada");
  const pl = placas[0];
  // Las medidas RESUELTAS de la pieza, no una copia de la fórmula: si la
  // fórmula se equivoca, una copia se equivocaría igual y la prueba pasaría.
  const md = window.exersuite.dentada.medidas(pl.params);
  const cajaBarra = new T.Box3().setFromObject(ed.addComponent("barra-olimpica").mesh);
  const radio = (cajaBarra.max.x - cajaBarra.min.x) / 2;
  for (const o of [...ed.objects.values()]) if (o.componentId === "barra-olimpica") ed.removeObject(o);
  return {
    dosPlacas: placas.length === 2,
    radio,
    paso: md.paso,
    minimo: window.exersuite.dentada.pasoMinimo(pl.params),
    // Centro de la garganta en mundo: por ahí entra la barra.
    xGarganta: pl.mesh.position.x + (md.cantoEspina + md.caraDedo) / 2,
    asientos: [...Array(md.dientes)].map((_, i) => pl.mesh.position.y + md.asiento(i)),
    piePlaca: pl.mesh.position.y + md.asiento(0) - md.paso,
  };
});
ok(rack.dosPlacas, "la segunda placa se coloca en la cara −Z del otro montante");
ok(rack.paso >= rack.minimo - 0.01,
  `el intervalo entre ganchos respeta su mínimo (${rack.paso.toFixed(2)} ≥ ${rack.minimo.toFixed(2)} cm)`);
ok(rack.asientos.length >= 4,
  `la placa trazada tiene ganchos de sobra para la prueba (${rack.asientos.length})`);

const sujetan = [];
for (let i = 0; i < rack.asientos.length; i++) {
  const y = rack.asientos[i];
  const id = await page.evaluate(({ y, x, radio }) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    if (ed.simulating) ed.stopSimulation();
    for (const o of [...ed.objects.values()]) if (o.componentId === "barra-olimpica") ed.removeObject(o);
    const b = ed.addComponent("barra-olimpica");
    // Centrada en la garganta y desde un palmo corto: naciendo pegada a la
    // espina el motor la expulsaría de un empujón.
    b.mesh.position.set(x, y + radio + 3, 60);
    b.mesh.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    b.physics = { ...b.physics, fixed: false };
    ed.bus.emit("objectTransformed", { object: b });
    return b.id;
  }, { y, x: rack.xGarganta, radio: rack.radio });
  await page.evaluate(() => window.exersuite.editor.toggleSimulation());
  await page.waitForTimeout(2600);
  const fin = await page.evaluate((id) => {
    const b = window.exersuite.editor.objects.get(id);
    return { pos: b.mesh.position.toArray(), simulando: window.exersuite.editor.simulating === true };
  }, id);
  if (i === 0) ok(fin.simulando, "la simulación está corriendo");
  sujetan.push(Math.abs(fin.pos[1] - (y + rack.radio)) < 1.2);
  if (i === Math.floor(rack.asientos.length / 2)) {
    await page.screenshot({ path: "salidas/placa-dentada.png" });
  }
  await page.evaluate(() => window.exersuite.editor.stopSimulation());
  await page.waitForTimeout(250);
}

ok(sujetan.every(Boolean),
  `la barra se SIENTA en los ${sujetan.length} ganchos, no solo en el de arriba (sujetan ${sujetan.filter(Boolean).length})`);


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

// ---------------------------------------------------------------------------
// 5. EL INTERVALO SE PUEDE CAMBIAR, y al cambiarlo la placa NO se despega.
//
// Es lo que pidió el usuario y tiene una trampa que no se ve: el gancho crece
// con el intervalo, y el `width` que guarda la pieza es el ancho TOTAL. Si se
// deja quieto mientras el vuelo engorda, lo que encoge es la ESPINA — justo la
// parte que apoyaba en la cara del pilar—, la placa se corre hacia dentro del
// poste y los ganchos se meten en él. La placa sigue pareciendo bien puesta;
// lo que falla es la barra, que ahora choca con el pilar.
// ---------------------------------------------------------------------------
await page.evaluate(() => window.exersuite.editor.stopSimulation());
await page.waitForTimeout(400);

const panel = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const pl = [...ed.objects.values()].find((o) => o.componentId === "placa-dentada");
  const pilar = [...ed.objects.values()].find((o) => o.componentId === "montante-rack");
  const caraPilar = new T.Box3().setFromObject(pilar.mesh);
  const antes = window.exersuite.dentada.medidas(pl.params);
  ed.select(pl);
  const leer = () => {
    const md = window.exersuite.dentada.medidas(pl.params);
    const caja = new T.Box3().setFromObject(pl.mesh);
    return {
      paso: md.paso, dientes: md.dientes, largo: md.largo, espina: md.espina,
      // La espina tiene que seguir cubriendo la cara del pilar: su canto
      // interior, pegado al canto −X del poste.
      cantoEspina: pl.mesh.position.x + md.cantoEspina,
      minX: caja.min.x, maxY: caja.max.y, minY: caja.min.y,
    };
  };
  const campos = () => [...document.querySelectorAll("#inspector input[type=number]")];
  const antesUI = leer();
  // El campo del intervalo: el primero de la sección de ganchos.
  const etiqueta = [...document.querySelectorAll("#inspector .sub label")]
    .find((l) => l.textContent.includes("Intervalo"));
  const input = etiqueta?.parentElement?.querySelector("input");
  if (!input) return { hayCampo: false, campos: campos().length };
  input.value = "18";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const tras18 = leer();
  // Y por debajo del mínimo: la pieza tiene que rechazarlo.
  input.value = "4";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const tras4 = leer();
  return {
    hayCampo: true,
    minimo: window.exersuite.dentada.pasoMinimo(pl.params),
    cantoPilar: caraPilar.min.x,
    antes: antesUI, tras18, tras4, anchoCaraOriginal: antes.espina,
  };
});

ok(panel.hayCampo, "el panel de propiedades ofrece el intervalo entre ganchos");
if (panel.hayCampo) {
  ok(Math.abs(panel.tras18.paso - 18) < 0.01,
    `escribir 18 en el panel deja el intervalo en 18 (salió ${panel.tras18.paso.toFixed(2)})`);
  ok(panel.tras18.dientes < panel.antes.dientes,
    `y al separarlos caben menos ganchos: ${panel.antes.dientes} → ${panel.tras18.dientes}`);
  ok(Math.abs(panel.tras18.largo - panel.antes.largo) < 0.01,
    `sin que la plancha cambie de largo (${panel.tras18.largo.toFixed(1)} cm, era ${panel.antes.largo.toFixed(1)})`);
  ok(Math.abs(panel.tras18.espina - panel.anchoCaraOriginal) < 0.01,
    `la espina sigue midiendo lo que la cara del pilar (${panel.tras18.espina.toFixed(2)} cm)`);
  ok(Math.abs(panel.tras18.cantoEspina - (panel.cantoPilar + panel.anchoCaraOriginal)) < 0.15,
    `y la placa NO se despega: su espina sigue sobre la cara (canto en ${panel.tras18.cantoEspina.toFixed(2)})`);
  ok(Math.abs(panel.tras4.paso - panel.minimo) < 0.01,
    `pedir 4 cm lo sube al mínimo ${panel.minimo.toFixed(2)} en vez de dibujar ganchos por los que no entra la barra`);
}

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
