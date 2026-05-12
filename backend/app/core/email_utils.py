import smtplib
from email.message import EmailMessage
import os

def send_system_notification(recipient: str, subject: str, html_content: str):
    """Sends a professional system email via SMTP."""
    msg = EmailMessage()
    msg.set_content("Please use an HTML-capable email client to view this message.")
    msg.add_alternative(html_content, subtype='html')
    msg['Subject'] = subject
    msg['To'] = recipient
    msg['From'] = os.getenv("SYSTEM_EMAIL_ADDRESS")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(os.getenv("SYSTEM_EMAIL_ADDRESS"), os.getenv("SYSTEM_EMAIL_APP_PASSWORD"))
        server.send_message(msg)


TEMPLATES = {
    "NEW_COMPLAINT": """
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #e11d48;">New Grievance Filed</h2>
            <p><strong>Department:</strong> {dept}</p>
            <p><strong>Priority:</strong> {priority}</p>
            <hr/>
            <p><strong>Subject:</strong> {title}</p>
            <p>{description}</p>
            <hr/>
            <p style="font-size: 12px; color: #666;">Submitted by: {reporter}</p>
        </div>
    """,
    "LEAVE_DECISION": """
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: {color};">Leave Request {status}</h2>
            <p>Your leave request for <strong>{start} to {end}</strong> has been {status}.</p>
            <p><strong>Decision by:</strong> {manager}</p>
            <p style="font-style: italic; color: #666;">" {note} "</p>
        </div>
    """
}