from abc import ABC, abstractmethod

class IFotoStorage(ABC):

    "Salva e retorna o URL da foto"
    @abstractmethod
    def save(self, conteudo_arquivo: bytes, nome_arquivo: str, content_type: str | None = None) -> str:
        pass

    @abstractmethod
    def delete(self, caminho_arquivo: str) -> bool:
        pass