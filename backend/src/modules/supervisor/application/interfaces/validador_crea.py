from abc import ABC, abstractmethod

class ValidadorCREA(ABC):

    @abstractmethod
    def validar(self, crea: str, nome: str) -> bool:
        pass