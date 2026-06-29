# Referencias de diseño — EXERSUITE3D

Síntesis del lenguaje de diseño de marcas líderes de equipamiento de gimnasio,
recopilada para guiar la librería de componentes, los mecanismos físicos y las
paletas de material de EXERSUITE3D. Complementa los modelos `.skp` de referencia
del autor (POWERRACK, Rack_TTP001L, SanLorenzoGym) y el vídeo `Plegable.mp4`.

> Las medidas se dan en su unidad original (pulgadas/ga del sector) y su
> equivalente métrico. Recordatorio: en el editor **1 unidad = 1 cm**.
> Perfiles habituales: 2×2" = 5,1 cm · 2×3" = 5,1×7,6 cm · 3×3" = 7,6 cm ·
> 11-gauge ≈ 3,0 mm de pared.

---

## 1. Familias estructurales (racks)

Tres marcas (Rogue, REP, Titan) comparten la misma lógica modular: **montante de
tubo cuadrado con agujeros láser y una grilla de posiciones de pin** sobre la que
se enganchan todos los accesorios. Conviene modelar el montante como un **tubo
extruido paramétrico** con un array de agujeros, y un **pin estándar reutilizable**
como interfaz común de todos los componentes.

| Marca | Familias (perfil / agujero) | Patrón de agujeros | Acabado base |
|-------|------------------------------|--------------------|--------------|
| **Rogue** | Monster 3×3"/1" · Monster Lite 3×3"/⅝" · Infinity 2×3"/⅝" | Westside (1" en zona press, 2" resto) + keyholes laterales | Negro texturizado / Cerakote |
| **REP** | 5000 y 4000 (3×3"/11ga, agujero 1") · 3000 (11ga) · 1100 (2×2"/14ga) | Espaciado uniforme de 2"; **números cortados a láser pasantes** (firma visual) | Powder coat, clear-coat (acero crudo), inox |
| **Titan** | T-3 (2×3") · X-3 (3×3"/⅝") · TITAN (3×3"/1") | Westside; ancho exterior 48" (≠ Rogue 49") | Powder coat negro mate |
| **Hammer Strength** | Racks HD Elite/Athletic (montantes 3×3"/11ga, numerados) | Modular ~6" entre centros (propietario) | Powder coat; soldado |
| **Cybex** | Marcos de **tubería ovalada 11ga**, totalmente soldados, estética **curva** | n/a (no es rack modular) | Powder coat satinado |
| **Obelix** | V8 (oval 40×140×3 mm, acero Q235) · MO 2.0 (rect. 50×80×2,5 mm, 11ga) | n/a | Powder coat doble capa; acento amarillo/gris |

**Compatibilidad de pin** (para futura herramienta de ensamblaje/snapping):
diámetro ⅝" ↔ Rogue Monster Lite ≈ REP 4000 ≈ Titan X-3; diámetro 1" ↔ Rogue
Monster ≈ REP 5000 ≈ Titan TITAN. El **paso** (imperial vs métrico) y el **ancho**
difieren entre marcas, así que tratar la compatibilidad como "diámetro coincide,
con posible offset de ±mm".

---

## 2. Mecanismos y cinemática (núcleo para el simulador de física)

### 2.1 Palanca Iso-Lateral (Hammer Strength)
- Cada brazo es una **palanca independiente** que gira en un **pivote/fulcro fijo**
  al marco; los discos se cargan en **cuernos** sobre el propio brazo.
- Es una palanca cuyo **brazo de momento cambia con el ángulo** → la resistencia
  percibida **varía a lo largo del arco**: `τ = m·g·d·cos(θ)`.
- **Converging** (presses): los agarres se acercan al final del empuje.
  **Diverging** (rows/pulldowns): se separan. Se logra con **ejes de pivote no
  paralelos** (ligeramente convergentes/divergentes en planta), no un eje recto.
- Brazos izquierdo/derecho **desacoplados**. Mango con articulación de 360°
  (segunda junta revolute en serie).
- **Modelo**: revolute joint con masa puntual (disco) en el extremo del brazo.

### 2.2 Leva de resistencia variable (Cybex)
- Una **leva (cam) de perfil no circular** guía el cable; su **radio efectivo
  `r(θ)`** cambia con el ángulo, modulando la resistencia.
- Fuerza en el agarre = `τ_pila / r(θ)` con `τ_pila = m·g·r_polea_pila` constante.
- Diseñada para **imitar la curva de fuerza del músculo**: alivia carga donde hay
  desventaja mecánica y la aumenta en la "power position".
- **RLD (Range Limiting Device)**: traslada el dominio angular de `r(θ)` sin
  deformar el perfil (clamp/offset del rango).
- **Dual Axis** (Eagle/NX): brazos con **2 grados de libertad** acoplados.
- **Modelo**: leva como función/spline editable `r(θ)`; "diseñar la curva de
  fuerza" = editar esa spline. Cable inextensible sobre poleas ideales.

### 2.3 Cables, poleas y pilas de peso (Rogue, REP, Titan, Obelix)
- Poleas de **3,5"–6"**; **swivels** sobredimensionados; cable de acero **3/16"**.
- **Relaciones** típicas: **2:1** en functional trainer, **1:1** en lat/row.
- **Pila selectorizada (mecanismo detallado)**: placas de acero macizo
  (≈15 lb/6,8 kg cada una) que **deslizan sobre dos varillas-guía tubulares**.
  Por el centro de todas las placas pasa un **tubo selector** con una columna de
  agujeros. Se inserta un **pin perpendicular** en la placa elegida, enganchando
  el tubo. **El cable tira del tubo selector**, que arrastra la **placa del pin y
  todas las de encima** (apiladas sobre ella); las placas **por debajo del pin no
  interactúan**. Por tanto la **masa movilizada = nº de placas seleccionadas ×
  peso por placa**. Suele haber un **mini-stack incremental** (+2,3–7,5 kg) y un
  **resorte amortiguador** arriba.
  - **Modelo en EXERSUITE3D**: el componente *pila de pesos* es **selectorizado**
    (placas totales, kg/placa, selección); la **masa efectiva** = selección ×
    kg/placa. Esa masa, guiada por una **corredera** (prismatic sobre las
    varillas) y tirada por el **cable** (enganchado al tubo selector), es lo que
    sube/baja. Las **placas se dibujan individualmente** (con varillas-guía, tubo
    selector y pin); en la simulación **solo el tubo y las placas seleccionadas se
    elevan**, mientras las de debajo permanecen en su sitio.
- **MTS (Hammer)**: transmisión por **correa de Kevlar** (>3000 lb) sobre poleas
  de nylon/fibra de vidrio, a dos pilas independientes.

### 2.4 Carga por disco (plate-loaded: todas)
- **Cuernos / mangas olímpicas** donde se insertan los discos; la carga es masa
  añadida al cuerpo del brazo o carro. Belt Squat de REP: bloqueo liberado por
  gravedad.

### 2.5 Elementos de seguridad
- **J-cups / J-hooks**: apoyo de barra con **núcleo UHMW** (protege barra y
  montante). **Spotter arms**: brazos rígidos por pin. **Safety straps**: correa
  de **nylon de 3"** entre dos montantes → **elemento tensil flexible** (no
  rígido), modelar como restricción/cuerda.

---

## 2B. Recetas de mecanismos con poleas/palancas (referencias visuales)

Estas configuraciones (de imágenes de referencia aportadas) muestran formas
diversas de usar poleas y palancas. Todas se modelan con los bloques ya
existentes en EXERSUITE3D: **cable** (cadena de nodos extremo→poleas→extremo con
conservación de longitud), **polea fija** (nodo de paso anclado), **polea móvil**
(nodo intermedio dinámico → ratio 2:1/3:1 emergente), **corredera** (prismatic,
carril/varilla guía), **bisagra** (revolute, brazo-palanca) y **cuernos de carga**
(masa por disco).

### Receta A — Functional trainer / jalón con brazo ajustable
*(cable + reenvío por polea + pila selectorizada en varillas)*
- **Brazo ajustable** pivotante en el montante: **bisagra** (revolute) con
  límites; los agujeros/placa de detención son posiciones discretas del ángulo.
- **Agarre** en el extremo con una **polea** en el codo (nodo de paso).
- **Bloque de doble polea** atornillado al montante = dos **poleas fijas**
  (nodos de paso) que redirigen el cable.
- **Pila selectorizada** = bloque pesado en **corredera vertical** (prismatic
  sobre dos varillas guía), conectado por **cable** al agarre.
- **Resorte amortiguador** arriba de la varilla = `resorte` como tope elástico.
- Cadena del cable: `agarre → polea-codo → bloque-poleas → pila`.

### Receta B — Belt squat / cable bajo con carro vertical
*(poleas superiores + carro guiado + correa + cuernos de disco)*
- **Placa superior con 2 poleas fijas** (nodos de paso).
- **Carro** que sube/baja en **corredera vertical** (prismatic sobre varillas),
  con **cuernos de carga** para discos (masa) y una **correa/strap** (tensil)
  hacia el cinturón del usuario.
- Cadena del cable: `correa-usuario → poleas-superiores → carro`.

### Receta C — Belt squat de palanca (plate-loaded, sin polea)
*(contraste: transmisión por palanca en vez de cable)*
- Dos **brazos-palanca** que pivotan en la base: **bisagras** (revolute) con
  **cuernos de carga** (discos) en el extremo → resistencia variable
  `τ = m·g·d·cos(θ)` (igual que Iso-Lateral / pendular).
- **Correa de cadera** (tensil) que une al usuario con el carro/palanca.
- No usa poleas: ilustra cuándo conviene **palanca** (par variable con el
  ángulo) frente a **cable** (tensión constante redirigida).

> Conclusión: el motor de física actual (cables N-nodos con poleas fijas/móviles
> + bisagras + correderas + cuernos) cubre estas tres familias. Lo que aún no
> está es la **leva de resistencia variable `r(θ)`** (curva de fuerza tipo Cybex)
> y la **correa elástica** modelada como resorte tensil.

---

## 3. Materiales y acabados

- **Acero estructural** tubular 11ga, soldado (Hammer/Cybex) o atornillado
  (Rogue/REP/Titan, estética *bolt-together* con tornillería visible).
- **Powder coat texturizado** mate como acabado por defecto del sector.
- Variantes: **clear-coat** (acero crudo esmerilado + barniz, REP), **Cerakote**
  (cerámico delgado, paleta de color, Rogue), **inox** premium.
- **UHMW / plástico** negro en superficies de contacto (J-cups, trolleys, shrouds).
- **Poleas**: aluminio (REP premium) o nylon/fibra de vidrio (económicas).
- **Tapizados**: espuma PU + vinilo (Naugahyde/BoltaFlex/PVC), costura de
  contraste (gris en V8, amarilla en MO 2.0).

---

## 4. Paletas de color (hex aproximados)

> Los fabricantes publican **nombres de pintura**, no códigos; los hex son
> aproximaciones visuales para los presets de material.

| Color | Hex aprox. | Uso / marca |
|-------|-----------|-------------|
| Negro mate texturizado | `#1A1A1A`–`#222222` | Base universal del sector |
| Negro metálico / medianoche | `#2B2E33` | REP metallic, Cybex Midnight |
| Acero crudo / clear-coat | `#8A8D90`–`#9AA0A4` | REP clear, acero esmerilado |
| Plata "Silver Bullet" | `#9A9CA0` | Cybex VR3 |
| Inox | `#B8BCC0` | REP/Rogue inox |
| **Rojo Hammer / Candy Apple** | `#C8102E`–`#A6192E` | Hammer Strength (firma), REP, Titan logo |
| Azul eléctrico | `#1F4E8C`–`#1D4ED8` | REP, Hammer |
| Verde OD | `#5B5A3F` | Rogue Cerakote |
| Naranja Hi-Vis | `#F25C0B` | Rogue Cerakote |
| Flat Dark Earth | `#9A8467` | Rogue Cerakote |
| Amarillo | `#F2C200`–`#F4C400` | Obelix MO 2.0, Hammer |
| Blanco | `#F2F2F2` | Alpine White (Cybex), REP |

---

## 5. Implicaciones para EXERSUITE3D

1. **Montante de rack paramétrico** con grilla de agujeros (1"/⅝", Westside o
   uniforme) y **pin estándar reutilizable** como interfaz de accesorios. → futura
   herramienta de *snapping* a posiciones de pin.
2. **Leva editable `r(θ)`** como componente de transmisión: simular curvas de
   resistencia variable (Cybex). Es una metáfora de diseño potente para el autor.
3. **Brazo Iso-Lateral**: revolute joint + disco como masa puntual; converging/
   diverging por ejes de pivote no paralelos. Ya soportado por el sistema de
   articulaciones (bisagra) implementado.
4. **Pila de pesos selectorizada**: prismatic joint (ya soportado) + cable
   inextensible (pendiente: cables/poleas).
5. **Safety strap** como elemento **tensil** (futuro: cuerdas/cables blandos),
   distinto del **spotter arm** rígido.
6. **Paleta de materiales** ampliada con acentos de marca (rojo Hammer, plata
   Cybex, amarillo Obelix) sobre la base de acero negro mate.

### Fuentes
REP Fitness, Rogue Fitness, Titan Fitness, Hammer Strength / Life Fitness, Cybex /
Life Fitness (catálogos oficiales y distribuidores); Obelix (distribuidores
chilenos: pesaschile.cl, biogymstore.cl, fedesport.cl). Recopilado 2026-06.
