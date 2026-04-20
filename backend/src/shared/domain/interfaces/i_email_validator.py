from abc import ABC, abstractmethod

class IEmailValidator(ABC):
    @abstractmethod
    def validar_email(self, email: str) -> bool:
        pass