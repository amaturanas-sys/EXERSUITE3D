// Vistas previas del hub nuevo.
import { chromium } from "playwright-core";
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
await p.waitForTimeout(1500);

const cuenta = () => p.evaluate(() => document.querySelector(".hub-cuenta")?.textContent);
const aTope = (sel) => p.evaluate((s) => {
  const hub = document.querySelector(".hub");
  hub.scrollTop = s === null ? 0 : document.querySelector(s).offsetTop - 64;
}, sel);

console.log("pestañas:", await p.evaluate(() =>
  [...document.querySelectorAll(".hub-tab")].map((t) => t.textContent)));
console.log("cuenta inicial:", await cuenta());
for (const t of ["newcomers", "community", "ondemand", "formakers"]) {
  await p.evaluate((s) => document.querySelector(`.hub-tab[data-rec="${s}"]`).click(), t);
  await p.waitForTimeout(400);
  console.log(`${t.padEnd(12)} -> ${await cuenta()}`);
}
await p.evaluate(() => document.querySelector('.hub-tab[data-rec="newarrivals"]').click());
await p.waitForTimeout(500);

const alto = await p.evaluate(() => document.querySelector(".hub").scrollHeight);
console.log("alto total del hub:", alto);

await aTope(null);
await p.waitForTimeout(300);
await p.screenshot({ path: "hub-1-arriba.png" });
await aTope(".hub-recorridos");
await p.waitForTimeout(300);
await p.screenshot({ path: "hub-2-recorridos.png" });
await aTope(".hub-mercado");
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-3-mercado.png" });
await aTope(".hub-unirse");
await p.waitForTimeout(400);
await p.screenshot({ path: "hub-4-unirse.png" });

// El mismo hub en un teléfono, que es donde corre el APK.
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on("pageerror", (e) => console.log("PAGEERROR movil: " + e.message));
await m.goto("http://127.0.0.1:4174/");
await m.waitForTimeout(1500);
await m.evaluate(() =>
  [...document.querySelectorAll("button")].find((x) => x.textContent.includes("MARKETPLACE")).click());
await m.waitForTimeout(1500);
await m.screenshot({ path: "hub-5-movil.png" });
await m.evaluate(() => {
  const hub = document.querySelector(".hub");
  hub.scrollTop = document.querySelector(".hub-mercado").offsetTop - 56;
});
await m.waitForTimeout(400);
await m.screenshot({ path: "hub-6-movil-mercado.png" });
await b.close();
