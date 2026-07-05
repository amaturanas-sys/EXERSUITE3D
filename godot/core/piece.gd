class_name Piece
extends RigidBody3D
## Una pieza de la máquina: RigidBody3D congelado durante el diseño y dinámico
## (si tiene masa y no está anclada) durante la simulación. Equivale a
## SceneObject de la app web.

var component_id: String = ""
var display_name: String = ""
var params: Dictionary = {}
var mass_kg: float = 0.0
var fixed: bool = true

var mesh_instance: MeshInstance3D
var _design_transform: Transform3D


## Crea una pieza desde un ObjData del .json de proyecto (o desde una
## definición de la biblioteca con `params`/`physics` por defecto).
static func create(od: Dictionary) -> Piece:
	var p := Piece.new()
	p.component_id = String(od.get("componentId", ""))
	p.display_name = String(od.get("name", p.component_id))
	p.name = p.display_name.validate_node_name()
	p.params = od.get("params", {})
	var phys: Dictionary = od.get("physics", {})
	p.mass_kg = float(phys.get("massKg", 0))
	p.fixed = bool(phys.get("fixed", true))

	var mesh := GeometryFactory.build_mesh(p.params)
	p.mesh_instance = MeshInstance3D.new()
	p.mesh_instance.mesh = mesh
	p.mesh_instance.material_override = ComponentLibrary.material(String(od.get("materialId", "acero")))
	# El torus de three vive en el plano XY (eje Z); el de Godot en XZ (eje Y).
	if String(p.params.get("kind", "")) == "torus":
		p.mesh_instance.rotation_degrees.x = 90.0
	# Escala no uniforme del gizmo de la web.
	if od.has("scale"):
		var s: Array = od["scale"]
		p.mesh_instance.scale = Vector3(abs(float(s[0])), abs(float(s[1])), abs(float(s[2])))
	p.add_child(p.mesh_instance)

	var col := CollisionShape3D.new()
	col.shape = GeometryFactory.build_collision(mesh, p.params)
	col.scale = p.mesh_instance.scale
	if String(p.params.get("kind", "")) == "torus":
		col.rotation_degrees.x = 90.0
	# Centra el collider en el AABB real (barridos doblados descentrados).
	col.position = mesh.get_aabb().get_center() * p.mesh_instance.scale
	p.add_child(col)

	p.mass = maxf(p.mass_kg, 0.05)
	p.freeze = true
	p.freeze_mode = RigidBody3D.FREEZE_MODE_STATIC

	if od.has("position"):
		p.position = Units.arr_cm(od["position"])
	if od.has("quaternion"):
		p.quaternion = Units.quat(od["quaternion"])
	return p


func is_dynamic() -> bool:
	return mass_kg > 0.0 and not fixed


## Congela/descongela según empiece o pare la simulación.
func set_simulating(on: bool) -> void:
	if on:
		_design_transform = global_transform
		freeze = not is_dynamic()
	else:
		freeze = true
		linear_velocity = Vector3.ZERO
		angular_velocity = Vector3.ZERO
		global_transform = _design_transform


## Punto local (cm de la web) a coordenadas de mundo actuales.
func local_cm_to_world(local_cm: Array) -> Vector3:
	return global_transform * (Units.arr_cm(local_cm) * mesh_instance.scale)
