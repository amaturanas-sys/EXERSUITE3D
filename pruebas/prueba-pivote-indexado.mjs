// PRUEBA: EL PIVOTE QUE SE CLAVA POR TRAMOS (v0.3.50).
//
// El modo indexado del pasador era INVISIBLE: la pieza se clavaba en múltiplos
// de un paso que no estaba dibujado en ninguna parte. En la máquina de verdad
// esos tramos son AGUJEROS, y se cuentan mirando. Ahora la horquilla que monta
// la herramienta los lleva.
//
// Lo que se mide:
//   · que la horquilla del pasador indexado sale con su DISCO, y sin él cuando
//     el modo indexado está apagado;
//   · que los agujeros son LOS QUE EL RECORRIDO PERMITE, ni uno más — un disco
//     con doce agujeros al lado de un brazo que barre media vuelta enseña seis
//     a los que no puede llegar;
//   · que los dos radios de la corona SALEN DE LA CUENTA y no de un número
//     tecleado: entre agujero y agujero queda al menos el radio del propio
//     agujero, que es el guardián que `cad/src/lib/indexada.py` lleva escrito;
//   · que el disco que resuelve la app y el que construye el CAD miden lo mismo;
//   · y que las tres piezas nuevas están en la paleta con su malla.
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

// ── 1. LA HERRAMIENTA MONTA EL DISCO ─────────────────────────────────────
const herramienta = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const montar = (indexado, limite, min, max, posiciones) => {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const poste = ed.addComponent("prim-box");
    poste.name = "Poste";
    poste.params = { kind: "box", width: 8, height: 90, depth: 8 };
    poste.rebuildGeometry();
    poste.mesh.position.set(0, 45, 0);
    poste.mesh.updateMatrixWorld(true);
    const brazo = ed.addComponent("prim-box");
    brazo.name = "Brazo";
    brazo.params = { kind: "box", width: 4, height: 4, depth: 40 };
    brazo.rebuildGeometry();
    brazo.mesh.position.set(0, 70, 24);
    brazo.mesh.updateMatrixWorld(true);
    const pas = ed.addComponent("pasador");
    pas.mesh.position.set(0, 70, 6);
    pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0));
    pas.mesh.updateMatrixWorld(true);
    Object.assign(pas.params, {
      pasadorAnclas: [poste.id],
      pasadorMoviles: [brazo.id],
      pasadorAnclaje: true,
      pasadorIndexado: indexado,
      pasadorPosiciones: posiciones,
      pasadorLimite: limite,
      pasadorMin: min,
      pasadorMax: max,
    });
    ed.aplicarPasador(pas);
    const h = [...ed.objects.values()].find((o) => o.componentId === "punto-anclaje");
    return h ? { ...h.params } : null;
  };
  return {
    // Sin modo indexado: la oreja de siempre, sin disco.
    liso: montar(false, false, 0, 360, 12),
    // Indexado y sin recorrido pedido: la corona entera, 12 agujeros de 30°.
    entero: montar(true, false, 0, 360, 12),
    // Indexado con media vuelta de recorrido: 7 agujeros, que son los cabos más
    // los cinco de en medio. Ni uno al que el brazo no llegue.
    medio: montar(true, true, 90, 270, 12),
  };
});
console.log("HERRAMIENTA:", JSON.stringify({
  liso: herramienta.liso?.horquillaTramos ?? null,
  entero: [herramienta.entero?.horquillaTramos, herramienta.entero?.horquillaArco],
  medio: [herramienta.medio?.horquillaTramos, herramienta.medio?.horquillaArco],
}));
ok(
  herramienta.liso && !herramienta.liso.horquillaTramos,
  "sin modo indexado la horquilla sale sin disco, como siempre",
  herramienta.liso?.horquillaTramos,
);
ok(
  herramienta.entero?.horquillaTramos === 12 && herramienta.entero?.horquillaArco === 360,
  "con el modo indexado y sin recorrido pedido, la corona da la vuelta entera",
  `${herramienta.entero?.horquillaTramos} agujeros en ${herramienta.entero?.horquillaArco}°`,
);
ok(
  herramienta.medio?.horquillaTramos === 7 && herramienta.medio?.horquillaArco === 180,
  "y con media vuelta de recorrido salen 7 agujeros: LOS QUE EL BRAZO ALCANZA",
  `${herramienta.medio?.horquillaTramos} agujeros en ${herramienta.medio?.horquillaArco}°`,
);

// ── 2. LOS RADIOS SALEN DE LA CUENTA ─────────────────────────────────────
const corona = await page.evaluate(() => {
  const M = window.exersuite.horquilla.medidas;
  const caso = (tramos, arco) => {
    const m = M({
      kind: "horquilla",
      horquillaAlto: 8,
      horquillaEspesor: 0.8,
      horquillaGarganta: 4.2,
      horquillaVuelo: 4,
      horquillaAgujero: 1.3,
      horquillaTramos: tramos,
      horquillaArco: arco,
    });
    // El acero que queda entre dos agujeros consecutivos, de borde a borde.
    const puente = 2 * m.arcoR * Math.sin((m.paso * Math.PI) / 360) - 2 * m.seguro;
    return {
      paso: +m.paso.toFixed(2),
      arcoR: +m.arcoR.toFixed(2),
      discoR: +m.discoR.toFixed(2),
      seguro: +m.seguro.toFixed(2),
      puente: +puente.toFixed(2),
      canto: +(m.discoR - m.arcoR - m.seguro).toFixed(2),
      radio: m.radio,
    };
  };
  return { siete: caso(7, 180), apretado: caso(24, 360) };
});
console.log("CORONA:", JSON.stringify(corona));
ok(
  corona.siete.paso === 30,
  "7 tramos en media vuelta dan 30° de paso: UNA HORA del reloj por agujero",
  `${corona.siete.paso}°`,
);
ok(
  corona.siete.puente >= corona.siete.seguro && corona.siete.canto >= 0,
  "entre agujero y agujero queda al menos el radio del propio agujero",
  `puente ${corona.siete.puente} cm, seguro ${corona.siete.seguro} cm`,
);
ok(
  corona.siete.arcoR > corona.siete.radio,
  "y la corona cae FUERA del semicírculo de la oreja, que es por donde gira el brazo",
  `corona a ${corona.siete.arcoR} cm, oreja de ${corona.siete.radio} cm`,
);
// Apretar posiciones sin tocar nada más tiene que ENSANCHAR el disco, no
// adelgazar el puente hasta que se rompa.
ok(
  corona.apretado.arcoR > corona.siete.arcoR
    && corona.apretado.puente >= corona.apretado.seguro,
  "apretar a 24 posiciones ensancha el disco en vez de adelgazar el acero",
  `de ${corona.siete.arcoR} a ${corona.apretado.arcoR} cm; puente ${corona.apretado.puente}`,
);

// ── 3. LA MALLA TRAE LOS AGUJEROS ────────────────────────────────────────
const malla = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const base = { kind: "horquilla", horquillaAlto: 8, horquillaEspesor: 0.8,
    horquillaGarganta: 4.2, horquillaVuelo: 4, horquillaAgujero: 1.3 };
  const medir = (extra) => {
    const h = ed.addComponent("punto-anclaje");
    h.params = { ...base, ...extra };
    h.rebuildGeometry();
    h.mesh.updateMatrixWorld(true);
    const t = new T.Box3().setFromObject(h.mesh).getSize(new T.Vector3());
    const v = h.mesh.geometry.attributes.position.count;
    ed.removeObject(h);
    return { tam: [t.x, t.y, t.z].map((n) => +n.toFixed(2)), vertices: v };
  };
  return { liso: medir({}), disco: medir({ horquillaTramos: 7, horquillaArco: 180 }) };
});
console.log("MALLA:", JSON.stringify(malla));
ok(
  malla.disco.vertices > malla.liso.vertices * 1.5,
  "la horquilla con disco trae muchos más vértices: los agujeros están calados de verdad",
  `${malla.liso.vertices} → ${malla.disco.vertices}`,
);
ok(
  malla.disco.tam[1] > malla.liso.tam[1] + 2 && Math.abs(malla.disco.tam[0] - malla.liso.tam[0]) < 0.01,
  "y crece en el plano de giro sin engordar a lo ancho: el disco va en UNA oreja",
  `${malla.liso.tam.join(" × ")} → ${malla.disco.tam.join(" × ")}`,
);

// ── 4. LAS TRES PIEZAS NUEVAS, EN LA PALETA ──────────────────────────────
const paleta = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const out = {};
  for (const id of ["pivote-indexado", "pivote-indexado-soldar", "pasador-manija"]) {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    for (let i = 0; i < 60 && !ed.tieneModelo?.(id); i++) {
      await new Promise((r) => setTimeout(r, 150));
    }
    const o = ed.addComponent(id);
    o.mesh.updateMatrixWorld(true);
    const t = new T.Box3().setFromObject(o.mesh).getSize(new T.Vector3());
    out[id] = {
      tam: [t.x, t.y, t.z].map((v) => +v.toFixed(2)),
      vertices: o.mesh.geometry?.attributes?.position?.count ?? 0,
    };
  }
  return out;
});
console.log("PALETA:", JSON.stringify(paleta));
const cotas = {
  "pivote-indexado": [8.4, 13.2, 16.4],
  "pivote-indexado-soldar": [8.4, 13.2, 13.2],
  "pasador-manija": [21.55, 3.4, 3.4],
};
for (const [id, esperado] of Object.entries(cotas)) {
  const p = paleta[id];
  ok(
    p && p.vertices > 1000 && esperado.every((v, i) => Math.abs(p.tam[i] - v) < 0.2),
    `${id} entra con la malla del CAD y sus medidas (${esperado.join(" × ")} cm)`,
    p ? `${p.tam.join(" × ")} · ${p.vertices} vértices` : "no está",
  );
}

// ── 5. EL CAD Y LA APP, EL MISMO DISCO ───────────────────────────────────
// La regla de la casa: `cad/` NO recalcula las fórmulas de la app, lleva las
// medidas que la app RESUELVE. Aquí se cruza: el alto de la pieza de CAD es el
// diámetro de su disco, y tiene que ser el que sale de `medidasHorquilla`.
const altoCad = paleta["pivote-indexado"]?.tam[1];
ok(
  Math.abs(altoCad - corona.siete.discoR * 2) < 0.05,
  "el disco del CAD y el que resuelve la app miden lo mismo, al milímetro",
  `CAD ${altoCad} cm de alto · app ${(corona.siete.discoR * 2).toFixed(2)} cm de diámetro`,
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
