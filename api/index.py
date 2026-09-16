import os
import sys

# Ensure both api/ and project root directory are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)

for p in (CURRENT_DIR, PARENT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("VERCEL", "1")

from app import app
from mangum import Mangum

# Export Mangum handler for serverless runtime and app for ASGI servers
handler = Mangum(app, lifespan="off")
