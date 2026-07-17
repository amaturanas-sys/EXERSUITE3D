class_name LibraryUI
extends CanvasLayer
## Biblioteca de modelos, réplica de la web v0.1.6: pestañas Componentes /
## Maniquí, lista con marca de sustitución, VISTA PREVIA 3D del ítem, botones
## "Sustituir por modelo…" / "Restablecer primitiva" y Exportar/Importar ZIP
## de toda la colección. Los modelos persisten en user://.

signal closed

const MANNEQUIN_SEGMENTS := [
	"cabeza", "torso", "pelvis",
	"brazo-sup-L", "brazo-sup-R", "antebrazo-L", "antebrazo-R",
	"muslo-L", "muslo-R", "pierna-L", "pierna-R",
]

var world: World
var tabs: TabContainer
var comp_list: ItemList
var man_list: ItemList
var status_label: Label
var name_label: Label
var desc_label: Label
var _comp_ids: Array = []
var _pivot: Node3D


func setup(w: World) -> void:
	world = w
	layer = 15
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.build()
	add_child(root)
	var bg := ColorRect.new()
	bg.color = Color(UiTheme.BG.r, UiTheme.BG.g, UiTheme.BG.b, 0.98)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)

	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.offset_left = 30
	box.offset_right = -30
	box.offset_top = 24
	box.offset_bottom = -24
	box.add_theme_constant_override("separation", 10)
	root.add_child(box)

	# ---- Cabecera: título + Exportar/Importar ZIP + Volver
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	box.add_child(header)
	var title := Label.new()
	title.text = "Biblioteca de modelos"
	title.add_theme_font_size_override("font_size", 22)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var export_btn := Button.new()
	export_btn.text = "Exportar ZIP"
	export_btn.pressed.connect(_export_zip)
	header.add_child(export_btn)
	var import_btn := Button.new()
	import_btn.text = "Importar ZIP"
	import_btn.pressed.connect(_import_zip)
	header.add_child(import_btn)
	var close_btn := Button.new()
	close_btn.text = "← Volver a Home"
	close_btn.pressed.connect(func():
		world.refresh_models()
		closed.emit())
	header.add_child(close_btn)

	var desc := Label.new()
	desc.text = ("Revisa cada pieza por separado y sustitúyela por un modelo 3D (.glb). "
		+ "Se guarda en este dispositivo. En \"Maniquí\" puedes reemplazar cada segmento "
		+ "del cuerpo por uno más estético.")
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	box.add_child(desc)

	# ---- Columnas: listas | vista previa
	var cols := HBoxContainer.new()
	cols.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cols.add_theme_constant_override("separation", 14)
	box.add_child(cols)

	tabs = TabContainer.new()
	tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.size_flags_stretch_ratio = 1.0
	tabs.custom_minimum_size = Vector2(300, 0)
	cols.add_child(tabs)
	comp_list = ItemList.new()
	comp_list.name = "Componentes"
	comp_list.item_selected.connect(func(_i): _update_preview())
	tabs.add_child(comp_list)
	man_list = ItemList.new()
	man_list.name = "Maniquí"
	man_list.item_selected.connect(func(_i): _update_preview())
	tabs.add_child(man_list)
	tabs.tab_changed.connect(func(_i): _update_preview())

	var right := PanelContainer.new()
	right.theme_type_variation = "CardPanel"
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_stretch_ratio = 1.5
	cols.add_child(right)
	var rv := VBoxContainer.new()
	rv.add_theme_constant_override("separation", 8)
	right.add_child(rv)

	var vp_container := SubViewportContainer.new()
	vp_container.stretch = true
	vp_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rv.add_child(vp_container)
	var vp := SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = true
	vp_container.add_child(vp)
	var pcam := Camera3D.new()
	pcam.look_at_from_position(Vector3(0.32, 0.24, 0.5), Vector3.ZERO, Vector3.UP)
	vp.add_child(pcam)
	var plight := DirectionalLight3D.new()
	plight.rotation_degrees = Vector3(-45, -30, 0)
	vp.add_child(plight)
	var penv := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = UiTheme.PANEL2
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.8, 0.82, 0.88)
	env.ambient_light_energy = 0.8
	penv.environment = env
	vp.add_child(penv)
	_pivot = Node3D.new()
	vp.add_child(_pivot)

	name_label = Label.new()
	name_label.add_theme_font_size_override("font_size", 18)
	rv.add_child(name_label)
	desc_label = Label.new()
	desc_label.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	rv.add_child(desc_label)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	rv.add_child(actions)
	var assign_btn := Button.new()
	assign_btn.text = "Sustituir por modelo…"
	assign_btn.theme_type_variation = "AccentButton"
	assign_btn.pressed.connect(_assign)
	actions.add_child(assign_btn)
	var reset_btn := Button.new()
	reset_btn.text = "Restablecer primitiva"
	reset_btn.pressed.connect(_reset)
	actions.add_child(reset_btn)
	status_label = Label.new()
	status_label.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	rv.add_child(status_label)

	_refresh_lists()
	if comp_list.item_count > 0:
		comp_list.select(0)
	_update_preview()


func _process(delta: float) -> void:
	if _pivot:
		_pivot.rotate_y(0.6 * delta)


func _refresh_lists() -> void:
	comp_list.clear()
	_comp_ids = []
	for c in ComponentLibrary.all_components():
		var id := String(c["id"])
		var mark := "  •" if ModelStore.has_component_override(id) else ""
		comp_list.add_item("%s%s" % [String(c.get("label", id)), mark])
		_comp_ids.append(id)
	man_list.clear()
	for seg in MANNEQUIN_SEGMENTS:
		var mark := "  •" if ModelStore.has_mannequin_override(seg) else ""
		man_list.add_item(seg + mark)


func _current() -> Array:  # [dir, id] o []
	if tabs.current_tab == 0:
		var sel := comp_list.get_selected_items()
		return [] if sel.is_empty() else [ModelStore.USER_COMPONENTS, _comp_ids[sel[0]]]
	var sel2 := man_list.get_selected_items()
	return [] if sel2.is_empty() else [ModelStore.USER_MANNEQUIN, MANNEQUIN_SEGMENTS[sel2[0]]]


# ------------------------------------------------------------ vista previa

func _update_preview() -> void:
	for c in _pivot.get_children():
		c.queue_free()
	var cur := _current()
	if cur.is_empty():
		name_label.text = ""
		desc_label.text = ""
		return
	var id: String = cur[1]
	var is_component: bool = cur[0] == ModelStore.USER_COMPONENTS

	# Primitiva de referencia (y hueco para el modelo sustituido)
	var mesh: Mesh
	var mat: StandardMaterial3D
	if is_component:
		var def := ComponentLibrary.get_definition(id)
		name_label.text = String(def.get("label", id))
		mesh = GeometryFactory.build_mesh(def.get("params", {"kind": "box"}))
		mat = ComponentLibrary.material(String(def.get("materialId", "acero")))
	else:
		name_label.text = id
		var cap := CapsuleMesh.new()
		cap.radius = 0.05
		cap.height = 0.26
		mesh = cap
		mat = StandardMaterial3D.new()
		mat.albedo_color = Color("64b5f6")

	var override_path: String
	if is_component:
		override_path = ModelStore.component_override_path(id)
	else:
		override_path = ModelStore.mannequin_override_path(id)
	var shown: Node3D = null
	if override_path != "":
		shown = ModelStore.instantiate_fitted(override_path, mesh.get_aabb())
	if shown == null:
		var mi := MeshInstance3D.new()
		mi.mesh = mesh
		mi.material_override = mat
		shown = mi
		desc_label.text = "Forma por defecto"
	else:
		desc_label.text = "Modelo personalizado (.glb)"

	# Normaliza el tamaño al visor (diagonal ≈ 0,3 m) y céntralo.
	var holder := Node3D.new()
	holder.add_child(shown)
	var ab: AABB = ModelStore.scene_aabb(holder)
	var diag := ab.size.length()
	if diag > 0.0001:
		var k := 0.3 / diag
		holder.scale = Vector3.ONE * k
		holder.position = -ab.get_center() * k
	_pivot.add_child(holder)


# ------------------------------------------------------------ asignar/quitar

func _assign() -> void:
	var cur := _current()
	if cur.is_empty():
		status_label.text = "Selecciona primero un ítem de la lista"
		return
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.use_native_dialog = true
	dlg.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dlg.filters = PackedStringArray(["*.glb ; Modelo 3D glTF binario"])
	add_child(dlg)
	dlg.file_selected.connect(func(path):
		if ModelStore.assign(cur[0], cur[1], path):
			status_label.text = "Modelo asignado a " + cur[1]
		else:
			status_label.text = "No se pudo copiar el modelo"
		_refresh_lists()
		_update_preview())
	dlg.popup_centered_ratio(0.75)


func _reset() -> void:
	var cur := _current()
	if cur.is_empty():
		status_label.text = "Selecciona primero un ítem de la lista"
		return
	ModelStore.reset(cur[0], cur[1])
	status_label.text = cur[1] + " vuelve a su primitiva"
	_refresh_lists()
	_update_preview()


# ------------------------------------------------------------ ZIP en bloque

## Exporta todos los modelos personalizados (componentes + maniquí) a un ZIP.
func _export_zip() -> void:
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.use_native_dialog = true
	dlg.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	dlg.filters = PackedStringArray(["*.zip ; Biblioteca EXERSUITE3D"])
	add_child(dlg)
	dlg.file_selected.connect(func(path):
		var zp := ZIPPacker.new()
		if zp.open(path) != OK:
			status_label.text = "No se pudo crear el ZIP"
			return
		var n := 0
		for pair in [[ModelStore.USER_COMPONENTS, "models"], [ModelStore.USER_MANNEQUIN, "mannequin"]]:
			var dir: String = pair[0]
			if not DirAccess.dir_exists_absolute(dir):
				continue
			for f in DirAccess.get_files_at(dir):
				zp.start_file("%s/%s" % [pair[1], f])
				zp.write_file(FileAccess.get_file_as_bytes("%s/%s" % [dir, f]))
				zp.close_file()
				n += 1
		zp.close()
		status_label.text = "Exportados %d modelos" % n)
	dlg.popup_centered_ratio(0.75)


## Importa un ZIP de biblioteca (models/…, mannequin/…) a user://.
func _import_zip() -> void:
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.use_native_dialog = true
	dlg.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dlg.filters = PackedStringArray(["*.zip ; Biblioteca EXERSUITE3D"])
	add_child(dlg)
	dlg.file_selected.connect(func(path):
		var zr := ZIPReader.new()
		if zr.open(path) != OK:
			status_label.text = "No se pudo abrir el ZIP"
			return
		DirAccess.make_dir_recursive_absolute(ModelStore.USER_COMPONENTS)
		DirAccess.make_dir_recursive_absolute(ModelStore.USER_MANNEQUIN)
		var n := 0
		for f in zr.get_files():
			var dest := ""
			if f.begins_with("models/") and f.ends_with(".glb"):
				dest = "%s/%s" % [ModelStore.USER_COMPONENTS, f.get_file()]
			elif f.begins_with("mannequin/") and f.ends_with(".glb"):
				dest = "%s/%s" % [ModelStore.USER_MANNEQUIN, f.get_file()]
			if dest == "":
				continue
			var out := FileAccess.open(dest, FileAccess.WRITE)
			if out:
				out.store_buffer(zr.read_file(f))
				n += 1
		zr.close()
		status_label.text = "Importados %d modelos" % n
		_refresh_lists()
		_update_preview())
	dlg.popup_centered_ratio(0.75)
