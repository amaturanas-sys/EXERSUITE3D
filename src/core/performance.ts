/**
 * Ajustes de rendimiento de render, persistidos en localStorage. Permiten
 * aliviar equipos/tablets con poca potencia reduciendo resolución, sombras,
 * reflejos de entorno y antialias.
 */
export type PerfPreset = "alto" | "medio" | "bajo" | "custom";

export interface PerfSettings {
  preset: PerfPreset;
  /** Límite de densidad de píxeles (menor = más rápido; admite <1). */
  maxPixelRatio: number;
  shadows: boolean;
  /** Tamaño del mapa de sombra de la luz principal (1024 = mitad de coste). */
  shadowMapSize: number;
  /** Sombras suaves (PCF soft): más caras por píxel que las duras. */
  softShadows: boolean;
  environment: boolean;
  /** Antialias del renderer: solo se aplica al abrir un proyecto. */
  antialias: boolean;
  /** Sombreado simple (Lambert, sin tone mapping): mucho más barato por
   *  píxel que el PBR. Los materiales se aplican al reabrir el proyecto. */
  simpleShading: boolean;
  /** Resolución dinámica: baja la escala de render (×0.7) mientras se orbita,
   *  arrastra o simula, y la restaura en reposo (técnica de apps nativas). */
  dynamicResolution: boolean;
}

const KEY = "exersuite.perf.v1";

export const PERF_PRESETS: Record<Exclude<PerfPreset, "custom">, Omit<PerfSettings, "preset">> = {
  alto: {
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    softShadows: true,
    environment: true,
    antialias: true,
    simpleShading: false,
    dynamicResolution: false,
  },
  medio: {
    maxPixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    softShadows: false,
    environment: true,
    antialias: false,
    simpleShading: false,
    dynamicResolution: true,
  },
  bajo: {
    maxPixelRatio: 0.75,
    shadows: false,
    shadowMapSize: 1024,
    softShadows: false,
    environment: false,
    antialias: false,
    simpleShading: true,
    dynamicResolution: true,
  },
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

let cache: PerfSettings | null = null;

export function getPerf(): PerfSettings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = { ...defaults(), ...(JSON.parse(raw) as Partial<PerfSettings>) };
  } catch {
    /* usa valores por defecto */
  }
  cache = cache ?? defaults();
  return cache;
}

export function setPerf(s: PerfSettings): void {
  cache = s;
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
