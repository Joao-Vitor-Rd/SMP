from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

class INotificacaoService(ABC):
    @abstractmethod
    def enviar_notificacao(
        self, 
        senha_usuario: str, 
        nome_usuario: str,
        email_usuario: str,
        is_tecnico: bool,
        limite_acesso: Optional[datetime] = None
    ):
        pass