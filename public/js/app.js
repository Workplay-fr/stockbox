// StockBox : accueil, petite fenêtre (centre puis taille), immeuble et réservation dans la page, assistant.
import { $, $$, L, EN, LOC, el, G, esc, eur, S, TAILLES, LIBELLE, EMPRISE, IDEAL, libresTotal, compteurs, boxes, nomBox, prix, preavis, ilYa, charger, actualiser, boxParId, reduit } from "./commun.js?v=20261121094908";
import { initImmeuble, entrer as entrerImmeuble, rafraichir, ouvrir as ouvrirEtage } from "./immeuble.js?v=20261121094908";
import { initTailles, majTailles, initSimu } from "./tailles.js?v=20261121094908";
import { initResa, entrerResa, finale } from "./resa.js?v=20261121094908";

const CENTRES = [
  { nom: "Saint-Ouen", sous: L("14 passage des Malles, Les Puces", "14 passage des Malles, flea market"), ouvert: true },
  { nom: "Clichy", sous: L("Berges de Seine", "Seine riverside"), st: L("Complet", "Full") },
  { nom: L("Paris 19e", "Paris 19th"), sous: "La Villette", st: L("Liste d'attente", "Waiting list") },
  { nom: "Montreuil", sous: "Croix-de-Chavaux", st: L("Complet", "Full") },
  { nom: "Issy-les-Moulineaux", sous: L("Bords de Seine", "Seine riverside"), st: L("Complet", "Full") },
  { nom: "Pantin", sous: L("Canal de l'Ourcq", "Ourcq canal"), st: L("Ouverture en 2027", "Opening in 2027") },
];
const RAPIDE = EN ? [["A few boxes", "C"], ["A studio flat", "5"], ["A one-bedroom flat", "10"], ["Two bedrooms or more", "20"]] : [["Quelques cartons", "C"], ["Un studio", "5"], ["Un 2 pièces", "10"], ["Un 3 pièces et plus", "20"]];

// Défilement doux de la page jusqu'à un élément (une seconde environ).
const defiler = cible => new Promise(r => {
  const y = cible.getBoundingClientRect().top + scrollY;
  if (reduit || !window.gsap) { scrollTo(0, y); return r(); }
  const o = { y: scrollY };
  G.to(o, { y, duration: 1.05, ease: "power3.inOut", onUpdate: () => scrollTo(0, o.y), onComplete: r });
});

// ---------------------------------------------------------------- accueil
let comptes = false;
function accueil() {
  const K = compteurs();   // une seule source pour tous les chiffres de la page
  $$("[data-libres]").forEach(e => (e.textContent = L(`${K.libres} boxes libres`, `${K.libres} units available`)));
  $$("[data-preavis]").forEach(e => (e.textContent = preavis()));
  $("#tarifs").innerHTML = TAILLES.map(t => `<li><button type="button" class="tarif" data-taille="${t}" aria-label="${L(`Voir les ${t === "C" ? "casiers" : "boxes de " + LIBELLE[t]} dans l'immeuble, ${eur(prix(t))} par mois`, `See the ${t === "C" ? "lockers" : LIBELLE[t] + " units"} in the building, ${eur(prix(t))} a month`)}"><b>${LIBELLE[t]}</b><span>${eur(prix(t))}<small>${L("/mois", "/mo")}</small></span></button></li>`).join("");
  $$("#tarifs .tarif").forEach(b => (b.onclick = () => montrer(b.dataset.taille)));
  const rec = S.data.activite?.recents || [];
  const cols = ["#0F5C45", "#F28C28", "#3B7A66", "#C9681A", "#13241E"];
  if ($("#visages")) $("#visages").innerHTML = rec.slice(0, 3).map((r, i) => `<span style="background:${cols[i % cols.length]}">${esc((r.prenom || "?")[0])}</span>`).join("");
  if ($("#preuve-txt")) $("#preuve-txt").textContent = L(`${K.loues} boxes loués`, `${K.loues} units rented`);
  // Tableau de bord du bâtiment : trois indicateurs calculés depuis Nexudus
  const act = S.data.activite || {}, der = (act.recents || [])[0];
  const taux = K.total ? Math.round(K.loues / K.total * 100) : 0;
  const anc = act.anciennete;
  const kpis = [
    [taux, L(" %", "%"), L("occupation", "occupancy")],
    [anc ?? "—", EN ? (anc === 1 ? " month" : " months") : " mois", L("ancienneté moyenne", "average stay so far")],
    [null, der ? ilYa(der.quand) : "—", L("dernière réservation", "latest booking")],
  ];
  const z = $("#chiffres");
  if (z.children.length === kpis.length) kpis.forEach(([n, u], i) => { const b = z.children[i].querySelector("b"); if (n === null) { b.textContent = u; return; } b.dataset.compte = n; b.dataset.unite = u; if (comptes || typeof n !== "number") b.textContent = n + u; });
  else z.innerHTML = kpis.map(([n, u, t]) => n === null ? `<div><b>${esc(u)}</b><span>${t}</span></div>` : `<div><b ${typeof n === "number" ? `data-compte="${n}" data-unite="${u}"` : ""}>${typeof n === "number" ? (comptes ? n : 0) : n}${u}</b><span>${t}</span></div>`).join("");
  carteEtages(); journal();
  const sousCta = $("#cta-sous-txt"); if (sousCta) sousCta.textContent = L(`${K.libres} libres à Saint-Ouen, dès ${eur(Math.min(...TAILLES.map(prix)))} par mois`, `${K.libres} available in Saint-Ouen, from ${eur(Math.min(...TAILLES.map(prix)))} a month`);
  if (document.querySelector(".onglet")) majTailles();
  fil(); dock();
}
// Le décompte animé part de zéro une seule fois, et se termine toujours sur la valeur à jour.
new IntersectionObserver((es, io) => {
  if (!es.some(e => e.isIntersecting)) return; comptes = true;
  $$("[data-compte]").forEach(e => { const o = { v: 0 }; G.to(o, { v: Number(e.dataset.compte), duration: 1.4, ease: "power2.out", onUpdate: () => (e.textContent = Math.round(o.v) + (e.dataset.unite || "")), onComplete: () => (e.textContent = e.dataset.compte + (e.dataset.unite || "")) }); });
  io.disconnect();
}, { threshold: .4 }).observe($("#chiffres"));

let filT = null;
function fil() {
  const rec = (S.data.activite?.recents || []).filter(r => r.box), z = $("#fil-direct"); clearInterval(filT);
  if (!z) return;
  if (!rec.length) { z.hidden = true; return; }
  z.hidden = false; let i = 0;
  const montre = () => { const r = rec[i++ % rec.length], t = $("#fil-txt"); t.classList.add("sort"); setTimeout(() => { t.textContent = EN ? `${r.prenom || "A customer"} booked ${nomBox(r.box)}, ${ilYa(r.quand)}.` : `${r.prenom || "Un client"} a réservé le ${nomBox(r.box, true)}, ${ilYa(r.quand)}.`; t.classList.remove("sort"); }, 350); };
  montre(); filT = setInterval(montre, 4500);
}
// Mini-carte : un carré par box, étage par étage ; un clic ouvre l'étage dans la 3D.
function carteEtages() {
  const c = $("#carte-etages"); if (!c) return;
  const NOMS_E = EN ? { "2": "2nd", "1": "1st", "0": "Ground" } : { "2": "2ᵉ", "1": "1ᵉʳ", "0": "RDC" };
  c.innerHTML = ["2", "1", "0"].map(n => {
    const bx = [...boxes(n)].sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
    const l = bx.filter(b => b.libre).length;
    return `<button type="button" class="ce-ligne" data-n="${n}" aria-label="${L(`${NOMS_E[n]} étage : ${l} libres sur ${bx.length}, voir dans l'immeuble`, `${NOMS_E[n]} floor: ${l} of ${bx.length} available, see in the building`)}"><span class="ce-nom">${NOMS_E[n]}</span><span class="ce-cases">${bx.map(b => `<i class="${b.libre ? "l" : "o"}"></i>`).join("")}</span><span class="ce-nb">${l}<small>/${bx.length}</small></span></button>`;
  }).join("") + `<p class="ce-leg"><i class="l"></i>${L("Libre", "Available")} <i class="o"></i>${L("Loué", "Rented")}</p>`;
  $$(".ce-ligne", c).forEach(b => (b.onclick = () => { S.filtre = null; cacherResa(); defiler($("#immeuble")).then(() => { entrerImmeuble(null); ouvrirEtage(b.dataset.n); }); }));
}
// Journal : les dernières réservations lues dans Nexudus, horodatées.
function journal() {
  const j = $("#journal"); if (!j) return;
  const rec = (S.data.activite?.recents || []).filter(r => r.box).slice(0, 5);
  const heure = q => { const d = new Date(q), auj = new Date(); const h = d.toLocaleTimeString(LOC, { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === auj.toDateString() ? h : d.toLocaleDateString(LOC, { day: "2-digit", month: "2-digit" }) + " " + h; };
  const tailleDe = nom => { for (const n of ["0", "1", "2"]) { const b = boxes(n).find(x => x.nom === nom); if (b) return b.taille; } return null; };
  j.hidden = !rec.length;
  j.innerHTML = rec.map(r => { const t = tailleDe(r.box); return `<li><time>${esc(heure(r.quand))}</time><b>${esc(nomBox(r.box))}</b><span>${t && t !== "C" ? esc(LIBELLE[t]) : ""}</span><em>${L("réservé en ligne", "booked online")}</em></li>`; }).join("");
}

const AVIS = EN ? [
  ["“I booked on Sunday evening and was there on Monday morning with the van.”", "Camille, 10 m² unit"],
  ["“The goods lift is right in front of my unit. Perfect for my shop stock.”", "Margaux, 5 m² unit"],
  ["“You choose your unit on the plan, pay, and get your code. Simple.”", "Karim, 2 m² unit"],
  ["“Clean, well lit, open early in the morning. Exactly what I needed.”", "Thomas, 20 m² unit"],
] : [
  ["« Box réservé le dimanche soir, j'y étais le lundi matin avec la camionnette. »", "Camille, box de 10 m²"],
  ["« Le monte-charge est juste en face de mon box. Parfait pour le stock de ma boutique. »", "Margaux, box de 5 m²"],
  ["« On choisit son box sur le plan, on paie, et on a son code. Simple. »", "Karim, box de 2 m²"],
  ["« Propre, éclairé, accessible tôt le matin. Exactement ce qu'il me fallait. »", "Thomas, box de 20 m²"],
];
let ai = 0;
setInterval(() => { const f = $("#b-avis"); if (!f) return; f.classList.add("sort"); setTimeout(() => { ai = (ai + 1) % AVIS.length; $("#b-avis-txt").textContent = AVIS[ai][0]; $("#b-avis-qui").textContent = AVIS[ai][1]; f.classList.remove("sort"); }, 450); }, 5200);

// ---------------------------------------------------------------- barre du bas : toujours l'action suivante
const dockEl = $("#dock"), abtn = $("#agent-btn");
let heroVu = true;
function dock() {
  const b = S.choix, info = $("#dock-info"), bt = $("#dock-btn");
  if (b && b.libre && !S.apercu) {
    info.innerHTML = `<span class="choisi"><b>${esc(nomBox(b))}${b.taille === "C" ? "" : ", " + LIBELLE[b.taille]}</b><small>${L(`${eur(prix(b.taille))} par mois, sans engagement`, `${eur(prix(b.taille))} a month, no commitment`)}</small></span>`;
    bt.textContent = L("Réserver", "Book"); bt.onclick = () => reserver();
  } else {
    info.innerHTML = `<span class="point" style="display:inline-block;margin-right:8px;vertical-align:middle"></span>${L(`<b>${compteurs().libres} boxes libres</b> à Saint-Ouen`, `<b>${compteurs().libres} units available</b> in Saint-Ouen`)}`;
    bt.textContent = L("Choisir mon box", "Choose my unit"); bt.onclick = () => ouvrirChoix();
  }
  dockEl.classList.toggle("vu", !ctaVu && !immVu && !ctaSocVu && !$("#choix").open && $("#reserver").hidden);
}
let ctaVu = true, immVu = false, ctaSocVu = false;
new IntersectionObserver(([e]) => { heroVu = e.isIntersecting; abtn.classList.toggle("sur-hero", heroVu); abtn.classList.toggle("compact", !heroVu); dock(); }, { threshold: .15 }).observe($(".hero"));
new IntersectionObserver(([e]) => { ctaVu = e.isIntersecting; dock(); }).observe($(".cta-hero"));
new IntersectionObserver(([e]) => { immVu = e.isIntersecting; dock(); }, { threshold: .25 }).observe($("#immeuble"));
if ($(".avis-cta")) new IntersectionObserver(([e]) => { ctaSocVu = e.isIntersecting; dock(); }).observe($(".avis-cta"));

// ---------------------------------------------------------------- petite fenêtre : le centre, puis la taille
const choix = $("#choix");
function ouvrirChoix(vue = "centre") {
  remplirChoix();
  montrerVue(vue, false);
  if (!choix.open) { choix.showModal(); G.fromTo(".choix-in", { opacity: 0, y: 30, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: "power4.out" }); }
  dock();
}
function fermerChoix() { return new Promise(r => G.to(".choix-in", { opacity: 0, y: 40, scale: .94, duration: .35, ease: "power2.in", onComplete: () => { choix.close(); G.set(".choix-in", { clearProps: "all" }); r(); } })); }
choix.addEventListener("cancel", e => { e.preventDefault(); fermerChoix(); });
choix.addEventListener("click", e => { if (e.target === choix) fermerChoix(); });
choix.addEventListener("close", dock);
$("#choix-fermer").onclick = fermerChoix;
$("#retour-centre").onclick = () => montrerVue("centre");
$$("[data-ouvrir]").forEach(b => (b.onclick = () => ouvrirChoix()));

function montrerVue(v, anime = true) {
  const av = $(".vue.on", choix), ap = $(`.vue[data-vue="${v}"]`, choix);
  $$(".choix-pas i", choix).forEach((i, k) => i.classList.toggle("on", k <= (v === "taille" ? 1 : 0)));
  if (av === ap) return;
  if (!anime) { av?.classList.remove("on"); ap.classList.add("on"); return; }
  const s = v === "taille" ? 1 : -1;
  G.to(av, { opacity: 0, x: -40 * s, duration: .22, ease: "power2.in", onComplete: () => { av.classList.remove("on"); G.set(av, { clearProps: "all" }); ap.classList.add("on"); G.fromTo(ap, { opacity: 0, x: 40 * s }, { opacity: 1, x: 0, duration: .4, ease: "power3.out" }); G.fromTo($$(".tc, .centre", ap), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, stagger: .04, ease: "power3.out" }); } });
}
function remplirChoix() {
  const ul = $("#centres"); ul.innerHTML = "";
  for (const c of CENTRES) {
    const b = el("button", { class: "centre" + (c.ouvert ? " ouvert" : ""), type: "button", ...(c.ouvert ? {} : { disabled: "" }) },
      `${c.ouvert ? `<img src="/img/facade-768.webp" alt="">` : `<span class="vign"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg></span>`}<span><b>StockBox ${esc(c.nom)}</b><small>${esc(c.sous)}</small></span><span class="st">${c.ouvert ? `${libresTotal()} libres` : c.st}</span>`);
    if (c.ouvert) b.onclick = () => montrerVue("taille");
    const li = el("li"); li.append(b); ul.append(li);
  }
  const g = $("#tailles-choix"); g.innerHTML = "";
  for (const t of TAILLES) {
    const [w, d] = EMPRISE[t], n = libresTotal(t);
    const b = el("button", { class: "tc", type: "button", ...(n ? {} : { disabled: "" }) }, `<span class="emp"><i style="width:${w * 11}px;height:${d * 11}px"></i></span><b>${LIBELLE[t]}</b><span class="p">${eur(prix(t))}</span><small>${n ? L(`${n} libres`, `${n} available`) : L("Complet", "Full")}</small>`);
    b.onclick = () => choisirTaille(t);
    g.append(b);
  }
  const sp = $("#sais-pas"); sp.innerHTML = "";
  for (const [txt, t] of RAPIDE) { const b = el("button", { type: "button" }, `${txt} <small>· ${t === "C" ? L("casier", "locker") : LIBELLE[t]}</small>`); b.onclick = () => choisirTaille(t); sp.append(b); }
}

// Temps de trajet entre l'adresse du visiteur et le centre (API Adresse de data.gouv.fr, estimation à vol d'oiseau corrigée).
const CENTRE_SO = { lat: 48.9030, lon: 2.3405 };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
$("#trajet-ouvrir").onclick = () => { const f = $("#trajet-form"), o = f.hidden; f.hidden = !o; $("#trajet-ouvrir").setAttribute("aria-expanded", String(o)); if (o) { G.fromTo(f, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .35, ease: "power3.out" }); $("#trajet-adresse").focus(); } };
$("#trajet-form").addEventListener("submit", async e => {
  e.preventDefault();
  const q = $("#trajet-adresse").value.trim(), rep = $("#trajet-rep"); if (q.length < 3) return;
  rep.textContent = L("Calcul en cours…", "Calculating…");
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`).then(r => r.json());
    const f = r.features && r.features[0];
    if (!f) { rep.textContent = L("Adresse introuvable. Essayez avec la ville ou le code postal.", "Address not found. Try a town or a French postcode."); return; }
    const p = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }, d = km(p, CENTRE_SO) * 1.3;
    const voiture = Math.max(5, Math.round(d / 22 * 60 + 4)), velo = Math.round(d / 15 * 60), tc = Math.max(8, Math.round(d / 16 * 60 + 9));
    rep.innerHTML = EN ? `From ${esc(f.properties.city || f.properties.label)}: <b>${voiture} min by car</b>${d < 12 ? `, ${velo} min by bike` : ""}, about ${tc} min by public transport.` : `Depuis ${esc(f.properties.city || f.properties.label)} : <b>${voiture} min en voiture</b>${d < 12 ? `, ${velo} min à vélo` : ""}, environ ${tc} min en transports.`;
    G.fromTo(rep, { opacity: 0 }, { opacity: 1, duration: .4 });
  } catch { rep.textContent = L("Le calcul n'est pas disponible pour le moment.", "Travel time is not available right now."); }
});

// La fenêtre se ferme, la page descend jusqu'à l'immeuble, les données sont relues et l'immeuble se met en place.
async function choisirTaille(t) {
  S.centre = CENTRES[0]; S.choix = null;
  const maj = actualiser();
  await fermerChoix();
  cacherResa();
  await Promise.all([defiler($("#immeuble")), maj]);
  accueil(); rappel(t);
  entrerImmeuble(t);
}
function montrer(t) { S.choix = null; cacherResa(); defiler($("#immeuble")).then(() => { rappel(t); entrerImmeuble(t); }); }
function rappel(t) {
  $("#rappel").innerHTML = `<span class="puce"><span class="point" aria-hidden="true"></span>StockBox <b>Saint-Ouen</b></span><span class="puce">${EN ? `<b>${LIBELLE[t]}</b> units, ${libresTotal(t)} available` : `Box de <b>${t === "C" ? "casier" : LIBELLE[t]}</b>, ${libresTotal(t)} libres`}</span><button class="lien" type="button" id="changer">${L("Changer", "Change")}</button>`;
  $("#changer").onclick = () => ouvrirChoix("taille");
}

// L'immeuble s'affiche au repos dès qu'on arrive dessus en faisant défiler.
new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting) && S.data) { if (!S.filtre && !S.choix) entrerImmeuble(null, true); io.disconnect(); } }, { threshold: .3 }).observe($("#immeuble"));

// ---------------------------------------------------------------- réservation dans la page
function cacherResa() { $("#reserver").hidden = true; dock(); }
async function reserver() {
  if (!S.choix || S.apercu) return;
  const r = $("#reserver");
  r.hidden = false; $("#resa").hidden = false; $("#e-fin").hidden = true;
  entrerResa(); dock();
  await defiler(r);
}

// ---------------------------------------------------------------- assistant
const H = [], filAg = $("#fil"), agent = $("#agent");
let memoAg = { devis: null };
const bulleIA = (txt, qui = "ia") => { const m = el("div", { class: "m " + qui }); m.innerHTML = esc(txt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); filAg.append(m); filAg.scrollTop = filAg.scrollHeight; return m; };
function ouvrirAgent() {
  agent.classList.remove("ferme"); agent.setAttribute("aria-hidden", "false"); abtn.classList.add("cache"); $("#agent-bulle").hidden = true;
  if (!filAg.children.length) bulleIA(L("Bonjour, je suis Atlas. Dites-moi ce que vous voulez stocker : je calcule le volume, je vous montre un box libre dans l'immeuble et je peux vous préparer un devis.", "Hello, I'm Atlas. Tell me what you want to store: I'll work out the volume, show you an available unit in the building and can prepare a quote for you."));
  setTimeout(() => $("#agent-champ").focus(), 200);
}
abtn.onclick = ouvrirAgent;
$$("[data-atlas]").forEach(b => (b.onclick = ouvrirAgent));
$("#ab-ouvrir").onclick = ouvrirAgent;
$("#ab-fermer").onclick = () => { $("#agent-bulle").hidden = true; try { sessionStorage.setItem("sb-bulle", "1"); } catch {} };
$("#agent-fermer").onclick = () => { agent.classList.add("ferme"); agent.setAttribute("aria-hidden", "true"); abtn.classList.remove("cache"); };
$$("#suggestions button").forEach(b => (b.onclick = () => envoyer(b.textContent)));
$("#agent-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#agent-champ").value.trim(); if (v) envoyer(v); });
// Petite bulle d'accueil, une fois par visite.
setTimeout(() => { let vu = false; try { vu = !!sessionStorage.getItem("sb-bulle"); } catch {} if (!vu && agent.classList.contains("ferme") && !$("#choix").open) { $("#agent-bulle").hidden = false; try { sessionStorage.setItem("sb-bulle", "1"); } catch {} } }, 7000);

async function montrerBox(b, resa) {
  agent.classList.add("ferme"); agent.setAttribute("aria-hidden", "true"); abtn.classList.remove("cache");
  cacherResa(); await defiler($("#immeuble")); S.choix = b; rappel(b.taille); entrerImmeuble(b.taille);
  if (resa) setTimeout(reserver, 2800);
}
function offres(list) {
  const z = el("div", { class: "offres-ag" });
  for (const o of list) {
    const c = el("div", { class: "offre-ag" }, `<span><b>${esc(nomBox(o.nom))}</b><small>${LIBELLE[o.taille]}, ${esc(o.etage_nom)}, ${eur(o.prix_mensuel)} ${L("par mois", "a month")}</small></span><span class="act"><button class="voir" type="button">${L("Voir", "View")}</button><button class="resa-ag" type="button">${L("Réserver", "Book")}</button></span>`);
    const b = () => boxParId(o.id);
    c.querySelector(".voir").onclick = () => b() && montrerBox(b(), false);
    c.querySelector(".resa-ag").onclick = () => b() && montrerBox(b(), true);
    z.append(c);
  }
  filAg.append(z); filAg.scrollTop = filAg.scrollHeight;
}
function carteDevis(d) {
  const z = el("div", { class: "devis-ag" }, EN ? `<small>Quote saved</small><b>${esc(nomBox(d.box))}, ${eur(d.mensuel)} a month</b><p>Reference ${esc(d.reference)}. Move-in on ${new Date(d.jour + "T12:00:00").toLocaleDateString(LOC, { day: "numeric", month: "long" })}. You will receive it at ${esc(d.email)} once the team has reviewed it.</p><button type="button">Book online now</button>` : `<small>Devis enregistré</small><b>Box ${esc(d.box)}, ${eur(d.mensuel)} par mois</b><p>Référence ${esc(d.reference)}. Entrée le ${new Date(d.jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Vous le recevrez à ${esc(d.email)} après relecture par l'équipe.</p><button type="button">Réserver maintenant en ligne</button>`);
  z.querySelector("button").onclick = () => { const b = boxParId(d.id); if (b) montrerBox(b, true); };
  filAg.append(z); filAg.scrollTop = filAg.scrollHeight;
}
let occupe = false;
async function envoyer(txt) {
  if (occupe) return; occupe = true;
  $("#suggestions").hidden = true; $("#agent-champ").value = "";
  bulleIA(txt, "moi"); H.push({ role: "user", content: txt });
  const att = bulleIA("", "ia ecrit"); att.innerHTML = "<i></i><i></i><i></i>";
  try {
    const d = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historique: H, memo: memoAg, langue: EN ? "en" : "fr" }) }).then(r => r.json()).catch(() => ({}));
    att.remove();
    if (!d.ok) { bulleIA(d.erreur || L("L'assistant ne répond pas pour le moment.", "The assistant is not responding right now.")); H.pop(); }
    else {
      if (d.memo) memoAg = d.memo;
      bulleIA(d.texte || L("C'est noté.", "Noted.")); H.push({ role: "assistant", content: d.texte || L("C'est noté.", "Noted.") });
      if (d.offres && d.offres.length) offres(d.offres);
      if (d.devis) { carteDevis(d.devis); actualiser().then(ok => ok && (accueil(), rafraichir())); }
      for (const a of d.actions || []) if (a.type === "box" && a.reserver) { const b = boxParId(a.id); if (b) montrerBox(b, true); }
    }
  } catch { att.remove(); bulleIA(L("Connexion impossible. Réessayez dans un instant.", "Cannot connect. Please try again in a moment.")); H.pop(); }
  occupe = false;
}

// La façade animée se cale exactement comme l'image (couverture, ancrée à 62 % de la hauteur), pour que ciel, végétation et lumière tombent juste.
const decor = $("#decor"), heroEl = $(".hero");
function caler() { const W = heroEl.clientWidth, H = heroEl.clientHeight; let w = W, h = W / 1.5; if (h < H) { h = H; w = H * 1.5; } Object.assign(decor.style, { width: w + "px", height: h + "px", left: (W - w) / 2 + "px", top: (H - h) * .62 + "px" }); }
caler(); new ResizeObserver(caler).observe(heroEl);
{ const e = $("#etoiles"); let html = ""; for (let i = 0; i < 90; i++) html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--t:${(2 + Math.random() * 3).toFixed(1)}s;--d:${(Math.random() * 3).toFixed(1)}s;${Math.random() < .15 ? "width:3px;height:3px;" : ""}"></i>`; e.innerHTML = html; }
{ const n = $("#nuages"); let html = ""; for (let i = 0; i < 7; i++) { const w = 18 + Math.random() * 26, t = 90 + Math.random() * 80; html += `<i style="--w:${w.toFixed(0)}%;--h:${(w * .16).toFixed(1)}%;--y:${(4 + Math.random() * 46).toFixed(0)}%;--o:${(.18 + Math.random() * .2).toFixed(2)};--t:${t.toFixed(0)}s;--d:-${(Math.random() * t).toFixed(0)}s"></i>`; } n.innerHTML = html; }
// Pause des animations du décor quand l'accueil n'est plus visible.
new IntersectionObserver(([en]) => decor.querySelectorAll(".d-nuages i,.d-nuit,.d-etoiles,.d-lueur").forEach(x => (x.style.animationPlayState = en.isIntersecting ? "running" : "paused")), { threshold: 0 }).observe(heroEl);

// Le bouton principal suit légèrement le pointeur.
const ctaH = $(".cta-hero");
if (ctaH && !reduit && matchMedia("(hover:hover)").matches) {
  const zone = $(".hero");
  zone.addEventListener("pointermove", e => { const r = ctaH.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy); const k = d < 220 ? (1 - d / 220) * .18 : 0; ctaH.style.setProperty("--mx", (dx * k).toFixed(1) + "px"); ctaH.style.setProperty("--my", (dy * k).toFixed(1) + "px"); });
  zone.addEventListener("pointerleave", () => { ctaH.style.setProperty("--mx", "0px"); ctaH.style.setProperty("--my", "0px"); });
}

// ---------------------------------------------------------------- démarrage
charger().then(() => {
  accueil();
  initImmeuble(() => reserver());
  initTailles(t => montrer(t)); initSimu();
  initResa(async d => {
    $("#resa").hidden = true; $("#e-fin").hidden = false;
    finale(d, async () => { await actualiser(); accueil(); cacherResa(); await defiler($("#immeuble")); S.choix = boxParId(S.choix?.id) || null; rappel(S.filtre || S.choix?.taille || "5"); entrerImmeuble(S.filtre); }, async () => { cacherResa(); await defiler($(".hero")); });
    await actualiser(); accueil(); rafraichir();
  }, async () => { cacherResa(); await defiler($("#immeuble")); });
  setInterval(async () => { if (document.hidden || !$("#reserver").hidden) return; if (await actualiser()) { accueil(); rafraichir(); } }, 30e3);
  // La fiche du box choisi met à jour la barre du bas.
  new MutationObserver(dock).observe($("#fiche"), { childList: true });
}).catch(e => console.error(e));

// ---------------------------------------------------------------- FAQ : accordéons qui s'ouvrent et se ferment en douceur
$$(".faq details").forEach(d => {
  const sum = d.querySelector("summary"), corps = d.querySelector("p");
  sum.addEventListener("click", e => {
    if (reduit || !corps.animate) return;
    e.preventDefault();
    if (d.open) {
      const h = corps.offsetHeight;
      corps.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 280, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = () => (d.open = false);
    } else {
      d.open = true; const h = corps.offsetHeight;
      corps.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  });
});

// ---------------------------------------------------------------- Accueil : une semaine dans la vie d'un centre StockBox avec Nexudus
// Cinq écrans animés, une fois par visite (relançable depuis le pied de page). Textes en français et en anglais.
{
  const d = $("#demo-pop");
  const MAIL = `mailto:matthias@nexudus.com?subject=${encodeURIComponent(L("Démo StockBox", "StockBox demo"))}`;
  const ic = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const ECRANS = [
    { k: L("Bonjour", "Hello"), t: L("Bienvenue sur StockBox.", "Welcome to StockBox."),
      p: L("Ce centre est fictif, mais tout ce que vous faites ici arrive en direct dans Nexudus, le logiciel qui le gère. Suivez une semaine dans sa vie.", "This centre is fictional, but everything you do here lands live in Nexudus, the software that runs it. Follow a week in its life."),
      v: `<div class="dv-lien"><span class="dv-logo sb">${ic('<path d="M12 2 21 7v10l-9 5-9-5V7Z" fill="#F28C28"/><path d="M12 2 21 7l-9 5-9-5Z" fill="#FFB061"/>')}<b>StockBox</b></span><span class="dv-flux"><i></i><i></i><i></i></span><span class="dv-logo nx"><b>Nexudus</b></span></div>` },
    { k: L("Lundi, 21 h", "Monday, 9 pm"), t: L("Un prospect, et personne à l'accueil.", "A prospect, and nobody at the desk."),
      p: L("Il écrit sur le site ou sur WhatsApp. L'IA de Nexudus lui répond à partir de vos données, lui montre un box libre et prépare le devis. Il l'accepte en ligne : la fiche arrive seule dans votre CRM.", "They message you on the website or WhatsApp. The Nexudus AI answers from your own data, shows them an available unit and prepares the quote. They accept it online, and the record lands in your CRM on its own."),
      v: `<div class="dv-chat"><p class="q">${L("Bonsoir, il vous reste un 5 m² ?", "Hi, do you still have a 5 m² unit?")}</p><p class="r">${L("Oui, le box 112, près du monte-charge. 139 € par mois. Je vous prépare le devis ?", "Yes, unit 112, near the goods lift. €139 a month. Shall I prepare the quote?")}</p></div><div class="dv-crm"><span>${L("Nouveau", "New")}</span><span>${L("Devis", "Quote")}</span><span>${L("Gagné", "Won")}</span><i class="carte">${L("Devis accepté", "Quote accepted")}</i></div>` },
    { k: L("Le 1er du mois", "The 1st of the month"), t: L("Les loyers tombent tout seuls.", "Rent comes in on its own."),
      p: L("Prélèvement SEPA automatique, factures marquées payées, assurance et cadenas facturés avec le loyer. Pour les deux impayés, l'IA a déjà préparé les relances : vous validez d'un clic.", "Automatic SEPA direct debit, invoices marked as paid, insurance and padlocks billed with the rent. For the two unpaid invoices, the AI has already drafted the reminders: approve them in one click."),
      v: `<div class="dv-loyers"><div class="ligne"><span>${L("Loyers prélevés", "Rent collected")}</span><b data-dv-n>0</b></div><div class="dv-jauge"><i></i></div><ul><li>${L("Factures envoyées", "Invoices sent")}</li><li>${L("Paiements rapprochés", "Payments reconciled")}</li><li class="att">${L("2 relances à valider", "2 reminders to approve")}</li></ul></div>` },
    { k: L("Mercredi, 7 h", "Wednesday, 7 am"), t: L("Les portes s'ouvrent sans clé.", "Doors open without keys."),
      p: L("Le téléphone du client ouvre le portail et son couloir : l'accès suit le contrat. Celui qui a résilié vendredi n'entre plus, sans que personne n'y touche. Une question ? Il ouvre une demande dans son espace, et l'IA répond depuis votre FAQ.", "The customer's phone opens the gate and their corridor: access follows the contract. Whoever cancelled last Friday can no longer get in, without anyone touching anything. A question? They open a request in their account, and the AI answers from your FAQ."),
      n: L("Compatible Salto KS, Kisi, Brivo, Paxton, Unifi Access et une quinzaine d'autres serrures connectées.", "Works with Salto KS, Kisi, Brivo, Paxton, Unifi Access and around fifteen other smart access systems."),
      v: `<div class="dv-acces"><div class="porte"><span class="voyant"></span></div><div class="tel">${ic('<rect x="7" y="2" width="10" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 18h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>')}</div><div class="badges"><span class="ok">${L("Accès ouvert", "Access granted")}</span><span class="non">${L("Contrat résilié", "Contract ended")}</span><span class="ticket">${L("Demande résolue", "Request resolved")}</span></div></div>` },
    { k: L("Vendredi", "Friday"), t: L("Tout votre centre sur un écran.", "Your whole centre on one screen."),
      p: L("Occupation, loyers, clients, site par site. Les chiffres ci-dessous sont ceux de cette démo, lus à l'instant dans Nexudus.", "Occupancy, rent, customers, site by site. The figures below are this demo's, read from Nexudus just now."),
      v: `<div class="dv-kpi"><div><b data-dv-k="taux">0</b><span>${L("occupation", "occupancy")}</span><i><s data-dv-g="taux"></s></i></div><div><b data-dv-k="loyers">0</b><span>${L("loyers par mois", "monthly rent")}</span><i><s data-dv-g="loyers"></s></i></div><div><b data-dv-k="loues">0</b><span>${L("boxes loués", "units rented")}</span><i><s data-dv-g="loues"></s></i></div></div>` },
  ];
  d.innerHTML = `<div class="dp-in" tabindex="-1" autofocus>
    <span class="dp-poignee" aria-hidden="true"></span>
    <div class="dp-haut"><span class="dp-badge">${L("Démonstration", "Demo")}</span><button class="dp-passer" type="button" data-fermer-demo>${L("Passer", "Skip")}</button><button class="dp-x" type="button" aria-label="${L("Fermer", "Close")}" data-fermer-demo>${ic('<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>')}</button></div>
    <div class="dp-ecrans">${ECRANS.map((e, i) => `<section class="dp-ecran" data-i="${i}" ${i ? 'aria-hidden="true"' : ""}><div class="dp-vis" aria-hidden="true">${e.v}</div><p class="dp-k">${e.k}</p><h2 id="dp-titre-${i}">${e.t}</h2><p class="dp-p">${e.p}</p>${e.n ? `<p class="dp-n">${e.n}</p>` : ""}</section>`).join("")}</div>
    <div class="dp-bas"><div class="dp-points" role="tablist" aria-label="${L("Étapes", "Steps")}">${ECRANS.map((_, i) => `<button type="button" role="tab" aria-label="${L("Écran", "Screen")} ${i + 1}" data-aller="${i}"></button>`).join("")}</div>
      <div class="dp-actions"><a class="dp-mail" href="${MAIL}">${L("Parler à Matthias", "Talk to Matthias")}</a><button class="btn dp-ok" type="button" id="dp-suite">${L("Suivant", "Next")}</button></div></div>
  </div>`;
  const inn = $(".dp-in", d), ecrans = $$(".dp-ecran", d), points = $$(".dp-points button", d), suite = $("#dp-suite");
  let i = 0;
  // Chiffres réels de la démo pour le dernier écran.
  function chiffres() {
    const K = compteurs(), tous = ["0", "1", "2"].flatMap(boxes);
    const loyers = tous.filter(b => !b.libre).reduce((t, b) => t + prix(b.taille), 0);
    const val = { taux: K.total ? Math.round(K.loues / K.total * 100) : 0, loyers, loues: K.loues };
    const fmt = { taux: v => v + L(" %", "%"), loyers: v => eur(Math.round(v)), loues: v => String(Math.round(v)) };
    const part = { taux: val.taux / 100, loyers: Math.min(1, loyers / Math.max(1, tous.reduce((t, b) => t + prix(b.taille), 0))), loues: K.total ? K.loues / K.total : 0 };
    for (const k of Object.keys(val)) {
      const b = $(`[data-dv-k="${k}"]`, d), g = $(`[data-dv-g="${k}"]`, d), o = { v: 0 };
      if (reduit) { b.textContent = fmt[k](val[k]); g.style.transform = `scaleX(${part[k]})`; continue; }
      G.to(o, { v: val[k], duration: 1.4, ease: "power2.out", delay: .2, onUpdate: () => (b.textContent = fmt[k](o.v)) });
      g.style.transform = "scaleX(0)"; requestAnimationFrame(() => requestAnimationFrame(() => (g.style.transform = `scaleX(${part[k]})`)));
    }
  }
  function loyersEcran() {
    const n = $("[data-dv-n]", d), cible = Math.max(1, compteurs().loues), o = { v: 0 };
    if (reduit) { n.textContent = cible; return; }
    G.to(o, { v: cible, duration: 1.6, ease: "power2.out", delay: .3, onUpdate: () => (n.textContent = Math.round(o.v)) });
  }
  function montrer(n) {
    i = Math.max(0, Math.min(ECRANS.length - 1, n));
    ecrans.forEach((e, k) => { e.classList.toggle("on", k === i); e.classList.toggle("avant", k < i); e.setAttribute("aria-hidden", String(k !== i)); });
    points.forEach((p, k) => p.setAttribute("aria-selected", String(k === i)));
    d.setAttribute("aria-labelledby", `dp-titre-${i}`);
    const fin = i === ECRANS.length - 1;
    suite.textContent = fin ? L("Découvrir le site", "Explore the site") : L("Suivant", "Next");
    $(".dp-passer", d).hidden = fin;
    if (i === 2) loyersEcran();
    if (fin) chiffres();
  }
  const fermer = () => {
    if (!d.open || d.classList.contains("sort")) return;
    try { sessionStorage.setItem("sb-demo", "1"); } catch {}
    d.classList.add("sort"); setTimeout(() => { d.close(); d.classList.remove("sort"); inn.style.transform = ""; }, reduit ? 0 : 260);
  };
  const ouvrirAccueil = () => { if (d.open) return; montrer(0); d.showModal(); };
  suite.onclick = () => (i === ECRANS.length - 1 ? fermer() : montrer(i + 1));
  points.forEach(p => (p.onclick = () => montrer(Number(p.dataset.aller))));
  $$("[data-fermer-demo]", d).forEach(b => (b.onclick = fermer));
  $$("[data-accueil]").forEach(b => (b.onclick = ouvrirAccueil));
  d.addEventListener("cancel", e => { e.preventDefault(); fermer(); });
  d.addEventListener("click", e => { if (e.target === d) fermer(); });
  d.addEventListener("keydown", e => { if (e.key === "ArrowRight") montrer(i + 1); if (e.key === "ArrowLeft") montrer(i - 1); });
  // Mobile : glisser à gauche ou à droite pour changer d'écran, vers le bas pour fermer.
  let x0 = null, y0 = null;
  inn.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  inn.addEventListener("touchmove", e => { if (y0 === null) return; const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0; if (dy > 0 && dy > Math.abs(dx)) inn.style.transform = `translateY(${dy}px)`; }, { passive: true });
  inn.addEventListener("touchend", e => {
    if (y0 === null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = y0 = null;
    if (dy > 70 && dy > Math.abs(dx)) return fermer();
    inn.style.transform = "";
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) montrer(i + (dx < 0 ? 1 : -1));
  });
  let vu = false; try { vu = sessionStorage.getItem("sb-demo") === "1"; } catch {}
  if (d.showModal && !vu) setTimeout(ouvrirAccueil, 600);
}
