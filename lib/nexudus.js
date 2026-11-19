// Accès à l'API Nexudus pour le site StockBox (localisation 1420979504 uniquement).
// Les identifiants API sont des secrets Cloudflare (NEXUDUS_USER, NEXUDUS_PASSWORD), lus via env.
export const API = "https://spaces.nexudus.com/api";

export const CFG = {
  business: 1420979504,
  pays: 1072,      // France
  fuseau: 2024,    // Paris
};

// Un plan d'étage Nexudus par niveau du bâtiment.
export const ETAGES = {
  0: { plan: 1415061712, nom: "Rez-de-chaussée", court: "RDC" },
  1: { plan: 1415061613, nom: "Étage 1", court: "1" },
  2: { plan: 1415061713, nom: "Étage 2", court: "2" },
};

// Formules (tarifs mensuels) par taille. Les prix sont relus dans Nexudus à chaque appel ; ceux-ci servent de secours.
export const FORMULES = {
  C:  { id: 1415470778, nom: "Casier",    prix: 25,  volume: 1,  surface: 1 },
  2:  { id: 1415470779, nom: "Box 2 m²",  prix: 69,  volume: 5,  surface: 2 },
  5:  { id: 1415470780, nom: "Box 5 m²",  prix: 139, volume: 12, surface: 5 },
  10: { id: 1415470877, nom: "Box 10 m²", prix: 249, volume: 25, surface: 10 },
  20: { id: 1415470878, nom: "Box 20 m²", prix: 449, volume: 50, surface: 20 },
};

// Produits proposés à la réservation.
export const PRODUITS = {
  assurances: [1415527542, 1415527543, 1415527445],   // 5 000 €, 15 000 €, 30 000 € (mensuel, ajouté au contrat)
  accessoires: [1415527544, 1415527545],              // cadenas, kit déménagement (une fois)
  fraisDossier: 1415527446,                           // une fois, à l'ouverture du contrat
};
const FORMULES_IDS = new Set(Object.values(FORMULES).map(f => f.id));
const PRODUITS_IDS = new Set([...PRODUITS.assurances, ...PRODUITS.accessoires, PRODUITS.fraisDossier]);
export const CODE_PROMO = 1415216446;                  // BIENVENUE : premier mois offert

export const pret = env => !!(env && env.NEXUDUS_USER && env.NEXUDUS_PASSWORD);

export async function nx(env, method, path, body) {
  const auth = "Basic " + btoa(`${env.NEXUDUS_USER}:${env.NEXUDUS_PASSWORD}`);
  const r = await fetch(API + path, {
    method,
    headers: { authorization: auth, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t.slice(0, 300) }; }
  if (!r.ok || d.WasSuccessful === false) {
    const msg = d.Message || (d.Errors && d.Errors.map(e => e.Message || e.AttemptedValue).join(" ; ")) || d.raw || "";
    const e = new Error(`Nexudus ${method} ${path.split("?")[0]} → ${r.status} ${msg}`);
    e.status = r.status; e.details = d.Errors; throw e;
  }
  return d;
}

// Taille d'une unité du plan : « C » pour les casiers, sinon la surface en m².
export function taille(u) {
  if (/^C\d+/i.test(u.Name || "")) return "C";
  const s = Number(u.Size) || parseFloat(String(u.Area || "").replace(",", "."));
  return [2, 5, 10, 20].includes(s) ? String(s) : String(s || "");
}
const libre = u => u.Available !== false && !u.CoworkerId && !String(u.CoworkerContractIds || "").trim();

// ---------- Catalogue : boxes, formules et produits, relus au plus toutes les 20 secondes ----------
let cache = null, cacheT = 0;
export function oublier() { cache = null; cacheT = 0; }

// Comme pour Bureau des Légendes : Nexudus limite les appels simultanés, donc lectures l'une après l'autre, nouvelle tentative sur 429,
// listes paginées, et filtre par localisation refait de notre côté (certains filtres de l'API sont ignorés sans erreur).
export async function lire(env, chemin) {
  for (let essai = 0; ; essai++) {
    try { return await nx(env, "GET", chemin); }
    catch (e) { if (e.status !== 429 || essai >= 2) throw e; await new Promise(r => setTimeout(r, 1500 * (essai + 1))); }
  }
}
export async function liste(env, chemin, filtre, pages = 4) {
  const tout = [];
  for (let page = 1; page <= pages; page++) {
    const d = await lire(env, `${chemin}?${filtre}&size=100&page=${page}`);
    tout.push(...(d.Records || []));
    if (!d.HasNextPage) break;
  }
  return tout;
}
export const contratsDuLieu = async env => (await liste(env, "/billing/coworkercontracts", `CoworkerContract_IssuedBy=${CFG.business}`, 5))
  .filter(c => Number(c.IssuedById) === CFG.business);

export async function catalogue(env) {
  if (cache && Date.now() - cacheT < 20e3) return cache;
  const unites = (await liste(env, "/sys/floorplandesks", `FloorPlanDesk_FloorPlan_Business=${CFG.business}`))
    .filter(u => Number(u.FloorPlanBusinessId) === CFG.business);
  const etages = Object.entries(ETAGES).map(([n, e]) => [n, unites
    .filter(u => Number(u.FloorPlanId) === e.plan && (u.ItemType === 4 || /^C?\d+$/.test(u.Name || "")))
    .map(u => ({ id: u.Id, nom: u.Name, taille: taille(u), prix: Number(u.Price) || null, libre: libre(u) }))]);
  const tarifs = { Records: (await liste(env, "/billing/tariffs", `Tariff_Business=${CFG.business}`, 1)).filter(t => FORMULES_IDS.has(Number(t.Id)) || Number(t.BusinessId) === CFG.business) };
  const produits = { Records: (await liste(env, "/billing/products", `Product_Business=${CFG.business}`, 2)).filter(x => Number(x.BusinessId) === CFG.business || PRODUITS_IDS.has(Number(x.Id))) };
  const contrats = await contratsDuLieu(env).catch(e => { console.error("contrats", e.message); return []; });
  const enCours = contrats.filter(c => c.Active !== false && !c.Cancelled);
  const actifs = { TotalItems: enCours.length };
  const recents = { Records: [...enCours].sort((x, y) => String(y.CreatedOn).localeCompare(String(x.CreatedOn))).slice(0, 12) };
  const formules = {};
  for (const [k, f] of Object.entries(FORMULES)) {
    const t = (tarifs.Records || []).find(r => r.Id === f.id);
    formules[k] = { ...f, nom: t ? t.Name : f.nom, prix: t ? Number(t.Price) : f.prix, preavis: t ? t.CancellationLimitDays : 15 };
  }
  const p = id => { const r = (produits.Records || []).find(x => x.Id === id); return r ? { id, nom: r.Name, prix: Number(r.Price), description: r.Description || "" } : null; };
  // Preuve sociale : uniquement ce que contient Nexudus (contrats actifs, réservations des 7 derniers jours, dernières réservations).
  const etageDe = {}; for (const [n, l] of etages) for (const b of l) etageDe[b.nom] = n;
  const semaine = Date.now() - 7 * 864e5;
  const derniers = (recents && recents.Records) || [];
  const activite = {
    loues: actifs ? actifs.TotalItems : null,
    semaine: derniers.filter(c => new Date(/Z$/.test(c.CreatedOn) ? c.CreatedOn : c.CreatedOn + "Z").getTime() > semaine).length,
    recents: derniers.slice(0, 8).map(c => {
      const nom = String(c.FloorPlanDeskNames || "").split(/[,;]/)[0].trim();
      return { box: nom, etage: etageDe[nom] ?? null, quand: /Z$/.test(c.CreatedOn) ? c.CreatedOn : c.CreatedOn + "Z", prenom: String(c.CoworkerFullName || "").split(" ")[0] };
    }).filter(r => r.box),
  };
  const res = {
    source: "nexudus",
    activite,
    maj: new Date().toISOString(),
    etages: Object.fromEntries(etages.map(([n, l]) => [n, l.map(b => ({ ...b, prix: b.prix || formules[b.taille]?.prix || null }))])),
    formules,
    produits: {
      assurances: PRODUITS.assurances.map(p).filter(Boolean).sort((a, b) => a.prix - b.prix),
      accessoires: PRODUITS.accessoires.map(p).filter(Boolean),
      fraisDossier: p(PRODUITS.fraisDossier) || { id: PRODUITS.fraisDossier, nom: "Frais de dossier", prix: 19 },
    },
  };
  cache = res; cacheT = Date.now();
  return res;
}

// ---------- Contacts ----------
export async function contact(env, { prenom, nom, email, tel, note, societe, cp }) {
  const liste = await nx(env, "GET", `/spaces/coworkers?Coworker_Email=${encodeURIComponent(email)}&size=1`);
  const ex = liste.Records && liste.Records[0];
  if (ex) return { id: ex.Id, nouveau: false };
  const fiche = {
    CoworkerType: 1, FullName: `${prenom} ${nom}`.trim(), Email: email, MobilePhone: tel || null, CompanyName: societe || null, PostCode: cp || null,
    Gender: 1, TaxRateType: 1, CountryId: CFG.pays, SimpleTimeZoneId: CFG.fuseau, InvoicingBusinessId: CFG.business,
    MondayAttendance: 1, TuesdayAttendance: 1, WednesdayAttendance: 1, ThursdayAttendance: 1, FridayAttendance: 1, SaturdayAttendance: 1, SundayAttendance: 1,
    Notes: note || "Client créé depuis le site StockBox (démo).",
  };
  let c;
  try { c = await nx(env, "POST", "/spaces/coworkers", { ...fiche, CreateUser: true }); }
  catch (e) { console.error("Compte portail refusé, fiche seule :", e.message); c = await nx(env, "POST", "/spaces/coworkers", fiche); }
  const id = c.Value && c.Value.Id;
  if (!id) throw new Error("Nexudus n'a pas renvoyé l'identifiant du contact.");
  return { id, nouveau: true };
}

// ---------- Outils HTTP ----------
export const nettoie = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
export const emailValide = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && !/[^\x00-\x7F]/.test(e);
export const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const vus = new Map();
export function limite(req, cle, max, fenetre = 10 * 60e3) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "?";
  const k = cle + ":" + ip, t = Date.now();
  const l = (vus.get(k) || []).filter(x => t - x < fenetre);
  if (l.length >= max) { vus.set(k, l); return true; }
  l.push(t); vus.set(k, l); if (vus.size > 5000) vus.clear();
  return false;
}
export const isoZ = d => d.toISOString().replace(/\.\d{3}Z$/, "Z");
