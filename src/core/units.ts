// Sistema de unidades de EXERSUITE3D.
// Convencion fundamental: 1 unidad de mundo de Three.js == 1 centimetro real.
// Esto permite dar medidas exactas en cm sin factores de conversion ocultos.

export const CM = 1;
export const METER = 100 * CM;

/** Redondea a 1 decimal y formatea como "12.5 cm". */
export function formatCm(value: number): string {
  return `${roundTo(value, 1).toFixed(1)} cm`;
}

/** Formatea grados a entero con simbolo. */
export function formatDeg(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatKg(value: number): string {
  return `${roundTo(value, 2)} kg`;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
