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

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
