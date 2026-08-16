// TRAMO OCULTO (v0.2.35): entre dos roldanas INTERNAS de la MISMA viga el
// cable discurre por dentro del perfil —hueco en el mundo real—, así que lo
// que penetre en ese volumen (el mástil que sostiene la viga) no lo obstruye.
// La regla es estricta: en cualquier otra conformación el cable sigue
// validándose contra el material como siempre.
import { chromium } from "playwright-core";
const OUT = ".";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const chequear = (ok, m) => { if (!ok) fallos.push(m); console.log((ok ? "✓ " : "✗ ") + m); };

// Escenario paramétrico: una o dos vigas, las roldanas dentro o fuera de
// ellas, y un mástil que atraviesa la viga entre las dos roldanas.
const escena = (cfg) =>
  page.evaluate(async (cfg) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    for (const c of ed.listCables()) ed.removeCable(c);
    for (const o of [...ed.objects.values()]) ed.removeObject(o);

    const caja = (nombre, dims, pos) => {
      const o = ed.addComponent("prim-box");
      o.params = { kind: "box", width: dims[0], height: dims[1], depth: dims[2] };
      o.rebuildGeometry();
      o.mesh.position.set(pos[0], pos[1], pos[2]);
      o.physics = { massKg: 0, fixed: true };
      o.name = nombre;
      ed.bus.emit("objectTransformed", { object: o });
      return o;
    };
    const roldana = (nombre, pos) => {
      const o = ed.addComponent("roldana");
      o.mesh.position.set(pos[0], pos[1], pos[2]);
      o.physics = { massKg: 0.3, fixed: true };
      o.name = nombre;
      ed.bus.emit("objectTransformed", { object: o });
      return o;
    };
    const terminal = (nombre, pos) => {
      const o = ed.addComponent("terminal-cable");
      o.mesh.position.set(pos[0], pos[1], pos[2]);
      o.physics = { massKg: 0.1, fixed: true };
      o.name = nombre;
      ed.bus.emit("objectTransformed", { object: o });
      return o;
    };

    // Vigas: una sola de −100 a 100, o dos mitades enfrentadas.
    if (cfg.dosVigas) {
      caja("Viga izq.", [96, 14, 14], [-52, 100, 0]);
      caja("Viga der.", [96, 14, 14], [52, 100, 0]);
    } else {
      caja("Viga hueca", [200, 14, 14], [0, 100, 0]);
    }
    // Mástil que SOSTIENE la viga: la penetra por el centro (no se puede
    // recortar sin que la viga se caiga).
    caja("Mástil", [8, 200, 8], [0, 5, 0]);

    // Roldanas dentro de la viga (internas) o montada la segunda por fuera.
    const rA = roldana("Roldana A", [-60, 100, 0]);
    const rB = roldana("Roldana B", cfg.bExterna ? [60, 112, 0] : [60, 100, 0]);
    const nodo = (o) => ({ objectId: o.id, local: { x: 0, y: 0, z: 0 } });
    const nodos = [nodo(rA), nodo(rB)];
    if (cfg.terceraViga) {
      // Una tercera roldana, interna de OTRA viga: su tramo sí cruza paredes.
      caja("Viga lejana", [40, 14, 14], [0, 40, 60]);
      nodos.push(nodo(roldana("Roldana C", [0, 40, 60])));
    }
    ed.createCable(nodos);
    ed.cablesDirty = true;
    ed.requestRender?.(6);
    await new Promise((r) => setTimeout(r, 600));
    const linea = [...ed.cableVisuals.children][0];
    return {
      cables: ed.listCables().length,
      visuales: ed.cableVisuals.children.length,
      rojo: !!linea && linea.material.color.getHex() === 0xef4444,
      rA: rA.mesh.position.toArray(),
      rB: rB.mesh.position.toArray(),
    };
  }, cfg);

// A) Dos roldanas internas de la MISMA viga, con el mástil atravesándola.
const a = await escena({});
console.log("  A:", JSON.stringify(a));
chequear(!a.rojo, "A) entre dos roldanas internas de la MISMA viga el cable va oculto: VÁLIDO pese al mástil");

// B) Roldanas internas de vigas DISTINTAS: el tramo cruza paredes de verdad.
const b = await escena({ dosVigas: true });
console.log("  B:", JSON.stringify(b));
chequear(b.rojo, "B) entre roldanas de vigas DISTINTAS el cable sigue marcándose en ERROR");

// C) Una interna y una EXTERNA: tampoco se relaja.
const c = await escena({ bExterna: true });
console.log("  C:", JSON.stringify(c));
chequear(c.rojo, "C) de roldana interna a EXTERNA el cable sigue marcándose en ERROR");

// D) La exención es POR TRAMO: si el cable sigue hasta una roldana de otra
//    viga, ese otro tramo se valida como siempre.
const d = await escena({ terceraViga: true });
console.log("  D:", JSON.stringify(d));
chequear(d.rojo, "D) la exención es POR TRAMO: el tramo hacia otra viga sigue en ERROR");

await page.screenshot({ path: `${OUT}/v235-cable-oculto.png` });
console.log("\nerrores de página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
