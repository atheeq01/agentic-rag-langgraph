import smtplib
import logging
from email.message import EmailMessage

from app.core.config import settings


def send_system_notification(recipient: str, subject: str, html_content: str):
    """Sends a responsive, professional HTML system email via secure SMTP."""
    msg = EmailMessage()
    msg.set_content("Please use an HTML-capable email client to view this message.")
    msg.add_alternative(html_content, subtype='html')
    msg['Subject'] = subject
    msg['To'] = recipient
    msg['From'] = settings.SYSTEM_EMAIL_ADDRESS

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(
                settings.SYSTEM_EMAIL_ADDRESS,
                settings.SYSTEM_EMAIL_APP_PASSWORD.get_secret_value()
            )
            server.send_message(msg)
            logging.info(f"System notification delivered successfully to {recipient}")
    except smtplib.SMTPException as e:
        logging.error(f"Failed to transmit email notification to {recipient}: {str(e)}")


TEMPLATES = {
    "NEW_COMPLAINT": """
    <div style="background-color: #f9fafb; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <tr>
                <td style="background-color: #111827; padding: 24px; text-align: left;">
                    <span style="color: #ef4444; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Internal Grievance System</span>
                    <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em;">New Incident Report Filed</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                        <tr>
                            <td style="padding: 10px 14px; background-color: #f3f4f6; border-radius: 6px; width: 48%;">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Target Department</div>
                                <div style="font-size: 14px; color: #1f2937; font-weight: 600; margin-top: 2px;">{dept}</div>
                            </td>
                            <td width="4%"></td>
                            <td style="padding: 10px 14px; background-color: #fef2f2; border-radius: 6px; width: 48%;">
                                <div style="font-size: 11px; color: #991b1b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Priority Designation</div>
                                <div style="font-size: 14px; color: #b91c1c; font-weight: 600; margin-top: 2px;">{priority}</div>
                            </td>
                        </tr>
                    </table>

                    <h2 style="font-size: 16px; color: #111827; margin: 0 0 8px 0; font-weight: 600;">Subject: {title}</h2>
                    <div style="font-size: 14px; color: #4b5563; line-height: 1.6; background-color: #f9fafb; padding: 16px; border-left: 4px solid #e5e7eb; border-radius: 4px; margin-bottom: 24px; white-space: pre-line;">{description}</div>

                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                                <strong>Filing Attribution:</strong> {reporter}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    This is an automated notification from your secure HR infrastructure. Do not reply directly to this message.
                </td>
            </tr>
        </table>
    </div>
    """,

    "LEAVE_DECISION": """
    <div style="background-color: #f9fafb; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <tr>
                <td style="background-color: {color}; padding: 24px; text-align: left;">
                    <span style="color: #ffffff; opacity: 0.85; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Time Off Management Portal</span>
                    <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em;">Leave Request Update: {status}</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 24px;">
                    <p style="font-size: 14px; color: #374151; line-height: 1.5; margin: 0 0 20px 0;">
                        Your formal request for absence has been processed with the parameters detailed below:
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <tr>
                            <td style="padding: 14px;">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Approved Leave Windows</div>
                                <div style="font-size: 15px; color: #111827; font-weight: 600; margin-top: 4px;">{start} &mdash; {end}</div>
                            </td>
                        </tr>
                    </table>

                    <div style="font-size: 14px; color: #4b5563; line-height: 1.6; border-left: 4px solid {color}; padding-left: 16px; margin-bottom: 8px;">
                        <strong style="color: #111827;">Reviewer Remarks & Notes:</strong>
                        <div style="font-style: italic; margin-top: 4px; color: #374151;">"{note}"</div>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

                    <p style="font-size: 12px; color: #6b7280; margin: 0;">
                        <strong>Reviewing Manager:</strong> {manager}
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    This communication constitutes official operational record. Access details via your employee dashboard.
                </td>
            </tr>
        </table>
    </div>
    """
}