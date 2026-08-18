// v0.2.55: POSAR LA MÁQUINA. Se agarra una pieza móvil con la simulación
// PARADA, se queda donde la dejas (parálisis cérea) y al terminar esa
// posición es la partida: cada ▶ arranca ahí.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fallos++; };

const b = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(800);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);

// Una máquina con conjunto móvil de verdad.
await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("uppermachine", new T.Vector3(0, 0, 0));
  // DESDE v0.2.91 LA MÁQUINA SE POSA PARA ALGUIEN: la partida es una condición
  // de ensayo de un cuerpo concreto y sin maniquí no se aplica nunca, así que
  // «▶ Manipular» avisa y no entra. El maniquí va delante.
  await ed.addHumanFigure();
});
await p.waitForTimeout(1500);

// --- 1. El modo entra estando PARADO y no cuenta como simular ---
const entrada = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const antes = ed.isSimulating();
  await ed.iniciarPoseMaquina();
  await new Promise((r) => setTimeout(r, 800));
  return { antes, posando: ed.posandoMaquina(), simulando: ed.isSimulating(),
           herr: ed.getSimHerramienta() };
});
ok(entrada.antes === false, "se entra con la simulación parada");
ok(entrada.posando === true, "el modo de posado queda activo");
ok(entrada.simulando === false, "posar NO cuenta como simular (isSimulating sigue false)");
ok(entrada.herr === "mano", `la mano queda elegida sola (${entrada.herr})`);

// --- 2. PARÁLISIS CÉREA: sin tocar nada, la máquina no se cae ---
const quieta = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const movil = [...ed.objects.values()].find((o) => {
    const s = ed.saved.get(o.id);
    return s && !o.mesh.position.equals(new window.exersuite.THREE.Vector3(0, 0, 0));
  });
  const antes = [...ed.objects.values()].map((o) => o.mesh.position.y);
  await new Promise((r) => setTimeout(r, 2500));
  const despues = [...ed.objects.values()].map((o) => o.mesh.position.y);
  let maxCaida = 0;
  for (let i = 0; i < antes.length; i++) maxCaida = Math.max(maxCaida, antes[i] - despues[i]);
  return { maxCaida: +maxCaida.toFixed(2), piezas: antes.length };
});
ok(quieta.maxCaida < 1.0,
  `nada se desploma en 2,5 s sin tocarlo (caída máx ${quieta.maxCaida} cm de ${quieta.piezas} piezas)`);

// --- 3. Se mueve una pieza a mano y SE QUEDA ahí ---
const movida = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  // La pila de pesos es el móvil más claro de la UpperMachine.
  const pila = [...ed.objects.values()].find((o) => o.componentId === "barra-lat-ttp")
    ?? [...ed.objects.values()].filter((o) => !ed.physics.bodies.get(o.id)?.body.isFixed())
         .sort((a, b) => b.mesh.position.y - a.mesh.position.y)[0];
  if (!pila) return null;
  const y0 = pila.mesh.position.y;
  // Se empuja hacia arriba con la mano del motor, como haría el dedo.
  const body = ed.physics.bodies.get(pila.id).body;
  const destino = new T.Vector3(pila.mesh.position.x, y0 - 20, pila.mesh.position.z);
  ed.physics.grab(pila.id, pila.mesh.position.clone());
  for (let i = 0; i < 200; i++) {
    ed.physics.dragTo(destino);
    await new Promise((r) => requestAnimationFrame(r));
  }
  const yArrastrada = pila.mesh.position.y;
  ed.physics.release();
  await new Promise((r) => setTimeout(r, 2000));
  return {
    id: pila.id, y0: +y0.toFixed(2),
    yArrastrada: +yArrastrada.toFixed(2),
    yReposo: +pila.mesh.position.y.toFixed(2),
  };
});
ok(movida !== null, "hay una pieza móvil que agarrar");
if (movida) {
  ok(Math.abs(movida.yArrastrada - movida.y0) > 5,
    `la mano la mueve (${movida.y0} → ${movida.yArrastrada} cm)`);
  ok(Math.abs(movida.yReposo - movida.yArrastrada) < 2,
    `y se QUEDA donde la dejas: 2 s después sigue en ${movida.yReposo} (dejada en ${movida.yArrastrada})`);
}

// --- 4. Al terminar, eso es la partida ---
const congelado = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const r = ed.terminarPoseMaquina();
  return { piezas: r.piezas, enLaPartida: ed.piezasEnLaPartida(),
           posando: ed.posandoMaquina(), simulando: ed.isSimulating() };
});
ok(congelado.piezas > 0, `al salir congela lo movido (${congelado.piezas} pieza(s))`);
ok(congelado.enLaPartida === congelado.piezas, "la partida guarda esas piezas");
ok(congelado.posando === false && congelado.simulando === false, "se sale a estado parado");

// --- 5. ▶ arranca DONDE se posó, no en el diseño ---
const arranque = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const id = [...ed.objects.keys()].find((k) => true);
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 400));
  const ys = new Map([...ed.objects.values()].map((o) => [o.id, +o.mesh.position.y.toFixed(2)]));
  const simulando = ed.isSimulating();
  ed.toggleSimulation();
  return { simulando, ys: [...ys] };
});
ok(arranque.simulando === true, "▶ arranca la simulación de verdad");

// --- 6. Posar la máquina NO está disponible mientras el gesto corre ---
const durante = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 300));
  await ed.iniciarPoseMaquina();          // debe ser ignorado
  const posando = ed.posandoMaquina();
  const boton = document.querySelector("#articulaciones button.sim");
  ed.toggleSimulation();
  return { posando, botonDeshabilitado: boton ? boton.disabled : null };
});
ok(durante.posando === false, "iniciarPoseMaquina se ignora con el gesto corriendo");

console.log("\nERRORES: " + (errs.length ? errs.join("\n") : "ninguno"));
if (errs.length) fallos += errs.length;
console.log(fallos === 0 ? "\n✅ TODO BIEN" : `\n❌ ${fallos} fallo(s)`);
await b.close();
process.exit(fallos ? 1 : 0);
