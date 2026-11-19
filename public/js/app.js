// StockBox : accueil, petite fenêtre (centre puis taille), immeuble et réservation dans la page, assistant.
import { $, $$, el, G, esc, eur, S, TAILLES, LIBELLE, EMPRISE, IDEAL, libresTotal, prix, preavis, ilYa, charger, actualiser, boxParId, reduit } from "./commun.js?v=20261119181701";
import { initImmeuble, entrer as entrerImmeuble, rafraichir } from "./immeuble.js?v=20261119181701";
import { initTailles, majTailles, initSimu } from "./tailles.js?v=20261119181701";
import { initResa, entrerResa, finale } from "./resa.js?v=20261119181701";

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
  $$("[data-libres]").forEach(e => (e.textContent = `${libresTotal()} boxes libres`));
  $$("[data-preavis]").forEach(e => (e.textContent = preavis()));
  $("#tarifs").innerHTML = TAILLES.map(t => `<li><b>${t === "C" ? "Casier" : LIBELLE[t]}</b><span>${eur(prix(t))}</span></li>`).join("");
  const a = S.data.activite || {}, rec = a.recents || [];
  const cols = ["#0F5C45", "#F28C28", "#3B7A66", "#C9681A", "#13241E"];
  $("#visages").innerHTML = rec.slice(0, 3).map((r, i) => `<span style="background:${cols[i % cols.length]}">${esc((r.prenom || "?")[0])}</span>`).join("");
  $("#preuve-txt").textContent = a.semaine ? `${a.semaine} réservations cette semaine` : a.loues ? `${a.loues} boxes loués` : `${libresTotal()} boxes libres`;
  $("#chiffres").innerHTML = [[a.loues ?? 0, "boxes loués"], [a.semaine ?? 0, "réservés cette semaine"], [libresTotal(), "libres en ce moment"]].map(([n, t]) => `<div><b data-compte="${n}">${comptes ? n : 0}</b><span>${t}</span></div>`).join("");
  const min = Math.min(...TAILLES.map(prix));
  $("#cta-sous-txt").textContent = `${libresTotal()} libres à Saint-Ouen, dès ${eur(min)} par mois`;
  if (document.querySelector(".onglet")) majTailles();
  fil(); dock();
}
new IntersectionObserver((es, io) => { if (!es.some(e => e.isIntersecting)) return; comptes = true; $$("[data-compte]").forEach(e => { const o = { v: 0 }; G.to(o, { v: Number(e.dataset.compte), duration: 1.4, ease: "power2.out", onUpdate: () => (e.textContent = Math.round(o.v)) }); }); io.disconnect(); }, { threshold: .4 }).observe($("#chiffres"));

let filT = null;
function fil() {
  const rec = (S.data.activite?.recents || []).filter(r => r.box), z = $("#fil-direct"); clearInterval(filT);
  if (!rec.length) { z.hidden = true; return; }
  z.hidden = false; let i = 0;
  const montre = () => { const r = rec[i++ % rec.length], t = $("#fil-txt"); t.classList.add("sort"); setTimeout(() => { t.textContent = `${r.prenom || "Un client"} a réservé le box ${r.box}, ${ilYa(r.quand)}.`; t.classList.remove("sort"); }, 350); };
  montre(); filT = setInterval(montre, 4500);
}
const AVIS = [
  ["« Box réservé le dimanche soir, j'y étais le lundi matin avec la camionnette. »", "Camille, box de 10 m²"],
  ["« Le monte-charge est juste en face de mon box. Parfait pour le stock de ma boutique. »", "Margaux, box de 5 m²"],
  ["« On choisit son box sur le plan, on paie, et on a son code. Simple. »", "Karim, box de 2 m²"],
  ["« Propre, éclairé, accessible tôt le matin. Exactement ce qu'il me fallait. »", "Thomas, box de 20 m²"],
];
let ai = 0;
setInterval(() => { const f = $("#b-avis"); f.classList.add("sort"); setTimeout(() => { ai = (ai + 1) % AVIS.length; $("#b-avis-txt").textContent = AVIS[ai][0]; $("#b-avis-qui").textContent = AVIS[ai][1]; f.classList.remove("sort"); }, 450); }, 5200);

// ---------------------------------------------------------------- barre du bas : toujours l'action suivante
const dockEl = $("#dock"), abtn = $("#agent-btn");
let heroVu = true;
function dock() {
  const b = S.choix, info = $("#dock-info"), bt = $("#dock-btn");
  if (b && b.libre && !S.apercu) {
    info.innerHTML = `<span class="choisi"><b>Box ${esc(b.nom)}, ${LIBELLE[b.taille]}</b><small>${eur(prix(b.taille))} par mois, sans engagement</small></span>`;
    bt.textContent = "Réserver"; bt.onclick = () => reserver();
  } else {
    info.innerHTML = `<span class="point" style="display:inline-block;margin-right:8px;vertical-align:middle"></span><b>${libresTotal()} boxes libres</b> à Saint-Ouen`;
    bt.textContent = "Choisir mon box"; bt.onclick = () => ouvrirChoix();
  }
  dockEl.classList.toggle("vu", !heroVu && !$("#choix").open && $("#reserver").hidden);
}
new IntersectionObserver(([e]) => { heroVu = e.isIntersecting; abtn.classList.toggle("sur-hero", heroVu); abtn.classList.toggle("compact", !heroVu); dock(); }, { threshold: .15 }).observe($(".hero"));

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
    const c = el("div", { class: "offre-ag" }, `<span><b>Box ${esc(o.nom)}</b><small>${o.taille === "C" ? "Casier" : LIBELLE[o.taille]}, ${esc(o.etage_nom)}, ${eur(o.prix_mensuel)} par mois</small></span><span class="act"><button class="voir" type="button">Voir</button><button class="resa-ag" type="button">Réserver</button></span>`);
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
