import "./globals.css";

export const metadata = {
  title: "EXERSUITE3D — Diseño y simulación 3D de máquinas de gimnasio",
  description:
    "Diseña estructuras, poleas, cables y contrapesos con física real y pruébalos con un maniquí a escala. Disponible para Android y Windows.",
  icons: { icon: "/brand/favicon-32.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
