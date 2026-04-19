Feature: Cadastro de profissional no sistema
  Como Profissional (Engenheiro ou Técnico)
  Quero realizar meu cadastro informando meu registro profissional
  Para acessar o sistema com credenciais profissionais

Scenario: Cadastro realizado com sucesso
    Given o profissional está na tela de cadastro
    When preenche todos os campos obrigatórios corretamente
    And o registro profissional corresponde a um profissional válido e ativo
    Then o sistema aprova a criação do cadastro
    And redireciona para a tela inicial do sistema

Scenario: Seletor exibe campo CREA ao escolher Engenheiro
    Given o profissional está na tela de cadastro
    When seleciona o perfil "Engenheiro (CREA)"
    Then o campo de registro exibe o campo "REGISTRO CREA"

Scenario: Seletor exibe campo CFT ao escolher Técnico
    Given o profissional está na tela de cadastro
    When seleciona o perfil "Técnico (CFT)"
    Then o campo de registro exibe o label "REGISTRO CFT"

Scenario: Registro profissional inválido ou inativo
    Given o profissional está na tela de cadastro
    When informa um registro profissional (CREA OU CFT) inválido ou inativo
    Then o sistema recusa o cadastro
    And exibe mensagem de registro não encontrado   

Scenario: E-mail já cadastrado no sistema
    Given já existe um cadastro com o e-mail informado
    When o profissional tenta se cadastrar com o mesmo e-mail
    Then o sistema exibe aviso de duplicidade de e-mail

Scenario: Senhas não coincidem
    Given o profissional está na tela de cadastro
    When informa senhas diferentes nos campos senha e confirmarção de senha
    Then o sistema exibe mensagem de erro informando que as senhas não coincidem

Scenario: Senha não segue o padrão exigido
    Given o profissional está na tela de cadastro
    When informa uma senha que não atende ao padrão exigido
    Then o sistema exibe mensagem com os requisitos mínimos de senha exigidos

Scenario: Múltiplos campos obrigatórios inválidos
    Given o profissional está na tela de cadastro
    When tenta cadastrar com mais de um campo obrigatório inválido
    Then o sistema exibe erro simultaneamente em todos os campos inválidos
 
     
  
 

