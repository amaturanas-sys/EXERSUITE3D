extends SceneTree
## PRUEBA: LOS HUECOS PASANTES EN GODOT (v0.3.74).
##
## Una ventana o un canal de guía no son un dibujo sobre la pieza: son agujeros
## de verdad, con sus paredes interiores. Es lo que enhebra el carro de una
## prensa en sus dos guías y lo que deja pasar el cable bajo una roldana
## interna, y si en Godot no se abren, la misma máquina se ve maciza.
##
##   1. Por el centro del hueco no hay material: el rayo pasa de lado a lado.
##   2. Al lado del hueco sí lo hay: no se ha comido la pieza.
##   3. La pieza sigue midiendo lo mismo por fuera.
##   4. El hueco tiene PAREDES: la malla gana triángulos, no los pierde.
##   5. Un canal redondo deja pasar un tubo de su radio y no uno más gordo.
##   6. Y con la chapa puesta, el hueco sigue calado (la chapa va DESPUÉS).

var fallos := 0

const LADO_CM := 20.0


func _ok(cond: bool, msg: String, dato: String = "") -> void:
	if cond:
		print("✓ ", msg)
	else:
		fallos += 1
		print("✗ ", msg, "" if dato == "" else (" — " + dato))


## Cuántas veces cruza la malla un rayo que va por el eje Z.
func _cruces(tris: PackedVector3Array, x: float, y: float, largo: float) -> int:
	var desde := Vector3(x, y, largo)
	var hasta := Vector3(x, y, -largo)
	var n := 0
	for i in range(0, tris.size(), 3):
		if Geometry3D.segment_intersects_triangle(desde, hasta, tris[i], tris[i + 1], tris[i + 2]) != null:
			n += 1
	return n


func _init() -> void:
	var lado := Units.cm(LADO_CM)
	var base := {"kind": "box", "width": LADO_CM, "height": LADO_CM, "depth": LADO_CM}
	var macizo := GeometryFactory.build_mesh(base)

	# Una ventana de 6 × 6 cm en el centro, pasante por Z.
	var con_ventana := base.duplicate()
	con_ventana["ventanas"] = [{"eje": "z", "u": 0, "v": 0, "du": 6, "dv": 6}]
	var m1 := GeometryFactory.build_mesh(con_ventana)
	var t1 := m1.get_faces()

	# ── 1 y 2. EL HUECO ESTÁ, Y SÓLO DONDE SE PIDIÓ ──────────────────────
	_ok(_cruces(t1, 0.008, 0.004, lado) == 0, "por el centro de la ventana el rayo pasa sin tocar nada")
	_ok(_cruces(t1, lado * 0.4, 0.004, lado) >= 2, "y a un lado la pieza sigue ahí")

	# ── 3. POR FUERA, LO MISMO ───────────────────────────────────────────
	var a0 := macizo.get_aabb()
	var a1 := m1.get_aabb()
	_ok(a0.size.distance_to(a1.size) < 0.002, "la pieza calada mide lo mismo por fuera")

	# ── 4. EL HUECO TIENE PAREDES ────────────────────────────────────────
	_ok(
		t1.size() > macizo.get_faces().size(),
		"el hueco trae sus paredes interiores (%d triángulos contra %d)" % [
			t1.size() / 3, macizo.get_faces().size() / 3],
	)

	# ── 5. UN CANAL REDONDO DEJA PASAR SU TUBO ───────────────────────────
	var con_canal := base.duplicate()
	con_canal["canales"] = [{"eje": "z", "u": 0, "v": 0, "radio": 3.0, "lados": 20}]
	var t2 := GeometryFactory.build_mesh(con_canal).get_faces()
	var pasa := _cruces(t2, Units.cm(2.8), 0.0, lado)     # dentro del radio
	var no_pasa := _cruces(t2, Units.cm(3.6), 0.0, lado)  # fuera del radio
	_ok(
		pasa == 0 and no_pasa >= 2,
		"el canal deja pasar una guía de su radio y frena a la de al lado (%d / %d cruces)" % [pasa, no_pasa],
	)

	# ── 6. HUECO Y CHAPA CONVIVEN ────────────────────────────────────────
	var ambas := con_ventana.duplicate()
	ambas["chapa"] = {"grosorCm": 0.5, "caras": [{"n": [0, 1, 0], "c": [0.5, 1.0, 0.5]}]}
	var t3 := GeometryFactory.build_mesh(ambas).get_faces()
	_ok(
		_cruces(t3, 0.008, 0.004, lado) == 0 and t3.size() > t1.size(),
		"con la pieza vaciada el hueco sigue calado: la chapa va DESPUÉS de perforar",
		"%d cruces · %d triángulos" % [_cruces(t3, 0.008, 0.004, lado), t3.size() / 3],
	)

	print("")
	print("TODO OK" if fallos == 0 else ("%d FALLOS" % fallos))
	quit(0 if fallos == 0 else 1)
