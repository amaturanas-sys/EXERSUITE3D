// v0.3.8 · LA BISAGRA SE MONTA SOBRE CARAS, NO SOBRE PIEZAS.
//
// La herramienta pedía dos piezas y adivinaba el resto: el eje de giro salía
// de la línea que unía sus centros y la cara de montaje, de una rejilla de
// botones con las seis direcciones globales. Es lo que se puede hacer cuando
// no se sabe dónde va el herraje — pero una bisagra real se atornilla SOBRE
// una cara concreta, en un sitio concreto.
//
// Ahora se marca un PUNTO en una cara de cada pieza, como en la instalación de
// una roldana externa. Con eso:
//
//   · cada placa se pega a la cara marcada, en el sitio marcado;
//   · el eje del pivote sale solo — es la arista donde se encuentran los dos
//     planos de las palas —, y no hay nada que elegir en el panel;
//   · la segunda pieza se arrima hasta dejar el pasador pegado a las dos
//     placas, como el lomo de un libro.
//
// Se comprueban los dos montajes que existen de verdad: dos tablas en el mismo
// plano (libro abierto) y una tapa sobre el canto de una caja (esquina).
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

// Utilidades comunes que se inyectan en la página.
const PREPARA = `
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const limpia = () => { for (const o of [...ed.listObjects()]) ed.removeObject(o); ed.select(null); };
  const tabla = (nombre, w, h, d, pos) => {
    const o = ed.addComponent("prim-box");
    o.name = nombre;
    o.params = { kind: "box", width: w, height: h, depth: d };
    o.rebuildGeometry();
    o.mesh.position.set(pos[0], pos[1], pos[2]);
    o.mesh.updateMatrixWorld(true);
    return o;
  };
  const pieza = (n) => ed.listObjects().find((o) => o.name === n);
  const placas = () => ed.listObjects().filter((o) => o.componentId === "placa-bisagra");
  const pasador = () => ed.listObjects().find((o) => o.componentId === "pasador-bisagra");
  const r2 = (v) => +v.toFixed(2);
`;

// ── 1. LIBRO ABIERTO: dos tablas en el mismo plano ────────────────────────
//
// Dos tablas de 40×4×30 sobre la misma altura, separadas por un hueco de 12 cm.
// Se marca la cara de ARRIBA de cada una, cerca del canto que se enfrentan.
// La bisagra debe salir con el eje en Z (la línea que separa las tablas),
// las dos placas boca arriba y el hueco cerrado.
console.log("\n── Libro abierto: dos tablas coplanares ────────────────────");
const libro = await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  const A = tabla("Tabla A", 40, 4, 30, [-26, 50, 0]);   // de x=-46 a x=-6
  const B = tabla("Tabla B", 40, 4, 30, [ 26, 50, 0]);   // de x= +6 a x=+46
  const huecoAntes = r2(B.mesh.position.x - 20 - (A.mesh.position.x + 20));
  const arriba = new T.Vector3(0, 1, 0);
  const montaje = {
    a: { punto: new T.Vector3(-10, 52, 0), normal: arriba.clone() },
    b: { punto: new T.Vector3( 10, 52, 0), normal: arriba.clone() },
  };
  const j = ed.instalarBisagra(A, B, { eje: "auto", tamano: 8, juntar: true }, montaje);
  const pl = placas().sort((x, y) => x.mesh.position.x - y.mesh.position.x);
  const pas = pasador();
  const ejeReal = j?.axisVec ? j.axisVec.clone().normalize() : null;
  const grados = (u, v) => +(Math.acos(Math.min(1, Math.abs(u.dot(v)))) * 180 / Math.PI).toFixed(1);
  // Normal de cada placa en el mundo: su Y local (el espesor).
  const caraDe = (o) => new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).normalize();
  return {
    huecoAntes,
    huecoDespues: r2(B.mesh.position.x - 20 - (A.mesh.position.x + 20)),
    seMovioA: r2(A.mesh.position.x + 26),
    nPlacas: pl.length,
    hayPasador: !!pas,
    ejeDesvioZ: ejeReal ? grados(ejeReal, new T.Vector3(0, 0, 1)) : null,
    // El pasador, ¿está sobre el canto entre las dos tablas y por encima de ellas?
    pasX: pas ? r2(pas.mesh.position.x) : null,
    pasY: pas ? r2(pas.mesh.position.y) : null,
    // Las dos placas, boca arriba y a un lado y otro del pasador.
    caraA: pl[0] ? grados(caraDe(pl[0]), new T.Vector3(0, 1, 0)) : null,
    caraB: pl[1] ? grados(caraDe(pl[1]), new T.Vector3(0, 1, 0)) : null,
    placaAx: pl[0] ? r2(pl[0].mesh.position.x) : null,
    placaBx: pl[1] ? r2(pl[1].mesh.position.x) : null,
    placaAy: pl[0] ? r2(pl[0].mesh.position.y) : null,
    // Holgura entre el pasador y el canto de cada tabla.
    holguraA: pas ? r2(pas.mesh.position.x - (A.mesh.position.x + 20)) : null,
    holguraB: pas ? r2(B.mesh.position.x - 20 - pas.mesh.position.x) : null,
    // El eje de giro del joint y sus contactos.
    contactos: !!j?.contactos,
    nombre: j?.name ?? null,
  };
})()`);
ok(libro.nPlacas === 2 && libro.hayPasador,
  `se monta el herraje entero: ${libro.nPlacas} placas y su pasador`);
ok(libro.ejeDesvioZ !== null && libro.ejeDesvioZ < 0.5,
  `el eje del pivote sale SOLO de las caras marcadas: corre por el canto entre `
  + `las tablas (desvío ${libro.ejeDesvioZ}° respecto de Z)`);
ok(libro.caraA !== null && libro.caraA < 0.5 && libro.caraB < 0.5,
  `las dos placas quedan planas SOBRE la cara marcada (${libro.caraA}° y ${libro.caraB}° con la vertical)`);
ok(Math.abs(libro.pasY - 52.6) < 0.3,
  `el pasador se apoya justo encima de la cara, no dentro de la madera `
  + `(y = ${libro.pasY}; la cara está en 52 y la placa mide 0,8 de espesor)`);
ok(libro.seMovioA === 0,
  `la primera pieza NO se mueve: es la referencia (${libro.seMovioA} cm)`);
ok(libro.huecoDespues < libro.huecoAntes && Math.abs(libro.huecoDespues - 2.2) < 0.3,
  `y la segunda se arrima hasta el pasador (hueco ${libro.huecoAntes} → ${libro.huecoDespues} cm, `
  + `la holgura del pasador)`);
// El lomo del libro no es el medio de los dos clics: es el CANTO de la primera
// tabla (x = −6) más la holgura del pasador. Poner ahí la charnela es lo que
// impide que arrimar la segunda pieza la meta dentro de la primera cuando el
// clic cae lejos del canto.
ok(Math.abs(libro.pasX - (-4.93)) < 0.15,
  `y el pasador se planta en el CANTO de la primera tabla, no en el medio de los `
  + `clics (x = ${libro.pasX}; canto en −6 más 1,07 de holgura)`);
ok(Math.abs(libro.holguraA - libro.holguraB) < 0.05
  && Math.abs(libro.holguraA - 1.07) < 0.1,
  `con la misma holgura a los dos lados (${libro.holguraA} y ${libro.holguraB} cm)`);
ok(libro.placaAx < libro.pasX && libro.placaBx > libro.pasX,
  `y una placa a cada lado, como las tapas de un libro (${libro.placaAx} | ${libro.placaBx})`);
ok(libro.contactos,
  "las dos tablas topan de verdad al plegar (contactos encendidos)");

// ── 2. ESQUINA: una tapa sobre el canto de una caja ───────────────────────
//
// Una caja alta y una tapa apoyada a su lado. Se marca la cara SUPERIOR de la
// caja y la cara LATERAL de la tapa: dos caras perpendiculares. La charnela
// tiene que salir en la arista donde se cortan sus planos, y cada placa
// pegarse a SU cara — que es lo que la versión anterior no sabía hacer, porque
// montaba las dos palas en un mismo plano.
console.log("\n── Esquina: dos caras perpendiculares ──────────────────────");
const esquina = await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  const caja = tabla("Caja", 40, 40, 30, [0, 20, 0]);      // cara de arriba en y=40
  const tapa = tabla("Tapa", 4, 30, 30, [40, 35, 0]);      // cara -X en x=38
  const montaje = {
    a: { punto: new T.Vector3(15, 40, 0), normal: new T.Vector3(0, 1, 0) },
    b: { punto: new T.Vector3(38, 40, 0), normal: new T.Vector3(-1, 0, 0) },
  };
  const j = ed.instalarBisagra(caja, tapa, { eje: "auto", tamano: 8, juntar: true }, montaje);
  const pl = placas();
  const pas = pasador();
  const grados = (u, v) => +(Math.acos(Math.min(1, Math.abs(u.dot(v)))) * 180 / Math.PI).toFixed(1);
  const caraDe = (o) => new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).normalize();
  // La placa de la caja mira ARRIBA; la de la tapa, a −X.
  const arriba = pl.find((o) => Math.abs(caraDe(o).y) > 0.9);
  const lateral = pl.find((o) => Math.abs(caraDe(o).x) > 0.9);
  const ejeReal = j?.axisVec ? j.axisVec.clone().normalize() : null;
  return {
    nPlacas: pl.length,
    dosCaras: !!arriba && !!lateral,
    ejeDesvioZ: ejeReal ? grados(ejeReal, new T.Vector3(0, 0, 1)) : null,
    // Charnela: la arista donde se cortan los dos planos de las palas, es
    // decir x ≈ 38 − 0,4 y ≈ 40 + 0,4 (medio espesor por fuera de cada cara).
    pasX: pas ? r2(pas.mesh.position.x) : null,
    pasY: pas ? r2(pas.mesh.position.y) : null,
    tapaX: r2(pieza("Tapa").mesh.position.x),
    // ¿Cada placa cubre el punto que se marcó?
    arribaY: arriba ? r2(arriba.mesh.position.y) : null,
    lateralX: lateral ? r2(lateral.mesh.position.x) : null,
  };
})()`);
ok(esquina.nPlacas === 2 && esquina.dosCaras,
  `cada placa se pega a SU cara: una boca arriba y otra de canto `
  + `(la versión anterior las ponía a las dos en el mismo plano)`);
ok(esquina.ejeDesvioZ !== null && esquina.ejeDesvioZ < 0.5,
  `el eje del pivote es la arista donde se cortan las dos caras (desvío ${esquina.ejeDesvioZ}°)`);
ok(Math.abs(esquina.pasY - 40.4) < 0.2 && Math.abs(esquina.pasX - 37.6) < 0.6,
  `y la charnela cae en esa arista, medio espesor por fuera de cada cara `
  + `(${esquina.pasX}, ${esquina.pasY}; se esperaba ≈ 37,6 y 40,4)`);
ok(esquina.arribaY > esquina.pasY - 1 && esquina.lateralX < esquina.pasX + 1,
  `la placa de la caja corre por su cara superior y la de la tapa por su costado `
  + `(y = ${esquina.arribaY}, x = ${esquina.lateralX})`);

// ── 3. LA HERRAMIENTA PIDE LAS CARAS EN EL VISOR ──────────────────────────
//
// No basta con que la API lo sepa hacer: el gesto del usuario es marcar dos
// puntos en el modelo. Se pulsa «+ Bisagra» y se comprueba que el primer clic
// deja marcada la cara y que el segundo dispara el panel.
console.log("\n── El gesto en el visor ────────────────────────────────────");
await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  tabla("Tabla A", 40, 4, 30, [-26, 50, 0]);
  tabla("Tabla B", 40, 4, 30, [ 26, 50, 0]);
  ed.setViewPreset?.("superior");
  ed.requestRender();
})()`);
await p.waitForTimeout(700);

// La pestaña de conexiones tiene que estar a la vista para pulsar su botón.
const abrio = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")]
    .find((n) => (n.textContent ?? "").trim() === "+ Bisagra");
  if (!b) return { hay: false };
  b.scrollIntoView();
  b.click();
  return { hay: true };
});
await p.waitForTimeout(400);
const pista0 = await p.evaluate(() => document.body.textContent);
ok(abrio.hay && /PUNTO de la cara/.test(pista0),
  "«+ Bisagra» pide un PUNTO sobre una cara, no una pieza suelta");

/** Píxel de la pantalla donde cae un punto del mundo. */
const enPantalla = async (x, y, z) => await p.evaluate(([px, py, pz]) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const cam = ed.sceneManager.camera;
  cam.updateMatrixWorld();
  const v = new T.Vector3(px, py, pz).project(cam);
  const c = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height };
}, [x, y, z]);

// Vista superior: se pincha la cara de arriba de cada tabla, cerca del canto
// donde se van a encontrar.
const pA = await enPantalla(-14, 52, 0);
await p.mouse.click(pA.x, pA.y);
await p.waitForTimeout(400);
const trasPrimero = await p.evaluate(() => ({
  texto: document.body.textContent,
  marca: !!window.exersuite.editor.hayMarcaBisagra(),
}));
ok(/CARA de la 2/.test(trasPrimero.texto),
  "el primer clic marca la cara y pide la segunda");
ok(trasPrimero.marca, "y deja la marca azul sobre la cara elegida");

// Bien adentro de la tabla B: junto al canto, el gizmo de la pieza ya
// seleccionada se cruza en el camino y se come el clic.
const pB = await enPantalla(30, 52, 0);
await p.mouse.move(pB.x, pB.y);
await p.waitForTimeout(120);
await p.mouse.click(pB.x, pB.y);
await p.waitForTimeout(700);
const panel = await p.evaluate(() => {
  const a = document.getElementById("bisagra-panel");
  return {
    abierto: !!a,
    ejes: !!a?.textContent.includes("Eje de giro"),
    juntar: !!a?.textContent.includes("Juntar las piezas"),
    marca: !!window.exersuite.editor.hayMarcaBisagra(),
  };
});
ok(panel.abierto, "el segundo clic abre el panel de la bisagra");
ok(!panel.ejes && panel.juntar,
  `y ese panel ya no pide eje ni cara —los marcó el puntero— sino solo lo que `
  + `sigue siendo decisión (eje: ${panel.ejes}, juntar: ${panel.juntar})`);
ok(!panel.marca, "la marca de la primera cara se retira al completar el gesto");

const instalada = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const b = [...document.querySelectorAll("#bisagra-panel button")]
    .find((n) => (n.textContent ?? "").includes("Instalar bisagra"));
  b?.click();
  await new Promise((r) => setTimeout(r, 700));
  const A = ed.listObjects().find((o) => o.name === "Tabla A");
  const B = ed.listObjects().find((o) => o.name === "Tabla B");
  return {
    placas: ed.listObjects().filter((o) => o.componentId === "placa-bisagra").length,
    pasador: ed.listObjects().filter((o) => o.componentId === "pasador-bisagra").length,
    bisagras: ed.listJoints().filter((j) => j.name === "Bisagra" || j.name === "Hinge").length,
    hueco: +(B.mesh.position.x - 20 - (A.mesh.position.x + 20)).toFixed(2),
  };
});
ok(instalada.placas === 2 && instalada.pasador === 1 && instalada.bisagras === 1,
  `y el herraje queda montado desde el visor (${instalada.placas} placas, `
  + `${instalada.pasador} pasador, ${instalada.bisagras} articulación)`);
ok(Math.abs(instalada.hueco - 2.14) < 0.3,
  `con las dos tablas juntas, como las tapas de un libro (hueco ${instalada.hueco} cm)`);

// Captura del libro abierto para la vista.
await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  const A = tabla("Tabla A", 40, 4, 30, [-26, 50, 0]);
  const B = tabla("Tabla B", 40, 4, 30, [ 26, 50, 0]);
  const arriba = new T.Vector3(0, 1, 0);
  ed.instalarBisagra(A, B, { eje: "auto", tamano: 12, juntar: true }, {
    a: { punto: new T.Vector3(-10, 52, 0), normal: arriba.clone() },
    b: { punto: new T.Vector3( 10, 52, 0), normal: arriba.clone() },
  });
  ed.select(null);
  ed.setViewPreset?.("isometrica");
  ed.requestRender();
})()`);
await p.waitForTimeout(900);
await p.screenshot({ path: "salidas/bisagra-caras.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
