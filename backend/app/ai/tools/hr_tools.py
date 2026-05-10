import contextvars
from email.message import EmailMessage
import base64
import os
import smtplib
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
from app.core.security import decrypt_token, encrypt_token

current_user_var = contextvars.ContextVar("current_user")

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SYSTEM_EMAIL_ADDRESS = os.getenv("SYSTEM_EMAIL_ADDRESS")
SYSTEM_EMAIL_APP_PASSWORD = os.getenv("SYSTEM_EMAIL_APP_PASSWORD")
HR_DEPARTMENT_EMAIL = os.getenv("HR_DEPARTMENT_EMAIL")

def get_gmail_service(sender_type: str = "personal", user=None):
    creds = None

    if sender_type == "personal":
        if not user or not user.google_refresh_token:
            raise Exception(f"User {user.email} has not linked their Google account. Please connect Gmail first.")

        access_token = decrypt_token(user.google_access_token)
        refresh_token = decrypt_token(user.google_refresh_token)

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=SCOPES
        )

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

        if sender_type == "personal" and user:
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.id == user.id).first()
                db_user.google_access_token = encrypt_token(creds.token)
                db.commit()
            finally:
                db.close()

    return build('gmail', 'v1', credentials=creds)

@tool
def get_current_date() -> str:
    """Returns current system date."""
    return datetime.now().strftime("%Y-%m-%d")


@tool
def check_sql_leave_balance(employee_id: str) -> str:
    """Check PTO and sick leave balance, name, and email for a given employee ID."""
    # just security check
    user = current_user_var.get()
    if str(user.id) != employee_id and user.role not in ["hr", "admin"]:
        return "ERROR: You do not have permission to view another employee's leave balance."

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
    user = current_user_var.get()
    return retrieve_docs(query, user_role=user.role)


@tool
def apply_leave_tool(start_date: str, end_date: str, reason: str) -> str:
    """Apply leave request in the database for the logged-in user."""
    user = current_user_var.get()
    db = SessionLocal()
    try:
        locked_user = db.query(User).filter(User.id == user.id).with_for_update().first()

        if not locked_user:
            return f"User {user.full_name} not found."

        approved_leaves = db.query(Leave).filter(Leave.user_id == locked_user.id, Leave.status == 'approved').all()
        used_days = sum((l.end_date- l.start_date).days for l in approved_leaves) if approved_leaves else 0
        pto_balance = 14 - used_days

        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        requested_days = (end - start).days

        if requested_days > pto_balance:
            db.rollback()
            return f"Failed: You requested {requested_days} days, but only have {pto_balance} PTO days left."


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
def draft_and_send_email(recipient: str, subject: str, body: str, is_confirmed: bool = False) -> str:
    """Draft and send an email using the user's personal Gmail account."""
    user = current_user_var.get()

    if not user.google_refresh_token:
        return (
            "GOOGLE_AUTH_REQUIRED "
            "Tell the user: 'You need to connect your Gmail to send requests. I will prompt you to connect your account now.'"
        )

    if not is_confirmed:
        return f"\nEMAIL_DRAFT:\nTo: {recipient}\nSubject: {subject}\n\n{body}\n\nReply YES to confirm sending."

    try:
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
        return f"FAILED to send email: {str(e)}"


@tool
def submit_formal_complaint(title: str, description: str, accused_person: str, is_anonymous: bool,department: str = "General",safe_contact_email: str = "None provided") -> str:
    """
    Submits a formal complaint. Saves to database and sends notification.
    """
    user = current_user_var.get()
    db = SessionLocal()

    if not is_anonymous and not user.google_refresh_token:
        return (
            "GOOGLE_AUTH_REQUIRED "
            "Tell the user they must connect their Google account to submit a non-anonymous complaint. "
            "I will prompt you to connect your account now."
        )

    try:
        complaint_data = ComplaintCreate(
            title=title,
            description=description,
            department=department,  # Pass the department here
            priority="high",
            is_anonymous=is_anonymous
        )
        complaint = complaint_service.create_complaint(db, user_id=user.id, data=complaint_data)
        print(f"🔥 COMPLAINT SAVED TO DB: {complaint.id}")

        message = EmailMessage()

        # Set up sender info based on anonymity
        if is_anonymous:
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
        message['To'] = HR_DEPARTMENT_EMAIL
        message['Subject'] = f"{subject_prefix} Complaint Submission"


        if is_anonymous:
            message['From'] = SYSTEM_EMAIL_ADDRESS


            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(SYSTEM_EMAIL_ADDRESS, SYSTEM_EMAIL_APP_PASSWORD)
                server.send_message(message)
        else:
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            service.users().messages().send(userId="me", body={'raw': encoded_message}).execute()

        print("📧 EMAIL SENT TO HR")
        return "SUCCESS: Complaint saved to database and email sent to HR."

    except Exception as e:
        db.rollback()
        print("COMPLAINT ERROR:", e)
        return f"Failed to process complaint: {str(e)}"
    finally:
        db.close()