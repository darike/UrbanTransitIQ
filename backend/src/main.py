
import logging
import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.src.routers import admin, auth, dashboards, entities, recommendations, whatif  # noqa: E402

logging.basicConfig(filename="reports/app_errors.log", level=logging.ERROR)

app = FastAPI(title="UrbanTransit IQ API", version="1.0.0",
              description="Big Data + Data Science transport intelligence — TechWiz 7")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logging.exception("unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500,
                        content={"detail": f"Internal error in {request.url.path}; see reports/app_errors.log"})


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "urbantransit-iq"}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(entities.router, prefix="/api/entities", tags=["entities"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(whatif.router, prefix="/api/whatif", tags=["whatif"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
