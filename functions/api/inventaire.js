// GET /api/inventaire : état réel des 124 boxes (libre / occupé), tailles, prix des formules et produits, lus dans Nexudus.
import { catalogue, pret, json } from "../../lib/nexudus.js";

export async function onRequestGet({ env }) {
  if (!pret(env)) return json(503, { ok: false, code: "non_configure", erreur: "Le site n'est pas encore relié à Nexudus." });
  try {
    return json(200, { ok: true, ...(await catalogue(env)) });
  } catch (e) {
    console.error("inventaire", e.message);
    return json(502, { ok: false, erreur: "Impossible de lire les disponibilités pour le moment." });
  }
}
