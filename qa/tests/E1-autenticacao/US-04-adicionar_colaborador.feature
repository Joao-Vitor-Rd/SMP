Feature: Adicionar membro à equipe
  Como Engenheiro
  Quero adicionar Técnicos e Colaboradores à minha equipe
  Para que possam acessar o sistema sob minha responsabilidade

Scenario: Painel exibe opções para adicionar Técnico ou Colaborador
    Given o Engenheiro está logado no sistema
    When acessa o painel "Adicionar à Equipe"
    Then o sistema exibe as opções par adicionar "Técnico" e "Colaborador"

Scenario: Técnico adicionado com sucesso
    Given o Engenheiro está no painel "Adicionar à Equipe"
    When seleciona o perfil "Técnico"
    And preenche nome completo e e-mail de acesso
    Then o sistema cria o acesso do Técnico com prazo vitalício
    And envia e-mail de notificação para o Técnico

Scenario: Colaborador adicionado com sucesso
    Given o Engenheiro está no painel "Adicionar à Equipe"
    When seleciona o perfil "Colaborador"
    And preenche nome completo e e-mail de acesso
    And define o prazo de expiração do acesso ao colaborador
    Then o sistema cria o acesso do Colaborador com o prazo definido
    And envia e-mail de notificação para o Colaborador

Scenario: E-mail do Técnico informa acesso vitalício
    Given o Engenheiro adicionou um novo Técnico
    When o Técnico recebe o e-mail de notificação
    Then o e-mail informa que o acesso é vitalício
    And contém a url de login do sistema
    And contém o e-mail do Técnico para facilitar o login
    And contém a senha gerada automaticamente pelo sistema
    And sugere atualização imediata do perfil e geração de nova senha    

Scenario: E-mail do Colaborador informa prazo de expiração
    Given o Engenheiro adicionou um novo Colaborador
    When o Colaborador recebe o e-mail de notificação
    Then o e-mail informa o prazo de expiração do acesso
    And contém a url de login do sistema
    And contém o e-mail do Colaborador para facilitar o login
    And contém a senha gerada automaticamente pelo sistema
    And sugere atualização imediata do perfil e geração de nova senha

Scenario: Senha gerada automaticamente segue padrão de complexidade
    Given o Engenheiro finalizou o cadastro de um membro da equipe
    When o sistema gera a senha automática
    Then a senha segue o padrão mínimo de complexidade definido

Scenario: Tentativa de finalizar cadastro com e-mail inválido
    Given o Engenheiro está no painel "Adicionar à Equipe"
    When preenche um e-mail em formato inválido
    Then o sistema exibe mensagem de e-mail inválido

Scenario: Tentativa de finalizar cadastro com e-mail já existente
    Given o Engenheiro está no painel "Adicionar à Equipe"
    When preenche o e-mail de um usuário já cadastrado
    Then o sistema exibe aviso de e-mail já existente