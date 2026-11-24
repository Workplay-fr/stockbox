// POST /api/agent { historique: [{role, content}] } : assistant IA. La clé Anthropic reste côté serveur (secret ANTHROPIC_API_KEY).
import { json, pret, limite } from "../../lib/nexudus.js";
import { repondre } from "../../lib/agent.js";

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY || !pret(env)) return json(503, { ok: false, code: "non_configure", erreur: "L'assistant n'est pas encore disponible sur ce site." });
  if (limite(request, "agent", 25)) return json(429, { ok: false, erreur: "Beaucoup de messages en peu de temps : réessayez dans quelques minutes." });
  let d; try { d = await request.json(); } catch { return json(400, { ok: false, erreur: "Demande illisible." }); }
  const h = (Array.isArray(d.historique) ? d.historique : []).filter(m => m && typeof m.content === "string" && m.content.trim());
  if (!h.length) return json(400, { ok: false, erreur: "Message vide." });
  if (h.filter(m => m.role === "user").length > 30) return json(429, { ok: false, erreur: "Cette conversation est longue : rechargez la page pour en commencer une nouvelle." });
  const m0 = d.memo && typeof d.memo === "object" ? d.memo : {};
  const memo = { langue: d.langue === "en" ? "en" : "fr", devis: m0.devis && m0.devis.reference ? m0.devis : null, peutCreer: () => !limite(request, "devis", 3, 60 * 60e3) };
  try {
    const r = await repondre(env, h.slice(-16), memo);
    return json(200, { ok: true, ...r });
  } catch (e) {
    console.error("agent", String(e.message).slice(0, 200));
    // Statut 200 : un 502 renvoyé ici est remplacé par la page d'erreur HTML de Cloudflare, et le navigateur ne lit plus le message.
    const code = e.ia ? `ia_${e.status}` : "interne";
    return json(200, { ok: false, code, detail: String(e.message).slice(0, 160), erreur: memo.langue === "en" ? "The assistant is briefly unavailable. Please try again in a moment." : "L'assistant est momentanément indisponible. Réessayez dans un instant." });
  }
}
export const onRequest = () => json(405, { ok: false, erreur: "Méthode non autorisée." });
