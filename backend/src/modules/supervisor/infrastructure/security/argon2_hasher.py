from argon2 import PasswordHasher as Argon2Lib
from argon2.exceptions import VerifyMismatchError
from .....shared.security.password_hash import PassWordHasher

class Argon2PasswordHasher(PassWordHasher):

    def __init__(self):
        self.ph = Argon2Lib(
            time_cost=3,      
            memory_cost=65536,
            parallelism=4
        )

    def hash(self, senha: str) -> str:
        return self.ph.hash(senha)

    def verify(self, senha: str, senha_hash: str) -> bool:
        try:
            return self.ph.verify(senha_hash, senha)
        except VerifyMismatchError:
            return False