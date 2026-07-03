import { defineConfig } from "vite";

// EXERSUITE3D web build. El mismo bundle alimenta:
//  - Capacitor (Android APK) -> carpeta dist/ como webDir
//  - Tauri / Electron (Windows standalone) -> dist/ empaquetado
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separa las librerías pesadas del código de la app: se descargan en
        // paralelo y el navegador las cachea entre versiones (three y el WASM
        // de Rapier cambian mucho menos que el código propio).
        manualChunks: {
          three: ["three"],
          rapier: ["@dimforge/rapier3d-compat"],
        },
      },
    },
  },
});
