# SMP
Sistema de Monitoramento de Pavimentos

---

## 🐳 Docker

### Subir a Aplicação

```bash
# Clonar
git clone <seu-repo>
cd SMP

# Configurar ambiente (se necessário)
# cp backend/.env.example backend/.env

# Iniciar
docker-compose up -d

# Acessar
# Swagger: http://localhost:8000/docs
# ReDoc:   http://localhost:8000/redoc

# Parar
docker-compose down
```

---

## 🔐 Autenticação & Requests

### 1. Login
```bash
POST /api/supervisores/login

{
  "email": "supervisor@example.com",
  "password": "senha123"
}
```

**Resposta:** Copia o `access_token`

### 2. Request com Autenticação
```bash
POST /api/colaboradores/

Header:
Authorization: Bearer {access_token}

Body:
{
  "nome": "João Silva",
  "id_profissional_responsavel": "MT123456",
  "uf": "MT",
  "cidade": "Cuiabá",
  "email": "joao@example.com",
  "limite_acesso": "2025-12-31T23:59:59",
  "acesso_liberado": true
}
```

---

## 📁 Estrutura

```
backend/src/
├── modules/
│   ├── supervisor/         # Supervisores
│   └── colaborador/        # Colaboradores
└── shared/
    ├── auth/              # Autenticação JWT
    └── infrastructure/    # Database
```
