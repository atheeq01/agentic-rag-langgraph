import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from app.ai.rag.embeddings import embeddings

load_dotenv()

raw_api_key = os.getenv("PINECONE_API_KEY")

if not raw_api_key:
    raise ValueError("PINECONE_API_KEY is missing from your .env file!")

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

# Get the host explicitly for more reliable connections
index_info = pc.describe_index(index_name)
index_host = index_info.host
print(f"[Pinecone] Index host: {index_host}")

index = pc.Index(name=index_name, host=index_host)
vector_store = PineconeVectorStore(index=index, embedding=embeddings)

print(f"Successfully connected to Pinecone index: {index_name}")