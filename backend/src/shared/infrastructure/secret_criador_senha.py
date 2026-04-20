from src.shared.domain.interfaces.ICriadorSenha import ICriadorSenha
import secrets
import string

class SecretCriadorSenha(ICriadorSenha):
    def gerar_senha(self) -> str:
        minusculas = string.ascii_lowercase
        maiusculas = string.ascii_uppercase
        numeros = string.digits
        
        senha = [
            secrets.choice(minusculas),
            secrets.choice(maiusculas),
            secrets.choice(numeros),
        ]
        
        for _ in range(8 - 3):
            senha.append(secrets.choice(minusculas))
        
        secrets.SystemRandom().shuffle(senha)
        
        return ''.join(senha)