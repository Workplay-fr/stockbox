// POST /api/demo { action: "etat" | "remplir" | "vider", cle } : contrats de démonstration, pour que l'immeuble ne soit pas vide.
// Réservé à l'administrateur : la clé est le mot de passe du site (SITE_PASSWORD). Tout ce qui est créé ici est marqué « [DÉMO] »
// (notes du contrat) et ses clients ont une adresse stockbox.demo+…@workplay.fr : « vider » ne touche qu'à ces fiches-là.
import { catalogue, oublier, nx, pret, json, isoZ, CFG } from "../../lib/nexudus.js";

const CIBLE = 40, PAR_APPEL = 6;
const MARQUE = "[DÉMO]";
const PRENOMS = ["Camille","Léa","Hugo","Inès","Thomas","Chloé","Lucas","Manon","Nathan","Sarah","Julien","Emma","Karim","Alice","Maxime","Jade","Antoine","Yasmine","Paul","Louise","Mehdi","Clara","Romain","Zoé","Bastien","Nina","Samuel","Lina","Victor","Anaïs","Adrien","Margaux","Rayan","Elsa","Quentin","Mila","Florian","Salomé","Théo","Agathe"];
const NOMS = ["Moreau","Laurent","Girard","Benali","Fontaine","Rousseau","Lefèvre","Mercier","Garnier","Chevalier","Perrin","Blanc","Haddad","Faure","Robin","Dumas","Lemoine","Martel","Roux","Gauthier","Bouchard","Marchand","Colin","Vidal","Renaud","Arnaud","Picard","Lacroix","Brunet","Caron","Guerin","Masson","Aubert","Barbier","Noël","Leroy","Rolland","Meyer","Morel","Baron"];
const SOCIETES = { 3: "Atelier Lumen", 8: "Maison Vert-Galant", 13: "Cartons & Co", 19: "Studio Brique", 26: "Les Puces de Margaux", 33: "Archi Nord" };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

async function contratsDemo(env) {
  const d = await nx(env, "GET", `/billing/coworkercontracts?CoworkerContract_IssuedBy=${CFG.business}&CoworkerContract_Notes=${encodeURIComponent(MARQUE)}&size=100`);
  return (d.Records || []).filter(c => String(c.Notes || "").startsWith(MARQUE));
}

export async function onRequestPost({ request, env }) {
  if (!pret(env) || !env.SITE_PASSWORD) return json(503, { ok: false, erreur: "Site non configuré." });
  let d; try { d = await request.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  if (d.cle !== env.SITE_PASSWORD) return json(403, { ok: false, erreur: "Clé incorrecte." });
  try {
    const existants = await contratsDemo(env);
    if (d.action === "etat") return json(200, { ok: true, demo: existants.length, cible: CIBLE });

    if (d.action === "remplir") {
      if (existants.length >= CIBLE) return json(200, { ok: true, demo: existants.length, fini: true });
      oublier();
      const c = await catalogue(env);
      // Un box sur trois, réparti sur les trois niveaux et toutes les tailles.
      const tous = Object.entries(c.etages).flatMap(([n, l]) => l.map(b => ({ ...b, n })));
      const candidats = tous.filter((b, i) => i % 3 === 1 && b.libre);
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
        const debut = new Date(Date.now() - ((i * 37) % 120) * 864e5); debut.setUTCHours(0, 0, 0, 0);
        await nx(env, "POST", "/billing/coworkercontracts", {
          IssuedById: CFG.business, CoworkerId: idCo, TariffId: c.formules[b.taille].id, Quantity: 1, StartDate: isoZ(debut),
          BillingDay: Math.min(28, debut.getUTCDate()), Desks: [b.id], PricePlanTermsAccepted: true, IncludeSignupFee: false,
          Notes: `${MARQUE} Contrat fictif pour la démo StockBox (box ${b.nom}).`,
        });
        faits.push(b.nom);
      }
      oublier();
      return json(200, { ok: true, faits, demo: existants.length + faits.length, fini: existants.length + faits.length >= CIBLE || !aFaire.length });
    }

    if (d.action === "vider") {
      // Supprime uniquement les contrats « [DÉMO] » et leurs clients fictifs, par lots.
      const lot = existants.slice(0, 8), retires = [];
      for (const ct of lot) {
        try { await nx(env, "DELETE", `/billing/coworkercontracts/${ct.Id}`); retires.push(ct.Id); }
        catch (e) { console.error("Contrat démo non supprimé :", e.message); }
        if (ct.CoworkerId && /^stockbox\.demo\+/i.test(String(ct.CoworkerEmail || ""))) {
          try { await nx(env, "DELETE", `/spaces/coworkers/${ct.CoworkerId}`); } catch (e) { console.error("Client démo non supprimé :", e.message); }
        }
      }
      oublier();
      return json(200, { ok: true, retires: retires.length, reste: existants.length - retires.length, fini: existants.length - retires.length <= 0 });
    }
    return json(400, { ok: false, erreur: "Action inconnue." });
  } catch (e) {
    console.error("demo", e.message);
    return json(502, { ok: false, erreur: e.message.slice(0, 300) });
  }
}
export const onRequest = () => json(405, { ok: false, erreur: "Méthode non autorisée." });
