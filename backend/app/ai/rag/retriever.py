import traceback

from app.ai.rag.vector_store import get_vector_store


def retrieve_docs(query: str, user_role: str, k: int = 3) -> str:
    """
    Search the Pinecone vector database for relevant HR policy documents.

    Args:
        query:     The semantic search query from the agent.
        user_role: The role of the requesting user.  Used to filter docs
                   so employees only see documents they are allowed to view.
        k:         Number of documents to retrieve (default 3).

    Returns:
        A formatted string of retrieved document chunks, or an error message.
    """
    try:
        print(f"[Retriever] Searching for: '{query}' (k={k}, role={user_role})")

        # Build kwargs dict – this is now actually passed to the search call.
        search_kwargs: dict = {"k": k}

        # Admins and HR see everything; everyone else is filtered.
        if user_role not in ("admin", "hr"):
            search_kwargs["filter"] = {
                "allowed_roles": {"$in": [user_role, "all"]}
            }
        
        docs = get_vector_store().similarity_search(
            query, **search_kwargs
        )

        if not docs:
            print("[Retriever] No documents found.")
            return "No relevant HR policies found for your query."

        formatted = "\n\n".join(
            f"--- Document Chunk {i + 1} ---\n{doc.page_content}"
            for i, doc in enumerate(docs)
        )

        print(f"[Retriever] Found {len(docs)} document(s).")
        return formatted

    except Exception as e:
        print(f"[Retriever Error] Failed to retrieve docs: {e}")
        traceback.print_exc()
        return (
            f"Error searching HR knowledge base: {str(e)}. "
            "Please try rephrasing your question."
        )
