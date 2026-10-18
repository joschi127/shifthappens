"""Erzeugt Variante 2 (ohne Namensspalte) aus Variante 1: sauberes Bild + synthetisches Foto.

Aufruf (benötigt Pillow und NumPy):
    python3 docs/beispiele/dienstplaene/erzeugung/variante-2.py docs/beispiele/dienstplaene

Die Namensspalte wird pixelgenau aus der Tabelle entfernt; Titel, Legende und Schrift bleiben
unverändert. Das Foto entsteht synthetisch (Perspektive, Hintergrund, Ausleuchtung, Rauschen,
Unschärfe) mit festem Zufalls-Seed, damit das Ergebnis reproduzierbar ist.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src_dir = sys.argv[1]
clean = Image.open(f"{src_dir}/variante-1-sauber.png").convert("RGB")
a = np.array(clean)
h, w, _ = a.shape

# Tabellenbereich (aus Linienerkennung): y 142..705, Namensspalte x 55..318, Kz.-Spalte ab x 319
Y0, Y1 = 136, 708
NAME_X0, KZ_X = 54, 319
table = a[Y0:Y1]
shifted = np.concatenate([table[:, :NAME_X0], table[:, KZ_X:]], axis=1)
pad = np.full((Y1 - Y0, w - shifted.shape[1], 3), 255, dtype=np.uint8)
a2 = a.copy()
a2[Y0:Y1] = np.concatenate([shifted, pad], axis=1)
clean2 = Image.fromarray(a2)
clean2.save(f"{src_dir}/variante-2-sauber.png", optimize=True)

# --- Synthetisches Foto ---
rng = np.random.default_rng(42)
W, H = 2000, 986

# Papier: Seite mit Rand, leicht warmer Ton
margin = 40
paper = Image.new("RGB", (w + 2 * margin, h + 2 * margin), (250, 247, 236))
paper.paste(clean2, (margin, margin))
paper_arr = np.array(paper).astype(np.float32)
paper_arr *= np.array([0.98, 0.96, 0.90])
paper = Image.fromarray(np.clip(paper_arr, 0, 255).astype(np.uint8))
pw, ph = paper.size

# Zielviereck der Seite im Foto (oben links, oben rechts, unten rechts, unten links)
dst = [(150, 190), (1850, 120), (1880, 880), (95, 845)]
src = [(0, 0), (pw, 0), (pw, ph), (0, ph)]

def perspective_coeffs(dst_pts, src_pts):
    # Koeffizienten für PIL: bilden Ausgabe- (dst) auf Eingabekoordinaten (src) ab
    m = []
    for (x, y), (u, v) in zip(dst_pts, src_pts):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    b = np.array(src_pts).reshape(8)
    return np.linalg.solve(np.array(m, dtype=np.float64), b).tolist()

warped = paper.transform((W, H), Image.PERSPECTIVE, perspective_coeffs(dst, src), Image.BICUBIC, fillcolor=(0, 0, 0))
mask = Image.new("L", paper.size, 255).transform((W, H), Image.PERSPECTIVE, perspective_coeffs(dst, src), Image.BICUBIC, fillcolor=0)

# Hintergrund: brauner Tisch mit Verlauf und Rauschen
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
bg = np.zeros((H, W, 3), np.float32)
base = np.array([118, 96, 72], np.float32)
bg[:] = base * (0.75 + 0.35 * (xx / W))[..., None]
bg += rng.normal(0, 4, bg.shape)
photo = np.array(warped).astype(np.float32)
m = (np.array(mask).astype(np.float32) / 255.0)[..., None]
img = photo * m + bg * (1 - m)

# Ausleuchtung: Licht von oben rechts, Abfall nach links unten, leichte Vignette
light = 0.72 + 0.38 * (xx / W) - 0.12 * (yy / H)
cx, cy = W * 0.62, H * 0.35
vignette = 1 - 0.28 * (((xx - cx) / W) ** 2 + ((yy - cy) / H) ** 2) * 2.2
img *= (light * vignette)[..., None]
# Leichter Grauschleier (Kamera-Kontrast)
img = img * 0.92 + 12
img += rng.normal(0, 3.5, img.shape)

out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.3))
out.save(f"{src_dir}/variante-2-foto.jpg", quality=84)
print("ok")
