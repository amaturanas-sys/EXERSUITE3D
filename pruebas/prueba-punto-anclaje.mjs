// PRUEBA: el PUNTO DE ANCLAJE del pasador (v0.3.32) — la horquilla.
//
// Lo que se mide:
//   · la horquilla está en la paleta, dentro de MOVIMIENTO;
//   · su forma es la del modelo: alma soldable, dos orejas con la garganta en
//     medio, taladro sobre el eje y PUNTA REDONDA centrada en él;
//   · el pasador pone una por ancla, soldada, con el taladro EN EL EJE y el
//     alma contra la cara de la viga —el vuelo sale de la geometría, no de un
//     número a ojo—;
//   · volver a aplicarlo no acumula horquillas;
//   · el extremo proximal del brazo se redondea, y con eso el radio que barre
//     al girar baja de la DIAGONAL del perfil a su RADIO, que es lo que le
//     deja completar el recorrido sin chocar;
//   · y apagar el interruptor lo deja como estaba.
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

// ── 1. ESTÁ EN LA PALETA, EN MOVIMIENTO ─────────────────────────────────────
const enPaleta = await page.evaluate(() => {
  const btns = [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim());
  const lib = window.exersuite.componentes ?? null;
  return {
    hayBoton: btns.some((t) => /^Punto de anclaje$/i.test(t)),
    categoria: lib ? (lib.find((d) => d.id === "punto-anclaje")?.category ?? null) : "sin-lista",
    muestra: btns.slice(0, 4),
  };
});
console.log("PALETA:", JSON.stringify({ hayBoton: enPaleta.hayBoton, cat: enPaleta.categoria }));
ok(enPaleta.hayBoton, "el punto de anclaje figura en la paleta", enPaleta.muestra.join(" | "));
if (enPaleta.categoria !== "sin-lista") {
  ok(enPaleta.categoria === "movimiento", "y está en la categoría MOVIMIENTO", enPaleta.categoria);
}

// ── 2. LA FORMA DE LA HORQUILLA ─────────────────────────────────────────────
//
// Se mide sobre los VÉRTICES, no sobre los parámetros: es la única manera de
// saber que la pieza que se dibuja es la que se pidió.
const forma = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const h = ed.addComponent("punto-anclaje");
  h.params = {
    kind: "horquilla",
    horquillaAlto: 8, horquillaEspesor: 0.8, horquillaGarganta: 4.2,
    horquillaVuelo: 4, horquillaAgujero: 1.3,
  };
  h.rebuildGeometry();
  h.mesh.position.set(0, 0, 0);
  h.mesh.quaternion.identity();
  ed.bus.emit("objectTransformed", { object: h });
  h.mesh.updateMatrixWorld(true);
  const pos = h.mesh.geometry.attributes.position;
  const v = new T.Vector3();
  const caja = { xmin: 1e9, xmax: -1e9, ymin: 1e9, ymax: -1e9, zmin: 1e9, zmax: -1e9 };
  // ¿Hay garganta? Ningún vértice debe caer DENTRO de ella, salvo el alma.
  let enGarganta = 0;
  // ¿Hay taladro? Se busca el vértice más cercano al eje X entre las orejas.
  let radioMin = 1e9;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    caja.xmin = Math.min(caja.xmin, v.x); caja.xmax = Math.max(caja.xmax, v.x);
    caja.ymin = Math.min(caja.ymin, v.y); caja.ymax = Math.max(caja.ymax, v.y);
    caja.zmin = Math.min(caja.zmin, v.z); caja.zmax = Math.max(caja.zmax, v.z);
    if (Math.abs(v.x) < 4.2 / 2 - 0.01 && v.z > -4 + 0.9) enGarganta++;
    if (Math.abs(v.x) > 4.2 / 2 + 0.01) {
      const r = Math.hypot(v.y, v.z);
      if (r < radioMin) radioMin = r;
    }
  }
  return {
    ancho: +(caja.xmax - caja.xmin).toFixed(2),
    alto: +(caja.ymax - caja.ymin).toFixed(2),
    fondo: +(caja.zmax - caja.zmin).toFixed(2),
    zmax: +caja.zmax.toFixed(2),
    zmin: +caja.zmin.toFixed(2),
    enGarganta,
    radioMin: +radioMin.toFixed(2),
  };
});
console.log("FORMA:", JSON.stringify(forma));
// ancho = garganta + dos orejas = 4,2 + 1,6
ok(Math.abs(forma.ancho - 5.8) < 0.05, "la horquilla mide garganta + dos orejas de ancho", forma.ancho);
ok(Math.abs(forma.alto - 8) < 0.05, "y el alto que se le pide", forma.alto);
// La punta redonda llega a un radio (alto/2 = 4) por delante del eje, que está
// en el origen; el alma queda al fondo del vuelo (−4) más su espesor.
ok(Math.abs(forma.zmax - 4) < 0.05, "la punta redondea a un radio POR DELANTE del eje", forma.zmax);
ok(Math.abs(forma.zmin - -4.8) < 0.05, "y el alma cierra al fondo del vuelo", forma.zmin);
ok(forma.enGarganta === 0, "entre las orejas no hay material: la garganta está libre", forma.enGarganta);
ok(Math.abs(forma.radioMin - 1.3) < 0.05, "y las orejas están taladradas sobre el eje", forma.radioMin);

// ── 3. EL PASADOR LAS MONTA SOLAS ───────────────────────────────────────────
await page.evaluate(() => {
  const T = window.exersuite.THREE;
  window.__escena = () => {
    const ed = window.exersuite.editor;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const viga = (nombre, centro, largo, ancho, eje) => {
      const v = ed.addComponent("pilar-linea");
      v.name = nombre;
      v.params = {
        kind: "beam", width: ancho, depth: ancho, ends: "plano",
        path: [[0, -largo / 2, 0], [0, largo / 2, 0]],
      };
      v.rebuildGeometry();
      if (eje) v.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eje);
      v.mesh.position.copy(centro);
      ed.bus.emit("objectTransformed", { object: v });
      return v;
    };
    // Un poste vertical y un brazo horizontal que sale de su cara +X. El eje
    // del pasador va en Z, así que el brazo gira en el plano XY.
    const poste = viga("Poste", new T.Vector3(0, 50, 0), 100, 7);
    poste.physics = { ...poste.physics, fixed: true };
    // El brazo se monta como se monta de verdad: con el EJE EN EL CENTRO DEL
    // ARCO de su punta redonda, media anchura (2,5) por dentro del extremo. Ahí
    // es donde el redondeo sirve de algo; con el eje en el ápice, la punta
    // redonda barre MÁS que la cuadrada.
    const brazo = viga("Brazo", new T.Vector3(8 - 2.5 + 20, 80, 0), 40, 5,
      new T.Vector3(1, 0, 0));
    brazo.physics = { ...brazo.physics, fixed: false, massKg: 3 };
    const pas = ed.addComponent("pasador");
    pas.params = { ...pas.params, height: 16 };
    pas.rebuildGeometry();
    pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
    pas.mesh.position.set(8, 80, 0);
    ed.bus.emit("objectTransformed", { object: pas });
    return { poste, brazo, pas };
  };
});

const montaje = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const { poste, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [poste.id];
  pas.params.pasadorMoviles = [brazo.id];
  pas.params.pasadorAnclaje = true;
  const r = ed.aplicarPasador(pas);
  const hs = ed.listObjects().filter((o) => o.componentId === "punto-anclaje");
  const h = hs[0];
  if (!h) return { devuelto: r, horquillas: hs.length };
  h.mesh.updateMatrixWorld(true);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pas.mesh.quaternion).normalize();
  const centro = pas.mesh.getWorldPosition(new T.Vector3());
  // ¿El taladro está EN EL EJE? El origen de la horquilla ES su taladro.
  const d = h.mesh.getWorldPosition(new T.Vector3()).sub(centro);
  const fueraDelEje = d.clone().addScaledVector(eje, -d.dot(eje)).length();
  // ¿El alma llega a la cara del poste? El alma queda a vuelo+esp del origen
  // por −Z local; la cara del poste está a 3,5 del centro del poste.
  const zLocal = new T.Vector3(0, 0, 1).applyQuaternion(h.mesh.quaternion).normalize();
  const alma = h.mesh.getWorldPosition(new T.Vector3())
    .addScaledVector(zLocal, -(h.params.horquillaVuelo ?? 0));
  const caraPoste = 3.5;
  // El eje X local de la horquilla debe ser el del pasador.
  const xLocal = new T.Vector3(1, 0, 0).applyQuaternion(h.mesh.quaternion).normalize();
  const soldada = ed.listJoints().filter(
    (j) => (j.bodyAId === h.id || j.bodyBId === h.id) && j.soldada,
  ).length;
  return {
    devuelto: r,
    horquillas: hs.length,
    fueraDelEje: +fueraDelEje.toFixed(3),
    almaEnLaCara: +Math.abs(alma.x - caraPoste).toFixed(2),
    ejeAlineado: +Math.abs(Math.abs(xLocal.dot(eje)) - 1).toFixed(4),
    garganta: +(h.params.horquillaGarganta ?? 0).toFixed(2),
    soldada,
  };
});
console.log("MONTAJE:", JSON.stringify(montaje));
ok(montaje.horquillas === 1, "el pasador monta una horquilla por ancla", montaje.horquillas);
ok(montaje.devuelto?.anclajes === 1, "y lo reporta", JSON.stringify(montaje.devuelto));
ok(montaje.fueraDelEje < 0.05, "su taladro cae EN EL EJE del pasador", montaje.fueraDelEje);
ok(montaje.ejeAlineado < 0.01, "y sus orejas son perpendiculares a él", montaje.ejeAlineado);
ok(montaje.almaEnLaCara < 0.2, "el alma se apoya en la cara del poste", montaje.almaEnLaCara);
// El brazo mide 5 de perfil: garganta = 5 + 0,4 de holgura.
ok(Math.abs(montaje.garganta - 5.4) < 0.05, "la garganta se abre a la medida del brazo", montaje.garganta);
ok(montaje.soldada >= 1, "y va soldada a su ancla", montaje.soldada);

// ── 4. NO ACUMULA HERRAJE ───────────────────────────────────────────────────
const repetido = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pas = ed.listObjects().find((o) => o.componentId === "pasador");
  ed.aplicarPasador(pas);
  ed.aplicarPasador(pas);
  return ed.listObjects().filter((o) => o.componentId === "punto-anclaje").length;
});
ok(repetido === 1, "aplicarlo tres veces deja UNA horquilla, no tres", repetido);

// ── 5. EL EXTREMO PROXIMAL, REDONDO ─────────────────────────────────────────
//
// Aquí está el motivo entero de la pieza. Se mide el RADIO QUE BARRE la punta
// del brazo al girar: con la esquina en escuadra es la diagonal del perfil
// —W/2·√2 = 3,54 para un perfil de 5— y con la punta redonda es exactamente su
// radio, 2,5. Ese centímetro es lo que topa contra la horquilla.
const barrido = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  // Escena limpia y SIN TALADROS: sus anillos meten vértices por todo el brazo
  // y lo que aquí se mide es la PUNTA. La perforación tiene su propia prueba.
  const { poste, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [poste.id];
  pas.params.pasadorMoviles = [brazo.id];
  pas.params.pasadorAnclaje = true;
  pas.params.pasadorPerfora = false;
  ed.aplicarPasador(pas);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pas.mesh.quaternion).normalize();
  const centro = pas.mesh.getWorldPosition(new T.Vector3());
  // El radio máximo que barre la MITAD PROXIMAL del brazo (la que puede topar).
  const radio = () => {
    brazo.mesh.updateMatrixWorld(true);
    const pos = brazo.mesh.geometry.attributes.position;
    const v = new T.Vector3();
    let max = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      brazo.mesh.localToWorld(v).sub(centro);
      const a = v.dot(eje);
      const r = Math.sqrt(Math.max(v.lengthSq() - a * a, 0));
      // Sólo la punta que mira al pasador: el otro extremo siempre barre más.
      if (r < 6 && r > max) max = r;
    }
    return +max.toFixed(2);
  };
  const conRedondeo = radio();
  const forma = brazo.params.extremoRedondo ?? null;
  // Y sin él: se apaga el interruptor y se vuelve a aplicar.
  pas.params.pasadorRedondea = false;
  ed.aplicarPasador(pas);
  const enEscuadra = radio();
  const formaTras = brazo.params.extremoRedondo ?? null;
  return { conRedondeo, enEscuadra, forma, formaTras };
});
console.log("BARRIDO:", JSON.stringify(barrido));
ok(barrido.forma !== null, "el pasador redondea el extremo proximal del brazo", barrido.forma);
ok(
  Math.abs(barrido.conRedondeo - 2.5) < 0.2,
  "y con eso la punta barre su RADIO (2,5 de un perfil de 5)",
  barrido.conRedondeo,
);
ok(
  barrido.enEscuadra - barrido.conRedondeo > 0.7,
  "en escuadra barría la DIAGONAL, casi un centímetro más",
  `${barrido.enEscuadra} frente a ${barrido.conRedondeo}`,
);
ok(barrido.formaTras === null, "y apagar el interruptor lo deja como estaba", barrido.formaTras);


// ── 6. EL SELECTOR DE CARA ──────────────────────────────────────────────────
//
// Cuando el eje NO va en paralelo a una arista de la viga, sobreviven dos ejes
// locales y hay varias caras alcanzables: ahí la elección es real, y la hace
// quien diseña, no la geometría. Se pide la segunda y se mide que la horquilla
// se muda a esa cara.
const selector = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const poste = ed.addComponent("pilar-linea");
  poste.name = "Poste";
  poste.params = {
    kind: "beam", width: 7, depth: 7, ends: "plano",
    path: [[0, -50, 0], [0, 50, 0]],
  };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 50, 0);
  poste.physics = { ...poste.physics, fixed: true };
  ed.bus.emit("objectTransformed", { object: poste });
  const pas = ed.addComponent("pasador");
  pas.params = { ...pas.params, height: 16 };
  pas.rebuildGeometry();
  // El eje VERTICAL, paralelo al poste: así ni X ni Z son el eje de giro, las
  // dos son perpendiculares a él y las cuatro caras del perfil entran en juego.
  // (Es el montaje de un brazo que barre en horizontal sobre una columna.)
  pas.mesh.quaternion.identity();
  // Y el pasador, por fuera de la ESQUINA: las caras +X y +Z le miran las dos,
  // a distinta distancia, y ahí la elección es real.
  pas.mesh.position.set(8, 80, 6);
  ed.bus.emit("objectTransformed", { object: pas });
  pas.params.pasadorAnclas = [poste.id];
  pas.params.pasadorAnclaje = true;
  pas.params.pasadorPerfora = false;

  const centro = pas.mesh.getWorldPosition(new T.Vector3());
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pas.mesh.quaternion).normalize();
  const caras = ed.carasDeAnclaje(poste, centro, eje);
  const normalDe = () => {
    const h = ed.listObjects().find((o) => o.componentId === "punto-anclaje");
    if (!h) return null;
    h.mesh.updateMatrixWorld(true);
    const z = new T.Vector3(0, 0, 1).applyQuaternion(h.mesh.quaternion).normalize();
    return { x: +z.x.toFixed(2), y: +z.y.toFixed(2), z: +z.z.toFixed(2) };
  };
  ed.aplicarPasador(pas);
  const auto = normalDe();
  pas.params.pasadorCaras = { [poste.id]: caras[1]?.clave };
  ed.aplicarPasador(pas);
  const segunda = normalDe();
  // Y una clave que ya no vale —la pieza pudo girarse— vuelve a la automática.
  pas.params.pasadorCaras = { [poste.id]: "+inventada" };
  ed.aplicarPasador(pas);
  const invalida = normalDe();
  return {
    claves: caras.map((c) => c.clave),
    etiquetas: caras.map((c) => c.etiqueta),
    vuelos: caras.map((c) => +c.vuelo.toFixed(1)),
    auto, segunda, invalida,
  };
});
console.log("CARA:", JSON.stringify(selector));
ok(selector.claves.length === 2, "el ancla ofrece las caras que la horquilla ALCANZA", selector.claves.join(","));
ok(
  !selector.claves.some((c) => c.endsWith("y")),
  "nunca la TAPA del extremo: ahí no se suelda una horquilla",
  selector.claves.join(","),
);
ok(
  selector.vuelos.every((v) => v >= 0.2) && selector.vuelos[0] >= selector.vuelos[1],
  "todas con vuelo utilizable, y la que más mira al pasador primero",
  selector.vuelos.join(" / "),
);
ok(
  selector.etiquetas[0] === "derecha" && selector.etiquetas[1] === "delante",
  "y las nombra por dónde miran en el mundo, no por su letra",
  selector.etiquetas.join(","),
);
ok(
  selector.auto && Math.abs(selector.auto.x - 1) < 0.05,
  "sin pedir nada manda la cara que más mira al pasador",
  JSON.stringify(selector.auto),
);
ok(
  selector.segunda && Math.abs(selector.segunda.z - 1) < 0.05,
  "pedir la segunda muda la horquilla a esa cara",
  JSON.stringify(selector.segunda),
);
ok(
  selector.invalida && Math.abs(selector.invalida.x - 1) < 0.05,
  "y una cara que ya no existe vuelve a la automática, no rompe",
  JSON.stringify(selector.invalida),
);


// ── 7. LA ABRAZADERA ────────────────────────────────────────────────────────
//
// El caso que la horquilla NO puede resolver: el pasador ATRAVIESA la viga por
// un pinhole, así que no queda por delante de ninguna cara y no hay dónde
// apoyar un alma con las orejas hacia fuera. La abrazadera suelda el alma en la
// cara contraria y cruza la viga por sus dos costados hasta el eje.
const abrazo = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const poste = ed.addComponent("pilar-linea");
  poste.name = "Poste";
  poste.params = {
    kind: "beam", width: 7, depth: 5, ends: "plano",
    path: [[0, -50, 0], [0, 50, 0]],
  };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 50, 0);
  poste.physics = { ...poste.physics, fixed: true };
  ed.bus.emit("objectTransformed", { object: poste });
  const pas = ed.addComponent("pasador");
  pas.params = { ...pas.params, height: 20 };
  pas.rebuildGeometry();
  // El eje en Z, ATRAVESANDO el poste por su centro: es un pinhole.
  pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
  pas.mesh.position.set(0, 80, 0);
  ed.bus.emit("objectTransformed", { object: pas });
  pas.params.pasadorAnclas = [poste.id];
  pas.params.pasadorAnclaje = true;
  pas.params.pasadorPerfora = false;

  const centro = pas.mesh.getWorldPosition(new T.Vector3());
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(pas.mesh.quaternion).normalize();
  const comoHorquilla = ed.carasDeAnclaje(poste, centro, eje, false);
  const comoAbrazadera = ed.carasDeAnclaje(poste, centro, eje, true);

  // Con el estilo normal no hay herraje posible.
  ed.aplicarPasador(pas);
  const sinAbrazar = ed.listObjects().filter((o) => o.componentId === "punto-anclaje").length;
  // Y con la abrazadera, sí.
  pas.params.pasadorAbraza = true;
  const r = ed.aplicarPasador(pas);
  const h = ed.listObjects().find((o) => o.componentId === "punto-anclaje");
  if (!h) return { comoHorquilla: comoHorquilla.length, comoAbrazadera: comoAbrazadera.length, sinAbrazar, r };
  h.mesh.updateMatrixWorld(true);
  const z = new T.Vector3(0, 0, 1).applyQuaternion(h.mesh.quaternion).normalize();
  const origen = h.mesh.getWorldPosition(new T.Vector3());
  // El alma va a `vuelo` por detrás del eje, sobre la cara del poste.
  const alma = origen.clone().addScaledVector(z, -(h.params.horquillaVuelo ?? 0));
  // Y las orejas tienen que dejar pasar el poste: 5 cm de fondo en el eje Z.
  return {
    comoHorquilla: comoHorquilla.length,
    comoAbrazadera: comoAbrazadera.length,
    sinAbrazar,
    r,
    vuelo: +(h.params.horquillaVuelo ?? 0).toFixed(2),
    garganta: +(h.params.horquillaGarganta ?? 0).toFixed(2),
    almaX: +alma.x.toFixed(2),
    ejeDentro: +origen.distanceTo(centro).toFixed(3),
    nombre: h.name.includes("abrazadera"),
  };
});
console.log("ABRAZO:", JSON.stringify(abrazo));
ok(abrazo.comoHorquilla === 0, "con el eje DENTRO de la viga no hay horquilla posible", abrazo.comoHorquilla);
ok(abrazo.sinAbrazar === 0, "y en efecto no se monta ninguna", abrazo.sinAbrazar);
ok(abrazo.comoAbrazadera === 2, "pero la abrazadera alcanza las dos caras", abrazo.comoAbrazadera);
ok(abrazo.r?.anclajes === 1, "y monta su herraje", JSON.stringify(abrazo.r));
ok(abrazo.ejeDentro < 0.05, "con el taladro EN EL EJE, como siempre", abrazo.ejeDentro);
// El poste mide 7 en X: el alma se suelda en una de sus caras, a 3,5 del centro.
ok(Math.abs(Math.abs(abrazo.almaX) - 3.5) < 0.2, "el alma soldada en la cara de la viga", abrazo.almaX);
ok(Math.abs(abrazo.vuelo - 3.5) < 0.2, "y las orejas cruzan de la cara al eje", abrazo.vuelo);
// Y la garganta deja pasar el poste: 5 de fondo en Z más holgura.
ok(Math.abs(abrazo.garganta - 5.4) < 0.05, "con la garganta abierta a la viga que cruza", abrazo.garganta);
ok(abrazo.nombre, "y se llama por lo que es", abrazo.nombre);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
