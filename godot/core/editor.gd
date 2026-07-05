class_name EditorController
extends Node3D
## Controlador del editor (Builder): selección con gizmo, colocación de piezas,
## trazado por línea con aim assist, cuerdas, articulaciones, cables, doblado
## por nodos y mano interactiva en simulación. Equivale a Editor.ts (núcleo).

signal selection_changed(piece)
signal status(msg: String)

var world: World
var cam: OrbitCamera

var mode := "select"        # select | place | line-beam | line-tube |
							# rope-chain | rope-strap | joint-revolute |
							# joint-prismatic | cable | bend
var selected: Piece = null
var gizmo: Gizmo

var _place_id := ""                 # componente pendiente de colocar
var _line_a = null                  # Vector3 o null
var _line_tpl: Dictionary = {}
var _rope_a = null                  # Dictionary extremo o null
var _joint_a: Piece = null
var _cable_nodes: Array = []
var _drag_axis := -1                # eje del gizmo en arrastre
var _drag_t0 := 0.0
var _drag_origin := Vector3.ZERO
var _hand_active := false
var _bend_handles: Array = []       # StaticBody3D capa 4
var _bend_index := -1


func setup(w: World, c: OrbitCamera) -> void:
	world = w
	cam = c
	gizmo = Gizmo.new()
	add_child(gizmo)


# ------------------------------------------------------------------ modos

func set_mode(m: String, arg := "") -> void:
	_clear_bend()
	mode = m
	_line_a = null
	_rope_a = null
	_joint_a = null
	_cable_nodes = []
	match m:
		"place":
			_place_id = arg
			status.emit("Toca el suelo para colocar: " + arg)
		"line-beam", "line-tube":
			_line_tpl = {"width": 5, "depth": 5, "ends": "plano"} if m == "line-beam" else {"radius": 2.4}
			status.emit("Línea: clic en el punto de INICIO (imán a piezas)")
		"rope-chain", "rope-strap":
			status.emit("Cuerda: clic en el extremo A (pieza o suelo)")
		"joint-revolute", "joint-prismatic":
			status.emit("Clic en la pieza A (anclaje)")
		"cable":
			status.emit("Cable: clic en cada pieza (extremo → poleas → extremo), luego Finalizar")
		"bend":
			_start_bend()
		_:
			status.emit("")


func select_piece(p) -> void:
	if selected and is_instance_valid(selected):
		selected.set_selected(false)
	selected = p
	if selected:
		selected.set_selected(true)
	gizmo.attach(selected)
	selection_changed.emit(selected)


func delete_selected() -> void:
	if selected:
		var p := selected
		select_piece(null)
		world.remove_piece(p)


func duplicate_selected() -> void:
	if selected == null:
		return
	var od := {
		"name": selected.display_name + " copia",
		"componentId": selected.component_id,
		"materialId": selected.material_id,
		"params": selected.params.duplicate(true),
		"physics": {"massKg": selected.mass_kg, "fixed": selected.fixed},
	}
	var p := Piece.create(od)
	p.position = selected.position + Vector3(0.2, 0, 0.2)
	p.quaternion = selected.quaternion
	p.mesh_instance.scale = selected.mesh_instance.scale
	world.add_child(p)
	world.pieces["obj_g%d" % world._next_id] = p
	world._next_id += 1
	select_piece(p)


# -------------------------------------------------------------- raycasting

func _ray(pos: Vector2) -> Dictionary:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
	q.collision_mask = 1
	return get_world_3d().direct_space_state.intersect_ray(q)


func _ground_point(pos: Vector2) -> Variant:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	return Plane(Vector3.UP, 0.0).intersects_ray(from, dir)


## Aim assist: imán a puntos clave de otras piezas si el cursor pasa cerca
## (en píxeles de pantalla); si no, superficie tocada; si no, el suelo.
func _pick_line_point(pos: Vector2) -> Variant:
	var best = null
	var best_px := 20.0
	for p in world.pieces.values():
		for sp in p.snap_points():
			if cam.is_position_behind(sp):
				continue
			var px := cam.unproject_position(sp).distance_to(pos)
			if px < best_px:
				best_px = px
				best = sp
	if best != null:
		return best
	var hit := _ray(pos)
	if not hit.is_empty():
		return hit["position"]
	return _ground_point(pos)


func _rope_end(pos: Vector2) -> Variant:
	var hit := _ray(pos)
	if not hit.is_empty() and hit["collider"] is Piece:
		var p: Piece = hit["collider"]
		var local: Vector3 = p.global_transform.affine_inverse() * Vector3(hit["position"])
		local = local / p.mesh_instance.scale / Units.CM
		return {"objectId": world.id_of(p), "local": [local.x, local.y, local.z]}
	var g = _ground_point(pos)
	if g == null:
		return null
	var gc: Vector3 = g
	return {"objectId": null, "local": [gc.x / Units.CM, gc.y / Units.CM, gc.z / Units.CM]}


# ------------------------------------------------------------------ input

func _input(event: InputEvent) -> void:
	if world == null:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			if _on_press(event.position):
				get_viewport().set_input_as_handled()
		else:
			_on_release()
	elif event is InputEventMouseMotion:
		if _on_motion(event.position):
			get_viewport().set_input_as_handled()


func _on_press(pos: Vector2) -> bool:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)

	# Simulación: mano interactiva y nada más.
	if world.simulating:
		_hand_active = world.try_grab(from, dir)
		return _hand_active

	# Arrastre de un asa de doblado (capa 4).
	if mode == "bend":
		var qh := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
		qh.collision_mask = 4
		var hh := get_world_3d().direct_space_state.intersect_ray(qh)
		if not hh.is_empty():
			_bend_index = int((hh["collider"] as Object).get_meta("node_index"))
			return true
		set_mode("select")
		return false

	# Gizmo primero (capa 2).
	if selected:
		var axis := gizmo.pick_axis(get_world_3d().direct_space_state, from, dir)
		if axis >= 0:
			_drag_axis = axis
			_drag_origin = selected.global_position
			_drag_t0 = Gizmo.closest_axis_t(_drag_origin, Gizmo.AXES[axis], from, dir)
			return true

	match mode:
		"place":
			var g = _ground_point(pos)
			if g != null:
				var gp: Vector3 = g
				var piece := world.add_component(_place_id, gp)
				if piece:
					var half := piece.mesh_instance.get_aabb().size.y / 2.0
					piece.position.y += half
					select_piece(piece)
				set_mode("select")
			return true
		"line-beam", "line-tube":
			var pt = _pick_line_point(pos)
			if pt == null:
				return true
			if _line_a == null:
				_line_a = pt
				status.emit("Ahora clic en el punto FINAL (ESC para salir)")
			else:
				var kind := "beam" if mode == "line-beam" else "tube"
				world.add_line_piece(kind, _line_a, pt, _line_tpl)
				_line_a = null
				status.emit("Pieza creada. Sigue trazando o pulsa ESC")
			return true
		"rope-chain", "rope-strap":
			var end = _rope_end(pos)
			if end == null:
				return true
			if _rope_a == null:
				_rope_a = end
				status.emit("Clic en el extremo B")
			else:
				world.add_rope({
					"name": "Cadena" if mode == "rope-chain" else "Correa",
					"kind": "chain" if mode == "rope-chain" else "strap",
					"slack": 0.25, "a": _rope_a, "b": end,
				})
				set_mode("select")
			return true
		"joint-revolute", "joint-prismatic":
			var hit := _ray(pos)
			if hit.is_empty() or not (hit["collider"] is Piece):
				return true
			var p: Piece = hit["collider"]
			if _joint_a == null:
				_joint_a = p
				status.emit("Clic en la pieza B (móvil); el ancla será el punto tocado")
			elif p != _joint_a:
				var anchor: Vector3 = hit["position"]
				world.add_joint({
					"name": "Bisagra" if mode == "joint-revolute" else "Corredera",
					"kind": "revolute" if mode == "joint-revolute" else "prismatic",
					"bodyAId": world.id_of(_joint_a), "bodyBId": world.id_of(p),
					"anchor": [anchor.x / Units.CM, anchor.y / Units.CM, anchor.z / Units.CM],
					"axis": "z", "limitsEnabled": false, "min": -90, "max": 90,
					"motor": {"enabled": false, "targetVel": 0, "factor": 1},
				})
				status.emit("Articulación creada (eje z; edítala en el .json si hace falta)")
				set_mode("select")
			return true
		"cable":
			var hit := _ray(pos)
			if not hit.is_empty() and hit["collider"] is Piece:
				var p: Piece = hit["collider"]
				var local: Vector3 = p.global_transform.affine_inverse() * Vector3(hit["position"])
				local = local / p.mesh_instance.scale / Units.CM
				_cable_nodes.append({"objectId": world.id_of(p), "local": [local.x, local.y, local.z]})
				status.emit("Cable: %d nodo(s). Pulsa Finalizar para cerrarlo" % _cable_nodes.size())
			return true
	# Selección normal.
	var hit := _ray(pos)
	if not hit.is_empty() and hit["collider"] is Piece:
		select_piece(hit["collider"])
		return false  # deja pasar para poder orbitar arrastrando
	select_piece(null)
	return false


func _on_motion(pos: Vector2) -> bool:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	if _hand_active and world.is_dragging():
		var plane := Plane(-cam.global_transform.basis.z, world._drag_target)
		var hit = plane.intersects_ray(from, dir)
		if hit != null:
			world.drag_to(hit)
		return true
	if _drag_axis >= 0 and selected:
		var t := Gizmo.closest_axis_t(_drag_origin, Gizmo.AXES[_drag_axis], from, dir)
		selected.global_position = _drag_origin + Gizmo.AXES[_drag_axis] * (t - _drag_t0)
		world.refresh_attachments()
		return true
	if _bend_index >= 0 and selected:
		var handle: Node3D = _bend_handles[_bend_index]
		var plane := Plane(-cam.global_transform.basis.z, handle.global_position)
		var hit = plane.intersects_ray(from, dir)
		if hit != null:
			var hp: Vector3 = hit
			handle.global_position = hp
			var local: Vector3 = selected.global_transform.affine_inverse() * hp
			local = local / Units.CM
			selected.params["path"][_bend_index] = [local.x, local.y, local.z]
			selected.rebuild_geometry()
		return true
	return false


func _on_release() -> void:
	if _hand_active:
		world.release_drag()
		_hand_active = false
	_drag_axis = -1
	_bend_index = -1


func finish_cable() -> void:
	if _cable_nodes.size() >= 2:
		world.add_cable({"name": "Cable", "nodes": _cable_nodes.duplicate(true)})
		status.emit("Cable creado")
	_cable_nodes = []
	set_mode("select")


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_ESCAPE:
				set_mode("select")
			KEY_DELETE, KEY_BACKSPACE:
				delete_selected()


# ------------------------------------------------------------------ doblado

func _start_bend() -> void:
	if selected == null or not selected.params.has("path"):
		set_mode("select")
		return
	for i in range(selected.params["path"].size()):
		var body := StaticBody3D.new()
		body.collision_layer = 4
		body.collision_mask = 0
		body.set_meta("node_index", i)
		var mi := MeshInstance3D.new()
		var sph := SphereMesh.new()
		sph.radius = 0.03
		sph.height = 0.06
		mi.mesh = sph
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.13, 0.83, 0.93)
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.no_depth_test = true
		mi.material_override = mat
		body.add_child(mi)
		var col := CollisionShape3D.new()
		var s := SphereShape3D.new()
		s.radius = 0.05
		col.shape = s
		body.add_child(col)
		add_child(body)
		body.global_position = selected.local_cm_to_world(selected.params["path"][i])
		_bend_handles.append(body)
	status.emit("Doblado: arrastra los nodos; clic fuera o ESC para terminar")


func _clear_bend() -> void:
	for h in _bend_handles:
		h.queue_free()
	_bend_handles = []
	_bend_index = -1
