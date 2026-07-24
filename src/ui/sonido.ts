/**
 * Sonido de "click" de la interfaz (v0.2.6): emula el chasquido del botón de
 * un ratón de computador clásico — el "clic" seco del microinterruptor (una
 * ráfaga brevísima de ruido filtrado) más el golpecito grave del plástico.
 * Se genera con WebAudio (sin assets) y el contexto se crea perezosamente en
 * el primer gesto del usuario.
 */

let ctx: AudioContext | null = null;

function tic(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;

    // 1) Chasquido del microinterruptor: ruido muy corto con caída brusca,
    //    filtrado en la banda del "clic" mecánico.
    const dur = 0.028;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.11));
    const ruido = ctx.createBufferSource();
    ruido.buffer = buf;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "bandpass";
    filtro.frequency.value = 4300;
    filtro.Q.value = 1.1;
    const gRuido = ctx.createGain();
    gRuido.gain.setValueAtTime(0.35, t);
    ruido.connect(filtro).connect(gRuido).connect(ctx.destination);
    ruido.start(t);

    // 2) Cuerpo del botón: golpecito grave, seco y muy breve.
    const osc = ctx.createOscillator();
    const gOsc = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(310, t);
    osc.frequency.exponentialRampToValueAtTime(170, t + 0.02);
    gOsc.gain.setValueAtTime(0.1, t);
    gOsc.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    osc.connect(gOsc).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
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
