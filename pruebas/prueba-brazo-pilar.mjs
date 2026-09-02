// PRUEBA: los cuatro ajustes de la banca inclinable (v0.3.29).
//
//   1) el doble clic mete el nodo EN SITIO: la pieza no cambia de forma;
//   2) el pilar de apoyo y las placas dentadas no se tocan —se mide el hueco
//      y se cuentan los contactos, que es de donde salía el «temblor»—;
//   3) la bisagra deja de ser ambigua: el eje se orienta para que la apertura
//      de diseño caiga en [0,180], así 0 son «placas enfrentadas» y 180
//      «extendidas» siempre;
//   4) el mecanismo brazo + pilar + viga de topes se calcula exacto: el largo
//      del pilar cierra el triángulo en los DOS extremos del recorrido.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else {
    fallos++;
    console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`);
  }
};

const banca = JSON.parse(
  readFileSync(new URL("./datos/banca-inclinable.json", import.meta.url), "utf8"),
);

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

// ── 1. EL NODO NUEVO NO DEFORMA LA PIEZA ────────────────────────────────────
const prep = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const v = ed.addComponent("pilar-linea");
  v.name = "Viga";
  v.params = {
    kind: "beam", width: 6, depth: 6, ends: "plano",
    path: [[0, -60, 0], [0, 0, 0], [0, 60, 0]],
  };
  v.rebuildGeometry();
  v.mesh.position.set(0, 80, 0);
  ed.bus.emit("objectTransformed", { object: v });
  ed.select(v);
  ed.beginBendNodes();
  window.__viga = v.id;
  const caja = new T.Box3().setFromObject(v.mesh);
  // Se toca la CARA de la viga (x = +3), no su eje: es lo que hace el usuario.
  const mundo = new T.Vector3(3, 120, 0);
  const p = mundo.clone().project(ed.sceneManager.camera);
  const r = ed.canvas.getBoundingClientRect();
  return {
    antes: v.params.path.map((n) => n.map((x) => +x.toFixed(2))),
    tamAntes: caja.getSize(new T.Vector3()).toArray().map((x) => +x.toFixed(2)),
    x: r.left + ((p.x + 1) / 2) * r.width,
    y: r.top + ((1 - p.y) / 2) * r.height,
  };
});
await page.mouse.dblclick(prep.x, prep.y);
await page.waitForTimeout(500);
const nodo = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const v = ed.objects.get(window.__viga);
  const caja = new T.Box3().setFromObject(v.mesh);
  return {
    path: v.params.path.map((n) => n.map((x) => +x.toFixed(2))),
    tam: caja.getSize(new T.Vector3()).toArray().map((x) => +x.toFixed(2)),
    // ¿Cuánto se salió del eje el nodo nuevo? En el eje X, que es donde se tocó.
    fueraDelEje: Math.max(...v.params.path.map((n) => Math.abs(n[0]))),
  };
});
console.log("NODO:", JSON.stringify(nodo), "antes:", JSON.stringify(prep.tamAntes));
ok(nodo.path.length === 4, "el doble clic mete un nodo", nodo.path.length);
ok(
  nodo.fueraDelEje < 0.05,
  "…SOBRE el trazado, no medio perfil fuera: el nodo nace en el eje",
  `${nodo.fueraDelEje.toFixed(2)} cm fuera del eje`,
);
ok(
  Math.abs(nodo.tam[0] - prep.tamAntes[0]) < 0.2 && Math.abs(nodo.tam[1] - prep.tamAntes[1]) < 0.2,
  "y la pieza NO cambia de forma al añadirlo",
  `${prep.tamAntes.join("×")} → ${nodo.tam.join("×")}`,
);

// ── 2. EL PILAR DE APOYO NO TOCA LAS PLACAS DENTADAS ────────────────────────
const roce = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.endBendNodes();
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 800));
  const pilar = [...ed.objects.values()].find((o) => o.params.holeDiameter === 4);
  const placas = [...ed.objects.values()].filter((o) => o.params.kind === "dentada");
  const cp = new T.Box3().setFromObject(pilar.mesh);
  // Hueco por el eje en que el pilar discurre ENTRE las dos placas.
  const huecos = placas.map((x) => {
    const c = new T.Box3().setFromObject(x.mesh);
    return +(c.min.z > cp.max.z ? c.min.z - cp.max.z : cp.min.z - c.max.z).toFixed(2);
  });
  return {
    seCruzan: placas.some((x) => new T.Box3().setFromObject(x.mesh).intersectsBox(cp)),
    huecos,
  };
}, banca);
console.log("ROCE:", JSON.stringify(roce));
ok(
  !roce.seCruzan,
  "el pilar de apoyo discurre ENTRE las placas sin cruzarse con ninguna",
  JSON.stringify(roce.huecos),
);
ok(
  roce.huecos.every((h) => h > 0),
  "…con hueco por los dos lados",
  `${roce.huecos.join(" y ")} cm`,
);

// ── 3. LA BISAGRA YA NO ES AMBIGUA ──────────────────────────────────────────
// La misma bisagra montada con las piezas en el orden contrario tenía que dar
// la misma lectura, y no la daba: salía 90° o 270° según cayera el eje.
const escala = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const viga = (nombre, centro, largo, giro) => {
    const v = ed.addComponent("pilar-linea");
    v.name = nombre;
    v.params = {
      kind: "beam", width: 6, depth: 6, ends: "plano",
      path: [[0, -largo / 2, 0], [0, largo / 2, 0]],
    };
    v.rebuildGeometry();
    v.mesh.position.copy(centro);
    if (giro) v.mesh.quaternion.copy(giro);
    ed.bus.emit("objectTransformed", { object: v });
    return v;
  };
  // Una esquina: la tapa forma 90° con la base. Se monta en los dos órdenes.
  const montar = (alReves) => {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const base = viga("Base", new T.Vector3(0, 50, 0), 60,
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2));
    const tapa = viga("Tapa", new T.Vector3(33, 80, 0), 60);
    const A = { obj: base, punto: new T.Vector3(28, 53, 0), normal: new T.Vector3(0, 1, 0) };
    const B = { obj: tapa, punto: new T.Vector3(30, 56, 0), normal: new T.Vector3(-1, 0, 0) };
    const [p, q] = alReves ? [B, A] : [A, B];
    const j = ed.instalarBisagra(p.obj, q.obj, { eje: "auto", tamano: 8, juntar: false }, {
      a: { punto: p.punto.clone(), normal: p.normal.clone() },
      b: { punto: q.punto.clone(), normal: q.normal.clone() },
    });
    return j ? { apertura0: +j.apertura0.toFixed(1), sentido: j.sentidoApertura } : null;
  };
  return { normal: montar(false), alReves: montar(true) };
});
console.log("ESCALA:", JSON.stringify(escala));
ok(
  escala.normal && escala.normal.apertura0 >= 0 && escala.normal.apertura0 <= 180,
  "la apertura de diseño cae SIEMPRE en [0,180]: 0 enfrentadas, 180 extendidas",
  `${escala.normal?.apertura0}°`,
);
ok(
  escala.alReves && escala.alReves.apertura0 >= 0 && escala.alReves.apertura0 <= 180,
  "…también montando las dos piezas en el orden contrario",
  `${escala.alReves?.apertura0}°`,
);
ok(
  escala.normal && escala.alReves
    && Math.abs(escala.normal.apertura0 - escala.alReves.apertura0) < 2,
  "y las dos lecturas coinciden: se acabó el 90 contra 270",
  `${escala.normal?.apertura0}° vs ${escala.alReves?.apertura0}°`,
);

// ── 4. EL MECANISMO SE CALCULA EXACTO ───────────────────────────────────────
const calculo = await page.evaluate(() => {
  const calc = window.exersuite.brazoPilar;
  // El triángulo tiene que cerrar en LOS DOS extremos del recorrido con el
  // MISMO pilar: es la comprobación que no depende de la fórmula.
  const cierra = (cfg, s) => {
    const D2R = Math.PI / 180;
    const E = cfg.descentradoCm ?? 0;
    // Distancia del codo del brazo al pie del pilar, con el pie en `E·n + t·u`.
    const lado = (grado, t) => {
      const psi = (grado - cfg.inclinacionC) * D2R;
      return Math.sqrt(
        cfg.brazoCm ** 2 + E ** 2 + t ** 2
        - 2 * cfg.brazoCm * E * Math.sin(psi)
        - 2 * cfg.brazoCm * t * Math.cos(psi),
      );
    };
    // Cada tope tiene que cerrar con SU distancia: se comprueban todos.
    return s.topes.map((t) =>
      +Math.abs(lado(t.gradoBrazo, t.distanciaCm) - s.pilarCm).toFixed(3));
  };
  const casos = [
    { brazoCm: 45, gradoA: 15, gradoB: 60, vigaCm: 30, inclinacionC: 0, topes: 6 },
    { brazoCm: 60, gradoA: 30, gradoB: 70, vigaCm: 40, inclinacionC: 12, topes: 5 },
    { brazoCm: 35, gradoA: 10, gradoB: 55, vigaCm: 22, inclinacionC: -8, topes: 4 },
    // DESCENTRADA: la recta de la viga pasa a 4,2 cm del pivote, que es lo que
    // mide la banca del diseñador. Antes se ignoraba y el pilar salía con ese
    // error metido dentro.
    { brazoCm: 42.76, gradoA: 10, gradoB: 70, vigaCm: 60.06, inclinacionC: -25,
      descentradoCm: 4.2, topes: 6 },
    { brazoCm: 42.76, gradoA: 10, gradoB: 70, vigaCm: 60.06, inclinacionC: -25,
      descentradoCm: -4.2, topes: 6 },
  ];
  return casos.map((c) => {
    const s = calc(c);
    return {
      caso: `${c.brazoCm}cm ${c.gradoA}-${c.gradoB}° viga ${c.vigaCm}@${c.inclinacionC}°`
        + (c.descentradoCm ? ` desc ${c.descentradoCm}` : ""),
      pilar: s.pilarCm,
      recorrido: [s.topes[0]?.gradoBrazo, s.topes[s.topes.length - 1]?.gradoBrazo],
      topes: s.topes.length,
      error: cierra(c, s),
      aviso: s.aviso,
    };
  });
});
console.log("CÁLCULO:", JSON.stringify(calculo, null, 0));
for (const c of calculo) {
  ok(
    // 0,05 cm de margen: las distancias se publican redondeadas al centímetro
    // con dos decimales, que es lo que se corta, y ese redondeo ya vale 0,01.
    Math.max(...c.error) < 0.05,
    `el mismo pilar cierra el triángulo en TODOS los topes (${c.caso})`,
    `peor desvío ${Math.max(...c.error)} cm`,
  );
}
ok(
  calculo.every((c) => c.pilar > 5 && c.pilar < 500),
  "y sale una pieza que se puede cortar",
  calculo.map((c) => `${c.pilar} cm`).join(", "),
);
ok(
  calculo.every((c) => c.topes >= 4),
  "con un ángulo anotado por cada tope",
  calculo.map((c) => c.topes).join(", "),
);
// El recorrido pedido tiene que ser el que sale.
ok(
  Math.abs(calculo[0].recorrido[0] - 15) < 0.6 && Math.abs(calculo[0].recorrido[1] - 60) < 0.6,
  "el recorrido que sale es el que se pidió",
  `${calculo[0].recorrido.join("° … ")}° (se pidieron 15 y 60)`,
);
ok(
  calculo.every((c) => c.aviso === null),
  "y sin peros: los topes de en medio caen dentro del recorrido",
  calculo.map((c) => c.aviso).filter(Boolean).join(" | ") || "ninguno",
);

// Y CUANDO EL MECANISMO NO EXISTE EN LA PRÁCTICA, SE DICE. Un brazo de 45 cm
// que quiera ir de 15° a 80° sobre una viga de sólo 40 SÍ tiene solución
// exacta… de 213 cm de pilar. Los números cierran y la máquina no existe.
const imposible = await page.evaluate(() =>
  window.exersuite.brazoPilar(
    { brazoCm: 45, gradoA: 15, gradoB: 80, vigaCm: 40, inclinacionC: 0, topes: 6 },
  ));
console.log("IMPOSIBLE:", JSON.stringify(imposible.aviso));
ok(
  !!imposible.aviso,
  "un recorrido que no cabe en esa viga se avisa en vez de colarse con un pilar de dos metros",
  imposible.aviso ?? "no avisó",
);

// ── 4b. LA INCLINACIÓN DE LA VIGA, POR CUALQUIERA DE SUS DOS SENTIDOS ───────
// Una recta tiene dos lecturas: −25° y 155° son LA MISMA viga. Medida sobre el
// modelo del diseñador salía 155°, y con ese número los topes salían a 230-300°
// para un recorrido pedido de 10 a 80.
const sentido = await page.evaluate(() => {
  const f = window.exersuite.brazoPilar;
  const base = { brazoCm: 42.76, gradoA: 10, gradoB: 80, vigaCm: 60.06, topes: 6 };
  const a = f({ ...base, inclinacionC: -25 });
  const b = f({ ...base, inclinacionC: 155 });
  return {
    menos25: { pilar: a.pilarCm, extremos: [a.topes[0]?.gradoBrazo, a.topes.at(-1)?.gradoBrazo] },
    mas155: { pilar: b.pilarCm, extremos: [b.topes[0]?.gradoBrazo, b.topes.at(-1)?.gradoBrazo] },
  };
});
console.log("SENTIDO:", JSON.stringify(sentido));
ok(
  Math.abs(sentido.menos25.pilar - sentido.mas155.pilar) < 0.02,
  "la misma viga leída por sus dos sentidos da el MISMO pilar",
  `${sentido.menos25.pilar} y ${sentido.mas155.pilar} cm`,
);
ok(
  sentido.mas155.extremos[0] === 10 && sentido.mas155.extremos[1] === 80,
  "…y el recorrido pedido, no uno desplazado 180°",
  `${sentido.mas155.extremos.join("° … ")}°`,
);

// ── 4c. EL DESCENTRADO CUENTA ───────────────────────────────────────────────
// Con descentrado cero tiene que salir lo de siempre, y en cuanto la viga se
// aparta del pivote el pilar TIENE que cambiar: si no cambiara, el dato se
// estaría ignorando.
const descentrado = await page.evaluate(() => {
  const f = window.exersuite.brazoPilar;
  const base = { brazoCm: 42.76, gradoA: 10, gradoB: 70, vigaCm: 60.06,
                 inclinacionC: -25, topes: 6 };
  const sinDato = f(base);
  const cero = f({ ...base, descentradoCm: 0 });
  const cuatro = f({ ...base, descentradoCm: 4.2 });
  return {
    sinDato: sinDato.pilarCm, cero: cero.pilarCm, cuatro: cuatro.pilarCm,
    extremos: [cuatro.topes[0]?.gradoBrazo, cuatro.topes.at(-1)?.gradoBrazo],
    aviso: cuatro.aviso,
  };
});
console.log("DESCENTRADO:", JSON.stringify(descentrado));
ok(
  descentrado.sinDato === descentrado.cero,
  "sin el dato se comporta como descentrado cero",
  `${descentrado.sinDato} y ${descentrado.cero} cm`,
);
ok(
  Math.abs(descentrado.cuatro - descentrado.cero) > 0.5,
  "y apartar la viga 4,2 cm del pivote CAMBIA el pilar: el dato no se ignora",
  `${descentrado.cero} → ${descentrado.cuatro} cm`,
);
ok(
  descentrado.extremos[0] === 10 && descentrado.extremos[1] === 70,
  "…sin perder el recorrido pedido",
  `${descentrado.extremos.join("° … ")}°`,
);

// ── 5. …Y EL MECANISMO SE ARMA ──────────────────────────────────────────────
const armado = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const s = ed.crearBrazoConPilar({
    brazoCm: 45, gradoA: 15, gradoB: 60, vigaCm: 30, inclinacionC: 0, topes: 6,
  }, new T.Vector3(0, 40, 0));
  const objs = [...ed.objects.values()];
  const pilar = objs.find((o) => /Pilar de apoyo|Support strut/.test(o.name));

  // El largo del pilar es la distancia entre sus dos puntas POR SU EJE, no la
  // arista mayor de su caja del mundo: puesto en diagonal, la caja miente.
  let largoReal = 0;
  if (pilar) {
    const p = pilar.params.path;
    const a = new T.Vector3().fromArray(p[0]).applyMatrix4(pilar.mesh.matrixWorld);
    const b = new T.Vector3().fromArray(p[p.length - 1]).applyMatrix4(pilar.mesh.matrixWorld);
    largoReal = a.distanceTo(b);
  }
  return {
    pilarPedido: s.pilarCm,
    largoReal: +largoReal.toFixed(1),
    piezas: objs.length,
    topes: objs.filter((o) => /Tope|Stop/.test(o.name)).length,
    bisagras: ed.listJoints().filter((j) => j.apertura0 != null && !j.soldada).length,
  };
});
console.log("ARMADO:", JSON.stringify(armado));
ok(armado.piezas > 8, "el mecanismo se arma entero", `${armado.piezas} piezas`);
ok(armado.topes === 6, "con sus seis topes en la viga", armado.topes);
ok(armado.bisagras === 2, "y sus dos bisagras articuladas", armado.bisagras);
ok(
  Math.abs(armado.largoReal - armado.pilarPedido) < 2,
  "el pilar montado mide LO CALCULADO",
  `${armado.largoReal} cm frente a ${armado.pilarPedido}`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
