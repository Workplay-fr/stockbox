# Vidéo « côté exploitant » (StockBox × Nexudus)

Balade de 2 min dans Nexudus, montée à partir de captures d'écran, en Python (Pillow) + ffmpeg.

- `montage.py` : la trame. Liste des scènes (capture, durée, chapitre, sous-titre, effet), effets (zoom avant/arrière, travelling, projecteur, clic, écran partagé site / Nexudus), fondus dans un chapitre, glissement entre chapitres, intro « Qu'est-ce que Nexudus » et fin avec défilé « … et bien plus encore ».
- `charte.py` : l'habillage à la charte du site (typos Bricolage Grotesque / Instrument Sans, couleurs, façade et logo en fond des écrans de début et de fin). Il importe `montage.py` et remplace polices, couleurs et écrans titres.

Chemins attendus (à adapter) : captures 1512×810 dans `/home/claude/video/caps/`, polices variables Google Fonts dans `/home/claude/video/fonts/`, images du site dans `public/img/`.

Rendu : `python3 charte.py sortie.mp4` (30 i/s, 1920×1080), puis musique (`loudnorm=I=-19`), puis version web `-crf 26` (< 25 Mio, limite Cloudflare Pages) dans `public/video/`.
