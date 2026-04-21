import re
from src.shared.domain.interfaces.i_telefone_validator import ITelefoneValidator

class TelefoneValidator(ITelefoneValidator):
    """
    Valida números de telefone/celular brasileiros
    Aceita formatos:
    - (11) 9xxxx-xxxx (celular com formatação)
    - 11 9xxxx-xxxx (celular sem parênteses)
    - 119xxxxxxxx (celular sem formatação)
    - (11) xxxx-xxxx (fixo com formatação)
    - 11 xxxx-xxxx (fixo sem parênteses)
    - 11xxxxxxxx (fixo sem formatação)
    """
    
    # Regex para celular (2 dígitos de DDD + 9 + 4 dígitos + 4 dígitos)
    REGEX_CELULAR = r'^(\(?\d{2}\)?)\s?(9\d{4})[-.\s]?(\d{4})$'
    
    # Regex para telefone fixo (2 dígitos de DDD + 4 dígitos + 4 dígitos)
    REGEX_FIXO = r'^\(?(\d{2})\)?(\s|-)?(3|4|5|6|7|8)\d{3}(\-|\s)?(\d{4})$'
    
    def validar_telefone(self, telefone: str) -> bool:
        if not telefone or not isinstance(telefone, str):
            return False
        
        telefone = telefone.strip()
        
        if re.match(self.REGEX_CELULAR, telefone) or re.match(self.REGEX_FIXO, telefone):
            return True
        
        return False
    
    def validar_celular(self, telefone: str) -> bool:
        if not telefone or not isinstance(telefone, str):
            return False
        
        telefone = telefone.strip()
        return bool(re.match(self.REGEX_CELULAR, telefone))
    
    def formatar_telefone(self, telefone: str) -> str:
        if not self.validar_telefone(telefone):
            return ""
        
        apenas_numeros = re.sub(r'\D', '', telefone)
        
        if len(apenas_numeros) == 11:  # Celular
            return f"({apenas_numeros[:2]}) {apenas_numeros[2:7]}-{apenas_numeros[7:]}"
        elif len(apenas_numeros) == 10:  # Telefone fixo
            return f"({apenas_numeros[:2]}) {apenas_numeros[2:6]}-{apenas_numeros[6:]}"
        
        return ""
