from email_validator import validate_email, EmailNotValidError
from src.shared.domain.interfaces.i_email_validator import IEmailValidator

class EmailValidator(IEmailValidator):
    def validar_email(self, email: str) -> bool:
        try:
            validate_email(
                email,
                check_deliverability=True 
            )
            
            return True

        except EmailNotValidError as e:
            return False
