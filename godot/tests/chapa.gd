extends SceneTree
## PRUEBA: LA CHAPA EN GODOT DA LO MISMO QUE EN LA WEB (v0.3.74).
##
## Las mismas invariantes que mide `pruebas/prueba-chapa.mjs` en la app web,
## con el mismo cubo de 20 cm y el mismo grosor de 5 mm. Si las dos aplicaciones
## comparten el archivo de proyecto, tienen que dar la MISMA pieza; comprobar
## que "hace algo parecido" no vale de nada.
##
##   1. Un cubo sin la cara de arriba sigue midiendo lo mismo por fuera.
##   2. Por el centro ya no hay tapa: el rayo cae hasta el suelo de dentro, a
##      exactamente un grosor del fondo.
##   3. Junto a la pared sí hay material arriba del todo: el canto.
##   4. La carcasa NO crece hacia fuera por ningún lado.
##   5. Sin chapa en los params, la pieza sigue siendo el macizo de siempre.
##   6. Y en una malla densa y curva, una cara es una cara — no media pieza.

var fallos := 0

const LADO_CM := 20.0
const GROSOR_CM := 0.5


func _ok(cond: bool, msg: String, dato: String = "") -> void:
	if cond:
		print("✓ ", msg)
	else:
		fallos += 1
		print("✗ ", msg, "" if dato == "" else (" — " + dato))


## Primer choque de un rayo vertical hacia abajo contra la sopa de triángulos.
func _techo(tris: PackedVector3Array, x: float, z: float, desde_y: float) -> Variant:
	var desde := Vector3(x, desde_y, z)
	var hasta := Vector3(x, -desde_y, z)
	var mejor = null
	for i in range(0, tris.size(), 3):
		var p = Geometry3D.segment_intersects_triangle(desde, hasta, tris[i], tris[i + 1], tris[i + 2])
		if p != null and (mejor == null or p.y > mejor):
			mejor = p.y
	return mejor


func _init() -> void:
	var lado := Units.cm(LADO_CM)
	var grosor := Units.cm(GROSOR_CM)
	var params := {"kind": "box", "width": LADO_CM, "height": LADO_CM, "depth": LADO_CM}

	var macizo := GeometryFactory.build_mesh(params)
	var tris_macizo := macizo.get_faces()

	# La cara de arriba: mira a +Y y su centro está arriba del todo.
	var cubeta_params := params.duplicate()
	cubeta_params["chapa"] = {
		"grosorCm": GROSOR_CM,
		"caras": [{"n": [0, 1, 0], "c": [0.5, 1.0, 0.5]}],
	}
	var cubeta := GeometryFactory.build_mesh(cubeta_params)
	var tris_cubeta := cubeta.get_faces()

	# ── 1. POR FUERA MIDE LO MISMO ───────────────────────────────────────
	var a1 := macizo.get_aabb()
	var a2 := cubeta.get_aabb()
	_ok(
		a1.size.distance_to(a2.size) < 0.002,
		"la cubeta ocupa lo mismo que el cubo (%.3f × %.3f × %.3f m)" % [a2.size.x, a2.size.y, a2.size.z],
		"%v contra %v" % [a1.size, a2.size],
	)

	# ── 2. POR EL CENTRO YA NO HAY TAPA ──────────────────────────────────
	# Fuera de la diagonal exacta de la cara, que ahí el rayo toca los dos
	# triángulos y el resultado depende del orden.
	var x := lado * 0.07
	var z := lado * 0.04
	var suelo = _techo(tris_cubeta, x, z, lado)
	var esperado := -lado / 2.0 + grosor
	_ok(
		suelo != null and absf(suelo - esperado) < 0.0006,
		"por el centro el rayo cae al suelo de dentro, a un grosor del fondo (%.4f m, esperado %.4f)" % [
			suelo if suelo != null else -99.0, esperado],
	)

	# ── 3. JUNTO A LA PARED, EL CANTO ────────────────────────────────────
	var pared = _techo(tris_cubeta, lado / 2.0 - grosor * 0.4, z, lado)
	_ok(
		pared != null and absf(pared - lado / 2.0) < 0.0006,
		"junto a la pared hay material arriba del todo: el canto de la plancha (%.4f m)" % [
			pared if pared != null else -99.0],
	)

	# ── 4. NO CRECE HACIA FUERA ──────────────────────────────────────────
	var fuera := 0
	var margen := 1e-4
	for p in tris_cubeta:
		if absf(p.x) > lado / 2.0 + margen or absf(p.y) > lado / 2.0 + margen or absf(p.z) > lado / 2.0 + margen:
			fuera += 1
	_ok(fuera == 0, "ni un punto de la carcasa se sale de la pieza", "%d puntos fuera" % fuera)

	# ── 5. SIN CHAPA, MACIZO ─────────────────────────────────────────────
	var techo_macizo = _techo(tris_macizo, x, z, lado)
	_ok(
		techo_macizo != null and absf(techo_macizo - lado / 2.0) < 0.0006 and tris_cubeta.size() > tris_macizo.size(),
		"sin chapa en los params la pieza sigue siendo el macizo de siempre (%d triángulos contra %d)" % [
			tris_macizo.size() / 3, tris_cubeta.size() / 3],
	)

	# ── 6. UNA CARA ES UNA CARA, TAMBIÉN EN LO CURVO ─────────────────────
	# Una esfera es el caso extremo: sin acotar la apertura, TODA la superficie
	# se encadena en una sola cara y tocarla se lleva la pieza entera.
	var esfera := GeometryFactory.build_mesh({"kind": "sphere", "radius": 10})
	var caras := Chapa.detectar_caras(esfera.get_faces())
	var mayor := 0.0
	for c in caras:
		mayor = maxf(mayor, (c as Chapa.Cara).frac_area)
	_ok(
		caras.size() > 4 and mayor < 0.5,
		"en una esfera la superficie se parte en %d casquetes y el mayor es el %d %% de la pieza" % [
			caras.size(), roundi(mayor * 100)],
		"mayor: %.2f" % mayor,
	)

	print("")
	print("TODO OK" if fallos == 0 else ("%d FALLOS" % fallos))
	quit(0 if fallos == 0 else 1)
