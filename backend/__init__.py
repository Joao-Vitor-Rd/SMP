import sys
from pathlib import Path

# Configure Python path for relative imports
ROOT_DIR = Path(__file__).parent
MODULE_DIR = ROOT_DIR / "src" / "modules" / "supervisor"

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(MODULE_DIR))
