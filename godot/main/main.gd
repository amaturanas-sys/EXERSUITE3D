extends Node3D
## Arranque de EXERSUITE3D en Godot: entorno (suelo fijo, luz, cielo), cámara
## orbital, World (la máquina), el controlador del editor y su interfaz.
## Toda la escena se construye por código para minimizar .tscn frágiles.

var world: World
var cam: OrbitCamera
var ed: EditorController
var ui: EditorUI
var landing: LandingUI = null
var library: LibraryUI = null
var grid_node: Node3D = null


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
	ui.request_home.connect(_confirm_home)
	ui.request_library.connect(_show_library)
	ui.grid_toggled.connect(func(on): grid_node.visible = on)

	# Bajo consumo en el Builder (solo repinta con actividad, como un editor);
	# durante la simulación se vuelve al bucle continuo.
	OS.low_processor_usage_mode = true
	world.simulation_changed.connect(func(on): OS.low_processor_usage_mode = not on)

	# Autoguardado en user:// cada 20 s (equivalente al localStorage web).
	var autosave := Timer.new()
	autosave.wait_time = 20.0
	autosave.autostart = true
	autosave.timeout.connect(func():
		if not world.pieces.is_empty() and not world.simulating:
			Serializer.save_file(world, "user://autosave.json"))
	add_child(autosave)

	_show_landing()


func _show_landing() -> void:
	world.set_simulating(false)
	ui.visible = false
	ui.set_simulator_mode(false)
	landing = LandingUI.new()
	add_child(landing)
	landing.action.connect(_on_landing_action)


func _hide_landing() -> void:
	if landing:
		landing.queue_free()
		landing = null
	ui.visible = true


func _on_landing_action(kind: String, payload) -> void:
	match kind:
		"new":
			_hide_landing()
			ed.select_piece(null)
			world.clear()
		"open", "open_path":
			_hide_landing()
			ed.select_piece(null)
			if world.load_project_file(String(payload)):
				cam.set_view("isometrica", world.bounds())
				ui.sync_from_world()
				LandingUI.add_recent(String(payload).get_file().get_basename(), Serializer.serialize(world))
		"simulate":
			_hide_landing()
			ed.select_piece(null)
			if world.load_project_file(String(payload)):
				cam.set_view("isometrica", world.bounds())
				ui.sync_from_world()
				ui.set_simulator_mode(true)
				world.set_simulating(true)
		"continue":
			_hide_landing()
			ed.select_piece(null)
			if world.load_project_file("user://autosave.json"):
				cam.set_view("isometrica", world.bounds())
				ui.sync_from_world()
		"library":
			_show_library()
		"demo":
			_hide_landing()
			_load_demo()


func _show_library() -> void:
	if library:
		return
	library = LibraryUI.new()
	add_child(library)
	library.setup(world)
	# La vista previa giratoria necesita repintado continuo.
	OS.low_processor_usage_mode = false
	library.closed.connect(func():
		library.queue_free()
		library = null
		OS.low_processor_usage_mode = not world.simulating)


func _build_environment() -> void:
	# Fondo claro degradado como la web (#eef0f2 → #cdd0d3).
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("eef0f2")
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
	mat.albedo_color = Color("e8e9eb")
	mi.material_override = mat
	floor_body.add_child(mi)
	add_child(floor_body)

	grid_node = _build_grid()
	add_child(grid_node)


## Rejilla de la web: 6 m de lado, celdas de 10 cm, líneas mayores cada 1 m,
## más los ejes X (rojo), Y (verde) y Z (azul) de 1 m.
func _build_grid() -> Node3D:
	var root := Node3D.new()
	root.name = "Grid"
	var im := ImmediateMesh.new()
	var half := 3.0
	var minor := Color("c4c4c8", 0.55)
	var major := Color("9a9a9e", 0.8)
	im.surface_begin(Mesh.PRIMITIVE_LINES)
	for i in range(61):
		var p := -half + float(i) * 0.1
		var c := major if i % 10 == 0 else minor
		im.surface_set_color(c)
		im.surface_add_vertex(Vector3(p, 0, -half))
		im.surface_set_color(c)
		im.surface_add_vertex(Vector3(p, 0, half))
		im.surface_set_color(c)
		im.surface_add_vertex(Vector3(-half, 0, p))
		im.surface_set_color(c)
		im.surface_add_vertex(Vector3(half, 0, p))
	# Ejes de 1 m (X rojo, Y verde, Z azul), como el AxesHelper de three.
	var axes := [
		[Vector3(1, 0, 0), Color("e04434")],
		[Vector3(0, 1, 0), Color("46a049")],
		[Vector3(0, 0, 1), Color("3565c0")],
	]
	for a in axes:
		im.surface_set_color(a[1])
		im.surface_add_vertex(Vector3.ZERO)
		im.surface_set_color(a[1])
		im.surface_add_vertex(a[0])
	im.surface_end()
	var mi := MeshInstance3D.new()
	mi.mesh = im
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mi.material_override = mat
	mi.position.y = 0.002
	root.add_child(mi)
	return root


## "Cambios sin guardar" al volver al inicio, como en la web.
func _confirm_home() -> void:
	if world.pieces.is_empty():
		_show_landing()
		return
	var dlg := ConfirmationDialog.new()
	dlg.title = "Cambios sin guardar"
	dlg.dialog_text = ("Tienes cambios en el proyecto actual.\n"
		+ "¿Quieres guardarlos antes de volver a la pantalla de inicio?")
	dlg.ok_button_text = "Guardar y salir"
	dlg.cancel_button_text = "Cancelar"
	dlg.add_button("Salir sin guardar", true, "discard")
	dlg.confirmed.connect(func():
		Serializer.save_file(world, "user://autosave.json")
		LandingUI.add_recent("autosave", Serializer.serialize(world))
		_show_landing())
	dlg.custom_action.connect(func(_action): dlg.hide(); _show_landing())
	ui.add_child(dlg)
	dlg.popup_centered()


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
			 "position": [40, 160, 0], "quaternion": [0, 0, 0.38268343, 0.92387953], "scale": [1, 1, 1]},
			{"id": "o3", "name": "Bloque", "componentId": "bloque-peso", "materialId": "hierro-fundido",
			 "params": {"kind": "box", "width": 30, "height": 15, "depth": 30},
			 "physics": {"massKg": 20, "fixed": false},
			 "position": [-60, 60, 40], "quaternion": [0, 0, 0, 1], "scale": [1, 1, 1]},
		],
		"joints": [
			{"name": "Bisagra", "kind": "revolute", "bodyAId": "o1", "bodyBId": "o2",
			 "anchor": [11.72, 188.28, 0], "axis": "z", "limitsEnabled": false,
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
