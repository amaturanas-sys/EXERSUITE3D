class_name Mannequin
extends Node3D
## Maniquí de referencia a escala (proporciones del rig de la app web).
## - Cada segmento usa los MISMOS ids que la web (torso, pelvis, cabeza,
##   brazo-sup-L/R, antebrazo-L/R, muslo-L/R, pierna-L/R) y puede SUSTITUIRSE
##   por un modelo .glb desde la Biblioteca (ModelStore, pestaña Maniquí).
## - Aplica la pose guardada en el proyecto (grados por articulación).
## - IK de manos de dos huesos (porte 1:1 de armIK.ts) para apoyar las manos
##   en agarres durante la simulación.

const SKIN := Color(0.55, 0.75, 0.95)
const REST := Vector3(0, -1, 0)          # los huesos descansan a lo largo de -Y
const POLE := Vector3(0, -1, -0.25)      # el codo flexiona hacia abajo/atrás

var joints: Dictionary = {}              # nombre -> Node3D pivote
var _arm_len := 0.0
var _forearm_len := 0.0


static func create(height_cm: float, pose) -> Mannequin:
	var m := Mannequin.new()
	m.name = "Maniqui"
	m._build(Units.cm(height_cm))
	if pose is Dictionary:
		m.apply_pose(pose)
	return m


func _build(h: float) -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = SKIN
	var pelvis_y := 0.51 * h
	var torso_l := 0.30 * h
	var head_r := 0.065 * h
	_arm_len = 0.26 * h
	_forearm_len = 0.23 * h
	var thigh_l := 0.26 * h
	var shin_l := 0.25 * h

	var pelvis := _seg("pelvis", self, Vector3(0, pelvis_y, 0), Vector3(0.16 * h, 0.08 * h, 0.09 * h), mat)
	var torso := _seg("torso", pelvis, Vector3(0, torso_l / 2 + 0.04 * h, 0), Vector3(0.17 * h, torso_l, 0.09 * h), mat)
	_ball("cabeza", torso, Vector3(0, torso_l / 2 + head_r * 1.3, 0), head_r, mat)
	for side_data in [["L", -1.0], ["R", 1.0]]:
		var side: String = side_data[0]
		var sx: float = side_data[1] * 0.115 * h
		var shoulder := _joint("shoulder" + side, torso, Vector3(sx, torso_l / 2 - 0.02 * h, 0))
		_limb("brazo-sup-" + side, shoulder, _arm_len, 0.028 * h, mat)
		var elbow := _joint("elbow" + side, shoulder, Vector3(0, -_arm_len, 0))
		_limb("antebrazo-" + side, elbow, _forearm_len, 0.024 * h, mat)
		_joint("wrist" + side, elbow, Vector3(0, -_forearm_len, 0))
		var hip := _joint("hip" + side, pelvis, Vector3(side_data[1] * 0.055 * h, -0.05 * h, 0))
		_limb("muslo-" + side, hip, thigh_l, 0.038 * h, mat)
		var knee := _joint("knee" + side, hip, Vector3(0, -thigh_l, 0))
		_limb("pierna-" + side, knee, shin_l, 0.032 * h, mat)


func _joint(joint_name: String, parent: Node3D, pos: Vector3) -> Node3D:
	var j := Node3D.new()
	j.name = joint_name
	j.position = pos
	parent.add_child(j)
	joints[joint_name] = j
	return j


## Añade el visual de un segmento: modelo sustituido de la Biblioteca si
## existe, o la primitiva. `target` es el hueco (AABB local al pivote).
func _segment_visual(seg_id: String, parent: Node3D, target: AABB, primitive: Mesh, mat: Material) -> void:
	var path := ModelStore.mannequin_override_path(seg_id)
	if path != "":
		var inst := ModelStore.instantiate_fitted(path, target)
		if inst:
			parent.add_child(inst)
			return
	var mi := MeshInstance3D.new()
	mi.mesh = primitive
	mi.material_override = mat
	mi.position = target.get_center()
	parent.add_child(mi)


## Hueso: cápsula (o modelo) colgando en -Y desde el pivote.
func _limb(seg_id: String, joint: Node3D, length: float, radius: float, mat: Material) -> void:
	var cap := CapsuleMesh.new()
	cap.height = length
	cap.radius = radius
	var target := AABB(Vector3(-radius, -length, -radius), Vector3(radius * 2, length, radius * 2))
	_segment_visual(seg_id, joint, target, cap, mat)


func _seg(seg_id: String, parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> Node3D:
	var pivot := _joint(seg_id, parent, pos)
	var box := BoxMesh.new()
	box.size = size
	_segment_visual(seg_id, pivot, AABB(-size / 2, size), box, mat)
	return pivot


func _ball(seg_id: String, parent: Node3D, pos: Vector3, r: float, mat: Material) -> void:
	var pivot := _joint(seg_id, parent, pos)
	var sph := SphereMesh.new()
	sph.radius = r
	sph.height = r * 2
	_segment_visual(seg_id, pivot, AABB(Vector3(-r, -r, -r), Vector3(r * 2, r * 2, r * 2)), sph, mat)


## Pose del proyecto web: { nombreArticulacion: [gradosX, gradosY, gradosZ] }.
func apply_pose(pose: Dictionary) -> void:
	for joint_name in pose:
		if joints.has(joint_name):
			var a: Array = pose[joint_name]
			joints[joint_name].rotation_degrees = Vector3(float(a[0]), float(a[1]), float(a[2]))


# ------------------------------------------------- IK de manos (armIK.ts)

## Orienta `joint` para que su -Y mundial apunte a `world_dir` (normalizado).
func _set_bone_world_dir(joint: Node3D, world_dir: Vector3) -> void:
	var parent := joint.get_parent() as Node3D
	if parent == null:
		return
	var pq := parent.global_transform.basis.get_rotation_quaternion()
	var q_world := Quaternion(REST, world_dir)
	joint.quaternion = pq.inverse() * q_world


## IK analítica de dos huesos: hombro→codo→muñeca hacia `target` (mundo).
func solve_hand_ik(side: String, target: Vector3) -> void:
	var shoulder: Node3D = joints.get("shoulder" + side)
	var elbow: Node3D = joints.get("elbow" + side)
	if shoulder == null or elbow == null or _arm_len < 0.001:
		return
	var s_pos := shoulder.global_position
	var to_t := target - s_pos
	var dir := to_t.normalized() if to_t.length_squared() > 1e-8 else Vector3.DOWN
	var d := clampf(to_t.length(), absf(_arm_len - _forearm_len) + 0.001, _arm_len + _forearm_len - 0.001)
	var t_c := s_pos + dir * d
	# Ley de cosenos: proyección del codo sobre S->T y su altura.
	var a := (_arm_len * _arm_len + d * d - _forearm_len * _forearm_len) / (2.0 * d)
	var h := sqrt(maxf(0.0, _arm_len * _arm_len - a * a))
	var bend := POLE - dir * POLE.dot(dir)
	if bend.length_squared() < 1e-6:
		bend = Vector3(0, 0, -1) - dir * Vector3(0, 0, -1).dot(dir)
	bend = bend.normalized()
	var elbow_pos := s_pos + dir * a + bend * h
	_set_bone_world_dir(shoulder, (elbow_pos - s_pos).normalized())
	_set_bone_world_dir(elbow, (t_c - elbow_pos).normalized())
