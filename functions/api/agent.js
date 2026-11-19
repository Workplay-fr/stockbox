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
  try {
    const r = await repondre(env, h.slice(-14));
    return json(200, { ok: true, ...r });
  } catch (e) {
    console.error("agent", String(e.message).slice(0, 200));
    return json(502, { ok: false, erreur: "L'assistant est momentanément indisponible. Réessayez dans un instant." });
  }
}
export const onRequest = () => json(405, { ok: false, erreur: "Méthode non autorisée." });
