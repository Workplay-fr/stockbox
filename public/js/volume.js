// Étape 2 : on range ses affaires d'un toucher, le box se remplit et grandit jusqu'à la bonne taille.
import { $, $$, el, G, S, TAILLES, LIBELLE, EMPRISE, eur, prix, volumeTaille, libresTotal, reduit } from "./commun.js?v=20261119172147";

const I = { // icônes au trait (viewBox 40)
  carton: '<path d="M6 14 20 7l14 7v14l-14 7-14-7Z"/><path d="M6 14l14 7 14-7M20 21v14M13 10.5l14 7"/>',
  valise: '<rect x="9" y="13" width="22" height="20" rx="3"/><path d="M15 13V9h10v4M15 18v10M25 18v10"/>',
  litd: '<path d="M5 30V14M35 30v-8M5 22h30M5 30h30"/><rect x="8" y="16" width="9" height="6" rx="2"/><rect x="19" y="16" width="9" height="6" rx="2"/>',
  lits: '<path d="M8 30V14M32 30v-8M8 22h24M8 30h24"/><rect x="11" y="16" width="8" height="6" rx="2"/>',
  canape: '<path d="M7 19v-4a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v4"/><path d="M5 21a2 2 0 0 1 4 0v3h22v-3a2 2 0 0 1 4 0v8H5Z"/><path d="M8 29v3M32 29v3"/>',
  fauteuil: '<path d="M11 19v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5"/><path d="M8 21a2 2 0 0 1 4 0v3h16v-3a2 2 0 0 1 4 0v8H8Z"/><path d="M11 29v3M29 29v3"/>',
  table: '<path d="M5 15h30M9 15v18M31 15v18M5 15l3-4h24l3 4"/>',
  chaise: '<path d="M13 7v26M13 20h14v13M13 20V7h12v13"/>',
  armoire: '<rect x="9" y="5" width="22" height="30" rx="2"/><path d="M20 5v30M17 19v3M23 19v3"/>',
  commode: '<rect x="7" y="11" width="26" height="20" rx="2"/><path d="M7 18h26M7 25h26M18 14.5h4M18 21.5h4M18 28h4M10 31v3M30 31v3"/>',
  biblio: '<rect x="9" y="5" width="22" height="30" rx="1.5"/><path d="M9 15h22M9 25h22M13 6v9M16 6v9M14 16v9M22 26v9M26 26v9"/>',
  bureau: '<path d="M5 15h30M8 15v18M32 15v18M22 15v18M22 22h10"/>',
  frigo: '<rect x="11" y="5" width="18" height="30" rx="3"/><path d="M11 15h18M15 9v3M15 19v5"/>',
  lavelinge: '<rect x="8" y="6" width="24" height="28" rx="3"/><circle cx="20" cy="22" r="7"/><path d="M12 11h6"/>',
  tv: '<rect x="5" y="9" width="30" height="18" rx="2"/><path d="M14 33h12M20 27v6"/>',
  velo: '<circle cx="10" cy="26" r="6"/><circle cx="30" cy="26" r="6"/><path d="M10 26l6-11h9l5 11M16 15l4 11h-10M23 11h5"/>',
};
export const OBJETS = [
  ["carton", "Carton", .08, 5], ["valise", "Valise", .12, 1], ["litd", "Lit double", 2, 1], ["lits", "Lit simple", 1.1, 1],
  ["canape", "Canapé", 2, 1], ["fauteuil", "Fauteuil", .8, 1], ["table", "Table", .9, 1], ["chaise", "Chaise", .25, 1],
  ["armoire", "Armoire", 1.5, 1], ["commode", "Commode", .7, 1], ["biblio", "Bibliothèque", .8, 1], ["bureau", "Bureau", .8, 1],
  ["frigo", "Réfrigérateur", .8, 1], ["lavelinge", "Lave-linge", .5, 1], ["tv", "Écran", .2, 1], ["velo", "Vélo", .6, 1],
];
const RACC = {
  "Quelques cartons": { carton: 10, valise: 2 },
  "Un studio": { carton: 20, valise: 2, lits: 1, table: 1, chaise: 2, canape: 1, commode: 1, frigo: 1, tv: 1, biblio: 1 },
  "Un 2 pièces": { carton: 35, valise: 3, litd: 1, canape: 1, fauteuil: 1, table: 1, chaise: 4, armoire: 1, commode: 1, biblio: 2, frigo: 1, lavelinge: 1, tv: 1, bureau: 1, velo: 1 },
  "Un 3 pièces": { carton: 60, valise: 4, litd: 1, lits: 1, canape: 1, fauteuil: 2, table: 1, chaise: 6, armoire: 2, commode: 2, biblio: 3, frigo: 1, lavelinge: 1, tv: 2, bureau: 1, velo: 2 },
};
const Q = Object.fromEntries(OBJETS.map(o => [o[0], 0]));
let suite = () => {}, taille = "C";
const cur = { w: 1, d: 1, h: 1, f: 0 };   // dimensions affichées (m) et hauteur de remplissage (m)

export const volume = () => OBJETS.reduce((s, [id, , v]) => s + Q[id] * v, 0);
export const tailleConseillee = (v = volume()) => TAILLES.find(t => volumeTaille(t) >= v * 1.15) || "20";

export function initVolume(onSuite) {
  suite = onSuite;
  const r = $("#raccourcis");
  for (const nom of Object.keys(RACC)) {
    const b = el("button", { type: "button", "aria-pressed": "false" }, nom);
    b.onclick = () => { for (const k in Q) Q[k] = RACC[nom][k] || 0; $$("button", r).forEach(x => x.setAttribute("aria-pressed", String(x === b))); majObjets(); calcul(true); pluie(); };
    r.append(b);
  }
  const o = $("#objets");
  for (const [id, nom, v, pas] of OBJETS) {
    const b = el("div", { class: "objet", role: "button", tabindex: "0", "data-id": id, "aria-label": `Ajouter : ${nom}` }, `<button class="moins" type="button" aria-label="Retirer : ${nom}">−</button><span class="q">0</span><svg viewBox="0 0 40 40" aria-hidden="true">${I[id]}</svg>${nom}`);
    const ajouter = () => { Q[id] += pas; majObjets(); voler(b); calcul(true); $$("#raccourcis button").forEach(x => x.setAttribute("aria-pressed", "false")); };
    b.addEventListener("click", e => { if (e.target.closest(".moins")) { Q[id] = Math.max(0, Q[id] - pas); majObjets(); calcul(true); return; } ajouter(); });
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ajouter(); } });
    o.append(b);
  }
  $("#vers-box").onclick = () => suite(volume() ? taille : null);
  $("#passer").onclick = () => suite(null);
  dessiner(); calcul(false);
}

function majObjets() { for (const d of $$(".objet")) { const q = Q[d.dataset.id]; $(".q", d).textContent = q; d.classList.toggle("a", q > 0); } }

// Un petit cube part de l'objet touché et tombe dans le box.
function voler(depuis) {
  if (reduit || !window.gsap) return;
  const a = depuis.getBoundingClientRect(), b = $("#boite").getBoundingClientRect();
  const c = el("div", { class: "cube-vol" }); document.body.append(c);
  const x0 = a.left + a.width / 2 - 11, y0 = a.top + a.height / 2 - 11, x1 = b.left + b.width / 2 - 11 + (Math.random() - .5) * 60, y1 = b.top + b.height * .45;
  G.set(c, { x: x0, y: y0, rotate: 0 });
  G.timeline().to(c, { x: (x0 + x1) / 2, y: Math.min(y0, y1) - 120, rotate: 160, duration: .35, ease: "power2.out" }).to(c, { x: x1, y: y1, rotate: 320, scale: .5, opacity: .2, duration: .35, ease: "power2.in", onComplete: () => c.remove() });
}
function pluie() { const objs = $$(".objet.a"); objs.slice(0, 10).forEach((o, i) => setTimeout(() => voler(o), i * 70)); }

// Projection isométrique d'un point du box (en mètres), centré sur l'emprise.
const K = 64, C = Math.cos(Math.PI / 6), SN = .5;
const iso = (x, y, z) => [((x - y) * C * K).toFixed(1), ((x + y) * SN * K - z * K).toFixed(1)];
const poly = pts => pts.map(p => iso(...p).join(",")).join(" ");
function dessiner() {
  const { w, d, h, f } = cur, x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
  const z = Math.min(f, h);
  $("#boite").innerHTML = `
    <ellipse cx="0" cy="${(w + d) / 2 * SN * K * .35 + 40}" rx="${(w + d) * C * K * .62}" ry="${(w + d) * SN * K * .42}" fill="rgba(19,36,30,.08)"/>
    <polygon class="sol" points="${poly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]])}"/>
    <polygon class="mur" points="${poly([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]])}"/>
    <polygon class="mur2" points="${poly([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]])}"/>
    ${z > .01 ? `<polygon class="plein-g" points="${poly([[x0, y1, 0], [x1, y1, 0], [x1, y1, z], [x0, y1, z]])}"/>
    <polygon class="plein-d" points="${poly([[x1, y0, 0], [x1, y1, 0], [x1, y1, z], [x1, y0, z]])}"/>
    <polygon class="plein-top" points="${poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])}"/>` : ""}
    <polyline class="arete" points="${poly([[x0, y1, h], [x1, y1, h], [x1, y0, h]])}"/>
    <polyline class="arete" points="${poly([[x0, y1, 0], [x0, y1, h]])}"/><polyline class="arete" points="${poly([[x1, y1, 0], [x1, y1, h]])}"/><polyline class="arete" points="${poly([[x1, y0, 0], [x1, y0, h]])}"/>
    <polygon class="cadre-porte" points="${poly([[x1, y0 + d * .15, 0], [x1, y1 - d * .15, 0], [x1, y1 - d * .15, h * .9], [x1, y0 + d * .15, h * .9]])}"/>`;
}

let precedente = null;
export function calcul(anime) {
  const v = volume(), t = tailleConseillee(v), cap = volumeTaille(t);
  S.volume = v; taille = t;
  $("#vol").textContent = v.toFixed(1).replace(".", ",").replace(",0", "");
  const [w, d, h] = EMPRISE[t];
  const plein = Math.min(1, v / cap);
  const dest = { w, d, h, f: h * plein };
  if (anime && window.gsap) G.to(cur, { ...dest, duration: t !== precedente ? 1 : .6, ease: t !== precedente ? "elastic.out(1,.65)" : "power3.out", onUpdate: dessiner });
  else { Object.assign(cur, dest); dessiner(); }
  if (t !== precedente && precedente && window.gsap) G.fromTo("#taille-reco", { scale: 1.25, color: "#F28C28" }, { scale: 1, color: "#0F5C45", duration: .7, ease: "back.out(2)" });
  precedente = t;
  const n = libresTotal(t);
  $("#taille-reco").textContent = t === "C" ? "Un casier" : `Box de ${LIBELLE[t]}`;
  $("#taille-prix").textContent = `${eur(prix(t))} par mois, ${n} libres`;
  $("#rempl").innerHTML = v ? (v * 1.15 > volumeTaille("20") ? "Plus d'un box de 20 m² : <b>prévoyez deux boxes voisins</b>." : `Rempli à <b>${Math.round(plein * 100)} %</b>, avec de la place pour circuler.`) : "Ajoutez vos affaires.";
  const b = $("#vers-box"); b.textContent = v ? `Voir les boxes de ${LIBELLE[t]}` : "Voir tous les boxes";
}
