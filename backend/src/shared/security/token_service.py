# application/interfaces/token_service.py

from abc import ABC, abstractmethod

class TokenService(ABC):

    @abstractmethod
    def generate(self, user) -> str:
        pass

    @abstractmethod
    def decode(self, token: str) -> dict:
        pass