import re

BASE_URL = "http://localhost:3000"


class EquipePage:
    def __init__(self, page):
        self.page = page

        self.botao_tipo_colaborador = page.get_by_role(
            "button", name="COLABORADOR", exact=True
        )
        self.botao_adicionar_colaborador = page.get_by_role(
            "button", name=re.compile("ADICIONAR COLABORADOR", re.I) # re.I = ignora case
        )
        self.campo_nome = page.get_by_placeholder("Ex: Maria Souza")
        self.campo_email = page.get_by_placeholder("email@exemplo.com")
        self.campo_data_expiracao = page.get_by_label("Data de expiração do acesso")
        self.alerta = page.get_by_role("alert")

    def acessar(self):
        self.page.goto(f"{BASE_URL}/editar-perfil")

    def selecionar_colaborador(self):
        self.botao_tipo_colaborador.click()

    def preencher_colaborador(self, *, nome, email, data_expiracao):
        self.campo_nome.fill(nome)
        self.campo_email.fill(email)
        self.campo_data_expiracao.fill(data_expiracao)

    def adicionar_colaborador(self):
        self.botao_adicionar_colaborador.click()

    def mensagem_feedback(self, texto, *, exact=False):
        return self.alerta.get_by_text(texto, exact=exact)
