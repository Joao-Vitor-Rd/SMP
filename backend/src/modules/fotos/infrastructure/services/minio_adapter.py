from io import BytesIO

from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage

class MinioAdapter(IFotoStorage):
    def __init__(self, client, bucket_name: str):
        self.client = client
        self.bucket_name = bucket_name

    def save(self, conteudo_arquivo: bytes, nome_arquivo: str, content_type: str | None = None) -> str:
        stream = BytesIO(conteudo_arquivo)
        self.client.put_object(
            self.bucket_name,
            nome_arquivo,
            data=stream,
            length=len(conteudo_arquivo),
            content_type=content_type or "application/octet-stream",
        )
        return f"{self.bucket_name}/{nome_arquivo}"

    def delete(self, caminho_arquivo: str) -> bool:
        nome_objeto = caminho_arquivo.split(f"{self.bucket_name}/", 1)[-1]
        try:
            self.client.remove_object(self.bucket_name, nome_objeto)
            return True
        except Exception:
            return False