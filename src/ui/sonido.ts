/**
 * Sonido de "click" de la interfaz (v0.2.3): un tic corto y discreto al
 * interactuar con cualquier botón. Se genera con WebAudio (sin assets) y el
 * contexto se crea perezosamente en el primer gesto del usuario.
 */

let ctx: AudioContext | null = null;

function tic(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.02);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    /* sin audio disponible: silencio */
  }
}

/** Instala el click global: suena para todo <button> (una sola vez por app). */
export function instalarSonidoUI(): void {
  document.addEventListener(
    "click",
    (e) => {
      const objetivo = e.target as HTMLElement | null;
      if (objetivo?.closest("button")) tic();
    },
    { capture: true },
  );
}
