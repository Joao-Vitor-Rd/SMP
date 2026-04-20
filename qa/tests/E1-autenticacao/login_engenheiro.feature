Feature: Login no sistema
  Como usuário autenticado (Engenheiro, Técnico ou Colaborador)
  Quero fazer login com e-mail e senha
  Para acessar minhas análises e funcionalidades disponíveis

Scenario: Login realizado com sucesso
    Given o usuário está na tela de login
    When informa e-mail e senha válidos
    Then o sistema redireciona para a aba de Histórico

Scenario: Login com opção lembrar-me ativada
    Given o usuário está na tela de login
    When informa credenciais válidas e seleciona "Lembrar-me"
    Then o sistema mantém a sessão ativa além do período padrão

Scenario: Credenciais inválidas
    Given o usuário está na tela de login
    When informa e-mail ou senha incorretos
    Then o sistema exibe mensagem de credenciais inválidas  

Scenario: Sessão expira após inatividade
    Given o usuário está logado sem "Lembrar-me" ativado
    When a sessão fica inativa por 8 horas por padrão
    Then o sistema encerra a sessão automaticamente    

Scenario: Bloqueio após tentativas incorretas
    Given o usuário está na tela de login
    When realiza 5 tentativas consecutivas com credenciais inválidas
    Then o sistema bloqueia o acesso por 15 minutos
    And exibe mensagem informando o bloqueio    

Scenario: Acesso à recuperação de senha
    Given o usuário está na tela de login
    When clica em "Esqueceu a senha?"
    Then o sistema redireciona para o fluxo de recuperação de senha 

Scenario: Acesso ao cadastro pela tela de login
    Given o usuário está na tela de login
    And não tem conta no sistema 
    When clica em "Cadastrar-se"
    Then o sistema redireciona para a tela de cadastro    
