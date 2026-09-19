class_name ComponentLibrary
## Biblioteca de componentes y materiales, cargada desde data/components.json
## (generado automáticamente desde el código TypeScript de la app web, así que
## los 104 componentes y 20 materiales son EXACTAMENTE los mismos).
##
## NO TODO LO QUE ESTÁ EN LA BIBLIOTECA VA A LA PALETA, y confundirlo llena la
## barra de piezas que nadie debe insertar sueltas:
##
##   · `paleta: "oculta"`    — pieza interna de una máquina o VARIANTE de otra
##                             (los cinco discos, las siete kettlebells…);
##                             llega con su máquina o desde la burbuja de pesos;
##   · `paleta: "despiece"`  — pieza del despiece de una máquina real;
##   · `paleta: "retirada"`  — pieza que ya no se ofrece, pero que hay que
##                             seguir sabiendo cargar en proyectos viejos.
##
## `palette_components()` devuelve sólo lo que de verdad se ofrece, en el orden
## de la biblioteca; `variants_of()` da los pesos de las que abren burbuja.

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


## Lo que se ofrece en la paleta: sin ocultas, sin despiece y sin retiradas.
static func palette_components() -> Array:
	_ensure_loaded()
	var out: Array = []
	for c in _data.get("components", []):
		if String(c.get("paleta", "")) == "":
			out.append(c)
	return out


## Variantes de una pieza que se elige por peso (disco, kettlebell, mancuerna).
## Vacío si la pieza se inserta directamente.
static func variants_of(id: String) -> Array:
	return get_definition(id).get("variantes", [])


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
