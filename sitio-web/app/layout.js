import { headers } from "next/headers";

import "./globals.css";
import { CABECERA_IDIOMA, normalizarIdioma } from "@/lib/i18n";

const META = {
  es: {
    title: "EXERSUITE3D — Diseño y simulación 3D de máquinas de gimnasio",
    description:
      "Diseña estructuras, roldanas, cables y contrapesos en centímetros reales, simula su mecánica " +
      "y comprueba con un maniquí de cuerpo físico si tu máquina le sirve a una persona. " +
      "Para Android y Windows.",
  },
  en: {
    title: "EXERSUITE3D — 3D design and simulation of gym machines",
    description:
      "Design structures, sheaves, cables and counterweights in real centimetres, simulate their " +
      "mechanics and use a mannequin with a physical body to check whether your machine actually " +
      "fits a person. For Android and Windows.",
  },
};

/**
 * Metadatos por idioma con sus URLs alternativas: sin ellas, un rastreador que
 * ve dos contenidos en la misma dirección indexa uno solo. El x-default apunta
 * al español, que es el idioma base del producto.
 */
export async function generateMetadata() {
  const idioma = normalizarIdioma(headers().get(CABECERA_IDIOMA));
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://exersuite-3-d.vercel.app";
  return {
    metadataBase: new URL(base),
    ...META[idioma],
    icons: { icon: "/brand/favicon-32.png" },
    alternates: {
      canonical: idioma === "en" ? "/en" : "/",
      languages: { es: "/es", en: "/en", "x-default": "/" },
    },
    openGraph: {
      ...META[idioma],
      type: "website",
      locale: idioma === "en" ? "en_US" : "es_CL",
      images: ["/capturas/01-builder-maquina-y-maniqui.png"],
    },
  };
}

export default function RootLayout({ children }) {
  const idioma = normalizarIdioma(headers().get(CABECERA_IDIOMA));
  return (
    <html lang={idioma}>
      <body>{children}</body>
    </html>
  );
}
