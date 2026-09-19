class_name Chapa
## CHAPA DE ACERO — el mismo trabajo que `src/objects/chapa.ts` de la web.
##
## Convierte un MACIZO en una PLANCHA doblada con su forma: se quitan las caras
## señaladas y lo que queda se engorda hacia dentro hasta el grosor pedido. Un
## cubo sin la cara de arriba sale como una cubeta; un cilindro sin sus tapas,
## como un tubo.
##
## Aquí se trabaja sobre SOPA DE TRIÁNGULOS (`Mesh.get_faces()`): tres vértices
## por triángulo, sin índice. Es el mismo formato con el que trabaja la web
## después de `toNonIndexed()`, así que el algoritmo es el mismo, número a
## número, incluidos los cuatro arreglos de la auditoría de v0.3.73:
##
##   · la cara crece DESDE UNA SEMILLA y no se aparta más de 45° de ella (sin
##     eso, en una malla densa tocar la base de una kettlebell marcaba el 68 %
##     de la pieza);
##   · las astillas —tiras de triángulos de área ~0— se absorben en su vecina;
##   · el inglete se acota a 2 y cada punto interior se confina a la caja de la
##     pieza (sin eso, en una hendidura cerrada la carcasa crecía HACIA FUERA);
##   · y la cara guardada se vuelve a buscar por normal, sitio Y TAMAÑO.
##
## UNIDADES: aquí todo va en METROS (Godot). El grosor llega en centímetros
## desde el `.json` de la web y lo convierte quien llama, con `Units.cm()`.

const COS_SUAVE := 0.8829476   # cos(28°): continuidad entre triángulos vecinos
const COS_APERTURA := 0.7071068 # cos(45°): apertura máxima de una cara
const ASTILLA := 0.004          # fracción de superficie por debajo de la cual se absorbe
const INGLETE_MAX := 2.0        # la esquina de un cubo pide 1,73


## Una cara reconocida en una malla concreta.
class Cara:
	var tris: PackedInt32Array = PackedInt32Array()
	var n := Vector3.ZERO          ## normal media (unitaria)
	var centro := Vector3.ZERO     ## centro, en coordenadas de la pieza
	var caja_c := Vector3.ZERO     ## centro en fracción de la caja (0..1 por eje)
	var area := 0.0
	var frac_area := 0.0


## LA NORMAL DE UN TRIÁNGULO, CON EL GIRO DE GODOT.
##
## Y no es un detalle de estilo: three.js considera de frente el giro
## ANTIHORARIO y Godot el HORARIO, así que el producto vectorial que en la web
## apunta hacia fuera aquí apunta hacia DENTRO. Con la fórmula de la web, la
## cara de arriba de un cubo salía mirando hacia abajo, ninguna ficha
## emparejaba y la chapa dejaba la pieza hueca y cerrada en vez de abrirla.
## Todo el archivo pasa por aquí para no volver a tropezar con lo mismo.
static func _cruz(a: Vector3, b: Vector3, c: Vector3) -> Vector3:
	return (c - a).cross(b - a)


## Clave de soldadura: dos vértices en el mismo sitio son el mismo punto.
static func _clave(p: Vector3) -> Vector3i:
	return Vector3i(roundi(p.x * 1e6), roundi(p.y * 1e6), roundi(p.z * 1e6))


static func _caja(tris: PackedVector3Array) -> AABB:
	if tris.is_empty():
		return AABB()
	var caja := AABB(tris[0], Vector3.ZERO)
	for p in tris:
		caja = caja.expand(p)
	return caja


## RECONOCE LAS CARAS. El orden de la lista no significa nada: una cara se
## identifica por su normal y su sitio, nunca por su número.
static func detectar_caras(tris: PackedVector3Array) -> Array:
	var n_tri := tris.size() / 3
	var caras: Array = []
	if n_tri == 0:
		return caras

	# Soldadura de vértices.
	var id_de := {}
	var sold := PackedInt32Array()
	sold.resize(tris.size())
	for i in tris.size():
		var k := _clave(tris[i])
		var id = id_de.get(k, -1)
		if id == -1:
			id = id_de.size()
			id_de[k] = id
		sold[i] = id

	# Normal y área de cada triángulo.
	var normales: Array[Vector3] = []
	var areas := PackedFloat64Array()
	normales.resize(n_tri)
	areas.resize(n_tri)
	for t in n_tri:
		var cruz := _cruz(tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2])
		var l := cruz.length()
		areas[t] = l * 0.5
		normales[t] = (cruz / l) if l > 1e-12 else Vector3.UP

	# Vecindad por arista compartida.
	var primero := {}
	var vecinos: Array = []
	vecinos.resize(n_tri)
	for t in n_tri:
		vecinos[t] = PackedInt32Array()
	for t in n_tri:
		if areas[t] <= 1e-12:
			continue
		for k in 3:
			var p: int = sold[t * 3 + k]
			var q: int = sold[t * 3 + (k + 1) % 3]
			var llave := Vector2i(mini(p, q), maxi(p, q))
			var otro = primero.get(llave, -1)
			if otro == -1:
				primero[llave] = t
			else:
				vecinos[t].append(otro)
				vecinos[otro].append(t)

	# Crecimiento desde una semilla: el triángulo más grande que quede suelto.
	var cara_de := PackedInt32Array()
	cara_de.resize(n_tri)
	cara_de.fill(-1)
	var semillas: Array = []
	for t in n_tri:
		if areas[t] > 1e-12:
			semillas.append(t)
	semillas.sort_custom(func(x, y): return areas[x] > areas[y])
	var n_caras := 0
	for semilla in semillas:
		if cara_de[semilla] >= 0:
			continue
		var id := n_caras
		n_caras += 1
		var n_semilla: Vector3 = normales[semilla]
		cara_de[semilla] = id
		var cola: Array = [semilla]
		while not cola.is_empty():
			var t: int = cola.pop_back()
			for u in vecinos[t]:
				if cara_de[u] >= 0:
					continue
				if normales[u].dot(normales[t]) < COS_SUAVE:
					continue
				if normales[u].dot(n_semilla) < COS_APERTURA:
					continue
				cara_de[u] = id
				cola.append(u)

	# Astillas: se absorben en la vecina con la que más arista comparten.
	var area_de := PackedFloat64Array()
	area_de.resize(n_caras)
	for t in n_tri:
		if cara_de[t] >= 0:
			area_de[cara_de[t]] += areas[t]
	var area_total := 0.0
	for a in area_de:
		area_total += a
	if area_total > 0.0 and n_caras > 1:
		for _pasada in 2:
			var compartidas: Array = []
			compartidas.resize(n_caras)
			for i in n_caras:
				compartidas[i] = {}
			for t in n_tri:
				var ct: int = cara_de[t]
				if ct < 0:
					continue
				for u in vecinos[t]:
					var cu: int = cara_de[u]
					if cu < 0 or cu == ct:
						continue
					compartidas[ct][cu] = int(compartidas[ct].get(cu, 0)) + 1
			var destino := PackedInt32Array()
			destino.resize(n_caras)
			for i in n_caras:
				destino[i] = i
			var chicas: Array = []
			for i in n_caras:
				if area_de[i] > 0.0 and area_de[i] < ASTILLA * area_total:
					chicas.append(i)
			chicas.sort_custom(func(x, y): return area_de[x] < area_de[y])
			var hubo := false
			for i in chicas:
				var mejor := -1
				var mas := 0
				for j in compartidas[i].keys():
					var jj := _raiz(destino, j)
					if jj == _raiz(destino, i):
						continue
					var cuantas: int = compartidas[i][j]
					if cuantas > mas or (cuantas == mas and mejor >= 0 and area_de[jj] > area_de[mejor]):
						mas = cuantas
						mejor = jj
				if mejor < 0:
					continue
				destino[_raiz(destino, i)] = mejor
				area_de[mejor] += area_de[i]
				area_de[i] = 0.0
				hubo = true
			if not hubo:
				break
			for t in n_tri:
				if cara_de[t] >= 0:
					cara_de[t] = _raiz(destino, cara_de[t])

	# Agregados por cara.
	var caja := _caja(tris)
	var tam := caja.size
	var por_id := {}
	for t in n_tri:
		var id: int = cara_de[t]
		if id < 0:
			continue
		var c: Cara = por_id.get(id)
		if c == null:
			c = Cara.new()
			por_id[id] = c
		var centro_tri := (tris[t * 3] + tris[t * 3 + 1] + tris[t * 3 + 2]) / 3.0
		c.tris.append(t)
		c.area += areas[t]
		c.n += normales[t] * areas[t]
		c.centro += centro_tri * areas[t]
	var suma := 0.0
	for c in por_id.values():
		if c.area > 1e-9:
			suma += c.area
	for c in por_id.values():
		if c.area <= 1e-9 or c.n.length_squared() < 1e-12:
			continue
		c.centro /= c.area
		c.n = c.n.normalized()
		c.frac_area = (c.area / suma) if suma > 0.0 else 0.0
		c.caja_c = Vector3(
			((c.centro.x - caja.position.x) / tam.x) if tam.x > 1e-6 else 0.5,
			((c.centro.y - caja.position.y) / tam.y) if tam.y > 1e-6 else 0.5,
			((c.centro.z - caja.position.z) / tam.z) if tam.z > 1e-6 else 0.5,
		)
		caras.append(c)
	return caras


static func _raiz(padre: PackedInt32Array, i: int) -> int:
	var r := i
	while padre[r] != r:
		r = padre[r]
	var n := i
	while padre[n] != r:
		var sig := padre[n]
		padre[n] = r
		n = sig
	return r


## Ficha guardable de una cara (el mismo formato que el `.json` de la web).
static func ficha_de(c: Cara) -> Dictionary:
	return {
		"n": [c.n.x, c.n.y, c.n.z],
		"c": [c.caja_c.x, c.caja_c.y, c.caja_c.z],
		"a": snappedf(c.frac_area, 0.0001),
	}


## Vuelve a encontrar las caras que describe la lista guardada: mismo lado,
## mismo sitio y —desde v0.3.73— mismo orden de tamaño.
static func emparejar(caras: Array, fichas: Array) -> Dictionary:
	var fuera := {}
	for f in fichas:
		var fn: Array = f.get("n", [0, 1, 0])
		var fc: Array = f.get("c", [0.5, 0.5, 0.5])
		var n := Vector3(fn[0], fn[1], fn[2])
		var c := Vector3(fc[0], fc[1], fc[2])
		var a := float(f.get("a", -1.0))
		var mejor := -1
		var corta := 0.45
		for i in caras.size():
			if fuera.has(i):
				continue
			var cara: Cara = caras[i]
			if cara.n.dot(n) < 0.75:
				continue
			if a > 0.0:
				var razon := cara.frac_area / a
				if razon < 0.25 or razon > 4.0:
					continue
			var d := cara.caja_c.distance_to(c)
			if d < corta:
				corta = d
				mejor = i
		if mejor >= 0:
			fuera[mejor] = true
	return fuera


## LA TRANSFORMACIÓN. Devuelve la sopa de triángulos de la plancha, o la misma
## si no hay nada que hacer. `grosor` va en METROS.
static func aplicar(tris: PackedVector3Array, fichas: Array, grosor: float) -> PackedVector3Array:
	if grosor <= 0.0 or tris.size() < 3:
		return tris
	var caras := detectar_caras(tris)
	if caras.is_empty():
		return tris
	var n_tri := tris.size() / 3
	var fuera := emparejar(caras, fichas)
	var quitar := PackedByteArray()
	quitar.resize(n_tri)
	for i in fuera.keys():
		for t in (caras[i] as Cara).tris:
			quitar[t] = 1
	var quedan := 0
	for t in n_tri:
		if quitar[t] == 0:
			quedan += 1
	if quedan == 0:
		return tris   # quitarlo todo no es una chapa: es borrar la pieza

	# Soldadura, para que al mover un punto se muevan todos sus triángulos.
	var id_de := {}
	var punto: Array[Vector3] = []
	var sold := PackedInt32Array()
	sold.resize(tris.size())
	for i in tris.size():
		var k := _clave(tris[i])
		var id = id_de.get(k, -1)
		if id == -1:
			id = punto.size()
			id_de[k] = id
			punto.append(tris[i])
		sold[i] = id

	# Las CARAS de cada punto, sin repetir, con su área: lo que decide cuánto
	# se mete un punto son las superficies que se juntan en él, no cuántos
	# triángulos trae cada una.
	var caras_del_punto: Array = []
	caras_del_punto.resize(punto.size())
	for i in punto.size():
		caras_del_punto[i] = {}
	var n_triangulo: Array[Vector3] = []
	n_triangulo.resize(n_tri)
	for t in n_tri:
		if quitar[t] == 1:
			continue
		var a := punto[sold[t * 3]]
		var b := punto[sold[t * 3 + 1]]
		var c := punto[sold[t * 3 + 2]]
		var cruz := _cruz(a, b, c)
		var area := cruz.length() * 0.5
		if area <= 1e-12:
			n_triangulo[t] = Vector3.UP
			continue
		var n := cruz.normalized()
		n_triangulo[t] = n
		var llave := Vector3i(roundi(n.x * 1e3), roundi(n.y * 1e3), roundi(n.z * 1e3))
		for k in 3:
			var ficha: Dictionary = caras_del_punto[sold[t * 3 + k]]
			var ya = ficha.get(llave)
			if ya == null:
				ficha[llave] = [n, area]
			else:
				ya[1] += area

	# Normal media, inglete y confinamiento a la caja.
	var caja := _caja(tris)
	var dentro: Array[Vector3] = []
	dentro.resize(punto.size())
	for i in punto.size():
		var ficha: Dictionary = caras_del_punto[i]
		var N := Vector3.ZERO
		for v in ficha.values():
			N += v[0]
		if N.length_squared() > 1e-16:
			N = N.normalized()
		var peor := 1.0
		for v in ficha.values():
			peor = minf(peor, N.dot(v[0]))
		var factor := 1.0
		if ficha.is_empty():
			dentro[i] = punto[i]
			continue
		if peor <= 0.2:
			# Un filo: la media no está de cara a todas sus superficies y el
			# punto saldría disparado hacia fuera. Se mete por la cara mayor.
			var mayor: Array = ficha.values()[0]
			for v in ficha.values():
				if v[1] > mayor[1]:
					mayor = v
			N = mayor[0]
		else:
			var suma := 0.0
			for v in ficha.values():
				suma += N.dot(v[0])
			var cos_medio: float = suma / ficha.size()
			factor = minf(INGLETE_MAX, 1.0 / maxf(0.3, cos_medio))
		var p := punto[i] - N * (grosor * factor)
		dentro[i] = p.clamp(caja.position, caja.position + caja.size)

	var salida := PackedVector3Array()
	# 1) la cara de fuera tal cual; 2) la de dentro, del revés.
	for t in n_tri:
		if quitar[t] == 1:
			continue
		var i0: int = sold[t * 3]
		var i1: int = sold[t * 3 + 1]
		var i2: int = sold[t * 3 + 2]
		salida.append_array([punto[i0], punto[i1], punto[i2]])
		salida.append_array([dentro[i0], dentro[i2], dentro[i1]])

	# 3) el canto: una arista que sólo toca a un triángulo de los que se quedan
	# es un borde de la plancha, y ahí se ve el grosor.
	var cuenta := {}
	for t in n_tri:
		if quitar[t] == 1:
			continue
		for k in 3:
			var p: int = sold[t * 3 + k]
			var q: int = sold[t * 3 + (k + 1) % 3]
			var llave := Vector2i(mini(p, q), maxi(p, q))
			cuenta[llave] = int(cuenta.get(llave, 0)) + 1
	for t in n_tri:
		if quitar[t] == 1:
			continue
		for k in 3:
			var ia: int = sold[t * 3 + k]
			var ib: int = sold[t * 3 + (k + 1) % 3]
			var ic: int = sold[t * 3 + (k + 2) % 3]
			if int(cuenta.get(Vector2i(mini(ia, ib), maxi(ia, ib)), 0)) != 1:
				continue
			var A := punto[ia]
			var B := punto[ib]
			var arista := B - A
			var afuera := arista.cross(n_triangulo[t])
			if afuera.dot((A + B) * 0.5 - punto[ic]) < 0.0:
				afuera = -afuera
			var n_canto := _cruz(A, B, dentro[ib])
			if n_canto.dot(afuera) >= 0.0:
				salida.append_array([A, B, dentro[ib], A, dentro[ib], dentro[ia]])
			else:
				salida.append_array([A, dentro[ib], B, A, dentro[ia], dentro[ib]])
	return salida
