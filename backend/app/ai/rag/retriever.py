import traceback
from app.ai.rag.vector_store import get_vector_store


def retrieve_docs(query: str, user_role: str, k: int = 3) -> str:
    """
    Searches the Pinecone vector database for relevant HR policy documents.

    Args:
        query (str): The semantic search query from the agent.
        k (int): The number of documents to retrieve.

    Returns:
        str: A formatted string of the retrieved document chunks.
        :param k:
        :param query:
        :param user_role:
    """
    try:
        print(f"[Retriever] Searching for: '{query}' (k={k}, role={user_role})")

        search_kwargs = {"k": k}
        if user_role not in ["admin", "hr"]:
            search_kwargs["filter"] = {"allowed_roles": {"$in": [user_role, "all"]}}

        # Perform similarity search using the vector store
        docs = get_vector_store().similarity_search(query, k=k)

        if not docs:
            print("[Retriever] No documents found.")
            return "No relevant HR policies found for your query."

        # Format the retrieved documents into a single string for the LLM
        formatted_results = "\n\n".join([
            f"--- Document Chunk {i + 1} ---\n{doc.page_content}"
            for i, doc in enumerate(docs)
        ])

        print(f"[Retriever] Found {len(docs)} document(s).")
        return formatted_results

    except Exception as e:
        # Print the FULL traceback so we can debug
        print(f"[Retriever Error] Failed to retrieve docs: {e}")
        traceback.print_exc()
        return f"Error searching HR knowledge base: {str(e)}. Please try rephrasing your question."