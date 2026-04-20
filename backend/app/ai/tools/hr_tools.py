import contextvars
from email.message import EmailMessage
import base64
import os
from datetime import datetime
from langchain_core.tools import tool
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from app.db.session import SessionLocal
from app.models.user import User
from app.models.leave import Leave
from app.schemas.leave import LeaveCreate
from app.schemas.complaint import ComplaintCreate
from app.services import leave_service, complaint_service
from app.ai.rag.retriever import retrieve_docs

current_user_var = contextvars.ContextVar("current_user")

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")


def get_gmail_service(sender_type: str = "personal", user=None):
    """
    Returns a Gmail API service depending on the sender type.
    sender_type: "personal" (from user DB tokens) or "anonymous" (from system_token.json)
    """
    creds = None

    if sender_type == "anonymous":
        token_path = 'system_token.json'
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        else:
            raise Exception("Critical Error: 'system_token.json' is missing from the server. Anonymous email failed.")

    elif sender_type == "personal":
        if not user or not user.google_refresh_token:
            raise Exception(f"User {user.email} has not authorized Gmail. Cannot send personal email.")

        creds = Credentials(
            token=user.google_access_token,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=SCOPES
        )

    # Refresh expired tokens automatically
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    return build('gmail', 'v1', credentials=creds)


@tool
def get_current_date() -> str:
    """Returns current system date."""
    return datetime.now().strftime("%Y-%m-%d")


@tool
def check_sql_leave_balance(employee_id: str) -> str:
    """Check PTO and sick leave balance, name, and email for a given employee ID."""
    db = SessionLocal()
    try:
        emp = db.query(User).filter(User.id == employee_id).first()
        if not emp:
            return f"Employee {employee_id} not found."

        approved_leaves = db.query(Leave).filter(Leave.user_id == emp.id, Leave.status == 'approved').all()
        used_days = sum((l.end_date - l.start_date).days for l in approved_leaves) if approved_leaves else 0
        pto_balance = 14 - used_days

        return f"Name: {emp.full_name}, Email: {emp.email}, ID: {employee_id}. Balance: {pto_balance} PTO, 7 sick leaves."
    finally:
        db.close()


@tool
def hr_vector_search(query: str) -> str:
    """Search HR policy documents using semantic vector search."""
    return retrieve_docs(query)


@tool
def draft_and_send_email(recipient: str, subject: str, body: str, is_confirmed: bool = False) -> str:
    """Draft and send an email using the user's personal Gmail account."""
    if not is_confirmed:
        return f"\nEMAIL_DRAFT:\nTo: {recipient}\nSubject: {subject}\n\n{body}\n\nReply YES to confirm sending."

    user = current_user_var.get()

    try:
        # ALWAYS personal for leaves/general emails
        service = get_gmail_service(sender_type="personal", user=user)

        message = EmailMessage()
        message.set_content(body)
        message['To'] = recipient
        message['Subject'] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        service.users().messages().send(userId="me", body={'raw': encoded_message}).execute()
        print(f"\n[EMAIL SENT] → {recipient}")
        return "SUCCESS: Email sent via your personal Gmail."

    except Exception as e:
        print(f"\n[EMAIL FAILED] → {e}")
        return f"FAILED: {str(e)}"


@tool
def apply_leave_tool(start_date: str, end_date: str, reason: str) -> str:
    """Apply leave request in the database for the logged-in user."""
    user = current_user_var.get()
    db = SessionLocal()
    try:
        leave_data = LeaveCreate(start_date=start_date, end_date=end_date, leave_type="pto", reason=reason)
        leave = leave_service.apply_leave(db, user_id=user.id, leave_in=leave_data)
        print("🔥 LEAVE SAVED:", leave.id)
        return "Leave successfully applied."
    except Exception as e:
        db.rollback()
        return f"Failed to apply leave: {str(e)}"
    finally:
        db.close()


@tool
def submit_formal_complaint(title: str, description: str, accused_person: str, is_anonymous: bool,
                            safe_contact_email: str = "None provided") -> str:
    """
    Submits a formal complaint. Saves to database AND sends an email via Gmail API.
    Dynamically switches sender based on anonymity.
    """
    user = current_user_var.get()
    db = SessionLocal()

    try:
        # 1. Save to Database
        complaint_data = ComplaintCreate(
            title=title,
            description=description,
            priority="high",
            is_anonymous=is_anonymous
        )
        complaint = complaint_service.create_complaint(db, user_id=user.id, data=complaint_data)
        print(f"🔥 COMPLAINT SAVED TO DB: {complaint.id}")


        message = EmailMessage()

        if is_anonymous:
            service = get_gmail_service(sender_type="anonymous")
            sender_display = "ANONYMOUS EMPLOYEE"
            subject_prefix = "Anonymous"
            contact_info = f"Anonymous Contact Email: {safe_contact_email}"
        else:
            service = get_gmail_service(sender_type="personal", user=user)
            sender_display = f"{user.full_name} (ID: {user.id}, Email: {user.email})"
            subject_prefix = "Formal"
            contact_info = f"Employee Corporate Email: {user.email}"

        body = f"--- {subject_prefix} Workplace Complaint ---\n\n" \
               f"Accused Person: {accused_person}\n" \
               f"Summary: {title}\n\n" \
               f"Detailed Description:\n{description}\n\n" \
               f"Submitted by: {sender_display}\n" \
               f"{contact_info}"

        message.set_content(body)
        message['To'] = "mhdatheeq0@gmail.com"
        message['Subject'] = f"{subject_prefix} Complaint Submission"

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': encoded_message}).execute()

        print("📧 EMAIL SENT TO HR")
        return "SUCCESS: Complaint saved to database and email sent to HR."

    except Exception as e:
        db.rollback()
        print("❌ COMPLAINT ERROR:", e)
        return f"Failed to process complaint: {str(e)}"
    finally:
        db.close()