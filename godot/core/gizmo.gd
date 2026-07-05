class_name Gizmo
extends Node3D
## Gizmo de traslación de 3 ejes (X rojo, Y verde, Z azul), alineado al mundo.
## Cada flecha es un StaticBody3D en la capa 2: el editor lanza un rayo a esa
## capa para saber qué eje se agarra y desplaza la pieza a lo largo de él.

const AXES := [Vector3.RIGHT, Vector3.UP, Vector3.BACK]
const COLORS := [Color(0.9, 0.25, 0.25), Color(0.3, 0.85, 0.35), Color(0.3, 0.5, 0.95)]

var target: Piece = null


func _ready() -> void:
	for i in range(3):
		add_child(_arrow(i))
		add_child(_ring(i))
	visible = false


## Anillo de ROTACIÓN alrededor del eje i (toro fino + colisión por segmentos).
func _ring(index: int) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.collision_layer = 2
	body.collision_mask = 0
	body.set_meta("rot_axis", index)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLORS[index]
	mat.albedo_color.a = 0.85
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.no_depth_test = true
	mat.render_priority = 9

	var mi := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.68
	torus.outer_radius = 0.72
	mi.mesh = torus
	mi.material_override = mat
	body.add_child(mi)

	# Colisión: 12 cajitas repartidas por la circunferencia (el toro no tiene
	# shape nativo). El anillo del toro vive en el plano XZ (eje Y).
	for k in range(12):
		var ang := TAU * float(k) / 12.0
		var col := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(0.14, 0.05, 0.14)
		col.shape = box
		col.position = Vector3(cos(ang), 0, sin(ang)) * 0.7
		body.add_child(col)

	# Orienta el plano del anillo perpendicular a su eje.
	match index:
		0: body.rotation_degrees = Vector3(0, 0, 90)   # eje X
		2: body.rotation_degrees = Vector3(90, 0, 0)   # eje Z
	return body


func _arrow(index: int) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.collision_layer = 2
	body.collision_mask = 0
	body.set_meta("axis", index)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLORS[index]
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.no_depth_test = true
	mat.render_priority = 10

	var shaft := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.012
	cyl.bottom_radius = 0.012
	cyl.height = 0.5
	shaft.mesh = cyl
	shaft.material_override = mat
	shaft.position = Vector3(0, 0.25, 0)
	body.add_child(shaft)

	var head := MeshInstance3D.new()
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 0.045
	cone.height = 0.14
	head.mesh = cone
	head.material_override = mat
	head.position = Vector3(0, 0.55, 0)
	body.add_child(head)

	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.1, 0.7, 0.1)
	col.shape = box
	col.position = Vector3(0, 0.35, 0)
	body.add_child(col)

	# Orienta la flecha (construida en +Y) hacia su eje.
	match index:
		0: body.rotation_degrees = Vector3(0, 0, -90)   # +X
		2: body.rotation_degrees = Vector3(90, 0, 0)    # +Z
	return body


func attach(piece: Piece) -> void:
	target = piece
	visible = piece != null


func _process(_delta: float) -> void:
	if target == null or not visible:
		return
	global_position = target.global_position
	# Tamaño constante en pantalla (aprox.): escala con la distancia a cámara.
	var cam := get_viewport().get_camera_3d()
	if cam:
		scale = Vector3.ONE * clampf(global_position.distance_to(cam.global_position) * 0.28, 0.2, 8.0)


## Asa bajo el rayo: {kind: "move"|"rotate", axis: 0..2} o vacío.
func pick_handle(space: PhysicsDirectSpaceState3D, from: Vector3, dir: Vector3) -> Dictionary:
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
	q.collision_mask = 2
	var hit := space.intersect_ray(q)
	if hit.is_empty():
		return {}
	var collider: Object = hit["collider"]
	if collider.has_meta("axis"):
		return {"kind": "move", "axis": int(collider.get_meta("axis"))}
	if collider.has_meta("rot_axis"):
		return {"kind": "rotate", "axis": int(collider.get_meta("rot_axis"))}
	return {}


## Parámetro t del punto de la línea (origin + t*axis) más cercano al rayo.
static func closest_axis_t(origin: Vector3, axis: Vector3, from: Vector3, dir: Vector3) -> float:
	var w := from - origin
	var a := axis.dot(axis)
	var b := axis.dot(dir)
	var c := dir.dot(dir)
	var d := axis.dot(w)
	var e := dir.dot(w)
	var den := a * c - b * b
	if absf(den) < 1e-8:
		return 0.0
	return (b * e - c * d) / den
