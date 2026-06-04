import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv


load_dotenv()


class PasswordResetEmailService:
    def enviar_link_redefinicao(self, nome_usuario: str, email_usuario: str, link_redefinicao: str) -> None:
        smtp_server = os.getenv("SMTP_SERVER")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("FROM_EMAIL")

        if not all([smtp_server, smtp_user, smtp_password, from_email]):
            raise ValueError("Configuração de e-mail não encontrada")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "RoadSense AI | Redefinição de senha"
        msg["From"] = from_email
        msg["To"] = email_usuario

        corpo_html = f"""
        <html>
            <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
                <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
                    <div style="background:#ffffff; border-radius:24px; box-shadow:0 10px 30px rgba(15, 23, 42, 0.08); overflow:hidden; border:1px solid #e5e7eb;">
                        <div style="padding:18px 28px; color:#9ca3af; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">
                            Recuperação de senha
                        </div>
                        <div style="padding:28px;">
                            <p style="margin:0 0 18px 0; font-size:18px; line-height:1.4; color:#374151;">
                                Olá, <strong>{nome_usuario}.</strong>
                            </p>
                            <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#374151;">
                                Recebemos uma solicitação para redefinir sua senha no sistema <strong>RoadSense AI</strong>.
                            </p>
                            <div style="margin:0 0 18px 0; padding:18px; border-radius:12px; border:1px solid #dbeafe; background:#f8fbff; font-size:14px; line-height:1.7; color:#374151;">
                                <div><strong>Link de redefinição:</strong> <a href="{link_redefinicao}" style="color:#1d4ed8; text-decoration:none;">{link_redefinicao}</a></div>
                                <div><strong>Validade:</strong> 2 horas após a solicitação.</div>
                            </div>
                            <p style="margin:0; font-size:12px; color:#6b7280; font-style:italic;">
                                Se você não solicitou essa alteração, ignore esta mensagem.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """

        msg.attach(MIMEText(corpo_html, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)