// Étape 1 : carte stylisée de Paris et de la petite couronne, réseau de centres StockBox (fictifs).
// Seul Saint-Ouen est relié à Nexudus ; les autres centres servent le décor (complets, liste d'attente, ouverture prochaine).
import { $, el, NS, esc, G, S, libresTotal, reduit } from "./commun.js";

export const CENTRES = [
  { id: "saint-ouen", nom: "Saint-Ouen", sous: "Les Puces", adresse: "14 passage des Malles, 93400 Saint-Ouen", lat: 48.9030, lon: 2.3405, statut: "ouvert" },
  { id: "clichy", nom: "Clichy", sous: "Berges de Seine", lat: 48.9058, lon: 2.2985, statut: "complet" },
  { id: "pantin", nom: "Pantin", sous: "Canal de l'Ourcq", lat: 48.8945, lon: 2.4085, statut: "bientot" },
  { id: "paris19", nom: "Paris 19e", sous: "La Villette", lat: 48.8885, lon: 2.3800, statut: "attente" },
  { id: "montreuil", nom: "Montreuil", sous: "Croix-de-Chavaux", lat: 48.8575, lon: 2.4355, statut: "complet" },
  { id: "ivry", nom: "Ivry-sur-Seine", sous: "Port", lat: 48.8155, lon: 2.3895, statut: "complet" },
  { id: "paris13", nom: "Paris 13e", sous: "Masséna", lat: 48.8265, lon: 2.3760, statut: "attente" },
  { id: "issy", nom: "Issy-les-Moulineaux", sous: "Bords de Seine", lat: 48.8262, lon: 2.2605, statut: "complet" },
  { id: "boulogne", nom: "Boulogne", sous: "Point-du-Jour", lat: 48.8372, lon: 2.2445, statut: "complet" },
  { id: "levallois", nom: "Levallois", sous: "Front de Seine", lat: 48.8960, lon: 2.2830, statut: "attente" },
];
const STATUT = { ouvert: "Boxes libres", complet: "Complet", attente: "Liste d'attente", bientot: "Ouverture en 2027" };

// Projection : emprise lat 48.79–48.95, lon 2.20–2.47 ; viewBox 1000 × 900 (cos 48,85° pris en compte).
const LON0 = 2.20, LON1 = 2.47, LAT0 = 48.95, LAT1 = 48.79, W = 1000, H = 900;
const P = (lat, lon) => [(lon - LON0) / (LON1 - LON0) * W, (LAT0 - lat) / (LAT0 - LAT1) * H];
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

const SEINE = [[48.800,2.432],[48.810,2.414],[48.820,2.400],[48.830,2.386],[48.840,2.371],[48.850,2.357],[48.856,2.344],[48.860,2.330],[48.864,2.315],[48.862,2.300],[48.857,2.291],[48.848,2.280],[48.838,2.268],[48.829,2.256],[48.827,2.238],[48.838,2.224],[48.856,2.221],[48.871,2.231],[48.884,2.244],[48.897,2.262],[48.908,2.284],[48.915,2.306],[48.918,2.328],[48.924,2.344],[48.935,2.351],[48.946,2.334],[48.952,2.312]];
const PERIPH = [[48.878,2.283],[48.887,2.298],[48.894,2.313],[48.898,2.330],[48.900,2.344],[48.898,2.359],[48.896,2.378],[48.888,2.392],[48.876,2.406],[48.864,2.410],[48.847,2.412],[48.835,2.405],[48.826,2.389],[48.819,2.367],[48.818,2.345],[48.822,2.326],[48.827,2.305],[48.832,2.287],[48.838,2.262],[48.849,2.255],[48.864,2.266],[48.873,2.276]];
const VILLES = [["Saint-Denis",48.937,2.360],["Clichy",48.911,2.300],["Levallois",48.893,2.274],["Neuilly",48.882,2.258],["Boulogne",48.832,2.232],["Issy",48.818,2.262],["Montrouge",48.812,2.318],["Ivry",48.807,2.393],["Vincennes",48.846,2.444],["Montreuil",48.866,2.448],["Pantin",48.902,2.414],["Aubervilliers",48.916,2.386]];

function lisse(pts, ferme = false) {
  const p = pts.map(([a, b]) => P(a, b)); const n = p.length; let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  const g = i => p[ferme ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (ferme ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (ferme ? "Z" : "");
}

let svg, vb = { x: 0, y: 0, w: W, h: H }, vous = null, surChoix = () => {};
const majVB = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
function cadrer(x, y, w, h, duree = 1.2) { return new Promise(r => G.to(vb, { x, y, w, h, duration: reduit ? 0 : duree, ease: "power3.inOut", onUpdate: majVB, onComplete: r })); }

export function initCarte(onChoix) {
  surChoix = onChoix;
  svg = $("#carte");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  let points = ""; for (let x = 10; x < W; x += 22) for (let y = 10; y < H; y += 22) points += `<circle cx="${x}" cy="${y}" r="1.1"/>`;
  const nous = CENTRES[0];
  svg.innerHTML = `<rect class="fond" x="-2000" y="-2000" width="5000" height="5000"/><g class="grille">${points}</g>
    <path class="seine" d="${lisse(SEINE)}" stroke-width="16"/><path class="seine" d="${lisse(SEINE)}" stroke-width="7" style="stroke:#247A62"/>
    <path class="periph" d="${lisse(PERIPH, true)}" stroke-width="2.5"/>
    <text class="ville" x="${P(48.858, 2.338)[0]}" y="${P(48.858, 2.338)[1]}" text-anchor="middle" style="font-size:22px;font-weight:600;fill:rgba(255,255,255,.18);letter-spacing:.3em">PARIS</text>
    ${VILLES.map(([n, a, b]) => { const [x, y] = P(a, b); return `<text class="ville" x="${x}" y="${y}" text-anchor="middle">${n}</text>`; }).join("")}
    <g id="trajet"></g><g id="pins"></g><g id="vous"></g>`;
  const g = $("#pins", svg);
  for (const c of [...CENTRES].reverse()) {
    const [x, y] = P(c.lat, c.lon), moi = c.statut === "ouvert";
    const pin = document.createElementNS(NS, "g");
    pin.setAttribute("class", `pin ${moi ? "nous" : c.statut === "complet" ? "complet" : ""}`);
    pin.setAttribute("transform", `translate(${x} ${y})`); pin.dataset.id = c.id; pin.setAttribute("tabindex", "-1");
    pin.innerHTML = `<g class="pop"><circle class="halo" r="${moi ? 22 : 13}"/><circle class="coeur" r="${moi ? 11 : 7}"/><text x="${moi ? 18 : 13}" y="5">${esc(c.nom)}</text></g>`;
    pin.addEventListener("click", () => montrer(c));
    g.append(pin);
  }
  $("#recherche").addEventListener("submit", e => { e.preventDefault(); chercher($("#adresse").value.trim()); });
  liste(null);
}

export function entrerCarte() {
  vb = { x: 0, y: 0, w: W, h: H }; majVB();
  $("#fiche-centre").hidden = true;
  const pops = [...svg.querySelectorAll(".pop")];
  G.fromTo(pops, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: .6, ease: "back.out(2.4)", stagger: .06, delay: .2 });
  const s = svg.querySelectorAll(".seine");
  s.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; G.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.out" }); });
  setTimeout(() => $("#adresse").focus({ preventScroll: true }), 500);
}

function liste(ref) {
  const ul = $("#centres"); ul.innerHTML = "";
  const tri = [...CENTRES].map(c => ({ ...c, d: ref ? km(ref, c) : null })).sort((a, b) => (ref ? a.d - b.d : (a.statut === "ouvert" ? -1 : 1)));
  for (const c of tri) {
    const li = el("li", { class: c.statut === "ouvert" ? "nous" : "" });
    const b = el("button", { type: "button" }, `<span><b>${esc(c.nom)}</b> <span style="opacity:.6">${esc(c.sous)}</span></span><span class="st">${c.statut === "ouvert" ? `${libresTotal()} libres` : STATUT[c.statut]}</span>${c.d != null ? `<span class="km">${c.d.toFixed(1).replace(".", ",")} km</span>` : ""}`);
    b.onclick = () => montrer(c); li.append(b); ul.append(li);
  }
}

async function chercher(q) {
  if (q.length < 3) return;
  const rep = $("#reponse"); rep.textContent = "Recherche…";
  let pos = null;
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`).then(r => r.json());
    const f = r.features && r.features[0];
    if (f) pos = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], label: f.properties.label };
  } catch { /* hors ligne */ }
  if (!pos) { rep.textContent = "Adresse introuvable. Essayez avec la ville ou le code postal."; return; }
  vous = pos;
  const proche = [...CENTRES].sort((a, b) => km(pos, a) - km(pos, b))[0], nous = CENTRES[0], d = km(pos, nous), min = Math.max(4, Math.round(d / 22 * 60 + 4));
  rep.innerHTML = proche.id === nous.id
    ? `Le centre de <b>Saint-Ouen</b> est le plus proche : ${d.toFixed(1).replace(".", ",")} km, environ ${min} min en voiture.`
    : `${esc(proche.nom)} est ${proche.statut === "complet" ? "complet" : proche.statut === "attente" ? "sur liste d'attente" : "en travaux"}. Le plus proche avec des boxes libres : <b>Saint-Ouen</b>, à ${d.toFixed(1).replace(".", ",")} km (environ ${min} min).`;
  liste(pos);
  const [x, y] = P(pos.lat, pos.lon), [x2, y2] = P(nous.lat, nous.lon);
  $("#vous", svg).innerHTML = `<g class="vous" transform="translate(${x} ${y})"><circle class="onde" r="9"/><circle r="7"/></g>`;
  const mx = (x + x2) / 2, my = Math.min(y, y2) - Math.hypot(x2 - x, y2 - y) * .25;
  const t = $("#trajet", svg); t.innerHTML = `<path class="trajet" d="M${x},${y} Q${mx},${my} ${x2},${y2}"/>`;
  if (x >= -200 && x <= W + 200 && y >= -200 && y <= H + 200) {
    const minx = Math.min(x, x2) - 160, maxx = Math.max(x, x2) + 160, miny = Math.min(y, y2, my) - 140, maxy = Math.max(y, y2) + 140;
    const w = Math.max(maxx - minx, 360), h = w * H / W;
    await cadrer((minx + maxx) / 2 - w / 2, (miny + maxy) / 2 - h / 2, w, Math.max(h, maxy - miny));
  }
  montrer(nous);
}

function montrer(c) {
  const f = $("#fiche-centre"); const nous = CENTRES[0];
  const d = vous ? km(vous, c) : null;
  if (c.statut === "ouvert") {
    f.innerHTML = `<img src="/img/facade-768.webp" alt="Le centre StockBox de Saint-Ouen"><div><b>StockBox ${esc(c.nom)}</b><small>${esc(c.adresse)}${d != null ? `, à ${d.toFixed(1).replace(".", ",")} km` : ""}</small><button class="btn btn-tg" type="button" id="choisir-centre">Choisir ce centre</button></div>`;
    $("#choisir-centre", f).onclick = () => plonger(c);
  } else {
    f.innerHTML = `<div><b>StockBox ${esc(c.nom)}</b><small>${esc(c.sous)}. ${STATUT[c.statut]}${c.statut === "bientot" ? "" : " en ce moment"}.</small><p style="margin:0 0 14px;color:var(--gris);font-size:15px">Le centre le plus proche avec des boxes libres est Saint-Ouen, à ${km(c, nous).toFixed(1).replace(".", ",")} km.</p><button class="btn btn-em" type="button" id="voir-so">Voir Saint-Ouen</button></div>`;
    $("#voir-so", f).onclick = () => montrer(nous);
  }
  const deja = !f.hidden; f.hidden = false;
  if (!deja) G.fromTo(f, { opacity: 0, y: -16, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .5, ease: "power3.out" });
}

// Choix du centre : on plonge dans la carte jusqu'au centre, puis vers la façade.
async function plonger(c) {
  S.centre = c;
  const [x, y] = P(c.lat, c.lon);
  G.to("#fiche-centre, .e-carte .panneau", { opacity: 0, y: 20, duration: .4, ease: "power2.in" });
  const voile = el("div", { style: "position:absolute;inset:0;z-index:8;background:#0d3a4a url(/img/facade.webp) center 62%/cover;opacity:0;transform:scale(1.5);pointer-events:none" });
  $(".e-carte").append(voile);
  await cadrer(x - 40, y - 36, 80, 72, 1.1);
  await new Promise(r => G.to(voile, { opacity: 1, scale: 1.08, duration: .9, ease: "power3.out", onComplete: r }));
  surChoix(c);
  setTimeout(() => { voile.remove(); G.set("#fiche-centre, .e-carte .panneau", { opacity: 1, y: 0 }); }, 900);
}
