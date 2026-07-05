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
	visible = false


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


## Eje bajo el rayo (0/1/2) o -1. El rayo debe consultarse contra la capa 2.
func pick_axis(space: PhysicsDirectSpaceState3D, from: Vector3, dir: Vector3) -> int:
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 100.0)
	q.collision_mask = 2
	var hit := space.intersect_ray(q)
	if hit.is_empty():
		return -1
	var collider: Object = hit["collider"]
	if collider.has_meta("axis"):
		return int(collider.get_meta("axis"))
	return -1


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
