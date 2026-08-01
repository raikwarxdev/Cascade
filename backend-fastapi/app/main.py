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
"""
import json
import os
from typing import Optional
import jwt
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, Column, String, DateTime, Integer
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.graph import compiled_graph

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


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cascade API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/tasks/{task_id}/stream")
def stream_task(task_id: str, token: str, api_key: Optional[str] = None, db: Session = Depends(get_db)):
    # EventSource can't send headers, so auth comes via ?token= here instead.
    user = decode_token(token)

    task = db.query(TaskRun).filter(TaskRun.id == task_id, TaskRun.user_id == user).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    def event_generator():
        db_local = SessionLocal()
        original_key = os.environ.get("GROQ_API_KEY")
        if api_key:
            os.environ["GROQ_API_KEY"] = api_key
        try:
            db_task = db_local.query(TaskRun).filter(TaskRun.id == task_id).first()
            db_task.status = "running"
            db_local.commit()

            initial_state = {
                "topic": task.topic,
                "user_id": user,
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
            if api_key and original_key is not None:
                os.environ["GROQ_API_KEY"] = original_key
            db_local.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
