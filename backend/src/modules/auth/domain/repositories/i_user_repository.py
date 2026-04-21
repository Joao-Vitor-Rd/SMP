from abc import ABC, abstractmethod
from typing import Optional


class IUserRepository(ABC):

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[dict]:
        pass
