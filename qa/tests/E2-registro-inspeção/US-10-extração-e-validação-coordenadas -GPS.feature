Feature: Extração automática de coordenadas das imagens enviadas
  Como usuário autenticado
  Quero que o sistema extraia automaticamente as coordenadas das imagens
  Para identificar quais possuem localização e quais exigem intervenção manual

  Scenario: Extração de coordenadas de imagem com EXIF válido
    Given o upload das imagens foi concluído
    When o sistema processa os metadados EXIF de uma imagem com coordenadas válidas
    Then a imagem é marcada como "Georreferenciada"

  Scenario: Identificação de imagem sem dados de GPS
    Given o upload das imagens foi concluído
    When o sistema processa uma imagem sem informação de GPS no EXIF
    Then a imagem é marcada como "Pendente de Localização"

  Scenario: Identificação de imagem com EXIF corrompido
    Given o upload das imagens foi concluído
    When o sistema processa uma imagem cujo EXIF está corrompido
    Then a imagem é marcada como "Pendente de Localização"

  Scenario: Consolidação e direcionamento após processamento
    Given o sistema concluiu a extração de metadados de todas as imagens
    When todas as imagens foram classificadas
    Then o sistema direciona o usuário para a tela de tratamento das imagens pendentes