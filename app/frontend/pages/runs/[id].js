import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import Layout from "../../components/Layout";
import FadeIn from "../../components/FadeIn";
import StatusBadge from "../../components/StatusBadge";
import { colors, cardStyle, fontSans, fontSerif } from "../../lib/theme";
import { authFetch, requireAuth, getToken } from "../../lib/auth";

const FASTAPI_API = process.env.NEXT_PUBLIC_FASTAPI_API || "http://localhost:8000";

const NODE_LABELS = {
  researcher: "Researcher",
  analyst: "Analyst",
  writer: "Writer",
};

function BlinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: colors.accent,
            display: "inline-block",
            animation: `blinkDot 1.1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes blinkDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

function TraceCard({ event, index, isLatest, stillStreaming }) {
  const showThinking = isLatest && stillStreaming && event.node && event.event !== "done";
  const isRetryFail = event.node === "analyst" && event.validation_passed === false;

  return (
    <FadeIn delay={0} style={{ marginBottom: 8 }}>
      <div
        style={{
          ...cardStyle,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          animation: isRetryFail ? "slideIn 0.35s ease, pulseRetry 1.4s ease 0.35s 2" : "slideIn 0.35s ease",
          border: isRetryFail ? `1px solid ${colors.destructive}` : `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
          {event.node ? NODE_LABELS[event.node] || event.node : "Run complete"}
          {showThinking && <BlinkingDots />}
        </span>
        {event.node === "analyst" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {event.validation_passed ? (
              <span style={{ color: "#1f7a3d", fontWeight: 700, fontSize: 13 }}>PASS</span>
            ) : (
              <span
                style={{
                  color: colors.destructive,
                  fontWeight: 700,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span>
                FAIL — sending back to Researcher (retry {event.retry_count})
              </span>
            )}
          </div>
        )}
        {event.event === "done" && <StatusBadge status={event.status} />}
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseRetry {
          0%, 100% { box-shadow: 0 0 0 0 rgba(176,74,47,0); }
          50% { box-shadow: 0 0 0 4px rgba(176,74,47,0.15); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </FadeIn>
  );
}

function ApprovalCheck() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "26px 0",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(31,122,61,0.18) 0%, rgba(31,122,61,0) 70%)",
          animation: "glowPulse 1.6s cubic-bezier(0.22,1,0.36,1) 0.15s forwards",
          opacity: 0,
        }}
      />
      <svg width="68" height="68" viewBox="0 0 64 64" fill="none" style={{ position: "relative" }}>
        <circle
          cx="32"
          cy="32"
          r="29"
          fill="#1f7a3d"
          style={{
            transformOrigin: "32px 32px",
            transform: "scale(0)",
            animation: "sealFill 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s forwards",
          }}
        />
        <circle
          cx="32"
          cy="32"
          r="29"
          stroke="#1f7a3d"
          strokeWidth="2.5"
          fill="none"
          style={{
            strokeDasharray: 182,
            strokeDashoffset: 182,
            opacity: 0.35,
            animation: "circleDraw 0.5s cubic-bezier(0.65,0,0.35,1) 0.05s forwards",
          }}
        />
        <path
          d="M20 33.5L28 41.5L45 23"
          stroke="#f8f6f0"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: 34,
            strokeDashoffset: 34,
            animation: "checkDraw 0.32s cubic-bezier(0.65,0,0.35,1) 0.48s forwards",
          }}
        />
      </svg>
      <div
        style={{
          fontFamily: fontSans,
          fontWeight: 700,
          fontSize: 15,
          color: colors.foreground,
          marginTop: 14,
          opacity: 0,
          transform: "translateY(4px)",
          animation: "fadeTextIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.78s forwards",
        }}
      >
        Approved
      </div>
      <style jsx>{`
        @keyframes glowPulse {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
        @keyframes sealFill {
          to { transform: scale(1); }
        }
        @keyframes circleDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeTextIn {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function RunDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState(null);
  const [events, setEvents] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!requireAuth(router)) return;
    if (!id) return;
    authFetch(`${FASTAPI_API}/tasks/${id}`)
      .then((res) => res.json())
      .then(setTask);
  }, [id]);

  function startStream() {
    if (!id) return;
    setEvents([]);
    setStreaming(true);

    const token = getToken();
    // Each provider (Groq/Gemini/Claude/OpenAI/Other) keeps its own
    // remembered key in Settings - grab whichever one is currently selected.
    const provider = typeof window !== "undefined" ? localStorage.getItem("cascade_provider") || "groq" : "groq";
    const savedKey =
      typeof window !== "undefined" ? localStorage.getItem(`cascade_api_key_${provider}`) : "";
    const params = new URLSearchParams({ token: token || "", provider });
    if (savedKey) params.set("api_key", savedKey);

    if (provider === "other" && typeof window !== "undefined") {
      const providerName = localStorage.getItem("cascade_other_provider_name") || "";
      if (providerName) params.set("provider_name", providerName);
    }

    const es = new EventSource(`${FASTAPI_API}/tasks/${id}/stream?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setEvents((prev) => [...prev, data]);

      if (data.event === "done") {
        setStreaming(false);
        es.close();
        authFetch(`${FASTAPI_API}/tasks/${id}`)
          .then((res) => res.json())
          .then(setTask);
      }
    };

    es.onerror = () => {
      setStreaming(false);
      es.close();
    };
  }

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const [approving, setApproving] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  async function approveTask() {
    setApproving(true);
    await authFetch(`${FASTAPI_API}/tasks/${id}/approve`, { method: "POST" });
    // Let the check-draw animation actually play before swapping the UI -
    // this is the whole point: a real moment, not an instant state flip.
    setTimeout(async () => {
      const res = await authFetch(`${FASTAPI_API}/tasks/${id}`);
      const data = await res.json();
      setTask(data);
      setApproving(false);
      setJustApproved(true);
      setTimeout(() => setJustApproved(false), 3000);
    }, 1350);
  }

  const [copied, setCopied] = useState(false);

  function copyReport() {
    if (!task?.final_report) return;
    navigator.clipboard.writeText(task.final_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Layout>
      <FadeIn>
        {task && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.foreground, margin: 0 }}>{task.topic}</h1>
              <StatusBadge status={task.status} />
            </div>
          </div>
        )}

        <button
          onClick={startStream}
          disabled={streaming}
          style={{
            padding: "12px 24px",
            borderRadius: 999,
            border: "none",
            background: streaming ? colors.mutedForeground : colors.primary,
            color: colors.primaryForeground,
            fontWeight: 600,
            fontSize: 14,
            cursor: streaming ? "default" : "pointer",
            fontFamily: fontSans,
            transition: "background 0.2s ease",
            marginBottom: 32,
          }}
          onMouseEnter={(e) => !streaming && (e.currentTarget.style.background = colors.accent)}
          onMouseLeave={(e) => !streaming && (e.currentTarget.style.background = colors.primary)}
        >
          {streaming ? "Running..." : "Start run"}
        </button>
      </FadeIn>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: colors.foreground }}>Live trace</h2>

      {events.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 32, color: colors.mutedForeground, fontFamily: fontSerif }}>
          No events yet — click Start run.
        </div>
      ) : (
        <div>
          {events.map((e, i) => (
            <TraceCard
              key={i}
              event={e}
              index={i}
              isLatest={i === events.length - 1}
              stillStreaming={streaming}
            />
          ))}
        </div>
      )}

      {task?.status === "awaiting_approval" && (
        <FadeIn style={{ marginTop: 32 }}>
          <div
            style={{
              ...cardStyle,
              background: "#fde8d2",
              border: `1px solid ${colors.accent}`,
            }}
          >
            {approving ? (
              <ApprovalCheck />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: colors.foreground }}>
                    Waiting for your approval
                  </div>
                  <div style={{ fontFamily: fontSerif, fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
                    The report below hasn&apos;t been marked complete yet — nothing is finalized until you approve it.
                  </div>
                </div>
                <button
                  onClick={approveTask}
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
                    whiteSpace: "nowrap",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1f7a3d")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = colors.primary)}
                >
                  ✓ Approve
                </button>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {justApproved && (
        <FadeIn style={{ marginTop: 16 }}>
          <div
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              background: "#dcefe0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#1f7a3d", fontWeight: 600, fontSize: 14 }}>
              This run is now marked complete — it&apos;s saved in your dashboard history.
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={copyReport}
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  border: "1px solid #1f7a3d",
                  background: "transparent",
                  color: "#1f7a3d",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: fontSans,
                }}
              >
                {copied ? "Copied ✓" : "Copy report"}
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: "#1f7a3d",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: fontSans,
                }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {task?.final_report && (
        <FadeIn delay={100} style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.foreground, margin: 0 }}>Final report</h2>
            <button
              onClick={copyReport}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.mutedForeground,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: fontSans,
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div style={{ ...cardStyle, fontFamily: fontSerif, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {task.final_report}
          </div>
        </FadeIn>
      )}
    </Layout>
  );
}
