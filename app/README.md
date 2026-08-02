# Cascade

A multi-agent AI workflow platform with self-correcting retries, a human-approval checkpoint, and a live execution trace — not just a chat window.

## The problem this solves

Most AI agent demos assume the model gets it right the first time. If it doesn't, there's no mechanism to catch it — a bad answer just goes through, or a human has to notice and manually re-prompt. Cascade assumes the opposite: that a single AI pass can be wrong, and builds real correction and oversight into the pipeline itself, instead of trusting one shot.

## How it works

1. **You submit a task** — a topic or question you want researched and written up.
2. **The Researcher agent** investigates it. If you've uploaded documents to your knowledge base, it retrieves relevant passages from them first (real RAG — chunked, embedded, and vector-searched, not just pasted into a prompt) before falling back on general knowledge.
3. **The Analyst agent** reviews that research for accuracy, completeness, and bias — independently, as a second opinion, not just the same model checking its own work.
4. **If the Analyst rejects it**, the task automatically goes back to the Researcher with the specific rejection reason attached, and it tries again — up to a limit you control. You watch this retry happen live, not after the fact.
5. **Once research passes**, the Writer agent drafts the final report.
6. **Nothing is marked complete automatically.** The draft is held at a checkpoint — a human has to explicitly click Approve before it's considered done. This is the actual human-in-the-loop mechanism, not just a UI label.
7. **The whole run streams live** to your browser, node by node, as it happens — so you can see exactly which agent is working, whether validation passed or failed, and how many retries have occurred.

## What you can configure

- **Max retries per task** — how many times the Analyst can send work back before the system gives up gracefully instead of looping forever
- **Your own Groq API key** — optionally paste your own key in Settings to run tasks under your own account/quota instead of the app's default key; used only for your next run, stored only in your browser
- **A demo toggle** to force one guaranteed retry on the first attempt, so the correction loop is visible on command rather than left to chance — clearly labeled, off by default

## Everything else that's real, not decorative

- **Per-user data isolation** — every task and every uploaded document is scoped to the account that created it, enforced server-side via JWT verification, not just hidden in the UI
- **Two ways to sign in** — email/password or Google OAuth, both producing the same verified session
- **A knowledge base** — upload PDFs, which get chunked, embedded locally (FastEmbed), and stored in a Qdrant vector database; the Researcher agent queries this during a run
- **Live dashboard stats** — total runs, success rate, and average retries, computed from real stored data
- **Delete controls** — remove individual tasks or clear your entire history at any time

## Architecture

A monorepo with two deployable halves:

```
app/
├── frontend/          Next.js 14 (Pages Router) — auth, dashboard, live trace UI
├── backend-fastapi/   FastAPI + LangGraph + CrewAI + LlamaIndex/Qdrant RAG
└── backend-node/      Express — email/password + Google OAuth, issues JWTs
landing/               Next.js 16 (App Router) — marketing site
```

- **Orchestration:** LangGraph owns the control flow (routing, retries, when to stop); CrewAI owns the agent reasoning
- **LLM provider:** Groq (Llama 3.3 70B)
- **RAG:** LlamaIndex ingestion pipeline → FastEmbed local embeddings → Qdrant vector store, metadata-filtered per user
- **Auth:** JWT issued by Node, verified independently by FastAPI via a shared secret; Google OAuth via Google Identity Services
- **Real-time:** Server-Sent Events stream every agent step to the browser live
- **Deployment:** Vercel (both Next.js apps), Railway (both backends), Qdrant Cloud (vector store)

## Run it locally

```bash
cd app
docker compose up -d --build
```

Frontend on `localhost:3000`, FastAPI on `localhost:8000`, Node on `localhost:4000`, Qdrant on `localhost:6333`.
