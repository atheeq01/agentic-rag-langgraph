import base64
import smtplib
import uuid as _uuid_mod
from datetime import datetime, date
from email.message import EmailMessage
import zoneinfo

def _get_today(user_timezone: str = "Asia/Colombo") -> date:
    """Return today's date in the user's local timezone."""
    tz = zoneinfo.ZoneInfo(user_timezone)
    return datetime.now(tz).date()


def _fetch_google_tokens(user_id: str) -> tuple[str | None, str | None]:
    """
    Re-fetch Google tokens from the DB on every call so tools work correctly
    even when the user connects Google after the graph was first compiled for
    their session (graph cache captures stale closure values otherwise).
    Returns (access_token_enc, refresh_token_enc).
    """
    from app.db.session import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == _uuid_mod.UUID(user_id)).first()
        if u:
            return u.google_access_token, u.google_refresh_token
        return None, None
    finally:
        db.close()

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from langchain_core.tools import tool

from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.leave import Leave
from app.schemas.complaint import ComplaintCreate
from app.schemas.leave import LeaveCreate
from app.services import complaint_service, leave_service
from app.ai.rag.retriever import retrieve_docs
 
# Config
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
SYSTEM_EMAIL_ADDRESS = settings.SYSTEM_EMAIL_ADDRESS
SYSTEM_EMAIL_APP_PASSWORD = settings.SYSTEM_EMAIL_APP_PASSWORD.get_secret_value()
HR_DEPARTMENT_EMAIL = settings.HR_DEPARTMENT_EMAIL

 
# Gmail helper  (personal only – system SMTP is inline where needed) 
def get_gmail_service(user_id: str, access_token_enc: str | None, refresh_token_enc: str):
    """
    Build and return an authenticated Gmail API service.
    Accepts plain string scalars so it is safe to call from tool closures
    where the original ORM session may already be closed.
    Refreshes the access token when expired and persists the new token.
    """
    creds = Credentials(
        token=decrypt_token(access_token_enc) if access_token_enc else None,
        refresh_token=decrypt_token(refresh_token_enc),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        import uuid
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
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
    IMPORTANT: We snapshot all ORM attributes into plain Python primitives HERE,
    while the FastAPI request session is still alive. Closures capture these
    primitives — never the ORM object — to avoid DetachedInstanceError when
    LangGraph calls the tools after the request session has closed.
    """
    # ── Snapshot user attributes as plain Python scalars ──────────────────
    # Google tokens are NOT snapshotted here — _fetch_google_tokens() reads
    # them fresh from the DB on each tool call so that tokens acquired after
    # this graph was compiled (e.g. after the Google OAuth connect flow) are
    # immediately visible without requiring a cache eviction.
    user_id        = str(user.id)
    user_role      = str(user.role)
    user_email     = str(user.email)
    user_full_name = str(user.full_name or "")
    # ──────────────────────────────────────────────────────────────────────

  #  Individual tool implementations (closures over plain scalars)         

    @tool
    def get_current_date() -> str:
        """Returns the current date in Asia/Colombo timezone (YYYY-MM-DD)."""
        import zoneinfo
        tz = zoneinfo.ZoneInfo("Asia/Colombo")
        return datetime.now(tz).strftime("%Y-%m-%d")

    @tool
    def check_sql_leave_balance(employee_id: str = "") -> str:
        """Check annual leave and sick leave balance, name, and email for a given employee ID. Leave empty to check your own balance."""
        employee_id = employee_id.strip(' "\'') if employee_id else user_id

        if user_id != employee_id and user_role not in ("hr", "admin"):
            return "ERROR: You do not have permission to view another employee's leave balance."

        import uuid
        try:
            uuid_obj = uuid.UUID(employee_id)
        except ValueError:
            return "ERROR: Invalid Employee ID format. Please strictly use the Employee ID from the System Context."

        db = SessionLocal()
        try:
            emp = db.query(User).filter(User.id == uuid_obj).first()
            if not emp:
                print(f"[LeaveBalance] No user found for ID: {uuid_obj}")
                return f"Employee {employee_id} not found."
            pending_leaves = db.query(Leave).filter(
                Leave.user_id == emp.id,
                Leave.status == "pending"
            ).all()

            annual_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "annual")
            sick_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "sick")
            maternity_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "maternity")
            paternity_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "paternity")
            bereavement_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "bereavement")
            unpaid_pending = sum((l.end_date - l.start_date).days + 1 for l in pending_leaves if l.leave_type.lower() == "unpaid family")

            return (
                f"Employee: {emp.full_name} ({emp.email})\n"
                f"Annual Leave Balance: {emp.annual_leave_balance - annual_pending} days\n"
                f"Sick Leave Balance: {emp.sick_leave_balance - sick_pending} days\n"
                f"Maternity Leave Balance: {emp.maternity_leave_balance - maternity_pending} days\n"
                f"Paternity Leave Balance: {emp.paternity_leave_balance - paternity_pending} days\n"
                f"Bereavement Leave Balance: {emp.bereavement_leave_balance - bereavement_pending} days\n"
                f"Unpaid Family Leave Balance: {emp.unpaid_leave_balance - unpaid_pending} days\n"
            )
        finally:
            db.close()

    @tool
    def hr_vector_search(query: str) -> str:
        """Search HR policy documents using semantic vector search."""
        return retrieve_docs(query, user_role=user_role)

    @tool
    def apply_leave_tool(
            start_date: str, end_date: str, leave_type: str, reason: str,
            recipient: str = "", subject: str = "", body: str = "", send_email: bool = False
    ) -> str:
        """Apply a leave request in the database. If send_email is True, sends an email and commits database atomically."""
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

        l_type_lower = leave_type.lower()
        if "annual" in l_type_lower or "pto" in l_type_lower:
            l_type = "Annual"
        elif "sick" in l_type_lower:
            l_type = "Sick"
        elif "maternity" in l_type_lower:
            l_type = "Maternity"
        elif "paternity" in l_type_lower:
            l_type = "Paternity"
        elif "bereavement" in l_type_lower:
            l_type = "Bereavement"
        elif "unpaid" in l_type_lower:
            l_type = "Unpaid Family"
        else:
            return "Failed: leave_type must be Annual, Sick, Maternity, Paternity, Bereavement, or Unpaid Family."
        
        # 14-day notice ONLY applies to annual leave strictly
        if l_type == "Annual" and (start - today).days < 14:
            return "Failed: All Annual leave requests require at least 14 days' advance notice."

        db = SessionLocal()
        try:
            # Re-fetch tokens so we see tokens acquired after this graph was compiled
            current_access, current_refresh = _fetch_google_tokens(user_id)
            if send_email and not current_refresh:
                return "Failed: GOOGLE_AUTH_REQUIRED. You must connect your Gmail to submit this request."

            leave_data = LeaveCreate(
                start_date=start_date,
                end_date=end_date,
                leave_type=l_type,
                reason=reason,
            )
            # Apply leave but do not commit yet (hold transaction)
            leave = leave_service.apply_leave(db, user_id=user_id, leave_in=leave_data, commit=False)

            if send_email:
                try:
                    service = get_gmail_service(user_id, current_access, current_refresh)
                    message = EmailMessage()
                    message.set_content(body)
                    message["To"] = recipient
                    message["Subject"] = subject

                    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                    service.users().messages().send(userId="me", body={"raw": raw}).execute()
                    print(f"[EMAIL SENT] → {recipient}")
                except Exception as e:
                    # Rollback the leave if the email fails to prevent silent orphan records
                    db.rollback()
                    print(f"[EMAIL FAILED] → {e}")
                    return f"Failed to send email ({str(e)}). Leave request was aborted. Tell the user EXACTLY what this error says."

            # Everything succeeded, commit the transaction
            db.commit()
            print(f"LEAVE SAVED: {leave.id}")
            return "Leave successfully applied and email sent." if send_email else "Leave successfully applied."

        except HTTPException as he:
            db.rollback()
            return f"Failed to apply leave: {he.detail}"
        except Exception as e:
            db.rollback()
            return f"CRITICAL SYSTEM ERROR (Do NOT summarize, tell the user exactly this): {str(e)}"
        finally:
            db.close()

    @tool
    def draft_and_send_email(
            recipient: str, subject: str, body: str, is_confirmed: bool = False
    ) -> str:
        """Draft and send an email using the user's personal Gmail account."""
        current_access, current_refresh = _fetch_google_tokens(user_id)
        if not current_refresh:
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
            service = get_gmail_service(user_id, current_access, current_refresh)
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
            contact_email: str = "",
    ) -> str:
        """
        Submits a formal complaint: sends notification email then saves to DB.
        Email is attempted first so a delivery failure never creates a silent
        orphan record in the database.
        
        OPTIONAL DETAILS:
        6. contact_email (ONLY collected if anonymous AND the user voluntarily provides one):
           - Do NOT ask the user for a contact email. Only use it if the user proactively provides one.
           - This email is completely optional and is ONLY used for follow-up questions from HR reviewers if they need more info.
           - The user can provide a personal/anonymous email address (like a dummy Gmail/Proton address) that cannot be linked to their corporate identity.
           - If the user does not provide a contact email, pass an empty string "" for the contact_email parameter.
           - CRITICAL: Do NOT block complaint submission if no contact email is provided. You MUST proceed with the anonymous submission immediately.
           - CRITICAL: If a submission fails, do NOT blame the contact_email field. Retry without changes.
        """
        current_access, current_refresh = _fetch_google_tokens(user_id)
        if not is_anonymous and not current_refresh:
            return (
                "GOOGLE_AUTH_REQUIRED "
                "Tell the user they must connect their Google account to submit "
                "a non-anonymous complaint. I will prompt you to connect your account now."
            )

        # Build email content before touching the DB
        if is_anonymous:
            sender_display = "ANONYMOUS EMPLOYEE"
            subject_prefix = "Anonymous"
            contact_info = f"Anonymous Contact Email: {contact_email}" if contact_email else "No contact email provided (fully anonymous)"
        else:
            sender_display = f"{user_full_name} (ID: {user_id}, Email: {user_email})"
            subject_prefix = "Formal"
            contact_info = f"Employee Corporate Email: {user_email}"

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
                service = get_gmail_service(user_id, current_access, current_refresh)
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
                db, user_id=user_id, data=complaint_data
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
