class_name LibraryUI
extends CanvasLayer
## Biblioteca de repertorio: sustituir/restablecer el modelo 3D (.glb) de cada
## COMPONENTE y de cada SEGMENTO del maniquí, como en la web pero nativo.
## Los modelos se guardan en user:// y se aplican a todas las piezas al volver.

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
var _comp_ids: Array = []


func setup(w: World) -> void:
	world = w
	layer = 15
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.build()
	add_child(root)
	var bg := ColorRect.new()
	bg.color = Color(UiTheme.BG.r, UiTheme.BG.g, UiTheme.BG.b, 0.97)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)

	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.offset_left = 40
	box.offset_right = -40
	box.offset_top = 30
	box.offset_bottom = -30
	box.add_theme_constant_override("separation", 10)
	root.add_child(box)

	var header := HBoxContainer.new()
	box.add_child(header)
	var title := Label.new()
	title.text = "Biblioteca de repertorio — sustituye cada ítem por un modelo .glb"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var close_btn := Button.new()
	close_btn.text = "✕ Volver"
	close_btn.pressed.connect(func():
		world.refresh_models()
		closed.emit())
	header.add_child(close_btn)

	tabs = TabContainer.new()
	tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(tabs)

	comp_list = ItemList.new()
	comp_list.name = "Componentes"
	tabs.add_child(comp_list)
	man_list = ItemList.new()
	man_list.name = "Maniquí"
	tabs.add_child(man_list)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	box.add_child(actions)
	var assign_btn := Button.new()
	assign_btn.text = "📂 Asignar modelo .glb…"
	assign_btn.pressed.connect(_assign)
	actions.add_child(assign_btn)
	var reset_btn := Button.new()
	reset_btn.text = "Restablecer primitiva"
	reset_btn.pressed.connect(_reset)
	actions.add_child(reset_btn)
	status_label = Label.new()
	status_label.add_theme_color_override("font_color", UiTheme.TEXT_DIM)
	actions.add_child(status_label)

	_refresh_lists()


func _refresh_lists() -> void:
	comp_list.clear()
	_comp_ids = []
	for c in ComponentLibrary.all_components():
		var id := String(c["id"])
		var mark := "  ●" if ModelStore.has_component_override(id) else ""
		comp_list.add_item("%s (%s)%s" % [String(c.get("label", id)), id, mark])
		_comp_ids.append(id)
	man_list.clear()
	for seg in MANNEQUIN_SEGMENTS:
		var mark := "  ●" if ModelStore.has_mannequin_override(seg) else ""
		man_list.add_item(seg + mark)


func _current() -> Array:  # [dir, id] o []
	if tabs.current_tab == 0:
		var sel := comp_list.get_selected_items()
		return [] if sel.is_empty() else [ModelStore.USER_COMPONENTS, _comp_ids[sel[0]]]
	var sel2 := man_list.get_selected_items()
	return [] if sel2.is_empty() else [ModelStore.USER_MANNEQUIN, MANNEQUIN_SEGMENTS[sel2[0]]]


func _assign() -> void:
	var cur := _current()
	if cur.is_empty():
		status_label.text = "Selecciona primero un ítem de la lista"
		return
	var dlg := FileDialog.new()
	dlg.access = FileDialog.ACCESS_FILESYSTEM
	dlg.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dlg.filters = PackedStringArray(["*.glb ; Modelo 3D glTF binario"])
	add_child(dlg)
	dlg.file_selected.connect(func(path):
		if ModelStore.assign(cur[0], cur[1], path):
			status_label.text = "Modelo asignado a " + cur[1]
		else:
			status_label.text = "No se pudo copiar el modelo"
		_refresh_lists())
	dlg.popup_centered_ratio(0.75)


func _reset() -> void:
	var cur := _current()
	if cur.is_empty():
		status_label.text = "Selecciona primero un ítem de la lista"
		return
	ModelStore.reset(cur[0], cur[1])
	status_label.text = cur[1] + " vuelve a su primitiva"
	_refresh_lists()
