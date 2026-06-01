from datetime import datetime

from sqlalchemy.orm import Session

from src.modules.auth.domain.entities.password_reset_token import PasswordResetTokenORM
from src.modules.auth.domain.repositories.i_password_reset_token_repository import (
    IPasswordResetTokenRepository,
)


class PasswordResetTokenRepository(IPasswordResetTokenRepository):
    def __init__(self, session: Session):
        self.session = session

    def create_token(self, user_id: int, token_hash: str, expires_at: datetime):
        token = PasswordResetTokenORM(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            used_at=None,
        )
        self.session.add(token)
        self.session.commit()
        self.session.refresh(token)
        return token

    def find_active_by_hash(self, token_hash: str):
        now = datetime.utcnow()
        return (
            self.session.query(PasswordResetTokenORM)
            .filter(
                PasswordResetTokenORM.token_hash == token_hash,
                PasswordResetTokenORM.used_at.is_(None),
                PasswordResetTokenORM.expires_at > now,
            )
            .first()
        )

    def deactivate_active_tokens_for_user(self, user_id: int) -> None:
        now = datetime.utcnow()
        tokens = (
            self.session.query(PasswordResetTokenORM)
            .filter(
                PasswordResetTokenORM.user_id == user_id,
                PasswordResetTokenORM.used_at.is_(None),
                PasswordResetTokenORM.expires_at > now,
            )
            .all()
        )

        for token in tokens:
            token.used_at = now

        if tokens:
            self.session.commit()

    def mark_as_used(self, token_id: int, used_at: datetime | None = None) -> None:
        token = (
            self.session.query(PasswordResetTokenORM)
            .filter(PasswordResetTokenORM.id == token_id)
            .first()
        )

        if token:
            token.used_at = used_at or datetime.utcnow()
            self.session.commit()