class_name Perforar
## PERFORADO PASANTE — el mismo trabajo que `src/objects/perforar.ts`.
##
## Abre agujeros PASANTES de verdad en la malla de una pieza: los triángulos
## que caen dentro del hueco se recortan y se levantan las paredes interiores.
## Es lo que convierte una plancha en el carro de una prensa —enhebrado por sus
## dos guías— y lo que deja pasar el cable por debajo de una roldana interna.
##
## El hueco se define en coordenadas LOCALES de la pieza: un eje pasante y una
## figura CONVEXA en el plano perpendicular. La ventana es un rectángulo; el
## canal tubular, un polígono regular que aproxima la sección del tubo. Todo lo
## demás —el recorte y el levantado de paredes— es común.
##
## UNIDADES: la sopa de triángulos va en METROS; las medidas de `params` llegan
## en centímetros desde el `.json` y se convierten aquí con `Units.cm()`.

## Índices (pasante, U, V) de cada eje local.
static func _ejes(eje: String) -> Vector3i:
	if eje == "x":
		return Vector3i(0, 1, 2)   # pasa por X; el plano es (Y, Z)
	if eje == "y":
		return Vector3i(1, 2, 0)   # pasa por Y; el plano es (Z, X)
	return Vector3i(2, 0, 1)       # pasa por Z; el plano es (X, Y)


## Recorta un polígono contra un SEMIPLANO del plano (U,V) (Sutherland–Hodgman).
## El corte interpola el punto COMPLETO, así la coordenada del eje pasante sigue
## la superficie original: una cara inclinada se recorta sin deformarse.
static func _recortar(poly: Array, iu: int, iv: int, nu: float, nv: float,
		ou: float, ov: float, mantener_dentro: bool) -> Array:
	if poly.is_empty():
		return poly
	var salida: Array = []
	for i in poly.size():
		var a: Vector3 = poly[i]
		var b: Vector3 = poly[(i + 1) % poly.size()]
		var fa := nu * (a[iu] - ou) + nv * (a[iv] - ov)
		var fb := nu * (b[iu] - ou) + nv * (b[iv] - ov)
		var da := (fa >= 0.0) if mantener_dentro else (fa < 0.0)
		var db := (fb >= 0.0) if mantener_dentro else (fb < 0.0)
		if da:
			salida.append(a)
		if da != db:
			salida.append(a + (b - a) * (fa / (fa - fb)))
	return salida


## Vuelca un polígono convexo como abanico de triángulos.
static func _abanico(poly: Array, fuera: PackedVector3Array) -> void:
	for i in range(1, poly.size() - 1):
		fuera.append(poly[0])
		fuera.append(poly[i])
		fuera.append(poly[i + 1])


## Área (con signo) del polígono proyectado en el plano (U,V).
static func _area_uv(poly: Array, iu: int, iv: int) -> float:
	var a := 0.0
	for i in poly.size():
		var p: Vector3 = poly[i]
		var q: Vector3 = poly[(i + 1) % poly.size()]
		a += p[iu] * q[iv] - q[iu] * p[iv]
	return absf(a) * 0.5


## Abre UN hueco cuyo contorno es el polígono CONVEXO `contorno`, dado en
## sentido antihorario en el plano (U,V) del eje pasante.
##
## El exterior de un convexo se parte en tantas regiones DISJUNTAS como lados
## tiene: la región i es «fuera del lado i, pero dentro de los lados 0..i−1».
## Así ningún trozo de triángulo se emite dos veces ni se pierde ninguno.
static func _un_hueco(tris: PackedVector3Array, eje: String, contorno: Array) -> PackedVector3Array:
	var n := contorno.size()
	if n < 3:
		return tris
	var e := _ejes(eje)
	var ia := e.x
	var iu := e.y
	var iv := e.z

	var lados: Array = []
	for i in n:
		var p: Vector2 = contorno[i]
		var q: Vector2 = contorno[(i + 1) % n]
		lados.append([-(q.y - p.y), q.x - p.x, p.x, p.y])

	var u0 := INF
	var u1 := -INF
	var v0 := INF
	var v1 := -INF
	for c in contorno:
		u0 = minf(u0, c.x)
		u1 = maxf(u1, c.x)
		v0 = minf(v0, c.y)
		v1 = maxf(v1, c.y)

	var salida := PackedVector3Array()
	var a_min := INF
	var a_max := -INF
	for t in range(0, tris.size(), 3):
		var A := tris[t]
		var B := tris[t + 1]
		var C := tris[t + 2]
		var min_u := minf(A[iu], minf(B[iu], C[iu]))
		var max_u := maxf(A[iu], maxf(B[iu], C[iu]))
		var min_v := minf(A[iv], minf(B[iv], C[iv]))
		var max_v := maxf(A[iv], maxf(B[iv], C[iv]))
		if max_u <= u0 or min_u >= u1 or max_v <= v0 or min_v >= v1:
			salida.append_array([A, B, C])
			continue
		var base: Array = [A, B, C]
		# UNA CARA PARALELA AL TALADRO NO SE PUEDE CORTAR: su proyección en el
		# plano es un segmento —área cero— y el recorte la dejaría en polígonos
		# degenerados que el filtro descarta uno por uno, con lo que la cara
		# entera desaparecía. Un agujero pasante como mucho la roza.
		if _area_uv(base, iu, iv) <= 1e-10:
			salida.append_array([A, B, C])
			continue
		var acumulado: Array = base
		for i in n:
			if acumulado.size() < 3:
				break
			var l: Array = lados[i]
			var afuera := _recortar(acumulado, iu, iv, l[0], l[1], l[2], l[3], false)
			if afuera.size() >= 3 and _area_uv(afuera, iu, iv) > 1e-10:
				_abanico(afuera, salida)
			acumulado = _recortar(acumulado, iu, iv, l[0], l[1], l[2], l[3], true)
		# Lo que queda DENTRO no se emite (es el hueco), pero marca hasta dónde
		# llega el material para levantar las paredes.
		for p in acumulado:
			a_min = minf(a_min, p[ia])
			a_max = maxf(a_max, p[ia])

	# Paredes interiores: un rectángulo por lado, de cara a cara. El lado se
	# recorre AL REVÉS que el contorno para que la pared mire hacia dentro.
	if a_max - a_min > 1e-5:
		for i in n:
			var p: Vector2 = contorno[(i + 1) % n]
			var q: Vector2 = contorno[i]
			var pa := _punto(ia, iu, iv, a_min, p.x, p.y)
			var qa := _punto(ia, iu, iv, a_min, q.x, q.y)
			var qb := _punto(ia, iu, iv, a_max, q.x, q.y)
			var pb := _punto(ia, iu, iv, a_max, p.x, p.y)
			_abanico([pa, qa, qb, pb], salida)
	return salida


static func _punto(ia: int, iu: int, iv: int, a: float, u: float, v: float) -> Vector3:
	var p := Vector3.ZERO
	p[ia] = a
	p[iu] = u
	p[iv] = v
	return p


## Contorno rectangular de una ventana, en sentido antihorario (metros).
static func _contorno_ventana(v: Dictionary) -> Array:
	var u := Units.cm(float(v.get("u", 0)))
	var w := Units.cm(float(v.get("v", 0)))
	var du := Units.cm(float(v.get("du", 0))) * 0.5
	var dv := Units.cm(float(v.get("dv", 0))) * 0.5
	return [
		Vector2(u - du, w - dv),
		Vector2(u + du, w - dv),
		Vector2(u + du, w + dv),
		Vector2(u - du, w + dv),
	]


## Contorno del CANAL TUBULAR: polígono regular CIRCUNSCRITO. El tubo tiene que
## PASAR por el agujero, así que el radio se corrige (`r / cos(π/n)`) para que
## el círculo real quepa dentro y no roce por las esquinas.
static func _contorno_canal(c: Dictionary) -> Array:
	var lados := clampi(int(c.get("lados", 20)), 8, 48)
	var r := Units.cm(float(c.get("radio", 0))) / cos(PI / lados)
	var u := Units.cm(float(c.get("u", 0)))
	var v := Units.cm(float(c.get("v", 0)))
	var puntos: Array = []
	for i in lados:
		var ang := TAU * i / lados
		puntos.append(Vector2(u + r * cos(ang), v + r * sin(ang)))
	return puntos


## Todos los huecos de una pieza. Devuelve la misma sopa si no hay ninguno.
static func aplicar(tris: PackedVector3Array, params: Dictionary) -> PackedVector3Array:
	var ventanas: Array = params.get("ventanas", []) if params.get("ventanas") is Array else []
	var canales: Array = params.get("canales", []) if params.get("canales") is Array else []
	if ventanas.is_empty() and canales.is_empty():
		return tris
	var actual := tris
	for v in ventanas:
		if float(v.get("du", 0)) > 0.05 and float(v.get("dv", 0)) > 0.05:
			actual = _un_hueco(actual, String(v.get("eje", "z")), _contorno_ventana(v))
	for c in canales:
		if float(c.get("radio", 0)) > 0.05:
			actual = _un_hueco(actual, String(c.get("eje", "z")), _contorno_canal(c))
	return actual
