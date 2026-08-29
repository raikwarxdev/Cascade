"""
LangGraph orchestration wrapping a CrewAI crew.

Flow:
    Researcher --> Analyst --(fail, retries left)--> Researcher   [loop]
                       |
                    (pass)
                       v
                    Writer --> END

RAG addition: the Researcher carries a real tool - search_knowledge_base -
backed by a LlamaIndex + Qdrant retriever (see app/knowledge.py and
app/tools.py). It's rebuilt fresh for every run, bound to that run's
user_id, so it only ever searches that person's own ingested documents.

Provider addition (v2): every agent now runs on a real CrewAI LLM object
(model + api_key baked in at construction time) instead of a bare model
string. This object is built once per request in app/main.py and
threaded through state as "llm" - it's what makes the "Other" provider
option work (paste any provider's key, and its prefix is used to detect
which one it is and route to the right model), and it fixes a real
concurrency bug the old env-var-swapping approach had: env vars are
global to the process, so two people running tasks on different
providers at the same moment used to stomp on each other's keys. An LLM
object is just a plain per-call argument, so there's nothing shared to
stomp on.
"""
import os
import time
from typing import TypedDict, Any
from crewai import Agent, Task, Crew, Process, LLM
from langgraph.graph import StateGraph, END

from app.tools import make_knowledge_tool

# Used only if a run somehow arrives with no llm object at all (shouldn't
# happen in normal use - app/main.py always builds one - but keeps this
# module safe to call directly, e.g. in tests).
DEFAULT_LLM = LLM(model="groq/openai/gpt-oss-120b")
MAX_RETRIES = 3


class WorkflowState(TypedDict):
    topic: str
    user_id: str
    llm: Any  # crewai.LLM instance, built per-request in main.py
    research_notes: str
    validation_passed: bool
    validation_feedback: str
    retry_count: int
    max_retries: int
    final_report: str
    force_fail_once: bool


def make_researcher(user_id: str, llm: Any):
    return Agent(
        role="Researcher",
        goal="Gather accurate, well-organized information on the given topic",
        backstory=(
            "You are a meticulous research analyst. You gather facts, "
            "structure them clearly, and flag anything uncertain rather "
            "than guessing. You always check the knowledge base for "
            "relevant uploaded material before relying on general knowledge."
        ),
        llm=llm,
        tools=[make_knowledge_tool(user_id)],
        verbose=True,
    )


def make_analyst(llm: Any):
    return Agent(
        role="Analyst",
        goal="Critically validate research notes for accuracy, completeness, and bias",
        backstory=(
            "You are a skeptical fact-checker. You never accept research at "
            "face value - you check for missing context, unsupported claims, "
            "and vague statements. You are the last line of defense before "
            "bad information reaches the final report."
        ),
        llm=llm,
        verbose=True,
    )


def make_writer(llm: Any):
    return Agent(
        role="Writer",
        goal="Turn validated research into a clear, well-structured report",
        backstory=(
            "You are a professional technical writer. You take verified "
            "research and turn it into a polished, readable report with "
            "clear sections - no fluff, no filler."
        ),
        llm=llm,
        verbose=True,
    )


def researcher_node(state: WorkflowState) -> WorkflowState:
    llm = state.get("llm") or DEFAULT_LLM
    agent = make_researcher(state["user_id"], llm)
    feedback_context = ""
    if state.get("validation_feedback"):
        feedback_context = (
            f"\n\nYour previous research was rejected for this reason: "
            f"{state['validation_feedback']}\nAddress this specifically."
        )

    task = Task(
        description=(
            f"Research the topic: '{state['topic']}'.{feedback_context}\n\n"
            f"First, use the search_knowledge_base tool to check for relevant "
            f"uploaded material. Then supplement with your own knowledge as "
            f"needed. If the tool returns nothing relevant, say so explicitly "
            f"and proceed using general knowledge."
        ),
        expected_output="A clear, organized set of research notes with key facts and sources of uncertainty flagged.",
        agent=agent,
    )
    result = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff()

    return {
        **state,
        "research_notes": str(result),
    }


def analyst_node(state: WorkflowState) -> WorkflowState:
    llm = state.get("llm") or DEFAULT_LLM
    if llm and "groq" in getattr(llm, "model", ""):
        # Sleep to reset Groq's tight 8k tokens/minute free tier limit
        time.sleep(20)

    # DEMO MODE: if the person explicitly checked "force one retry" when
    # creating the task, deterministically fail the FIRST validation pass
    # so the retry loop is guaranteed to be visible - useful for a demo
    # recording rather than gambling on the LLM's real judgment every take.
    # This never runs unless the person opted in, and it's clearly labeled
    # in the UI - it's a demo toggle, not hidden fake behavior.
    if state.get("force_fail_once") and state.get("retry_count", 0) == 0:
        return {
            **state,
            "validation_passed": False,
            "validation_feedback": "FAIL\nDemo mode: forcing one retry to show the correction loop.",
            "retry_count": state.get("retry_count", 0) + 1,
        }

    llm = state.get("llm") or DEFAULT_LLM
    agent = make_analyst(llm)
    task = Task(
        description=(
            f"Review these research notes on '{state['topic']}' for accuracy, "
            f"completeness, and bias:\n\n{state['research_notes']}\n\n"
            f"Respond starting with exactly 'PASS' or 'FAIL' on the first line, "
            f"then explain why in 2-3 sentences."
        ),
        expected_output="A verdict of PASS or FAIL on the first line, followed by reasoning.",
        agent=agent,
    )
    result = str(Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff())

    passed = result.strip().upper().startswith("PASS")

    return {
        **state,
        "validation_passed": passed,
        "validation_feedback": result,
        "retry_count": state.get("retry_count", 0) + (0 if passed else 1),
    }


def writer_node(state: WorkflowState) -> WorkflowState:
    llm = state.get("llm") or DEFAULT_LLM
    if llm and "groq" in getattr(llm, "model", ""):
        # Sleep to reset Groq's tight 8k tokens/minute free tier limit
        time.sleep(20)
    agent = make_writer(llm)
    task = Task(
        description=(
            f"Write a final report on '{state['topic']}' using this validated "
            f"research:\n\n{state['research_notes']}"
        ),
        expected_output="A polished, well-structured report in markdown.",
        agent=agent,
    )
    result = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff()

    return {**state, "final_report": str(result)}


def route_after_validation(state: WorkflowState) -> str:
    if state["validation_passed"]:
        return "writer"
    limit = state.get("max_retries", MAX_RETRIES)
    if state["retry_count"] >= limit:
        return END
    return "researcher"


def build_graph():
    graph = StateGraph(WorkflowState)

    graph.add_node("researcher", researcher_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("writer", writer_node)

    graph.set_entry_point("researcher")
    graph.add_edge("researcher", "analyst")
    graph.add_conditional_edges(
        "analyst",
        route_after_validation,
        {"writer": "writer", "researcher": "researcher", END: END},
    )
    graph.add_edge("writer", END)

    return graph.compile()


compiled_graph = build_graph()
