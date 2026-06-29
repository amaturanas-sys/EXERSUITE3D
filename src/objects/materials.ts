import * as THREE from "three";

// Libreria de materiales PBR de EXERSUITE3D.
// Presets alineados con los materiales usados en los disenos de referencia
// hechos en SketchUp (Steel Polished, Carpaint Black, Plastic Orange/White,
// Metal Painted Blue, Wood Veneer, Glass, Caucho, etc.).

export interface MaterialPreset {
  id: string;
  label: string;
  color: number;
  metalness: number;
  roughness: number;
  /** Opacidad (1 = opaco). <1 activa transparencia. */
  opacity: number;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "acero-negro", label: "Acero negro mate", color: 0x222428, metalness: 0.55, roughness: 0.45, opacity: 1 },
  { id: "acero", label: "Acero pintado", color: 0x3b3f46, metalness: 0.6, roughness: 0.4, opacity: 1 },
  { id: "acero-pulido", label: "Acero pulido", color: 0xb8bcc4, metalness: 1.0, roughness: 0.18, opacity: 1 },
  { id: "cromo", label: "Cromo", color: 0xdfe3e8, metalness: 1.0, roughness: 0.06, opacity: 1 },
  { id: "hierro-fundido", label: "Hierro fundido", color: 0x2b2e33, metalness: 0.5, roughness: 0.62, opacity: 1 },
  { id: "azul", label: "Azul metalico", color: 0x1d4ed8, metalness: 0.7, roughness: 0.35, opacity: 1 },
  { id: "turquesa", label: "Turquesa (mecanismo)", color: 0x12808c, metalness: 0.55, roughness: 0.38, opacity: 1 },
  { id: "rojo", label: "Rojo (Hammer/REP)", color: 0xc8102e, metalness: 0.4, roughness: 0.5, opacity: 1 },
  { id: "plata", label: "Plata (Silver Bullet)", color: 0x9a9ca0, metalness: 0.85, roughness: 0.3, opacity: 1 },
  { id: "amarillo", label: "Amarillo", color: 0xf2c200, metalness: 0.2, roughness: 0.5, opacity: 1 },
  { id: "naranja", label: "Plastico naranja", color: 0xf2711c, metalness: 0.0, roughness: 0.45, opacity: 1 },
  { id: "blanco", label: "Plastico blanco", color: 0xeef0f2, metalness: 0.0, roughness: 0.5, opacity: 1 },
  { id: "nylon", label: "Nylon", color: 0x2e3136, metalness: 0.1, roughness: 0.55, opacity: 1 },
  { id: "goma", label: "Goma", color: 0x2a2a2c, metalness: 0.0, roughness: 0.9, opacity: 1 },
  { id: "caucho", label: "Caucho", color: 0x1c1d20, metalness: 0.0, roughness: 0.95, opacity: 1 },
  { id: "tapizado", label: "Tapizado", color: 0x26282d, metalness: 0.0, roughness: 0.85, opacity: 1 },
  { id: "madera", label: "Madera (veneer)", color: 0x9a6b3f, metalness: 0.0, roughness: 0.7, opacity: 1 },
  { id: "kevlar", label: "Kevlar", color: 0xc9a227, metalness: 0.15, roughness: 0.6, opacity: 1 },
  { id: "vidrio", label: "Vidrio", color: 0x9fb3c8, metalness: 0.0, roughness: 0.05, opacity: 0.35 },
  { id: "generico", label: "Generico", color: 0x94a3b8, metalness: 0.25, roughness: 0.6, opacity: 1 },
];

const BY_ID = new Map(MATERIAL_PRESETS.map((m) => [m.id, m]));

export function getMaterialPreset(id: string): MaterialPreset {
  return BY_ID.get(id) ?? BY_ID.get("generico")!;
}

/** Construye un MeshStandardMaterial a partir de un preset. */
export function buildMaterial(id: string): THREE.MeshStandardMaterial {
  const p = getMaterialPreset(id);
  return new THREE.MeshStandardMaterial({
    color: p.color,
    metalness: p.metalness,
    roughness: p.roughness,
    transparent: p.opacity < 1,
    opacity: p.opacity,
  });
}

/** Aplica un preset a un material existente (sin recrearlo). */
export function applyMaterial(mat: THREE.MeshStandardMaterial, id: string): void {
  const p = getMaterialPreset(id);
  mat.color.setHex(p.color);
  mat.metalness = p.metalness;
  mat.roughness = p.roughness;
  mat.opacity = p.opacity;
  mat.transparent = p.opacity < 1;
  mat.needsUpdate = true;
}
