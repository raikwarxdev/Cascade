import { colors, fontSans, fontSerif } from "../lib/theme";
import FadeIn from "../components/FadeIn";

export default function Custom404() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fontSans,
        textAlign: "center",
        padding: 24,
      }}
    >
      <FadeIn>
        <h1 style={{ fontSize: 72, fontWeight: 800, color: colors.foreground, margin: 0 }}>404</h1>
        <p style={{ fontFamily: fontSerif, fontSize: 17, color: colors.mutedForeground, marginTop: 12, marginBottom: 28 }}>
          This page took a wrong turn somewhere.
        </p>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 999,
            background: colors.accent,
            color: colors.accentForeground,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            transition: "opacity 0.2s ease",
          }}
        >
          Back to dashboard
        </a>
      </FadeIn>
    </div>
  );
}
