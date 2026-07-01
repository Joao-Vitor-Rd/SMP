# SMP — Sistema de Monitoramento de Pavimentos

Aplicação web para apoio a inspeções de pavimento rodoviário, com upload georreferenciado de imagens, revisão em mapa, detecção automatizada de defeitos (taxonomia DNIT) e publicação de laudos.

## Arquitetura

O sistema segue uma arquitetura em camadas com frontend desacoplado do backend:

| Camada | Tecnologia | Responsabilidade |
|--------|------------|------------------|
| Interface | Next.js (React) | Fluxo de inspeção, upload, mapa e revisão de laudo |
| API | FastAPI (Python) | Regras de negócio, autenticação JWT, persistência |
| Banco | PostgreSQL | Laudos, trechos, fotos, detecções |
| Fila | Redis + arq | Jobs assíncronos de análise por IA |
| Worker | Python (arq) | Inferência YOLO via API Roboflow Serverless |
| Storage | MinIO | Arquivos de imagem das inspeções |

### Fluxo da análise por IA (US-14)

1. O usuário cria uma inspeção (laudo) e envia fotos vinculadas a ela.
2. A API valida pré-condições e enfileira um job no Redis (`POST /api/v1/inspecoes/{id}/analisar`).
3. O worker consome o job, lê as imagens do MinIO e chama a API Roboflow (modelo RDD2022).
4. As detecções são mapeadas para classes DNIT, filtradas por confiança mínima (0,40) e persistidas.
5. O frontend consulta o status do job via polling e exibe o laudo para revisão humana.

## Pré-requisitos

- Docker e Docker Compose
- Chave de API Roboflow (para inferência em produção/desenvolvimento com `DETECTOR_DEFEITOS=yolo`)

## Configuração

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example backend/.env
```

2. Edite `backend/.env` e preencha pelo menos:

- `POSTGRES_PASSWORD` e `DATABASE_URL` (banco `smv`)
- `SECRET_KEY_JWT`
- `ROBOFLOW_API_KEY` (obrigatória com detector YOLO ativo)

Consulte `.env.example` na raiz do repositório para a lista completa de variáveis.

## Execução com Docker

```bash
# Build e subida de todos os serviços
docker compose up --build -d
```

Serviços disponíveis após a subida:

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5433 |

### Migrations (Alembic)

Com os containers em execução, aplique as migrations do banco:

```bash
docker compose exec backend alembic upgrade head
```

Para conferir a revisão atual:

```bash
docker compose exec backend alembic current
```

## Desenvolvimento local (sem Docker no frontend)

```bash
# Backend e dependências via Docker
docker compose up -d postgres redis min_io backend worker

# Frontend
cd frontend
npm install
npm run dev
```

Defina `NEXT_PUBLIC_API_URL=http://localhost:8000` no ambiente do frontend.

## Estrutura do repositório

```
backend/src/
├── modules/
│   ├── analise/          # Jobs de IA, detector Roboflow, detecções
│   ├── fotos/            # Upload, MinIO, georreferenciamento
│   ├── trechos/          # Trechos, laudos, publicação
│   ├── auth/             # Login, JWT, recuperação de senha
│   └── ...
└── shared/               # Infraestrutura comum (DB, Redis, auth)

frontend/src/
├── app/                  # Páginas (upload, mapa, meus-trabalhos, ...)
├── lib/                  # Clientes HTTP e utilitários
└── components/           # Componentes compartilhados
```

## Autenticação

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha"
}
```

Utilize o token retornado no header `Authorization: Bearer {token}` nas demais requisições.

## Parar os serviços

```bash
docker compose down
```

Para remover volumes (dados do banco e MinIO):

```bash
docker compose down -v
```
