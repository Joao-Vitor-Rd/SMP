import os
import requests
from dotenv import load_dotenv
from src.modules.supervisor.application.interfaces.validador_crea import ValidadorCREA

load_dotenv()

class ValidadorCREAApi(ValidadorCREA):

    def validar(self, crea: str, nome: str) -> bool:
        url = os.getenv("CREA_API_URL")
        chave = os.getenv("CREA_API_KEY")
        
        if not url:
            raise ValueError("CREA_API_URL não foi definida no arquivo .env")
        
        if not chave:
            raise ValueError("CREA_API_KEY não foi definida no arquivo .env")
    
        params = {
            "tipo": "crea",
            "destino": "json",
            "uf": "",
            "q": nome,
            "chave": chave
        }

        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
        except Exception as e:
            raise ValueError(f"Erro ao conectar com API de CREA: {str(e)}")

        if response.status_code != 200:
            return False

        try:
            data = response.json()
        except Exception as e:
            raise ValueError(f"Erro ao processar resposta da API: {str(e)}")

        if not data or len(data) == 0:
            raise ValueError(f"Nenhuma pessoa encontrada com CREA: {crea}")
    
        itens = data.get("item", [])
        
        for item in itens:
            print("[INFO]: " + item.get("numero"))
            print("[INFO]: " + crea)
            if str(item.get("nome")).lower() == nome.lower() and crea == item.get("numero"):
                return True
    
        return False