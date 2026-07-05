class_name ModelStore
## Sustitución de modelos 3D (.glb) para componentes de la biblioteca y
## segmentos del maniquí — el corazón del sistema "reemplazable por ficheros"
## de la web, potenciado: en Godot los .glb cargan nativos y persisten en
## user:// (equivalente al IndexedDB de la web).
##
## Prioridad de la pieza: 1) modelo del usuario (user://models/<id>.glb),
## 2) modelo empaquetado (res://models/<id>.glb), 3) primitiva paramétrica.

const USER_COMPONENTS := "user://models"
const USER_MANNEQUIN := "user://mannequin"


static func _ensure_dirs() -> void:
	DirAccess.make_dir_recursive_absolute(USER_COMPONENTS)
	DirAccess.make_dir_recursive_absolute(USER_MANNEQUIN)


static func component_override_path(id: String) -> String:
	var user_path := "%s/%s.glb" % [USER_COMPONENTS, id]
	if FileAccess.file_exists(user_path):
		return user_path
	var packed := "res://models/%s.glb" % id
	if ResourceLoader.exists(packed):
		return packed
	return ""


static func mannequin_override_path(segment_id: String) -> String:
	var user_path := "%s/%s.glb" % [USER_MANNEQUIN, segment_id]
	return user_path if FileAccess.file_exists(user_path) else ""


static func has_component_override(id: String) -> bool:
	return component_override_path(id) != ""


static func has_mannequin_override(segment_id: String) -> bool:
	return mannequin_override_path(segment_id) != ""


## Asigna un .glb del disco al componente/segmento (lo copia a user://).
static func assign(dir: String, id: String, src_path: String) -> bool:
	_ensure_dirs()
	return DirAccess.copy_absolute(src_path, "%s/%s.glb" % [dir, id]) == OK


static func reset(dir: String, id: String) -> void:
	DirAccess.remove_absolute("%s/%s.glb" % [dir, id])


## Instancia el modelo del componente AJUSTADO al hueco de la primitiva:
## se escala uniformemente para igualar la diagonal del AABB objetivo y se
## centra (mismo criterio de "horneado" que la web). Devuelve null si no hay.
static func instantiate_fitted(path: String, target: AABB) -> Node3D:
	if path == "":
		return null
	# Los .glb de user:// no pasan por el importador: se cargan con GLTFDocument.
	var inst: Node3D = null
	if path.begins_with("user://"):
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		if doc.append_from_file(ProjectSettings.globalize_path(path), state) != OK:
			return null
		inst = doc.generate_scene(state)
	else:
		var scene: PackedScene = load(path)
		if scene == null:
			return null
		inst = scene.instantiate()
	if inst == null:
		return null
	var src := scene_aabb(inst)
	if src.size.length() > 0.0001 and target.size.length() > 0.0001:
		var k := target.size.length() / src.size.length()
		inst.scale = Vector3.ONE * k
		inst.position = (target.get_center() - src.get_center() * k)
	return inst


## AABB combinado de todas las mallas de una escena instanciada.
static func scene_aabb(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n: Node = stack.pop_back()
		if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
			var mi := n as MeshInstance3D
			var local: Transform3D
			if root.is_inside_tree() and mi.is_inside_tree():
				local = root.global_transform.affine_inverse() * mi.global_transform
			else:
				local = _relative_transform(root, mi)
			var ab: AABB = local * mi.mesh.get_aabb()
			box = ab if first else box.merge(ab)
			first = false
		for c in n.get_children():
			stack.append(c)
	return box


static func _relative_transform(root: Node3D, node: Node3D) -> Transform3D:
	var t := Transform3D.IDENTITY
	var cur: Node = node
	while cur != null and cur != root:
		if cur is Node3D:
			t = (cur as Node3D).transform * t
		cur = cur.get_parent()
	return t
