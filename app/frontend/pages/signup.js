import { useState } from "react";
import { useRouter } from "next/router";
import { colors, cardStyle, inputStyle, fontSans, fontSerif } from "../lib/theme";
import FadeIn from "../components/FadeIn";
import GoogleButton from "../components/GoogleButton";

const NODE_API = process.env.NEXT_PUBLIC_NODE_API || "http://localhost:4000";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [slowMessage, setSlowMessage] = useState(false);
  const router = useRouter();

  function handleContinue(e) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setMessage("Enter a valid email address");
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setMessage("");
    setError(false);
    setShowPassword(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const slowTimer = setTimeout(() => {
      setSlowMessage(true);
    }, 3000);

    try {
      const res = await fetch(`${NODE_API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Account created — redirecting to login...");
        setTimeout(() => router.push("/login"), 900);
      } else {
        setMessage(data.error || "Signup failed");
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    } catch {
      setMessage("Could not reach the server");
      setError(true);
    } finally {
      setLoading(false);
      clearTimeout(slowTimer);
      setSlowMessage(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fontSans,
      }}
    >
      <FadeIn>
        <div
          style={{
            ...cardStyle,
            width: 380,
            boxShadow: "0 8px 30px rgba(26,24,21,0.08)",
            animation: shake ? "cascadeShake 0.4s" : "none",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: colors.foreground }}>
            Create your account
          </h1>
          <p style={{ fontFamily: fontSerif, fontSize: 14, color: colors.mutedForeground, marginBottom: 22 }}>
            Start building with Cascade.
          </p>

          <GoogleButton />

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: colors.border }} />
            <span style={{ fontSize: 12, color: colors.mutedForeground }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: colors.border }} />
          </div>

          <form onSubmit={showPassword ? handleSubmit : handleContinue}>
            <input
              style={inputStyle}
              placeholder="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              required
            />
            <input
              style={inputStyle}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (showPassword) setShowPassword(false);
              }}
              onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              required
            />

            {showPassword && (
              <FadeIn delay={0}>
                <input
                  style={inputStyle}
                  placeholder="Create a password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                  autoFocus
                  required
                />
              </FadeIn>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 999,
                border: "none",
                background: loading ? colors.mutedForeground : colors.primary,
                color: colors.primaryForeground,
                fontWeight: 600,
                fontSize: 15,
                cursor: loading ? "default" : "pointer",
                transition: "background 0.2s ease",
                marginTop: 4,
                fontFamily: fontSans,
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = colors.accent)}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = colors.primary)}
            >
              {loading ? (slowMessage ? "Waking up server..." : "Creating account...") : showPassword ? "Sign up" : "Continue"}
            </button>

            {showPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(false)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: colors.mutedForeground,
                  fontSize: 12,
                  marginTop: 10,
                  cursor: "pointer",
                  fontFamily: fontSans,
                }}
              >
                Use a different email
              </button>
            )}
          </form>

          {message && (
            <p style={{ marginTop: 14, fontSize: 13, color: error ? colors.destructive : colors.mutedForeground }}>
              {message}
            </p>
          )}

          <p style={{ marginTop: 20, fontSize: 13, color: colors.mutedForeground, textAlign: "center" }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: colors.accent, fontWeight: 600, textDecoration: "none" }}>
              Log in
            </a>
          </p>
        </div>
      </FadeIn>
      <style jsx global>{`
        @keyframes cascadeShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
