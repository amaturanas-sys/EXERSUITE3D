// Comprueba que las cadenas extraidas del fuente son las que se PINTAN.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const esperadas = JSON.parse(readFileSync(process.argv[2], "utf8"));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1280,height:900}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1500);
const enDom = new Set(await page.evaluate(() => {
  const s = []; const anda = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) s.push(t); return; }
    if (n.nodeType === 1) for (const h of n.childNodes) anda(h);
  }; anda(document.body); return s;
}));
const faltan = esperadas.filter((x) => !enDom.has(x));
console.log(`${esperadas.length - faltan.length}/${esperadas.length} cadenas del fuente aparecen tal cual en el DOM`);
for (const f of faltan.slice(0, 6)) console.log("  NO CASA: " + f.slice(0, 90));
await b.close();
