// Étape 3 : l'immeuble en grand. Pile des trois niveaux, ascenseur pour changer d'étage, zoom et déplacement dans l'étage,
// boxes allumés selon leur état réel dans Nexudus, box conseillé mis en avant.
import { $, $$, el, NS, G, esc, eur, S, NOMS, COURT, TAILLES, LIBELLE, IDEAL, boxes, libres, libresTotal, prix, volumeTaille, preavis, boxParId, boxConseille, reduit } from "./commun.js?v=20261119181701";

let zone, scene, pileIn, bulle, onReserver = () => {};
const V = { mode: "pile", etage: null, z: 1, x: 0, y: 0 };
let geo = { lw: 800, lh: 533, sp: .7, gap: 160 };

export function initImmeuble(reserver) {
  onReserver = reserver;
  zone = $("#scene-zone"); scene = $("#scene"); pileIn = $("#pile-in"); bulle = $("#bulle");
  if (!$("#defs-sb")) document.body.insertAdjacentHTML("afterbegin", `<svg id="defs-sb" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="hachures" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="rgba(215,70,55,.28)"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(190,52,40,.6)" stroke-width="2.5"/></pattern></defs></svg>`);
  for (const n of ["2", "1", "0"]) {
    const niv = el("div", { class: "niveau", "data-n": n });
    niv.append(el("img", { src: `/img/etage-${n}.webp`, alt: "", width: 1536, height: 1024, decoding: "async", draggable: "false" }));
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 1536 1024"); svg.setAttribute("aria-hidden", "true");
    const dalle = document.createElementNS(NS, "polygon"); dalle.setAttribute("class", "dalle"); dalle.setAttribute("points", S.zones.dalle.map(q => q.join(",")).join(" ")); svg.append(dalle);
    for (const [nom, pts] of Object.entries(S.zones.etages[n])) {
      const b = boxes(n).find(x => x.nom === nom); if (!b) continue;
      const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", pts.map(q => q.join(",")).join(" ")); p.setAttribute("class", "box"); p.dataset.id = b.id; p.dataset.x = pts[0][0]; svg.append(p);
    }
    svg.insertAdjacentHTML("beforeend", `<g class="prisme"></g><g class="repere"></g>`);
    niv.append(svg, el("div", { class: "etiq" }));
    niv.addEventListener("click", () => { if (V.mode === "pile") ouvrir(n); });
    pileIn.append(niv);
  }
  ascenseur();
  ecouter();
  new ResizeObserver(() => { mesurer(); placer(false); }).observe(zone);
  $$("#outils button").forEach(b => (b.onclick = () => { const z = Number(b.dataset.z); if (!z) recentrer(); else zoomer(z > 0 ? 1.35 : 1 / 1.35); }));
}

// Taille des calques selon la place disponible : l'étage ouvert remplit la zone ; la pile tient en hauteur.
function mesurer() {
  const W = zone.clientWidth, H = zone.clientHeight - 52;
  const lw = Math.min(W * 1.04, H / .9 * 1536 / 1024), lh = lw * 1024 / 1536;
  const sp = Math.min(.92, (H * .98) / (lh * 1.42), W / lw);
  geo = { lw, lh, sp, gap: lh * sp * .29 };
  pileIn.style.setProperty("--lw", lw + "px");
  $$(".niveau", pileIn).forEach(n => n.style.setProperty("--lw", lw + "px"));
}

function placer(anime = true) {
  const pile = $("#pile");
  pile.classList.toggle("vue-pile", V.mode === "pile"); pile.classList.toggle("vue-etage", V.mode === "etage");
  for (const niv of $$(".niveau", pileIn)) {
    const n = Number(niv.dataset.n);
    let y, s;
    if (V.mode === "pile") { y = (1 - n) * geo.gap; s = geo.sp; }
    else { const e = Number(V.etage); y = n === e ? 0 : (n > e ? -1 : 1) * geo.lh * .95; s = 1; }
    niv.style.setProperty("--y", y + "px"); niv.style.setProperty("--s", s); niv.style.setProperty("--sh", s * 1.03);
    niv.classList.toggle("actif", V.mode === "etage" && n === Number(V.etage));
    if (!anime) { niv.style.transition = "none"; void niv.offsetWidth; niv.style.transition = ""; }
  }
  $("#outils").hidden = V.mode !== "etage";
  zone.classList.toggle("zoom", V.mode === "etage" && V.z > 1.01);
}

export function entrer(taille, anime = true) {
  S.filtre = taille || null;
  if (S.choix && S.filtre && S.choix.taille !== S.filtre) S.choix = null;
  S.reco = S.filtre ? boxConseille(S.filtre) : null;
  mesurer(); V.mode = "pile"; V.etage = null; recentrer(false); placer(false);
  peindre(); fiche();
  // Les trois niveaux tombent l'un après l'autre, puis l'ascenseur file vers l'étage du box conseillé.
  const nivs = $$(".niveau", pileIn).reverse();
  if (anime) G.fromTo(nivs, { opacity: 0, translate: "0 -120px" }, { opacity: 1, translate: "0 0px", duration: .9, ease: "power3.out", stagger: .14 });
  const cible = anime ? (S.choix || S.reco) : null;
  if (cible) setTimeout(() => { ouvrir(cible.etage); setTimeout(() => choisir(cible, false), 700); }, 1300);
  else setTimeout(vague, 800);
}

function peindre() {
  for (const p of $$(".box", pileIn)) {
    const b = boxParId(p.dataset.id); if (!b) continue;
    p.classList.toggle("libre", b.libre); p.classList.toggle("occupe", !b.libre);
    p.classList.toggle("hors", !!S.filtre && b.taille !== S.filtre);
    p.classList.toggle("choisi", S.choix?.id === b.id);
  }
  for (const niv of $$(".niveau", pileIn)) {
    const n = niv.dataset.n, t = S.filtre;
    const k = libres(n, t);
    $(".etiq", niv).innerHTML = `<b>${NOMS[n]}</b>${k ? `${k} box${k > 1 ? "es" : ""}${t ? " de " + LIBELLE[t] : ""} libre${k > 1 ? "s" : ""}` : t ? `Pas de ${LIBELLE[t]} libre` : "Complet"}`;
  }
  filtres(); ascenseur(); prisme();
}

function filtres() {
  const c = $("#filtres"); c.innerHTML = "";
  const mk = (t, txt) => { const b = el("button", { class: "filtre", type: "button", "aria-pressed": String(S.filtre === t) }, `${txt}${t ? `<span class="nb">${libresTotal(t)}</span>` : ""}`); b.onclick = () => { S.filtre = t; if (S.choix && t && S.choix.taille !== t) S.choix = null; S.reco = t ? boxConseille(t) : null; peindre(); fiche(); vague(); }; c.append(b); };
  mk(null, "Toutes"); for (const t of TAILLES) mk(t, LIBELLE[t]);
}

let afficheVal = null;
function ascenseur() {
  const a = $("#ascenseur");
  if (!a.dataset.pret) {
    a.innerHTML = `<div class="afficheur" aria-hidden="true"><span id="led">—</span><small>étage</small></div>`;
    for (const n of ["2", "1", "0"]) { const b = el("button", { class: "bouton-etage", type: "button", "data-n": n, "aria-label": NOMS[n] }, `${COURT[n]}<small></small>`); b.onclick = () => ouvrir(n); a.append(b); }
    const t = el("button", { class: "bouton-etage tout", type: "button", "aria-label": "Tout l'immeuble" }, "Tout"); t.onclick = () => pile(); a.append(t);
    a.dataset.pret = "1";
  }
  for (const b of $$(".bouton-etage[data-n]", a)) { const n = b.dataset.n, k = libres(n, S.filtre); b.setAttribute("aria-pressed", String(V.mode === "etage" && V.etage === n)); $("small", b).textContent = k; $("small", b).hidden = !k; }
  $(".bouton-etage.tout", a).setAttribute("aria-pressed", String(V.mode === "pile"));
  const val = V.mode === "etage" ? COURT[V.etage] : "—";
  if (val !== afficheVal) {
    const led = $("#led"), monte = afficheVal !== null && V.mode === "etage" && (afficheVal === "—" || Number(V.etage === "0" ? 0 : V.etage) > Number(afficheVal === "RDC" ? 0 : afficheVal));
    afficheVal = val;
    if (window.gsap && !reduit) G.timeline().to(led, { yPercent: monte ? -120 : 120, duration: .22, ease: "power2.in" }).call(() => { led.textContent = val; }).fromTo(led, { yPercent: monte ? 120 : -120 }, { yPercent: 0, duration: .35, ease: "back.out(2)" });
    else led.textContent = val;
  }
}

export function ouvrir(n) {
  V.mode = "etage"; V.etage = String(n);
  if (S.choix && S.choix.etage !== V.etage) S.choix = null;
  recentrer(false); placer(); peindre(); fiche(); setTimeout(vague, 500);
}
function pile() { V.mode = "pile"; V.etage = null; recentrer(); placer(); peindre(); fiche(); }

function vague() {
  if (reduit) return;
  for (const p of $$(".box", pileIn)) { p.classList.remove("vague"); void p.getBoundingClientRect(); p.style.setProperty("--dl", (Number(p.dataset.x) / 1536 * .6).toFixed(2) + "s"); if (p.classList.contains("libre") && !p.classList.contains("hors")) p.classList.add("vague"); }
}

// ---------- zoom et déplacement dans l'étage ouvert ----------
const appliquer = (anime = true) => { if (anime && window.gsap) G.to(scene, { x: V.x, y: V.y, scale: V.z, duration: .45, ease: "power3.out" }); else G.set(scene, { x: V.x, y: V.y, scale: V.z }); zone.classList.toggle("zoom", V.mode === "etage" && V.z > 1.01); };
function recentrer(anime = true) { V.z = 1; V.x = 0; V.y = 0; appliquer(anime); }
function zoomer(f, cx = zone.clientWidth / 2, cy = zone.clientHeight / 2, anime = true) {
  const z = Math.max(1, Math.min(3.2, V.z * f)); const k = z / V.z;
  const ox = cx - zone.clientWidth / 2, oy = cy - zone.clientHeight / 2;
  V.x = ox - (ox - V.x) * k; V.y = oy - (oy - V.y) * k; V.z = z;
  if (z === 1) { V.x = 0; V.y = 0; }
  borner(); appliquer(anime);
}
const borner = () => { const mx = zone.clientWidth * (V.z - 1) / 2 + 40, my = zone.clientHeight * (V.z - 1) / 2 + 40; V.x = Math.max(-mx, Math.min(mx, V.x)); V.y = Math.max(-my, Math.min(my, V.y)); };
function centrerSur(b) {
  const p = S.zones.etages[b.etage][b.nom]; if (!p) return;
  const cx = p.reduce((s, q) => s + q[0], 0) / 4 / 1536, cy = p.reduce((s, q) => s + q[1], 0) / 4 / 1024;
  const z = ["C", "2"].includes(b.taille) ? 2 : 1.5;
  V.z = z; V.x = -(cx - .5) * geo.lw * z; V.y = -(cy - .5) * geo.lh * z; borner(); appliquer(true);
}

function ecouter() {
  let glisse = null, bouge = false; const pts = new Map();
  zone.addEventListener("wheel", e => { if (V.mode !== "etage") return; e.preventDefault(); const r = zone.getBoundingClientRect(); zoomer(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top, false); }, { passive: false });
  zone.addEventListener("pointerdown", e => { pts.set(e.pointerId, e); if (V.mode === "etage") { glisse = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y, d: null }; bouge = false; } });
  zone.addEventListener("pointermove", e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, e);
    if (V.mode === "pile" && !reduit && e.pointerType === "mouse") { const r = zone.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; pileIn.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`; }
    if (pts.size === 2 && V.mode === "etage") { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (glisse.d) zoomer(d / glisse.d, undefined, undefined, false); glisse.d = d; bouge = true; return; }
    if (glisse && pts.size === 1 && V.z > 1.01) { const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y; if (Math.hypot(dx, dy) > 5) bouge = true; if (bouge) { V.x = glisse.vx + dx; V.y = glisse.vy + dy; borner(); appliquer(false); } }
    const p = e.target.closest?.(".box");
    survol(V.mode === "etage" && !bouge ? p : null, e);
  });
  const fin = e => { pts.delete(e.pointerId); if (!pts.size) glisse = null; };
  zone.addEventListener("pointerup", fin); zone.addEventListener("pointercancel", fin);
  zone.addEventListener("pointerleave", () => { survol(null); if (V.mode === "pile") pileIn.style.transform = ""; });
  zone.addEventListener("click", e => {
    if (bouge) { bouge = false; return; }
    const p = e.target.closest?.(".box"); if (V.mode !== "etage" || !p) return;
    const b = boxParId(p.dataset.id);
    if (!b.libre) { bulle.innerHTML = `<b>Box ${esc(b.nom)}</b><small>Loué, contrat actif dans Nexudus</small>`; return; }
    if (S.filtre && b.taille !== S.filtre) { S.filtre = null; peindre(); }
    choisir(b, true);
  });
}

let survole = null;
function survol(p, e) {
  if (survole && survole !== p) survole.classList.remove("survol");
  survole = p;
  if (!p) { bulle.classList.remove("on"); prisme(); return; }
  const b = boxParId(p.dataset.id);
  if (b.libre && !(S.filtre && b.taille !== S.filtre)) p.classList.add("survol");
  const r = zone.getBoundingClientRect();
  bulle.style.left = e.clientX - r.left + "px"; bulle.style.top = e.clientY - r.top + "px";
  bulle.innerHTML = `<b>Box ${esc(b.nom)}</b> ${LIBELLE[b.taille]}<small>${b.libre ? eur(prix(b.taille)) + " par mois, libre" : "Loué, contrat actif dans Nexudus"}</small>`;
  bulle.classList.add("on");
  prisme(b.libre ? b : null);
}

function prisme(survolB) {
  const H = S.zones.kz * S.zones.hauteur;
  for (const niv of $$(".niveau", pileIn)) {
    const g = $(".prisme", niv), rep = $(".repere", niv); g.innerHTML = ""; rep.innerHTML = "";
    const n = niv.dataset.n;
    for (const b of [S.choix, survolB].filter(b => b && b.etage === n)) {
      const pts = S.zones.etages[n][b.nom]; if (!pts) continue;
      const haut = pts.map(([x, y]) => [x, y - H]);
      g.insertAdjacentHTML("beforeend", pts.map((q, i) => `<line class="arete" x1="${q[0]}" y1="${q[1]}" x2="${haut[i][0]}" y2="${haut[i][1]}"/>`).join("") + `<polygon class="haut" points="${haut.map(q => q.join(",")).join(" ")}"/>`);
      if (b === S.choix) {
        const cx = haut.reduce((s, q) => s + q[0], 0) / 4, cy = Math.min(...haut.map(q => q[1])) - 26, t = `Box ${b.nom}`, w = t.length * 9 + 26;
        rep.innerHTML = `<circle class="onde" cx="${cx}" cy="${cy + 18}" r="8"/><rect class="etiquette" x="${cx - w / 2}" y="${cy - 26}" width="${w}" height="30" rx="15"/><text x="${cx}" y="${cy - 6}" text-anchor="middle">${esc(t)}</text><circle cx="${cx}" cy="${cy + 18}" r="6"/>`;
      }
    }
  }
}

export function choisir(b, parClic) {
  S.choix = boxParId(b.id);
  if (V.mode !== "etage" || V.etage !== S.choix.etage) { ouvrir(S.choix.etage); setTimeout(() => choisir(b, parClic), 650); return; }
  peindre(); fiche(true); centrerSur(S.choix);
}

function fiche(anime) {
  const f = $("#fiche"); f.classList.remove("anime"); if (anime && !reduit) { void f.offsetWidth; f.classList.add("anime"); }
  const b = S.choix;
  if (b) {
    const estReco = S.reco && S.reco.id === b.id, vol = volumeTaille(b.taille);
    const pres = b.etage === "0" ? "à deux pas du quai de chargement" : "près du monte-charge";
    f.innerHTML = `${estReco ? `<span class="reco">★ Notre suggestion en ${LIBELLE[b.taille]}</span>` : `<span class="reco" style="background:var(--em-clair);color:var(--em)">Libre</span>`}
      <div><h3>Box ${esc(b.nom)}</h3><div class="ou">${NOMS[b.etage]}, ${pres}</div></div>
      <div class="prix"><b>${eur(prix(b.taille))}</b><span>par mois</span></div>
      <dl><dt>Surface</dt><dd>${b.taille === "C" ? "Casier de 1 m³" : `${LIBELLE[b.taille]}, ${vol} m³ environ`}</dd><dt>Idéal pour</dt><dd>${IDEAL[b.taille]}</dd><dt>Engagement</dt><dd>Aucun, préavis de ${preavis()} jours</dd></dl>
      <button class="btn btn-tg" type="button" id="btn-resa" ${b.libre && !S.apercu ? "" : "disabled"}>Réserver le box ${esc(b.nom)}</button>
      ${S.apercu ? `<p style="font-size:13px;color:var(--tg-fonce);margin:10px 0 0">Aperçu hors ligne : réservation désactivée.</p>` : ""}
      <button class="lien autre" type="button" id="btn-autre">Choisir un autre box</button>`;
    $("#btn-resa").onclick = () => onReserver(S.choix);
    $("#btn-autre").onclick = () => { S.choix = null; recentrer(); peindre(); fiche(true); };
  } else if (V.mode === "etage") {
    const n = V.etage;
    f.innerHTML = `<div class="vide"><b>${NOMS[n]}</b>${libres(n, S.filtre)} boxes ${S.filtre ? LIBELLE[S.filtre] : ""} libres sur cet étage. Touchez un box vert pour le choisir. Faites défiler ou pincez pour zoomer.</div>`;
  } else {
    f.innerHTML = `<div class="vide"><b>${libresTotal(S.filtre)} boxes ${S.filtre ? "de " + LIBELLE[S.filtre] + " " : ""}libres.</b>Choisissez un étage dans l'immeuble ou avec l'ascenseur.</div>`;
  }
}
export function rafraichir() { peindre(); fiche(); }
