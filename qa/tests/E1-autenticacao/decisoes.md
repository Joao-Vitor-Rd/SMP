# Decisões de QA

## US-01 — Cadastro de profissional

### Decisão 1 — Complexidade de senha

**Data:** 18/04/2026  
**Acordado com:** PO
**Contexto:** O critério de aceite definia apenas "mínimo 8 caracteres",
sem especificar complexidade. PO delegou a definição ao QA.  
**Decisão:** Senha deve conter no mínimo 8 caracteres,
1 letra maiúscula e 1 número.  
**Exemplo válido:** Senha123  
**Exemplo inválido:** senha123, Senhaaaa, Sen1

### Decisão 2 — Comportamento de campos inválidos

**Data:** 18/04/2026  
**Acordado com:** PO
**Contexto:** O caso de uso não especificava se erros de campos
apareciam um por vez ou todos juntos.  
**Decisão:** O sistema deve exibir erro em todos os campos
inválidos simultaneamente.

### Decisão 3 — Escopo de cadastro independente

**Data:** 20/04/2026
**Acordado com:** PO
**Contexto:** Inicialmente a US-01 previa cadastro de
Engenheiro e Técnico. Com a mudança de escopo, o Técnico
passa a ser adicionado pelo Engenheiro via painel
"Adicionar à Equipe".
**Decisão:** Cadastro independente no sistema é exclusivo
do Engenheiro. Técnico e Colaborador são criados pelo
Engenheiro.
**Impacto:** US-01 refatorada. Cenários de CFT e seletor
de perfil removidos.

### Dúvida em aberto 1 — API de validação do CFT

**Data:** 18/04/2026  
**Status:** Aguardando resposta  
**Contexto:** Não foi encontrada API pública para validação do CFT.
Impacta o cenário "Registro profissional inválido ou inativo".

### Dúvida em aberto 2 — Redirecionamento após cadastro

**Data:** 18/04/2026  
**Status:** Aguardando resposta  
**Contexto:** UC-01 diz "redireciona para tela de login",
critério de aceite diz "tela inicial". Qual prevalece?

### Dúvida em aberto 3 — Redirecionamento após login

**Data:** 20/04/2026
**Status:** Aguardando resposta
**Contexto:** Caso de uso diz "redireciona para o Dashboard",
critério de aceite da US-02 diz "redireciona para aba de Histórico".
Qual prevalece?

### Dúvida em aberto 4 — Criação da senha

**Data:** 20/04/2026
**Status:** Aguardando resposta
**Contexto:** Quando o usuário clica em esquecer senha, e é redirecionado pra essa tela, quando insere o e-mail cadastrado, como funciona esse fluxo? chega um link no e-mail onde ele abre e tem a opção de mudança de senha?

### Dúvida em aberto 5 — prazo de expiração

O prazo de expiração do Colaborador, tem um mínimo e máximo definido? Ou o Engenheiro define livremente?

### Dúvida em aberto 6 — Notificação de expiração

Quando o acesso do Colaborador expira — o sistema notifica o Engenheiro, o Colaborador ou nenhum dos dois?

### Dúvida em aberto 6 — Botão de Preview E-mail

Não entendi esse botão de Preview E-mail, vale um bdd?
