// api/analyze.js — Proxy serverless vers l'API Anthropic
// Tourne côté serveur Vercel, la clé API n'est jamais exposée au navigateur

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://bchl-noteflow.vercel.app";
const MAX_TEXT_LENGTH = 5000;
const ACCEPTED_MIME   = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default async function handler(req, res) {
  // CORS — restreindre à notre domaine en production
  const origin = req.headers.origin || "";
  const allowedOrigin = ALLOWED_ORIGIN || origin; // fallback dev : accepte l'appelant
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, space, categories } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });
  if (text.length > MAX_TEXT_LENGTH)
    return res.status(400).json({ error: `Texte trop long (max ${MAX_TEXT_LENGTH} caractères)` });

  const catKeys = categories?.join(" | ") || "mission | client | reunion | idee";
  const spaceLabel = space === "perso" ? "personnel" : "professionnel";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Tu es l'assistant de NoteFlow (espace : ${spaceLabel}).
L'utilisateur saisit ses notes librement, souvent en langage parlé, avec des fautes, des abréviations ou une syntaxe approximative.
Tu dois retourner UNIQUEMENT un objet JSON valide, sans markdown, sans commentaire.

Note brute : "${text}"

Catégories disponibles : ${catKeys}

Instructions :
- "corrected" : la note brute corrigée mot à mot — corrige UNIQUEMENT l'orthographe, la grammaire, la ponctuation et les majuscules. Ne reformule pas, ne résume pas, garde exactement le sens et les mots de l'utilisateur.
- "title" : titre court et clair (max 10 mots), bien formulé
- "body" : version professionnelle et structurée de la note (2-3 phrases complètes, ton neutre et professionnel)
- "category" : choisir parmi les catégories disponibles, ou "general" si aucune ne convient
- "priority" : évaluer objectivement selon l'urgence détectée
- "dueLabel" : extraire une échéance si mentionnée, sinon "Pas d'échéance"
- "actions" : 3 actions concrètes et actionnables pour traiter cette note

Format JSON :
{
  "corrected": "saisie brute corrigée (orthographe, grammaire, ponctuation uniquement)",
  "title": "titre court (max 10 mots)",
  "body": "version professionnelle et structurée (2-3 phrases)",
  "category": "<une des catégories disponibles>",
  "priority": "haute | moyenne | basse",
  "dueLabel": "Aujourd'hui | Demain | Cette semaine | Ce mois | Pas d'échéance",
  "dueUrgent": true/false,
  "actions": ["action concrète 1", "action concrète 2", "action concrète 3"]
}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const raw = data.content?.find(b => b.type === "text")?.text || "";
    let result;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      console.error("JSON parse failed. Raw response:", raw);
      return res.status(502).json({ error: "Réponse IA invalide, veuillez réessayer." });
    }
    return res.status(200).json(result);

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message });
  }
}
