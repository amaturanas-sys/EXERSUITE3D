class_name LandingUI
extends CanvasLayer
## Pantalla de inicio (launcher), como en la web: logotipo, Crear nuevo,
## Abrir (Builder), Simulador (solo correr la física), Continuar sesión
## anterior (autosave), Biblioteca y lista de proyectos recientes.

signal action(kind: String, payload)   # new | open | simulate | continue | library | demo

const RECENTS_INDEX := "user://recents.json"
const RECENTS_DIR := "user://recents"

var root_control: Control


func _ready() -> void:
	layer = 20
	root_control = Control.new()
	root_control.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_control.theme = UiTheme.build()
	add_child(root_control)

	var bg := ColorRect.new()
	bg.color = UiTheme.BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_control.add_child(bg)

	var center := VBoxContainer.new()
	center.set_anchors_preset(Control.PRESET_CENTER)
	center.grow_horizontal = Control.GROW_DIRECTION_BOTH
	center.grow_vertical = Control.GROW_DIRECTION_BOTH
	center.add_theme_constant_override("separation", 14)
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	root_control.add_child(center)

	var logo := TextureRect.new()
	logo.texture = load("res://extras/logo-full.png")
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	logo.custom_minimum_size = Vector2(420, 150)
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	center.add_child(logo)

	var tagline := Label.new()
	tagline.text = "DISEÑO Y SIMULACIÓN 3D DE MÁQUINAS DE GIMNASIO — NATIVO"
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tagline.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	tagline.add_theme_font_size_override("font_size", 13)
	center.add_child(tagline)

	var row1 := HBoxContainer.new()
	row1.alignment = BoxContainer.ALIGNMENT_CENTER
	row1.add_theme_constant_override("separation", 10)
	center.add_child(row1)
	_btn(row1, "Crear nuevo", func(): action.emit("new", null))
	_btn(row1, "Abrir (Builder)", func(): _pick_file("open"))
	_btn(row1, "Simulador", func(): _pick_file("simulate"))

	var row2 := HBoxContainer.new()
	row2.alignment = BoxContainer.ALIGNMENT_CENTER
	row2.add_theme_constant_override("separation", 10)
	center.add_child(row2)
	if FileAccess.file_exists("user://autosave.json"):
		_btn(row2, "Continuar sesión anterior", func(): action.emit("continue", null))
	_btn(row2, "Biblioteca", func(): action.emit("library", null))
	_btn(row2, "Demo", func(): action.emit("demo", null))

	# Recientes
	var recents := load_recents()
	if not recents.is_empty():
		var title := Label.new()
		title.text = "Proyectos recientes"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		title.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
		center.add_child(title)
		var list := HBoxContainer.new()
		list.alignment = BoxContainer.ALIGNMENT_CENTER
		list.add_theme_constant_override("separation", 8)
		center.add_child(list)
		for r in recents.slice(0, 6):
			var path := String(r.get("path", ""))
			_btn(list, String(r.get("name", "proyecto")), func(): action.emit("open_path", path))


func _btn(parent: Node, text: String, fn: Callable) -> void:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 44)
	b.add_theme_font_size_override("font_size", 17)
	b.pressed.connect(fn)
	parent.add_child(b)


func _pick_file(kind: String) -> void:
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dlg.filters = PackedStringArray(["*.json ; Proyecto EXERSUITE3D"])
	root_control.add_child(dlg)
	dlg.file_selected.connect(func(path): action.emit(kind, path))
	dlg.popup_centered_ratio(0.75)


# ------------------------------------------------------------- recientes

static func load_recents() -> Array:
	var f := FileAccess.open(RECENTS_INDEX, FileAccess.READ)
	if f == null:
		return []
	var data = JSON.parse_string(f.get_as_text())
	return data if data is Array else []


## Registra un proyecto reciente (guarda una copia en user://recents/).
static func add_recent(display_name: String, data: Dictionary) -> void:
	DirAccess.make_dir_recursive_absolute(RECENTS_DIR)
	var id := display_name.to_lower().validate_filename().replace(" ", "-")
	if id == "":
		id = "proyecto"
	var path := "%s/%s.json" % [RECENTS_DIR, id]
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))
	var recents := load_recents().filter(func(r): return String(r.get("path", "")) != path)
	recents.push_front({"name": display_name, "path": path})
	var idx := FileAccess.open(RECENTS_INDEX, FileAccess.WRITE)
	if idx:
		idx.store_string(JSON.stringify(recents.slice(0, 12)))
