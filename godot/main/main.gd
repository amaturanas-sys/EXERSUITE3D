extends Node3D
## Arranque de EXERSUITE3D en Godot: entorno (suelo fijo, luz, cielo), cámara
## orbital, World (la máquina), el controlador del editor y su interfaz.
## Toda la escena se construye por código para minimizar .tscn frágiles.

var world: World
var cam: OrbitCamera
var ed: EditorController
var ui: EditorUI


func _ready() -> void:
	_build_environment()
	world = World.new()
	add_child(world)
	cam = OrbitCamera.new()
	add_child(cam)
	cam.current = true
	ed = EditorController.new()
	add_child(ed)
	ed.setup(world, cam)
	ui = EditorUI.new()
	add_child(ui)
	ui.setup(world, cam, ed)
	_load_demo()


func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.90, 0.90, 0.92)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.85, 0.86, 0.9)
	env.ambient_light_energy = 0.7
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, -30, 0)
	sun.shadow_enabled = true
	sun.light_energy = 1.1
	add_child(sun)

	# Suelo: plano gris SIEMPRE presente e inamovible (como en la web). Va en
	# la capa 8 para que los raycast de selección (capa 1) no lo cojan.
	var floor_body := StaticBody3D.new()
	floor_body.collision_layer = 8
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(40, 0.1, 40)
	col.shape = shape
	col.position.y = -0.05
	floor_body.add_child(col)
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 40)
	mi.mesh = pm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.82, 0.82, 0.84)
	mi.material_override = mat
	floor_body.add_child(mi)
	add_child(floor_body)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("simular"):
		ed.select_piece(null)
		world.set_simulating(not world.simulating)


## Demo integrada: pilar + brazo articulado + bloque + cadena + maniquí.
func _load_demo() -> void:
	world.load_project({
		"version": 1,
		"objects": [
			{"id": "o1", "name": "Pilar", "componentId": "pilar", "materialId": "acero-negro",
			 "params": {"kind": "box", "width": 8, "height": 200, "depth": 8},
			 "physics": {"massKg": 0, "fixed": true},
			 "position": [0, 100, 0], "quaternion": [0, 0, 0, 1], "scale": [1, 1, 1]},
			{"id": "o2", "name": "Brazo", "componentId": "brazo-ajustable", "materialId": "acero",
			 "params": {"kind": "box", "width": 8, "height": 80, "depth": 8},
			 "physics": {"massKg": 4, "fixed": false},
			 "position": [40, 160, 0], "quaternion": [0, 0, 0, 1], "scale": [1, 1, 1]},
			{"id": "o3", "name": "Bloque", "componentId": "bloque-peso", "materialId": "hierro-fundido",
			 "params": {"kind": "box", "width": 30, "height": 15, "depth": 30},
			 "physics": {"massKg": 20, "fixed": false},
			 "position": [-60, 60, 40], "quaternion": [0, 0, 0, 1], "scale": [1, 1, 1]},
		],
		"joints": [
			{"name": "Bisagra", "kind": "revolute", "bodyAId": "o1", "bodyBId": "o2",
			 "anchor": [40, 200, 0], "axis": "z", "limitsEnabled": false,
			 "min": -90, "max": 90, "motor": {"enabled": false, "targetVel": 0, "factor": 1}},
		],
		"cables": [],
		"ropes": [
			{"name": "Cadena", "kind": "chain", "slack": 0.35,
			 "a": {"objectId": "o1", "local": [0, 100, 0]},
			 "b": {"objectId": null, "local": [120, 150, 60]}},
		],
		"groups": [],
		"human": {"present": true, "mode": "mannequin", "heightCm": 175,
			"position": [90, 0, 90], "quaternion": [0, 0, 0, 1], "pose": null, "hands": []},
	})
	cam.set_view("isometrica", world.bounds())
