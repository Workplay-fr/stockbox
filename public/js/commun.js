// Données et outils partagés : état de l'inventaire (Nexudus via /api/inventaire), formats, animation.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };
export const NS = "http://www.w3.org/2000/svg";
// Langue de la page : <html lang="en"> pour /en/, français sinon. L(fr, en) choisit le bon texte.
export const EN = document.documentElement.lang === "en";
export const L = (fr, en) => (EN ? en : fr);
export const LOC = EN ? "en-GB" : "fr-FR";
export const eur = n => EN ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " €";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

// GSAP s'il est chargé ; sinon un remplaçant qui applique l'état final, pour que rien ne casse.
export const G = window.gsap || {
  to(t, v) { const o = typeof t === "string" ? [...document.querySelectorAll(t)] : Array.isArray(t) ? t : [t]; for (const x of o) for (const [k, val] of Object.entries(v)) if (!["duration", "ease", "delay", "onUpdate", "onComplete", "stagger"].includes(k)) { if (x instanceof Element) x.style[k] = typeof val === "number" && !["opacity", "scale"].includes(k) ? val + "px" : val; else x[k] = val; } v.onUpdate && v.onUpdate(); v.onComplete && v.onComplete(); return { kill() {} }; },
  fromTo(t, a, b) { return this.to(t, b); }, set(t, v) { return this.to(t, v); }, killTweensOf() {},
  timeline() { const tl = { to: (t, v) => (G.to(t, v), tl), fromTo: (t, a, b) => (G.to(t, b), tl), set: (t, v) => (G.to(t, v), tl), call: f => (f(), tl), add: () => tl, kill() {} }; return tl; },
};
if (reduit && window.gsap) window.gsap.globalTimeline.timeScale(20);

export const NOMS = EN ? { 0: "Ground floor", 1: "Floor 1", 2: "Floor 2" } : { 0: "Rez-de-chaussée", 1: "Étage 1", 2: "Étage 2" };
export const COURT = { 0: EN ? "G" : "RDC", 1: "1", 2: "2" };
export const TAILLES = ["C", "2", "5", "10", "20"];
export const LIBELLE = { C: EN ? "Locker" : "Casier", 2: "2 m²", 5: "5 m²", 10: "10 m²", 20: "20 m²" };
export const IDEAL = EN ? { C: "Archives, suitcases, sports gear.", 2: "The contents of a cellar or a box room.", 5: "A studio flat or one bedroom.", 10: "A furnished one-bedroom flat.", 20: "A two or three-bedroom home, or business stock." } : { C: "Archives, valises, matériel de sport.", 2: "Le contenu d'une cave ou d'un débarras.", 5: "Un studio ou une chambre.", 10: "Un 2 pièces meublé.", 20: "Un 3 ou 4 pièces, ou du stock pro." };
export const EMPRISE = { C: [1, 1, 1], 2: [1.05, 2.5, 2.5], 5: [2.1, 2.5, 2.5], 10: [2.1, 5, 2.5], 20: [4, 5, 2.5] };   // largeur, profondeur, hauteur (m)
const SECOURS = { C: { prix: 25, volume: 1 }, 2: { prix: 69, volume: 5 }, 5: { prix: 139, volume: 12 }, 10: { prix: 249, volume: 25 }, 20: { prix: 449, volume: 50 } };

export const S = { data: null, zones: null, apercu: false, filtre: null, choix: null, reco: null, volume: 0, centre: null };
let PARID = new Map();
export const boxParId = id => PARID.get(Number(id));
export const boxes = n => (S.data && S.data.etages[n]) || [];
export const libres = (n, t) => boxes(n).filter(b => b.libre && (!t || b.taille === t)).length;
export const libresTotal = t => ["0", "1", "2"].reduce((s, n) => s + libres(n, t), 0);
// Source unique de tous les compteurs du site : le même inventaire Nexudus que le plan 3D.
export function compteurs() {
  const tous = ["0", "1", "2"].flatMap(boxes), total = tous.length, l = libresTotal();
  return { total, libres: l, loues: total - l, semaine: S.data?.activite?.semaine ?? 0 };
}
// Un seul format de nom partout, celui du plan : « Box 104 », « Casier C12 ».
export const estCasier = nom => /^C/i.test(String(nom || ""));
export const nomBox = (b, min = false) => { const n = typeof b === "string" ? b : b?.nom; const t = `${estCasier(n) ? (EN ? "Locker" : "Casier") : "Box"} ${n}`; return min ? t.charAt(0).toLowerCase() + t.slice(1) : t; };
export const prix = t => S.data?.formules?.[t]?.prix ?? SECOURS[t].prix;
export const volumeTaille = t => S.data?.formules?.[t]?.volume ?? SECOURS[t].volume;
export const preavis = () => S.data?.formules?.["10"]?.preavis || 15;

function indexer() { PARID = new Map(); for (const [n, l] of Object.entries(S.data.etages)) for (const b of l) PARID.set(b.id, { ...b, etage: n }); }

export async function charger() {
  S.zones = await fetch("/data/zones.json").then(r => r.json());
  try {
    const d = await fetch("/api/inventaire").then(r => r.json());
    if (!d.ok) throw new Error(d.erreur);
    S.data = d; S.apercu = false;
  } catch {
    // Aperçu hors ligne : plan complet, tout libre, signalé comme simulé ; la réservation reste désactivée.
    S.apercu = true;
    const etages = {};
    for (const [n, l] of Object.entries(S.zones.etages)) etages[n] = Object.keys(l).map((nom, i) => ({ id: Number(n) * 1000 + i + 1, nom, taille: tailleDuPlan(n, nom), libre: true }));
    S.data = { etages, formules: Object.fromEntries(TAILLES.map(t => [t, { ...SECOURS[t], preavis: 15 }])), produits: { assurances: [], accessoires: [], fraisDossier: { prix: 19 } }, activite: { loues: 0, semaine: 0, recents: [] } };
  }
  indexer();
}
export async function actualiser() {
  if (S.apercu) return false;
  try { const d = await fetch("/api/inventaire").then(r => r.json()); if (!d.ok) return false; S.data = d; indexer(); if (S.choix) S.choix = boxParId(S.choix.id) || null; return true; }
  catch { return false; }
}
function tailleDuPlan(n, nom) {
  if (/^C/.test(nom)) return "C";
  const k = Number(nom.slice(-2));
  if (n === "0") return k <= 6 ? "20" : "10";
  if (n === "1") return k <= 10 || (k >= 31 && k <= 40) ? "10" : k >= 41 ? "20" : "5";
  return k <= 10 || (k >= 41 && k <= 50) ? "10" : k >= 51 ? "20" : k >= 21 ? "2" : "5";
}

// Le box conseillé pour une taille : au rez-de-chaussée pour les grands volumes (quai), sinon au plus près du monte-charge.
export function boxConseille(t) {
  const c = S.zones.noyau;
  const ordre = ["10", "20"].includes(t) ? ["0", "1", "2"] : ["1", "2", "0"];
  for (const n of ordre) {
    const l = boxes(n).filter(b => b.libre && b.taille === t);
    if (!l.length) continue;
    const d = b => { const p = S.zones.etages[n][b.nom]; const x = p.reduce((s, q) => s + q[0], 0) / 4, y = p.reduce((s, q) => s + q[1], 0) / 4; return Math.hypot(x - c[0], y - c[1]); };
    return { ...l.sort((a, b) => d(a) - d(b))[0], etage: n };
  }
  return null;
}
export const ilYa = iso => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return EN ? `${m} min ago` : `il y a ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return EN ? `${h} h ago` : `il y a ${h} h`;
  const j = Math.round(h / 24); return j === 1 ? L("hier", "yesterday") : EN ? `${j} days ago` : `il y a ${j} jours`;
};
