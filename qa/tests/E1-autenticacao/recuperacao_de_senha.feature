Feature: Recuperação de senha
  Como usuário cadastrado,
  quero solicitar recuperação de senha via e-mail 
  para acessar o sistema quando esqueci minha senha

Scenario: Solicitação de link de recuperação com sucesso
    Given o usuário possui uma conta aprovada e ativa no sistema
    And está na tela de recuperação de senha
    When informa seu e-mail cadastrado para recuperar o acesso
    Then o sistema envia um link de redefinição para o e-mail informado
    And define que o link enviado terá validade de 2 horas

Scenario: Criação de nova senha dentro dos padrões de complexidade
    Given o usuário acessou um link de recuperação de senha
    When cria uma nova senha que atenda as regras de complexidade
    Then o sistema atualiza a senha do usuário com sucesso
    And permite que ele faça login com a nova credencial 

Scenario: Tentativa de nova senha fora do padrão de complexidade
    Given o usuário acessou um link de recuperação de senha 
    When tenta definir uma nova senha que não atende às regras de complexidade
    Then o sistema alerta sobre os requisitos mínimos de segurança
    And a senha do usuário não é alterada 

Scenario: Tentativa de uso de link de recuperação com tempo expirado
    Given que o sistema enviou o link de recuperação há mais de 2 horas
    When o usuário tenta acessar esse link
    Then o sistema informa que o link expirou
    And orienta o usuário a solicitar uma nova recuperação de senha

Scenario: Retornar para a tela de login
    Given que o usuário está na tela de recuperação de senha
    When decide clicar no botão para retornar
    Then o sistema o redireciona de volta para a tela de login              
 
 