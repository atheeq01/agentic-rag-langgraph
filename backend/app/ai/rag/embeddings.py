from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings

google_api_key = settings.GOOGLE_API_KEY

if not google_api_key:
    raise ValueError("GOOGLE_API_KEY is missing from environment variables.")


embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")