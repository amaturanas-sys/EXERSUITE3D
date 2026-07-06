extends SceneTree
## Capturas de la interfaz para CI (renderer por software bajo xvfb):
## Home → Builder con la demo → Biblioteca → Simulación. Los PNG quedan en
## user://capturas y el workflow los sube como artifact para revisión visual.
## Uso: xvfb-run godot --path godot --rendering-method gl_compatibility \
##        --rendering-driver opengl3 -s res://tests/screenshots.gd

var frames := 0
var step := 0
var main: Node = null


func _process(_delta: float) -> bool:
	frames += 1
	match step:
		0:
			DirAccess.make_dir_recursive_absolute("user://capturas")
			main = (load("res://main/Main.tscn") as PackedScene).instantiate()
			root.add_child(main)
			# Repintado continuo garantizado (sin entrada de usuario en CI).
			OS.low_processor_usage_mode = false
			_advance(1)
		1:
			if frames >= 40:
				_shot("1-home")
				main._on_landing_action("demo", null)
				_advance(2)
		2:
			if frames >= 40:
				_shot("2-builder-demo")
				main._show_library()
				OS.low_processor_usage_mode = false
				_advance(3)
		3:
			if frames >= 40:
				_shot("3-biblioteca")
				main.library.closed.emit()
				_advance(4)
		4:
			if frames >= 10:
				main.world.set_simulating(true)
				OS.low_processor_usage_mode = false
				_advance(5)
		5:
			if frames >= 40:
				_shot("4-simulacion")
				print("CAPTURAS_OK")
				quit(0)
	return false


func _advance(next: int) -> void:
	step = next
	frames = 0


func _shot(shot_name: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png("user://capturas/%s.png" % shot_name)
	print("captura: ", shot_name)
