extends SceneTree
## Prueba de humo headless para CI: carga el proyecto de ejemplo con el motor
## REAL, simula 2 segundos de física y comprueba resultados.
## Uso: godot --headless --path godot -s res://tests/smoke.gd

var world
var frames := 0


func _initialize() -> void:
	print("SMOKE: arrancando…")
	world = load("res://core/world.gd").new()
	root.add_child(world)
	var f := FileAccess.open("res://extras/proyecto-ejemplo.json", FileAccess.READ)
	assert(f != null, "no se pudo abrir el proyecto de ejemplo")
	var data = JSON.parse_string(f.get_as_text())
	world.load_project(data)
	assert(world.pieces.size() == 3, "esperaba 3 piezas, hay %d" % world.pieces.size())
	assert(world.mannequin != null, "falta el maniquí")
	assert(world.ropes_data.size() == 1, "falta la cuerda")
	# Guardar debe producir el mismo número de objetos (ciclo completo).
	var out = load("res://core/serializer.gd").serialize(world)
	assert((out["objects"] as Array).size() == 3, "serialize perdió piezas")
	world.set_simulating(true)
	print("SMOKE: simulando 120 pasos…")


func _process(_delta: float) -> bool:
	frames += 1
	if frames < 120:
		return false
	var block = world.pieces["o3"]
	var arm = world.pieces["o2"]
	var block_fell: bool = block.global_position.y < 0.35   # cayó de 0,60 m al suelo
	var arm_moved: bool = arm.global_position.distance_to(Vector3(0.4, 1.6, 0)) > 0.05
	world.set_simulating(false)
	var restored: bool = absf(block.global_position.y - 0.6) < 0.01
	print("SMOKE: block_fell=%s arm_moved=%s restored=%s" % [block_fell, arm_moved, restored])
	if block_fell and arm_moved and restored:
		print("SMOKE_OK")
		quit(0)
	else:
		print("SMOKE_FAIL")
		quit(1)
	return true
