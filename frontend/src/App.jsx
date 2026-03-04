import { useState, useEffect, useRef } from "react";

// ─── Config ────────────────────────────────────────────────────
// Local dev:  http://localhost:3001
// Production: https://your-backend.onrender.com
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

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

const OUTCOMES = [
  { id: "Hold my boundary", label: "Hold my boundary", desc: "Say no clearly" },
  { id: "Keep the peace", label: "Keep the peace", desc: "Avoid conflict" },
  { id: "Clarify a misunderstanding", label: "Clarify a misunderstanding", desc: "Clear the air" },
  { id: "Decline gracefully", label: "Decline gracefully", desc: "Say no politely" },
  { id: "Assert myself", label: "Assert myself", desc: "Stand my ground" },
  { id: "Buy more time", label: "Buy more time", desc: "Delay without offending" },
];

const EXAMPLES = [
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

function ReplyCard({ tone, reply, delay }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  function copyText() {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
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
        <button
          onClick={copyText}
          style={{
            background: copied ? tone.color : "transparent",
            border: `1.5px solid ${copied ? tone.color : tone.border}`,
            borderRadius: 8,
            color: copied ? "#fff" : tone.color,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 14px",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
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
        {reply}
      </p>
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
  const [message, setMessage]       = useState("");
  const [relationship, setRel]      = useState(null);
  const [outcome, setOutcome]       = useState(null);
  const [context, setContext]       = useState("");
  const [replies, setReplies]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [mounted, setMounted]       = useState(false);
  const resultRef                   = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  function loadExample(ex) {
    setMessage(ex.msg);
    setRel(ex.rel);
    setOutcome(ex.out);
    setReplies(null);
    setError(null);
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
        body: JSON.stringify({ message, relationship, outcome, context }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setReplies(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError("Could not connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setReplies(null);
    setMessage("");
    setRel(null);
    setOutcome(null);
    setContext("");
    setError(null);
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

        {/* Progress steps */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
          <Step number={1} label="The message"  active={cs === 1} done={cs > 1} />
          <div style={{ width: 20, height: 1, background: "#e5ddd3", alignSelf: "center" }} />
          <Step number={2} label="Who sent it"  active={cs === 2} done={cs > 2} />
          <div style={{ width: 20, height: 1, background: "#e5ddd3", alignSelf: "center" }} />
          <Step number={3} label="What you want" active={cs === 3} done={cs > 3} />
        </div>

        {/* Main card */}
        <div style={{
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
              1. Paste the message you received
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Paste what they sent you — WhatsApp, email, text, anything..."
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
            <div style={{
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
              {loading ? "Writing your replies..." : "✍️  Write my replies"}
            </button>
          </div>
        </div>

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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 4 }}>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#9a8f85", fontStyle: "italic" }}>
                Your 3 replies
              </span>
              <div style={{ flex: 1, height: 1, background: "#e5ddd3" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {TONES.map((tone, i) => (
                <ReplyCard key={tone.id} tone={tone} reply={replies[tone.id] || ""} delay={i * 180} />
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button onClick={reset} style={{
                background: "transparent", border: "1.5px solid #e5ddd3",
                borderRadius: 10, color: "#9a8f85", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "10px 22px", transition: "all 0.2s",
              }}>
                ↩ Reply to a different message
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#c4b8aa", lineHeight: 1.8 }}>
          <p>Your messages are never stored or shared.</p>
          <p>Built with care for every difficult conversation. 💛</p>
        </div>
      </div>
    </>
  );
}
