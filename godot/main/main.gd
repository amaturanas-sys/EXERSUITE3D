extends Node3D
## Escena principal: entorno (suelo con grid, luz, cielo), cámara orbital,
## World (la máquina) y la UI mínima (abrir proyecto, demo, simular, vistas).
## Toda la escena se construye por código para minimizar .tscn frágiles.

var world: World
var cam: OrbitCamera
var sim_btn: Button
var _drag_active := false


func _ready() -> void:
	_build_environment()
	world = World.new()
	add_child(world)
	world.simulation_changed.connect(func(on): sim_btn.text = "■ Detener" if on else "▶ Simular")
	cam = OrbitCamera.new()
	add_child(cam)
	cam.current = true
	_build_ui()
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

	# Suelo: plano gris SIEMPRE presente e inamovible (como en la web).
	var floor_body := StaticBody3D.new()
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


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var bar := HBoxContainer.new()
	bar.anchor_left = 0.5
	bar.anchor_right = 0.5
	bar.anchor_top = 1.0
	bar.anchor_bottom = 1.0
	bar.offset_top = -64
	bar.offset_bottom = -14
	bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bar.add_theme_constant_override("separation", 8)
	layer.add_child(bar)

	var open_btn := Button.new()
	open_btn.text = "📂 Abrir proyecto"
	bar.add_child(open_btn)
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dlg.filters = PackedStringArray(["*.json ; Proyecto EXERSUITE3D"])
	layer.add_child(dlg)
	open_btn.pressed.connect(func(): dlg.popup_centered_ratio(0.7))
	dlg.file_selected.connect(func(path):
		if world.load_project_file(path):
			cam.set_view("isometrica", world.bounds()))

	var demo_btn := Button.new()
	demo_btn.text = "✦ Demo"
	demo_btn.pressed.connect(_load_demo)
	bar.add_child(demo_btn)

	sim_btn = Button.new()
	sim_btn.text = "▶ Simular"
	sim_btn.pressed.connect(func(): world.set_simulating(not world.simulating))
	bar.add_child(sim_btn)

	for v in [["Frontal", "frontal"], ["Lateral", "lateral"], ["Superior", "superior"], ["Iso", "isometrica"]]:
		var b := Button.new()
		b.text = v[0]
		var view: String = v[1]
		b.pressed.connect(func(): cam.set_view(view, world.bounds()))
		bar.add_child(b)

	var hint := Label.new()
	hint.text = "Arrastra con clic izq. para orbitar · rueda = zoom · en simulación, arrastra piezas móviles con la mano"
	hint.anchor_top = 1.0
	hint.anchor_bottom = 1.0
	hint.anchor_left = 0.5
	hint.anchor_right = 0.5
	hint.grow_horizontal = Control.GROW_DIRECTION_BOTH
	hint.offset_top = -90
	hint.offset_bottom = -70
	hint.add_theme_color_override("font_color", Color(0.25, 0.27, 0.3))
	layer.add_child(hint)


## Demo integrada: pilar + brazo articulado + bloque + cadena (para validar el
## kit sin necesidad de un proyecto).
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


## La mano interactiva usa _input (fase anterior a _unhandled_input) y marca el
## evento como gestionado para que la cámara no orbite mientras se arrastra.
func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and world.simulating:
			var from := cam.project_ray_origin(event.position)
			var dir := cam.project_ray_normal(event.position)
			_drag_active = world.try_grab(from, dir)
			if _drag_active:
				get_viewport().set_input_as_handled()
		elif not event.pressed and _drag_active:
			world.release_drag()
			_drag_active = false
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _drag_active and world.is_dragging():
		# Arrastra sobre el plano frente a la cámara que pasa por el objetivo.
		var from := cam.project_ray_origin(event.position)
		var dir := cam.project_ray_normal(event.position)
		var plane_normal := -cam.global_transform.basis.z
		var plane := Plane(plane_normal, world._drag_target)
		var hit = plane.intersects_ray(from, dir)
		if hit != null:
			world.drag_to(hit)
		get_viewport().set_input_as_handled()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("simular"):
		world.set_simulating(not world.simulating)
