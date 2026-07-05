class_name GeometryFactory
## Construye la malla de una pieza a partir de sus `params` (formato del .json
## de la app web, medidas en cm). Portado de src/objects/geometryFactory.ts y
## src/objects/linePieces.ts:
##  - Primitivas: box / plane / cylinder / cone / sphere / torus.
##  - beam / tube: piezas de línea con `path` de nodos; rectas usan primitivas
##    y dobladas se barren a lo largo de una curva Catmull-Rom.


static func build_mesh(params: Dictionary) -> Mesh:
	var kind := String(params.get("kind", "box"))
	match kind:
		"box":
			var m := BoxMesh.new()
			m.size = Units.vec_cm(
				float(params.get("width", 10)),
				float(params.get("height", 10)),
				float(params.get("depth", 10)))
			return m
		"plane":
			var m := BoxMesh.new()
			m.size = Units.vec_cm(float(params.get("width", 10)), 0.5, float(params.get("depth", 10)))
			return m
		"cylinder":
			var m := CylinderMesh.new()
			m.top_radius = Units.cm(float(params.get("radiusTop", 5)))
			m.bottom_radius = Units.cm(float(params.get("radiusBottom", 5)))
			m.height = Units.cm(float(params.get("height", 10)))
			return m
		"cone":
			var m := CylinderMesh.new()
			m.top_radius = 0.0
			m.bottom_radius = Units.cm(float(params.get("radiusBottom", 5)))
			m.height = Units.cm(float(params.get("height", 10)))
			return m
		"sphere":
			var m := SphereMesh.new()
			var r := Units.cm(float(params.get("radius", 5)))
			m.radius = r
			m.height = r * 2.0
			return m
		"torus":
			var m := TorusMesh.new()
			var ring := Units.cm(float(params.get("radius", 8)))
			var tube := Units.cm(float(params.get("tubeRadius", 1.5)))
			m.inner_radius = maxf(ring - tube, 0.001)
			m.outer_radius = ring + tube
			# El torus de three vive en el plano XY; el de Godot en XZ:
			# el cargador rota la MeshInstance 90° en X para igualarlos.
			return m
		"beam":
			return _build_beam(params)
		"tube":
			return _build_tube(params)
	return BoxMesh.new()


## Forma de colisión aproximada (caja del AABB de la malla).
static func build_collision(mesh: Mesh, params: Dictionary) -> Shape3D:
	var kind := String(params.get("kind", "box"))
	if kind == "sphere":
		var s := SphereShape3D.new()
		s.radius = Units.cm(float(params.get("radius", 5)))
		return s
	if kind == "cylinder" or (kind == "tube" and _path_is_straight(params.get("path"))):
		var aabb := mesh.get_aabb()
		var c := CylinderShape3D.new()
		c.height = aabb.size.y
		c.radius = maxf(aabb.size.x, aabb.size.z) / 2.0
		return c
	var box := BoxShape3D.new()
	box.size = mesh.get_aabb().size
	return box


# ------------------------------------------------------------ piezas de línea

static func _path_points(params: Dictionary) -> PackedVector3Array:
	var pts := PackedVector3Array()
	var raw: Array = params.get("path", [])
	for n in raw:
		pts.append(Units.arr_cm(n))
	return pts


static func _path_is_straight(raw) -> bool:
	if raw == null or (raw as Array).size() < 3:
		return true
	var path: Array = raw
	var a := Units.arr_cm(path[0])
	var b := Units.arr_cm(path[path.size() - 1])
	var dir := b - a
	if dir.length() < 1e-6:
		return true
	dir = dir.normalized()
	for i in range(1, path.size() - 1):
		var p := Units.arr_cm(path[i]) - a
		if (p - dir * p.dot(dir)).length() > 0.0005:  # 0,5 mm de tolerancia
			return false
	return true


static func _path_length(pts: PackedVector3Array) -> float:
	var L := 0.0
	for i in range(pts.size() - 1):
		L += pts[i].distance_to(pts[i + 1])
	return L


## Curva Catmull-Rom por los nodos (misma parametrización que la web).
static func _catmull(pts: PackedVector3Array, samples: int) -> PackedVector3Array:
	var out := PackedVector3Array()
	var n := pts.size()
	if n < 2:
		return pts
	for s in range(samples + 1):
		var t := float(s) / float(samples) * float(n - 1)
		var i := clampi(int(floor(t)), 0, n - 2)
		var u := t - float(i)
		var p0 := pts[maxi(i - 1, 0)]
		var p1 := pts[i]
		var p2 := pts[i + 1]
		var p3 := pts[mini(i + 2, n - 1)]
		out.append(
			0.5 * ((2.0 * p1) + (-p0 + p2) * u
				+ (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u * u
				+ (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u * u * u))
	return out


## Perfil de acero (beam). Recto: caja (los pinholes reales pueden añadirse
## con CSG, ver docs/MIGRACION-GODOT.md). Doblado: barrido del rectángulo.
static func _build_beam(params: Dictionary) -> Mesh:
	var w := Units.cm(float(params.get("width", 5)))
	var d := Units.cm(float(params.get("depth", 5)))
	var pts := _path_points(params)
	if _path_is_straight(params.get("path")):
		var m := BoxMesh.new()
		m.size = Vector3(w, maxf(_path_length(pts), 0.01), d)
		return m
	var section := PackedVector2Array([
		Vector2(-w / 2, -d / 2), Vector2(w / 2, -d / 2),
		Vector2(w / 2, d / 2), Vector2(-w / 2, d / 2),
	])
	return _sweep(section, pts)


## Tubo de acero. Recto: cilindro. Doblado: barrido del círculo.
static func _build_tube(params: Dictionary) -> Mesh:
	var r := Units.cm(float(params.get("radius", 2.4)))
	var pts := _path_points(params)
	if _path_is_straight(params.get("path")):
		var m := CylinderMesh.new()
		m.top_radius = r
		m.bottom_radius = r
		m.height = maxf(_path_length(pts), 0.01)
		return m
	var section := PackedVector2Array()
	for i in range(16):
		var a := TAU * float(i) / 16.0
		section.append(Vector2(cos(a) * r, sin(a) * r))
	return _sweep(section, pts)


## Barre una sección 2D a lo largo del path (frames por transporte paralelo),
## con tapas en ambos extremos. Devuelve un ArrayMesh con normales.
static func _sweep(section: PackedVector2Array, pts: PackedVector3Array) -> Mesh:
	var curve := _catmull(pts, maxi((pts.size() - 1) * 10, 16))
	var n_rings := curve.size()
	var n_sec := section.size()

	# Frames: tangente + normal transportada en paralelo (sin giros bruscos).
	var tangents: Array[Vector3] = []
	for i in range(n_rings):
		var a := curve[maxi(i - 1, 0)]
		var b := curve[mini(i + 1, n_rings - 1)]
		tangents.append((b - a).normalized())
	var normal := tangents[0].cross(Vector3.RIGHT)
	if normal.length() < 0.01:
		normal = tangents[0].cross(Vector3.FORWARD)
	normal = normal.normalized()

	var rings: Array[PackedVector3Array] = []
	for i in range(n_rings):
		if i > 0:
			# Transporte paralelo: rota la normal con el cambio de tangente.
			var axis := tangents[i - 1].cross(tangents[i])
			if axis.length() > 1e-6:
				normal = normal.rotated(axis.normalized(), tangents[i - 1].angle_to(tangents[i]))
		var binormal := tangents[i].cross(normal).normalized()
		var ring := PackedVector3Array()
		for p in section:
			ring.append(curve[i] + normal * p.x + binormal * p.y)
		rings.append(ring)

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Paredes laterales.
	for i in range(n_rings - 1):
		for j in range(n_sec):
			var j2 := (j + 1) % n_sec
			var a := rings[i][j]
			var b := rings[i][j2]
			var c := rings[i + 1][j2]
			var d := rings[i + 1][j]
			st.add_vertex(a); st.add_vertex(b); st.add_vertex(c)
			st.add_vertex(a); st.add_vertex(c); st.add_vertex(d)
	# Tapas (abanico).
	for cap in [[0, true], [n_rings - 1, false]]:
		var ring: PackedVector3Array = rings[cap[0]]
		var center := Vector3.ZERO
		for p in ring:
			center += p
		center /= float(n_sec)
		for j in range(n_sec):
			var j2 := (j + 1) % n_sec
			if cap[1]:
				st.add_vertex(center); st.add_vertex(ring[j2]); st.add_vertex(ring[j])
			else:
				st.add_vertex(center); st.add_vertex(ring[j]); st.add_vertex(ring[j2])
	st.generate_normals()
	return st.commit()
