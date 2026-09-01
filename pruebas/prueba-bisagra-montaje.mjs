// PRUEBA: la bisagra se monta DONDE SE TOCA, articula a cualquier distancia,
// mide su recorrido en la vuelta entera de la placa y sabe quién manda (v0.3.27).
//
// Lo que se mide:
//   · las placas nacen en el punto que se marcó sobre la cara, no en el canto
//     de la pieza ni a medio camino;
//   · articular funciona con las piezas lejos: la que se mueve acaba pegada a
//     la otra, con el herraje a su tamaño y no estirado sobre el hueco;
//   · la escala de la placa da 0° enfrentadas, 180° extendidas y admite pedir
//     hasta 360°, la vuelta completa;
//   · JERARQUÍA: con un tramo atado por los dos lados y otro con el extremo
//     libre, se arrima EL LIBRE; con las dos móviles, se encuentran a medio
//     camino y ninguna manda.
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

// Utilidades comunes, inyectadas una vez.
await page.evaluate(() => {
  const T = window.exersuite.THREE;
  window.__limpiar = () => {
    const ed = window.exersuite.editor;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
  };
  // Una viga recta sobre SU EJE Y —que es como se construye una pieza de
  // línea—, de `largo` cm, centrada en `centro`.
  window.__viga = (nombre, centro, largo, anclada = false) => {
    const ed = window.exersuite.editor;
    const v = ed.addComponent("pilar-linea");
    v.name = nombre;
    v.params = {
      kind: "beam", width: 6, depth: 6, ends: "plano",
      path: [[0, -largo / 2, 0], [0, largo / 2, 0]],
    };
    v.rebuildGeometry();
    v.mesh.position.copy(centro);
    if (anclada) v.physics = { ...v.physics, fixed: true };
    ed.bus.emit("objectTransformed", { object: v });
    return v;
  };
  // Las placas de la bisagra recién puesta.
  window.__placas = () => {
    const ed = window.exersuite.editor;
    return [...ed.objects.values()].filter((o) => /Placa de bisagra/.test(o.name));
  };
  window.__pasador = () => {
    const ed = window.exersuite.editor;
    return [...ed.objects.values()].find((o) => /Pasador/.test(o.name));
  };
  // Una base de bastidor: un travesaño COSIDO por sus dos extremos, o sea sin
  // extremo libre. Es la pieza que manda en una bisagra.
  window.__base = (centro, largo) => {
    const v = window.__viga("Base", centro, largo);
    window.__viga("Poste bajo", centro.clone().add(new T.Vector3(0, -largo / 2 - 3, 0)), 6);
    window.__viga("Poste alto", centro.clone().add(new T.Vector3(0, largo / 2 + 3, 0)), 6);
    return v;
  };
  window.__T = T;
});

// ── 1. EL CLIC MANDA, EL MATERIAL PONE EL LÍMITE ────────────────────────────
// (a) Una pata contra el CENTRO de la cara de una viga: no hay nada que se
// pise, así que el pasador va exactamente donde se tocó. Es el caso que el
// código viejo hacía mal siempre — plantaba la charnela en el CANTO de la
// viga, midiendo su caja, y la bisagra aparecía a un palmo de donde se había
// señalado.
const enLaCara = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  window.__limpiar();
  // Viga horizontal: se hace vertical y se tumba, que es como se construye.
  const viga = window.__base(new T.Vector3(0, 50, 0), 120);
  viga.mesh.rotation.set(0, 0, Math.PI / 2);
  ed.bus.emit("objectTransformed", { object: viga });
  // La pata cuelga por debajo, tocando la cara inferior de la viga.
  const pata = window.__viga("Pata", new T.Vector3(35, 20, 0), 40);
  const abajo = new T.Vector3(0, -1, 0);
  // Se toca la cara de abajo de la viga a 35 cm de su centro: bien lejos de
  // sus dos cantos, que están en ±60.
  const j = ed.instalarBisagra(viga, pata, { eje: "auto", tamano: 8, juntar: true }, {
    a: { punto: new T.Vector3(35, 47, 0), normal: abajo.clone() },
    b: { punto: new T.Vector3(35, 40, 0), normal: new T.Vector3(0, 1, 0) },
  });
  const pas = window.__pasador();
  const placas = window.__placas();
  const caja = new T.Box3().setFromObject(viga.mesh);
  return {
    hay: !!j,
    pasadorX: +pas.mesh.position.x.toFixed(1),
    cantoViga: +caja.max.x.toFixed(0),
    // La placa de la viga tiene que quedar pegada al punto que se tocó.
    placaAlClic: +new T.Box3()
      .setFromObject(placas[0].mesh)
      .distanceToPoint(new T.Vector3(35, 47, 0)).toFixed(1),
  };
});
console.log("EN LA CARA:", JSON.stringify(enLaCara));
ok(enLaCara.hay, "la bisagra se instala con las dos caras marcadas");
ok(
  Math.abs(enLaCara.pasadorX - 35) <= 2,
  "contra el centro de una cara, el pasador va DONDE SE TOCÓ, no en el canto",
  `x = ${enLaCara.pasadorX} cm (el clic, en 35; el canto, en ${enLaCara.cantoViga})`,
);
ok(
  enLaCara.placaAlClic <= 4,
  "y la placa arranca junto a ese punto, no a 25 cm de él en el canto",
  `${enLaCara.placaAlClic} cm (la placa mide 8)`,
);

// (b) Dos vigas encaradas punta con punta: aquí el clic no puede mandar del
// todo —juntar los dos puntos metería una dentro de la otra—, así que el
// material pone el límite y el pasador se queda en el encuentro. Lo que el
// clic sí decide siempre es LA CARA y el sitio a lo largo del pasador.
const encaradas = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  window.__limpiar();
  const A = window.__base(new T.Vector3(0, 50, 0), 60);
  const B = window.__viga("Brazo", new T.Vector3(0, 111, 0), 60);
  const cara = new T.Vector3(1, 0, 0);
  ed.instalarBisagra(A, B, { eje: "auto", tamano: 8, juntar: true }, {
    a: { punto: new T.Vector3(3, 68, 4), normal: cara.clone() },
    b: { punto: new T.Vector3(3, 93, 4), normal: cara.clone() },
  });
  const pas = window.__pasador();
  const cajaA = new T.Box3().setFromObject(A.mesh);
  const cajaB = new T.Box3().setFromObject(B.mesh);
  return {
    // El pasador queda en el encuentro de las dos, no dentro de ninguna.
    pasadorY: +pas.mesh.position.y.toFixed(1),
    // …sobre la cara que se tocó (x > 3) y en el sitio marcado a lo largo del
    // pasador (z = 4), que es lo que el clic decide pase lo que pase.
    pasadorX: +pas.mesh.position.x.toFixed(1),
    pasadorZ: +pas.mesh.position.z.toFixed(1),
    hueco: +(cajaB.min.y - cajaA.max.y).toFixed(1),
  };
});
console.log("ENCARADAS:", JSON.stringify(encaradas));
ok(
  Math.abs(encaradas.pasadorY - 81) <= 2,
  "punta con punta, el material manda: el pasador se queda en el encuentro",
  `y = ${encaradas.pasadorY} cm`,
);
ok(
  encaradas.pasadorX > 3 && Math.abs(encaradas.pasadorZ - 4) <= 0.5,
  "…pero sobre la CARA que se tocó y en el punto marcado a lo largo del pasador",
  `x = ${encaradas.pasadorX}, z = ${encaradas.pasadorZ} (se tocó en z = 4)`,
);
ok(
  encaradas.hueco >= 1 && encaradas.hueco <= 4,
  "y las dos quedan a la holgura del pasador, sin pisarse",
  `${encaradas.hueco} cm`,
);

// ── 2. ARTICULAR CON LAS PIEZAS LEJOS ───────────────────────────────────────
const lejos = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  window.__limpiar();
  const A = window.__base(new T.Vector3(0, 50, 0), 60);
  // 140 cm de hueco entre las dos: lejísimos.
  const B = window.__viga("Brazo", new T.Vector3(0, 251, 0), 60);
  const cara = new T.Vector3(1, 0, 0);
  const antes = B.mesh.position.clone();
  // Se toca el canto de cada una: es donde se quiere el pasador, y así las
  // dos acaban a tope. (Tocar 2 cm HACIA DENTRO las solaparía otros tantos,
  // y estaría bien: el pasador va donde se marca, no donde convenga.)
  ed.instalarBisagra(A, B, { eje: "auto", tamano: 8, juntar: true }, {
    a: { punto: new T.Vector3(3, 80, 0), normal: cara.clone() },
    b: { punto: new T.Vector3(3, 221, 0), normal: cara.clone() },
  });
  const cajaA = new T.Box3().setFromObject(A.mesh);
  const cajaB = new T.Box3().setFromObject(B.mesh);
  const placas = window.__placas();
  const medida = (p) => {
    const c = new T.Box3().setFromObject(p.mesh).getSize(new T.Vector3());
    return +Math.max(c.x, c.y, c.z).toFixed(1);
  };
  return {
    seMovioB: +antes.distanceTo(B.mesh.position).toFixed(1),
    hueco: +(cajaB.min.y - cajaA.max.y).toFixed(1),
    placaMayor: Math.max(medida(placas[0]), medida(placas[1])),
  };
});
console.log("LEJOS:", JSON.stringify(lejos));
ok(
  lejos.seMovioB > 130,
  "articular arrima la pieza libre aunque arranque a 140 cm",
  `se movió ${lejos.seMovioB} cm`,
);
ok(
  lejos.hueco >= 1 && lejos.hueco <= 4,
  "…y las dos quedan a la holgura del pasador, ni encajadas ni sueltas",
  `${lejos.hueco} cm de hueco`,
);
ok(
  lejos.placaMayor <= 10,
  "el herraje conserva su medida: no sale estirado sobre el hueco",
  `la placa mayor mide ${lejos.placaMayor} cm (se pidieron 8)`,
);

// ── 3. ESCALA DE LA PLACA: 0 ENFRENTADAS, 180 EXTENDIDAS, 360 LA VUELTA ─────
const escala = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  window.__limpiar();
  const A = window.__base(new T.Vector3(0, 50, 0), 60);
  const B = window.__viga("Brazo", new T.Vector3(0, 111, 0), 60);
  const cara = new T.Vector3(1, 0, 0);
  const j = ed.instalarBisagra(A, B, { eje: "auto", tamano: 8, juntar: true }, {
    a: { punto: new T.Vector3(3, 78, 0), normal: cara.clone() },
    b: { punto: new T.Vector3(3, 83, 0), normal: cara.clone() },
  });
  const out = {
    // Nace con las placas EN LÍNEA: eso son 180° en esta escala.
    apertura0: +j.apertura0.toFixed(1),
    sentido: j.sentidoApertura,
    min: j.min,
    max: j.max,
  };
  // Se pide un recorrido que cruza la extensión y llega a la vuelta entera.
  j.limitsEnabled = true;
  j.min = 90;
  j.max = 360;
  ed.jointUpdated();
  out.aceptaHasta360 = j.max;
  return out;
});
console.log("ESCALA:", JSON.stringify(escala));
ok(
  Math.abs(escala.apertura0 - 180) <= 2,
  "con las placas en línea la escala marca 180° (extendidas)",
  `${escala.apertura0}°`,
);
ok(escala.sentido === 1, "el ángulo de placa crece con el giro del pasador", escala.sentido);
ok(
  escala.min === 0 && escala.max === 360,
  "el recorrido de fábrica es la VUELTA ENTERA de la placa (0 a 360)",
  `${escala.min}–${escala.max}`,
);
ok(escala.aceptaHasta360 === 360, "y se puede pedir hasta 360°", escala.aceptaHasta360);

// ── 4. JERARQUÍA ENTRE LAS PLACAS ───────────────────────────────────────────
// (a) Un tramo cosido por los dos extremos contra otro con la punta al aire: se
// arrima EL LIBRE. (b) Dos estructuras móviles: se encuentran a medio camino.
const jerarquia = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.__T;
  const cara = new T.Vector3(1, 0, 0);
  const montar = (A, B, pA, pB) => {
    const a0 = A.mesh.position.clone();
    const b0 = B.mesh.position.clone();
    ed.instalarBisagra(A, B, { eje: "auto", tamano: 8, juntar: true }, {
      a: { punto: pA, normal: cara.clone() },
      b: { punto: pB, normal: cara.clone() },
    });
    return {
      movioA: +a0.distanceTo(A.mesh.position).toFixed(1),
      movioB: +b0.distanceTo(B.mesh.position).toFixed(1),
    };
  };

  // (a) El travesaño va cosido entre dos postes: no le queda extremo libre.
  window.__limpiar();
  const A = window.__viga("Travesano", new T.Vector3(0, 50, 0), 60);
  window.__viga("Poste bajo", new T.Vector3(0, 17, 0), 6);
  window.__viga("Poste alto", new T.Vector3(0, 83, 0), 6);
  const B = window.__viga("Brazo", new T.Vector3(0, 140, 0), 60);
  const conJefe = montar(A, B, new T.Vector3(3, 78, 0), new T.Vector3(3, 112, 0));

  // (b) Dos brazos sueltos: ninguno manda.
  window.__limpiar();
  const C = window.__viga("Brazo 1", new T.Vector3(0, 50, 0), 60);
  const D = window.__viga("Brazo 2", new T.Vector3(0, 120, 0), 60);
  const sinJefe = montar(C, D, new T.Vector3(3, 78, 0), new T.Vector3(3, 92, 0));
  return { conJefe, sinJefe };
});
console.log("JERARQUÍA:", JSON.stringify(jerarquia));
ok(
  jerarquia.conJefe.movioA === 0 && jerarquia.conJefe.movioB > 3,
  "con un tramo cosido por los dos lados, se arrima SOLO el del extremo libre",
  `cosido ${jerarquia.conJefe.movioA} cm, libre ${jerarquia.conJefe.movioB} cm`,
);
ok(
  jerarquia.sinJefe.movioA > 1 && jerarquia.sinJefe.movioB > 1,
  "entre dos estructuras móviles no hay jerarquía: se mueven las dos",
  `${jerarquia.sinJefe.movioA} cm y ${jerarquia.sinJefe.movioB} cm`,
);
ok(
  Math.abs(jerarquia.sinJefe.movioA - jerarquia.sinJefe.movioB) <= 1,
  "…y se encuentran a medio camino, como una articulación de verdad",
  `${jerarquia.sinJefe.movioA} vs ${jerarquia.sinJefe.movioB} cm`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
