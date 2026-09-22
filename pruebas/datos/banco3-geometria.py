"""La banca de TRES topes: viga recta girada -7,5 grados y puntal de 33 cm.

Sale del calculo de la inclinacion: con viga recta no hay forma de que el
puntal empuje a menos de 15 grados de la normal del carril en cinco topes
—el techo es 26,9—, pero en TRES si: 12,7 grados.
"""
import json, math, os

ORIG = os.path.join(os.path.dirname(__file__), "banco-original.json")
BETA, L_NUEVO, CX, CY = -7.50, 33.00, -22.50, 20.50
DIENTES, PASO = 3, 12.5
ASIENTO = (-0.81, 0.92)          # medido: un radio del pasador sobre el diente
Pb, H0 = (-24.75, 42.15), (-24.75, 84.78)
RH = math.dist(Pb, H0)
RESP = ["obj_86","obj_90","obj_95","obj_97","obj_98"]
PUNT = ["obj_93","obj_94","obj_96","obj_99"]
PLACAS = ["obj_87","obj_88"]

def qmul(a,b):
    ax,ay,az,aw=a; bx,by,bz,bw=b
    return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx,
            aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]
def qrot(q,v):
    x,y,z,w=q; vx,vy,vz=v
    tx,ty,tz=2*(y*vz-z*vy),2*(z*vx-x*vz),2*(x*vy-y*vx)
    return [vx+w*tx+y*tz-z*ty, vy+w*ty+z*tx-x*tz, vz+w*tz+x*ty-y*tx]

def gira(d, obj, ids, c, ang):
    qr=[0,0,math.sin(ang/2),math.cos(ang/2)]; ids=set(ids)
    for i in ids:
        o=obj[i]; p=o["position"]; dx,dy=p[0]-c[0], p[1]-c[1]
        p[0]=c[0]+dx*math.cos(ang)-dy*math.sin(ang)
        p[1]=c[1]+dx*math.sin(ang)+dy*math.cos(ang)
        o["quaternion"]=qmul(qr,o["quaternion"])
    for j in d["joints"]:
        if j["bodyAId"] in ids and j["bodyBId"] in ids:
            a=j["anchor"]; dx,dy=a[0]-c[0], a[1]-c[1]
            a[0]=c[0]+dx*math.cos(ang)-dy*math.sin(ang)
            a[1]=c[1]+dx*math.sin(ang)+dy*math.cos(ang)

def mueve(d, obj, ids, tr, tambien_sueltas=()):
    ids=set(ids)
    for i in ids:
        obj[i]["position"][0]+=tr[0]; obj[i]["position"][1]+=tr[1]
    for j in d["joints"]:
        if j["bodyAId"] in ids or j["bodyBId"] in ids:
            if j["bodyAId"] in ids and j["bodyBId"] in ids or j.get("name") in tambien_sueltas:
                j["anchor"][0]+=tr[0]; j["anchor"][1]+=tr[1]

def asientos(d):
    """Los tres asientos en el mundo, con el pasador a su z real."""
    pl={o["id"]:o for o in d["objects"]}["obj_87"]; q,pp=pl["quaternion"],pl["position"]
    out=[]
    for k in range(DIENTES):
        a=qrot(q,[ASIENTO[0],(k-(DIENTES-1)/2)*PASO+ASIENTO[1],0.0]); b=qrot(q,[0,0,1.0])
        lz=(-0.5-pp[2]-a[2])/b[2]
        out.append((pp[0]+a[0]+lz*b[0], pp[1]+a[1]+lz*b[1]))
    return out

def base():
    d=json.load(open(ORIG)); obj={o["id"]:o for o in d["objects"]}
    # 1. LA VIGA: tres dientes, girada y movida.
    for i in PLACAS: obj[i]["params"]["dientes"]=DIENTES
    C0=asientos({"objects":[obj["obj_87"]]})[ (DIENTES-1)//2 ] if False else None
    cinco=[(k-2)*PASO for k in range(5)]
    pl=obj["obj_87"]; a=qrot(pl["quaternion"],[ASIENTO[0],ASIENTO[1],0.0]); b=qrot(pl["quaternion"],[0,0,1.0])
    lz=(-0.5-pl["position"][2]-a[2])/b[2]
    C0=(pl["position"][0]+a[0]+lz*b[0], pl["position"][1]+a[1]+lz*b[1])   # diente de en medio
    nombres=("Soldadura de la viga dentada","Soldadura de la viga dentada 2")
    gira(d,obj,PLACAS,C0,math.radians(BETA))
    for j in d["joints"]:
        if j.get("name") in nombres:
            ax,ay=j["anchor"][0]-C0[0], j["anchor"][1]-C0[1]; t=math.radians(BETA)
            j["anchor"][0]=C0[0]+ax*math.cos(t)-ay*math.sin(t)
            j["anchor"][1]=C0[1]+ax*math.sin(t)+ay*math.cos(t)
    mueve(d,obj,PLACAS,(CX,CY),tambien_sueltas=nombres)
    # 2. EL PUNTAL: 33 cm, y la union de arriba LIBRE.
    st,pin=obj["obj_93"],obj["obj_99"]
    up=qrot(st["quaternion"],[0,1,0])[:2]
    v=(pin["position"][0]-H0[0], pin["position"][1]-H0[1]); L0=math.hypot(*v)
    bb=2*(v[0]*up[0]+v[1]*up[1]); cc=L0*L0-L_NUEVO**2
    D=(-bb-math.sqrt(bb*bb-4*cc))/2
    path=st["params"]["path"]; largo=path[-1][1]-path[0][1]
    for p in path: p[1]*=(largo-D)/largo
    st["position"][0]+=D/2*up[0]; st["position"][1]+=D/2*up[1]
    pin["position"][0]+=D*up[0];  pin["position"][1]+=D*up[1]
    for j in d["joints"]:
        if j.get("name")=="Soldadura del pasador":
            j["anchor"][0]+=D*up[0]; j["anchor"][1]+=D*up[1]
        if j.get("name")=="Bisagra" and {j["bodyAId"],j["bodyBId"]}=={"obj_94","obj_95"}:
            j["soldada"]=False; j["locked"]=False
    return d, D

def theta(S_k):
    ux,uy=S_k[0]-Pb[0], S_k[1]-Pb[1]; r=math.hypot(ux,uy)
    K=(RH*RH+r*r-L_NUEVO**2)/(2*RH)
    if abs(K)>r: return None
    ph=math.atan2(uy,ux); a=math.asin(K/r)
    c=[((math.degrees(x-ph)+180)%360)-180 for x in (a,math.pi-a)]
    v=[x for x in c if -2<=x<=88]
    return max(v) if v else None

def posar(k):
    d,_=base(); obj={o["id"]:o for o in d["objects"]}; S=asientos(d)
    t=theta(S[k])
    if t is None: raise SystemExit(f"el asiento {k+1} no esta al alcance de un puntal de {L_NUEVO}")
    th=math.radians(t); Hn=(Pb[0]+RH*math.sin(th), Pb[1]+RH*math.cos(th))
    gira(d,obj,RESP,Pb,-th)
    tr=(Hn[0]-H0[0], Hn[1]-H0[1])
    for i in PUNT: obj[i]["position"][0]+=tr[0]; obj[i]["position"][1]+=tr[1]
    for j in d["joints"]:
        if j["bodyAId"] in PUNT and j["bodyBId"] in PUNT:
            j["anchor"][0]+=tr[0]; j["anchor"][1]+=tr[1]
    pin=obj["obj_99"]["position"]
    pv=(pin[0]-Hn[0], pin[1]-Hn[1]); sv=(S[k][0]-Hn[0], S[k][1]-Hn[1])
    gira(d,obj,PUNT,Hn,math.atan2(sv[1],sv[0])-math.atan2(pv[1],pv[0]))
    for j in d["joints"]:
        if j.get("name")=="Bisagra" and {j["bodyAId"],j["bodyBId"]}=={"obj_94","obj_95"}:
            j["anchor"][0],j["anchor"][1]=Hn
    return d, t, math.dist(pin[:2], S[k])

if __name__=="__main__":
    d0,D=base()
    print(f"viga: {DIENTES} dientes, girada {BETA} grados y movida ({CX},{CY})")
    print(f"puntal acortado {D:.2f} cm -> {L_NUEVO}; union de arriba libre")
    S=asientos(d0); print("asientos:", [(round(x,2),round(y,2)) for x,y in S])
    manifiesto=[]
    for k in range(DIENTES):
        d,t,err=posar(k)
        p=f"pruebas/datos/banco3-tope-{k+1}.json"
        json.dump(d,open(p,"w"),indent=2,ensure_ascii=False); open(p,"a").write("\n")
        manifiesto.append({"tope":k+1,"grados":round(t,1)})
        print(f"  tope {k+1}: respaldo {t:5.1f} grados, pasador a {err*10:.2f} mm")
    json.dump(manifiesto,open("pruebas/datos/banco3-topes.json","w"),indent=2)
