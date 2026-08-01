// Design tokens pulled directly from the Cascade landing page (globals.css)
// so every app page matches it exactly.
export const colors = {
  background: "#f0eee6",
  foreground: "#1a1815",
  card: "#e8e2d5",
  cardForeground: "#1a1815",
  primary: "#1a1815",
  primaryForeground: "#f0eee6",
  secondary: "#e8e2d5",
  muted: "#e8e2d5",
  mutedForeground: "#6b6659",
  accent: "#d97757",
  accentForeground: "#f8f6f0",
  destructive: "#b04a2f",
  border: "#d4cfc0",
  ring: "#d97757",
};

export const fontSans = "'Inter', ui-sans-serif, system-ui, sans-serif";
export const fontSerif = "'Source Serif 4', Georgia, 'Times New Roman', serif";

export const cardStyle = {
  background: colors.card,
  borderRadius: 20,
  border: `1px solid ${colors.border}`,
  padding: 24,
};

export const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: "#ffffff",
  fontSize: 15,
  outline: "none",
  marginBottom: 12,
  boxSizing: "border-box",
  fontFamily: fontSans,
  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
};

export function pillButton({ variant = "primary", disabled = false } = {}) {
  const base = {
    padding: "12px 22px",
    borderRadius: 999,
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "default" : "pointer",
    fontFamily: fontSans,
    transition: "background 0.2s ease, color 0.2s ease, transform 0.15s ease",
  };
  if (variant === "primary") {
    return { ...base, background: disabled ? colors.mutedForeground : colors.primary, color: colors.primaryForeground };
  }
  return { ...base, background: "transparent", color: colors.foreground, border: `1px solid ${colors.border}` };
}
