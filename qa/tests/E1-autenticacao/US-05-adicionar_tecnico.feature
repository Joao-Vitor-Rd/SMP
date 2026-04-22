Feature: Criar acesso vitalício para técnico
  Como Engenheiro
  Quero criar um acesso vitalício para o técnico
  Para que ele possa operar o sistema de forma independente e sem expiração

  Scenario: Técnico adicionado com sucesso
    Given o Engenheiro está no painel de adicionar técnico
    When preenche nome e e-mail válidos
    Then o sistema cria a conta sem data de expiração
    And envia e-mail com as credenciais para o técnico

  Scenario: E-mail enviado ao técnico contém informações necessárias
    Given o Engenheiro criou um acesso para um novo técnico
    When o técnico recebe o e-mail de notificação
    Then o e-mail contém a URL do sistema
    And contém o e-mail de acesso
    And contém a senha gerada automaticamente
    And orienta atualização de perfil e troca de senha no primeiro acesso

  Scenario: Acesso vitalício permanece ativo indefinidamente
    Given o Engenheiro criou um técnico com acesso vitalício
    When não há revogação do acesso
    Then o sistema mantém a conta ativa sem expiração

  Scenario: Tentativa de adicionar com e-mail inválido
    Given o Engenheiro está no painel de adicionar técnico
    When preenche um e-mail em formato inválido
    Then o sistema exibe mensagem de e-mail inválido

  Scenario: Tentativa de adicionar com e-mail já cadastrado
    Given o Engenheiro está no painel de adicionar técnico
    When preenche o e-mail de um usuário já existente
    Then o sistema exibe aviso de e-mail já cadastrado

  Scenario: Tentativa de adicionar sem preencher campos obrigatórios
    Given o Engenheiro está no painel de adicionar técnico
    When tenta finalizar sem preencher nome ou e-mail
    Then o sistema exibe erro nos campos obrigatórios não preenchidos