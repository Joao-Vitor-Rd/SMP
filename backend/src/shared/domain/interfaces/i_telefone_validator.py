from abc import ABC, abstractmethod

class ITelefoneValidator(ABC):
    
    @abstractmethod
    def validar_telefone(self, telefone: str) -> bool:
        """Valida se o telefone segue o padrão brasileiro"""
        pass
    
    @abstractmethod
    def validar_celular(self, telefone: str) -> bool:
        """Valida especificamente um celular"""
        pass
    
    @abstractmethod
    def formatar_telefone(self, telefone: str) -> str:
        """Formata o telefone para o padrão brasileiro"""
        pass
