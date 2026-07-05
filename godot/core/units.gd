class_name Units
## Conversión de unidades entre el proyecto web y Godot.
##
## La app web trabaja en CENTÍMETROS (1 unidad three.js = 1 cm).
## Godot trabaja en METROS (1 unidad = 1 m). Todas las posiciones y medidas de
## los archivos .json de proyecto se convierten con estas utilidades.

const CM := 0.01  # 1 cm en metros


static func cm(v: float) -> float:
	return v * CM


static func vec_cm(x: float, y: float, z: float) -> Vector3:
	return Vector3(x, y, z) * CM


static func arr_cm(a: Array) -> Vector3:
	return Vector3(float(a[0]), float(a[1]), float(a[2])) * CM


static func quat(a: Array) -> Quaternion:
	return Quaternion(float(a[0]), float(a[1]), float(a[2]), float(a[3]))
