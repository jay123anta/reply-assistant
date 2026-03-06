const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1); // Render / Vercel sit behind a reverse proxy
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // reject huge payloads

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────
// Max 50 requests per IP per hour (covers generates + regenerates + health checks)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again in an hour.",
  },
});
app.use("/api/generate-reply", limiter);
app.use("/api/regenerate-one", limiter);
app.use("/api/waitlist", limiter);

// ─── Daily Usage Tracking (per IP) ────────────────────────────
const DAILY_REPLY_LIMIT = 10;
const usageMap = new Map();

function getDailyUsage(ip) {
  const today = new Date().toISOString().split("T")[0];
  const entry = usageMap.get(ip);
  if (!entry || entry.date !== today) {
    usageMap.set(ip, { count: 0, date: today });
    return 0;
  }
  return entry.count;
}

function incrementUsage(ip) {
  const today = new Date().toISOString().split("T")[0];
  const current = getDailyUsage(ip);
  usageMap.set(ip, { count: current + 1, date: today });
  return DAILY_REPLY_LIMIT - (current + 1);
}

// Clean up stale entries every hour (usage resets on server restart)
setInterval(() => {
  const today = new Date().toISOString().split("T")[0];
  for (const [ip, entry] of usageMap) {
    if (entry.date !== today) usageMap.delete(ip);
  }
}, 60 * 60 * 1000);

// ─── Health Check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── Main Reply Endpoint ───────────────────────────────────────
app.post("/api/generate-reply", async (req, res) => {
  // Daily limit check (per IP)
  const clientIp = req.ip;
  const used = getDailyUsage(clientIp);
  if (used >= DAILY_REPLY_LIMIT) {
    return res.status(429).json({
      error: "Daily limit reached. Resets at midnight.",
      limitReached: true,
      remainingReplies: 0,
    });
  }

  const { message, relationship, outcome, context, length, mode, subject } = req.body;

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

  // Sanitise optional fields
  const safeContext =
    context && typeof context === "string"
      ? context.slice(0, 300)
      : "";
  const safeSubject =
    subject && typeof subject === "string"
      ? subject.slice(0, 200)
      : "";
  const isEmail = mode === "email";

  const lengthGuides = {
    short: "1-2 sentences, straight to the point, no extra explanation",
    medium: "3-4 sentences, balanced with enough context",
    long: "a full paragraph (5-7 sentences), with more explanation and nuance",
  };
  const safeLength = ["short", "medium", "long"].includes(length) ? length : "medium";
  const lengthInstruction = lengthGuides[safeLength];

  const emailExtra = isEmail
    ? `\nFORMAT: Full email drafts. Each reply MUST include:
- A proper greeting (e.g. "Hi [appropriate name]," or "Hello,")
- The email body
- A professional sign-off (e.g. "Best regards," or "Thanks,")
Do NOT use placeholder names like [Name] — use generic but natural greetings.
${safeSubject ? `USE THIS SUBJECT LINE: "${safeSubject}"` : "Also suggest a subject line for the reply email."}

3. SUBJECT LINE: ${safeSubject ? `"${safeSubject}"` : "Suggest a concise, professional subject line for the reply."}`
    : "";

  const prompt = `You are an expert communication coach helping someone craft the perfect reply to a difficult ${isEmail ? "email" : "message"}.

THE ${isEmail ? "EMAIL" : "MESSAGE"} THEY RECEIVED:
"${message.trim()}"

RELATIONSHIP: ${relationship}
DESIRED OUTCOME: ${outcome}
${safeContext ? `EXTRA CONTEXT: ${safeContext}` : ""}

Do TWO things in one response:

1. ANALYZE the received ${isEmail ? "email" : "message"}:
   - tone: one of "passive-aggressive", "demanding", "guilt-tripping", "friendly", "dismissive", "manipulative", "unclear"
   - intensity: "Low", "Medium", or "High"
   - real_intent: what they actually want underneath the words (1 sentence, max 15 words)
   - how_to_handle: one practical line of advice for dealing with this person (1 sentence, max 15 words)

2. GENERATE exactly 3 replies in different tones. Each reply must be:
   - Ready to send as-is (no placeholders like [Name])
   - Natural and human, not robotic or corporate
   - Appropriate for the relationship and outcome
   - LENGTH: ${lengthInstruction}${emailExtra}

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

{
  "analysis": {
    "tone": "<detected tone>",
    "intensity": "<Low/Medium/High>",
    "real_intent": "<what they actually want>",
    "how_to_handle": "<one line of advice>"
  },${isEmail ? '\n  "subject_line": "<suggested subject line>",' : ""}
  "diplomatic": "<firm but kind, professional>",
  "warm": "<gentle, caring, preserves relationship>",
  "direct": "<clear, no fluff, gets point across>"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
          max_tokens: isEmail ? 1500 : 1000,
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
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("DeepSeek error: HTTP", response.status);
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

    // For email mode, pass through subject_line if present
    const remaining = incrementUsage(clientIp);
    return res.json({ ...parsed, remainingReplies: remaining });
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("Generate error: DeepSeek request timed out (30s)");
      return res.status(504).json({ error: "AI took too long. Please try again." });
    }
    console.error("Generate error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── Regenerate Single Tone ─────────────────────────────────────
app.post("/api/regenerate-one", async (req, res) => {
  const { message, relationship, outcome, context, tone, length, mode } = req.body;

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
  const isEmail = mode === "email";

  const lengthGuides = {
    short: "1-2 sentences, straight to the point",
    medium: "3-4 sentences, balanced with enough context",
    long: "a full paragraph (5-7 sentences), with more explanation and nuance",
  };
  const safeLength = ["short", "medium", "long"].includes(length) ? length : "medium";
  const lengthInstruction = lengthGuides[safeLength];

  const toneDescriptions = {
    diplomatic: "firm but kind, professional",
    warm: "gentle, caring, preserves the relationship",
    direct: "clear, no fluff, gets the point across",
  };

  const emailExtra = isEmail
    ? `\nFORMAT: Full email draft with proper greeting and professional sign-off. No placeholder names like [Name].`
    : "";

  const prompt = `You are an expert communication coach helping someone craft the perfect reply to a difficult ${isEmail ? "email" : "message"}.

THE ${isEmail ? "EMAIL" : "MESSAGE"} THEY RECEIVED:
"${message.trim()}"

RELATIONSHIP: ${relationship}
DESIRED OUTCOME: ${outcome}
${safeContext ? `EXTRA CONTEXT: ${safeContext}` : ""}

Generate exactly 1 reply in the "${tone}" tone (${toneDescriptions[tone]}).
The reply must be:
- Ready to send as-is (no placeholders like [Name])
- Natural and human, not robotic or corporate
- Appropriate for the relationship and outcome
- LENGTH: ${lengthInstruction}
- DIFFERENT from any previous version — fresh wording${emailExtra}

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

{ "reply": "<your reply here>" }`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
          max_tokens: isEmail ? 500 : 300,
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
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("DeepSeek error: HTTP", response.status);
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
    if (err.name === "AbortError") {
      console.error("Regenerate error: DeepSeek request timed out (30s)");
      return res.status(504).json({ error: "AI took too long. Please try again." });
    }
    console.error("Regenerate error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── Waitlist ─────────────────────────────────────────────────
const WAITLIST_PATH = path.join(__dirname, "waitlist.json");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readWaitlist() {
  try {
    const raw = await fs.readFile(WAITLIST_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { emails: [] };
  }
}

let writeChain = Promise.resolve();
function writeWaitlistSafe(fn) {
  writeChain = writeChain.then(async () => {
    const data = await readWaitlist();
    const result = fn(data);
    await fs.writeFile(WAITLIST_PATH, JSON.stringify(result, null, 2), "utf-8");
    return result;
  });
  return writeChain;
}

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many signups. Please try again later." },
});

app.get("/api/waitlist/count", async (req, res) => {
  try {
    const data = await readWaitlist();
    res.json({ count: data.emails.length });
  } catch {
    res.json({ count: 0 });
  }
});

app.post("/api/waitlist", waitlistLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  const cleaned = email.trim().toLowerCase();

  if (cleaned.length > 254 || !EMAIL_RE.test(cleaned)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    const result = await writeWaitlistSafe((data) => {
      if (!data.emails.includes(cleaned)) {
        data.emails.push(cleaned);
      }
      return data;
    });

    res.json({ success: true, count: result.emails.length });
  } catch (err) {
    console.error("Waitlist error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── 404 catch-all ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
});
