import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from app.ai.rag.embeddings import embeddings

load_dotenv()

_vector_store = None
_index = None

def _init_pinecone():
    global _vector_store, _index
    raw_api_key = os.getenv("PINECONE_API_KEY")
    if not raw_api_key:
        raise ValueError("PINECONE_API_KEY is missing from your environment!")

    pc = Pinecone(api_key=raw_api_key)
    index_name = "enterprise-hr-index-v2"

    if index_name not in pc.list_indexes().names():
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )

    index_info = pc.describe_index(index_name)
    index_host = index_info.host
    _index = pc.Index(name=index_name, host=index_host)
    _vector_store = PineconeVectorStore(index=_index, embedding=embeddings)
    return _vector_store, _index

def get_vector_store():
    if _vector_store is None:
        _init_pinecone()
    return _vector_store

def get_index():
    if _index is None:
        _init_pinecone()
    return _index