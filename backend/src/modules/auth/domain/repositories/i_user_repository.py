from abc import ABC, abstractmethod
from typing import Optional


class IUserRepository(ABC):

    @abstractmethod
    def find_by_id(self, user_id: int):
        pass

    @abstractmethod
    def find_by_email(self, email: str) -> Optional[dict]:
        pass
