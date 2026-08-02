# Cascade

A multi-agent AI workflow platform with self-correcting retries, a human-approval checkpoint, and a live execution trace — not just a chat window.

**Live demo:** https://cascade-855w.vercel.app
**App:** https://cascade-eosin-six.vercel.app
**GitHub:** https://github.com/raikwarxdev/Cascade

## What it does

Submit a research task → a 3-agent crew (Researcher, Analyst, Writer) works through it live in your browser. The Researcher retrieves from your own uploaded documents (RAG via LlamaIndex + Qdrant) when relevant. The Analyst validates the research and automatically sends it back for another pass if it doesn't meet the bar — you watch this retry happen in real time. Once a draft is ready, it's held at a checkpoint until you explicitly approve it — nothing is marked complete without a human sign-off.

## Architecture

This is a monorepo with two deployable halves:

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
