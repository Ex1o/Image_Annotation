import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
from typing import Optional


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email using SMTP"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("Warning: SMTP credentials not configured. Email not sent.")
        print(f"Would send email to: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content: {html_content}")
        return True  # Return True in dev mode without SMTP
    
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = to_email
        
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def get_verification_email_html(verification_link: str, user_name: str) -> str:
    """Generate HTML for verification email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 Welcome to VisionRapid!</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>Thank you for signing up! We're excited to have you on board.</p>
                <p>To complete your registration and start building computer vision models, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{verification_link}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with VisionRapid, you can safely ignore this email.</p>
                <p>Best regards,<br>The VisionRapid Team</p>
            </div>
            <div class="footer">
                <p>© 2026 VisionRapid. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


async def send_verification_email(to_email: str, user_name: str, token: str) -> bool:
    """Send verification email to user"""
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html_content = get_verification_email_html(verification_link, user_name)
    subject = f"Verify your {settings.APP_NAME} account"
    
    return await send_email(to_email, subject, html_content)
