// StockBox : accueil, petite fenêtre (centre puis taille), immeuble et réservation dans la page, assistant.
import { $, $$, el, G, esc, eur, S, TAILLES, LIBELLE, EMPRISE, IDEAL, libresTotal, prix, preavis, ilYa, charger, actualiser, boxParId, reduit } from "./commun.js?v=20261119172954";
import { initImmeuble, entrer as entrerImmeuble, rafraichir } from "./immeuble.js?v=20261119172954";
import { initResa, entrerResa, finale } from "./resa.js?v=20261119172954";

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
  const c = $("#tailles"); c.innerHTML = "";
  for (const t of TAILLES) {
    const [w, d] = EMPRISE[t], n = libresTotal(t);
    const b = el("button", { class: "t-carte", type: "button" }, `<span class="emp"><i style="width:${w * 14}px;height:${d * 14}px"></i></span><b>${LIBELLE[t]}</b><span class="p">${eur(prix(t))} par mois</span><small>${IDEAL[t]}</small><span class="d">${n ? `${n} libres` : "Complet"}</span>`);
    b.onclick = () => montrer(t);
    c.append(b);
  }
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
    bt.textContent = "Trouver mon box"; bt.onclick = () => ouvrirChoix();
  }
  dockEl.classList.toggle("vu", !heroVu && !$("#choix").open && $("#reserver").hidden);
}
new IntersectionObserver(([e]) => { heroVu = e.isIntersecting; abtn.classList.toggle("cache", heroVu); dock(); }, { threshold: .15 }).observe($(".hero"));

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
const bulleIA = (txt, qui = "ia") => { const m = el("div", { class: "m " + qui }); m.innerHTML = esc(txt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); filAg.append(m); filAg.scrollTop = filAg.scrollHeight; return m; };
abtn.onclick = () => { agent.classList.remove("ferme"); agent.setAttribute("aria-hidden", "false"); abtn.classList.add("cache"); if (!filAg.children.length) bulleIA("Bonjour. Dites-moi ce que vous voulez stocker, je vous trouve la bonne taille et un box libre."); setTimeout(() => $("#agent-champ").focus(), 200); };
$("#agent-fermer").onclick = () => { agent.classList.add("ferme"); agent.setAttribute("aria-hidden", "true"); abtn.classList.remove("cache"); };
$$("#suggestions button").forEach(b => (b.onclick = () => envoyer(b.textContent)));
$("#agent-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#agent-champ").value.trim(); if (v) envoyer(v); });
let occupe = false;
async function envoyer(txt) {
  if (occupe) return; occupe = true;
  $("#suggestions").hidden = true; $("#agent-champ").value = "";
  bulleIA(txt, "moi"); H.push({ role: "user", content: txt });
  const att = bulleIA("", "ia ecrit"); att.innerHTML = "<i></i><i></i><i></i>";
  try {
    const d = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historique: H }) }).then(r => r.json()).catch(() => ({}));
    att.remove();
    if (!d.ok) { bulleIA(d.erreur || "L'assistant ne répond pas pour le moment."); H.pop(); }
    else {
      bulleIA(d.texte || "C'est noté."); H.push({ role: "assistant", content: d.texte || "C'est noté." });
      for (const a of d.actions || []) {
        if (a.type === "box") { const b = boxParId(a.id); if (b) { $("#agent-fermer").click(); cacherResa(); await defiler($("#immeuble")); S.choix = b; rappel(b.taille); entrerImmeuble(b.taille); if (a.reserver) setTimeout(reserver, 2800); } }
        if (a.type === "simulateur") { $("#agent-fermer").click(); ouvrirChoix("taille"); }
      }
    }
  } catch { att.remove(); bulleIA("Connexion impossible. Réessayez dans un instant."); H.pop(); }
  occupe = false;
}

// ---------------------------------------------------------------- démarrage
charger().then(() => {
  accueil();
  initImmeuble(() => reserver());
  initResa(async d => {
    $("#resa").hidden = true; $("#e-fin").hidden = false;
    finale(d, async () => { await actualiser(); accueil(); cacherResa(); await defiler($("#immeuble")); S.choix = boxParId(S.choix?.id) || null; rappel(S.filtre || S.choix?.taille || "5"); entrerImmeuble(S.filtre); }, async () => { cacherResa(); await defiler($(".hero")); });
    await actualiser(); accueil(); rafraichir();
  }, async () => { cacherResa(); await defiler($("#immeuble")); });
  setInterval(async () => { if (document.hidden || !$("#reserver").hidden) return; if (await actualiser()) { accueil(); rafraichir(); } }, 30e3);
  // La fiche du box choisi met à jour la barre du bas.
  new MutationObserver(dock).observe($("#fiche"), { childList: true });
}).catch(e => console.error(e));
