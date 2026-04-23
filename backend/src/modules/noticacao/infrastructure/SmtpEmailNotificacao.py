import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from src.shared.domain.interfaces.INotificacaoService import INotificacaoService

load_dotenv()

class SmtpEmailNotificacaoService(INotificacaoService):
    def enviar_notificacao(
        self, 
        senha_usuario: str, 
        nome_usuario: str,
        email_usuario: str,
        is_tecnico: bool,
        cft: str | None = None,
        limite_acesso: datetime | None = None
    ):
        try:
            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = int(os.getenv("SMTP_PORT", 587))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            from_email = os.getenv("FROM_EMAIL")
            app_url = os.getenv("APP_URL", "http://localhost:3000")

            # Criar mensagem
            msg = MIMEMultipart("alternative")
            cargo = "Técnico" if is_tecnico else "Colaborador"
            msg["Subject"] = f"RoadSense AI | Acesso de {cargo}"
            msg["From"] = from_email
            msg["To"] = email_usuario

            acesso_msg = (
                f"Seu acesso como Técnico foi liberado e não possui data de expiração configurada."
                if is_tecnico
                else f"Seu acesso como Colaborador está configurado para expirar em: {limite_acesso.strftime('%d/%m/%Y') if limite_acesso else '__/__/____'}."
            )

            cft_msg = (
                f"<div><strong>CFT / CPF:</strong> <span style=\"font-family:Courier New, monospace;\">{cft or 'Não informado'}</span></div>"
                if is_tecnico
                else ""
            )

            status_msg = (
                "Status: Ativo."
                if is_tecnico
                else f"Status: Ativo até {limite_acesso.strftime('%d/%m/%Y') if limite_acesso else '__/__/____'}."
            )

            corpo_html = f"""
            <html>
                <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
                    <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
                        <div style="background:#ffffff; border-radius:24px; box-shadow:0 10px 30px rgba(15, 23, 42, 0.08); overflow:hidden; border:1px solid #e5e7eb;">
                            <div style="padding:18px 28px; color:#9ca3af; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">
                                Preview: Convite para {cargo.lower()}
                            </div>

                            <div style="padding:28px;">
                                <div style="text-align:left;">
                                    <p style="margin:0 0 18px 0; font-size:18px; line-height:1.4; color:#374151;">
                                        Olá, <strong>{nome_usuario}.</strong>
                                    </p>

                                    <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#374151;">
                                        Sua conta no sistema <strong>RoadSense AI</strong> foi criada com sucesso.
                                    </p>

                                    <div style="margin:0 0 18px 0; padding:18px; border-radius:12px; border:1px solid #dbeafe; background:#f8fbff; font-size:14px; line-height:1.7; color:#374151;">
                                        <div><strong>URL do sistema:</strong> <a href="{app_url}" style="color:#1d4ed8; text-decoration:none;">{app_url}</a></div>
                                        <div><strong>E-mail de acesso:</strong> <span style="font-family:Courier New, monospace;">{email_usuario}</span></div>
                                        <div><strong>Senha gerada:</strong> <span style="font-family:Courier New, monospace;">{senha_usuario}</span></div>
                                        {cft_msg}
                                        <div><strong>{status_msg}</strong></div>
                                    </div>

                                    <div style="margin:22px 0; padding:16px 18px; border-radius:12px; border:1px solid #dbeafe; background:#f8fbff; color:#355c9d; font-size:14px; line-height:1.6;">
                                        <strong>!</strong> {acesso_msg}
                                    </div>

                                    <p style="margin:0 0 22px 0; font-size:12px; color:#6b7280; font-style:italic;">
                                        Atualize seu perfil imediatamente após o primeiro login e troque a senha assim que entrar no sistema.
                                    </p>

                                    <div style="border-top:1px solid #eceff3; padding-top:18px; font-size:15px; font-weight:600; color:#374151;">
                                        Atenciosamente, Equipe RoadSense AI.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
            """

            parte_html = MIMEText(corpo_html, "html")
            msg.attach(parte_html)

            # Conectar e enviar
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
                
        except Exception as e:
            print(f"Erro ao enviar notificação para {email_usuario}: {str(e)}")
            raise
