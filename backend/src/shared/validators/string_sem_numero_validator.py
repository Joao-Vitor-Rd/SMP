import re
from src.shared.domain.interfaces.i_string_sem_numeros_validator import IStringSemNumeroValidador

class StringSemNumeroValidator(IStringSemNumeroValidador):

    REGEX_STRING_SEM_NUMERO = r'^[A-Za-zÀ-ÿ\s\-]+$'
    
    def validar_string_sem_numero(self, string: str) -> bool:
        if not string:
            return False

        if re.match(self.REGEX_STRING_SEM_NUMERO, string):
            return True

        return False

    def formatar_string_sem_numero(self, string: str) -> str:
        if not string:
            return False

        string = " ".join(string.strip().split())
        
        return string
