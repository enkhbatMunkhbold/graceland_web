import os
import smtplib
from email.message import EmailMessage


def send_password_reset_code(recipient, code):
    host = os.environ.get('SMTP_HOST', '').strip()
    port = int(os.environ.get('SMTP_PORT', '587'))
    username = os.environ.get('SMTP_USERNAME', '').strip()
    password = os.environ.get('SMTP_PASSWORD', '')
    sender = os.environ.get('SMTP_FROM_EMAIL', username).strip()
    if not host or not sender:
        raise RuntimeError('Email delivery is not configured')

    message = EmailMessage()
    message['Subject'] = 'Graceland password recovery code'
    message['From'] = sender
    message['To'] = recipient
    message.set_content(
        'Your Graceland password recovery code is: {}\n\n'
        'This code expires in 10 minutes. If you did not request it, ignore this email.'.format(code)
    )

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        if username and password:
            server.login(username, password)
        server.send_message(message)
