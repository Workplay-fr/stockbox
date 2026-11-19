// Protège tout le site par mot de passe (secret Cloudflare SITE_PASSWORD, second mot de passe facultatif SITE_PASSWORD_2).
// Sans cookie valide : écran d'accès pour les pages, 401 pour /api/*. Les images restent servies pour l'écran d'accès.
const COOKIE = "sb_acces";
const DUREE = 60 * 60 * 24 * 30;

async function jeton(secret) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode("stockbox-acces-v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function egal(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const lireCookie = (req, nom) => (req.headers.get("cookie") || "").split(/;\s*/).map(c => c.split("=")).find(([k]) => k === nom)?.[1] || "";
const sur = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const versInterne = s => (typeof s === "string" && s.startsWith("/") && !s.startsWith("//") ? s : "/");

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url), p = url.pathname;
  if (p.startsWith("/img/") || p === "/favicon.svg" || p === "/robots.txt") return next();
  const secrets = [env.SITE_PASSWORD, env.SITE_PASSWORD_2].filter(Boolean);
  const jetons = await Promise.all(secrets.map(jeton));

  if (p === "/deconnexion") return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });

  if (p === "/connexion" && request.method === "POST") {
    const f = await request.formData().catch(() => null);
    const suite = versInterne(f && f.get("suite"));
    if (!secrets.length) return page(suite, "L'accès n'est pas encore configuré. Revenez un peu plus tard.", 503);
    const saisi = await jeton(String((f && f.get("mot_de_passe")) || ""));
    const bon = jetons.find(j => egal(saisi, j));
    if (bon) return new Response(null, { status: 303, headers: { location: suite, "set-cookie": `${COOKIE}=${bon}; Path=/; Max-Age=${DUREE}; HttpOnly; Secure; SameSite=Lax` } });
    await new Promise(r => setTimeout(r, 700));
    return page(suite, "Ce mot de passe n'est pas le bon.", 401);
  }

  const recu = lireCookie(request, COOKIE);
  if (recu && jetons.some(j => egal(recu, j))) {
    const r = await next();
    const h = new Headers(r.headers); h.set("x-robots-tag", "noindex, nofollow");
    return new Response(r.body, { status: r.status, headers: h });
  }
  if (p.startsWith("/api/")) return new Response(JSON.stringify({ ok: false, erreur: "Session expirée. Rechargez la page pour vous reconnecter." }), { status: 401, headers: { "content-type": "application/json; charset=utf-8" } });
  return page(p === "/connexion" ? "/" : p + url.search, "", 401);
}

function page(suite, erreur, status) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><title>StockBox · Accès</title><link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap">
<style>
:root{--em:#0F5C45;--em2:#0A4433;--tg:#F28C28;--f:"Instrument Sans",system-ui,sans-serif;--t:"Bricolage Grotesque",var(--f)}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;font:400 16px/1.55 var(--f);color:#fff;background:#0b2a22 url(/img/facade.webp) center/cover no-repeat;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;background:linear-gradient(180deg,rgba(6,24,19,.55),rgba(6,24,19,.25) 45%,rgba(6,24,19,.8))}
main{position:relative;min-height:100%;display:grid;place-items:center;padding:24px}
.carte{width:min(440px,100%);padding:34px 30px 28px;border-radius:28px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);box-shadow:0 30px 80px rgba(0,0,0,.35);animation:up .8s cubic-bezier(.22,1,.36,1) both}
.logo{display:flex;align-items:center;gap:10px;font:700 22px/1 var(--t);letter-spacing:-.01em}
h1{font:700 clamp(28px,5vw,36px)/1.08 var(--t);letter-spacing:-.02em;margin:22px 0 8px}
p{margin:0 0 22px;color:rgba(255,255,255,.82)}
.champ{display:flex;background:#fff;border-radius:999px;padding:5px 5px 5px 20px;gap:6px}
input{flex:1;min-width:0;border:0;outline:none;font:500 16px/1 var(--f);color:#14231e;background:transparent}
button{border:0;border-radius:999px;background:var(--tg);color:#1a1205;font:600 15px/1 var(--f);padding:14px 22px;cursor:pointer;transition:transform .2s,filter .2s}
button:hover{filter:brightness(1.06);transform:translateY(-1px)}
.err{min-height:1.4em;margin:10px 4px 0;color:#FFD3AE;font-size:14px}
.note{margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.2);font-size:13px;color:rgba(255,255,255,.72)}
.note b{color:#fff;font-weight:600}.note a{color:#fff}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
</style></head><body><main><form class="carte" method="post" action="/connexion">
<div class="logo">${LOGO}StockBox</div>
<h1>Accès à la démo</h1><p>Ce site de démonstration est accessible sur invitation. Saisissez le mot de passe qui vous a été communiqué.</p>
<div class="champ"><input name="mot_de_passe" type="password" placeholder="Mot de passe" autocomplete="current-password" required autofocus aria-label="Mot de passe"><button type="submit">Entrer</button></div>
<input type="hidden" name="suite" value="${sur(suite)}"><p class="err" role="alert">${sur(erreur)}</p>
<div class="note"><b>Un lieu imaginaire.</b> StockBox est un centre de self-stockage fictif. Disponibilités, réservations et contrats fonctionnent avec <b>Nexudus</b>, la plateforme de gestion utilisée par plus de 4 000 espaces dans 90 pays. <a href="https://nexudus.com" target="_blank" rel="noopener">Découvrir Nexudus</a></div>
</form></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
const LOGO = `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z" fill="#F28C28"/><path d="M16 3 28 9.5 16 16 4 9.5Z" fill="#FFB061"/><path d="M16 16v13L4 22.5v-13Z" fill="#D9741A"/></svg>`;
