import re
from src.shared.domain.interfaces.i_telefone_validator import ITelefoneValidator

class TelefoneValidator(ITelefoneValidator):
    """
    Valida números de telefone/celular brasileiros
    Aceita formatos:
    - (11) 9xxxx-xxxx (celular com formatação)
    - 11 9xxxx-xxxx (celular sem parênteses)
    - 119xxxxxxxx (celular sem formatação)
    """
    
    def validar_telefone(self, telefone: str) -> bool:
        if not telefone or not isinstance(telefone, str):
            return False
        
        apenas_numeros = re.sub(r'\D', '', telefone)
        return len(apenas_numeros) == 11
    
    def validar_celular(self, telefone: str) -> bool:
        if not telefone or not isinstance(telefone, str):
            return False
        
        apenas_numeros = re.sub(r'\D', '', telefone)
        return len(apenas_numeros) == 11
    
    def formatar_telefone(self, telefone: str) -> str:
        if not self.validar_telefone(telefone):
            return ""
        
        apenas_numeros = re.sub(r'\D', '', telefone)
        return f"({apenas_numeros[:2]}) {apenas_numeros[2:7]}-{apenas_numeros[7:]}"
