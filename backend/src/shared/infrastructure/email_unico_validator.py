from sqlalchemy.orm import Session
from sqlalchemy import text
from src.shared.domain.interfaces.i_email_unico_validator import IEmailUnicoValidator

class EmailUnicoValidator(IEmailUnicoValidator):
    
    def __init__(self, session: Session):
        self.session = session
    
    def validar_email_unico(self, email: str) -> bool:
        query = text("""
            SELECT email FROM supervisor WHERE email = :email
            UNION
            SELECT email FROM colaborador WHERE email = :email
            LIMIT 1
        """)
        
        result = self.session.execute(query, {"email": email}).first()
        return result is not None
