class_name Mannequin
extends Node3D
## Maniquí de referencia simplificado (proporciones del rig de la app web).
## Aplica la pose guardada en el proyecto (grados por articulación) si existe.
## Es una referencia visual/ergonómica: no participa en la física.

const SKIN := Color(0.55, 0.75, 0.95)

var joints: Dictionary = {}  # nombre -> Node3D pivote


static func create(height_cm: float, pose) -> Mannequin:
	var m := Mannequin.new()
	m.name = "Maniqui"
	var h := Units.cm(height_cm)
	m._build(h)
	if pose is Dictionary:
		m.apply_pose(pose)
	return m


func _build(h: float) -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = SKIN
	# Proporciones aproximadas (fracción de la altura), origen en los pies.
	var pelvis_y := 0.51 * h
	var torso_l := 0.30 * h
	var head_r := 0.065 * h
	var arm_l := 0.26 * h
	var forearm_l := 0.23 * h
	var thigh_l := 0.26 * h
	var shin_l := 0.25 * h

	var pelvis := _seg("pelvis", self, Vector3(0, pelvis_y, 0), Vector3(0.16 * h, 0.08 * h, 0.09 * h), mat)
	var torso := _seg("torso", pelvis, Vector3(0, torso_l / 2 + 0.04 * h, 0), Vector3(0.17 * h, torso_l, 0.09 * h), mat)
	_ball("cabeza", torso, Vector3(0, torso_l / 2 + head_r * 1.3, 0), head_r, mat)
	for side in [["L", -1.0], ["R", 1.0]]:
		var sx: float = side[1] * 0.115 * h
		var shoulder := _joint("shoulder" + side[0], torso, Vector3(sx, torso_l / 2 - 0.02 * h, 0))
		_limb(shoulder, arm_l, 0.028 * h, mat)
		var elbow := _joint("elbow" + side[0], shoulder, Vector3(0, -arm_l, 0))
		_limb(elbow, forearm_l, 0.024 * h, mat)
		var hip := _joint("hip" + side[0], pelvis, Vector3(side[1] * 0.055 * h, -0.05 * h, 0))
		_limb(hip, thigh_l, 0.038 * h, mat)
		var knee := _joint("knee" + side[0], hip, Vector3(0, -thigh_l, 0))
		_limb(knee, shin_l, 0.032 * h, mat)


func _joint(joint_name: String, parent: Node3D, pos: Vector3) -> Node3D:
	var j := Node3D.new()
	j.name = joint_name
	j.position = pos
	parent.add_child(j)
	joints[joint_name] = j
	return j


## Hueso: cápsula colgando en -Y desde el pivote (como el rig de la web).
func _limb(joint: Node3D, length: float, radius: float, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.height = length
	cap.radius = radius
	mi.mesh = cap
	mi.material_override = mat
	mi.position = Vector3(0, -length / 2, 0)
	joint.add_child(mi)


func _seg(seg_name: String, parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> Node3D:
	var pivot := _joint(seg_name, parent, pos)
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mi.mesh = box
	mi.material_override = mat
	pivot.add_child(mi)
	return pivot


func _ball(seg_name: String, parent: Node3D, pos: Vector3, r: float, mat: Material) -> void:
	var pivot := _joint(seg_name, parent, pos)
	var mi := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = r
	sph.height = r * 2
	mi.mesh = sph
	mi.material_override = mat
	pivot.add_child(mi)


## Pose del proyecto web: { nombreArticulacion: [gradosX, gradosY, gradosZ] }.
func apply_pose(pose: Dictionary) -> void:
	for joint_name in pose:
		if joints.has(joint_name):
			var a: Array = pose[joint_name]
			joints[joint_name].rotation_degrees = Vector3(float(a[0]), float(a[1]), float(a[2]))
