class_name Piece
extends RigidBody3D
## Una pieza de la máquina: RigidBody3D congelado durante el diseño y dinámico
## (si tiene masa y no está anclada) durante la simulación. Equivale a
## SceneObject de la app web.

var component_id: String = ""
var display_name: String = ""
var material_id: String = "acero"
var params: Dictionary = {}
var mass_kg: float = 0.0
var fixed: bool = true

var mesh_instance: MeshInstance3D
var collision: CollisionShape3D
## Visual alternativo: modelo .glb de la biblioteca o CSG con pinholes reales.
var override_visual: Node3D = null
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

	p.material_id = String(od.get("materialId", "acero"))
	var mesh := GeometryFactory.build_mesh(p.params)
	p.mesh_instance = MeshInstance3D.new()
	p.mesh_instance.mesh = mesh
	p.mesh_instance.material_override = ComponentLibrary.material(p.material_id)
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
	p.collision = col

	p.mass = maxf(p.mass_kg, 0.05)
	p.freeze = true
	p.freeze_mode = RigidBody3D.FREEZE_MODE_STATIC

	if od.has("position"):
		p.position = Units.arr_cm(od["position"])
	if od.has("quaternion"):
		p.quaternion = Units.quat(od["quaternion"])
	p.refresh_visual()
	return p


## Aplica el visual definitivo: modelo de la biblioteca (user:// o res://) si
## existe; si no y es un perfil recto con pinholes, CSG con agujeros REALES;
## si no, la primitiva paramétrica. La colisión siempre sale de la primitiva.
func refresh_visual() -> void:
	if override_visual:
		override_visual.queue_free()
		override_visual = null
	mesh_instance.visible = true

	var path := ModelStore.component_override_path(component_id)
	if path != "":
		var target: AABB = mesh_instance.mesh.get_aabb()
		var inst := ModelStore.instantiate_fitted(path, target)
		if inst:
			# Respeta la escala no uniforme aplicada a la primitiva.
			inst.scale = inst.scale * mesh_instance.scale
			inst.position = inst.position * mesh_instance.scale
			override_visual = inst
			add_child(inst)
			mesh_instance.visible = false
			return

	if String(params.get("kind", "")) == "beam" and float(params.get("holeDiameter", 0)) > 0.05:
		var csg := _beam_with_pinholes()
		if csg:
			override_visual = csg
			add_child(csg)
			mesh_instance.visible = false
			# El CSG es caro: en cuanto calcule su malla se HORNEA a un
			# MeshInstance3D estático y el nodo CSG se libera (coste 0/frame).
			if is_inside_tree():
				_bake_pinholes.call_deferred(csg)
			else:
				tree_entered.connect(_bake_pinholes.bind(csg), CONNECT_ONE_SHOT)


## Sustituye el CSG de pinholes por su malla horneada (misma geometría).
func _bake_pinholes(csg: CSGCombiner3D) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if not is_instance_valid(csg) or override_visual != csg:
		return
	var baked := csg.bake_static_mesh()
	if baked == null or baked.get_surface_count() == 0:
		return
	var mi := MeshInstance3D.new()
	mi.mesh = baked
	mi.transform = csg.transform
	mi.material_override = ComponentLibrary.material(material_id)
	add_child(mi)
	override_visual = mi
	csg.queue_free()


## Perfil recto con pinholes pasantes reales (CSG: caja menos cilindros).
func _beam_with_pinholes() -> Node3D:
	var ab: AABB = mesh_instance.mesh.get_aabb()
	if ab.size.y < 0.02:
		return null
	var w := ab.size.x
	var length := ab.size.y
	var d := ab.size.z
	var hole_r := Units.cm(float(params.get("holeDiameter", 1.6))) / 2.0
	var spacing := maxf(Units.cm(float(params.get("holeSpacing", 5))), hole_r * 2.0 + 0.005)
	var margin := (w if String(params.get("ends", "plano")) == "diagonal" else w / 2.0) + hole_r
	var usable := length - 2.0 * margin
	if usable <= 0.0:
		return null

	var root := CSGCombiner3D.new()
	var box := CSGBox3D.new()
	box.size = Vector3(w, length, d)
	box.material = ComponentLibrary.material(material_id)
	root.add_child(box)
	var count := int(floor(usable / spacing)) + 1
	var start := -(float(count - 1) * spacing) / 2.0
	for i in range(count):
		var hole := CSGCylinder3D.new()
		hole.operation = CSGShape3D.OPERATION_SUBTRACTION
		hole.radius = hole_r
		hole.height = d * 1.2
		hole.sides = 12
		hole.rotation_degrees.x = 90.0
		hole.position = Vector3(0, start + float(i) * spacing, 0)
		root.add_child(hole)
	root.position = ab.get_center()
	return root


func is_dynamic() -> bool:
	return mass_kg > 0.0 and not fixed


## Congela/descongela según empiece o pare la simulación. El estado de diseño
## se captura como transform LOCAL (las piezas cuelgan directas del World):
## no depende de estar dentro del árbol de escena.
func set_simulating(on: bool) -> void:
	if on:
		_design_transform = transform
		freeze = not is_dynamic()
		# Interpolación física (Godot 4.4+) solo en cuerpos que se mueven:
		# suaviza el paso 60 Hz física → refresco de pantalla.
		physics_interpolation_mode = (
			Node.PHYSICS_INTERPOLATION_MODE_INHERIT if is_dynamic()
			else Node.PHYSICS_INTERPOLATION_MODE_OFF)
	else:
		freeze = true
		linear_velocity = Vector3.ZERO
		angular_velocity = Vector3.ZERO
		transform = _design_transform
		physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_OFF
		reset_physics_interpolation()


## Punto local (cm de la web) a coordenadas de mundo actuales.
func local_cm_to_world(local_cm: Array) -> Vector3:
	return global_transform * (Units.arr_cm(local_cm) * mesh_instance.scale)


## Reconstruye malla y colisión tras editar `params` (dimensiones, path…).
func rebuild_geometry() -> void:
	var mesh := GeometryFactory.build_mesh(params)
	mesh_instance.mesh = mesh
	collision.shape = GeometryFactory.build_collision(mesh, params)
	collision.position = mesh.get_aabb().get_center() * mesh_instance.scale
	refresh_visual()


func set_material_id(id: String) -> void:
	material_id = id
	mesh_instance.material_override = ComponentLibrary.material(id)
	# Con pinholes (CSG u horneado) el visual lleva el material integrado.
	if override_visual and ModelStore.component_override_path(component_id) == "":
		refresh_visual()


## Resalta la pieza seleccionada. Con visual sustituido (glb/CSG) se muestra
## además la primitiva como "fantasma" translúcido para marcar la selección.
func set_selected(on: bool) -> void:
	if on:
		var m: StandardMaterial3D = ComponentLibrary.material(material_id).duplicate()
		m.emission_enabled = true
		m.emission = Color(0.95, 0.93, 0.85)
		m.emission_energy_multiplier = 0.35
		if override_visual:
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			m.albedo_color.a = 0.22
			mesh_instance.visible = true
		mesh_instance.material_override = m
	else:
		mesh_instance.material_override = ComponentLibrary.material(material_id)
		if override_visual:
			mesh_instance.visible = false


## Puntos de imán (mundo): origen, extremos y nodos del path si los hay.
func snap_points() -> PackedVector3Array:
	var pts := PackedVector3Array([global_position])
	if params.has("path"):
		for n in params["path"]:
			pts.append(local_cm_to_world(n))
	else:
		var ab: AABB = mesh_instance.get_aabb()
		for off in [Vector3(0, ab.size.y / 2, 0), Vector3(0, -ab.size.y / 2, 0)]:
			pts.append(global_transform * (off * mesh_instance.scale))
	return pts
