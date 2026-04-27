Feature: Visualização e edição de perfil do usuário
  Como usuário autenticado
  Quero visualizar e editar meus dados de perfil
  Para mantê-los atualizados

  Scenario: Redirecionamento obrigatório no primeiro login de Colaborador ou Técnico
    Given um Colaborador ou Técnico acessa o sistema pelo primeiro login
    When a autenticação é concluída
    Then o sistema redireciona automaticamente para a tela de perfil
    
  Scenario: Visualização dos dados atuais no perfil
    Given o usuário acessa a tela de perfil
    When visualiza suas informações cadastradas
    Then os campos exibem os dados atuais pré-preenchidos
    And e-mail e número de registro estão disponíveis apenas para leitura
    
  Scenario: Edição de dados com informações válidas
    Given o usuário está editando seu perfil
    When preenche os campos editáveis com informações válidas
    Then o sistema salva as alterações
    And exibe confirmação de salvamento
    And atualiza imediatamente os dados exibidos no cabeçalho

  Scenario: Edição com dados inválidos
    Given o usuário está editando seu perfil
    When preenche um campo editável com valor inválido
    Then o sistema aplica as mesmas validações do cadastro
    And impede o salvamento até que os dados estejam corretos