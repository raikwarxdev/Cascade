"""
CrewAI tool that wraps knowledge.retrieve_context() so the Researcher
agent can actually call it during a run, instead of the vector store
just sitting there unused.

Scoping note: a CrewAI tool instance is normally stateless/reusable, but
retrieval MUST be scoped to the user who owns the task (never search
across users). We solve that by building a fresh tool instance per run,
with user_id baked in as a field on the tool itself - see
make_knowledge_tool() below, called from graph.py's researcher_node.
"""
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from app.knowledge import retrieve_context


class KnowledgeSearchInput(BaseModel):
    query: str = Field(
        ...,
        description="A focused search query to look up in the user's uploaded knowledge base.",
    )


class KnowledgeSearchTool(BaseTool):
    name: str = "search_knowledge_base"
    description: str = (
        "Search the user's own uploaded documents (PDFs, text, or web pages "
        "they've ingested) for information relevant to the current research "
        "topic. ALWAYS try this tool first before relying on general "
        "knowledge - if the user uploaded something relevant, it should be "
        "the primary source, not a guess."
    )
    args_schema: type[BaseModel] = KnowledgeSearchInput
    user_id: str = ""

    def _run(self, query: str) -> str:
        if not self.user_id:
            return "No knowledge base is available for this run."
        return retrieve_context(self.user_id, query)


def make_knowledge_tool(user_id: str) -> KnowledgeSearchTool:
    """One fresh, correctly-scoped tool instance per run - never shared/reused across users."""
    return KnowledgeSearchTool(user_id=user_id)
