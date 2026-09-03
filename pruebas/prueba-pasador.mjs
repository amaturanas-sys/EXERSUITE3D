// PRUEBA: el PASADOR (v0.3.31) — la bisagra sin placas.
//
// Lo que se mide:
//   · está en la paleta, dentro de MOVIMIENTO;
//   · se le dicen las piezas que lo anclan y las que pivotan: las primeras
//     quedan SOLDADAS a él y las segundas ARTICULADAS, y admite varias de cada;
//   · el recorrido se acota en grados y la pieza no lo pasa;
//   · libre cae con la gravedad, frenado se sostiene donde lo dejes;
//   · PERFORA lo que atraviesa, como una guía tubular…
//   · …pero su taladro es un PIVOTE, no una corredera: la pieza gira, no se
//     escapa por el eje del pasador;
//   · moverlo con el gizmo rehace sus uniones donde quedó.
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
  const cab = [...document.querySelectorAll(".palette-sec, .comp-sec, h3, .palette-titulo")]
    .map((e) => e.textContent.trim());
  const btns = [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim());
  return { hayBoton: btns.some((t) => /^Pasador$/i.test(t)), cab, muestra: btns.slice(0, 4) };
});
console.log("PALETA:", JSON.stringify({ hayBoton: enPaleta.hayBoton }));
ok(enPaleta.hayBoton, "el pasador figura en la paleta de piezas", enPaleta.muestra.join(" | "));
const categoria = await page.evaluate(() => {
  const lib = window.exersuite.componentes ?? null;
  return lib ? (lib.find((d) => d.id === "pasador")?.category ?? null) : "sin-lista";
});
if (categoria !== "sin-lista") {
  ok(categoria === "movimiento", "y está en la categoría MOVIMIENTO", categoria);
}

// Escena común: una horquilla de dos orejas ancladas y un brazo entre ellas.
await page.evaluate(() => {
  const T = window.exersuite.THREE;
  window.__T = T;
  window.__escena = () => {
    const ed = window.exersuite.editor;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const viga = (nombre, centro, largo, ancho = 6) => {
      const v = ed.addComponent("pilar-linea");
      v.name = nombre;
      v.params = {
        kind: "beam", width: ancho, depth: ancho, ends: "plano",
        path: [[0, -largo / 2, 0], [0, largo / 2, 0]],
      };
      v.rebuildGeometry();
      v.mesh.position.copy(centro);
      ed.bus.emit("objectTransformed", { object: v });
      return v;
    };
    // Dos orejas ancladas al suelo, separadas en Z, y un brazo en medio.
    const orejaA = viga("Oreja A", new T.Vector3(0, 30, -6), 60);
    const orejaB = viga("Oreja B", new T.Vector3(0, 30, 6), 60);
    for (const o of [orejaA, orejaB]) o.physics = { ...o.physics, fixed: true };
    const brazo = viga("Brazo", new T.Vector3(0, 30, 0), 50, 5);
    brazo.physics = { ...brazo.physics, fixed: false, massKg: 2 };
    // El pasador, atravesando las tres por arriba.
    const pas = ed.addComponent("pasador");
    pas.params = { ...pas.params, height: 24 };
    pas.rebuildGeometry();
    pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
    pas.mesh.position.set(0, 52, 0);
    ed.bus.emit("objectTransformed", { object: pas });
    return { orejaA, orejaB, brazo, pas };
  };
});

// ── 2. ANCLAS Y MÓVILES, VARIAS DE CADA ─────────────────────────────────────
const uniones = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const { orejaA, orejaB, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [orejaA.id, orejaB.id];
  pas.params.pasadorMoviles = [brazo.id];
  const r = ed.aplicarPasador(pas);
  const mias = ed.listJoints().filter((j) => j.name.startsWith(`Pasador ${pas.id}`));
  return {
    devuelto: r,
    total: mias.length,
    soldadas: mias.filter((j) => j.soldada).length,
    articuladas: mias.filter((j) => !j.soldada).length,
    ejeExacto: mias.find((j) => !j.soldada)?.axisVec != null,
    // Se vuelve a aplicar: no puede acumular herraje.
    trasRepetir: (() => {
      ed.aplicarPasador(pas);
      return ed.listJoints().filter((j) => j.name.startsWith(`Pasador ${pas.id}`)).length;
    })(),
  };
});
console.log("UNIONES:", JSON.stringify(uniones));
ok(uniones.total === 3, "arma una unión por cada pieza asociada", uniones.total);
ok(uniones.soldadas === 2, "las DOS anclas quedan soldadas al pasador", uniones.soldadas);
ok(uniones.articuladas === 1, "y la móvil queda articulada", uniones.articuladas);
ok(uniones.ejeExacto, "sobre el eje EXACTO del pasador, no el eje global más parecido");
ok(uniones.trasRepetir === 3, "aplicarlo otra vez no acumula herraje", uniones.trasRepetir);

// ── 3. PERFORA, Y SU TALADRO ES UN PIVOTE ───────────────────────────────────
const taladros = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const { orejaA, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [orejaA.id];
  pas.params.pasadorMoviles = [brazo.id];
  const r = ed.aplicarPasador(pas);
  const canalesDe = (o) => o.params.canales ?? [];
  return {
    taladros: r.taladros,
    enElBrazo: canalesDe(brazo).length,
    radio: canalesDe(brazo)[0]?.radio ?? null,
    pivote: canalesDe(brazo)[0]?.pivote ?? false,
    // Un taladro de pasador NO da carrera: la pieza no es una corredera.
    carrera: ed.carreraDeLaPieza
      ? ed.carreraDeLaPieza(brazo)
      : "sin-metodo",
  };
});
console.log("TALADROS:", JSON.stringify(taladros));
ok(taladros.enElBrazo >= 1, "el pasador abre su taladro en la pieza que atraviesa", taladros.enElBrazo);
ok(
  taladros.radio != null && Math.abs(taladros.radio - 1.6) < 0.1,
  "del diámetro del pasador más la holgura",
  `radio ${taladros.radio} (pasador 1,25 + 0,35)`,
);
ok(taladros.pivote === true, "y queda marcado como PIVOTE, no como corredera");

// ── 4. RECORRIDO ACOTADO EN GRADOS ──────────────────────────────────────────
const rango = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const { orejaA, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [orejaA.id];
  pas.params.pasadorMoviles = [brazo.id];
  pas.params.pasadorLimite = true;
  pas.params.pasadorMin = 40;
  pas.params.pasadorMax = 140;
  ed.aplicarPasador(pas);
  const j = ed.listJoints().find((x) => x.name.startsWith(`Pasador ${pas.id}`) && !x.soldada);
  return {
    limitado: j?.limitsEnabled ?? false,
    min: j?.min, max: j?.max,
    apertura0: j == null ? null : +j.apertura0.toFixed(1),
    sentido: j?.sentidoApertura,
  };
});
console.log("RANGO:", JSON.stringify(rango));
ok(rango.limitado && rango.min === 40 && rango.max === 140,
  "el recorrido se acota en grados", `${rango.min}–${rango.max}`);
ok(
  rango.apertura0 != null && rango.apertura0 >= 0 && rango.apertura0 <= 360,
  "y se anota la apertura de diseño en la misma escala que la bisagra",
  `${rango.apertura0}° (sentido ${rango.sentido})`,
);

// ── 5. LIBRE CAE, FRENADO SE SOSTIENE ───────────────────────────────────────
const fisica = async (libre) => page.evaluate(async (lib) => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  const { orejaA, orejaB, brazo, pas } = window.__escena();
  // El brazo, colgado del pasador y tumbado: si nada lo sujeta, cae.
  brazo.mesh.position.set(20, 52, 0);
  brazo.mesh.quaternion.setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
  ed.bus.emit("objectTransformed", { object: brazo });
  pas.params.pasadorAnclas = [orejaA.id, orejaB.id];
  pas.params.pasadorMoviles = [brazo.id];
  pas.params.pasadorLibre = lib;
  pas.params.pasadorLimite = false;
  ed.aplicarPasador(pas);
  const alto = () => +brazo.mesh.getWorldPosition(new T.Vector3()).y.toFixed(1);
  const antes = alto();
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 250));
  const alArrancar = {
    y: alto(),
    esBisagra: ed.physics?.esBisagra(brazo.id) ?? "sin-fisica",
    angulo: ed.physics?.anguloDeBisagra(brazo.id) ?? null,
  };
  let quieto = false;
  const traza = [];
  for (let i = 0; i < 30 && !quieto; i++) {
    await new Promise((r) => setTimeout(r, 400));
    traza.push(alto());
    const n = traza.length;
    quieto = n >= 5 && Math.abs(traza[n - 1] - traza[n - 5]) <= 0.3;
  }
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 400));
  const j = ed.listJoints().find((x) => x.name.startsWith(`Pasador ${pas.id}`) && !x.soldada);
  return {
    alArrancar,
    union: j ? { locked: j.locked, soldada: j.soldada, lim: j.limitsEnabled,
                 min: j.min, max: j.max, ap0: +j.apertura0.toFixed(1) } : null,
    traza: traza.slice(0, 12),
    antes, final: traza[traza.length - 1],
    // Suelto es un PÉNDULO: oscila mucho antes de pararse, así que lo que
    // dice si cayó es hasta dónde LLEGÓ, no dónde estaba al mirar.
    bajo: +(antes - Math.min(...traza)).toFixed(1),
    pasadorBajo: +(52 - pas.mesh.getWorldPosition(new T.Vector3()).y).toFixed(1),
    orejaBajo: +(30 - orejaA.mesh.getWorldPosition(new T.Vector3()).y).toFixed(1),
  };
}, libre);

const suelto = await fisica(true);
const frenado = await fisica(false);
console.log("LIBRE:", JSON.stringify(suelto), "FRENADO:", JSON.stringify(frenado));
ok(suelto.bajo > 15, "libre, el brazo cae girando sobre el pasador", `bajó ${suelto.bajo} cm`);
ok(frenado.bajo < 2, "frenado, se sostiene donde lo dejaste", `bajó ${frenado.bajo} cm`);
ok(
  suelto.pasadorBajo === 0 && suelto.orejaBajo === 0,
  "y el pasador y sus anclas no se mueven: el eje aguanta la carga",
  `pasador ${suelto.pasadorBajo}, ancla ${suelto.orejaBajo} cm`,
);

// ── 6. EL GIZMO LO COLOCA Y REHACE SUS UNIONES ──────────────────────────────
const gizmo = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  const { orejaA, brazo, pas } = window.__escena();
  pas.params.pasadorAnclas = [orejaA.id];
  pas.params.pasadorMoviles = [brazo.id];
  ed.aplicarPasador(pas);
  const anclaDe = () => ed.listJoints()
    .find((j) => j.name.startsWith(`Pasador ${pas.id}`) && !j.soldada)?.anchor.clone();
  const antes = anclaDe();
  // Se mueve el pasador con el gizmo: el aviso de transformación es el mismo.
  pas.mesh.position.add(new T.Vector3(0, -18, 0));
  ed.bus.emit("objectTransformed", { object: pas });
  const despues = anclaDe();
  return {
    antesY: +(antes?.y ?? 0).toFixed(1),
    despuesY: +(despues?.y ?? 0).toFixed(1),
    pasadorY: +pas.mesh.position.y.toFixed(1),
  };
});
console.log("GIZMO:", JSON.stringify(gizmo));
ok(
  Math.abs(gizmo.despuesY - gizmo.pasadorY) < 0.5 && Math.abs(gizmo.despuesY - gizmo.antesY) > 10,
  "mover el pasador con el gizmo rehace sus uniones donde quedó",
  `pivote ${gizmo.antesY} → ${gizmo.despuesY} (pasador en ${gizmo.pasadorY})`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
