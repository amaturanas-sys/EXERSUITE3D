// v0.2.56: rediseño de POSAR en la ventana de ERGONOMÍA.
//  1.a  quitar figura / colocar / agarrar siguen, y arriba.
//  1.b  POSTURA y su gestor, justo debajo.
//  1.c  ARTICULACIÓN: un campo con el nombre de lo tocado + interruptor
//       bilateral. Fuera la rejilla de familias, los lados y la casilla L↔R.
//  1.d  APOYOS: apoyar mano, pisar, soltar apoyos.
//  2.a  PARTIDA al final, como reproductor ▶/⏹, con puntos numerados.
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
await p.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("uppermachine", new T.Vector3(0, 0, 0));
});
await p.waitForTimeout(1200);
await p.evaluate(async () => { await window.exersuite.editor.addHumanFigure(175); });
await p.waitForTimeout(1200);

// ── ORDEN de los grupos de POSAR ────────────────────────────────────────
const orden = await p.evaluate(() => {
  const caja = document.querySelector("#articulaciones .mq-seccion");
  return {
    grupos: [...caja.querySelectorAll(".mq-grupo-titulo")].map((e) => e.textContent.trim()),
    // Los tres botones de figura van ANTES del primer grupo.
    antesDelPrimerGrupo: [...caja.children]
      .slice(0, [...caja.children].findIndex((c) => c.classList.contains("mq-grupo")))
      .flatMap((c) => [...c.querySelectorAll("button")].map((x) => x.textContent.trim())),
  };
});
console.log("grupos:", JSON.stringify(orden.grupos));
// BARRA entra entre Postura y Articulación en v0.2.81. El orden de POSAR es el
// de la tarea real —primero dónde va la figura, luego QUÉ EJERCICIO hace, luego
// el detalle articular, luego dónde se apoya y al final la partida—, y la barra
// es parte del «qué ejercicio»: elegirla fija las dos posturas del recorrido y
// la zona de movimiento. Va después de Postura porque se apoya en ella, y antes
// de Articulación porque la articulación es el afinado de lo ya elegido.
ok(JSON.stringify(orden.grupos)
    === JSON.stringify(["Postura", "Barra", "Articulación", "Apoyos", "Partida del ejercicio"]),
  `el orden es Postura → Barra → Articulación → Apoyos → Partida (${orden.grupos.join(" · ")})`);
ok(orden.antesDelPrimerGrupo.some((t) => /figura/i.test(t)), "1.a — quitar/crear figura arriba del todo");
ok(orden.antesDelPrimerGrupo.some((t) => /Colocar/.test(t)) &&
   orden.antesDelPrimerGrupo.some((t) => /Agarrar/.test(t)), "1.a — Colocar y Agarrar se mantienen arriba");

// ── 1.c ARTICULACIÓN simplificada ───────────────────────────────────────
const artic = await p.evaluate(() => {
  const caja = document.querySelector("#articulaciones .mq-seccion");
  const grupo = [...caja.querySelectorAll(".mq-grupo")]
    .find((g) => g.querySelector(".mq-grupo-titulo").textContent.trim() === "Articulación");
  return {
    hayCampo: !!grupo.querySelector("input.mq-articulacion"),
    hayInterruptor: !!grupo.querySelector(".mq-interruptor input[type=checkbox]"),
    rejillaVieja: document.querySelectorAll(".art-rejilla .art-sel").length,
    ladosViejos: grupo.querySelectorAll(".art-lados").length,
    casillaLR: [...document.querySelectorAll("#articulaciones .mq-seccion label")]
      .filter((l) => /Simetría L/.test(l.textContent)).length,
    rotuloInterruptor: grupo.querySelector(".mq-interruptor")?.textContent.trim(),
  };
});
ok(artic.hayCampo, "1.c — hay un campo con el nombre de la articulación");
ok(artic.hayInterruptor, `1.c — hay un interruptor bilateral ("${artic.rotuloInterruptor}")`);
ok(artic.rejillaVieja === 0, `1.c — desapareció la rejilla de familias (${artic.rejillaVieja} botones)`);
ok(artic.ladosViejos === 0, "1.c — desaparecieron Izquierda/Derecha/Simétrico");
ok(artic.casillaLR === 0, "1.c — desapareció la casilla «Simetría L↔R»");

// El campo REFLEJA lo que se selecciona, con nombre legible.
const refleja = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const campo = document.querySelector("input.mq-articulacion");
  const vacio = campo.value;
  ed.selectJoint("shoulderL");
  const uno = campo.value;
  ed.selectJoint("knee-R" in {} ? "knee-R" : "kneeR");
  const dos = campo.value;
  return { vacio, uno, dos };
});
ok(refleja.uno === "Hombro izquierdo", `1.c — al tocar el hombro izquierdo dice "${refleja.uno}"`);
ok(refleja.dos === "Rodilla derecha",
  `1.c — al tocar la rodilla derecha dice "${refleja.dos}"`);

// El interruptor manda de verdad sobre la simetría del posado.
const bilat = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const chk = document.querySelector(".mq-interruptor input[type=checkbox]");
  const antes = ed.getPoseSymmetry();
  chk.checked = !antes; chk.dispatchEvent(new Event("change"));
  const despues = ed.getPoseSymmetry();
  chk.checked = antes; chk.dispatchEvent(new Event("change"));
  return { antes, despues, vuelta: ed.getPoseSymmetry() };
});
ok(bilat.despues !== bilat.antes && bilat.vuelta === bilat.antes,
  `1.c — el interruptor cambia la simetría de verdad (${bilat.antes} → ${bilat.despues} → ${bilat.vuelta})`);

// ── 1.d APOYOS ──────────────────────────────────────────────────────────
const apoyos = await p.evaluate(() => {
  const g = [...document.querySelectorAll("#articulaciones .mq-grupo")]
    .find((x) => x.querySelector(".mq-grupo-titulo").textContent.trim() === "Apoyos");
  return [...g.querySelectorAll("button")].map((b) => b.textContent.trim());
});
ok(apoyos.some((t) => /Apoyar mano/.test(t)) && apoyos.some((t) => /Pisar/.test(t)) &&
   apoyos.some((t) => /Soltar apoyos/.test(t)), `1.d — los tres apoyos siguen (${apoyos.join(", ")})`);

// ── 2.a PARTIDA como reproductor ────────────────────────────────────────
const repro = await p.evaluate(() => {
  const g = [...document.querySelectorAll("#articulaciones .mq-grupo")]
    .find((x) => x.querySelector(".mq-grupo-titulo").textContent.trim() === "Partida del ejercicio");
  return { botones: [...g.querySelectorAll("button")].map((b) => b.textContent.trim()),
           haySelector: !!g.querySelector("select") };
});
ok(/^▶/.test(repro.botones[0]), `2.a — arranca con un Play (${repro.botones[0]})`);
ok(repro.haySelector, "2.a — tiene selector de puntos de partida");

// Ciclo completo: ▶ manipular → mover → ⏹ fijar → queda guardado y numerado.
const ciclo = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const boton = [...document.querySelectorAll("#articulaciones .mq-grupo")]
    .find((x) => x.querySelector(".mq-grupo-titulo").textContent.trim() === "Partida del ejercicio")
    .querySelector("button");
  const r = { partidas0: ed.listaPartidas().length };
  boton.click();                       // ▶
  await new Promise((s) => setTimeout(s, 1200));
  r.posando = ed.posandoMaquina();
  r.rotuloAlManipular = boton.textContent.trim();
  const remo = [...ed.objects.values()].find((o) => o.componentId === "barra-lat-ttp");
  const y0 = remo.mesh.position.y;
  ed.physics.grab(remo.id, remo.mesh.position.clone());
  const destino = new T.Vector3(remo.mesh.position.x, y0 - 18, remo.mesh.position.z);
  for (let i = 0; i < 200; i++) { ed.physics.dragTo(destino); await new Promise((s) => requestAnimationFrame(s)); }
  ed.physics.release();
  await new Promise((s) => setTimeout(s, 600));
  r.movido = +(remo.mesh.position.y - y0).toFixed(1);
  boton.click();                       // ⏹
  await new Promise((s) => setTimeout(s, 300));
  r.partidas1 = ed.listaPartidas();
  r.piezasCongeladas = ed.piezasEnLaPartida();
  r.posandoTras = ed.posandoMaquina();
  return r;
});
ok(ciclo.posando === true, `2.a — ▶ entra en manipulación (rótulo pasa a "${ciclo.rotuloAlManipular}")`);
ok(/^⏹/.test(ciclo.rotuloAlManipular), "2.a — durante la manipulación el botón es un Stop");
ok(Math.abs(ciclo.movido) > 5, `2.a — la máquina se manipula (${ciclo.movido} cm)`);
ok(ciclo.posandoTras === false, "2.a — ⏹ sale de la manipulación");
ok(ciclo.partidas1.length === ciclo.partidas0 + 1,
  `2.a — ⏹ guarda un punto de partida numerado (${JSON.stringify(ciclo.partidas1)})`);
ok(/^Partida 1$/.test(ciclo.partidas1[0]), `2.a — se numera desde 1 ("${ciclo.partidas1[0]}")`);
ok(ciclo.piezasCongeladas > 0, `2.a — ese punto lleva la máquina (${ciclo.piezasCongeladas} pieza(s))`);

// Varios puntos, y se recuperan.
const varios = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const n2 = ed.guardarPartida();
  const n3 = ed.guardarPartida();
  const lista = ed.listaPartidas();
  const aplicado = ed.aplicarPartida(lista[0]);
  const opciones = [...document.querySelectorAll("#articulaciones select")]
    .map((s) => [...s.options].map((o) => o.value));
  ed.eliminarPartida(n3);
  return { n2, n3, lista, aplicado, tras: ed.listaPartidas(), opciones };
});
ok(varios.lista.length === 3, `2.a — se pueden crear varios (${varios.lista.join(", ")})`);
ok(varios.n2 === "Partida 2" && varios.n3 === "Partida 3", "2.a — la numeración sigue 1, 2, 3…");
ok(varios.aplicado === true, "2.a — un punto guardado se recupera");
ok(varios.tras.length === 2, `2.a — y se pueden eliminar (${varios.tras.join(", ")})`);
ok(varios.opciones.some((o) => o.includes("Partida 1")), "2.a — el selector los lista");

console.log("\nERRORES: " + (errs.length ? errs.join("\n") : "ninguno"));
if (errs.length) fallos += errs.length;
console.log(fallos === 0 ? "\n✅ TODO BIEN" : `\n❌ ${fallos} fallo(s)`);
await b.close();
process.exit(fallos ? 1 : 0);
