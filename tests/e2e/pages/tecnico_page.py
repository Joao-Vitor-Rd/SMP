import re

BASE_URL = "http://localhost:3000"


class TecnicoPage:
    def __init__(self, page):
        self.page = page

        self.botao_tipo_tecnico = page.get_by_role("button", name="TÉCNICO", exact=True) # botao exatamente esse
        self.botao_adicionar_tecnico = page.get_by_role(
            "button", name=re.compile("ADICIONAR COLABORADOR", re.I) # ignora case
        )
        self.campo_nome = page.get_by_placeholder("Ex: Maria Souza")
        self.campo_email = page.get_by_placeholder("email@exemplo.com")
        self.campo_cft = page.get_by_placeholder("000.000.000-00")
        self.campo_data_expiracao = page.get_by_label("Data de expiração do acesso")
        self.alerta = page.get_by_role("alert")

    def acessar(self):
        self.page.goto(f"{BASE_URL}/editar-perfil")

    def selecionar_tecnico(self):
        self.botao_tipo_tecnico.click()

    def preencher_tecnico(self, *, nome, email, cft):
        self.campo_nome.fill(nome)
        self.campo_email.fill(email)
        self.campo_cft.fill(cft)

    def adicionar_tecnico(self):
        self.botao_adicionar_tecnico.click()

    def mensagem_feedback(self, texto, *, exact=False):
        return self.alerta.get_by_text(texto, exact=exact)
