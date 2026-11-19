// POST /api/reserver : réservation d'un box depuis le site. Le paiement affiché est simulé : aucune donnée bancaire n'est reçue ici.
// Dans Nexudus : fiche client (avec compte portail), contrat de la formule de la taille, box attribué au contrat,
// assurance en produit mensuel du contrat, frais de dossier et accessoires en frais uniques, premier mois offert avec BIENVENUE.
import { catalogue, oublier, nx, contact, pret, json, nettoie, emailValide, limite, isoZ, CFG, CODE_PROMO } from "../../lib/nexudus.js";

const err = (s, m) => json(s, { ok: false, erreur: m });
const ref = () => "SB-" + Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const jourValide = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s + "T12:00:00Z"));

export async function onRequestPost({ request, env }) {
  if (!pret(env)) return err(503, "Le site n'est pas encore relié à Nexudus.");
  let d; try { d = await request.json(); } catch { return err(400, "Demande illisible."); }
  if (d.site) return json(200, { ok: true, reference: ref() });                       // champ piège : robot
  if (limite(request, "resa", 4, 60 * 60e3)) return err(429, "Trop de réservations envoyées. Réessayez plus tard.");

  const prenom = nettoie(d.prenom, 60), nom = nettoie(d.nom, 60), email = nettoie(d.email, 160).toLowerCase(), tel = nettoie(d.tel, 40);
  const pro = d.profil === "pro", societe = pro ? nettoie(d.societe, 120) : "", cp = nettoie(d.cp, 10), valeur = nettoie(d.valeur, 60);
  if (pro && societe.length < 2) return err(400, "Indiquez le nom de votre société.");
  if (!prenom || !nom) return err(400, "Indiquez votre prénom et votre nom.");
  if (!emailValide(email)) return err(400, "Cette adresse e-mail n'est pas valide.");
  if (!d.cgv) return err(400, "Merci d'accepter les conditions de location.");
  const debut = jourValide(d.debut) ? d.debut : null;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const max = new Date(Date.now() + 92 * 864e5).toISOString().slice(0, 10);
  if (!debut || debut < aujourdhui || debut > max) return err(400, "Choisissez une date d'entrée dans les trois prochains mois.");

  // Tout est revérifié ici : le box, son prix et les options viennent de Nexudus, jamais du navigateur.
  oublier();
  let c; try { c = await catalogue(env); } catch (e) { console.error(e.message); return err(502, "Impossible de vérifier la disponibilité pour le moment."); }
  let box = null, etage = null;
  for (const [n, l] of Object.entries(c.etages)) { const b = l.find(x => x.id === Number(d.box)); if (b) { box = b; etage = n; } }
  if (!box) return err(400, "Ce box n'existe pas.");
  if (!box.libre) return err(409, `Le box ${box.nom} vient d'être réservé. Choisissez-en un autre.`);
  const formule = c.formules[box.taille];
  if (!formule) return err(400, "Taille de box inconnue.");
  const assurance = d.assurance ? c.produits.assurances.find(a => a.id === Number(d.assurance)) : null;
  if (d.assurance && !assurance) return err(400, "Assurance inconnue.");
  const accessoires = (Array.isArray(d.accessoires) ? d.accessoires : []).map(Number).map(id => c.produits.accessoires.find(a => a.id === id)).filter(Boolean);

  let promo = false;
  const code = nettoie(d.code, 30).toUpperCase();
  if (code) {
    try {
      const dc = await nx(env, "GET", `/billing/discountcodes/${CODE_PROMO}`);
      promo = dc.Active && String(dc.Code).toUpperCase() === code && (dc.Tariffs || []).includes(formule.id) && Number(dc.DiscountPercentage) === 100;
    } catch (e) { console.error("Code promo :", e.message); }
    if (!promo) return err(400, "Ce code promo n'est pas valable.");
  }

  const reference = ref();
  const jourFact = Math.min(28, Number(debut.slice(8, 10)));
  const debutZ = `${debut}T00:00:00Z`;
  const unMoisApres = (() => { const [y, m, j] = debut.split("-").map(Number); return isoZ(new Date(Date.UTC(y, m, Math.min(j, 28)))); })();
  try {
    const client = await contact(env, { prenom, nom, email, tel, societe, cp, note: `Client créé depuis le site StockBox (démo), réservation ${reference}. ${pro ? "Professionnel" : "Particulier"}${cp ? ", code postal " + cp : ""}.` });
    const contrat = await nx(env, "POST", "/billing/coworkercontracts", {
      IssuedById: CFG.business, CoworkerId: client.id, TariffId: formule.id, Quantity: 1, BillingDay: jourFact, StartDate: debutZ,
      Desks: [box.id], PricePlanTermsAccepted: true, IncludeSignupFee: true, ApplyProRating: false,
      ...(promo ? { Price: 0, ContractSchedules: [{ Price: formule.prix, ApplyOn: unMoisApres }] } : {}),
      Notes: [`Réservation ${reference} faite sur le site StockBox (démo, paiement simulé).`, `Box ${box.nom}, ${formule.nom}, entrée le ${debut.split("-").reverse().join("/")}.`, `${pro ? "Professionnel" + (societe ? " (" + societe + ")" : "") : "Particulier"}${cp ? ", code postal " + cp : ""}.`, valeur ? `Valeur déclarée des biens : ${valeur}. ${assurance ? "Assurance : " + assurance.nom + "." : "Assurance personnelle."}` : "", promo ? "Code BIENVENUE : premier mois offert." : ""].filter(Boolean).join("\n"),
    });
    const idContrat = contrat.Value && contrat.Value.Id;
    if (!idContrat) throw new Error("Nexudus n'a pas renvoyé l'identifiant du contrat.");
    const suites = [];
    if (assurance) suites.push(nx(env, "POST", "/billing/contractproducts", { CoworkerContractId: idContrat, ProductId: assurance.id, Quantity: 1, Notes: "Assurance choisie sur le site." }));
    suites.push(nx(env, "POST", "/billing/contractdeposits", { CoworkerContractId: idContrat, ProductId: c.produits.fraisDossier.id, Refundable: false, Notes: "Frais de dossier, réservation en ligne." }));
    for (const a of accessoires) suites.push(nx(env, "POST", "/billing/contractdeposits", { CoworkerContractId: idContrat, ProductId: a.id, Refundable: false, Notes: "Accessoire ajouté à la réservation en ligne." }));
    const r = await Promise.allSettled(suites);
    r.filter(x => x.status === "rejected").forEach(x => console.error("Ligne non ajoutée au contrat :", x.reason && x.reason.message));
    oublier();
    const premierMois = promo ? 0 : formule.prix;
    const mensuel = formule.prix + (assurance ? assurance.prix : 0);
    const aPayer = premierMois + (assurance ? assurance.prix : 0) + c.produits.fraisDossier.prix + accessoires.reduce((s, a) => s + a.prix, 0);
    return json(200, { ok: true, reference, box: { nom: box.nom, etage, taille: box.taille }, debut, mensuel, aPayer, promo, contrat: idContrat });
  } catch (e) {
    console.error("reserver", e.message);
    if (/invalid email/i.test(e.message)) return err(400, "Cette adresse e-mail n'est pas acceptée. Vérifiez-la ou utilisez-en une autre.");
    return err(502, "La réservation n'a pas pu être enregistrée. Réessayez dans un instant.");
  }
}
export const onRequest = () => err(405, "Méthode non autorisée.");
