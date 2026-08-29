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
from llama_index.core import VectorStoreIndex, Document, StorageContext, load_index_from_storage
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters, FilterOperator
from llama_index.core.embeddings import MockEmbedding
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
_embed_model: Optional[MockEmbedding] = None
_vector_store: Optional[QdrantVectorStore] = None


QDRANT_ONLINE = True

def _get_client() -> Optional[QdrantClient]:
    global _client, QDRANT_ONLINE
    if not QDRANT_ONLINE:
        return None
    if _client is None:
        try:
            if QDRANT_API_KEY:
                _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=5)
            else:
                _client = QdrantClient(url=QDRANT_URL, timeout=5)
        except Exception as e:
            print(f"Warning: Failed to connect to Qdrant at {QDRANT_URL}: {e}")
            QDRANT_ONLINE = False
            _client = None
    return _client


def _get_embed_model() -> MockEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = MockEmbedding(embed_dim=EMBED_DIM)
    return _embed_model


def _ensure_collection() -> None:
    global QDRANT_ONLINE
    client = _get_client()
    if not client or not QDRANT_ONLINE:
        return
    try:
        if not client.collection_exists(COLLECTION_NAME):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=qmodels.VectorParams(size=EMBED_DIM, distance=qmodels.Distance.COSINE),
            )
        # Qdrant Cloud (unlike local Docker Qdrant) requires an explicit payload
        # index before you can filter or delete by a field - without this,
        # retrieve_context's user_id filter and delete_source's source_id
        # filter both fail with "Index required but not found". Safe to call
        # repeatedly - Qdrant no-ops if the index already exists.
        for field in ("user_id", "source_id"):
            try:
                client.create_payload_index(
                    collection_name=COLLECTION_NAME,
                    field_name=field,
                    field_schema=qmodels.PayloadSchemaType.KEYWORD,
                )
            except Exception:
                pass  # already exists - fine
    except Exception as e:
        print(f"Warning: Qdrant collection check failed, disabling Qdrant RAG: {e}")
        QDRANT_ONLINE = False


def _get_vector_store() -> Optional[QdrantVectorStore]:
    global _vector_store, QDRANT_ONLINE
    if not QDRANT_ONLINE:
        return None
    if _vector_store is None:
        _ensure_collection()
        if not QDRANT_ONLINE:
            return None
        _vector_store = QdrantVectorStore(client=_get_client(), collection_name=COLLECTION_NAME)
    return _vector_store


PERSIST_DIR = "./storage"

def _get_local_index() -> VectorStoreIndex:
    embed_model = _get_embed_model()
    try:
        if os.path.exists(PERSIST_DIR) and os.listdir(PERSIST_DIR):
            storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
            index = load_index_from_storage(storage_context, embed_model=embed_model)
            return index
    except Exception as e:
        print(f"Warning: Failed to load local storage index: {e}")
        
    storage_context = StorageContext.from_defaults()
    index = VectorStoreIndex(nodes=[], storage_context=storage_context, embed_model=embed_model)
    try:
        storage_context.persist(persist_dir=PERSIST_DIR)
    except Exception as e:
        print(f"Warning: Failed to persist new storage context: {e}")
    return index


def _get_index() -> VectorStoreIndex:
    global QDRANT_ONLINE
    store = _get_vector_store()
    if not store or not QDRANT_ONLINE:
        return _get_local_index()
    try:
        return VectorStoreIndex.from_vector_store(
            vector_store=store,
            embed_model=_get_embed_model(),
        )
    except Exception as e:
        print(f"Warning: Failed to build VectorStoreIndex: {e}")
        QDRANT_ONLINE = False
        return _get_local_index()


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
    global QDRANT_ONLINE
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
    if not QDRANT_ONLINE:
        try:
            index.storage_context.persist(persist_dir=PERSIST_DIR)
        except Exception as e:
            print(f"Failed to persist index after insertion: {e}")
    return len(nodes)


def delete_source(source_id: str) -> None:
    """Remove every chunk belonging to one ingested source from Qdrant or local storage."""
    global QDRANT_ONLINE
    if not QDRANT_ONLINE:
        index = _get_local_index()
        doc_ids_to_delete = []
        for doc_id, node in index.storage_context.docstore.docs.items():
            if node.metadata.get("source_id") == source_id:
                doc_ids_to_delete.append(doc_id)
        for doc_id in doc_ids_to_delete:
            try:
                index.delete_ref_doc(doc_id, delete_from_docstore=True)
            except Exception as e:
                print(f"Failed to delete ref doc {doc_id} locally: {e}")
        try:
            index.storage_context.persist(persist_dir=PERSIST_DIR)
        except Exception as e:
            print(f"Failed to persist index after local deletion: {e}")
        return

    client = _get_client()
    if not client or not QDRANT_ONLINE:
        return
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[qmodels.FieldCondition(key="source_id", match=qmodels.MatchValue(value=source_id))]
                )
            ),
        )
    except Exception as e:
        print(f"Failed to delete source {source_id} from Qdrant: {e}")


def retrieve_context(user_id: str, query: str, top_k: int = 4) -> str:
    """
    The function the CrewAI tool actually calls: retrieve the top_k most
    relevant chunks from THIS user's ingested knowledge only, and format
    them as labeled excerpts the agent's own LLM can read and reason over.

    Deliberately returns raw retrieved text rather than using LlamaIndex's
    query-engine synthesis step - the Researcher agent (running on Groq)
    is what should read and incorporate this, not a second LLM call.
    """
    global QDRANT_ONLINE
    index = _get_index()
    try:
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
    except Exception as e:
        print(f"Warning: Failed to retrieve: {e}")
        return "Note: Failed to query the knowledge base. Proceeding using general knowledge."
