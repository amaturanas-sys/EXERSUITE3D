"""Regenera las cinco poses de tope de la banca DESDE LA BASE NUEVA.

`banco42.py` resolvia esto para la banca vieja: pivote en la bisagra de placas
(-24,75, 42,15), la lista de piezas de entonces, y partiendo de un
`banco-original.json` que es la maquina anterior a la horquilla. Aqui se parte
de `pruebas/datos/bancoajustable.json` tal como esta —horquilla con pasador,
respaldo concentrico con su eje, cunas a la medida del pasador— y se resuelve la
misma geometria contra el pivote nuevo.

La cuenta, en el plano XY:

  · Pb es el eje del pasador de la horquilla, sobre el que gira el respaldo.
  · H es la union puntal<->respaldo, que vive en un circulo de radio RH sobre Pb.
  · S_k es el asiento del diente k, medido con el pasador de la banca en la
    propia viga (ver `_sonda-asiento.mjs`).
  · El puntal mide L entre H y su pasador, asi que para cada asiento hay que
    encontrar el H del circulo que queda a exactamente L de S_k. Ley del coseno.

Con H resuelto: se gira el respaldo lo que haga falta para llevar H ahi, se
traslada el puntal con el, y se gira el puntal sobre H para clavar su pasador
en el asiento.
"""
import json, math, copy, sys, os

BASE = "pruebas/datos/bancoajustable.json"   # se corre desde la raiz del repo
SALIDA = "pruebas/datos/banco-tope-%d.json"
# Otra banca y otras salidas por la linea de ordenes (v0.4.11), p. ej. la de
# catalogo: `python3 pruebas/datos/banco-topes-geometria.py
#   pruebas/datos/bancocatalogo.json pruebas/datos/banco-catalogo-%d.json`
if len(sys.argv) >= 3:
    BASE, SALIDA = sys.argv[1], sys.argv[2]
# El asiento del diente, en el marco de la placa, medido con el pasador de la
# banca (Ø2) sobre su propia viga (agarre 2): local (-1.03, +0.89) respecto del
# diente nominal. Lo mide `pruebas/_sonda-asiento.mjs`.
ASIENTO = (-1.03, 0.89)
DIENTES, PASO = 5, 12.5

# Las piezas que giran con el respaldo y las que viajan con el puntal.
RESP = ["obj_86", "obj_95", "obj_97", "obj_98"]
PUNT = ["obj_93", "obj_94", "obj_96", "obj_99"]
EJE = "obj_91"          # pasador de la horquilla: el pivote
PIN = "obj_99"          # pasador de apoyo: lo que se clava en el diente
PLACA = "obj_87"        # viga dentada (la gemela va con ella)


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
    x, y, z, w = q
    return [-x, -y, -z, w]


def posicionesLocales(obj):
    """Y local de cada diente en la placa. Con `dientePosiciones` (v0.4.11) van
    donde se pidieron, centrados en la plancha como hace `medidasDentada`; sin
    ellas, a paso fijo como siempre."""
    pos = obj[PLACA]["params"].get("dientePosiciones")
    if pos and len(pos) >= 2:
        tramo = pos[-1] - pos[0]
        return [p - pos[0] - tramo / 2 for p in pos]
    return [(k - (DIENTES - 1) / 2) * PASO for k in range(DIENTES)]


def asientos(d, obj):
    """Los asientos en el mundo (x, y), a la z del pasador de apoyo."""
    pl = obj[PLACA]
    q, pp = pl["quaternion"], pl["position"]
    zPin = obj[PIN]["position"][2]
    out = []
    for yk in posicionesLocales(obj):
        a = qrot(q, [ASIENTO[0], yk + ASIENTO[1], 0.0])
        b = qrot(q, [0, 0, 1.0])
        # Se corre a lo largo del espesor hasta la z del pasador.
        lz = (zPin - pp[2] - a[2]) / b[2] if abs(b[2]) > 1e-9 else 0.0
        out.append((pp[0] + a[0] + lz*b[0], pp[1] + a[1] + lz*b[1]))
    return out


def gira(d, obj, ids, c, ang):
    qr = [0, 0, math.sin(ang/2), math.cos(ang/2)]
    ids = set(ids)
    for i in ids:
        if i not in obj:
            continue
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
    """La union libre puntal<->respaldo (la que v0.3.90 dejo sin soldar)."""
    for j in d["joints"]:
        if {j["bodyAId"], j["bodyBId"]} == {"obj_94", "obj_95"}:
            return j
    raise SystemExit("no encuentro la bisagra de arriba (obj_94 <-> obj_95)")


def anguloRespaldo(obj):
    """El angulo del respaldo como lo mide la prueba: su Y local en el marco
    del asiento, en grados desde la vertical."""
    v = qrot(obj["obj_97"]["quaternion"], [0, 1, 0])
    v = qrot(qinv(obj["obj_92"]["quaternion"]), v)
    return math.degrees(math.atan2(v[0], v[1]))


def posar(k, base):
    d = copy.deepcopy(base)
    obj = {o["id"]: o for o in d["objects"]}
    S = asientos(d, obj)[k]
    Pb = obj[EJE]["position"][:2]
    H0 = bisagraArriba(d)["anchor"][:2]
    RH = math.dist(Pb, H0)
    L = math.dist(H0, obj[PIN]["position"][:2])

    r = math.dist(Pb, S)
    cosg = (RH*RH + r*r - L*L) / (2*RH*r)
    if abs(cosg) > 1:
        return None, None, None
    g = math.acos(cosg)
    fiS = math.atan2(S[1]-Pb[1], S[0]-Pb[0])
    fi0 = math.atan2(H0[1]-Pb[1], H0[0]-Pb[0])
    # De las dos ramas se toma la que menos gira el respaldo: la otra lo lleva
    # al otro lado del carril, que no es una pose de esta maquina.
    opciones = []
    for s in (+1, -1):
        alfa = (fiS + s*g) - fi0
        alfa = ((alfa + math.pi) % (2*math.pi)) - math.pi
        opciones.append(alfa)
    alfa = min(opciones, key=abs)
    H = (Pb[0] + RH*math.cos(fi0 + alfa), Pb[1] + RH*math.sin(fi0 + alfa))

    gira(d, obj, RESP, Pb, alfa)
    tr = (H[0]-H0[0], H[1]-H0[1])
    for i in PUNT:
        obj[i]["position"][0] += tr[0]
        obj[i]["position"][1] += tr[1]
    for j in d["joints"]:
        if j["bodyAId"] in PUNT and j["bodyBId"] in PUNT:
            j["anchor"][0] += tr[0]
            j["anchor"][1] += tr[1]
    # Y el puntal gira sobre H hasta clavar su pasador en el asiento.
    pin = obj[PIN]["position"]
    pv = (pin[0]-H[0], pin[1]-H[1])
    sv = (S[0]-H[0], S[1]-H[1])
    gira(d, obj, PUNT, H, math.atan2(sv[1], sv[0]) - math.atan2(pv[1], pv[0]))
    bisagraArriba(d)["anchor"][0], bisagraArriba(d)["anchor"][1] = H
    err = math.dist(obj[PIN]["position"][:2], S)
    return d, anguloRespaldo(obj), err


if __name__ == "__main__":
    base = json.load(open(BASE))
    obj0 = {o["id"]: o for o in base["objects"]}
    print(f"pivote {obj0[EJE]['position'][:2]}  ·  respaldo de partida "
          f"{anguloRespaldo(obj0):.1f}°  ·  asientos "
          f"{[(round(x,1), round(y,1)) for x, y in asientos(base, obj0)]}")
    L = math.dist(bisagraArriba(base)['anchor'][:2], obj0[PIN]['position'][:2])
    print(f"puntal: {L:.2f} cm entre la bisagra de arriba y su pasador")
    angulos = []
    for k in range(len(posicionesLocales(obj0))):
        d, th, err = posar(k, base)
        if d is None:
            print(f"  tope {k+1}: SIN SOLUCION (el puntal no alcanza ese asiento)")
            angulos.append(None)
            continue
        json.dump(d, open(SALIDA % (k+1), "w"), indent=2, ensure_ascii=False)
        open(SALIDA % (k+1), "a").write("\n")
        angulos.append(round(abs(th), 1))
        print(f"  tope {k+1}: respaldo a {abs(th):5.1f}° de la vertical, "
              f"pasador a {err*10:.2f} mm del asiento")
    print("TOPES =", [a for a in angulos])
