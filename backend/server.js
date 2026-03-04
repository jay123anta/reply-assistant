const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // reject huge payloads

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["POST"],
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────
// Max 15 requests per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again in an hour.",
  },
});
app.use("/api/", limiter);

// ─── Health Check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── Main Reply Endpoint ───────────────────────────────────────
app.post("/api/generate-reply", async (req, res) => {
  const { message, relationship, outcome, context } = req.body;

  // Input validation
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.trim().length < 5) {
    return res.status(400).json({ error: "Message is too short." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Message is too long (max 2000 characters)." });
  }
  if (!relationship || !outcome) {
    return res.status(400).json({ error: "Relationship and outcome are required." });
  }

  // Sanitise optional context
  const safeContext =
    context && typeof context === "string"
      ? context.slice(0, 300)
      : "";

  const prompt = `You are an expert communication coach helping someone craft the perfect reply to a difficult message.

THE MESSAGE THEY RECEIVED:
"${message.trim()}"

RELATIONSHIP: ${relationship}
DESIRED OUTCOME: ${outcome}
${safeContext ? `EXTRA CONTEXT: ${safeContext}` : ""}

Do TWO things in one response:

1. ANALYZE the received message:
   - tone: one of "passive-aggressive", "demanding", "guilt-tripping", "friendly", "dismissive", "manipulative", "unclear"
   - intensity: "Low", "Medium", or "High"
   - real_intent: what they actually want underneath the words (1 sentence, max 15 words)
   - how_to_handle: one practical line of advice for dealing with this person (1 sentence, max 15 words)

2. GENERATE exactly 3 replies in different tones. Each reply must be:
   - Ready to send as-is (no placeholders like [Name])
   - Natural and human, not robotic or corporate
   - Appropriate for the relationship and outcome
   - Between 2-5 sentences typically

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

{
  "analysis": {
    "tone": "<detected tone>",
    "intensity": "<Low/Medium/High>",
    "real_intent": "<what they actually want>",
    "how_to_handle": "<one line of advice>"
  },
  "diplomatic": "<firm but kind, professional>",
  "warm": "<gentle, caring, preserves relationship>",
  "direct": "<clear, no fluff, gets point across>"
}`;

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 1000,
          temperature: 0.8,
          messages: [
            {
              role: "system",
              content:
                "You are an expert communication coach. Always respond with valid JSON only. No markdown, no code blocks, no text outside the JSON object.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepSeek error:", errText);
      return res.status(502).json({ error: "AI service unavailable. Try again shortly." });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Validate shape
    if (!parsed.diplomatic || !parsed.warm || !parsed.direct || !parsed.analysis) {
      throw new Error("Invalid AI response shape");
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Generate error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── Regenerate Single Tone ─────────────────────────────────────
app.post("/api/regenerate-one", async (req, res) => {
  const { message, relationship, outcome, context, tone } = req.body;

  const validTones = ["diplomatic", "warm", "direct"];
  if (!validTones.includes(tone)) {
    return res.status(400).json({ error: "Invalid tone. Must be diplomatic, warm, or direct." });
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return res.status(400).json({ error: "Valid message is required." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Message is too long (max 2000 characters)." });
  }
  if (!relationship || !outcome) {
    return res.status(400).json({ error: "Relationship and outcome are required." });
  }

  const safeContext =
    context && typeof context === "string" ? context.slice(0, 300) : "";

  const toneDescriptions = {
    diplomatic: "firm but kind, professional",
    warm: "gentle, caring, preserves the relationship",
    direct: "clear, no fluff, gets the point across",
  };

  const prompt = `You are an expert communication coach helping someone craft the perfect reply to a difficult message.

THE MESSAGE THEY RECEIVED:
"${message.trim()}"

RELATIONSHIP: ${relationship}
DESIRED OUTCOME: ${outcome}
${safeContext ? `EXTRA CONTEXT: ${safeContext}` : ""}

Generate exactly 1 reply in the "${tone}" tone (${toneDescriptions[tone]}).
The reply must be:
- Ready to send as-is (no placeholders like [Name])
- Natural and human, not robotic or corporate
- Appropriate for the relationship and outcome
- Between 2-5 sentences typically
- DIFFERENT from any previous version — fresh wording

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

{ "reply": "<your reply here>" }`;

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 300,
          temperature: 0.9,
          messages: [
            {
              role: "system",
              content:
                "You are an expert communication coach. Always respond with valid JSON only. No markdown, no code blocks, no text outside the JSON object.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepSeek error:", errText);
      return res.status(502).json({ error: "AI service unavailable. Try again shortly." });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed.reply) {
      throw new Error("Invalid AI response shape");
    }

    return res.json({ tone, reply: parsed.reply });
  } catch (err) {
    console.error("Regenerate error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── 404 catch-all ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
});
