class_name World
extends Node3D
## Escena de la máquina: carga proyectos .json de la app web, gestiona la
## simulación (joints nativos + cables por conservación de longitud + cuerdas
## en catenaria) y la mano interactiva. Equivale al núcleo de Editor.ts.

signal simulation_changed(running: bool)

var pieces: Dictionary = {}          # id original del .json -> Piece
var joints_data: Array = []          # JointData crudos del proyecto
var cables_data: Array = []          # CableData crudos (nodos remapeados)
var ropes_data: Array = []           # RopeData crudos
var mannequin: Mannequin = null

var simulating := false
var _joint_nodes: Array[Node] = []
var _cable_runtime: Array = []       # { bodies: [Piece], locals: [Vector3(m)], rest: float }
var _rope_visuals: Array = []        # { data, node: MultiMeshInstance3D }
var _cable_lines: MeshInstance3D

# Mano interactiva (resorte en el punto de agarre; ver PhysicsWorld.applyDrag).
var _drag_body: Piece = null
var _drag_local := Vector3.ZERO      # punto de agarre en local del cuerpo (m)
var _drag_target := Vector3.ZERO     # objetivo en mundo (m)


func _ready() -> void:
	_cable_lines = MeshInstance3D.new()
	_cable_lines.mesh = ImmediateMesh.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(0.85, 0.87, 0.91)
	_cable_lines.material_override = mat
	add_child(_cable_lines)


# ------------------------------------------------------------------ proyecto

func clear() -> void:
	set_simulating(false)
	for p in pieces.values():
		p.queue_free()
	pieces.clear()
	joints_data = []
	cables_data = []
	ropes_data = []
	for r in _rope_visuals:
		r["node"].queue_free()
	_rope_visuals = []
	if mannequin:
		mannequin.queue_free()
		mannequin = null


## Carga un proyecto en el formato .json de EXERSUITE3D web (ProjectData).
func load_project(data: Dictionary) -> void:
	clear()
	for od in data.get("objects", []):
		var piece := Piece.create(od)
		add_child(piece)
		pieces[String(od.get("id", str(pieces.size())))] = piece
	joints_data = data.get("joints", [])
	cables_data = data.get("cables", [])
	ropes_data = data.get("ropes", [])
	for rd in ropes_data:
		_rope_visuals.append({"data": rd, "node": _make_rope_node(rd)})
	_update_ropes()
	var human: Dictionary = data.get("human", {})
	if bool(human.get("present", false)):
		mannequin = Mannequin.create(float(human.get("heightCm", 175)), human.get("pose"))
		add_child(mannequin)
		if human.has("position"):
			mannequin.position = Units.arr_cm(human["position"])
		if human.has("quaternion"):
			mannequin.quaternion = Units.quat(human["quaternion"])
	_update_cable_lines()


# ------------------------------------------------------------ edición

var _next_id := 1


## Añade una pieza desde una definición de la biblioteca, en la posición dada.
func add_component(component_id: String, pos: Vector3) -> Piece:
	var def := ComponentLibrary.get_definition(component_id)
	if def.is_empty():
		return null
	var od := {
		"id": "obj_g%d" % _next_id,
		"name": String(def.get("label", component_id)),
		"componentId": component_id,
		"materialId": def.get("materialId", "acero"),
		"params": (def.get("defaults", {}) as Dictionary).duplicate(true),
		"physics": (def.get("physics", {}) as Dictionary).duplicate(true),
	}
	_next_id += 1
	var piece := Piece.create(od)
	piece.position = pos
	add_child(piece)
	pieces[od["id"]] = piece
	return piece


## Añade una pieza de línea (beam/tube) entre dos puntos de mundo (metros).
func add_line_piece(kind: String, a: Vector3, b: Vector3, tpl: Dictionary) -> Piece:
	var length_cm := a.distance_to(b) / Units.CM
	if length_cm < 2.0:
		return null
	var path := []
	for i in range(5):
		var t := float(i) / 4.0
		path.append([0.0, -length_cm / 2.0 + t * length_cm, 0.0])
	var params := tpl.duplicate(true)
	params["kind"] = kind
	params["path"] = path
	var od := {
		"id": "obj_g%d" % _next_id,
		"name": "Perfil (línea)" if kind == "beam" else "Tubo (línea)",
		"componentId": "pilar-linea" if kind == "beam" else "tubo-linea",
		"materialId": "acero-negro",
		"params": params,
		"physics": {"massKg": 0, "fixed": true},
	}
	_next_id += 1
	var piece := Piece.create(od)
	piece.position = (a + b) / 2.0
	var dir := (b - a).normalized()
	piece.quaternion = Quaternion(Vector3.UP, dir) if not Vector3.UP.is_equal_approx(dir) else Quaternion.IDENTITY
	add_child(piece)
	pieces[od["id"]] = piece
	return piece


func id_of(piece: Piece) -> String:
	for id in pieces:
		if pieces[id] == piece:
			return id
	return ""


## Elimina una pieza y todo lo que la referencia (joints, cables, cuerdas).
func remove_piece(piece: Piece) -> void:
	var pid := id_of(piece)
	if pid == "":
		return
	joints_data = joints_data.filter(func(j): return j.get("bodyAId") != pid and j.get("bodyBId") != pid)
	cables_data = cables_data.filter(func(c):
		for nd in c.get("nodes", []):
			if String(nd.get("objectId", "")) == pid:
				return false
		return true)
	var kept: Array = []
	for rv in _rope_visuals:
		var rd: Dictionary = rv["data"]
		var a_id = rd.get("a", {}).get("objectId")
		var b_id = rd.get("b", {}).get("objectId")
		if String(a_id if a_id != null else "") == pid or String(b_id if b_id != null else "") == pid:
			rv["node"].queue_free()
		else:
			kept.append(rv)
	_rope_visuals = kept
	ropes_data = ropes_data.filter(func(r):
		var a_id = r.get("a", {}).get("objectId")
		var b_id = r.get("b", {}).get("objectId")
		return String(a_id if a_id != null else "") != pid and String(b_id if b_id != null else "") != pid)
	pieces.erase(pid)
	piece.queue_free()
	_update_cable_lines()


## Añade una cuerda (cadena/correa) entre dos extremos (RopeData de la web).
func add_rope(rd: Dictionary) -> void:
	ropes_data.append(rd)
	_rope_visuals.append({"data": rd, "node": _make_rope_node(rd)})
	_update_ropes()


func add_joint(jd: Dictionary) -> void:
	joints_data.append(jd)


func add_cable(cd: Dictionary) -> void:
	cables_data.append(cd)
	_update_cable_lines()


## Refresca cuerdas y cables tras mover piezas en el editor.
func refresh_attachments() -> void:
	_update_ropes()
	_update_cable_lines()


func load_project_file(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return false
	var data = JSON.parse_string(f.get_as_text())
	if not (data is Dictionary):
		return false
	load_project(data)
	return true


func bounds() -> AABB:
	var box := AABB()
	var first := true
	for p in pieces.values():
		var ab: AABB = p.mesh_instance.global_transform * p.mesh_instance.get_aabb()
		box = ab if first else box.merge(ab)
		first = false
	if mannequin:
		var mb := AABB(mannequin.position - Vector3(0.3, 0, 0.3), Vector3(0.6, 1.9, 0.6))
		box = mb if first else box.merge(mb)
		first = false
	if first:
		box = AABB(Vector3(-1, 0, -1), Vector3(2, 2, 2))
	return box


# ---------------------------------------------------------------- simulación

func set_simulating(on: bool) -> void:
	if on == simulating:
		return
	simulating = on
	if on:
		for p in pieces.values():
			p.set_simulating(true)
		_create_joints()
		_create_cables()
	else:
		_release_drag()
		for j in _joint_nodes:
			j.queue_free()
		_joint_nodes = []
		_cable_runtime = []
		for p in pieces.values():
			p.set_simulating(false)
		_update_ropes()
		_update_cable_lines()
	simulation_changed.emit(on)


func _create_joints() -> void:
	for jd in joints_data:
		var a: Piece = pieces.get(String(jd.get("bodyAId", "")))
		var b: Piece = pieces.get(String(jd.get("bodyBId", "")))
		if a == null or b == null:
			continue
		var anchor := Units.arr_cm(jd.get("anchor", [0, 0, 0]))
		var axis := _axis_vec(String(jd.get("axis", "y")))
		var joint: Joint3D
		if String(jd.get("kind", "revolute")) == "revolute":
			var h := HingeJoint3D.new()
			# El eje de la bisagra es el Z local del nodo joint.
			add_child(h)
			h.global_transform = _frame_with_z(anchor, axis)
			if bool(jd.get("limitsEnabled", false)):
				h.set_flag(HingeJoint3D.FLAG_USE_LIMIT, true)
				h.set_param(HingeJoint3D.PARAM_LIMIT_LOWER, deg_to_rad(float(jd.get("min", -180))))
				h.set_param(HingeJoint3D.PARAM_LIMIT_UPPER, deg_to_rad(float(jd.get("max", 180))))
			var motor: Dictionary = jd.get("motor", {})
			if bool(motor.get("enabled", false)):
				h.set_flag(HingeJoint3D.FLAG_ENABLE_MOTOR, true)
				h.set_param(HingeJoint3D.PARAM_MOTOR_TARGET_VELOCITY,
					deg_to_rad(float(motor.get("targetVel", 0))))
			joint = h
		else:
			var s := SliderJoint3D.new()
			# La corredera desliza por el X local del nodo joint.
			add_child(s)
			s.global_transform = _frame_with_x(anchor, axis)
			if bool(jd.get("limitsEnabled", false)):
				s.set_param(SliderJoint3D.PARAM_LINEAR_LIMIT_LOWER, Units.cm(float(jd.get("min", -100))))
				s.set_param(SliderJoint3D.PARAM_LINEAR_LIMIT_UPPER, Units.cm(float(jd.get("max", 100))))
			joint = s
		joint.node_a = a.get_path()
		joint.node_b = b.get_path()
		joint.exclude_nodes_from_collision = true
		_joint_nodes.append(joint)


static func _axis_vec(axis: String) -> Vector3:
	match axis:
		"x": return Vector3.RIGHT
		"z": return Vector3.BACK
	return Vector3.UP


static func _frame_with_z(origin: Vector3, z_axis: Vector3) -> Transform3D:
	var z := z_axis.normalized()
	var x := z.cross(Vector3.UP)
	if x.length() < 0.01:
		x = z.cross(Vector3.RIGHT)
	x = x.normalized()
	return Transform3D(Basis(x, z.cross(x).normalized(), z).orthonormalized(), origin)


static func _frame_with_y(origin: Vector3, y_axis: Vector3) -> Transform3D:
	var y := y_axis.normalized()
	var x := y.cross(Vector3.BACK)
	if x.length() < 0.01:
		x = y.cross(Vector3.RIGHT)
	x = x.normalized()
	return Transform3D(Basis(x, y, x.cross(y).normalized()).orthonormalized(), origin)


static func _frame_with_x(origin: Vector3, x_axis: Vector3) -> Transform3D:
	var x := x_axis.normalized()
	var y := x.cross(Vector3.UP)
	if y.length() < 0.01:
		y = x.cross(Vector3.RIGHT)
	y = y.normalized()
	return Transform3D(Basis(x, y, x.cross(y).normalized()).orthonormalized(), origin)


# ------------------------------------------------- cables (porte del solver)

func _create_cables() -> void:
	_cable_runtime = []
	for cd in cables_data:
		var bodies: Array = []
		var locals: Array = []
		var valid := true
		for nd in cd.get("nodes", []):
			var p: Piece = pieces.get(String(nd.get("objectId", "")))
			if p == null:
				valid = false
				break
			bodies.append(p)
			var l = nd.get("local", [0, 0, 0])
			var la: Array = l if l is Array else [l.get("x", 0), l.get("y", 0), l.get("z", 0)]
			locals.append(Units.arr_cm(la) * p.mesh_instance.scale)
		if not valid or bodies.size() < 2:
			continue
		var entry := {"bodies": bodies, "locals": locals, "rest": 0.0}
		entry["rest"] = _cable_length(entry)
		_cable_runtime.append(entry)


func _node_world(entry: Dictionary, i: int) -> Vector3:
	var b: Piece = entry["bodies"][i]
	return b.global_transform * entry["locals"][i]


func _cable_length(entry: Dictionary) -> float:
	var L := 0.0
	for i in range(entry["bodies"].size() - 1):
		L += _node_world(entry, i).distance_to(_node_world(entry, i + 1))
	return L


## Gradientes de la longitud respecto a cada nodo (el ratio 2:1 de las poleas
## móviles emerge solo, como en la web: el nodo interior "siente" dos tramos).
func _cable_gradients(pts: Array) -> Array:
	var J: Array = []
	var n: int = pts.size()
	for i in range(n):
		var g := Vector3.ZERO
		if i > 0:
			g += (pts[i] - pts[i - 1]).normalized()
		if i < n - 1:
			g += (pts[i] - pts[i + 1]).normalized()
		J.append(g)
	return J


func _solve_cable(entry: Dictionary) -> void:
	var bodies: Array = entry["bodies"]
	var n: int = bodies.size()
	if _cable_length(entry) <= entry["rest"]:
		return
	var pts: Array = []
	for i in range(n):
		pts.append(_node_world(entry, i))
	var J := _cable_gradients(pts)
	var inv_m: Array = []
	var eff := 0.0
	for i in range(n):
		var b: Piece = bodies[i]
		var im := 0.0 if b.freeze else 1.0 / b.mass
		inv_m.append(im)
		eff += im * J[i].length_squared()
	if eff <= 0.0:
		return
	# Velocidad: elimina el alargamiento.
	var vrel := 0.0
	for i in range(n):
		vrel += J[i].dot(bodies[i].linear_velocity)
	if vrel > 0.0:
		var lambda := -vrel / eff
		for i in range(n):
			if inv_m[i] > 0.0:
				bodies[i].linear_velocity += J[i] * (inv_m[i] * lambda)
	# Posición: proyecta para conservar la longitud (cable inextensible).
	var C: float = _cable_length(entry) - entry["rest"]
	if C > 0.0:
		var lambda2 := -C / eff
		for i in range(n):
			if inv_m[i] > 0.0:
				bodies[i].global_position += J[i] * (inv_m[i] * lambda2)


# ------------------------------------------------------------ cuerdas y mano

func _make_rope_node(rd: Dictionary) -> MultiMeshInstance3D:
	var mmi := MultiMeshInstance3D.new()
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	if String(rd.get("kind", "chain")) == "chain":
		var t := TorusMesh.new()
		t.inner_radius = 0.011
		t.outer_radius = 0.024
		mm.mesh = t
		mmi.material_override = ComponentLibrary.material("acero-negro")
	else:
		var bx := BoxMesh.new()
		bx.size = Vector3(0.08, 0.09, 0.012)
		mm.mesh = bx
		mmi.material_override = ComponentLibrary.material("amarillo")
	mmi.multimesh = mm
	add_child(mmi)
	return mmi


func _rope_end_world(e: Dictionary) -> Vector3:
	var oid = e.get("objectId")
	if oid != null and pieces.has(String(oid)):
		return pieces[String(oid)].local_cm_to_world(e.get("local", [0, 0, 0]))
	return Units.arr_cm(e.get("local", [0, 0, 0]))


## Catenaria (parábola) idéntica a la web: sag = slack * D * 0.45.
func _update_ropes() -> void:
	for rv in _rope_visuals:
		var rd: Dictionary = rv["data"]
		var mm: MultiMesh = rv["node"].multimesh
		var A := _rope_end_world(rd.get("a", {}))
		var B := _rope_end_world(rd.get("b", {}))
		var D := A.distance_to(B)
		if D < 0.001:
			mm.instance_count = 0
			continue
		var sag: float = float(rd.get("slack", 0.25)) * D * 0.45
		var seg_len := 0.05 if String(rd.get("kind", "chain")) == "chain" else 0.09
		var n := clampi(int(round(D * (1.0 + 2.67 * pow(sag / D, 2)) / seg_len)), 6, 140)
		mm.instance_count = n
		for i in range(n):
			var t0 := float(i) / float(n)
			var t1 := float(i + 1) / float(n)
			var p0 := A.lerp(B, t0) - Vector3(0, 4.0 * sag * t0 * (1.0 - t0), 0)
			var p1 := A.lerp(B, t1) - Vector3(0, 4.0 * sag * t1 * (1.0 - t1), 0)
			# Eslabón/listón con su eje Y a lo largo de la cuerda (el toro de
			# Godot tiene el agujero en Y: los eslabones se enhebran).
			var seg_basis := _frame_with_y((p0 + p1) / 2.0, p1 - p0).basis
			if i % 2 == 1:
				seg_basis = seg_basis.rotated((p1 - p0).normalized(), PI / 2)
			mm.set_instance_transform(i, Transform3D(seg_basis, (p0 + p1) / 2.0))


func _update_cable_lines() -> void:
	var im: ImmediateMesh = _cable_lines.mesh
	im.clear_surfaces()
	if cables_data.is_empty():
		return
	im.surface_begin(Mesh.PRIMITIVE_LINES)
	for cd in cables_data:
		var nodes: Array = cd.get("nodes", [])
		for i in range(nodes.size() - 1):
			var a: Piece = pieces.get(String(nodes[i].get("objectId", "")))
			var b: Piece = pieces.get(String(nodes[i + 1].get("objectId", "")))
			if a == null or b == null:
				continue
			im.surface_add_vertex(a.local_cm_to_world(_loc(nodes[i])))
			im.surface_add_vertex(b.local_cm_to_world(_loc(nodes[i + 1])))
	im.surface_end()


static func _loc(node: Dictionary) -> Array:
	var l = node.get("local", [0, 0, 0])
	return l if l is Array else [l.get("x", 0), l.get("y", 0), l.get("z", 0)]


## Mano interactiva: agarra la pieza dinámica bajo el rayo de cámara.
func try_grab(from: Vector3, dir: Vector3) -> bool:
	if not simulating:
		return false
	var space := get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
	q.collision_mask = 1  # solo piezas (el suelo vive en la capa 8)
	var hit := space.intersect_ray(q)
	if hit.is_empty() or not (hit["collider"] is Piece):
		return false
	var p: Piece = hit["collider"]
	if p.freeze:
		return false
	_drag_body = p
	_drag_local = p.global_transform.affine_inverse() * Vector3(hit["position"])
	_drag_target = hit["position"]
	return true


func drag_to(target: Vector3) -> void:
	_drag_target = target


func _release_drag() -> void:
	_drag_body = null


func release_drag() -> void:
	_release_drag()


func is_dragging() -> bool:
	return _drag_body != null


func _physics_process(_delta: float) -> void:
	if not simulating:
		return
	# Resorte crítico de la mano (aceleración limitada, como en la web).
	if _drag_body != null:
		var pw: Vector3 = _drag_body.global_transform * _drag_local
		var acc := (_drag_target - pw) * 60.0 - _drag_body.linear_velocity * 12.0
		acc = acc.limit_length(60.0)
		_drag_body.apply_force(acc * _drag_body.mass, pw - _drag_body.global_position)
	for it in range(4):
		for entry in _cable_runtime:
			_solve_cable(entry)


func _process(_delta: float) -> void:
	if simulating:
		_update_ropes()
		_update_cable_lines()
