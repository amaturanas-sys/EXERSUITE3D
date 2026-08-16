// Ayudantes compartidos por las pruebas que juzgan al maniqui SENTADO.
//
// Se inyectan en la pagina con `await page.evaluate(AYUDANTES)` y dejan tres
// funciones en `window`.  Existen para no comparar contra umbrales calibrados
// sobre el rig viejo de cilindros: cada uno comprueba la PROPIEDAD que el
// numero intentaba capturar, asi que valen igual con otro cuerpo.

export const AYUDANTES = () => {
  const T = window.exersuite.THREE;

  // LA PLANTA, no el fondo de la caja del pie.  Cada pieza del maniqui lleva un
  // collarin que se mete dentro de su vecina para que la articulacion no se abra
  // al doblarla; ese collarin no pisa nada y al girar el pie puede quedar mas
  // bajo que la suela.  La geometria vive en el marco del TOBILLO, asi que la
  // piel propia del pie es la que tiene y <= 0 y el collarin la de arriba.
  window.__planta = (lado) => {
    const f = window.exersuite.editor.humanFigure;
    if (!f) return null;
    f.updateMatrixWorld(true);
    let m = null;
    f.traverse((n) => { if (n.isMesh && n.userData.segmentId === `pie-${lado}`) m = n; });
    if (!m) return null;
    const pos = m.geometry.getAttribute("position"), v = new T.Vector3();
    let y = Infinity;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) * m.scale.y + m.position.y > 0) continue;
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld);
      if (v.y < y) y = v.y;
    }
    return Number.isFinite(y) ? +y.toFixed(2) : null;
  };

  // Lo mas bajo de la PIEL del cuerpo (no de las cajas, que incluyen collarines).
  window.__pielMasBaja = () => {
    const f = window.exersuite.editor.humanFigure;
    if (!f) return null;
    f.updateMatrixWorld(true);
    const v = new T.Vector3();
    let y = Infinity;
    f.traverse((m) => {
      if (!m.isMesh || !m.visible || !m.userData.humanFigurePart) return;
      const pos = m.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) * m.scale.y + m.position.y > 0) continue;   // collarin
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld);
        if (v.y < y) y = v.y;
      }
    });
    return Number.isFinite(y) ? +y.toFixed(2) : null;
  };

  // ¿ESTA LA RODILLA TAN DOBLADA COMO EL ASIENTO PERMITE?
  //
  // El angulo de la rodilla de un cuerpo sentado NO es un numero redondo: lo
  // fija el asiento.  La postura pide 95 grados y `noHundirse` la estira hasta
  // que la planta llega al suelo, asi que el valor bueno depende de lo alto que
  // sea el asiento y de lo larga que sea la pierna del cuerpo.  Con el rig de
  // primitivas quedaba en 95; con el cuerpo escaneado, cuya rodilla esta a
  // 51,8 cm del suelo, un asiento de 42,5 es BAJO y queda en 59.
  //
  // Por eso no se compara contra un umbral: se comprueba la propiedad.  Doblarla
  // un poco mas tiene que meter la planta bajo el suelo — si todavia cabe mas
  // flexion es que la pierna se estiro de mas, que era el fallo de v0.2.60
  // (rodilla en 50-53 teniendo 59 disponibles).
  window.__rodillaAlTope = (lado, mas = 6) => {
    const ed = window.exersuite.editor;
    const f = ed.humanFigure, j = ed.figureJoints();
    const k = j?.[`knee${lado}`];
    if (!f || !k) return null;
    const antes = k.rotation.x;
    const planta = window.__planta(lado);
    k.rotation.x = antes + T.MathUtils.degToRad(mas);
    const doblandoMas = window.__planta(lado);
    k.rotation.x = antes;
    f.updateMatrixWorld(true);
    return {
      grados: +T.MathUtils.radToDeg(antes).toFixed(0), planta, doblandoMas, mas,
      alTope: planta !== null && doblandoMas !== null && doblandoMas < -0.5,
    };
  };

  // SENTADA = los gluteos posados sobre la cara del asiento.
  //
  // Antes se miraba `humanFigure.position.y > 10`, que no distinguia nada: la
  // raiz del rig estaba a la altura de la cadera y esa `y` pasaba de 10 tanto
  // sentada como de pie.  Desde que el maniqui trae esqueleto propio la raiz
  // esta en el SUELO y sentarse la deja en -37, con lo que la comprobacion
  // vacia paso a fallar sin que nada se hubiera roto.
  window.__sentadaEn = (obj, tol = 3) => {
    const f = window.exersuite.editor.humanFigure;
    if (!f || !obj) return null;
    f.updateMatrixWorld(true);
    const tope = new T.Box3().setFromObject(obj.mesh).max.y;
    const g = new T.Box3();
    f.traverse((n) => {
      if (n.isMesh && n.userData.segmentId === "pelvis") g.union(new T.Box3().setFromObject(n));
    });
    if (g.isEmpty()) return null;
    return { gluteos: +g.min.y.toFixed(2), asiento: +tope.toFixed(2),
             sentada: Math.abs(g.min.y - tope) < tol };
  };
};
