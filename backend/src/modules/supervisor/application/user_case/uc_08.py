from src.modules.supervisor.application.dtos import SupervisorResponseDTO, UpdateSupervisorDTO
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.shared.domain.interfaces.i_string_sem_numeros_validator import IStringSemNumeroValidador
from src.shared.domain.interfaces.i_telefone_validator import ITelefoneValidator
from src.shared.enums.uf_enum import UFEnum


class AtualizarSupervisorUseCase:

    def __init__(
        self,
        repository: ISupervisorRepository,
        string_sem_numero_validator: IStringSemNumeroValidador,
        telefone_validator: ITelefoneValidator,
    ):
        self.repository = repository
        self.string_sem_numero_validator = string_sem_numero_validator
        self.telefone_validator = telefone_validator

    def execute(self, supervisor_id: int, update_data: UpdateSupervisorDTO) -> SupervisorResponseDTO:
        supervisor_atual = self.repository.find_by_id(supervisor_id)

        if supervisor_atual is None:
            raise ValueError("Supervisor não encontrado")

        nome_formatado = self.string_sem_numero_validator.formatar_string_sem_numero(update_data.nome).title()

        if not self.string_sem_numero_validator.validar_string_sem_numero(nome_formatado):
            raise ValueError("Nome deve incluir apenas letras")

        cidade_formatada = self.string_sem_numero_validator.formatar_string_sem_numero(update_data.cidade).title()

        if not self.string_sem_numero_validator.validar_string_sem_numero(cidade_formatada):
            raise ValueError("Cidade deve incluir apenas letras")

        if not UFEnum.is_valid(update_data.uf):
            raise ValueError("UF inválida")

        empresa_ou_orgao = update_data.empresa_ou_orgao.strip() if update_data.empresa_ou_orgao else None

        telefone = None
        if update_data.telefone:
            telefone = update_data.telefone.strip()
            if telefone and not self.telefone_validator.validar_telefone(telefone):
                raise ValueError("Telefone inválido")
            if telefone:
                telefone = self.telefone_validator.formatar_telefone(telefone)

        supervisor_atual.name = nome_formatado
        supervisor_atual.uf = update_data.uf
        supervisor_atual.cidade = cidade_formatada
        supervisor_atual.empresa_ou_orgao = empresa_ou_orgao
        supervisor_atual.telefone = telefone

        supervisor_salvo = self.repository.update_supervisor(supervisor_atual)

        return SupervisorResponseDTO(
            id=supervisor_salvo.id,
            nome=supervisor_salvo.name,
            email=supervisor_salvo.email,
            identificador_profissional=supervisor_salvo.idendificador_profissional,
            uf=supervisor_salvo.uf,
            cidade=supervisor_salvo.cidade,
            telefone=supervisor_salvo.telefone,
            empresa=supervisor_salvo.empresa_ou_orgao,
        )