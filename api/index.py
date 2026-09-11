import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

os.environ["VERCEL"] = "1"

try:
    from app import app
except Exception as e:
    import traceback
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse

    app = FastAPI(title="Serverless Startup Diagnostic")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    def error_page(full_path: str = ""):
        return HTMLResponse(
            f"<html><body style='font-family: monospace; padding: 25px; background: #0f172a; color: #f87171;'>"
            f"<h2>Vercel Startup Error Diagnostic</h2>"
            f"<pre style='background: #1e293b; padding: 15px; border-radius: 8px; color: #fecaca;'>{err_tb}</pre>"
            f"</body></html>",
            status_code=200
        )
