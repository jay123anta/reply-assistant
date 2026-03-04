import { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const FEATURES = [
  {
    icon: "\u267E\uFE0F",
    title: "Unlimited Replies",
    desc: "No daily limits. Generate as many replies as you need, whenever you need them.",
    color: "#2D6A4F",
    bg: "#F0FFF4",
    border: "#B7E4C7",
  },
  {
    icon: "\uD83D\uDCE7",
    title: "Email Mode",
    desc: "Full email drafts with greetings, sign-offs, and subject lines \u2014 ready to send.",
    color: "#92400E",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    icon: "\uD83C\uDF10",
    title: "Multi-Language",
    desc: "Reply in Hindi, Spanish, French, and 20+ more languages \u2014 naturally, not translated.",
    color: "#1E3A5F",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ProPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [count, setCount] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/waitlist/count`)
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => setCount(null));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !isValidEmail(trimmed)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      if (data.count) setCount(data.count);
    } catch {
      setStatus("error");
      setErrorMsg("Could not connect. Please check your internet and try again.");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAF7F2; min-height: 100vh; }

        @keyframes float  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .pro-input {
          background:#fff; border:1.5px solid #e5ddd3; border-radius:12px;
          color:#2a1f17; font-family:'DM Sans',sans-serif; font-size:15px;
          outline:none; padding:16px 18px; transition:border-color 0.3s; width:100%;
        }
        .pro-input:focus { border-color:#c4a882; box-shadow:0 0 0 3px #c4a88215; }
        .pro-input::placeholder { color:#c4b8aa; }

        .pro-btn {
          background:#2a1f17; border:none; border-radius:14px;
          color:#FAF7F2; cursor:pointer; font-family:'DM Sans',sans-serif;
          font-size:16px; font-weight:600; padding:16px 32px;
          transition:all 0.3s ease; width:100%; letter-spacing:0.2px;
        }
        .pro-btn:hover:not(:disabled) {
          background:#1a1209; transform:translateY(-2px);
          box-shadow:0 12px 32px rgba(42,31,23,0.2);
        }
        .pro-btn:disabled { opacity:0.5; cursor:not-allowed; }

        @media (max-width: 390px) {
          .pro-card { padding:20px 16px !important; }
        }
      `}</style>

      <div style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "40px 20px 80px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(12px)",
        transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 14, animation: "float 3s ease-in-out infinite" }}>
            {"\u2728"}
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(28px, 6vw, 36px)",
            fontWeight: 700,
            color: "#1a110a",
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            Reply <em style={{ color: "#c4a882" }}>Pro</em> is coming
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "#7a6a5a",
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 380,
            margin: "0 auto",
          }}>
            Professional-grade replies for people who communicate for a living.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: f.bg,
                border: `1.5px solid ${f.border}`,
                borderRadius: 16,
                padding: "18px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: f.color,
                  marginBottom: 4,
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#4a3f35",
                  lineHeight: 1.6,
                }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Counter */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#2D6A4F",
            background: "#F0FFF4",
            border: "1.5px solid #B7E4C7",
            borderRadius: 20,
            padding: "6px 16px",
            display: "inline-block",
          }}>
            {count !== null ? `${count} people already on the list` : "100+ people already on the list"}
          </span>
        </div>

        {/* Signup form */}
        <div className="pro-card" style={{
          background: "#fff",
          border: "1.5px solid #ede5d8",
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow: "0 4px 32px rgba(42,31,23,0.06)",
          marginBottom: 32,
        }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83C\uDF89"}</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#2D6A4F",
                marginBottom: 8,
              }}>
                You're in!
              </div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: "#7a6a5a",
                lineHeight: 1.6,
              }}>
                We'll email you when Pro launches.
                <br />Plus, you'll get <strong>30 days free</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#2a1f17",
                display: "block",
                marginBottom: 6,
                textAlign: "center",
              }}>
                Get notified when Pro launches
              </label>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#9a8f85",
                textAlign: "center",
                marginBottom: 16,
              }}>
                + get 30 days free as an early supporter
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="email"
                  className="pro-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus("idle"); setErrorMsg(""); }}
                  placeholder="your@email.com"
                  disabled={status === "submitting"}
                />
                <button
                  type="submit"
                  className="pro-btn"
                  disabled={status === "submitting" || !email.trim()}
                >
                  {status === "submitting" ? "Joining..." : "Get early access"}
                </button>
              </div>

              {status === "error" && errorMsg && (
                <div style={{
                  marginTop: 12,
                  background: "#FFF5F5",
                  border: "1.5px solid #FED7D7",
                  borderRadius: 10,
                  padding: "10px 14px",
                  textAlign: "center",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#C53030",
                }}>
                  {errorMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <a
            href="/"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#9a8f85",
              textDecoration: "none",
              borderBottom: "1px solid #e5ddd3",
              paddingBottom: 2,
              transition: "color 0.2s",
            }}
          >
            {"\u2190"} Back to How Do I Reply To This?
          </a>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "#c4b8aa",
          lineHeight: 1.8,
        }}>
          <p>We'll never share your email or spam you.</p>
          <p>Built with care for every difficult conversation. {"\uD83D\uDC9B"}</p>
        </div>
      </div>
    </>
  );
}
