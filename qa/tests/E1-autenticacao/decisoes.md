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
<<<<<<< HEAD
=======

### Dúvida em aberto 3 — Redirecionamento após login

**Data:** 20/04/2026
**Status:** Aguardando resposta
**Contexto:** Caso de uso diz "redireciona para o Dashboard",
critério de aceite da US-02 diz "redireciona para aba de Histórico".
Qual prevalece?
**Impacto:** Cenário "Login realizado com sucesso" do BDD
e CT correspondente nos casos de teste.
