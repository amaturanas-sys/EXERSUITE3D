# Modelos 3D de componentes (reemplazables por archivo)

Esta carpeta permite **sustituir el dibujo básico de cada componente** por un
modelo 3D propio (diseñado en SketchUp, Nomad, Blender, etc.) **sin tocar código
ni usar IA**. Solo trabajas con archivos.

## Cómo reemplazar un componente

1. Exporta tu modelo a **`.glb`**, **`.gltf`** o **`.obj`**.
2. Copia el archivo dentro de esta carpeta (`public/models/components/`).
   Sugerencia: nómbralo igual que el id del componente, p. ej. `pilar.glb`.
3. Abre **`manifest.json`** (en esta misma carpeta) y, junto al id del
   componente, escribe el nombre de tu archivo. Ejemplo:

   ```json
   {
     "pilar": "pilar.glb",
     "polea": "mi-polea.obj"
   }
   ```

4. Recarga la aplicación. El modelo se aplica a **todas** las piezas de ese
   componente. Para volver a la forma básica, deja el valor en `""` y borra (o
   conserva) el archivo.

## Notas

- El modelo se **escala automáticamente a centímetros** (si viene en metros se
  multiplica ×100), se **fusiona** en una sola malla y se **centra** sobre el
  suelo. Luego puedes ajustar escala/posición de cada pieza en el inspector.
- Un modelo asignado desde la ventana **Biblioteca** (dentro de la app) tiene
  prioridad sobre el de archivo en ese navegador.
- Mantén los archivos ligeros: para móvil, `.glb` con Draco es lo más eficiente.

## Identificadores de componente

Usa estos ids como claves en `manifest.json`:

| id | Componente |
| --- | --- |
| `pilar` | Pilar estructural |
| `base-soporte` | Base de soporte |
| `base-apoyo` | Base de apoyo |
| `soporte-peso` | Soporte de peso |
| `j-hook` | Gancho J / soporte barra |
| `montante-rack` | Montante de rack |
| `brazo-seguridad` | Brazo de seguridad |
| `correa-seguridad` | Correa de seguridad |
| `barra-dominadas` | Barra de dominadas |
| `barra-fondos` | Barra de fondos |
| `landmine` | Landmine |
| `guia` | Guia |
| `riel` | Riel |
| `fulcro` | Fulcro |
| `pivote` | Pivote |
| `pop-pin` | Pasador (pop-pin) |
| `carro-cable` | Carro de cable |
| `brazo-ajustable` | Brazo ajustable |
| `polea` | Polea |
| `roldana` | Roldana |
| `bloque-poleas` | Bloque de poleas |
| `engranaje` | Engranaje |
| `cable` | Cable |
| `cadena-eslabones` | Cadena de eslabones |
| `cadena-seguridad` | Cadena de seguridad |
| `liston-kevlar` | Liston de Kevlar |
| `resorte` | Resorte |
| `leva` | Leva (cam) |
| `bloque-peso` | Bloque de peso |
| `disco-peso` | Disco de peso |
| `contrapeso` | Contrapeso |
| `barra-olimpica` | Barra olimpica |
| `pila-pesos` | Pila de pesos |
| `cuerno-carga` | Cuerno de carga |
| `micro-disco` | Micro-disco |
| `agarradera` | Agarradera |
| `asiento` | Asiento |
| `respaldo` | Respaldo |
| `agarre-d` | Agarradera en D |
| `cuerda-triceps` | Cuerda de triceps |
| `barra-jalon` | Barra de jalon |
| `correa-tobillo` | Correa de tobillo |
| `prim-box` | Caja |
| `prim-cylinder` | Cilindro |
| `prim-sphere` | Esfera |
