import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("parkshare.email")

def send_email_otp(to_email: str, otp: str) -> tuple[bool, str]:
    """
    Dispatches a real email OTP to the specified email address.
    Uses SMTP configuration from settings (.env).
    Returns (success: bool, detail_message: str)
    """
    subject = f"Your ParkShare Host Verification Code: {otp}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
        .header {{ background: #047857; padding: 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
        .content {{ padding: 32px 24px; color: #1e293b; line-height: 1.6; text-align: center; }}
        .otp-box {{ background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 16px; margin: 24px 0; }}
        .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #065f46; margin: 0; font-family: monospace; }}
        .footer {{ padding: 16px 24px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>ParkShare Host Verification</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Please use the following One-Time Password (OTP) to verify your email address for your ParkShare host account.</p>
          <div class="otp-box">
            <div class="otp-code">{otp}</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">This OTP is valid for 10 minutes. For security reasons, please do not share this code with anyone.</p>
        </div>
        <div class="footer">
          &copy; 2026 ParkShare India. All rights reserved. Peer-to-peer parking network.
        </div>
      </div>
    </body>
    </html>
    """

    # Always log clearly in the server terminal
    print(f"\n=======================================================")
    print(f"[EMAIL OTP DISPATCH] Recipient: {to_email}")
    print(f"   One-Time Password: {otp}")
    print(f"=======================================================\n")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(f"SMTP credentials not fully configured in .env. Mock dispatch logged for {to_email}.")
        return False, "SMTP credentials not configured in .env"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = to_email

        part_text = MIMEText(f"Your ParkShare verification OTP code is: {otp}. Valid for 10 minutes.", "plain")
        part_html = MIMEText(html_content, "html")
        msg.attach(part_text)
        msg.attach(part_html)

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL or settings.SMTP_USER, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Real SMTP Email dispatched successfully to {to_email}")
        return True, "Email dispatched successfully via Gmail SMTP"
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {to_email}: {e}")
        return False, f"SMTP delivery error: {str(e)}"
