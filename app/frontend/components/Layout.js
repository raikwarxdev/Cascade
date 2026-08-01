import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { colors, fontSans } from "../lib/theme";
import LogoMark from "./LogoMark";

export default function Layout({ children }) {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background, fontFamily: fontSans, color: colors.foreground }}>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: scrolled ? "rgba(240,238,230,0.85)" : colors.background,
          backdropFilter: scrolled ? "blur(10px)" : "none",
          boxShadow: scrolled ? "0 1px 20px rgba(26,24,21,0.06)" : "none",
          borderBottom: `1px solid ${scrolled ? colors.border : "transparent"}`,
          transition: "all 0.3s ease",
        }}
      >
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <LogoMark size={22} />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", color: colors.foreground }}>
            Cascade
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/dashboard" style={{ color: colors.foreground, textDecoration: "none", fontWeight: 500, fontSize: 14 }}>
            Dashboard
          </Link>
          <Link href="/knowledge" style={{ color: colors.foreground, textDecoration: "none", fontWeight: 500, fontSize: 14 }}>
            Knowledge
          </Link>
          <Link href="/settings" style={{ color: colors.foreground, textDecoration: "none", fontWeight: 500, fontSize: 14 }}>
            Settings
          </Link>
          <button
            onClick={logout}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color: colors.foreground,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: fontSans,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.card)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Log out
          </button>
        </div>
      </nav>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px" }}>{children}</main>
    </div>
  );
}
