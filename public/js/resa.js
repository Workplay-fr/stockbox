// Étape 4 : réservation (paiement simulé, contrat réel dans Nexudus), puis la porte du box qui s'ouvre.
import { $, $$, el, G, esc, eur, S, NOMS, LIBELLE, prix, preavis, reduit } from "./commun.js?v=20261119174135";

const R = { etape: 0, debut: null, assurance: undefined, accessoires: new Set(), code: "", prenom: "", nom: "", email: "", tel: "", cgv: false };
let surFin = () => {}, surRetour = () => {};
const demain = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

export function initResa(fin, retour) {
  surFin = fin; surRetour = retour;
  $("#resa-form").addEventListener("submit", envoyer);
  $("#resa-retour").onclick = () => { if (R.etape > 0) { R.etape--; dessiner(); } else surRetour(); };
}

export function entrerResa() {
  const b = S.choix; if (!b) return;
  R.etape = 0; R.cgv = false;
  if (!R.debut || R.debut < demain()) R.debut = demain();
  if (R.assurance === undefined) R.assurance = S.data.produits.assurances[0]?.id ?? null;
  visuel(b); dessiner();
}

// Le box choisi, vu de près : on part de l'étage entier et on zoome sur lui.
function visuel(b) {
  const pts = S.zones.etages[b.etage][b.nom], H = S.zones.kz * S.zones.hauteur;
  const cx = pts.reduce((s, q) => s + q[0], 0) / 4, cy = pts.reduce((s, q) => s + q[1], 0) / 4 - H / 2;
  const haut = pts.map(([x, y]) => [x, y - H]);
  const c = $("#resa-visuel");
  c.innerHTML = `<svg class="zoombox" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/img/etage-${b.etage}.webp" width="1536" height="1024"/>
    <polygon points="${pts.map(q => q.join(",")).join(" ")}" fill="rgba(242,140,40,.8)" stroke="#B85F12" stroke-width="2"/>
    ${pts.map((q, i) => `<line x1="${q[0]}" y1="${q[1]}" x2="${haut[i][0]}" y2="${haut[i][1]}" stroke="#F28C28" stroke-width="2"/>`).join("")}
    <polygon points="${haut.map(q => q.join(",")).join(" ")}" fill="rgba(242,140,40,.3)" stroke="#F28C28" stroke-width="2"/></svg>
    <div class="carton"><b>Box ${esc(b.nom)}</b><span>${LIBELLE[b.taille]}, ${NOMS[b.etage].toLowerCase()}, ${eur(prix(b.taille))} par mois</span><br><span style="font-size:14px">StockBox Saint-Ouen, 14 passage des Malles</span></div>`;
  const svg = $("svg", c), vb = { x: 0, y: 0, w: 1536, h: 1024 }, w = ["C", "2"].includes(b.taille) ? 360 : 520;
  const maj = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  G.to(vb, { x: cx - w / 2, y: cy - w * .38, w, h: w * .76, duration: reduit ? 0 : 1.6, ease: "power3.inOut", delay: .3, onUpdate: maj });
}

function montants() {
  const b = S.choix, p = prix(b.taille);
  const a = S.data.produits.assurances.find(x => x.id === R.assurance);
  const acc = S.data.produits.accessoires.filter(x => R.accessoires.has(x.id));
  const promo = R.code.trim().toUpperCase() === "BIENVENUE";
  const frais = S.data.produits.fraisDossier?.prix || 0;
  return { p, a, acc, promo, frais, mensuel: p + (a ? a.prix : 0), aujourdhui: (promo ? 0 : p) + (a ? a.prix : 0) + frais + acc.reduce((s, x) => s + x.prix, 0) };
}
const total = () => { const m = montants(); $("#resa-total").innerHTML = `<b>${eur(m.aujourdhui)}</b>aujourd'hui, puis ${eur(m.mensuel)} par mois`; };
const msgCode = () => { const ok = montants().promo; return [ok ? "ok" : R.code ? "ko" : "", ok ? "Premier mois offert." : R.code ? "Ce code n'est pas reconnu." : "Essayez BIENVENUE : le premier mois est offert."]; };

function dessiner() {
  const b = S.choix, m = montants(), c = $("#resa-defile");
  $("#resa-suite").disabled = false;
  $("#resa-retour").textContent = R.etape === 0 ? "Changer de box" : "Retour";
  total();
  if (R.etape === 0) {
    $("#resa-suite").textContent = "Continuer";
    const as = S.data.produits.assurances.map(a => `<label><input type="radio" name="assurance" value="${a.id}" ${R.assurance === a.id ? "checked" : ""}><span>${esc(a.nom.replace(/^Assurance contenu — /, "Biens couverts jusqu'à "))}<small>Vol, incendie, dégât des eaux</small></span><em>${eur(a.prix)} / mois</em></label>`).join("");
    const ac = S.data.produits.accessoires.map(a => `<label><input type="checkbox" name="acc" value="${a.id}" ${R.accessoires.has(a.id) ? "checked" : ""}><span>${esc(a.nom)}<small>${esc(a.description)}</small></span><em>${eur(a.prix)}</em></label>`).join("");
    const [cl, tx] = msgCode();
    c.innerHTML = `<div class="pas-resa"><h2>Votre entrée</h2><p class="sous">Choisissez le jour, protégez vos biens.</p>
      <label class="champ"><span>Date d'entrée</span><input type="date" name="debut" min="${demain()}" max="${new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}" value="${R.debut}" required></label>
      ${as ? `<div class="champ"><span>Assurance de vos biens</span><div class="choix">${as}<label><input type="radio" name="assurance" value="" ${R.assurance ? "" : "checked"}><span>J'ai déjà une assurance<small>Votre assurance habitation doit couvrir le stockage</small></span><em>0 €</em></label></div></div>` : ""}
      ${ac ? `<div class="champ"><span>À ajouter</span><div class="choix">${ac}</div></div>` : ""}
      <label class="champ"><span>Code promo</span><input type="text" name="code" value="${esc(R.code)}" placeholder="BIENVENUE" autocomplete="off" style="text-transform:uppercase"></label><div class="msg-code ${cl}" id="msg-code">${tx}</div></div>`;
    c.oninput = e => {
      const t = e.target;
      if (t.name === "debut") R.debut = t.value;
      if (t.name === "assurance") R.assurance = t.value ? Number(t.value) : null;
      if (t.name === "acc") t.checked ? R.accessoires.add(Number(t.value)) : R.accessoires.delete(Number(t.value));
      if (t.name === "code") { R.code = t.value; const [cl2, tx2] = msgCode(), mc = $("#msg-code"); mc.className = "msg-code " + cl2; mc.textContent = tx2; if (cl2 === "ok" && window.gsap) G.fromTo(mc, { scale: 1.2 }, { scale: 1, duration: .5, ease: "back.out(3)" }); }
      total();
    };
  } else if (R.etape === 1) {
    $("#resa-suite").textContent = "Continuer";
    c.innerHTML = `<div class="pas-resa"><h2>Vos coordonnées</h2><p class="sous">Pour votre contrat et l'envoi de votre code d'accès.</p>
      <div class="deux"><label class="champ"><span>Prénom</span><input type="text" name="prenom" autocomplete="given-name" value="${esc(R.prenom)}" required></label><label class="champ"><span>Nom</span><input type="text" name="nom" autocomplete="family-name" value="${esc(R.nom)}" required></label></div>
      <label class="champ"><span>E-mail</span><input type="email" name="email" autocomplete="email" value="${esc(R.email)}" required></label>
      <label class="champ"><span>Téléphone <small style="font-weight:400;color:var(--gris)">facultatif</small></span><input type="tel" name="tel" autocomplete="tel" value="${esc(R.tel)}"></label>
      <label class="sr">Ne pas remplir<input type="text" name="site" tabindex="-1" autocomplete="off"></label><p class="erreur" role="alert"></p></div>`;
    c.oninput = e => { const t = e.target; if (t.name in R) R[t.name] = t.value; };
    setTimeout(() => $("input[name=prenom]", c)?.focus({ preventScroll: true }), 80);
  } else {
    $("#resa-suite").textContent = `Payer ${eur(m.aujourdhui)} et réserver`;
    const lignes = [[`Box ${b.nom}, premier mois`, m.promo ? `<s>${eur(m.p)}</s>&nbsp; 0 €` : eur(m.p)], ...(m.a ? [[m.a.nom.replace(/^Assurance contenu — /, "Assurance "), eur(m.a.prix)]] : []), ["Frais de dossier", eur(m.frais)], ...m.acc.map(x => [x.nom, eur(x.prix)])];
    c.innerHTML = `<div class="pas-resa"><h2>Paiement</h2><p class="sous">Entrée le ${new Date(R.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.</p>
      <div class="carte-demo"><small>Carte de démonstration</small><div class="num">4242 4242 4242 4242</div><small>${esc((R.prenom + " " + R.nom).trim()) || "Votre nom"} &nbsp; 12/29</small></div>
      <p class="avert">Démonstration : aucun paiement n'est demandé ni enregistré. Le contrat, lui, est vraiment créé dans Nexudus.</p>
      <ul class="lignes">${lignes.map(([a, v]) => `<li><span>${esc(a)}</span><span>${v}</span></li>`).join("")}<li class="t"><span>À payer aujourd'hui</span><span>${eur(m.aujourdhui)}</span></li><li><span>Ensuite, chaque mois</span><span>${eur(m.mensuel)}</span></li></ul>
      <label class="cgv"><input type="checkbox" name="cgv" ${R.cgv ? "checked" : ""}><span>J'accepte les conditions de location : au mois, sans engagement, préavis de ${preavis()} jours.</span></label><p class="erreur" role="alert"></p></div>`;
    c.oninput = e => { if (e.target.name === "cgv") R.cgv = e.target.checked; };
  }
  c.scrollTop = 0;
  G.fromTo($(".pas-resa", c), { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: .45, ease: "power3.out" });
}

async function envoyer(e) {
  e.preventDefault();
  const c = $("#resa-defile"), err = () => $(".erreur", c) || c.appendChild(el("p", { class: "erreur", role: "alert" }));
  if (R.etape === 0) { if (!R.debut || R.debut < demain()) { err().textContent = "Choisissez une date d'entrée à partir de demain."; return; } R.etape = 1; return dessiner(); }
  if (R.etape === 1) {
    if (!R.prenom.trim() || !R.nom.trim()) return (err().textContent = "Indiquez votre prénom et votre nom.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(R.email.trim())) return (err().textContent = "Cette adresse e-mail n'est pas valide.");
    R.etape = 2; return dessiner();
  }
  if (!R.cgv) return (err().textContent = "Cochez les conditions de location pour continuer.");
  const bt = $("#resa-suite"); bt.disabled = true; bt.textContent = "Réservation en cours…"; err().textContent = "";
  try {
    const r = await fetch("/api/reserver", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ box: S.choix.id, debut: R.debut, assurance: R.assurance, accessoires: [...R.accessoires], code: R.code, prenom: R.prenom, nom: R.nom, email: R.email, tel: R.tel, cgv: R.cgv, site: $("input[name=site]")?.value || "" }) });
    const d = await r.json().catch(() => ({ ok: false, erreur: "Réponse illisible." }));
    if (!d.ok) { err().textContent = d.erreur || "La réservation n'a pas pu être enregistrée."; bt.disabled = false; bt.textContent = `Payer ${eur(montants().aujourdhui)} et réserver`; return; }
    surFin(d);
  } catch { err().textContent = "Connexion impossible. Vérifiez votre réseau et réessayez."; bt.disabled = false; bt.textContent = `Payer ${eur(montants().aujourdhui)} et réserver`; }
}

// ---------- La porte s'ouvre ----------
export function finale(d, versImmeuble, fermer) {
  const code = String(1000 + Math.floor(Math.random() * 9000));
  const jour = new Date(d.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("#fin").innerHTML = `<div class="porte"><div class="num-box">${esc(d.box.nom)}</div><div class="rideau"></div><div class="poignee"></div></div>
    <h2>Le box ${esc(d.box.nom)} est à vous.</h2>
    <p>Rendez-vous ${jour}, ${NOMS[d.box.etage].toLowerCase()}. ${eur(d.aPayer)} payés, puis ${eur(d.mensuel)} par mois${d.promo ? ", premier mois offert" : ""}.</p>
    <div class="code" aria-label="Code d'accès de démonstration ${code}">${[...code].map(() => "<span>0</span>").join("")}</div>
    <p style="font-size:14px">Code d'accès de démonstration. Le vrai arrive par e-mail la veille.</p>
    <p class="ref">Réservation ${esc(d.reference)}. Client, contrat et box attribué créés dans Nexudus.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn btn-tg" type="button" id="fin-imm">Voir mon box dans l'immeuble</button><button class="btn" style="background:rgba(255,255,255,.12);color:#fff" type="button" id="fin-fermer">Terminer</button></div>`;
  $("#fin-imm").onclick = versImmeuble; $("#fin-fermer").onclick = fermer;
  const tl = G.timeline();
  tl.fromTo(".porte", { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, ease: "back.out(1.6)" })
    .to(".porte .rideau", { scaleY: 0, duration: 1.1, ease: "power3.inOut", delay: .25 })
    .to(".porte .poignee", { opacity: 0, duration: .2 }, "<")
    .fromTo(".porte .num-box", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5 }, "-=.3")
    .call(eclats, null, "-=.6")
    .fromTo(".fin h2, .fin p, .fin .code, .fin .btn", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .55, stagger: .06, ease: "power3.out" }, "-=.2");
  // Les chiffres du code défilent puis s'arrêtent un à un.
  const cases = $$(".code span");
  cases.forEach((s, i) => { let n = 0; const t = setInterval(() => { s.textContent = (n++ % 10); }, 50); setTimeout(() => { clearInterval(t); s.textContent = code[i]; if (window.gsap) G.fromTo(s, { scale: 1.3 }, { scale: 1, duration: .4, ease: "back.out(3)" }); }, reduit ? 0 : 2300 + i * 260); });
}
function eclats() {
  if (reduit || !window.gsap) return;
  const z = $("#eclats"); z.innerHTML = "";
  const cols = ["#F28C28", "#FFB061", "#FFFFFF", "#3EE09A", "#DCEBE4"];
  for (let i = 0; i < 46; i++) {
    const e = el("i", { class: "eclat", style: `background:${cols[i % cols.length]}` }); z.append(e);
    const a = Math.random() * Math.PI * 2, v = 180 + Math.random() * 320;
    G.fromTo(e, { x: 0, y: 0, rotate: 0, opacity: 1 }, { x: Math.cos(a) * v, y: Math.sin(a) * v * .7 + 140, rotate: Math.random() * 540, opacity: 0, duration: 1.6 + Math.random() * .8, ease: "power2.out", onComplete: () => e.remove() });
  }
}
