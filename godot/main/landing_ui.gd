class_name LandingUI
extends CanvasLayer
## Pantalla de inicio, réplica del Home de la web v0.1.6: logotipo, selector
## Builder/Simulador, acciones por modo, tarjeta de PROYECTOS RECIENTES y
## DEDICATORIA.

signal action(kind: String, payload)   # new | open | simulate | continue | library | demo | open_path

const RECENTS_INDEX := "user://recents.json"
const RECENTS_DIR := "user://recents"

var root_control: Control
var sim_mode := false
var _builder_row: HBoxContainer
var _sim_row: HBoxContainer
var _mode_hint: Label


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

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 36)
	root_control.add_child(margin)

	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 28)
	margin.add_child(cols)

	# ---------------------------------------------------------- columna izq.
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.6
	left.add_theme_constant_override("separation", 14)
	cols.add_child(left)

	var logo := TextureRect.new()
	logo.texture = load("res://extras/logo-full-light.png")
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
	logo.custom_minimum_size = Vector2(0, 260)
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	left.add_child(logo)

	var tagline := Label.new()
	tagline.text = "DISEÑO Y SIMULACIÓN 3D DE MÁQUINAS DE GIMNASIO"
	tagline.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	tagline.add_theme_font_size_override("font_size", 14)
	left.add_child(tagline)

	# Selector Builder / Simulador (como land-mode de la web)
	var modes := HBoxContainer.new()
	modes.add_theme_constant_override("separation", 4)
	left.add_child(modes)
	var group := ButtonGroup.new()
	var builder_btn := _mode_btn("Builder", group, true)
	var sim_btn := _mode_btn("Simulador", group, false)
	modes.add_child(builder_btn)
	modes.add_child(sim_btn)
	builder_btn.pressed.connect(func(): _set_sim_mode(false))
	sim_btn.pressed.connect(func(): _set_sim_mode(true))

	_mode_hint = Label.new()
	_mode_hint.text = ("Simulador: abre un proyecto solo para correr su física e "
		+ "interactuar con él (sin herramientas de edición).")
	_mode_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_mode_hint.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	_mode_hint.visible = false
	left.add_child(_mode_hint)

	_builder_row = HBoxContainer.new()
	_builder_row.add_theme_constant_override("separation", 10)
	left.add_child(_builder_row)
	_btn(_builder_row, "Crear nuevo proyecto", "AccentButton", func(): action.emit("new", null))
	_btn(_builder_row, "Abrir archivo…", "Button", func(): _pick_file("open"))
	_btn(_builder_row, "Explorar biblioteca", "Button", func(): action.emit("library", null))

	_sim_row = HBoxContainer.new()
	_sim_row.add_theme_constant_override("separation", 10)
	_sim_row.visible = false
	left.add_child(_sim_row)
	_btn(_sim_row, "Simular archivo…", "AccentButton", func(): _pick_file("simulate"))

	var extra := HBoxContainer.new()
	extra.add_theme_constant_override("separation", 10)
	left.add_child(extra)
	if FileAccess.file_exists("user://autosave.json"):
		_btn(extra, "Continuar sesión anterior", "Button", func(): action.emit("continue", null))
	_btn(extra, "Demo", "Button", func(): action.emit("demo", null))

	# Dedicatoria (tarjeta con el texto de la web)
	var ded_text := _load_dedication()
	if ded_text != "":
		var card := PanelContainer.new()
		card.theme_type_variation = "CardPanel"
		card.size_flags_vertical = Control.SIZE_EXPAND_FILL
		left.add_child(card)
		var dv := VBoxContainer.new()
		dv.add_theme_constant_override("separation", 6)
		card.add_child(dv)
		dv.add_child(UiTheme.section_label("Dedicatoria"))
		var scroll := ScrollContainer.new()
		scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
		dv.add_child(scroll)
		var body := Label.new()
		body.text = ded_text
		body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		body.add_theme_font_size_override("font_size", 13)
		body.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
		scroll.add_child(body)

	# ---------------------------------------------------------- columna der.
	var right := PanelContainer.new()
	right.theme_type_variation = "CardPanel"
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_stretch_ratio = 1.0
	right.custom_minimum_size = Vector2(320, 0)
	cols.add_child(right)
	var rv := VBoxContainer.new()
	rv.add_theme_constant_override("separation", 8)
	right.add_child(rv)
	rv.add_child(UiTheme.section_label("Proyectos recientes"))
	var recents := load_recents()
	if recents.is_empty():
		var empty := Label.new()
		empty.text = "Aún no hay proyectos. Crea uno nuevo o abre un archivo."
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
		rv.add_child(empty)
	else:
		for r in recents.slice(0, 8):
			var path := String(r.get("path", ""))
			var b := Button.new()
			b.text = String(r.get("name", "proyecto"))
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.pressed.connect(func():
				action.emit("simulate" if sim_mode else "open_path", path))
			rv.add_child(b)


func _set_sim_mode(on: bool) -> void:
	sim_mode = on
	_builder_row.visible = not on
	_sim_row.visible = on
	_mode_hint.visible = on


func _mode_btn(text: String, group: ButtonGroup, active: bool) -> Button:
	var b := Button.new()
	b.text = text
	b.toggle_mode = true
	b.button_group = group
	b.button_pressed = active
	b.custom_minimum_size = Vector2(120, 40)
	return b


func _btn(parent: Node, text: String, variation: String, fn: Callable) -> void:
	var b := Button.new()
	b.text = text
	b.theme_type_variation = variation
	b.custom_minimum_size = Vector2(0, 44)
	b.add_theme_font_size_override("font_size", 16)
	b.pressed.connect(fn)
	parent.add_child(b)


## Texto de la dedicatoria (sección en español del fichero de la web).
func _load_dedication() -> String:
	var f := FileAccess.open("res://extras/dedicatoria.txt", FileAccess.READ)
	if f == null:
		return ""
	var txt := f.get_as_text().strip_edges()
	var start := txt.find("[Español]")
	if start >= 0:
		start += "[Español]".length()
		var next := txt.find("[", start)
		txt = txt.substr(start, (next - start) if next > start else -1)
	return txt.strip_edges()


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
