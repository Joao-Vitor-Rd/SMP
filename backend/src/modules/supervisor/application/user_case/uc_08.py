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

        nome_formatado = supervisor_atual.name
        if update_data.nome is not None:
            nome_limpo = update_data.nome.strip()
            if not nome_limpo:
                raise ValueError("Nome não pode ser vazio")
            nome_formatado = self.string_sem_numero_validator.formatar_string_sem_numero(nome_limpo).title()
            if not self.string_sem_numero_validator.validar_string_sem_numero(nome_formatado):
                raise ValueError("Nome deve incluir apenas letras")

        uf = supervisor_atual.uf
        if update_data.uf is not None:
            if not UFEnum.is_valid(update_data.uf):
                raise ValueError("UF inválida")
            uf = update_data.uf

        cidade_formatada = supervisor_atual.cidade
        if update_data.cidade is not None:
            cidade_limpa = update_data.cidade.strip()
            if cidade_limpa:
                cidade_formatada = self.string_sem_numero_validator.formatar_string_sem_numero(cidade_limpa).title()
                if not self.string_sem_numero_validator.validar_string_sem_numero(cidade_formatada):
                    raise ValueError("Cidade deve incluir apenas letras")
            else:
                cidade_formatada = None

        empresa_ou_orgao = supervisor_atual.empresa_ou_orgao
        if update_data.empresa_ou_orgao is not None:
            empresa_ou_orgao = update_data.empresa_ou_orgao.strip() or None

        telefone = supervisor_atual.telefone
        if update_data.telefone is not None:
            telefone_limpo = update_data.telefone.strip()
            if telefone_limpo:
                if not self.telefone_validator.validar_telefone(telefone_limpo):
                    raise ValueError("Telefone inválido")
                telefone = self.telefone_validator.formatar_telefone(telefone_limpo)
            else:
                telefone = None

        supervisor_atual.name = nome_formatado
        supervisor_atual.uf = uf
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