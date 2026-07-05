class_name UiTheme
## Tema visual de EXERSUITE3D: la paleta monocroma industrial de la web
## (tinta + papel hueso) aplicada a la UI de Godot.

const BG := Color("14161b")
const PANEL := Color("1e2128")
const PANEL2 := Color("262a33")
const BORDER := Color("333845")
const TEXT := Color("e6e8ec")
const TEXT_DIM := Color("9aa1ad")
const ACCENT := Color("efede8")   # papel hueso
const ON_ACCENT := Color("14161b")
const DANGER := Color("ef4444")


static func build() -> Theme:
	var t := Theme.new()
	t.default_font_size = 15

	var panel := StyleBoxFlat.new()
	panel.bg_color = Color(PANEL.r, PANEL.g, PANEL.b, 0.96)
	panel.border_color = BORDER
	panel.set_border_width_all(1)
	panel.set_corner_radius_all(8)
	panel.set_content_margin_all(10)
	t.set_stylebox("panel", "PanelContainer", panel)

	var btn := StyleBoxFlat.new()
	btn.bg_color = PANEL2
	btn.border_color = Color(0, 0, 0, 0)
	btn.set_border_width_all(1)
	btn.set_corner_radius_all(6)
	btn.set_content_margin_all(8)
	var btn_hover := btn.duplicate()
	btn_hover.border_color = BORDER
	var btn_pressed := btn.duplicate()
	btn_pressed.bg_color = ACCENT
	t.set_stylebox("normal", "Button", btn)
	t.set_stylebox("hover", "Button", btn_hover)
	t.set_stylebox("pressed", "Button", btn_pressed)
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", TEXT)
	t.set_color("font_pressed_color", "Button", ON_ACCENT)

	t.set_color("font_color", "Label", TEXT)
	t.set_color("font_color", "ItemList", TEXT)
	var il := StyleBoxFlat.new()
	il.bg_color = PANEL
	il.set_corner_radius_all(6)
	t.set_stylebox("panel", "ItemList", il)
	var il_sel := StyleBoxFlat.new()
	il_sel.bg_color = ACCENT
	il_sel.set_corner_radius_all(4)
	t.set_stylebox("selected", "ItemList", il_sel)
	t.set_stylebox("selected_focus", "ItemList", il_sel)
	t.set_color("font_selected_color", "ItemList", ON_ACCENT)
	return t
