from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine, Base
from .routers import sources, etl, spark, rag, mapper, logs, transform, dask, cluster, extractors, loaders

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="DataUniverse", version="1.0.0", lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost",
    "http://localhost:3000", # React default port
    "http://localhost:5173", # Vite default port
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sources.router)
app.include_router(etl.router)
app.include_router(spark.router)
app.include_router(dask.router)
app.include_router(rag.router)
app.include_router(mapper.router)
app.include_router(logs.router)
app.include_router(transform.router)
app.include_router(cluster.router)
app.include_router(extractors.router)
app.include_router(loaders.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to DataUniverse API"}
