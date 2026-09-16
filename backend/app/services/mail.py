"""Transactional email. Without SMTP settings the message is logged, which is
what you want in development; point smtp_* at SES/Postmark/etc. in production."""
import logging
import smtplib
from email.message import EmailMessage

from ..config import settings

log = logging.getLogger("bookverse.mail")


def send_mail(to: str, subject: str, text: str) -> None:
    if not settings.smtp_host:
        log.warning("MAIL (not sent, no SMTP configured) to=%s subject=%s\n%s", to, subject, text)
        return
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.mail_from, to, subject
    msg.set_content(text)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)
