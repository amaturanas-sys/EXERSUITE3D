class_name EditorUI
extends CanvasLayer
## Interfaz del Builder, réplica de la web v0.1.6: barra superior (Home,
## Simular en verde, Mover/Rotar, Grid, Duplicar/Eliminar, Agrupar, Figura +
## altura del maniquí, proyecto, autoguardado), paleta de piezas con tarjetas
## y punto de color por categoría, inspector en tarjetas PROPIEDADES /
## CONEXIONES y rótulo de escala. Los paneles se ocultan al simular.

signal request_home
signal request_library
signal grid_toggled(on: bool)

var world: World
var cam: OrbitCamera
var ed: EditorController

var inspector: VBoxContainer
var status_label: Label
var sim_btn: Button
var figura_btn: Button
var height_spin: SpinBox
var _theme_res: Theme


func setup(w: World, c: OrbitCamera, e: EditorController) -> void:
	world = w
	cam = c
	ed = e
	_build()
	ed.selection_changed.connect(func(_p): _refresh_inspector())
	ed.status.connect(func(msg): status_label.text = msg)
	world.simulation_changed.connect(_on_sim_changed)


func set_simulator_mode(on: bool) -> void:
	## Modo Simulador: sin paleta ni inspector, solo simulación y vistas.
	get_node("PalettePanel").visible = not on
	get_node("InspectorPanel").visible = not on


## Sincroniza los controles del maniquí tras cargar un proyecto.
func sync_from_world() -> void:
	figura_btn.set_pressed_no_signal(world.mannequin != null)
	if world.mannequin != null:
		height_spin.set_value_no_signal(float(world.human_data.get("heightCm", 175)))


func _build() -> void:
	_theme_res = UiTheme.build()

	# ---------------------------------------------------------- barra superior
	var bar_panel := PanelContainer.new()
	bar_panel.theme = _theme_res
	bar_panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	bar_panel.offset_left = 8
	bar_panel.offset_right = -8
	bar_panel.offset_top = 6
	add_child(bar_panel)
	var bar_scroll := ScrollContainer.new()
	bar_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	bar_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	bar_panel.add_child(bar_scroll)
	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 6)
	bar_scroll.add_child(bar)

	_btn(bar, "Inicio", func(): request_home.emit())
	sim_btn = Button.new()
	sim_btn.text = "Simular"
	sim_btn.theme_type_variation = "GreenButton"
	sim_btn.pressed.connect(func():
		ed.select_piece(null)
		ed.set_mode("select")
		world.set_simulating(not world.simulating))
	bar.add_child(sim_btn)

	_sep(bar)
	var tools := ButtonGroup.new()
	var mover := _toggle(bar, "Mover", tools, true)
	var rotar := _toggle(bar, "Rotar", tools, false)
	mover.pressed.connect(func(): ed.gizmo.set_tool("move"))
	rotar.pressed.connect(func(): ed.gizmo.set_tool("rotate"))
	ed.gizmo.set_tool("move")
	var grid_btn := _toggle(bar, "Grid", null, true)
	grid_btn.toggled.connect(func(on): grid_toggled.emit(on))

	_sep(bar)
	_btn(bar, "Duplicar", func(): ed.duplicate_selected())
	_btn(bar, "Eliminar", func(): ed.delete_selected())
	_btn(bar, "Agrupar", func(): ed.group_selection())
	_btn(bar, "Desagrupar", func(): ed.ungroup_selection())

	_sep(bar)
	figura_btn = _toggle(bar, "Figura", null, false)
	height_spin = SpinBox.new()
	height_spin.min_value = 100
	height_spin.max_value = 220
	height_spin.step = 1
	height_spin.value = 175
	height_spin.suffix = "cm"
	bar.add_child(height_spin)
	figura_btn.toggled.connect(func(on): world.set_mannequin(on, height_spin.value))
	height_spin.value_changed.connect(func(v):
		if figura_btn.button_pressed:
			world.set_mannequin(true, v))

	_sep(bar)
	for v in [["Frontal", "frontal"], ["Lateral", "lateral"], ["Sup.", "superior"], ["Iso", "isometrica"]]:
		var view: String = v[1]
		_btn(bar, v[0], func(): cam.set_view(view, world.bounds()))
	_btn(bar, "+", func(): cam.zoom_by(0.8))
	_btn(bar, "-", func(): cam.zoom_by(1.25))

	_sep(bar)
	_btn(bar, "Nuevo", func(): world.clear(); ed.select_piece(null))
	var open_dlg := _file_dialog(FileDialog.FILE_MODE_OPEN_FILE)
	_btn(bar, "Cargar", func(): open_dlg.popup_centered_ratio(0.7))
	open_dlg.file_selected.connect(func(path):
		ed.select_piece(null)
		if world.load_project_file(path):
			cam.set_view("isometrica", world.bounds())
			sync_from_world())
	var save_dlg := _file_dialog(FileDialog.FILE_MODE_SAVE_FILE)
	_btn(bar, "Guardar", func(): save_dlg.popup_centered_ratio(0.7))
	save_dlg.file_selected.connect(func(path):
		Serializer.save_file(world, path)
		LandingUI.add_recent(path.get_file().get_basename(), Serializer.serialize(world)))
	_btn(bar, "Biblioteca", func(): request_library.emit())

	var autosave_lbl := Label.new()
	autosave_lbl.text = "Autoguardado activo"
	autosave_lbl.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	autosave_lbl.add_theme_font_size_override("font_size", 13)
	bar.add_child(autosave_lbl)

	# ------------------------------------------------------- paleta (izquierda)
	var pp := PanelContainer.new()
	pp.theme = _theme_res
	pp.name = "PalettePanel"
	pp.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	pp.offset_top = 58
	pp.offset_bottom = -8
	pp.offset_left = 8
	pp.offset_right = 268
	add_child(pp)
	var pv := VBoxContainer.new()
	pv.add_theme_constant_override("separation", 8)
	pp.add_child(pv)

	# Cabecera con el logotipo, como la web
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	pv.add_child(head)
	var mark_bg := PanelContainer.new()
	var mark_sb := StyleBoxFlat.new()
	mark_sb.bg_color = Color.WHITE
	mark_sb.set_corner_radius_all(8)
	mark_sb.set_content_margin_all(4)
	mark_bg.add_theme_stylebox_override("panel", mark_sb)
	head.add_child(mark_bg)
	var mark := TextureRect.new()
	mark.texture = load("res://extras/logo-mark.png")
	mark.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	mark.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	mark.custom_minimum_size = Vector2(34, 34)
	mark_bg.add_child(mark)
	var head_txt := VBoxContainer.new()
	head.add_child(head_txt)
	var head_title := Label.new()
	head_title.text = "EXERSUITE3D"
	head_title.add_theme_font_size_override("font_size", 16)
	head_txt.add_child(head_title)
	var head_sub := Label.new()
	head_sub.text = "GYM MACHINE DESIGN"
	head_sub.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	head_sub.add_theme_font_size_override("font_size", 10)
	head_txt.add_child(head_sub)

	pv.add_child(UiTheme.section_label("Piezas disponibles"))
	var pscroll := ScrollContainer.new()
	pscroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pscroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	pv.add_child(pscroll)
	var plist := VBoxContainer.new()
	plist.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	plist.add_theme_constant_override("separation", 6)
	pscroll.add_child(plist)
	var last_cat := ""
	for c in ComponentLibrary.all_components():
		var cat := String(c.get("category", ""))
		if cat != last_cat:
			last_cat = cat
			plist.add_child(UiTheme.section_label(ComponentLibrary.category_label(cat)))
		var b := Button.new()
		b.theme_type_variation = "CardButton"
		b.text = String(c.get("label", c["id"]))
		b.icon = UiTheme.cat_icon(cat)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var id := String(c["id"])
		b.pressed.connect(func(): _pick_component(id))
		plist.add_child(b)

	# ---------------------------------------------------- inspector (derecha)
	var ip := VBoxContainer.new()
	ip.theme = _theme_res
	ip.name = "InspectorPanel"
	ip.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	ip.offset_top = 58
	ip.offset_bottom = -8
	ip.offset_left = -288
	ip.offset_right = -8
	ip.add_theme_constant_override("separation", 8)
	add_child(ip)

	var props_card := PanelContainer.new()
	props_card.theme_type_variation = "CardPanel"
	props_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	props_card.size_flags_stretch_ratio = 1.6
	ip.add_child(props_card)
	var props_v := VBoxContainer.new()
	props_v.add_theme_constant_override("separation", 6)
	props_card.add_child(props_v)
	props_v.add_child(UiTheme.section_label("Propiedades"))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	props_v.add_child(scroll)
	inspector = VBoxContainer.new()
	inspector.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(inspector)

	var conn_card := PanelContainer.new()
	conn_card.theme_type_variation = "CardPanel"
	conn_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	ip.add_child(conn_card)
	var conn_v := VBoxContainer.new()
	conn_v.add_theme_constant_override("separation", 6)
	conn_card.add_child(conn_v)
	conn_v.add_child(UiTheme.section_label("Conexiones"))
	var conn_row := HBoxContainer.new()
	conn_row.add_theme_constant_override("separation", 6)
	conn_v.add_child(conn_row)
	_btn(conn_row, "+ Bisagra", func(): ed.set_mode("joint-revolute"))
	_btn(conn_row, "+ Corredera", func(): ed.set_mode("joint-prismatic"))
	var conn_row2 := HBoxContainer.new()
	conn_row2.add_theme_constant_override("separation", 6)
	conn_v.add_child(conn_row2)
	_btn(conn_row2, "+ Cable", func(): ed.set_mode("cable"))
	_btn(conn_row2, "Finalizar cable", func(): ed.finish_cable())
	var conn_hint := Label.new()
	conn_hint.text = "Articula piezas (bisagra/corredera) o traza un cable por poleas."
	conn_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	conn_hint.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	conn_hint.add_theme_font_size_override("font_size", 13)
	conn_v.add_child(conn_hint)

	# --------------------------------------------- rótulo de escala + estado
	var hud := PanelContainer.new()
	hud.theme = _theme_res
	hud.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hud.offset_top = -40
	hud.offset_bottom = -10
	hud.grow_horizontal = Control.GROW_DIRECTION_BOTH
	add_child(hud)
	var hud_lbl := Label.new()
	hud_lbl.text = "1 celda = 10 cm · ejes en cm"
	hud_lbl.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	hud_lbl.add_theme_font_size_override("font_size", 13)
	hud.add_child(hud_lbl)

	status_label = Label.new()
	status_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	status_label.offset_top = -70
	status_label.offset_left = 280
	status_label.offset_right = -300
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.add_theme_color_override("font_color", Color("31353d"))
	add_child(status_label)
	_refresh_inspector()


func _pick_component(id: String) -> void:
	match id:
		"pilar-linea":
			ed.set_mode("line-beam")
		"tubo-linea":
			ed.set_mode("line-tube")
		"cadena-seguridad":
			ed.set_mode("rope-chain")
		"correa-seguridad":
			ed.set_mode("rope-strap")
		_:
			ed.set_mode("place", id)


func _on_sim_changed(running: bool) -> void:
	sim_btn.text = "Detener" if running else "Simular"
	get_node("PalettePanel").visible = not running
	get_node("InspectorPanel").visible = not running
	status_label.text = (
		"Arrastra piezas móviles con la mano · Espacio detiene" if running else "")


# ---------------------------------------------------------------- inspector

func _refresh_inspector() -> void:
	for child in inspector.get_children():
		child.queue_free()
	var p := ed.selected
	if p == null:
		_label("Selecciona un objeto para editar sus propiedades, o añade un componente desde la paleta.")
		return
	_label(p.display_name)
	_label("Componente: " + p.component_id)

	# Material
	var mats := OptionButton.new()
	var mat_ids: Array = []
	for m in ComponentLibrary.materials_list():
		mats.add_item(String(m.get("label", m["id"])))
		mat_ids.append(String(m["id"]))
		if String(m["id"]) == p.material_id:
			mats.select(mats.item_count - 1)
	mats.item_selected.connect(func(i): p.set_material_id(mat_ids[i]))
	inspector.add_child(mats)

	# Física
	var mass := SpinBox.new()
	mass.min_value = 0
	mass.max_value = 500
	mass.step = 0.5
	mass.value = p.mass_kg
	mass.value_changed.connect(func(v): p.mass_kg = v)
	_labeled("Masa (kg)", mass)
	var fixed := CheckBox.new()
	fixed.text = "Anclado (fijo)"
	fixed.button_pressed = p.fixed
	fixed.toggled.connect(func(v): p.fixed = v)
	inspector.add_child(fixed)

	# Dimensiones (cm) según el tipo
	var kind := String(p.params.get("kind", ""))
	for field in _dim_fields(kind):
		var sb := SpinBox.new()
		sb.min_value = 0.1
		sb.max_value = 1000
		sb.step = 0.5
		sb.value = float(p.params.get(field[1], 1))
		var key: String = field[1]
		sb.value_changed.connect(func(v):
			p.params[key] = v
			p.rebuild_geometry()
			world.refresh_attachments())
		_labeled(field[0], sb)

	# Rotación por pasos (15°)
	_label("Rotar 15°:")
	var rot := HBoxContainer.new()
	for axis in [["X", Vector3.RIGHT], ["Y", Vector3.UP], ["Z", Vector3.BACK]]:
		var av: Vector3 = axis[1]
		var b := Button.new()
		b.text = axis[0]
		b.pressed.connect(func():
			p.quaternion = Quaternion(av, deg_to_rad(15.0)) * p.quaternion
			world.refresh_attachments())
		rot.add_child(b)
	inspector.add_child(rot)

	if p.params.has("path"):
		_ibtn("Doblar (nodos)", func(): ed.set_mode("bend"))
	_ibtn("Duplicar", func(): ed.duplicate_selected())
	_ibtn("Eliminar", func(): ed.delete_selected())


static func _dim_fields(kind: String) -> Array:
	match kind:
		"box", "plane":
			return [["Ancho (cm)", "width"], ["Alto (cm)", "height"], ["Fondo (cm)", "depth"]]
		"cylinder":
			return [["Radio sup. (cm)", "radiusTop"], ["Radio inf. (cm)", "radiusBottom"], ["Altura (cm)", "height"]]
		"cone":
			return [["Radio (cm)", "radiusBottom"], ["Altura (cm)", "height"]]
		"sphere":
			return [["Radio (cm)", "radius"]]
		"torus":
			return [["Radio (cm)", "radius"], ["Grosor (cm)", "tubeRadius"]]
		"beam":
			return [["Ancho (cm)", "width"], ["Fondo (cm)", "depth"]]
		"tube":
			return [["Radio (cm)", "radius"]]
	return []


# ------------------------------------------------------------------ helpers

func _btn(parent: Node, text: String, fn: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(fn)
	parent.add_child(b)
	return b


func _toggle(parent: Node, text: String, group: ButtonGroup, active: bool) -> Button:
	var b := Button.new()
	b.text = text
	b.toggle_mode = true
	if group:
		b.button_group = group
	b.button_pressed = active
	parent.add_child(b)
	return b


func _sep(parent: Node) -> void:
	var s := VSeparator.new()
	parent.add_child(s)


func _ibtn(text: String, fn: Callable) -> void:
	_btn(inspector, text, fn)


func _label(text: String) -> void:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	inspector.add_child(l)


func _labeled(text: String, control: Control) -> void:
	_label(text)
	inspector.add_child(control)


func _file_dialog(fm: int) -> FileDialog:
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.file_mode = fm
	dlg.filters = PackedStringArray(["*.json ; Proyecto EXERSUITE3D"])
	add_child(dlg)
	return dlg
