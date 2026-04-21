from abc import ABC, abstractmethod

class IEmailUnicoValidator(ABC):
    
    @abstractmethod
    def validar_email_unico(self, email: str) -> bool:
        pass
