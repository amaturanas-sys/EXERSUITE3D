class_name EditorController
extends Node3D
## Controlador del editor (Builder): selección con gizmo, colocación de piezas,
## trazado por línea con aim assist, cuerdas, articulaciones, cables, doblado
## por nodos y mano interactiva en simulación. Equivale a Editor.ts (núcleo).

signal selection_changed(piece)
signal status(msg: String)
## Herramienta de chapa: cuántas caras van marcadas, qué parte de la
## superficie se llevan y dónde cae su centro (para poner la burbuja encima).
signal chapa_changed(caras: int, frac: float, centro: Vector3, activa: bool)

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
var selection: Array = []           # multiselección (incluye a `selected`)
var _drag_kind := ""                # "move" | "rotate" (asa del gizmo activa)
var _drag_axis := -1
var _drag_t0 := 0.0
var _drag_origin := Vector3.ZERO
var _drag_starts: Dictionary = {}   # Piece -> Transform3D al iniciar arrastre
var _rot_angle0 := 0.0
var _hand_active := false
var _bend_handles: Array = []       # StaticBody3D capa 4
var _bend_index := -1

# ---- herramienta de CHAPA (paridad con la web v0.3.72)
var _chapa_piece: Piece = null
var _chapa_caras: Array = []        # Array[Chapa.Cara] de la malla actual
var _chapa_sel: Dictionary = {}     # índice de cara -> true
var _chapa_marca: MeshInstance3D = null
var _chapa_down := Vector2.ZERO     # dónde se pulsó: clic o arrastre de órbita
var chapa_grosor_cm := 0.3          # lo que pida uno es lo que propone el siguiente


func setup(w: World, c: OrbitCamera) -> void:
	world = w
	cam = c
	gizmo = Gizmo.new()
	add_child(gizmo)


# ------------------------------------------------------------------ modos

func set_mode(m: String, arg := "") -> void:
	_clear_bend()
	if m != "chapa":
		_chapa_limpiar()
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
		"chapa":
			# Si ya había UNA pieza elegida, esa es: pedir otro clic sería
			# repetir lo que el usuario acaba de decir.
			if selected != null:
				_chapa_tomar(selected)
				status.emit("Chapa: toca las caras que sobran")
			else:
				status.emit("Chapa: elige la pieza")
			_chapa_emitir()
		_:
			status.emit("")


func select_piece(p) -> void:
	select_pieces([] if p == null else [p], p)


## Selección múltiple: `primary` lleva el gizmo; todas se resaltan y se
## mueven/rotan juntas. Seleccionar una pieza agrupada selecciona su grupo.
func select_pieces(list: Array, primary) -> void:
	for old in selection:
		if is_instance_valid(old):
			old.set_selected(false)
	selection = []
	for piece in list:
		if piece != null and not selection.has(piece):
			selection.append(piece)
	# Expande a los grupos: cualquier grupo que contenga una seleccionada.
	for g in world.groups_data:
		var has_any := false
		for id in g.get("ids", []):
			var member = world.pieces.get(String(id))
			if member != null and selection.has(member):
				has_any = true
				break
		if has_any:
			for id in g.get("ids", []):
				var member = world.pieces.get(String(id))
				if member != null and not selection.has(member):
					selection.append(member)
	selected = primary if primary != null else (selection[0] if not selection.is_empty() else null)
	for piece in selection:
		piece.set_selected(true)
	gizmo.attach(selected)
	selection_changed.emit(selected)


## Agrupa la selección actual (subensamblaje persistente en el .json).
func group_selection() -> void:
	if selection.size() < 2:
		status.emit("Selecciona 2+ piezas (Shift+clic) para agrupar")
		return
	var ids: Array = []
	for piece in selection:
		ids.append(world.id_of(piece))
	world.groups_data.append({"name": "Grupo %d" % (world.groups_data.size() + 1), "ids": ids})
	status.emit("Grupo creado (%d piezas)" % ids.size())


func ungroup_selection() -> void:
	if selected == null:
		return
	var pid := world.id_of(selected)
	world.groups_data = world.groups_data.filter(func(g): return not (g.get("ids", []) as Array).has(pid))
	status.emit("Grupo disuelto")
	select_piece(selected)


func delete_selected() -> void:
	var doomed := selection.duplicate()
	select_piece(null)
	for piece in doomed:
		if is_instance_valid(piece):
			world.remove_piece(piece)


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
			_on_release(event.position)
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

	# HERRAMIENTA DE CHAPA: el clic se resuelve AL SOLTAR, y sólo si el
	# puntero no se movió. Así el arrastre queda entero para la cámara: sin
	# eso no hay manera de dar la vuelta a la pieza para llegar a la cara de
	# atrás sin perder lo ya marcado.
	if mode == "chapa":
		_chapa_down = pos
		return false

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

	# Gizmo primero (capa 2): flechas = mover, anillos = rotar.
	if selected:
		var handle := gizmo.pick_handle(get_world_3d().direct_space_state, from, dir)
		if not handle.is_empty():
			_drag_kind = String(handle["kind"])
			_drag_axis = int(handle["axis"])
			_drag_origin = selected.global_position
			_drag_starts = {}
			for piece in selection:
				_drag_starts[piece] = piece.global_transform
			if _drag_kind == "move":
				_drag_t0 = Gizmo.closest_axis_t(_drag_origin, Gizmo.AXES[_drag_axis], from, dir)
			else:
				_rot_angle0 = _ring_angle(from, dir)
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
	# Selección normal (Shift/Ctrl+clic añade o quita de la multiselección).
	var hit := _ray(pos)
	var multi := Input.is_key_pressed(KEY_SHIFT) or Input.is_key_pressed(KEY_CTRL)
	if not hit.is_empty() and hit["collider"] is Piece:
		var piece: Piece = hit["collider"]
		if multi and not selection.is_empty():
			var list := selection.duplicate()
			if list.has(piece):
				list.erase(piece)
			else:
				list.append(piece)
			select_pieces(list, piece if list.has(piece) else (list[0] if not list.is_empty() else null))
		else:
			select_piece(piece)
		return false  # deja pasar para poder orbitar arrastrando
	if not multi:
		select_piece(null)
	return false


## Ángulo del cursor alrededor del eje del anillo activo (para rotar).
func _ring_angle(from: Vector3, dir: Vector3) -> float:
	var axis: Vector3 = Gizmo.AXES[_drag_axis]
	var plane := Plane(axis, _drag_origin.dot(axis))
	var hit = plane.intersects_ray(from, dir)
	if hit == null:
		return _rot_angle0
	var v: Vector3 = (hit as Vector3) - _drag_origin
	var b1: Vector3 = axis.cross(Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.9 else Vector3.RIGHT).normalized()
	var b2: Vector3 = axis.cross(b1)
	return atan2(v.dot(b2), v.dot(b1))


func _on_motion(pos: Vector2) -> bool:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	if _hand_active and world.is_dragging():
		var plane := Plane(-cam.global_transform.basis.z, world._drag_target)
		var hit = plane.intersects_ray(from, dir)
		if hit != null:
			world.drag_to(hit)
		return true
	if _drag_kind == "move" and _drag_axis >= 0 and selected:
		var t := Gizmo.closest_axis_t(_drag_origin, Gizmo.AXES[_drag_axis], from, dir)
		var delta: Vector3 = Gizmo.AXES[_drag_axis] * (t - _drag_t0)
		for piece in _drag_starts:
			piece.global_position = (_drag_starts[piece] as Transform3D).origin + delta
		world.refresh_attachments()
		return true
	if _drag_kind == "rotate" and _drag_axis >= 0 and selected:
		var ang := _ring_angle(from, dir) - _rot_angle0
		var rot := Quaternion(Gizmo.AXES[_drag_axis], ang)
		for piece in _drag_starts:
			var t0: Transform3D = _drag_starts[piece]
			piece.global_position = _drag_origin + rot * (t0.origin - _drag_origin)
			piece.quaternion = rot * t0.basis.get_rotation_quaternion()
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


func _on_release(pos := Vector2.INF) -> void:
	if mode == "chapa" and pos.is_finite() and pos.distance_to(_chapa_down) <= 6.0:
		_chapa_clic(pos)
		return
	if _hand_active:
		world.release_drag()
		_hand_active = false
	_drag_kind = ""
	_drag_axis = -1
	_drag_starts = {}
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


# --------------------------------------------------------- herramienta CHAPA
#
# Misma mecánica que en la web: se elige UNA pieza —y a partir de ahí la
# herramienta no mira ninguna otra—, se van tocando las caras que sobran y una
# burbuja sobre la selección pide el grosor y confirma. Orbitar no pierde nada
# porque el clic se resuelve al soltar (ver `_on_press`).

## Toma la pieza sobre la que se va a trabajar y le reconoce las caras.
func _chapa_tomar(p: Piece) -> void:
	_chapa_borrar_marca()
	_chapa_piece = p
	_chapa_sel = {}
	_chapa_caras = Chapa.detectar_caras(p.nodo_visible().mesh.get_faces())
	select_piece(p)
	gizmo.visible = false   # sus flechas atraviesan justo las caras a señalar


## El clic, ya resuelto como clic. Con pieza tomada sólo se mira ESA pieza.
func _chapa_clic(pos: Vector2) -> void:
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	if _chapa_piece == null:
		var hit := _ray(pos)
		if hit.is_empty():
			return
		if not (hit["collider"] is Piece):
			return
		var p: Piece = hit["collider"]
		_chapa_tomar(p)
		status.emit("Chapa sobre «%s»: toca las caras que sobran" % p.display_name)
		_chapa_emitir()
		return
	var t := _chapa_triangulo(from, dir)
	if t < 0:
		# Fuera de la pieza: si aún no hay nada marcado, el clic cambia de
		# pieza; con caras marcadas no se pierde el trabajo por apuntar mal.
		if _chapa_sel.is_empty():
			var hit := _ray(pos)
			if not hit.is_empty() and hit["collider"] is Piece:
				var p: Piece = hit["collider"]
				if p != _chapa_piece:
					_chapa_tomar(p)
					_chapa_emitir()
		return
	for i in _chapa_caras.size():
		if (_chapa_caras[i] as Chapa.Cara).tris.has(t):
			if _chapa_sel.has(i):
				_chapa_sel.erase(i)
			else:
				_chapa_sel[i] = true
			break
	_chapa_pintar_marca()
	_chapa_emitir()


## Triángulo de la pieza bajo el rayo (el más cercano), o −1.
func _chapa_triangulo(from: Vector3, dir: Vector3) -> int:
	if _chapa_piece == null:
		return -1
	var mi := _chapa_piece.nodo_visible()
	var inv := mi.global_transform.affine_inverse()
	var a := inv * from
	var b := inv * (from + dir * 1000.0)
	var tris: PackedVector3Array = mi.mesh.get_faces()
	var mejor := -1
	var corta := INF
	for i in range(0, tris.size(), 3):
		var p = Geometry3D.segment_intersects_triangle(a, b, tris[i], tris[i + 1], tris[i + 2])
		if p == null:
			continue
		var d: float = (p - a).length_squared()
		if d < corta:
			corta = d
			mejor = i / 3
	return mejor


## Las caras marcadas, en naranja, como una calca sobre la pieza.
func _chapa_pintar_marca() -> void:
	_chapa_borrar_marca()
	if _chapa_piece == null or _chapa_sel.is_empty():
		return
	var visible := _chapa_piece.nodo_visible()
	var tris: PackedVector3Array = visible.mesh.get_faces()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in _chapa_sel.keys():
		for t in (_chapa_caras[i] as Chapa.Cara).tris:
			for k in 3:
				st.add_vertex(tris[t * 3 + k])
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.478, 0.094, 0.55)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.no_depth_test = false
	_chapa_marca = MeshInstance3D.new()
	_chapa_marca.mesh = st.commit()
	_chapa_marca.material_override = mat
	_chapa_marca.sorting_offset = 1.0
	visible.add_child(_chapa_marca)


func _chapa_borrar_marca() -> void:
	if _chapa_marca != null:
		_chapa_marca.queue_free()
		_chapa_marca = null


## Centro de las caras marcadas, en el mundo (ahí va la burbuja).
func chapa_centro() -> Vector3:
	if _chapa_piece == null or _chapa_sel.is_empty():
		return Vector3.INF
	var c := Vector3.ZERO
	var peso := 0.0
	for i in _chapa_sel.keys():
		var cara := _chapa_caras[i] as Chapa.Cara
		c += cara.centro * cara.area
		peso += cara.area
	if peso <= 0.0:
		return Vector3.INF
	return _chapa_piece.nodo_visible().global_transform * (c / peso)


## Qué parte de la superficie se llevan las caras marcadas (0..1).
func chapa_fraccion() -> float:
	var f := 0.0
	for i in _chapa_sel.keys():
		f += (_chapa_caras[i] as Chapa.Cara).frac_area
	return f


func _chapa_emitir() -> void:
	chapa_changed.emit(_chapa_sel.size(), chapa_fraccion(), chapa_centro(), mode == "chapa")


## CONFIRMADO: la pieza deja de ser un macizo. Las caras se guardan en los
## params —por lo que SON, no por su número—, así que la chapa sobrevive a
## cambiar la medida de la pieza, a guardar el proyecto y a abrirlo en la web.
func chapa_aplicar() -> void:
	if _chapa_piece == null or _chapa_sel.is_empty():
		return
	var p := _chapa_piece
	var previas: Array = []
	var ya = p.params.get("chapa")
	if ya is Dictionary:
		previas = ya.get("caras", [])
	var nuevas: Array = previas.duplicate()
	for i in _chapa_sel.keys():
		nuevas.append(Chapa.ficha_de(_chapa_caras[i] as Chapa.Cara))
	p.params["chapa"] = {"grosorCm": chapa_grosor_cm, "caras": nuevas}
	_chapa_borrar_marca()
	p.rebuild_geometry()
	var n := _chapa_sel.size()
	_chapa_limpiar()
	set_mode("select")
	select_piece(p)
	status.emit("Chapa de %.2f cm: %d cara%s eliminada%s" % [
		chapa_grosor_cm, n, "" if n == 1 else "s", "" if n == 1 else "s"])


## Desmarca las caras sin tocar la pieza.
func chapa_desmarcar() -> void:
	_chapa_sel = {}
	_chapa_pintar_marca()
	_chapa_emitir()


## Devuelve la pieza al macizo del que salió.
func chapa_volver_a_macizo(p: Piece) -> void:
	if not (p.params.get("chapa") is Dictionary):
		return
	p.params.erase("chapa")
	p.rebuild_geometry()
	status.emit("«%s» vuelve a ser maciza" % p.display_name)


func _chapa_limpiar() -> void:
	_chapa_borrar_marca()
	_chapa_piece = null
	_chapa_caras = []
	_chapa_sel = {}
	if gizmo != null:
		gizmo.visible = true
	_chapa_emitir()
