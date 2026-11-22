# Maniquí de serie — fuente

`maniqui-rig.glb` es el cuerpo del que sale el maniquí de la aplicación desde la
v0.4.14. Lo aportó el diseñador: un cuerpo masculino atlético con **esqueleto
de 22 huesos al estilo Mixamo** (cadera, tres vértebras, cuello, cabeza,
clavículas, brazo, antebrazo, mano, muslo, pierna, pie y dedos del pie), en
**pose T**, normalizado a un cubo de 1 m y con **296.245 triángulos**. Trae
también seis animaciones de locomoción (Idle, Walk, Sprint, Jump…) y dos
texturas de 1024 px; la aplicación no usa ninguna de las dos cosas: la textura
de color es un ruido gris de piedra, no un dibujo del cuerpo, y la de
metal/rugosidad es casi uniforme.

**No se carga en la aplicación.** Lo que se carga sale de él con:

```bash
node scripts/procesar-maniqui.mjs            # escribe public/models/maniqui/
node scripts/procesar-maniqui.mjs otro.glb --tris 30000 --salida /tmp/prueba
```

El proceso es determinista —la misma fuente da los mismos archivos— y tarda un
par de segundos. Qué hace y por qué está explicado en la cabecera del script;
en corto:

| Paso | Qué | Por qué |
|---|---|---|
| Espacio | cm, 175 de talla, pies en y=0, mirando a +Z | es el del maniquí de siempre |
| Pesos | 22 huesos → 14 articulaciones + raíz | el rig de la aplicación tiene 14 pivotes |
| Pose | de pose T al reposo del maniquí anterior | las posturas cuentan sus grados desde ahí |
| Juntas | centro del anillo donde dobla la piel | girar en otro punto cizalla la piel |
| Aligerado | 296.245 → ~24.000 triángulos (meshoptimizer) | el maniquí anterior dibujaba 47.024 |
| Retoques | columna a 100 cm, glúteo con la pelvis | ver el CHANGELOG de la v0.4.14 |
| Corte | 16 segmentos rígidos + la piel | los segmentos se miden, la piel se ve |

Para cambiar el presupuesto de triángulos basta con `--tris`. Para cambiar el
cuerpo, se sustituye este archivo por otro con un rig del mismo estilo (los
nombres de hueso se leen sin el prefijo `mixamorig`) y se vuelve a correr el
script; si los huesos se llaman de otra forma, la tabla `BASE` del script dice
a qué articulación va cada uno.
