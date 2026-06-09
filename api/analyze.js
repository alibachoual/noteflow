// api/analyze.js — Proxy serverless vers l'API Anthropic
// Tourne côté serveur Vercel, la clé API n'est jamais exposée au navigateur

export default async function handler(req, res) {
  // CORS — autoriser uniquement notre domaine
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, space, categories } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });

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
          content: `Tu es l'IA de NoteFlow (espace : ${spaceLabel}).
Analyse cette note et retourne UNIQUEMENT un objet JSON valide, sans markdown.

Note brute : "${text}"

Catégories disponibles : ${catKeys}

Format JSON :
{
  "title": "titre court (max 10 mots)",
  "body": "note reformulée professionnellement (2-3 phrases)",
  "category": "<une des catégories disponibles>",
  "priority": "haute | moyenne | basse",
  "dueLabel": "Aujourd'hui | Demain | Cette semaine | Ce mois | Pas d'échéance",
  "dueUrgent": true/false,
  "actions": ["action 1", "action 2", "action 3"]
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
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return res.status(200).json(result);

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message });
  }
}
