BASE_URL = "http://localhost:3000"


class CadastroPage:
    def __init__(self, page):
        self.page = page

        self.nome = page.locator("#nome")
        self.crea = page.locator("#crea")
        self.cidade = page.locator("#cidade")
        self.uf = page.locator("#uf")
        self.email = page.locator("#email")
        self.senha = page.locator("#senha")
        self.confirmar_senha = page.locator("#confirmarSenha")
        self.botao_concluir = page.get_by_role("button", name="Concluir Cadastro")
        self.link_login = page.get_by_role("link", name="Acesse aqui")

    def acessar(self):
        self.page.goto(f"{BASE_URL}/cadastro")

    def preencher_formulario(
        self,
        *,
        nome,
        crea,
        cidade,
        uf,
        email,
        senha,
        confirmar_senha=None,
    ):
        self.nome.fill(nome)
        self.crea.fill(crea)
        self.cidade.fill(cidade)
        self.uf.select_option(uf)
        self.email.fill(email)
        self.senha.fill(senha)
        self.confirmar_senha.fill(confirmar_senha or senha)

    def enviar(self):
        self.botao_concluir.click()

    def acessar_login(self):
        self.link_login.click()

    def mensagem_erro(self, texto):
        return self.page.get_by_text(texto)

    def mensagem_sucesso(self):
        return self.page.get_by_text("Conta criada com sucesso")
