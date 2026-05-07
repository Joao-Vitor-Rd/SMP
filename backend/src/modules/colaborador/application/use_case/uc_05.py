import re

from src.modules.colaborador.application.dtos.colaborador_dto import UpdateColaboradorDTO, ColaboradorResponseDTO
from src.modules.colaborador.domain.entities.colaborador import Colaborador
from src.modules.colaborador.domain.repositories.IColaboradorRepository import IColaboradorRepository
from src.shared.domain.interfaces.i_string_sem_numeros_validator import IStringSemNumeroValidador
from src.shared.domain.interfaces.i_telefone_validator import ITelefoneValidator
from src.shared.enums.uf_enum import UFEnum


class AtualizarColaboradorUseCase:

    def __init__(
        self,
        repository: IColaboradorRepository,
        string_sem_numero_validator: IStringSemNumeroValidador,
        telefone_validator: ITelefoneValidator,
    ):
        self.repository = repository
        self.string_sem_numero_validator = string_sem_numero_validator
        self.telefone_validator = telefone_validator

    def execute(self, colaborador_id: int, update_data: UpdateColaboradorDTO) -> ColaboradorResponseDTO:
        colaborador_atual = self.repository.find_by_id(colaborador_id)

        if colaborador_atual is None:
            raise ValueError("Colaborador não encontrado")

        nome_formatado = self.string_sem_numero_validator.formatar_string_sem_numero(update_data.nome).title()
        if not self.string_sem_numero_validator.validar_string_sem_numero(nome_formatado):
            raise ValueError("Nome deve incluir apenas letras")

        cidade_formatada = colaborador_atual.cidade
        if update_data.cidade is not None:
            cidade_formatada = self.string_sem_numero_validator.formatar_string_sem_numero(update_data.cidade).title()
            if not self.string_sem_numero_validator.validar_string_sem_numero(cidade_formatada):
                raise ValueError("Cidade deve incluir apenas letras")

        uf = colaborador_atual.uf
        if update_data.uf is not None:
            if not UFEnum.is_valid(update_data.uf):
                raise ValueError("UF inválida")
            uf = update_data.uf

        empresa_ou_orgao = colaborador_atual.empresa_ou_orgao
        if update_data.empresa_ou_orgao is not None:
            empresa_limpa = update_data.empresa_ou_orgao.strip()
            if empresa_limpa:
                if not self._validar_texto_sem_numeros(empresa_limpa):
                    raise ValueError("Órgão/Instituição deve incluir apenas letras")
                empresa_ou_orgao = self._normalizar_texto(empresa_limpa)
            else:
                empresa_ou_orgao = None

        instituicao_ensino = colaborador_atual.instituicao_ensino
        if update_data.instituicao_ensino is not None:
            instituicao_limpa = update_data.instituicao_ensino.strip()
            if instituicao_limpa:
                if not self._validar_texto_sem_numeros(instituicao_limpa):
                    raise ValueError("Órgão/Instituição deve incluir apenas letras")
                instituicao_ensino = self._normalizar_texto(instituicao_limpa)
            else:
                instituicao_ensino = None

        telefone = colaborador_atual.telefone
        if update_data.telefone is not None:
            telefone_limpo = update_data.telefone.strip()
            if telefone_limpo:
                if not self.telefone_validator.validar_telefone(telefone_limpo):
                    raise ValueError("Telefone inválido")
                telefone = self.telefone_validator.formatar_telefone(telefone_limpo)
            else:
                telefone = None

        colaborador_atual.nome = nome_formatado
        colaborador_atual.uf = uf
        colaborador_atual.cidade = cidade_formatada
        colaborador_atual.empresa_ou_orgao = empresa_ou_orgao
        colaborador_atual.instituicao_ensino = instituicao_ensino
        colaborador_atual.telefone = telefone

        colaborador_salvo = self.repository.update_colaborador(colaborador_atual)

        return ColaboradorResponseDTO(
            id=colaborador_salvo.id,
            nome=colaborador_salvo.nome,
            id_profissional_responsavel=colaborador_salvo.id_profissional_responsavel,
            is_tecnico=colaborador_salvo.is_tecnico,
            email=colaborador_salvo.email,
            cft=colaborador_salvo.cft,
            uf=colaborador_salvo.uf,
            cidade=colaborador_salvo.cidade,
            empresa_ou_orgao=colaborador_salvo.empresa_ou_orgao,
            telefone=colaborador_salvo.telefone,
            instituicao_ensino=colaborador_salvo.instituicao_ensino,
            limite_acesso=colaborador_salvo.limite_acesso,
            acesso_liberado=colaborador_salvo.acesso_liberado,
            status="Ativo",
        )

    def _validar_texto_sem_numeros(self, texto: str) -> bool:
        return bool(re.fullmatch(r"[A-Za-zÀ-ÿ\s/&.\-]+", texto))

    def _normalizar_texto(self, texto: str) -> str:
        return " ".join(texto.strip().split())