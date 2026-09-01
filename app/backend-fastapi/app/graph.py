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
DEFAULT_LLM = LLM(model="groq/qwen/qwen3.6-27b", max_tokens=4096)
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
        goal="Turn validated research into an executive-ready, highly structured, beautifully formatted technical report",
        backstory=(
            "You are a principal technical writer and executive communications expert. "
            "You format technical reports with clean section headers, clear bullet points, "
            "structured key-value matrices, and clean horizontal dividers. "
            "You NEVER use '#' or '##' markdown hashtag headers in your output. "
            "Instead, you use elegant dividers ('====================' and '--------------------'), "
            "numbered section titles ('1. TERMINOLOGY & TAXONOMY', '2. SYSTEM ARCHITECTURE'), "
            "and clean flow diagrams (e.g., [Sensor] --> [Cloud Engine] --> [Actuator]) so the report is "
            "100% clean, professional, and ready to copy-paste directly into Word, Docs, or emails."
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
            f"Research the topic: '{state['topic']}'.\n\n"
            f"First, use the search_knowledge_base tool to check for relevant "
            f"uploaded material. Then supplement with your own knowledge as "
            f"needed. If the tool returns nothing relevant, say so explicitly "
            f"and proceed using general knowledge.{feedback_context}"
        ),
        expected_output="Clear, factual research notes formatted logically.",
        agent=agent,
    )
    result = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff()

    return {
        **state,
        "research_notes": str(result),
    }


def analyst_node(state: WorkflowState) -> WorkflowState:
    # Sleep to reset rate limit / token bucket for all providers
    time.sleep(10)

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
        expected_output="PASS or FAIL followed by a brief 2-3 sentence explanation.",
        agent=agent,
    )
    result = str(Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff())

    passed = result.strip().startswith("PASS")

    return {
        **state,
        "validation_passed": passed,
        "validation_feedback": result,
        "retry_count": state.get("retry_count", 0) + (0 if passed else 1),
    }


def writer_node(state: WorkflowState) -> WorkflowState:
    # Sleep to reset rate limit / token bucket for all providers
    time.sleep(10)
    llm = state.get("llm") or DEFAULT_LLM
    agent = make_writer(llm)

    import urllib.parse
    topic_clean = urllib.parse.quote(f"clean modern system architecture infographic diagram for {state['topic']}, professional enterprise technical flowchart chart, high quality")
    diagram_url = f"https://image.pollinations.ai/prompt/{topic_clean}?width=1024&height=512&nologo=true"
    image_tag = f"![System Architecture Diagram for {state['topic']}]({diagram_url})"

    task = Task(
        description=(
            f"Write a comprehensive, in-depth, fully detailed technical report on '{state['topic']}' "
            f"using this validated research:\n\n{state['research_notes']}\n\n"
            f"CRITICAL FORMATTING & COMPLETENESS REQUIREMENTS:\n"
            f"1. DO NOT use '#' or '##' hashtag headers in your report anywhere.\n"
            f"2. Use '================================================================================' for the main document title and end of report.\n"
            f"3. Use '--------------------------------------------------------------------------------' under section titles (e.g. EXECUTIVE SUMMARY, 1. TERMINOLOGY & TAXONOMY).\n"
            f"4. Under section '2. SYSTEM ARCHITECTURE', YOU MUST include this exact markdown image line on its own line:\n"
            f"{image_tag}\n"
            f"5. For applications and comparisons, use clean bulleted key-value sections or clean markdown tables.\n"
            f"6. Provide extensive technical detail and explanations for all sections: Executive Summary, 1. Terminology, 2. Architecture, 3. Applications, 4. Challenges & Risks, 5. Strategic Roadmap.\n"
            f"7. Ensure the report is 100% complete and NEVER cut off mid-sentence."
        ),
        expected_output="A comprehensive, highly detailed executive technical report with an embedded visual diagram image graphic, clean dividers, no hashtag headers, and full completeness.",
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
