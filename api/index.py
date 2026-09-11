import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
DASHBOARD_DIR = os.path.join(ROOT_DIR, "intelligent_dashboard")

for p in [ROOT_DIR, DASHBOARD_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ["VERCEL"] = "1"

try:
    from app import app
    try:
        from mangum import Mangum
        handler = Mangum(app, lifespan="off")
    except Exception:
        handler = app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse

    app = FastAPI(title="Startup Error Diagnostic")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all(full_path: str = ""):
        tb = traceback.format_exc()
        return HTMLResponse(
            f"<html><body style='font-family: sans-serif; padding: 30px; background: #0f172a; color: #f8fafc;'>"
            f"<h2 style='color: #ef4444;'>Serverless Startup Diagnostic</h2>"
            f"<p>Application startup error details:</p>"
            f"<pre style='background: #1e293b; padding: 20px; border-radius: 8px; overflow-x: auto; color: #fca5a5;'>{tb}</pre>"
            f"</body></html>",
            status_code=500
        )

    try:
        from mangum import Mangum
        handler = Mangum(app, lifespan="off")
    except Exception:
        handler = app
