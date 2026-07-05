class_name Serializer
## Serializa el World al MISMO formato .json de la app web (ProjectData v1):
## los proyectos guardados en Godot se abren en la web y viceversa.
## Inverso exacto de World.load_project (m -> cm en posiciones).


static func serialize(world: World) -> Dictionary:
	var objects: Array = []
	for id in world.pieces:
		var p: Piece = world.pieces[id]
		objects.append({
			"id": id,
			"name": p.display_name,
			"componentId": p.component_id,
			"materialId": p.material_id,
			"params": p.params.duplicate(true),
			"physics": {"massKg": p.mass_kg, "fixed": p.fixed},
			"position": _cm3(p.position),
			"quaternion": [p.quaternion.x, p.quaternion.y, p.quaternion.z, p.quaternion.w],
			"scale": [p.mesh_instance.scale.x, p.mesh_instance.scale.y, p.mesh_instance.scale.z],
		})
	# El bloque humano conserva pose y manos tal como llegaron del proyecto,
	# actualizando presencia y transform actual del maniquí.
	var human: Dictionary = world.human_data.duplicate(true)
	human["present"] = world.mannequin != null
	if not human.has("mode"):
		human["mode"] = "mannequin"
	if not human.has("heightCm"):
		human["heightCm"] = 175
	if world.mannequin:
		human["position"] = _cm3(world.mannequin.position)
		human["quaternion"] = _quat4(world.mannequin.quaternion)
	elif not human.has("position"):
		human["position"] = [0, 0, 0]
		human["quaternion"] = [0, 0, 0, 1]
	if not human.has("pose"):
		human["pose"] = null
	if not human.has("hands"):
		human["hands"] = []
	return {
		"version": 1,
		"objects": objects,
		"joints": world.joints_data.duplicate(true),
		"cables": world.cables_data.duplicate(true),
		"ropes": world.ropes_data.duplicate(true),
		"groups": world.groups_data.duplicate(true),
		"human": human,
	}


static func save_file(world: World, path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(serialize(world), "  "))
	return true


static func _cm3(v: Vector3) -> Array:
	return [v.x / Units.CM, v.y / Units.CM, v.z / Units.CM]


static func _quat4(q: Quaternion) -> Array:
	return [q.x, q.y, q.z, q.w]
