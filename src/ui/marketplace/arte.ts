/**
 * MARKETPLACE · ARTE (v0.2.37)
 *
 * Ilustraciones SVG autocontenidas del hub: fichas de producto (viewBox
 * 200×130) y monogramas de marca (viewBox 64×64) que hacen de avatar en la
 * fila de historias. Todo va inline: la maqueta no depende de ningún archivo
 * externo ni de la red.
 *
 * Cuando una marca real entra al hub, su ficha se sustituye por el modelo de
 * alta fidelidad levantado con escáner fotográfico; estos dibujos son el
 * marcador de posición mientras tanto.
 */

// ---- Paleta de las ilustraciones de producto
export const F = "#3a4048"; // acero estructural
export const D = "#22262c"; // acero oscuro
export const C = "#c9ced6"; // cromo
export const R = "#c22d2d"; // acento rojo (tapiz/goma)
export const G = "#8a929c"; // gris medio

/** Fila de agujeros de pinholes para las ilustraciones. */
export function agujeros(cx: number, y0: number, n: number, paso = 11): string {
  let s = "";
  for (let i = 0; i < n; i++) s += `<circle cx="${cx}" cy="${y0 + i * paso}" r="1.8" fill="${D}"/>`;
  return s;
}

/** Cadena esquemática: eslabones alternados sobre una curva. */
export function cadenita(x0: number, y0: number, x1: number, y1: number, comba: number, n = 9): string {
  let s = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + 4 * comba * t * (1 - t);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${i % 2 ? 5 : 3.2}" ry="${i % 2 ? 3.2 : 5}" fill="none" stroke="${G}" stroke-width="2.8"/>`;
  }
  return s;
}

export const ARTE: Record<string, string> = {
  rack: `
    <rect x="46" y="112" width="44" height="6" rx="3" fill="${F}"/>
    <rect x="112" y="112" width="44" height="6" rx="3" fill="${F}"/>
    <rect x="60" y="18" width="10" height="96" rx="2" fill="${F}"/>
    <rect x="132" y="18" width="10" height="96" rx="2" fill="${F}"/>
    <rect x="54" y="10" width="94" height="9" rx="4" fill="${D}"/>
    ${agujeros(65, 32, 7)}${agujeros(137, 32, 7)}
    <path d="M70 58 h12 v9 h-7" fill="none" stroke="${R}" stroke-width="5" stroke-linecap="round"/>
    <path d="M132 58 h-12 v9 h7" fill="none" stroke="${R}" stroke-width="5" stroke-linecap="round"/>`,
  jota: `
    <rect x="64" y="22" width="18" height="88" rx="3" fill="${F}"/>
    ${agujeros(73, 34, 7)}
    <rect x="82" y="56" width="14" height="26" rx="3" fill="${D}"/>
    <path d="M96 62 h30 v24 h-14" fill="none" stroke="${D}" stroke-width="9" stroke-linecap="round"/>
    <rect x="98" y="74" width="30" height="13" rx="6.5" fill="${C}"/>
    <circle cx="89" cy="66" r="4" fill="${C}"/>`,
  cadenas: `
    ${cadenita(34, 38, 166, 38, 18)}
    ${cadenita(34, 72, 166, 72, 18)}
    <circle cx="30" cy="38" r="6" fill="${R}"/><circle cx="170" cy="38" r="6" fill="${R}"/>
    <circle cx="30" cy="72" r="6" fill="${R}"/><circle cx="170" cy="72" r="6" fill="${R}"/>`,
  torre: `
    <rect x="70" y="112" width="64" height="6" rx="3" fill="${F}"/>
    <rect x="78" y="12" width="9" height="102" rx="2" fill="${F}"/>
    <rect x="116" y="12" width="9" height="102" rx="2" fill="${F}"/>
    <rect x="74" y="6" width="55" height="8" rx="4" fill="${D}"/>
    <circle cx="101" cy="18" r="8" fill="none" stroke="${C}" stroke-width="3.4"/>
    <line x1="101" y1="26" x2="101" y2="52" stroke="${C}" stroke-width="2.4"/>
    <rect x="88" y="52" width="27" height="52" rx="3" fill="${D}"/>
    <line x1="88" y1="61" x2="115" y2="61" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="70" x2="115" y2="70" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="79" x2="115" y2="79" stroke="${G}" stroke-width="1.6"/>
    <line x1="88" y1="88" x2="115" y2="88" stroke="${G}" stroke-width="1.6"/>
    <rect x="84" y="56" width="35" height="6" rx="3" fill="${R}"/>`,
  multigrip: `
    <rect x="18" y="58" width="164" height="7" rx="3.5" fill="${C}"/>
    <rect x="30" y="52" width="9" height="19" rx="3" fill="${D}"/>
    <rect x="161" y="52" width="9" height="19" rx="3" fill="${D}"/>
    <path d="M78 58 l10 -16 h24 l10 16" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/>
    <path d="M86 58 l7 -10 h14 l7 10" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 65 q8 14 20 14 M140 65 q-8 14 -20 14" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/>`,
  banco: `
    <rect x="24" y="44" width="152" height="17" rx="6" fill="${R}"/>
    <rect x="42" y="62" width="112" height="8" rx="3" fill="${F}"/>
    <path d="M54 70 v16 q0 7 -8 9 l-14 4" fill="none" stroke="${F}" stroke-width="8" stroke-linecap="round"/>
    <rect x="22" y="98" width="38" height="7" rx="3" fill="${F}"/>
    <path d="M142 72 q18 5 19 20 q0 10 -9 11 M142 72 q-18 5 -19 20 q0 10 9 11" fill="none" stroke="${F}" stroke-width="7" stroke-linecap="round"/>
    <rect x="112" y="101" width="26" height="6" rx="3" fill="${F}"/>
    <rect x="144" y="101" width="26" height="6" rx="3" fill="${F}"/>`,
  barra: `
    <rect x="12" y="62" width="176" height="6" rx="3" fill="${C}"/>
    <rect x="24" y="55" width="26" height="20" rx="4" fill="${C}"/>
    <rect x="150" y="55" width="26" height="20" rx="4" fill="${C}"/>
    <rect x="50" y="57" width="7" height="16" rx="2" fill="${D}"/>
    <rect x="143" y="57" width="7" height="16" rx="2" fill="${D}"/>
    <line x1="66" y1="65" x2="134" y2="65" stroke="${G}" stroke-width="1.2" stroke-dasharray="2 3"/>`,
  discos: `
    <line x1="16" y1="112" x2="184" y2="112" stroke="${G}" stroke-width="2"/>
    <circle cx="70" cy="72" r="40" fill="${D}"/>
    <circle cx="70" cy="72" r="8" fill="${C}"/>
    <circle cx="122" cy="80" r="32" fill="${R}"/>
    <circle cx="122" cy="80" r="6.5" fill="${C}"/>
    <circle cx="162" cy="88" r="24" fill="${F}"/>
    <circle cx="162" cy="88" r="5" fill="${C}"/>`,
  arbol: `
    <rect x="70" y="108" width="64" height="7" rx="3" fill="${F}"/>
    <rect x="97" y="18" width="10" height="92" rx="3" fill="${F}"/>
    <rect x="60" y="40" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="106" y="40" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="60" y="72" width="38" height="6" rx="3" fill="${D}"/>
    <rect x="106" y="72" width="38" height="6" rx="3" fill="${D}"/>
    <circle cx="66" cy="43" r="11" fill="${D}"/><circle cx="66" cy="43" r="3" fill="${C}"/>
    <circle cx="138" cy="43" r="11" fill="${R}"/><circle cx="138" cy="43" r="3" fill="${C}"/>
    <circle cx="66" cy="75" r="11" fill="${F}"/><circle cx="66" cy="75" r="3" fill="${C}"/>`,
  quimera: `
    <rect x="46" y="22" width="86" height="86" rx="5" fill="none" stroke="${G}" stroke-width="2.4" stroke-dasharray="6 4"/>
    <path d="M60 88 v-30 h20 v14 h22 v16" fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="146" cy="46" r="17" fill="none" stroke="${R}" stroke-width="5"/>
    <path d="M146 29 v-8 M146 63 v8 M129 46 h-8 M163 46 h8 M134 34 l-6 -6 M158 58 l6 6 M158 34 l6 -6 M134 58 l-6 6" stroke="${R}" stroke-width="4" stroke-linecap="round"/>`,

  // ---- v0.2.37: fichas de las marcas nuevas del hub
  mancuernas: `
    <line x1="16" y1="106" x2="184" y2="106" stroke="${G}" stroke-width="2"/>
    <rect x="46" y="60" width="52" height="9" rx="4" fill="${C}"/>
    <rect x="34" y="46" width="16" height="37" rx="5" fill="${D}"/>
    <rect x="94" y="46" width="16" height="37" rx="5" fill="${D}"/>
    <rect x="24" y="53" width="12" height="23" rx="4" fill="${F}"/>
    <rect x="108" y="53" width="12" height="23" rx="4" fill="${F}"/>
    <rect x="126" y="84" width="34" height="7" rx="3.5" fill="${C}"/>
    <rect x="118" y="74" width="12" height="27" rx="4" fill="${D}"/>
    <rect x="156" y="74" width="12" height="27" rx="4" fill="${D}"/>`,
  kettlebell: `
    <path d="M78 56 q0 -30 22 -30 q22 0 22 30" fill="none" stroke="${F}" stroke-width="9" stroke-linecap="round"/>
    <path d="M70 58 q30 -12 60 0 q22 12 18 34 q-5 24 -48 24 q-43 0 -48 -24 q-4 -22 18 -34 z" fill="${D}"/>
    <ellipse cx="100" cy="60" rx="30" ry="7" fill="${F}"/>
    <text x="100" y="98" font-size="22" font-weight="700" text-anchor="middle" fill="${C}" font-family="sans-serif">24</text>`,
  trineo: `
    <line x1="14" y1="112" x2="186" y2="112" stroke="${G}" stroke-width="2"/>
    <rect x="40" y="98" width="120" height="10" rx="4" fill="${F}"/>
    <rect x="86" y="34" width="12" height="66" rx="4" fill="${F}"/>
    <circle cx="92" cy="52" r="26" fill="none" stroke="${D}" stroke-width="9"/>
    <circle cx="92" cy="76" r="26" fill="none" stroke="${R}" stroke-width="9"/>
    <path d="M150 98 l24 -22 M150 98 l24 6" stroke="${C}" stroke-width="6" stroke-linecap="round"/>`,
  smith: `
    <rect x="40" y="112" width="120" height="6" rx="3" fill="${F}"/>
    <rect x="52" y="10" width="11" height="104" rx="3" fill="${F}"/>
    <rect x="137" y="10" width="11" height="104" rx="3" fill="${F}"/>
    <rect x="46" y="4" width="108" height="8" rx="4" fill="${D}"/>
    <rect x="34" y="58" width="132" height="7" rx="3.5" fill="${C}"/>
    <rect x="49" y="52" width="17" height="19" rx="4" fill="${R}"/>
    <rect x="134" y="52" width="17" height="19" rx="4" fill="${R}"/>
    ${agujeros(57.5, 22, 6, 13)}${agujeros(142.5, 22, 6, 13)}`,
  prensa: `
    <line x1="14" y1="114" x2="186" y2="114" stroke="${G}" stroke-width="2"/>
    <path d="M30 110 L58 62 L104 62 L78 110 z" fill="${R}"/>
    <rect x="96" y="34" width="66" height="10" rx="4" fill="${F}" transform="rotate(28 129 39)"/>
    <rect x="140" y="26" width="12" height="60" rx="4" fill="${D}"/>
    <circle cx="146" cy="34" r="16" fill="${D}"/><circle cx="146" cy="34" r="4" fill="${C}"/>
    <rect x="24" y="104" width="140" height="8" rx="4" fill="${F}"/>`,
  bandas: `
    <path d="M40 30 q60 40 0 70" fill="none" stroke="${R}" stroke-width="8" stroke-linecap="round"/>
    <path d="M62 26 q66 46 0 78" fill="none" stroke="${F}" stroke-width="8" stroke-linecap="round"/>
    <path d="M84 22 q72 52 0 86" fill="none" stroke="${G}" stroke-width="8" stroke-linecap="round"/>
    <rect x="140" y="40" width="14" height="50" rx="7" fill="${D}"/>
    <rect x="160" y="52" width="14" height="26" rx="7" fill="${C}"/>`,
  plataforma: `
    <rect x="18" y="70" width="164" height="34" rx="5" fill="${D}"/>
    <rect x="66" y="62" width="68" height="42" rx="4" fill="${F}"/>
    <line x1="76" y1="66" x2="76" y2="100" stroke="${G}" stroke-width="2"/>
    <line x1="90" y1="66" x2="90" y2="100" stroke="${G}" stroke-width="2"/>
    <line x1="110" y1="66" x2="110" y2="100" stroke="${G}" stroke-width="2"/>
    <line x1="124" y1="66" x2="124" y2="100" stroke="${G}" stroke-width="2"/>
    <rect x="18" y="62" width="48" height="9" rx="4" fill="${R}"/>
    <rect x="134" y="62" width="48" height="9" rx="4" fill="${R}"/>`,
  jaula: `
    <rect x="26" y="110" width="148" height="7" rx="3" fill="${F}"/>
    <rect x="38" y="16" width="10" height="96" rx="3" fill="${F}"/>
    <rect x="152" y="16" width="10" height="96" rx="3" fill="${F}"/>
    <rect x="95" y="16" width="10" height="96" rx="3" fill="${G}"/>
    <rect x="32" y="8" width="136" height="9" rx="4" fill="${D}"/>
    ${agujeros(43, 30, 6, 13)}${agujeros(157, 30, 6, 13)}
    <circle cx="70" cy="24" r="7" fill="none" stroke="${C}" stroke-width="3"/>
    <circle cx="130" cy="24" r="7" fill="none" stroke="${C}" stroke-width="3"/>
    <line x1="70" y1="31" x2="70" y2="70" stroke="${C}" stroke-width="2.2"/>
    <line x1="130" y1="31" x2="130" y2="70" stroke="${C}" stroke-width="2.2"/>`,
  escaner: `
    <rect x="52" y="30" width="96" height="70" rx="6" fill="none" stroke="${G}" stroke-width="2.4" stroke-dasharray="7 5"/>
    <path d="M70 92 v-26 h18 v12 h20 v14" fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="20" r="10" fill="${D}"/><circle cx="100" cy="20" r="4" fill="${R}"/>
    <path d="M100 30 L64 62 M100 30 L136 62" stroke="${R}" stroke-width="2" stroke-dasharray="4 4"/>
    <rect x="40" y="100" width="120" height="6" rx="3" fill="${F}"/>`,
};

/**
 * Monogramas de marca (viewBox 64×64): hacen de avatar en la fila de
 * historias y en la cabecera de cada ficha de marca.
 */
export const LOGOS: Record<string, string> = {
  ironforge: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#22262c"/>
    <path d="M22 44 L32 18 L42 44" fill="none" stroke="#e0a03a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="26" y1="36" x2="38" y2="36" stroke="#e0a03a" stroke-width="4" stroke-linecap="round"/>`,
  andes: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#123243"/>
    <path d="M14 46 L26 26 L34 38 L42 22 L52 46 z" fill="#5fc6d8"/>
    <path d="M26 26 L30 32 L22 32 z" fill="#eaf6f8"/>`,
  quimera: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#2a1d1d"/>
    <circle cx="32" cy="32" r="13" fill="none" stroke="#c22d2d" stroke-width="4"/>
    <path d="M32 15 v-4 M32 53 v4 M15 32 h-4 M53 32 h4" stroke="#c22d2d" stroke-width="4" stroke-linecap="round"/>`,
  nordwerk: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#1b2430"/>
    <path d="M22 44 V20 L42 44 V20" fill="none" stroke="#9fc7ff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`,
  pampa: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#1e2a1c"/>
    <circle cx="32" cy="27" r="9" fill="#f0c44a"/>
    <path d="M12 46 q20 -12 40 0" fill="none" stroke="#8fbf6a" stroke-width="5" stroke-linecap="round"/>`,
  kaizen: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#241a1a"/>
    <circle cx="32" cy="32" r="14" fill="#d9534f"/>
    <path d="M24 32 h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  terrafit: `<rect x="10" y="10" width="44" height="44" rx="8" fill="#2b2116"/>
    <path d="M32 14 L48 32 L32 50 L16 32 z" fill="none" stroke="#e8a35a" stroke-width="4.5" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="5" fill="#e8a35a"/>`,
};
