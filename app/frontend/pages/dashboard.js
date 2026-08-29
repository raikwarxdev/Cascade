import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import FadeIn from "../components/FadeIn";
import StatusBadge from "../components/StatusBadge";
import { colors, cardStyle, inputStyle, fontSans, fontSerif } from "../lib/theme";
import { authFetch, requireAuth } from "../lib/auth";

const FASTAPI_API = process.env.NEXT_PUBLIC_FASTAPI_API || "http://localhost:8000";

function StatCard({ label, value, delay }) {
  return (
    <FadeIn delay={delay} style={{ flex: 1 }}>
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: colors.foreground }}>{value}</div>
        <div style={{ fontFamily: fontSerif, fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
          {label}
        </div>
      </div>
    </FadeIn>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total_runs: 0, success_rate: 0, avg_retries: 0 });
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [forceFailOnce, setForceFailOnce] = useState(false);

  async function loadTasks() {
    const res = await authFetch(`${FASTAPI_API}/tasks`);
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data);
  }

  async function loadStats() {
    try {
      const res = await authFetch(`${FASTAPI_API}/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch {
      // stats endpoint optional - fail silently
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "");
        const derivedFallback = payload.email
          ? payload.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "";
        setUserName(payload.name || derivedFallback);
      }
    } catch {
      // no valid token yet - fine, just skip the greeting
    }
    loadTasks();
    loadStats();
  }, []);

  async function handleDelete(e, taskId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this task? This can't be undone.")) return;
    await authFetch(`${FASTAPI_API}/tasks/${taskId}`, { method: "DELETE" });
    loadTasks();
    loadStats();
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!topic) return;
    setCreating(true);
    try {
      await authFetch(`${FASTAPI_API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          max_retries: Number(localStorage.getItem("cascade_max_retries")) || 3,
          force_fail_once: forceFailOnce,
        }),
      });
      setTopic("");
      setForceFailOnce(false);
    } catch (err) {
      console.error("Create task failed:", err);
      alert("Failed to connect to the backend server. Make sure the API URL is correct and the server is running.");
    } finally {
      setCreating(false);
      loadTasks();
      loadStats();
    }
  }

  return (
    <Layout>
      <FadeIn>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, color: colors.foreground }}>
          {userName ? `Welcome back, ${userName}` : "Dashboard"}
        </h1>
        {userEmail && (
          <p style={{ fontFamily: fontSerif, fontSize: 14, color: colors.mutedForeground, marginBottom: 24 }}>
            {userEmail}
          </p>
        )}
        {!userEmail && <div style={{ marginBottom: 24 }} />}
      </FadeIn>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Runs" value={stats.total_runs} delay={50} />
        <StatCard label="Success Rate" value={`${stats.success_rate}%`} delay={120} />
        <StatCard label="Avg Retries" value={stats.avg_retries ?? 0} delay={190} />
      </div>

      <FadeIn delay={100}>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="Task topic, e.g. 'AI in agriculture'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${colors.ring}33`)}
            onBlur={(e) => (e.target.style.boxShadow = "none")}
          />
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: "0 24px",
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
            {creating ? "Creating..." : "Create task"}
          </button>
        </form>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: colors.mutedForeground,
            marginBottom: 40,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={forceFailOnce}
            onChange={(e) => setForceFailOnce(e.target.checked)}
            style={{ accentColor: colors.accent, cursor: "pointer" }}
          />
          Force one retry (demo) — guarantees the Analyst rejects the first attempt so you can see the correction loop
        </label>
      </FadeIn>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: colors.foreground }}>Recent runs</h2>

      {tasks.length === 0 ? (
        <FadeIn>
          <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
            <p style={{ color: colors.mutedForeground, fontFamily: fontSerif, marginBottom: 16 }}>
              No runs yet.
            </p>
            <button
              onClick={async () => {
                setTopic("AI in agriculture");
                await authFetch(`${FASTAPI_API}/tasks`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    topic: "AI in agriculture",
                    max_retries: Number(localStorage.getItem("cascade_max_retries")) || 3,
                  }),
                });
                setTopic("");
                loadTasks();
                loadStats();
              }}
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.foreground,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: fontSans,
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.card)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Try a sample: &quot;AI in agriculture&quot;
            </button>
          </div>
        </FadeIn>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((t, i) => (
            <FadeIn key={t.id} delay={i * 60}>
              <a
                href={`/runs/${t.id}`}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  color: colors.foreground,
                  padding: "16px 20px",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,24,21,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontFamily: fontSerif, fontSize: 15 }}>{t.topic}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <StatusBadge status={t.status} />
                  <span style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ color: colors.accent, fontSize: 13, fontWeight: 600 }}>View trace →</span>
                  <button
                    onClick={(e) => handleDelete(e, t.id)}
                    title="Delete task"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: colors.mutedForeground,
                      fontSize: 13,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: 8,
                      fontFamily: fontSans,
                      transition: "color 0.2s ease, background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = colors.destructive;
                      e.currentTarget.style.background = "#fbe1da";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = colors.mutedForeground;
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    ✕
                  </button>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      )}
    </Layout>
  );
}
