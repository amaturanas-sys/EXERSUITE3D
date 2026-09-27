"""La banca de TRES topes, resuelta otra vez CONTRA EL PIVOTE NUEVO.

`tres.py` la resolvio para la banca vieja: pivote en la bisagra de placas
(-24,75, 42,15). El de ahora es el pasador de la horquilla, (-28, 45,87), y con
el respaldo concentrico con el, asi que la viga y el puntal que salian entonces
—girar la viga -7,5°, moverla (-22,5, +20,5) y acortar el puntal a 33— ya no son
los que minimizan nada.

Lo que se busca es lo mismo: que el puntal empuje al pasador lo MAS
PERPENDICULAR posible al carril en los tres topes, porque el angulo contra la
normal del carril es lo que decide si la cuna sujeta. Medido en la de cinco
topes: el tope mas recostado deja el puntal a 37° del carril (53° de su normal)
y no aguanta; los otros cuatro van de 49° a 75° del carril y aguantan clavados.
"""
import json, math, copy, sys, os

BASE = "pruebas/datos/bancoajustable.json"   # se corre desde la raiz del repo
ASIENTO = (-1.03, 0.89)
PASO = 12.5
RESP = ["obj_86", "obj_95", "obj_97", "obj_98"]
PUNT = ["obj_93", "obj_94", "obj_96", "obj_99"]
PLACAS = ["obj_87", "obj_88"]
EJE, PIN = "obj_91", "obj_99"


def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx,
            aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]


def qrot(q, v):
    x, y, z, w = q
    vx, vy, vz = v
    tx, ty, tz = 2*(y*vz-z*vy), 2*(z*vx-x*vz), 2*(x*vy-y*vx)
    return [vx+w*tx+y*tz-z*ty, vy+w*ty+z*tx-x*tz, vz+w*tz+x*ty-y*tx]


def qinv(q):
    return [-q[0], -q[1], -q[2], q[3]]


def gira(d, obj, ids, c, ang):
    qr = [0, 0, math.sin(ang/2), math.cos(ang/2)]
    ids = set(i for i in ids if i in obj)
    for i in ids:
        o = obj[i]
        p = o["position"]
        dx, dy = p[0]-c[0], p[1]-c[1]
        p[0] = c[0] + dx*math.cos(ang) - dy*math.sin(ang)
        p[1] = c[1] + dx*math.sin(ang) + dy*math.cos(ang)
        o["quaternion"] = qmul(qr, o["quaternion"])
    for j in d["joints"]:
        if j["bodyAId"] in ids and j["bodyBId"] in ids:
            a = j["anchor"]
            dx, dy = a[0]-c[0], a[1]-c[1]
            a[0] = c[0] + dx*math.cos(ang) - dy*math.sin(ang)
            a[1] = c[1] + dx*math.sin(ang) + dy*math.cos(ang)


def bisagraArriba(d):
    for j in d["joints"]:
        if {j["bodyAId"], j["bodyBId"]} == {"obj_94", "obj_95"}:
            return j
    raise SystemExit("falta la bisagra de arriba")


def anguloRespaldo(obj):
    v = qrot(obj["obj_97"]["quaternion"], [0, 1, 0])
    v = qrot(qinv(obj["obj_92"]["quaternion"]), v)
    return math.degrees(math.atan2(v[0], v[1]))


def asientos(d, obj, dientes):
    pl = obj[PLACAS[0]]
    q, pp = pl["quaternion"], pl["position"]
    zPin = obj[PIN]["position"][2]
    out = []
    for k in range(dientes):
        a = qrot(q, [ASIENTO[0], (k - (dientes-1)/2)*PASO + ASIENTO[1], 0.0])
        b = qrot(q, [0, 0, 1.0])
        lz = (zPin - pp[2] - a[2]) / b[2] if abs(b[2]) > 1e-9 else 0.0
        out.append((pp[0]+a[0]+lz*b[0], pp[1]+a[1]+lz*b[1]))
    return out


def preparar(base, beta, cx, cy, largo, dientes):
    """La base con la viga girada y movida, el puntal a `largo` y N dientes."""
    d = copy.deepcopy(base)
    obj = {o["id"]: o for o in d["objects"]}
    # La viga: N dientes, girada beta sobre su centro y movida (cx, cy).
    qr = [0, 0, math.sin(math.radians(beta)/2), math.cos(math.radians(beta)/2)]
    for i in PLACAS:
        pl = obj[i]
        pl["params"]["dientes"] = dientes
        pl["quaternion"] = qmul(qr, pl["quaternion"])
        pl["position"][0] += cx
        pl["position"][1] += cy
    for j in d["joints"]:
        if PLACAS[0] in (j["bodyAId"], j["bodyBId"]) or PLACAS[1] in (j["bodyAId"], j["bodyBId"]):
            j["anchor"][0] += cx
            j["anchor"][1] += cy
    # El puntal, acortado por abajo hasta `largo` entre su bisagra y su pasador.
    H = bisagraArriba(d)["anchor"][:2]
    pin = obj[PIN]["position"]
    dv = (pin[0]-H[0], pin[1]-H[1])
    n0 = math.hypot(*dv)
    u = (dv[0]/n0, dv[1]/n0)
    D = n0 - largo
    viejo = tuple(pin[:2])
    pin[0] -= D*u[0]
    pin[1] -= D*u[1]
    st = obj["obj_93"]
    st["position"][0] -= D/2*u[0]
    st["position"][1] -= D/2*u[1]
    path = st["params"]["path"]
    lg = path[-1][1] - path[0][1]
    for pt in path:
        pt[1] *= (lg - D) / lg
    for j in d["joints"]:
        if math.dist(j["anchor"][:2], viejo) < 1.5:
            j["anchor"][0] -= D*u[0]
            j["anchor"][1] -= D*u[1]
    return d


def posar(prep, k, dientes):
    d = copy.deepcopy(prep)
    obj = {o["id"]: o for o in d["objects"]}
    S = asientos(d, obj, dientes)[k]
    Pb = obj[EJE]["position"][:2]
    H0 = bisagraArriba(d)["anchor"][:2]
    RH = math.dist(Pb, H0)
    L = math.dist(H0, obj[PIN]["position"][:2])
    r = math.dist(Pb, S)
    cosg = (RH*RH + r*r - L*L) / (2*RH*r)
    if abs(cosg) > 1:
        return None
    g = math.acos(cosg)
    fiS = math.atan2(S[1]-Pb[1], S[0]-Pb[0])
    fi0 = math.atan2(H0[1]-Pb[1], H0[0]-Pb[0])
    alfa = min([((fiS + s*g) - fi0 + math.pi) % (2*math.pi) - math.pi for s in (+1, -1)], key=abs)
    H = (Pb[0] + RH*math.cos(fi0+alfa), Pb[1] + RH*math.sin(fi0+alfa))
    gira(d, obj, RESP, Pb, alfa)
    tr = (H[0]-H0[0], H[1]-H0[1])
    for i in PUNT:
        obj[i]["position"][0] += tr[0]
        obj[i]["position"][1] += tr[1]
    for j in d["joints"]:
        if j["bodyAId"] in PUNT and j["bodyBId"] in PUNT:
            j["anchor"][0] += tr[0]
            j["anchor"][1] += tr[1]
    pin = obj[PIN]["position"]
    pv = (pin[0]-H[0], pin[1]-H[1])
    sv = (S[0]-H[0], S[1]-H[1])
    gira(d, obj, PUNT, H, math.atan2(sv[1], sv[0]) - math.atan2(pv[1], pv[0]))
    bisagraArriba(d)["anchor"][0], bisagraArriba(d)["anchor"][1] = H
    # El angulo del puntal contra la NORMAL del carril, que es lo que decide.
    carril = qrot(obj[PLACAS[0]]["quaternion"], [0, 1, 0])[:2]
    pu = (pin[0]-H[0], pin[1]-H[1])
    nn = math.hypot(*pu)
    pu = (pu[0]/nn, pu[1]/nn)
    alCarril = math.degrees(math.acos(min(1, abs(pu[0]*carril[0]+pu[1]*carril[1]))))
    return {
        "d": d,
        "grados": round(abs(anguloRespaldo(obj)), 1),
        "err": math.dist(obj[PIN]["position"][:2], S),
        "normal": round(90 - alCarril, 1),   # 0 = perpendicular al carril
    }


# Tres topes que caen casi en el mismo angulo no son tres topes. El reparto es
# condicion, no premio: entre el mas y el menos recostado tiene que haber al
# menos SEPARACION grados, y entre vecinos al menos SEPARACION/2.
SEPARACION = 24.0


def peor(base, beta, cx, cy, largo, dientes):
    prep = preparar(base, beta, cx, cy, largo, dientes)
    peorAng, poses = 0.0, []
    for k in range(dientes):
        r = posar(prep, k, dientes)
        if r is None or r["err"] > 0.05:
            return None, None
        peorAng = max(peorAng, abs(r["normal"]))
        poses.append(r)
    ang = sorted(p["grados"] for p in poses)
    # Y en la banda que sirve para una banca: de casi vertical (30°) a casi
    # tumbada (78°). Un tope a 4° de la vertical no es un tope de banca.
    if ang[0] < 30 or ang[-1] > 78:
        return None, None
    if ang[-1] - ang[0] < SEPARACION:
        return None, None
    if any(ang[i+1] - ang[i] < SEPARACION / 2 for i in range(len(ang)-1)):
        return None, None
    return peorAng, poses


if __name__ == "__main__":
    base = json.load(open(BASE))
    dientes = 3
    mejor = None
    # Busqueda gruesa y luego fina alrededor del mejor.
    rejilla = [
        (range(-30, 31, 5), range(-50, 31, 10), range(-20, 51, 10), range(24, 56, 4)),
        None,
    ]
    betas, cxs, cys, ls = rejilla[0]
    for b in betas:
        for cx in cxs:
            for cy in cys:
                for lg in ls:
                    p, poses = peor(base, b, cx, cy, lg, dientes)
                    if p is None:
                        continue
                    if mejor is None or p < mejor[0]:
                        mejor = (p, b, cx, cy, lg, poses)
    if mejor is None:
        raise SystemExit("la rejilla gruesa no da ninguna solucion")
    print(f"grueso: peor {mejor[0]:.1f}° con beta={mejor[1]} c=({mejor[2]},{mejor[3]}) L={mejor[4]}")
    p0, b0, cx0, cy0, l0, _ = mejor
    for b in [b0 + i*1.0 for i in range(-5, 6)]:
        for cx in [cx0 + i*2.0 for i in range(-5, 6)]:
            for cy in [cy0 + i*2.0 for i in range(-5, 6)]:
                for lg in [l0 + i*1.0 for i in range(-3, 4)]:
                    p, poses = peor(base, b, cx, cy, lg, dientes)
                    if p is None:
                        continue
                    if p < mejor[0]:
                        mejor = (p, b, cx, cy, lg, poses)
    p, b, cx, cy, lg, poses = mejor
    print(f"fino:   peor {p:.1f}° con beta={b:.1f} c=({cx:.1f},{cy:.1f}) L={lg:.1f}")
    for k, r in enumerate(poses):
        print(f"  tope {k+1}: respaldo {r['grados']:5.1f}°, puntal a {r['normal']:5.1f}° "
              f"de la normal, pasador a {r['err']*10:.2f} mm")
    if "--escribir" in sys.argv:
        manifiesto = []
        for k, r in enumerate(poses):
            f = f"pruebas/datos/banco3-tope-{k+1}.json"
            json.dump(r["d"], open(f, "w"), indent=2, ensure_ascii=False)
            open(f, "a").write("\n")
            manifiesto.append({"tope": k+1, "grados": r["grados"]})
        json.dump(manifiesto, open("pruebas/datos/banco3-topes.json", "w"), indent=2)
        open("pruebas/datos/banco3-topes.json", "a").write("\n")
        print("escritas las tres poses y su manifiesto")
