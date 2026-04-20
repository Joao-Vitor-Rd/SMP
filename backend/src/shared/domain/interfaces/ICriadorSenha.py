from abc import ABC, abstractmethod

class ICriadorSenha(ABC):
    @abstractmethod
    def gerar_senha(self) -> str:
        pass