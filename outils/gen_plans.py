"""Génère les plans 2D StockBox (3 niveaux) : version référence (sans texte) et version annotée.
Repère en mètres : x vers l'est (0..32), y vers le sud (0 = façade arrière, 21 = façade sur rue)."""
import json, cairosvg

W, D = 32.0, 21.0
S = 40                       # px par mètre
OX, OY = 128, 92             # marges -> canevas 1536 x 1024
CW, CH = 1536, 1024

def px(x): return OX + x * S
def py(y): return OY + y * S

# --- squelette commun aux 3 niveaux -------------------------------------
ROWS = {  # (y0, y1, côté porte)
    "A": (0.0, 5.0, "S"),
    "B": (8.0, 10.5, "N"),
    "C": (10.5, 13.0, "S"),
    "D": (16.0, 21.0, "N"),
}
CORRIDORS = [(0, 5, 25, 8), (0, 13, 25, 16), (21, 5, 25, 21)]   # x0,y0,x1,y1
CORE = [("Ascenseur", 25, 0, 28, 4), ("Monte-charge", 28, 0, 32, 4), ("Escalier", 25, 4, 32, 8)]

def split(row, x0, x1, n, size, start, prefix=""):
    y0, y1, side = ROWS[row]
    w = (x1 - x0) / n
    out = []
    for i in range(n):
        out.append({"name": f"{prefix}{start + i:03d}" if not prefix else f"{prefix}{start + i:02d}",
                    "size": size, "x0": round(x0 + i * w, 3), "y0": y0,
                    "x1": round(x0 + (i + 1) * w, 3), "y1": y1, "door": side})
    return out

def east(n, size, start, y0=8.0, y1=21.0):
    h = (y1 - y0) / n
    return [{"name": f"{start + i:03d}", "size": size, "x0": 25.0, "x1": 32.0,
             "y0": round(y0 + i * h, 3), "y1": round(y0 + (i + 1) * h, 3), "door": "W"} for i in range(n)]

FLOORS = {}

# Rez-de-chaussée (26 boxes, identiques à Nexudus)
rdc = []
rdc += split("A", 0, 21, 5, "20", 1)                  # 001-005
rdc.append({"name": "006", "size": "20", "x0": 13, "y0": 16, "x1": 17, "y1": 21, "door": "N"})
rdc += [dict(b) for b in split("D", 17, 21, 2, "10", 7)]   # 007-008
rdc += split("B", 0, 20, 5, "10", 9)                 # 009-013
rdc.append({"name": "014", "size": "10", "x0": 0, "y0": 10.5, "x1": 4, "y1": 13, "door": "S"})
for i in range(12):                                   # casiers C01-C12 (1 m x 1 m)
    rdc.append({"name": f"C{i+1:02d}", "size": "C", "x0": 4 + i, "y0": 12.0, "x1": 5 + i, "y1": 13.0, "door": "S"})
FLOORS["0"] = {"name": "Rez-de-chaussée", "boxes": rdc, "spaces": [
    ("Accueil", 0, 16, 8, 21), ("Entrée", 8, 16, 13, 21),
    ("Chariots", 16, 10.5, 21, 13), ("Quai de chargement", 25, 8, 32, 21)]}

# Étage 1 (44 boxes)
e1 = []
e1 += split("A", 0, 21, 10, "10", 101)    # 101-110
e1 += split("B", 0, 21, 10, "5", 111)     # 111-120
e1 += split("C", 0, 21, 10, "5", 121)     # 121-130
e1 += split("D", 0, 21, 10, "10", 131)    # 131-140
e1 += east(4, "20", 141)                  # 141-144
FLOORS["1"] = {"name": "Étage 1", "boxes": e1, "spaces": []}

# Étage 2 (54 boxes)
e2 = []
e2 += split("A", 0, 21, 10, "10", 201)    # 201-210
e2 += split("B", 0, 21, 10, "5", 211)     # 211-220
e2 += split("C", 0, 21, 20, "2", 221)     # 221-240
e2 += split("D", 0, 21, 10, "10", 241)    # 241-250
e2 += east(4, "20", 251)                  # 251-254
FLOORS["2"] = {"name": "Étage 2", "boxes": e2, "spaces": []}

FILL = {"C": "#F4E3CF", "2": "#E3EEE9", "5": "#CFE3DA", "10": "#B7D3C6", "20": "#9CC1AF"}
INK, EMERALD, TANG = "#1C1C1A", "#0F5C45", "#F28C28"

def door(b):
    """petit trait d'ouverture côté couloir"""
    x0, y0, x1, y1 = px(b["x0"]), py(b["y0"]), px(b["x1"]), py(b["y1"])
    m = 0.18
    if b["door"] == "S":
        return (x0 + (x1 - x0) * m, y1, x1 - (x1 - x0) * m, y1)
    if b["door"] == "N":
        return (x0 + (x1 - x0) * m, y0, x1 - (x1 - x0) * m, y0)
    return (x0, y0 + (y1 - y0) * m, x0, y1 - (y1 - y0) * m)   # W

def render(key, annotated):
    f = FLOORS[key]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}">',
         f'<rect width="{CW}" height="{CH}" fill="#FFFFFF"/>']
    # dalle
    o.append(f'<rect x="{px(0)}" y="{py(0)}" width="{W*S}" height="{D*S}" fill="#F7F6F2"/>')
    # couloirs
    for x0, y0, x1, y1 in CORRIDORS:
        o.append(f'<rect x="{px(x0)}" y="{py(y0)}" width="{(x1-x0)*S}" height="{(y1-y0)*S}" fill="#FCFCFA"/>')
    # espaces de service
    for label, x0, y0, x1, y1 in f["spaces"]:
        col = "#FBE7D3" if label in ("Accueil", "Quai de chargement") else "#F1EFEA"
        o.append(f'<rect x="{px(x0)}" y="{py(y0)}" width="{(x1-x0)*S}" height="{(y1-y0)*S}" fill="{col}" stroke="{INK}" stroke-width="2"/>')
    # noyau
    for label, x0, y0, x1, y1 in CORE:
        o.append(f'<rect x="{px(x0)}" y="{py(y0)}" width="{(x1-x0)*S}" height="{(y1-y0)*S}" fill="#DCE9E3" stroke="{EMERALD}" stroke-width="3"/>')
        if label != "Escalier":
            o.append(f'<line x1="{px(x0)+8}" y1="{py(y0)+8}" x2="{px(x1)-8}" y2="{py(y1)-8}" stroke="{EMERALD}" stroke-width="1.5"/>'
                     f'<line x1="{px(x1)-8}" y1="{py(y0)+8}" x2="{px(x0)+8}" y2="{py(y1)-8}" stroke="{EMERALD}" stroke-width="1.5"/>')
        else:
            for k in range(10):
                xx = px(x0) + 10 + k * ((x1 - x0) * S - 20) / 9
                o.append(f'<line x1="{xx}" y1="{py(y0)+10}" x2="{xx}" y2="{py(y1)-10}" stroke="{EMERALD}" stroke-width="1.2"/>')
    # boxes
    for b in f["boxes"]:
        x0, y0 = px(b["x0"]), py(b["y0"])
        w, h = (b["x1"] - b["x0"]) * S, (b["y1"] - b["y0"]) * S
        fill = FILL[b["size"]] if annotated else "#ECEAE5"
        o.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="2"/>')
        a, bb, c, d = door(b)
        o.append(f'<line x1="{a}" y1="{bb}" x2="{c}" y2="{d}" stroke="{EMERALD}" stroke-width="5"/>')
    # enveloppe + ouvertures en façade
    o.append(f'<rect x="{px(0)}" y="{py(0)}" width="{W*S}" height="{D*S}" fill="none" stroke="{INK}" stroke-width="10"/>')
    if key == "0":
        o.append(f'<line x1="{px(8.6)}" y1="{py(21)}" x2="{px(12.4)}" y2="{py(21)}" stroke="#FFFFFF" stroke-width="12"/>')   # porte vitrée
        o.append(f'<line x1="{px(8.6)}" y1="{py(21)}" x2="{px(12.4)}" y2="{py(21)}" stroke="{EMERALD}" stroke-width="4"/>')
        o.append(f'<line x1="{px(32)}" y1="{py(11)}" x2="{px(32)}" y2="{py(18)}" stroke="#FFFFFF" stroke-width="12"/>')     # porte de quai
        o.append(f'<line x1="{px(32)}" y1="{py(11)}" x2="{px(32)}" y2="{py(18)}" stroke="{TANG}" stroke-width="4"/>')
    if annotated:
        o.append(f'<text x="{px(0)}" y="{OY-40}" font-family="Helvetica, Arial" font-size="30" font-weight="700" fill="{INK}">StockBox — {f["name"]}</text>')
        o.append(f'<text x="{px(32)}" y="{OY-40}" text-anchor="end" font-family="Helvetica, Arial" font-size="18" fill="{INK}">{len(f["boxes"])} boxes · emprise 32 × 21 m · rue en bas</text>')
        for b in f["boxes"]:
            cx, cy = px((b["x0"] + b["x1"]) / 2), py((b["y0"] + b["y1"]) / 2)
            fs = 11 if b["size"] in ("C", "2") else 14
            rot = f' transform="rotate(-90 {cx} {cy})"' if b["size"] in ("2", "C") or (b["x1"]-b["x0"]) < 2.3 and (b["y1"]-b["y0"]) >= 5 else ""
            o.append(f'<text x="{cx}" y="{cy+5}" text-anchor="middle" font-family="Helvetica, Arial" font-size="{fs}" font-weight="700" fill="{INK}"{rot}>{b["name"]}</text>')
        for label, x0, y0, x1, y1 in f["spaces"] + [(l, *r) for l, *r in CORE]:
            cx, cy = px((x0 + x1) / 2), py((y0 + y1) / 2)
            o.append(f'<text x="{cx}" y="{cy+6}" text-anchor="middle" font-family="Helvetica, Arial" font-size="16" fill="{INK}">{label}</text>')
        # légende
        lx, ly = px(0), py(21) + 40
        for i, (k, lab) in enumerate([("C", "Casier"), ("2", "2 m²"), ("5", "5 m²"), ("10", "10 m²"), ("20", "20 m²")]):
            o.append(f'<rect x="{lx + i*150}" y="{ly-16}" width="22" height="22" fill="{FILL[k]}" stroke="{INK}"/>'
                     f'<text x="{lx + i*150 + 30}" y="{ly}" font-family="Helvetica, Arial" font-size="16" fill="{INK}">{lab}</text>')
    o.append("</svg>")
    return "\n".join(o)

for key in FLOORS:
    for ann, suffix in ((False, "reference"), (True, "annote")):
        svg = render(key, ann)
        base = f"plans/etage-{key}-{suffix}"
        open(base + ".svg", "w").write(svg)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=base + ".png")

json.dump({k: {"name": v["name"], "boxes": v["boxes"]} for k, v in FLOORS.items()},
          open("plans/boxes.json", "w"), ensure_ascii=False, indent=1)
for k, v in FLOORS.items():
    from collections import Counter
    print(k, v["name"], len(v["boxes"]), dict(Counter(b["size"] for b in v["boxes"])))
