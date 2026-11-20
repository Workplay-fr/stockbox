// StockBox : accueil, petite fenêtre (centre puis taille), immeuble et réservation dans la page, assistant.
import { $, $$, el, G, esc, eur, S, TAILLES, LIBELLE, EMPRISE, IDEAL, libresTotal, compteurs, boxes, nomBox, prix, preavis, ilYa, charger, actualiser, boxParId, reduit } from "./commun.js?v=20261120152201";
import { initImmeuble, entrer as entrerImmeuble, rafraichir, ouvrir as ouvrirEtage } from "./immeuble.js?v=20261120152201";
import { initTailles, majTailles, initSimu } from "./tailles.js?v=20261120152201";
import { initResa, entrerResa, finale } from "./resa.js?v=20261120152201";

const CENTRES = [
  { nom: "Saint-Ouen", sous: "14 passage des Malles, Les Puces", ouvert: true },
  { nom: "Clichy", sous: "Berges de Seine", st: "Complet" },
  { nom: "Paris 19e", sous: "La Villette", st: "Liste d'attente" },
  { nom: "Montreuil", sous: "Croix-de-Chavaux", st: "Complet" },
  { nom: "Issy-les-Moulineaux", sous: "Bords de Seine", st: "Complet" },
  { nom: "Pantin", sous: "Canal de l'Ourcq", st: "Ouverture en 2027" },
];
const RAPIDE = [["Quelques cartons", "C"], ["Un studio", "5"], ["Un 2 pièces", "10"], ["Un 3 pièces et plus", "20"]];

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
  $$("[data-libres]").forEach(e => (e.textContent = `${K.libres} boxes libres`));
  $$("[data-preavis]").forEach(e => (e.textContent = preavis()));
  $("#tarifs").innerHTML = TAILLES.map(t => `<li><button type="button" class="tarif" data-taille="${t}" aria-label="Voir les ${t === "C" ? "casiers" : "boxes de " + LIBELLE[t]} dans l'immeuble, ${eur(prix(t))} par mois"><b>${t === "C" ? "Casier" : LIBELLE[t]}</b><span>${eur(prix(t))}<small>/mois</small></span></button></li>`).join("");
  $$("#tarifs .tarif").forEach(b => (b.onclick = () => montrer(b.dataset.taille)));
  const rec = S.data.activite?.recents || [];
  const cols = ["#0F5C45", "#F28C28", "#3B7A66", "#C9681A", "#13241E"];
  if ($("#visages")) $("#visages").innerHTML = rec.slice(0, 3).map((r, i) => `<span style="background:${cols[i % cols.length]}">${esc((r.prenom || "?")[0])}</span>`).join("");
  if ($("#preuve-txt")) $("#preuve-txt").textContent = `${K.loues} boxes loués`;
  // Tableau de bord du bâtiment : trois indicateurs calculés depuis Nexudus
  const act = S.data.activite || {}, der = (act.recents || [])[0];
  const taux = K.total ? Math.round(K.loues / K.total * 100) : 0;
  const anc = act.anciennete;
  const kpis = [
    [taux, " %", "occupation"],
    [anc ?? "—", anc === 1 ? " mois" : " mois", "ancienneté moyenne"],
    [null, der ? ilYa(der.quand) : "—", "dernière réservation"],
  ];
  const z = $("#chiffres");
  if (z.children.length === kpis.length) kpis.forEach(([n, u], i) => { const b = z.children[i].querySelector("b"); if (n === null) { b.textContent = u; return; } b.dataset.compte = n; b.dataset.unite = u; if (comptes || typeof n !== "number") b.textContent = n + u; });
  else z.innerHTML = kpis.map(([n, u, t]) => n === null ? `<div><b>${esc(u)}</b><span>${t}</span></div>` : `<div><b ${typeof n === "number" ? `data-compte="${n}" data-unite="${u}"` : ""}>${typeof n === "number" ? (comptes ? n : 0) : n}${u}</b><span>${t}</span></div>`).join("");
  carteEtages(); journal();
  const sousCta = $("#cta-sous-txt"); if (sousCta) sousCta.textContent = `${K.libres} libres à Saint-Ouen, dès ${eur(Math.min(...TAILLES.map(prix)))} par mois`;
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
  const montre = () => { const r = rec[i++ % rec.length], t = $("#fil-txt"); t.classList.add("sort"); setTimeout(() => { t.textContent = `${r.prenom || "Un client"} a réservé le ${nomBox(r.box, true)}, ${ilYa(r.quand)}.`; t.classList.remove("sort"); }, 350); };
  montre(); filT = setInterval(montre, 4500);
}
// Mini-carte : un carré par box, étage par étage ; un clic ouvre l'étage dans la 3D.
function carteEtages() {
  const c = $("#carte-etages"); if (!c) return;
  const NOMS_E = { "2": "2ᵉ", "1": "1ᵉʳ", "0": "RDC" };
  c.innerHTML = ["2", "1", "0"].map(n => {
    const bx = [...boxes(n)].sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
    const l = bx.filter(b => b.libre).length;
    return `<button type="button" class="ce-ligne" data-n="${n}" aria-label="${NOMS_E[n]} étage : ${l} libres sur ${bx.length}, voir dans l'immeuble"><span class="ce-nom">${NOMS_E[n]}</span><span class="ce-cases">${bx.map(b => `<i class="${b.libre ? "l" : "o"}"></i>`).join("")}</span><span class="ce-nb">${l}<small>/${bx.length}</small></span></button>`;
  }).join("") + `<p class="ce-leg"><i class="l"></i>Libre <i class="o"></i>Loué</p>`;
  $$(".ce-ligne", c).forEach(b => (b.onclick = () => { S.filtre = null; cacherResa(); defiler($("#immeuble")).then(() => { entrerImmeuble(null); ouvrirEtage(b.dataset.n); }); }));
}
// Journal : les dernières réservations lues dans Nexudus, horodatées.
function journal() {
  const j = $("#journal"); if (!j) return;
  const rec = (S.data.activite?.recents || []).filter(r => r.box).slice(0, 5);
  const heure = q => { const d = new Date(q), auj = new Date(); const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === auj.toDateString() ? h : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " + h; };
  const tailleDe = nom => { for (const n of ["0", "1", "2"]) { const b = boxes(n).find(x => x.nom === nom); if (b) return b.taille; } return null; };
  j.hidden = !rec.length;
  j.innerHTML = rec.map(r => { const t = tailleDe(r.box); return `<li><time>${esc(heure(r.quand))}</time><b>${esc(nomBox(r.box))}</b><span>${t && t !== "C" ? esc(LIBELLE[t]) : ""}</span><em>réservé en ligne</em></li>`; }).join("");
}

const AVIS = [
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
    info.innerHTML = `<span class="choisi"><b>${esc(nomBox(b))}${b.taille === "C" ? "" : ", " + LIBELLE[b.taille]}</b><small>${eur(prix(b.taille))} par mois, sans engagement</small></span>`;
    bt.textContent = "Réserver"; bt.onclick = () => reserver();
  } else {
    info.innerHTML = `<span class="point" style="display:inline-block;margin-right:8px;vertical-align:middle"></span><b>${compteurs().libres} boxes libres</b> à Saint-Ouen`;
    bt.textContent = "Choisir mon box"; bt.onclick = () => ouvrirChoix();
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
    const b = el("button", { class: "tc", type: "button", ...(n ? {} : { disabled: "" }) }, `<span class="emp"><i style="width:${w * 11}px;height:${d * 11}px"></i></span><b>${t === "C" ? "Casier" : LIBELLE[t]}</b><span class="p">${eur(prix(t))}</span><small>${n ? `${n} libres` : "Complet"}</small>`);
    b.onclick = () => choisirTaille(t);
    g.append(b);
  }
  const sp = $("#sais-pas"); sp.innerHTML = "";
  for (const [txt, t] of RAPIDE) { const b = el("button", { type: "button" }, `${txt} <small>· ${t === "C" ? "casier" : LIBELLE[t]}</small>`); b.onclick = () => choisirTaille(t); sp.append(b); }
}

// Temps de trajet entre l'adresse du visiteur et le centre (API Adresse de data.gouv.fr, estimation à vol d'oiseau corrigée).
const CENTRE_SO = { lat: 48.9030, lon: 2.3405 };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
$("#trajet-ouvrir").onclick = () => { const f = $("#trajet-form"), o = f.hidden; f.hidden = !o; $("#trajet-ouvrir").setAttribute("aria-expanded", String(o)); if (o) { G.fromTo(f, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .35, ease: "power3.out" }); $("#trajet-adresse").focus(); } };
$("#trajet-form").addEventListener("submit", async e => {
  e.preventDefault();
  const q = $("#trajet-adresse").value.trim(), rep = $("#trajet-rep"); if (q.length < 3) return;
  rep.textContent = "Calcul en cours…";
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`).then(r => r.json());
    const f = r.features && r.features[0];
    if (!f) { rep.textContent = "Adresse introuvable. Essayez avec la ville ou le code postal."; return; }
    const p = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }, d = km(p, CENTRE_SO) * 1.3;
    const voiture = Math.max(5, Math.round(d / 22 * 60 + 4)), velo = Math.round(d / 15 * 60), tc = Math.max(8, Math.round(d / 16 * 60 + 9));
    rep.innerHTML = `Depuis ${esc(f.properties.city || f.properties.label)} : <b>${voiture} min en voiture</b>${d < 12 ? `, ${velo} min à vélo` : ""}, environ ${tc} min en transports.`;
    G.fromTo(rep, { opacity: 0 }, { opacity: 1, duration: .4 });
  } catch { rep.textContent = "Le calcul n'est pas disponible pour le moment."; }
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
  $("#rappel").innerHTML = `<span class="puce"><span class="point" aria-hidden="true"></span>StockBox <b>Saint-Ouen</b></span><span class="puce">Box de <b>${t === "C" ? "casier" : LIBELLE[t]}</b>, ${libresTotal(t)} libres</span><button class="lien" type="button" id="changer">Changer</button>`;
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
  if (!filAg.children.length) bulleIA("Bonjour, je suis Atlas. Dites-moi ce que vous voulez stocker : je calcule le volume, je vous montre un box libre dans l'immeuble et je peux vous préparer un devis.");
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
    const c = el("div", { class: "offre-ag" }, `<span><b>${esc(nomBox(o.nom))}</b><small>${o.taille === "C" ? "Casier" : LIBELLE[o.taille]}, ${esc(o.etage_nom)}, ${eur(o.prix_mensuel)} par mois</small></span><span class="act"><button class="voir" type="button">Voir</button><button class="resa-ag" type="button">Réserver</button></span>`);
    const b = () => boxParId(o.id);
    c.querySelector(".voir").onclick = () => b() && montrerBox(b(), false);
    c.querySelector(".resa-ag").onclick = () => b() && montrerBox(b(), true);
    z.append(c);
  }
  filAg.append(z); filAg.scrollTop = filAg.scrollHeight;
}
function carteDevis(d) {
  const z = el("div", { class: "devis-ag" }, `<small>Devis enregistré</small><b>Box ${esc(d.box)}, ${eur(d.mensuel)} par mois</b><p>Référence ${esc(d.reference)}. Entrée le ${new Date(d.jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Vous le recevrez à ${esc(d.email)} après relecture par l'équipe.</p><button type="button">Réserver maintenant en ligne</button>`);
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
    const d = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historique: H, memo: memoAg }) }).then(r => r.json()).catch(() => ({}));
    att.remove();
    if (!d.ok) { bulleIA(d.erreur || "L'assistant ne répond pas pour le moment."); H.pop(); }
    else {
      if (d.memo) memoAg = d.memo;
      bulleIA(d.texte || "C'est noté."); H.push({ role: "assistant", content: d.texte || "C'est noté." });
      if (d.offres && d.offres.length) offres(d.offres);
      if (d.devis) { carteDevis(d.devis); actualiser().then(ok => ok && (accueil(), rafraichir())); }
      for (const a of d.actions || []) if (a.type === "box" && a.reserver) { const b = boxParId(a.id); if (b) montrerBox(b, true); }
    }
  } catch { att.remove(); bulleIA("Connexion impossible. Réessayez dans un instant."); H.pop(); }
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
