from datetime import datetime, timezone
from src.modules.colaborador.domain.repositories.IColaboradorRepository import IColaboradorRepository
from src.modules.colaborador.application.dtos.colaborador_dto import (
    ColaboradorResponseDTO,
    AtualizarLimiteAcessoDTO
)


class AtualizarLimiteAcessoUseCase:

    def __init__(self, repository: IColaboradorRepository):
        self.repository = repository

    def execute(self, colaborador_id: int, update_data: AtualizarLimiteAcessoDTO) -> ColaboradorResponseDTO:
        colaborador = self.repository.find_by_id(colaborador_id)

        if colaborador is None:
            raise ValueError(f"Colaborador com identificador {colaborador_id} não encontrado")

        # Não permitir atualização de limite_acesso para técnico
        if colaborador.is_tecnico:
            raise ValueError("Não é permitido definir limite de acesso para técnico")

        limite = update_data.limite_acesso

        # Validar timezone
        if limite.tzinfo is None:
            limite = limite.replace(tzinfo=timezone.utc)

        agora = datetime.now(timezone.utc)

        # Validar se a data não é no passado
        if limite < agora:
            raise ValueError("A data de acesso deve ser igual ou posterior ao momento atual.")

        # Atualizar o limite de acesso usando o método específico
        self.repository.update_limite_acesso(colaborador_id, limite)
        
        # Recuperar o colaborador atualizado
        colaborador_atualizado = self.repository.find_by_id(colaborador_id)

        return ColaboradorResponseDTO(
            id=colaborador_atualizado.id,
            nome=colaborador_atualizado.nome,
            id_profissional_responsavel=colaborador_atualizado.id_profissional_responsavel,
            is_tecnico=colaborador_atualizado.is_tecnico,
            email=colaborador_atualizado.email,
            cft=colaborador_atualizado.cft,
            uf=colaborador_atualizado.uf,
            cidade=colaborador_atualizado.cidade,
            empresa_ou_orgao=colaborador_atualizado.empresa_ou_orgao,
            telefone=colaborador_atualizado.telefone,
            instituicao_ensino=colaborador_atualizado.instituicao_ensino,
            limite_acesso=colaborador_atualizado.limite_acesso,
            acesso_liberado=colaborador_atualizado.acesso_liberado,
            status="Ativo" if colaborador_atualizado.acesso_liberado else "Inativo",
        )
