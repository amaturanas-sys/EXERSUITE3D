class_name OrbitCamera
extends Camera3D
## Cámara orbital con ratón (arrastrar = orbitar, rueda = zoom, botón central =
## pan) y táctil (1 dedo = orbitar, pellizco = zoom). Incluye presets de vista.

var target := Vector3(0, 0.8, 0)
var distance := 3.5
var yaw := 0.6
var pitch := 0.5

var _orbiting := false
var _panning := false
var _touches: Dictionary = {}
var _pinch_dist := 0.0


func _ready() -> void:
	_apply()


func _apply() -> void:
	pitch = clampf(pitch, 0.05, 1.52)
	distance = clampf(distance, 0.3, 60.0)
	var offset := Vector3(
		cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw)) * distance
	global_position = target + offset
	look_at(target, Vector3.UP)


func set_view(view: String, box: AABB) -> void:
	target = box.get_center()
	distance = maxf(box.size.length() * 0.9, 1.2)
	match view:
		"frontal":
			yaw = 0.0; pitch = 0.18
		"lateral":
			yaw = PI / 2; pitch = 0.18
		"superior":
			yaw = 0.001; pitch = 1.5
		_:
			yaw = PI / 4; pitch = 0.62
	_apply()


func zoom_by(factor: float) -> void:
	distance *= factor
	_apply()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		match mb.button_index:
			MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT:
				_orbiting = mb.pressed
			MOUSE_BUTTON_MIDDLE:
				_panning = mb.pressed
			MOUSE_BUTTON_WHEEL_UP:
				zoom_by(0.9)
			MOUSE_BUTTON_WHEEL_DOWN:
				zoom_by(1.1)
	elif event is InputEventMouseMotion:
		var mm: InputEventMouseMotion = event
		if _orbiting:
			yaw -= mm.relative.x * 0.008
			pitch += mm.relative.y * 0.006
			_apply()
		elif _panning:
			var right := global_transform.basis.x
			var up := global_transform.basis.y
			target += (-right * mm.relative.x + up * mm.relative.y) * distance * 0.0016
			_apply()
	elif event is InputEventScreenTouch:
		var st: InputEventScreenTouch = event
		if st.pressed:
			_touches[st.index] = st.position
		else:
			_touches.erase(st.index)
		if _touches.size() == 2:
			var keys := _touches.keys()
			_pinch_dist = (_touches[keys[0]] as Vector2).distance_to(_touches[keys[1]])
	elif event is InputEventScreenDrag:
		var sd: InputEventScreenDrag = event
		_touches[sd.index] = sd.position
		if _touches.size() == 1:
			yaw -= sd.relative.x * 0.008
			pitch += sd.relative.y * 0.006
			_apply()
		elif _touches.size() == 2:
			var keys := _touches.keys()
			var d := (_touches[keys[0]] as Vector2).distance_to(_touches[keys[1]])
			if _pinch_dist > 1.0:
				distance *= _pinch_dist / maxf(d, 1.0)
				_apply()
			_pinch_dist = d
