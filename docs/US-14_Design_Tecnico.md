# US-14 — Análise de IA e Laudo de Inspeção (Design Técnico)

> Documento de design técnico (_Design First_) para a solução de acionamento de análise por IA, processamento assíncrono e revisão de laudo de inspeção, com base na taxonomia do **DNIT 005/2003-TER**.

---

## 1. Contexto

A US-14 cobre o fluxo em que o usuário:

1. Aciona a **análise de IA** sobre uma inspeção já cadastrada (com imagens e coordenadas).
2. Aguarda o **processamento assíncrono** no backend (worker), que pode levar tempo variável e, portanto, não pode ser tratado de forma síncrona na requisição HTTP.
3. **Revisa o laudo** gerado pela IA, classificado segundo a taxonomia do **DNIT 005/2003-TER** (defeitos de pavimento flexível), com possibilidade de edição manual antes da consolidação.

### Requisitos derivados

- O acionamento da análise **não pode bloquear** a UI nem depender de uma resposta imediata do worker.
- O estado de processamento deve **sobreviver a reloads** da página (o usuário pode atualizar ou fechar/reabrir a aba enquanto a IA processa).
- O laudo deve destacar visualmente classificações com **confiança inferior a 85%**, sinalizando a necessidade de revisão humana.
- A extração de coordenadas (GPS/EXIF) é pré-requisito para liberar o acionamento da análise.

---

## 2. Decisões de Frontend

### 2.1. Estado

- O componente principal da feature gerencia o estado local da tela com **`useState`** (status atual, laudo em edição, flags de UI).
- O identificador do processamento assíncrono (**`job_id`**) é **persistido no `localStorage`** por meio de um **módulo utilitário em `frontend/src/lib/`** (ex.: `inspectionJobStorage.ts`).
  - **Motivação:** garantir a **sobrevivência a reloads**. Ao montar o componente, o utilitário recupera o `job_id` salvo e o polling é retomado automaticamente, sem perder o vínculo com o processamento em andamento.
  - **Responsabilidades do utilitário:** `saveJobId(inspecaoId, jobId)`, `getJobId(inspecaoId)`, `clearJobId(inspecaoId)`. O encapsulamento isola o acesso ao `localStorage` (guardas para SSR/`typeof window`) do resto da aplicação.

### 2.2. Comunicação Assíncrona (Polling)

- A atualização de status é feita via **_Polling_** com **`setInterval`** no frontend, consumindo o endpoint de status do `job_id`.
- Todas as chamadas HTTP utilizam **exclusivamente a instância `authApi`** exportada de **`frontend/src/lib/authApi.ts`**, garantindo:
  - envio automático de cookies de sessão (`withCredentials`);
  - tratamento centralizado de **refresh de token** e de **sessão expirada** (interceptors já existentes).
- **Ciclo de vida do polling:**
  1. Inicia após `POST .../analisar` retornar o `job_id` (ou ao retomar um `job_id` recuperado do `localStorage`).
  2. A cada intervalo, consulta `GET .../status`.
  3. Encerra (`clearInterval`) quando `status` for `completed` ou `failed`.
  4. Em `completed`, carrega o `result` (laudo) para edição e limpa o `job_id` persistido.
  5. O intervalo é sempre limpo no _cleanup_ do `useEffect` para evitar vazamentos.

### 2.3. Componentização

Componentes construídos com **Tailwind CSS puro** (sem dependência de bibliotecas de UI):

- **`frontend/components/InspectionProcessingQueue.tsx`**
  - Exibe o estado de **polling**: processamento pendente, indicador de carregamento e mensagens de falha.
  - Recebe o `status` atual e renderiza o feedback correspondente ao usuário.
- **`frontend/components/InspectionReviewForm.tsx`**
  - Formulário de **edição do laudo** gerado pela IA, conforme a taxonomia DNIT 005/2003-TER.
  - Exibe **alertas de confiança `< 85%`**, destacando visualmente os itens que exigem revisão manual.
  - Emite o laudo editado para persistência via `PUT .../laudo`.

### 2.4. Extração de Coordenadas

- A extração de coordenadas é mantida no **client-side**, utilizando a biblioteca **`exifr`** sobre os metadados EXIF das imagens.
- A extração ocorre **antes da liberação do botão de análise**: sem coordenadas válidas, o acionamento permanece desabilitado, garantindo que o worker receba dados geográficos consistentes.

---

## 3. Contratos de API Esperados (_Design First_)

> Contratos definidos previamente para permitir o desenvolvimento paralelo de frontend e backend. Todas as rotas são consumidas via instância `authApi`.

### 3.1. Iniciar análise

```http
POST /api/v1/inspecoes/{id}/analisar
```

Inicia o worker de análise de IA para a inspeção informada.

**Resposta `200`:**

```json
{
  "job_id": "string"
}
```

### 3.2. Consultar status

```http
GET /api/v1/inspecoes/analise/{job_id}/status
```

Consultado periodicamente pelo polling.

**Resposta `200`:**

```json
{
  "status": "pending | completed | failed",
  "result": "Laudo | null"
}
```

| Campo    | Tipo                                      | Descrição                                                                 |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `status` | `"pending" \| "completed" \| "failed"`    | Estado atual do processamento assíncrono.                                 |
| `result` | `Laudo \| null`                           | Laudo gerado quando `status = "completed"`; `null` caso contrário.        |

### 3.3. Salvar laudo revisado

```http
PUT /api/v1/inspecoes/{id}/laudo
```

Persiste as edições manuais feitas pelo usuário no formulário de revisão.

**Corpo:** o objeto `Laudo` editado (classificações DNIT 005/2003-TER, severidades, observações e ajustes de confiança/aprovação).

---

## 4. Resumo do Fluxo

```
[Imagens + EXIF (exifr, client-side)]
        │  coordenadas válidas → habilita botão
        ▼
POST /analisar ──► { job_id } ──► localStorage (frontend/src/lib/)
        │
        ▼
setInterval ──► GET /status ──┐
        ▲                      │ pending  → mantém polling (InspectionProcessingQueue)
        └──────────────────────┤ failed   → encerra + mensagem de erro
                               │ completed → carrega Laudo (InspectionReviewForm)
                                            │ alertas confiança < 85%
                                            ▼
                                   PUT /laudo (edições manuais)
```
