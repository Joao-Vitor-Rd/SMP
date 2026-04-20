from abc import ABC, abstractmethod

class INotificacaoService(ABC):
    @abstractmethod
    def enviar_notificacao(
        self, 
        senha_usuario: str, 
        nome_usuario: str,
        email_usuario: str
    ):
        pass