import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import FadeIn from "../components/FadeIn";
import { colors, cardStyle, inputStyle, fontSans, fontSerif } from "../lib/theme";
import { authFetch, requireAuth } from "../lib/auth";

const FASTAPI_API = process.env.NEXT_PUBLIC_FASTAPI_API || "http://localhost:8000";

const PROVIDERS = [
  { id: "groq", label: "Groq", placeholder: "gsk_...", builtIn: true },
  { id: "gemini", label: "Gemini", placeholder: "AIza...", builtIn: false },
  { id: "claude", label: "Claude", placeholder: "sk-ant-...", builtIn: false },
  { id: "openai", label: "OpenAI", placeholder: "sk-...", builtIn: false },
  { id: "other", label: "Other", placeholder: "Paste any provider's key...", builtIn: false, custom: true },
];

function SectionCard({ title, description, children }) {
  return (
    <FadeIn>
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: colors.foreground, marginBottom: 4 }}>{title}</h2>
        {description && (
          <p style={{ fontFamily: fontSerif, fontSize: 13, color: colors.mutedForeground, marginBottom: 18 }}>
            {description}
          </p>
        )}
        {children}
      </div>
    </FadeIn>
  );
}

export default function Settings() {
  const router = useRouter();
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  const [maxRetries, setMaxRetries] = useState(3);
  // Only used when provider === "other" - lets Cascade resolve providers
  // whose keys have no distinguishing shape (Mistral, Cohere, etc.).
  const [providerName, setProviderName] = useState("");
  const [savedPrefs, setSavedPrefs] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!requireAuth(router)) return;
    const savedProvider = localStorage.getItem("cascade_provider") || "groq";
    setProvider(savedProvider);
    setApiKey(localStorage.getItem(`cascade_api_key_${savedProvider}`) || "");
    setProviderName(localStorage.getItem("cascade_other_provider_name") || "");
    setMaxRetries(Number(localStorage.getItem("cascade_max_retries")) || 3);
  }, []);

  function handleProviderChange(id) {
    setProvider(id);
    // Each provider keeps its own remembered key, so switching back and
    // forth doesn't clobber a key you already saved for another provider.
    setApiKey(localStorage.getItem(`cascade_api_key_${id}`) || "");
    setShow(false);
  }

  function handleSaveKey(e) {
    e.preventDefault();
    localStorage.setItem("cascade_provider", provider);
    localStorage.setItem(`cascade_api_key_${provider}`, apiKey);
    if (provider === "other") {
      localStorage.setItem("cascade_other_provider_name", providerName.trim());
    }
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  }

  function handleSavePrefs(e) {
    e.preventDefault();
    localStorage.setItem("cascade_max_retries", String(maxRetries));
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2000);
  }

  async function handleClearHistory() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await authFetch(`${FASTAPI_API}/tasks`, { method: "DELETE" });
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  }

  const activeProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const canSave = apiKey.trim().length > 0 || provider === "groq";

  return (
    <Layout>
      <FadeIn>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, color: colors.foreground }}>Settings</h1>
      </FadeIn>

      <SectionCard title="Account" description="Your Cascade account.">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: colors.mutedForeground }}>Plan</span>
          <span style={{ fontWeight: 600 }}>Free — local development</span>
        </div>
      </SectionCard>

      <SectionCard
        title="AI provider & API key"
        description="Pick which model powers your runs, then optionally paste your own key to use your own account and quota. Used on your next run only."
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {PROVIDERS.map((p) => {
            const active = p.id === provider;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderChange(p.id)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: `1px solid ${active ? colors.primary : colors.border}`,
                  background: active ? colors.primary : "transparent",
                  color: active ? colors.primaryForeground : colors.foreground,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: fontSans,
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {!activeProvider.builtIn && !activeProvider.custom && (
          <div
            style={{
              fontFamily: fontSerif,
              fontSize: 12.5,
              color: colors.destructive,
              background: "#fbe1da",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
            }}
          >
            Cascade doesn&apos;t have a server-side {activeProvider.label} key — you need to paste your
            own below, or this run will fail. Only Groq has a built-in fallback.
          </div>
        )}

        {activeProvider.custom && (
          <div
            style={{
              fontFamily: fontSerif,
              fontSize: 12.5,
              color: colors.mutedForeground,
              background: colors.secondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
            }}
          >
            Keys from Groq, Claude, Gemini, OpenAI, OpenRouter, Perplexity, or Fireworks are detected
            automatically — just paste the key. For anything else (Mistral, Cohere, DeepSeek, etc.),
            also type the provider&apos;s name below, since those keys don&apos;t have a
            recognizable shape on their own.
          </div>
        )}

        {activeProvider.custom && (
          <>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.mutedForeground, display: "block", marginBottom: 6 }}>
              Provider name <span style={{ fontWeight: 400 }}>(only needed for non-auto-detected providers)</span>
            </label>
            <input
              style={inputStyle}
              type="text"
              value={providerName}
              placeholder="e.g. Mistral, Cohere, DeepSeek"
              onChange={(e) => setProviderName(e.target.value)}
              onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
          </>
        )}

        <form onSubmit={handleSaveKey}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              type={show ? "text" : "password"}
              value={apiKey}
              placeholder={activeProvider.placeholder}
              onChange={(e) => setApiKey(e.target.value)}
              onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              style={{
                border: `1px solid ${colors.border}`,
                background: "transparent",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontFamily: fontSans,
                fontSize: 13,
              }}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              type="submit"
              disabled={!canSave}
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                border: "none",
                background: canSave ? colors.primary : colors.mutedForeground,
                color: colors.primaryForeground,
                fontWeight: 600,
                fontSize: 14,
                cursor: canSave ? "pointer" : "default",
                fontFamily: fontSans,
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => canSave && (e.currentTarget.style.background = colors.accent)}
              onMouseLeave={(e) => canSave && (e.currentTarget.style.background = colors.primary)}
            >
              Save
            </button>
            {savedKey && (
              <span style={{ color: "#1f7a3d", fontWeight: 600, fontSize: 14, animation: "settingsPopIn 0.3s ease" }}>
                ✓ Saved — {activeProvider.label} will be used on your next run
              </span>
            )}
          </div>
          <p style={{ fontFamily: fontSerif, fontSize: 12, color: colors.mutedForeground, marginTop: 12 }}>
            Stored only in this browser, separately per provider. Leave blank on Groq to keep using
            Cascade&apos;s built-in key.
          </p>
        </form>
      </SectionCard>

      <SectionCard
        title="Run preferences"
        description="Controls how many times the Analyst can send work back to the Researcher before giving up."
      >
        <form onSubmit={handleSavePrefs}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.mutedForeground, display: "block", marginBottom: 10 }}>
            Max retries per task: <span style={{ color: colors.foreground }}>{maxRetries}</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={maxRetries}
            onChange={(e) => setMaxRetries(Number(e.target.value))}
            style={{ width: "100%", accentColor: colors.accent }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              type="submit"
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                border: "none",
                background: colors.primary,
                color: colors.primaryForeground,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: fontSans,
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.background = colors.primary)}
            >
              Save preference
            </button>
            {savedPrefs && (
              <span style={{ color: "#1f7a3d", fontWeight: 600, fontSize: 14, animation: "settingsPopIn 0.3s ease" }}>
                ✓ Applied to new tasks
              </span>
            )}
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Danger zone" description="Permanently delete all task history from the dashboard.">
        <button
          onClick={handleClearHistory}
          style={{
            padding: "10px 22px",
            borderRadius: 999,
            border: `1px solid ${colors.destructive}`,
            background: confirmClear ? colors.destructive : "transparent",
            color: confirmClear ? "#fff" : colors.destructive,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: fontSans,
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          {confirmClear ? "Click again to confirm" : "Clear all task history"}
        </button>
        {cleared && (
          <span style={{ marginLeft: 14, color: colors.mutedForeground, fontSize: 13 }}>History cleared.</span>
        )}
      </SectionCard>

      <style jsx global>{`
        @keyframes settingsPopIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Layout>
  );
}
