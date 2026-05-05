from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.shared.infrastructure.db import create_tables, sync_schema
from src.shared.infrastructure.redis_config import RedisClient
from src.modules.supervisor.api.http.supervisor_routes import router as supervisor_router
from src.modules.colaborador.api.http.colaborador_routes import router as colaborador_router
from src.modules.auth.api.http.auth_routes import router as auth_router
from src.modules.upload.api.http.upload_routes import router as upload_router

app = FastAPI(
    title="API SMP",
    version="1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
create_tables()

# Sincronizar schema com as entidades
sync_schema()

# Lifecycle events para Redis
@app.on_event("startup")
async def startup_event():
    """Inicializa a conexão com Redis ao iniciar a aplicação"""
    try:
        redis_client = await RedisClient.get_client()
        # Testar conexão
        await redis_client.ping()
        print("✓ Conexão com Redis estabelecida com sucesso")
    except Exception as e:
        print(f"✗ Erro ao conectar com Redis: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Fecha a conexão com Redis ao desligar a aplicação"""
    try:
        await RedisClient.close_client()
        print("✓ Conexão com Redis fechada com sucesso")
    except Exception as e:
        print(f"✗ Erro ao fechar conexão com Redis: {str(e)}")

app.include_router(auth_router)
app.include_router(supervisor_router, prefix="/api/supervisores", tags=["Supervisores"])
app.include_router(colaborador_router, prefix="/api/colaboradores", tags=["Colaboradores"])
app.include_router(upload_router, prefix="/api/uploads", tags=["Uploads"])

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
