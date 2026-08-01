export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Cascade</h1>
      <p>
        A multi-agent system with self-correcting retries, a human approval
        checkpoint, and a live execution trace — not just a chat window.
      </p>
      <a href="/signup">Get started</a>
      {" | "}
      <a href="/login">Log in</a>
    </main>
  );
}
