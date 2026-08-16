#!/bin/bash
# Puerta de release: corre TODAS las pruebas contra el build real.
#
#   npm run build && npx vite preview --port 4174 --strictPort &
#   bash pruebas/correr-todo.sh
#
# Ver LEEME.md para los requisitos. Deja un resumen en pruebas/salidas/.
cd "$(dirname "$0")" || exit 1
mkdir -p salidas
rm -f salidas/_resumen.txt

# De tres en tres. Subirlo hace fallar a las que miden tiempos de simulación
# (`atraviesa` y `cable-oculto` son las primeras en caer); bajarlo a 1 tarda el
# triple y no arregla nada más.
N="${N:-3}"
i=0
for f in prueba-*.mjs; do
  base="${f%.mjs}"
  (
    out="salidas/$base.txt"
    timeout 600 node "$f" > "$out" 2>&1
    code=$?
    if grep -qE "❌|✗ |PAGEERROR" "$out" || [ $code -ne 0 ]; then
      echo "FALLA|$base|$code" >> salidas/_resumen.txt
    else
      echo "OK|$base|$code" >> salidas/_resumen.txt
    fi
  ) &
  i=$((i+1))
  if [ $((i % N)) -eq 0 ]; then wait; fi
done
wait

total=$(wc -l < salidas/_resumen.txt)
fallan=$(grep -c FALLA salidas/_resumen.txt)
echo "--- $total pruebas, $fallan en rojo ---"
grep FALLA salidas/_resumen.txt | sort
