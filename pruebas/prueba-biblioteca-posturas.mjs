// v0.3.1 · LAS POSTURAS DE FÁBRICA NO SE CONGELAN, PERO LAS DEL USUARIO NO SE PISAN.
//
// El fallo que esto vigila era silencioso y de fondo: la biblioteca guardada en
// localStorage ganaba SIEMPRE a la de fábrica. La primera vez que alguien abría
// la aplicación se le grababa una copia de las posturas de entonces, y a partir
// de ahí no volvía a recibir ninguna corrección. Todo el trabajo de 0.2.95 a
// 0.3.1 sobre la sentadilla, el peso muerto y el press —ángulos resueltos, racks
// rehechos— no habría llegado nunca a quien ya tuviera biblioteca. Y no se ve:
// la aplicación arranca, lista las posturas y funciona; solo que con las de hace
// seis versiones.
//
// El arreglo guarda junto a la biblioteca una HUELLA de las posturas de fábrica
// con las que se guardó, y al cargar compara: lo que sigue idéntico a su huella
// es una copia sin tocar y se refresca; lo que difiere lo editó el usuario y se
// respeta. Esta prueba comprueba las dos mitades, que es lo que importa —
// refrescar de más sería destruir el trabajo del usuario—.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const fallos = [];
const errores = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

const CLAVE = "exersuite.poses.v2";
const CLAVE_HUELLA = "exersuite.poses.fabrica.v2";

/**
 * Abre la aplicación con una biblioteca ya guardada y devuelve lo que la
 * aplicación decide usar. `huella` a `null` simula venir de una versión
 * anterior, que es el caso que había que arreglar.
 */
const abrirCon = async (guardada, huella) => {
  const p = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  p.on("pageerror", (e) => errores.push(e.message));
  await p.addInitScript(([k, kh, g, h]) => {
    localStorage.setItem(k, JSON.stringify(g));
    if (h) localStorage.setItem(kh, JSON.stringify(h));
    else localStorage.removeItem(kh);
  }, [CLAVE, CLAVE_HUELLA, guardada, huella]);
  await p.goto("http://127.0.0.1:4174/");
  await p.waitForTimeout(1200);
  await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
  await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
  await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
  await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const ed = window.exersuite.editor;
    for (let i = 0; i < 20 && !ed.humanFigure; i++) {
      await ed.addHumanFigure();
      await new Promise((x) => setTimeout(x, 400));
    }
    const lee = (nombre) => {
      ed.applyPose(nombre);
      const J = ed.figureJoints();
      const g = (n) => (J[n] ? +(J[n].rotation.x * 180 / Math.PI).toFixed(1) : null);
      return { hombro: g("shoulderL"), codo: g("elbowL"), rodilla: g("kneeL") };
    };
    return {
      nombres: ed.listPoseNames(),
      frontal: lee("Sentadilla frontal"),
      mia: lee("Mi postura"),
    };
  });
  await p.close();
  return r;
};

// La postura de fábrica TAL COMO ERA antes del rack nuevo: es la copia que un
// usuario de la versión anterior tendría grabada sin haberla tocado.
const FRONTAL_VIEJA = {
  hipL: [0.42, 0.15, -10.29], hipR: [0.42, -0.15, 10.29],
  ankleL: [-0.43, 0, 10.3], ankleR: [-0.43, 0, -10.3],
  shoulderL: [-33, -24, 24], shoulderR: [-33, 24, -24],
  elbowL: [-140, 6, 0], elbowR: [-140, -6, 0],
  wristL: [25, 0, 25], wristR: [25, 0, -25],
};
// Una postura que el usuario se inventó: no se toca nunca, pase lo que pase.
const MIA = { kneeL: [42, 0, 0], kneeR: [42, 0, 0] };

console.log("\n── Viniendo de una versión anterior (sin huella) ────────────");
const sinHuella = await abrirCon(
  { "Sentadilla frontal": FRONTAL_VIEJA, "Mi postura": MIA },
  null,
);
console.log(`   Sentadilla frontal → hombro ${sinHuella.frontal.hombro}° codo ${sinHuella.frontal.codo}°`);
ok(Math.abs(sinHuella.frontal.hombro + 59.2) < 0.5 && Math.abs(sinHuella.frontal.codo + 123.5) < 0.5,
  `la postura de fábrica se REFRESCA y llega el rack nuevo `
  + `(hombro ${sinHuella.frontal.hombro}°, codo ${sinHuella.frontal.codo}°; la vieja era −33 / −140)`);
ok(sinHuella.mia.rodilla === 42,
  `y la postura del usuario sobrevive intacta (rodilla ${sinHuella.mia.rodilla}°)`);
ok(sinHuella.nombres.includes("Mi postura"),
  "y sigue en la lista");

console.log("\n── Con huella: lo editado por el usuario MANDA ──────────────");
// Aquí el usuario editó «Sentadilla frontal» a mano: la huella dice cómo era de
// fábrica, la guardada dice otra cosa, así que gana la del usuario.
const editada = { ...FRONTAL_VIEJA, shoulderL: [-77, -24, 24], shoulderR: [-77, 24, -24] };
const conHuella = await abrirCon(
  { "Sentadilla frontal": editada, "Mi postura": MIA },
  { "Sentadilla frontal": FRONTAL_VIEJA },
);
console.log(`   Sentadilla frontal → hombro ${conHuella.frontal.hombro}°`);
ok(Math.abs(conHuella.frontal.hombro + 77) < 0.5,
  `una postura de fábrica EDITADA por el usuario no se pisa (hombro ${conHuella.frontal.hombro}°)`);
ok(conHuella.mia.rodilla === 42,
  `y la suya propia tampoco (rodilla ${conHuella.mia.rodilla}°)`);

console.log("\n── Con huella: lo que NO tocó se refresca ───────────────────");
const intacta = await abrirCon(
  { "Sentadilla frontal": FRONTAL_VIEJA, "Mi postura": MIA },
  { "Sentadilla frontal": FRONTAL_VIEJA },
);
console.log(`   Sentadilla frontal → hombro ${intacta.frontal.hombro}° codo ${intacta.frontal.codo}°`);
ok(Math.abs(intacta.frontal.hombro + 59.2) < 0.5,
  `la copia sin tocar sí se refresca (hombro ${intacta.frontal.hombro}°)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
