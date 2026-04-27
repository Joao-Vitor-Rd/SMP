Feature: Upload de imagens de pavimento para análise
  Como usuário autenticado
  Quero fazer upload de múltiplas imagens do pavimento
  Para submetê-las à análise por IA e georreferenciamento

  Scenario: Upload realizado com arquivos válidos
    Given o usuário está na tela de upload de imagens
    When seleciona um ou mais arquivos nos formatos JPG, PNG ou TIFF dentro do limite de tamanho
    Then o sistema aceita os arquivos
    And exibe o progresso individual de envio para cada arquivo
    And ao concluir todos os uploads dispara automaticamente o processamento de extração de metadados

  Scenario: Upload via drag-and-drop
    Given o usuário está na tela de upload de imagens
    When arrasta e solta os arquivos na área de upload
    Then o sistema os aceita da mesma forma que a seleção manual

  Scenario: Formato de arquivo não suportado
    Given o usuário está na tela de upload
    When tenta enviar um arquivo em formato não suportado
    Then o sistema rejeita o arquivo
    And exibe aviso informando os formatos aceitos

  Scenario: Arquivo excede o tamanho máximo permitido
    Given o usuário seleciona um arquivo para upload
    When o arquivo ultrapassa 50 MB
    Then o sistema o rejeita antes de iniciar o envio
    And exibe aviso de tamanho excedido

  Scenario: Upload de múltiplos arquivos com tamanhos mistos
    Given o usuário seleciona vários arquivos simultaneamente
    When parte deles excede 50 MB ou possui formato inválido
    Then o sistema rejeita apenas os arquivos inválidos
    And prossegue com o envio dos arquivos válidos
    And exibe aviso individualizado para cada arquivo rejeitado