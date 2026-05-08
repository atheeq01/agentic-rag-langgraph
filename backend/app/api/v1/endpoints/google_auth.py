import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from uuid import UUID
from sqlalchemy.orm import Session
import httpx
from urllib.parse import urlencode
from fastapi.responses import HTMLResponse

from app.db.session import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.security import encrypt_token

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

SCOPES = "https://www.googleapis.com/auth/gmail.send"


@router.get("/login")
def google_login(current_user: User = Depends(get_current_user)):
    """Returns the Google Auth URL as JSON for the React app to navigate to."""
    state = str(current_user.id)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "select_account",
        "include_granted_scopes": "true",
        "state": state
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Receives the code from Google, saves tokens, and REDIRECTS back to React."""
    try:
        user_id = UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state format")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)
        token_data = response.json()

    if "error" in token_data:
        raise HTTPException(status_code=400, detail=f"Google OAuth Error: {token_data.get('error_description')}")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    user.google_access_token = encrypt_token(access_token)
    if refresh_token:
        user.google_refresh_token = encrypt_token(refresh_token)

    db.commit()

    # FIX: Return a self-closing HTML page instead of a RedirectResponse
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authorization Successful</title>
        <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h2 { color: #10b981; margin-bottom: 10px; }
            p { color: #64748b; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>✅ Account Connected!</h2>
            <p>Your Gmail has been successfully linked.</p>
            <p>This window will close automatically. You can return to your chat.</p>
        </div>
        <script>
            // Notify parent window of success
            if (window.opener) {
                window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS" }, "*");
            }
            // Attempt to auto-close the tab after 2.5 seconds
            setTimeout(() => {
                window.close();
            }, 2500);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
