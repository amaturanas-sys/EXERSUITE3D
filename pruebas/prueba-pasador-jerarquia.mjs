// PRUEBA: LA JERARQUÍA DEL PASADOR (v0.3.55).
//
// Dos cosas que el usuario pidió y que hasta aquí iban atadas la una a la otra:
//
//   · QUIÉN GIRA RESPECTO DE QUIÉN se programa, y se puede invertir. Es una
//     jerarquía, no un hecho de la geometría: en un conjunto que flota entero,
//     «el brazo gira sobre la viga» y «la viga gira sobre el brazo» son el mismo
//     mecanismo visto desde dos sitios, y el que vale lo elige quien diseña.
//   · DÓNDE VA EL HERRAJE —la horquilla y su halo de agujeros— es otra decisión.
//     Antes la horquilla iba siempre en el ancla, así que para cambiarla de lado
//     había que cambiar los papeles, y cambiar los papeles cambia quién gira. En
//     el acero no es así: una horquilla se suelda donde convenga soldarla.
//
// Y LA TERCERA, LA QUE DA SENTIDO A LAS OTRAS DOS: llevar el herraje NO deja a
// una viga clavada al suelo. Se monta un pasador con las DOS piezas móviles, se
// simula, y se comprueba que el conjunto entero cae —porque nada lo sujeta— y
// que el móvil sigue articulado respecto de la base mientras cae. Si montar la
// horquilla anclara su viga, el conjunto se quedaría flotando en el aire.
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
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

// EL BANCO DE PRUEBAS: un poste y un brazo unidos por un pasador. `fija` dice
// si el poste está clavado al mundo; `lado`, dónde va el herraje.
await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  window.montar = ({ fija = true, lado = "ancla", invertir = false } = {}) => {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const viga = (nombre, c, L, A, eje) => {
      const v = ed.addComponent("pilar-linea");
      v.name = nombre; v.mesh.name = nombre;
      v.params = { kind: "beam", width: A, depth: A, ends: "plano",
                   path: [[0, -L / 2, 0], [0, L / 2, 0]] };
      v.rebuildGeometry();
      if (eje) v.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eje);
      v.mesh.position.copy(c);
      ed.bus.emit("objectTransformed", { object: v });
      return v;
    };
    // EN EL AIRE, A PROPÓSITO. Un poste apoyado en el suelo no cae aunque esté
    // suelto, y entonces la prueba de «todo el grupo móvil» no probaría nada.
    const poste = viga("Poste", new T.Vector3(0, 120, 0), 100, 7);
    poste.physics = { ...poste.physics, fixed: fija, massKg: fija ? 0 : 12 };
    // Y CON SEPARACIÓN. Si el brazo envuelve al pasador no queda cara donde
    // soldarle una horquilla —la herramienta lo detecta y no pone herraje de
    // adorno—, así que su punta se queda 3 cm antes del eje.
    const brazo = viga("Brazo", new T.Vector3(8 + 3 + 20, 150, 0), 40, 5, new T.Vector3(1, 0, 0));
    brazo.physics = { ...brazo.physics, fixed: false, massKg: 3 };
    const pas = ed.addComponent("pasador");
    pas.params = { ...pas.params, height: 16 };
    pas.rebuildGeometry();
    pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
    pas.mesh.position.set(8, 150, 0);
    ed.bus.emit("objectTransformed", { object: pas });
    pas.params.pasadorAnclas = [poste.id];
    pas.params.pasadorMoviles = [brazo.id];
    pas.params.pasadorLibre = true;       // suelto: así la gravedad habla
    pas.params.pasadorPerfora = false;
    pas.params.pasadorAnclaje = true;     // CON herraje
    pas.params.pasadorIndexado = true;
    pas.params.pasadorPosiciones = 12;
    pas.params.pasadorHerrajeEn = lado;
    const r = ed.aplicarPasador(pas);
    if (invertir) ed.invertirPasador(pas);
    return { pas: pas.id, poste: poste.id, brazo: brazo.id, r };
  };
  // Las horquillas que puso el pasador, con el lado que llevan en el nombre.
  window.herrajes = () =>
    ed.listObjects()
      .filter((o) => o.componentId === "punto-anclaje" && / horquilla·/.test(o.name))
      .map((o) => ({
        lado: /horquilla·(\w+)/.exec(o.name)[1],
        de: o.name.split(" de ").pop(),
        fija: o.physics.fixed,
      }));
  window.papeles = (pasId) => {
    const p = ed.objects.get(pasId).params;
    const nom = (id) => ed.objects.get(id)?.name ?? "?";
    return {
      base: (p.pasadorAnclas ?? []).map(nom),
      movil: (p.pasadorMoviles ?? []).map(nom),
      lado: p.pasadorHerrajeEn ?? "ancla",
    };
  };
});

// ── 1. EL HERRAJE VA DONDE SE DIGA, Y LOS PAPELES NO SE MUEVEN ───────────
const porLado = await page.evaluate(() => {
  const salida = {};
  for (const lado of ["ancla", "movil", "ambas"]) {
    const { pas } = window.montar({ lado });
    salida[lado] = { herrajes: window.herrajes(), papeles: window.papeles(pas) };
  }
  return salida;
});

ok(
  porLado.ancla.herrajes.length === 1 && porLado.ancla.herrajes[0].de === "Poste",
  "por defecto la horquilla se suelda a la BASE, como siempre",
  JSON.stringify(porLado.ancla.herrajes),
);
ok(
  porLado.movil.herrajes.length === 1 && porLado.movil.herrajes[0].de === "Brazo",
  "pedida en el móvil, la horquilla se suelda al BRAZO",
  JSON.stringify(porLado.movil.herrajes),
);
ok(
  porLado.ambas.herrajes.length === 2 &&
    new Set(porLado.ambas.herrajes.map((h) => h.de)).size === 2,
  "pedida en las dos, salen DOS horquillas enfrentadas y no una que borra a la otra",
  JSON.stringify(porLado.ambas.herrajes.map((h) => h.de)),
);
// LO QUE NO PUEDE PASAR: que mover el herraje cambie quién gira.
ok(
  ["ancla", "movil", "ambas"].every(
    (l) => porLado[l].papeles.base[0] === "Poste" && porLado[l].papeles.movil[0] === "Brazo",
  ),
  "cambiar el herraje de lado NO toca la jerarquía: el poste sigue siendo la base",
  JSON.stringify(Object.fromEntries(["ancla", "movil", "ambas"].map((l) => [l, porLado[l].papeles]))),
);
// Y NINGUNA HORQUILLA NACE ANCLADA AL MUNDO.
ok(
  Object.values(porLado).every((v) => v.herrajes.every((h) => h.fija === false)),
  "ninguna horquilla nace clavada al suelo: llevar el herraje no ancla a nadie",
);

// ── 2. LA JERARQUÍA SE INVIERTE ──────────────────────────────────────────
const inv = await page.evaluate(() => {
  const { pas } = window.montar({ lado: "ancla", invertir: true });
  return { papeles: window.papeles(pas), herrajes: window.herrajes() };
});
ok(
  inv.papeles.base[0] === "Brazo" && inv.papeles.movil[0] === "Poste",
  "invertir cambia de bando las dos listas: ahora gira el poste sobre el brazo",
  JSON.stringify(inv.papeles),
);
// Y EL HERRAJE SE QUEDA DONDE ESTABA EN EL ACERO. Pedido «en la base», tras
// invertir la base es el brazo, así que la horquilla pasa a él: lo que no
// cambia es la REGLA —el lado pedido—, y por eso sigue habiendo una sola.
ok(
  inv.herrajes.length === 1 && inv.herrajes[0].lado === "ancla",
  "tras invertir sigue habiendo UNA horquilla, la del lado pedido, sin herraje huérfano",
  JSON.stringify(inv.herrajes),
);

// ── 3. LA PRUEBA DE FUEGO: TODO EL GRUPO MÓVIL ───────────────────────────
// Con el poste también suelto, nada sujeta el conjunto. Tiene que CAER —si
// montar la horquilla anclara su viga, se quedaría flotando— y el brazo tiene
// que seguir articulado mientras cae.
// SE CORREN LOS DOS MONTAJES, que es lo que convierte esto en una prueba y no
// en una observación: el MISMO mecanismo con el poste clavado y con el poste
// suelto. Lo único que cambia entre uno y otro es `physics.fixed` del poste, y
// tiene que ser lo único que decida si el conjunto se sostiene.
const caida = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const correr = async (fija) => {
    const ids = window.montar({ fija, lado: "ambas" });
    const y = (id) => ed.objects.get(id).mesh.position.y;
    const antes = { poste: y(ids.poste), brazo: y(ids.brazo) };
    const avisos = ed.physics?.avisosDeArmado?.() ?? [];
    ed.startSimulation();
    await new Promise((r) => setTimeout(r, 2500));
    const bajo = { poste: +(antes.poste - y(ids.poste)).toFixed(2),
                   brazo: +(antes.brazo - y(ids.brazo)).toFixed(2) };
    ed.stopSimulation();
    await new Promise((r) => setTimeout(r, 300));
    return { bajo, avisos: avisos.filter((a) => /ANCLAD/.test(a)) };
  };
  return { clavado: await correr(true), suelto: await correr(false) };
});

ok(
  caida.clavado.bajo.poste < 0.2,
  "con el poste clavado, el poste no se mueve — y lleva DOS horquillas encima",
  `bajó ${caida.clavado.bajo.poste} cm`,
);
ok(
  caida.suelto.bajo.poste > 1,
  "con el poste suelto, el conjunto CAE: llevar el herraje no anclaba a nadie",
  `bajó ${caida.suelto.bajo.poste} cm`,
);
// EL BRAZO CAE EN LOS DOS, porque el pivote está suelto y pendulea; lo que lo
// distingue es que con el poste suelto cae MÁS: a su propio péndulo se le suma
// la caída de todo el conjunto.
ok(
  caida.suelto.bajo.brazo > caida.clavado.bajo.brazo + 0.5,
  "y el brazo baja más que con el poste clavado: a su péndulo se le suma la caída del grupo",
  `clavado ${caida.clavado.bajo.brazo} cm · suelto ${caida.suelto.bajo.brazo} cm`,
);
ok(
  caida.suelto.avisos.length === 0,
  "el motor no avisa de ningún conjunto soldado que quedara anclado",
  caida.suelto.avisos.join(" | "),
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
