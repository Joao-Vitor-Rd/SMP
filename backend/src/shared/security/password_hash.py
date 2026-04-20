from abc import ABC, abstractmethod

class PassWordHasher(ABC):

    @abstractmethod
    def hash(self, senha: str) -> str:
        pass

    @abstractmethod
    def verify(self, senha: str, senha_hash: str) -> bool:
        pass