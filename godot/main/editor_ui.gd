class_name EditorUI
extends CanvasLayer
## Interfaz del Builder: barra superior (proyecto/simulación/vistas), paleta
## de piezas a la izquierda, inspector a la derecha y línea de estado.
## Durante la simulación, paleta e inspector se ocultan (como en la web).

var world: World
var cam: OrbitCamera
var ed: EditorController

var palette: ItemList
var inspector: VBoxContainer
var status_label: Label
var sim_btn: Button
var _palette_ids: Array = []


func setup(w: World, c: OrbitCamera, e: EditorController) -> void:
	world = w
	cam = c
	ed = e
	_build()
	ed.selection_changed.connect(func(_p): _refresh_inspector())
	ed.status.connect(func(msg): status_label.text = msg)
	world.simulation_changed.connect(_on_sim_changed)


func _panel(control: Control) -> PanelContainer:
	var pc := PanelContainer.new()
	pc.add_child(control)
	return pc


func _build() -> void:
	# ---- Barra superior
	var bar := HBoxContainer.new()
	bar.set_anchors_preset(Control.PRESET_TOP_WIDE)
	bar.offset_left = 8
	bar.offset_right = -8
	bar.offset_top = 6
	bar.add_theme_constant_override("separation", 6)
	add_child(bar)

	_btn(bar, "Nuevo", func(): world.clear(); ed.select_piece(null))
	var open_dlg := _file_dialog(FileDialog.FILE_MODE_OPEN_FILE)
	_btn(bar, "Abrir", func(): open_dlg.popup_centered_ratio(0.7))
	open_dlg.file_selected.connect(func(path):
		ed.select_piece(null)
		if world.load_project_file(path):
			cam.set_view("isometrica", world.bounds()))
	var save_dlg := _file_dialog(FileDialog.FILE_MODE_SAVE_FILE)
	_btn(bar, "Guardar", func(): save_dlg.popup_centered_ratio(0.7))
	save_dlg.file_selected.connect(func(path): Serializer.save_file(world, path))

	sim_btn = Button.new()
	sim_btn.text = "▶ Simular"
	sim_btn.pressed.connect(func():
		ed.select_piece(null)
		ed.set_mode("select")
		world.set_simulating(not world.simulating))
	bar.add_child(sim_btn)

	for v in [["Frontal", "frontal"], ["Lateral", "lateral"], ["Sup.", "superior"], ["Iso", "isometrica"]]:
		var view: String = v[1]
		_btn(bar, v[0], func(): cam.set_view(view, world.bounds()))
	_btn(bar, "＋", func(): cam.zoom_by(0.8))
	_btn(bar, "－", func(): cam.zoom_by(1.25))

	# ---- Paleta (izquierda)
	palette = ItemList.new()
	palette.custom_minimum_size = Vector2(230, 0)
	var pp := _panel(palette)
	pp.name = "PalettePanel"
	pp.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	pp.offset_top = 48
	pp.offset_bottom = -8
	pp.offset_left = 8
	pp.offset_right = 238
	add_child(pp)
	var last_cat := ""
	for c in ComponentLibrary.all_components():
		var cat := String(c.get("category", ""))
		if cat != last_cat:
			last_cat = cat
			var idx := palette.add_item("— %s —" % ComponentLibrary.category_label(cat).to_upper())
			palette.set_item_disabled(idx, true)
			_palette_ids.append("")
		palette.add_item(String(c.get("label", c["id"])))
		_palette_ids.append(String(c["id"]))
	palette.item_activated.connect(_on_palette_pick)
	palette.item_selected.connect(_on_palette_pick)

	# ---- Inspector (derecha)
	inspector = VBoxContainer.new()
	inspector.custom_minimum_size = Vector2(240, 0)
	var scroll := ScrollContainer.new()
	scroll.add_child(inspector)
	inspector.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var ip := _panel(scroll)
	ip.name = "InspectorPanel"
	ip.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	ip.offset_top = 48
	ip.offset_bottom = -8
	ip.offset_left = -258
	ip.offset_right = -8
	add_child(ip)
	_refresh_inspector()

	# ---- Estado
	status_label = Label.new()
	status_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	status_label.offset_top = -30
	status_label.offset_left = 250
	status_label.offset_right = -270
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(status_label)


func _on_palette_pick(index: int) -> void:
	var id: String = _palette_ids[index] if index < _palette_ids.size() else ""
	if id == "":
		return
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
	sim_btn.text = "■ Detener" if running else "▶ Simular"
	get_node("PalettePanel").visible = not running
	get_node("InspectorPanel").visible = not running
	status_label.text = (
		"🖐 Arrastra piezas móviles con la mano · Espacio detiene" if running else "")


# ---------------------------------------------------------------- inspector

func _refresh_inspector() -> void:
	for child in inspector.get_children():
		child.queue_free()
	var p := ed.selected
	if p == null:
		_label("Selecciona una pieza, o elige una en la paleta para colocarla.")
		_label("")
		_label("Conexiones:")
		_ibtn("+ Bisagra", func(): ed.set_mode("joint-revolute"))
		_ibtn("+ Corredera", func(): ed.set_mode("joint-prismatic"))
		_ibtn("+ Cable", func(): ed.set_mode("cable"))
		_ibtn("Finalizar cable", func(): ed.finish_cable())
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
		_ibtn("✎ Doblar (nodos)", func(): ed.set_mode("bend"))
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

func _btn(parent: Node, text: String, fn: Callable) -> void:
	var b := Button.new()
	b.text = text
	b.pressed.connect(fn)
	parent.add_child(b)


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
