Feature: Criar acesso para colaborador
  Como Engenheiro ou Técnico
  Quero criar acesso para um colaborador informando nome, e-mail e data de expiração
  Para que o sistema gere e envie as credenciais automaticamente

  Scenario: Colaborador adicionado com sucesso
    Given o usuário está no painel de adicionar colaborador
    When preenche nome, e-mail  do colaborador e data de expiração de acesso válidos
    Then o sistema cria a conta com status Ativo
    And envia e-mail com as credenciais para o colaborador

Scenario: E-mail enviado ao colaborador contém informações necessárias
    Given o usuário criou um acesso para um colaborador
    When o colaborador recebe o e-mail de notificação
    Then o e-mail contém a URL do sistema
    And contém o e-mail de acesso
    And contém a senha gerada automaticamente seguindo os padrões de complexidade
    And orienta atualização imediata do perfil e troca de senha 

  Scenario: Conta criada permanece ativa até a data de expiração
    Given o usuário criou um acesso ao colaborador com data de expiração definida
    When a data de expiração ainda não foi atingida
    Then o sistema mantém a conta com status Ativo

  Scenario: Tentativa de adicionar com e-mail inválido
    Given o usuário está no painel de adicionar colaborador
    When preenche um e-mail em formato inválido
    Then o sistema exibe mensagem de e-mail inválido

  Scenario: Tentativa de adicionar com e-mail já cadastrado
    Given o usuário está no painel de adicionar colaborador
    When preenche o e-mail de um usuário já existente
    Then o sistema exibe aviso de e-mail já cadastrado

  Scenario: Tentativa de adicionar sem preencher campos obrigatórios
    Given o usuário está no painel de adicionar colaborador
    When tenta finalizar sem preencher nome, e-mail ou data de expiração
    Then o sistema exibe erro nos campos obrigatórios não preenchidos