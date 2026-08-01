import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import FadeIn from "../components/FadeIn";
import { colors, cardStyle, fontSans, fontSerif, pillButton } from "../lib/theme";
import { authFetch, requireAuth } from "../lib/auth";

const FASTAPI_API = process.env.NEXT_PUBLIC_FASTAPI_API || "http://localhost:8000";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Knowledge() {
  const router = useRouter();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [justUploaded, setJustUploaded] = useState(null); // { source_name, chunk_count } | null
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);
  const successTimerRef = useRef(null);

  async function loadSources() {
    setLoading(true);
    const res = await authFetch(`${FASTAPI_API}/knowledge`);
    if (res.ok) {
      const data = await res.json();
      setSources(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    loadSources();
    return () => clearTimeout(successTimerRef.current);
  }, []);

  async function uploadFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported right now.");
      return;
    }

    clearTimeout(successTimerRef.current);
    setJustUploaded(null);
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authFetch(`${FASTAPI_API}/knowledge/upload-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.detail || "Upload failed — try again.");
      } else {
        const data = await res.json();
        await loadSources();
        setJustUploaded(data);
        successTimerRef.current = setTimeout(() => setJustUploaded(null), 2200);
      }
    } catch {
      setUploadError("Could not reach the server.");
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    uploadFile(file);
  }, []);

  async function handleDelete(id) {
    if (!confirm("Remove this source from the knowledge base?")) return;
    setDeletingId(id);
    await authFetch(`${FASTAPI_API}/knowledge/${id}`, { method: "DELETE" });
    setDeletingId(null);
    loadSources();
  }

  return (
    <Layout>
      <FadeIn>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, color: colors.foreground }}>
          Knowledge base
        </h1>
        <p style={{ fontFamily: fontSerif, fontSize: 14, color: colors.mutedForeground, marginBottom: 28 }}>
          Documents uploaded here are chunked, embedded, and retrieved by the Researcher agent
          during a run — not just pasted into the prompt.
        </p>
      </FadeIn>

      <FadeIn delay={80}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...cardStyle,
            border: `1.5px dashed ${
              justUploaded ? colors.accent : dragging ? colors.accent : colors.border
            }`,
            background: justUploaded ? "#f4ede4" : dragging ? "#f4ede4" : colors.card,
            textAlign: "center",
            padding: "44px 24px",
            cursor: "pointer",
            transition: "background 0.25s ease, border-color 0.25s ease",
            marginBottom: 32,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => uploadFile(e.target.files?.[0])}
          />

          {uploading ? (
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.foreground }}>
              Uploading and indexing…
            </div>
          ) : justUploaded ? (
            <div
              key={justUploaded.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <svg viewBox="0 0 44 44" width="32" height="32" style={{ display: "block" }}>
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="2.5"
                  className="ok-circle"
                />
                <path
                  d="M13 22.5l6 6 12-13"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ok-tick"
                />
              </svg>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.foreground }}>
                Added to knowledge base
              </div>
              <div style={{ fontFamily: fontSerif, fontSize: 13, color: colors.mutedForeground }}>
                {justUploaded.source_name} · {justUploaded.chunk_count} chunk
                {justUploaded.chunk_count === 1 ? "" : "s"} indexed
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.foreground, marginBottom: 6 }}>
                Drop a PDF here, or click to browse
              </div>
              <div style={{ fontFamily: fontSerif, fontSize: 13, color: colors.mutedForeground }}>
                PDF only, for now
              </div>
            </>
          )}

          {uploadError && (
            <div style={{ marginTop: 14, fontSize: 13, color: colors.destructive, fontWeight: 600 }}>
              {uploadError}
            </div>
          )}
        </div>
      </FadeIn>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: colors.foreground }}>
        Ingested sources
      </h2>

      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", color: colors.mutedForeground, fontFamily: fontSerif }}>
          Loading…
        </div>
      ) : sources.length === 0 ? (
        <FadeIn>
          <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: colors.mutedForeground, fontFamily: fontSerif }}>
            No documents ingested yet. Upload a PDF above to give the Researcher agent something real to retrieve from.
          </div>
        </FadeIn>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sources.map((s, i) => (
            <FadeIn key={s.id} delay={i * 60}>
              <div
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: colors.foreground }}>
                    {s.source_name}
                  </div>
                  <div style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 3 }}>
                    {s.chunk_count} chunk{s.chunk_count === 1 ? "" : "s"}
                    {s.file_size ? ` · ${formatBytes(s.file_size)}` : ""} ·{" "}
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: colors.mutedForeground,
                    fontSize: 13,
                    cursor: deletingId === s.id ? "default" : "pointer",
                    padding: "6px 10px",
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
                  {deletingId === s.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      <style jsx>{`
        .ok-circle {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: circleDraw 0.45s ease forwards;
        }
        .ok-tick {
          stroke-dasharray: 26;
          stroke-dashoffset: 26;
          animation: tickDraw 0.3s ease forwards 0.4s;
        }
        @keyframes circleDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes tickDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </Layout>
  );
}
