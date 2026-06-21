"""
Genera le icone PWA dell'app FantaMotoGP in tutte le dimensioni richieste.
Disegno procedurale (no dipendenza da rasterizzatori SVG esterni non
disponibili in questo ambiente): sfondo asfalto scuro con gradiente verticale
leggero, striscia bandiera rosso/giallo in basso, testo "FM" in stile
"numero di gara", coerente con l'identità visiva stabilita per l'app.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = "/home/claude/fantamotogp/public/icons"
os.makedirs(OUT_DIR, exist_ok=True)

COLORE_SFONDO_ALTO = (26, 29, 33)      # #1a1d21 (asfalto-850)
COLORE_SFONDO_BASSO = (8, 9, 10)        # #08090a (asfalto-950)
COLORE_ROSSO = (225, 6, 0)              # #E10600
COLORE_GIALLO = (255, 212, 0)           # #FFD400
COLORE_TESTO = (255, 255, 255)

FONT_PATH = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"


def disegna_sfondo_gradiente(size):
    """Gradiente verticale leggero, ispirato all'asfalto in penombra."""
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        r = int(COLORE_SFONDO_ALTO[0] * (1 - t) + COLORE_SFONDO_BASSO[0] * t)
        g = int(COLORE_SFONDO_ALTO[1] * (1 - t) + COLORE_SFONDO_BASSO[1] * t)
        b = int(COLORE_SFONDO_ALTO[2] * (1 - t) + COLORE_SFONDO_BASSO[2] * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    return img, draw


def maschera_angoli_arrotondati(size, raggio_frazione=0.22):
    """Maschera per angoli arrotondati coerenti con lo stile iOS-like dell'app."""
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    raggio = int(size * raggio_frazione)
    mdraw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=raggio, fill=255)
    return mask


def genera_icona(size, nome_file, angoli_arrotondati=True, con_bandiera=True, padding_frazione=0.0):
    """
    Genera una singola icona quadrata.
    padding_frazione: spazio vuoto attorno al contenuto (serve per le icone
    'maskable' di Android, che richiedono un'area di sicurezza centrale).
    """
    img, draw = disegna_sfondo_gradiente(size)

    # Testo "FM" sempre centrato nel riquadro intero: è l'elemento
    # protagonista dell'icona, non deve essere spinto fuori centro da altri
    # elementi. La striscia bandiera (se presente) è solo un accento sottile
    # in basso, non influenza il posizionamento del testo.
    area_utile = size * (1 - padding_frazione * 2)
    font_size = int(area_utile * 0.40)
    font = ImageFont.truetype(FONT_PATH, font_size)

    testo = "FGP"
    bbox = draw.textbbox((0, 0), testo, font=font)
    larghezza_testo = bbox[2] - bbox[0]
    altezza_testo = bbox[3] - bbox[1]
    x = (size - larghezza_testo) / 2 - bbox[0]
    y = (size - altezza_testo) / 2 - bbox[1]
    if padding_frazione == 0:
        # piccolo aggiustamento ottico: il testo percepito appare più
        # equilibrato leggermente sopra il centro geometrico esatto
        y -= size * 0.02

    draw.text((x, y), testo, font=font, fill=COLORE_TESTO)

    if con_bandiera:
        altezza_striscia = max(2, int(size * 0.035))
        y_rosso = int(size * (0.92 if not angoli_arrotondati else 0.90))
        draw.rectangle([(0, y_rosso), (size, y_rosso + altezza_striscia)], fill=COLORE_ROSSO)
        draw.rectangle(
            [(0, y_rosso + altezza_striscia), (size, y_rosso + altezza_striscia * 2)],
            fill=COLORE_GIALLO,
        )

    if angoli_arrotondati:
        mask = maschera_angoli_arrotondati(size)
        output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        output.paste(img, (0, 0), mask)
        img = output
    else:
        img = img.convert("RGBA")

    path = os.path.join(OUT_DIR, nome_file)
    img.save(path, "PNG", optimize=True)
    dimensione_kb = os.path.getsize(path) / 1024
    print(f"{nome_file}: {size}x{size}px, {dimensione_kb:.1f} KB")


# --- Icone standard PWA (manifest.json) -------------------------------------
genera_icona(192, "icon-192.png")
genera_icona(512, "icon-512.png")

# --- Icona "maskable" per Android (richiede area di sicurezza centrale 80%) -
genera_icona(512, "icon-maskable-512.png", padding_frazione=0.12, con_bandiera=False)

# --- Apple touch icon (iOS: niente trasparenza, niente angoli arrotondati
#     impostati da noi, iOS li applica automaticamente da solo) -------------
genera_icona(180, "apple-touch-icon.png", angoli_arrotondati=False)

# --- Favicon (per la tab del browser su desktop): a queste dimensioni la
#     striscia bandiera diventerebbe solo rumore illeggibile, meglio il
#     monogramma pulito da solo -----------------------------------------
genera_icona(32, "favicon-32.png", angoli_arrotondati=False, con_bandiera=False)
genera_icona(16, "favicon-16.png", angoli_arrotondati=False, con_bandiera=False)

print("\nTutte le icone generate in", OUT_DIR)
