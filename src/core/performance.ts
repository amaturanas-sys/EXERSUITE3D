/**
 * Ajustes de rendimiento de render, persistidos en localStorage. Permiten
 * aliviar equipos/tablets con poca potencia reduciendo resolución, sombras,
 * reflejos de entorno y antialias.
 */
export type PerfPreset = "alto" | "medio" | "bajo" | "custom";

export interface PerfSettings {
  preset: PerfPreset;
  /** Límite de densidad de píxeles (menor = más rápido). */
  maxPixelRatio: number;
  shadows: boolean;
  environment: boolean;
  /** Antialias del renderer: solo se aplica al abrir un proyecto. */
  antialias: boolean;
}

const KEY = "exersuite.perf.v1";

export const PERF_PRESETS: Record<Exclude<PerfPreset, "custom">, Omit<PerfSettings, "preset">> = {
  alto: { maxPixelRatio: 2, shadows: true, environment: true, antialias: true },
  medio: { maxPixelRatio: 1.25, shadows: true, environment: true, antialias: false },
  bajo: { maxPixelRatio: 1, shadows: false, environment: false, antialias: false },
};

function defaults(): PerfSettings {
  // En móvil/tablet (WebView Android, iPad…) el coste de píxel a DPR 2 es el
  // principal cuello de botella: se parte del preset "medio" (DPR 1.25, sin
  // antialias). El usuario puede subirlo cuando quiera desde Rendimiento.
  const movil =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const preset: Exclude<PerfPreset, "custom"> = movil ? "medio" : "alto";
  return { preset, ...PERF_PRESETS[preset] };
}

export function getPerf(): PerfSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...(JSON.parse(raw) as Partial<PerfSettings>) };
  } catch {
    /* usa valores por defecto */
  }
  return defaults();
}

export function setPerf(s: PerfSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Aplica un preset y devuelve los ajustes resultantes (ya guardados). */
export function applyPreset(preset: Exclude<PerfPreset, "custom">): PerfSettings {
  const s: PerfSettings = { preset, ...PERF_PRESETS[preset] };
  setPerf(s);
  return s;
}
