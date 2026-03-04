import { useState, useEffect, useRef } from "react";

// ─── Config ────────────────────────────────────────────────────
// Local dev:  http://localhost:3001
// Production: https://your-backend.onrender.com
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Safari private browsing throws on localStorage.setItem
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded in private mode */ }
}
function safeGetItem(key, fallback = null) {
  try { return localStorage.getItem(key); } catch { return fallback; }
}

// ─── Data ──────────────────────────────────────────────────────
const RELATIONSHIPS = [
  { id: "Boss", label: "Boss", emoji: "💼" },
  { id: "Colleague", label: "Colleague", emoji: "🤝" },
  { id: "Client", label: "Client", emoji: "📊" },
  { id: "Relative", label: "Relative", emoji: "👨‍👩‍👧" },
  { id: "Friend", label: "Friend", emoji: "👋" },
  { id: "Landlord", label: "Landlord", emoji: "🏠" },
  { id: "Partner", label: "Partner", emoji: "💛" },
  { id: "Stranger", label: "Stranger / Other", emoji: "🌐" },
];

const OUTCOMES_MESSAGE = [
  { id: "Hold my boundary", label: "Hold my boundary", desc: "Say no clearly" },
  { id: "Keep the peace", label: "Keep the peace", desc: "Avoid conflict" },
  { id: "Clarify a misunderstanding", label: "Clarify a misunderstanding", desc: "Clear the air" },
  { id: "Decline gracefully", label: "Decline gracefully", desc: "Say no politely" },
  { id: "Assert myself", label: "Assert myself", desc: "Stand my ground" },
  { id: "Buy more time", label: "Buy more time", desc: "Delay without offending" },
];

const OUTCOMES_EMAIL = [
  { id: "Hold my boundary", label: "Hold my boundary", desc: "Say no clearly" },
  { id: "Keep the peace", label: "Keep the peace", desc: "Avoid conflict" },
  { id: "Clarify a misunderstanding", label: "Clarify a misunderstanding", desc: "Clear the air" },
  { id: "Decline gracefully", label: "Decline gracefully", desc: "Say no politely" },
  { id: "Assert myself", label: "Assert myself", desc: "Stand my ground" },
  { id: "Buy more time", label: "Buy more time", desc: "Delay without offending" },
  { id: "Follow up professionally", label: "Follow up professionally", desc: "Nudge without nagging" },
];

const EXAMPLES_MESSAGE = [
  {
    label: "Passive-aggressive boss",
    msg: "I thought you said you'd have this done by EOD yesterday? I guess I need to lower my expectations then.",
    rel: "Boss",
    out: "Assert myself",
  },
  {
    label: "Overstepping relative",
    msg: "When are you getting married? You're not getting any younger. Everyone is asking about you.",
    rel: "Relative",
    out: "Hold my boundary",
  },
  {
    label: "Demanding client",
    msg: "I need this done by tonight. I know we agreed on Friday but something came up on my end.",
    rel: "Client",
    out: "Decline gracefully",
  },
  {
    label: "Friend asking for money",
    msg: "Can you lend me ₹20,000? I'll pay you back next month for sure. You know I'm good for it.",
    rel: "Friend",
    out: "Hold my boundary",
  },
];

const EXAMPLES_EMAIL = [
  {
    label: "Scope creep client",
    msg: "Hi, I know we signed off on the design last week, but can you also add a login page and dashboard? Shouldn't take long right?",
    rel: "Client",
    out: "Hold my boundary",
  },
  {
    label: "Late payment follow-up",
    msg: "Thanks for the great work! We'll process the payment soon, just some internal delays on our end.",
    rel: "Client",
    out: "Follow up professionally",
  },
  {
    label: "Micromanaging boss",
    msg: "Going forward, I'd like you to CC me on every email you send to the team. Just so I'm in the loop.",
    rel: "Boss",
    out: "Assert myself",
  },
];

const LENGTHS = [
  { id: "short",  label: "Short",  desc: "1-2 sentences" },
  { id: "medium", label: "Medium", desc: "3-4 sentences" },
  { id: "long",   label: "Long",   desc: "Full paragraph" },
];

// ─── Auto-detect helpers ────────────────────────────────────
function detectFromMessage(text) {
  const lower = text.toLowerCase();
  const result = { relationship: null, tone: null, outcome: null };
  if (lower.length < 10) return result;

  // ── Relationship detection ──
  const relKeywords = {
    Boss: ["deadline", "eod", "end of day", "performance", "kpi", "deliverable", "sprint", "standup", "expectations", "lower my expectations", "report to me", "your task"],
    Colleague: ["team meeting", "sync up", "let's sync", "slack me", "hop on a call", "standup"],
    Client: ["invoice", "payment", "quote", "estimate", "contract", "scope", "proposal", "budget", "agreed on", "deliverable"],
    Relative: ["married", "wedding", "getting younger", "family", "kids", "children", "everyone is asking", "your age", "settled down", "festival"],
    Friend: ["lend me", "borrow", "pay you back", "hang out", "party", "catch up", "dude", "bro", "good for it"],
    Landlord: ["rent", "lease", "apartment", "flat", "deposit", "maintenance", "repair", "tenant", "property", "move out"],
    Partner: ["if you loved", "our relationship", "feel about us", "trust me", "give me space", "commitment", "i miss you"],
    Stranger: [],
  };

  for (const [rel, keywords] of Object.entries(relKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      result.relationship = rel;
      break;
    }
  }

  // ── Tone detection ──
  const tonePatterns = [
    { tone: "passive-aggressive", phrases: ["i guess", "whatever you say", "fine then", "if you say so", "no worries though", "i thought you", "but okay", "but ok", "lower my expectations", "sure, go ahead"] },
    { tone: "demanding", phrases: ["i need this", "asap", "immediately", "right now", "must be done", "urgent", "by tonight", "by today", "no excuses", "i expect"] },
    { tone: "guilt-tripping", phrases: ["after all i", "i sacrificed", "you never", "you always", "don't you care", "remember when i", "for your sake", "everything i did", "how could you"] },
    { tone: "manipulative", phrases: ["if you loved", "everyone thinks", "you're the only one", "you owe", "after everything", "no one else would", "i'm the only one"] },
    { tone: "friendly", phrases: ["hope you're", "how are you", "miss you", "thanks for", "appreciate", "catch up", "good to hear"] },
    { tone: "dismissive", phrases: ["doesn't matter", "forget it", "not important", "never mind", "drop it", "whatever", "don't bother"] },
  ];

  for (const { tone, phrases } of tonePatterns) {
    if (phrases.some((p) => lower.includes(p))) {
      result.tone = tone;
      break;
    }
  }

  // ── Outcome suggestion based on tone ──
  const toneToOutcome = {
    "passive-aggressive": "Assert myself",
    demanding: "Hold my boundary",
    "guilt-tripping": "Hold my boundary",
    manipulative: "Hold my boundary",
    friendly: "Keep the peace",
    dismissive: "Clarify a misunderstanding",
  };
  if (result.tone) {
    result.outcome = toneToOutcome[result.tone] || null;
  }

  return result;
}

const TONES = [
  {
    id: "diplomatic",
    label: "Diplomatic",
    icon: "🤝",
    color: "#2D6A4F",
    bg: "#F0FFF4",
    border: "#B7E4C7",
    desc: "Firm but kind. Professional.",
  },
  {
    id: "warm",
    label: "Warm",
    icon: "💛",
    color: "#92400E",
    bg: "#FFFBEB",
    border: "#FDE68A",
    desc: "Gentle and caring. Preserves the relationship.",
  },
  {
    id: "direct",
    label: "Direct",
    icon: "⚡",
    color: "#1E3A5F",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    desc: "No fluff. Gets the point across.",
  },
];

// ─── Sub-components ────────────────────────────────────────────
function Step({ number, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: done ? "#2D6A4F" : active ? "#1a1a1a" : "#e5e0d8",
        color: done || active ? "#fff" : "#a0948a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, flexShrink: 0,
        transition: "all 0.3s ease",
      }}>
        {done ? "✓" : number}
      </div>
      <span style={{
        fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
        color: active ? "#1a1a1a" : done ? "#2D6A4F" : "#a0948a",
        fontWeight: active ? 600 : 400,
        transition: "all 0.3s",
      }}>{label}</span>
    </div>
  );
}

function ReplyCard({ tone, reply, delay, onRegenerate, mode, subject }) {
  const [copied, setCopied] = useState(false);
  const [creditCopied, setCreditCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  function copyText() {
    const text = mode === "email" && subject ? `Subject: ${subject}\n\n${reply}` : reply;
    navigator.clipboard.writeText(text);
    haptic();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyWithCredit() {
    const body = mode === "email" && subject ? `Subject: ${subject}\n\n${reply}` : reply;
    navigator.clipboard.writeText(`${body}\n\n— via replycraft.in`);
    haptic();
    setCreditCopied(true);
    setTimeout(() => setCreditCopied(false), 2000);
  }

  function shareWhatsApp() {
    const text = `Used this AI tool to reply to a tough message \u{1F447}\n\n${reply}\n\nTry it free: https://replycraft.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await onRegenerate(tone.id);
    setRegenerating(false);
  }

  const btnBase = {
    background: "transparent",
    border: `1.5px solid ${tone.border}`,
    borderRadius: 8,
    color: tone.color,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  };

  return (
    <div className="reply-card" style={{
      background: tone.bg,
      border: `1.5px solid ${tone.border}`,
      borderRadius: 16,
      padding: "22px 24px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{tone.icon}</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: tone.color }}>
              {tone.label}
            </div>
            <div style={{ fontSize: 11, color: "#9a8f85", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>
              {tone.desc}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Regenerate this reply"
            className="action-btn-mobile"
            style={{ ...btnBase, opacity: regenerating ? 0.5 : 1, cursor: regenerating ? "not-allowed" : "pointer" }}
          >
            {regenerating ? "↻ ..." : "↻ New"}
          </button>
          <button
            onClick={copyText}
            className="action-btn-mobile"
            style={{
              ...btnBase,
              background: copied ? tone.color : "transparent",
              borderColor: copied ? tone.color : tone.border,
              color: copied ? "#fff" : tone.color,
              padding: "6px 14px",
            }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 15,
        lineHeight: 1.7,
        color: "#2a2420",
        margin: 0,
        whiteSpace: "pre-wrap",
        background: "#ffffff88",
        borderRadius: 10,
        padding: "14px 16px",
        borderLeft: `3px solid ${tone.border}`,
      }}>
        {regenerating ? "Rewriting..." : reply}
      </p>
      <div className="reply-actions" style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button onClick={shareWhatsApp} title="Share on WhatsApp" className="action-btn-mobile" style={btnBase}>
          Share on WhatsApp
        </button>
        <button
          onClick={copyWithCredit}
          title="Copy with replycraft.in credit"
          className="action-btn-mobile"
          style={{
            ...btnBase,
            background: creditCopied ? tone.color : "transparent",
            borderColor: creditCopied ? tone.color : tone.border,
            color: creditCopied ? "#fff" : tone.color,
          }}
        >
          {creditCopied ? "✓ Copied!" : "Copy + Credit"}
        </button>
      </div>
    </div>
  );
}

const INTENSITY_COLORS = {
  Low: { color: "#2D6A4F", bg: "#F0FFF4", border: "#B7E4C7" },
  Medium: { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  High: { color: "#991B1B", bg: "#FFF5F5", border: "#FECACA" },
};

function AnalysisCard({ analysis }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const ic = INTENSITY_COLORS[analysis.intensity] || INTENSITY_COLORS.Medium;

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #ede5d8",
      borderRadius: 16,
      padding: "20px 22px",
      marginBottom: 20,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 14, fontWeight: 700, color: "#2a1f17",
        }}>Message X-Ray</span>
      </div>

      <div className="analysis-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{
          background: "#FAF7F2", borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#9a8f85", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Tone Detected
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#2a1f17", textTransform: "capitalize" }}>
            {analysis.tone}
          </div>
        </div>

        <div style={{
          background: "#FAF7F2", borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#9a8f85", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Emotional Intensity
          </div>
          <span style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
            color: ic.color, background: ic.bg,
            border: `1px solid ${ic.border}`,
            borderRadius: 6, padding: "2px 10px",
          }}>
            {analysis.intensity}
          </span>
        </div>
      </div>

      <div style={{ background: "#FAF7F2", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#9a8f85", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          What they actually want
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#2a1f17", lineHeight: 1.5 }}>
          {analysis.real_intent}
        </div>
      </div>

      <div style={{ background: "#FAF7F2", borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#9a8f85", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          How to handle this
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#4a3f35", fontStyle: "italic", lineHeight: 1.5 }}>
          {analysis.how_to_handle}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function HistoryCard({ item, onLoad }) {
  const [expanded, setExpanded] = useState(false);
  const rel = RELATIONSHIPS.find(r => r.id === item.relationship);

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #ede5d8",
      borderRadius: 12,
      padding: "14px 16px",
      cursor: "pointer",
      transition: "all 0.2s",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#2a1f17",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.message.slice(0, 60)}{item.message.length > 60 ? "..." : ""}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            {rel && (
              <span style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 500,
                background: "#FAF7F2", border: "1px solid #e5ddd3", borderRadius: 6,
                padding: "2px 8px", color: "#7a6a5a",
              }}>
                {rel.emoji} {rel.label}
              </span>
            )}
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#b0a090" }}>
              {timeAgo(item.timestamp)}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#b0a090", flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          ▼
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {TONES.map(tone => (
            <div key={tone.id} style={{
              background: tone.bg, border: `1px solid ${tone.border}`,
              borderRadius: 10, padding: "10px 14px",
            }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: tone.color, marginBottom: 4 }}>
                {tone.icon} {tone.label}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#2a2420", lineHeight: 1.6 }}>
                {item.replies[tone.id] || ""}
              </div>
            </div>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); onLoad(item); }}
            style={{
              background: "transparent", border: "1.5px solid #e5ddd3", borderRadius: 8,
              color: "#7a6a5a", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              fontSize: 12, fontWeight: 500, padding: "6px 14px", alignSelf: "flex-start",
              transition: "all 0.2s", marginTop: 4,
            }}
          >
            ↻ Regenerate these replies
          </button>
        </div>
      )}
    </div>
  );
}

function SmartSuggestions({ suggestions, onAcceptRel, onAcceptOutcome, onDismiss }) {
  if (!suggestions.tone && !suggestions.relationship && !suggestions.outcome) return null;

  const pillStyle = {
    background: "#fff",
    border: "1.5px solid #e5ddd3",
    borderRadius: 20,
    color: "#4a3f35",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 12px",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  const TONE_LABELS = {
    "passive-aggressive": { emoji: "😤", label: "passive-aggressive" },
    demanding: { emoji: "⚡", label: "demanding" },
    "guilt-tripping": { emoji: "😢", label: "guilt-tripping" },
    manipulative: { emoji: "🎭", label: "manipulative" },
    friendly: { emoji: "😊", label: "friendly" },
    dismissive: { emoji: "🙄", label: "dismissive" },
  };

  const toneInfo = suggestions.tone ? TONE_LABELS[suggestions.tone] : null;
  const rel = suggestions.relationship ? RELATIONSHIPS.find((r) => r.id === suggestions.relationship) : null;
  const out = suggestions.outcome ? OUTCOMES.find((o) => o.id === suggestions.outcome) : null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginTop: 10,
        animation: "fadeIn 0.3s ease forwards",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: "#b0a090",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        Detected:
      </span>

      {toneInfo && (
        <span
          style={{
            ...pillStyle,
            background: "#FFF5F5",
            borderColor: "#FECACA",
            color: "#991B1B",
            cursor: "default",
          }}
        >
          {toneInfo.emoji} Sounds {toneInfo.label}
        </span>
      )}

      {rel && (
        <button onClick={() => onAcceptRel(suggestions.relationship)} style={{ ...pillStyle, background: "#FFFBF5", borderColor: "#c4a882" }}>
          {rel.emoji} {rel.label}?
        </button>
      )}

      {out && (
        <button onClick={() => onAcceptOutcome(suggestions.outcome)} style={{ ...pillStyle, background: "#F0FFF4", borderColor: "#B7E4C7", color: "#2D6A4F" }}>
          → {out.label}?
        </button>
      )}

      <button
        onClick={onDismiss}
        title="Dismiss suggestions"
        style={{
          background: "transparent",
          border: "none",
          color: "#c4b8aa",
          cursor: "pointer",
          fontSize: 14,
          padding: "2px 4px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function ThinkingAnimation() {
  const phrases = [
    "Reading the room...",
    "Understanding the dynamic...",
    "Crafting your words...",
    "Finding the right tone...",
    "Almost there...",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % phrases.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 40, marginBottom: 20, animation: "float 2s ease-in-out infinite" }}>✍️</div>
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20,
        color: "#4a3f35",
        margin: 0,
        minHeight: 32,
      }}>{phrases[idx]}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#c4a882",
            animation: "bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]             = useState("message"); // "message" | "email"
  const [message, setMessage]       = useState("");
  const [subject, setSubject]       = useState("");
  const [relationship, setRel]      = useState(null);
  const [outcome, setOutcome]       = useState(null);
  const [context, setContext]       = useState("");
  const [replies, setReplies]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [mounted, setMounted]       = useState(false);
  const [history, setHistory]       = useState([]);
  const [suggestions, setSuggestions] = useState({ relationship: null, tone: null, outcome: null });
  const [dismissed, setDismissed]   = useState(false);
  const [replyLength, setReplyLength] = useState(() => safeGetItem("reply_length", "medium"));
  const resultRef                   = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(safeGetItem("reply_history", "[]"));
      setHistory(saved);
    } catch { /* ignore corrupt data */ }
  }, []);

  // Auto-detect relationship, tone, and outcome from message
  useEffect(() => {
    if (dismissed) return;
    const detected = detectFromMessage(message);
    setSuggestions(detected);
  }, [message, dismissed]);

  const OUTCOMES = mode === "email" ? OUTCOMES_EMAIL : OUTCOMES_MESSAGE;
  const EXAMPLES = mode === "email" ? EXAMPLES_EMAIL : EXAMPLES_MESSAGE;

  function switchMode(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setMessage("");
    setSubject("");
    setRel(null);
    setOutcome(null);
    setContext("");
    setReplies(null);
    setError(null);
    setDismissed(false);
    setSuggestions({ relationship: null, tone: null, outcome: null });
  }

  function loadExample(ex) {
    setMessage(ex.msg);
    setRel(ex.rel);
    setOutcome(ex.out);
    setReplies(null);
    setError(null);
    setDismissed(true); // examples already set rel/outcome
  }

  function loadHistory(item) {
    setMessage(item.message);
    setRel(item.relationship);
    setOutcome(item.outcome);
    setReplies(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentStep() {
    if (!message.trim()) return 1;
    if (!relationship) return 2;
    if (!outcome) return 3;
    return 4;
  }

  async function generateReplies() {
    if (!message.trim() || !relationship || !outcome) return;
    setLoading(true);
    setReplies(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, relationship, outcome, context, length: replyLength, mode, subject: mode === "email" ? subject : undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setReplies(data);

      const entry = {
        id: Date.now(),
        message,
        relationship,
        outcome,
        replies: { diplomatic: data.diplomatic, warm: data.warm, direct: data.direct },
        timestamp: Date.now(),
      };
      const updated = [entry, ...history.filter(h => h.message !== message)].slice(0, 5);
      setHistory(updated);
      safeSetItem("reply_history", JSON.stringify(updated));

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError("Could not connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateOne(tone) {
    try {
      const res = await fetch(`${API_BASE}/api/regenerate-one`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, relationship, outcome, context, tone, length: replyLength, mode, subject: mode === "email" ? subject : undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not regenerate. Try again.");
        return;
      }

      setReplies(prev => ({ ...prev, [tone]: data.reply }));
      setError(null);
    } catch (err) {
      setError("Could not connect. Please check your internet and try again.");
    }
  }

  function changeLength(newLen) {
    setReplyLength(newLen);
    safeSetItem("reply_length", newLen);
    if (replies && !loading) {
      // Re-generate with new length
      setTimeout(() => generateRepliesWithLength(newLen), 0);
    }
  }

  async function generateRepliesWithLength(len) {
    if (!message.trim() || !relationship || !outcome) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, relationship, outcome, context, length: len, mode, subject: mode === "email" ? subject : undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setReplies(data);
    } catch (err) {
      setError("Could not connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setReplies(null);
    setMessage("");
    setSubject("");
    setRel(null);
    setOutcome(null);
    setContext("");
    setError(null);
    setDismissed(false);
    setSuggestions({ relationship: null, tone: null, outcome: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cs = currentStep();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAF7F2; min-height: 100vh; }

        @keyframes float  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-6px);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .section { animation: fadeIn 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }

        .rel-btn {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:12px;
          color:#4a3f35; cursor:pointer; font-family:'DM Sans',sans-serif;
          font-size:13px; font-weight:500; padding:10px 14px;
          transition:all 0.2s ease; text-align:left;
          display:flex; align-items:center; gap:8px;
        }
        .rel-btn:hover { border-color:#c4a882; background:#FFFBF5; }
        .rel-btn.active { background:#2a1f17; border-color:#2a1f17; color:#fff; }

        .out-btn {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:12px;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          padding:12px 16px; transition:all 0.2s ease; text-align:left;
        }
        .out-btn:hover { border-color:#c4a882; background:#FFFBF5; }
        .out-btn.active { background:#2a1f17; border-color:#2a1f17; }
        .out-btn.active .out-label { color:#fff; }
        .out-btn.active .out-desc  { color:#c4a882; }

        .generate-btn {
          background:#2a1f17; border:none; border-radius:14px;
          color:#FAF7F2; cursor:pointer; font-family:'DM Sans',sans-serif;
          font-size:16px; font-weight:600; padding:18px 48px;
          transition:all 0.3s ease; letter-spacing:0.2px;
        }
        .generate-btn:hover:not(:disabled) {
          background:#1a1209; transform:translateY(-2px);
          box-shadow:0 12px 32px rgba(42,31,23,0.2);
        }
        .generate-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .example-pill {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:20px;
          color:#7a6a5a; cursor:pointer; font-family:'DM Sans',sans-serif;
          font-size:12px; padding:6px 14px; transition:all 0.2s; white-space:nowrap;
        }
        .example-pill:hover { border-color:#c4a882; color:#4a3f35; background:#FFFBF5; }

        textarea {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:14px;
          color:#2a1f17; font-family:'DM Sans',sans-serif; font-size:15px;
          line-height:1.7; outline:none; padding:18px 20px; resize:none;
          transition:border-color 0.3s; width:100%;
        }
        textarea:focus { border-color:#c4a882; box-shadow:0 0 0 3px #c4a88215; }
        textarea::placeholder { color:#c4b8aa; }

        input[type="text"] {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:10px;
          color:#2a1f17; font-family:'DM Sans',sans-serif; font-size:14px;
          outline:none; padding:12px 16px; transition:border-color 0.3s; width:100%;
        }
        input[type="text"]:focus { border-color:#c4a882; box-shadow:0 0 0 3px #c4a88215; }
        input[type="text"]::placeholder { color:#c4b8aa; }

        /* ─── Mobile optimisations ───────────────────────── */
        @media (max-width: 600px) {
          .rel-scroll {
            display:flex !important; overflow-x:auto; gap:8px;
            padding-bottom:6px; scroll-snap-type:x mandatory;
            -webkit-overflow-scrolling:touch;
          }
          .rel-scroll::-webkit-scrollbar { display:none; }
          .rel-scroll .rel-btn {
            flex-shrink:0; scroll-snap-align:start;
            min-width:auto; white-space:nowrap;
          }
          .action-btn-mobile {
            min-height:44px !important; min-width:44px !important;
            padding:10px 14px !important; font-size:13px !important;
          }
          .floating-gen {
            position:fixed; bottom:0; left:0; right:0;
            padding:12px 20px; padding-bottom:max(12px, env(safe-area-inset-bottom));
            background:linear-gradient(transparent, #FAF7F2 20%);
            z-index:100; display:flex; justify-content:center;
          }
          .floating-gen .generate-btn {
            width:100%; max-width:400px; padding:16px 24px !important;
            font-size:15px !important; border-radius:12px !important;
          }
        }
        @media (min-width: 601px) {
          .floating-gen { display:none; }
        }
        @media (max-width: 390px) {
          .main-card { padding:20px 16px !important; }
          .reply-card { padding:16px 14px !important; }
          .reply-actions { flex-wrap:wrap; }
          .analysis-grid { grid-template-columns:1fr !important; }
          textarea { padding:14px 14px !important; font-size:14px !important; }
          .generate-btn { padding:16px 24px !important; font-size:14px !important; }
          .length-toggle button { padding:6px 12px !important; font-size:11px !important; }
        }
      `}</style>

      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(12px)",
        transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>💬</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(28px, 6vw, 38px)",
            fontWeight: 700, color: "#1a110a", lineHeight: 1.2, marginBottom: 10,
          }}>
            How do I reply<br /><em style={{ color: "#c4a882" }}>to this?</em>
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", color: "#7a6a5a",
            fontSize: 15, lineHeight: 1.6, maxWidth: 360, margin: "0 auto",
          }}>
            Paste the message you've been staring at.
            Get 3 perfect replies — in seconds.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", background: "#fff", border: "1.5px solid #e5ddd3",
            borderRadius: 12, padding: 3, gap: 2,
          }}>
            <button
              style={{
                background: "#2a1f17",
                border: "none",
                borderRadius: 10,
                color: "#FAF7F2",
                cursor: "default",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 20px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>💬</span>Message
            </button>
            <button
              disabled
              title="Email mode coming soon!"
              style={{
                background: "transparent",
                border: "none",
                borderRadius: 10,
                color: "#c4b8aa",
                cursor: "not-allowed",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 20px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: 0.6,
              }}
            >
              <span style={{ fontSize: 14 }}>📧</span>Email
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                background: "#c4a882",
                color: "#fff",
                borderRadius: 4,
                padding: "1px 5px",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                Soon
              </span>
            </button>
          </div>
        </div>

        {/* Progress steps */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
          <Step number={1} label={mode === "email" ? "The email" : "The message"}  active={cs === 1} done={cs > 1} />
          <div style={{ width: 20, height: 1, background: "#e5ddd3", alignSelf: "center" }} />
          <Step number={2} label="Who sent it"  active={cs === 2} done={cs > 2} />
          <div style={{ width: 20, height: 1, background: "#e5ddd3", alignSelf: "center" }} />
          <Step number={3} label="What you want" active={cs === 3} done={cs > 3} />
        </div>

        {/* Main card */}
        <div className="main-card" style={{
          background: "#fff", border: "1.5px solid #ede5d8",
          borderRadius: 20, padding: "28px 24px",
          boxShadow: "0 4px 32px rgba(42,31,23,0.06)", marginBottom: 24,
        }}>

          {/* Step 1 */}
          <div className="section" style={{ marginBottom: 28 }}>
            <label style={{
              fontFamily: "'Playfair Display', serif", fontSize: 16,
              fontWeight: 600, color: "#2a1f17", display: "block", marginBottom: 10,
            }}>
              1. Paste the {mode === "email" ? "email" : "message"} you received
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => { setMessage(e.target.value); setDismissed(false); }}
              placeholder={mode === "email"
                ? "Paste the email you received — from inbox, forwarded, anything..."
                : "Paste what they sent you — WhatsApp, email, text, anything..."}
            />
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#b0a090", fontFamily: "'DM Sans',sans-serif", marginRight: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Try:
              </span>
              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {EXAMPLES.map(ex => (
                  <button key={ex.label} className="example-pill" onClick={() => loadExample(ex)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart auto-detect suggestions */}
            {!dismissed && (
              <SmartSuggestions
                suggestions={suggestions}
                onAcceptRel={(rel) => { setRel(rel); setSuggestions(s => ({ ...s, relationship: null })); }}
                onAcceptOutcome={(out) => { setOutcome(out); setSuggestions(s => ({ ...s, outcome: null })); }}
                onDismiss={() => setDismissed(true)}
              />
            )}

            {/* Subject line for email mode */}
            {mode === "email" && message.trim() && (
              <div style={{ marginTop: 14 }}>
                <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#7a6a5a", display: "block", marginBottom: 6 }}>
                  Subject line for your reply <span style={{ color: "#b0a090" }}>(optional — AI will suggest one)</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Re: Project timeline update"
                />
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "#f0e8de", marginBottom: 28 }} />

          {/* Step 2 */}
          <div className="section" style={{ marginBottom: 28 }}>
            <label style={{
              fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600,
              color: message.trim() ? "#2a1f17" : "#c4b8aa",
              display: "block", marginBottom: 12, transition: "color 0.3s",
            }}>
              2. Who sent this to you?
            </label>
            <div className="rel-scroll" style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8,
              opacity: message.trim() ? 1 : 0.4,
              pointerEvents: message.trim() ? "auto" : "none",
              transition: "opacity 0.3s",
            }}>
              {RELATIONSHIPS.map(r => (
                <button
                  key={r.id}
                  className={`rel-btn ${relationship === r.id ? "active" : ""}`}
                  onClick={() => setRel(r.id)}
                >
                  <span style={{ fontSize: 16 }}>{r.emoji}</span>{r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "#f0e8de", marginBottom: 28 }} />

          {/* Step 3 */}
          <div className="section" style={{ marginBottom: 28 }}>
            <label style={{
              fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600,
              color: relationship ? "#2a1f17" : "#c4b8aa",
              display: "block", marginBottom: 12, transition: "color 0.3s",
            }}>
              3. What do you want from your reply?
            </label>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8,
              opacity: relationship ? 1 : 0.4,
              pointerEvents: relationship ? "auto" : "none",
              transition: "opacity 0.3s",
            }}>
              {OUTCOMES.map(o => (
                <button
                  key={o.id}
                  className={`out-btn ${outcome === o.id ? "active" : ""}`}
                  onClick={() => setOutcome(o.id)}
                >
                  <div className="out-label" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#2a1f17", marginBottom: 2 }}>{o.label}</div>
                  <div className="out-desc"  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#9a8f85" }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional context */}
          {outcome && (
            <div className="section" style={{ marginBottom: 24 }}>
              <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#7a6a5a", display: "block", marginBottom: 8 }}>
                Anything else we should know? <span style={{ color: "#b0a090" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="e.g. This has happened 3 times before, we're usually on good terms..."
              />
            </div>
          )}

          {/* Generate button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="generate-btn"
              onClick={generateReplies}
              disabled={!message.trim() || !relationship || !outcome || loading}
            >
              {loading
                ? (mode === "email" ? "Drafting your emails..." : "Writing your replies...")
                : (mode === "email" ? "📧  Draft my emails" : "✍️  Write my replies")}
            </button>
          </div>
        </div>

        {/* Recent history */}
        {history.length > 0 && !replies && !loading && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: "#b0a090", fontStyle: "italic" }}>
                Recent
              </span>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map(item => (
                <HistoryCard key={item.id} item={item} onLoad={loadHistory} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#FFF5F5", border: "1.5px solid #FED7D7",
            borderRadius: 12, padding: 16, textAlign: "center",
            fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#C53030", marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ background: "#fff", border: "1.5px solid #ede5d8", borderRadius: 20, boxShadow: "0 4px 32px rgba(42,31,23,0.06)" }}>
            <ThinkingAnimation />
          </div>
        )}

        {/* Results */}
        {replies && !loading && (
          <div ref={resultRef} className="section">
            {replies.analysis && <AnalysisCard analysis={replies.analysis} />}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 4 }}>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#9a8f85", fontStyle: "italic" }}>
                {mode === "email" ? "Your 3 email drafts" : "Your 3 replies"}
              </span>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
            </div>

            {/* Length toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div className="length-toggle" style={{
                display: "inline-flex", background: "#fff", border: "1.5px solid #e5ddd3",
                borderRadius: 10, padding: 3, gap: 2,
              }}>
                {LENGTHS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => changeLength(l.id)}
                    disabled={loading}
                    title={l.desc}
                    style={{
                      background: replyLength === l.id ? "#2a1f17" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      color: replyLength === l.id ? "#FAF7F2" : "#9a8f85",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 16px",
                      transition: "all 0.2s",
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email subject line display */}
            {mode === "email" && replies.subject_line && (
              <div style={{
                background: "#fff", border: "1.5px solid #e5ddd3", borderRadius: 12,
                padding: "12px 16px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#9a8f85", textTransform: "uppercase", letterSpacing: 0.8, flexShrink: 0 }}>
                  Subject:
                </span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#2a1f17" }}>
                  {replies.subject_line}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(replies.subject_line); }}
                  style={{
                    background: "transparent", border: "1px solid #e5ddd3", borderRadius: 6,
                    color: "#9a8f85", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                    fontSize: 11, padding: "3px 8px", marginLeft: "auto", flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {TONES.map((tone, i) => (
                <ReplyCard key={tone.id} tone={tone} reply={replies[tone.id] || ""} delay={i * 180} onRegenerate={regenerateOne} mode={mode} subject={replies.subject_line || subject} />
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button onClick={reset} style={{
                background: "transparent", border: "1.5px solid #e5ddd3",
                borderRadius: 10, color: "#9a8f85", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "10px 22px", transition: "all 0.2s",
              }}>
                {mode === "email" ? "↩ Reply to a different email" : "↩ Reply to a different message"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, paddingBottom: 60, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#c4b8aa", lineHeight: 1.8 }}>
          <p>Your messages are never stored or shared.</p>
          <p>Built with care for every difficult conversation. 💛</p>
          <p style={{ marginTop: 8 }}>
            <a href="/pro" style={{ color: "#c4a882", textDecoration: "none", fontWeight: 500 }}>
              Reply Pro coming soon →
            </a>
          </p>
        </div>
      </div>

      {/* Floating mobile generate button */}
      {!replies && !loading && message.trim() && relationship && outcome && (
        <div className="floating-gen">
          <button
            className="generate-btn"
            onClick={generateReplies}
            disabled={loading}
          >
            {mode === "email" ? "📧  Draft my emails" : "✍️  Write my replies"}
          </button>
        </div>
      )}
    </>
  );
}
