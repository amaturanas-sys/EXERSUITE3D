// PRUEBA: HASTA QUÉ INCLINACIÓN RETIENE UN DIENTE (v0.3.88).
//
// EL CASO MÍNIMO DEL CONTACTO, y por qué existe.
//
// El respaldo de la banca ajustable aguanta vertical y cede al recostarlo. Se
// descartaron, midiendo, seis formas de diente, el diámetro del pasador, la
// escala del gancho, la posición del carril y las soldaduras; y
// `prueba-bisagra-rigida` dejó al motor fuera de sospecha (0,001 cm de cesión
// con 20 kg). Todo eso se midió sobre la banca entera, que es un mecanismo con
// contactos, topes y una manipulación por encima: conclusiones indirectas.
//
// Esto es lo contrario, y sólo pregunta una cosa: UN DIENTE Y UN PASADOR. El
// carril se inclina, se deja caer el pasador en un diente y se mira si se
// queda. Sin bisagras, sin puntal y sin respaldo.
//
// Un carril de banca no está nunca vertical —el de este proyecto va a unos
// 35°—, así que lo que se quiere saber es dónde está la frontera: si el diente
// sólo retiene cerca de la vertical, la pieza no sirve para un carril de
// ajuste por mucho que se le afine la forma, y eso decide el diseño.
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const PASADOR_CM = 4;   // diámetro del pasador que se deja caer
const GRADOS = [0, 15, 30, 45, 60];

/** El carril solo, tumbado los grados que se le pidan. */
const escenaCarril = (grados, perfil) => {
  const a = (grados * Math.PI) / 360;   // medio ángulo, para el cuaternión
  return {
    version: 1,
    objects: [
      {
        id: "carril",
        name: "Carril",
        componentId: "placa-dentada",
        materialId: "acero-pulido",
        params: {
          kind: "dentada",
          dientes: 5,
          dienteEspaciado: 12.5,
          dienteAgarreCm: PASADOR_CM,
          ...(perfil ? { dientePerfil: perfil } : {}),
        },
        physics: { massKg: 0, fixed: true },
        position: [0, 60, 3.5],
        quaternion: [0, 0, Math.sin(a), Math.cos(a)],
        scale: [1, 1, 1],
      },
      {
        // LA GEMELA. En la banca el pasador descansa sobre DOS placas, una a
        // cada lado; con una sola puede caerse de canto, que es un fallo que
        // no tiene el mecanismo de verdad.
        id: "carril2",
        name: "Carril gemelo",
        componentId: "placa-dentada",
        materialId: "acero-pulido",
        params: {
          kind: "dentada",
          dientes: 5,
          dienteEspaciado: 12.5,
          dienteAgarreCm: PASADOR_CM,
          ...(perfil ? { dientePerfil: perfil } : {}),
        },
        physics: { massKg: 0, fixed: true },
        position: [0, 60, -3.5],
        quaternion: [0, 0, Math.sin(a), Math.cos(a)],
        scale: [1, 1, 1],
      },
    ],
    joints: [], cables: [], ropes: [], groups: [],
  };
};

/** El mismo carril, con el pasador puesto en un punto del carril. */
const escenaConPasador = (grados, perfil, punto) => {
  const base = escenaCarril(grados, perfil);
  base.objects.push({
    id: "pasador",
    name: "Pasador",
    componentId: "pasador-bisagra",
    materialId: "acero-pulido",
    params: { kind: "cylinder", radiusTop: PASADOR_CM / 2, radiusBottom: PASADOR_CM / 2, height: 14 },
    physics: { massKg: 2, fixed: false },
    position: [punto[0], punto[1], punto[2]],
    quaternion: [0.7071067811865475, 0, 0, 0.7071067811865475],
    scale: [1, 1, 1],
  });
  return base;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
// Por pasos, no por reloj: ver pruebas/arnes.mjs (v0.4.10).
const pausa = await prepararPasos(page);
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await pausa(1200);
await page.click("text=📁 PROYECTOS"); await pausa(300);
await page.click(".land-actions button:has-text('NUEVO')"); await pausa(300);
await page.click(".wizard-carta:has-text('Profesional')"); await pausa(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await pausa(2000);

/**
 * DÓNDE SE SIENTA DE VERDAD EL PASADOR, medido y no calculado.
 *
 * Deducir el asiento de las cajas es fácil de errar —la placa puede ir
 * reflejada, y el bloque de la cuna está POR DEBAJO del asiento, no en él—.
 * Un primer intento colocaba el pasador a ojo y los resultados salían
 * erráticos: 60° aguantaba y 45° no, según dónde cayera.
 *
 * Así que el asiento se AVERIGUA: con el carril horizontal, donde no hay
 * ninguna duda de que el diente retiene, se deja caer el pasador y se anota
 * dónde acaba EN EL MARCO DE LA PLACA. Ese punto es el asiento, y sirve para
 * todas las inclinaciones. A partir de ahí el pasador arranca YA SENTADO y la
 * pregunta queda limpia: puesto en su sitio, ¿se queda?
 */
const asientoMedido = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await window.__pausa(600);
    const pl = [...ed.objects.values()].find((o) => o.name === "Carril");
    const pa = [...ed.objects.values()].find((o) => o.name === "Pasador");
    if (!pl || !pa) return null;
    await ed.toggleSimulation();
    await window.__pausa(2500);
    pl.mesh.updateMatrixWorld(true);
    pa.mesh.updateMatrixWorld(true);
    const v = pa.mesh.getWorldPosition(new T.Vector3());
    pl.mesh.worldToLocal(v);
    await ed.toggleSimulation();
    await window.__pausa(300);
    return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
  }, data);

/** Ese asiento local, llevado al mundo con el carril a la inclinación pedida. */
const asientoEnElMundo = (data, local) =>
  page.evaluate(async ({ proyecto, local }) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await window.__pausa(600);
    const pl = [...ed.objects.values()].find((o) => o.name === "Carril");
    if (!pl) return null;
    pl.mesh.updateMatrixWorld(true);
    const v = pl.mesh.localToWorld(new T.Vector3(local[0], local[1], local[2]));
    return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
  }, { proyecto: data, local });

/** Cuánto se ha movido el pasador tras dejarlo caer y esperar. */
const cuantoResbala = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await window.__pausa(600);
    const pa = [...ed.objects.values()].find((o) => o.name === "Pasador");
    if (!pa) return { error: "sin pasador" };
    const donde = () => {
      pa.mesh.updateMatrixWorld(true);
      return pa.mesh.getWorldPosition(new T.Vector3());
    };
    await ed.toggleSimulation();
    // Dos segundos para que caiga y asiente; después se mide el desplazamiento.
    await window.__pausa(2000);
    const asentado = donde();
    const serie = [];
    for (let k = 0; k < 6; k++) {
      await window.__pausa(1000);
      serie.push(+donde().distanceTo(asentado).toFixed(2));
    }
    const fin = donde();
    // POR DÓNDE SE VA. A lo largo del carril es "se salta el diente"; de canto
    // (eje Z) es "se cae de lado", que sería un fallo del montaje de prueba y
    // no del diente.
    const pl = [...ed.objects.values()].find((o) => o.name === "Carril");
    pl.mesh.updateMatrixWorld(true);
    const ejeCarril = new T.Vector3(0, 1, 0).applyQuaternion(pl.mesh.quaternion).normalize();
    const d = fin.clone().sub(asentado);
    await ed.toggleSimulation();
    await window.__pausa(300);
    return {
      corrimiento: +d.length().toFixed(2),
      porElCarril: +Math.abs(d.dot(ejeCarril)).toFixed(2),
      deCanto: +Math.abs(d.z).toFixed(2),
      serie,
      alturaFinal: +fin.y.toFixed(1),
    };
  }, data);

/**
 * DÓNDE ACABA, que no es lo mismo que cuánto se mueve (v0.4.7).
 *
 * `cuantoResbala` mide el desplazamiento DESDE una foto tomada a los 2 s, y esa
 * foto ya es post-caída: con ella, un pasador que baja al diente en el primer
 * segundo y se queda sale como «no se ha movido». Sirve para preguntar si
 * RETIENE; no sirve para preguntar si RECOGE. Esto último se mide por el sitio
 * final, en el marco de la placa.
 */
const dondeAcaba = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await window.__pausa(600);
    const pa = [...ed.objects.values()].find((o) => o.name === "Pasador");
    const pl = [...ed.objects.values()].find((o) => o.name === "Carril");
    if (!pa || !pl) return null;
    await ed.toggleSimulation();
    await window.__pausa(6000);
    pl.mesh.updateMatrixWorld(true);
    pa.mesh.updateMatrixWorld(true);
    const v = pl.mesh.worldToLocal(pa.mesh.getWorldPosition(new T.Vector3()));
    await ed.toggleSimulation();
    await window.__pausa(300);
    return +v.y.toFixed(2);
  }, data);

console.log(`Un diente y un pasador de Ø${PASADOR_CM} cm. Se deja caer y se mira si se queda.`);
console.log("Cuánto se corre POR EL CARRIL en 6 s, en centímetros:\n");
console.log("  inclinación   GANCHO    MUESCA");

// Primero, el asiento de cada perfil, con el carril horizontal.
const asiento = {};
for (const perfil of [null, "muesca"]) {
  const alto = [0, 40, 0];   // se suelta desde arriba y cae en el diente
  asiento[perfil ?? "gancho"] = await asientoMedido(escenaConPasador(0, perfil, alto));
}
console.log(`  (asiento medido — gancho ${JSON.stringify(asiento.gancho)}, muesca ${JSON.stringify(asiento.muesca)})\n`);

const tabla = [];
for (const g of GRADOS) {
  const fila = { grados: g };
  for (const perfil of [null, "muesca"]) {
    const local = asiento[perfil ?? "gancho"];
    const punto = local ? await asientoEnElMundo(escenaCarril(g, perfil), local) : null;
    if (!punto) { fila[perfil ?? "gancho"] = null; continue; }
    const r = await cuantoResbala(escenaConPasador(g, perfil, punto));
    // LO QUE CUENTA ES IRSE POR EL CARRIL. Un pasador con holgura se acomoda
    // dentro de su cuna unos milímetros —medido, hasta 1 cm— y eso no es
    // escaparse: de un diente sólo se sale yendo hacia el de al lado.
    fila[perfil ?? "gancho"] = r.error ? null : r.porElCarril;
    if (!r.error) fila[`${perfil ?? "gancho"}Detalle`] = `${r.corrimiento} en total`;
  }
  tabla.push(fila);
  const f = (v) => (v === null ? "  —  " : String(v).padStart(6));
  console.log(`  ${String(g).padStart(8)}°   ${f(fila.gancho)}    ${f(fila.muesca)}      ` +
    `[gancho: ${fila.ganchoDetalle ?? "—"}]`);
}
console.log("");

// RETENER ES NO IRSE AL DIENTE DE AL LADO. Los dientes van cada 12,5 cm, así
// que medio centímetro de corrimiento a lo largo del carril ya es el pasador
// empezando a caminar.
const RETIENE = 0.5;
for (const f of tabla) {
  ok(
    f.gancho !== null && f.gancho < RETIENE,
    `a ${f.grados}° de inclinación, el GANCHO retiene el pasador`,
    `${f.gancho} cm por el carril (${f.ganchoDetalle})`,
  );
}
for (const f of tabla) {
  ok(
    f.muesca !== null && f.muesca < RETIENE,
    `a ${f.grados}° de inclinación, la MUESCA retiene el pasador`,
    `${f.muesca} cm por el carril (${f.muescaDetalle})`,
  );
}

// ── Y SI NO CAE JUSTO EN EL DIENTE, ¿LO RECOGE? ─────────────────────────────
//
// Un carril de ajuste promete POSICIONES, y eso no es lo mismo que retener: el
// pasador de una banca recién ajustada no aterriza en el diente, aterriza donde
// caiga. Así que se le deja a varias alturas del hueco —el paso son 12,5 cm— y
// se mira en qué diente acaba. Abajo del medio tiene que caer al de abajo;
// arriba del medio, al de arriba. Quedarse a medio camino es lo que hace que
// «en qué diente está» deje de querer decir nada.
//
// AQUÍ SE VIO POR QUÉ LA BANCA CEDÍA DESPUÉS DE AJUSTARLA. Con el pasador y la
// cuna a la misma medida —como en esta prueba— el carril recoge desde cualquier
// altura. Con la cuna cortada para 1 cm y un pasador de Ø2, que es lo que tenía
// `bancoajustable.json`, el pasador se queda PERCHADO en la mitad de arriba del
// hueco: cae 6,25 cm desde +6,25 pero desde +9 no se mueve. Un pasador del doble
// de su cuna no entra en el diente de al lado: se apoya en su borde.
console.log("\nY puesto A MEDIA ALTURA del hueco, ¿en qué diente acaba? (paso 12,5 cm)");
const asientoGancho = asiento.gancho;
const pitch = 12.5;
const recogidas = [];
for (const off of [1, 4, 6.25, 9, 11.5]) {
  const local = [asientoGancho[0], asientoGancho[1] + off, asientoGancho[2]];
  const punto = await asientoEnElMundo(escenaCarril(35, null), local);
  const fin = await dondeAcaba(escenaConPasador(35, null, punto));
  // ¿A qué diente corresponde ese sitio? 0 = el de partida, 1 = el siguiente.
  const cual = fin === null ? null : Math.round((fin - asientoGancho[1]) / pitch);
  const error = fin === null ? null : +Math.abs(fin - (asientoGancho[1] + cual * pitch)).toFixed(2);
  recogidas.push({ off, fin, cual, error });
  console.log(`  puesto en +${String(off).padEnd(5)} acaba en y=${String(fin).padStart(7)}  → diente ${cual} (a ${error} cm de su asiento)`);
}
for (const r of recogidas) {
  ok(
    r.error !== null && r.error < 0.6,
    `puesto a +${r.off} cm del diente, el carril lo RECOGE en uno (no a medio camino)`,
    `acabó en y=${r.fin}, a ${r.error} cm del asiento del diente ${r.cual}`,
  );
}

// ── ¿Y A EMPUJONES? ─────────────────────────────────────────────────────────
//
// Lo de arriba mide el peso: el pasador sentado, la gravedad tirando. Falta el
// empujón, que es lo que la banca recibe cuando alguien la mueve. Se le da al
// pasador un impulso A LO LARGO del carril y se mira DOS cosas: hasta dónde
// sube (el pico) y dónde acaba.
//
// Las dos, porque medir sólo una engaña en las dos direcciones: con el final se
// pierde el salto —el pasador sube, no llega al diente de al lado y vuelve a
// caer en el suyo, así que parece que no se ha movido— y con el pico se pierde
// si se quedó fuera. Es la misma trampa que la de «retener» contra «recoger»,
// dos secciones más arriba.
//
// Y EL LABIO NO ES EL QUE MANDA. Con el pasador de la banca (Ø2 en cuna de 2) se
// probó subirlo de 3,76 cm —el de fábrica, 0,301 del paso— a 6,5, y el pico no
// se movió: 5,0 contra 4,8 cm, y con impulsos de 6 a 16 N·s siempre los mismos
// 4,6-5,1. Lo que para al pasador no es la altura del labio sino el FALDÓN DEL
// DIENTE DE ARRIBA, que le sale al encuentro y lo devuelve. (Aquí, con el Ø4 de
// esta prueba, el pico es 2,9: un pasador más gordo trepa menos.) Por eso un carril
// así no se desajusta empujándolo por su propio plano: para cambiar de diente
// hay que sacar el pasador FUERA del plano del carril, que es justo lo que hace
// la mano en la máquina de verdad.
//
// (El motor recorta la velocidad a 8 m/s y 30 rad/s —`limitarDesbocados`—, así
// que por encima de 16 N·s sobre 2 kg no hay más empujón que dar.)
console.log("\nY a empujones por el carril: hasta dónde sube y dónde acaba (cm)");
const empujon = (data, impulso) =>
  page.evaluate(async ({ proyecto, impulso }) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await window.__pausa(600);
    const pl = [...ed.objects.values()].find((o) => o.name === "Carril");
    const pa = [...ed.objects.values()].find((o) => o.name === "Pasador");
    const enPlaca = () => {
      pl.mesh.updateMatrixWorld(true);
      pa.mesh.updateMatrixWorld(true);
      return pl.mesh.worldToLocal(pa.mesh.getWorldPosition(new T.Vector3())).y;
    };
    await ed.toggleSimulation();
    let listo = false;
    for (let k = 0; k < 100 && !listo; k++) {
      await window.__pausa(50);
      const id = [...ed.objects].find(([, o]) => o.name === "Pasador")?.[0];
      const c = id ? ed.physics?.bodies?.get(id)?.body : null;
      try { if (c && c.mass() > 1) listo = true; } catch { /* cuerpo viejo */ }
    }
    await window.__pausa(1500);
    const y0 = enPlaca();
    const id = [...ed.objects].find(([, o]) => o.name === "Pasador")[0];
    const cuerpo = ed.physics.bodies.get(id).body;
    const u = new T.Vector3(0, 1, 0)
      .applyQuaternion(pl.mesh.getWorldQuaternion(new T.Quaternion()));
    cuerpo.applyImpulse({ x: u.x * impulso, y: u.y * impulso, z: u.z * impulso }, true);
    let pico = 0;
    for (let k = 0; k < 20; k++) {
      await window.__pausa(100);
      const dy = enPlaca() - y0;
      if (Math.abs(dy) > Math.abs(pico)) pico = dy;
    }
    const fin = enPlaca() - y0;
    await ed.toggleSimulation();
    await window.__pausa(300);
    return { pico: +pico.toFixed(2), fin: +fin.toFixed(2) };
  }, { proyecto: data, impulso });

const puntoGancho = await asientoEnElMundo(escenaCarril(35, null), asiento.gancho);
for (const imp of [6, 16]) {
  const r = await empujon(escenaConPasador(35, null, puntoGancho), imp);
  console.log(`  ${String(imp).padStart(2)} N·s (v hasta ${imp / 2} m/s): sube ${r.pico} y acaba en ${r.fin}`);
  ok(
    Math.abs(r.fin) < 0.6,
    `tras un empujón de ${imp} N·s el pasador VUELVE a su diente`,
    `acabó a ${r.fin} cm del asiento (subió ${r.pico})`,
  );
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
