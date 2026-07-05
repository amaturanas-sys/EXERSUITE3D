class_name UiTheme
## Tema visual de EXERSUITE3D: la paleta de la web v0.1.6 (tinta + papel
## hueso), con las variantes de botón de la interfaz original.

const BG := Color("14161b")
const PANEL := Color("1e2128")
const PANEL2 := Color("262a33")
const BORDER := Color("333845")
const TEXT := Color("e6e8ec")
const TEXT_DIM := Color("9aa1ad")
const ACCENT := Color("efede8")   # papel hueso
const ON_ACCENT := Color("14161b")
const GREEN := Color("22c55e")    # botón Simular de la web
const DANGER := Color("ef4444")

## CATEGORY_COLORS de la web (componentLibrary.ts), punto de color por pieza.
const CAT_COLORS := {
	"primitiva": Color("94a3b8"),
	"estructural": Color("6b7280"),
	"movimiento": Color("f59e0b"),
	"transmision": Color("3b82f6"),
	"peso": Color("eab308"),
	"ergonomico": Color("8b5cf6"),
}

static var _cat_icons: Dictionary = {}


## Punto de color de la categoría (icono 12x12 para los botones de la paleta).
static func cat_icon(cat: String) -> ImageTexture:
	if not _cat_icons.has(cat):
		var img := Image.create(12, 12, false, Image.FORMAT_RGBA8)
		img.fill(CAT_COLORS.get(cat, CAT_COLORS["primitiva"]))
		_cat_icons[cat] = ImageTexture.create_from_image(img)
	return _cat_icons[cat]


static func _flat(bg: Color, border: Color, radius: int, margin: int) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(margin)
	return sb


static func build() -> Theme:
	var t := Theme.new()
	t.default_font_size = 15

	var panel := _flat(Color(PANEL.r, PANEL.g, PANEL.b, 0.96), BORDER, 8, 10)
	t.set_stylebox("panel", "PanelContainer", panel)
	# Tarjeta con más aire (paneles PROPIEDADES/CONEXIONES/RECIENTES de la web)
	t.set_type_variation("CardPanel", "PanelContainer")
	t.set_stylebox("panel", "CardPanel", _flat(Color(PANEL.r, PANEL.g, PANEL.b, 0.97), BORDER, 10, 14))

	# ---- Botón normal (chip oscuro)
	var btn := _flat(PANEL2, Color(0, 0, 0, 0), 6, 8)
	var btn_hover: StyleBoxFlat = btn.duplicate()
	btn_hover.border_color = BORDER
	var btn_pressed: StyleBoxFlat = btn.duplicate()
	btn_pressed.bg_color = ACCENT
	t.set_stylebox("normal", "Button", btn)
	t.set_stylebox("hover", "Button", btn_hover)
	t.set_stylebox("pressed", "Button", btn_pressed)
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", TEXT)
	t.set_color("font_pressed_color", "Button", ON_ACCENT)
	t.set_color("font_disabled_color", "Button", Color(TEXT_DIM.r, TEXT_DIM.g, TEXT_DIM.b, 0.5))

	# ---- Botón acento (papel): "Crear nuevo proyecto", "Guardar y salir"
	t.set_type_variation("AccentButton", "Button")
	var acc := _flat(ACCENT, Color(0, 0, 0, 0), 6, 8)
	var acc_hover: StyleBoxFlat = acc.duplicate()
	acc_hover.bg_color = Color("ffffff")
	t.set_stylebox("normal", "AccentButton", acc)
	t.set_stylebox("hover", "AccentButton", acc_hover)
	t.set_stylebox("pressed", "AccentButton", acc_hover)
	t.set_color("font_color", "AccentButton", ON_ACCENT)
	t.set_color("font_hover_color", "AccentButton", ON_ACCENT)
	t.set_color("font_pressed_color", "AccentButton", ON_ACCENT)

	# ---- Botón verde: "Simular" (como en la web)
	t.set_type_variation("GreenButton", "Button")
	var grn := _flat(GREEN, Color(0, 0, 0, 0), 6, 8)
	var grn_hover: StyleBoxFlat = grn.duplicate()
	grn_hover.bg_color = Color("16a34a")
	t.set_stylebox("normal", "GreenButton", grn)
	t.set_stylebox("hover", "GreenButton", grn_hover)
	t.set_stylebox("pressed", "GreenButton", grn_hover)
	t.set_color("font_color", "GreenButton", Color("062812"))
	t.set_color("font_hover_color", "GreenButton", Color("062812"))
	t.set_color("font_pressed_color", "GreenButton", Color("062812"))

	# ---- Tarjeta de pieza de la paleta (fila con punto de color)
	t.set_type_variation("CardButton", "Button")
	var card := _flat(PANEL2, BORDER, 8, 8)
	var card_hover: StyleBoxFlat = card.duplicate()
	card_hover.bg_color = Color("2d323d")
	var card_pressed: StyleBoxFlat = card.duplicate()
	card_pressed.bg_color = ACCENT
	t.set_stylebox("normal", "CardButton", card)
	t.set_stylebox("hover", "CardButton", card_hover)
	t.set_stylebox("pressed", "CardButton", card_pressed)
	t.set_color("font_color", "CardButton", TEXT)
	t.set_color("font_hover_color", "CardButton", TEXT)
	t.set_color("font_pressed_color", "CardButton", ON_ACCENT)

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

	t.set_stylebox("panel", "TabContainer", _flat(PANEL, BORDER, 8, 8))
	return t


## Etiqueta de sección en mayúsculas y color tenue ("PIEZAS DISPONIBLES"…).
static func section_label(text: String) -> Label:
	var l := Label.new()
	l.text = text.to_upper()
	l.add_theme_color_override("font_color", TEXT_DIM)
	l.add_theme_font_size_override("font_size", 12)
	return l
