// StockBox : page d'accueil, orchestration de l'expérience « Trouver mon box » (4 étapes) et assistant.
import { $, $$, el, G, esc, eur, S, TAILLES, LIBELLE, EMPRISE, IDEAL, libresTotal, prix, preavis, ilYa, charger, actualiser, boxParId, reduit } from "./commun.js";
import { initCarte, entrerCarte, CENTRES } from "./carte.js";
import { initVolume, calcul } from "./volume.js";
import { initImmeuble, entrer as entrerImmeuble, choisir, rafraichir } from "./immeuble.js";
import { initResa, entrerResa, finale } from "./resa.js";

const xp = $("#xp");
let etape = -1, atteinte = 0;

// ---------------------------------------------------------------- accueil
function accueil() {
  $$("[data-libres]").forEach(e => (e.textContent = `${libresTotal()} boxes libres`));
  $$("[data-preavis]").forEach(e => (e.textContent = preavis()));
  const a = S.data.activite || {};
  // Preuve sociale : uniquement les chiffres de Nexudus.
  const rec = a.recents || [];
  if (rec.length || a.loues) {
    const cols = ["#0F5C45", "#F28C28", "#3B7A66", "#C9681A", "#13241E"];
    $("#visages").innerHTML = rec.slice(0, 4).map((r, i) => `<span style="background:${cols[i % cols.length]}">${esc((r.prenom || "?")[0])}</span>`).join("");
    $("#preuve-txt").textContent = a.semaine ? `${a.semaine} réservations cette semaine` : `${a.loues} boxes déjà loués`;
    $("#preuve").hidden = false;
  }
  $("#chiffres").innerHTML = [[a.loues ?? 0, "boxes loués"], [a.semaine ?? 0, "réservés cette semaine"], [libresTotal(), "libres en ce moment"]].map(([n, t]) => `<div><b data-compte="${n}">${comptes ? n : 0}</b><span>${t}</span></div>`).join("");
  const c = $("#tailles"); c.innerHTML = "";
  for (const t of TAILLES) {
    const [w, d] = EMPRISE[t], k = 14, n = libresTotal(t);
    const b = el("button", { class: "t-carte", type: "button" }, `<span class="emp"><i style="width:${w * k}px;height:${d * k}px"></i></span><b>${LIBELLE[t]}</b><span class="p">${eur(prix(t))} par mois</span><small>${IDEAL[t]}</small><span class="d">${n ? `${n} libres` : "Complet"}</span>`);
    b.onclick = () => ouvrirXP(2, t);
    c.append(b);
  }
  fil();
}
// Les chiffres comptent jusqu'à leur valeur quand la section apparaît.
let comptes = false;
new IntersectionObserver((es, io) => { if (!es.some(e => e.isIntersecting)) return; comptes = true; $$("[data-compte]").forEach(e => { const o = { v: 0 }; G.to(o, { v: Number(e.dataset.compte), duration: 1.4, ease: "power2.out", onUpdate: () => (e.textContent = Math.round(o.v)) }); }); io.disconnect(); }, { threshold: .4 }).observe($("#chiffres"));

// Dernières réservations, lues dans Nexudus, l'une après l'autre.
let filT = null;
function fil() {
  const rec = (S.data.activite?.recents || []).filter(r => r.box);
  const z = $("#fil-direct"); clearInterval(filT);
  if (!rec.length) { z.hidden = true; return; }
  z.hidden = false; let i = 0;
  const montre = () => { const r = rec[i++ % rec.length], t = $("#fil-txt"); t.classList.add("sort"); setTimeout(() => { t.textContent = `${r.prenom || "Un client"} a réservé le box ${r.box}, ${ilYa(r.quand)}.`; t.classList.remove("sort"); }, 350); };
  montre(); filT = setInterval(montre, 4500);
}

// Le bouton du bas n'apparaît qu'une fois l'accueil dépassé.
const dock = $("#dock"), abtn = $("#agent-btn");
new IntersectionObserver(([e]) => { const loin = !e.isIntersecting; dock.classList.toggle("vu", loin && !xp.open); abtn.classList.toggle("cache", !loin || xp.open); }, { threshold: .15 }).observe($(".hero"));
$$("[data-ouvrir]").forEach(b => b.addEventListener("click", () => ouvrirXP(0)));

// ---------------------------------------------------------------- l'expérience
function ouvrirXP(n = 0, taille) {
  if (!xp.open) {
    xp.showModal(); document.body.classList.add("bloque"); dock.classList.remove("vu"); abtn.classList.add("cache");
    G.fromTo(".xp-cadre", { scale: .92, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, duration: .7, ease: "power4.out" });
  }
  if (n >= 1) S.centre = S.centre || CENTRES[0];
  atteinte = Math.max(atteinte, n);
  aller(n, { taille });
}
function fermerXP() {
  G.to(".xp-cadre", { scale: .95, opacity: 0, y: 30, duration: .35, ease: "power2.in", onComplete: () => { xp.close(); G.set(".xp-cadre", { clearProps: "all" }); } });
}
xp.addEventListener("close", () => { document.body.classList.remove("bloque"); const loin = $(".hero").getBoundingClientRect().bottom < innerHeight * .15; dock.classList.toggle("vu", loin); abtn.classList.toggle("cache", !loin); });
xp.addEventListener("cancel", e => { e.preventDefault(); fermerXP(); });
$("#xp-fermer").onclick = fermerXP;
$$("#etapes button").forEach(b => (b.onclick = () => { const n = Number(b.dataset.e); if (n <= atteinte && !(n === 3 && !S.choix)) aller(n, { taille: n === 2 ? S.filtre : undefined }); }));

function aller(n, o = {}) {
  const avant = $(`.ecran[data-ecran="${etape}"]`), apres = $(`.ecran[data-ecran="${n}"]`);
  const sens = n > etape ? 1 : -1;
  atteinte = Math.max(atteinte, Math.min(n, 3));
  etape = n;
  $$("#etapes button").forEach(b => { const k = Number(b.dataset.e); b.toggleAttribute("aria-current", false); if (k === Math.min(n, 3)) b.setAttribute("aria-current", "step"); b.classList.toggle("fait", k < n); b.disabled = k > atteinte || (k === 3 && !S.choix); });
  if (avant && avant !== apres) G.to(avant, { opacity: 0, x: -60 * sens, duration: .45, ease: "power2.in", onComplete: () => { avant.classList.remove("actif"); G.set(avant, { clearProps: "all" }); } });
  apres.classList.add("actif");
  G.fromTo(apres, { opacity: 0, x: 80 * sens }, { opacity: 1, x: 0, duration: .65, ease: "power3.out", delay: avant && avant !== apres ? .2 : 0 });
  if (n === 0) entrerCarte();
  if (n === 1) calcul(false);
  if (n === 2) setTimeout(() => entrerImmeuble(o.taille === undefined ? S.filtre : o.taille), 120);
  if (n === 3) entrerResa();
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
        if (a.type === "box") { const b = boxParId(a.id); if (b) { S.choix = b; S.filtre = b.taille; ouvrirXP(2, b.taille); if (a.reserver) setTimeout(() => aller(3), 2600); $("#agent-fermer").click(); } }
        if (a.type === "simulateur") { ouvrirXP(1); $("#agent-fermer").click(); }
      }
    }
  } catch { att.remove(); bulleIA("Connexion impossible. Réessayez dans un instant."); H.pop(); }
  occupe = false;
}

// ---------------------------------------------------------------- démarrage
charger().then(() => {
  accueil();
  initCarte(() => aller(1));
  initVolume(t => aller(2, { taille: t }));
  initImmeuble(() => aller(3));
  initResa(async d => {
    aller(4);
    finale(d, async () => { await actualiser(); accueil(); S.choix = boxParId(S.choix?.id) || S.choix; aller(2, { taille: null }); }, fermerXP);
    await actualiser(); accueil(); rafraichir();
  }, () => aller(2, { taille: S.filtre }));
  setInterval(async () => { if (document.hidden || etape === 3) return; if (await actualiser()) { accueil(); rafraichir(); } }, 30e3);
}).catch(e => console.error(e));
