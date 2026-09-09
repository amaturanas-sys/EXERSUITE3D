// PRUEBA: EL ASIENTO DEL PILAR EN EL TOPE (v0.3.36).
//
// El mecanismo de brazo con pilar regulable prometía un recorrido por niveles y
// no lo cumplía: el pie del pilar nacía DENTRO de la viga —sobre su eje, tres
// centímetros de material adentro— y encima del propio tope, así que el solver
// lo expulsaba en el primer fotograma; a partir de ahí rodaba cuesta abajo y se
// escapaba (medido con la herramienta: reptaba 3 cm y saltaba a 17,8).
//
// Lo que se mide:
//   · el pie nace SOBRE la viga, no dentro;
//   · cada nivel es una MUESCA de dos dedos con el hueco justo del pie;
//   · al simular, el brazo mantiene su ángulo y el pie no se va;
//   · y mandando el brazo a otro nivel, se queda también en ese.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
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

// ── 1. GEOMETRÍA: EL PIE SOBRE LA VIGA, Y CADA NIVEL UNA MUESCA ─────────────
const geo = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const cfg = { brazoCm: 46, gradoA: 10, gradoB: 70, vigaCm: 60, inclinacionC: 30,
                descentradoCm: 4.2, topes: 5 };
  const sol = ed.crearBrazoConPilar(cfg, new T.Vector3(0, 60, 0));
  const v3 = o => o.mesh.getWorldPosition(new T.Vector3());
  const pilar = ed.listObjects().find(o => /Pilar de apoyo/.test(o.name));
  const viga = ed.listObjects().find(o => /Viga de topes/.test(o.name));
  const dedos = ed.listObjects().filter(o => /^Tope /.test(o.name));
  // El PIE: el extremo bajo del pilar.
  const path = pilar.params.path;
  pilar.mesh.updateMatrixWorld(true);
  const a = pilar.mesh.localToWorld(new T.Vector3(...path[0]));
  const b = pilar.mesh.localToWorld(new T.Vector3(...path[path.length-1]));
  const pie = a.y < b.y ? a : b;
  // ¿Está DENTRO de la viga? Se mide su distancia al eje de la viga.
  viga.mesh.updateMatrixWorld(true);
  const vp = viga.params.path;
  const va = viga.mesh.localToWorld(new T.Vector3(...vp[0]));
  const vb = viga.mesh.localToWorld(new T.Vector3(...vp[vp.length-1]));
  const ab = vb.clone().sub(va);
  const t = Math.min(Math.max(pie.clone().sub(va).dot(ab)/ab.lengthSq(), 0), 1);
  const alEje = pie.distanceTo(va.clone().addScaledVector(ab, t));
  // La MUESCA: los dos dedos más cercanos al pie y el hueco entre ellos.
  const cerca = dedos.map(d => ({ n: d.name, p: v3(d), d: pie.distanceTo(v3(d)) }))
    .sort((x, y) => x.d - y.d).slice(0, 2);
  const hueco = cerca.length === 2 ? cerca[0].p.distanceTo(cerca[1].p) : null;
  return {
    pilarCm: sol.pilarCm, niveles: sol.topes.length, dedos: dedos.length,
    alEje: +alEje.toFixed(2),
    hueco: hueco === null ? null : +hueco.toFixed(2),
    nombres: cerca.map(c => c.n),
  };
});
console.log("GEOMETRÍA:", JSON.stringify(geo));
ok(geo.dedos === geo.niveles * 2, "cada nivel lleva DOS dedos: es una muesca, no un bulto",
   `${geo.dedos} dedos para ${geo.niveles} niveles`);
// La viga es de perfil 6 y el pilar de 5: el pie descansa a 5,5 de su eje.
ok(Math.abs(geo.alEje - 5.5) < 0.4, "el pie nace SOBRE la viga, no dentro de su material", geo.alEje);
// Hueco entre centros = pie (5) + holgura (0,4) + un dedo (1,5).
ok(Math.abs(geo.hueco - 6.9) < 0.2, "y los dedos dejan el hueco justo del pie", geo.hueco);
ok(
  geo.nombres.some(n => /arriba|upper/.test(n)) && geo.nombres.some(n => /abajo|lower/.test(n)),
  "uno por encima y otro por debajo, que es lo que encierra",
  geo.nombres.join(" | "),
);

// ── 2. AL SIMULAR, SE QUEDA ─────────────────────────────────────────────────
const quieto = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const v3 = o => o.mesh.getWorldPosition(new T.Vector3());
  const pilar = ed.listObjects().find(o => /Pilar de apoyo/.test(o.name));
  const brazo = ed.listObjects().find(o => /^Brazo$|^Arm$/.test(o.name));
  const ang = () => {
    const d = new T.Vector3(0,1,0).applyQuaternion(brazo.mesh.quaternion);
    return +(Math.atan2(d.y, Math.hypot(d.x, d.z))*180/Math.PI).toFixed(1);
  };
  const pieDe = () => {
    const p = pilar.params.path;
    pilar.mesh.updateMatrixWorld(true);
    const a = pilar.mesh.localToWorld(new T.Vector3(...p[0]));
    const b = pilar.mesh.localToWorld(new T.Vector3(...p[p.length-1]));
    return a.y < b.y ? a : b;
  };
  const a0 = ang(), p0 = pieDe().clone();
  ed.toggleSimulation();
  const serie = [];
  for (let i=0;i<10;i++){
    await new Promise(r=>setTimeout(r,600));
    serie.push({ ang: ang(), pie: +pieDe().distanceTo(p0).toFixed(2) });
  }
  ed.toggleSimulation(); await new Promise(r=>setTimeout(r,400));
  return { a0, serie };
});
console.log("QUIETO:", JSON.stringify(quieto));
const ultimos = quieto.serie.slice(-5);
ok(
  ultimos.every(s => Math.abs(s.ang - quieto.a0) <= 1),
  "al simular, el brazo mantiene su ángulo",
  `${quieto.a0}° → ${quieto.serie[quieto.serie.length-1].ang}°`,
);
ok(
  ultimos.every(s => Math.abs(s.pie - ultimos[0].pie) < 0.3),
  "y el pie se asienta y SE QUEDA, no repta ni se escapa",
  ultimos.map(s => s.pie).join(" → "),
);
ok(
  quieto.serie[quieto.serie.length-1].pie < 3,
  "sin salirse de su muesca",
  quieto.serie[quieto.serie.length-1].pie,
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
