from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional


class IPasswordResetTokenRepository(ABC):
    @abstractmethod
    def create_token(self, user_id: int, token_hash: str, expires_at: datetime):
        pass

    @abstractmethod
    def find_active_by_hash(self, token_hash: str):
        pass

    @abstractmethod
    def deactivate_active_tokens_for_user(self, user_id: int) -> None:
        pass

    @abstractmethod
    def mark_as_used(self, token_id: int, used_at: Optional[datetime] = None) -> None:
        pass