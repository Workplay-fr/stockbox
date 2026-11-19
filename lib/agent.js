// Assistant StockBox : aide à choisir la bonne taille, montre un box libre dans l'immeuble 3D et lance la réservation.
// Il ne s'appuie que sur Nexudus (catalogue relu toutes les 20 s) : aucun prix, aucune remise, aucun box inventé.
import { catalogue, ETAGES } from "./nexudus.js";

const MODELE = env => env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const NOM_TAILLE = { C: "Casier", 2: "2 m²", 5: "5 m²", 10: "10 m²", 20: "20 m²" };

function donnees(c) {
  const parTaille = {};
  for (const [n, l] of Object.entries(c.etages)) for (const b of l) {
    const t = (parTaille[b.taille] ||= { taille: NOM_TAILLE[b.taille] || b.taille, prix_mensuel: c.formules[b.taille]?.prix, volume_m3: c.formules[b.taille]?.volume, libres: 0, total: 0, etages: {} });
    t.total++; if (b.libre) { t.libres++; t.etages[ETAGES[n].nom] = (t.etages[ETAGES[n].nom] || 0) + 1; }
  }
  return {
    lieu: "StockBox, self-stockage en ville (lieu de démonstration). Accès 7j/7 de 6 h à 22 h avec code personnel, accueil du lundi au samedi de 9 h à 19 h, vidéosurveillance, chariots et quai de chargement au rez-de-chaussée, monte-charge.",
    conditions: "Location au mois, sans engagement, préavis de 15 jours. Frais de dossier facturés une fois. Le code BIENVENUE offre le premier mois.",
    tailles: Object.values(parTaille),
    assurances: c.produits.assurances.map(a => ({ nom: a.nom, prix_mensuel: a.prix })),
    accessoires: c.produits.accessoires.map(a => ({ nom: a.nom, prix: a.prix })),
    frais_de_dossier: c.produits.fraisDossier.prix,
  };
}

const consignes = (d) => `Tu es l'assistant de StockBox, un centre de self-stockage. Tu réponds sur le site à des particuliers (déménagement, travaux, succession, étudiants) et à des pros (stock, archives, matériel).

Français, vouvoiement. Ton simple, chaleureux, concret, jamais commercial. 2 à 4 phrases, pas de titres, pas d'emoji. **Gras** avec parcimonie.

Règles :
- Tu n'affirmes que ce qui figure dans les DONNÉES ou dans les résultats d'outils. Information absente : dis-le et propose d'appeler l'accueil.
- Prix en euros par mois. Aucune remise en dehors du code BIENVENUE. Ne demande jamais de moyen de paiement ni de coordonnées : la réservation se fait dans le formulaire du site.

Choisir la taille : demande ce que la personne veut stocker (ou la taille du logement). Repères : un carton ≈ 0,08 m³, un canapé 3 places ≈ 2 m³, un lit double ≈ 2 m³, une armoire ≈ 1,5 m³, un réfrigérateur ≈ 0,8 m³ ; un studio ≈ 10 m³, un 2 pièces ≈ 20 m³, un 3 pièces ≈ 35 m³. Ajoute 15 % de marge et recommande la plus petite taille dont le volume suffit. Puis appelle chercher_box pour trouver un box libre de cette taille et montre-le avec montrer_box : le site l'allume dans l'immeuble en 3D. Pour réserver, appelle montrer_box avec reserver = true.

DONNÉES (lues dans Nexudus à l'instant) :
${JSON.stringify(d)}`;

const OUTILS = [
  { name: "chercher_box", description: "Liste les boxes libres d'une taille (C, 2, 5, 10 ou 20), avec leur étage et leur prix.", input_schema: { type: "object", properties: { taille: { type: "string", enum: ["C", "2", "5", "10", "20"] }, etage: { type: "string", enum: ["0", "1", "2"], description: "Facultatif : 0 = rez-de-chaussée (le plus pratique pour les objets lourds)" } }, required: ["taille"] } },
  { name: "montrer_box", description: "Allume un box libre dans l'immeuble 3D du site. Avec reserver = true, ouvre directement sa réservation.", input_schema: { type: "object", properties: { nom: { type: "string", description: "Numéro du box, par exemple 112 ou C04" }, reserver: { type: "boolean" } }, required: ["nom"] } },
  { name: "ouvrir_simulateur", description: "Fait défiler la page jusqu'au simulateur de volume.", input_schema: { type: "object", properties: {} } },
];

async function outil(nom, e, c, actions) {
  if (nom === "chercher_box") {
    const res = [];
    for (const [n, l] of Object.entries(c.etages)) if (!e.etage || e.etage === n) for (const b of l) if (b.libre && b.taille === e.taille) res.push({ nom: b.nom, etage: ETAGES[n].nom, prix_mensuel: c.formules[b.taille]?.prix });
    res.sort((a, b) => a.etage.localeCompare(b.etage));
    return { libres: res.length, exemples: res.slice(0, 6) };
  }
  if (nom === "montrer_box") {
    for (const [n, l] of Object.entries(c.etages)) { const b = l.find(x => x.nom.toUpperCase() === String(e.nom).toUpperCase()); if (b) {
      if (!b.libre) return { ok: false, erreur: "Ce box est occupé : choisissez-en un autre avec chercher_box." };
      actions.push({ type: "box", id: b.id, nom: b.nom, etage: n, reserver: !!e.reserver });
      return { ok: true, affiche: `Box ${b.nom}, ${ETAGES[n].nom}` };
    } }
    return { ok: false, erreur: "Box introuvable." };
  }
  if (nom === "ouvrir_simulateur") { actions.push({ type: "simulateur" }); return { ok: true }; }
  return { ok: false, erreur: "Outil inconnu." };
}

export async function repondre(env, historique) {
  const c = await catalogue(env);
  const messages = historique.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  const actions = [];
  for (let tour = 0; tour < 5; tour++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELE(env), max_tokens: 600, system: consignes(donnees(c)), tools: OUTILS, messages }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`IA ${r.status} ${d.error && d.error.message || ""}`); e.status = r.status; e.ia = true; throw e; }
    messages.push({ role: "assistant", content: d.content });
    const appels = (d.content || []).filter(b => b.type === "tool_use");
    if (d.stop_reason !== "tool_use" || !appels.length) {
      return { texte: (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim(), actions };
    }
    const resultats = [];
    for (const a of appels) resultats.push({ type: "tool_result", tool_use_id: a.id, content: JSON.stringify(await outil(a.name, a.input || {}, c, actions)) });
    messages.push({ role: "user", content: resultats });
  }
  return { texte: "Je vous laisse choisir dans l'immeuble ci-dessus : les boxes libres sont allumés en vert.", actions };
}
