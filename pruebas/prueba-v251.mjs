// v0.2.51 · Tres ajustes del maniquí:
// 1) Colocar reconoce el extremo de un banco: mira hacia fuera y las piernas
//    dejan de atravesarlo.
// 2) La PARTIDA incluye la máquina: se congela el punto de bloqueo y ▶ arranca
//    ahí en vez de en el diseño.
// 3) POSAR cabe sin bajar, y posar ya no depende del candado de la zona.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
const errores = [];
const nueva = async (w = 1280, h = 900) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
  await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
  await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
  return page;
};

// ══════════ 1 · SENTARSE EN UN BANCO PLANO
{
  const page = await nueva();
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("Banco plano")).click();
    await new Promise((x) => setTimeout(x, 1800));
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 700));
    const banco = [...ed.objects.values()].find((o) => /colchoneta|banco/i.test(o.name));
    const caja = new T.Box3().setFromObject(banco.mesh);
    const tam = caja.getSize(new T.Vector3()), cen = caja.getCenter(new T.Vector3());
    const largoX = tam.x > tam.z;
    const semi = (largoX ? tam.x : tam.z) / 2;

    const mallasB = []; banco.mesh.traverse((n) => { if (n.isMesh) mallasB.push(n); });
    const dentro = () => {
      const fig = ed.humanFigure; fig.updateMatrixWorld(true);
      const ray = new T.Raycaster(), dir = new T.Vector3(0.5773, 0.5774, 0.5773).normalize();
      const v = new T.Vector3(); let prof = 0;
      fig.traverse((s) => {
        if (!s.isMesh || !s.userData.humanFigurePart) return;
        if (!/^(muslo|pierna|pie)-/.test(String(s.userData.segmentId ?? ""))) return;
        const pos = s.geometry.getAttribute("position");
        const paso = Math.max(1, Math.floor(pos.count / 120));
        for (let i = 0; i < pos.count; i += paso) {
          v.fromBufferAttribute(pos, i).applyMatrix4(s.matrixWorld);
          ray.set(v, dir);
          const h = ray.intersectObjects(mallasB, false);
          if (h.length % 2 === 1 && h[0].distance > prof) prof = h[0].distance;
        }
      });
      return +prof.toFixed(1);
    };
    const colocar = async (frac) => {
      const p = new T.Vector3(cen.x, caja.max.y, cen.z);
      if (largoX) p.x += semi * frac; else p.z += semi * frac;
      await Object.getPrototypeOf(ed).colocarFiguraEn.call(ed, { punto: p, obj: banco });
      await new Promise((x) => setTimeout(x, 400));
      const f = new T.Vector3(0, 0, 1).applyQuaternion(ed.humanFigure.quaternion);
      // ¿Mira hacia fuera del banco? Producto con el vector centro→asiento.
      const haciaFuera = new T.Vector3(p.x - cen.x, 0, p.z - cen.z);
      return {
        dentro: dentro(),
        haciaFuera: haciaFuera.lengthSq() > 1 ? +f.dot(haciaFuera.normalize()).toFixed(2) : null,
        deLado: +Math.abs(largoX ? f.z : f.x).toFixed(2),
      };
    };
    // ¿CUÁNTO FLOTAN LOS GLÚTEOS? La otra mitad del compromiso: subir la figura
    // hasta que los muslos no rocen deja el trasero en el aire, que es lo que
    // el diseñador reportó (11,3 cm medidos sobre una máquina real).
    const hueco = () => {
      const fig = ed.humanFigure; fig.updateMatrixWorld(true);
      const c = new T.Box3();
      fig.traverse((n) => {
        if (n.isMesh && n.userData.segmentId === "pelvis") c.union(new T.Box3().setFromObject(n));
      });
      return c.isEmpty() ? null : +(c.min.y - caja.max.y).toFixed(1);
    };
    const A = await colocar(-0.8), hA = hueco();
    const medio = await colocar(0), hM = hueco();
    const B = await colocar(0.8), hB = hueco();
    return { A: { ...A, hueco: hA }, medio: { ...medio, hueco: hM }, B: { ...B, hueco: hB } };
  });
  console.log("\n1) SENTARSE EN UN BANCO PLANO");
  console.log("   extremo A:", JSON.stringify(r.A), "\n   medio    :", JSON.stringify(r.medio), "\n   extremo B:", JSON.stringify(r.B));
  // EL MUSLO ROZA EL ASIENTO, Y NO PUEDE NO ROZARLO. En este esqueleto el muslo
  // es un cilindro cuyo eje va a la altura de la cadera, así que su parte baja
  // queda 5,2 cm POR DEBAJO del punto más bajo de la pelvis. O apoya la pelvis
  // —y el muslo entra un poco— o apoya el muslo y los glúteos quedan flotando
  // 11,3 cm, que es el fallo que se corrigió eligiendo los glúteos como apoyo.
  // Las dos cosas a la vez no caben, así que se acota lo que un acolchado
  // absorbe (3 cm) y se vigila LA OTRA pared: que el trasero no flote.
  ok(r.A.dentro <= 3 && r.medio.dentro <= 3 && r.B.dentro <= 3,
    `el muslo entra en el acolchado lo justo (${r.A.dentro} / ${r.medio.dentro} / ${r.B.dentro} cm, máximo 3)`);
  ok(r.A.hueco <= 0.5 && r.medio.hueco <= 0.5 && r.B.hueco <= 0.5,
    `y los glúteos no flotan sobre el asiento (${r.A.hueco} / ${r.medio.hueco} / ${r.B.hueco} cm)`);
  ok(r.A.haciaFuera > 0.8 && r.B.haciaFuera > 0.8,
    `en los extremos mira HACIA FUERA del banco (${r.A.haciaFuera} y ${r.B.haciaFuera}, 1 = de frente al vacío)`);
  ok(r.medio.deLado > 0.8, `y en el medio se sienta DE LADO, con las piernas al costado (${r.medio.deLado})`);
  await page.close();
}

// ══════════ 2 · LA PARTIDA CONGELA TAMBIÉN LA MÁQUINA
{
  const page = await nueva();
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
    await new Promise((x) => setTimeout(x, 2000));
    const objs = [...ed.objects.values()];
    const agarre = objs[39], pila = objs[20];
    if (pila?.stack) { pila.stack.selected = 5; pila.rebuildStackVisual(); }
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 600));

    const yAgarre = () => +agarre.mesh.position.y.toFixed(1);
    const yPila = () => +pila.mesh.position.y.toFixed(1);
    // Se mide el INSTANTE del arranque: es lo que define desde dónde empieza
    // el gesto. Que después el brazo baje es la fase excéntrica, no un fallo.
    const arrancar = async (esperaMs = 2500) => {
      ed.startSimulation();
      for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
      await new Promise((x) => setTimeout(x, esperaMs));
    };
    await arrancar();
    const diseno = { agarre: yAgarre(), pila: yPila() };

    // Se lleva el brazo con la MANO hasta el bloqueo, como haría el usuario.
    const b = ed.physics.ejeDeGiro(agarre.id);
    const P = b.punto.clone(), E = b.eje.clone();
    const radio = agarre.mesh.position.clone().sub(P);
    ed.physics.grab(agarre.id, agarre.mesh.position.clone(), true);
    // Se mantiene el agarre en el tope unos fotogramas para que el conjunto
    // llegue de verdad: el arrastre depende del tiempo real y con la máquina
    // cargada puede quedarse a medias.
    for (let k = 1; k <= 40; k++) {
      ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-Math.min(k, 32))).add(P));
      await new Promise((x) => setTimeout(x, 70));
    }
    const bloqueo = { agarre: yAgarre(), pila: yPila() };
    // 📌 se fija CON la mano puesta: es el punto que el usuario está viendo.
    const fijado = ed.fijarPartida();
    ed.physics.release();
    await new Promise((x) => setTimeout(x, 300));

    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 1200));
    const parado = { agarre: yAgarre(), pila: yPila() };

    // ▶ otra vez. Se traza fotograma a fotograma: el gesto arranca en el
    // bloqueo y desde ahí BAJA — esa bajada es la fase excéntrica, que es
    // justo lo que se quería poder ver.
    const traza = async () => {
      const t = [];
      for (let i = 0; i < 30; i++) {
        t.push(yAgarre());
        await new Promise((x) => requestAnimationFrame(x));
      }
      return t;
    };
    await arrancar(0);
    const trazaSegunda = await traza();
    const segunda = { agarre: Math.max(...trazaSegunda), pila: yPila() };
    await new Promise((x) => setTimeout(x, 2500));
    const segundaAsentada = { agarre: yAgarre(), pila: yPila() };
    const avisos = ed.physics.avisosDeArmado().length;
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 1000));

    // 🗑 Soltar: vuelve a arrancar en el diseño.
    ed.soltarPartidaMaquina();
    await arrancar(0);
    const trazaTercera = await traza();
    const tercera = { agarre: Math.max(...trazaTercera), pila: yPila() };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 900));
    return { diseno, bloqueo, fijado, parado, segunda, segundaAsentada, tercera, avisos, trazaSegunda, trazaTercera };
  });
  console.log("\n2) PARTIDA CON LA MÁQUINA CONGELADA");
  console.log("   1ª simulación (diseño) :", JSON.stringify(r.diseno));
  console.log("   tras llevarla al bloqueo:", JSON.stringify(r.bloqueo), `→ fijadas ${r.fijado.piezas} piezas`);
  console.log("   parado (se ve el diseño):", JSON.stringify(r.parado));
  console.log("   2ª simulación, cota más alta del arranque:", JSON.stringify(r.segunda));
  console.log("   traza del arranque (cm por fotograma):", r.trazaSegunda.slice(0, 10).join(" → "));
  console.log("   2ª simulación, ya asentada:", JSON.stringify(r.segundaAsentada), "← la excéntrica, que es lo que se quiere ver");
  console.log("   3ª tras soltar          :", JSON.stringify(r.tercera));
  const recorrido = Math.abs(r.bloqueo.agarre - r.diseno.agarre);
  ok(recorrido > 3, `la mano lleva el conjunto móvil hasta su bloqueo (${recorrido.toFixed(1)} cm de recorrido)`);
  ok(r.fijado.piezas > 0, `📌 congela las piezas que se movieron (${r.fijado.piezas})`);
  // AL PARAR SE VE LA PARTIDA, no el diseño — y esto CAMBIA lo que fijó la
  // v0.2.51, así que conviene decir por qué. Aquella regla («parado se sigue
  // viendo y editando el diseño») nació cuando la partida era sólo una
  // condición de arranque del motor. Pero en v0.2.91 el diseñador pidió posar
  // la máquina PARA acomodarle el maniquí, y ahí la regla se vuelve en contra:
  // «la postura de la máquina no permanece en su sitio pese a ejecutar fijar
  // posición, motivo por el cual es imposible posar el maniquí para una
  // ergonomía congruente». Si la máquina vuelve al plano de un salto, no hay
  // contra qué colocar el cuerpo.
  //
  // Lo que se conserva de la regla vieja es su intención: que diseñar no se vea
  // perturbado. Por eso la partida sólo se ve CON EL MANIQUÍ DELANTE (aquí lo
  // hay), el plano sigue siendo lo que se exporta y se guarda, y soltarla lo
  // repone — que es lo que comprueba la tercera simulación de más abajo.
  ok(Math.abs(r.parado.agarre - r.bloqueo.agarre) < 2,
    `al parar, la máquina SE QUEDA donde se congeló (agarre en ${r.parado.agarre} cm, bloqueo en ${r.bloqueo.agarre})`);
  ok(Math.abs(r.segunda.agarre - r.bloqueo.agarre) < Math.abs(r.segunda.agarre - r.diseno.agarre),
    `▶ arranca en el punto congelado y no en el diseño (${r.segunda.agarre} cm; bloqueo ${r.bloqueo.agarre}, diseño ${r.diseno.agarre})`);
  ok(r.segundaAsentada.agarre < r.segunda.agarre - 1,
    `y desde ahí BAJA sola: eso es la fase excéntrica (${r.segunda.agarre} → ${r.segundaAsentada.agarre} cm)`);
  ok(Math.max(...r.trazaTercera) < r.segunda.agarre - 3,
    `soltando la partida el arranque vuelve a ser el diseño (${Math.max(...r.trazaTercera)} cm frente a ${r.segunda.agarre})`);
  ok(Math.abs(r.tercera.agarre - r.diseno.agarre) < 2.5,
    `🗑 soltar devuelve el arranque al diseño (${r.tercera.agarre} cm)`);
  ok(r.avisos === 0, `sin avisos de armado al arrancar congelado (${r.avisos})`);
  await page.close();
}

// ══════════ 3 · POSAR: sin candado y sin scroll
{
  const page = await nueva(1280, 900);
  const r = await page.evaluate(async () => {
    const ed = window.exersuite.editor;
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 700));
    if (!ed.panelArticulaciones.visible()) ed.panelArticulaciones.alternar();
    ed.panelArticulaciones.setModo("posar");
    await new Promise((x) => setTimeout(x, 300));

    // La rodilla está BLOQUEADA por la zona (de fábrica solo el tren superior).
    const bloqueada = ed.isJointLocked("kneeL");
    ed.selectJoint("kneeL");
    const seleccionada = ed.getSelectedJoint();
    const j = ed.figureJoints().kneeL;
    const antes = +(j.rotation.x * 180 / Math.PI).toFixed(1);
    ed.setJointAngle("x", 70);
    const despues = +(j.rotation.x * 180 / Math.PI).toFixed(1);

    const caja = ed.panelArticulaciones.root.querySelector(".mq-seccion");
    const cuerpo = ed.panelArticulaciones.root.querySelector(".panel-body");
    return {
      bloqueada, seleccionada, antes, despues,
      candados: ed.panelArticulaciones.root.querySelectorAll(".mq-seccion")[0].innerHTML.includes("Bloquear"),
      alto: Math.round(caja.scrollHeight),
      hueco: Math.round(cuerpo.clientHeight),
      grupos: [...ed.panelArticulaciones.root.querySelectorAll(".mq-grupo-titulo")].map((n) => n.textContent),
      desborda: caja.scrollHeight > cuerpo.clientHeight + 4,
    };
  });
  console.log("\n3) POSAR");
  console.log("   ", JSON.stringify(r));
  ok(r.bloqueada, "la rodilla está bloqueada por la zona activa (solo tren superior de fábrica)");
  ok(r.seleccionada === "kneeL" && r.despues === 70,
    `y AUN ASÍ se puede posar: ${r.antes}° → ${r.despues}° (antes el candado lo impedía y remitía a una ventana que ya no existe)`);
  ok(!r.candados, "el botón de candado ya no está en POSAR: lo manda la zona en SIMULAR");
  // Cinco desde v0.2.81: BARRA se suma a Postura, Articulación, Apoyos y
  // Partida. Lo que esta aserción protege no es el número sino que POSAR siga
  // AGRUPADO POR TAREA y no vuelva a ser una columna de mandos sueltos.
  ok(r.grupos.length === 5, `POSAR queda en 5 grupos por tarea (${r.grupos.join(" · ")})`);
  ok(!r.desborda, `y cabe sin bajar en 900 px de alto (${r.alto} px de contenido en ${r.hueco} px de hueco)`);
  await page.close();
}

console.log("\nERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
