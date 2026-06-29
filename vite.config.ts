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
  },
});
