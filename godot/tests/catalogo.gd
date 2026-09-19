extends SceneTree
## PRUEBA: EL CATÁLOGO DE GODOT ES EL DE LA WEB (v0.3.74).
##
## `data/components.json` se genera desde el TypeScript de la app, así que no
## puede "casi" coincidir: o son los mismos componentes y materiales, o el kit
## de Godot es otra aplicación. Lo que se comprueba:
##
##   1. QUE ESTÁN TODOS, y con sus materiales.
##   2. QUE LA PALETA OFRECE LO QUE SE OFRECE y nada más: ni piezas internas
##      de las máquinas, ni variantes de peso sueltas, ni retiradas.
##   3. QUE LAS PIEZAS QUE TIENEN MALLA LA ENCUENTRAN. Es la mitad de la
##      estética: sin esto, un disco de 45 lb es un cilindro liso y una
##      kettlebell, una caja.
##   4. QUE LA MALLA CARGA DE VERDAD, tanto `.glb` (escena) como `.obj`
##      (malla suelta), que Godot importa por caminos distintos.
##   5. QUE LAS PIEZAS QUE SE VENDEN POR PESO TRAEN SUS VARIANTES.

var fallos := 0


func _ok(cond: bool, msg: String, dato: String = "") -> void:
	if cond:
		print("✓ ", msg)
	else:
		fallos += 1
		print("✗ ", msg, "" if dato == "" else (" — " + dato))


func _init() -> void:
	var todos := ComponentLibrary.all_components()
	var paleta := ComponentLibrary.palette_components()
	var materiales := ComponentLibrary.materials_list()

	# ── 1. ESTÁN TODOS ───────────────────────────────────────────────────
	_ok(todos.size() >= 104, "el catálogo trae los componentes de la web (%d)" % todos.size())
	_ok(materiales.size() == 20, "y los 20 materiales (%d)" % materiales.size())

	# ── 2. LA PALETA OFRECE LO QUE SE OFRECE ─────────────────────────────
	var colados := 0
	for c in paleta:
		if String(c.get("paleta", "")) != "":
			colados += 1
	_ok(
		colados == 0 and paleta.size() > 30 and paleta.size() < todos.size(),
		"la paleta ofrece %d de %d: fuera las internas, las variantes y las retiradas" % [paleta.size(), todos.size()],
		"coladas: %d" % colados,
	)

	# ── 3 y 4. LAS MALLAS ────────────────────────────────────────────────
	var con_modelo := 0
	var sin_resolver: Array[String] = []
	var no_cargan: Array[String] = []
	var glb := 0
	var obj := 0
	var f := FileAccess.open("res://models/manifest.json", FileAccess.READ)
	var manifiesto: Dictionary = {}
	if f != null:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			manifiesto = d
	for id in manifiesto.keys():
		if String(manifiesto[id]) == "":
			continue
		con_modelo += 1
		var ruta := ModelStore.component_override_path(String(id))
		if ruta == "":
			sin_resolver.append(String(id))
			continue
		if ruta.ends_with(".obj"):
			obj += 1
		else:
			glb += 1
		var inst := ModelStore.instantiate_fitted(ruta, AABB(Vector3(-0.1, -0.1, -0.1), Vector3(0.2, 0.2, 0.2)))
		if inst == null or ModelStore.scene_aabb(inst).size.length() <= 0.0001:
			no_cargan.append(String(id))
		if inst != null:
			inst.free()
	_ok(
		sin_resolver.is_empty(),
		"las %d piezas con malla propia la encuentran en el proyecto" % con_modelo,
		"sin resolver: " + ", ".join(sin_resolver.slice(0, 6)),
	)
	_ok(
		no_cargan.is_empty(),
		"y todas cargan con geometría dentro (%d .glb + %d .obj)" % [glb, obj],
		"no cargan: " + ", ".join(no_cargan.slice(0, 6)),
	)

	# ── 5. LAS QUE SE VENDEN POR PESO ────────────────────────────────────
	var con_variantes := 0
	var variantes_rotas: Array[String] = []
	for c in todos:
		var vs: Array = c.get("variantes", [])
		if vs.is_empty():
			continue
		con_variantes += 1
		for v in vs:
			if ComponentLibrary.get_definition(String(v["id"])).is_empty():
				variantes_rotas.append(String(v["id"]))
	_ok(
		con_variantes >= 3 and variantes_rotas.is_empty(),
		"las piezas que se eligen por peso traen sus variantes y todas existen (%d familias)" % con_variantes,
		"rotas: " + ", ".join(variantes_rotas.slice(0, 6)),
	)

	print("")
	print("TODO OK" if fallos == 0 else ("%d FALLOS" % fallos))
	quit(0 if fallos == 0 else 1)
