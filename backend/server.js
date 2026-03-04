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

Generate exactly 3 replies in different tones. Each reply must be:
- Ready to send as-is (no placeholders like [Name])
- Natural and human, not robotic or corporate
- Appropriate for the relationship and outcome
- Between 2-5 sentences typically

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

{
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
          max_tokens: 800,
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
    if (!parsed.diplomatic || !parsed.warm || !parsed.direct) {
      throw new Error("Invalid AI response shape");
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Generate error:", err.message);
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
