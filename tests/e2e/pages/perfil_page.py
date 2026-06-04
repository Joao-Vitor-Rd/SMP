import re

BASE_URL = "http://localhost:3000"


class PerfilPage:
    def __init__(self, page):
        self.page = page

        self.campo_nome = page.get_by_placeholder("Nome Completo")
        self.campo_email = page.get_by_label("E-mail")
        self.campo_crea = page.get_by_label("CREA")
        self.campo_cpf_cft = page.get_by_label("CPF/CFT")
        self.campo_empresa = page.get_by_label("Empresa/Órgão")
        self.campo_telefone = page.get_by_label("Telefone")
        self.campo_uf = page.get_by_label("Estado (UF)")
        self.campo_cidade = page.get_by_label("Cidade")
        self.botao_salvar = page.get_by_role("button", name=re.compile("Salvar Alterações", re.I))
        self.botao_historico = page.get_by_role("button", name="Histórico")
        self.botao_fechar_mensagem = page.get_by_label("Fechar mensagem")
        self.alerta = page.get_by_role("alert")

    def acessar(self):
        self.page.goto(f"{BASE_URL}/editar-perfil")

    def preencher_dados_editaveis(self, *, nome, empresa, telefone, uf, cidade):
        self.campo_nome.fill(nome)
        self.campo_empresa.fill(empresa)
        self.campo_telefone.fill(telefone)
        self.campo_uf.select_option(uf)
        self.campo_cidade.fill(cidade)

    def salvar(self):
        self.botao_salvar.click()

    def mensagem_feedback(self, texto, *, exact=False):
        return self.alerta.get_by_text(texto, exact=exact)

    def fechar_mensagem(self):
        self.botao_fechar_mensagem.click()

    def nome_no_cabecalho(self, nome):
        return self.page.locator("header").get_by_text(nome)
