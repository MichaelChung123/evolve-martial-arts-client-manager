from app.api.routes.students import router as students_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router



app = FastAPI(
    title="Evolve Martial Arts Client Manager API",
    description="Backend API for managing martial arts students and clients.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(students_router, prefix="/api")

@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Evolve Martial Arts Client Manager API",
    }
