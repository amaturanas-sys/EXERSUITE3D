// PRUEBA: la bisagra se opera como en la máquina real (v0.3.19).
//
// Tres cosas que el usuario pidió y que aquí se miden con números:
//   1. El recorrido se pide en la escala de la PROPIA PLACA: 180 extendida,
//      0 plegada, sin grados negativos.
//   2. La mano la mueve por su CIRCUNFERENCIA y no la saca de sitio: el radio
//      al pasador no cambia (antes el tirón recto empujaba contra el pasador
//      y la bisagra salía volando).
//   3. Con el LOCK SWITCH puesto la bisagra se sostiene sola donde la dejas,
//      pero la mano puede seguir moviéndola: es una máquina plegable, no una
//      soldadura.
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

/** Monta dos placas con una bisagra entre ellas y devuelve las medidas. */
const ensayo = async (caso) =>
  page.evaluate(async (caso) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    if (ed.simulating) ed.toggleSimulation();
    for (const o of [...ed.objects.values()]) ed.deleteObject?.(o.id);
    const out = { caso };
    const caja = (n, w, h, d, p) => {
      const o = ed.addComponent("pilar");
      o.name = n;
      o.params = { kind: "box", width: w, height: h, depth: d };
      o.rebuildGeometry();
      o.mesh.position.copy(p);
      ed.bus.emit("objectTransformed", { object: o });
      return o;
    };
    const A = caja("Fija", 40, 4, 30, new T.Vector3(0, 60, 0));
    const B = caja("Movil", 40, 4, 30, new T.Vector3(46, 60, 0));
    A.physics.fixed = true;
    B.physics.fixed = false;
    B.physics.massKg = 8;
    const cfg = { eje: "z", tamano: 6 };
    if (caso === "limite") cfg.limite = [90, 180];
    const j = ed.instalarBisagra(A, B, cfg);
    if (!j) return { ...out, error: "no se instaló la bisagra" };
    out.apertura0 = +j.apertura0.toFixed(1);
    out.sentido = j.sentidoApertura;
    out.min = j.min;
    out.max = j.max;
    out.soldada = !!j.soldada;
    // Las soldaduras del herraje sí se marcan como tales.
    out.soldaduras = ed
      .listJoints()
      .filter((x) => x.name.startsWith("Soldadura")).length;
    out.soldadurasMarcadas = ed
      .listJoints()
      .filter((x) => x.name.startsWith("Soldadura") && x.soldada).length;
    if (caso === "freno") j.locked = true;

    ed.toggleSimulation();
    await new Promise((r) => setTimeout(r, 1500));
    const ph = ed.physics;
    const bg = ph.ejeDeGiro(B.id);
    if (!bg) return { ...out, error: "la bisagra no quedó articulada" };
    const P = bg.punto.clone();
    const E = bg.eje.clone();
    const radial = () =>
      B.mesh.getWorldPosition(new T.Vector3()).sub(P).projectOnPlane(E);
    const ang = () => {
      const r = radial();
      return +((Math.atan2(r.y, r.x) * 180) / Math.PI).toFixed(1);
    };
    const R0 = radial().length();
    out.R0 = +R0.toFixed(2);
    out.angReposo = ang();
    // ¿se sostiene sola o cae?
    await new Promise((r) => setTimeout(r, 1500));
    out.angTrasEsperar = ang();

    // La mano la arrastra POR SU ARCO, 70° a razón de uno por fotograma.
    const a0 = Math.atan2(radial().y, radial().x);
    const Rmano = R0 + 18;
    const puntoDelArco = (th) =>
      P.clone().addScaledVector(new T.Vector3(Math.cos(th), Math.sin(th), 0), Rmano);
    out.agarrado = ph.grab(B.id, puntoDelArco(a0));
    let deriva = 0;
    for (let k = 1; k <= 70; k++) {
      ph.dragTo(puntoDelArco(a0 - (k * Math.PI) / 180));
      await new Promise((r) => setTimeout(r, 40));
      deriva = Math.max(deriva, Math.abs(radial().length() - R0));
    }
    out.derivaRadio = +deriva.toFixed(2);
    out.angBajoMano = ang();
    ph.release();
    await new Promise((r) => setTimeout(r, 2000));
    out.angTrasSoltar = ang();
    return out;
  }, caso);

// ── 1. ESCALA DE LA PLACA ───────────────────────────────────────────────────
const libre = await ensayo("libre");
console.log("LIBRE:", JSON.stringify(libre));
ok(!libre.error, "la bisagra se monta y queda articulada", libre.error);
ok(libre.apertura0 === 180, "dos placas en línea abren 180° en el diseño", libre.apertura0);
ok(libre.min === 0 && libre.max === 180, "el recorrido de fábrica va de 0 a 180", `${libre.min}..${libre.max}`);
ok(libre.min >= 0 && libre.max >= 0, "no hay grados negativos en la escala de la placa");
ok(!libre.soldada, "la bisagra NO es una soldadura");
ok(
  libre.soldaduras > 0 && libre.soldaduras === libre.soldadurasMarcadas,
  "las soldaduras del herraje van marcadas como tales",
  `${libre.soldadurasMarcadas}/${libre.soldaduras}`,
);

// ── 2. LA MANO NO LA SACA DE SITIO ──────────────────────────────────────────
ok(libre.agarrado === true, "la mano agarra la placa articulada");
ok(libre.derivaRadio <= 1, "la placa no se sale de su circunferencia", `${libre.derivaRadio} cm`);
ok(
  Math.abs(libre.angBajoMano - libre.angTrasEsperar) > 1
    || Math.abs(libre.angTrasEsperar - libre.angReposo) > 1,
  "la placa se mueve de verdad (no queda agarrotada)",
  `${libre.angReposo} → ${libre.angTrasEsperar} → ${libre.angBajoMano}`,
);

// ── 3. LOCK SWITCH = BISAGRA QUE SE SOSTIENE SOLA ───────────────────────────
const freno = await ensayo("freno");
console.log("FRENO:", JSON.stringify(freno));
ok(!freno.error, "la bisagra frenada queda articulada", freno.error);
ok(
  Math.abs(freno.angTrasEsperar - freno.angReposo) <= 2,
  "con el lock switch NO cae sola",
  `${freno.angReposo} → ${freno.angTrasEsperar}`,
);
ok(
  Math.abs(freno.angBajoMano - freno.angReposo) > 20,
  "la mano SÍ puede moverla durante la simulación",
  `${freno.angReposo} → ${freno.angBajoMano}`,
);
ok(
  Math.abs(freno.angTrasSoltar - freno.angBajoMano) <= 3,
  "al soltarla se queda EXACTAMENTE donde la dejaste",
  `${freno.angBajoMano} → ${freno.angTrasSoltar}`,
);
ok(freno.derivaRadio <= 1, "la bisagra frenada tampoco sale volando", `${freno.derivaRadio} cm`);

// ── 4. RECORRIDO LIMITADO EN GRADOS DE PLACA ────────────────────────────────
const limite = await ensayo("limite");
console.log("LIMITE:", JSON.stringify(limite));
ok(!limite.error, "la bisagra con recorrido limitado queda articulada", limite.error);
ok(limite.min === 90 && limite.max === 180, "el panel guarda el recorrido tal cual se pidió", `${limite.min}..${limite.max}`);
// De 180 a 90 hay 90° de viaje: la placa no puede pasar de ahí.
const viaje = Math.abs(limite.angBajoMano - limite.angReposo);
ok(viaje <= 100, "la placa no pasa del recorrido pedido (90° de viaje)", `${viaje.toFixed(1)}°`);
ok(limite.derivaRadio <= 1, "el tope no la expulsa de su eje", `${limite.derivaRadio} cm`);

// ── 5. LA CIRCUNFERENCIA SE DIBUJA AL AGARRARLA ─────────────────────────────
const marca = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const moviles = [...ed.objects.values()].filter((o) => o.name === "Movil");
  const B = moviles[moviles.length - 1];
  const arco = Object.getPrototypeOf(ed).arcoDeAgarre.call(
    ed,
    B.id,
    B.mesh.getWorldPosition(new T.Vector3()),
  );
  Object.getPrototypeOf(ed).marcarArco.call(ed, arco);
  const hay = () => {
    let n = 0;
    ed.sceneManager.scene.traverse((o) => {
      if (o.isLine && o.geometry?.attributes?.position?.count === 97) n++;
    });
    return n;
  };
  const conMarca = hay();
  Object.getPrototypeOf(ed).quitarMarcaArco.call(ed);
  return { arco: !!arco, radio: arco ? +arco.radio.toFixed(1) : 0, conMarca, sinMarca: hay() };
});
console.log("MARCA:", JSON.stringify(marca));
ok(marca.arco === true, "hay arco de agarre sobre una pieza articulada");
ok(marca.radio > 3, "el arco tiene radio de palanca", `${marca.radio} cm`);
ok(marca.conMarca === 1, "se dibuja la circunferencia del recorrido", marca.conMarca);
ok(marca.sinMarca === 0, "y se retira al soltar", marca.sinMarca);

// ── 6. SE OPERA CON SCROLL, NO CON EMPUJONES (v0.3.21) ──────────────────────
const gesto = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const moviles = [...ed.objects.values()].filter((o) => o.name === "Movil");
  const B = moviles[moviles.length - 1];
  const ph = ed.physics;
  const bg = ph.ejeDeGiro(B.id);
  const P = bg.punto.clone();
  const E = bg.eje.clone();
  const radial = () => B.mesh.getWorldPosition(new T.Vector3()).sub(P).projectOnPlane(E);
  const ang = () => (Math.atan2(radial().y, radial().x) * 180) / Math.PI;
  const R0 = radial().length();
  const out = {
    esBisagra: ph.esBisagra(B.id),
    sensibilidad: ph.sensibilidadDeBisagra(B.id),
  };
  await new Promise((r) => setTimeout(r, 1200));
  const a0 = ang();
  // Ocho impulsos de 5° «hacia arriba», como ocho vueltas de rueda.
  ph.tomarBisagra(B.id);
  let deriva = 0;
  for (let k = 0; k < 8; k++) {
    ph.girarBisagra(B.id, 5);
    await new Promise((r) => setTimeout(r, 120));
    deriva = Math.max(deriva, Math.abs(radial().length() - R0));
  }
  await new Promise((r) => setTimeout(r, 1200));
  out.pedido = 40;
  out.logrado = +(ang() - a0).toFixed(1);
  out.deriva = +deriva.toFixed(2);
  // Se deja asentar y luego se comprueba que YA NO se mueve: el mando puede
  // ir unos grados por delante de la placa cuando el gesto para, y lo que
  // importa es que se detenga, no que frene en seco.
  await new Promise((r) => setTimeout(r, 1500));
  const sostenido = ang();
  await new Promise((r) => setTimeout(r, 1500));
  out.quietaMientrasSeSostiene = +(ang() - sostenido).toFixed(1);
  ph.soltarBisagra(B.id);
  await new Promise((r) => setTimeout(r, 1500));
  out.sueltaVuelveAGravedad = +(ang() - sostenido).toFixed(1);
  out.derivaFinal = +(radial().length() - R0).toFixed(2);
  return out;
});
console.log("GESTO:", JSON.stringify(gesto));
ok(gesto.esBisagra === true, "la pieza se declara operable como bisagra");
ok(gesto.sensibilidad === 9, "la sensibilidad de fábrica es lenta y cómoda", gesto.sensibilidad);
ok(
  Math.abs(gesto.logrado - gesto.pedido) <= 12,
  "el scroll gira lo que se le pide",
  `pedidos ${gesto.pedido}°, logrados ${gesto.logrado}°`,
);
ok(
  gesto.deriva <= 0.5,
  "girándola por su ángulo el pivote NO se mueve",
  `${gesto.deriva} cm`,
);
ok(
  Math.abs(gesto.quietaMientrasSeSostiene) <= 1,
  "mientras la sostienes se queda exactamente donde la dejaste",
  `${gesto.quietaMientrasSeSostiene}°`,
);
ok(
  Math.abs(gesto.sueltaVuelveAGravedad) > 1,
  "al soltarla, una bisagra SIN freno vuelve a obedecer a la gravedad",
  `${gesto.sueltaVuelveAGravedad}°`,
);

// ── 7. LA SENSIBILIDAD SE AJUSTA EN PROPIEDADES ─────────────────────────────
const panel = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const moviles = [...ed.objects.values()].filter((o) => o.name === "Movil");
  const B = moviles[moviles.length - 1];
  if (ed.simulating) ed.toggleSimulation();
  ed.select(B);
  const inspector = document.getElementById("inspector");
  const etiquetas = [...inspector.querySelectorAll("label")].map((l) => l.textContent);
  const rango = [...inspector.querySelectorAll('input[type="range"]')];
  const mando = rango[rango.length - 1];
  const antes = mando ? mando.value : null;
  if (mando) {
    mando.value = "20";
    mando.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const j = ed.bisagraQueSostiene(B.id);
  return { etiquetas, antes, guardado: j?.sensibilidad ?? null };
});
console.log("PANEL:", JSON.stringify(panel));
ok(
  panel.etiquetas.some((t) => /Bisagra/.test(t) && /sensibilidad/i.test(t)),
  "Propiedades trae el mando de sensibilidad de la bisagra",
  panel.etiquetas.join(" | "),
);
ok(panel.antes === "9", "arranca en el valor lento de fábrica", panel.antes);
ok(panel.guardado === 20, "moverlo guarda el valor en la unión", panel.guardado);

// ── 8. EL GESTO REAL SOBRE EL LIENZO: RUEDA Y ARRASTRE ──────────────────────
// Aquí no se llama a ninguna API: se hace el gesto con el ratón, como el
// usuario, y se comprueba que la rueda gira la bisagra en vez de acercar la
// cámara, y que subir la mano la sube.
const preparado = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const moviles = [...ed.objects.values()].filter((o) => o.name === "Movil");
  const B = moviles[moviles.length - 1];
  ed.setSimHerramienta("mano");
  if (!ed.simulating) ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 2000));
  window.__B = B.id;
  const p = B.mesh.getWorldPosition(new T.Vector3()).project(ed.sceneManager.camera);
  const rect = ed.canvas.getBoundingClientRect();
  const ph = ed.physics;
  const bg = ph.ejeDeGiro(B.id);
  window.__P = bg.punto.clone();
  window.__E = bg.eje.clone();
  window.__ang = () => {
    const r = B.mesh.getWorldPosition(new T.Vector3()).sub(window.__P).projectOnPlane(window.__E);
    return +((Math.atan2(r.y, r.x) * 180) / Math.PI).toFixed(1);
  };
  window.__pantallaY = () => {
    const B2 = ed.objects.get(window.__B);
    return +B2.mesh.getWorldPosition(new T.Vector3()).project(ed.sceneManager.camera).y.toFixed(3);
  };
  window.__radio = () =>
    +B.mesh
      .getWorldPosition(new T.Vector3())
      .sub(window.__P)
      .projectOnPlane(window.__E)
      .length()
      .toFixed(2);
  return {
    x: rect.left + ((p.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - p.y) / 2) * rect.height,
    ang: window.__ang(),
    radio: window.__radio(),
    camara: ed.sceneManager.camera.position.length(),
  };
});

await page.mouse.move(preparado.x, preparado.y);
await page.waitForTimeout(300);
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1500);
const conRueda = await page.evaluate(() => ({
  ang: window.__ang(),
  radio: window.__radio(),
  camara: window.exersuite.editor.sceneManager.camera.position.length(),
}));
console.log("RUEDA:", JSON.stringify({ antes: preparado.ang, ...conRueda }));
ok(
  Math.abs(conRueda.ang - preparado.ang) > 3,
  "la rueda sobre la bisagra la hace girar",
  `${preparado.ang}° → ${conRueda.ang}°`,
);
ok(
  Math.abs(conRueda.camara - preparado.camara) < 1,
  "…y NO acerca la cámara: el scroll deja de ser zoom sobre una bisagra",
  `${preparado.camara.toFixed(1)} → ${conRueda.camara.toFixed(1)}`,
);
ok(
  Math.abs(conRueda.radio - preparado.radio) <= 0.5,
  "el pivote sigue en su sitio tras el scroll",
  `${preparado.radio} → ${conRueda.radio} cm`,
);

// Se espera a que la bisagra se suelte sola tras el scroll y se hace el otro
// gesto: agarrar y subir la mano.
await page.waitForTimeout(900);
// Se devuelve la placa a media carrera antes del segundo gesto: tras el
// scroll puede haber quedado contra el material, y ahí no cede hacia ese lado
// —lo correcto— pero la prueba dejaría de medir lo que quiere medir.
const centrada = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const ph = ed.physics;
  ph.tomarBisagra(window.__B);
  // Se sube hasta el tope de arriba, midiendo, y luego se baja 25°: así queda
  // en un sitio conocido CON RECORRIDO POR ENCIMA, que es lo que el gesto de
  // la prueba va a pedir.
  let previo = null;
  for (let k = 0; k < 24; k++) {
    ph.girarBisagra(window.__B, 5);
    await new Promise((r) => setTimeout(r, 100));
    const a = ph.anguloDeBisagra(window.__B);
    if (previo !== null && Math.abs(a - previo) < 0.2) break;
    previo = a;
  }
  await new Promise((r) => setTimeout(r, 600));
  const tope = ph.anguloDeBisagra(window.__B);
  for (let k = 0; k < 5; k++) {
    ph.girarBisagra(window.__B, -5);
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 800));
  const aqui = ph.anguloDeBisagra(window.__B);
  ph.soltarBisagra(window.__B);
  await new Promise((r) => setTimeout(r, 900));
  return { tope: +tope.toFixed(1), aqui: +aqui.toFixed(1) };
});
console.log("CENTRADA:", JSON.stringify(centrada));
// La placa ya no está donde estaba: se vuelve a buscar en pantalla.
const ahora = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const B = ed.objects.get(window.__B);
  const p = B.mesh.getWorldPosition(new T.Vector3()).project(ed.sceneManager.camera);
  const rect = ed.canvas.getBoundingClientRect();
  return {
    x: rect.left + ((p.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - p.y) / 2) * rect.height,
    ang: window.__ang(),
    pantallaY: window.__pantallaY(),
  };
});
// EL SIGNO SE COMPRUEBA DONDE EL DEDO TOCA, no en el centro de la placa: en
// un giro, dos puntos del mismo sólido a distinta posición angular pueden ir
// uno hacia arriba y otro hacia abajo, y lo que el usuario espera es que le
// siga LO QUE TIENE BAJO EL DEDO. Se rota ese punto 2° a mano y se mira si
// sube en pantalla; tiene que coincidir con lo que dice `arribaEnLaPantalla`.
const signo = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const B = ed.objects.get(window.__B);
  const punto = B.mesh.getWorldPosition(new T.Vector3());
  const arco = Object.getPrototypeOf(ed).arcoDeAgarre.call(ed, window.__B, punto);
  const dice = Object.getPrototypeOf(ed).arribaEnLaPantalla.call(ed, arco, punto);
  const cam = ed.sceneManager.camera;
  const girado = punto
    .clone()
    .sub(arco.centro)
    .applyAxisAngle(arco.eje, T.MathUtils.degToRad(2))
    .add(arco.centro);
  const sube = girado.project(cam).y - punto.clone().project(cam).y;
  return { dice, sube: +sube.toFixed(5) };
});
console.log("SIGNO:", JSON.stringify(signo));
ok(
  signo.dice === (signo.sube >= 0 ? 1 : -1),
  "el gesto sabe hacia dónde sube en pantalla el punto que se agarra",
  JSON.stringify(signo),
);

const antesDeArrastrar = ahora.ang;
await page.mouse.move(ahora.x, ahora.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) {
  await page.mouse.move(ahora.x, ahora.y - i * 20);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1200);
const arrastrada = await page.evaluate(() => ({
  ang: window.__ang(),
  radio: window.__radio(),
  pantallaY: window.__pantallaY(),
}));
await page.mouse.up();
console.log("ARRASTRE:", JSON.stringify({ antes: antesDeArrastrar, ...arrastrada }));
ok(
  Math.abs(arrastrada.ang - antesDeArrastrar) > 3,
  "subir la mano de agarre también la gira",
  `${antesDeArrastrar}° → ${arrastrada.ang}°`,
);

ok(
  Math.abs(arrastrada.radio - preparado.radio) <= 0.5,
  "y tampoco saca la bisagra de su circunferencia",
  `${arrastrada.radio} cm`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
