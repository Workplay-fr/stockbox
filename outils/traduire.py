#!/usr/bin/env python3
"""Fabrique public/en/index.html (version anglaise) à partir de public/index.html.

Lancé par outils/version.sh avant chaque commit : la page anglaise suit donc toujours la française.
Chaque texte français est remplacé par son équivalent anglais ; si un texte change en français
sans être mis à jour ici, le script s'arrête et dit lequel, pour ne jamais publier une page à moitié traduite.
Les textes produits par les scripts (compteurs, fiches, réservation…) sont traduits dans js/, via L(fr, en).
"""
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
fr = (RACINE / "index.html").read_text(encoding="utf-8")

T = [
    # En-tête du document
    ('<html lang="fr">', '<html lang="en">'),
    ("<title>StockBox Saint-Ouen · Self-stockage, box réservable en ligne</title>",
     "<title>StockBox Saint-Ouen · Self storage, book your unit online</title>"),
    ("content=\"Du casier au box de 20 m² à Saint-Ouen : estimez votre volume, choisissez votre box dans l'immeuble et réservez en ligne.\"",
     'content="From a locker to a 20 m² unit in Saint-Ouen, near Paris: estimate your volume, pick your unit in the building and book online."'),
    ('<link rel="icon" href="/favicon.svg">',
     '<link rel="icon" href="/favicon.svg">\n<link rel="alternate" hreflang="fr" href="/"><link rel="alternate" hreflang="en" href="/en/">'),
    # En-tête
    ('<a class="logo" href="/" aria-label="StockBox, accueil">', '<a class="logo" href="/en/" aria-label="StockBox, home">'),
    ('<a class="langue" href="/en/" hreflang="en" lang="en" aria-label="English version">EN</a>',
     '<a class="langue" href="/" hreflang="fr" lang="fr" aria-label="Version française">FR</a>'),
    ('aria-label="Connexion à mon espace client" title="Mon espace client"', 'aria-label="Sign in to my account" title="My account"'),
    # Premier écran
    ('alt="Le centre StockBox de Saint-Ouen au crépuscule, façade de brique et grandes fenêtres vertes éclairées"',
     'alt="The StockBox centre in Saint-Ouen at dusk, brick façade and large lit green windows"'),
    ('<span><i>Le stockage,</i></span><span><i>digital et autonome.</i></span>', '<span><i>Storage,</i></span><span><i>digital and self-service.</i></span>'),
    ('<p class="chapeau">Votre box réservé en deux minutes, accessible 7 j/7 avec votre code.</p>',
     '<p class="chapeau">Book your unit in two minutes, open 7 days a week with your code.</p>'),
    ('<span class="cta-txt"><b>Choisir mon box</b></span>', '<span class="cta-txt"><b>Choose my unit</b></span>'),
    ('<span>Sans engagement</span>', '<span>No commitment</span>'),
    ('<span>Paiement sécurisé</span>', '<span>Secure payment</span>'),
    ('<span>Une question ? <u>Atlas</u></span>', '<span>Any questions? <u>Ask Atlas</u></span>'),
    ('aria-label="Prix par mois"', 'aria-label="Prices per month"'),
    ('aria-label="Avis et réservations"', 'aria-label="Reviews and location"'),
    ('<span class="b-chiffre">4,8</span>', '<span class="b-chiffre">4.8</span>'),
    ('aria-label="4,8 sur 5"', 'aria-label="4.8 out of 5"'),
    ("<small>Note moyenne, avis d'exemple</small>", "<small>Average rating, sample reviews</small>"),
    ('à 5 min du périph</small>', '5 min from the Paris ring road</small>'),
    ('<b data-libres>Boxes libres</b></span></div>', '<b data-libres>Units available</b></span></div>'),
    # Immeuble
    ('<h2 id="titre-imm">Choisissez votre box.</h2>', '<h2 id="titre-imm">Choose your unit.</h2>'),
    ('aria-label="Taille"></div>', 'aria-label="Size"></div>'),
    ('<kbd data-touche>Ctrl</kbd> + molette pour zoomer', '<kbd data-touche>Ctrl</kbd> + scroll to zoom'),
    ('aria-label="Zoomer">+</button><button type="button" data-z="-1" aria-label="Dézoomer">−</button><button type="button" data-z="0" aria-label="Recentrer">',
     'aria-label="Zoom in">+</button><button type="button" data-z="-1" aria-label="Zoom out">−</button><button type="button" data-z="0" aria-label="Reset view">'),
    ('<i class="l-libre"></i>Libre</span><span><i class="l-occ"></i>Loué</span><span><i class="l-choix"></i>Votre choix</span>',
     '<i class="l-libre"></i>Available</span><span><i class="l-occ"></i>Rented</span><span><i class="l-choix"></i>Your choice</span>'),
    # Réservation
    ('aria-label="Réserver votre box"', 'aria-label="Book your unit"'),
    ('aria-label="Votre réservation"', 'aria-label="Your booking"'),
    ('aria-label="Revenir en arrière"', 'aria-label="Go back"'),
    ('<span class="q-duree" id="q-duree">Environ 1 minute</span>', '<span class="q-duree" id="q-duree">About 1 minute</span>'),
    ('<span class="cta-txt">Continuer</span>', '<span class="cta-txt">Continue</span>'),
    ('<span class="q-aide">ou appuyez sur Entrée</span>', '<span class="q-aide">or press Enter</span>'),
    # Tailles
    ('<h2 class="titre" id="titre-tailles">Quelle taille pour vos affaires ?</h2>', '<h2 class="titre" id="titre-tailles">What size for your belongings?</h2>'),
    ("<p class=\"intro\">Chaque box est dessiné à l'échelle, à côté d'une silhouette de 1,75 m.</p>",
     '<p class="intro">Each unit is drawn to scale, next to a 1.75 m silhouette.</p>'),
    ('aria-label="Tailles"', 'aria-label="Sizes"'),
    ('aria-controls="simu">Je ne connais pas ma taille : estimer mon volume</button>', 'aria-controls="simu">Not sure of the size? Estimate my volume</button>'),
    ('aria-label="Taille du logement"', 'aria-label="Size of your home"'),
    ('id="simu-vider">Tout retirer</button>', 'id="simu-vider">Clear all</button>'),
    ('aria-live="polite">Ajoutez vos affaires ou choisissez la taille de votre logement.</p>',
     'aria-live="polite">Add your belongings or pick the size of your home.</p>'),
    ('<b>6 h – 22 h</b></div><h3>Votre code, vos horaires</h3><p>7 jours sur 7. Accueil du lundi au samedi, de 9 h à 19 h.</p>',
     '<b>6 am – 10 pm</b></div><h3>Your code, your hours</h3><p>7 days a week. Reception Monday to Saturday, 9 am to 7 pm.</p>'),
    ('aria-label="Le quai de chargement du rez-de-chaussée, avec chariots et transpalette"></div><h3>Un quai pour décharger</h3><p>Couvert, avec chariots et monte-charge, sans réservation.</p>',
     'aria-label="The ground-floor loading bay, with trolleys and a pallet truck"></div><h3>A bay to unload</h3><p>Covered, with trolleys and a goods lift, no booking needed.</p>'),
    ('<h3>Fermé par votre cadenas</h3><p>Vous seul avez la clé. Vidéosurveillance et alarme la nuit.</p>',
     '<h3>Locked with your padlock</h3><p>Only you have the key. CCTV and a night-time alarm.</p>'),
    ('<b>0 engagement</b></div><h3>Partez quand vous voulez</h3><p>Paiement au mois, préavis de <span data-preavis>15</span> jours.</p>',
     '<b>No commitment</b></div><h3>Leave whenever you like</h3><p>Pay monthly, <span data-preavis>15</span> days\' notice.</p>'),
    # Preuve sociale
    ('<h2 class="titre" id="titre-avis">Ils stockent chez nous.</h2>', '<h2 class="titre" id="titre-avis">They store with us.</h2>'),
    ('Source : Nexudus, mis à jour en direct</p>', 'Source: Nexudus, updated live</p>'),
    ('aria-label="Occupation du bâtiment, étage par étage"', 'aria-label="Building occupancy, floor by floor"'),
    ('aria-label="Dernières réservations"', 'aria-label="Latest bookings"'),
    ('aria-label="5 sur 5"', 'aria-label="5 out of 5"'),
    ('aria-label="4 sur 5"', 'aria-label="4 out of 5"'),
    ("<blockquote>« J'ai vidé mon 2 pièces avant des travaux. Box réservé le dimanche soir, j'y étais le lundi matin avec la camionnette. Le quai était libre. »</blockquote><figcaption><b>Camille</b><span class=\"tags\"><i>Box de 10 m²</i><i>Travaux</i><i>Cliente depuis 8 mois</i></span>",
     "<blockquote>“I cleared out my flat before the renovation. I booked on Sunday evening and was there on Monday morning with the van. The bay was free.”</blockquote><figcaption><b>Camille</b><span class=\"tags\"><i>10 m² unit</i><i>Renovation</i><i>Customer for 8 months</i></span>"),
    ("<blockquote>« Je garde le stock de ma boutique. Le monte-charge est juste en face de mon box : c'est pour ça que j'ai choisi le premier étage. »</blockquote><figcaption><b>Margaux</b><span class=\"tags\"><i>Box de 5 m²</i><i>Pro, stock de boutique</i><i>Cliente depuis 1 an</i></span>",
     "<blockquote>“I keep my shop's stock here. The goods lift is right in front of my unit: that's why I chose the first floor.”</blockquote><figcaption><b>Margaux</b><span class=\"tags\"><i>5 m² unit</i><i>Business, shop stock</i><i>Customer for 1 year</i></span>"),
    ("<blockquote>« On voit ce qui est libre et on choisit son emplacement. Aucun engagement : j'ai rendu mon box au bout de quatre mois. »</blockquote><figcaption><b>Karim</b><span class=\"tags\"><i>Box de 2 m²</i><i>Étudiant</i><i>4 mois, puis parti</i></span>",
     "<blockquote>“You see what's available and choose your spot. No commitment: I gave my unit back after four months.”</blockquote><figcaption><b>Karim</b><span class=\"tags\"><i>2 m² unit</i><i>Student</i><i>4 months, then left</i></span>"),
    ("<p class=\"mention\">Avis d'exemple rédigés pour cette démonstration. Les chiffres et les réservations, eux, viennent de Nexudus en temps réel.</p>",
     '<p class="mention">Sample reviews written for this demo. The figures and bookings, however, come from Nexudus in real time.</p>'),
    ('aria-label="Sécurité"', 'aria-label="Security"'),
    ('<li><b>Code personnel</b>propre à chaque client</li>', '<li><b>Personal code</b>unique to each customer</li>'),
    ('<li><b>Journal des entrées</b>chaque passage horodaté</li>', '<li><b>Entry log</b>every visit time-stamped</li>'),
    ('<li><b>Vidéosurveillance</b>24 h/24, 7 j/7</li>', '<li><b>CCTV</b>24/7</li>'),
    ('<li><b>Assurance</b>au choix, dès la réservation</li>', '<li><b>Insurance</b>your choice, from booking</li>'),
    ('<li><b>Résiliation en ligne</b>préavis de <span data-preavis>15</span> jours</li>', '<li><b>Cancel online</b><span data-preavis>15</span> days\' notice</li>'),
    ('<span class="cta-txt">Choisir mon box</span>', '<span class="cta-txt">Choose my unit</span>'),
    # FAQ
    ('<h2 class="titre" id="titre-faq">Questions fréquentes.</h2>', '<h2 class="titre" id="titre-faq">Frequently asked questions.</h2>'),
    ('<summary>Que puis-je stocker ?</summary><p>Meubles, cartons, électroménager, vélos, archives, stock professionnel. Sont interdits les denrées périssables, les produits dangereux ou inflammables et les animaux.</p>',
     '<summary>What can I store?</summary><p>Furniture, boxes, appliances, bikes, archives, business stock. Perishable food, dangerous or flammable goods and animals are not allowed.</p>'),
    ("<summary>Faut-il une assurance ?</summary><p>Vos biens doivent être assurés. Choisissez l'une de nos formules à la réservation, ou gardez votre assurance habitation si elle couvre le stockage.</p>",
     '<summary>Do I need insurance?</summary><p>Your belongings must be insured. Choose one of our plans when you book, or keep your home insurance if it covers storage.</p>'),
    ("<summary>Quand puis-je entrer ?</summary><p>À la date choisie, dès le lendemain de la réservation. Votre code d'accès arrive par e-mail la veille.</p>",
     '<summary>When can I move in?</summary><p>On the date you choose, from the day after booking. Your access code arrives by email the day before.</p>'),
    ("<summary>Comment résilier ?</summary><p>Depuis votre espace client ou à l'accueil, en prévenant <span data-preavis>15</span> jours avant la fin du mois.</p>",
     '<summary>How do I cancel?</summary><p>From your account or at reception, giving <span data-preavis>15</span> days\' notice before the end of the month.</p>'),
    # Pied de page
    ('<p class="grand">Votre box vous attend.</p>', '<p class="grand">Your unit is waiting.</p>'),
    ("<p class=\"note\">StockBox est un centre de self-stockage imaginaire, créé pour une démonstration. Disponibilités, réservations et contrats sont gérés dans <a href=\"https://nexudus.com\" target=\"_blank\" rel=\"noopener\">Nexudus</a> ; le paiement est simulé. <button class=\"lien-note\" type=\"button\" data-accueil>Comment ça marche</button> · <a href=\"/deconnexion\">Quitter la démo</a></p>",
     '<p class="note">StockBox is an imaginary self-storage centre, built for a demo. Availability, bookings and contracts are managed in <a href="https://nexudus.com" target="_blank" rel="noopener">Nexudus</a>; payment is simulated. <button class="lien-note" type="button" data-accueil>How it works</button> · <a href="/deconnexion">Leave the demo</a></p>'),
    # Barre du bas
    ('<b data-libres>Boxes libres</b> à Saint-Ouen</span>', '<b data-libres>Units available</b> in Saint-Ouen</span>'),
    ("aria-label=\"Demander à Atlas, l'IA de StockBox\"><svg width=\"15\"", 'aria-label="Ask Atlas, the StockBox AI"><svg width="15"'),
    ('id="dock-btn">Choisir mon box</button>', 'id="dock-btn">Choose my unit</button>'),
    # Fenêtre de choix
    ('aria-label="Fermer">×</button></div>', 'aria-label="Close">×</button></div>'),
    ('<h2 id="choix-titre">Où voulez-vous stocker&nbsp;?</h2>', '<h2 id="choix-titre">Where do you want to store?</h2>'),
    ('<p class="sous">Choisissez votre centre StockBox.</p>', '<p class="sous">Choose your StockBox centre.</p>'),
    ('id="trajet-ouvrir" aria-expanded="false">Combien de temps depuis chez moi ou mon bureau ?</button>',
     'id="trajet-ouvrir" aria-expanded="false">How long from my home or office?</button>'),
    ('placeholder="Votre adresse, domicile ou bureau" aria-label="Votre adresse, domicile ou bureau"><button class="btn btn-em" type="submit">Calculer</button>',
     'placeholder="Your address, home or office" aria-label="Your address, home or office"><button class="btn btn-em" type="submit">Calculate</button>'),
    ('<h2>Quelle taille&nbsp;?</h2>', '<h2>What size?</h2>'),
    ('id="sous-taille">StockBox Saint-Ouen. Prix par mois, sans engagement.</p>', 'id="sous-taille">StockBox Saint-Ouen. Prices per month, no commitment.</p>'),
    ("<p>Je ne sais pas, j'ai…</p>", "<p>Not sure, I have…</p>"),
    ('id="retour-centre">Changer de centre</button>', 'id="retour-centre">Change centre</button>'),
    # Atlas
    ("aria-label=\"Demander à Atlas, l'IA de StockBox\"><span class=\"atlas-ic\">", 'aria-label="Ask Atlas, the StockBox AI"><span class="atlas-ic">'),
    ('<b>Demander à Atlas</b><small>IA StockBox, réponse en quelques secondes</small>', '<b>Ask Atlas</b><small>StockBox AI, answers in seconds</small>'),
    ('<b>Atlas</b>Dites-moi ce que vous stockez : je calcule le volume, je trouve un box libre et je vous prépare un devis.</button>',
     '<b>Atlas</b>Tell me what you\'re storing: I\'ll work out the volume, find an available unit and prepare a quote.</button>'),
    ("aria-label=\"Atlas, l'IA de StockBox\" aria-hidden=\"true\">", 'aria-label="Atlas, the StockBox AI" aria-hidden="true">'),
    ('IA StockBox, propulsée par Claude</small>', 'StockBox AI, powered by Claude</small>'),
    ("aria-label=\"Fermer l'assistant\">", 'aria-label="Close the assistant">'),
    ('<button type="button">Je déménage un 2 pièces</button><button type="button">Je veux un devis pour mon entreprise</button><button type="button">Que peut-on stocker ?</button><button type="button">Puis-je venir le dimanche ?</button>',
     '<button type="button">I\'m moving out of a one-bedroom flat</button><button type="button">I want a quote for my business</button><button type="button">What can I store?</button><button type="button">Can I come on Sundays?</button>'),
    ('placeholder="Demandez à Atlas…" aria-label="Votre question" maxlength="600"><button class="btn btn-em" type="submit">Envoyer</button>',
     'placeholder="Ask Atlas…" aria-label="Your question" maxlength="600"><button class="btn btn-em" type="submit">Send</button>'),
    # Vidéo « côté exploitant » (la vidéo elle-même est en français)
    ("<span>Côté exploitant : <u>la gestion dans Nexudus</u> (2 min)</span>",
     "<span>Operator side: <u>how it runs in Nexudus</u> (2 min, in French)</span>"),
    ('aria-label="Vidéo : la gestion du centre dans Nexudus"', 'aria-label="Video: how the centre runs in Nexudus"'),
    ('aria-label="Fermer la vidéo"', 'aria-label="Close the video"'),
]

en = fr
manquants = []
for a, b in T:
    if a not in en:
        manquants.append(a[:90])
        continue
    en = en.replace(a, b)
if manquants:
    print("Textes introuvables dans la page française (à mettre à jour dans outils/traduire.py) :", *manquants, sep="\n  ")
    sys.exit(1)

(RACINE / "en").mkdir(exist_ok=True)
(RACINE / "en" / "index.html").write_text(en, encoding="utf-8")
print("public/en/index.html à jour")
