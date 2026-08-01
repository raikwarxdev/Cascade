"""
Vector-store plumbing for Cascade's Researcher agent.

Ingestion pipeline: raw text or a URL -> chunked into LlamaIndex nodes ->
embedded with a local FastEmbed model (BAAI/bge-small-en-v1.5, ONNX-based -
no torch, no GPU, no external API key) -> written into a single shared
Qdrant collection, tagged with the owning user's email in each point's
payload.

Retrieval: a metadata filter on that same "user_id" field means one
person's ingested documents can never leak into another person's agent
run, even though everyone shares one Qdrant collection (the standard
Qdrant multi-tenancy pattern - one collection, payload-filtered, rather
than a collection per user).

Works against either a local Docker Qdrant (no auth) or Qdrant Cloud
(requires an API key) - set QDRANT_API_KEY only for the Cloud case.
"""
import os
from typing import Optional

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import io
from qdrant_client import QdrantClient, models as qmodels
from llama_index.core import VectorStoreIndex, Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters, FilterOperator
from llama_index.embeddings.fastembed import FastEmbedEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore

# Reachable at http://qdrant:6333 from inside Docker Compose locally, or a
# Qdrant Cloud cluster URL in production - override with QDRANT_URL either
# way. QDRANT_API_KEY is only needed for Qdrant Cloud; local Docker Qdrant
# has no auth, so leave it unset locally.
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")  # None locally, set in prod
COLLECTION_NAME = "cascade_knowledge"
EMBED_DIM = 384  # output size of BAAI/bge-small-en-v1.5

_client: Optional[QdrantClient] = None
_embed_model: Optional[FastEmbedEmbedding] = None
_vector_store: Optional[QdrantVectorStore] = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        if QDRANT_API_KEY:
            _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            _client = QdrantClient(url=QDRANT_URL)
    return _client


def _get_embed_model() -> FastEmbedEmbedding:
    global _embed_model
    if _embed_model is None:
        # Downloads once (~77MB) on first use, then cached on disk.
        _embed_model = FastEmbedEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _embed_model


def _ensure_collection() -> None:
    client = _get_client()
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=qmodels.VectorParams(size=EMBED_DIM, distance=qmodels.Distance.COSINE),
        )


def _get_vector_store() -> QdrantVectorStore:
    global _vector_store
    if _vector_store is None:
        _ensure_collection()
        _vector_store = QdrantVectorStore(client=_get_client(), collection_name=COLLECTION_NAME)
    return _vector_store


def _get_index() -> VectorStoreIndex:
    return VectorStoreIndex.from_vector_store(
        vector_store=_get_vector_store(),
        embed_model=_get_embed_model(),
    )


def fetch_url_text(url: str) -> str:
    """Fetch a URL and strip it down to readable body text."""
    resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (CascadeBot)"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    lines = [ln.strip() for ln in soup.get_text(separator="\n").splitlines() if ln.strip()]
    return "\n".join(lines)


def extract_pdf_text(file_bytes: bytes) -> str:
    """
    Pull plain text out of a PDF's real text layer. Works for normal
    text-based PDFs (reports, articles, exported docs). Does NOT do OCR -
    a scanned/photographed PDF with no text layer will come back empty.
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)
    return "\n\n".join(pages)


def ingest_text(user_id: str, source_id: str, source_name: str, text: str) -> int:
    """Chunk + embed + store `text`, tagged to this user and source. Returns chunk count."""
    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)
    doc = Document(
        text=text,
        metadata={"user_id": user_id, "source_id": source_id, "source_name": source_name},
    )
    nodes = splitter.get_nodes_from_documents([doc])
    if not nodes:
        return 0
    index = _get_index()
    index.insert_nodes(nodes)
    return len(nodes)


def delete_source(source_id: str) -> None:
    """Remove every chunk belonging to one ingested source from Qdrant."""
    client = _get_client()
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="source_id", match=qmodels.MatchValue(value=source_id))]
            )
        ),
    )


def retrieve_context(user_id: str, query: str, top_k: int = 4) -> str:
    """
    The function the CrewAI tool actually calls: retrieve the top_k most
    relevant chunks from THIS user's ingested knowledge only, and format
    them as labeled excerpts the agent's own LLM can read and reason over.

    Deliberately returns raw retrieved text rather than using LlamaIndex's
    query-engine synthesis step - the Researcher agent (running on Groq)
    is what should read and incorporate this, not a second LLM call.
    """
    index = _get_index()
    filters = MetadataFilters(
        filters=[MetadataFilter(key="user_id", value=user_id, operator=FilterOperator.EQ)]
    )
    retriever = index.as_retriever(similarity_top_k=top_k, filters=filters)
    nodes = retriever.retrieve(query)

    if not nodes:
        return "No relevant documents found in the knowledge base for this query."

    chunks = []
    for i, n in enumerate(nodes, start=1):
        source = n.node.metadata.get("source_name", "unknown source")
        score = round(n.score, 3) if n.score is not None else "n/a"
        chunks.append(f"[{i}] (source: {source}, relevance: {score})\n{n.node.get_content()}")
    return "\n\n---\n\n".join(chunks)
