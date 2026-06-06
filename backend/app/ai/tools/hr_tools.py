import base64
import smtplib
from datetime import datetime, date
from email.message import EmailMessage
import zoneinfo

def _get_today(user_timezone: str = "Asia/Colombo") -> date:
    """Return today's date in the user's local timezone."""
    tz = zoneinfo.ZoneInfo(user_timezone)
    return datetime.now(tz).date()

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from langchain_core.tools import tool

from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.complaint import ComplaintCreate
from app.schemas.leave import LeaveCreate
from app.services import complaint_service, leave_service
from app.ai.rag.retriever import retrieve_docs
 
# Config
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
SYSTEM_EMAIL_ADDRESS = settings.SYSTEM_EMAIL_ADDRESS
SYSTEM_EMAIL_APP_PASSWORD = settings.SYSTEM_EMAIL_APP_PASSWORD
HR_DEPARTMENT_EMAIL = settings.HR_DEPARTMENT_EMAIL

 
# Gmail helper  (personal only – system SMTP is inline where needed) 
def get_gmail_service(user):
    """
    Build and return an authenticated Gmail API service for *user*.
    Refreshes the access token when expired and persists the new token.
    Raises if the user has not linked their Google account.
    """
    if not user or not user.google_refresh_token:
        raise Exception(
            f"User {user.email} has not linked their Google account. "
            "Please connect Gmail first."
        )

    creds = Credentials(
        token=decrypt_token(user.google_access_token),
        refresh_token=decrypt_token(user.google_refresh_token),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == user.id).first()
            if db_user:
                db_user.google_access_token = encrypt_token(creds.token)
                db.commit()
        finally:
            db.close()

    return build("gmail", "v1", credentials=creds)

 
# Tool factory 
def make_tools_for_user(user):
    """
    Return a dict of bound LangChain tools scoped to *user*.

    Usage in graph.py:
        tools = make_tools_for_user(user)
        leave_llm = base_llm.bind_tools(list(tools["leave"].values()))

    Each call produces fresh closures so concurrent requests never share state.
    """

  #  Individual tool implementations (closures over `user`)                

    @tool
    def get_current_date() -> str:
        """Returns the current system date (YYYY-MM-DD)."""
        return datetime.now().strftime("%Y-%m-%d")

    @tool
    def check_sql_leave_balance(employee_id: str) -> str:
        """Check annual leave and sick leave balance, name, and email for a given employee ID."""
        if str(user.id) != employee_id and user.role not in ("hr", "admin"):
            return "ERROR: You do not have permission to view another employee's leave balance."

        import uuid
        try:
            uuid_obj = uuid.UUID(employee_id)
        except ValueError:
            return "ERROR: Invalid Employee ID format. Please strictly use the Employee ID from the System Context."

        db = SessionLocal()
        try:
            emp = db.query(User).filter(User.id == employee_id).first()
            if not emp:
                return f"Employee {employee_id} not found."
            return (
                f"Name: {emp.full_name}, Email: {emp.email}, ID: {employee_id}. "
                f"Balance: {emp.annual_leave_balance} Annual Leave, "
                f"{emp.sick_leave_balance} Sick Leave."
            )
        finally:
            db.close()

    @tool
    def hr_vector_search(query: str) -> str:
        """Search HR policy documents using semantic vector search."""
        return retrieve_docs(query, user_role=user.role)

    @tool
    def apply_leave_tool(
            start_date: str, end_date: str, leave_type: str, reason: str
    ) -> str:
        """Apply a leave request in the database. leave_type MUST be 'annual' or 'sick'."""
        try:
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
            today = _get_today()
        except ValueError:
            return "Failed: Invalid date format. Please use YYYY-MM-DD."

        if end < start:
            return "Failed: end_date cannot be earlier than start_date."
        
        l_type_check = leave_type.lower()
        is_sick = "sick" in l_type_check

        if not is_sick and start < today:
            return "Failed: start_date cannot be in the past."

        # Sick leave: allow today and yesterday (already sick)
        if is_sick and start < today:
            if (today - start).days > 1:
                return "Failed: Sick leave start date cannot be more than 1 day in the past."

        duration = (end - start).days + 1

        # 14-day notice ONLY applies to annual leave, never sick leave
        if not is_sick and duration > 3 and (start - today).days < 14:
            return "Failed: Annual leave longer than 3 days requires 14 days' advance notice."

        db = SessionLocal()
        try:
            l_type = leave_type.lower()
            if "annual" in l_type or "pto" in l_type:
                l_type = "annual"
            elif "sick" in l_type:
                l_type = "sick"
            else:
                return "Failed: leave_type must be either 'annual' or 'sick'."

            leave_data = LeaveCreate(
                start_date=start_date,
                end_date=end_date,
                leave_type=l_type,
                reason=reason,
            )
            leave = leave_service.apply_leave(db, user_id=user.id, leave_in=leave_data)
            print(f"LEAVE SAVED: {leave.id}")
            return "Leave successfully applied."

        except HTTPException as he:
            db.rollback()
            return f"Failed to apply leave: {he.detail}"
        except Exception as e:
            db.rollback()
            return f"Failed to apply leave due to system error: {str(e)}"
        finally:
            db.close()

    @tool
    def draft_and_send_email(
            recipient: str, subject: str, body: str, is_confirmed: bool = False
    ) -> str:
        """Draft and send an email using the user's personal Gmail account."""
        if not user.google_refresh_token:
            return (
                "GOOGLE_AUTH_REQUIRED "
                "Tell the user: 'You need to connect your Gmail to send requests. "
                "I will prompt you to connect your account now.'"
            )

        if not is_confirmed:
            return (
                f"\nEMAIL_DRAFT:\nTo: {recipient}\nSubject: {subject}\n\n{body}\n\n"
                "Reply YES to confirm sending."
            )

        try:
            service = get_gmail_service(user)
            message = EmailMessage()
            message.set_content(body)
            message["To"] = recipient
            message["Subject"] = subject

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            service.users().messages().send(userId="me", body={"raw": raw}).execute()
            print(f"[EMAIL SENT] → {recipient}")
            return "SUCCESS: Email sent via your personal Gmail."
        except Exception as e:
            print(f"[EMAIL FAILED] → {e}")
            return f"FAILED to send email: {str(e)}"

    @tool
    def submit_formal_complaint(
            title: str,
            description: str,
            accused_person: str,
            is_anonymous: bool,
            department: str = "General",
            safe_contact_email: str = "None provided",
    ) -> str:
        """
        Submits a formal complaint: sends notification email then saves to DB.
        Email is attempted first so a delivery failure never creates a silent
        orphan record in the database.
        """
        if not is_anonymous and not user.google_refresh_token:
            return (
                "GOOGLE_AUTH_REQUIRED "
                "Tell the user they must connect their Google account to submit "
                "a non-anonymous complaint. I will prompt you to connect your account now."
            )

        # Build email content before touching the DB
        if is_anonymous:
            sender_display = "ANONYMOUS EMPLOYEE"
            subject_prefix = "Anonymous"
            contact_info = f"Anonymous Contact Email: {safe_contact_email}"
        else:
            sender_display = f"{user.full_name} (ID: {user.id}, Email: {user.email})"
            subject_prefix = "Formal"
            contact_info = f"Employee Corporate Email: {user.email}"

        body = (
            f"--- {subject_prefix} Workplace Complaint ---\n\n"
            f"Department: {department}\n"
            f"Accused Person: {accused_person}\n"
            f"Summary: {title}\n\n"
            f"Detailed Description:\n{description}\n\n"
            f"Submitted by: {sender_display}\n"
            f"{contact_info}"
        )

        # ── send email (fail fast before DB write) ──────────────
        try:
            if is_anonymous:
                message = EmailMessage()
                message.set_content(body)
                message["To"] = HR_DEPARTMENT_EMAIL
                message["Subject"] = f"{subject_prefix} Complaint Submission"
                message["From"] = SYSTEM_EMAIL_ADDRESS
                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                    server.login(SYSTEM_EMAIL_ADDRESS, SYSTEM_EMAIL_APP_PASSWORD)
                    server.send_message(message)
            else:
                service = get_gmail_service(user)
                message = EmailMessage()
                message.set_content(body)
                message["To"] = HR_DEPARTMENT_EMAIL
                message["Subject"] = f"{subject_prefix} Complaint Submission"
                raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                service.users().messages().send(
                    userId="me", body={"raw": raw}
                ).execute()
        except Exception as e:
            print(f"[COMPLAINT EMAIL FAILED] {e}")
            return (
                f"Failed to send complaint notification email: {str(e)}. "
                "Your complaint was NOT saved. Please retry."
            )

        # ── persist to DB only after email succeeds ─────────────
        db = SessionLocal()
        try:
            complaint_data = ComplaintCreate(
                title=title,
                description=description,
                department=department,
                priority="high",
                is_anonymous=is_anonymous,
            )
            complaint = complaint_service.create_complaint(
                db, user_id=user.id, data=complaint_data
            )
            print(f"COMPLAINT SAVED TO DB: {complaint.id}")
            print("EMAIL SENT TO HR")
            return "SUCCESS: Complaint saved to database and email sent to HR."
        except Exception as e:
            db.rollback()
            print(f"COMPLAINT DB ERROR: {e}")
            return (
                f"Email was sent to HR but the complaint could not be saved to the "
                f"database: {str(e)}. Please contact HR directly to confirm receipt."
            )
        finally:
            db.close()

  #  Return tool sets grouped by agent                                      
    all_tools = {
        "get_current_date": get_current_date,
        "check_sql_leave_balance": check_sql_leave_balance,
        "hr_vector_search": hr_vector_search,
        "apply_leave_tool": apply_leave_tool,
        "draft_and_send_email": draft_and_send_email,
        "submit_formal_complaint": submit_formal_complaint,
    }

    leave_tools = {
        k: all_tools[k]
        for k in (
            "check_sql_leave_balance",
            "apply_leave_tool",
            "draft_and_send_email",
            "get_current_date",
        )
    }
    complaint_tools = {
        k: all_tools[k] for k in ("submit_formal_complaint", "get_current_date")
    }
    hr_tools = {k: all_tools[k] for k in ("hr_vector_search", "draft_and_send_email")}
    common_tools = {
        k: all_tools[k]
        for k in ("check_sql_leave_balance", "draft_and_send_email", "get_current_date")
    }

    return {
        "all": all_tools,
        "leave": leave_tools,
        "complaint": complaint_tools,
        "hr": hr_tools,
        "common": common_tools,
    }
