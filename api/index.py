import sys
import os

dashboard_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'intelligent_dashboard'))
if dashboard_dir not in sys.path:
    sys.path.insert(0, dashboard_dir)

try:
    from app import app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse

    app = FastAPI(title="Error Diagnostic")

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
