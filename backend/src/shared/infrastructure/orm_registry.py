"""Registro das entidades ORM para scripts isolados (worker, seeds)."""

from src.shared.domain.entities.user import UserORM  # noqa: F401
from src.modules.supervisor.domain.entities.supervisor import SupervisorORM  # noqa: F401
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM  # noqa: F401
from src.modules.auth.domain.entities.password_reset_token import PasswordResetTokenORM  # noqa: F401
from src.modules.trechos.domain.entities.trecho import TrechoORM  # noqa: F401
from src.modules.trechos.domain.entities.laudo import LaudoORM  # noqa: F401
from src.modules.fotos.domain.entities.fotos import fotosORM  # noqa: F401
from src.modules.analise.domain.entities.deteccao import DeteccaoORM  # noqa: F401
