"""Erzeugt Variante 5 aus Variante 3: sauberes Bild und synthetisches Foto mit den Eigenheiten eines echten Dienstplans.

Aufruf (benötigt Pillow und NumPy):
    python3 docs/beispiele/dienstplaene/erzeugung/variante-5.py docs/beispiele/dienstplaene

Nachgebildet werden die Merkmale, an denen die Erkennung beim echten Foto zunächst gescheitert ist:
- Unterzeilen unterschiedlich hoch (Dienstzeile höher als die übrigen)
- Schrift in der Dienstzeile reicht bis an die rechte Gitterlinie
- Farbfläche nur teilweise in der Zelle, Schrift dunkel (M01)
- leere Zelle statt „-“ (Kessler, 17.) und weitere Bereitschaftskürzel (Kessler, 28./29.: RB, RB2)
- Foto: gewölbtes Papier, Perspektive, ungleichmäßiges Licht, Klebestreifen, zweites Blatt, Unschärfe, um 90° gedreht

Die erwarteten Werte (variante-5.erwartet.json) werden ebenfalls geschrieben. Fester Zufalls-Seed, reproduzierbar.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

src_dir = sys.argv[1]
rng = np.random.default_rng(5)
base = np.array(Image.open(f"{src_dir}/variante-3-sauber.png").convert("RGB")).copy()
H0, W0, _ = base.shape

# Raster von Variante 3 (aus der Linienerkennung): Tage x 325..2244 in 64er-Schritten, Daten y 307..1496 in 34er-Schritten
X0, CW, DAYS = 325, 64, 30
Y0, RH, SUB, PERSONS = 307, 34, 5, 7
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

roster = json.load(open(f"{src_dir}/variante-3.erwartet.json"))
person_index = {z["name"]: i for i, z in enumerate(roster["zeilen"])}

def cell_box(person, sub, day):
    x = X0 + (day - 1) * CW
    y = Y0 + (person * SUB + sub) * RH
    return x, y, x + CW, y + RH

# --- 1. Inhalte ändern (vor der Geometrie, damit Koordinaten von Variante 3 gelten) ---
draw = ImageDraw.Draw(Image.fromarray(base))
img = Image.fromarray(base)
draw = ImageDraw.Draw(img)
kessler = person_index["Kessler, Mira"]
# leere Zelle statt "-" (wie Feiertag im echten Plan)
x0, y0, x1, y1 = cell_box(kessler, 0, 17)
draw.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=(255, 255, 255))
# zusätzliche Bereitschaftskürzel
font_b = ImageFont.truetype(FONT, 22)
for day, text in ((28, "RB"), (29, "RB2")):
    x0, y0, x1, y1 = cell_box(kessler, 2, day)
    bg = tuple(int(v) for v in base[y0 + 4, x0 + 4])  # Wochenende grün hinterlegt
    draw.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=bg)
    draw.text((x0 + 8, y0 + 5), text, fill=(20, 20, 20), font=font_b)
base = np.array(img)

# Farbfläche nur oben, Schrift dunkel: alle M01-Zellen
for p, row in enumerate(roster["zeilen"]):
    for d, code in enumerate(row["codes"], start=1):
        if code != "M01":
            continue
        x0, y0, x1, y1 = cell_box(p, 0, d)
        cell = base[y0 + 2:y1 - 1, x0 + 2:x1 - 1].astype(np.float32)
        lum = cell.mean(axis=2)
        fill = np.median(cell.reshape(-1, 3), axis=0)           # Flächenfarbe (Mehrheit)
        fill_lum = fill.mean()
        alpha = np.clip((lum - fill_lum) / (255 - fill_lum), 0, 1)[..., None]  # Anteil weiße Schrift, weich
        fill_rows = int(cell.shape[0] * 0.62)                    # Fläche nur in den oberen ~60 %
        bgc = np.empty_like(cell); bgc[:] = (255, 255, 255); bgc[:fill_rows] = fill
        out = bgc * (1 - alpha) + np.array([25, 25, 25], np.float32) * alpha  # Schrift dunkel
        base[y0 + 2:y1 - 1, x0 + 2:x1 - 1] = out.astype(np.uint8)

# Schrift der Dienstzeile reicht bis an die rechte Linie: Zellinhalt links verankert in die Breite ziehen
for p in range(PERSONS):
    for d in range(1, DAYS + 1):
        x0, y0, x1, y1 = cell_box(p, 0, d)
        inner = Image.fromarray(base[y0 + 2:y1 - 1, x0 + 2:x1 - 1])
        w, h = inner.size
        stretched = inner.resize((int(w * 1.32), h), Image.LANCZOS)
        # Text beginnt im Original ~10 px nach links eingerückt; nach dem Strecken bis zur rechten Linie
        shift = int(w * 0.12)
        crop = stretched.crop((shift, 0, shift + w, h))
        base[y0 + 2:y1 - 1, x0 + 2:x1 - 1] = np.array(crop)

# --- 2. Unterzeilen unterschiedlich hoch (Blockhöhe bleibt 170 px) ---
heights = [38, 32, 32, 33, 35]  # Dienstzeile höher, wie im echten Plan (Verhältnis etwa 1,15)
assert sum(heights) == SUB * RH
rows_out = [base[:Y0]]
for p in range(PERSONS):
    for s in range(SUB):
        y = Y0 + (p * SUB + s) * RH
        strip = Image.fromarray(base[y:y + RH])
        rows_out.append(np.array(strip.resize((W0, heights[s]), Image.LANCZOS)))
rows_out.append(base[Y0 + PERSONS * SUB * RH:])
clean = np.concatenate(rows_out, axis=0)
assert clean.shape == base.shape
Image.fromarray(clean).save(f"{src_dir}/variante-5-sauber.png", optimize=True)

# --- 3. Synthetisches Foto ---
page = clean.astype(np.float32) * np.array([0.985, 0.97, 0.93], np.float32)  # leicht warmes Papier
PW, PH = W0, H0
OW, OH = 1869, 1125  # aufrechtes Foto (Querformat), wird am Ende um 90° gedreht gespeichert

# Homographie Seite -> Foto
dst = np.array([(118, 112), (1772, 92), (1796, 1012), (92, 1040)], np.float64)
srcp = np.array([(0, 0), (PW, 0), (PW, PH), (0, PH)], np.float64)
def homography(a, b):
    A, rhs = [], []
    for (x, y), (u, v) in zip(a, b):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.append(v)
    h = np.linalg.solve(np.array(A), np.array(rhs))
    return np.append(h, 1).reshape(3, 3)
Hpf = homography(srcp, dst)          # Seite -> Foto
Hfp = np.linalg.inv(Hpf)             # Foto -> Seite

# Wölbung in Seitenkoordinaten (Verschiebung in px der Seite)
def curl(x, y):
    dy = 14 * np.sin(np.pi * x / PW) * (0.6 + 0.4 * y / PH) + 5 * np.sin(2 * np.pi * x / PW)
    dx = 8 * np.sin(np.pi * y / PH) * (x / PW - 0.5)
    return dx, dy

vv, uu = np.mgrid[0:OH, 0:OW].astype(np.float64)
den = Hfp[2, 0] * uu + Hfp[2, 1] * vv + Hfp[2, 2]
qx = (Hfp[0, 0] * uu + Hfp[0, 1] * vv + Hfp[0, 2]) / den
qy = (Hfp[1, 0] * uu + Hfp[1, 1] * vv + Hfp[1, 2]) / den
px, py = qx.copy(), qy.copy()
for _ in range(4):  # Umkehrung der Wölbung per Fixpunkt-Iteration
    dx, dy = curl(px, py)
    px, py = qx - dx, qy - dy

def sample(img, x, y):
    h, w = img.shape[:2]
    inside = (x >= 0) & (y >= 0) & (x < w - 1) & (y < h - 1)
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    out = img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
    return out, inside

photo, inside = sample(page, px, py)

# Hintergrund: Holz/Orange mit Maserung, darunter ein zweites Blatt am unteren Rand
bg = np.zeros((OH, OW, 3), np.float32)
bg[:] = (198, 132, 66)
bg *= (0.9 + 0.1 * np.sin(uu / 9.0 + np.sin(vv / 40.0) * 2))[..., None]
sheet = (vv > 1040) & (uu > 60) & (uu < 1830)
bg[sheet] = (232, 230, 222)
img = np.where(inside[..., None], photo, bg)

# Klebestreifen oben in der Mitte (leicht aufgehellt, etwas glänzend)
tape = (np.abs(uu - 930) < 55) & (vv > 70) & (vv < 175)
img[tape] = img[tape] * 0.92 + 30

# Licht: Verlauf von oben links, Vignette, leichter Schatten rechts unten
light = 1.05 - 0.22 * (uu / OW) * (vv / OH) - 0.08 * (vv / OH)
cx, cy = OW * 0.45, OH * 0.4
light *= 1 - 0.18 * (((uu - cx) / OW) ** 2 + ((vv - cy) / OH) ** 2) * 2
img *= light[..., None]
img += rng.normal(0, 3.0, img.shape)

out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
out = out.rotate(90, expand=True)  # Hochformat-Aufnahme eines Querformat-Plans (wie Variante 3 und das echte Foto)
out.save(f"{src_dir}/variante-5-foto.jpg", quality=84)

# Ecken des Tagesrasters im aufrecht gedrehten Foto: Rasterecken durch Wölbung und Homographie abbilden
def to_photo(x, y):
    dx, dy = curl(np.array(x, float), np.array(y, float))
    v = Hpf @ np.array([x + dx, y + dy, 1.0])
    return [round(float(v[0] / v[2]), 1), round(float(v[1] / v[2]), 1)]
grid = [(X0, Y0), (X0 + DAYS * CW, Y0), (X0 + DAYS * CW, Y0 + PERSONS * SUB * RH), (X0, Y0 + PERSONS * SUB * RH)]
photo_corners = [to_photo(x, y) for x, y in grid]

# --- 4. Erwartete Werte ---
expected = {
    "beschreibung": "Variante 5: aus Variante 3 per Skript abgeleitet (erzeugung/variante-5.py), bildet die Eigenheiten eines echten Dienstplan-Fotos nach. Werte wie Variante 3 mit den unten genannten Änderungen.",
    "basis": "variante-3",
    "dateien": ["variante-5-sauber.png", "variante-5-foto.jpg"],
    "auswertung": {
        "variante-5-sauber.png": {"ecken": [list(p) for p in grid]},
        "variante-5-foto.jpg": {"ecken": photo_corners, "drehung": 90},
    },
    "aenderungen": [
        {"name": "Kessler, Mira", "tag": 17, "zeile": "D", "vorher": "-", "nachher": "", "hinweis": "leere Zelle statt Strich"},
        {"name": "Kessler, Mira", "tag": 28, "zeile": "B", "vorher": "", "nachher": "RB"},
        {"name": "Kessler, Mira", "tag": 29, "zeile": "B", "vorher": "", "nachher": "RB2"},
    ],
}
# Vollständige Zeilen mit angewendeten Änderungen (die Tests lesen "zeilen")
rows = json.loads(json.dumps(roster["zeilen"]))
field = {"D": "codes", "S": "sonder", "B": "bereitschaft"}
for change in expected["aenderungen"]:
    row = rows[person_index[change["name"]]]
    assert row[field[change["zeile"]]][change["tag"] - 1] == change["vorher"], change
    row[field[change["zeile"]]][change["tag"] - 1] = change["nachher"]
expected["zeilen"] = rows
import re
text = json.dumps(expected, ensure_ascii=False, indent=2)
text = re.sub(r'\[\n\s+("[^"\n]*",?\n\s+)+"[^"\n]*"\n\s+\]', lambda m: "[" + ", ".join(re.findall(r'"[^"\n]*"', m.group(0))) + "]", text)
text = re.sub(r'\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]', r'[\1, \2]', text)
open(f"{src_dir}/variante-5.erwartet.json", "w").write(text + "\n")
print("ok", photo_corners)
