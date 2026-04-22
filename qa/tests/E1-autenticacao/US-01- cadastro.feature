Feature: Cadastro de engenheiro no sistema
  Como Engenheiro
  Quero realizar meu cadastro informando meu registro profissional
  Para acessar o sistema com credenciais profissionais

Scenario: Cadastro realizado com sucesso
    Given o engenheiro está na tela de cadastro
    When preenche todos os campos obrigatórios corretamente
    And o CREA corresponde a um profissional válido e ativo
    Then o sistema exibe um feedback de sucesso
    And redireciona para a tela de login

Scenario: Registro CREA inválido ou inativo
    Given o engenheiro está na tela de cadastro
    When informa um CREA inválido ou inativo
    Then o sistema recusa o cadastro
    And exibe mensagem de registro não encontrado/invalido

Scenario: E-mail não segue o padrão exigido
    Given o engenheiro vai cadastrar seu e-mail
    When informa um e-mail que atende não atende aos padrãos de formato
    Then o sistema exibe mensagem de erro informando que o e-mail é inválido
     
Scenario: E-mail já cadastrado no sistema
    Given já existe um cadastro com o e-mail informado
    When o engenheiro tenta se cadastrar com o mesmo e-mail
    Then o sistema exibe aviso de duplicidade de e-mail

Scenario: Senhas não coincidem
    Given o engenheiro está na tela de cadastro
    When informa senhas diferentes nos campos senha e confirmarção de senha
    Then o sistema exibe mensagem de erro informando que as senhas não coincidem

Scenario: Senha não segue o padrão exigido
    Given o engenheiro está na tela de cadastro
    When informa uma senha que não atende ao padrão exigido
    Then o sistema exibe mensagem com os requisitos mínimos de senha exigidos

Scenario: Múltiplos campos obrigatórios inválidos
    Given o engenheiro está na tela de cadastro
    When tenta cadastrar com mais de um campo obrigatório inválido
    Then o sistema exibe erro simultaneamente em todos os campos inválidos
 
Scenario: Retornar para a tela de login
    Given que o engenheiro está na tela de cadastro
    When acessa a opção de retornar ao login
    Then o sistema o redireciona de volta para a tela de login
    
  
     
  
 

