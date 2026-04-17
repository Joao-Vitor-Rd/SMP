from fastapi import FastAPI
from src.shared.infrastructure.db import create_tables
from src.modules.supervisor.api.http.supervisor_routes import router as supervisor_router

app = FastAPI(
    title="API SMP",
    version="1.0"
)

# Create database tables
create_tables()

app.include_router(supervisor_router, prefix="/api/supervisores", tags=["Supervisores"])
