# Agentic Workflow Platform

A multi-agent execution system (CrewAI) wrapped in a stateful orchestration
layer (LangGraph) with self-correcting retries, a human-approval checkpoint,
and a live execution trace dashboard — instead of a plain chat window.

## Stack
- **FastAPI** — runs the LangGraph + CrewAI orchestration, streams trace events
- **Node.js/Express** — auth (JWT) + WebSocket relay of live trace events
- **Next.js/React** — landing, auth, dashboard, and live run-detail pages
- **Qdrant** — vector store for LlamaIndex-powered retrieval
- **Docker Compose** — one-command local spin-up

## Day 1 status (this scaffold)
- [x] Folder structure for all 4 services
- [x] docker-compose boots FastAPI, Node, Qdrant, Next.js together
- [x] FastAPI: `/health`, `/tasks` (create/list/get) backed by SQLite
- [x] Node: `/health`, `/auth/signup`, `/auth/login`, WebSocket endpoint stub
- [x] Next.js: landing, signup, login, dashboard (create + list tasks), run-detail page

## Run it
```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- FastAPI docs: http://localhost:8000/docs
- Node gateway: http://localhost:4000/health
- Qdrant dashboard: http://localhost:6333/dashboard

## 7-Day Build Plan

**Day 1 — Foundation (done in this scaffold)**
Repo structure, Docker Compose, FastAPI + Node + Next.js skeletons all talking
to each other. Sign up, log in, create a dummy task, see it listed.

**Day 2 — AI engine core loop**
Open `backend-fastapi/app/graph.py` — build the LangGraph state machine
(Researcher -> Analyst -> retry loop -> Writer) wrapping 3 CrewAI agents.
Test end-to-end from a standalone script before touching the API.

**Day 3 — RAG layer + streaming**
Wire LlamaIndex ingestion (docs/URLs -> chunks -> embeddings -> Qdrant) as a
tool for the Researcher agent. Add an SSE endpoint in FastAPI that streams
every node transition, tool call, and retry event as JSON.

**Day 4 — Live trace dashboard**
Node relays the SSE stream over the existing WebSocket (`/ws/traces`) to the
frontend. Build the visual pipeline view in `pages/runs/[id].js` — nodes
lighting up as they fire, retry loop shown as a loop-back arrow, and a real
Approve/Reject button at the human-checkpoint node.

**Day 5 — Full site pages**
Landing page copy, polished auth pages, dashboard stats (total runs, success
rate, avg retries), settings page for API keys if doing multi-user.

**Day 6 — Polish + edge cases**
Loading/error states, rate limiting on the Node gateway, responsive pass,
seed demo data, finish this README with an architecture diagram.

**Day 7 — Deploy + proof**
Frontend -> Vercel. FastAPI + Node -> Railway/Render. Qdrant -> Qdrant Cloud
free tier (or a Docker container on Railway). Test the deployed URL end to
end, record a 90-second demo video, tag `v1.0` on GitHub.

## Non-negotiables (don't cut these even if behind schedule)
1. The retry loop (Analyst rejects -> back to Researcher)
2. The live trace view (not just a final chat message)
3. The human-approval checkpoint button

These three are what separate this from a standard LangChain RAG tutorial.
