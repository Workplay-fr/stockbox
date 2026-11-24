#!/usr/bin/env python3
"""Habillage à la charte du site StockBox, appliqué au montage (montage.py).
Typos : Bricolage Grotesque (titres) et Instrument Sans (texte). Couleurs : émeraude, abysse, tangerine, béton.
Écrans d'ouverture et de fin sur la façade du centre, logo StockBox et badge « Powered by Nexudus » comme sur le site.
Usage : charte.py [--preview t1,t2,...] | charte.py sortie.mp4"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import montage as M

FD = "/home/claude/video/fonts/"
IMG = "/home/claude/stockbox/public/img/"

def brico(size, wght, opsz=96):
    f = ImageFont.truetype(FD + "BricolageGrotesque.ttf", size)
    f.set_variation_by_axes([opsz, wght, 100]); return f

def instr(size, wght):
    f = ImageFont.truetype(FD + "InstrumentSans.ttf", size)
    f.set_variation_by_axes([100, wght]); return f

# Couleurs du site (public/css/site.css)
EM, EM_NUIT, EM_ABYSSE, EM_CLAIR = (15, 92, 69), (10, 59, 46), (7, 42, 33), (220, 235, 228)
TG, TG_CLAIR, TG_FONCE = (242, 140, 40), (255, 176, 97), (184, 95, 18)
BETON, ENCRE, GRIS = (231, 232, 227), (19, 36, 30), (93, 107, 101)
W, H = M.W, M.H

M.BG, M.INK, M.EMERALD, M.TANGERINE = BETON, ENCRE, EM, TG
M.F_CAP = brico(37, 600, 32)
M.F_TAG = instr(19, 600)
M.F_LAB = brico(30, 700, 48)
M.F_ITEM = brico(52, 600, 72)
M.F_PLUS = brico(50, 500, 72)
M.F_PLUS_T = instr(38, 500)
M.F_SMALL = instr(24, 500)
F_HERO = brico(100, 700)
F_HERO2 = brico(86, 700)
F_SOUS = instr(36, 400)
M.BG_IMG = M.shadow_bg([(M.CARD_X, M.CARD_Y, M.CARD_W, M.CARD_H)])
M.BG_SPLIT = M.shadow_bg([(M.SPLIT_XA, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H), (M.SPLIT_XB, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H)])
M.BG_SPLIT_A = M.shadow_bg([(M.SPLIT_XA, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H)])

ease, ease_out, mix = M.ease, M.ease_out, M.mix

# Logo StockBox (cube orange + mot), en blanc sur fond sombre, en couleur sur le béton
def logo(name, h):
    im = Image.open(IMG + name).convert("RGBA")
    return im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
LOGO_BLANC = logo("logo-portail-blanc.png", 52)
LOGO_PETIT = logo("logo-portail.png", 30)

# Façade du centre, cadrée en 16/9 un peu plus grande pour un lent mouvement
FAC = Image.open(IMG + "facade.webp").convert("RGB")
s = 1.12 * W / FAC.width
FAC = FAC.resize((int(FAC.width * s), int(FAC.height * s)), Image.LANCZOS)
VOILE = Image.new("L", (W, H))
dv = ImageDraw.Draw(VOILE)
for y in range(H):  # voile abysse, plus dense en bas et au centre du texte
    dv.line((0, y, W, y), fill=int(175 + 50 * abs(y - H * 0.48) / (H * 0.52)))

def facade_bg(t, dur):
    k = ease(t / max(dur, 0.1))
    z = 1.0 + 0.05 * k
    x0 = (FAC.width - W / z) / 2 + 20 * k
    y0 = (FAC.height - H / z) * 0.35
    im = FAC.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + W / z, y0 + H / z))
    im.paste(Image.new("RGB", (W, H), EM_ABYSSE), (0, 0), VOILE)
    return im

def entete(im, a):
    """Logo et badge « Powered by Nexudus », comme l'en-tête du site."""
    if a <= 0: return
    lg = LOGO_BLANC.copy()
    if a < 1: lg.putalpha(lg.split()[3].point(lambda v: int(v * a)))
    im.paste(lg, (150, 84), lg)
    d = ImageDraw.Draw(im)
    f = instr(16, 600)
    txt = "POWERED BY  NEXUDUS"
    tw = d.textlength(txt, font=f)
    col = mix(EM_ABYSSE, (235, 240, 237), a)
    d.rectangle((150, 150, 150 + tw + 28, 182), outline=col, width=1)
    d.text((164, 157), txt, font=f, fill=col)

def tc(d, y, txt, f, fill, cx=W / 2):
    M.text_center(d, y, txt, f, fill, cx)

def intro_frame(fx, t):
    dur = 4.5 if fx == "intro1" else 6.5
    im = facade_bg(t + (0 if fx == "intro1" else 4.5), 11.0)
    d = ImageDraw.Draw(im)
    a = [ease_out((t - s) / 0.7) for s in (0.1, 0.5, 0.9)]
    entete(im, 1.0 if fx == "intro2" else ease_out(t / 0.6))
    blanc = (255, 255, 255)
    if fx == "intro1":
        tc(d, 360 + 24 * (1 - a[0]), "Nexudus, le logiciel de gestion", F_HERO2, mix(EM_ABYSSE, blanc, a[0]))
        tc(d, 465 + 24 * (1 - a[0]), "des espaces que l'on loue.", F_HERO2, mix(EM_ABYSSE, blanc, a[0]))
        tc(d, 620 + 20 * (1 - a[1]), "Coworkings, bureaux, self-stockage : plus de 4 000 espaces dans 90 pays.", F_SOUS, mix(EM_ABYSSE, (225, 232, 228), a[1]))
    else:
        tc(d, 250 + 20 * (1 - a[0]), "Pour un centre de self-stockage, il gère :", F_SOUS, mix(EM_ABYSSE, (225, 232, 228), a[0]))
        bw = max(d.textlength(it, font=M.F_ITEM) for it in M.ITEMS) + 52
        for n, txt in enumerate(M.ITEMS):
            ai = ease_out((t - 0.6 - n * 0.55) / 0.6)
            if ai <= 0: continue
            y = 345 + n * 92
            x = int((W - bw) / 2) - int(30 * (1 - ai))
            d.rounded_rectangle((x, y + 18, x + 20, y + 38), 5, fill=mix(EM_ABYSSE, TG, ai))  # petit cube orange du logo
            d.text((x + 52, y), txt, font=M.F_ITEM, fill=mix(EM_ABYSSE, blanc, ai))
        af = ease_out((t - 3.4) / 0.8)
        tc(d, 772 + 16 * (1 - af), "Voici une journée au centre StockBox.", brico(40, 600, 40), mix(EM_ABYSSE, TG_CLAIR, af))
    return im

def fin_frame(t, dur):
    im = facade_bg(t, dur)
    d = ImageDraw.Draw(im)
    blanc = (255, 255, 255)
    a1 = ease_out((t - 0.1) / 0.7)
    up = ease((t - 2.4) / 0.8)
    entete(im, ease_out(t / 0.6) * (1 - up))  # l'en-tête s'efface quand le titre remonte
    ty = 450 - 270 * up
    tc(d, ty + 20 * (1 - a1), "Réservations, contrats, CRM, facturation.", F_HERO2, mix(EM_ABYSSE, blanc, a1))
    a2 = ease_out((t - 2.9) / 0.6)
    if a2 > 0:
        tc(d, 298 + 14 * (1 - a2), "… et bien plus encore.", brico(42, 600, 42), mix(EM_ABYSSE, TG_CLAIR, a2))
    t0, top, bot = 3.4, 370, 860
    if t > t0:
        cy = (top + bot) / 2
        off = (t - t0) * 72.0
        fade_in = ease_out((t - t0) / 0.6)
        fade_out = 1 - ease((t - (dur - 0.9)) / 0.8)
        for n, txt in enumerate(M.PLUS):
            y = bot + 20 + n * 76 - off
            if y < top - 40 or y > bot + 40: continue
            dist = abs(y + 25 - cy) / ((bot - top) / 2)
            al = max(0.0, 1 - dist ** 1.6) * fade_in * fade_out
            col = mix(EM_ABYSSE, blanc, al * (0.55 + 0.45 * max(0, 1 - dist * 2.2)))
            tc(d, y, txt, M.F_PLUS, col)
    a3 = ease_out((t - (dur - 1.8)) / 0.8)
    if a3 > 0:
        tc(d, 950, "StockBox est un centre fictif. Les écrans Nexudus sont réels.", M.F_SMALL, mix(EM_ABYSSE, (180, 205, 194), a3))
    return im

def caption(im, sc, t, y_base):
    """Badge de chapitre (comme « Notre suggestion » sur le site) et sous-titre en Bricolage."""
    a = ease_out((t - 0.15) / 0.5)
    layer = Image.new("RGBA", (W, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tag = sc["tag"].upper()
    tw = d.textlength(tag, font=M.F_TAG)
    x0 = (W - tw) / 2 - 16
    d.rounded_rectangle((x0, 0, x0 + tw + 32, 30), 15, fill=(253, 231, 207, 255))
    d.text((x0 + 16, 4), tag, font=M.F_TAG, fill=TG_FONCE + (255,))
    M.text_center(d, 40, sc["cap"], M.F_CAP, ENCRE + (255,))
    if a < 1:
        layer.putalpha(layer.split()[3].point(lambda v: int(v * a)))
    im.paste(layer, (0, y_base - 4 + int(18 * (1 - a))), layer)

_orig_scene = M.scene_frame
def scene_frame(sc, t):
    im = _orig_scene(sc, t)
    return im

M.intro_frame, M.fin_frame, M.caption, M.scene_frame = intro_frame, fin_frame, caption, scene_frame

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        for s_ in sys.argv[2].split(","):
            M.frame_at(float(s_)).save(f"/home/claude/video/preview_{float(s_):06.2f}.jpg", quality=90)
        print("total", M.TOTAL); sys.exit()
    out = sys.argv[1]
    tmp = out[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(M.FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    for f in range(int(round(M.TOTAL * M.FPS))):
        p.stdin.write(M.frame_at(f / M.FPS).tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out); print("ok", out, M.TOTAL)
