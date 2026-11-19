// Assistant StockBox : renseigne, trouve la bonne taille, montre un box libre dans l'immeuble et prépare un devis dans Nexudus
// (fiche client, proposition commerciale en brouillon, carte dans le CRM « StockBox — Ventes »).
// Il ne s'appuie que sur Nexudus (catalogue relu toutes les 20 s) : aucun prix, aucune remise, aucun box inventé.
import { catalogue, oublier, nx, contact, nettoie, emailValide, isoZ, ETAGES, CFG } from "./nexudus.js";

const MODELE = env => env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const RESPONSABLE = 1417540719;      // Matthias Cohen-Hadria (administrateur)
const COLONNE_CRM = 1415385823;      // StockBox — Ventes · Demande en ligne
const NOM_TAILLE = { C: "Casier", 2: "2 m²", 5: "5 m²", 10: "10 m²", 20: "20 m²" };

function donnees(c) {
  const parTaille = {};
  for (const [n, l] of Object.entries(c.etages)) for (const b of l) {
    const t = (parTaille[b.taille] ||= { code: b.taille, taille: NOM_TAILLE[b.taille] || b.taille, prix_mensuel: c.formules[b.taille]?.prix, volume_m3: c.formules[b.taille]?.volume, libres: 0, total: 0, libres_par_etage: {} });
    t.total++; if (b.libre) { t.libres++; t.libres_par_etage[ETAGES[n].nom] = (t.libres_par_etage[ETAGES[n].nom] || 0) + 1; }
  }
  return {
    tailles: Object.values(parTaille),
    assurances: c.produits.assurances.map(a => ({ nom: a.nom, prix_mensuel: a.prix })),
    accessoires: c.produits.accessoires.map(a => ({ nom: a.nom, prix: a.prix, description: a.description })),
    frais_de_dossier: c.produits.fraisDossier.prix,
    preavis_jours: c.formules["10"]?.preavis || 15,
  };
}

const consignes = (d, aDevis) => `Tu es l'assistant de StockBox Saint-Ouen, un centre de self-stockage en ligne (14 passage des Malles, 93400 Saint-Ouen, quartier des Puces, métro Garibaldi). Tu réponds sur le site à des particuliers (déménagement, travaux, séparation, succession, étudiants, expatriation) et à des professionnels (stock d'e-commerce, archives, matériel de chantier, artisans, commerçants).

Ton but : renseigner clairement, puis amener la personne à une décision — voir son box dans l'immeuble, le réserver en ligne, ou recevoir un devis.

Style : français, vouvoiement, simple, chaleureux et concret. 2 à 4 phrases, pas de titres, pas d'emoji, pas de listes longues. **Gras** avec parcimonie. Une seule question à la fois. Tu ne parles jamais de « l'IA » ni de tes outils.

Ce que tu sais du lieu (fiable) :
- Accès 7 j/7 de 6 h à 22 h avec un code personnel. Accueil du lundi au samedi, de 9 h à 19 h.
- Quai de chargement couvert au rez-de-chaussée, chariots et transpalette en libre-service, monte-charge vers les étages 1 et 2. Pas de réservation nécessaire pour le quai.
- Chaque box ferme avec le cadenas du client ; vidéosurveillance, alarme la nuit. Hauteur 2,50 m.
- Location au mois, sans engagement, préavis de ${d.preavis_jours} jours. Paiement mensuel. Frais de dossier ${d.frais_de_dossier} € une fois. Pas de dépôt de garantie. Changement de taille possible à tout moment selon les disponibilités.
- Code BIENVENUE : premier mois offert, une fois par client.
- Assurance obligatoire : une des formules StockBox, ou l'assurance habitation du client si elle couvre le stockage.
- Interdits : denrées périssables, produits dangereux ou inflammables (gaz, carburant, peinture en grande quantité), armes, animaux, plantes, objets illicites. Pas d'habitation ni de travail dans le box.
- Réservation 100 % en ligne en une minute, entrée dès le lendemain. Code d'accès envoyé par e-mail la veille.
Si on te demande autre chose (parking longue durée, livraison, déménageurs, horaires de jours fériés…), dis que tu n'as pas l'information et propose que l'équipe rappelle via un devis.

Choisir la taille : demande ce que la personne veut stocker ou la taille du logement. Repères : un carton ≈ 0,08 m³, canapé 3 places ≈ 2 m³, lit double ≈ 2 m³, armoire ≈ 1,5 m³, réfrigérateur ≈ 0,8 m³ ; studio ≈ 10 m³, 2 pièces ≈ 20 m³, 3 pièces ≈ 35 m³, maison ≈ 50 m³ et plus. Ajoute 15 % de marge, recommande la plus petite taille qui suffit (capacités : casier 1 m³, 2 m² ≈ 5 m³, 5 m² ≈ 12 m³, 10 m² ≈ 25 m³, 20 m² ≈ 50 m³). Pour les objets lourds ou volumineux, conseille le rez-de-chaussée (à côté du quai).

Ensuite : appelle chercher_box, puis montrer_box sur le meilleur box (le site l'allume dans l'immeuble en 3D et le propose à la réservation). Propose deux suites : réserver tout de suite en ligne, ou recevoir un devis.

Devis : ${aDevis ? "un devis a déjà été préparé dans cette conversation ; n'en crée pas d'autre, rappelle sa référence." : `quand la personne veut un devis (ou hésite, ou est un professionnel), demande en une ou deux questions : prénom, nom, e-mail (et société si pro ; téléphone facultatif), date d'entrée souhaitée, et la valeur de ses biens pour l'assurance. Récapitule en une phrase (box, date, prix mensuel) et demande un oui explicite. Après le oui seulement, appelle creer_devis. Dis ensuite que le devis est enregistré, qu'il arrive par e-mail après relecture de l'équipe, et qu'elle peut aussi réserver tout de suite en ligne.`}

Règles absolues : tu n'affirmes que ce qui est écrit ici, dans les DONNÉES ou dans les résultats d'outils. Prix en euros par mois. Aucune remise hors BIENVENUE. Ne demande jamais de moyen de paiement.

DONNÉES (lues dans Nexudus à l'instant) :
${JSON.stringify(d)}`;

const OUTILS = [
  { name: "chercher_box", description: "Liste les boxes libres d'une taille (C, 2, 5, 10 ou 20), avec étage et prix.", input_schema: { type: "object", properties: { taille: { type: "string", enum: ["C", "2", "5", "10", "20"] }, etage: { type: "string", enum: ["0", "1", "2"], description: "Facultatif : 0 = rez-de-chaussée, à côté du quai" } }, required: ["taille"] } },
  { name: "montrer_box", description: "Allume un box libre dans l'immeuble 3D du site et le propose à la réservation. Avec reserver = true, ouvre directement la réservation en ligne.", input_schema: { type: "object", properties: { nom: { type: "string", description: "Numéro du box, par exemple 112 ou C04" }, reserver: { type: "boolean" } }, required: ["nom"] } },
  { name: "creer_devis", description: "Crée le devis dans Nexudus (proposition en brouillon relue par l'équipe) et la fiche dans le CRM. Seulement après un oui explicite.", input_schema: { type: "object", properties: { box: { type: "string" }, prenom: { type: "string" }, nom: { type: "string" }, email: { type: "string" }, telephone: { type: "string" }, societe: { type: "string" }, date_entree: { type: "string", description: "AAAA-MM-JJ" }, valeur_biens: { type: "string", enum: ["moins de 5 000 €", "5 000 à 15 000 €", "plus de 15 000 €", "assurance personnelle"] }, resume_besoin: { type: "string" } }, required: ["box", "prenom", "nom", "email"] } },
];

const ref = () => "SBD-" + Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const trouver = (c, nom) => { for (const [n, l] of Object.entries(c.etages)) { const b = l.find(x => x.nom.toUpperCase() === String(nom).trim().toUpperCase()); if (b) return { ...b, etage: n }; } return null; };

async function creerDevis(env, c, e, memo) {
  if (memo.devis) return { ok: true, deja: true, reference: memo.devis.reference };
  if (memo.peutCreer && !memo.peutCreer()) return { ok: false, erreur: "Limite de devis atteinte : proposez la réservation en ligne." };
  const b = trouver(c, e.box);
  if (!b) return { ok: false, erreur: "Box introuvable : relancez chercher_box." };
  if (!b.libre) return { ok: false, erreur: "Ce box vient d'être loué : proposez-en un autre." };
  const email = nettoie(e.email, 160).toLowerCase(), prenom = nettoie(e.prenom, 60), nom = nettoie(e.nom, 60), societe = nettoie(e.societe, 120), tel = nettoie(e.telephone, 40);
  if (!emailValide(email)) return { ok: false, erreur: "Adresse e-mail invalide : redemandez-la." };
  if (!prenom || !nom) return { ok: false, erreur: "Prénom et nom nécessaires." };
  const f = c.formules[b.taille];
  const jour = /^\d{4}-\d{2}-\d{2}$/.test(e.date_entree || "") && e.date_entree >= new Date().toISOString().slice(0, 10) ? e.date_entree : new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const valeur = e.valeur_biens || "";
  const assur = /moins/.test(valeur) ? c.produits.assurances[0] : /5 000 à/.test(valeur) ? c.produits.assurances[1] : /plus/.test(valeur) ? c.produits.assurances[2] : null;
  const mensuel = f.prix + (assur ? assur.prix : 0);
  const cl = await contact(env, { prenom, nom, email, tel, societe, note: `Prospect venu par l'assistant du site StockBox (devis box ${b.nom}).` });
  const reference = ref();
  const corps = {
    IssuedById: CFG.business, ResponsibleId: RESPONSABLE, CoworkerId: cl.id, Reference: reference, ProposalStatus: 1,
    TariffId: f.id, Quantity: 1, BillingDay: Math.min(28, Number(jour.slice(8, 10))), StartDate: `${jour}T00:00:00Z`,
    ExpirationDate: isoZ(new Date(Date.now() + 15 * 864e5)), Desks: [b.id],
    Notes: [`Devis préparé par l'assistant du site pour ${societe || prenom + " " + nom}. Valable 15 jours.`, `Box ${b.nom} (${NOM_TAILLE[b.taille]}, ${ETAGES[b.etage].nom}) : ${f.prix} € par mois.`, assur ? `Assurance proposée : ${assur.nom}, ${assur.prix} € par mois.` : valeur ? "Assurance personnelle." : "", `Frais de dossier : ${c.produits.fraisDossier.prix} €. Code BIENVENUE : premier mois offert.`].filter(Boolean).join("\n"),
  };
  let devis;
  try { devis = await nx(env, "POST", "/billing/proposals", corps); }
  catch (er) { console.error("Devis avec responsable refusé :", er.message); const { ResponsibleId, ...sans } = corps; devis = await nx(env, "POST", "/billing/proposals", sans); }
  await nx(env, "POST", "/crm/crmopportunities", {
    Name: `Devis ${reference} · Box ${b.nom} · ${societe || prenom + " " + nom}`.slice(0, 120), CrmBoardColumnId: COLONNE_CRM, CoworkerId: cl.id, Status: 1, Position: 0, LeadSource: 1, ResponsibleId: RESPONSABLE,
    DueDate: isoZ(new Date(Date.now() + 2 * 3600e3)), Value: mensuel * 12,
    Notes: [`Devis ${reference} préparé par l'assistant (brouillon à relire puis envoyer depuis Nexudus).`, `Box ${b.nom}, ${NOM_TAILLE[b.taille]}, ${ETAGES[b.etage].nom}, entrée le ${jour.split("-").reverse().join("/")}.`, `${mensuel} € par mois${assur ? " assurance comprise" : ""}.`, `Contact : ${prenom} ${nom}${societe ? " · " + societe : ""} · ${email}${tel ? " · " + tel : ""}`, valeur ? `Valeur des biens : ${valeur}.` : "", e.resume_besoin ? `Besoin : ${nettoie(e.resume_besoin, 400)}` : ""].filter(Boolean).join("\n"),
    UtmSource: "site-stockbox", UtmMedium: "assistant",
  }).catch(er => console.error("Carte CRM non créée :", er.message));
  oublier();
  memo.devis = { reference, box: b.nom, id: b.id, taille: b.taille, etage: b.etage, mensuel, jour, email };
  return { ok: true, reference, box: b.nom, mensuel, date_entree: jour, email };
}

async function outil(env, nom, e, c, sortie, memo) {
  if (nom === "chercher_box") {
    const res = [];
    for (const [n, l] of Object.entries(c.etages)) if (!e.etage || e.etage === n) for (const b of l) if (b.libre && b.taille === e.taille) res.push({ id: b.id, nom: b.nom, etage: n, etage_nom: ETAGES[n].nom, taille: b.taille, prix_mensuel: c.formules[b.taille]?.prix });
    const ordre = ["10", "20"].includes(e.taille) ? ["0", "1", "2"] : ["1", "2", "0"];
    res.sort((a, b) => ordre.indexOf(a.etage) - ordre.indexOf(b.etage));
    sortie.offres = res.slice(0, 3);
    return { libres: res.length, exemples: res.slice(0, 6).map(({ id, ...r }) => r) };
  }
  if (nom === "montrer_box") {
    const b = trouver(c, e.nom);
    if (!b) return { ok: false, erreur: "Box introuvable." };
    if (!b.libre) return { ok: false, erreur: "Ce box est occupé : choisissez-en un autre avec chercher_box." };
    sortie.actions.push({ type: "box", id: b.id, nom: b.nom, etage: b.etage, reserver: !!e.reserver });
    return { ok: true, affiche: `Box ${b.nom}, ${ETAGES[b.etage].nom}` };
  }
  if (nom === "creer_devis") {
    const r = await creerDevis(env, c, e, memo);
    if (r.ok && !r.deja) sortie.devis = memo.devis;
    return r;
  }
  return { ok: false, erreur: "Outil inconnu." };
}

export async function repondre(env, historique, memo = {}) {
  const c = await catalogue(env);
  const messages = historique.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  const sortie = { actions: [], offres: null, devis: null };
  for (let tour = 0; tour < 6; tour++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELE(env), max_tokens: 700, system: consignes(donnees(c), !!memo.devis), tools: OUTILS, messages }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`IA ${r.status} ${d.error && d.error.message || ""}`); e.status = r.status; e.ia = true; throw e; }
    messages.push({ role: "assistant", content: d.content });
    const appels = (d.content || []).filter(b => b.type === "tool_use");
    if (d.stop_reason !== "tool_use" || !appels.length) return { texte: (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim(), ...sortie, memo: { devis: memo.devis || null } };
    const res = [];
    for (const a of appels) { let out; try { out = await outil(env, a.name, a.input || {}, c, sortie, memo); } catch (er) { console.error("outil", a.name, er.message); out = { ok: false, erreur: "Action impossible pour le moment : proposez la réservation en ligne." }; } res.push({ type: "tool_result", tool_use_id: a.id, content: JSON.stringify(out) }); }
    messages.push({ role: "user", content: res });
  }
  return { texte: "Je vous laisse choisir dans l'immeuble : les boxes libres sont allumés en vert.", ...sortie, memo: { devis: memo.devis || null } };
}
