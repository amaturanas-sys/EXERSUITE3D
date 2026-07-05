class_name ComponentLibrary
## Biblioteca de componentes y materiales, cargada desde data/components.json
## (generado automáticamente desde el código TypeScript de la app web, así que
## los 47 componentes y 20 materiales son EXACTAMENTE los mismos).

static var _data: Dictionary = {}
static var _by_id: Dictionary = {}
static var _materials: Dictionary = {}          # id -> StandardMaterial3D (caché)
static var _material_defs: Dictionary = {}      # id -> Dictionary


static func _ensure_loaded() -> void:
	if not _data.is_empty():
		return
	var f := FileAccess.open("res://data/components.json", FileAccess.READ)
	if f == null:
		push_error("No se pudo abrir res://data/components.json")
		return
	_data = JSON.parse_string(f.get_as_text())
	for c in _data.get("components", []):
		_by_id[c["id"]] = c
	for m in _data.get("materials", []):
		_material_defs[m["id"]] = m


static func get_definition(id: String) -> Dictionary:
	_ensure_loaded()
	return _by_id.get(id, {})


static func all_components() -> Array:
	_ensure_loaded()
	return _data.get("components", [])


static func category_label(cat: String) -> String:
	_ensure_loaded()
	return _data.get("categories", {}).get(cat, cat)


static func materials_list() -> Array:
	_ensure_loaded()
	return _data.get("materials", [])


## Material PBR equivalente al preset de la web (color entero 0xRRGGBB).
static func material(id: String) -> StandardMaterial3D:
	_ensure_loaded()
	if _materials.has(id):
		return _materials[id]
	var d: Dictionary = _material_defs.get(id, {})
	var mat := StandardMaterial3D.new()
	var color_int := int(d.get("color", 0x8899aa))
	mat.albedo_color = Color(
		float((color_int >> 16) & 0xFF) / 255.0,
		float((color_int >> 8) & 0xFF) / 255.0,
		float(color_int & 0xFF) / 255.0,
	)
	mat.metallic = float(d.get("metalness", 0.3))
	mat.roughness = float(d.get("roughness", 0.6))
	_materials[id] = mat
	return mat
