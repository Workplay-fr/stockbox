// Comparateur de tailles : le box en 3D à l'échelle, une silhouette de 1,75 m, des cartons dedans ; les infos viennent de Nexudus.
import { $, el, G, eur, S, TAILLES, LIBELLE, EMPRISE, libresTotal, prix, volumeTaille, reduit } from "./commun.js?v=20261120143529";

const DEDANS = {
  C: ["Deux valises", "6 à 8 cartons", "Le matériel de ski ou de camping"],
  2: ["Le contenu d'une cave", "Une vingtaine de cartons", "Un vélo et quelques petits meubles"],
  5: ["Un studio ou une chambre", "Lit, canapé, table et électroménager", "Une trentaine de cartons"],
  10: ["Un 2 pièces meublé", "Ou le stock d'un commerce", "Accès direct par le monte-charge"],
  20: ["Un 3 ou 4 pièces", "Un déménagement complet", "Au rez-de-chaussée, à côté du quai"],
};
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
const OBJETS = [
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
const K = 46, C = Math.cos(Math.PI / 6), SN = .5;
const iso = (x, y, z) => [((x - y) * C * K).toFixed(1), ((x + y) * SN * K - z * K).toFixed(1)];
const poly = pts => pts.map(p => iso(...p).join(",")).join(" ");
const cur = { w: 2.1, d: 5, h: 2.5, n: 0 };
let actuelle = "10", surChoix = () => {};
const Q = Object.fromEntries(OBJETS.map(o => [o[0], 0]));
const volume = () => OBJETS.reduce((s, [id, , v]) => s + Q[id] * v, 0);
const conseillee = v => TAILLES.find(t => volumeTaille(t) >= v * 1.15) || "20";

// Cartons de 50 cm rangés du fond vers l'avant, en piles ; dessinés du plus loin au plus proche.
function cartons(w, d, h, n) {
  const s = .5, nx = Math.max(1, Math.floor(w / s)), ny = Math.max(1, Math.floor(d / s)), nz = Math.max(1, Math.floor(h * .72 / s));
  const pos = [];
  for (let iy = 0; iy < ny && pos.length < n; iy++) for (let iz = 0; iz < nz && pos.length < n; iz++) for (let ix = 0; ix < nx && pos.length < n; ix++) pos.push([ix, iy, iz]);
  pos.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
  const x0 = -w / 2 + .04, y0 = -d / 2 + .04, e = s - .05;
  return pos.map(([ix, iy, iz]) => {
    const x = x0 + ix * s, y = y0 + iy * s, z = iz * s;
    return `<polygon class="c-g" points="${poly([[x, y + e, z], [x + e, y + e, z], [x + e, y + e, z + e], [x, y + e, z + e]])}"/><polygon class="c-d" points="${poly([[x + e, y, z], [x + e, y + e, z], [x + e, y + e, z + e], [x + e, y, z + e]])}"/><polygon class="c-top" points="${poly([[x, y, z + e], [x + e, y, z + e], [x + e, y + e, z + e], [x, y + e, z + e]])}"/><polyline class="c-trait" points="${poly([[x + e / 2, y, z + e], [x + e / 2, y + e, z + e]])}"/>`;
  }).join("");
}
// Silhouette de 1,75 m posée devant le box, à droite.
function humain(w, d) {
  const [gx, gy] = iso(w / 2 + .7, d / 2 + .5, 0).map(Number), H = 1.75 * K, t = H / 7.5;
  return `<g class="humain"><ellipse cx="${gx}" cy="${gy}" rx="${t * 1.3}" ry="${t * .45}" fill="rgba(19,36,30,.12)"/><circle cx="${gx}" cy="${gy - H + t * .75}" r="${t * .78}"/><path d="M${gx - t * 1.1},${gy - H + t * 2.1} q${t * 1.1},-${t * .5} ${t * 2.2},0 l${t * .3},${t * 2.6} h-${t * .45} l-.0,${t * 3.6} h-${t * .7} l-${t * .2},-${t * 2.6} l-${t * .2},${t * 2.6} h-${t * .7} l0,-${t * 3.6} h-${t * .45} Z"/></g>`;
}
function dessiner() {
  const { w, d, h, n } = cur, x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
  $("#comp-svg").innerHTML = `<ellipse class="ombre" cx="0" cy="${(w + d) / 2 * SN * K * .3 + 30}" rx="${(w + d) * C * K * .65}" ry="${(w + d) * SN * K * .45}"/>
    <polygon class="sol" points="${poly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]])}"/>
    <polygon class="mur" points="${poly([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]])}"/>
    <polygon class="mur2" points="${poly([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]])}"/>
    ${cartons(w, d, h, Math.round(n))}
    <polyline class="arete" points="${poly([[x0, y1, h], [x1, y1, h], [x1, y0, h]])}"/><polyline class="arete" points="${poly([[x0, y1, 0], [x0, y1, h]])}"/><polyline class="arete" points="${poly([[x1, y1, 0], [x1, y1, h]])}"/><polyline class="arete" points="${poly([[x1, y0, 0], [x1, y0, h]])}"/>
    <polygon class="porte" points="${poly([[x1, y0 + d * .15, 0], [x1, y1 - d * .15, 0], [x1, y1 - d * .15, h * .9], [x1, y0 + d * .15, h * .9]])}"/>
    ${humain(w, d)}`;
}
const nbCartons = t => { const [w, d, h] = EMPRISE[t]; return Math.round(Math.floor(w / .5 || 1) * Math.floor(d / .5) * Math.floor(h * .72 / .5) * .55); };

function info(t, anime) {
  const n = libresTotal(t), [w, d, h] = EMPRISE[t];
  const z = $("#comp-info"); z.classList.remove("anime"); if (anime && !reduit) { void z.offsetWidth; z.classList.add("anime"); }
  z.innerHTML = `<p class="nom">${t === "C" ? "Casier" : "Box de " + LIBELLE[t]}</p>
    <div class="px"><b>${eur(prix(t))}</b><span>par mois, sans engagement</span></div>
    <span class="dispo"><span class="point" aria-hidden="true"></span>${n ? `${n} libres en ce moment` : "Complet pour l'instant"}</span>
    ${volume() ? `<p class="mon-vol">Vos affaires : <b>${volume().toFixed(1).replace(".", ",").replace(",0", "")} m³</b>, ${volume() * 1.15 > volumeTaille("20") ? "prévoyez deux boxes" : `rempli à ${Math.min(100, Math.round(volume() / volumeTaille(t) * 100))} %`}</p>` : ""}
    <div><h4>Y rentre</h4><ul>${DEDANS[t].map(x => `<li>${x}</li>`).join("")}</ul></div>
    <button class="cta cta-petit" type="button" id="comp-choisir" ${n ? "" : "disabled"}><span class="cta-txt">Choisir ce ${t === "C" ? "casier" : "box"}</span><span class="cta-rond" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>`;
  $("#comp-choisir").onclick = () => surChoix(t);
  $("#comp-dim").textContent = `${String(w).replace(".", ",")} × ${String(d).replace(".", ",")} m, ${String(h).replace(".", ",")} m de haut, ${volumeTaille(t)} m³`;
}

export function choisirOnglet(t, anime = true) {
  actuelle = t;
  for (const b of document.querySelectorAll(".onglet")) b.setAttribute("aria-selected", String(b.dataset.t === t));
  const [w, d, h] = EMPRISE[t];
  const v = volume();
  const dest = { w, d, h, n: v ? Math.min(nbCartons(t) / .55, Math.round(v / .125 * .82)) : nbCartons(t) };
  if (anime && window.gsap && !reduit) { G.to(cur, { w, d, h, duration: .9, ease: "elastic.out(1,.7)", onUpdate: dessiner }); G.fromTo(cur, { n: v ? cur.n : 0 }, { n: dest.n, duration: v ? .6 : 1.1, delay: v ? 0 : .25, ease: "power2.out", onUpdate: dessiner }); }
  else { Object.assign(cur, dest); dessiner(); }
  info(t, anime);
}

export function initTailles(onChoix) {
  surChoix = onChoix;
  const o = $("#onglets"); o.innerHTML = "";
  for (const t of TAILLES) {
    const b = el("button", { class: "onglet", type: "button", role: "tab", "data-t": t, "aria-selected": "false" }, t === "C" ? "Casier" : LIBELLE[t]);
    b.onclick = () => choisirOnglet(t);
    o.append(b);
  }
  choisirOnglet(actuelle, false);
  // Les cartons se rangent quand la section apparaît.
  new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { choisirOnglet(actuelle, true); io.disconnect(); } }, { threshold: .35 }).observe($(".comparateur"));
}
export const majTailles = () => info(actuelle, false);

// ---------- Simulateur de volume, dans la carte ----------
export function initSimu() {
  const bt = $("#simu-ouvrir"), pan = $("#simu");
  bt.onclick = () => { const o = pan.hidden; pan.hidden = !o; bt.setAttribute("aria-expanded", String(o)); bt.textContent = o ? "Fermer l'estimation" : "Je ne connais pas ma taille : estimer mon volume"; if (o) G.fromTo(pan, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: .45, ease: "power3.out" }); };
  const r = $("#simu-racc");
  for (const nom of Object.keys(RACC)) {
    const b = el("button", { type: "button", "aria-pressed": "false" }, nom);
    b.onclick = () => { for (const k in Q) Q[k] = RACC[nom][k] || 0; r.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); maj(); };
    r.append(b);
  }
  const g = $("#simu-objets");
  for (const [id, nom, , pas] of OBJETS) {
    const d = el("div", { class: "s-obj", "data-id": id }, `<svg viewBox="0 0 40 40" aria-hidden="true">${I[id]}</svg><span>${nom}</span><div class="s-pas"><button type="button" aria-label="Retirer : ${nom}">−</button><output>0</output><button type="button" aria-label="Ajouter : ${nom}">+</button></div>`);
    const [m, p] = d.querySelectorAll("button");
    m.onclick = () => { Q[id] = Math.max(0, Q[id] - pas); maj(); };
    p.onclick = () => { Q[id] += pas; maj(); r.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", "false")); };
    g.append(d);
  }
  $("#simu-vider").onclick = () => { for (const k in Q) Q[k] = 0; r.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", "false")); maj(); };
}
function maj() {
  for (const d of document.querySelectorAll(".s-obj")) { const q = Q[d.dataset.id]; d.querySelector("output").textContent = q; d.classList.toggle("a", q > 0); }
  const v = volume();
  $("#simu-total").innerHTML = v ? `<b>${v.toFixed(1).replace(".", ",").replace(",0", "")} m³</b> : il vous faut ${conseillee(v) === "C" ? "un casier" : "un box de " + LIBELLE[conseillee(v)]}.` : "Ajoutez vos affaires ou choisissez la taille de votre logement.";
  choisirOnglet(v ? conseillee(v) : actuelle, true);
}
