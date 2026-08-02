"""
Cascade - FastAPI backend

AUTH MODEL:
Node signs a JWT on login/signup containing { email }. FastAPI verifies
that SAME token here using the SAME secret (JWT_SECRET, shared via env).
Every task is now owned by the email extracted from that token - nobody
can see, approve, or delete another user's tasks. This is what makes the
whole thing safe to actually charge people for later.

One real browser limitation: the native EventSource API (used for the
live SSE trace) cannot send custom Authorization headers. So the stream
endpoint accepts the token as a query param instead - everything else
uses the standard Authorization: Bearer <token> header.

RAG ADDITION: knowledge sources (text/URLs a user uploads) are ingested
into a shared Qdrant collection via LlamaIndex, tagged per-user, and the
Researcher agent retrieves from them through a real CrewAI tool call.
See app/knowledge.py and app/tools.py.

PROVIDER ADDITION (v2): CrewAI runs on LiteLLM under the hood, which
routes by model-string prefix (e.g. "groq/...", "gemini/...",
"anthropic/...", "openai/..."). Historically this was wired up by
temporarily overriding an env var (GROQ_API_KEY etc.) for the duration
of a run - but that only works for a small fixed list of known
providers, and it has a real bug: env vars are global to the whole
server process, so two people running tasks on different providers at
the same moment could stomp on each other's keys.

Now a real crewai.LLM(model=, api_key=) object is built once per request
and passed straight into state - nothing global, nothing shared. The
"other" provider doesn't ask which company's key it is: it looks at the
key's own prefix (gsk_ / sk-ant- / AIza / sk-) and routes to that
provider's model automatically.
"""
import json
import os
import uuid
from datetime import datetime
from typing import Optional

import jwt
from crewai import LLM
from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, Column, String, DateTime, Integer
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel

from app.graph import compiled_graph
from app.knowledge import ingest_text, fetch_url_text, extract_pdf_text, delete_source as delete_source_vectors

# Provider picker for Settings -> "your own API key" feature. Groq is the
# only one with a built-in server-side key (via GROQ_API_KEY already set
# in the server's own environment, untouched by any of this); the rest
# require the user's own key or the run will fail. "other" is handled
# separately below since it has no fixed model string.
PROVIDER_CONFIG = {
    "groq": {"model": "groq/llama-3.3-70b-versatile"},
    "gemini": {"model": "gemini/gemini-3.5-flash"},
    "claude": {"model": "anthropic/claude-haiku-4-5-20251001"},
    "openai": {"model": "openai/gpt-4o-mini"},
}
DEFAULT_PROVIDER = "groq"

# Recognizable API key prefixes, checked in this order (most specific
# first - e.g. "sk-ant-" and "sk-or-" must be checked before the plain
# "sk-" OpenAI check, or every Claude/OpenRouter key would get
# misidentified as OpenAI).
#
# Honest limitation: a bare API key can only be routed automatically if
# its *shape* is distinguishable. Providers like Mistral and Cohere issue
# keys with no distinguishing prefix at all - just an opaque random
# string - so there is no way to tell them apart from a key alone. Those
# aren't included here because guessing wrong would silently burn the
# person's quota on a failed call instead of failing clearly. If a key
# doesn't match anything below, the person gets a clear error rather
# than a false "it worked" followed by a confusing failure.
KEY_PREFIX_MAP = [
    ("gsk_", "groq"),
    ("sk-ant-", "claude"),
    ("sk-or-", "openrouter"),
    ("pplx-", "perplexity"),
    ("fw_", "fireworks"),
    ("AIza", "gemini"),
    ("sk-", "openai"),
]

# Model string used for each auto-detected-by-prefix provider.
DETECTED_MODEL_MAP = {
    "groq": "groq/llama-3.3-70b-versatile",
    "claude": "anthropic/claude-haiku-4-5-20251001",
    "gemini": "gemini/gemini-3.5-flash",
    "openai": "openai/gpt-4o-mini",
    "openrouter": "openrouter/auto",
    "perplexity": "perplexity/sonar",
    "fireworks": "fireworks_ai/accounts/fireworks/models/llama-v3p1-70b-instruct",
}

# For providers whose keys have no distinguishing prefix (so
# KEY_PREFIX_MAP can't identify them), the person types the provider's
# name instead and this resolves it to a real LiteLLM model string.
# Matching is case/spacing-insensitive ("Together AI", "togetherai",
# "together" all resolve the same way).
PROVIDER_NAME_MAP = {
    "mistral": "mistral/mistral-large-latest",
    "cohere": "cohere/command-r-plus",
    "deepseek": "deepseek/deepseek-chat",
    "together": "together_ai/meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "togetherai": "together_ai/meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "anyscale": "anyscale/meta-llama/Llama-3-70b-chat-hf",
    "xai": "xai/grok-2-latest",
    "grok": "xai/grok-2-latest",
    "moonshot": "moonshot/moonshot-v1-8k",
    # Also accept the already-supported ones by name, so typing a name
    # never conflicts with the prefix-based path above.
    "groq": DETECTED_MODEL_MAP["groq"],
    "claude": DETECTED_MODEL_MAP["claude"],
    "anthropic": DETECTED_MODEL_MAP["claude"],
    "gemini": DETECTED_MODEL_MAP["gemini"],
    "google": DETECTED_MODEL_MAP["gemini"],
    "openai": DETECTED_MODEL_MAP["openai"],
    "openrouter": DETECTED_MODEL_MAP["openrouter"],
    "perplexity": DETECTED_MODEL_MAP["perplexity"],
    "fireworks": DETECTED_MODEL_MAP["fireworks"],
}


def normalize_provider_name(name: str) -> str:
    return "".join(name.lower().split())


def detect_provider_from_key(api_key: str) -> Optional[str]:
    """
    "Other" doesn't ask the person which provider they're using - it just
    looks at the shape of the key they pasted and figures it out. Returns
    None if the key doesn't match any known provider's format.
    """
    for prefix, provider in KEY_PREFIX_MAP:
        if api_key.startswith(prefix):
            return provider
    return None


def build_llm(provider: Optional[str], api_key: Optional[str], provider_name: Optional[str] = None) -> LLM:
    """
    Build a per-run CrewAI LLM object. This is the only place a provider
    choice turns into an actual model/key, and nothing here touches
    process-global state - so concurrent runs on different providers
    never interfere with each other.

    - Known providers (groq/gemini/claude/openai): fixed model string.
      If the user supplied their own key, it's passed straight to this
      LLM object; if not, CrewAI/LiteLLM falls back to reading the
      matching env var from the server's own environment (only actually
      set for Groq).
    - "other": two ways to resolve which provider a pasted key belongs
      to, tried in this order:
        1. If the person typed a provider name (e.g. "Mistral"), match
           it against PROVIDER_NAME_MAP. This is the only way to
           support providers like Mistral or Cohere, whose keys are
           opaque strings with no distinguishing shape - the key alone
           can never identify those.
        2. Otherwise, fall back to matching the key's own prefix against
           KEY_PREFIX_MAP (covers Groq/Claude/Gemini/OpenAI/OpenRouter/
           Perplexity/Fireworks without needing a name typed at all).
      If neither resolves it, the run fails with a clear error rather
      than guessing.
    """
    if provider == "other":
        if not api_key:
            raise HTTPException(status_code=400, detail="Paste an API key to use a custom provider")

        model = None
        if provider_name and provider_name.strip():
            model = PROVIDER_NAME_MAP.get(normalize_provider_name(provider_name))
            if not model:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"'{provider_name}' isn't a provider Cascade knows the model string for yet. "
                        f"Supported by name: {', '.join(sorted(set(PROVIDER_NAME_MAP.keys())))}. "
                        "Tell Claude the provider and its LiteLLM model string to add it."
                    ),
                )

        if not model:
            detected = detect_provider_from_key(api_key.strip())
            if not detected:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Couldn't identify which provider this key belongs to from its format, "
                        "and no provider name was given. Either type the provider's name (needed "
                        "for providers like Mistral or Cohere whose keys have no distinguishing "
                        "shape), or use a key from a directly-detectable provider: Groq (gsk_...), "
                        "Claude (sk-ant-...), OpenRouter (sk-or-...), Perplexity (pplx-...), "
                        "Fireworks (fw_...), Gemini (AIza...), OpenAI (sk-...)."
                    ),
                )
            model = DETECTED_MODEL_MAP[detected]

        return LLM(model=model, api_key=api_key.strip())

    provider_key = provider if provider in PROVIDER_CONFIG else DEFAULT_PROVIDER
    kwargs = {"model": PROVIDER_CONFIG[provider_key]["model"]}
    if api_key:
        kwargs["api_key"] = api_key
    return LLM(**kwargs)


DATABASE_URL = "sqlite:///./platform.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Must match backend-node's JWT_SECRET exactly - same env var name, same value.
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")


class TaskRun(Base):
    __tablename__ = "task_runs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)  # the owner's email
    topic = Column(String, nullable=False)
    # pending -> running -> awaiting_approval -> completed  (or -> failed)
    status = Column(String, default="pending")
    final_report = Column(String, default="")
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    force_fail_once = Column(Integer, default=0)  # SQLite has no bool type
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)  # the owner's email
    source_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # "text" or "url"
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cascade API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://cascade-eosin-six.vercel.app",
        "https://cascade-855w.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def decode_token(token: str) -> str:
    """Verify the JWT and return the owner's email, or raise 401."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session - please log in again")
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    return email


def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Standard dependency for every normal (non-SSE) endpoint."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    return decode_token(token)


class TaskCreate(BaseModel):
    topic: str
    max_retries: Optional[int] = 3
    force_fail_once: Optional[bool] = False


class KnowledgeUpload(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    source_name: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "fastapi-backend"}


@app.post("/tasks")
def create_task(payload: TaskCreate, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    task = TaskRun(
        user_id=user,
        topic=payload.topic,
        status="pending",
        max_retries=payload.max_retries or 3,
        force_fail_once=1 if payload.force_fail_once else 0,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "topic": task.topic, "status": task.status}


@app.get("/tasks")
def list_tasks(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = (
        db.query(TaskRun)
        .filter(TaskRun.user_id == user)
        .order_by(TaskRun.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "topic": t.topic,
            "status": t.status,
            "retry_count": t.retry_count,
            "created_at": t.created_at.isoformat(),
        }
        for t in tasks
    ]


@app.get("/tasks/{task_id}")
def get_task(task_id: str, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(TaskRun).filter(TaskRun.id == task_id, TaskRun.user_id == user).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id,
        "topic": task.topic,
        "status": task.status,
        "final_report": task.final_report,
        "retry_count": task.retry_count,
        "created_at": task.created_at.isoformat(),
    }


@app.delete("/tasks")
def clear_all_tasks(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Scoped to the current user only - never touches other accounts' data.
    count = db.query(TaskRun).filter(TaskRun.user_id == user).delete()
    db.commit()
    return {"deleted": count}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(TaskRun).filter(TaskRun.id == task_id, TaskRun.user_id == user).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"deleted": True, "id": task_id}


@app.post("/tasks/{task_id}/approve")
def approve_task(task_id: str, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(TaskRun).filter(TaskRun.id == task_id, TaskRun.user_id == user).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "awaiting_approval":
        raise HTTPException(status_code=400, detail="Task is not awaiting approval")
    task.status = "completed"
    db.commit()
    return {"id": task.id, "status": task.status}


@app.get("/stats")
def get_stats(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(TaskRun).filter(TaskRun.user_id == user).all()
    total = len(tasks)
    completed = len([t for t in tasks if t.status == "completed"])
    success_rate = round((completed / total) * 100, 1) if total else 0
    avg_retries = round(sum(t.retry_count for t in tasks) / total, 1) if total else 0
    return {"total_runs": total, "success_rate": success_rate, "avg_retries": avg_retries}


@app.post("/knowledge/upload")
def upload_knowledge(
    payload: KnowledgeUpload,
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.text and not payload.url:
        raise HTTPException(status_code=400, detail="Provide either 'text' or 'url'")
    if payload.text and payload.url:
        raise HTTPException(status_code=400, detail="Provide only one of 'text' or 'url', not both")

    source_id = str(uuid.uuid4())

    if payload.url:
        try:
            text = fetch_url_text(payload.url)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not fetch URL: {exc}")
        source_type = "url"
        source_name = payload.source_name or payload.url
    else:
        text = payload.text
        source_type = "text"
        source_name = payload.source_name or (text[:60] + "..." if len(text) > 60 else text)

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No content to ingest")

    chunk_count = ingest_text(user_id=user, source_id=source_id, source_name=source_name, text=text)

    source = KnowledgeSource(
        id=source_id,
        user_id=user,
        source_name=source_name,
        source_type=source_type,
        chunk_count=chunk_count,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    return {
        "id": source.id,
        "source_name": source.source_name,
        "source_type": source.source_type,
        "chunk_count": source.chunk_count,
        "created_at": source.created_at.isoformat(),
    }


@app.post("/knowledge/upload-pdf")
async def upload_knowledge_pdf(
    file: UploadFile = File(...),
    source_name: Optional[str] = Form(None),
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are supported")

    file_bytes = await file.read()
    try:
        text = extract_pdf_text(file_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}")

    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in this PDF - it may be scanned/image-only, which isn't supported",
        )

    source_id = str(uuid.uuid4())
    name = source_name or file.filename

    chunk_count = ingest_text(user_id=user, source_id=source_id, source_name=name, text=text)

    source = KnowledgeSource(
        id=source_id,
        user_id=user,
        source_name=name,
        source_type="pdf",
        chunk_count=chunk_count,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    return {
        "id": source.id,
        "source_name": source.source_name,
        "source_type": source.source_type,
        "chunk_count": source.chunk_count,
        "created_at": source.created_at.isoformat(),
    }


@app.get("/knowledge")
def list_knowledge(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    sources = (
        db.query(KnowledgeSource)
        .filter(KnowledgeSource.user_id == user)
        .order_by(KnowledgeSource.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "source_name": s.source_name,
            "source_type": s.source_type,
            "chunk_count": s.chunk_count,
            "created_at": s.created_at.isoformat(),
        }
        for s in sources
    ]


@app.delete("/knowledge/{source_id}")
def delete_knowledge(source_id: str, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    source = (
        db.query(KnowledgeSource)
        .filter(KnowledgeSource.id == source_id, KnowledgeSource.user_id == user)
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    delete_source_vectors(source_id)
    db.delete(source)
    db.commit()
    return {"deleted": True, "id": source_id}


@app.get("/tasks/{task_id}/stream")
def stream_task(
    task_id: str,
    token: str,
    api_key: Optional[str] = None,
    provider: Optional[str] = None,
    provider_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # EventSource can't send headers, so auth comes via ?token= here instead.
    user = decode_token(token)

    task = db.query(TaskRun).filter(TaskRun.id == task_id, TaskRun.user_id == user).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Built once per request - nothing global, nothing to restore afterward.
    llm = build_llm(provider=provider, api_key=api_key, provider_name=provider_name)

    def event_generator():
        db_local = SessionLocal()
        try:
            db_task = db_local.query(TaskRun).filter(TaskRun.id == task_id).first()
            db_task.status = "running"
            db_local.commit()

            initial_state = {
                "topic": task.topic,
                "user_id": user,
                "llm": llm,
                "research_notes": "",
                "validation_passed": False,
                "validation_feedback": "",
                "retry_count": 0,
                "max_retries": task.max_retries or 3,
                "final_report": "",
                "force_fail_once": bool(task.force_fail_once),
            }

            for step in compiled_graph.stream(initial_state):
                node_name = list(step.keys())[0]
                node_output = step[node_name]

                event = {
                    "node": node_name,
                    "retry_count": node_output.get("retry_count", 0),
                    "validation_passed": node_output.get("validation_passed"),
                }
                yield f"data: {json.dumps(event)}\n\n"

                db_task.retry_count = node_output.get("retry_count", db_task.retry_count)
                db_local.commit()

                if node_name == "writer":
                    db_task.status = "awaiting_approval"
                    db_task.final_report = node_output.get("final_report", "")
                    db_local.commit()

            if db_task.status not in ("awaiting_approval", "completed"):
                db_task.status = "failed"
                db_local.commit()

            yield f"data: {json.dumps({'event': 'done', 'status': db_task.status})}\n\n"
        finally:
            db_local.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
