Feature: Resolução manual de imagens sem metadados de localização
  Como usuário autenticado
  Quero ser notificado sobre imagens sem dados de geolocalização
  Para informar manualmente as coordenadas ou justificar a ausência

  Scenario: Visualização das imagens pendentes de localização
    Given existem imagens identificadas como "Pendentes de Localização"
    When o usuário acessa a tela de resolução de metadados
    Then o sistema exibe apenas as imagens com localização pendente

  Scenario: Inserção manual de coordenadas
    Given o usuário visualiza uma imagem pendente de localização
    When informa manualmente a latitude e longitude da imagem
    Then o sistema registra as coordenadas informadas
    And marca a imagem como localização resolvida

  Scenario: Marcação de ausência de dados GPS
    Given o usuário não possui a informação geográfica de uma imagem pendente
    When informa o status como "Sem GPS" ou "EXIF Corrompido"
    Then o sistema define a justificativa
    And considera a imagem como tratada para fins de prosseguimento

  Scenario: Tentativa de prosseguir com imagens ainda pendentes
    Given ainda existem imagens sem localização definida ou justificativa informada
    When o usuário tenta avançar para o mapa de revisão geral
    Then o sistema bloqueia o prosseguimento
    And indica quais imagens ainda precisam de resolução

  Scenario: Liberação para o mapa de revisão geral
    Given todas as imagens pendentes foram resolvidas com coordenadas ou justificativa
    When o usuário tenta avançar para o mapa de revisão geral
    Then o sistema libera o prosseguimento para a próxima etapa