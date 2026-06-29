import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de Capacitor para el empaquetado Android (APK).
 *
 * `webDir` apunta al bundle de producción de Vite (`dist/`). El flujo es:
 *   npm run build           → genera dist/
 *   npx cap sync android    → copia dist/ al proyecto nativo y sincroniza plugins
 *   npm run android:open    → abre Android Studio para compilar/firmar el APK
 *
 * El proyecto nativo (`android/`) se genera con `npm run android:add` (una sola
 * vez) y no se versiona en este repositorio: es reproducible desde esta config.
 */
const config: CapacitorConfig = {
  appId: "com.exersuite.app",
  appName: "EXERSUITE3D",
  webDir: "dist",
  // El WebView de Android necesita WebGL2 y un fondo opaco para el viewport 3D.
  android: {
    backgroundColor: "#0b0d12",
    // Permite cargar el bundle local (file://) con rutas relativas (base: "./").
    allowMixedContent: false,
  },
};

export default config;
