from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
from ..database import get_db
from ..models import ETLJob, DataSource
from ..schemas import ETLJobCreate, ETLJobResponse
from ..utils.file_readers import FileReader
from ..utils.table_creator import TableCreator
import logging
import io
import boto3
from pathlib import Path
from ..utils.etl_engine import ETLEngine
from ..models import TransformTemplate

router = APIRouter(prefix="/etl", tags=["etl"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=ETLJobResponse)
async def create_etl_job(job: ETLJobCreate, db: AsyncSession = Depends(get_db)):
    """Create a new ETL job"""
    new_job = ETLJob(**job.dict())
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job

@router.get("/", response_model=list[ETLJobResponse])
async def list_etl_jobs(db: AsyncSession = Depends(get_db)):
    """List all ETL jobs"""
    result = await db.execute(select(ETLJob))
    return result.scalars().all()

@router.post("/execute/{job_id}")
async def execute_etl_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Execute an ETL job - load data from source to target
    """
    try:
        # Get the ETL job
        result = await db.execute(select(ETLJob).filter(ETLJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="ETL job not found")
        
        # Get source and target data sources
        source_result = await db.execute(select(DataSource).filter(DataSource.id == job.source_id))
        source = source_result.scalar_one_or_none()
        
        target_result = await db.execute(select(DataSource).filter(DataSource.id == job.target_id))
        target = target_result.scalar_one_or_none()
        
        if not source or not target:
            raise HTTPException(status_code=404, detail="Source or target not found")
        
        # Update job status
        job.status = "running"
        await db.commit()
        
        # Execute ETL based on source type
        if source.source_type == "Flat Files":
            if target.source_type == "Datalake/Lakehouse":
                result = await execute_flat_file_to_datalake(source, target, job, db)
            else:
                result = await execute_flat_file_to_db(source, target, job, db)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Source type {source.source_type} not yet supported"
            )
        
        # Update job status
        job.status = "completed"
        await db.commit()
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing ETL job {job_id}: {e}")
        # Update job status to failed
        if job:
            job.status = "failed"
            await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

async def execute_flat_file_to_db(
    source: DataSource,
    target: DataSource,
    job: ETLJob,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Execute ETL from flat file to database
    """
    try:
        # Get file details from source connection_details
        file_path = source.connection_details.get("Source File Path")
        file_type = source.connection_details.get("Source File Type", "csv")
        file_name = source.connection_details.get("Source File Name", "data")
        
        if not file_path:
            raise ValueError("Source file path not provided")
            
        full_path = Path(file_path) / file_name
        
        # Use iterator for large files
        logger.info(f"Processing file in chunks: {full_path}")
        chunks = FileReader.get_iterator(str(full_path), file_type, chunk_size=10000)
        
        # Load YAML config if present
        config = None
        if job.yaml_config:
            config = ETLEngine.load_config(job.yaml_config)
            logger.info(f"Loaded YAML config for job {job.id}")

        # Optional: Transform template via mapping_config
        template = None
        template_id = None
        if isinstance(job.mapping_config, dict):
            template_id = job.mapping_config.get("template_id")
        if template_id:
            t_res = await db.execute(select(TransformTemplate).filter(TransformTemplate.id == int(template_id)))
            template = t_res.scalar_one_or_none()
            if template:
                logger.info(f"Using TransformTemplate {template.id} ({template.name}) for job {job.id}")

        # Table name: template entity name (preferred) else filename
        table_name = TableCreator._sanitize_table_name((template.target_entity_name if template else None) or file_name)
        first_chunk = True
        total_inserted = 0
        column_count = 0
        columns = []
        table_created = False

        for df in chunks:
            if first_chunk:
                # If template provided, apply template-driven transforms on first chunk before schema inference
                if template:
                    df = ETLEngine.apply_template_config(df, template.config or {})

                # Build schema:
                # - Prefer template column schema when available
                if template and isinstance(template.config, dict) and isinstance(template.config.get("columns"), list):
                    schema = {}
                    not_null = []
                    primary_key = None
                    include_auto_id = True
                    for c in template.config.get("columns", []):
                        name = (c or {}).get("name")
                        if not name:
                            continue
                        constraints = (c or {}).get("constraints", {}) or {}
                        pg_type = constraints.get("pg_type") or FileReader._infer_schema(df).get(name) or "TEXT"
                        schema[name] = pg_type
                        if constraints.get("not_null") or ((c or {}).get("quality_rules", {}) or {}).get("not_null"):
                            not_null.append(name)
                        if constraints.get("primary_key") or ((c or {}).get("quality_rules", {}) or {}).get("primary_key"):
                            primary_key = name

                    # Postgres-only: if business_id is declared PK, do not add auto id
                    if primary_key and primary_key.lower() == "business_id":
                        include_auto_id = False

                    column_count = len(schema)
                    columns = list(schema.keys())

                    # Create table only if missing (do not drop)
                    if not await TableCreator.table_exists(db, table_name):
                        logger.info(f"Creating table (from template): {table_name}")
                        await TableCreator.create_table(
                            db=db,
                            table_name=table_name,
                            schema=schema,
                            drop_if_exists=False,
                            include_auto_id=include_auto_id,
                            primary_key=primary_key,
                            not_null=not_null
                        )
                        table_created = True
                else:
                    # Infer schema from first chunk
                    schema = FileReader._infer_schema(df)
                    column_count = len(schema)
                    columns = list(schema.keys())

                    # Create table (legacy behavior: drop and recreate)
                    logger.info(f"Creating table: {table_name}")
                    await TableCreator.create_table(
                        db=db,
                        table_name=table_name,
                        schema=schema,
                        drop_if_exists=True
                    )
                    table_created = True
                first_chunk = False
            
            # Apply YAML transformations and DQ rules if config present
            if config:
                if "data_quality" in config:
                    df = ETLEngine.apply_quality_rules(df, config["data_quality"])
                if "transformations" in config:
                    df = ETLEngine.apply_transformations(df, config["transformations"])

            # Apply template on every chunk
            if template:
                df = ETLEngine.apply_template_config(df, template.config or {})

            # Insert this chunk
            data = df.to_dict('records')
            logger.info(f"Inserting chunk: {len(data)} rows")
            insert_result = await TableCreator.insert_data(
                db=db,
                table_name=table_name,
                data=data,
                batch_size=1000
            )
            total_inserted += insert_result["inserted_rows"]
        
        return {
            "success": True,
            "message": "ETL job completed successfully (chunked)",
            "table_name": table_name,
            "rows_inserted": total_inserted,
            "columns": columns,
            "column_count": column_count
        }
        
    except Exception as e:
        logger.error(f"Error in flat file to DB ETL: {e}")
        raise

import pyarrow as pa
import pyarrow.parquet as pq
import tempfile
import os

async def execute_flat_file_to_datalake(
    source: DataSource,
    target: DataSource,
    job: ETLJob,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Execute ETL from flat file to Datalake (S3/MinIO) in Parquet format
    """
    temp_parquet = None
    try:
        # Get source file details
        file_path = source.connection_details.get("Source File Path")
        file_type = source.connection_details.get("Source File Type", "csv")
        file_name = source.connection_details.get("Source File Name", "data")
        
        if not file_path:
            raise ValueError("Source file path not provided")
            
        full_path = Path(file_path) / file_name
        
        # Get target datalake details
        access_key = target.connection_details.get("Access Key")
        secret_key = target.connection_details.get("Secret Key")
        s3_location = target.connection_details.get("Datalake Location") or target.connection_details.get("S3 Location")
        endpoint_url = target.connection_details.get("Endpoint URL")
        
        if not all([access_key, secret_key, s3_location]):
            raise ValueError("Incomplete Datalake connection details (Access Key, Secret Key, and Datalake Location are required)")
            
        # Parse S3 location
        if s3_location.startswith("s3://"):
            s3_path = s3_location[5:]
        elif s3_location.startswith("s3a://"):
            s3_path = s3_location[6:]
        else:
            s3_path = s3_location
            
        parts = s3_path.split('/', 1)
        bucket = parts[0]
        prefix = parts[1] if len(parts) > 1 else ""
        
        # Connect to S3/MinIO
        s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url
        )
        
        target_key = f"{prefix}/{file_name.replace('.csv', '')}.parquet"
        
        # Process in chunks and convert to Parquet
        logger.info(f"Converting {full_path} to Parquet in chunks...")
        
        with tempfile.NamedTemporaryFile(suffix='.parquet', delete=False) as tmp:
            temp_parquet = tmp.name
            
            # Use chunks to avoid memory issues
            chunks = FileReader.get_iterator(str(full_path), file_type, chunk_size=50000)
            
            # Load YAML config if present
            config = None
            if job.yaml_config:
                config = ETLEngine.load_config(job.yaml_config)

            writer = None
            total_rows = 0
            
            for df in chunks:
                # Apply YAML transformations and DQ rules if config present
                if config:
                    if "data_quality" in config:
                        df = ETLEngine.apply_quality_rules(df, config["data_quality"])
                    if "transformations" in config:
                        df = ETLEngine.apply_transformations(df, config["transformations"])
                
                table = pa.Table.from_pandas(df)
                if writer is None:
                    writer = pq.ParquetWriter(temp_parquet, table.schema)
                writer.write_table(table)
                total_rows += len(df)
                logger.info(f"Converted chunk: {len(df)} rows. Total: {total_rows}")
            
            if writer:
                writer.close()
        
        logger.info(f"Uploading Parquet file to S3: {bucket}/{target_key}")
        s3_client.upload_file(temp_parquet, bucket, target_key)
        
        return {
            "success": True,
            "message": "Data successfully converted to Parquet and persisted to Datalake",
            "table_name": target_key,
            "rows_inserted": total_rows,
            "columns": [],
            "column_count": 0
        }
        
    except Exception as e:
        logger.error(f"Error in flat file to Datalake (Parquet) ETL: {e}")
        raise
    finally:
        if temp_parquet and os.path.exists(temp_parquet):
            os.remove(temp_parquet)

@router.get("/{job_id}/status")
async def get_job_status(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get the status of an ETL job"""
    result = await db.execute(select(ETLJob).filter(ETLJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job.id,
        "name": job.name,
        "status": job.status,
        "created_at": job.created_at
    }
