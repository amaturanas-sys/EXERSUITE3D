// Comprueba los DOS GESTOS del carrusel de recorridos y el cambio de ventana.
//
// Lo que se mide, que es lo que pidió el diseñador:
//   · la pestaña MUEVE el carrusel y no toca el mercado;
//   · pulsar la lámina grande es lo que ENTRA en el recorrido;
//   · el carrusel se arrastra con el cursor;
//   · arrastrar NO cuenta como pulsar la lámina;
//   · OnDemand y ForMakers cambian la ventana de abajo entera.
import { chromium } from "playwright-core";

let malas = 0;
const ok = (c, m) => {
  console.log(c ? `✓ ${m}` : `✗ ${m}`);
  if (!c) malas++;
};

const b = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
p.on("pageerror", (e) => console.log("PAGEERROR: " + e.message));

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1500);
await p.evaluate(() =>
  [...document.querySelectorAll("button")].find((x) => x.textContent.includes("MARKETPLACE")).click());
await p.waitForTimeout(1200);

const cuenta = () => p.evaluate(() => document.querySelector(".hub-cuenta")?.textContent ?? "");
const activa = () => p.evaluate(() =>
  document.querySelector(".hub-tab.activa")?.dataset.rec ?? "");
const puesta = () => p.evaluate(() =>
  document.querySelector(".hub-tab.puesta")?.dataset.rec ?? "");
const desplazado = () => p.evaluate(() => document.querySelector(".hub-carrusel").scrollLeft);
const visible = (sel) => p.evaluate((s) => {
  const n = document.querySelector(s);
  return !!n && !n.classList.contains("oculto");
}, sel);
const pestana = async (id) => {
  await p.evaluate((s) => document.querySelector(`.hub-tab[data-rec="${s}"]`).click(), id);
  await p.waitForTimeout(700);
};
const lamina = async (id) => {
  await p.evaluate((s) => document.querySelector(`.hub-diapo[data-rec="${s}"] .hub-banner`).click(), id);
  await p.waitForTimeout(700);
};

// ---- Estado de partida: mirando la primera, sin nada puesto
const total = await cuenta();
ok(/35 de 35|35 of 35/.test(total), `abre con el mercado entero (${total})`);
ok((await activa()) === "newarrivals", "abre mirando NewArrivals");
ok((await puesta()) === "", "abre sin ningún recorrido puesto");

// ---- 1. La pestaña MUEVE y no filtra
await pestana("community");
ok((await activa()) === "community", "la pestaña mueve el carrusel");
ok((await cuenta()) === total, `la pestaña NO toca el mercado (${await cuenta()})`);
ok((await puesta()) === "", "la pestaña no pone ningún recorrido");
ok((await desplazado()) > 0, "la pestaña desplaza el carril de verdad");

// ---- 2. La lámina ENTRA
await lamina("community");
const conFiltro = await cuenta();
ok(conFiltro !== total, `la lámina sí filtra el mercado (${conFiltro})`);
ok((await puesta()) === "community", "la lámina deja la pestaña marcada como puesta");
ok(await visible(".hub-marbete"), "aparece el marbete para quitarlo");

// ---- 3. Volver a pulsarla lo quita
await lamina("community");
ok((await cuenta()) === total, "pulsar otra vez la lámina quita el filtro");
ok((await puesta()) === "", "y desmarca la pestaña");

// ---- 4. Pulsar una lámina que no está delante solo la trae delante
await lamina("newcomers");
ok((await activa()) === "newcomers", "pulsar una lámina de lado la centra");
ok((await cuenta()) === total, "y no entra: centrarla no es entrar");

// ---- 5. El marbete también lo quita
await lamina("newcomers");
ok((await cuenta()) !== total, `ya centrada, la lámina sí filtra (${await cuenta()})`);
await p.evaluate(() => document.querySelector(".hub-marbete").click());
await p.waitForTimeout(600);
ok((await cuenta()) === total, "el marbete devuelve el mercado entero");
ok(!(await visible(".hub-marbete")), "y el marbete se apaga");

// ---- 6. Arrastre con el cursor
//
// Los pasos de arriba dejan la página desplazada hacia el mercado, así que
// primero hay que subir: el ratón se mueve por coordenadas de ventana y sobre
// un carrusel que no se ve no se puede arrastrar nada.
await pestana("newarrivals");
await p.evaluate(() => { document.querySelector(".hub").scrollTop = 0; });
await p.waitForTimeout(600);
const antes = await desplazado();
const caja = await p.evaluate(() => {
  const r = document.querySelector(".hub-carrusel").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
});
await p.mouse.move(caja.x, caja.y);
await p.mouse.down();
// Se tira de más de media lámina: por debajo de eso el carrusel vuelve a su
// sitio al soltar, que es lo que tiene que hacer.
const tiron = Math.round(caja.w * 0.62);
for (let i = 1; i <= 12; i++) await p.mouse.move(caja.x - (tiron * i) / 12, caja.y);
const enVuelo = await desplazado();
ok(enVuelo > antes + 100, `el carrusel sigue al cursor (${antes} → ${enVuelo})`);
await p.mouse.up();
await p.waitForTimeout(900);
ok((await activa()) === "newcomers", `al soltar se ajusta a la siguiente (${await activa()})`);

// ---- 7. Arrastrar no es pulsar
ok((await puesta()) === "", "arrastrar NO entra en el recorrido");
ok((await cuenta()) === total, "y por tanto no toca el mercado");

// Y el clic siguiente NO se pierde: el carril solo se traga el que cierra el
// arrastre. Aquí es donde se cazó el fallo de v0.2.62. El arrastre dejó el
// carrusel en NewComers, así que esa es la lámina que está delante.
await p.evaluate(() => { document.querySelector(".hub").scrollTop = 0; });
await p.waitForTimeout(300);
await lamina("newcomers");
ok((await puesta()) === "newcomers", "tras arrastrar, el clic siguiente sí entra");
await lamina("newcomers");
ok((await puesta()) === "", "y el de después lo quita");

// ---- 7b. Arrastre FANTASMA: soltar el botón fuera del carrusel no puede dejar
// el gesto abierto. Antes de v0.2.65, el siguiente paseo del ratón —sin pulsar
// nada— arrastraba el carril y dejaba el imán apagado para siempre.
await p.evaluate(() => { document.querySelector(".hub").scrollTop = 0; });
await p.waitForTimeout(400);
const c2 = await p.evaluate(() => {
  const r = document.querySelector(".hub-carrusel").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, abajo: r.bottom + 80 };
});
const slAntes = await desplazado();
await p.mouse.move(c2.x, c2.y);
await p.mouse.down();
await p.mouse.move(c2.x, c2.abajo); // solo vertical: no cruza el umbral
await p.mouse.up();                 // se suelta FUERA del carrusel
await p.waitForTimeout(300);
await p.mouse.move(c2.x - 300, c2.y); // paseo sin pulsar
await p.mouse.move(c2.x - 600, c2.y);
await p.waitForTimeout(300);
ok((await desplazado()) === slAntes, "pasear el ratón suelto no arrastra el carrusel");
ok(
  !(await p.evaluate(() => document.querySelector(".hub-carrusel").classList.contains("arrastrando"))),
  "y no deja la clase de arrastre pegada",
);

// ---- 7c. La lámina entra aunque se pulse con el carrusel aún deslizándose.
await p.evaluate(() => document.querySelector('.hub-tab[data-rec="community"]').click());
await p.waitForTimeout(120); // a mitad de la animación
await p.evaluate(() => document.querySelector('.hub-diapo[data-rec="community"] .hub-banner').click());
await p.waitForTimeout(900);
ok((await puesta()) === "community", `pulsar a media animación entra en el recorrido PEDIDO (${await puesta()})`);
await lamina("community");
ok((await puesta()) === "", "y se deshace");

// ---- 7. OnDemand cambia la ventana de abajo
await pestana("ondemand");
await lamina("ondemand");
ok(!(await visible(".hub-mercado")), "OnDemand esconde el mercado");
ok(await visible(".hub-ondemand"), "OnDemand enseña su panel");
ok(!(await visible(".hub-formakers")), "y no el de ForMakers");
const abiertos = await p.evaluate(() => document.querySelectorAll(".od-chip").length);
ok(abiertos === 8, `OnDemand ofrece los 8 diseños abiertos (${abiertos})`);

// La vista previa se repinta al cambiar de color y al grabar texto.
const svg0 = await p.evaluate(() => document.querySelector(".od-lienzo").innerHTML);
await p.evaluate(() => document.querySelectorAll(".od-swatch")[4].click());
await p.waitForTimeout(300);
const svg1 = await p.evaluate(() => document.querySelector(".od-lienzo").innerHTML);
ok(svg0 !== svg1, "cambiar de color repinta la vista previa");
await p.fill(".od-letras", "LA ESQUINA");
await p.waitForTimeout(400);
const svg2 = await p.evaluate(() => document.querySelector(".od-lienzo").innerHTML);
ok(svg2.includes("LA ESQUINA"), "el grabado aparece sobre el equipo");

// El total sube al marcar una pieza extra.
const t0 = await p.evaluate(() => document.querySelector(".od-total-cifra").textContent);
await p.evaluate(() => document.querySelector(".od-check").click());
await p.waitForTimeout(300);
const t1 = await p.evaluate(() => document.querySelector(".od-total-cifra").textContent);
ok(t0 !== t1, `la pieza extra sube el total (${t0} → ${t1})`);

await p.evaluate(() => document.querySelector(".hub").scrollTop = 0);
await p.waitForTimeout(300);
await p.screenshot({ path: "hub-5-ondemand.png" });
await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-ondemand").offsetTop - 64;
});
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-6-ondemand-taller.png" });
await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".od-seccion").offsetTop - 64;
});
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-7-ondemand-solicitudes.png" });

// ---- 8. ForMakers
await p.evaluate(() => document.querySelector(".hub").scrollTop = 0);
await pestana("formakers");
await lamina("formakers");
ok(!(await visible(".hub-mercado")), "ForMakers esconde el mercado");
ok(await visible(".hub-formakers"), "ForMakers enseña su panel");
ok(!(await visible(".hub-ondemand")), "y esconde el de OnDemand");
const visibles = () => p.evaluate(() =>
  [...document.querySelectorAll(".fm-proyecto")].filter((n) => !n.classList.contains("oculto")).length);
const proyectos = await visibles();
ok(proyectos === 5, `ForMakers lista los 5 proyectos (${proyectos})`);
const barras = await p.evaluate(() => document.querySelectorAll(".fm-barra-relleno").length);
ok(barras === 2, `dos proyectos llevan barra de financiación (${barras})`);

await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-formakers").offsetTop - 64;
});
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-8-formakers.png" });

// El filtro por etiqueta del foro NO puede borrar lo que el usuario hizo
// encima: se apoya un proyecto, se filtra y se vuelve, y el apoyo sigue ahí.
await p.evaluate(() => document.querySelector(".fm-apoyo").click());
await p.waitForTimeout(200);
const apoyado = await p.evaluate(() => document.querySelector(".fm-apoyo").textContent);
ok(/185/.test(apoyado), `el apoyo sube en vivo (${apoyado})`);

await p.evaluate(() => [...document.querySelectorAll(".fm-chip")]
  .find((c) => /patrocinio|sponsorship/i.test(c.textContent)).click());
await p.waitForTimeout(500);
const soloPatro = await visibles();
ok(soloPatro === 2, `el filtro de patrocinio deja 2 proyectos (${soloPatro})`);

await p.evaluate(() => [...document.querySelectorAll(".fm-chip")]
  .find((c) => /todo el foro|whole forum/i.test(c.textContent)).click());
await p.waitForTimeout(400);
ok((await visibles()) === 5, "volver a «todo el foro» los devuelve los cinco");
ok(
  /185/.test(await p.evaluate(() => document.querySelector(".fm-apoyo").textContent)),
  "y el apoyo dado sigue puesto: filtrar no rehace las fichas",
);

// ---- 9. Volver al mercado
await p.evaluate(() => document.querySelector(".hub").scrollTop = 0);
await lamina("formakers");
ok(await visible(".hub-mercado"), "volver a pulsar la lámina devuelve el mercado");
ok(!(await visible(".hub-formakers")), "y esconde ForMakers");
ok((await cuenta()) === total, "con el catálogo entero");

// ---- Vistas de arriba y del mercado
await p.evaluate(() => document.querySelector(".hub").scrollTop = 0);
await p.waitForTimeout(300);
await p.screenshot({ path: "hub-1-arriba.png" });
await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-recorridos").offsetTop - 64;
});
await p.waitForTimeout(300);
await p.screenshot({ path: "hub-2-recorridos.png" });
await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-mercado").offsetTop - 64;
});
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-3-mercado.png" });
await p.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-unirse").offsetTop - 64;
});
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-4-unirse.png" });

// ---- 10. La cabecera pegajosa no puede taparle el título a la ventana que se
// acaba de abrir: el contenedor de scroll necesita `scroll-padding-top`.
await p.evaluate(() => document.querySelector('.hub-tab[data-rec="ondemand"]').click());
await p.waitForTimeout(700);
await lamina("ondemand");
await p.waitForTimeout(900);
const encaje = await p.evaluate(() => {
  const cab = document.querySelector(".hub-cabecera").getBoundingClientRect();
  const tit = document.querySelector(".hub-ondemand .hub-titulo").getBoundingClientRect();
  return { cabecera: Math.round(cab.bottom), titulo: Math.round(tit.top) };
});
ok(
  encaje.titulo >= encaje.cabecera,
  `el título queda BAJO la cabecera, no detrás (cabecera ${encaje.cabecera}, título ${encaje.titulo})`,
);

// ---- 11. Los campos de texto del hub no pueden salir con la piel del Builder.
const piel = await p.evaluate(() => {
  const i = document.querySelector(".od-letras");
  const s = getComputedStyle(i);
  return { fondo: s.backgroundColor, alto: Math.round(i.getBoundingClientRect().height) };
});
ok(piel.fondo === "rgb(13, 13, 13)", `el campo de texto lleva el fondo del hub (${piel.fondo})`);
ok(piel.alto >= 36, `y la altura de sus hermanos (${piel.alto} px)`);

// ---- 12. La casilla que decide el precio tiene que verse al tabular.
const foco = await p.evaluate(() => {
  const c = document.querySelector(".od-check");
  c.focus();
  const s = getComputedStyle(c);
  return { estilo: s.outlineStyle, ancho: s.outlineWidth };
});
ok(foco.estilo !== "none" && foco.ancho !== "0px", `la casilla marca el foco (${foco.estilo} ${foco.ancho})`);

// ---- 13 y 14. La cabecera en pantallas estrechas: ni se parte en dos líneas
// ni desborda. 360 px es el ancho más común de un Android, que es el destino.
for (const ancho of [360, 320]) {
  await p.setViewportSize({ width: ancho, height: 800 });
  await p.waitForTimeout(400);
  const cab = await p.evaluate(() => {
    const h = document.querySelector(".hub");
    const c = document.querySelector(".hub-cabecera");
    return {
      alto: Math.round(c.getBoundingClientRect().height),
      desborde: h.scrollWidth - h.clientWidth,
    };
  });
  ok(cab.alto <= 80, `a ${ancho} px la cabecera no engorda (${cab.alto} px)`);
  ok(cab.desborde <= 0, `a ${ancho} px el hub no gana barra horizontal (${cab.desborde})`);
}
await p.setViewportSize({ width: 1280, height: 1000 });
await p.waitForTimeout(300);

// ---- Teléfono
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on("pageerror", (e) => console.log("PAGEERROR movil: " + e.message));
await m.goto("http://127.0.0.1:4174/");
await m.waitForTimeout(1500);
await m.evaluate(() =>
  [...document.querySelectorAll("button")].find((x) => x.textContent.includes("MARKETPLACE")).click());
await m.waitForTimeout(1200);
await m.screenshot({ path: "hub-9-movil.png" });

// El carril de marcas solo desborda cuando la pantalla es estrecha; en 1280 px
// las siete burbujas caben y no hay nada que arrastrar. Aquí sí.
const cajaH = await m.evaluate(() => {
  const c = document.querySelector(".hub-carril");
  c.scrollLeft = 0;
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, desborda: c.scrollWidth > c.clientWidth };
});
ok(cajaH.desborda, "en el teléfono el carril de marcas desborda");
await m.mouse.move(cajaH.x, cajaH.y);
await m.mouse.down();
for (let i = 1; i <= 8; i++) await m.mouse.move(cajaH.x - i * 22, cajaH.y);
const enVueloH = await m.evaluate(() => document.querySelector(".hub-carril").scrollLeft);
await m.mouse.up();
await m.waitForTimeout(400);
ok(enVueloH > 120, `el carril de marcas se arrastra de verdad (0 → ${enVueloH})`);
ok(
  (await m.evaluate(() => document.querySelector("#hub-marca").value)) === "",
  "y arrastrarlo no filtra por la marca que quedó bajo el cursor",
);

await m.evaluate(() => { document.querySelector(".hub").scrollTop = 0; });
await m.evaluate(() => document.querySelector('.hub-diapo[data-rec="newarrivals"] .hub-banner').click());
await m.waitForTimeout(900);
await m.screenshot({ path: "hub-10-movil-mercado.png" });
await m.evaluate(() => { document.querySelector(".hub").scrollTop = 0; });
await m.evaluate(() => document.querySelector('.hub-tab[data-rec="ondemand"]').click());
await m.waitForTimeout(700);
await m.evaluate(() => document.querySelector('.hub-diapo[data-rec="ondemand"] .hub-banner').click());
await m.waitForTimeout(900);
await m.evaluate(() => {
  const h = document.querySelector(".hub");
  h.scrollTop = document.querySelector(".hub-ondemand").offsetTop - 56;
});
await m.waitForTimeout(400);
await m.screenshot({ path: "hub-11-movil-ondemand.png" });

console.log(malas === 0 ? "\nTODO EN VERDE" : `\n❌ ${malas} fallo(s)`);
await b.close();
