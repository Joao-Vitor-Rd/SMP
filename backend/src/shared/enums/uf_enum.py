from enum import Enum


class UFEnum(str, Enum):
    """Enumeração das Unidades Federativas do Brasil"""
    
    AC = "AC"  # Acre
    AL = "AL"  # Alagoas
    AP = "AP"  # Amapá
    AM = "AM"  # Amazonas
    BA = "BA"  # Bahia
    CE = "CE"  # Ceará
    DF = "DF"  # Distrito Federal
    ES = "ES"  # Espírito Santo
    GO = "GO"  # Goiás
    MA = "MA"  # Maranhão
    MT = "MT"  # Mato Grosso
    MS = "MS"  # Mato Grosso do Sul
    MG = "MG"  # Minas Gerais
    PA = "PA"  # Pará
    PB = "PB"  # Paraíba
    PR = "PR"  # Paraná
    PE = "PE"  # Pernambuco
    PI = "PI"  # Piauí
    RJ = "RJ"  # Rio de Janeiro
    RN = "RN"  # Rio Grande do Norte
    RS = "RS"  # Rio Grande do Sul
    RO = "RO"  # Rondônia
    RR = "RR"  # Roraima
    SC = "SC"  # Santa Catarina
    SP = "SP"  # São Paulo
    SE = "SE"  # Sergipe
    TO = "TO"  # Tocantins

    @classmethod
    def is_valid(cls, uf) -> bool:
        """Verifica se um valor é uma UF válida"""
        if uf is None:
            return False

        if isinstance(uf, cls):
            return True

        if isinstance(uf, str):
            uf_normalizada = uf.strip().upper()
            return uf_normalizada in cls.__members__ or uf_normalizada in cls._value2member_map_

        return False

    @classmethod
    def get_all_values(cls) -> list[str]:
        """Retorna a lista de todas as UFs"""
        return [uf.value for uf in cls]
