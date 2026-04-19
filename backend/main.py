from fastapi import FastAPI
from src.shared.infrastructure.db import create_tables, sync_schema
from src.modules.supervisor.api.http.supervisor_routes import router as supervisor_router
from src.shared.auth.routes import router as auth_router

app = FastAPI(
    title="API SMP",
    version="1.0"
)

# Create database tables
create_tables()

# Sincronizar schema com as entidades
sync_schema()

app.include_router(auth_router)
app.include_router(supervisor_router, prefix="/api/supervisores", tags=["Supervisores"])
