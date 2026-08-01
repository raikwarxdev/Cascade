import { colors, fontSans } from "../lib/theme";

const styles = {
  completed: { bg: "#dcefe0", color: "#1f7a3d", label: "Completed" },
  running: { bg: "#fcefd9", color: "#b4790a", label: "Running" },
  awaiting_approval: { bg: "#fde8d2", color: "#b4590a", label: "Awaiting Approval" },
  failed: { bg: "#fbe1da", color: colors.destructive, label: "Failed" },
  pending: { bg: colors.muted, color: colors.mutedForeground, label: "Pending" },
};

export default function StatusBadge({ status }) {
  const s = styles[status] || styles.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: fontSans,
        background: s.bg,
        color: s.color,
        animation: "popIn 0.3s ease",
      }}
    >
      {s.label}
      <style jsx>{`
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
