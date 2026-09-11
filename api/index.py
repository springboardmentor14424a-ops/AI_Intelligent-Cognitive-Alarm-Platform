import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

os.environ.setdefault("VERCEL", "1")

handler = None

try:
    from app import app
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception:
    import traceback
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse
    from mangum import Mangum

    _diag = FastAPI(title="Startup Diagnostic")

    @_diag.api_route("/{full_path:path}", methods=["GET","POST","PUT","DELETE","OPTIONS","HEAD","PATCH"])
    def error_page(full_path: str = ""):
        return HTMLResponse(
            f"<html><body style='font-family:monospace;padding:25px;background:#0f172a;color:#f87171;'>"
            f"<h2>Startup Error</h2>"
            f"<pre style='background:#1e293b;padding:15px;border-radius:8px;color:#fecaca;'>{err_tb}</pre>"
            f"</body></html>",
            status_code=200
        )

    app = _diag
    handler = Mangum(_diag, lifespan="off")
