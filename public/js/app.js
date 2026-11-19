// StockBox : immeuble 3D, tailles, simulateur, réservation et assistant. Toutes les données viennent de /api/inventaire (Nexudus).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };
const SVG = "http://www.w3.org/2000/svg";
const eur = n => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " €";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

const NOMS = { 0: "Rez-de-chaussée", 1: "Étage 1", 2: "Étage 2" };
const COURT = { 0: "RDC", 1: "1", 2: "2" };
const TAILLES = ["C", "2", "5", "10", "20"];
const LIBELLE = { C: "Casier", 2: "2 m²", 5: "5 m²", 10: "10 m²", 20: "20 m²" };
const IDEAL = {
  C: "Archives, valises, matériel de sport.",
  2: "Le contenu d'une cave ou d'un débarras.",
  5: "Un studio ou une chambre meublée.",
  10: "Un 2 pièces meublé.",
  20: "Un 3 ou 4 pièces, ou du stock professionnel.",
};
const EMPRISE = { C: [1, 1], 2: [1.05, 2.5], 5: [2.1, 2.5], 10: [2.1, 5], 20: [4, 5] };   // largeur × profondeur en mètres
const SECOURS = { C: { prix: 25, volume: 1 }, 2: { prix: 69, volume: 5 }, 5: { prix: 139, volume: 12 }, 10: { prix: 249, volume: 25 }, 20: { prix: 449, volume: 50 } };

const S = { data: null, zones: null, vue: "pile", etage: null, filtre: null, choix: null, apercu: false };

// ---------------------------------------------------------------- données
async function charger() {
  const zones = await fetch("/data/zones.json").then(r => r.json());
  S.zones = zones;
  try {
    const r = await fetch("/api/inventaire", { headers: { accept: "application/json" } });
    const d = await r.json();
    if (!d.ok) throw new Error(d.erreur);
    S.data = d; S.apercu = false;
  } catch (e) {
    // Aperçu hors ligne : tous les boxes du plan, signalés comme simulés, réservation désactivée.
    S.apercu = true;
    const etages = {};
    for (const [n, l] of Object.entries(zones.etages)) etages[n] = Object.keys(l).map((nom, i) => {
      const t = /^C/.test(nom) ? "C" : guessTaille(n, nom);
      return { id: Number(n) * 1000 + i, nom, taille: t, prix: SECOURS[t].prix, libre: true };
    });
    S.data = { etages, formules: Object.fromEntries(TAILLES.map(t => [t, { nom: t === "C" ? "Casier" : "Box " + LIBELLE[t], ...SECOURS[t] }])), produits: { assurances: [], accessoires: [], fraisDossier: { prix: 19 } } };
  }
  index();
}
function guessTaille(n, nom) {
  const k = Number(nom.slice(-2));
  if (n === "0") return k <= 6 ? "20" : "10";
  if (n === "1") return k <= 10 || (k >= 31 && k <= 40) ? "10" : k >= 41 ? "20" : "5";
  return k <= 10 || (k >= 41 && k <= 50) ? "10" : k >= 51 ? "20" : k >= 21 ? "2" : "5";
}
let PARID = new Map();
function index() { PARID = new Map(); for (const [n, l] of Object.entries(S.data.etages)) for (const b of l) PARID.set(b.id, { ...b, etage: n }); }
const boxes = n => S.data.etages[n] || [];
const libres = (n, t) => boxes(n).filter(b => b.libre && (!t || b.taille === t)).length;
const libresTotal = t => ["0", "1", "2"].reduce((s, n) => s + libres(n, t), 0);
const prixTaille = t => S.data.formules[t]?.prix ?? SECOURS[t].prix;

// ---------------------------------------------------------------- immeuble
const scene = $("#scene"), pile = $("#pile"), bulle = $("#bulle");

function construire() {
  pile.innerHTML = "";
  if (!$("#defs-sb")) document.body.insertAdjacentHTML("afterbegin", `<svg id="defs-sb" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="hachures" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="rgba(120,130,125,.28)"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(60,70,66,.45)" stroke-width="2.5"/></pattern></defs></svg>`);
  for (const n of ["2", "1", "0"]) {
    const niv = el("div", { class: "niveau entree", "data-n": n, role: "button", tabindex: "0", "aria-label": `Entrer dans ${NOMS[n]}` });
    niv.append(el("img", { src: `/img/etage-${n}.webp`, alt: "", width: 1536, height: 1024, decoding: "async", draggable: "false" }));
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 1536 1024"); svg.setAttribute("aria-hidden", "true");
    const parNom = new Map(boxes(n).map(b => [b.nom, b]));
    for (const [nom, pts] of Object.entries(S.zones.etages[n])) {
      const b = parNom.get(nom); if (!b) continue;
      const p = document.createElementNS(SVG, "polygon");
      p.setAttribute("points", pts.map(q => q.join(",")).join(" "));
      p.setAttribute("class", "box");
      p.dataset.id = b.id; p.dataset.x = pts[0][0];
      svg.append(p);
    }
    const dalle = document.createElementNS(SVG, "polygon");
    dalle.setAttribute("class", "dalle"); dalle.setAttribute("points", S.zones.dalle.map(q => q.join(",")).join(" "));
    svg.prepend(dalle);
    const g = document.createElementNS(SVG, "g"); g.setAttribute("class", "prisme"); svg.append(g);
    const r = document.createElementNS(SVG, "g"); r.setAttribute("class", "repere"); svg.append(r);
    niv.append(svg);
    niv.append(el("div", { class: "etiq" }));
    pile.append(niv);
  }
  peindre();
  ecouter();
}

function peindre() {
  for (const p of $$(".box", pile)) {
    const b = PARID.get(Number(p.dataset.id));
    p.classList.toggle("libre", b.libre);
    p.classList.toggle("occupe", !b.libre);
    p.classList.toggle("hors", !!S.filtre && b.taille !== S.filtre);
    p.classList.toggle("choisi", S.choix?.id === b.id);
  }
  for (const niv of $$(".niveau", pile)) {
    const n = niv.dataset.n, t = S.filtre;
    $(".etiq", niv).innerHTML = `<b>${NOMS[n]}</b>${libres(n, t)} ${t ? "boxes " + LIBELLE[t] : "boxes"} libres sur ${boxes(n).filter(b => !t || b.taille === t).length}`;
  }
  niveauxMenu(); filtres(); prisme(); liste();
  $("[data-libres-total]").textContent = `${libresTotal()} boxes`;
  const min = Math.min(...TAILLES.map(prixTaille));
  $("[data-prix-min]").textContent = `Dès ${eur(min)}`;
  const preavis = S.data.formules["10"]?.preavis;
  if (preavis) $$("[data-preavis]").forEach(e => (e.textContent = preavis));
  const src = $("#source");
  if (S.apercu) { src.textContent = "Aperçu hors ligne : les disponibilités affichées sont simulées et la réservation est désactivée."; src.classList.add("alerte"); }
  else { const h = new Date(S.data.maj).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); src.textContent = `Disponibilités lues dans Nexudus à ${h}, mises à jour toutes les 30 secondes.`; src.classList.remove("alerte"); }
}

function vague() {
  if (reduit) return;
  for (const p of $$(".box", pile)) { p.classList.remove("vague"); void p.getBoundingClientRect(); p.style.setProperty("--dl", (Number(p.dataset.x) / 1536 * .5).toFixed(2) + "s"); if (!p.classList.contains("hors") && p.classList.contains("libre")) p.classList.add("vague"); }
}

function niveauxMenu() {
  const c = $("#niveaux"); const t = S.filtre;
  c.innerHTML = "";
  const tout = el("button", { class: "niv-btn tout", type: "button", "aria-current": String(S.vue === "pile") }, `<span class="num"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 21 7.5 12 12 3 7.5Z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg></span><span><b>L'immeuble</b><small>${libresTotal(t)} libres</small></span>`);
  tout.onclick = () => vuePile();
  c.append(tout);
  for (const n of ["2", "1", "0"]) {
    const b = el("button", { class: "niv-btn", type: "button", "aria-current": String(S.vue === "etage" && S.etage === n) }, `<span class="num">${COURT[n]}</span><span><b>${NOMS[n]}</b><small>${libres(n, t)} libres${t ? " en " + LIBELLE[t] : ""}</small></span>`);
    b.onclick = () => ouvrirEtage(n);
    c.append(b);
  }
}

function filtres() {
  const c = $("#filtres"); c.innerHTML = "";
  const mk = (t, txt) => { const b = el("button", { class: "filtre", type: "button", "aria-pressed": String(S.filtre === t) }, `${txt}${t ? `<span class="nb">${libresTotal(t)}</span>` : ""}`); b.onclick = () => filtrer(t); c.append(b); };
  mk(null, "Toutes les tailles");
  for (const t of TAILLES) mk(t, LIBELLE[t]);
}
function filtrer(t) {
  S.filtre = t;
  if (S.choix && t && S.choix.taille !== t) S.choix = null;
  peindre(); fiche(); vague();
}

function placer() {
  scene.dataset.vue = S.vue;
  for (const niv of $$(".niveau", pile)) {
    const n = Number(niv.dataset.n), e = Number(S.etage);
    niv.classList.toggle("actif", S.vue === "etage" && n === e);
    niv.classList.toggle("au-dessus", S.vue === "etage" && n > e);
    niv.classList.toggle("en-dessous", S.vue === "etage" && n < e);
    niv.setAttribute("tabindex", S.vue === "pile" ? "0" : "-1");
  }
  pile.style.transform = "";
}
function vuePile() { S.vue = "pile"; S.etage = null; placer(); peindre(); fiche(); }
function ouvrirEtage(n) { S.vue = "etage"; S.etage = String(n); if (S.choix && S.choix.etage !== S.etage) S.choix = null; placer(); peindre(); fiche(); setTimeout(vague, 450); }

function ecouter() {
  for (const niv of $$(".niveau", pile)) {
    niv.addEventListener("click", e => { if (S.vue === "pile") ouvrirEtage(niv.dataset.n); });
    niv.addEventListener("keydown", e => { if (S.vue === "pile" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ouvrirEtage(niv.dataset.n); } });
  }
  pile.addEventListener("pointermove", e => {
    if (S.vue === "pile" && !reduit && e.pointerType === "mouse") {
      const r = scene.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      pile.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    }
    const p = e.target.closest?.(".box");
    if (S.vue !== "etage" || !p) { survol(null); return; }
    survol(p, e);
  });
  pile.addEventListener("pointerleave", () => { survol(null); if (S.vue === "pile") pile.style.transform = ""; });
  pile.addEventListener("click", e => {
    const p = e.target.closest?.(".box"); if (S.vue !== "etage" || !p) return;
    const b = PARID.get(Number(p.dataset.id));
    if (!b.libre) { bulle.innerHTML = `<b>Box ${esc(b.nom)}</b><small>Déjà loué</small>`; return; }
    choisir(b);
  });
}

let survole = null;
function survol(p, e) {
  if (survole && survole !== p) survole.classList.remove("survol");
  survole = p;
  if (!p) { bulle.classList.remove("on"); prisme(); return; }
  const b = PARID.get(Number(p.dataset.id));
  if (b.libre) p.classList.add("survol");
  const r = scene.getBoundingClientRect();
  bulle.style.left = e.clientX - r.left + "px"; bulle.style.top = e.clientY - r.top + "px";
  bulle.innerHTML = `<b>Box ${esc(b.nom)}</b> ${LIBELLE[b.taille]}<small>${b.libre ? eur(prixTaille(b.taille)) + " par mois, libre" : "Déjà loué"}</small>`;
  bulle.classList.add("on");
  prisme(b.libre ? b : null);
}

// Prisme orange : le box « se lève » sous la souris et reste allumé quand il est choisi.
function prisme(survolB) {
  const H = S.zones.kz * S.zones.hauteur;
  for (const niv of $$(".niveau", pile)) {
    const g = $(".prisme", niv), rep = $(".repere", niv); g.innerHTML = ""; rep.innerHTML = "";
    const n = niv.dataset.n;
    const cibles = [S.choix, survolB].filter(b => b && b.etage === n);
    for (const b of cibles) {
      const pts = S.zones.etages[n][b.nom]; if (!pts) continue;
      const haut = pts.map(([x, y]) => [x, y - H]);
      g.setAttribute("class", "prisme" + (b === S.choix ? " choisi" : ""));
      g.insertAdjacentHTML("beforeend", pts.map((q, i) => `<line class="arete" x1="${q[0]}" y1="${q[1]}" x2="${haut[i][0]}" y2="${haut[i][1]}"/>`).join("") + `<polygon class="haut" points="${haut.map(q => q.join(",")).join(" ")}"/>`);
      if (b === S.choix) {
        const cx = haut.reduce((s, q) => s + q[0], 0) / 4, cy = Math.min(...haut.map(q => q[1])) - 16;
        rep.innerHTML = `<circle class="onde" cx="${cx}" cy="${cy}" r="9"/><circle cx="${cx}" cy="${cy}" r="7"/>`;
      }
    }
  }
}

function choisir(b, ouvrir = false) {
  S.choix = PARID.get(b.id);
  if (S.vue !== "etage" || S.etage !== S.choix.etage) ouvrirEtage(S.choix.etage);
  peindre(); fiche(true);
  if (ouvrir) reserver();
}

function fiche(anime) {
  const f = $("#fiche"); f.classList.remove("anime"); if (anime && !reduit) { void f.offsetWidth; f.classList.add("anime"); }
  const b = S.choix;
  if (b) {
    const fo = S.data.formules[b.taille] || SECOURS[b.taille];
    f.innerHTML = `
      <span class="etat ${b.libre ? "" : "occupe"}">${b.libre ? "Libre" : "Déjà loué"}</span>
      <div><h3>Box ${esc(b.nom)}</h3><div class="ou">${NOMS[b.etage]}${b.etage === "0" ? ", à côté du quai" : ", accès par le monte-charge"}</div></div>
      <div class="prix"><b>${eur(prixTaille(b.taille))}</b><span>par mois</span></div>
      <dl><dt>Surface</dt><dd>${b.taille === "C" ? "Casier de 1 m³" : LIBELLE[b.taille] + ", " + (fo.volume || SECOURS[b.taille].volume) + " m³ environ"}</dd><dt>Idéal pour</dt><dd>${IDEAL[b.taille]}</dd><dt>Engagement</dt><dd>Aucun, préavis de ${fo.preavis || 15} jours</dd></dl>
      <button class="btn btn-tg" type="button" id="btn-reserver" ${b.libre && !S.apercu ? "" : "disabled"}>Réserver le box ${esc(b.nom)}</button>`;
    $("#btn-reserver").onclick = reserver;
  } else if (S.vue === "etage") {
    const n = S.etage;
    const lignes = TAILLES.filter(t => boxes(n).some(x => x.taille === t)).map(t => `<dt>${LIBELLE[t]}</dt><dd>${libres(n, t)} libres, ${eur(prixTaille(t))} par mois</dd>`).join("");
    f.innerHTML = `<div><h3>${NOMS[n]}</h3><div class="ou">${boxes(n).length} boxes${n === "0" ? ", quai de chargement et accueil" : ", monte-charge depuis le quai"}</div></div><dl>${lignes}</dl><p class="vide" style="margin:0">Cliquez sur un box vert pour le choisir.</p>`;
  } else {
    f.innerHTML = `<p class="vide"><b>${libresTotal()} boxes libres sur 3 niveaux.</b>Choisissez un étage, ou filtrez par taille pour voir où se trouvent les boxes libres.</p>`;
  }
}

function liste() {
  const d = $("#liste-boxes"), g = $(".grille", d);
  const n = S.etage; d.hidden = S.vue !== "etage";
  if (!n) return;
  g.innerHTML = "";
  for (const b of boxes(n).filter(b => !S.filtre || b.taille === S.filtre)) {
    const x = el("button", { type: "button", ...(b.libre ? {} : { disabled: "" }), "aria-label": `Box ${b.nom}, ${LIBELLE[b.taille]}, ${b.libre ? "libre" : "déjà loué"}` }, `${esc(b.nom)} <small>${LIBELLE[b.taille]}</small>`);
    x.onclick = () => choisir(b);
    g.append(x);
  }
}

// Entrée de l'immeuble : les trois niveaux se posent l'un après l'autre quand la section apparaît.
function entree() {
  const niv = $$(".niveau", pile).reverse();
  const go = () => niv.forEach((x, i) => setTimeout(() => x.classList.remove("entree"), reduit ? 0 : 160 + i * 220));
  if (reduit || !("IntersectionObserver" in window)) return go();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { go(); io.disconnect(); } }, { threshold: .25 });
  io.observe(scene);
}

// ---------------------------------------------------------------- tailles à l'échelle
function echelle() {
  const c = $("#echelle"); c.innerHTML = ""; const k = 26;
  for (const t of TAILLES) {
    const [w, h] = EMPRISE[t], n = libresTotal(t);
    const b = el("button", { class: "taille", type: "button" }, `
      <div class="emprise" style="height:${5 * k}px"><span style="width:${w * k}px;height:${h * k}px"></span></div>
      <div class="nom">${LIBELLE[t]}</div>
      <div class="p">${eur(prixTaille(t))} <small>par mois</small></div>
      <div class="ideal">${IDEAL[t]}</div>
      <div class="dispo ${n ? "" : "zero"}">${n ? `${n} libres` : "Complet pour l'instant"}</div>`);
    b.onclick = () => montrerTaille(t);
    c.append(b);
  }
}
function montrerTaille(t) {
  filtrer(t);
  const meilleur = ["0", "1", "2"].sort((a, b) => libres(b, t) - libres(a, t))[0];
  $("#immeuble").scrollIntoView({ behavior: reduit ? "auto" : "smooth" });
  if (libres(meilleur, t)) setTimeout(() => ouvrirEtage(meilleur), 500);
}

// ---------------------------------------------------------------- simulateur
const OBJETS = [
  ["cartons", "Cartons standard", .08], ["valises", "Valises, sacs", .12], ["litd", "Lit double et matelas", 2], ["lits", "Lit simple et matelas", 1.1],
  ["canape", "Canapé 3 places", 2], ["fauteuil", "Fauteuil", .8], ["table", "Table", .9], ["chaise", "Chaise", .25],
  ["armoire", "Armoire", 1.5], ["commode", "Commode", .7], ["biblio", "Bibliothèque", .8], ["bureau", "Bureau", .8],
  ["frigo", "Réfrigérateur", .8], ["lavelinge", "Lave-linge", .5], ["tv", "Télévision, écran", .2], ["velo", "Vélo", .6],
];
const PRESETS = {
  "Quelques cartons": { cartons: 10, valises: 2 },
  "Un studio": { cartons: 20, valises: 2, lits: 1, table: 1, chaise: 2, canape: 1, commode: 1, frigo: 1, tv: 1, biblio: 1 },
  "Un 2 pièces": { cartons: 35, valises: 3, litd: 1, canape: 1, fauteuil: 1, table: 1, chaise: 4, armoire: 1, commode: 1, biblio: 2, frigo: 1, lavelinge: 1, tv: 1, bureau: 1, velo: 1 },
  "Un 3 pièces": { cartons: 60, valises: 4, litd: 1, lits: 1, canape: 1, fauteuil: 2, table: 1, chaise: 6, armoire: 2, commode: 2, biblio: 3, frigo: 1, lavelinge: 1, tv: 2, bureau: 1, velo: 2 },
};
const Q = Object.fromEntries(OBJETS.map(o => [o[0], 0]));
function simulateur() {
  const p = $("#presel"); p.innerHTML = "";
  for (const nom of Object.keys(PRESETS)) {
    const b = el("button", { type: "button", "aria-pressed": "false" }, nom);
    b.onclick = () => { for (const k in Q) Q[k] = PRESETS[nom][k] || 0; $$("button", p).forEach(x => x.setAttribute("aria-pressed", String(x === b))); majObjets(); calcul(); };
    p.append(b);
  }
  const o = $("#objets"); o.innerHTML = "";
  for (const [id, nom, v] of OBJETS) {
    const d = el("div", { class: "objet", "data-id": id }, `<span>${nom}<small>${String(v).replace(".", ",")} m³</small></span><div class="pas"><button type="button" aria-label="Retirer : ${nom}">−</button><output aria-label="Quantité">0</output><button type="button" aria-label="Ajouter : ${nom}">+</button></div>`);
    const [moins, plus] = $$("button", d);
    moins.onclick = () => { Q[id] = Math.max(0, Q[id] - (id === "cartons" ? 5 : 1)); majObjets(); calcul(); };
    plus.onclick = () => { Q[id] += id === "cartons" ? 5 : 1; majObjets(); calcul(); };
    o.append(d);
  }
  const max = 50, cr = $("#crans"), j = $("#jauge");
  cr.innerHTML = ""; $$(".cran", j).forEach(x => x.remove());
  for (const t of TAILLES) { const v = S.data.formules[t]?.volume || SECOURS[t].volume, x = Math.min(100, v / max * 100); j.insertAdjacentHTML("beforeend", `<span class="cran" style="left:${x}%"></span>`); if (t !== "C") cr.insertAdjacentHTML("beforeend", `<span style="left:${Math.min(96, x)}%">${LIBELLE[t]}</span>`); }
  calcul();
}
function majObjets() { for (const d of $$(".objet")) { const q = Q[d.dataset.id]; $("output", d).textContent = q; d.classList.toggle("actif", q > 0); } }
function calcul() {
  const v = OBJETS.reduce((s, [id, , vol]) => s + Q[id] * vol, 0);
  $("#vol").textContent = v.toFixed(1).replace(".", ",").replace(",0", "");
  $("#rempli").style.width = Math.min(100, v / 50 * 100) + "%";
  const besoin = v * 1.15;
  const t = TAILLES.find(t => (S.data.formules[t]?.volume || SECOURS[t].volume) >= besoin) || "20";
  const r = $("#reco");
  if (!v) { r.innerHTML = `<b class="t">Ajoutez vos affaires</b><p>Choisissez la taille de votre logement ou ajoutez vos objets un par un.</p>`; return; }
  const n = libresTotal(t), deux = besoin > 50;
  r.innerHTML = `<b class="t">${t === "C" ? "Un casier" : "Un box de " + LIBELLE[t]}${deux ? ", ou deux boxes" : ""}</b><p>${deux ? "Votre volume dépasse un box de 20 m² : prévoyez deux boxes voisins." : `Il contient environ ${S.data.formules[t]?.volume || SECOURS[t].volume} m³, avec 15 % de marge pour circuler.`} ${eur(prixTaille(t))} par mois.</p><button class="btn btn-em" type="button" ${n ? "" : "disabled"}>${n ? `Voir les ${n} boxes libres` : "Complet pour l'instant"}</button>`;
  $("button", r).onclick = () => montrerTaille(t);
}

// ---------------------------------------------------------------- réservation
const R = { etape: 0, debut: null, assurance: null, accessoires: new Set(), code: "", prenom: "", nom: "", email: "", tel: "", cgv: false };
const dlg = $("#resa");
const demain = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };
function reserver() {
  if (!S.choix || !S.choix.libre || S.apercu) return;
  Object.assign(R, { etape: 0, debut: R.debut && R.debut >= demain() ? R.debut : demain(), assurance: R.assurance ?? (S.data.produits.assurances[0]?.id || null) });
  dessinerResa(); dlg.showModal();
}
function montants() {
  const b = S.choix, prix = prixTaille(b.taille);
  const a = S.data.produits.assurances.find(x => x.id === R.assurance);
  const acc = S.data.produits.accessoires.filter(x => R.accessoires.has(x.id));
  const promo = R.code.trim().toUpperCase() === "BIENVENUE";
  const frais = S.data.produits.fraisDossier?.prix || 0;
  const mensuel = prix + (a ? a.prix : 0);
  const aujourdhui = (promo ? 0 : prix) + (a ? a.prix : 0) + frais + acc.reduce((s, x) => s + x.prix, 0);
  return { prix, a, acc, promo, frais, mensuel, aujourdhui };
}
function vignette(b) {
  const pts = S.zones.etages[b.etage][b.nom].map(q => q.join(",")).join(" ");
  return `<div class="vignette"><img src="/img/etage-${b.etage}.webp" alt=""><svg viewBox="0 0 1536 1024"><polygon points="${pts}" fill="rgba(242,140,40,.85)" stroke="#B85F12" stroke-width="6"/></svg></div>`;
}
function dessinerResa() {
  const b = S.choix, m = montants(), c = $("#resa-corps");
  $$(".suivi span").forEach((s, i) => s.classList.toggle("fait", i <= R.etape));
  $("#resa-retour").hidden = R.etape === 0 || R.etape === 3;
  $("#resa-suite").disabled = false;
  $("#resa-pied").hidden = R.etape === 3;
  $("#resa-total").innerHTML = `<b>${eur(m.aujourdhui)}</b>aujourd'hui, puis ${eur(m.mensuel)} par mois`;
  if (R.etape === 0) {
    $("#resa-suite").textContent = "Continuer";
    const as = S.data.produits.assurances.map(a => `<label><input type="radio" name="assurance" value="${a.id}" ${R.assurance === a.id ? "checked" : ""}><span>${esc(a.nom.replace("Assurance contenu — ", "Biens couverts jusqu'à "))}<small>Vol, incendie, dégât des eaux</small></span><em>${eur(a.prix)} / mois</em></label>`).join("");
    const ac = S.data.produits.accessoires.map(a => `<label><input type="checkbox" name="acc" value="${a.id}" ${R.accessoires.has(a.id) ? "checked" : ""}><span>${esc(a.nom)}<small>${esc(a.description)}</small></span><em>${eur(a.prix)}</em></label>`).join("");
    c.innerHTML = `<div class="resa-etape"><h2 id="resa-titre">Votre box</h2><p class="sous">Vérifiez votre choix et la date d'entrée.</p>
      <div class="recap-box">${vignette(b)}<div><b>Box ${esc(b.nom)}</b><small>${LIBELLE[b.taille]}, ${NOMS[b.etage]}</small><small>${eur(m.prix)} par mois</small></div></div>
      <label class="champ"><span>Date d'entrée</span><input type="date" name="debut" min="${demain()}" max="${new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}" value="${R.debut}" required></label>
      <div class="champ"><span>Assurance de vos biens</span><div class="choix">${as}<label><input type="radio" name="assurance" value="" ${R.assurance ? "" : "checked"}><span>J'ai déjà une assurance<small>Votre assurance habitation doit couvrir le stockage</small></span><em>0 €</em></label></div></div>
      ${ac ? `<div class="champ"><span>À ajouter</span><div class="choix">${ac}</div></div>` : ""}
      <div class="champ"><span>Code promo</span><div class="code"><input type="text" name="code" value="${esc(R.code)}" placeholder="BIENVENUE" autocomplete="off" style="width:100%;border:1.5px solid var(--ligne);border-radius:14px;padding:14px 16px;font-size:16px;text-transform:uppercase"></div><div class="msg-code ${m.promo ? "ok" : R.code ? "ko" : ""}">${m.promo ? "Premier mois offert." : R.code ? "Ce code n'est pas reconnu." : "Essayez BIENVENUE : le premier mois est offert."}</div></div></div>`;
    c.oninput = e => {
      const t = e.target;
      if (t.name === "debut") R.debut = t.value;
      if (t.name === "assurance") R.assurance = t.value ? Number(t.value) : null;
      if (t.name === "acc") t.checked ? R.accessoires.add(Number(t.value)) : R.accessoires.delete(Number(t.value));
      if (t.name === "code") { R.code = t.value; const ok = montants().promo, mc = $(".msg-code", c); mc.className = "msg-code " + (ok ? "ok" : t.value ? "ko" : ""); mc.textContent = ok ? "Premier mois offert." : t.value ? "Ce code n'est pas reconnu." : "Essayez BIENVENUE : le premier mois est offert."; }
      const mm = montants(); $("#resa-total").innerHTML = `<b>${eur(mm.aujourdhui)}</b>aujourd'hui, puis ${eur(mm.mensuel)} par mois`;
    };
  } else if (R.etape === 1) {
    $("#resa-suite").textContent = "Continuer";
    c.innerHTML = `<div class="resa-etape"><h2 id="resa-titre">Vos coordonnées</h2><p class="sous">Pour votre contrat et l'envoi de votre code d'accès.</p>
      <div class="deux"><label class="champ"><span>Prénom</span><input type="text" name="prenom" autocomplete="given-name" value="${esc(R.prenom)}" required></label><label class="champ"><span>Nom</span><input type="text" name="nom" autocomplete="family-name" value="${esc(R.nom)}" required></label></div>
      <label class="champ"><span>E-mail</span><input type="email" name="email" autocomplete="email" value="${esc(R.email)}" required></label>
      <label class="champ"><span>Téléphone <small style="font-weight:400;color:var(--gris)">facultatif</small></span><input type="tel" name="tel" autocomplete="tel" value="${esc(R.tel)}"></label>
      <label class="sr">Ne pas remplir<input type="text" name="site" tabindex="-1" autocomplete="off"></label>
      <p class="erreur" role="alert"></p></div>`;
    c.oninput = e => { const t = e.target; if (t.name in R) R[t.name] = t.value; };
    setTimeout(() => $("input[name=prenom]", c)?.focus(), 50);
  } else if (R.etape === 2) {
    $("#resa-suite").textContent = `Payer ${eur(m.aujourdhui)} et réserver`;
    const lignes = [[`Box ${b.nom}, premier mois`, m.promo ? `<s>${eur(m.prix)}</s> 0 €` : eur(m.prix)], ...(m.a ? [[m.a.nom.replace("Assurance contenu — ", "Assurance "), eur(m.a.prix)]] : []), ["Frais de dossier", eur(m.frais)], ...m.acc.map(x => [x.nom, eur(x.prix)])];
    c.innerHTML = `<div class="resa-etape"><h2 id="resa-titre">Paiement</h2><p class="sous">Entrée le ${new Date(R.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.</p>
      <div class="carte-demo"><small>Carte de démonstration</small><div class="num">4242 4242 4242 4242</div><small>${esc((R.prenom + " " + R.nom).trim()) || "Votre nom"} &nbsp; 12/29</small></div>
      <p class="avert">Démonstration : aucun paiement n'est demandé ni enregistré. Le contrat, lui, est vraiment créé dans Nexudus.</p>
      <ul class="lignes">${lignes.map(([a, v]) => `<li><span>${esc(a)}</span><span>${v}</span></li>`).join("")}<li class="t"><span>À payer aujourd'hui</span><span>${eur(m.aujourdhui)}</span></li><li><span>Ensuite, chaque mois</span><span>${eur(m.mensuel)}</span></li></ul>
      <label class="cgv"><input type="checkbox" name="cgv" ${R.cgv ? "checked" : ""}><span>J'accepte les conditions de location : location au mois, sans engagement, préavis de ${S.data.formules[b.taille]?.preavis || 15} jours.</span></label>
      <p class="erreur" role="alert"></p></div>`;
    c.oninput = e => { if (e.target.name === "cgv") R.cgv = e.target.checked; };
  }
}
$("#resa-form").addEventListener("submit", async e => {
  e.preventDefault();
  const c = $("#resa-corps"), err = $(".erreur", c);
  if (R.etape === 0) { if (!R.debut || R.debut < demain()) { alerte("Choisissez une date d'entrée à partir de demain."); return; } R.etape = 1; return dessinerResa(); }
  if (R.etape === 1) {
    if (!R.prenom.trim() || !R.nom.trim()) return (err.textContent = "Indiquez votre prénom et votre nom.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(R.email.trim())) return (err.textContent = "Cette adresse e-mail n'est pas valide.");
    R.etape = 2; return dessinerResa();
  }
  if (R.etape === 2) {
    if (!R.cgv) return (err.textContent = "Cochez les conditions de location pour continuer.");
    const bt = $("#resa-suite"); bt.disabled = true; bt.textContent = "Réservation en cours…"; err.textContent = "";
    try {
      const r = await fetch("/api/reserver", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ box: S.choix.id, debut: R.debut, assurance: R.assurance, accessoires: [...R.accessoires], code: R.code, prenom: R.prenom, nom: R.nom, email: R.email, tel: R.tel, cgv: R.cgv, site: $("input[name=site]")?.value || "" }) });
      const d = await r.json().catch(() => ({ ok: false, erreur: "Réponse illisible." }));
      if (!d.ok) { err.textContent = d.erreur || "La réservation n'a pas pu être enregistrée."; bt.disabled = false; dessinerResaPied(); if (r.status === 409) actualiser(); return; }
      R.etape = 3; confirmer(d);
      actualiser();
    } catch { err.textContent = "Connexion impossible. Vérifiez votre réseau et réessayez."; bt.disabled = false; dessinerResaPied(); }
  }
});
function dessinerResaPied() { const m = montants(); $("#resa-suite").textContent = `Payer ${eur(m.aujourdhui)} et réserver`; }
function alerte(t) { let p = $(".erreur", $("#resa-corps")); if (!p) { p = el("p", { class: "erreur", role: "alert" }); $("#resa-corps").append(p); } p.textContent = t; }
function confirmer(d) {
  $$(".suivi span").forEach(s => s.classList.add("fait"));
  $("#resa-pied").hidden = true;
  const jour = new Date(d.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("#resa-corps").innerHTML = `<div class="resa-etape confirme"><div class="sceau"><svg viewBox="0 0 48 48" fill="none"><path d="M12 25l8 8 16-17" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h2 id="resa-titre">Le box ${esc(d.box.nom)} est à vous.</h2><p class="sous">Rendez-vous ${jour}, ${NOMS[d.box.etage].toLowerCase()}. Votre code d'accès arrive par e-mail la veille.</p>
    <div class="recap-box" style="text-align:left">${vignette({ ...S.choix })}<div><b>${eur(d.aPayer)} payés</b><small>puis ${eur(d.mensuel)} par mois${d.promo ? ", premier mois offert" : ""}</small></div></div>
    <span class="ref">Réservation ${esc(d.reference)}</span>
    <p class="sous" style="margin-top:18px;font-size:14px">Le client, le contrat et le box attribué sont créés dans Nexudus. Le box apparaît maintenant comme loué dans l'immeuble.</p>
    <button class="btn btn-em" type="button" id="resa-fin" style="margin-top:8px">Voir mon box dans l'immeuble</button></div>`;
  $("#resa-fin").onclick = () => dlg.close();
}
$("#resa-retour").onclick = () => { if (R.etape > 0 && R.etape < 3) { R.etape--; dessinerResa(); } };
$("#resa-fermer").onclick = () => dlg.close();
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener("close", () => { if (R.etape === 3) { R.etape = 0; R.cgv = false; } });

// ---------------------------------------------------------------- mise à jour régulière
async function actualiser() {
  if (S.apercu) return;
  try {
    const d = await fetch("/api/inventaire").then(r => r.json());
    if (!d.ok) return;
    S.data = d; index();
    if (S.choix) S.choix = PARID.get(S.choix.id) || null;
    peindre(); fiche(); echelle(); calcul();
  } catch { /* on garde l'état affiché */ }
}

// ---------------------------------------------------------------- assistant
const H = [];
const fil = $("#fil"), agent = $("#agent"), abtn = $("#agent-btn");
function bulleIA(txt, qui = "ia") {
  const m = el("div", { class: "m " + qui });
  m.innerHTML = esc(txt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  fil.append(m); fil.scrollTop = fil.scrollHeight; return m;
}
function ouvrirAgent() {
  agent.hidden = false; abtn.classList.add("cache"); abtn.setAttribute("aria-expanded", "true");
  if (!H.length && !fil.children.length) bulleIA("Bonjour. Dites-moi ce que vous voulez stocker, je vous trouve la bonne taille et un box libre.");
  setTimeout(() => $("#agent-champ").focus(), 200);
}
abtn.onclick = ouvrirAgent;
$("#agent-fermer").onclick = () => { agent.hidden = true; abtn.classList.remove("cache"); abtn.setAttribute("aria-expanded", "false"); abtn.focus(); };
$$("#suggestions button").forEach(b => (b.onclick = () => envoyer(b.textContent)));
$("#agent-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#agent-champ").value.trim(); if (v) envoyer(v); });
let occupe = false;
async function envoyer(txt) {
  if (occupe) return; occupe = true;
  $("#suggestions").hidden = true; $("#agent-champ").value = "";
  bulleIA(txt, "moi"); H.push({ role: "user", content: txt });
  const att = bulleIA("", "ia ecrit"); att.innerHTML = "<i></i><i></i><i></i>";
  try {
    const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historique: H }) });
    const d = await r.json().catch(() => ({}));
    att.remove();
    if (!d.ok) { bulleIA(d.erreur || "L'assistant ne répond pas pour le moment."); H.pop(); }
    else {
      bulleIA(d.texte || "C'est noté."); H.push({ role: "assistant", content: d.texte || "C'est noté." });
      for (const a of d.actions || []) {
        if (a.type === "box") { $("#immeuble").scrollIntoView({ behavior: reduit ? "auto" : "smooth" }); const b = PARID.get(a.id); if (b) setTimeout(() => choisir(b, a.reserver), 500); }
        if (a.type === "simulateur") $("#simulateur").scrollIntoView({ behavior: reduit ? "auto" : "smooth" });
      }
    }
  } catch { att.remove(); bulleIA("Connexion impossible. Réessayez dans un instant."); H.pop(); }
  occupe = false;
}

// ---------------------------------------------------------------- en-tête
const nav = $("#nav"), hero = $(".hero");
new IntersectionObserver(([e]) => nav.classList.toggle("claire", !e.isIntersecting), { rootMargin: "-80px 0px 0px 0px" }).observe(hero);
// Le bouton de l'assistant n'apparaît qu'après l'accueil, pour laisser la barre d'étapes lisible.
new IntersectionObserver(([e]) => { if (agent.hidden) abtn.classList.toggle("cache", e.intersectionRatio > .35); }, { threshold: [0, .35, 1] }).observe(hero);

// ---------------------------------------------------------------- démarrage
charger().then(() => {
  construire(); placer(); fiche(); echelle(); simulateur(); entree();
  setInterval(() => { if (!document.hidden && !dlg.open) actualiser(); }, 30e3);
}).catch(e => { console.error(e); $("#source").textContent = "Le plan de l'immeuble n'a pas pu être chargé. Rechargez la page."; });
