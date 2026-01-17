from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ..utils.dask_engine import DaskEngine

router = APIRouter(prefix="/dask", tags=["dask"])

class DaskClusterInfo(BaseModel):
    name: str
    scheduler_address: str
    status: str
    workers: int

# Mock storage for clusters
clusters = [
    {"name": "Local Dask", "scheduler_address": "tcp://localhost:8786", "status": "active", "workers": 2}
]

@router.get("/clusters", response_model=List[DaskClusterInfo])
async def list_dask_clusters():
    """List available Dask clusters"""
    return clusters

@router.post("/execute")
async def execute_dask_job(job_config: Dict[str, Any]):
    """Execute a task using Dask"""
    try:
        # In a real scenario, we'd pick a cluster and run the job
        # For now, we simulate the execution
        return {
            "status": "success",
            "message": "Dask job submitted successfully",
            "job_id": "dask-job-12345"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
