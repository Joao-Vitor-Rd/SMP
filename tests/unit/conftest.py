import os
import sys
from pathlib import Path


os.environ.setdefault("DATABASE_URL", "sqlite:///./unit-tests.db")
os.environ.setdefault("SECRET_KEY_JWT", "unit-test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
