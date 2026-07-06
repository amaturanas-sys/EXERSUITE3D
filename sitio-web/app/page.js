import Landing from "@/components/Landing";
import { cargarContenido } from "@/lib/contenido";

export const dynamic = "force-dynamic"; // el contenido editado se ve al instante

export default async function Pagina() {
  const contenido = await cargarContenido();
  return <Landing contenido={contenido} />;
}
