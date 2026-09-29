"""La banca ajustable CON TOPES DE CATALOGO (v0.4.11): la misma banca del
disenador, con la placa dentada rehecha para que sus dientes den angulos
redondos -15, 30, 45 y 60 grados sobre la horizontal- en vez de los 15,1 / 27,8
/ 38,6 / 48,7 / 59,4 que salen de repartirlos a 12,5 cm.

SE PROBARON SEIS, Y DOS NO SIRVEN CON ESTA BISAGRA Y ESTE PILAR (medido):
  - EL PLANO (0): el pilar queda a solo 22 grados de la placa -el mas tumbado
    de todos- justo cuando el respaldo tiene su brazo de palanca maximo. La
    mayor carga con el empuje mas a lo largo de la placa: el pasador trepa al
    diente de 15 y la banca acaba ahi (72,2 desde la vertical). El de 15, con
    el pilar a 37, aguanta. Las bancas reales apoyan el plano en el bastidor,
    no en el pilar; esta no tiene ese apoyo.
  - 75: el pilar se pliega contra el respaldo y sus dos travesanos nacen
    METIDOS 4 cm uno en otro. La bisagra es «real» -conserva los contactos
    para que el material frene el plegado- y el motor los separa: el respaldo
    pasa la vertical. Esta bisagra no pliega tanto.
Los cuatro de en medio asientan 1,5-3,1 grados y no ceden.

La cuenta es la de `brazoPilar.ts`, al reves: con el brazo X (del pivote a la
bisagra de arriba), el pilar L (de esa bisagra al pasador de apoyo) y la recta
de los asientos (inclinacion C, descentrado E), cada angulo del brazo pide su
asiento en
    t = X cos(psi) - sqrt(L^2 - (X sen(psi) - E)^2)      psi = theta - C
por la rama `-`, que es la que monta la banca de hoy (sus cinco asientos la
cumplen). Los dientes se colocan con `dientePosiciones`, y el gancho no cambia:
es el del disenador, dibujado a 12,5 cm, que solo pide 4,53 cm entre dientes.

Uso, desde la raiz del repo:
    python3 pruebas/datos/banco-catalogo.py
    python3 pruebas/datos/banco-topes-geometria.py \\
        pruebas/datos/bancocatalogo.json pruebas/datos/banco-catalogo-%d.json
"""
import copy, importlib.util, json, math, sys

sys.argv = sys.argv[:1]   # el generador lee la linea de ordenes al importarse
spec = importlib.util.spec_from_file_location("gen", "pruebas/datos/banco-topes-geometria.py")
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

CATALOGO = [15, 30, 45, 60]   # respaldo sobre la horizontal, en grados (ver arriba)
SALIDA = "pruebas/datos/bancocatalogo.json"
GEMELA = "obj_88"   # la gemela de la placa en este fichero

base = json.load(open(gen.BASE))
obj = {o["id"]: o for o in base["objects"]}
S = gen.asientos(base, obj)
Pb = obj[gen.EJE]["position"][:2]
H0 = gen.bisagraArriba(base)["anchor"][:2]
X = math.dist(Pb, H0)
L = math.dist(H0, obj[gen.PIN]["position"][:2])
u = (S[-1][0] - S[0][0], S[-1][1] - S[0][1])
nu = math.hypot(*u)
u = (u[0] / nu, u[1] / nu)
n = (-u[1], u[0])
C = math.degrees(math.atan2(u[1], u[0]))
E = (S[0][0] - Pb[0]) * n[0] + (S[0][1] - Pb[1]) * n[1]
t = lambda s: (s[0] - Pb[0]) * u[0] + (s[1] - Pb[1]) * u[1]
# respaldo sobre la horizontal = angulo del brazo + desfase fijo
th0 = math.degrees(math.atan2(H0[1] - Pb[1], H0[0] - Pb[0]))
desfase = (90 - gen.anguloRespaldo(obj)) - th0


def asiento(respaldo):
    psi = math.radians(respaldo - desfase - C)
    d = X * math.sin(psi) - E
    disc = L * L - d * d
    if disc < 0:
        raise SystemExit(f"a {respaldo} grados el pilar no llega a la recta de la placa")
    return X * math.cos(psi) - math.sqrt(disc)


# LA RAMA SE COMPRUEBA, NO SE SUPONE: los cinco asientos de hoy tienen que
# salir de la misma formula con los angulos que ya dan.
for k, s in enumerate(S):
    d, th, _ = gen.posar(k, base)
    esperado = asiento(90 - abs(th))
    if abs(esperado - t(s)) > 0.01:
        raise SystemExit(f"la rama no cuadra en el tope {k+1}: {esperado:.3f} frente a {t(s):.3f}")

ts = [asiento(a) for a in CATALOGO]
orden = sorted(range(len(ts)), key=lambda i: ts[i])
if orden != list(range(len(ts))):
    raise SystemExit("los asientos no crecen con el angulo: la rama no es la de la banca")
pos = [round(x - ts[0], 4) for x in ts]
huecos = [round(pos[i] - pos[i - 1], 2) for i in range(1, len(pos))]

cat = copy.deepcopy(base)
oc = {o["id"]: o for o in cat["objects"]}
for pid in (gen.PLACA, GEMELA):
    oc[pid]["params"]["dientePosiciones"] = pos
    oc[pid]["params"]["dientes"] = len(pos)
# La placa se desliza por su propia recta hasta que su primer asiento cae en el
# del plano; los demas caen solos, porque las posiciones son las de la cuenta.
S1 = gen.asientos(cat, oc)
delta = ts[0] - t(S1[0])
for pid in (gen.PLACA, GEMELA):
    p = oc[pid]["position"]
    p[0] += delta * u[0]
    p[1] += delta * u[1]
for j in cat["joints"]:
    if gen.PLACA in (j["bodyAId"], j["bodyBId"]) or GEMELA in (j["bodyAId"], j["bodyBId"]):
        j["anchor"][0] += delta * u[0]
        j["anchor"][1] += delta * u[1]
S2 = gen.asientos(cat, oc)
peor = max(abs(t(s) - x) for s, x in zip(S2, ts))

json.dump(cat, open(SALIDA, "w"), indent=2, ensure_ascii=False)
open(SALIDA, "a").write("\n")
print(f"brazo X = {X:.2f}  pilar L = {L:.2f}  placa C = {C:.1f} grados  descentrado E = {E:.2f}")
print(f"topes de catalogo {CATALOGO}  ->  asientos a lo largo de la placa {[round(x, 2) for x in ts]}")
print(f"dientePosiciones = {pos}")
print(f"huecos entre dientes: {huecos} cm  (el gancho pide 4,53)")
print(f"placa corrida {delta:+.3f} cm por su recta; peor asiento a {peor*10:.3f} mm de su sitio")
print(f"-> {SALIDA}")
