from abc import ABC, abstractmethod

class IStringSemNumeroValidador(ABC):
    
    @abstractmethod
    def validar_string_sem_numero(self, string: str) -> bool:
        pass

    @abstractmethod
    def formatar_string_sem_numero(self, string: str) -> bool:
        pass
