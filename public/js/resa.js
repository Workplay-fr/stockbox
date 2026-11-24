// Réservation dans la page : une question par écran, un toucher pour répondre, le ticket se remplit à gauche.
// Paiement simulé ; client, contrat, box, assurance et frais sont créés pour de vrai dans Nexudus (/api/reserver).
import { $, $$, el, G, esc, eur, S, L, EN, LOC, NOMS, LIBELLE, prix, preavis, reduit, nomBox } from "./commun.js?v=20261124102301";

const PORTAIL = "https://stockbox.nexudus.site/stockbox/login?redirectTo=%252Fstockbox%252Fuser%252Fdashboard%252Fpersonal";
const PROMO = L("Code promo", "Promo code");
const couvEN = p => p ? "Cover up to €" + Number(String(p.nom).replace(/\D/g, "")).toLocaleString("en-GB") : "Cover";
// Noms des accessoires venant de Nexudus (en français) : version anglaise côté site.
const accEN = a => /cadenas/i.test(a.nom) ? { nom: "High-security padlock", description: "Hardened steel disc padlock, two keys included." } : { nom: "Moving kit", description: "10 reinforced boxes, 2 rolls of tape, bubble wrap and a marker." };
const R = { e: 0, profil: null, debut: null, valeur: null, assurance: undefined, accessoires: new Set(), code: "", prenom: "", nom: "", email: "", tel: "", cp: "", societe: "", codeOuvert: false };
const ETAPES = ["profil", "date", "valeur", "options", "coord", "payer"];
let surFin = () => {}, surRetour = () => {};
const iso = d => d.toISOString().slice(0, 10);
const plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const samedi = () => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); return iso(d); };
const jolie = s => new Date(s + "T12:00:00").toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long" });
const court = s => new Date(s + "T12:00:00").toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short" });
const IC = {
  particulier: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  pro: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  bouclier: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>',
  ok: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  carton: '<path d="M3 8 12 3l9 5v9l-9 5-9-5Z"/><path d="M3 8l9 5 9-5M12 13v9"/>',
};
const ico = k => `<span class="ic"><svg viewBox="0 0 24 24">${IC[k] || IC.carton}</svg></span>`;

export function initResa(fin, retour) {
  surFin = fin; surRetour = retour;
  $("#resa-form").addEventListener("submit", e => { e.preventDefault(); suivant(); });
  $("#resa-retour").onclick = () => { if (R.e > 0) aller(R.e - 1, -1); else surRetour(); };
}
export function entrerResa() {
  if (!S.choix) return;
  R.e = 0; ticket(true); aller(0, 1);
}

function montants() {
  const b = S.choix, p = prix(b.taille);
  const a = R.assurance ? S.data.produits.assurances.find(x => x.id === R.assurance) : null;
  const acc = S.data.produits.accessoires.filter(x => R.accessoires.has(x.id));
  const promo = R.code.trim().toUpperCase() === "BIENVENUE";
  const frais = S.data.produits.fraisDossier?.prix || 0;
  return { p, a, acc, promo, frais, mensuel: p + (a ? a.prix : 0), aujourdhui: (promo ? 0 : p) + (a ? a.prix : 0) + frais + acc.reduce((s, x) => s + x.prix, 0) };
}

// ---------- le ticket ----------
let avant = {};
function ticket(neuf) {
  const b = S.choix, m = montants(), t = $("#ticket");
  const lignes = {
    [L("Profil", "Profile")]: R.profil ? (R.profil === "pro" ? L("Professionnel", "Business") : L("Particulier", "Personal")) : null,
    [L("Entrée", "Move-in")]: R.debut ? court(R.debut) : null,
    [L("Assurance", "Insurance")]: R.valeur === null ? null : m.a ? (EN ? couvEN(m.a) : m.a.nom.replace(/^Assurance contenu — /, "")) + `, ${eur(m.a.prix)}${L("/mois", "/mo")}` : L("La vôtre", "Your own"),
    Options: R.e > 3 || R.accessoires.size ? (m.acc.length ? m.acc.map(x => EN ? accEN(x).nom.split(" ").slice(-1)[0] : x.nom.split(" ")[0]).join(", ") : L("Aucune", "None")) : null,
    [PROMO]: m.promo ? L("1er mois offert", "1st month free") : null,
  };
  if (neuf || !$(".t-corps", t)) {
    const pts = S.zones.etages[b.etage][b.nom], H = S.zones.kz * S.zones.hauteur, haut = pts.map(([x, y]) => [x, y - H]);
    const cx = pts.reduce((s, q) => s + q[0], 0) / 4, cy = pts.reduce((s, q) => s + q[1], 0) / 4 - H / 2, w = ["C", "2"].includes(b.taille) ? 300 : 440;
    t.innerHTML = `<div class="t-vis"><svg viewBox="${cx - w / 2} ${cy - w * .28} ${w} ${w * .5625}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/img/etage-${b.etage}.webp" width="1536" height="1024"/><polygon points="${pts.map(q => q.join(",")).join(" ")}" fill="rgba(242,140,40,.8)" stroke="#B85F12" stroke-width="2"/>${pts.map((q, i) => `<line x1="${q[0]}" y1="${q[1]}" x2="${haut[i][0]}" y2="${haut[i][1]}" stroke="#F28C28" stroke-width="2"/>`).join("")}<polygon points="${haut.map(q => q.join(",")).join(" ")}" fill="rgba(242,140,40,.3)" stroke="#F28C28" stroke-width="2"/></svg></div>
      <div class="t-corps"><div class="t-box">${esc(nomBox(b))}</div><div class="t-ou">${LIBELLE[b.taille]}, ${EN ? NOMS[b.etage] : NOMS[b.etage].toLowerCase()}, StockBox Saint-Ouen</div><dl id="t-lignes"></dl>
      <div class="t-total"><div><small>${L("Aujourd'hui", "Today")}</small><b id="t-auj">${eur(m.aujourdhui)}</b></div><div class="m"><small>${L("Puis chaque mois", "Then every month")}</small><br><span id="t-mois">${eur(m.mensuel)}</span></div></div></div>
      <div class="t-confiance"><span>${L("Sans engagement", "No commitment")}</span><span>${L(`Préavis ${preavis()} jours`, `${preavis()} days' notice`)}</span><span>${L("Accès dès le jour choisi", "Access from your chosen day")}</span></div>`;
    avant = {};
  }
  $("#t-lignes").innerHTML = Object.entries(lignes).filter(([k, v]) => v !== null || k !== PROMO).map(([k, v]) => `<dt>${k}</dt><dd class="${v === null ? "vide" : avant[k] !== v ? "neuf" : ""}">${v === null ? L("à choisir", "to choose") : esc(v)}</dd>`).join("");
  avant = { ...lignes };
  const auj = $("#t-auj"), o = { v: parseFloat(auj.dataset.v || m.aujourdhui) };
  G.to(o, { v: m.aujourdhui, duration: .6, ease: "power2.out", onUpdate: () => (auj.textContent = eur(Math.round(o.v))) });
  auj.dataset.v = m.aujourdhui; $("#t-mois").textContent = eur(m.mensuel);
}

// ---------- les questions ----------
function aller(n, sens = 1) {
  R.e = n;
  $("#resa-retour").disabled = false;
  $("#q-barre").style.width = `${Math.round((n + 1) / ETAPES.length * 100)}%`;
  $("#q-duree").textContent = n < 4 ? L("Environ 1 minute", "About 1 minute") : n === 4 ? L("Presque fini", "Almost done") : L("Dernière étape", "Last step");
  const c = $("#resa-defile");
  G.to(c, { opacity: 0, x: -30 * sens, duration: .18, ease: "power2.in", onComplete: () => { dessiner(); G.fromTo(c, { opacity: 0, x: 40 * sens }, { opacity: 1, x: 0, duration: .45, ease: "power3.out" }); G.fromTo($$(".tuile, .q-champs label", c), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, stagger: .05, ease: "power3.out" }); } });
}
const tuile = (val, actif, titre, sous, icone, px) => `<button class="tuile" type="button" data-v="${val}" aria-pressed="${actif}">${icone ? ico(icone) : ""}<b>${titre}</b>${sous ? `<small>${sous}</small>` : ""}${px ? `<span class="px">${px}</span>` : ""}</button>`;

function dessiner() {
  const c = $("#resa-defile"), pied = $("#q-pied"), m = montants(), et = ETAPES[R.e];
  pied.hidden = !["coord", "payer"].includes(et) && !(et === "date" && R.debut === "autre");
  $("#resa-suite .cta-txt").textContent = et === "payer" ? L(`Payer ${eur(m.aujourdhui)} et réserver`, `Pay ${eur(m.aujourdhui)} and book`) : L("Continuer", "Continue");
  if (et === "profil") {
    c.innerHTML = `<h2>${L("Vous êtes…", "You are…")}</h2><p class="q-sous">${L("Pour préparer le bon contrat.", "So we prepare the right contract.")}</p><div class="tuiles">${tuile("particulier", R.profil === "particulier", L("Un particulier", "An individual"), L("Déménagement, travaux, place en plus", "Moving, renovation, extra space"), "particulier")}${tuile("pro", R.profil === "pro", L("Un professionnel", "A business"), L("Stock, archives, matériel", "Stock, archives, equipment"), "pro")}</div>`;
    clic(c, v => { R.profil = v; ticket(); setTimeout(() => aller(1), 260); });
  }
  if (et === "date") {
    const opts = [[plus(1), L("Demain", "Tomorrow"), court(plus(1))], [samedi(), L("Samedi", "Saturday"), court(samedi())], [plus(7), L("Dans une semaine", "In a week"), court(plus(7))], ["autre", L("Une autre date", "Another date"), L("Jusqu'à 3 mois", "Up to 3 months ahead")]];
    const dateAutre = R.debut && !opts.slice(0, 3).some(o => o[0] === R.debut) && R.debut !== "autre" ? R.debut : "";
    c.innerHTML = `<h2>${L("Quand voulez-vous entrer ?", "When do you want to move in?")}</h2><p class="q-sous">${L("Votre code d'accès fonctionnera dès ce jour-là.", "Your access code will work from that day.")}</p><div class="tuiles ligne">${opts.map(([v, t, s]) => tuile(v, R.debut === v || (v === "autre" && (R.debut === "autre" || dateAutre)), t, s)).join("")}</div>
      <div class="q-date" ${R.debut === "autre" || dateAutre ? "" : "hidden"}><input type="date" id="q-date" min="${plus(1)}" max="${plus(90)}" value="${dateAutre}" aria-label="${L("Date d'entrée", "Move-in date")}"></div><p class="q-erreur" role="alert"></p>`;
    clic(c, v => { if (v === "autre") { R.debut = "autre"; dessiner(); setTimeout(() => $("#q-date").showPicker?.(), 80); return; } R.debut = v; ticket(); setTimeout(() => aller(2), 260); });
    $("#q-date").oninput = e => { if (e.target.value) { R.debut = e.target.value; ticket(); setTimeout(() => aller(2), 300); } };
  }
  if (et === "valeur") {
    const a = S.data.produits.assurances;
    const o = [["Moins de 5 000 €", a[0], "Under €5,000"], ["De 5 000 à 15 000 €", a[1], "€5,000 to €15,000"], ["Plus de 15 000 €", a[2], "Over €15,000"]].filter(x => x[1]);
    c.innerHTML = `<h2>${L("Que valent vos affaires ?", "What are your belongings worth?")}</h2><p class="q-sous">${L("On vous propose l'assurance qui les couvre. Vol, incendie et dégât des eaux.", "We suggest the insurance that covers them: theft, fire and water damage.")}</p><div class="tuiles">${o.map(([t, p, te], i) => tuile("a" + i, R.valeur === t, EN ? te : t, EN ? couvEN(p) : p.nom.replace(/^Assurance contenu — /, "Couverture jusqu'à "), "bouclier", `${eur(p.prix)} ${L("par mois", "a month")}`)).join("")}${tuile("aucune", R.valeur === "Assurance personnelle", L("J'ai déjà une assurance", "I already have insurance"), L("Mon assurance habitation couvre le stockage", "My home insurance covers storage"), "ok", eur(0))}</div>`;
    clic(c, v => { if (v === "aucune") { R.valeur = "Assurance personnelle"; R.assurance = null; } else { const [t, p] = o[Number(v.slice(1))]; R.valeur = t; R.assurance = p.id; } ticket(); setTimeout(() => aller(3), 260); });
  }
  if (et === "options") {
    const acc = S.data.produits.accessoires;
    c.innerHTML = `<h2>${L("Un petit plus ?", "Anything else?")}</h2><p class="q-sous">${L("Remis à l'accueil le jour de votre arrivée.", "Handed over at reception on the day you arrive.")}</p><div class="tuiles">${acc.map(a => tuile(a.id, R.accessoires.has(a.id), esc(EN ? accEN(a).nom : a.nom), esc(EN ? accEN(a).description : a.description), /cadenas/i.test(a.nom) ? "cadenas" : "carton", eur(a.prix))).join("")}</div>
      <button class="btn btn-em non-merci" type="button" id="opt-suite">${R.accessoires.size ? L("Continuer", "Continue") : L("Non merci, continuer", "No thanks, continue")}</button>`;
    clic(c, v => { const id = Number(v); R.accessoires.has(id) ? R.accessoires.delete(id) : R.accessoires.add(id); $$(".tuile", c).forEach(t => t.setAttribute("aria-pressed", String(R.accessoires.has(Number(t.dataset.v))))); $("#opt-suite").textContent = R.accessoires.size ? L("Continuer", "Continue") : L("Non merci, continuer", "No thanks, continue"); ticket(); }, true);
    $("#opt-suite").onclick = () => { ticket(); aller(4); };
  }
  if (et === "coord") {
    c.innerHTML = `<h2>${L("À quel nom ?", "In whose name?")}</h2><p class="q-sous">${L("Pour votre contrat et l'envoi de votre code d'accès.", "For your contract and to send your access code.")}</p>
      <div class="q-champs">
        <label><span>${L("Prénom", "First name")}</span><input name="prenom" autocomplete="given-name" value="${esc(R.prenom)}" required></label>
        <label><span>${L("Nom", "Last name")}</span><input name="nom" autocomplete="family-name" value="${esc(R.nom)}" required></label>
        ${R.profil === "pro" ? `<label class="plein"><span>${L("Société", "Company")}</span><input name="societe" autocomplete="organization" value="${esc(R.societe)}" required></label>` : ""}
        <label class="plein"><span>E-mail</span><input name="email" type="email" autocomplete="email" value="${esc(R.email)}" required></label>
        <label><span>${L("Téléphone", "Phone")}</span><input name="tel" type="tel" autocomplete="tel" value="${esc(R.tel)}"></label>
        <label><span>${L("Code postal", "Postcode")}</span><input name="cp" inputmode="numeric" autocomplete="postal-code" maxlength="5" value="${esc(R.cp)}"></label>
        <label class="sr">Ne pas remplir<input name="site" tabindex="-1" autocomplete="off"></label>
      </div><p class="q-erreur" role="alert"></p>`;
    c.oninput = e => { const t = e.target; if (t.name in R) R[t.name] = t.value; };
    setTimeout(() => $("input[name=prenom]", c)?.focus({ preventScroll: true }), 420);
  }
  if (et === "payer") {
    c.innerHTML = `<h2>${L("Dernière étape.", "Last step.")}</h2><p class="q-sous">${L("Entrée", "Move-in on")} ${jolie(R.debut)}. ${m.promo ? L("Premier mois offert.", "First month free.") : ""}</p>
      <div class="payer"><div class="carte-demo"><small>${L("Carte de démonstration", "Demo card")}</small><div class="num">4242 4242 4242 4242</div><small>${esc((R.prenom + " " + R.nom).trim())} &nbsp; 12/29</small></div>
      <p class="avert">Démonstration : aucun paiement n'est demandé ni enregistré. Le contrat, lui, est vraiment créé dans Nexudus.</p>
      <button class="lien code-lien" type="button" id="code-ouvrir">${m.promo ? L("Code BIENVENUE appliqué", "Code BIENVENUE applied") : L("J'ai un code promo", "I have a promo code")}</button>
      <div class="code-champ" ${R.codeOuvert && !m.promo ? "" : "hidden"}><input id="code" placeholder="BIENVENUE" value="${esc(R.code)}" autocomplete="off" aria-label="${L("Code promo", "Promo code")}"><button class="btn btn-ligne" type="button" id="code-ok">${L("Appliquer", "Apply")}</button></div>
      <p class="legal">${L(`En payant, vous acceptez les conditions de location : au mois, sans engagement, préavis de ${preavis()} jours.`, `By paying, you accept the rental terms: monthly, no commitment, ${preavis()} days' notice.`)}</p><p class="q-erreur" role="alert"></p></div>`;
    $("#code-ouvrir").onclick = () => { R.codeOuvert = true; dessiner(); $("#code")?.focus(); };
    $("#code-ok") && ($("#code-ok").onclick = () => { R.code = $("#code").value; const ok = montants().promo; if (ok) { ticket(); dessiner(); } else $(".q-erreur", c).textContent = L("Ce code n'est pas reconnu.", "This code is not recognised."); });
  }
}
function clic(c, f, garder) { $$(".tuile", c).forEach(t => t.addEventListener("click", () => { if (!garder) $$(".tuile", c).forEach(x => x.setAttribute("aria-pressed", String(x === t))); f(t.dataset.v); })); }

async function suivant() {
  const et = ETAPES[R.e], c = $("#resa-defile"), err = t => { const p = $(".q-erreur", c); if (p) { p.textContent = t; G.fromTo(p, { x: -6 }, { x: 0, duration: .4, ease: "elastic.out(1,.3)" }); } };
  if (et === "date") { if (!R.debut || R.debut === "autre") return err(L("Choisissez une date.", "Choose a date.")); return aller(2); }
  if (et === "coord") {
    if (!R.prenom.trim() || !R.nom.trim()) return err(L("Indiquez votre prénom et votre nom.", "Enter your first and last name."));
    if (R.profil === "pro" && R.societe.trim().length < 2) return err(L("Indiquez le nom de votre société.", "Enter your company name."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(R.email.trim())) return err(L("Cette adresse e-mail n'est pas valide.", "This email address is not valid."));
    if (R.cp && !/^\d{5}$/.test(R.cp.trim())) return err(L("Le code postal doit compter 5 chiffres.", "The postcode must have 5 digits (French format)."));
    return aller(5);
  }
  if (et !== "payer") return;
  const bt = $("#resa-suite"); bt.disabled = true; $(".cta-txt", bt).textContent = L("Paiement en cours…", "Processing payment…");
  try {
    const r = await fetch("/api/reserver", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ box: S.choix.id, debut: R.debut, assurance: R.assurance, accessoires: [...R.accessoires], code: R.code, prenom: R.prenom, nom: R.nom, email: R.email, tel: R.tel, cp: R.cp, profil: R.profil, societe: R.societe, valeur: R.valeur, cgv: true, site: $("input[name=site]")?.value || "" }) });
    const d = await r.json().catch(() => ({ ok: false, erreur: L("Réponse illisible.", "Unreadable response.") }));
    bt.disabled = false;
    if (!d.ok) { $(".cta-txt", bt).textContent = L(`Payer ${eur(montants().aujourdhui)} et réserver`, `Pay ${eur(montants().aujourdhui)} and book`); return err(EN ? "The booking could not be saved. Please try again." : (d.erreur || "La réservation n'a pas pu être enregistrée.")); }
    surFin({ ...d, debutJolie: jolie(d.debut) });
  } catch { bt.disabled = false; $(".cta-txt", bt).textContent = L(`Payer ${eur(montants().aujourdhui)} et réserver`, `Pay ${eur(montants().aujourdhui)} and book`); err(L("Connexion impossible. Vérifiez votre réseau et réessayez.", "Cannot connect. Check your network and try again.")); }
}

// Fichier agenda (.ics) pour le jour d'entrée.
export function agenda(d) {
  const j = d.debut.replace(/-/g, ""), fin = new Date(d.debut + "T12:00:00"); fin.setDate(fin.getDate() + 1);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StockBox//FR", "BEGIN:VEVENT", `UID:${d.reference}@stockbox`, `DTSTART;VALUE=DATE:${j}`, `DTEND;VALUE=DATE:${iso(fin).replace(/-/g, "")}`, EN ? `SUMMARY:Move into ${nomBox(d.box)} (StockBox)` : `SUMMARY:Entrée dans mon ${nomBox(d.box, true)} (StockBox)`, "LOCATION:StockBox Saint-Ouen, 14 passage des Malles, 93400 Saint-Ouen", EN ? `DESCRIPTION:Booking ${d.reference}. Access 7 days a week\, 6 am to 10 pm\, with your code.` : `DESCRIPTION:Réservation ${d.reference}. Accès 7 j/7 de 6 h à 22 h avec votre code.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = el("a", { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: `stockbox-${d.box.nom}.ics` }); document.body.append(a); a.click(); a.remove();
}
export { PORTAIL };

// ---------- La porte s'ouvre ----------
export function finale(d, versImmeuble, fermer) {
  const code = String(1000 + Math.floor(Math.random() * 9000));
  const jour = new Date(d.debut + "T12:00:00").toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long" });
  $("#fin").innerHTML = `<div class="porte"><div class="num-box">${esc(d.box.nom)}</div><div class="rideau"></div><div class="poignee"></div></div>
    <h2>${EN ? `${esc(nomBox(d.box))} is yours.` : `${esc(nomBox(d.box))} est à vous.`}</h2>
    <p>${EN ? `See you on ${jour}, ${NOMS[d.box.etage]}. ${eur(d.aPayer)} paid, then ${eur(d.mensuel)} a month${d.promo ? ", first month free" : ""}.` : `Rendez-vous ${jour}, ${NOMS[d.box.etage].toLowerCase()}. ${eur(d.aPayer)} payés, puis ${eur(d.mensuel)} par mois${d.promo ? ", premier mois offert" : ""}.`}</p>
    <div class="code" aria-label="${L("Code d'accès de démonstration", "Demo access code")} ${code}">${[...code].map(() => "<span>0</span>").join("")}</div>
    <p style="font-size:14px">${L("Code d'accès de démonstration. Le vrai arrive par e-mail la veille.", "Demo access code. The real one arrives by email the day before.")}</p>
    <p class="ref">${L(`Réservation ${esc(d.reference)}. Client, contrat et box attribué créés dans Nexudus.`, `Booking ${esc(d.reference)}. Customer, contract and assigned unit created in Nexudus.`)}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn btn-tg" type="button" id="fin-agenda">${L("Ajouter à mon agenda", "Add to my calendar")}</button><a class="btn" style="background:rgba(255,255,255,.12);color:#fff" href="https://www.google.com/maps/search/?api=1&query=Puces+de+Saint-Ouen" target="_blank" rel="noopener">${L("Itinéraire", "Directions")}</a><a class="btn" style="background:rgba(255,255,255,.12);color:#fff" href="${PORTAIL}" target="_blank" rel="noopener">${L("Mon espace client", "My account")}</a></div>
    <button class="lien" style="color:rgba(255,255,255,.7);margin-top:18px" type="button" id="fin-imm">${L("Voir mon box dans l'immeuble", "See my unit in the building")}</button>`;
  $("#fin-imm").onclick = versImmeuble; $("#fin-agenda").onclick = () => agenda(d);
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
