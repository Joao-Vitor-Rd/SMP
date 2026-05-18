BASE_URL = "http://localhost:3000"


class LoginPage:
    def __init__(self, page):
        self.page = page

        self.email = page.locator("input[type='email']")
        self.senha = page.locator("input[type='password']")
        self.lembrar_me = page.locator("input[type='checkbox']")
        self.botao_entrar = page.get_by_role("button", name="Entrar")
        self.link_esqueci_senha = page.get_by_role("link", name="Esqueceu a senha?")
        self.link_cadastro = page.get_by_role("link", name="Cadastre-se")

    def acessar(self):
        self.page.goto(f"{BASE_URL}/login")

    def preencher_credenciais(self, email, senha):
        self.email.fill(email)
        self.senha.fill(senha)

    def enviar(self):
        self.botao_entrar.click()

    def login(self, email, senha):
        self.preencher_credenciais(email, senha)
        self.enviar()

    def mensagem_erro(self, texto):
        return self.page.get_by_text(texto)

    def acessar_cadastro(self):
        self.link_cadastro.click()
