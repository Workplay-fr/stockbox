# StockBox — site de démonstration (self-stockage)

Centre de self-stockage fictif relié à la localisation Nexudus **StockBox** (1420979504). Hébergé sur Cloudflare Pages, domaine `stockbox.workplay.fr`.

## Ce que fait le site

- **L'immeuble en 3D** (`#immeuble`) : les trois niveaux, en vues isométriques générées par GPT (`public/img/etage-0|1|2.webp`), empilés puis ouverts un par un. Chaque box est une zone cliquable (`public/data/zones.json`) calée sur l'image par une transformation affine calculée à partir des portes (écart moyen de 2 à 4 px).
- **Disponibilités réelles** : `/api/inventaire` lit les 124 unités des trois plans d'étage Nexudus. Un box est libre s'il est disponible et n'a aucun contrat. Relu toutes les 30 s par la page.
- **Réservation** : `/api/reserver` crée dans Nexudus la fiche client (avec compte portail), le contrat de la formule de la taille avec le box attribué, l'assurance en produit mensuel du contrat, les frais de dossier et les accessoires en frais uniques. Le code BIENVENUE (premier mois offert) met le contrat à 0 € le premier mois puis au prix de la formule. **Le paiement est simulé.**
- **Simulateur de volume**, **tailles à l'échelle** et **assistant IA** (`/api/agent`, modèle Claude), qui recommande une taille, cherche un box libre et l'allume dans l'immeuble.
- **Mot de passe** sur tout le site (`functions/_middleware.js`).

## Nexudus comme seule source

| Sur le site | Dans Nexudus |
|---|---|
| Boxes, taille, libre ou occupé | Unités des plans d'étage RDC 1415061712, Étage 1 1415061613, Étage 2 1415061713 |
| Prix et préavis par taille | Formules Casier 1415470778, 2 m² 1415470779, 5 m² 1415470780, 10 m² 1415470877, 20 m² 1415470878 |
| Assurances, accessoires, frais de dossier | Produits 1415527542/543/445, 1415527544/545, 1415527446 |
| Premier mois offert | Code promo BIENVENUE 1415216446 |

Changer un prix dans Nexudus le change sur le site (cache de 20 s côté serveur).

## Fichiers

- `public/` : le site statique (`index.html`, `css/site.css`, `js/app.js`, images, zones).
- `functions/` : fonctions Cloudflare Pages (`_middleware.js`, `api/inventaire.js`, `api/reserver.js`, `api/agent.js`).
- `lib/` : accès Nexudus et assistant, partagés par les fonctions (non publiés).
- `outils/` : génération des plans 2D (`gen_plans.py`) et calage des zones sur les images (`calib.py`, `zones.py`).

## Variables Cloudflare (Settings › Variables and Secrets)

| Variable | Rôle |
|---|---|
| `SITE_PASSWORD` | mot de passe d'accès (secret) |
| `NEXUDUS_USER`, `NEXUDUS_PASSWORD` | utilisateur API Nexudus (secrets) |
| `ANTHROPIC_API_KEY` | clé de l'assistant (secret) |
| `ANTHROPIC_MODEL` | facultatif, `claude-sonnet-5-5` par défaut |

Chaque push sur `main` redéploie le site. Sans identifiants Nexudus, la page s'affiche en aperçu, disponibilités simulées et réservation désactivée.
