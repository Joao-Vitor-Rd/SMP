import os
import smtplib
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
        email_usuario: str
    ):
        try:
            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = int(os.getenv("SMTP_PORT", 587))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            from_email = os.getenv("FROM_EMAIL")

            # Criar mensagem
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Bem-vindo ao RoadSense IA | Seus dados de acesso"
            msg["From"] = from_email
            msg["To"] = email_usuario

            # Corpo do email em HTML
            corpo_html = f"""
            <html>
                <body>
                    <h2>Bem-vindo ao RoadSense IA!</h2>
                    <p>Olá <strong>{nome_usuario}</strong>,</p>
                    <p>Sua conta foi criada com sucesso. Aqui estão seus dados de acesso:</p>
                    <p>
                        <strong>Email:</strong> {email_usuario}<br>
                        <strong>Senha:</strong> {senha_usuario}
                    </p>
                    <p>Recomendamos que você altere sua senha no primeiro acesso.</p>
                    <p>Atenciosamente,<br>Equipe RoadSense IA</p>
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
