import Script from "next/script";
import { useRef } from "react";
import { useRouter } from "next/router";

const NODE_API = process.env.NEXT_PUBLIC_NODE_API || "http://localhost:4000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleButton() {
  const router = useRouter();
  const divRef = useRef(null);

  async function handleCredentialResponse(response) {
    const res = await fetch(`${NODE_API}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    }
  }

  function initGoogle() {
    if (!window.google || !GOOGLE_CLIENT_ID || !divRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(divRef.current, {
      theme: "outline",
      size: "large",
      width: 340,
      shape: "pill",
      text: "continue_with",
    });
  }

  if (!GOOGLE_CLIENT_ID) {
    // Fails quietly in dev if not configured yet, instead of breaking the page.
    return (
      <div style={{ fontSize: 12, color: "#9a9484", textAlign: "center", marginBottom: 8 }}>
        Google sign-in not configured yet
      </div>
    );
  }

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initGoogle} />
      <div ref={divRef} style={{ display: "flex", justifyContent: "center" }} />
    </>
  );
}
