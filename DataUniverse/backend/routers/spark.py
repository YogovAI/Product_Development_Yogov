from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/spark", tags=["spark"])

class SparkJobSubmission(BaseModel):
    application_name: str
    master_url: str
    deploy_mode: str = "client"
    main_class: Optional[str] = None
    app_args: Optional[list] = None

@router.post("/submit")
async def submit_spark_job(job: SparkJobSubmission):
    # Logic to submit job to Spark cluster
    # This might involve using spark-submit command or a library like pyspark
    print(f"Submitting Spark job: {job.application_name} to {job.master_url}")
    return {"status": "submitted", "job_details": job}

@router.get("/clusters")
def list_known_clusters():
    # Could be stored in DB or config
    return [
        {"name": "Local Spark", "url": "spark://localhost:7077"},
        {"name": "VMware Cluster", "url": "spark://192.168.1.5:7077"} # Example
    ]
