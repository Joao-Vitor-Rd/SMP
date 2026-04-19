from src.shared.domain.interfaces.ICriadorSenha import ICriadorSenha
import secrets
import string

class SecretCriadorSenha(ICriadorSenha):
    def gerar_senha(self) -> str:
        minusculas = string.ascii_lowercase
        maiusculas = string.ascii_uppercase
        numeros = string.digits
        simbolos = string.punctuation
        
        senha = [
            secrets.choice(minusculas),
            secrets.choice(maiusculas),
            secrets.choice(numeros),
            secrets.choice(simbolos)
        ]
        
        todos_caracteres = minusculas + maiusculas + numeros + simbolos
        for _ in range(12 - 4):
            senha.append(secrets.choice(todos_caracteres))
        
        secrets.SystemRandom().shuffle(senha)
        
        return ''.join(senha)