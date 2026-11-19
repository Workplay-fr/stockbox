// POST /api/demo { action: "etat" | "remplir" | "vider", cle } : contrats de démonstration, pour que l'immeuble ne soit pas vide.
// Réservé à l'administrateur : la clé est le mot de passe du site (SITE_PASSWORD). Tout ce qui est créé ici est marqué « [DÉMO] »
// (notes du contrat) et ses clients ont une adresse stockbox.demo+…@workplay.fr : « vider » ne touche qu'à ces fiches-là.
import { catalogue, oublier, nx, pret, json, isoZ, CFG } from "../../lib/nexudus.js";

const CIBLE = 62, PAR_APPEL = 2;   // la moitié des 124 boxes
const MARQUE = "[DÉMO]";
const PRENOMS = ["Camille","Léa","Hugo","Inès","Thomas","Chloé","Lucas","Manon","Nathan","Sarah","Julien","Emma","Karim","Alice","Maxime","Jade","Antoine","Yasmine","Paul","Louise","Mehdi","Clara","Romain","Zoé","Bastien","Nina","Samuel","Lina","Victor","Anaïs","Adrien","Margaux","Rayan","Elsa","Quentin","Mila","Florian","Salomé","Théo","Agathe"];
const NOMS = ["Moreau","Laurent","Girard","Benali","Fontaine","Rousseau","Lefèvre","Mercier","Garnier","Chevalier","Perrin","Blanc","Haddad","Faure","Robin","Dumas","Lemoine","Martel","Roux","Gauthier","Bouchard","Marchand","Colin","Vidal","Renaud","Arnaud","Picard","Lacroix","Brunet","Caron","Guerin","Masson","Aubert","Barbier","Noël","Leroy","Rolland","Meyer","Morel","Baron"];
const SOCIETES = { 3: "Atelier Lumen", 8: "Maison Vert-Galant", 13: "Cartons & Co", 19: "Studio Brique", 26: "Les Puces de Margaux", 33: "Archi Nord" };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const enCours = l => l.filter(c => !/Ancien contrat/.test(c.Notes || ""));
async function contratsDemo(env) {
  const d = await nx(env, "GET", `/billing/coworkercontracts?CoworkerContract_IssuedBy=${CFG.business}&CoworkerContract_Notes=${encodeURIComponent(MARQUE)}&size=200`);
  return (d.Records || []).filter(c => String(c.Notes || "").startsWith(MARQUE));
}

export async function onRequestPost({ request, env }) {
  if (!pret(env) || !env.SITE_PASSWORD) return json(503, { ok: false, erreur: "Site non configuré." });
  let d; try { d = await request.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.cle !== env.SITE_PASSWORD) return json(403, { ok: false, erreur: "Clé incorrecte." });
  try {
    const tousDemo = await contratsDemo(env), existants = enCours(tousDemo);
    if (d.action === "etat") return json(200, { ok: true, demo: existants.length, cible: CIBLE });

    if (d.action === "remplir") {
      if (existants.length >= CIBLE) return json(200, { ok: true, demo: existants.length, fini: true });
      oublier();
      const c = await catalogue(env);
      // Un box sur deux dans chaque taille et chaque étage, pour un immeuble rempli à moitié, de façon régulière.
      const tous = Object.entries(c.etages).flatMap(([n, l]) => l.map(b => ({ ...b, n })));
      const rang = {}; const candidats = tous.filter(b => { const k = b.n + b.taille; rang[k] = (rang[k] || 0) + 1; return rang[k] % 2 === 0 && b.libre; });
      const aFaire = candidats.slice(0, Math.min(PAR_APPEL, CIBLE - existants.length));
      const faits = [];
      for (const [k, b] of aFaire.entries()) {
        const i = existants.length + k;
        const prenom = PRENOMS[i % PRENOMS.length], nom = NOMS[(i * 7) % NOMS.length];
        const co = await nx(env, "POST", "/spaces/coworkers", {
          CoworkerType: 1, FullName: `${prenom} ${nom}`, Email: `stockbox.demo+${slug(prenom)}.${slug(nom)}@workplay.fr`, CompanyName: SOCIETES[i] || null,
          Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
          MondayAttendance: 1, TuesdayAttendance: 1, WednesdayAttendance: 1, ThursdayAttendance: 1, FridayAttendance: 1, SaturdayAttendance: 1, SundayAttendance: 1,
          Notes: `${MARQUE} Client fictif créé pour la démo StockBox.`,
        });
        const idCo = co.Value && co.Value.Id;
        const jour = 864e5, auj = new Date(); auj.setUTCHours(0, 0, 0, 0);
        // Ancienneté étalée sur 14 mois, pour des courbes d'arrivées et une durée moyenne de location crédibles.
        const debut = new Date(auj - (8 + (i * 53) % 420) * jour);
        const ct = {
          IssuedById: CFG.business, CoworkerId: idCo, TariffId: c.formules[b.taille].id, Quantity: 1, StartDate: isoZ(debut),
          BillingDay: Math.min(28, debut.getUTCDate()), Desks: [b.id], PricePlanTermsAccepted: true, IncludeSignupFee: false,
          Notes: `${MARQUE} Contrat fictif pour la démo StockBox (box ${b.nom}).`,
        };
        // Un client sur quatre s'est engagé 12 mois (fin d'engagement visible), un sur cinq a donné son préavis (départ dans 2 à 10 semaines).
        if (i % 4 === 1) ct.ContractTerm = isoZ(new Date(debut.getTime() + 365 * jour));
        if (i % 5 === 2) { ct.CancellationDate = isoZ(new Date(auj.getTime() + (14 + (i * 9) % 56) * jour)); ct.CancellationReason = 1; ct.CancellationNotes = `${MARQUE} Préavis donné (déménagement terminé).`; }
        await nx(env, "POST", "/billing/coworkercontracts", ct);
        // Un box sur trois a eu un locataire avant : contrat terminé, pour l'historique et le taux de départ.
        if (i % 3 === 0) {
          try {
            const p2 = PRENOMS[(i + 17) % PRENOMS.length], n2 = NOMS[(i * 7 + 13) % NOMS.length];
            const ancien = await nx(env, "POST", "/spaces/coworkers", {
              CoworkerType: 1, FullName: `${p2} ${n2}`, Email: `stockbox.demo+${slug(p2)}.${slug(n2)}.${i}@workplay.fr`,
              Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
              Notes: `${MARQUE} Ancien client fictif (démo StockBox).`,
            });
            const fin = new Date(debut.getTime() - 3 * jour), deb2 = new Date(fin.getTime() - (90 + (i * 31) % 240) * jour);
            await nx(env, "POST", "/billing/coworkercontracts", {
              IssuedById: CFG.business, CoworkerId: ancien.Value && ancien.Value.Id, TariffId: c.formules[b.taille].id, Quantity: 1,
              StartDate: isoZ(deb2), BillingDay: Math.min(28, deb2.getUTCDate()), Desks: [b.id], PricePlanTermsAccepted: true, IncludeSignupFee: false,
              CancellationDate: isoZ(fin), CancellationReason: 1, Notes: `${MARQUE} Ancien contrat terminé (box ${b.nom}).`,
            });
          } catch (e) { console.error("Historique démo :", e.message); }
        }
        faits.push(b.nom);
      }
      oublier();
      return json(200, { ok: true, faits, demo: existants.length + faits.length, fini: existants.length + faits.length >= CIBLE || !aFaire.length });
    }

    if (d.action === "vider") {
      // Supprime uniquement les contrats « [DÉMO] » et leurs clients fictifs, par lots.
      const lot = tousDemo.slice(0, 8), retires = [];
      for (const ct of lot) {
        try { await nx(env, "DELETE", `/billing/coworkercontracts/${ct.Id}`); retires.push(ct.Id); }
        catch (e) { console.error("Contrat démo non supprimé :", e.message); }
        if (ct.CoworkerId && /^stockbox\.demo\+/i.test(String(ct.CoworkerEmail || ""))) {
          try { await nx(env, "DELETE", `/spaces/coworkers/${ct.CoworkerId}`); } catch (e) { console.error("Client démo non supprimé :", e.message); }
        }
      }
      oublier();
      return json(200, { ok: true, retires: retires.length, reste: tousDemo.length - retires.length, fini: tousDemo.length - retires.length <= 0 });
    }
    return json(400, { ok: false, erreur: "Action inconnue." });
  } catch (e) {
    console.error("demo", e.message);
    return json(200, { ok: false, erreur: e.message.slice(0, 400) });
  }
}
export const onRequest = () => json(405, { ok: false, erreur: "Méthode non autorisée." });
